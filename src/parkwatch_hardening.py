#!/usr/bin/env python3
"""SmartPatrol — ROBUSTNESS HARDENING + the safe CONGESTION link.
(1) Bootstrap 95% CI on the out-of-time AUC, and an ABLATION that strips the
    recency features — proving the model beats baseline even WITHOUT recency
    (kills the "it's just EWMA" attack). (2) The anchored-offender congestion
    stat: repeat illegal parking on MAIN ROADS = the parking->congestion
    mechanism (PEHI already weights main-road parking 5/5), computed from the
    parking data alone — zero external/ASTraM data, zero DQ risk.
Run: .venv/bin/python src/parkwatch_hardening.py
"""
import ast, warnings, json
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score

CSV = "datasets-given-in-web-portal/jan to may police violation_anonymized791b166.csv"
G = 0.00135
df = pd.read_csv(CSV, low_memory=False)
dt = pd.to_datetime(df["created_datetime"], errors="coerce", utc=True).dt.tz_convert("Asia/Kolkata")
df = df[dt.notna()].copy(); dt = dt[dt.notna()]
df["dt"] = dt
df = df[(df.latitude.between(12.7, 13.2)) & (df.longitude.between(77.3, 77.9))].copy()
start = df["dt"].min(); df["week"] = ((df["dt"] - start).dt.days // 7).astype(int)
W = int(df["week"].max())
df["cell"] = [f"{round(a/G)*G:.5f}_{round(b/G)*G:.5f}" for a, b in zip(df.latitude, df.longitude)]

HARM = {"PARKING IN A MAIN ROAD":5,"PARKING NEAR ROAD CROSSING":4,"PARKING NEAR TRAFFIC LIGHT":4,
        "PARKING NEAR ZEBRA":4,"PARKING ON FOOTPATH":4,"PARKING NEAR BUSTOP":4,"PARKING NEAR SCHOOL":4,
        "PARKING NEAR HOSPITAL":4,"DOUBLE PARKING":3,"WRONG PARKING":1,"NO PARKING":1}
def labels(s):
    try:
        v = ast.literal_eval(s) if isinstance(s, str) and s.strip().startswith("[") else [s]
        return [str(x).strip().upper() for x in v]
    except Exception: return [str(s).strip().upper()]
lab = df["violation_type"].map(labels)
df["harm"] = lab.map(lambda ls: max([1.0] + [HARM[k] for l in ls for k in HARM if k in l]))
df["mainroad"] = lab.map(lambda ls: any("MAIN ROAD" in l for l in ls)).astype(int)

# ======================= (1) PANEL + AUC + CI + ABLATION =======================
wk = df.groupby("cell")["week"].apply(lambda s: np.bincount(s, minlength=W + 1))
harm_wk = df.groupby("cell")["harm"].mean()
cells = [c for c in wk.index if (wk[c] > 0).sum() >= 2]
rows = []
for c in cells:
    counts = wk[c]
    for w in range(2, W):
        hist = counts[:w + 1]
        ewma = 0.0
        for k in range(w + 1): ewma = 0.6 * ewma + 0.4 * counts[k]
        weeks_since = w - max([k for k in range(w + 1) if counts[k] > 0], default=0)
        rows.append((c, w, counts[w], counts[w - 1], counts[max(0, w - 3):w + 1].sum(), ewma,
                     int((hist > 0).sum()), weeks_since, float(hist.sum()), float(harm_wk.get(c, 1.0)),
                     1 if counts[w + 1] > 0 else 0))
P = pd.DataFrame(rows, columns=["cell","week","c_now","c_prev","last4","ewma","active_weeks","weeks_since","cum","harm","y"])
split = W - 5
tr, te = P[P.week < split], P[P.week >= split]
ALL = ["c_now","c_prev","last4","ewma","active_weeks","weeks_since","cum","harm"]
RECENCY = ["c_now","c_prev","last4","ewma","weeks_since"]
NONREC = [f for f in ALL if f not in RECENCY]  # active_weeks, cum, harm

def auc_of(feats):
    g = GradientBoostingClassifier(n_estimators=120, max_depth=3, random_state=0).fit(tr[feats], tr.y)
    return g, roc_auc_score(te.y, g.predict_proba(te[feats])[:, 1])
g_all, auc_all = auc_of(ALL)
_, auc_noewma = auc_of([f for f in ALL if f != "ewma"])
_, auc_nonrec = auc_of(NONREC)
auc_persist = roc_auc_score(te.y, te["c_now"].values)

# bootstrap 95% CI on the out-of-time test AUC (1000 resamples)
p_all = g_all.predict_proba(te[ALL])[:, 1]; yte = te.y.values
rng = np.random.default_rng(7); n = len(yte); boots = []
for _ in range(1000):
    idx = rng.integers(0, n, n)
    if yte[idx].min() == yte[idx].max(): continue
    boots.append(roc_auc_score(yte[idx], p_all[idx]))
ci_lo, ci_hi = np.percentile(boots, [2.5, 97.5])

HARD = {
    "auc_full": round(float(auc_all), 3),
    "auc_ci95": [round(float(ci_lo), 3), round(float(ci_hi), 3)],
    "auc_persistence": round(float(auc_persist), 3),
    "auc_drop_ewma": round(float(auc_noewma), 3),
    "auc_no_recency": round(float(auc_nonrec), 3),      # recency features REMOVED entirely
    "beats_baseline_no_recency": round(float(auc_nonrec - auc_persist), 3),
    "n_test_corner_weeks": int(len(te)),
}

# ======================= (2) ANCHORED-OFFENDER CONGESTION LINK =======================
vc = df.groupby("vehicle_number").size()
chronic = vc[vc >= 10].index
# per chronic vehicle: busiest single corner, its share, and whether that corner is main-road
anchor = []
sub = df[df.vehicle_number.isin(chronic)]
mainroad_cell = df.groupby("cell")["mainroad"].mean()
for v, gdf in sub.groupby("vehicle_number"):
    cc = gdf.cell.value_counts()
    top_cell = cc.index[0]; top_n = int(cc.iloc[0]); tot = int(cc.sum())
    anchor.append((v, tot, top_n, round(100 * top_n / tot, 1), top_cell,
                   round(float(mainroad_cell.get(top_cell, 0)), 2)))
A = pd.DataFrame(anchor, columns=["vehicle","violations","top_corner_n","top_corner_pct","cell","cell_mainroad_frac"])
# headline: most anchored chronic offender whose anchor corner is a main road
A_main = A[A.cell_mainroad_frac >= 0.5].sort_values(["top_corner_pct","violations"], ascending=False)
top = A_main.iloc[0] if len(A_main) else A.sort_values(["top_corner_pct","violations"], ascending=False).iloc[0]
clabel = df[df.cell == top.cell].junction_name.dropna()
clabel = clabel[~clabel.astype(str).str.contains("No Junction", case=False, na=False)]
top_label = str(clabel.mode().iloc[0]) if len(clabel) else "a single main-road corner"

CONG = {
    "mainroad_violations": int(df.mainroad.sum()),
    "mainroad_pct_of_all": round(100 * df.mainroad.mean(), 1),
    "anchored_ge80pct_at_one_corner": int((A.top_corner_pct >= 80).sum()),       # chronic offenders ≥80% at one corner
    "anchored_ge80_mainroad": int(((A.top_corner_pct >= 80) & (A.cell_mainroad_frac >= 0.5)).sum()),
    "example_vehicle": str(top.vehicle),
    "example_n": int(top.violations),
    "example_top_n": int(top.top_corner_n),
    "example_pct": float(top.top_corner_pct),
    "example_corner": top_label,
}

out = {"hardening": HARD, "congestion": CONG}
json.dump(out, open("reports/parkwatch/hardening.json", "w"), indent=2)
print(json.dumps(out, indent=2))
print(f"\n[ablation] full AUC {HARD['auc_full']} (95% CI {HARD['auc_ci95']}) | drop-EWMA {HARD['auc_drop_ewma']} | "
      f"NO recency at all {HARD['auc_no_recency']} vs persistence {HARD['auc_persistence']} "
      f"(still +{HARD['beats_baseline_no_recency']})")
print(f"[congestion] {CONG['mainroad_pct_of_all']}% main-road; {CONG['anchored_ge80_mainroad']} chronic offenders are ≥80% anchored to ONE main-road corner; "
      f"e.g. {CONG['example_vehicle']} = {CONG['example_top_n']}/{CONG['example_n']} ({CONG['example_pct']}%) at {CONG['example_corner']}")
