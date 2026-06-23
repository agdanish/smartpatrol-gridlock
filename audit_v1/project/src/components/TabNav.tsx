import React, { useRef } from "react";
import { motion } from "framer-motion";

export type TabId = "map" | "watch" | "network" | "harm" | "coverage" | "rollout" | "evidence";

export const TABS: { id: TabId; label: string; n: string }[] = [
  { id: "map", label: "Map & Roster", n: "01" },
  { id: "watch", label: "Watchlist", n: "02" },
  { id: "network", label: "Offender Network", n: "03" },
  { id: "harm", label: "Volume vs Harm", n: "04" },
  { id: "coverage", label: "Coverage", n: "05" },
  { id: "rollout", label: "Rollout", n: "06" },
  { id: "evidence", label: "Evidence", n: "07" },
];

export default function TabNav({
  active,
  setActive,
}: {
  active: TabId;
  setActive: (id: TabId) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: React.KeyboardEvent, idx: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next !== null) {
      e.preventDefault();
      const id = TABS[next].id;
      setActive(id);
      refs.current[id]?.focus();
    }
  };
  return (
    <div className="sticky top-[112px] z-30 border-b border-line bg-base/90 backdrop-blur-xl md:top-[68px]">
      <div className="mx-auto max-w-[1480px] px-5 md:px-8">
        <div role="tablist" aria-label="Pitch narrative" className="relative flex gap-1 overflow-x-auto py-2.5">
          {TABS.map((t, idx) => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => (refs.current[t.id] = el)}
                id={`tab-${t.id}`}
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onKeyDown={(e) => onKey(e, idx)}
                onClick={() => setActive(t.id)}
                className={`relative z-10 flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                  on ? "text-ink" : "text-mid hover:text-ink"
                }`}
              >
                {/* one clean cue: a single shared sliding indicator (struct-blue) */}
                {on && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-0 -z-10 rounded-xl border border-struct/40 bg-struct/12"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className={`font-mono text-[11px] ${on ? "text-struct" : "text-low"}`}>{t.n}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
