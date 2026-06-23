import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "./useData";
import Header from "./components/Header";
import StatusStrip from "./components/StatusStrip";
import StatBand from "./components/StatBand";
import TabNav, { TabId } from "./components/TabNav";
import MapPanel from "./components/MapPanel";
import RosterPanel from "./components/RosterPanel";
import WatchlistPanel from "./components/WatchlistPanel";
import WatchlistExtras from "./components/WatchlistExtras";
import NetworkPanel from "./components/NetworkPanel";
import VolumeHarmPanel from "./components/VolumeHarmPanel";
import HarmMethodCard from "./components/HarmMethodCard";
import CoveragePanel from "./components/CoveragePanel";
import BlindSpotRadar from "./components/BlindSpotRadar";
import ReignitionForecast from "./components/ReignitionForecast";
import RolloutPanel from "./components/RolloutPanel";
import ImpactBand from "./components/ImpactBand";
import EvidencePanel from "./components/EvidencePanel";
import MethodIPCard from "./components/MethodIPCard";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import { prefersReduced } from "./lib/format";
import type { RosterSolution } from "./types";

/* URL is state (UX §1.7): the deployed link is a product. Deep-linkable tab +
 * station + K, with refresh-persistence and a working Back button. */
const TAB_IDS: TabId[] = ["map", "watch", "network", "harm", "coverage", "rollout", "evidence"];
// One-line "what am I looking at" per tab — first-time-viewer orientation.
const TAB_PURPOSE: Record<TabId, string> = {
  map: "Tonight's hotspots → tomorrow's 8 AM patrol plan, on a live map.",
  watch: "Repeat offenders no single police station can see on its own.",
  network: "Enforcement zones discovered from how offenders move — not from a map.",
  harm: "Rank corners by the harm they cause, not just the ticket count.",
  coverage: "Where and when to deploy — plus an honest map of where enforcement is blind.",
  rollout: "How it ships, what it costs, who runs it, and the measured impact.",
  evidence: "Every number auditable, plus the privacy, ethics, and IP posture.",
};
const clampK = (v: string | null) => Math.max(3, Math.min(12, parseInt(v || "6", 10) || 6));
function readHash() {
  const raw = typeof location !== "undefined" ? location.hash.replace(/^#/, "") : "";
  const [tab, qs] = raw.split("?");
  const p = new URLSearchParams(qs || "");
  return { tab: (TAB_IDS as string[]).includes(tab) ? (tab as TabId) : null, st: p.get("st"), k: p.get("k") };
}
function buildHash(tab: TabId, station: string, units: number) {
  const qs = new URLSearchParams();
  if (station !== "Upparpet") qs.set("st", station);
  if (units !== 6) qs.set("k", String(units));
  const s = qs.toString();
  return `#${tab}${s ? "?" + s : ""}`;
}

export default function App() {
  const data = useData(); // single source of truth, loaded once

  const init = readHash();
  const [active, setActive] = useState<TabId>(init.tab ?? "map");
  const [station, setStation] = useState(init.st || "Upparpet");
  const [units, setUnits] = useState(() => (init.k ? clampK(init.k) : 6));
  const [generating, setGenerating] = useState(false);
  const [solution, setSolution] = useState<RosterSolution | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null); // map ↔ roster cross-highlight

  const resolveSolution = useCallback(
    (st: string, k: number): RosterSolution => {
      const src = st === "Citywide" ? data.roster.citywide : data.roster.stations[st] || data.roster.citywide;
      return src[String(k)] || src["6"];
    },
    [data.roster]
  );

  useEffect(() => {
    setSolution(resolveSolution(station, units));
  }, [station, units, resolveSolution]);

  // pushState on tab change (Back works across tabs); replaceState on sub-state.
  const activeRef = useRef(active);
  activeRef.current = active;
  const navigate = useCallback(
    (tab: TabId) => {
      setActive(tab);
      if (typeof history !== "undefined") history.pushState(null, "", buildHash(tab, station, units));
    },
    [station, units]
  );
  useEffect(() => {
    const h = buildHash(activeRef.current, station, units);
    if (typeof history !== "undefined" && location.hash !== h) history.replaceState(null, "", h);
  }, [station, units]);
  useEffect(() => {
    const sync = () => {
      const h = readHash();
      if (h.tab) setActive(h.tab);
      if (h.st) setStation(h.st);
      if (h.k) setUnits(clampK(h.k));
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const onGenerate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setSolution(resolveSolution(station, units));
      setGenerating(false);
    }, 700);
  };

  const rosterCorners = solution ? solution.corners : [];

  // Tab-switch transition: enter opacity + y:8, exit y:-6 (collapses under reduced motion).
  const enter = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2, ease: [0.2, 0.7, 0.2, 1] as const } };

  return (
    <div className="grain min-h-screen">
      <Header v={data.verification} />
      <StatusStrip v={data.verification} />
      <StatBand v={data.verification} />
      <TabNav active={active} setActive={navigate} />
      <main className="mx-auto max-w-[1480px] px-5 py-6 md:px-8">
        <p key={active} className="orient mb-4 flex items-center gap-2 text-[13.5px] leading-relaxed text-mid">
          <span className="inline-block h-3 w-[3px] rounded-full bg-struct" aria-hidden="true" />
          {TAB_PURPOSE[active]}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            {...enter}
            role="tabpanel"
            id={`panel-${active}`}
            aria-labelledby={`tab-${active}`}
            tabIndex={0}
            className="focus:outline-none"
          >
            <ErrorBoundary resetKey={active}>
            {active === "map" && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
                <MapPanel
                  hotspots={data.hotspots}
                  stationOrder={data.stations.order_by_volume}
                  station={station}
                  setStation={setStation}
                  units={units}
                  setUnits={setUnits}
                  onGenerate={onGenerate}
                  generating={generating}
                  rosterCorners={rosterCorners}
                  hoverKey={hoverKey}
                  setHoverKey={setHoverKey}
                  v={data.verification}
                />
                <RosterPanel station={station} solution={solution} generating={generating} hoverKey={hoverKey} setHoverKey={setHoverKey} />
              </div>
            )}
            {active === "watch" && (
              <div className="flex flex-col gap-4">
                <WatchlistPanel watchlist={data.watchlist} />
                <WatchlistExtras />
              </div>
            )}
            {active === "network" && <NetworkPanel />}
            {active === "harm" && (
              <div className="flex flex-col gap-4">
                <VolumeHarmPanel harm={data.harmReorder} v={data.verification} />
                <HarmMethodCard />
              </div>
            )}
            {active === "coverage" && (
              <div className="flex flex-col gap-6">
                <ReignitionForecast />
                <BlindSpotRadar />
                <CoveragePanel ct={data.coverageTiming} />
              </div>
            )}
            {active === "rollout" && (
              <div className="flex flex-col gap-6">
                <ImpactBand />
                <RolloutPanel />
              </div>
            )}
            {active === "evidence" && (
              <div className="flex flex-col gap-4">
                <EvidencePanel v={data.verification} />
                <MethodIPCard />
              </div>
            )}
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer v={data.verification} roster={data.roster} />
    </div>
  );
}
