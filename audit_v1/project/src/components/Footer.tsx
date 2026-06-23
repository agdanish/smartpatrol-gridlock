import { Logo, MapplsBadge } from "./ui";
import { fmt, pct } from "../lib/format";
import type { Verification, Roster } from "../types";

export default function Footer({ v, roster }: { v: Verification; roster: Roster }) {
  return (
    <footer className="mt-12 border-t border-line bg-panel/50">
      <div className="mx-auto max-w-[1480px] px-5 py-10 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-mid">Data</div>
            <ul className="mt-3 space-y-1.5 text-[12.5px] text-mid">
              <li>
                Window: <span className="font-mono text-ink">{v.date_window}</span>
              </li>
              <li>Single source · BTP parking-violation export</li>
              <li>
                <span className="tnum text-ink">{fmt(v.rows_total)}</span> tickets ·{" "}
                <span className="text-ink">{v.n_stations}</span> stations ·{" "}
                <span className="text-ink">{fmt(v.n_cells)}</span> cells
              </li>
              <li className="pt-1">
                <MapplsBadge />
              </li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-green">Method</div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mid">
              Deployment uses peer-reviewed max-covering location theory:
              <span className="mt-1.5 block space-y-1">
                {roster.milp_prior_art.map((p) => (
                  <span key={p} className="block font-mono text-[11px] text-low">
                    › {p}
                  </span>
                ))}
              </span>
              The novel combination is harm-weighted corner re-ranking fused with a
              cross-jurisdiction offender graph, a join no single station can compute today.
              Provisional-stage; no granted patent claimed.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brass">Limits</div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mid">
              Severity is a labeled proxy ({pct(v.pct_rows_with_roadclass_label)} of rows). Timing
              is enforcement presence, <i>not</i> a congestion forecast. Validated by an out-of-time
              backtest ({pct(v.top142_temporal_stability_pct)} stable) and a proposed{" "}
              <b className="text-ink">20-corner × 4-week pilot</b>.
            </p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-mid">
              Ranks locations and repeat vehicles, never scores individuals; sensor-free (no
              CCTV/ANPR/face recognition) and structurally lower-risk than discretionary-stop tools;
              AI proposes, officer disposes.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-line pt-5 text-[11.5px] text-low sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
            <span>
              <b className="text-mid">SmartPatrol</b> · Predictive Enforcement Deployment Brain
            </span>
          </div>
          <span>
            Gridlock Hackathon 2.0 · judged by Bengaluru Traffic Police · Flipkart · MapMyIndia
            (Mappls)
          </span>
        </div>
      </div>
    </footer>
  );
}
