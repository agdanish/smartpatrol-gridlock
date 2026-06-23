import React from "react";
import { Badge, Ticker, ConcentrationStrip } from "./ui";
import { pct } from "../lib/format";
import type { Verification } from "../types";

export default function StatBand({ v }: { v: Verification }) {
  return (
    <section className="mx-auto max-w-[1480px] px-5 pt-6 md:px-8">
      <h2 className="sr-only">Key performance indicators</h2>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {/* HERO, the only KPI with a micro-viz (an honest point-in-time datum). */}
        <div
          className="rise group relative overflow-hidden rounded-2xl border border-brass/30 bg-gradient-to-br from-brass/[0.10] via-panel to-panel p-5"
          style={{ animationDelay: "0ms" }}
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brass/12 blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
                Concentration
              </span>
              <Badge tone="brand">Hero stat</Badge>
            </div>
            <div className="mt-4 flex items-end gap-1.5">
              <span className="font-display text-[52px] font-bold leading-none text-ink">
                <Ticker value={v.stations_for_80pct} />
              </span>
              <span className="mb-1 font-display text-[28px] font-bold leading-none text-low">
                / {v.n_stations}
              </span>
            </div>
            <p className="mt-2 text-[15px] font-medium text-ink">
              stations = <span className="text-brass">80%</span> of all violations
            </p>
            <ConcentrationStrip filled={v.stations_for_80pct} total={v.n_stations} />
            <p className="mt-2 text-[12px] leading-snug text-mid">
              Just {v.stations_for_50pct} stations carry half the city's load. Deploy where the data
              already points.
            </p>
          </div>
        </div>

        <KpiTile
          delay={80}
          kicker="Patrol efficiency"
          tone="good"
          big={<Ticker value={v.patrol_efficiency_x} decimals={1} suffix="×" delay={80} />}
          label="more violations covered than random patrol"
          sub={
            <>
              Top-100 corners hold <b className="text-ink">{pct(v.top100_cells_pct)}</b> of
              violations vs <b className="text-ink">{pct(v.random100_cells_pct)}</b> for 100 random
              corners.
            </>
          }
        />

        <KpiTile
          delay={160}
          kicker="Chronic offenders"
          tone="harm"
          big={<Ticker value={v.offenders_ge10} delay={160} />}
          label="vehicles with ≥10 violations"
          sub={
            <>
              <b className="text-ink">{v.chronic_across_ge2_stations}</b> of them span{" "}
              <b className="text-ink">2+ stations</b>, invisible to any single station today.
            </>
          }
        />

        <KpiTile
          delay={240}
          kicker="Out-of-time backtest"
          tone="good"
          big={<Ticker value={v.top142_temporal_stability_pct} decimals={1} suffix="%" delay={240} />}
          label="of top corners stay hot in a held-out later period"
          sub={
            <>
              Hotspots are <b className="text-ink">stable</b>, not noise, validated on data the
              model never saw.
            </>
          }
        />
      </div>

      <div
        className="rise mt-3.5 flex items-start gap-3 rounded-2xl border border-brass/25 bg-brass/[0.06] px-5 py-4"
        style={{ animationDelay: "320ms" }}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brass shadow-[0_0_12px_rgba(201,162,80,0.6)]"
        ></span>
        <p className="text-[15px] font-medium leading-snug text-ink">
          Same officers, same data —{" "}
          <span className="font-semibold text-brass">
            <Ticker value={v.patrol_efficiency_x} decimals={1} suffix="×" delay={320} /> the
            violations covered
          </span>
          . This is tomorrow's 8 AM roster, computed.
        </p>
      </div>
    </section>
  );
}

function KpiTile({
  kicker,
  big,
  label,
  sub,
  tone,
  delay,
}: {
  kicker: string;
  big: React.ReactNode;
  label: string;
  sub: React.ReactNode;
  tone: "good" | "harm" | "brand";
  delay: number;
}) {
  const ring = {
    good: "hover:border-green/30",
    harm: "hover:border-red/30",
    brand: "hover:border-brass/30",
  }[tone];
  return (
    <div
      className={`rise rounded-2xl border border-line bg-panel p-5 transition-colors ${ring}`}
      style={{ animationDelay: delay + "ms" }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">{kicker}</span>
      <div className="mt-3 font-display text-[44px] font-bold leading-none text-ink">{big}</div>
      <p className="mt-2 text-[13.5px] font-medium leading-snug text-ink">{label}</p>
      <p className="mt-1 text-[12px] leading-snug text-mid">{sub}</p>
    </div>
  );
}
