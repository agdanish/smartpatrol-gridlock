import React from "react";
import { Panel, Badge } from "./ui";
import { fmt } from "../lib/format";
import { derived } from "../data/derivedData";

/* ---------------------------------------------------------------------------
 * WatchlistExtras — the time + fleet dimensions of the cross-jurisdiction
 * offender graph. Renders below the network graph in the Watchlist tab.
 * Three stratifications of the same X-JET export: re-offence cadence,
 * fleet over-representation, and emerging-vs-desisting momentum.
 * ------------------------------------------------------------------------- */

const { recidivism, fleet, momentum } = derived;

function PanelHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="border-b border-line p-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
        {kicker}
      </span>
      <h3 className="mt-1 font-display text-lg font-semibold text-ink">{title}</h3>
    </div>
  );
}

/* ---- 1. Recidivism clock -------------------------------------------------- */
function RecidivismClock() {
  const maxCount = Math.max(...recidivism.hist.map((b) => b.count));
  return (
    <Panel className="flex flex-col">
      <PanelHeader kicker="The time dimension" title="Recidivism clock" />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[13px] leading-relaxed text-mid">
          A vehicle ticketed today carries a{" "}
          <span className="font-semibold text-ink">~2-in-3</span> chance of re-offending
          within a week.
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="tnum font-display text-4xl font-semibold leading-none text-brass">
            {fmt(recidivism.median_days, 1)}d
          </span>
          <span className="text-[12px] text-low">median gap</span>
        </div>
        <p className="mt-1.5 text-[12px] text-mid">
          <span className="tnum font-semibold text-ink">
            {fmt(recidivism.pct_within_7d, 1)}%
          </span>{" "}
          within 7 days ·{" "}
          <span className="text-low">
            IQR{" "}
            <span className="tnum">
              {fmt(recidivism.iqr[0], 1)}–{fmt(recidivism.iqr[1], 1)}
            </span>{" "}
            days
          </span>
        </p>

        {/* horizontal histogram of re-offence cadence */}
        <div className="mt-5 flex items-end justify-between gap-1.5" aria-hidden="true">
          {recidivism.hist.map((b) => {
            const h = 12 + (b.count / maxCount) * 56; // 12–68px
            return (
              <div key={b.bucket} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className="w-full rounded-[3px] bg-brass/70"
                  style={{ height: h }}
                />
                <span className="text-[9px] leading-none text-low">{b.bucket}</span>
              </div>
            );
          })}
        </div>

        <p className="mt-auto pt-5 text-[10.5px] leading-snug text-low">
          Empirical re-offence cadence across chronic offenders (≥10 violations) —
          descriptive, not a prediction of any specific next event.
        </p>
      </div>
    </Panel>
  );
}

/* ---- 2. Fleet-linked offenders -------------------------------------------- */
function FleetLinked() {
  const rows = [...fleet.rows].sort((a, b) => b.ratio - a.ratio).slice(0, 6);
  return (
    <Panel className="flex flex-col">
      <PanelHeader kicker="The fleet dimension" title="Fleet-linked offenders" />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[13px] leading-relaxed text-mid">
          <span className="tnum font-semibold text-ink">{fmt(fleet.commercial_count)}</span> of{" "}
          <span className="tnum font-semibold text-ink">{fmt(fleet.xj_count)}</span>{" "}
          cross-jurisdiction offenders{" "}
          <span className="tnum text-brass">({fmt(fleet.commercial_pct)}%)</span> are{" "}
          <span className="font-semibold text-ink">commercial</span> vehicles — a
          fleet-accountability lever, not just individual chasing.
        </p>

        <div className="mt-4 flex flex-col divide-y divide-line/60">
          {rows.map((r) => (
            <div key={r.type} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[11.5px] text-ink">{r.type}</div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-low">
                  <span className="tnum text-mid">{fmt(r.xj_pct, 1)}%</span> of offenders{" "}
                  <span className="text-low">vs</span>{" "}
                  <span className="tnum text-mid">{fmt(r.pop_pct, 1)}%</span> of all vehicles
                </div>
              </div>
              <Badge tone="brand" className="tnum shrink-0 font-semibold">
                {fmt(r.ratio, 1)}×
              </Badge>
            </div>
          ))}
        </div>

        <p className="mt-auto pt-4 text-[10.5px] leading-snug text-low">
          'Commercial' = an explicit vehicle-class set; fleet-linked is inferred from class,
          never an owner/PII join. Talk to the operator, not just the vehicle.
        </p>
      </div>
    </Panel>
  );
}

/* ---- 3. Emerging vs desisting --------------------------------------------- */
function StatTile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "rise" | "fall";
}) {
  const valueColor = tone === "rise" ? "text-green" : "text-mid";
  const ring =
    tone === "rise" ? "border-green/30 bg-green/[0.06]" : "border-line bg-panel2";
  return (
    <div className={`flex-1 rounded-xl border p-3.5 ${ring}`}>
      <div className={`tnum font-display text-3xl font-semibold leading-none ${valueColor}`}>
        {fmt(value)}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-mid">{label}</p>
    </div>
  );
}

function EmergingVsDesisting() {
  return (
    <Panel className="flex flex-col">
      <PanelHeader kicker="The living watchlist" title="Emerging vs desisting" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex gap-3">
          <StatTile
            value={momentum.newly_chronic}
            tone="rise"
            label="invisible in the first half (≤2 tickets), now chronic in the second — escalation to watch"
          />
          <StatTile
            value={momentum.desisted}
            tone="fall"
            label="once-active offenders that went quiet — safe to retire from the active list"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-low">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green" />
            <span className="text-mid">escalating</span>
          </span>
          <span className="text-line2">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-line2" />
            <span className="text-mid">desisting</span>
          </span>
        </div>

        <p className="mt-auto pt-4 text-[10.5px] leading-snug text-low">
          Half-vs-half change detection (split 2024-01-24) turns a static blacklist into a
          living watchlist — catch escalation early, retire desisters.
        </p>
      </div>
    </Panel>
  );
}

/* ---- assembled ------------------------------------------------------------ */
export default function WatchlistExtras() {
  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RecidivismClock />
        <FleetLinked />
        <EmergingVsDesisting />
      </div>

      <Panel className="mt-4 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brass/10 text-brass">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </span>
          <div>
            <h4 className="text-[14px] font-semibold text-ink">Method &amp; claim</h4>
            <p className="mt-1 text-[12px] leading-relaxed text-mid">
              <span className="font-semibold text-ink">
                X-JET (cross-jurisdiction enforcement tomography)
              </span>
              : from one city-wide export, separate each vehicle's jurisdiction{" "}
              <span className="font-semibold text-ink">span</span> (distinct stations) from its{" "}
              <span className="font-semibold text-ink">frequency</span> (count). The graph-flip
              above + this fleet/time stratification has no documented prior art in traffic
              enforcement. Provisional-stage, novel combination — no granted patent claimed.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
