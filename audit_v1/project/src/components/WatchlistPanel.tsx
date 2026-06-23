import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, animate } from "framer-motion";
import { Panel, Ticker } from "./ui";
import { fmt, prefersReduced } from "../lib/format";
import type { Watchlist, Offender, GNode } from "../types";

type SortKey = "vehicle" | "violations" | "n_stations" | "approved_only_violations";

const SIZE = 380;
const C = SIZE / 2; // 190 — viewBox centre

export default function WatchlistPanel({ watchlist }: { watchlist: Watchlist }) {
  const graphVehicles = Object.keys(watchlist.graph);
  const [vehicle, setVehicle] = useState(
    graphVehicles.includes("FKN00GL16746") ? "FKN00GL16746" : graphVehicles[0]
  );
  const [revealed, setRevealed] = useState(false);
  const [landed, setLanded] = useState<Record<string, boolean>>({});
  const [hubLanded, setHubLanded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("n_stations");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const g = watchlist.graph[vehicle];
  const selectedOffender = watchlist.offenders.find((o) => o.vehicle === vehicle);
  const total = g.edges.reduce((a, e) => a + e.count, 0);
  const nStations = g.nodes.filter((n) => n.type === "station").length;
  const stationCounts = g.nodes.filter((n) => n.type === "station").map((n) => n.local_count ?? 0);
  const maxLocal = Math.max(...stationCounts);
  const minLocal = Math.min(...stationCounts);
  const edgeDelay = (i: number) => Math.min(i * 0.06, 0.4);
  const DRAW = 0.66;

  const center = g.nodes.find((n) => n.type === "vehicle");

  // edges ordered heaviest-first so the biggest slice (Hulimavu-17) draws first.
  const orderedEdges = useMemo(
    () => [...g.edges].sort((a, b) => b.count - a.count),
    [vehicle] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const topEdgeIds = useMemo(
    () => orderedEdges.slice(0, 3).map((e) => e.to),
    [orderedEdges]
  );
  const nodeById = useMemo(() => {
    const m: Record<string, GNode> = {};
    g.nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [vehicle]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRevealed(false);
    setLanded({});
    setHubLanded(false);
  }, [vehicle]);

  const reveal = () => {
    setRevealed(true);
    if (prefersReduced) {
      const all: Record<string, boolean> = {};
      g.edges.forEach((e) => (all[e.to] = true));
      setLanded(all);
      setHubLanded(true);
    }
  };
  const onEdgeLanded = (to: string) => {
    setLanded((s) => {
      const next = { ...s, [to]: true };
      if (Object.keys(next).length >= g.edges.length) setHubLanded(true);
      return next;
    });
  };

  const offenders: Offender[] = useMemo(() => {
    const arr = [...watchlist.offenders];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const r = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? r : -r;
    });
    return arr.slice(0, 10);
  }, [sortKey, sortDir, watchlist.offenders]);
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "");
  const ariaSort = (k: SortKey): "ascending" | "descending" | "none" =>
    sortKey === k ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  if (!center) return null;
  const cx = center.x * SIZE;
  const cy = center.y * SIZE;

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-5">
      <Panel className="self-start xl:col-span-3">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
              The hidden network
            </span>
            <h3 className="mt-1 font-display text-lg font-semibold text-ink">
              Cross-jurisdiction offender graph
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {graphVehicles.map((vch) => (
              <button
                key={vch}
                onClick={() => setVehicle(vch)}
                className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors ${
                  vehicle === vch
                    ? "border-struct/40 bg-struct/10 text-struct"
                    : "border-line bg-panel2 text-mid hover:text-ink"
                }`}
              >
                {vch}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="relative mx-auto aspect-square w-full" style={{ maxWidth: 520 }}>
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={`Cross-jurisdiction network: vehicle ${vehicle} — ${total} violations across ${nStations} police stations, invisible to any single station.`}
              className="h-full w-full overflow-visible"
            >
              <GraphDefs />

              {/* ── deep field: faint concentric rings hint the convergence target ── */}
              <g className="np-field" aria-hidden="true">
                <circle cx={cx} cy={cy} r={150} fill="none" stroke="rgba(154,166,189,0.05)" strokeWidth="1" />
                <circle cx={cx} cy={cy} r={108} fill="none" stroke="rgba(154,166,189,0.06)" strokeWidth="1" />
                <circle cx={cx} cy={cy} r={66} fill="none" stroke="rgba(154,166,189,0.07)" strokeWidth="1" />
                {/* convergence aura that blooms only once everything has landed */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={150}
                  fill="url(#wl-bloom)"
                  style={{ opacity: hubLanded ? 1 : 0, transition: "opacity .9s ease .15s" }}
                />
              </g>

              {/* ── EDGES — idle: dotted "potential"; revealed: brass draw heaviest-first ── */}
              {orderedEdges.map((e, i) => {
                const from = nodeById[e.from];
                const to = nodeById[e.to];
                if (!from || !to) return null;
                const w = 1.4 + (e.count / total) * 7;
                const x1 = from.x * SIZE, y1 = from.y * SIZE, x2 = to.x * SIZE, y2 = to.y * SIZE;
                return (
                  <g key={vehicle + "edge" + e.to}>
                    {/* idle potential wire — barely-there dotted hint */}
                    {!revealed && (
                      <line
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#9aa6bd" strokeWidth="1" strokeLinecap="round"
                        strokeDasharray="1 6" opacity={0.16}
                      />
                    )}
                    {/* soft glow underlay (drawn) */}
                    <motion.line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#f0a92e" strokeWidth={w + 5} strokeLinecap="round"
                      opacity={0} initial={{ pathLength: 0, opacity: 0 }}
                      animate={revealed ? { pathLength: 1, opacity: 0.14 } : { pathLength: 0, opacity: 0 }}
                      transition={prefersReduced ? { duration: 0 } : { pathLength: { duration: DRAW, delay: edgeDelay(i), ease: [0.2, 0.7, 0.2, 1] }, opacity: { duration: 0.3, delay: edgeDelay(i) } }}
                      style={{ filter: "blur(3px)" }}
                    />
                    {/* the bright wire */}
                    <motion.line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="url(#wl-edge)" strokeWidth={w} strokeLinecap="round"
                      opacity={0} initial={{ pathLength: 0, opacity: 0 }}
                      animate={revealed ? { pathLength: 1, opacity: 0.62 } : { pathLength: 0, opacity: 0 }}
                      transition={prefersReduced ? { duration: 0 } : { pathLength: { duration: DRAW, delay: edgeDelay(i), ease: [0.2, 0.7, 0.2, 1] }, opacity: { duration: 0.3, delay: edgeDelay(i) } }}
                      onAnimationComplete={() => { if (revealed) onEdgeLanded(e.to); }}
                    />
                  </g>
                );
              })}

              {/* ── PARTICLES — glowing packets stream station → hub, density ∝ count ── */}
              {revealed && !prefersReduced && (
                <ParticleStream
                  key={vehicle + "particles"}
                  edges={orderedEdges}
                  nodeById={nodeById}
                  total={total}
                  cx={cx} cy={cy}
                />
              )}

              {/* ── edge-count pills at midpoints (top-3), fade in as their edge lands ── */}
              {revealed && orderedEdges.filter((e) => topEdgeIds.includes(e.to)).map((e, i) => {
                const from = nodeById[e.from];
                const to = nodeById[e.to];
                if (!from || !to) return null;
                const mx = ((from.x + to.x) / 2) * SIZE, my = ((from.y + to.y) / 2) * SIZE;
                return (
                  <g key={"pill" + i} style={{ opacity: landed[e.to] ? 1 : 0, transition: "opacity .35s" }}>
                    <rect x={mx - 12} y={my - 9} width="24" height="17" rx="5.5" fill="#15171c" stroke="rgba(240,169,46,0.4)" />
                    <text x={mx} y={my + 3} textAnchor="middle" className="font-mono tnum" fontSize="10" fontWeight="600" fill="#f0a92e">{e.count}</text>
                  </g>
                );
              })}

              {/* ── STATION SILOS — physical vaults that ignite navy→brass on land ── */}
              {g.nodes.filter((n) => n.type === "station").map((n) => {
                const r = 12 + Math.sqrt((n.local_count ?? 0) / maxLocal) * 10; // 12–22
                const on = landed[n.id];
                const nx = n.x * SIZE, ny = n.y * SIZE;
                const labelBelow = n.y > 0.6;
                return (
                  <Silo
                    key={vehicle + n.id}
                    nx={nx} ny={ny} r={r}
                    on={!!on} revealed={revealed}
                    label={n.label}
                    count={n.local_count ?? 0}
                    labelBelow={labelBelow}
                  />
                );
              })}

              {/* ── AGGREGATE HUB — lands last with weight, carries the amber glow ── */}
              {/* one-shot shockwave on impact */}
              {hubLanded && !prefersReduced && (
                <circle
                  className="wl-shock"
                  cx={cx} cy={cy} r={38}
                  fill="none" stroke="#f7c25a" strokeWidth="2.5"
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
              )}
              <motion.g
                initial={{ scale: 0.5, opacity: 0.3 }}
                animate={
                  hubLanded
                    ? { scale: [1.06, 1], opacity: 1 }
                    : revealed
                    ? { scale: 0.62, opacity: 0.45 }
                    : { scale: 0.5, opacity: 0.32 }
                }
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : hubLanded
                    ? { type: "spring", stiffness: 230, damping: 14, mass: 1.6 }
                    : { type: "spring", stiffness: 220, damping: 18 }
                }
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                {/* breathing aura — idle (subtle) and landed (persistent pulse) */}
                {hubLanded ? (
                  <circle
                    cx={cx} cy={cy} r="38"
                    fill="none" stroke="#f0a92e" strokeWidth="1.5" opacity="0.4"
                    style={{ transformOrigin: `${cx}px ${cy}px`, animation: prefersReduced ? "none" : "pulsering 2.8s ease-out infinite" }}
                  />
                ) : (
                  <circle
                    cx={cx} cy={cy} r="46"
                    fill="none" stroke="#f0a92e" strokeWidth="1" opacity="0.18"
                    style={{ animation: prefersReduced ? "none" : "wl-breathe 3s ease-in-out infinite" }}
                  />
                )}
                {/* outer glow ring */}
                <circle cx={cx} cy={cy} r="42" fill="url(#wl-hub-glow)" opacity={hubLanded ? 1 : revealed ? 0.6 : 0.4} />
                {/* the coin */}
                <circle
                  cx={cx} cy={cy} r="34"
                  fill="url(#wl-hub)" stroke="#fbd07a" strokeWidth="2"
                  style={{ filter: hubLanded ? "url(#wl-neon)" : "none" }}
                />
                <circle cx={cx} cy={cy} r="34" fill="none" stroke="#7a5410" strokeWidth="0.75" opacity="0.5" />
                <text x={cx} y={cy - 2} textAnchor="middle" fontSize="18" className="font-display tnum" fontWeight="700" fill="#1a1204">
                  {hubLanded ? <HubCount value={total} /> : 0}
                </text>
                <text x={cx} y={cy + 13} textAnchor="middle" fontSize="7.5" fill="#3a2a08" fontWeight="700" letterSpacing="0.06em">VIOLATIONS</text>
              </motion.g>
            </svg>
          </div>

          {/* aria-live payoff for screen readers */}
          <div className="sr-only" aria-live="polite">
            {revealed
              ? `One vehicle, ${total} violations across ${nStations} stations — invisible to any single station.`
              : ""}
          </div>

          <div className="border-t border-line p-4">
            {!revealed ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-[13px] text-mid">Each station sees only its own slice. Looks minor everywhere.</p>
                <button
                  onClick={reveal}
                  className="wl-reveal-btn group relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-brass/40 bg-brass/10 px-4 py-2.5 text-[13.5px] font-semibold text-brass transition-colors hover:bg-brass/20"
                >
                  <span aria-hidden="true" className="wl-reveal-sheen" />
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  Reveal the hidden network
                </button>
              </div>
            ) : (
              <div className="fadein text-center">
                <p className="font-display text-[17px] font-semibold leading-snug text-ink">
                  One vehicle. <span className="text-brass">{total} violations.</span> {nStations} stations.{" "}
                  <span className="text-red">Invisible to all of them.</span>
                </p>
                <p className="mt-1 text-[12px] text-mid">
                  Each station sees {minLocal}–{maxLocal} tickets → joined, we see{" "}
                  <span className="font-semibold text-brass">{total}</span>.
                </p>
                {selectedOffender && (
                  <p className="mt-1 text-[12px] text-mid">
                    <span className="font-semibold text-brass">{selectedOffender.approved_only_violations}</span>{" "}
                    of {selectedOffender.violations} on approved (adjudicated) tickets.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <div className="flex flex-col gap-4 xl:col-span-2">
        <Panel className="p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red/10 text-red">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </span>
            <div>
              <h4 className="text-[14px] font-semibold text-ink">The blind spot</h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-mid">
                No single station can see a vehicle's full record, records are siloed by jurisdiction.
                SmartPatrol joins them into one graph:{" "}
                <b className="text-ink">{watchlist.summary.chronic_across_ge2} chronic offenders</b> span 2+ stations,{" "}
                <b className="text-ink">{watchlist.summary.chronic_across_ge3}</b> span 3+. The cross-jurisdiction join no single desk can run today.
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h4 className="text-[13px] font-semibold text-ink">Top offenders by frequency</h4>
            <span className="text-[11px] text-low">showing top 10 of {fmt(watchlist.summary.offenders_ge10)}</span>
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-low">
                <th aria-sort={ariaSort("vehicle")}>
                  <button type="button" onClick={() => toggleSort("vehicle")} className="w-full cursor-pointer px-4 py-2 text-left font-medium hover:text-ink">Vehicle {arrow("vehicle")}</button>
                </th>
                <th aria-sort={ariaSort("violations")}>
                  <button type="button" onClick={() => toggleSort("violations")} className="w-full cursor-pointer px-3 py-2 text-right font-medium hover:text-ink">Violations {arrow("violations")}</button>
                </th>
                <th aria-sort={ariaSort("n_stations")}>
                  <button type="button" onClick={() => toggleSort("n_stations")} className="w-full cursor-pointer px-3 py-2 text-right font-medium hover:text-ink">Stations {arrow("n_stations")}</button>
                </th>
                <th aria-sort={ariaSort("approved_only_violations")}>
                  <button type="button" onClick={() => toggleSort("approved_only_violations")} className="w-full cursor-pointer px-4 py-2 text-right font-medium hover:text-ink">Approved {arrow("approved_only_violations")}</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {offenders.map((o) => (
                <tr key={o.vehicle} className={`border-b border-line/60 transition-colors hover:bg-white/[0.03] ${o.vehicle === vehicle ? "bg-struct/[0.06]" : ""}`}>
                  <td className="px-4 py-2 font-mono text-[11.5px] text-ink">
                    <div className="flex items-center gap-1.5">
                      <span>{o.vehicle}</span>
                      {o.violations === 55 && <span className="text-[9.5px] text-low">freq record</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className="relative inline-block h-[3px] w-14 overflow-hidden rounded-full bg-line2"
                        aria-hidden="true"
                      >
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-brass"
                          style={{ width: `${o.violations ? (o.approved_only_violations / o.violations) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="tnum font-sans text-[9.5px] text-low">{o.approved_only_violations} of {o.violations} approved</span>
                    </div>
                  </td>
                  <td className="tnum px-3 py-2 text-right font-semibold text-ink">{o.violations}</td>
                  <td className="tnum px-3 py-2 text-right">
                    <span className={o.n_stations >= 2 ? "font-semibold text-red" : "text-mid"}>{o.n_stations}</span>
                  </td>
                  <td className="tnum px-4 py-2 text-right font-semibold text-brass">{o.approved_only_violations}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2.5 text-[10.5px] leading-snug text-low">
            <b className="text-mid">Frequency ≠ jurisdiction span.</b> The max-frequency vehicle{" "}
            <span className="font-mono text-mid">FKN00GL4424</span> has 55 violations in{" "}
            <b className="text-mid">exactly one</b> station, a frequency record, never a multi-station case.
          </p>
          <p className="border-t border-line px-4 py-2.5 text-[10.5px] leading-snug text-low">
            <b className="text-mid">Approved</b> = passed BTP's own validation (adjudicated), not a court conviction. Each row shows that vehicle's approved violations out of its total.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ───────────────────────── shared <defs> — gradients + glow filter ──────────── */
function GraphDefs() {
  return (
    <defs>
      {/* hub coin — lit sphere */}
      <radialGradient id="wl-hub" cx="40%" cy="36%" r="75%">
        <stop offset="0" stopColor="#ffe2a6" />
        <stop offset="0.45" stopColor="#f7c25a" />
        <stop offset="1" stopColor="#e89a23" />
      </radialGradient>
      {/* hub outer halo */}
      <radialGradient id="wl-hub-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0.55" stopColor="#f0a92e" stopOpacity="0.5" />
        <stop offset="0.78" stopColor="#f0a92e" stopOpacity="0.18" />
        <stop offset="1" stopColor="#f0a92e" stopOpacity="0" />
      </radialGradient>
      {/* convergence bloom behind everything once landed */}
      <radialGradient id="wl-bloom" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#f0a92e" stopOpacity="0.1" />
        <stop offset="0.5" stopColor="#f0a92e" stopOpacity="0.035" />
        <stop offset="1" stopColor="#f0a92e" stopOpacity="0" />
      </radialGradient>
      {/* edge stroke — directional brass with brighter hub end */}
      <linearGradient id="wl-edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c98a26" />
        <stop offset="1" stopColor="#fbd07a" />
      </linearGradient>
      {/* station vault — navy idle */}
      <radialGradient id="wl-silo" cx="42%" cy="34%" r="80%">
        <stop offset="0" stopColor="#262b35" />
        <stop offset="1" stopColor="#13161c" />
      </radialGradient>
      {/* station vault — ignited brass */}
      <radialGradient id="wl-silo-on" cx="42%" cy="34%" r="80%">
        <stop offset="0" stopColor="rgba(247,194,90,0.28)" />
        <stop offset="1" stopColor="rgba(240,169,46,0.08)" />
      </radialGradient>
      {/* glowing packet */}
      <radialGradient id="wl-pkt" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#fff4d6" />
        <stop offset="0.4" stopColor="#fbd07a" />
        <stop offset="1" stopColor="#f0a92e" stopOpacity="0" />
      </radialGradient>
      {/* hero glow filter — ≤1 element */}
      <filter id="wl-neon" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="3.5" result="b1" />
        <feMerge>
          <feMergeNode in="b1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/* ───────────────────────── station silo (vault → ignites) ──────────────────── */
function Silo({
  nx, ny, r, on, revealed, label, count, labelBelow,
}: {
  nx: number; ny: number; r: number; on: boolean; revealed: boolean;
  label: string; count: number; labelBelow: boolean;
}) {
  return (
    <g
      style={{
        transform: on && !prefersReduced ? "scale(1.07)" : "scale(1)",
        transformOrigin: `${nx}px ${ny}px`,
        transition: "transform .4s cubic-bezier(.2,.7,.2,1)",
      }}
    >
      {/* ignited halo */}
      <circle
        cx={nx} cy={ny} r={r + 7}
        fill="url(#wl-hub-glow)"
        style={{ opacity: on ? 0.7 : 0, transition: "opacity .45s ease" }}
      />
      {/* vault body */}
      <circle
        cx={nx} cy={ny} r={r}
        fill={on ? "url(#wl-silo-on)" : "url(#wl-silo)"}
        stroke={on ? "#f0a92e" : "rgba(154,166,189,0.3)"}
        strokeWidth={on ? 1.75 : 1.25}
        style={{ transition: "stroke .4s ease, stroke-width .4s ease" }}
      />
      {/* inner rim — gives the vault depth */}
      <circle cx={nx} cy={ny} r={r - 2.5} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" opacity={on ? 0.3 : 0.6} />
      {/* top sheen */}
      <ellipse cx={nx} cy={ny - r * 0.42} rx={r * 0.5} ry={r * 0.22} fill="rgba(255,255,255,0.06)" />
      {/* local count — counts up when ignited */}
      <text x={nx} y={ny + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={on ? "#fbd07a" : "#ECEEF2"} className="tnum" style={{ transition: "fill .4s ease" }}>
        {on && revealed ? <SiloCount value={count} /> : count}
      </text>
      {/* station label */}
      <text x={nx} y={ny + (labelBelow ? r + 15 : -r - 8)} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#9aa6bd">{label}</text>
    </g>
  );
}

/* ───────────────────── particle stream — one rAF lerp loop ─────────────────── */
type Pkt = { edgeIx: number; t: number; speed: number; size: number };
function ParticleStream({
  edges, nodeById, total, cx, cy,
}: {
  edges: { from: string; to: string; count: number }[];
  nodeById: Record<string, GNode>;
  total: number;
  cx: number; cy: number;
}) {
  const ref = useRef<SVGGElement>(null);
  const pktsRef = useRef<Pkt[]>([]);
  const rafRef = useRef<number>(0);

  // build a packet pool with density ∝ edge count (Hulimavu-17 → many; Madiwala-1 → a trickle)
  const pool = useMemo(() => {
    const pkts: Pkt[] = [];
    edges.forEach((e, edgeIx) => {
      const density = Math.max(1, Math.round((e.count / total) * 9)); // 1..~9 packets
      for (let k = 0; k < density; k++) {
        pkts.push({
          edgeIx,
          t: Math.random(), // staggered along the wire
          speed: 0.28 + Math.random() * 0.22, // units/sec
          size: 2.4 + Math.min(2.2, e.count / 12),
        });
      }
    });
    return pkts;
  }, [edges, total]);

  useEffect(() => {
    pktsRef.current = pool.map((p) => ({ ...p }));
    const geo = edges.map((e) => {
      const from = nodeById[e.from];
      return { x1: from.x * SIZE, y1: from.y * SIZE };
    });
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const grp = ref.current;
      if (grp) {
        const children = grp.children;
        const pkts = pktsRef.current;
        for (let i = 0; i < pkts.length; i++) {
          const p = pkts[i];
          p.t += p.speed * dt;
          if (p.t >= 1) p.t -= 1; // recycle (loop into the hub forever)
          const g0 = geo[p.edgeIx];
          // ease toward the hub so packets accelerate as they arrive — "pulled in"
          const e = p.t * p.t * (3 - 2 * p.t); // smoothstep
          const x = g0.x1 + (cx - g0.x1) * e;
          const y = g0.y1 + (cy - g0.y1) * e;
          const node = children[i] as SVGCircleElement | undefined;
          if (node) {
            node.setAttribute("cx", String(x));
            node.setAttribute("cy", String(y));
            // brighten near the hub, fade at the silo
            node.setAttribute("opacity", String(0.25 + 0.7 * e));
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pool, edges, nodeById, cx, cy]);

  return (
    <g ref={ref} aria-hidden="true">
      {pool.map((p, i) => (
        <circle key={i} r={p.size} fill="url(#wl-pkt)" />
      ))}
    </g>
  );
}

/* ───────────────────────── count-up helpers (SVG <text>) ───────────────────── */
function HubCount({ value }: { value: number }) {
  const [n, setN] = useState(prefersReduced ? value : 0);
  useEffect(() => {
    if (prefersReduced) { setN(value); return; }
    const controls = animate(0, value, {
      duration: 0.9,
      delay: 0.12, // lands as the hub thuds
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(v),
    });
    return controls.stop;
  }, [value]);
  return <>{fmt(n)}</>;
}

function SiloCount({ value }: { value: number }) {
  const [n, setN] = useState(prefersReduced ? value : 0);
  useEffect(() => {
    if (prefersReduced) { setN(value); return; }
    const controls = animate(0, value, {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(v),
    });
    return controls.stop;
  }, [value]);
  return <>{fmt(n)}</>;
}
