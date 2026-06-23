import { useState } from "react";
import { Panel } from "./ui";
import { fmt } from "../lib/format";
import type { CoverageTiming } from "../types";
import CoverageEquityLedger from "./CoverageEquityLedger";

export default function CoveragePanel({ ct }: { ct: CoverageTiming }) {
  const [hover, setHover] = useState<{ hour: number; n: number } | null>(null);
  const vals = ct.hour_profile.map((d) => d.n);
  const max = Math.max(...vals);
  const sorted = [...vals].sort((a, b) => a - b);
  const median = (sorted[11] + sorted[12]) / 2; // 24 hours
  const gaps = new Set(ct.coverage_gap_hours);
  const peakHour = ct.hour_profile.reduce((a, d) => (d.n > a.n ? d : a)).hour;
  const gapStart = Math.min(...ct.coverage_gap_hours);
  const pad = (h: number) => String(h).padStart(2, "0");
  const topGapHours = new Set(
    ct.hour_profile.filter((d) => gaps.has(d.hour)).sort((a, b) => b.n - a.n).slice(0, 3).map((d) => d.hour)
  );
  const CH = 240;
  return (
    <div className="flex flex-col gap-6">
    <Panel className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">When to deploy</span>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink">
            Coverage-gap timing <span className="text-[15px] font-normal text-low">(not a congestion forecast)</span>
          </h3>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <span className="flex items-center gap-1.5 text-mid"><span className="h-3 w-3 rounded-sm bg-green"></span>Covered hour</span>
          <span className="flex items-center gap-1.5 text-brass"><span className="h-3 w-3 rounded-sm bg-brass"></span>▲ Coverage gap</span>
        </div>
      </div>

      <p className="mt-3 text-[12.5px] leading-snug text-mid">
        Fewer afternoon tickets means fewer officers out, <span className="text-ink">not</span> fewer violations. We patrol the gap.
      </p>

      <div className="relative mt-7 pl-9">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[10.5px] text-low">Tickets / hour</span>
        <div className="relative" style={{ height: CH }}>
          {/* median reference line, derived from the real distribution */}
          <div className="absolute left-0 right-0 z-10 border-t border-dashed border-steel/45" style={{ bottom: `${(median / max) * 100}%` }}>
            <span className="absolute -top-4 right-0 rounded bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-mid">median {fmt(median)}</span>
          </div>
          <div
            role="img"
            aria-label={`Hourly ticketing chart. Peak at ${pad(peakHour)}:00 with ${fmt(max)} tickets; a ${ct.coverage_gap_hours.length}-hour coverage gap is flagged from ${pad(gapStart)}:00 to ${pad(Math.max(...ct.coverage_gap_hours))}:00.`}
            className="flex h-full items-end gap-[3px] sm:gap-1.5"
          >
            {ct.hour_profile.map((d) => {
              const isGap = gaps.has(d.hour);
              const hgt = (d.n / max) * 100;
              const showVal = d.hour === peakHour || topGapHours.has(d.hour);
              return (
                <div
                  key={d.hour}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover && hover.hour === d.hour && (
                    <div className="pointer-events-none absolute -top-12 z-20 w-max rounded-lg border border-line2 bg-panel2 px-2.5 py-1.5 text-center shadow-xl">
                      <div className="tnum text-[13px] font-bold text-ink">{fmt(d.n)}</div>
                      <div className="text-[10px] text-low">tickets · {String(d.hour).padStart(2, "0")}:00</div>
                    </div>
                  )}
                  {showVal && <span className={`mb-0.5 tnum text-[10px] font-semibold ${isGap ? "text-brass" : "text-mid"}`}>{(d.n / 1000).toFixed(1)}k</span>}
                  {isGap && <svg className="mb-0.5 text-brass" width="11" height="7" viewBox="0 0 12 8" fill="currentColor"><path d="M6 0L12 8H0z" /></svg>}
                  <div
                    className="w-full rounded-t-[3px] transition-all duration-300"
                    style={{
                      height: `${hgt}%`,
                      background: isGap ? "linear-gradient(180deg,#f7c25a,#d9892a)" : "linear-gradient(180deg,#37685a,#2b5045)",
                      boxShadow: isGap ? "0 0 12px rgba(240,169,46,0.32)" : "none",
                    }}
                  ></div>
                  <span className={`mt-1.5 tnum text-[11px] ${isGap ? "text-brass" : "text-low"}`}>{String(d.hour).padStart(2, "0")}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-low">
          <span>Hour of day (24h)</span>
          <span>Peak {String(peakHour).padStart(2, "0")}:00 · {fmt(max)} tickets</span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-low">
          Pre-dawn troughs (02:00–04:00) reflect <span className="text-mid">near-zero enforcement presence</span>, not missing data.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-xl border border-brass/20 bg-brass/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink">
          Ticketing peaks mid-morning (<b className="text-brass">{pad(peakHour)}:00</b>); from{" "}
          <b className="text-brass">{pad(gapStart)}:00</b> enforcement presence tapers across a flagged{" "}
          <b className="text-brass">{ct.coverage_gap_hours.length}-hour</b> window (▲).
        </p>
        <p className="text-[13px] font-semibold text-ink">We schedule patrols to the gaps.</p>
      </div>
    </Panel>

      {/* #5 Equity ledger — pulls its own data via useData(). Rendered below the
          timing chart inside the Coverage tab; the 5-tab nav is untouched. */}
      <CoverageEquityLedger />
    </div>
  );
}
