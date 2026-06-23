/* =============================================================================
 * SmartPatrol, TypeScript types ("API" contract)
 * One interface per data source. src/data/appData.ts is generated from the BTP
 * pipeline artifacts to these EXACT shapes; nothing else needs to change.
 * ===========================================================================*/

/* GET /data/verification_report.json -> Verification */
export interface Verification {
  rows_total: number;
  rows_dropped: number;
  date_window: string;
  pct_rows_with_roadclass_label: number;
  n_cells: number;
  cells_for_50pct_volume: number;
  top100_cells_pct: number;
  random100_cells_pct: number;
  patrol_efficiency_x: number;
  n_stations: number;
  stations_for_50pct: number;
  stations_for_80pct: number;
  offenders_ge10: number;
  offenders_ge5: number;
  max_violations_single_vehicle: number;
  top_vehicle_stations: number;
  chronic_across_ge2_stations: number;
  chronic_across_ge3_stations: number;
  systemic_across_ge2_stations: number;
  systemic_across_ge3_stations: number;
  systemic_across_ge4_stations: number;
  top142_temporal_stability_pct: number;
  cells_promoted_by_harm_top142: number;
  harm_vs_volume_spearman: number;
}

/* GET /data/stations.json -> Stations */
export interface Station {
  name: string;
  n: number;
  lat: number;
  lon: number;
}
export interface Stations {
  stations: Station[];
  order_by_volume: string[]; // 54 stations
}

/* GET /data/roster.json -> Roster (the 8 AM deployment plan) */
export interface Corner {
  rank: number;
  cell: string;
  label: string;
  n: number;
  harm_sum: number;
  lat: number;
  lon: number;
  koper_window_min: [number, number];
  route_order: number;
  shift: string;
}
export interface RosterSolution {
  corners: Corner[];
  coverage_pct_of_station: number;
  n_units: number;
}
export interface Roster {
  stations: Record<string, Record<string, RosterSolution>>; // inner key K = "3".."12"
  citywide: Record<string, RosterSolution>;
  milp_prior_art: string[];
  equity_note: string;
}

/* GET /data/watchlist.json -> Watchlist (cross-jurisdiction graph) */
export interface Offender {
  vehicle: string;
  violations: number;
  n_stations: number;
  stations: string[];
  approved_only_violations: number;
  chronic: boolean;
}
export interface GNode {
  id: string;
  label: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  type: "vehicle" | "station";
  local_count?: number;
}
export interface GEdge {
  from: string;
  to: string;
  count: number;
}
export interface WatchlistSummary {
  offenders_ge10: number;
  offenders_ge5: number;
  chronic_across_ge2: number;
  chronic_across_ge3: number;
  systemic_across_ge2: number;
  systemic_across_ge3: number;
  systemic_across_ge4: number;
}
export interface Watchlist {
  summary: WatchlistSummary;
  offenders: Offender[];
  graph: Record<string, { nodes: GNode[]; edges: GEdge[] }>;
}

/* GET /data/harm_reorder.json -> HarmReorder */
export interface PromotedCell {
  cell: string;
  label: string;
  rank_volume: number;
  rank_harm: number;
  lat: number;
  lon: number;
  n: number;
  harm_sum: number;
}
export interface HarmReorder {
  spearman: number;
  pct_labeled: number;
  n_promoted: number;
  promoted_cells: PromotedCell[];
  top142_by_volume: string[];
  top142_by_harm: string[];
}

/* GET /data/coverage_timing.json -> CoverageTiming */
export interface CoverageTiming {
  hour_profile: { hour: number; n: number }[];
  coverage_gap_hours: number[];
  koper_schedule: {
    corner_rank: number;
    dwell_min: [number, number];
    rotations_per_shift: number;
  }[];
  shift_windows: string[];
}

/* GET /data/hotspots.geojson -> Hotspots (GeoJSON FeatureCollection) */
export interface HotspotFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] }; // [lon, lat]
  properties: {
    cell: string;
    n: number;
    harm_sum: number;
    rank_volume: number;
    rank_harm: number;
    in_top142_volume: boolean;
    in_top142_harm: boolean;
    promoted_by_harm: boolean;
    label: string;
  };
}
export interface Hotspots {
  type: "FeatureCollection";
  features: HotspotFeature[];
}

/* GET /data/coverage_equity.json -> CoverageByStationK
 * ILLUSTRATIVE intra-station reach. station name -> K ("3".."12") -> % of THAT
 * station's OWN violation volume covered by K equal patrol units. Monotonically
 * increasing and saturating in K; NOT cross-station priority or crime level. */
export type CoverageByStationK = Record<string, Record<string, number>>;

/* The full bundle handed down from App via useData() */
export interface SmartPatrolData {
  verification: Verification;
  stations: Stations;
  hotspots: Hotspots;
  roster: Roster;
  watchlist: Watchlist;
  harmReorder: HarmReorder;
  coverageTiming: CoverageTiming;
  coverageByStationK: CoverageByStationK;
}
