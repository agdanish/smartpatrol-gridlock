import { Panel } from "./ui";
import { fmt } from "../lib/format";
import { verification as v } from "../data/appData";
import { models } from "../data/modelData";
import { derived } from "../data/derivedData";

/* Impact, honestly tiered: MEASURED (derived from the data, asserted) vs
 * ESTIMATED (a formula + its assumption printed inline, never asserted). The
 * visible seam is the point — it turns the integrity discipline into impact. */
export default function ImpactBand() {
  const precPct = Math.round(models.cri.precision_at50 * 100);
  const s = derived.safety;
  const pedReachYr = Math.round((s.cov_harm / 100) * s.ped_total * 2.43); // ~5-month window → year
  const deterLo = Math.round(pedReachYr * 0.08), deterHi = Math.round(pedReachYr * 0.16);
  const measured = [
    { v: `+${s.cov_gain_pp}pp`, k: "pedestrian-safety coverage", s: `harm-ranking lifts footpath/school/crossing capture ${s.cov_volume}% → ${s.cov_harm}% on the same ${v.cells_for_50pct_volume} corners` },
    { v: `${v.patrol_efficiency_x}×`, k: "patrol efficiency", s: "top-100 corners hold 43.5% of volume vs 1.73% random" },
    { v: `${v.cells_for_50pct_volume}`, k: "corners = 50% of all violations", s: `just ${((v.cells_for_50pct_volume / v.n_cells) * 100).toFixed(1)}% of ${fmt(v.n_cells)} corners` },
    { v: `${v.top142_temporal_stability_pct}%`, k: "held out-of-time", s: "the plan, backtested on weeks it never saw" },
    { v: `${fmt(v.chronic_across_ge2_stations)}`, k: "cross-jurisdiction offenders", s: "invisible to any single station today" },
    { v: `${precPct}%`, k: "next-week forecast precision", s: `${fmt(models.cri.dormant_flag_count)} quiet corners flagged · ${models.cri.lift_at50}× lift` },
  ];
  const estimated = [
    {
      v: `~${fmt(deterLo)}–${fmt(deterHi)}`, k: "pedestrian-facing violations deterred / yr",
      assume: `≈${fmt(pedReachYr)} ped-facing reached/yr × 8–16% deterrence (Braga–Weisburd hot-spot RCT meta) × ${v.top142_temporal_stability_pct}% stability — endangerment-weighted, never "lives saved"`,
    },
    {
      v: "~96%", k: "fewer patrol-locations, same intercept",
      assume: `from the ${v.patrol_efficiency_x}× efficiency — equivalent coverage from ~1/25th the corners`,
    },
  ];

  return (
    <Panel className="overflow-hidden">
      {/* hero sentence — all MEASURED */}
      <div className="border-b border-line p-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">The impact, measured then estimated</span>
        <p className="mt-2 max-w-4xl font-display text-[18px] font-medium leading-snug text-ink md:text-[20px]">
          From <span className="tnum">{fmt(v.rows_total)}</span> of BTP's own tickets, SmartPatrol takes the{" "}
          <span className="text-brass">{v.cells_for_50pct_volume} corners that hold half the city's parking chaos</span> and
          harm-ranks them, so the <span className="text-ink">same officers</span> lift{" "}
          <span className="text-brass">footpath, school-gate &amp; crossing coverage from {s.cov_volume}% to {s.cov_harm}%</span>{" "}
          (<span className="text-brass">{s.cov_oot_harm}% on weeks the model never saw</span>) — safer junctions next shift, not next budget.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr]">
        {/* MEASURED zone */}
        <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-green">Measured · derived from the data</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {measured.map((m) => (
              <div key={m.k} className="rounded-xl border border-line bg-panel2 p-3">
                <div className="font-display text-[24px] font-bold tabular-nums text-ink">{m.v}</div>
                <div className="mt-0.5 text-[11.5px] font-medium text-mid">{m.k}</div>
                <div className="mt-1 text-[10.5px] leading-snug text-low">{m.s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ESTIMATED zone */}
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full border border-dashed border-brass" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brass/90">Estimated · assumption shown</span>
          </div>
          <div className="flex flex-col gap-3">
            {estimated.map((e) => (
              <div key={e.k} className="rounded-xl border border-dashed border-brass/35 bg-brass/[0.04] p-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[22px] font-bold tabular-nums text-brass">{e.v}</span>
                  <span className="text-[11.5px] font-medium text-mid">{e.k}</span>
                </div>
                <div className="mt-1 text-[10.5px] leading-snug text-low">
                  <span className="font-mono text-low/90">assume:</span> {e.assume}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* theory of change */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line bg-panel2/40 px-5 py-3 text-[11.5px]">
        {[
          ["298,450 tickets", "input"], ["harm-ranked corners + offender graph + forecast", "output"],
          ["targeted patrol at the riskiest corners", "outcome"], ["safer footpaths, school gates & crossings", "impact"],
        ].map(([t, role], i) => (
          <span key={t} className="flex items-center gap-2">
            {i > 0 && <span className="text-low">→</span>}
            <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-mid">
              <span className="text-low">{role}: </span>{t}
            </span>
          </span>
        ))}
      </div>

      {/* honesty footnotes — ceiling + the demoted ₹ figure */}
      <p className="border-t border-line px-5 py-2.5 text-[10.5px] leading-snug text-low">
        Safety figures rest on the <span className="text-mid">{derived.harmPromotion.pct_labeled}%</span> of rows
        that carry a road-class label; "harm" is a 1–5 endangerment proxy, never a casualty count. A secondary
        fine-recovery estimate (~₹0.7–2.1 cr/yr at 5–15% recovery on ~2.8 L tickets × ₹500) is illustrative only —
        the dataset has no fine field, and it is dwarfed by BTP's ₹251 cr 2025 total, so we lead with safety, not rupees.
      </p>
    </Panel>
  );
}
