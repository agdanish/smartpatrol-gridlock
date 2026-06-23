import { useEffect, useRef, useState } from "react";

/* Act 3 climax, reuses the dashboard watchlist edge-draw choreography verbatim.
 * Real offender FKN00GL16746: Hulimavu 17, HSR Layout 2, Electronic City 2,
 * Madiwala 1 (17+2+2+1 = 22). Hub springs in LAST, alone carrying the glow. */
const SS = 560;
type ClimaxNode = { id: string; x: number; y: number; hub?: boolean; label?: string; c?: number; below?: boolean };
const NODES: ClimaxNode[] = [
  { id: "veh", x: 0.5, y: 0.5, hub: true },
  { id: "st0", x: 0.86, y: 0.5, label: "Hulimavu", c: 17, below: true },
  { id: "st1", x: 0.5, y: 0.13, label: "HSR Layout", c: 2, below: false },
  { id: "st2", x: 0.14, y: 0.5, label: "Electronic City", c: 2, below: true },
  { id: "st3", x: 0.5, y: 0.87, label: "Madiwala", c: 1, below: true },
];
const EDGES = [
  { to: "st0", c: 17 }, { to: "st1", c: 2 }, { to: "st2", c: 2 }, { to: "st3", c: 1 },
] as const;
const TOTAL = 22, MAXC = 17, DRAW = 0.66;
const veh = NODES.find((n) => n.hub)!;

export default function Climax({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [drawn, setDrawn] = useState<Record<string, boolean>>({});
  const [landed, setLanded] = useState<Record<string, boolean>>({});
  const [hubLanded, setHubLanded] = useState(false);
  const [hubCount, setHubCount] = useState(0);
  const timers = useRef<number[]>([]);
  const played = useRef(false);

  useEffect(() => {
    const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    if (active) {
      if (played.current) return;
      played.current = true;
      if (reduced) {
        const all: Record<string, boolean> = {};
        EDGES.forEach((e) => (all[e.to] = true));
        setDrawn(all); setLanded(all); setHubLanded(true); setHubCount(TOTAL);
        return;
      }
      EDGES.forEach((e, i) => {
        const delay = Math.min(i * 0.06, 0.4);
        timers.current.push(window.setTimeout(() => setDrawn((s) => ({ ...s, [e.to]: true })), delay * 1000));
        timers.current.push(window.setTimeout(() => setLanded((s) => ({ ...s, [e.to]: true })), (delay + DRAW) * 1000));
      });
      const last = (0.4 + DRAW) * 1000 + 140;
      timers.current.push(window.setTimeout(() => {
        setHubLanded(true);
        let i = 0; const steps = 28;
        const up = () => { i++; const p = Math.min(1, i / steps); const e = 1 - Math.pow(2, -10 * p); setHubCount(Math.round(TOTAL * e)); if (p < 1) timers.current.push(window.setTimeout(up, 32)); };
        up();
      }, last));
    } else {
      clear();
      played.current = false;
      setDrawn({}); setLanded({}); setHubLanded(false); setHubCount(0);
    }
    return clear;
  }, [active, reduced]);

  const topEdges = [...EDGES].sort((a, b) => b.c - a.c).slice(0, 3).map((e) => e.to);

  return (
    <svg viewBox={`0 0 ${SS} ${SS}`} role="img" aria-label={`One vehicle, ${TOTAL} violations across ${EDGES.length} police stations — invisible to all of them.`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      {EDGES.map((e) => {
        const n = NODES.find((x) => x.id === e.to)!;
        const x1 = veh.x * SS, y1 = veh.y * SS, x2 = n.x * SS, y2 = n.y * SS;
        const len = Math.hypot(x2 - x1, y2 - y1);
        const w = 1.4 + (e.c / TOTAL) * 8;
        const on = drawn[e.to];
        return (
          <line key={e.to} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f0a92e" strokeWidth={w} strokeLinecap="round" opacity={0.55}
            style={{ strokeDasharray: len, strokeDashoffset: on ? 0 : len, transition: reduced ? "none" : `stroke-dashoffset ${DRAW}s cubic-bezier(.2,.7,.2,1)` }} />
        );
      })}
      {EDGES.filter((e) => topEdges.includes(e.to)).map((e) => {
        const n = NODES.find((x) => x.id === e.to)!;
        const mx = ((veh.x + n.x) / 2) * SS, my = ((veh.y + n.y) / 2) * SS;
        return (
          <g key={"l" + e.to} style={{ opacity: landed[e.to] ? 1 : 0, transition: "opacity .3s" }}>
            <rect x={mx - 12} y={my - 9} width={24} height={16} rx={5} fill="#1b1e24" stroke="rgba(240,169,46,0.35)" />
            <text x={mx} y={my + 3} textAnchor="middle" fontFamily='"Geist Mono", monospace' fontSize={12} fill="#f0a92e">{e.c}</text>
          </g>
        );
      })}
      {NODES.filter((n) => !n.hub).map((n) => {
        const r = 14 + Math.sqrt((n.c ?? 0) / MAXC) * 10;
        const on = landed[n.id];
        return (
          <g key={n.id} style={{ transform: on && !reduced ? "scale(1.06)" : "scale(1)", transformBox: "fill-box", transformOrigin: "center", transition: "transform .3s cubic-bezier(.2,.7,.2,1)" }}>
            <circle cx={n.x * SS} cy={n.y * SS} r={r} fill={on ? "rgba(240,169,46,0.16)" : "#1b1e24"} stroke={on ? "#f0a92e" : "rgba(154,166,189,0.32)"} strokeWidth={1.5} style={{ transition: "fill .35s, stroke .35s" }} />
            <text x={n.x * SS} y={n.y * SS + 5} textAnchor="middle" fontFamily='"Geist Mono", monospace' fontSize={15} fontWeight={600} fill={on ? "#f7c25a" : "#ECEEF2"} style={{ transition: "fill .35s" }}>{n.c}</text>
            <text x={n.x * SS} y={n.y * SS + (n.below ? r + 20 : -r - 10)} textAnchor="middle" fontFamily='"Geist", sans-serif' fontSize={13} fontWeight={600} fill="#9aa6bd">{n.label}</text>
          </g>
        );
      })}
      <g style={{ transform: hubLanded || reduced ? "scale(1)" : "scale(0.4)", opacity: active ? 1 : 0.3, transformBox: "fill-box", transformOrigin: "center", transition: reduced ? "none" : "transform .5s cubic-bezier(.2,.9,.2,1), opacity .4s" }}>
        {(hubLanded || reduced) && <circle cx={veh.x * SS} cy={veh.y * SS} r={44} fill="none" stroke="#f0a92e" strokeWidth={1} opacity={0.35} />}
        <circle cx={veh.x * SS} cy={veh.y * SS} r={40} fill="#f0a92e" stroke="#f7c25a" strokeWidth={2} style={{ filter: "drop-shadow(0 0 16px rgba(240,169,46,0.6))" }} />
        <text x={veh.x * SS} y={veh.y * SS - 2} textAnchor="middle" fontFamily='"Geist Mono", monospace' fontSize={20} fontWeight={600} fill="#1a1204">{reduced ? TOTAL : hubCount}</text>
        <text x={veh.x * SS} y={veh.y * SS + 13} textAnchor="middle" fontSize={8} fontWeight={600} fill="#3a2a08">violations</text>
      </g>
    </svg>
  );
}
