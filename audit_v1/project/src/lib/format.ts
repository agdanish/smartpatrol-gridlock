/* Shared formatting + geo helpers (presentation only, no data lives here). */

export const fmt = (n: number, d = 0): string => {
  if (!Number.isFinite(Number(n))) return "–"; // crash-proof: never render "NaN"/"undefined" on stage
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};

/* Precision hygiene: percentages always 1 decimal; correlation at its real
 * resolution (0.95, not 0.953); integers grouped via fmt(). */
export const pct = (n: number): string => (Number.isFinite(Number(n)) ? fmt(n, 1) + "%" : "–");
export const sig2 = (n: number): string => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "–");

export const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Approximate Bengaluru bounds used to project lon/lat onto the basemap overlay.
 * The real Mappls map handles projection once it mounts into #basemap; this is
 * only for the placeholder marker overlay. */
export const BLR_BOUNDS = {
  lonMin: 77.525,
  lonMax: 77.76,
  latMin: 12.835,
  latMax: 13.045,
};

export function project(lon: number, lat: number): { x: number; y: number } {
  const x = (lon - BLR_BOUNDS.lonMin) / (BLR_BOUNDS.lonMax - BLR_BOUNDS.lonMin);
  const y = (BLR_BOUNDS.latMax - lat) / (BLR_BOUNDS.latMax - BLR_BOUNDS.latMin);
  return {
    x: Math.max(0.03, Math.min(0.97, x)),
    y: Math.max(0.05, Math.min(0.95, y)),
  };
}
