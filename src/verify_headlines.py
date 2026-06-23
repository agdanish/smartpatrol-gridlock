#!/usr/bin/env python3
"""SmartPatrol — HEADLINE-NUMBER ASSERT SUITE (audit-grade reproducibility).
Re-derives every load-bearing claim straight from the 298,450-row BTP CSV and
asserts it matches what the app ships. One command; fails LOUDLY on any drift.
This is the executable form of "every number is auditable".
Run: .venv/bin/python src/verify_headlines.py   (exit 0 = all claims verified)
"""
import sys, ast, warnings
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd

CSV = "datasets-given-in-web-portal/jan to may police violation_anonymized791b166.csv"
G = 0.00135
ok, fail = 0, 0

def check(name, got, want, tol=0):
    global ok, fail
    passed = abs(got - want) <= tol if isinstance(want, (int, float)) else got == want
    print(f"  [{'PASS' if passed else 'FAIL'}] {name}: got {got}, expect {want}" + (f" (±{tol})" if tol else ""))
    ok += passed; fail += (not passed)

print("Re-deriving headline numbers from the raw BTP CSV...\n")
df = pd.read_csv(CSV, low_memory=False)
dt = pd.to_datetime(df["created_datetime"], errors="coerce", utc=True).dt.tz_convert("Asia/Kolkata")
df["half1"] = dt < (dt.min() + (dt.max() - dt.min()) / 2)
df = df[(df.latitude.between(12.7, 13.2)) & (df.longitude.between(77.3, 77.9))].copy()
df["cell"] = [f"{round(a/G)*G:.5f}_{round(b/G)*G:.5f}" for a, b in zip(df.latitude, df.longitude)]

# --- concentration / efficiency ---
cell = df.groupby("cell").size().sort_values(ascending=False)
tot = len(df)
check("corners for 50% of volume", int((cell.cumsum() <= 0.5 * tot).sum()) + 1, 142, tol=2)
check("n stations", df.police_station.nunique(), 54)
st = df.groupby("police_station").size().sort_values(ascending=False)
check("stations for 80%", int((st.cumsum() <= 0.8 * tot).sum()) + 1, 23, tol=1)

# --- offenders / cross-jurisdiction (SACRED) ---
vc = df.groupby("vehicle_number").size()
vst = df.groupby("vehicle_number").police_station.nunique()
chronic = vc[vc >= 10].index
check("chronic offenders (>=10)", int((vc >= 10).sum()), 711, tol=3)
check("max violations one vehicle", int(vc.max()), 55)
check("top-frequency vehicle is single-station", int(df[df.vehicle_number == vc.idxmax()].police_station.nunique()), 1)
check("cross-jurisdiction chronic (>=2 stations)", int((vst[chronic] >= 2).sum()), 139, tol=2)
# the two demo vehicles
for veh, nviol, nst in [("FKN00GL16746", 22, 4), ("FKN00GL17863", 41, 2)]:
    if veh in vc.index:
        check(f"{veh} violations", int(vc[veh]), nviol)
        check(f"{veh} stations", int(vst[veh]), nst)

# --- temporal backtest ---
t1 = set(df[df.half1].groupby("cell").size().sort_values(ascending=False).head(142).index)
t2 = set(df[~df.half1].groupby("cell").size().sort_values(ascending=False).head(142).index)
check("top-142 out-of-time stability %", round(100 * len(t1 & t2) / 142, 1), 73.9, tol=1.0)

# --- harm reorder ---
HARM = {"PARKING IN A MAIN ROAD":5,"PARKING NEAR ROAD CROSSING":4,"PARKING NEAR TRAFFIC LIGHT":4,
        "PARKING NEAR ZEBRA":4,"PARKING ON FOOTPATH":4,"PARKING NEAR BUSTOP":4,"PARKING NEAR SCHOOL":4,
        "PARKING NEAR HOSPITAL":4,"DOUBLE PARKING":3,"WRONG PARKING":1,"NO PARKING":1}
def labels(s):
    try:
        v = ast.literal_eval(s) if isinstance(s, str) and s.strip().startswith("[") else [s]
        return [str(x).strip().upper() for x in v]
    except Exception: return [str(s).strip().upper()]
df["harm"] = df["violation_type"].map(labels).map(lambda ls: max([1.0] + [HARM[k] for l in ls for k in HARM if k in l]))
cs = df.groupby("cell").agg(n=("id", "size"), h=("harm", "sum"))
vol142 = set(cs.sort_values("n", ascending=False).head(142).index)
harm142 = set(cs.sort_values("h", ascending=False).head(142).index)
check("harm-promoted corners (top-142)", len(harm142 - vol142), 33, tol=2)
check("Spearman(volume, harm)", round(float(cs["n"].corr(cs["h"], method="spearman")), 3), 0.953, tol=0.02)
lab = df["violation_type"].map(labels)
road = lab.map(lambda ls: any(any(k in l for k in HARM if HARM[k] >= 3) for l in ls))
check("road-class labeled rows %", round(100 * road.mean(), 1), 10.3, tol=0.6)

print(f"\n{'='*52}\nVERIFIED {ok}/{ok+fail} headline claims from the raw CSV.")
if fail:
    print(f"!!! {fail} CLAIM(S) DRIFTED — investigate before submitting.")
    sys.exit(1)
print("All headline numbers reproduce. The deck is audit-safe.")
sys.exit(0)
