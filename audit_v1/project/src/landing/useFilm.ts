import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export interface FilmState {
  progress: number;
  ignite: number;
  cx: number; cy: number; cz: number;
  lx: number; ly: number; lz: number;
  uProgress: number; uDark: number; uWipe: number; uSettle: number;
  ptx: number; pty: number; px: number; py: number; search: number;
}

export const initialFilm = (): FilmState => ({
  progress: 0, ignite: 0,
  cx: 0, cy: 2.4, cz: 11, lx: 0, ly: 0, lz: 0,
  uProgress: 0.4, uDark: 0, uWipe: 0, uSettle: 0,
  ptx: 0, pty: 0, px: 0, py: 0, search: 0,
});

const KF = [
  { p: 0.0, c: [0, 2.4, 11.0], l: [0, 0, 0] },
  { p: 0.14, c: [0, 2.5, 10.6], l: [0, 0, 0] },    // quiet hold on the hero
  { p: 0.3, c: [0.3, 6.4, 7.8], l: [0, 0, -0.3] },
  { p: 0.35, c: [0.5, 6.6, 7.6], l: [0, 0, -0.4] }, // hold on the concentration
  { p: 0.45, c: [2.6, 2.6, 5.8], l: [1.8, 0, -0.8] },
  { p: 0.52, c: [3.0, 2.2, 5.4], l: [2.0, 0, -1.0] }, // hold on the intercept
  { p: 0.6, c: [0, 1.8, 8.6], l: [0, 0.3, 0] },
  { p: 0.72, c: [0, 1.8, 8.6], l: [0, 0.3, 0] },   // long, still hold for the dark climax
  { p: 0.8, c: [0, 3.2, 9.6], l: [0, 0, 0] },
  { p: 0.87, c: [0, 2.8, 10.0], l: [0, 0, 0] },    // hold on the proof
  { p: 1.0, c: [0, 1.2, 12.6], l: [0, 0, 0] },
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function driveFilm(f: FilmState, p: number, reduced: boolean) {
  let i = 0;
  while (i < KF.length - 1 && p > KF[i + 1].p) i++;
  const a = KF[i], b = KF[Math.min(i + 1, KF.length - 1)];
  const span = b.p - a.p || 1;
  const t = easeInOut(Math.min(1, Math.max(0, (p - a.p) / span)));
  f.progress = p;
  f.cx = lerp(a.c[0], b.c[0], t); f.cy = lerp(a.c[1], b.c[1], t); f.cz = lerp(a.c[2], b.c[2], t);
  f.lx = lerp(a.l[0], b.l[0], t); f.ly = lerp(a.l[1], b.l[1], t); f.lz = lerp(a.l[2], b.l[2], t);
  f.uProgress = reduced ? 1 : 0.4 + 0.6 * smoothstep(0.19, 0.35, p);
  f.uDark = reduced ? 0 : Math.max(0, smoothstep(0.54, 0.6, p) - smoothstep(0.7, 0.73, p));
  f.uWipe = reduced ? 0 : smoothstep(0.76, 0.84, p);
  f.uSettle = smoothstep(0.9, 1.0, p);
}

/* Lenis + ONE gsap ticker; a single master ScrollTrigger spine scrubs the film.
 * Never tweens the camera object, only writes to the shared film ref, which
 * CityField reads in useFrame. */
export function useFilm(film: React.MutableRefObject<FilmState>, reduced: boolean) {
  useEffect(() => {
    if (reduced) {
      driveFilm(film.current, 0, true);
      film.current.ignite = 1;
      film.current.uProgress = 1;
      return;
    }
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const st = ScrollTrigger.create({
      trigger: "#lp-scroll",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      onUpdate: (self) => driveFilm(film.current, self.progress, false),
    });
    driveFilm(film.current, 0, false);

    const igniteTween = gsap.to(film.current, { ignite: 1, duration: 2.0, delay: 0.5, ease: "power2.out" });

    return () => {
      igniteTween.kill();
      st.kill();
      gsap.ticker.remove(tick);
      lenis.off("scroll", onScroll);
      lenis.destroy();
    };
  }, [film, reduced]);
}
