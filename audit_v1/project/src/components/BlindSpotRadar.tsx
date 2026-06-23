import { Panel, Badge } from "./ui";
import { fmt } from "../lib/format";
import { derived } from "../data/derivedData";

/* ── BlindSpotRadar ─────────────────────────────────────────────────────────
 * The category-defining reframe inside Coverage. A 2026 police jury distrusts
 * "AI predicts the hotspots" because the historical-data feedback loop just
 * confirms itself. So SmartPatrol does the opposite: it measures its OWN
 * blindness on BTP's data (temporal churn, under-served stations, siloed
 * cross-jurisdiction records) and names it — then shows station momentum as a
 * reallocation signal. Government-grade: calm, confident, no over-claiming.
 * Rendered ABOVE the equity ledger in the Coverage tab. */
export default function BlindSpotRadar() {
  const bs = derived.blindspot;
  const mo = derived.momentum;

  const underServed = bs.under_served.slice(0, 4);
  const rising = mo.stations_rising.slice(0, 5);
  const falling = mo.stations_falling.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1 · the headline reframe ─────────────────────────────────────── */}
      <Panel className="p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
          The honest edge
        </div>
        <h3 className="mt-1.5 font-display text-2xl font-semibold leading-tight text-ink">
          Where enforcement is blind
        </h3>
        <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-mid">
          Every &ldquo;predict the hotspots&rdquo; tool patrols where it already
          patrolled — the data confirms itself and blind spots compound.
          SmartPatrol measures its <span className="text-ink">own</span>{" "}
          blindness on BTP&apos;s data and surfaces it.
        </p>

        {/* three blind-spot signal tiles */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* a) temporal churn */}
          <div className="rounded-xl border border-line bg-panel2/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-low">
                Temporal churn
              </span>
              <Badge tone="brand">
                <span className="tnum">{fmt(bs.churn_pct, 1)}%</span>
              </Badge>
            </div>
            <p className="mt-3 text-[12.5px] leading-snug text-mid">
              <span className="tnum text-ink">{fmt(bs.churned)}</span> of{" "}
              <span className="tnum text-ink">{fmt(bs.total)}</span> top corners
              shift between the two halves of the window — patrolling last
              month&apos;s map misses them.
            </p>
            <div className="mt-3">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-panel3">
                <span
                  className="h-full bg-green/80"
                  style={{ width: `${bs.stability_pct}%` }}
                />
                <span
                  className="h-full bg-brass"
                  style={{ width: `${bs.churn_pct}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10.5px]">
                <span className="text-green">
                  held <span className="tnum">{fmt(bs.stability_pct, 1)}%</span>
                </span>
                <span className="text-brass">
                  churn <span className="tnum">{fmt(bs.churn_pct, 1)}%</span>
                </span>
              </div>
            </div>
          </div>

          {/* b) under-served stations */}
          <div className="rounded-xl border border-line bg-panel2/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-low">
                Under-served stations
              </span>
              <Badge tone="struct">spread thin</Badge>
            </div>
            <p className="mt-3 text-[12.5px] leading-snug text-mid">
              These stations&apos; violations are spread thin, so a corner-only
              plan reaches less of them.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {underServed.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 rounded-full border border-struct/30 bg-struct/10 px-2 py-0.5 text-[11px] text-struct"
                >
                  {s.name}
                  <span className="tnum font-mono text-[10px] text-struct/80">
                    {fmt(s.top_corner_share, 1)}%
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* c) siloed records */}
          <div className="rounded-xl border border-line bg-panel2/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-low">
                Siloed records
              </span>
              <Badge tone="brand">
                <span className="tnum">{fmt(bs.xj_count)}</span> offenders
              </Badge>
            </div>
            <p className="mt-3 text-[12.5px] leading-snug text-mid">
              <span className="tnum text-ink">{fmt(bs.xj_count)}</span> chronic
              offenders span 2+ stations; a single desk sees only part of each
              one&apos;s pattern. The busiest station sees ~
              <span className="tnum text-ink">
                {fmt(bs.xj_blind_mean_seen_pct)}%
              </span>{" "}
              of a cross-jurisdiction offender&apos;s tickets — and is blind to
              the cross-station <span className="text-ink">link</span> entirely.
            </p>
          </div>
        </div>

        {/* trust callout */}
        <div className="mt-4 rounded-xl border border-struct/30 bg-struct/10 px-4 py-2.5">
          <p className="text-[12.5px] leading-snug text-ink">
            Naming our blind spots is the trust signal a predictive-policing
            critique can&apos;t dent.
          </p>
        </div>
      </Panel>

      {/* ── 2 · corners that churned out ─────────────────────────────────── */}
      <Panel className="p-5">
        <h3 className="font-display text-lg font-semibold text-ink">
          Corners that churned out
        </h3>
        <p className="mt-1.5 max-w-3xl text-[12.5px] leading-snug text-mid">
          These first-half top corners dropped out of the second-half top-
          <span className="tnum">{fmt(bs.total)}</span> — exactly the redeploy
          list a static plan would miss.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {bs.churned_cells.map((c) => (
            <li
              key={c.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2/50 px-3 py-2"
            >
              <span className="truncate text-[12.5px] text-ink">{c.label}</span>
              <span className="shrink-0 font-mono text-[11px] text-low">
                was #<span className="tnum text-brass">{fmt(c.h1_rank)}</span> in
                H1
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* ── 3 · station momentum ─────────────────────────────────────────── */}
      <Panel className="p-5">
        <h3 className="font-display text-lg font-semibold text-ink">
          Station momentum
        </h3>
        <p className="mt-1.5 max-w-3xl text-[12.5px] leading-snug text-mid">
          Which stations are heating up vs cooling — named BTP turf, lead rising
          example <span className="text-green">V.V.Puram +120%</span>.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* rising */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-green">▲</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green">
                Rising
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {rising.map((s) => (
                <li
                  key={s.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2/50 px-3 py-2"
                >
                  <span className="truncate text-[12.5px] text-ink">
                    {s.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10.5px] text-low">
                      <span className="tnum">{fmt(s.h1)}</span>→
                      <span className="tnum text-mid">{fmt(s.h2)}</span>
                    </span>
                    <span
                      className={`tnum text-[12px] font-semibold ${
                        s.pct >= 100 ? "text-green" : "text-brass"
                      }`}
                    >
                      ▲ +{fmt(s.pct)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* falling */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-mid">▼</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
                Falling
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {falling.map((s) => (
                <li
                  key={s.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2/50 px-3 py-2"
                >
                  <span className="truncate text-[12.5px] text-ink">
                    {s.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10.5px] text-low">
                      <span className="tnum">{fmt(s.h1)}</span>→
                      <span className="tnum text-mid">{fmt(s.h2)}</span>
                    </span>
                    <span className="tnum text-[12px] font-semibold text-mid">
                      ▼ {fmt(s.pct)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-snug text-low">
          Half-vs-half shift (split {mo.split_date}) in{" "}
          <span className="text-mid">where</span> tickets were written — reflects
          both real street change and enforcement-effort shift; read as a
          reallocation signal, not a congestion forecast.
        </p>
      </Panel>
    </div>
  );
}
