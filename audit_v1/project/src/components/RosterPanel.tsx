import { createPortal } from "react-dom";
import { Badge, Panel, Ticker } from "./ui";
import { fmt } from "../lib/format";
import type { RosterSolution } from "../types";

const canHover =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export default function RosterPanel({
  station,
  solution,
  generating,
  hoverKey,
  setHoverKey,
}: {
  station: string;
  solution: RosterSolution | null;
  generating: boolean;
  hoverKey: string | null;
  setHoverKey: (k: string | null) => void;
}) {
  if (!solution) return null;
  const core = new Set([0, 1, 2]);
  const hover = (key: string | null) => {
    if (canHover) setHoverKey(key);
  };

  // ---- derived values for the printed duty sheet (real solution values only) ----
  const stationCode = station
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const refNo = `SP/DUTY/${stationCode}/K${solution.n_units}`;
  const totTickets = solution.corners.reduce((s, c) => s + c.n, 0);
  const totHarm = Math.round(solution.corners.reduce((s, c) => s + c.harm_sum, 0));
  const poss = station === "Citywide" ? "the city's" : `${station}'s`;
  const stationLine =
    station === "Citywide" ? "Bengaluru Traffic Police" : `${station} Traffic Police Station`;
  return (
    <Panel className="flex h-full flex-col">
      <div className="border-b border-line p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
            8 AM Patrol Roster
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Print duty sheet"
              title="Print 8 AM patrol duty sheet"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-mid transition-colors hover:border-struct/40 hover:bg-struct/10 hover:text-struct focus-visible:border-struct/40 focus-visible:bg-struct/10 focus-visible:text-struct"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <path d="M6 14h12v8H6z" />
              </svg>
              Print duty sheet
            </button>
            <Badge tone="neutral">{solution.n_units} units</Badge>
          </div>
        </div>
        <h3 className="mt-1.5 font-display text-lg font-semibold text-ink">{station}</h3>
        <div className="mt-3 rounded-xl border border-green/25 bg-green/[0.06] p-3">
          <p className="text-[14px] leading-snug text-ink">
            These <b className="text-brass">{solution.n_units} units</b> cover{" "}
            <span className="font-display text-[22px] font-bold text-green">
              <Ticker
                key={station + solution.n_units + solution.coverage_pct_of_station}
                value={solution.coverage_pct_of_station}
                decimals={1}
                suffix="%"
                delay={generating ? 120 : 0}
              />
            </span>{" "}
            of {station === "Citywide" ? "the city's" : station + "'s"} violations.
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-panel3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green/70 to-green transition-all duration-700"
              style={{ width: `${solution.coverage_pct_of_station}%` }}
            ></div>
          </div>
        </div>
      </div>
      <div
        className={`flex-1 overflow-y-auto p-2 transition-opacity ${generating ? "opacity-40" : ""}`}
        style={{ maxHeight: 430 }}
      >
        {solution.corners.map((c, i) => {
          const isCore = core.has(i);
          const isHi = hoverKey === c.label;
          return (
            <div
              key={c.cell + i}
              onMouseEnter={() => hover(c.label)}
              onMouseLeave={() => hover(null)}
              className={`rise group mb-1.5 flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                isHi
                  ? "border-struct/40 bg-struct/[0.07]"
                  : isCore
                    ? "border-brass/25 bg-brass/[0.05]"
                    : "border-transparent hover:bg-white/[0.03]"
              }`}
              style={{ animationDelay: i * 40 + "ms" }}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-[14px] font-bold ${
                  isCore ? "bg-brass text-[#1a1204]" : "bg-panel3 text-mid"
                }`}
              >
                {c.route_order}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{c.label}</span>
                  {isCore && (
                    <Badge tone="brand" className="shrink-0 !px-1.5 !py-0">core</Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-mid">
                  <span className="font-mono">{c.shift}</span>
                  <span className="text-low">·</span>
                  <span>{c.koper_window_min[0]}–{c.koper_window_min[1]}m dwell</span>
                </div>
              </div>
              <div className="text-right">
                <div className="tnum text-[15px] font-bold text-ink">{fmt(c.n)}</div>
                <div className="text-[10.5px] text-low">tickets</div>
              </div>
              <a
                href={`https://www.mappls.com/navigation?places=${c.lat},${c.lon},${encodeURIComponent(c.label)}&isNav=true&mode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Navigate to ${c.label} in Mappls`}
                title="Open turn-by-turn in Mappls"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mid transition-colors hover:bg-struct/15 hover:text-struct focus-visible:bg-struct/15 focus-visible:text-struct"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>
              </a>
            </div>
          );
        })}
        <p className="px-2 pt-1 text-[11px] leading-snug text-low">
          First 3 corners are the must-hit core. Koper-curve dwell windows rotate units across the
          shift for deterrence. Ticket counts are over the 5-month window.
        </p>
      </div>
      {/* governance, static line, not a feature */}
      <div className="border-t border-line px-4 py-2.5">
        <p className="text-[11px] leading-snug text-low">
          SmartPatrol ranks <span className="text-mid">locations</span> and repeat{" "}
          <span className="text-mid">vehicles</span> for review, it does not predict or score
          individuals.
        </p>
      </div>

      {/* Printable duty sheet, black-on-white. Portaled to <body> so it survives
          the @media print `#root { display:none }` app-hide and escapes the
          Panel's overflow/scroll ancestors. Hidden on screen via src/index.css;
          revealed only by window.print(). Renders ONLY existing on-screen
          'solution' values, no rounding drift, no fabricated realtime data. */}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="print-sheet" aria-hidden="true">
            {/* MASTHEAD */}
            <div className="ps-eyebrow">
              Bengaluru Traffic Police ·{" "}
              {station === "Citywide"
                ? "Citywide Deployment"
                : `${station} Traffic Police Station`}
            </div>
            <div className="ps-masthead">
              <div>
                <h1 className="ps-title">SmartPatrol — 8 AM Patrol Duty Sheet</h1>
                <div className="ps-station">{station}</div>
              </div>
              <div className="ps-meta">
                <div>
                  <b>Ref.</b> <span className="ps-num">{refNo}</span>
                </div>
                <div>
                  <b>Issued</b> ____________
                </div>
                <div>
                  <b>Window</b> <span className="ps-num">2023-11-10 – 2024-04-08</span>
                </div>
                <div>
                  <b>Basis</b> 5-month BTP export
                </div>
              </div>
            </div>

            {/* SUBJECT */}
            <div className="ps-subject">
              <b>Sub:</b> Morning (08:00) patrol beat allotment — {station} ·{" "}
              <span className="ps-num">{solution.n_units}</span> units ·{" "}
              <span className="ps-num">{solution.coverage_pct_of_station}%</span>{" "}
              {station === "Citywide" ? "city" : "station"} coverage
            </div>

            {/* KPI BAND */}
            <div className="ps-kpi">
              <div>
                <div className="cap">Units Deployed</div>
                <div className="val">{solution.n_units}</div>
              </div>
              <div>
                <div className="cap">{station === "Citywide" ? "City" : "Station"} Coverage</div>
                <div className="val">{solution.coverage_pct_of_station}%</div>
              </div>
              <div>
                <div className="cap">Expected Tickets</div>
                <div className="val">{fmt(totTickets)}</div>
              </div>
              <div>
                <div className="cap">Beats Listed</div>
                <div className="val">{solution.corners.length}</div>
              </div>
            </div>

            {/* BEAT TABLE */}
            <table className="ps-table">
              <colgroup>
                <col style={{ width: "8%" }} />
                <col style={{ width: "36%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "13%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="ctr">#</th>
                  <th style={{ textAlign: "left" }}>Junction / Beat</th>
                  <th className="ctr">Shift</th>
                  <th className="ctr">Dwell</th>
                  <th className="num">Exp. Tickets</th>
                  <th className="num">Harm Idx</th>
                </tr>
              </thead>
              <tbody>
                {solution.corners.map((c, i) => (
                  <tr key={c.cell + i} className={core.has(i) ? "core" : undefined}>
                    <td className="beat">
                      {c.route_order}
                      {core.has(i) && <span className="coretag">CORE</span>}
                    </td>
                    <td className="junction">{c.label}</td>
                    <td className="ctr ps-num">{c.shift}</td>
                    <td className="ctr ps-num">
                      {c.koper_window_min[0]}–{c.koper_window_min[1]} min
                    </td>
                    <td className="num">{fmt(c.n)}</td>
                    <td className="num">{Math.round(c.harm_sum)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>TOTAL</td>
                  <td className="num">{fmt(totTickets)}</td>
                  <td className="num">{totHarm}</td>
                </tr>
              </tfoot>
            </table>
            <div className="ps-legend">
              Route order = patrol sequence. Dwell = Koper-curve presence per stop. Exp. tickets on
              5-month BTP basis. ▌CORE = must-hit beat by 09:00.
            </div>

            {/* PAYOFF */}
            <p className="ps-payoff">
              These {solution.n_units} beats intercept {solution.coverage_pct_of_station}% of {poss}{" "}
              recorded violations.
            </p>

            {/* SIGNATURE */}
            <div className="ps-sign">
              <div className="copyto">Copy to: Sub-Divisional ACP (Traffic); Station file.</div>
              <div className="block">
                <div className="rule" />
                <div className="rank">Inspector of Police</div>
                <div className="org">{stationLine}</div>
                <div className="org">Bengaluru Traffic Police</div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="ps-foot">
              <div className="row">
                <span>
                  <span className="stamp">COMPUTED from BTP export</span> · provided 5-month dataset · Data
                  window 2023-11-10 – 2024-04-08
                </span>
                <span>Powered by Mappls</span>
              </div>
              <div className="gov">
                SmartPatrol ranks locations and repeat vehicles for review; does not predict or
                score individuals.
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Panel>
  );
}
