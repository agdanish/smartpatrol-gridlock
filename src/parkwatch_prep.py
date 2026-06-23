#!/usr/bin/env python3
"""SmartPatrol build-time backend generator + FACT VERIFIER (static-precompute).
Reads ONLY the provided Theme-1 CSV; reproduces every verified number AND bakes the 7 frozen
artifacts the read-only Streamlit demo serves. Run: .venv/bin/python src/parkwatch_prep.py"""
import json, warnings, ast, os; warnings.filterwarnings("ignore")
import numpy as np, pandas as pd

CSV = "datasets-given-in-web-portal/jan to may police violation_anonymized791b166.csv"
OUT = "reports/parkwatch"; os.makedirs(OUT, exist_ok=True)
G = 0.00135  # ~150 m grid
R = {}

# ---------- load + clean ----------
df = pd.read_csv(CSV, low_memory=False)
R["rows_total"] = len(df)
dt = pd.to_datetime(df["created_datetime"], errors="coerce", utc=True).dt.tz_convert("Asia/Kolkata")
df["hour"] = dt.dt.hour; df["dow"] = dt.dt.dayofweek; df["half"] = (dt < (dt.min() + (dt.max()-dt.min())/2))
R["date_window"] = f"{dt.min()} .. {dt.max()}"
R["validation_counts"] = df["validation_status"].value_counts(dropna=False).to_dict()
df = df[(df.latitude.between(12.7,13.2)) & (df.longitude.between(77.3,77.9))].copy()
R["rows_in_bbox"] = len(df)

def labels(s):
    try:
        v = ast.literal_eval(s) if isinstance(s,str) and s.strip().startswith("[") else [s]
        return [str(x).strip().upper() for x in v]
    except Exception: return [str(s).strip().upper()]
df["vlabels"] = df["violation_type"].map(labels)
HARM = {"PARKING IN A MAIN ROAD":5,"PARKING NEAR ROAD CROSSING":4,"PARKING NEAR TRAFFIC LIGHT":4,
        "PARKING NEAR ZEBRA":4,"PARKING ON FOOTPATH":4,"PARKING NEAR BUSTOP":4,"PARKING NEAR SCHOOL":4,
        "PARKING NEAR HOSPITAL":4,"DOUBLE PARKING":3,"WRONG PARKING":1,"NO PARKING":1}
def harm(lbls):
    w=1.0
    for l in lbls:
        for k,v in HARM.items():
            if k in l: w=max(w,v)
    return w
df["harm"] = df["vlabels"].map(harm)
road_label = df["vlabels"].map(lambda ls: any(any(k in l for k in HARM if HARM[k]>=3) for l in ls))
R["pct_rows_with_roadclass_label"] = round(100*road_label.mean(),1)

def cid(lat,lon): return f"{round(lat/G)*G:.5f}_{round(lon/G)*G:.5f}"
df["cell"] = [cid(a,b) for a,b in zip(df.latitude, df.longitude)]
tot = len(df)

# ---------- cell stats ----------
cell = df.groupby("cell").agg(n=("id","size"), harm_sum=("harm","sum"),
                              lat=("latitude","mean"), lon=("longitude","mean")).reset_index()
# human label per cell = most common real junction else locality from location
def cell_label(sub):
    jn = sub.junction_name.dropna()
    jn = jn[~jn.astype(str).str.contains("No Junction", case=False, na=False)]
    if len(jn): return str(jn.mode().iloc[0])
    loc = sub.location.dropna()
    return (str(loc.mode().iloc[0]).split(",")[0] if len(loc) else "Bengaluru")
lbl = df.groupby("cell").apply(cell_label)
cell["label"] = cell.cell.map(lbl)
cell = cell.sort_values("n", ascending=False).reset_index(drop=True)
cell["rank_volume"] = np.arange(1, len(cell)+1)
cell_h = cell.sort_values("harm_sum", ascending=False).reset_index(drop=True)
harm_rank = {c:i+1 for i,c in enumerate(cell_h.cell)}
cell["rank_harm"] = cell.cell.map(harm_rank)
R["n_cells"] = len(cell)
R["cells_for_50pct_volume"] = int((cell.n.cumsum() <= 0.5*tot).sum())+1
R["top100_cells_pct"] = round(100*cell.n.head(100).sum()/tot,2)
R["random100_cells_pct"] = round(100*100/len(cell),2)
R["patrol_efficiency_x"] = round(R["top100_cells_pct"]/R["random100_cells_pct"],1)

# ---------- stations ----------
st = df.groupby("police_station").agg(n=("id","size"), lat=("latitude","median"), lon=("longitude","median")).sort_values("n",ascending=False)
R["n_stations"] = len(st)
R["stations_for_50pct"] = int((st.n.cumsum() <= 0.5*tot).sum())+1
R["stations_for_80pct"] = int((st.n.cumsum() <= 0.8*tot).sum())+1

# ---------- offenders + cross-jurisdiction ----------
vcount = df.groupby("vehicle_number").size()
vst = df.groupby("vehicle_number").police_station.nunique()
chronic = vcount[vcount>=10].index
R["offenders_ge10"]=int((vcount>=10).sum()); R["offenders_ge5"]=int((vcount>=5).sum())
R["max_violations_single_vehicle"]=int(vcount.max())
R["top_vehicle_stations"]=int(df[df.vehicle_number==vcount.idxmax()].police_station.nunique())
R["chronic_across_ge2_stations"]=int((vst[chronic]>=2).sum())   # 139
R["chronic_across_ge3_stations"]=int((vst[chronic]>=3).sum())   # 19
R["systemic_across_ge2_stations"]=int((vst>=2).sum())           # 11343
R["systemic_across_ge3_stations"]=int((vst>=3).sum())           # 883
R["systemic_across_ge4_stations"]=int((vst>=4).sum())           # 88

# ---------- temporal-stability backtest ----------
t1=set(df[df.half].groupby("cell").size().sort_values(ascending=False).head(142).index)
t2=set(df[~df.half].groupby("cell").size().sort_values(ascending=False).head(142).index)
R["top142_temporal_stability_pct"]=round(100*len(t1&t2)/142,1)

# ---------- harm vs volume reorder ----------
by_vol = list(cell.sort_values("n",ascending=False).head(142).cell)
by_harm = list(cell.sort_values("harm_sum",ascending=False).head(142).cell)
promoted = [c for c in by_harm if c not in set(by_vol)]
R["cells_promoted_by_harm_top142"]=len(promoted)
R["harm_vs_volume_spearman"]=round(cell.set_index("cell")["n"].corr(cell.set_index("cell")["harm_sum"], method="spearman"),3)

# ================= EMIT ARTIFACTS =================
# verification_report.json
json.dump(R, open(f"{OUT}/verification_report.json","w"), indent=2, default=str)
print(json.dumps(R, indent=2, default=str))

# hotspots_top200.csv (kept)
cell.head(200).to_csv(f"{OUT}/hotspots_top200.csv", index=False)

# stations.json
st_list=[{"name":i,"n":int(r.n),"lat":round(r.lat,5),"lon":round(r.lon,5)} for i,r in st.iterrows()]
json.dump({"stations":st_list,"order_by_volume":[s["name"] for s in st_list]},
          open(f"{OUT}/stations.json","w"), indent=2)

# hotspots.geojson (top 200)
volset=set(by_vol); harmset=set(by_harm); promset=set(promoted)
feats=[]
for _,r in cell.head(200).iterrows():
    feats.append({"type":"Feature","geometry":{"type":"Point","coordinates":[round(r.lon,5),round(r.lat,5)]},
        "properties":{"cell":r.cell,"n":int(r.n),"harm_sum":round(r.harm_sum,1),"label":r.label,
            "rank_volume":int(r.rank_volume),"rank_harm":int(r.rank_harm),
            "in_top142_volume":r.cell in volset,"in_top142_harm":r.cell in harmset,
            "promoted_by_harm":r.cell in promset}})
json.dump({"type":"FeatureCollection","features":feats}, open(f"{OUT}/hotspots.geojson","w"))

# harm_reorder.json
cmap=cell.set_index("cell")
prom=[{"cell":c,"label":cmap.loc[c,"label"],"rank_volume":int(cmap.loc[c,"rank_volume"]),
       "rank_harm":int(cmap.loc[c,"rank_harm"]),"lat":round(cmap.loc[c,"lat"],5),"lon":round(cmap.loc[c,"lon"],5),
       "n":int(cmap.loc[c,"n"]),"harm_sum":round(cmap.loc[c,"harm_sum"],1)} for c in promoted]
json.dump({"spearman":R["harm_vs_volume_spearman"],"pct_labeled":R["pct_rows_with_roadclass_label"],
           "n_promoted":len(promoted),"promoted_cells":prom,"top142_by_volume":by_vol,"top142_by_harm":by_harm},
          open(f"{OUT}/harm_reorder.json","w"), indent=2)

# watchlist.json (+ graphs for 2 demo vehicles)
vstations = df.groupby("vehicle_number").police_station.agg(lambda s: list(s.value_counts().index))
appr = df[df.validation_status=="approved"].groupby("vehicle_number").size()
def offender_row(v):
    stns=vstations[v]
    return {"vehicle":v,"violations":int(vcount[v]),"n_stations":int(vst[v]),"stations":stns,
            "approved_only_violations":int(appr.get(v,0)),"chronic":bool(vcount[v]>=10)}
xj=[v for v in chronic if vst[v]>=2]
xj=sorted(xj,key=lambda v:(vcount[v],vst[v]),reverse=True)
offenders=[offender_row(v) for v in xj[:60]]
def graph(v):
    counts=df[df.vehicle_number==v].police_station.value_counts()
    nodes=[{"id":"veh","label":v,"x":0.5,"y":0.5,"type":"vehicle"}]; edges=[]
    import math
    for i,(s,c) in enumerate(counts.items()):
        ang=2*math.pi*i/len(counts); x=round(0.5+0.38*math.cos(ang),3); y=round(0.5+0.38*math.sin(ang),3)
        nid=f"st{i}"; nodes.append({"id":nid,"label":s,"x":x,"y":y,"type":"station","local_count":int(c)})
        edges.append({"from":"veh","to":nid,"count":int(c)})
    return {"nodes":nodes,"edges":edges}
demo=["FKN00GL16746","FKN00GL17863"]; demo=[v for v in demo if v in vcount.index]
json.dump({"summary":{"offenders_ge10":R["offenders_ge10"],"offenders_ge5":R["offenders_ge5"],
            "chronic_across_ge2":R["chronic_across_ge2_stations"],"chronic_across_ge3":R["chronic_across_ge3_stations"],
            "systemic_across_ge2":R["systemic_across_ge2_stations"],"systemic_across_ge3":R["systemic_across_ge3_stations"],
            "systemic_across_ge4":R["systemic_across_ge4_stations"]},
           "offenders":offenders,"graph":{v:graph(v) for v in demo}},
          open(f"{OUT}/watchlist.json","w"), indent=2)

# coverage_timing.json
hp=df.groupby("hour").size(); hours=[{"hour":int(h),"n":int(hp.get(h,0))} for h in range(24)]
med=np.median([h["n"] for h in hours])
gap=[h["hour"] for h in hours if h["n"]<med and 6<=h["hour"]<=22]  # daytime hours below median enforcement
json.dump({"hour_profile":hours,"coverage_gap_hours":gap,
           "koper_schedule":[{"corner_rank":i+1,"dwell_min":[10,15],"rotations_per_shift":4} for i in range(12)],
           "shift_windows":["06:00-10:00","10:00-14:00","14:00-18:00","18:00-22:00"]},
          open(f"{OUT}/coverage_timing.json","w"), indent=2)

# roster.json — greedy maximal-covering (radius = Moore neighborhood ~ one cell) per (station,K) + citywide
def neighbors(c):
    a,b=map(float,c.split("_"))
    return {f"{round((a+da*G)/G)*G:.5f}_{round((b+db*G)/G)*G:.5f}" for da in (-1,0,1) for db in (-1,0,1)}
def maxcover(sub, K):
    cc=sub.groupby("cell").agg(n=("id","size"),harm=("harm","sum"),lat=("latitude","mean"),lon=("longitude","mean"),
                               label=("cell","first"))
    cnt=cc.n.to_dict(); present=set(cnt)
    nb={c:(neighbors(c)&present) for c in present}
    covered=set(); chosen=[]; total=int(sub.shape[0])
    lblmap=df.set_index("cell").label.to_dict() if "label" in df else {}
    for _ in range(min(K,len(present))):
        best=None; bestgain=-1
        for c in present:
            if c in [x[0] for x in chosen]: continue
            gain=sum(cnt[x] for x in nb[c] if x not in covered)
            if gain>bestgain: bestgain=gain; best=c
        if best is None or bestgain<=0: break
        covered|=nb[best]; chosen.append((best,bestgain))
    rows=[]
    for rank,(c,gain) in enumerate(chosen,1):
        rows.append({"rank":rank,"cell":c,"label":cmap.loc[c,"label"] if c in cmap.index else "Bengaluru",
                     "n":int(cnt[c]),"harm_sum":round(float(cc.loc[c,"harm"]),1),
                     "lat":round(float(cc.loc[c,"lat"]),5),"lon":round(float(cc.loc[c,"lon"]),5),
                     "koper_window_min":[10,15],"route_order":rank,
                     "shift":["06:00-10:00","10:00-14:00","14:00-18:00","18:00-22:00"][(rank-1)%4]})
    covpct=round(100*sum(cnt[x] for x in covered)/total,1) if total else 0
    return {"corners":rows,"coverage_pct_of_station":covpct,"n_units":len(rows)}
roster={"stations":{},"citywide":{},
        "milp_prior_art":["ScienceDirect S0965856426002405 (Jun-2026)","Fairness-MCLP arXiv:2204.06446"],
        "equity_note":"operational coverage constraint — greedy maximal-covering (1-1/e) over ~150m beats; each picked beat is a real patrol location"}
for s in st.index:
    sub=df[df.police_station==s]; roster["stations"][s]={str(K):maxcover(sub,K) for K in range(3,13)}
roster["citywide"]={str(K):maxcover(df,K) for K in range(3,13)}
json.dump(roster, open(f"{OUT}/roster.json","w"), indent=2, default=str)

print("\n[verified cross-jurisdiction] chronic>=2:", R["chronic_across_ge2_stations"],
      "| chronic>=3:", R["chronic_across_ge3_stations"], "| systemic>=2:", R["systemic_across_ge2_stations"],
      "| >=4:", R["systemic_across_ge4_stations"])
print("[artifacts] " + ", ".join(sorted(os.listdir(OUT))))
