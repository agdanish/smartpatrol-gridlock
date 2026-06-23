#!/usr/bin/env python3
"""SmartPatrol — PREDICTIVE MODELS (the honest "where is your model?" answer).
Two genuinely supervised, out-of-sample-validated models computed ONLY from the
298,450-row BTP parking CSV — no external data, no individual scoring:
  (1) CRI  — Corner Re-Ignition hazard: discrete-time survival model predicting
             which ~150m corners record a violation NEXT week, validated OUT-OF-TIME.
             Predicts PLACES, not people -> answers the model gap AND sidesteps
             the predictive-policing feedback-loop critique.
  (2) TQ   — Ticket-Quality / rejection-risk classifier on validation_status
             (approved vs rejected, a real 165k-row label nobody uses) -> audits
             enforcement QUALITY (governance), not citizens.
Emits reports/parkwatch/models.json + audit_v1/project/src/data/modelData.ts.
Run: .venv/bin/python src/parkwatch_model.py
"""
import json, ast, warnings, os
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, brier_score_loss
from sklearn.preprocessing import StandardScaler

CSV = "datasets-given-in-web-portal/jan to may police violation_anonymized791b166.csv"
OUT = "reports/parkwatch"; os.makedirs(OUT, exist_ok=True)
TS_OUT = "audit_v1/project/src/data/modelData.ts"
G = 0.00135
M = {}

df = pd.read_csv(CSV, low_memory=False)
dt = pd.to_datetime(df["created_datetime"], errors="coerce", utc=True).dt.tz_convert("Asia/Kolkata")
df = df[dt.notna()].copy(); dt = dt[dt.notna()]
df["dt"] = dt
df = df[(df.latitude.between(12.7, 13.2)) & (df.longitude.between(77.3, 77.9))].copy()
start = df["dt"].min()
df["week"] = ((df["dt"] - start).dt.days // 7).astype(int)
W = int(df["week"].max())
def cid(lat, lon): return f"{round(lat/G)*G:.5f}_{round(lon/G)*G:.5f}"
df["cell"] = [cid(a, b) for a, b in zip(df.latitude, df.longitude)]

def cell_label(sub):
    jn = sub.junction_name.dropna()
    jn = jn[~jn.astype(str).str.contains("No Junction", case=False, na=False)]
    if len(jn): return str(jn.mode().iloc[0])
    loc = sub.location.dropna()
    return (str(loc.mode().iloc[0]).split(",")[0] if len(loc) else "Bengaluru")
CLABEL = df.groupby("cell").apply(cell_label).to_dict()
CLL = df.groupby("cell").agg(lat=("latitude", "mean"), lon=("longitude", "mean"))

# harm map (reused)
HARM = {"PARKING IN A MAIN ROAD":5,"PARKING NEAR ROAD CROSSING":4,"PARKING NEAR TRAFFIC LIGHT":4,
        "PARKING NEAR ZEBRA":4,"PARKING ON FOOTPATH":4,"PARKING NEAR BUSTOP":4,"PARKING NEAR SCHOOL":4,
        "PARKING NEAR HOSPITAL":4,"DOUBLE PARKING":3,"WRONG PARKING":1,"NO PARKING":1}
def labels(s):
    try:
        v = ast.literal_eval(s) if isinstance(s, str) and s.strip().startswith("[") else [s]
        return [str(x).strip().upper() for x in v]
    except Exception: return [str(s).strip().upper()]
df["harm"] = df["violation_type"].map(labels).map(lambda ls: max([1.0] + [HARM[k] for l in ls for k in HARM if k in l]))

# ======================================================================
# MODEL 1 — CRI: corner-week re-ignition hazard (discrete-time survival)
# ======================================================================
# weekly count matrix: cells x weeks
wk = df.groupby(["cell", "week"]).size().unstack(fill_value=0).reindex(columns=range(0, W + 1), fill_value=0)
# keep cells active in >=2 distinct weeks (meaningful recurrence)
active = wk[(wk > 0).sum(axis=1) >= 2]
M["cri_n_cells"] = int(len(active))
harm_wk = df.groupby("cell")["harm"].mean()

rows = []
cells = active.index.tolist()
arr = active.values  # [n_cells, W+1]
idx = {c: i for i, c in enumerate(cells)}
for ci, c in enumerate(cells):
    counts = arr[ci]
    last_active = -99
    for w in range(2, W):                       # need history (>=2 wks) and a t+1 label
        hist = counts[:w + 1]
        c_now = counts[w]; c_prev = counts[w - 1]
        last4 = counts[max(0, w - 3):w + 1].sum()
        ewma = 0.0
        for k in range(0, w + 1):
            ewma = 0.6 * ewma + 0.4 * counts[k]
        active_weeks = int((hist > 0).sum())
        weeks_since = w - max([k for k in range(w + 1) if counts[k] > 0], default=0)
        target = 1 if counts[w + 1] > 0 else 0
        rows.append((c, w, c_now, c_prev, last4, ewma, active_weeks, weeks_since,
                     float(hist.sum()), float(harm_wk.get(c, 1.0)), target))
P = pd.DataFrame(rows, columns=["cell", "week", "c_now", "c_prev", "last4", "ewma",
                                "active_weeks", "weeks_since", "cum", "harm", "y"])
M["cri_n_panel"] = int(len(P))
FEATS = ["c_now", "c_prev", "last4", "ewma", "active_weeks", "weeks_since", "cum", "harm"]
split = W - 5                                    # train weeks predicting <= split, test later (OUT-OF-TIME)
tr, te = P[P.week < split], P[P.week >= split]
M["cri_split_week"] = int(split); M["cri_base_rate"] = round(float(P.y.mean()), 3)
sc = StandardScaler().fit(tr[FEATS])
lr = LogisticRegression(max_iter=1000, class_weight="balanced").fit(sc.transform(tr[FEATS]), tr.y)
gb = GradientBoostingClassifier(n_estimators=120, max_depth=3, random_state=0).fit(tr[FEATS], tr.y)
p_lr = lr.predict_proba(sc.transform(te[FEATS]))[:, 1]
p_gb = gb.predict_proba(te[FEATS])[:, 1]
M["cri_auc_logreg"] = round(float(roc_auc_score(te.y, p_lr)), 3)
M["cri_auc_gbm"] = round(float(roc_auc_score(te.y, p_gb)), 3)
M["cri_brier_gbm"] = round(float(brier_score_loss(te.y, p_gb)), 3)
# PERSISTENCE BASELINE: does the model beat naive "active this week -> active next week"?
M["cri_auc_persistence"] = round(float(roc_auc_score(te.y, te["c_now"].values)), 3)
M["cri_beats_baseline"] = round(M["cri_auc_gbm"] - M["cri_auc_persistence"], 3)
# precision@K on the out-of-time test (top predicted corners actually re-fire)
k = 50
topk = te.assign(p=p_gb).sort_values("p", ascending=False).head(k)
M["cri_precision_at50"] = round(float(topk.y.mean()), 3)
# lift vs base
M["cri_lift_at50"] = round(M["cri_precision_at50"] / M["cri_base_rate"], 1) if M["cri_base_rate"] else 0
# feature importance (gbm)
imp = sorted(zip(FEATS, gb.feature_importances_), key=lambda x: -x[1])
M["cri_top_features"] = [{"name": n, "importance": round(float(v), 3)} for n, v in imp[:6]]
# NEXT-WEEK forecast: features at the final available week W-1 -> predict week W
fc_rows = []
for ci, c in enumerate(cells):
    counts = arr[ci]; w = W - 1
    hist = counts[:w + 1]
    ewma = 0.0
    for kk in range(0, w + 1): ewma = 0.6 * ewma + 0.4 * counts[kk]
    weeks_since = w - max([kk for kk in range(w + 1) if counts[kk] > 0], default=0)
    feat = [counts[w], counts[w - 1], counts[max(0, w - 3):w + 1].sum(), ewma,
            int((hist > 0).sum()), weeks_since, float(hist.sum()), float(harm_wk.get(c, 1.0))]
    prob = float(gb.predict_proba(np.array([feat]))[:, 1][0])
    fc_rows.append((c, prob, int(counts[w]), int(weeks_since)))
fc = pd.DataFrame(fc_rows, columns=["cell", "prob", "recent", "weeks_quiet"])
# next-week watch: low recent activity but high predicted probability, deduped by junction label
fc["label"] = fc.cell.map(CLABEL)
GENERIC = {"Bengaluru", "Unnamed Road", "Unknown"}
cand = fc[(fc.recent == 0) & (fc.weeks_quiet >= 1)].sort_values("prob", ascending=False)  # truly quiet -> predicted to re-flare
seen = set(); nw = []
for c, p, r, q, lab in cand[["cell", "prob", "recent", "weeks_quiet", "label"]].values:
    lab = str(lab)
    if lab in seen or lab in GENERIC: continue
    seen.add(lab)
    nw.append({"label": lab, "prob": round(float(p), 2), "recent": int(r), "weeks_quiet": int(q),
               "lat": round(float(CLL.loc[c, "lat"]), 5), "lon": round(float(CLL.loc[c, "lon"]), 5)})
    if len(nw) >= 10: break
M["cri_next_week"] = nw
M["cri_high_risk_count"] = int((fc.prob >= 0.5).sum())
M["cri_dormant_flag_count"] = int(((fc.recent == 0) & (fc.prob >= 0.5)).sum())

# ===== CONFORMAL ABSTENTION LAYER (split-conformal, class-conditional + reject option) =====
# the model says "I don't know" instead of guessing -> a distribution-free miss-rate guarantee.
# 3-way temporal split: TRAIN < (split-3) · CALIBRATION [split-3, split) · TEST >= split (=te).
cal_start = split - 3
P_trc = P[P.week < cal_start]
P_cal = P[(P.week >= cal_start) & (P.week < split)]
gbc = GradientBoostingClassifier(n_estimators=120, max_depth=3, random_state=0).fit(P_trc[FEATS], P_trc.y)
pcal = gbc.predict_proba(P_cal[FEATS]); ycal = P_cal.y.values
pte = gbc.predict_proba(te[FEATS]); yte2 = te.y.values
def cls_quantile(cls, alpha):                     # conformal per-class nonconformity quantile
    s = 1.0 - pcal[ycal == cls, cls]; n = len(s)
    if n == 0: return 1.0
    lvl = min(1.0, np.ceil((n + 1) * (1 - alpha)) / n)
    return float(np.quantile(s, lvl, method="higher"))
# one-sided "don't miss a re-fire" guarantee: P(1 not in prediction set | y=1) <= alpha
guar = []
for a in (0.05, 0.10, 0.20):
    q1a = cls_quantile(1, a)
    inc1a = (1.0 - pte[:, 1]) <= q1a
    guar.append({"alpha": a, "miss": round(float((~inc1a[yte2 == 1]).mean()), 3) if (yte2 == 1).any() else 0.0})
M["cri_conformal_guarantee"] = guar
# at alpha=0.10: 3-bucket prediction sets {1}=commit re-fire, {0}=commit quiet, {0,1}=ABSTAIN
A = 0.10
q0 = cls_quantile(0, A); q1 = cls_quantile(1, A)
inc0 = (1.0 - pte[:, 0]) <= q0; inc1 = (1.0 - pte[:, 1]) <= q1
bucket = np.where(inc1 & ~inc0, "refire", np.where(inc0 & ~inc1, "quiet", "abstain"))
def bk(b):
    m = bucket == b
    return {"n": int(m.sum()), "rate": round(float(yte2[m].mean()), 3) if m.any() else 0.0}
M["cri_conformal_alpha"] = A
M["cri_conformal_buckets"] = {"refire": bk("refire"), "quiet": bk("quiet"), "abstain": bk("abstain")}
M["cri_conformal_miss_at10"] = round(float((~inc1[yte2 == 1]).mean()), 3)
M["cri_test_base_rate"] = round(float(yte2.mean()), 3)
# expected calibration error (raw probs) — disclosed as an asset: the conformal SET carries the guarantee
def ece(p, y, bins=10):
    e = 0.0; edges = np.linspace(0, 1, bins + 1)
    for i in range(bins):
        m = (p >= edges[i]) & ((p < edges[i + 1]) if i < bins - 1 else (p <= edges[i + 1]))
        if m.sum(): e += m.mean() * abs(p[m].mean() - y[m].mean())
    return round(float(e), 3)
M["cri_ece"] = ece(pte[:, 1], yte2)

# ======================================================================
# MODEL 2 — TQ: ticket rejection-risk classifier on validation_status
# ======================================================================
lab = df[df.validation_status.isin(["approved", "rejected"])].copy()
lab["y"] = (lab.validation_status == "rejected").astype(int)   # predict REJECTION
M["tq_n_labeled"] = int(len(lab)); M["tq_base_reject"] = round(float(lab.y.mean()), 3)
lab["hour"] = lab["dt"].dt.hour; lab["dow"] = lab["dt"].dt.dayofweek
# temporal holdout FIRST (so target-encoding sees train only -> no leakage)
order = lab["dt"].argsort().values
cut = int(0.75 * len(order))
trn, tst = order[:cut], order[cut:]
lab = lab.reset_index(drop=True)
trn = np.array(sorted(range(len(lab)), key=lambda i: lab["dt"].iloc[i]))[:cut]
tst = np.array(sorted(range(len(lab)), key=lambda i: lab["dt"].iloc[i]))[cut:]
gmean = float(lab.y.iloc[trn].mean())
def smoothed_rate(col, m=30.0):
    g = lab.iloc[trn].groupby(col).y.agg(["sum", "count"])
    rate = (g["sum"] + m * gmean) / (g["count"] + m)           # smoothed toward global mean
    return lab[col].map(rate).fillna(gmean).values
op_reject = smoothed_rate("created_by_id")                     # operator reliability (train-derived)
dev_reject = smoothed_rate("device_id")                        # device reliability
oc_reject = smoothed_rate("offence_code")                      # offence-type reliability
top_types = lab.vehicle_type.value_counts().head(8).index
top_st = lab.police_station.value_counts().head(12).index
X = pd.DataFrame({
    "op_reject": op_reject, "dev_reject": dev_reject, "oc_reject": oc_reject,
    "harm": lab.harm.values, "hour": lab.hour.values, "dow": lab.dow.values,
})
for t in top_types: X[f"vt_{t}"] = (lab.vehicle_type == t).astype(int).values
for s in top_st: X[f"st_{s}"] = (lab.police_station == s).astype(int).values
y = lab.y.values
gb2 = GradientBoostingClassifier(n_estimators=150, max_depth=3, random_state=0).fit(X.iloc[trn], y[trn])
p2 = gb2.predict_proba(X.iloc[tst])[:, 1]
M["tq_auc"] = round(float(roc_auc_score(y[tst], p2)), 3)
M["tq_accuracy"] = round(float(((p2 >= 0.5).astype(int) == y[tst]).mean()), 3)
_rename = {"op_reject": "operator history", "dev_reject": "device history", "oc_reject": "offence-type history",
           "harm": "road-class harm", "hour": "hour of day", "dow": "day of week"}
imp2 = sorted(zip(X.columns, gb2.feature_importances_), key=lambda x: -x[1])
M["tq_top_features"] = [{"name": _rename.get(n, n.replace("vt_", "type:").replace("st_", "stn:")), "importance": round(float(v), 3)}
                        for n, v in imp2[:6]]
# governance insight: stations with highest observed rejection rate (>=500 labeled)
sr = lab.groupby("police_station").y.agg(["mean", "size"])
sr = sr[sr["size"] >= 500].sort_values("mean", ascending=False).head(6)
M["tq_high_reject_stations"] = [{"name": s, "reject_rate": round(float(r["mean"]), 3), "n": int(r["size"])}
                                for s, r in sr.iterrows()]

# ======================================================================
DATA = {
    "cri": {
        "method": "Discrete-time survival / pooled-logistic hazard on a corner-week panel; gradient-boosted. Predicts P(corner records a violation next week | its history). Place-based — never scores individuals.",
        "n_cells": M["cri_n_cells"], "n_panel": M["cri_n_panel"], "weeks": int(W),
        "split_week": M["cri_split_week"], "base_rate": M["cri_base_rate"],
        "auc": M["cri_auc_gbm"], "auc_logreg": M["cri_auc_logreg"], "brier": M["cri_brier_gbm"],
        "auc_persistence": M["cri_auc_persistence"], "beats_baseline": M["cri_beats_baseline"],
        "precision_at50": M["cri_precision_at50"], "lift_at50": M["cri_lift_at50"],
        "high_risk_count": M["cri_high_risk_count"], "dormant_flag_count": M["cri_dormant_flag_count"],
        "top_features": M["cri_top_features"], "next_week": M["cri_next_week"],
        "conformal": {
            "alpha": M["cri_conformal_alpha"], "miss_at10": M["cri_conformal_miss_at10"],
            "test_base_rate": M["cri_test_base_rate"], "ece": M["cri_ece"],
            "guarantee": M["cri_conformal_guarantee"], "buckets": M["cri_conformal_buckets"],
        },
    },
    "tq": {
        "method": "Supervised gradient-boosted classifier on validation_status (approved vs rejected) — a real 165k-row label. Flags enforcement QUALITY / contestable tickets; audits process, not people.",
        "n_labeled": M["tq_n_labeled"], "base_reject": M["tq_base_reject"],
        "auc": M["tq_auc"], "accuracy": M["tq_accuracy"],
        "top_features": M["tq_top_features"], "high_reject_stations": M["tq_high_reject_stations"],
    },
}
json.dump(DATA, open(f"{OUT}/models.json", "w"), indent=2)
HEADER = "/* AUTO-GENERATED by src/parkwatch_model.py — real, out-of-sample-validated models from the BTP CSV. Do not hand-edit. */\n\n"
open(TS_OUT, "w").write(HEADER + "export const models = " + json.dumps(DATA, indent=2) + " as const;\n")
print(json.dumps({k: M[k] for k in M if not isinstance(M[k], list)}, indent=2))
print("\nNEXT-WEEK re-igniting corners:", [(x["label"], x["prob"]) for x in M["cri_next_week"][:5]])
print("[wrote]", TS_OUT)
