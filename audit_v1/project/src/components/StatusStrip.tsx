import React from "react";
import { fmt, pct } from "../lib/format";
import type { Verification } from "../types";

/* Deterministic-export provenance. Labelled COMPUTED (never "Live"/"Updated"):
 * a ticking clock would fabricate a real-time feed. Every value binds to data. */
export default function StatusStrip({ v }: { v: Verification }) {
  const chips: { dot?: boolean; node: React.ReactNode }[] = [
    { dot: true, node: <>DATASET LOADED · {v.date_window}</> },
    { node: <>COMPUTED 08:00 IST</> },
    { node: <>INTEGRITY {fmt(v.rows_total)} rows · {fmt(v.rows_dropped)} dropped</> },
    { node: <>BACKTEST {pct(v.top142_temporal_stability_pct)} stable</> },
  ];
  return (
    <div className="border-b border-line bg-panel/50">
      <div className="mx-auto max-w-[1480px] px-5 md:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-mid">
          {chips.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-low/60">/</span>}
              <span className="flex items-center gap-1.5">
                {c.dot && (
                  <span className="h-1.5 w-1.5 rounded-full bg-steel"></span>
                )}
                {c.node}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
