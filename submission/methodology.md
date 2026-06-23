# SmartPatrol — Supporting Methodology Document

**Predictive Enforcement-Deployment Brain for the Bengaluru Traffic Police**
Gridlock 2.0 · Round 2 · Theme 1 (Problem Statement 1)

---

## 0. One-paragraph summary

SmartPatrol turns the single provided parking-violation dataset into a daily, auditable patrol-and-tow deployment plan for the Bengaluru Traffic Police (BTP). It is **sensor-free**: no flow sensors, no CCTV, no live feeds — only the 298,450-row BTP parking-violation CSV. From that one file we (1) build a severity-weighted **Enforcement Harm Index (EHI)** hotspot map on a ~150 m grid, (2) solve an **equity-constrained maximum-covering** assignment for *K* patrols / tow-trucks, (3) construct a **Cross-Jurisdiction Chronic-Offender Graph** that surfaces repeat vehicles invisible to any single station, and (4) schedule **coverage-gap-aware, Koper-dosed** shift timings from timestamps alone. Every load-bearing number in this document is regenerated deterministically by `src/parkwatch_prep.py`, which is both the build step and a fact-verifier; its output is `reports/parkwatch/verification_report.json`. Where the data cannot support a claim — most importantly the road-class severity signal, which is present on only **10.3%** of rows — we say so explicitly and present that component as an *illustrative labeled proxy*, not a measurement.

---

## 1. Problem framing and mapping to the brief

BTP must deploy a finite enforcement force — on record, roughly **4,792 personnel** and **10 tow trucks** against **~1.23 crore registered vehicles** and **154 declared hotspots** (12 corridors + 43 junctions + 99 roads) — and must do so in a way that survives the post-2022 towing-harassment backlash. The Commissioner's stated position is that *"manpower is key,"* and the operational requirement that follows is that **every tow must be justifiable by an auditable score**.

SmartPatrol is the **parking-enforcement-deployment layer**: given today's force size *K*, it answers *where* to send units, *when* to be there, and *which chronic vehicles* to watch — and it attaches a transparent reason code to each instruction. This is deliberately scoped **not** to duplicate ASTraM (see §10): ASTraM already does congestion forecasting, CCTV/ANPR, and citizen reporting. SmartPatrol adds the deployment-optimisation and cross-jurisdiction-accountability layer that ASTraM lacks.

Mapping to the four required components:

| # | Component | Nature of the claim |
|---|-----------|---------------------|
| 1 | EHI severity-weighted hotspot map | Novel **application** of a harm taxonomy to enforcement siting — *not* claimed as a patent |
| 2 | Equity-constrained max-covering MILP for *K* units | **Engineering choice**, building on established prior art (cited in §4) |
| 3 | Cross-Jurisdiction Chronic-Offender Graph | The core methodological contribution of this work |
| 4 | Coverage-gap timing / Koper-dosed shift schedule | A practical adaptation of a known policing finding (Koper curve) |

---

## 2. Data

**Source.** A single file: the provided BTP parking-violation export,
`datasets-given-in-web-portal/jan to may police violation_anonymized791b166.csv`.
We use **only** this dataset. (The file *name* contains "jan to may," but the timestamps inside it do not — see the window below. We therefore describe it everywhere as the *"provided ~5-month BTP dataset,"* never as "Jan–May," to avoid a factual misstatement to the jury.)

**Volume.** 298,450 rows total; after restricting to the Bengaluru bounding box, **298,282 rows** remain (168 rows, ~0.06%, fall outside and are dropped).

**Time window.** Parsing `created_datetime` and converting to IST, the data spans
**2023-11-10 00:41:46 +05:30 → 2024-04-08 23:00:46 +05:30** — i.e. ~5 months.

**IST conversion.** Timestamps are read as UTC-aware and converted with `tz_convert("Asia/Kolkata")` before any hour-of-day or day-of-week feature is derived. This matters: enforcement shifts are planned in local time, and an un-converted UTC hour would shift every peak by 5.5 hours.

**Validation-status handling.** `validation_status` partitions the rows as:

| Status | Rows |
|--------|------|
| `approved` | 115,400 |
| `rejected` | 49,754 |
| `NaN` (null) | 125,254 |
| `created1` | 7,044 |
| `processing` | 678 |
| `duplicate` | 320 |

For the **watchlist and chronic-offender accountability** outputs we default to **approved-only**, so that no deployment or watch instruction rests on an unverified or rejected report. For **spatial density / hotspot** estimation we retain the broader set (a violation that was *logged* is evidence that the location attracts violations, regardless of downstream adjudication), and we state this distinction wherever a number is reported. The large null block is a known limitation, discussed in §9.

**Bengaluru bounding box.** `latitude ∈ [12.7, 13.2]`, `longitude ∈ [77.3, 77.9]`. This removes GPS-error outliers far outside the city without trimming any genuine intra-city violation.

**~150 m grid.** We bin each violation into a square cell of side `g = 0.00135°` (≈150 m at Bengaluru's latitude). Cell key = `round(lat/g)*g _ round(lon/g)*g`. This produces **5,796 occupied cells** — fine enough to address a single street-corner patrol box, coarse enough to be statistically stable across the window (validated in §8). 150 m is also a realistic "walk/idle radius" for a stationed unit.

---

## 3. The Enforcement Harm Index (EHI)

### 3.1 Motivation
Pure violation **volume** answers *"where are the most tickets?"* but not *"where does illegal parking do the most harm to traffic flow and safety?"* A car double-parked on a main arterial or blocking a hospital entrance imposes far more congestion/safety cost than one on a quiet residential lane. EHI re-weights each violation by the **road-class harm** implied by its violation type, so the map ranks **harm-density**, not just count-density.

### 3.2 Taxonomy → harm weights (a literature-anchored *labeled proxy*)
We parse the multi-label `violation_type` field and map each road-class label to an ordinal harm weight. The weights are **literature-anchored priors** (arterials and pedestrian-conflict points carry the highest congestion/safety externalities), not fitted parameters:

| Label (substring match) | Weight |
|---|---|
| Parking in a main road | 5 |
| Parking near road crossing / traffic light / zebra | 4 |
| Parking on footpath / near bus stop / school / hospital | 4 |
| Double parking | 3 |
| Wrong parking / No parking (generic) | 1 (base) |

A row's harm is the **max** weight over its labels (the worst road-class present dominates).

### 3.3 The 10.3 % caveat — why this is *illustrative*, not measured
This is the most important honesty point in the document. **Only 10.3 % of rows carry an explicit road-class label** (weight ≥ 3); the remaining ~90 % are generic `WRONG PARKING` / `NO PARKING` and receive the **base weight of 1**. EHI is therefore a **labeled proxy**: it is a principled, transparent severity prior applied to the labeled minority, with a conservative neutral default for the unlabeled majority. We present the EHI re-ordering in the demo as **ILLUSTRATIVE** — it shows *how* a harm lens would reshuffle the roster *if* labels were complete — and we never describe it as a measured congestion impact. When BTP's labeling coverage improves, EHI sharpens automatically with no model change.

### 3.4 Robustness
Because 90 % of rows share the base weight, one might worry EHI is fragile to the weight choices. It is not, and we quantify this honestly:

- **Spearman rank correlation between cell harm-sum and cell volume = 0.953.** The harm map and the volume map are *strongly* concordant — EHI is a refinement, not a contradiction, of the volume signal.
- Against the **top-142 cells** (the "50 % of all chaos" set, see §5), switching from volume ranking to harm ranking **promotes 33 cells** in/out. So the weight choice perturbs ~33 of 142 corners while leaving the bulk ranking intact: the ordering is robust, and the harm lens earns its place by re-prioritising exactly the high-severity corners a pure count would under-rank.

---

## 4. Equity-constrained maximum-covering deployment (MILP)

### 4.1 What it decides
Given today's available units *K* (patrol teams and/or the 10 tow trucks), choose which hotspot cells to staff so as to **maximise covered EHI-weighted demand**, subject to a **fairness floor** so that no police division is systematically starved of coverage.

### 4.2 Formulation (Maximum Covering Location, equity-constrained)
Let cells *i* have EHI-weighted demand `w_i`; candidate deployment sites *j*; coverage set `N_i = {j : j covers i}` (within patrol radius). Binaries: `x_j` = open a unit at *j*; `y_i` = cell *i* is covered.

```
maximise    Σ_i w_i · y_i
subject to  y_i ≤ Σ_{j∈N_i} x_j           ∀ i      (a cell counts only if some open site covers it)
            Σ_j x_j ≤ K                              (force-size budget)
            Σ_{j∈D} x_j ≥ f_D                ∀ divisions D   (equity floor per jurisdiction)
            x_j, y_i ∈ {0,1}
```

The equity floor `f_D` is the policy lever that operationalises *"every area gets fair coverage"* and directly answers the harassment-backlash concern: deployment cannot collapse onto a few divisions.

### 4.3 K-selector
*K* is a runtime input (a slider in the dashboard). The operator sets today's roster size; the MILP re-solves and the marginal EHI-coverage curve shows the diminishing return of each additional unit — giving BTP a defensible "how many units does tonight need?" answer.

### 4.4 Provenance — this is an engineering choice, not an invention
We state plainly that max-covering deployment is **established prior art** and we are *applying*, not inventing, it:

- ScienceDirect **S0965856426002405** (Transportation Research, Jun 2026) — covering-location for enforcement/patrol deployment.
- **Fairness-constrained MCLP**, arXiv **2204.06446** — the equity-floor formulation.

Our contribution here is the *integration* (EHI-weighted demand + per-jurisdiction equity floor + auditable per-assignment reason code), not the optimisation class itself. The IPR claim is reserved for §6.

---

## 5. Spatial concentration (why so few cells matter)

The deployment problem is tractable because violations are extraordinarily concentrated — quantified from the CSV:

- **Stations:** 54 police stations carry the data; **8 stations account for 50 %** and **23 for 80 %** of all violations.
- **Cells:** of 5,796 occupied ~150 m cells, **142 cells carry 50 %** of all violations. These 142 are the "half of all parking chaos" set the demo collapses to.
- **Patrol efficiency:** the **top-100 cells intercept 43.5 %** of violations, versus **1.73 %** expected if 100 cells were chosen at random — a **25.2× efficiency** multiplier for targeted over untargeted patrol.

This is the quantitative justification for predictive deployment at all: a tiny, stable footprint captures the majority of the problem.

---

## 6. Cross-Jurisdiction Chronic-Offender Graph

### 6.1 The blind spot it removes
Each police station sees only the violations *it* logged. A vehicle that offends many times but spreads those tickets across several different stations looks like a minor, low-count offender to *each* station individually and never crosses a chronic-offender threshold anywhere — the real pattern behind the **139 of 711** chronic offenders who operate across 2+ jurisdictions (19 across 3+). The systemic accountability gap is invisible to the very organisational structure that should catch it. **This component, and the patent provisional, are scoped to this idea only.**

### 6.2 Construction
We build a **bipartite graph** of `vehicle_number × police_station`, with edge weight = number of violations that vehicle logged in that station. Collapsing to the vehicle side gives each vehicle a **station-span** (degree = number of distinct stations) and a total violation frequency; centrality on the bipartite graph ranks vehicles by how broadly *and* heavily they offend across jurisdictions.

### 6.3 Verified findings (approved-default; from `verification_report.json`)
- **Repeat offenders:** **711 vehicles** with ≥10 violations; **3,489** with ≥5. The single worst vehicle has **55 violations** — and it sits in **exactly one** station (a within-jurisdiction chronic case; we never claim it spans multiple stations).
- **Chronic + cross-jurisdiction:** of the 711 chronic vehicles, **139 span ≥2 stations** and **19 span ≥3**.
- **Systemic spread:** **11,343 vehicles span ≥2 stations**, **883 span ≥3**, **88 span ≥4**.
- **True demo vehicles** (real anonymised IDs, exact verified counts):
  - **FKN00GL16746 — 22 violations across 4 stations.** This is the graph-flip hero: a 5–6-per-station offender that *no single station* would flag, but the cross-jurisdiction graph surfaces instantly.
  - **FKN00GL17863 — 41 violations across 2 stations.** The highest-frequency confirmed cross-jurisdiction offender.

> **Banned claim, recorded for integrity:** the earlier "55 violations across 3 stations" line is **false** (the 55-violation vehicle is single-station) and must not appear in any pitch, slide, or document.

### 6.4 Why it is patentable
The novelty is the *method*: representing multi-jurisdiction enforcement records as a bipartite vehicle–jurisdiction graph and using cross-jurisdiction span/centrality to escalate offenders that are sub-threshold in every individual jurisdiction. This is the only SmartPatrol component for which we recommend filing a provisional.

---

## 7. Coverage-gap timing and Koper-dosed scheduling

### 7.1 Sensor-free timing from timestamps alone
Using only the IST-converted timestamp, each hotspot cell gets an **hour-of-day × day-of-week** violation profile. Cells whose peak hours fall *outside* current shift coverage are **coverage gaps** — high-harm windows that are presently unpoliced. The schedule shifts presence into those windows.

### 7.2 Koper dosing
Per the **Koper Curve** finding, the residual deterrent of a police presence at a hotspot is maximised by **intermittent 10–15 minute stops** rather than a continuous post. SmartPatrol therefore plans **rotations of 10–15 min** across a small set of nearby high-EHI cells, ordered into an efficient route. This is the "engineering twist": Koper dosing applied to the EHI hotspot set, dosed to the temporal profile, with no sensors required.

---

## 8. Validation

### 8.1 Temporal-stability backtest (out-of-time, no pilot required)
We split the window at its midpoint and independently rank the **top-142 cells** in the **first half** and the **second half**. **73.9 % of the top-142 cells persist** across the two halves. This is genuine out-of-time evidence that the hotspot footprint SmartPatrol would deploy against is *stable* — it is not over-fitting to one stretch of the data — and it requires **no field pilot** to establish.

### 8.2 Synthetic-control pilot protocol (falsifiable, offered not assumed)
For a live pilot we propose a **synthetic-control** design: **20 corners × 4 weeks**, with SmartPatrol-directed Koper-dosed presence on the treated corners and a matched synthetic control built from comparable untreated cells. The pre-registered, falsifiable endpoint is the change in approved violations per corner-week. The demo close states this honestly: *"20 corners, 4 weeks, and we will MEASURE it"* — impact is **offered as measurable**, never asserted as already achieved.

---

## 9. Honesty and limitations

- **No flow field.** The dataset contains parking violations, not vehicle counts or speeds. SmartPatrol therefore makes **no measured-congestion claim**. EHI is a **labeled proxy** for harm, not a flow measurement.
- **10.3 % labeling.** Road-class severity exists on only ~10.3 % of rows; the rest default to base weight 1. The harm re-ordering is **illustrative** and improves automatically as labeling coverage grows.
- **Validation nulls.** 125,254 rows have null `validation_status`. Accountability/watchlist outputs use **approved-only** to avoid acting on unverified reports; density outputs retain the broader set, and every reported number names which set it used.
- **Selection bias.** Violations reflect *where enforcement already happened*, not ground-truth illegal parking. The 73.9 % temporal stability and the synthetic-control pilot are how we test that the deployment generalises despite this.
- **Single dataset.** All conclusions are scoped to the one provided ~5-month BTP file; we make no claim beyond it.

---

## 10. ASTraM boundary (do not duplicate)

ASTraM already provides **congestion forecasting, CCTV/ANPR, and citizen reporting** for Bengaluru. SmartPatrol does **not** rebuild any of that. SmartPatrol is strictly the **parking-enforcement-deployment layer** ASTraM lacks: EHI siting, equity-constrained *K*-unit covering, the cross-jurisdiction offender graph, and Koper-dosed timing. Where ASTraM has richer signals (e.g. live ANPR), SmartPatrol's outputs are designed to *consume* them later — but the Round-2 system depends on **none** of them and runs entirely on the provided CSV.

---

## 11. Reproducibility — how every number regenerates

Every load-bearing figure in this document is produced by a single deterministic script that doubles as a fact-verifier:

```
.venv/bin/python src/parkwatch_prep.py
```

It reads only the provided CSV, performs the IST conversion, bbox filter, EHI weighting, ~150 m gridding, station/cell Pareto, repeat-offender and cross-jurisdiction graph computation, the volume-vs-harm reorder, and the first-half/second-half temporal backtest, then writes:

- `reports/parkwatch/verification_report.json` — the authoritative numbers (298,450 rows; 298,282 in-bbox; window 2023-11-10 → 2024-04-08; 54 stations → 8 = 50 % / 23 = 80 %; 5,796 cells → 142 = 50 %; top-100 = 43.5 % vs 1.73 % random = 25.2×; 711 / 3,489 repeat offenders; max single-vehicle 55 in 1 station; 11,343 / 883 cross-jurisdiction; Spearman 0.953; 33 cells promoted by harm; 73.9 % temporal stability).
- `reports/parkwatch/hotspots_top200.csv` — the precomputed, lat/lon-resolved hotspot backend the dashboard serves read-only.

The dashboard follows a **static-precompute / serve-read-only** architecture: all heavy computation happens offline in this script, the Streamlit app only renders precomputed artefacts, and the live map uses the Mappls (MapMyIndia) v3.0 vector basemap (single provider, "Powered by Mappls" badge on every view, no tile caching) with a pre-recorded backup video as the one-click fallback. The demo is therefore fully deterministic: the same CSV always yields the same roster, the same watchlist, and the same numbers in this document.
