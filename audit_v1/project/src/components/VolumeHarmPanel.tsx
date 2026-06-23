import { Badge, Panel, SectionTitle } from "./ui";
import { fmt, pct, sig2 } from "../lib/format";
import type { HarmReorder, Verification } from "../types";

export default function VolumeHarmPanel({
  harm,
  v,
}: {
  harm: HarmReorder;
  v: Verification;
}) {
  const cells = harm.promoted_cells;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Panel className="lg:col-span-3">
        <div className="border-b border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-ink">Promoted by congestion harm</h3>
            <Badge tone="good">Robust · Volume↔harm Spearman {sig2(harm.spearman)}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-mid">
            <b className="text-ink">{harm.n_promoted} corners</b> that pure volume buries actually
            block a lane. <span className="text-mid">Showing the top {cells.length}.</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-low">
                <th className="px-4 py-2.5 text-left font-medium">Corner</th>
                <th className="px-3 py-2.5 text-right font-medium">Rank by volume</th>
                <th className="px-3 py-2.5 text-right font-medium">Rank by harm</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Δ rank <span className="font-normal text-low/70">(+ = rises under harm)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cells.map((c, i) => {
                const delta = c.rank_volume - c.rank_harm; // positive = promoted by harm
                return (
                  <tr key={c.cell} className="rise border-b border-line/60 hover:bg-white/[0.03]" style={{ animationDelay: i * 30 + "ms" }}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-ink">{c.label}</div>
                      <div className="font-mono text-[10px] text-low">{fmt(c.n)} tickets · harm {fmt(c.harm_sum)}</div>
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-steel">#{c.rank_volume}</td>
                    <td className="tnum px-3 py-2.5 text-right font-semibold text-red">#{c.rank_harm}</td>
                    <td className="tnum px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center justify-end gap-1 font-semibold ${delta >= 0 ? "text-green" : "text-steel"}`}>
                        {delta >= 0 ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                        )}
                        {delta >= 0 ? "+" : ""}{delta}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex flex-col gap-4 lg:col-span-2">
        <Panel className="p-5">
          <SectionTitle kicker="Rank by volume, or by harm?" title="Same data, sharper priorities" />
          <p className="-mt-3 text-[13px] leading-relaxed text-mid">
            <b className="text-ink">{harm.n_promoted} corners pure volume would miss.</b> A corner
            with fewer tickets can still choke a lane, so re-ranking the top-142 by a
            congestion-harm proxy surfaces the ones that actually block traffic.
          </p>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-panel2 p-3">
            <svg className="mt-0.5 shrink-0 text-low" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <p className="text-[12px] leading-relaxed text-mid">
              <b className="text-ink">Honesty note:</b> only {pct(harm.pct_labeled)} of tickets carry
              a road-class label, so this reorder is <i>illustrative</i>, but the volume↔harm
              correlation is strong (Spearman <span className="font-mono text-green">{sig2(harm.spearman)}</span>),
              so it doesn't distort the core ranking.
            </p>
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-mid">Volume ↔ Harm agreement</span>
            <span className="tnum font-display text-[28px] font-bold text-green">{sig2(harm.spearman)}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-panel3">
            <div className="h-full rounded-full bg-gradient-to-r from-green/60 to-green" style={{ width: `${Math.round(harm.spearman * 100)}%` }}></div>
          </div>
          <p className="mt-2 text-[11.5px] text-low">
            Spearman rank correlation between ticket volume and the road-class harm proxy, on the{" "}
            {pct(harm.pct_labeled)} of cells carrying a label.
          </p>
        </Panel>
      </div>
    </div>
  );
}
