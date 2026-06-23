import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, SectionTitle, Badge } from "./ui";
import { fmt } from "../lib/format";
import { derived } from "../data/derivedData";

/* =============================================================================
 * SmartPatrol — OFFENDER NETWORK (innovation centerpiece)
 * The 711 chronic offenders are joined into a single graph by *where they
 * re-offend*. No geographic feature is fed to the model; communities are found
 * by modularity alone, yet they snap onto Bengaluru's real map — which is the
 * whole point of the hero constellation: same colour = same auto-discovered
 * ring, and the colours cluster geographically on their own.
 *
 * The map is alive: 38 scattered points fly apart, repel into clusters, and
 * settle ring-by-ring onto Bengaluru's real geography via a tiny hand-rolled
 * velocity-Verlet sim (anchor = projected lat/lon — a free layout would
 * destroy the "it rebuilt the city" story). Then it breathes, edges flow, and
 * the three bridge stations pulse. prefers-reduced-motion paints the settled
 * poster synchronously — beautiful, never blank.
 *
 * Every number is read live from derived.network (computed from the BTP file).
 * ===========================================================================*/

const net = derived.network;

/* Six muted, distinct ring hues that sit calmly on the dark UI. Index = community. */
const RING_COLORS = [
  "#f0a92e", // brass    — Ring 1
  "#5b8def", // struct   — Ring 2
  "#4fae8b", // green    — Ring 3
  "#a78bfa", // violet   — Ring 4
  "#3fb6c4", // teal     — Ring 5
  "#e98aa6", // rose     — Ring 6
] as const;

const ringName = (c: number) => `Ring ${c + 1}`;
const BRIDGE = "#5b8def"; // struct-blue: structure / bridges only

/* Two canvas geometries: wide (default) + portrait (narrow screens). Padding
 * keeps the largest node + its label inside the frame. */
const LAND = { vw: 760, vh: 392, pad: 46 };
const PORT = { vw: 460, vh: 520, pad: 44 };

/* ---- a tiny seeded RNG so the starfield + scatter are stable across renders ---- */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Geo = { vw: number; vh: number; pad: number };
type Node = {
  name: string;
  c: number;
  r: number;
  ax: number; // anchor (projected lat/lon)
  ay: number;
  x: number; // live position
  y: number;
  vx: number;
  vy: number;
  px: number; // phase for idle drift
  py: number;
  isBridge: boolean;
  isLeader: boolean;
};

/* Project real lat/lon into a viewBox, latitude inverted so north is up. */
function projectNodes(geo: Geo, bridgeSet: Set<string>, leaderSet: Set<string>): Node[] {
  const lats = net.stations.map((s) => s.lat);
  const lons = net.stations.map((s) => s.lon);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  const lonSpan = lonMax - lonMin || 1;
  const latSpan = latMax - latMin || 1;
  return net.stations.map((s) => {
    const ax = geo.pad + ((s.lon - lonMin) / lonSpan) * (geo.vw - 2 * geo.pad);
    const ay = geo.pad + ((latMax - s.lat) / latSpan) * (geo.vh - 2 * geo.pad);
    const r = Math.min(10.5, 3.4 + Math.sqrt(s.chronic_offenders) * 0.44);
    return {
      name: s.name,
      c: s.community,
      r,
      ax,
      ay,
      x: ax,
      y: ay,
      vx: 0,
      vy: 0,
      px: 0,
      py: 0,
      isBridge: bridgeSet.has(s.name),
      isLeader: leaderSet.has(s.name),
    };
  });
}

/* One velocity-Verlet tick: anchor spring pulls each node to its true geo
 * position; O(n²) collision repulsion (no quadtree needed at n=38) prevents
 * overlap; integrate + damp; caller cools alpha. Returns kinetic energy. */
const ANCHOR_K = 0.012;
const REPULSE = 90;
const DAMP = 0.86;
function tick(nodes: Node[], alpha: number): number {
  for (const n of nodes) {
    n.vx += (n.ax - n.x) * ANCHOR_K * alpha;
    n.vy += (n.ay - n.y) * ANCHOR_K * alpha;
  }
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1e-4) {
        dx = (i - j) * 0.5 + 0.1;
        dy = 0.1;
        d2 = dx * dx + dy * dy;
      }
      const minD = a.r + b.r + 6;
      const d = Math.sqrt(d2);
      if (d < minD * 2.4) {
        const f = (REPULSE / d2) * alpha;
        const ux = dx / d;
        const uy = dy / d;
        a.vx += ux * f;
        a.vy += uy * f;
        b.vx -= ux * f;
        b.vy -= uy * f;
      }
    }
  }
  let ke = 0;
  for (const n of nodes) {
    n.vx *= DAMP;
    n.vy *= DAMP;
    n.x += n.vx;
    n.y += n.vy;
    ke += n.vx * n.vx + n.vy * n.vy;
  }
  return ke;
}

export default function NetworkPanel() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null); // hovered community ring
  const [hoverName, setHoverName] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [compact, setCompact] = useState(false);

  /* live prefers-reduced-motion listener (one source of truth) */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  /* responsive: pick portrait viewBox + culling thresholds from container width */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setPortrait(w > 0 && w < 520);
        setCompact(w > 0 && w < 560);
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const geo: Geo = portrait ? PORT : LAND;

  /* ---- static derivations (bridges, ring leaders, edges, stars) ---- */
  const { bridgeSet, leaderSet, biggestPerComm } = useMemo(() => {
    const bridgeSet = new Set<string>(net.bridges.slice(0, 3).map((b) => b.name));
    const chronicOf = (name: string) =>
      net.stations.find((x) => x.name === name)?.chronic_offenders ?? -1;
    const biggestPerComm: Record<number, string> = {};
    for (const s of net.stations) {
      const cur = biggestPerComm[s.community];
      if (cur === undefined || s.chronic_offenders > chronicOf(cur)) biggestPerComm[s.community] = s.name;
    }
    const leaderSet = new Set<string>(Object.values(biggestPerComm));
    return { bridgeSet, leaderSet, biggestPerComm };
  }, []);

  /* community centroids (for territory blobs) — recomputed per geometry */
  const settledNodes = useMemo(() => {
    const nodes = projectNodes(geo, bridgeSet, leaderSet);
    const rng = mulberry32(7);
    // scatter start toward centroid; unique idle phases
    const cx = geo.vw / 2;
    const cy = geo.vh / 2;
    for (const n of nodes) {
      const a = rng() * Math.PI * 2;
      const rad = 30 + rng() * 90;
      n.x = cx + Math.cos(a) * rad;
      n.y = cy + Math.sin(a) * rad * 0.7;
      n.vx = 0;
      n.vy = 0;
      n.px = rng() * Math.PI * 2;
      n.py = rng() * Math.PI * 2;
    }
    // reduced-motion: run the settle synchronously → painted poster
    const work = nodes.map((n) => ({ ...n }));
    let alpha = 1;
    for (let i = 0; i < 220; i++) {
      tick(work, alpha);
      alpha *= 1 - 0.0228;
    }
    return { nodes, settled: work };
  }, [geo, bridgeSet, leaderSet]);

  /* territory blobs: settled centroid per community (always from settled coords) */
  const territories = useMemo(() => {
    const acc: Record<number, { x: number; y: number; n: number }> = {};
    for (const n of settledNodes.settled) {
      const a = (acc[n.c] ??= { x: 0, y: 0, n: 0 });
      a.x += n.x;
      a.y += n.y;
      a.n++;
    }
    return Object.entries(acc).map(([c, a]) => ({
      c: Number(c),
      x: a.x / a.n,
      y: a.y / a.n,
    }));
  }, [settledNodes]);

  /* starfield (stable, seeded) */
  const stars = useMemo(() => {
    const rng = mulberry32(99);
    return Array.from({ length: 18 }, () => ({
      x: rng() * geo.vw,
      y: rng() * geo.vh,
      r: 0.5 + rng() * 1.1,
      o: 0.05 + rng() * 0.09,
      d: rng() * 4,
      dur: 3 + rng() * 4,
    }));
  }, [geo]);

  const edges = useMemo(
    () =>
      net.top_edges
        .map((e, i) => ({ ...e, i }))
        .sort((a, b) => b.w - a.w),
    []
  );
  const maxEdge = Math.max(...net.top_edges.map((e) => e.w));

  /* refs into the live DOM so the rAF loops can mutate without React re-renders */
  const nodeRefs = useRef<Record<string, SVGGElement | null>>({});
  const edgeRefs = useRef<Record<string, { base: SVGPathElement | null; flow: SVGPathElement | null }>>({});
  const particleRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const liveRef = useRef<Record<string, { x: number; y: number; bx: number; by: number }>>({});

  /* index nodes by name for edge endpoint lookup */
  const byName = useMemo(() => {
    const m: Record<string, Node> = {};
    for (const n of settledNodes.nodes) m[n.name] = n;
    return m;
  }, [settledNodes]);

  /* =========================================================================
   * ENTRANCE + IDLE rAF loop. Mutates SVG transforms / edge geometry directly.
   * Reduced-motion: skip entirely (settled poster painted via JSX transforms).
   * ========================================================================= */
  useEffect(() => {
    if (reduced) return;
    const nodes = settledNodes.nodes.map((n) => ({ ...n }));
    // re-scatter (the memo's `nodes` already hold scattered start positions)
    for (const n of nodes) liveRef.current[n.name] = { x: n.x, y: n.y, bx: n.x, by: n.y };

    let raf = 0;
    let alpha = 1;
    let settled = false;
    const start = performance.now();

    const setEdge = (key: string, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const e = edgeRefs.current[key];
      const d = `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
      e?.base?.setAttribute("d", d);
      e?.flow?.setAttribute("d", d);
    };

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      if (!settled) {
        const ke = tick(nodes, alpha);
        alpha *= 1 - 0.0228;
        for (const n of nodes) {
          const g = nodeRefs.current[n.name];
          if (g) g.setAttribute("transform", `translate(${n.x.toFixed(2)} ${n.y.toFixed(2)})`);
          liveRef.current[n.name] = { x: n.x, y: n.y, bx: n.x, by: n.y };
        }
        if (alpha < 0.005 || ke < 0.002) {
          settled = true;
          for (const n of nodes) {
            // snap exactly onto anchors so geography reads perfectly
            n.x = n.ax;
            n.y = n.ay;
          }
        }
      } else {
        // idle: sub-pixel Lissajous breathing around the anchor
        for (const n of nodes) {
          const bx = n.ax + Math.sin(t * 0.7 + n.px) * 2.2;
          const by = n.ay + Math.cos(t * 0.55 + n.py) * 2.0;
          const g = nodeRefs.current[n.name];
          if (g) g.setAttribute("transform", `translate(${bx.toFixed(2)} ${by.toFixed(2)})`);
          const lr = liveRef.current[n.name];
          if (lr) {
            lr.bx = bx;
            lr.by = by;
          }
        }
      }

      // edges follow live node centres
      for (const e of net.top_edges) {
        const a = liveRef.current[e.a];
        const b = liveRef.current[e.b];
        if (a && b) setEdge(`${e.a}|${e.b}`, { x: a.bx, y: a.by }, { x: b.bx, y: b.by });
      }

      // hero particles: lerp source→hub along the top-3 edges, ~6s period
      for (const e of edges.slice(0, 3)) {
        const key = `${e.a}|${e.b}`;
        const pc = particleRefs.current[key];
        const a = liveRef.current[e.a];
        const b = liveRef.current[e.b];
        if (pc && a && b) {
          const speed = 0.12 + (e.w / maxEdge) * 0.1;
          const f = (t * speed) % 1;
          pc.setAttribute("cx", (a.bx + (b.bx - a.bx) * f).toFixed(2));
          pc.setAttribute("cy", (a.by + (b.by - a.by) * f).toFixed(2));
          pc.setAttribute("opacity", (Math.sin(f * Math.PI) * 0.9).toFixed(2));
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced, settledNodes, edges, maxEdge]);

  /* reduced-motion: place edges at settled coords once */
  const settledByName = useMemo(() => {
    const m: Record<string, Node> = {};
    for (const n of settledNodes.settled) m[n.name] = n;
    return m;
  }, [settledNodes]);

  const onEnter = (n: Node) => {
    setHover(n.c);
    setHoverName(n.name);
  };
  const onLeave = () => {
    setHover(null);
    setHoverName(null);
  };

  const ariaLabel =
    `Offender-network constellation of ${net.stations.length} police stations across ` +
    `${net.n_communities} auto-discovered enforcement rings. Node size is the number of ` +
    `chronic offenders; lines are the strongest shared-offender corridors; the three ` +
    `highest-betweenness bridge stations are ringed. Communities were found by modularity ` +
    `(${net.modularity}) with no geographic input, yet same-ring stations sit ${net.geo_real_km} km ` +
    `apart versus ${net.geo_random_km} km by chance.`;

  const maxBridge = net.bridges[0]?.score || 1;
  const maxEdgeList = Math.max(...net.top_edges.map((e) => e.w));

  /* initial transform for each node group (scattered if animating, settled if reduced) */
  const initialPos = (name: string) => {
    if (reduced) {
      const s = settledByName[name];
      return s ? `translate(${s.x.toFixed(2)} ${s.y.toFixed(2)})` : "";
    }
    const n = byName[name];
    return n ? `translate(${n.x.toFixed(2)} ${n.y.toFixed(2)})` : "";
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        kicker="BEYOND THE SINGLE VEHICLE"
        title="The offender network behind Bengaluru's chaos"
        sub="711 chronic offenders, joined into one graph by where they re-offend. No geographic data was used — yet the network self-organises into 6 enforcement rings that map onto Bengaluru's real geography."
      />

      {/* ===================== HERO: constellation map ===================== */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
              Self-organising map
            </span>
            <h3 className="mt-1 font-display text-xl font-semibold text-ink">
              Six enforcement rings, discovered from re-offence — not from a map
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <Badge tone="struct">Modularity {net.modularity}</Badge>
            <Badge tone="brand">
              {fmt(net.edges_total)} links · {net.n_communities} rings
            </Badge>
          </div>
        </div>

        <div
          ref={wrapRef}
          className="np-stage relative mx-auto mt-5 w-full max-w-[840px] overflow-hidden rounded-xl border border-line bg-panel3/60"
          data-hover={hover ?? ""}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${geo.vw} ${geo.vh}`}
            role="img"
            aria-label={ariaLabel}
            aria-describedby="np-data-table"
            className="block h-auto w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="np-vignette" cx="50%" cy="42%" r="75%">
                <stop offset="0%" stopColor="#11131a" stopOpacity="0" />
                <stop offset="100%" stopColor="#0b0d12" stopOpacity="0.55" />
              </radialGradient>

              {/* per-ring bloom halo (free, used on every node) */}
              {RING_COLORS.map((c, i) => (
                <radialGradient key={`bloom${i}`} id={`np-bloom-${i}`} cx="40%" cy="38%" r="62%">
                  <stop offset="0%" stopColor={c} stopOpacity="0.55" />
                  <stop offset="45%" stopColor={c} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={c} stopOpacity="0" />
                </radialGradient>
              ))}
              {/* per-ring lit-sphere core */}
              {RING_COLORS.map((c, i) => (
                <radialGradient key={`core${i}`} id={`np-core-${i}`} cx="38%" cy="34%" r="72%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
                  <stop offset="30%" stopColor={c} stopOpacity="1" />
                  <stop offset="100%" stopColor={c} stopOpacity="1" />
                </radialGradient>
              ))}

              {/* the ONE real blur — used on the 3 bridge halos only */}
              <filter id="np-neon" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="2.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* territory-blob blur */}
              <filter id="np-blob" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="16" />
              </filter>
            </defs>

            <rect x="0" y="0" width={geo.vw} height={geo.vh} fill="url(#np-vignette)" />

            {/* depth plane 1 — starfield */}
            <g aria-hidden="true">
              {stars.map((s, i) => (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill="#5a6173"
                  opacity={s.o}
                  style={
                    reduced
                      ? undefined
                      : { animation: `np-twinkle ${s.dur}s ease-in-out ${s.d}s infinite` }
                  }
                />
              ))}
            </g>

            {/* depth plane 2 — cluster-territory halos (the "6 rings" as turf) */}
            <g filter="url(#np-blob)" className="np-territory">
              {territories.map((t) => (
                <circle
                  key={t.c}
                  data-ring={t.c}
                  cx={t.x}
                  cy={t.y}
                  r={portrait ? 72 : 80}
                  fill={RING_COLORS[t.c]}
                  className="np-blob"
                />
              ))}
            </g>

            {/* compass cue */}
            <text
              x={geo.vw - 16}
              y={26}
              textAnchor="end"
              className="fill-[#5a6173]"
              fontSize="10"
              letterSpacing="1.5"
            >
              N ↑
            </text>

            {/* ---- corridor edges (beneath nodes) ---- */}
            <g className="np-edges">
              {edges.map((e, i) => {
                const key = `${e.a}|${e.b}`;
                const a = (reduced ? settledByName : byName)[e.a];
                const b = (reduced ? settledByName : byName)[e.b];
                if (!a || !b) return null;
                const ca = a.c;
                const cb = b.c;
                const sw = Math.max(0.9, e.w / 12);
                const d = `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
                // flow speed encodes weight (heavier corridor flows faster)
                const flowDur = (3.2 - (e.w / maxEdge) * 1.8).toFixed(2);
                return (
                  <g
                    key={key}
                    className="np-edge"
                    data-a={ca}
                    data-b={cb}
                    style={
                      reduced
                        ? undefined
                        : {
                            opacity: 0,
                            animation: `np-edgein .6s ease ${0.9 + i * 0.06}s forwards`,
                          }
                    }
                  >
                    <path
                      ref={(el) => {
                        (edgeRefs.current[key] ??= { base: null, flow: null }).base = el;
                      }}
                      className="np-edge-base"
                      d={d}
                      fill="none"
                      stroke={RING_COLORS[0]}
                      strokeWidth={sw}
                      strokeLinecap="round"
                    />
                    {!reduced && (
                      <path
                        ref={(el) => {
                          (edgeRefs.current[key] ??= { base: null, flow: null }).flow = el;
                        }}
                        className="np-edge-flow"
                        d={d}
                        fill="none"
                        stroke={RING_COLORS[0]}
                        strokeWidth={Math.max(1.1, sw)}
                        strokeLinecap="round"
                        strokeDasharray="2 14"
                        style={{ animation: `np-flow ${flowDur}s linear infinite` }}
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* ---- hero particles (top-3 corridors only) ---- */}
            {!reduced && !compact && (
              <g aria-hidden="true">
                {edges.slice(0, 3).map((e) => {
                  const key = `${e.a}|${e.b}`;
                  return (
                    <circle
                      key={key}
                      ref={(el) => {
                        particleRefs.current[key] = el;
                      }}
                      r="2.4"
                      fill="#ffe2a6"
                      opacity="0"
                      style={{ animation: `np-edgein .5s ease 1.6s forwards` }}
                    />
                  );
                })}
              </g>
            )}

            {/* ---- station nodes ---- */}
            <g className="np-nodes">
              {settledNodes.nodes.map((n) => {
                const isLabeled = leaderSet.has(n.name);
                const showLabel = isLabeled && !(compact && !n.isLeader);
                const delay = reduced ? 0 : n.c * 0.09 + (isLabeled ? 0 : 0.025);
                return (
                  <g
                    key={n.name}
                    ref={(el) => {
                      nodeRefs.current[n.name] = el;
                    }}
                    className="np-node"
                    data-ring={n.c}
                    transform={initialPos(n.name)}
                    tabIndex={n.isLeader || n.isBridge ? 0 : -1}
                    role={n.isLeader || n.isBridge ? "button" : undefined}
                    aria-label={
                      n.isLeader || n.isBridge
                        ? `${n.name}, ${ringName(n.c)}${n.isBridge ? ", bridge station" : ""}`
                        : undefined
                    }
                    onMouseEnter={() => onEnter(n)}
                    onMouseLeave={onLeave}
                    onFocus={() => onEnter(n)}
                    onBlur={onLeave}
                    style={{ cursor: "default" }}
                  >
                    {/* node-local stagger reveal */}
                    <g
                      style={
                        reduced
                          ? undefined
                          : {
                              opacity: 0,
                              transformBox: "fill-box",
                              transformOrigin: "center",
                              animation: `np-pop .6s cubic-bezier(.2,.7,.2,1) ${delay}s forwards`,
                            }
                      }
                    >
                      {/* bridge: struct-blue rotating dashed halo + glow (≤3 hero filters) */}
                      {n.isBridge && (
                        <g filter="url(#np-neon)">
                          <circle
                            className="np-bridge-halo"
                            cx={0}
                            cy={0}
                            r={n.r + 8}
                            fill="none"
                            stroke={BRIDGE}
                            strokeWidth="1.3"
                            strokeDasharray="4 4"
                            opacity="0.9"
                            style={
                              reduced
                                ? undefined
                                : { animation: "np-rotate 6s linear infinite", transformOrigin: "center" }
                            }
                          />
                          <circle
                            cx={0}
                            cy={0}
                            r={n.r + 4}
                            fill="none"
                            stroke={BRIDGE}
                            strokeWidth="0.8"
                            opacity="0.45"
                            style={reduced ? undefined : { animation: "np-breathe 2.8s ease-in-out infinite" }}
                          />
                        </g>
                      )}

                      {/* bloom halo (radial gradient, no filter cost) */}
                      <circle cx={0} cy={0} r={n.r * 1.75} fill={`url(#np-bloom-${n.c})`} className="np-halo" />
                      {/* lit-sphere core */}
                      <circle
                        cx={0}
                        cy={0}
                        r={n.r}
                        fill={`url(#np-core-${n.c})`}
                        stroke="#0b0d12"
                        strokeWidth="1"
                        className="np-core"
                      />

                      {/* BRIDGE pill */}
                      {n.isBridge && (
                        <g transform={`translate(${n.r + 9}, ${-n.r - 8})`} className="np-bridge-pill">
                          <rect
                            x="0"
                            y="-9"
                            width="48"
                            height="14"
                            rx="3"
                            fill="#0e1622"
                            stroke={BRIDGE}
                            strokeOpacity="0.5"
                          />
                          <text x="6" y="1" fontSize="8.5" letterSpacing="1" className="fill-[#8fb2f5]">
                            BRIDGE
                          </text>
                        </g>
                      )}

                      {/* leader label */}
                      {showLabel && (
                        <text
                          x={0}
                          y={n.r + 12}
                          textAnchor="middle"
                          fontSize="10.5"
                          className="np-label fill-[#9aa6bd]"
                          style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
                        >
                          {n.name}
                        </text>
                      )}
                      {/* hover readout for un-labelled nodes */}
                      {hoverName === n.name && !showLabel && (
                        <text
                          x={0}
                          y={-n.r - 6}
                          textAnchor="middle"
                          fontSize="10.5"
                          className="fill-[#e7eaf0]"
                          style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
                        >
                          {n.name}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* ring readout chip on hover */}
          {hover !== null && (
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-line bg-panel/90 px-3 py-1.5 text-[11.5px] backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: RING_COLORS[hover] }} />
              <span className="text-ink">{ringName(hover)}</span>
              {hoverName && <span className="text-low">· {hoverName}</span>}
            </div>
          )}
        </div>

        {/* caption — computed live from real values, never hard-typed */}
        <p className="mt-3 text-[12.5px] leading-snug text-mid">
          <b className="text-ink">{net.n_communities} rings auto-discovered</b> · same-ring stations sit{" "}
          <span className="text-ink tnum">{net.geo_real_km} km</span> apart vs{" "}
          <span className="tnum">{net.geo_random_km} km</span> by chance —{" "}
          <span className="text-brass tnum">{net.geo_tighter_x}× geographically tighter</span>, with zero geographic input.
        </p>

        {/* legend — colour → ring (hover mirrors the constellation spotlight) */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3 text-[11.5px]">
          {RING_COLORS.map((c, i) => (
            <button
              key={i}
              type="button"
              className="flex items-center gap-1.5 text-mid transition-colors hover:text-ink"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              {ringName(i)}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1.5 text-low">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-struct" />
            Bridge (high betweenness)
          </span>
        </div>

        {/* hidden data table for screen readers / aria-describedby */}
        <table id="np-data-table" className="sr-only">
          <caption>Enforcement-ring membership and chronic-offender count per station</caption>
          <thead>
            <tr>
              <th>Station</th>
              <th>Ring</th>
              <th>Chronic offenders</th>
            </tr>
          </thead>
          <tbody>
            {net.stations.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{ringName(s.community)}</td>
                <td>{s.chronic_offenders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* ========================= THREE-UP GRID ========================= */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* (a) Bridge stations ------------------------------------------------ */}
        <Panel className="flex flex-col">
          <div className="border-b border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">Bridge stations</h3>
              <Badge tone="struct">Betweenness</Badge>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-mid">
              The few stations that tie the rings together. Make these your{" "}
              <span className="text-ink">cross-jurisdiction coordination hubs.</span>
            </p>
          </div>
          <ol className="flex flex-col">
            {net.bridges.map((b, i) => {
              const w = Math.max(4, (b.score / maxBridge) * 100);
              return (
                <li
                  key={b.name}
                  className="flex items-center gap-3 px-4 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line/60"
                >
                  <span className="w-4 shrink-0 text-right font-mono text-[12px] text-low">{i + 1}</span>
                  <span className="w-28 shrink-0 truncate text-[13px] text-ink" title={b.name}>
                    {b.name}
                  </span>
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-struct"
                      style={{ width: `${w}%` }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right font-mono text-[12px] tnum text-struct">
                    {b.score.toFixed(3)}
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>

        {/* (b) Strongest co-offender corridors ------------------------------- */}
        <Panel className="flex flex-col">
          <div className="border-b border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">Strongest corridors</h3>
              <Badge tone="brand">Shared offenders</Badge>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-mid">
              Station pairs that share the most <span className="text-ink">repeat offenders</span> — the
              spine of the network.
            </p>
          </div>
          <ol className="flex flex-col">
            {net.top_edges.map((e) => {
              const w = Math.max(4, (e.w / maxEdgeList) * 100);
              return (
                <li
                  key={`${e.a}-${e.b}`}
                  className="px-4 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] text-ink" title={`${e.a} ⇄ ${e.b}`}>
                      <span className="text-ink">{e.a}</span>
                      <span className="px-1 text-low">⇄</span>
                      <span className="text-ink">{e.b}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[13px] font-semibold tnum text-brass">
                      {fmt(e.w)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-brass/80"
                        style={{ width: `${w}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-[10.5px] text-low">shared repeat offenders</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>

        {/* (c) Super-hub vehicles -------------------------------------------- */}
        <Panel className="flex flex-col">
          <div className="border-b border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">Super-hub vehicles</h3>
              <Badge tone="red">Roving repeaters</Badge>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-mid">
              One vehicle re-offended across{" "}
              <b className="text-ink tnum">{net.max_stations_one_vehicle} distinct stations</b> — these
              drivers move <span className="text-ink">between</span> jurisdictions.
            </p>
          </div>
          <ol className="flex flex-col">
            {net.super_hubs.map((h) => (
              <li
                key={h.vehicle}
                className="flex items-center justify-between gap-3 px-4 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line/60"
              >
                <span className="font-mono text-[12.5px] tracking-tight text-ink">{h.vehicle}</span>
                <span className="shrink-0 text-right text-[11.5px] text-mid">
                  <span className="font-mono tnum text-struct">{h.stations}</span> stations ·{" "}
                  <span className="font-mono tnum text-brass">{h.violations}</span> tickets
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-auto border-t border-line bg-panel2/50 px-4 py-3">
            <p className="text-[12.5px] leading-snug text-mid">
              <b className="text-ink tnum">{fmt(net.cross_community_spanners)}</b> chronic vehicles bridge{" "}
              <span className="text-ink">2+ rings</span> — they are why a station-by-station response keeps
              missing them.
            </p>
          </div>
        </Panel>
      </div>

      {/* ========================= METHOD / FOOTER ========================= */}
      <div className="rounded-xl border border-line bg-panel2/40 p-4">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-low">Method</div>
        <p className="text-[12.5px] leading-relaxed text-mid">
          Bipartite vehicle→station projection from a single city-wide export; edge weight = shared repeat
          offenders (≥5 violations); communities via greedy modularity (modularity{" "}
          <span className="tnum">{net.modularity}</span>); betweenness centrality for bridges. The partition is{" "}
          <span className="text-mid">statistically significant</span> — modularity{" "}
          <span className="tnum">{net.modularity}</span> vs a degree-preserving null mean of{" "}
          <span className="tnum">{net.modularity_null_mean}</span> (<span className="tnum">z = {net.modularity_zscore}</span>,
          p {net.modularity_p < 0.01 ? "< 0.01" : `= ${net.modularity_p}`}), so the rings are real, not noise. No documented
          prior art applies offender-mobility community detection to parking enforcement. 100% computed from
          the provided BTP file; geography used only to validate coherence, never as a model input.
        </p>
      </div>

      {/* ---- scoped keyframes + hover-spotlight CSS (no new global deps) ---- */}
      <style>{`
        .np-blob { opacity: 0; }
        .np-stage[data-hover=""] .np-territory .np-blob,
        .np-stage:not([data-hover=""]) .np-territory .np-blob { opacity: 0.07; }
        ${
          ""
          /* territory fade-in after settle */
        }
        .np-territory .np-blob { animation: np-blobin 1s ease 1.6s forwards; }

        /* edges/flow base opacity */
        .np-edge-base { opacity: 0.24; }
        .np-edge-flow { opacity: 0.7; }

        /* hover ring-spotlight: dim everything not in / not touching the hovered ring */
        .np-stage:not([data-hover=""]) .np-node { transition: opacity .25s ease; }
        .np-stage:not([data-hover=""]) .np-edge { transition: opacity .25s ease; }
        ${RING_COLORS.map(
          (_, r) => `
        .np-stage[data-hover="${r}"] .np-node:not([data-ring="${r}"]) { opacity: 0.16; }
        .np-stage[data-hover="${r}"] .np-edge:not([data-a="${r}"]):not([data-b="${r}"]) { opacity: 0.08; }
        .np-stage[data-hover="${r}"] .np-edge[data-a="${r}"] .np-edge-flow,
        .np-stage[data-hover="${r}"] .np-edge[data-b="${r}"] .np-edge-flow { opacity: 1; }
        .np-stage[data-hover="${r}"] .np-territory .np-blob[data-ring="${r}"] { opacity: 0.13; }`
        ).join("\n")}

        @keyframes np-pop {
          from { opacity: 0; transform: scale(0.4); }
          60%  { opacity: 1; transform: scale(1.12); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes np-edgein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes np-blobin { from { opacity: 0; } to { opacity: 0.07; } }
        @keyframes np-flow { to { stroke-dashoffset: -16; } }
        @keyframes np-twinkle {
          0%, 100% { opacity: 0.05; }
          50%      { opacity: 0.16; }
        }
        @keyframes np-rotate { to { transform: rotate(360deg); } }
        @keyframes np-breathe {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .np-territory .np-blob { opacity: 0.07 !important; animation: none !important; }
          .np-blob { opacity: 0.07 !important; }
        }
      `}</style>
    </div>
  );
}
