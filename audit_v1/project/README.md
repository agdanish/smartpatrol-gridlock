# SmartPatrol, Predictive Enforcement Deployment Brain (BTP)

A premium, audit-grade operations console that turns **298,450 of the Bengaluru
Traffic Police's own parking-violation tickets** into a daily patrol / tow-truck
deployment plan, which corners to cover, with how many units, when, plus a
cross-jurisdiction chronic-offender watchlist no single police station can see
today. Sensor-free. Built on one official dataset. _Powered by Mappls._

Built for the **Gridlock Hackathon 2.0** (judged by Bengaluru Traffic Police,
Flipkart, and MapMyIndia / Mappls).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
```

Stack: **React 18 + TypeScript + Vite + Tailwind CSS + framer-motion**, with a
lazy-loaded WebGL landing route (**three · @react-three/fiber · drei ·
postprocessing · gsap · lenis**). Client-side only, no server, auth, database,
or network calls.

## Routes

| Route  | What                                                                 |
| ------ | -------------------------------------------------------------------- |
| `/`    | **The City Resolves**, a cinematic, scroll-driven WebGL landing page |
| `/app` | The dashboard / command center (the operational product)             |

The landing is **lazy-loaded** (`React.lazy`), so `/app` ships **zero** 3D or
scroll-engine cost, `three`, `@react-three/*`, `gsap` and `lenis` only enter the
bundle on `/`. From the landing, "Enter the Command Center" routes to `/app`
(already in the main bundle, so the cut is instant).

### The landing, `src/landing/`

One fixed `<Canvas>` holds a **single `THREE.Points` field** (one BufferGeometry,
one draw call) seeded on the real 142 hot corners + 54 stations, explicitly
**representational**, not per-ticket (the count-up labels the *dataset*). Scroll
is the only timeline: Lenis + one GSAP `ScrollTrigger` spine (wired through a
single `gsap.ticker`) scrubs a continuous camera flythrough and shader uniforms
(`uIgnite`, `uProgress`, `uDark`, `uWipe`, `uSettle`) across a cold open + five
acts. The camera is driven from a **mutated film ref read in `useFrame`**, never
`setState` in-frame, never tweening the camera object. The Act-3 cross-jurisdiction
climax is a crisp **SVG overlay** reusing the dashboard watchlist edge-draw
choreography (hub springs in last). Selective bloom (`luminanceThreshold ≈ 0.9`)
glows only the amber corners; navy stays matte. A patrol **searchlight** cursor
drives light (never the camera); the two real CTAs are magnetic.

- `cityData.ts` / `shaders.ts`, pure point-field generator + GLSL.
- `CityField.tsx`, the R3F points + per-frame camera/uniform application.
- `useFilm.ts`, Lenis + GSAP spine; writes the shared film ref.
- `Climax.tsx`, Act-3 SVG offender graph. `Poster.tsx`, 2D fallback frame.
- `Landing.tsx`, composition, IntersectionObserver reveals, fallback tiers.

**Three crash-proof tiers:** `prefers-reduced-motion` collapses every tween to its
resolved end-state; **no-WebGL** swaps in a pre-baked 2D **poster** of the ignited
142-corner frame (also the Suspense/first-paint frame); full WebGL otherwise.
Performance: one draw call, `dpr` capped at 1.75, `antialias` off, `<PerformanceMonitor>`
+ `<AdaptiveDpr>`, and ~3.6k points on low-memory / coarse-pointer devices.

> Note: a standalone `SmartPatrolLanding.html` (shipped alongside this project)
> is the same experience built with vanilla three + gsap + lenis for an instant
> CDN preview; this `src/landing/` module is the production React/R3F build.

Client-side only, no server, auth, database, or network calls.

## Visual system, "Graphite Command + Enforcement Stoplight"

Dark, warm-gunmetal substrate (the map panel shares the exact app background, so
nothing reads as bolted-on). Budget is ~90% neutral graphite · ~7% steel
data-context · ~3% scarce signal. Tokens live in `tailwind.config.js`:

- `brass` (#f0a92e), enforcement target / on-roster / coverage gap.
- `struct` (#4d7be8), structure-blue, used ONLY for tabs / focus / links.
- `steel` (#9aa6bd), low-value volume / context marks.
- Vienna-Convention **stoplight triad**, always paired with a glyph + text label
  (never colour alone): `red` (#ef4444) high-harm / chronic · brass on-roster ·
  `green` (#2dbd8a, blue-green) covered / cleared.

Motion (all gated by `prefers-reduced-motion`): a reusable `<Ticker>`
(framer-motion `useMotionValue`/`animate`, ~900ms expo-out, tabular slashed-zero)
on the real numbers; the hero's 54-segment concentration micro-viz; the
graph-flip (edges draw via `pathLength`, stations flip navy→brass as each edge
lands, the aggregate hub lands last counting up inside it); a single shared
sliding tab indicator (`layoutId`) + `AnimatePresence` panel transitions.

A slim **status strip** under the header carries deterministic provenance
("DATASET SYNCED", "COMPUTED 08:00 IST", "INTEGRITY … rows · 168 dropped",
"BACKTEST 73.9% stable"), labelled COMPUTED, never a fabricated real-time feed.

## Architecture (the integration contract)

The app is a thin presentation layer over a strict data contract. **Every number
and label rendered anywhere comes from the data module**, components never
hard-code statistics.

- **`src/types.ts`**, every TypeScript interface, one per data source
  (`Verification`, `Stations`, `Roster`, `Watchlist`, `HarmReorder`,
  `CoverageTiming`, `Hotspots`).
- **`src/data/mockData.ts`**, **all data lives here**, typed with those
  interfaces, one export per source: `verification`, `stations`, `hotspots`,
  `roster`, `watchlist`, `harmReorder`, `coverageTiming`. These mirror seven
  static JSON "API" endpoints.
- **`src/useData.ts`**, a single `useData()` hook that loads the data module
  once. `App.tsx` calls it and passes typed slices down as props.

> **To wire a live backend:** replace `src/data/mockData.ts` with data of the
> identical shape (see `src/types.ts`). Nothing else needs to change.

## Components (`src/components/`)

One component per section, exact names:

| Component           | Section |
| ------------------- | ------- |
| `Header`            | Brand, descriptor, "Powered by Mappls" badge, provenance line |
| `StatusStrip`       | Deterministic provenance chips (COMPUTED, INTEGRITY, BACKTEST) |
| `StatBand`          | Four hero KPI tiles from `verification` |
| `TabNav`            | Accessible tablist over the five panels (pitch narrative order) |
| `MapPanel`          | Bengaluru basemap (`<div id="basemap" />` placeholder for Mappls) + hotspot overlay, station/units controls, "Generate 8 AM roster" |
| `RosterPanel`       | The 8 AM patrol roster with coverage payoff |
| `WatchlistPanel`    | Cross-jurisdiction offender graph ("Reveal the hidden network") + sortable watchlist |
| `VolumeHarmPanel`   | Volume vs congestion-harm re-ranking |
| `CoveragePanel`     | 24-hour coverage-gap timing chart |
| `EvidencePanel`     | Calm grid of trust/evidence cards |
| `Footer`            | DATA / METHOD / LIMITS |

`src/components/ui.tsx` and `src/lib/format.ts` hold presentational primitives
and formatting/geo helpers only, **no data**.

## The map

`MapPanel` renders a clearly-marked basemap container, a single
`<div ref={mapRef} id="basemap" />` filling the panel, and draws hotspot points
as an absolutely-positioned overlay on top. The basemap div is intentionally
left empty: **mount a real Mappls (MapMyIndia) map into `#basemap`** and the
overlay markers (read from `hotspots`) sit above it.

## Integrity notes (kept honest)

- Demo vehicles render straight from data: `FKN00GL16746` = 22 violations across
  4 stations; `FKN00GL17863` = 41 across 2.
- The highest-frequency vehicle (`FKN00GL03377`) has **55 violations in exactly
  one station**, a frequency record, **separate** from jurisdiction span.
- Severity is a labeled proxy (only 10.3% of rows labeled) and is shown as
  illustrative; timing is enforcement presence, not a congestion forecast.
- Accessibility: semantic HTML, keyboard-navigable tabs, visible focus rings,
  real contrast, and `prefers-reduced-motion` support.
