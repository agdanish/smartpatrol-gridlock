import { Panel, Badge } from "./ui";
import { fmt } from "../lib/format";
import { derived } from "../data/derivedData";

/* =============================================================================
 * HarmMethodCard — names the harm model so it stops being an invisible code
 * detail and becomes a legible, falsifiable method on the console. Renders
 * BELOW the Volume-vs-Harm content. Government-grade, calm. No props.
 * ===========================================================================*/

const weights = derived.harmWeights;
const promo = derived.harmPromotion;

/* Severity tiers, grouped naturally by weight (data is already sorted desc). */
const TIERS: { weight: number; label: string }[] = [
  { weight: 5, label: "Main road — blocks a moving lane" },
  { weight: 4, label: "Crossing · footpath · bus-stop · zebra · school · hospital · traffic-light" },
  { weight: 3, label: "Double parking" },
  { weight: 1, label: "Generic no / wrong parking" },
];

/* Deepest-buried promoted corner = largest volume rank (most invisible to a
 * count-only plan, yet it still climbs into the harm top-142). */
const deepest = promo.promoted_cells.reduce((a, b) =>
  b.rank_volume > a.rank_volume ? b : a,
);

/* Stable count of Outer Ring Road stretches among the promoted set, derived
 * from data rather than asserted, so the headline cannot drift. */
const orrCount = promo.promoted_cells.filter((c) =>
  /outer ring road/i.test(c.label),
).length;

function ToneDot({ weight }: { weight: number }) {
  const cls =
    weight >= 5 ? "bg-red" : weight >= 4 ? "bg-brass" : weight >= 3 ? "bg-struct" : "bg-line2";
  return <span className={`h-2 w-2 shrink-0 rounded-full ${cls}`} aria-hidden="true" />;
}

export default function HarmMethodCard() {
  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* ---- 1 · The named method --------------------------------------- */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h3 className="font-display text-lg font-semibold text-ink">
              The PEHI method
            </h3>
            <Badge tone="brand">Parking Enforcement Harm Index</Badge>
          </div>
          <Badge tone="neutral">Named · auditable · falsifiable</Badge>
        </div>

        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-mid">
          A corner&rsquo;s harm score is the sum of a severity weight over every
          violation seen there &mdash; weighting <span className="text-ink">where</span> a
          car blocks traffic, not just how many cars do.
        </p>

        {/* equation */}
        <div className="mt-4 rounded-xl border border-line bg-panel2 p-4">
          <code className="block font-mono text-[12.5px] leading-relaxed text-ink">
            <span className="text-brass">PEHI</span>(corner) ={" "}
            <span className="text-struct">&Sigma;</span>{" "}
            <span className="text-brass">w</span>(class(v)){"  "}
            <span className="text-low">over violations v in the corner</span>
          </code>
          <p className="mt-2 font-mono text-[11px] text-low">
            w = severity weight by road-class · class(v) = the road-class label on
            violation v
          </p>
        </div>

        {/* weight table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line bg-panel3/40 text-low">
                <th className="px-4 py-2.5 text-left font-medium">Violation class</th>
                <th className="px-4 py-2.5 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier) => {
                const rules = weights.filter((w) => w.weight === tier.weight);
                return (
                  <tr key={tier.weight} className="border-b border-line/60 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ToneDot weight={tier.weight} />
                        <span className="font-medium text-ink">{tier.label}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 pl-4 font-mono text-[10px] text-low">
                        {rules.map((w) => (
                          <span key={w.rule}>{w.rule}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="brand" className="tnum">
                        {fmt(tier.weight)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-low">
          Continuous severity weighting of <span className="text-mid">where</span> a
          violation occurs &mdash; not just how many. Documented prior art only does
          coarse policy carve-outs (e.g. bus-lane / hydrant exclusions) or ranks by
          raw count. Only{" "}
          <span className="font-mono text-mid">{fmt(promo.pct_labeled, 1)}%</span> of
          rows carry a road-class label, so treat PEHI as a labelled-proxy harm index,
          illustrative of the re-ranking &mdash; never a measured congestion figure.
        </p>
      </Panel>

      {/* ---- 2 · What volume alone would never patrol ------------------- */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-ink">
            What volume alone would never patrol
          </h3>
          <Badge tone="harm" className="tnum">
            {fmt(promo.n_promoted)} promoted corners
          </Badge>
        </div>

        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-mid">
          Of the top-142 harm corners,{" "}
          <b className="text-ink tnum">{fmt(promo.n_promoted)}</b> are{" "}
          <span className="text-ink">not</span> in the top-142 by volume &mdash;
          high-harm, lower-count corners a count-only plan misses.{" "}
          <span className="text-mid tnum">{fmt(orrCount)} of the {fmt(promo.n_promoted)}</span>{" "}
          are stretches of <span className="text-ink">Outer Ring Road</span>.
        </p>

        {/* deepest-buried highlight */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-brass/30 bg-brass/[0.06] p-3.5">
          <svg
            className="mt-0.5 shrink-0 text-brass"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          <p className="text-[12px] leading-relaxed text-mid">
            Deepest-buried corner:{" "}
            <b className="text-ink">{deepest.label}</b> climbs from volume rank{" "}
            <span className="font-mono text-low tnum">#{fmt(deepest.rank_volume)}</span> all
            the way into the plan at harm rank{" "}
            <span className="font-mono text-brass tnum">#{fmt(deepest.rank_harm)}</span>{" "}
            &mdash; {fmt(deepest.n)} tickets, harm {fmt(deepest.harm_sum)}. A count-only
            roster would never reach it.
          </p>
        </div>

        {/* the 33 promoted corners — compact bump table, 2 cols on wide screens */}
        <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl border border-line">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {promo.promoted_cells.map((c, i) => {
              const isDeepest =
                c.label === deepest.label && c.rank_volume === deepest.rank_volume;
              return (
                <div
                  key={`${c.label}-${c.rank_volume}-${i}`}
                  className={`flex items-center justify-between gap-3 border-b border-line/50 px-4 py-2.5 ${
                    isDeepest ? "bg-brass/[0.06]" : ""
                  } ${i % 2 === 1 ? "lg:border-l lg:border-l-line/50" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-ink">
                      {c.label}
                    </div>
                    <div className="font-mono text-[10px] text-low tnum">
                      {fmt(c.n)} tickets &middot; harm {fmt(c.harm_sum)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-low tnum">#{fmt(c.rank_volume)}</span>
                    <svg
                      className="text-green"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <span
                      className={`tnum font-semibold ${isDeepest ? "text-brass" : "text-green"}`}
                    >
                      #{fmt(c.rank_harm)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* honest count line */}
        <p className="mt-3 text-[11.5px] leading-relaxed text-low">
          Showing all{" "}
          <span className="text-mid tnum">{fmt(promo.n_promoted)}</span> promoted
          corners. Spearman(volume, harm) ={" "}
          <span className="font-mono text-green tnum">{promo.spearman.toFixed(2)}</span>{" "}
          &mdash; strongly correlated overall, but the tail is where harm hides.
        </p>
        {/* robustness: sensitivity to the hand-set weights */}
        <div className="mt-2.5 rounded-lg border border-line bg-panel2/50 p-2.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-low">
            Weight-sensitivity — “did you pick the weights?”
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {promo.sensitivity.map((s) => (
              <span key={s.variant} className="text-[11px] text-mid">
                {s.variant}: <span className="font-mono text-ink tnum">{s.survived}/{s.of}</span>{" "}
                <span className="text-low">({s.pct}%)</span>
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-low">
            ≥{promo.min_survival_pct}% of the promoted corners survive every reasonable re-weighting — the
            re-ranking is robust to the weights, not an artefact of them.
          </p>
        </div>
      </Panel>
    </div>
  );
}
