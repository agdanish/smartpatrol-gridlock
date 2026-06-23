import { Link } from "react-router-dom";
import { Logo, MapplsBadge } from "./ui";
import { fmt } from "../lib/format";
import type { Verification } from "../types";

export default function Header({ v }: { v: Verification }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-start gap-3.5">
          <Logo size={40} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[19px] font-bold leading-none tracking-tight text-ink">
                SmartPatrol
              </h1>
              <span className="hidden whitespace-nowrap rounded-full border border-line bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-mid sm:inline-flex">
                Predictive Enforcement Deployment Brain · BTP
              </span>
            </div>
            <p className="mt-1.5 max-w-xl text-[12.5px] leading-snug text-mid">
              {fmt(v.rows_total)} of Bengaluru Traffic Police's own parking tickets → tomorrow's
              patrol plan.
              <span className="text-low"> Sensor-free · audit-grade.</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 md:flex-col md:items-end md:gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/"
              title="Back to the intro"
              className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-mid transition-colors hover:border-brass/40 hover:text-brass"
            >
              <span className="transition-transform group-hover:-translate-x-0.5">←</span> Intro
            </Link>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-green/25 bg-green/10 px-2.5 py-1 text-[11px] font-medium text-green"
              title="Deterministic static export — figures computed from the source dataset, not a live feed"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true"></span>
              Dataset · COMPUTED
            </span>
            <MapplsBadge />
          </div>
          <p className="hidden text-[11px] text-low md:block">
            Single source · BTP parking-violation export · ~5 months
          </p>
        </div>
      </div>
    </header>
  );
}
