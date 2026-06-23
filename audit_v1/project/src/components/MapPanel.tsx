import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "./ui";
import { fmt, project, prefersReduced } from "../lib/format";
import { loadMappls, MAPPLS_KEY } from "../lib/mappls";
import type { Hotspots, Corner, Verification } from "../types";

const canHover =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* H10: ONE classifier drives marker colour AND tooltip tag, so a cell is never
 * labelled two ways. Selection is the ACTUAL roster (by label), not a volume-rank
 * heuristic; harm is a separate channel; everything else is a volume hotspot. */
type Kind = "roster" | "harm" | "volume";
const KIND = {
  roster: { color: "#f0a92e", tag: "■ Selected for max coverage", cls: "text-brass" },
  harm: { color: "#ef4444", tag: "▲ High congestion harm", cls: "text-red" },
  volume: { color: "#9aa6bd", tag: "● Volume hotspot", cls: "text-steel" },
} as const;

export default function MapPanel({
  hotspots,
  stationOrder,
  station,
  setStation,
  units,
  setUnits,
  onGenerate,
  generating,
  rosterCorners,
  hoverKey,
  setHoverKey,
  v,
}: {
  hotspots: Hotspots;
  stationOrder: string[];
  station: string;
  setStation: (s: string) => void;
  units: number;
  setUnits: (n: number) => void;
  onGenerate: () => void;
  generating: boolean;
  rosterCorners: Corner[];
  hoverKey: string | null;
  setHoverKey: (k: string | null) => void;
  v: Verification;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Hotspots["features"][number]["properties"] | null>(null);
  // Mappls lifecycle: "error" includes the no-key case → schematic shows.
  const [liveState, setLiveState] = useState<"loading" | "ready" | "error">(MAPPLS_KEY ? "loading" : "error");
  const feats = hotspots.features;
  const maxHarm = Math.max(...feats.map((f) => f.properties.harm_sum));
  const onRosterLabels = useMemo(() => new Set(rosterCorners.map((c) => c.label)), [rosterCorners]);
  const rosterLabelsRef = useRef(onRosterLabels);
  rosterLabelsRef.current = onRosterLabels;
  const kindOf = (p: { label: string; promoted_by_harm: boolean }): Kind =>
    onRosterLabels.has(p.label) ? "roster" : p.promoted_by_harm ? "harm" : "volume";
  const stationList = ["Citywide", ...stationOrder];
  const showSchematic = liveState === "error";
  const hover = (key: string | null) => {
    if (canHover) setHoverKey(key);
  };

  // Patrol route (#2): route over REAL corner coords (roster labels ↔ hotspot coords),
  // never the synthetic per-station ramp. Uses the Map SDK key only (no secret).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapObj = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polyRef = useRef<any>(null);
  const rosterRef = useRef(rosterCorners);
  rosterRef.current = rosterCorners;
  const hotspotByLabel = useMemo(() => {
    const m = new Map<string, [number, number]>();
    feats.forEach((f) => m.set(f.properties.label, f.geometry.coordinates as [number, number]));
    return m;
  }, [feats]);
  // Route stats are data-derived (independent of the live map) so the chip shows on the
  // schematic fallback too. Straight-line "beat order" distance through the real corner coords.
  const routeStats = useMemo(() => {
    const pts = rosterCorners.map((c) => hotspotByLabel.get(c.label)).filter(Boolean) as [number, number][];
    if (pts.length < 2) return null;
    let km = 0;
    const toR = Math.PI / 180;
    for (let i = 1; i < pts.length; i++) {
      const [lon1, lat1] = pts[i - 1];
      const [lon2, lat2] = pts[i];
      const dLat = (lat2 - lat1) * toR;
      const dLon = (lon2 - lon1) * toR;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
      km += 2 * 6371 * Math.asin(Math.sqrt(a));
    }
    return { km, stops: pts.length };
  }, [rosterCorners, hotspotByLabel]);
  const drawRoute = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapObj.current as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappls = (window as any).mappls;
    if (!map || !mappls?.Polyline) return;
    const pts = rosterRef.current.map((c) => hotspotByLabel.get(c.label)).filter(Boolean) as [number, number][];
    if (polyRef.current) {
      try {
        if (polyRef.current.remove) polyRef.current.remove();
        else mappls.removeLayer?.({ map, layer: polyRef.current });
      } catch {
        /* noop */
      }
      polyRef.current = null;
    }
    if (pts.length < 2) return;
    // GL polyline = the patrol beat order over REAL corner coords (road geometry needs the
    // server-side OAuth Directions API; the SDK key alone can't fetch it from a browser).
    const path = pts.map((p) => ({ lat: p[1], lng: p[0] }));
    try {
      polyRef.current = new mappls.Polyline({ map, path, strokeColor: "#f0a92e", strokeWeight: 4, strokeOpacity: 0.9, fitbounds: false });
    } catch {
      /* polyline draw failed; the data-derived chip still reports the beat order */
    }
  }, [hotspotByLabel]);

  // Redraw the route when the roster changes (and once the live map is ready).
  useEffect(() => {
    if (liveState === "ready") drawRoute();
  }, [rosterCorners, liveState, drawRoute]);

  // Mount the live Mappls basemap once (uses the SDK key only — no secret).
  useEffect(() => {
    if (!MAPPLS_KEY || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;
    let added = false;
    let cancelled = false;
    loadMappls()
      .then((mappls) => {
        if (cancelled || !mapRef.current) return;
        map = new mappls.Map(mapRef.current, { center: [12.97, 77.59], zoom: 11, zoomControl: true, location: false });
        mapObj.current = map;
        // DARK BASEMAP — the v3 way: discover the key's real style names via
        // mappls.getStyles(), apply a night/dark one via the GLOBAL mappls.setStyle(name)
        // (never a guessed name → can't black-void). If the key has no dark style,
        // fall back to a scoped cosmetic dim on the GL canvas (markers are DOM, stay colored).
        const applyDark = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ns = mappls as any;
          try {
            const styles: { name?: string; displayName?: string }[] = (typeof ns.getStyles === "function" ? ns.getStyles() : []) || [];
            try { console.log("[mappls styles]", styles.map((s) => s.name || s.displayName)); } catch { /* */ }
            const dark =
              styles.find((s) => /night|dark/i.test(`${s.name ?? ""} ${s.displayName ?? ""}`)) ||
              styles.find((s) => /grey|gray/i.test(`${s.name ?? ""} ${s.displayName ?? ""}`));
            if (dark?.name && typeof ns.setStyle === "function") {
              const reattach = () => { try { drawRoute(); } catch { /* */ } try { map.off?.("styledata", reattach); } catch { /* */ } };
              map.on?.("styledata", reattach);
              ns.setStyle(dark.name); // global namespace, real provisioned .name only
              return;
            }
          } catch { /* fall through to cosmetic dim */ }
          try {
            // invert + hue-rotate(180) = genuine dark cartography from a light tile set;
            // hue-rotate compensates invert's hue flip so the amber GL route stays amber-ish.
            // DOM markers sit above the canvas, so they keep true brass/red/steel.
            const c = mapRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
            if (c) c.style.filter = "invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)";
          } catch { /* keep the light basemap */ }
        };
        const addMarkers = () => {
          if (added || cancelled) return;
          added = true;
          for (const f of feats) {
            const p = f.properties;
            const k: Kind = rosterLabelsRef.current.has(p.label) ? "roster" : p.promoted_by_harm ? "harm" : "volume";
            const d = Math.round(12 + Math.sqrt(p.harm_sum / maxHarm) * 18);
            const icon =
              "data:image/svg+xml;utf8," +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='${d}' height='${d}'><circle cx='${d / 2}' cy='${d / 2}' r='${d / 2 - 1}' fill='${KIND[k].color}' fill-opacity='0.85' stroke='white' stroke-width='1'/></svg>`
              );
            try {
              new mappls.Marker({
                map,
                position: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
                icon_url: icon,
                width: d,
                height: d,
                popupHtml: `<b>${p.label}</b><br/>${fmt(p.n)} tickets · ${KIND[k].tag}`,
              });
            } catch {
              /* skip a single bad marker, keep the map */
            }
          }
          drawRoute();
        };
        const onLoad = () => { applyDark(); addMarkers(); setLiveState("ready"); };
        if (map.on) map.on("load", onLoad);
        else if (map.addListener) map.addListener("load", onLoad);
        setTimeout(onLoad, 1800); // safety if the load event name differs
      })
      .catch(() => setLiveState("error"));
    // Degraded-failure guard: if the SDK never resolves (locked-down venue wifi), drop to the
    // schematic instead of hanging on the spinner.
    const failTimer = window.setTimeout(() => {
      if (!cancelled && !mapObj.current) setLiveState("error");
    }, 6000);
    return () => {
      cancelled = true;
      clearTimeout(failTimer);
      try {
        polyRef.current?.remove?.();
      } catch {
        /* noop */
      }
      try {
        map?.remove?.();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-low">Jurisdiction</span>
            <div className="relative">
              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="appearance-none rounded-lg border border-line bg-panel2 py-2 pl-3 pr-9 text-[13.5px] font-medium text-ink hover:border-line2 focus:border-struct"
              >
                {stationList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mid" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </label>
          <label className="flex w-52 flex-col gap-1.5">
            <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-low">
              <span className="whitespace-nowrap">Patrol units</span>
              <span className="font-mono text-struct">{units}</span>
            </span>
            <input
              type="range"
              min={3}
              max={12}
              value={units}
              onChange={(e) => setUnits(+e.target.value)}
              aria-label="Number of patrol units"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-panel3"
              style={{
                accentColor: "#4d7be8",
                background: `linear-gradient(90deg,#4d7be8 ${((units - 3) / 9) * 100}%, #23262d ${((units - 3) / 9) * 100}%)`,
              }}
            />
          </label>
        </div>
        <button
          onClick={onGenerate}
          className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-brass px-4 py-2.5 text-[13.5px] font-semibold text-[#1a1204] transition-transform hover:bg-brassHi active:scale-[0.98]"
        >
          {generating && (
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent" style={{ animation: "shimmer 0.9s ease" }}></span>
          )}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
          Generate 8 AM roster
        </button>
      </div>

      <div className="relative">
        {/* The real Mappls vector map mounts into #basemap; schematic stays as the crash-proof fallback. */}
        <div
          ref={mapRef}
          id="basemap"
          role="img"
          aria-label={`Hotspot map of Bengaluru: ${feats.length} mapped corners; ${onRosterLabels.size} selected for the 8 AM roster. Marker area is proportional to congestion harm.`}
          className={`relative h-[420px] w-full overflow-hidden bg-base md:h-[520px] ${showSchematic ? "mapgrid" : ""}`}
        >
          {liveState === "loading" && (
            <div className="absolute inset-0 z-20 grid place-items-center text-[12px] text-mid">
              Loading Mappls basemap… <span className="text-low">(schematic view if unavailable)</span>
            </div>
          )}
          {liveState === "ready" && (
            <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-md border border-line bg-base/75 px-2 py-1 text-[10.5px] font-medium text-mid backdrop-blur">
              Live basemap · <span className="font-semibold text-brass">Powered by Mappls</span>
            </span>
          )}
          {routeStats && (
            <span className="pointer-events-none absolute left-3 top-10 z-20 rounded-md border border-brass/40 bg-base/80 px-2.5 py-1 text-[11px] font-semibold text-brass backdrop-blur" title="Beats joined in patrol order; distance is straight-line (direct)">
              ⟶ 8 AM patrol · {routeStats.stops} beats · {routeStats.km.toFixed(1)} km direct
            </span>
          )}

          {showSchematic && (
            <>
              {/* Schematic road-mesh (labelled), honest abstract, not a fake map. */}
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100" aria-hidden="true">
                <g stroke="rgba(255,255,255,0.06)" fill="none" strokeWidth="0.7" strokeLinecap="round">
                  <ellipse cx="50" cy="52" rx="38" ry="34" />
                  <path d="M50 52 L50 4" /><path d="M50 52 L96 38" /><path d="M50 52 L90 86" />
                  <path d="M50 52 L10 80" /><path d="M50 52 L6 40" /><path d="M50 52 L34 6" />
                  <path d="M14 30 Q 50 44 88 26" /><path d="M16 74 Q 50 60 86 78" />
                </g>
                <ellipse cx="50" cy="52" rx="14" ry="12" fill="none" stroke="rgba(77,123,232,0.14)" strokeWidth="0.5" strokeDasharray="1.6 2" />
              </svg>
              <span className="absolute left-3 top-3 rounded-md border border-line bg-base/75 px-2 py-1 text-[10.5px] font-medium text-mid backdrop-blur">
                Schematic basemap · <span className="font-semibold text-brass">Powered by Mappls</span>
              </span>

              {feats.map((f) => {
                const p = project(f.geometry.coordinates[0], f.geometry.coordinates[1]);
                const props = f.properties;
                const k = kindOf(props);
                const r = 6 + Math.sqrt(props.harm_sum / maxHarm) * 17; // AREA-encode harm
                const isTop = props.rank_volume === 1;
                const isHi = hoverKey === props.label;
                return (
                  <div
                    key={props.cell}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                    onMouseEnter={() => { setTip(props); hover(props.label); }}
                    onMouseLeave={() => { setTip(null); hover(null); }}
                  >
                    {isTop && (
                      <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass/60" style={{ animation: prefersReduced ? "none" : "pulsering 2.4s ease-out infinite" }}></span>
                    )}
                    <button
                      aria-label={`${props.label}: ${fmt(props.n)} tickets, harm ${fmt(props.harm_sum)}, volume rank ${props.rank_volume}. ${KIND[k].tag}`}
                      onFocus={() => { setTip(props); hover(props.label); }}
                      onBlur={() => { setTip(null); hover(null); }}
                      className="flex items-center justify-center rounded-full transition-transform hover:scale-110 focus:scale-110"
                      style={{
                        width: Math.max(24, r * 2), // >=24px hit target (WCAG 2.5.8) without changing the dot
                        height: Math.max(24, r * 2),
                        outline: isHi ? "2px solid #ECEEF2" : "none",
                        outlineOffset: 2,
                      }}
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: r * 2,
                          height: r * 2,
                          background: KIND[k].color,
                          boxShadow:
                            k === "roster"
                              ? "0 0 0 1.5px rgba(247,194,90,0.5), 0 0 16px 2px rgba(240,169,46,0.45)"
                              : k === "harm"
                                ? "0 0 10px rgba(239,68,68,0.4)"
                                : "none",
                          border: k === "roster" ? "1.5px solid #f7c25a" : "1px solid rgba(255,255,255,0.16)",
                        }}
                      />
                    </button>
                  </div>
                );
              })}

              {tip && (() => {
                const f = feats.find((x) => x.properties.cell === tip.cell)!;
                const p = project(f.geometry.coordinates[0], f.geometry.coordinates[1]);
                const k = kindOf(tip);
                return (
                  <div className="pointer-events-none absolute z-20 w-56 -translate-x-1/2 -translate-y-[calc(100%+16px)] rounded-xl border border-line2 bg-panel2 p-3 shadow-2xl" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
                    <div className="text-[13px] font-semibold text-ink">{tip.label}</div>
                    <div className={`mt-0.5 text-[10.5px] font-medium ${KIND[k].cls}`}>{KIND[k].tag}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                      <div><div className="text-low">Tickets</div><div className="tnum font-semibold text-ink">{fmt(tip.n)}</div></div>
                      <div><div className="text-low">Harm</div><div className="tnum font-semibold text-red">{fmt(tip.harm_sum)}</div></div>
                      <div><div className="text-low">Vol rank</div><div className="tnum font-semibold text-ink">#{tip.rank_volume}</div></div>
                      <div><div className="text-low">Harm rank</div><div className="tnum font-semibold text-ink">#{tip.rank_harm}</div></div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* HONEST legend: selection is solved on VOLUME for max coverage; harm is a separate channel. */}
        <div className="flex flex-col gap-2 border-t border-line p-3 text-[12px] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-mid">
            <span className="flex items-center gap-1.5"><span className="text-brass">■</span> Selected for max coverage</span>
            <span className="flex items-center gap-1.5"><span className="text-red">▲</span> High congestion harm</span>
            <span className="flex items-center gap-1.5"><span className="text-steel">●</span> Volume hotspot</span>
            <span className="text-low">· marker area ∝ harm</span>
          </div>
          <p className="text-[12.5px] font-medium text-ink">
            Half of all parking chaos lives in <span className="text-brass">{fmt(v.cells_for_50pct_volume)} corners</span>.
          </p>
        </div>
      </div>
    </Panel>
  );
}
