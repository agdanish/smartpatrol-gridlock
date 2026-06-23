/* Mappls (MapMyIndia) Web Map SDK loader — Vite.
 * Reads VITE_MAPPLS_KEY. Crash-proof: any failure rejects and the caller keeps
 * the schematic map, so the demo never depends on the network or a key. */

export const MAPPLS_KEY: string = import.meta.env.VITE_MAPPLS_KEY ?? "";

type MapplsNS = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Map: new (el: string | HTMLElement, opts: Record<string, unknown>) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Marker: new (opts: Record<string, unknown>) => any;
};

declare global {
  interface Window {
    mappls?: MapplsNS;
  }
}

let pending: Promise<MapplsNS> | null = null;

export function loadMappls(): Promise<MapplsNS> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (!MAPPLS_KEY) return Promise.reject(new Error("no Mappls key"));
  if (window.mappls?.Map) return Promise.resolve(window.mappls);
  if (pending) return pending;
  pending = new Promise<MapplsNS>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://apis.mappls.com/advancedmaps/api/${MAPPLS_KEY}/map_sdk?layer=vector&v=3.0`;
    s.async = true;
    s.onload = () => {
      let tries = 0;
      const check = () => {
        if (window.mappls?.Map) resolve(window.mappls);
        else if (tries++ > 50) reject(new Error("Mappls SDK loaded but window.mappls.Map missing"));
        else setTimeout(check, 100);
      };
      check();
    };
    s.onerror = () => reject(new Error("Mappls SDK failed to load"));
    document.head.appendChild(s);
  });
  return pending;
}
