import {
  verification,
  stations,
  hotspots,
  roster,
  watchlist,
  harmReorder,
  coverageTiming,
  coverageByStationK,
} from "./data/appData";
import type { SmartPatrolData } from "./types";

/* Single source of truth handed to the app. Loads the real data module once
 * (src/data/appData.ts, generated from the BTP pipeline artifacts). Every
 * component consumes this hook unchanged. */
export function useData(): SmartPatrolData {
  return {
    verification,
    stations,
    hotspots,
    roster,
    watchlist,
    harmReorder,
    coverageTiming,
    coverageByStationK,
  };
}
