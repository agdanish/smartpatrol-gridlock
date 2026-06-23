/* Representational city field (NOT per-ticket data, the dataset is aggregated).
 * Deterministic seed: 142 hot corners + 54 stations in a radial Bengaluru-like
 * sprawl, with a denser core so the concentration is real, plus ambient navy
 * dust for the rest of the city. Returns flat Float32Arrays for one BufferGeometry. */

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CityBuffers {
  position: Float32Array;
  scatter: Float32Array;
  hot: Float32Array;
  keep: Float32Array;
  rand: Float32Array;
  count: number;
}

export const CITY_SPREAD = 6.2;

export function buildCity(target = 7200): CityBuffers {
  const rnd = mulberry32(20240611);
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const radial = (rMax: number, biasCore: number): [number, number] => {
    let u = rnd();
    if (biasCore > 0) u = Math.pow(u, 1 + biasCore * 1.6);
    const r = Math.sqrt(u) * rMax;
    const a = rnd() * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };

  const corners: { x: number; z: number; keep: boolean }[] = [];
  const stations: { x: number; z: number }[] = [];
  const nKeep = Math.round(142 * 0.739); // exactly 105 of 142 = 73.9% stay hot in the backtest
  for (let i = 0; i < 142; i++) {
    const [x, z] = radial(CITY_SPREAD, 0.85);
    corners.push({ x, z, keep: i < nKeep });
  }
  for (let i = 0; i < 54; i++) {
    const [x, z] = radial(CITY_SPREAD * 1.05, 0.25);
    stations.push({ x, z });
  }

  const perCorner = Math.max(10, Math.round((target * 0.46) / 142));
  const perStation = Math.max(5, Math.round((target * 0.1) / 54));
  const pos: number[] = [], scat: number[] = [], hot: number[] = [], keep: number[] = [], rs: number[] = [];
  const push = (x: number, y: number, z: number, sx: number, sy: number, sz: number, h: number, k: number) => {
    pos.push(x, y, z); scat.push(sx, sy, sz); hot.push(h); keep.push(k); rs.push(rnd());
  };

  corners.forEach((c) => {
    for (let k = 0; k < perCorner; k++) {
      const ang = rnd() * 6.28, rad = 2 + rnd() * 9;
      push(c.x + gauss() * 0.1, gauss() * 0.06, c.z + gauss() * 0.1,
        Math.cos(ang) * rad, (rnd() - 0.5) * 6, Math.sin(ang) * rad - 3, 1, c.keep ? 1 : 0);
    }
  });
  stations.forEach((s) => {
    for (let k = 0; k < perStation; k++) {
      const ang = rnd() * 6.28, rad = 2 + rnd() * 9;
      push(s.x + gauss() * 0.22, gauss() * 0.05, s.z + gauss() * 0.22,
        Math.cos(ang) * rad, (rnd() - 0.5) * 6, Math.sin(ang) * rad - 3, 0, 0);
    }
  });
  const ambient = target - pos.length / 3;
  for (let k = 0; k < ambient; k++) {
    const [x, z] = radial(CITY_SPREAD * 1.18, 0);
    const ang = rnd() * 6.28, rad = 2 + rnd() * 10;
    push(x, gauss() * 0.14, z, Math.cos(ang) * rad, (rnd() - 0.5) * 7, Math.sin(ang) * rad - 3, 0, 0);
  }

  return {
    position: new Float32Array(pos),
    scatter: new Float32Array(scat),
    hot: new Float32Array(hot),
    keep: new Float32Array(keep),
    rand: new Float32Array(rs),
    count: pos.length / 3,
  };
}

/* en-IN integer grouping (2,98,450) */
export const enIN = (n: number) => Math.round(n).toLocaleString("en-IN");
