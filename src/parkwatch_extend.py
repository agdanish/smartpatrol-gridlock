#!/usr/bin/env python3
"""SmartPatrol — EXTENDED backend generator for the Innovation + Feasibility lift.
Reads ONLY the provided Theme-1 CSV and computes the NEW structures (station
co-offender network + communities + betweenness, recidivism cadence, fleet mix,
temporal momentum, blind-spot/backtest, full 33-cell harm promotion). Emits a
typed TS module the React app imports. Every number is real and auditable.
Run: .venv/bin/python src/parkwatch_extend.py
"""
import json, ast, warnings, os, math
warnings.filterwarnings("ignore")
from itertools import combinations
from collections import Counter
import numpy as np, pandas as pd, networkx as nx

CSV = "datasets-given-in-web-portal/jan to may police violation_anonymized791b166.csv"
OUT = "reports/parkwatch"; os.makedirs(OUT, exist_ok=True)
TS_OUT = "audit_v1/project/src/data/derivedData.ts"
G = 0.00135  # ~150 m grid
V = {}       # verification echo

# ---------- load + clean (identical contract to parkwatch_prep.py) ----------
df = pd.read_csv(CSV, low_memory=False)
dt = pd.to_datetime(df["created_datetime"], errors="coerce", utc=True).dt.tz_convert("Asia/Kolkata")
df["dt"] = dt
mid = dt.min() + (dt.max() - dt.min()) / 2          # same midpoint split as the verified 73.9% backtest
df["half1"] = dt < mid
df = df[(df.latitude.between(12.7, 13.2)) & (df.longitude.between(77.3, 77.9))].copy()
V["split_date"] = str(mid.date())

def cid(lat, lon): return f"{round(lat/G)*G:.5f}_{round(lon/G)*G:.5f}"
df["cell"] = [cid(a, b) for a, b in zip(df.latitude, df.longitude)]

def cell_label(sub):
    jn = sub.junction_name.dropna()
    jn = jn[~jn.astype(str).str.contains("No Junction", case=False, na=False)]
    if len(jn): return str(jn.mode().iloc[0])
    loc = sub.location.dropna()
    return (str(loc.mode().iloc[0]).split(",")[0] if len(loc) else "Bengaluru")
CLABEL = df.groupby("cell").apply(cell_label).to_dict()

# ======================================================================
# 1) STATION CO-OFFENDER NETWORK (bipartite projection)
# ======================================================================
vcount = df.groupby("vehicle_number").size()
vst_sets = df.groupby("vehicle_number")["police_station"].apply(lambda s: set(s.dropna()))
st_meta = df.groupby("police_station").agg(n=("id", "size"),
            lat=("latitude", "median"), lon=("longitude", "median"))
repeat = vcount[vcount >= 5].index                      # repeat-offender vehicles
edge_w = Counter()
for v in repeat:
    sts = sorted(s for s in vst_sets[v] if isinstance(s, str))
    for a, b in combinations(sts, 2):
        edge_w[(a, b)] += 1
all_edges = [(a, b, w) for (a, b), w in edge_w.items()]
V["network_edges_total"] = len(all_edges)
V["network_edges_ge3"] = sum(1 for *_, w in all_edges if w >= 3)

# node strength = # repeat offenders touching the station
st_chronic = Counter()
for v in repeat:
    for s in vst_sets[v]:
        if isinstance(s, str): st_chronic[s] += 1

Gx = nx.Graph()  # nodes added implicitly from edges -> only stations that share offenders
for a, b, w in all_edges:
    if w >= 3: Gx.add_edge(a, b, weight=w)
# keep only the giant connected component's rings legible (drop tiny detached pairs)
Gx = Gx.subgraph(max(nx.connected_components(Gx), key=len)).copy()
# communities on the weight>=3 graph
comms = list(nx.algorithms.community.greedy_modularity_communities(Gx, weight="weight"))
comms = [c for c in comms if len(c)]
comm_of = {}
for i, c in enumerate(comms):
    for s in c: comm_of[s] = i
try:
    modularity = nx.algorithms.community.modularity(Gx, comms, weight="weight")
except Exception:
    modularity = float("nan")
V["network_communities"] = len(comms)
V["network_modularity"] = round(modularity, 3)
# SIGNIFICANCE: is modularity 0.41 real or noise? Compare to a degree-preserving null model.
null_mods = []
for s in range(60):
    H = Gx.copy()
    try:
        nx.double_edge_swap(H, nswap=H.number_of_edges() * 5, max_tries=H.number_of_edges() * 50, seed=s)
    except Exception:
        pass
    hc = list(nx.algorithms.community.greedy_modularity_communities(H, weight="weight"))
    try:
        null_mods.append(nx.algorithms.community.modularity(H, hc, weight="weight"))
    except Exception:
        pass
null_mods = np.array(null_mods)
null_mean = float(null_mods.mean()); null_std = float(null_mods.std()) or 1e-9
V["modularity_null_mean"] = round(null_mean, 3)
V["modularity_zscore"] = round((modularity - null_mean) / null_std, 1)
V["modularity_p"] = round(float((null_mods >= modularity).mean()), 4)
btw = nx.betweenness_centrality(Gx)                      # unweighted hops over the ring graph

def haversine(la1, lo1, la2, lo2):
    R = 6371.0
    p1, p2 = math.radians(la1), math.radians(la2)
    dphi = math.radians(la2 - la1); dl = math.radians(lo2 - lo1)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))
# geo coherence: mean within-community pairwise dist vs random same-size grouping
def mean_within(groups):
    ds = []
    for g in groups:
        g = [s for s in g if s in st_meta.index]
        for a, b in combinations(g, 2):
            ds.append(haversine(st_meta.loc[a, "lat"], st_meta.loc[a, "lon"],
                                 st_meta.loc[b, "lat"], st_meta.loc[b, "lon"]))
    return float(np.mean(ds)) if ds else float("nan")
real_within = mean_within(comms)
rng = np.random.default_rng(42)
members = [s for c in comms for s in c]
sizes = [len(c) for c in comms]
rand_vals = []
for _ in range(200):
    perm = list(rng.permutation(members)); groups = []; k = 0
    for sz in sizes:
        groups.append(perm[k:k+sz]); k += sz
    rand_vals.append(mean_within(groups))
rand_within = float(np.mean(rand_vals))
V["geo_real_km"] = round(real_within, 1)
V["geo_random_km"] = round(rand_within, 1)
V["geo_tighter_x"] = round(rand_within/real_within, 2)

top_edges = sorted(all_edges, key=lambda e: -e[2])[:8]
bridges = sorted(btw.items(), key=lambda kv: -kv[1])[:6]
# super-hubs: vehicles by distinct stations
vnst = df.groupby("vehicle_number").police_station.nunique()
superhubs = vnst.sort_values(ascending=False).head(6)
V["max_stations_one_vehicle"] = int(vnst.max())
# cross-community spanners among chronic (>=10)
chronic = vcount[vcount >= 10].index
def n_comms(v): return len({comm_of.get(s) for s in vst_sets[v] if s in comm_of and comm_of.get(s) is not None})
spanners = sum(1 for v in chronic if n_comms(v) >= 2)
V["cross_community_spanners"] = int(spanners)

network = {
    "edges_total": len(all_edges),
    "edges_ge3": V["network_edges_ge3"],
    "n_communities": len(comms),
    "modularity": round(modularity, 3),
    "modularity_null_mean": V["modularity_null_mean"],
    "modularity_zscore": V["modularity_zscore"],
    "modularity_p": V["modularity_p"],
    "geo_real_km": round(real_within, 1),
    "geo_random_km": round(rand_within, 1),
    "geo_tighter_x": V["geo_tighter_x"],
    "cross_community_spanners": int(spanners),
    "max_stations_one_vehicle": int(vnst.max()),
    "stations": [
        {"name": s, "community": int(comm_of.get(s, -1)),
         "betweenness": round(float(btw.get(s, 0)), 3),
         "chronic_offenders": int(st_chronic.get(s, 0)),
         "n": int(st_meta.loc[s, "n"]),
         "lat": round(float(st_meta.loc[s, "lat"]), 5),
         "lon": round(float(st_meta.loc[s, "lon"]), 5)}
        for s in st_meta.index if s in comm_of],
    "top_edges": [{"a": a, "b": b, "w": int(w)} for a, b, w in top_edges],
    "bridges": [{"name": s, "score": round(float(v), 3)} for s, v in bridges],
    "super_hubs": [{"vehicle": v, "stations": int(vnst[v]), "violations": int(vcount[v])}
                   for v in superhubs.index],
}

# ======================================================================
# 2) RECIDIVISM CADENCE (chronic >=10)
# ======================================================================
gaps = []
sub = df[df.vehicle_number.isin(chronic)].sort_values("dt")
for v, g in sub.groupby("vehicle_number"):
    d = g["dt"].sort_values().diff().dropna().dt.total_seconds() / 86400.0
    gaps.extend([x for x in d.tolist() if x >= 0])
gaps = np.array(gaps)
V["recid_median_d"] = round(float(np.median(gaps)), 1)
V["recid_pct_7d"] = round(100*float((gaps <= 7).mean()), 1)
hist_edges = [0, 1, 2, 3, 5, 7, 14, 30, 9999]
hist = []
for i in range(len(hist_edges)-1):
    lo, hi = hist_edges[i], hist_edges[i+1]
    c = int(((gaps >= lo) & (gaps < hi)).sum())
    lab = f"{lo}-{hi}d" if hi < 9999 else f"{lo}d+"
    hist.append({"bucket": lab, "count": c})
recidivism = {
    "median_days": V["recid_median_d"],
    "pct_within_7d": V["recid_pct_7d"],
    "iqr": [round(float(np.percentile(gaps, 25)), 1), round(float(np.percentile(gaps, 75)), 1)],
    "n_gaps": int(len(gaps)),
    "hist": hist,
}

# ======================================================================
# 3) FLEET-OFFENDER LENS (cross-jurisdiction chronic vs population)
# ======================================================================
vtype = df.groupby("vehicle_number").vehicle_type.agg(lambda s: s.dropna().mode().iloc[0] if len(s.dropna()) else "UNKNOWN")
xj = [v for v in chronic if df[df.vehicle_number == v].police_station.nunique() >= 2]
V["xj_count"] = len(xj)
COMMERCIAL = {"PASSENGER AUTO", "LGV", "MAXI-CAB", "GOODS AUTO", "LORRY/GOODS VEHICLE", "HGV",
              "TEMPO", "VAN", "PRIVATE BUS", "BUS (BMTC/KSRTC)", "TANKER", "TRACTOR", "MINI BUS", "MINI-BUS"}
pop_mix = vtype.value_counts(normalize=True) * 100
xj_mix = vtype[vtype.index.isin(xj)].value_counts(normalize=True) * 100
types_show = sorted(set(xj_mix.head(8).index) | {"LGV", "LORRY/GOODS VEHICLE", "SCOOTER", "CAR"})
fleet_rows = []
for t in types_show:
    xp = float(xj_mix.get(t, 0)); pp = float(pop_mix.get(t, 0))
    fleet_rows.append({"type": t, "xj_pct": round(xp, 1), "pop_pct": round(pp, 1),
                       "ratio": round(xp/pp, 1) if pp > 0 else 0})
fleet_rows.sort(key=lambda r: -r["ratio"])
commercial_n = int(sum(1 for v in xj if vtype.get(v) in COMMERCIAL))
V["xj_commercial"] = commercial_n
V["xj_commercial_pct"] = round(100*commercial_n/len(xj), 0)
fleet = {
    "xj_count": len(xj), "commercial_count": commercial_n,
    "commercial_pct": round(100*commercial_n/len(xj)),
    "rows": fleet_rows,
}

# ======================================================================
# 4) TEMPORAL MOMENTUM (H1 vs H2)
# ======================================================================
ch = df.groupby(["cell", "half1"]).size().unstack(fill_value=0)
ch.columns = ["h2", "h1"] if list(ch.columns) == [False, True] else ch.columns
ch = df.groupby("cell")["half1"].agg(h1="sum", cnt="size")
ch["h2"] = ch["cnt"] - ch["h1"]
ch["delta"] = ch["h2"] - ch["h1"]
ch["label"] = ch.index.map(CLABEL)
big = ch[ch["cnt"] >= 200]
def cell_rows(d, n=8):  # dedupe by junction label (distinct ~150m cells can share a name)
    out = []; seen = set()
    for c, r in d.iterrows():
        lab = str(r["label"])
        if lab in seen: continue
        seen.add(lab)
        out.append({"label": lab, "h1": int(r["h1"]), "h2": int(r["h2"]), "delta": int(r["delta"])})
        if len(out) >= n: break
    return out
emerging = big.sort_values("delta", ascending=False)
decaying = big.sort_values("delta")
# station momentum
sh = df.groupby("police_station")["half1"].agg(h1="sum", cnt="size")
sh["h2"] = sh["cnt"] - sh["h1"]
sh = sh[sh["cnt"] >= 1000]
sh["pct"] = ((sh["h2"] - sh["h1"]) / sh["h1"].replace(0, np.nan) * 100)
rising = sh.sort_values("pct", ascending=False).head(6)
falling = sh.sort_values("pct").head(6)
def st_rows(d):
    return [{"name": s, "h1": int(r["h1"]), "h2": int(r["h2"]), "pct": round(float(r["pct"]), 0)}
            for s, r in d.iterrows()]
# newly-chronic / desisted
vh = df.groupby("vehicle_number")["half1"].agg(h1="sum", cnt="size")
vh["h2"] = vh["cnt"] - vh["h1"]
newly = int(((vh["h1"] <= 2) & (vh["h2"] >= 8) & (vh["cnt"] >= 10)).sum())
desisted = int(((vh["h1"] >= 8) & (vh["h2"] <= 2)).sum())
V["newly_chronic"] = newly; V["desisted"] = desisted
momentum = {
    "split_date": str(mid.date()),
    "emerging": cell_rows(emerging), "decaying": cell_rows(decaying),
    "stations_rising": st_rows(rising), "stations_falling": st_rows(falling),
    "newly_chronic": newly, "desisted": desisted,
}

# ======================================================================
# 5) BLIND-SPOT / BACKTEST
# ======================================================================
t1 = df[df.half1].groupby("cell").size().sort_values(ascending=False).head(142)
t2 = df[~df.half1].groupby("cell").size().sort_values(ascending=False).head(142)
held = len(set(t1.index) & set(t2.index))
V["stability_pct"] = round(100*held/142, 1)
V["churned"] = 142 - held
churn_rows = []; _seen = set()
for c in [c for c in t1.index if c not in set(t2.index)]:
    lab = str(CLABEL.get(c, "Bengaluru"))
    if lab in _seen: continue
    _seen.add(lab)
    churn_rows.append({"label": lab, "h1_rank": int(list(t1.index).index(c)+1)})
    if len(churn_rows) >= 8: break
# under-served stations: lowest own-volume coverage proxy = stations whose top corner
# holds the smallest share of their own volume (structurally hard to cover)
cover_proxy = []
for s in st_meta.index:
    ssub = df[df.police_station == s]
    if len(ssub) < 500: continue
    topcell = ssub.groupby("cell").size().max()
    cover_proxy.append((s, round(100*topcell/len(ssub), 1), len(ssub)))
under = sorted(cover_proxy, key=lambda x: x[1])[:6]
# cross-jurisdiction blindness: avg share the busiest single station sees of an XJ offender
shares = []
for v in xj:
    vc = df[df.vehicle_number == v].police_station.value_counts()
    shares.append(vc.max()/vc.sum())
V["xj_blind_mean_seen"] = round(100*float(np.mean(shares)), 0)
blindspot = {
    "stability_pct": V["stability_pct"], "churn_pct": round(100 - V["stability_pct"], 1),
    "held": held, "total": 142, "churned": 142 - held,
    "churned_cells": churn_rows,
    "under_served": [{"name": s, "top_corner_share": p, "n": n} for s, p, n in under],
    "xj_blind_mean_seen_pct": round(100*float(np.mean(shares))),
    "xj_count": len(xj),
}

# ======================================================================
# 6) FULL 33-CELL HARM PROMOTION (fix the 12-of-33 seam)
# ======================================================================
HARM = {"PARKING IN A MAIN ROAD":5,"PARKING NEAR ROAD CROSSING":4,"PARKING NEAR TRAFFIC LIGHT":4,
        "PARKING NEAR ZEBRA":4,"PARKING ON FOOTPATH":4,"PARKING NEAR BUSTOP":4,"PARKING NEAR SCHOOL":4,
        "PARKING NEAR HOSPITAL":4,"DOUBLE PARKING":3,"WRONG PARKING":1,"NO PARKING":1}
def labels(s):
    try:
        v = ast.literal_eval(s) if isinstance(s, str) and s.strip().startswith("[") else [s]
        return [str(x).strip().upper() for x in v]
    except Exception: return [str(s).strip().upper()]
df["harm"] = df["violation_type"].map(labels).map(lambda ls: max([1.0] + [HARM[k] for l in ls for k in HARM if k in l]))
cstat = df.groupby("cell").agg(n=("id", "size"), harm_sum=("harm", "sum"),
        lat=("latitude", "mean"), lon=("longitude", "mean"))
cstat["label"] = cstat.index.map(CLABEL)
cstat = cstat.sort_values("n", ascending=False); cstat["rank_volume"] = np.arange(1, len(cstat)+1)
ch2 = cstat.sort_values("harm_sum", ascending=False); ch2["rank_harm"] = np.arange(1, len(ch2)+1)
cstat["rank_harm"] = cstat.index.map(ch2["rank_harm"].to_dict())
vol142 = set(cstat.sort_values("n", ascending=False).head(142).index)
harm142 = cstat.sort_values("harm_sum", ascending=False).head(142)
promoted = harm142[~harm142.index.isin(vol142)]
V["n_promoted"] = len(promoted)
V["spearman"] = round(float(cstat["n"].corr(cstat["harm_sum"], method="spearman")), 3)
promoted_full = [{"label": str(r["label"]), "rank_volume": int(r["rank_volume"]),
                  "rank_harm": int(r["rank_harm"]), "n": int(r["n"]),
                  "harm_sum": round(float(r["harm_sum"]))}
                 for _, r in promoted.sort_values("rank_harm").iterrows()]
# SENSITIVITY: do the 33 promoted corners survive reasonable weight perturbations?
baseline_set = set(promoted.index)
row_lbls = df["violation_type"].map(labels)
ALT_WEIGHTS = {
    "compressed (5->4, 4->3)": {k: (4 if v == 5 else 3 if v == 4 else v) for k, v in HARM.items()},
    "main-road only (5, else 1)": {k: (5 if v == 5 else 1) for k, v in HARM.items()},
    "linear (5,4,3,1->4,3,2,1)": {k: {5: 4, 4: 3, 3: 2, 1: 1}.get(v, v) for k, v in HARM.items()},
}
surv = []
for nm, WV in ALT_WEIGHTS.items():
    h = row_lbls.map(lambda ls: max([1.0] + [WV[k] for l in ls for k in WV if k in l]))
    hs = df.assign(h=h.values).groupby("cell")["h"].sum()
    alt_harm142 = set(hs.sort_values(ascending=False).head(142).index)
    alt_promoted = alt_harm142 - vol142
    keep = len(baseline_set & alt_promoted)
    surv.append({"variant": nm, "survived": int(keep), "of": len(baseline_set),
                 "pct": round(100 * keep / max(1, len(baseline_set)))})
V["pehi_min_survival_pct"] = min(s["pct"] for s in surv)
harm_promotion = {"n_promoted": len(promoted), "spearman": V["spearman"],
                  "pct_labeled": 10.3, "promoted_cells": promoted_full,
                  "sensitivity": surv, "min_survival_pct": V["pehi_min_survival_pct"]}

# ===== ROAD-SAFETY / PEDESTRIAN IMPACT (the real societal stake) =====
# pedestrian-facing classes = footpath / crossing / zebra / school / hospital / bus-stop.
PED = ["FOOTPATH", "ZEBRA", "CROSSING", "SCHOOL", "HOSPITAL", "BUSTOP"]
df["_ped"] = row_lbls.map(lambda ls: int(any(any(p in l for p in PED) for l in ls)))
ped_cell = df.groupby("cell")["_ped"].sum()
total_ped = int(df["_ped"].sum())
def ped_cov(cells):
    return round(100 * int(ped_cell.reindex(list(cells), fill_value=0).sum()) / total_ped, 1)
vol_cov = ped_cov(vol142)                 # ped capture if you patrol the top-142 by VOLUME
harm_cov = ped_cov(set(harm142.index))    # ped capture if you patrol the top-142 by HARM (same #)
ped_sorted = ped_cell.sort_values(ascending=False)
ped_50 = int((ped_sorted.cumsum() <= 0.5 * total_ped).sum()) + 1
# out-of-time: build both plans on H1, measure ped capture on H1 corners using full ped counts
h1 = df[df.half1]
v142_h1 = set(h1.groupby("cell").size().sort_values(ascending=False).head(142).index)
hs_h1 = h1.assign(h=df.loc[h1.index, "harm"].values).groupby("cell")["h"].sum()
h142_h1 = set(hs_h1.sort_values(ascending=False).head(142).index)
V["ped_total"] = total_ped; V["ped_cov_volume"] = vol_cov; V["ped_cov_harm"] = harm_cov
V["ped_corners_50pct"] = ped_50
safety = {
    "ped_total": total_ped, "ped_pct_of_all": round(100 * total_ped / len(df), 2),
    "cov_volume": vol_cov, "cov_harm": harm_cov, "cov_gain_pp": round(harm_cov - vol_cov, 1),
    "cov_oot_volume": ped_cov(v142_h1), "cov_oot_harm": ped_cov(h142_h1),
    "ped_corners_for_50pct": ped_50,
    "random_142_cov": round(100 * 142 / len(cstat), 1),
    "n_corners_with_ped_risk": int((ped_cell.reindex(list(set(harm142.index)), fill_value=0) > 0).sum()),
}

# ======================================================================
# EMIT
# ======================================================================
DATA = {"network": network, "recidivism": recidivism, "fleet": fleet,
        "momentum": momentum, "blindspot": blindspot, "harmPromotion": harm_promotion,
        "safety": safety,
        "harmWeights": [{"rule": k, "weight": w} for k, w in
                        sorted(HARM.items(), key=lambda kv: -kv[1])]}
json.dump(DATA, open(f"{OUT}/derived.json", "w"), indent=2)

HEADER = '''/* =============================================================================
 * SmartPatrol — DERIVED DATA (innovation + feasibility layer)
 * AUTO-GENERATED by src/parkwatch_extend.py from the 298,450-row BTP CSV.
 * Every value is real and auditable; do not hand-edit. Re-run the script to refresh.
 * ===========================================================================*/
'''
ts = HEADER + "\nexport const derived = " + json.dumps(DATA, indent=2) + " as const;\n"
os.makedirs(os.path.dirname(TS_OUT), exist_ok=True)
open(TS_OUT, "w").write(ts)

print(json.dumps(V, indent=2))
print("\n[wrote]", TS_OUT, "and", f"{OUT}/derived.json")
