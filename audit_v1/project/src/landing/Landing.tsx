import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { gsap } from "gsap";
import CityField from "./CityField";
import Climax from "./Climax";
import Poster from "./Poster";
import { useFilm, initialFilm } from "./useFilm";
import { enIN } from "./cityData";
import "./landing.css";

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
  } catch { return false; }
}

const ACTS = ["act0", "act1", "act2", "act3", "act4", "act5"];

export default function Landing() {
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const fine = useMemo(() => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches, []);
  const lowmem = useMemo(() => (typeof navigator !== "undefined" && (((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4)) || (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches), []);
  const hasGL = useMemo(() => webglOK(), []);

  const film = useRef(initialFilm());
  useFilm(film, reduced);

  const [dpr, setDpr] = useState(Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.75));
  const [glShown, setGlShown] = useState(false);
  const [act3Active, setAct3Active] = useState(false);
  const [bigCount, setBigCount] = useState(reduced ? enIN(298450) : "0");
  const pointCount = lowmem ? 3600 : 7200;

  // big count-up, setTimeout-stepped so it runs even when rAF is throttled
  useEffect(() => {
    if (reduced) return;
    let i = 0; const steps = 64; const timers: number[] = [];
    const start = window.setTimeout(function tick() {
      i++; const p = Math.min(1, i / steps); const e = 1 - Math.pow(2, -10 * p);
      setBigCount(enIN(298450 * e));
      if (p < 1) timers.push(window.setTimeout(tick, 32));
    }, 600);
    return () => { clearTimeout(start); timers.forEach(clearTimeout); };
  }, [reduced]);

  // reveal canvas shortly after mount (poster underneath covers any first-frame gap)
  useEffect(() => { if (!hasGL) return; const t = window.setTimeout(() => setGlShown(true), 400); return () => clearTimeout(t); }, [hasGL]);

  // IntersectionObserver reveals (no rAF dependency; centre trigger-band for tall sticky acts)
  useEffect(() => {
    const acts = ACTS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const ticks = Array.from(document.querySelectorAll(".lp .ticks .t"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const act = e.target as HTMLElement;
        const i = ACTS.indexOf(act.id);
        if (e.isIntersecting) {
          act.classList.add("in");
          if (act.id === "act3") setAct3Active(true);
          ticks.forEach((t) => t.classList.remove("on"));
          ticks[i]?.classList.add("on");
          const hint = document.querySelector(".lp .hint") as HTMLElement | null;
          if (hint) hint.style.opacity = i > 0 ? "0" : "1";
        } else {
          if (act.id !== "act0") act.classList.remove("in");
          if (act.id === "act3") setAct3Active(false);
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    acts.forEach((a) => io.observe(a));
    return () => io.disconnect();
  }, []);

  // magnetic pull on the two real CTAs, tight institutional spring
  useEffect(() => {
    if (!fine || reduced) return;
    const cleanups: (() => void)[] = [];
    document.querySelectorAll<HTMLElement>(".lp .cta").forEach((btn) => {
      const xT = gsap.quickTo(btn, "x", { duration: 0.35, ease: "power3.out" });
      const yT = gsap.quickTo(btn, "y", { duration: 0.35, ease: "power3.out" });
      const move = (e: PointerEvent) => {
        const r = btn.getBoundingClientRect();
        xT((e.clientX - (r.left + r.width / 2)) * 0.3);
        yT((e.clientY - (r.top + r.height / 2)) * 0.4);
      };
      const leave = () => { xT(0); yT(0); };
      btn.addEventListener("pointermove", move);
      btn.addEventListener("pointerleave", leave);
      cleanups.push(() => { btn.removeEventListener("pointermove", move); btn.removeEventListener("pointerleave", leave); });
    });
    return () => cleanups.forEach((c) => c());
  }, [fine, reduced]);

  return (
    <div className="lp">
      {/* WebGL stage, the single protagonist */}
      <div className="lp-stage">
        {hasGL && (
          <Canvas
            className={"lp-gl" + (glShown ? " show" : "")}
            dpr={dpr}
            flat
            frameloop={reduced ? "demand" : "always"}
            gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
            camera={{ fov: 50, near: 0.1, far: 100, position: [0, 2.4, 11] }}
          >
            <fogExp2 attach="fog" args={["#0b0d12", 0.055]} />
            <CityField film={film} reduced={reduced} fine={fine} pointCount={pointCount} />
            {!lowmem && (
              <EffectComposer>
                {/* selective bloom, only amber (HDR > 1.0) blooms; navy stays matte. flat
                 * <Canvas> disables ACES tone-mapping so the shader's >1.0 amber survives. */}
                <Bloom luminanceThreshold={1.0} mipmapBlur intensity={1.1} radius={0.7} />
              </EffectComposer>
            )}
            <PerformanceMonitor onDecline={() => setDpr(1)} />
            <AdaptiveDpr pixelated />
          </Canvas>
        )}
      </div>
      <div className="lp-vignette" />
      <div className={"lp-search" + (fine && !reduced ? " on" : "")} />
      {/* Poster: first-paint punchline + no-WebGL tier. Hidden once the live field shows. */}
      <Poster className={"lp-poster" + (hasGL && glShown ? " hide" : "")} />

      {/* brand */}
      <div className="brand">
        <div className="l">
          <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="#15171c" stroke="rgba(154,166,189,0.22)" />
            <path d="M20 7l9.5 4.2v6.1c0 6.2-4 11.8-9.5 13.7C14.5 29.1 10.5 23.5 10.5 17.3v-6.1L20 7z" fill="#f0a92e" opacity="0.14" />
            <path d="M20 7l9.5 4.2v6.1c0 6.2-4 11.8-9.5 13.7C14.5 29.1 10.5 23.5 10.5 17.3v-6.1L20 7z" stroke="#d9a94f" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="14.6" cy="16" r="1.7" fill="#d9a94f" /><circle cx="25.4" cy="14.4" r="1.7" fill="#f0a92e" /><circle cx="21" cy="23.4" r="1.7" fill="#d9a94f" />
          </svg>
          <span className="name">SmartPatrol</span>
        </div>
        <div className="r">
          <span className="mappls"><span className="pin"><svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" /></svg></span>Powered by <b style={{ color: "var(--ink)", fontWeight: 600 }}>Mappls</b></span>
          <Link className="skip" to="/app">Skip intro →</Link>
        </div>
      </div>

      <div className="ticks">{ACTS.map((a) => <div key={a} className="t" />)}</div>

      {/* scroll spine */}
      <main id="lp-scroll">
        <section className="act" id="act0" style={{ height: "190vh" }}>
          <div className="hold"><div className="wrap">
            <div className="eyebrow rv"><span className="kicker">The city resolves</span></div>
            <div className="ledger tnum rv d1">{bigCount}<span className="unit"> tickets</span></div>
            <h1 className="head rv d2" style={{ marginTop: 18 }}>Every one of them, a place and a time.</h1>
            <p className="prov rv d3" style={{ marginTop: 22 }}>One official BTP export · <span className="tnum">2,98,450</span> tickets · sensor-free · <b>Powered by Mappls</b></p>
          </div></div>
        </section>

        <section className="act" id="act1" style={{ height: "160vh" }}>
          <div className="hold"><div className="wrap">
            <div className="eyebrow rv"><span className="kicker">01, Concentration</span></div>
            <h1 className="head rv d1"><span className="amber tnum">23</span> of <span className="tnum">54</span> stations carry <span className="amber">80%</span> of all violations.</h1>
            <h1 className="head rv d2" style={{ marginTop: 14, color: "var(--mid)", fontWeight: 500 }}><span className="tnum" style={{ color: "var(--brass)" }}>142</span> of <span className="tnum">5,796</span> corners hold <span className="amber">half</span> of all parking chaos.</h1>
            <p className="sub rv d3">Not a data problem. <em>A where problem.</em></p>
          </div></div>
        </section>

        <section className="act" id="act2" style={{ height: "165vh" }}>
          <div className="hold"><div className="wrap">
            <div className="eyebrow rv"><span className="kicker">02, The intercept</span></div>
            <div className="fig rv d1"><span className="amber tnum">25.2×</span> patrol efficiency</div>
            <p className="sub rv d2">The top <span className="tnum" style={{ color: "var(--ink)" }}>100</span> corners intercept <em>43.5%</em> of violations, versus <em>1.7%</em> at random.</p>
            <div className="bars rv d3">
              <div className="bar you"><div className="lab"><span>Top 100 corners</span><span className="tnum" style={{ color: "var(--brassHi)" }}>43.5%</span></div><div className="track"><div className="fill" style={{ transform: "scaleX(1)" }} /></div></div>
              <div className="bar rnd"><div className="lab"><span>100 random corners</span><span className="tnum">1.7%</span></div><div className="track"><div className="fill" style={{ transform: "scaleX(0.039)" }} /></div></div>
            </div>
          </div></div>
        </section>

        <section className="act" id="act3" style={{ height: "200vh" }}>
          <div className="hold" style={{ justifyContent: "center" }}>
            <div className="wrap act3-grid" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 40, alignItems: "center" }}>
              <div>
                <div className="eyebrow rv"><span className="kicker" style={{ color: "var(--red)" }}>03, The hidden network</span></div>
                <h1 className="head rv d1">One vehicle. <span className="amber tnum">22</span> violations. <span className="tnum">4</span> stations.</h1>
                <h1 className="head rv d2" style={{ marginTop: 10 }}><span className="red">Invisible to all of them.</span></h1>
                <p className="climax-cap rv d3"><b>711 chronic offenders</b> · 139 of them span 2+ stations, a network no single desk can see. Vehicle FKN00GL16746, joined across jurisdictions.</p>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div className="climax"><Climax active={act3Active} reduced={reduced} /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="act" id="act4" style={{ height: "150vh" }}>
          <div className="hold"><div className="wrap">
            <div className="eyebrow rv"><span className="kicker">04, Proof</span></div>
            <h1 className="head rv d1"><span className="amber tnum">73.9%</span> of hot corners stay hot in an out-of-time backtest.</h1>
            <p className="sub rv d2">Not luck, <em>structure.</em></p>
            <div className="chips rv d3">
              <span className="chip">Spearman <b>0.95</b></span><span className="chip">One official dataset</span><span className="chip">Sensor-free</span><span className="chip">Audit-grade</span>
            </div>
          </div></div>
        </section>

        <section className="act" id="act5" style={{ height: "130vh" }}>
          <div className="hold"><div className="wrap">
            <div className="eyebrow rv"><span className="kicker">05, The handoff</span></div>
            <h1 className="head rv d1" style={{ maxWidth: "18ch" }}>From <span className="tnum">2,98,450</span> tickets to tomorrow's <span className="amber">8 AM roster.</span></h1>
            <div className="cta-row rv d2">
              <Link className="cta" to="/app"><span>Enter the Command Center</span><span className="arr">→</span></Link>
              <Link className="cta ghost" to="/app">See the evidence</Link>
            </div>
          </div></div>
        </section>
      </main>

      <footer className="foot"><div className="wrap">
        <div className="led">One official BTP dataset · <b>zero sensors</b> · audit-grade · Powered by Mappls</div>
        <div className="led">SmartPatrol · Gridlock Hackathon 2.0</div>
      </div></footer>

      <div className="hint"><span>Scroll</span><span className="ln" /></div>
    </div>
  );
}
