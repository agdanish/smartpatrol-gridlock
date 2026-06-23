import { useMemo, useState } from "react";
import { Panel, Badge } from "./ui";
import { pct } from "../lib/format";
import { useData } from "../useData";

/* =============================================================================
 * #5 COVERAGE EQUITY LEDGER (illustrative)
 * Ranks all stations by how much of THEIR OWN violation volume a shared K-unit
 * patrol plan reaches (intra-station reach), against an illustrative 80%
 * "fairness floor". Pre-empts the predictive-policing critique on our own data:
 * we surface, rather than hide, the jurisdictions our own plan under-serves.
 * Every number comes from coverageByStationK in the data layer.
 * ===========================================================================*/

const FLOOR = 80; // illustrative fairness floor (percent of a station's own volume)
const K_MIN = 3;
const K_MAX = 12;

export default function CoverageEquityLedger() {
  const { coverageByStationK, roster } = useData();
  const [k, setK] = useState(8); // shared K across all stations; default 8

  const kKey = String(k);

  /* Stations that NEVER clear the floor even at the maximum K=12 — derived from
   * the data so the claim is provably true against what we render. */
  const neverClear = useMemo(
    () =>
      new Set(
        Object.entries(coverageByStationK)
          .filter(([, row]) => row[String(K_MAX)] < FLOOR)
          .map(([name]) => name)
      ),
    [coverageByStationK]
  );

  /* Rank all stations by coverage at the SHARED K (descending). */
  const ranked = useMemo(
    () =>
      Object.entries(coverageByStationK)
        .map(([name, row]) => ({ name, cov: row[kKey] }))
        .sort((a, b) => b.cov - a.cov),
    [coverageByStationK, kKey]
  );

  const total = ranked.length;
  const belowFloor = ranked.filter((s) => s.cov < FLOOR).length;
  const neverList = ranked
    .filter((s) => neverClear.has(s.name))
    .map((s) => s.name);

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
            Who do we leave behind?
          </span>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink">
            Coverage equity ledger{" "}
            <span className="text-[15px] font-normal text-low">(illustrative)</span>
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="brand">
            {belowFloor}/{total} below floor at K={k}
          </Badge>
        </div>
      </div>

      <p className="mt-2 max-w-3xl text-[12.5px] leading-snug text-mid">
        Coverage % is of <span className="text-ink">each station&apos;s OWN violation volume</span>{" "}
        (intra-station reach), <span className="text-ink">NOT</span> cross-station priority or
        crime level. Bars rank all {total} stations at a single shared K so no jurisdiction is
        compared on a different budget.
      </p>

      {/* K selector ----------------------------------------------------------- */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="equity-k" className="text-[12px] font-medium text-mid">
          Patrol units per station (K)
        </label>
        <div
          role="radiogroup"
          aria-label="Patrol units per station"
          className="flex flex-wrap items-center gap-1"
        >
          {Array.from({ length: K_MAX - K_MIN + 1 }, (_, i) => K_MIN + i).map((kv) => {
            const on = kv === k;
            return (
              <button
                key={kv}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setK(kv)}
                className={`h-7 w-8 rounded-md border text-[12px] font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/70 ${
                  on
                    ? "border-brass/60 bg-brass/15 text-brass"
                    : "border-line2 bg-panel2 text-mid hover:border-struct/40 hover:text-ink"
                }`}
              >
                {kv}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend --------------------------------------------------------------- */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px]">
        <span className="flex items-center gap-1.5 text-mid">
          <span className="h-3 w-3 rounded-sm bg-[#37685a]" /> Coverage of own volume
        </span>
        <span className="flex items-center gap-1.5 text-brass">
          <span className="inline-block h-3 w-0.5 bg-brass" /> 80% fairness floor
        </span>
        <span className="flex items-center gap-1.5 text-red">
          <span className="h-3 w-3 rounded-sm border border-red/40 bg-red/15" /> Never clears
          floor even at K={K_MAX}
        </span>
      </div>

      {/* Bars ----------------------------------------------------------------- */}
      <ul className="relative mt-5 flex flex-col gap-[5px]" aria-label={`Station coverage at K=${k}`}>
        {/* fairness-floor marker line over the bar track. Each row is:
            [150px label] gap-2(8px) [flex-1 bar] gap-2(8px) [52px value], so the
            bar track runs from 158px to (100% - 60px); the marker sits at FLOOR%
            along that track. */}
        <li
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-0 z-10"
          style={{ left: `calc(158px + ${FLOOR} * (100% - 218px) / 100)` }}
        >
          <div className="h-full w-px bg-brass/70" />
          <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-panel2 px-1 py-px font-mono text-[9.5px] text-brass">
            {FLOOR}%
          </span>
        </li>

        {ranked.map((s) => {
          const isLagging = neverClear.has(s.name);
          const clears = s.cov >= FLOOR;
          return (
            <li key={s.name} className="flex items-center gap-2">
              <span
                className={`w-[150px] shrink-0 truncate text-right text-[12px] ${
                  isLagging ? "font-semibold text-red" : "text-mid"
                }`}
                title={s.name}
              >
                {s.name}
                {isLagging && (
                  <span className="ml-1 align-middle text-[9px] font-bold uppercase tracking-wide text-red">
                    ●
                  </span>
                )}
                {!isLagging && !clears && (
                  <span className="ml-1 align-middle text-[9px] font-semibold uppercase tracking-wide text-low">
                    below 80%
                  </span>
                )}
              </span>
              <div className="relative h-5 flex-1">
                <div className="absolute inset-0 rounded-[3px] bg-panel3/70" />
                <div
                  className="absolute inset-y-0 left-0 rounded-[3px] transition-[width] duration-300"
                  style={{
                    width: `${s.cov}%`,
                    background: isLagging
                      ? "linear-gradient(90deg,#b4453f,#ef4444)"
                      : clears
                      ? "linear-gradient(90deg,#2b5045,#37685a)"
                      : "linear-gradient(90deg,#3a4a44,#55706a)",
                  }}
                />
              </div>
              <span
                className={`w-[52px] shrink-0 text-right font-mono text-[12px] tabular-nums ${
                  isLagging ? "text-red" : clears ? "text-ink" : "text-mid"
                }`}
              >
                {pct(s.cov)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Captions / method ---------------------------------------------------- */}
      <div className="mt-5 space-y-2 border-t border-line pt-4">
        {neverList.length > 0 && (
          <p className="text-[12.5px] leading-snug text-ink">
            <span className="font-semibold text-red">
              {neverList.join(" and ")}
            </span>{" "}
            never reach the 80% floor even at the maximum K={K_MAX} (
            {neverList
              .map((n) => `${n} ${pct(coverageByStationK[n][String(K_MAX)])}`)
              .join(", ")}
            ) — flagged for redistricting or a dedicated unit, not hidden.
          </p>
        )}
        <p className="text-[11.5px] leading-snug text-low">
          80% = fairness floor (illustrative threshold), not a target BTP has set.
        </p>
        <p className="text-[11.5px] leading-snug text-low">
          <span className="font-medium text-mid">Method:</span> {roster.equity_note}
        </p>
        <p className="text-[11px] leading-snug text-low">
          Figures are <span className="text-mid">illustrative</span> intra-station reach at K equal
          patrol units; coverage % is of each station&apos;s own volume only and is not comparable
          to another station&apos;s crime level or priority.
        </p>
      </div>
    </Panel>
  );
}
