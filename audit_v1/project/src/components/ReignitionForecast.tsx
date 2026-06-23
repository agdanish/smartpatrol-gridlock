import { Panel, Badge } from "./ui";
import { fmt } from "../lib/format";
import { models } from "../data/modelData";

/* The "where is your model?" answer: a real, out-of-time-validated predictive
 * model. Place-based (never scores individuals). All values from src/parkwatch_model.py. */
export default function ReignitionForecast() {
  const m = models.cri;
  const cf = m.conformal;
  const maxProb = Math.max(...m.next_week.map((c) => c.prob), 1);
  const maxImp = Math.max(...m.top_features.map((f) => f.importance), 1);
  const featLabel: Record<string, string> = {
    ewma: "recency (decayed activity)", last4: "last-4-week load", active_weeks: "weeks active",
    harm: "road-class harm", cum: "cumulative volume", c_now: "this-week count",
  };

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-line p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-struct">
              Predictive model · validated out-of-time
            </span>
            <Badge tone="good">AI</Badge>
          </div>
          <h3 className="mt-1.5 font-display text-xl font-semibold text-ink">
            Re-Ignition Forecast — which quiet corners flare next week
          </h3>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-mid">
            A real discrete-time <span className="text-ink">survival / hazard model</span> over a{" "}
            <span className="tnum">{fmt(m.n_panel)}</span>-row corner-week panel. It learns each
            corner's history and predicts the probability it records a violation next week — trained on
            the first weeks, <span className="text-ink">validated on held-out later weeks it never saw</span>.
            It scores <b className="text-ink">places, not people</b>.
          </p>
        </div>
      </div>

      {/* validation stat band */}
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {[
          { k: "AUC (out-of-time)", v: m.auc.toFixed(2), s: `beats ${m.auc_persistence.toFixed(2)} naive baseline` },
          { k: "Precision @ top 50", v: `${Math.round(m.precision_at50 * 100)}%`, s: `vs ${Math.round(m.base_rate * 100)}% base · ${m.lift_at50}× lift` },
          { k: "Quiet corners flagged", v: fmt(m.dormant_flag_count), s: "predicted to re-flare" },
          { k: "Corner-weeks trained", v: fmt(m.n_panel), s: `${fmt(m.n_cells)} corners · ${m.weeks} wks` },
        ].map((c) => (
          <div key={c.k} className="bg-panel p-4">
            <div className="text-[10.5px] uppercase tracking-wide text-low">{c.k}</div>
            <div className="mt-1 font-display text-[22px] font-bold tabular-nums text-struct">{c.v}</div>
            <div className="mt-0.5 text-[10.5px] text-low">{c.s}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1.5fr_1fr]">
        {/* the actionable forecast */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-ink">Next week's watch list</h4>
            <span className="text-[11px] text-low">corners quiet ≥1 week, predicted to re-flare</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {m.next_week.map((c) => (
              <div key={c.label} className="flex items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-ink">{c.label}</div>
                  <div className="text-[10.5px] text-low">quiet {c.weeks_quiet} wk{c.weeks_quiet === 1 ? "" : "s"}</div>
                </div>
                <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-panel3">
                  <div className="h-full rounded-full bg-gradient-to-r from-struct/70 to-struct"
                       style={{ width: `${(c.prob / maxProb) * 100}%` }} />
                </div>
                <div className="w-10 shrink-0 text-right font-mono text-[12.5px] font-semibold text-struct">
                  {Math.round(c.prob * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* what the model leans on */}
        <div>
          <h4 className="mb-2 text-[13px] font-semibold text-ink">What the model weighs</h4>
          <div className="flex flex-col gap-2">
            {m.top_features.map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-mid">{featLabel[f.name] || f.name}</span>
                  <span className="font-mono text-low">{(f.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-panel3">
                  <div className="h-full rounded-full bg-brass/70" style={{ width: `${(f.importance / maxImp) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg border border-line bg-panel2 p-2.5 text-[11px] leading-snug text-low">
            Recency dominates — a corner's own decayed history is the strongest signal, with road-class
            harm and breadth-of-weeks adding lift. No demographic, personal, or external data is used.
          </p>
        </div>
      </div>

      {/* conformal abstention — the model declines to call low-confidence corners */}
      <div className="border-t border-line p-5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-struct">It knows what it doesn't know</span>
          <span className="rounded-full border border-green/30 bg-green/10 px-2 py-0.5 text-[10px] font-medium text-green">conformal · reject option</span>
        </div>
        <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-mid">
          Rather than guess on every corner, the model issues a <b className="text-ink">prediction set</b> and{" "}
          <b className="text-ink">abstains</b> when unsure — with a distribution-free guarantee:{" "}
          <span className="text-struct">at most {Math.round(cf.alpha * 100)}% missed re-fires</span>, and it{" "}
          <span className="text-ink">measured {(cf.miss_at10 * 100).toFixed(1)}%</span> on weeks it never saw.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { k: "Commit · re-fire", b: cf.buckets.refire, tone: "text-green", ring: "border-green/30 bg-green/[0.05]", note: "send patrol — caught right" },
            { k: "Commit · quiet", b: cf.buckets.quiet, tone: "text-mid", ring: "border-line bg-panel2", note: "safe to skip this week" },
            { k: "Abstain", b: cf.buckets.abstain, tone: "text-brass", ring: "border-dashed border-brass/35 bg-brass/[0.04]", note: "model declines — human decides" },
          ].map((c) => (
            <div key={c.k} className={`rounded-xl border p-3 ${c.ring}`}>
              <div className={`text-[11px] font-semibold uppercase tracking-wide ${c.tone}`}>{c.k}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[22px] font-bold tabular-nums text-ink">{fmt(c.b.n)}</span>
                <span className="text-[11px] text-low">corner-weeks · {Math.round(c.b.rate * 100)}% re-fire</span>
              </div>
              <div className="mt-0.5 text-[10.5px] text-low">{c.note}</div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-low">
          <span className="text-mid">Guarantee holds across the dial:</span>
          {cf.guarantee.map((g) => (
            <span key={g.alpha} className="font-mono">
              ≤{Math.round(g.alpha * 100)}% → <span className="text-struct">{(g.miss * 100).toFixed(1)}%</span>
            </span>
          ))}
          <span className="text-low/80">· calibration ECE {cf.ece.toFixed(2)} (raw probs; the set carries the guarantee)</span>
        </div>
      </div>

      <p className="border-t border-line px-5 py-2.5 text-[10.5px] leading-snug text-low">
        <b className="text-mid">Honest framing.</b> The model predicts enforcement-recorded activity by{" "}
        <span className="text-mid">place</span>, validated out-of-time on weeks it never saw (AUC {m.auc.toFixed(2)},
        Brier {m.brier.toFixed(2)}) and <span className="text-mid">beats a naive "active last week" baseline
        ({m.auc_persistence.toFixed(2)}) by +{m.beats_baseline.toFixed(2)} AUC</span> — so it adds real signal, not just
        persistence. It is a deployment aid — which corners to keep on the roster — not a forecast of any
        individual's behaviour, and never a congestion prediction.
      </p>
    </Panel>
  );
}
