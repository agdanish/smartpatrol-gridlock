import React from "react";
import { Panel, SectionTitle, Badge, MapplsBadge } from "./ui";
import { fmt } from "../lib/format";
import { derived } from "../data/derivedData";

/* ---------------------------------------------------------------------------
 * RolloutPanel — the FEASIBILITY centerpiece ("Rollout") for SmartPatrol.
 * Goal: convince a procurement officer that this ships Monday on data
 * BTP already has, on infrastructure BTP already runs. Government-grade, calm.
 * Every number below is precomputed and frozen before roll-call.
 * ------------------------------------------------------------------------- */

const bs = derived.blindspot;

/* Real constants (verbatim) ----------------------------------------------- */
const VIOLATIONS = 298450;
const CORNER_CELLS = 5796;
const STATIONS = 54;
const WINDOW = "2023-11-10 → 2024-04-08";

/* ---- tiny inline line icons (no emoji, stroke-only, currentColor) -------- */
type IconProps = { className?: string };
const ic = "h-5 w-5 shrink-0";

function IconExport({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`${ic} ${className}`} aria-hidden="true">
      <path d="M5 4h9l5 5v11H5z" />
      <path d="M14 4v5h5" />
      <path d="M8 13h7M8 16.5h7" />
    </svg>
  );
}
function IconCompute({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`${ic} ${className}`} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    </svg>
  );
}
function IconArtifact({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`${ic} ${className}`} aria-hidden="true">
      <path d="M5 4h7l4 4h3v12H5z" />
      <path d="M8.5 12.5l2 2 4-4" />
    </svg>
  );
}
function IconConsole({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`${ic} ${className}`} aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M7 9l3 2.5L7 14M12.5 14H16" />
      <path d="M9 21h6M12 17v4" />
    </svg>
  );
}
function IconSheet({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`${ic} ${className}`} aria-hidden="true">
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8M8 16.5h8M8 9.5h3" />
    </svg>
  );
}

/* ---- pipeline data ------------------------------------------------------- */
type Stage = {
  n: string;
  Icon: (p: IconProps) => JSX.Element;
  label: string;
  sub: string;
  tone: string;
};
const STAGES: Stage[] = [
  { n: "01", Icon: IconExport, label: "BTP nightly export", sub: "One parking-ticket CSV — data BTP already produces.", tone: "text-mid" },
  { n: "02", Icon: IconCompute, label: "Batch compute · parkwatch", sub: "Corner ranking · harm index · offender graph · max-covering roster.", tone: "text-struct" },
  { n: "03", Icon: IconArtifact, label: "Frozen artifacts (JSON)", sub: "Signed, versioned, immutable before roll-call.", tone: "text-mid" },
  { n: "04", Icon: IconConsole, label: "Read-only console", sub: "Renders frozen numbers — never computes live.", tone: "text-mid" },
  { n: "05", Icon: IconSheet, label: "Printed 8 AM duty sheet", sub: "Per-beat roster handed to officers at roll-call.", tone: "text-brass" },
];

const PIPE_CHIPS = ["Sensor-free", "No live inference (crash-proof)", "Runs on a laptop nightly"];

/* ---- credibility-card primitives ---------------------------------------- */
function Card({
  kicker,
  title,
  children,
  className = "",
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-line2 ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">
        {kicker}
      </span>
      <h3 className="mt-1.5 font-display text-[18px] font-semibold leading-snug text-ink">
        {title}
      </h3>
      <div className="mt-2.5 text-[13px] leading-relaxed text-mid">{children}</div>
    </div>
  );
}

/* Small horizontal held/churned bar for the backtest card. */
function HeldBar() {
  return (
    <div className="mt-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-line bg-panel3">
        <div
          className="h-full bg-green/70"
          style={{ width: `${bs.stability_pct}%` }}
          aria-hidden="true"
        />
        <div
          className="h-full bg-brass/70"
          style={{ width: `${bs.churn_pct}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="tnum text-green">{fmt(bs.stability_pct, 1)}% held</span>
        <span className="tnum text-brass">{fmt(bs.churn_pct, 1)}% churned</span>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="tnum mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-line2 bg-panel2 text-[10px] font-semibold text-brass">
        {n}
      </span>
      <span className="text-[12.5px] leading-relaxed text-mid">{children}</span>
    </li>
  );
}

/* ---- honesty grammar (copied from ImpactBand): MEASURED = green solid dot,
 * asserted as fact; ESTIMATED = dashed-amber, assumption printed inline with an
 * `assume:` prefix, never asserted. These two primitives keep the seam visible. */
function MeasuredHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-green" />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-green">
        {children}
      </span>
    </div>
  );
}
function EstimatedHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-2 w-2 rounded-full border border-dashed border-brass" />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brass/90">
        {children}
      </span>
    </div>
  );
}

/* A MEASURED metric chip — green-leaning, asserted. */
function MeasuredChip({
  v,
  k,
  s,
}: {
  v: string;
  k: string;
  s: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel2 p-3">
      <div className="font-display text-[22px] font-bold tabular-nums text-ink">{v}</div>
      <div className="mt-0.5 text-[11.5px] font-medium text-mid">{k}</div>
      <div className="mt-1 text-[10.5px] leading-snug text-low">{s}</div>
    </div>
  );
}

/* An ESTIMATED chip — dashed-amber, assumption printed inline. Never asserted. */
function EstimatedChip({
  v,
  k,
  assume,
}: {
  v: string;
  k: string;
  assume: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-brass/35 bg-brass/[0.04] p-3">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[20px] font-bold tabular-nums text-brass">{v}</span>
        <span className="text-[11.5px] font-medium text-mid">{k}</span>
      </div>
      <div className="mt-1 text-[10.5px] leading-snug text-low">
        <span className="font-mono text-low/90">assume:</span> {assume}
      </div>
    </div>
  );
}

/* ---- honesty dot tags for the risk register ----------------------------- *
 * Same grammar as the headers: green solid dot = real/shipped fact asserted;
 * dashed-brass dot = planned / not-yet-wired. Used inline inside table cells. */
function RealDot() {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-green align-middle"
      aria-hidden="true"
    />
  );
}
function PlannedDot() {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full border border-dashed border-brass align-middle"
      aria-hidden="true"
    />
  );
}
/* A small dashed-brass inline note for "planned / not yet wired". */
function PlannedNote({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1 inline-flex items-start gap-1.5 rounded-md border border-dashed border-brass/35 bg-brass/[0.04] px-1.5 py-0.5 text-[10.5px] leading-snug text-brass/90">
      <span className="mt-[3px]">
        <PlannedDot />
      </span>
      <span>
        <span className="font-mono text-low/90">planned:</span> {children}
      </span>
    </span>
  );
}

/* ---- Operational risk register data ------------------------------------- */
type Risk = {
  id: string;
  mode: string;
  happens: React.ReactNode;
  mitigation: React.ReactNode;
  /* whether the headline mitigation is real (shipped) or planned */
  real: boolean;
  planned?: React.ReactNode;
};
const RISKS: Risk[] = [
  {
    id: "R1",
    mode: "Export arrives late, or not at all",
    happens: "Roll-call still needs a duty sheet at 8 AM.",
    mitigation: (
      <>
        Yesterday's <b className="text-ink">frozen artifacts</b> stand in —
        stale-but-safe. The console renders the last good plan, not an error.
      </>
    ),
    real: true,
  },
  {
    id: "R2",
    mode: "Malformed / garbage rows",
    happens: "Bad timestamps and out-of-area points could poison the ranking.",
    mitigation: (
      <>
        Bad timestamps are <b className="text-ink">coerce-dropped</b>, lat/lon
        outside the city bbox rejected —{" "}
        <span className="tnum text-ink">{fmt(168)}</span> of{" "}
        <span className="tnum text-ink">{fmt(VIOLATIONS)}</span> (
        <span className="tnum">0.06%</span>) dropped, and the count is reported,
        not hidden.
      </>
    ),
    real: true,
    planned: "explicit per-column schema-assert on input",
  },
  {
    id: "R3",
    mode: "A predicted corner is simply wrong",
    happens: "The model can rank a corner that the officer knows is quiet today.",
    mitigation: (
      <>
        The officer overrides. <b className="text-ink">AI proposes, officer
        disposes</b> — the duty sheet is a recommendation, never an order.
      </>
    ),
    real: true,
  },
  {
    id: "R4",
    mode: "Patterns drift over time",
    happens: "Last quarter's hotspots may not be next quarter's.",
    mitigation: (
      <>
        The out-of-time backtest + the{" "}
        <span className="font-mono text-ink">verify_headlines.py</span> assert
        suite (<span className="tnum text-green">15/15</span>) catch drift —
        re-run monthly.
      </>
    ),
    real: true,
    planned: "automated nightly drift cron",
  },
  {
    id: "R5",
    mode: "The model is unsure",
    happens: "Forcing a call on a borderline corner wastes an officer's shift.",
    mitigation: (
      <>
        Conformal abstention: it <b className="text-ink">declines</b> ~
        <span className="tnum text-ink">{fmt(9667)}</span> corner-weeks rather than
        guess — miss ≤<span className="tnum">10%</span>, measured{" "}
        <span className="tnum text-green">7.6%</span> out-of-time.
      </>
    ),
    real: true,
  },
  {
    id: "R6",
    mode: "The console crashes on stage",
    happens: "A render fault in one panel could take down the demo.",
    mitigation: (
      <>
        A React <b className="text-ink">ErrorBoundary</b> isolates the panel; the{" "}
        <b className="text-ink">printed duty sheet</b> works fully offline,
        regardless.
      </>
    ),
    real: true,
  },
];

/* ---- Deployment timeline (ESTIMATE — entirely dashed-brass) -------------- */
type Milestone = { when: string; what: React.ReactNode; gate: "BTP" | "us" };
const TIMELINE: Milestone[] = [
  {
    when: "Days 1–3",
    what: (
      <>
        Data-sharing MoU signed + parking-export access granted.
      </>
    ),
    gate: "BTP",
  },
  {
    when: "Day 4",
    what: (
      <>
        Pipeline run (≈30s) on the first real export — software already built and
        run.
      </>
    ),
    gate: "us",
  },
  {
    when: "Day 5",
    what: (
      <>
        Validation: <span className="font-mono text-mid">verify_headlines.py</span>{" "}
        assert suite + out-of-time backtest on BTP's own data.
      </>
    ),
    gate: "us",
  },
  {
    when: "Week 2",
    what: <>Pilot roster goes live at <b className="text-ink">one station</b>.</>,
    gate: "BTP",
  },
  {
    when: "Week 2 end",
    what: <>Roll-call integration — the duty sheet enters the 8 AM briefing.</>,
    gate: "BTP",
  },
];

/* ---- Adoption & Sustainability (viability) data ------------------------- */
type AdoptCard = {
  kicker: string;
  title: string;
  body: React.ReactNode;
  measured: { v: string; k: string; s: string };
  estimate?: { v: string; k: string; assume: string };
};
const ADOPTION: AdoptCard[] = [
  {
    kicker: "Who pays",
    title: "Nobody buys hardware",
    body: (
      <>
        Sensor-free by construction — <b className="text-ink">no per-corner devices</b>,
        no installation, no maintenance contract. The only cost is the nightly compute,
        which runs on a laptop BTP already owns.
      </>
    ),
    measured: { v: "₹0", k: "capital expenditure", s: "no cameras, no sensors, no street hardware" },
    estimate: {
      v: "self-funding",
      k: "framing only",
      assume:
        "BTP recorded ~₹251 cr in fines in 2025 (context, NOT parking-attributable) — sharper enforcement plausibly self-funds; not a measured return",
    },
  },
  {
    kicker: "Who runs it",
    title: "One analyst, existing roll-call",
    body: (
      <>
        A single BTP analyst kicks off the nightly batch. It drops the{" "}
        <b className="text-ink">8 AM roster + repeat-offender watchlist</b> straight into
        the roll-call that already happens every morning. No new unit, no new headcount,
        no change to the chain of command.
      </>
    ),
    measured: { v: "1", k: "analyst, existing ops", s: "fits current roll-call — no new unit to stand up" },
  },
  {
    kicker: "Why it sticks",
    title: "AI proposes, officer disposes",
    body: (
      <>
        The console only ever proposes; the officer decides. DPDP-aligned (locations and
        vehicles, never individuals), fully auditable from frozen artifacts. It rides into
        BTP as an <b className="text-ink">adoption channel for ASTraM</b> — it complements
        the platform, it does not compete with it.
      </>
    ),
    measured: { v: "Human-in-loop", k: "at every step", s: "governance + DPDP posture, auditable by design" },
  },
];

export default function RolloutPanel() {
  return (
    <div>
      {/* 1 — Intro --------------------------------------------------------- */}
      <SectionTitle
        kicker="FROM DATASET TO 8 AM ROLL-CALL"
        title="How SmartPatrol ships"
        sub="No new sensors, no live AI on the street. A nightly batch turns BTP's own export into tomorrow's printed duty sheet — auditable, cheap, and deployable on existing data."
      />

      {/* 2 — Deployment architecture -------------------------------------- */}
      <Panel className="mb-8 p-5 md:p-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">
          Deployment architecture
        </div>
        <p className="mb-5 max-w-2xl text-[13px] leading-relaxed text-mid">
          A one-direction nightly pipeline. Each stage is a precomputed handoff —
          no online model, no street-side hardware.
        </p>

        {/* Pipeline: row on desktop, stack on mobile */}
        <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
          {STAGES.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex flex-1 flex-col rounded-xl border border-line bg-panel2 p-3.5">
                <div className="flex items-center gap-2">
                  <s.Icon className={s.tone} />
                  <span className="tnum font-mono text-[11px] text-low">{s.n}</span>
                </div>
                <div className="mt-2 text-[13px] font-semibold leading-snug text-ink">
                  {s.label}
                </div>
                <div className="mt-1 text-[11.5px] leading-relaxed text-mid">{s.sub}</div>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className="flex items-center justify-center text-low md:px-0.5"
                  aria-hidden="true"
                >
                  {/* down arrow on mobile, right arrow on desktop */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 rotate-90 md:rotate-0"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Pipeline chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {PIPE_CHIPS.map((c) => (
            <Badge key={c} tone="brand">
              {c}
            </Badge>
          ))}
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-low">
          Every number you see is precomputed and frozen before roll-call; the console
          never computes live.
        </p>
      </Panel>

      {/* 3 — Credibility grid --------------------------------------------- */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {/* a) Validated out-of-time */}
        <Card kicker="Validated out-of-time" title="A real backtest, not a promise">
          <p>
            We built the top-{fmt(bs.total)} corner plan on the{" "}
            <b className="text-ink">first 75 days</b>, then tested it on the{" "}
            <b className="text-ink">last 75</b>.{" "}
            <span className="tnum text-ink">{fmt(bs.held)}</span> of{" "}
            <span className="tnum text-ink">{fmt(bs.total)}</span> corners held —{" "}
            <span className="tnum text-green">{fmt(bs.stability_pct, 1)}%</span>.{" "}
            <span className="tnum text-brass">{fmt(bs.churned)}</span> churned, and the
            console names exactly which.
          </p>
          <HeldBar />
        </Card>

        {/* b) Pilot in 4 weeks */}
        <Card kicker="Pilot in 4 weeks" title="A measurable go / no-go">
          <p>
            <b className="text-ink">20 corners × 4 weeks</b>, scored by synthetic-control
            against matched untreated corners. Success metric:{" "}
            <b className="text-ink">violation-rate drop + officer-hours saved</b>. Framed
            as a proposal — the criteria are fixed before the pilot starts.
          </p>
          <ul className="mt-3 space-y-1.5">
            <Step n={1}>
              Pick 20 top-ranked corners; freeze a matched untreated control set.
            </Step>
            <Step n={2}>
              Run 4 weeks of SmartPatrol rosters against status-quo enforcement.
            </Step>
            <Step n={3}>
              Read the synthetic-control gap — go / no-go on the pre-set metric.
            </Step>
          </ul>
        </Card>

        {/* c) Complementary */}
        <Card kicker="BTP / ASTraM complementary" title="A deployment-brain layer">
          <p>
            Plugs into BTP's existing <b className="text-ink">ASTraM</b> platform, ANPR
            feeds, and the tow-truck crackdown — it does <i>not</i> duplicate them. It
            hands them a ranked patrol roster and a repeat-offender watchlist they
            <b className="text-ink"> can't generate today</b>, computed from data they
            already hold.
          </p>
        </Card>

        {/* e) Officer's day, end-to-end */}
        <Card kicker="Officer's day, end-to-end" title="AI proposes, officer disposes">
          <p>
            Roll-call → printed duty sheet → Mappls turn-by-turn to each beat →
            Koper-curve dwell at the corner → an officer{" "}
            <b className="text-ink">done / diverted</b> feedback loop → next-day
            re-compute. Human-in-the-loop at every step; the console only proposes.
          </p>
          <div className="mt-3.5">
            <MapplsBadge />
          </div>
        </Card>

        {/* f) Procurement-ready governance */}
        <Card kicker="Procurement-ready governance" title="Auditable and low-risk by design">
          <p>
            <b className="text-ink">DPDP-aligned</b>: vehicle IDs only, no personal data.
            Fully reproducible and auditable from the frozen artifacts. It ranks{" "}
            <b className="text-ink">locations</b> and repeat <b className="text-ink">vehicles</b>{" "}
            — never scores individuals — and being sensor-free sidesteps surveillance
            objections.
          </p>
        </Card>
      </div>

      {/* Provenance footnote tying the band to the real window/scale -------- */}
      <p className="mt-4 text-[11.5px] leading-relaxed text-low">
        Grounded in{" "}
        <span className="tnum text-mid">{fmt(VIOLATIONS)}</span> violations across{" "}
        <span className="tnum text-mid">{fmt(CORNER_CELLS)}</span> corner cells and{" "}
        <span className="tnum text-mid">{fmt(STATIONS)}</span> stations · window{" "}
        <span className="font-mono text-mid">{WINDOW}</span> · sensor-free, no new hardware.
      </p>

      {/* 4 — Adoption & Sustainability (VIABILITY) ------------------------- */}
      <div className="mt-10">
        <SectionTitle
          kicker="ADOPTION & SUSTAINABILITY"
          title="Why this gets used — and keeps getting used"
          sub="Adoption is the hard part of govtech. SmartPatrol is built to slot into how BTP already works: nobody buys hardware, one analyst runs it, and the human stays in charge."
        />
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {ADOPTION.map((c) => (
            <div
              key={c.kicker}
              className="flex flex-col rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-line2"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">
                {c.kicker}
              </span>
              <h3 className="mt-1.5 font-display text-[18px] font-semibold leading-snug text-ink">
                {c.title}
              </h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-mid">{c.body}</p>

              <div className="mt-4 flex-1" />

              {/* measured fact, asserted */}
              <MeasuredHeader>Measured · asserted</MeasuredHeader>
              <MeasuredChip v={c.measured.v} k={c.measured.k} s={c.measured.s} />

              {/* estimate, assumption shown — only where one exists */}
              {c.estimate && (
                <div className="mt-3">
                  <EstimatedHeader>Estimated · assumption shown</EstimatedHeader>
                  <EstimatedChip v={c.estimate.v} k={c.estimate.k} assume={c.estimate.assume} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5 — Cost · Timeline · Dependencies strip (FEASIBILITY) ------------ */}
      <Panel className="mt-8 overflow-hidden">
        <div className="border-b border-line p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
            Cost · timeline · dependencies
          </span>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-mid">
            What a procurement officer needs in one glance. Three numbers are{" "}
            <span className="text-green">measured</span> and asserted; the timeline is an{" "}
            <span className="text-brass">estimate</span>, tagged as one.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
          {/* MEASURED zone */}
          <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
            <MeasuredHeader>Measured · asserted as fact</MeasuredHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MeasuredChip
                v="₹0"
                k="capital expenditure"
                s="sensor-free — no hardware to buy or maintain"
              />
              <MeasuredChip
                v="1"
                k="dependency"
                s="BTP's existing parking-ticket CSV export — nothing else"
              />
              <MeasuredChip
                v="≈30s"
                k="nightly compute"
                s="the full batch runs on a laptop, every night"
              />
            </div>
          </div>
          {/* ESTIMATED zone */}
          <div className="p-5">
            <EstimatedHeader>Estimated · assumption shown</EstimatedHeader>
            <EstimatedChip
              v="≈2 weeks"
              k="time-to-live"
              assume="our software runs in ~30s; the ~2 weeks is the buyer's MoU + export access + roll-call sign-off — see the five-milestone plan below, an estimate, not a measured deployment"
            />
          </div>
        </div>
      </Panel>

      {/* 6 — Scaling math (SCALABILITY) ----------------------------------- */}
      <Panel className="mt-8 overflow-hidden">
        <div className="border-b border-line p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
            Scaling math
          </span>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-mid">
            From one station to all{" "}
            <span className="tnum text-ink">{fmt(STATIONS)}</span> — and then to any city.
            Three things make that near-free, and all three are{" "}
            <span className="text-green">measured</span>, not promised.
          </p>

          {/* 1 → 54 → any city ladder */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              { label: "1 station", state: "shipped" as const },
              { label: `all ${STATIONS}`, state: "shipped" as const },
              { label: "any city", state: "next" as const },
            ].map((rung, i) => (
              <React.Fragment key={rung.label}>
                {i > 0 && (
                  <span className="text-low" aria-hidden="true">
                    →
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${
                    rung.state === "shipped"
                      ? "border-green/30 bg-green/10 text-green"
                      : "border-dashed border-brass/35 bg-brass/[0.04] text-brass/90"
                  }`}
                >
                  <span className="tnum">{rung.label}</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-80">
                    {rung.state === "shipped" ? "shipped" : "next"}
                  </span>
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Three legs — all measured / architectural */}
        <div className="p-5">
          <MeasuredHeader>Measured · why it scales for near-zero cost</MeasuredHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-line bg-panel2 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
                Compute
              </div>
              <div className="mt-1.5 font-display text-[22px] font-bold tabular-nums text-ink">
                ≈30s nightly
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mid">
                Near-zero marginal cost per added station — the batch is one laptop run,
                whether it covers one station or all{" "}
                <span className="tnum text-ink">{fmt(STATIONS)}</span>.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-panel2 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
                Portability
              </div>
              <div className="mt-1.5 font-display text-[22px] font-bold tabular-nums text-ink">
                6-column contract
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mid">
                Any city with parking-violation data maps in:{" "}
                <span className="font-mono text-[11px] text-low">
                  lat · lon · vehicle_number · violation_type · created_datetime ·
                  police_station
                </span>
                . Architecture, not a rewrite.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-panel2 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
                Generalization
              </div>
              <div className="mt-1.5 font-display text-[22px] font-bold tabular-nums text-ink">
                holds across time &amp; place
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mid">
                <span className="tnum text-green">73.9%</span> out-of-time backtest, and{" "}
                <span className="tnum text-green">6</span> enforcement rings found with{" "}
                <b className="text-ink">zero geographic input</b> — it learns structure,
                not this one map.
              </p>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-low">
            Sensor-free means no per-corner hardware to multiply; the only thing that
            grows with scale is a few more rows in the nightly CSV.
          </p>
        </div>
      </Panel>

      {/* 6b — Operational risk register (FEASIBILITY · what breaks, what saves) */}
      <Panel className="mt-8 overflow-hidden">
        <div className="border-b border-line p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
            ★ Operational risk register
          </span>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-mid">
            What can go wrong on a real Monday — and exactly what catches it.
            Green dot = shipped and asserted; dashed-brass = planned, not yet
            wired.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-green">
              <RealDot /> shipped · real
            </span>
            <span className="inline-flex items-center gap-1.5 text-brass/90">
              <PlannedDot /> planned · not yet wired
            </span>
          </div>
        </div>

        {/* Risk table — header row, then 6 rows */}
        <div className="p-5">
          {/* column header (hidden on mobile, where each row stacks) */}
          <div className="hidden grid-cols-[auto_1.1fr_1fr_1.5fr] gap-x-4 border-b border-line pb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-low md:grid">
            <span className="w-7">#</span>
            <span>Failure mode</span>
            <span>What happens</span>
            <span>Mitigation</span>
          </div>

          <div className="divide-y divide-line">
            {RISKS.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-1 gap-x-4 gap-y-1 py-3 md:grid-cols-[auto_1.1fr_1fr_1.5fr] md:items-start"
              >
                {/* id + dot */}
                <div className="flex items-center gap-2 md:w-7">
                  {r.real ? <RealDot /> : <PlannedDot />}
                  <span className="tnum font-mono text-[11px] font-semibold text-brass">
                    {r.id}
                  </span>
                </div>
                {/* failure mode */}
                <div className="text-[12.5px] font-semibold leading-snug text-ink">
                  {r.mode}
                </div>
                {/* what happens */}
                <div className="text-[12px] leading-relaxed text-mid">
                  {r.happens}
                </div>
                {/* mitigation (+ optional planned note) */}
                <div className="text-[12px] leading-relaxed text-mid">
                  {r.mitigation}
                  {r.planned && (
                    <div className="mt-1.5">
                      <PlannedNote>{r.planned}</PlannedNote>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Closing line — prominent */}
          <div className="mt-5 rounded-xl border border-green/30 bg-green/[0.07] px-4 py-3">
            <p className="font-display text-[14px] font-semibold leading-snug text-ink md:text-[15px]">
              The default failure mode is{" "}
              <span className="text-green">yesterday's good plan</span> — never no
              plan.
            </p>
          </div>
        </div>

        {/* Input contract & data quality — compact sub-block under the table */}
        <div className="border-t border-line bg-panel2/40 p-5">
          <MeasuredHeader>Input contract &amp; data quality</MeasuredHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-line bg-panel2 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mid">
                6-column contract
              </div>
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-low">
                latitude · longitude · vehicle_number · violation_type ·
                created_datetime · police_station
              </p>
            </div>
            <div className="rounded-xl border border-line bg-panel2 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mid">
                Bad data, handled
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mid">
                Bad timestamps are coerced-and-dropped; rows outside the city
                bbox are rejected. Nothing silently corrupts the ranking.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-panel2 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mid">
                Reported, not hidden
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mid">
                <span className="tnum text-ink">{fmt(168)}</span> rows (
                <span className="tnum">0.06%</span>) dropped — the same count the
                status strip already shows, never buried.
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] font-medium leading-relaxed text-ink">
            Bad data fails loud and small, never silent.
          </p>
        </div>
      </Panel>

      {/* 6c — Deployment timeline (ESTIMATE — entirely dashed-brass) -------- */}
      <Panel className="mt-8 overflow-hidden">
        <div className="border-b border-line p-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
            Deployment timeline
          </span>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-mid">
            A five-milestone plan to first live roll-call. This whole block is an{" "}
            <span className="text-brass">estimate</span> — the gating bottleneck
            is the <b className="text-ink">buyer's</b> data-sharing, not our
            software.
          </p>
        </div>

        <div className="p-5">
          <EstimatedHeader>Estimated · plan, not a measured deployment</EstimatedHeader>
          <ol className="space-y-3">
            {TIMELINE.map((m, i) => (
              <li
                key={m.when}
                className="flex items-start gap-3 rounded-xl border border-dashed border-brass/35 bg-brass/[0.04] p-3.5"
              >
                <Step n={i + 1}>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-brass">
                    {m.when}
                  </span>
                  <span className="mx-1.5 text-low">·</span>
                  <span className="text-[12.5px] text-mid">{m.what}</span>
                  <span
                    className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 align-middle text-[10px] font-medium tracking-wide ${
                      m.gate === "BTP"
                        ? "border-struct/30 bg-struct/10 text-struct"
                        : "border-green/30 bg-green/10 text-green"
                    }`}
                  >
                    {m.gate === "BTP" ? "BTP-gated" : "software · already run"}
                  </span>
                </Step>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[12px] leading-relaxed text-low">
            Steps 2–3 are software we have already built and run; steps 1, 4 and 5
            gate on BTP — the MoU, the export access, and the roll-call sign-off.
            We hold none of those switches, so we tag the timeline an estimate,
            not a promise.
          </p>
        </div>
      </Panel>

      {/* 7 — Closing band -------------------------------------------------- */}
      <div className="mt-5 rounded-2xl border border-brass/30 bg-brass/10 px-5 py-4 text-center">
        <p className="font-display text-[15px] font-semibold leading-snug text-ink md:text-[17px]">
          Built on data BTP already has. Deployable on infrastructure BTP already runs.
        </p>
      </div>
    </div>
  );
}
