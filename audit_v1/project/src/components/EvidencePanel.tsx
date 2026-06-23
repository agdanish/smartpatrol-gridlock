import React from "react";
import { SectionTitle } from "./ui";
import { fmt, pct, sig2 } from "../lib/format";
import type { Verification } from "../types";

export default function EvidencePanel({ v }: { v: Verification }) {
  const posture: { head: string; body: React.ReactNode }[] = [
    {
      head: "Ranks places, not people",
      body: (
        <>
          We rank <b className="text-ink">locations</b> and repeat <b className="text-ink">vehicles</b>{" "}
          for officer review. No individual is scored, profiled, or assigned a risk number.
        </>
      ),
    },
    {
      head: "No arrest-feedback loop",
      body: (
        <>
          The only input is one parking-ticket export, a vehicle/property event, <i>not</i>{" "}
          arrest, stop, or person data. With no protected attributes and no arrest history, it is{" "}
          <b className="text-ink">structurally lower-risk than discretionary-stop tools</b>.
        </>
      ),
    },
    {
      head: "Sensor-free by design",
      body: (
        <>
          No CCTV, no ANPR, no face recognition, no tracking. Designed to minimize personal-data
          exposure, <b className="text-ink">vehicle IDs only, no owner PII in this build</b>.
        </>
      ),
    },
    {
      head: "AI proposes, officer disposes",
      body: (
        <>
          Deterministic and reviewable, never autonomous:{" "}
          <span className="font-mono text-mid">
            {fmt(v.rows_total)} rows in → {v.cells_for_50pct_volume} corners +{" "}
            {fmt(v.offenders_ge10)} chronic offenders out
          </span>
          . Every output is a recommendation a human acts on.
        </>
      ),
    },
  ];
  const cards: {
    kicker: string;
    fig: string;
    figTone: string;
    label: string;
    body: React.ReactNode;
    wide?: boolean;
  }[] = [
    {
      kicker: "Concentration",
      fig: `${v.stations_for_50pct} / ${v.stations_for_80pct} / ${v.cells_for_50pct_volume}`,
      figTone: "text-brass",
      label: "stations=50% · stations=80% · corners=50%",
      body: (
        <>
          {v.stations_for_50pct} stations hold 50% of violations, {v.stations_for_80pct} hold 80%,
          and {v.cells_for_50pct_volume} corners hold half. Enforcement is a targeting problem.
        </>
      ),
    },
    {
      kicker: "Out-of-time backtest",
      fig: pct(v.top142_temporal_stability_pct),
      figTone: "text-green",
      label: "top corners stay hot in a later, held-out period",
      body: (
        <>Hotspots persist across time, not a one-off artifact, the single strongest signal of real-world deployability.</>
      ),
    },
    {
      kicker: "Patrol efficiency",
      fig: fmt(v.patrol_efficiency_x, 1) + "×",
      figTone: "text-brass",
      label: "vs random patrol allocation",
      body: (
        <>
          Top-100 corners capture {pct(v.top100_cells_pct)} of tickets versus {pct(v.random100_cells_pct)} for 100 random corners.
        </>
      ),
    },
    {
      kicker: "Harm-proxy honesty",
      fig: sig2(v.harm_vs_volume_spearman),
      figTone: "text-green",
      label: "Spearman; only " + pct(v.pct_rows_with_roadclass_label) + " labeled",
      body: (
        <>
          Severity is a labeled proxy on {pct(v.pct_rows_with_roadclass_label)} of rows; we keep it
          illustrative and lean on volume for the core ranking.
        </>
      ),
    },
    {
      kicker: "Cross-jurisdiction",
      fig: `${v.chronic_across_ge2_stations} / ${fmt(v.offenders_ge10)}`,
      figTone: "text-red",
      label: "chronic offenders span 2+ stations",
      body: (
        <>
          Of {fmt(v.offenders_ge10)} chronic offenders (≥10 violations), {v.chronic_across_ge2_stations}{" "}
          operate across 2+ stations and {v.chronic_across_ge3_stations} across 3+, the novel jewel.
        </>
      ),
    },
    {
      kicker: "Data",
      fig: fmt(v.rows_total),
      figTone: "text-ink",
      label: "rows · " + fmt(v.rows_dropped) + " dropped · " + v.n_stations + " stations",
      body: (
        <>
          Max single vehicle:{" "}
          <b className="text-ink">{v.max_violations_single_vehicle} violations in 1 station</b>, a
          frequency record, separate from jurisdiction span.
        </>
      ),
    },
    {
      kicker: "Provenance & reproducibility",
      fig: "1 script",
      figTone: "text-brass",
      label: "deterministic regeneration",
      wide: true,
      body: (
        <>
          Every figure on this console regenerates deterministically from a single script reading
          only the provided BTP CSV, no hidden inputs, no manual edits. Window:{" "}
          <span className="font-mono text-mid">{v.date_window}</span>.
        </>
      ),
    },
    {
      kicker: "The pilot ask",
      fig: "20 × 4",
      figTone: "text-brass",
      label: "corners × weeks, against a matched control set",
      wide: true,
      body: (
        <>
          Deploy patrols to the top{" "}
          <b className="text-ink">20 corners over 4 weeks</b>, measured against a{" "}
          <b className="text-ink">matched control set</b> of comparable corners held at
          status-quo enforcement, a <b className="text-ink">pre-registered go/no-go on
          coverage lift</b>. Success criteria and metrics are fixed before the pilot starts, so
          the result is honest either way.
        </>
      ),
    },
  ];
  return (
    <div>
      <section aria-labelledby="governance-heading" className="mb-8">
        <h2
          id="governance-heading"
          className="mb-1 font-display text-lg font-semibold leading-tight text-ink"
        >
          Governance &amp; Privacy — what this tool does <span className="text-brass">NOT</span> do
        </h2>
        <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-mid">
          A targeting aid for command staff, scoped to be auditable and low-risk by construction.
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {posture.map((p) => (
            <div
              key={p.head}
              className="rounded-2xl border border-line bg-panel2 p-4 transition-colors hover:border-line2"
            >
              <h4 className="text-[13px] font-semibold leading-snug text-ink">{p.head}</h4>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mid">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
      <SectionTitle
        kicker="Evidence"
        title="Why a command center can trust this"
        sub="Every figure is bound to the verification report and regenerates from one deterministic script."
      />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, i) => (
          <div
            key={c.kicker}
            className={`rise rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-line2 ${c.wide ? "sm:col-span-2 xl:col-span-3" : ""}`}
            style={{ animationDelay: i * 45 + "ms" }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">{c.kicker}</span>
            <div className={`tnum mt-3 font-display text-[34px] font-bold leading-none ${c.figTone}`}>{c.fig}</div>
            <p className="mt-2 text-[13px] font-medium text-ink">{c.label}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-mid">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
