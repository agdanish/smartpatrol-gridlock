import React, { useEffect } from "react";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { fmt, prefersReduced } from "../lib/format";

/* ---- Ticker, single reusable count-up (framer-motion) -------------------- */
/* ~900ms expo-out, tabular slashed-zero, staggerable via `delay`, settles to
 * the EXACT value, hard-gated by prefers-reduced-motion. Animates ONLY the
 * number, denominators/units/thresholds stay static in the caller. */
export function Ticker({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  delay = 0,
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  delay?: number;
  className?: string;
}) {
  const mv = useMotionValue(prefersReduced ? value : 0);
  const text = useTransform(mv, (v) => `${prefix}${fmt(v, decimals)}${suffix}`);
  useEffect(() => {
    if (prefersReduced) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, {
      duration: 0.9,
      delay: delay / 1000,
      ease: [0.16, 1, 0.3, 1], // expo-out
    });
    return controls.stop;
  }, [value, delay, mv]);
  return <motion.span className={"tnum " + className}>{text}</motion.span>;
}

/* ---- badge ---------------------------------------------------------------- */
type Tone = "neutral" | "brand" | "struct" | "harm" | "red" | "good" | "danger";
export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const tones: Record<Tone, string> = {
    neutral: "bg-white/5 text-mid border-line",
    brand: "bg-brass/10 text-brass border-brass/30",
    struct: "bg-struct/10 text-struct border-struct/30",
    harm: "bg-red/10 text-red border-red/30",
    red: "bg-red/10 text-red border-red/30",
    good: "bg-green/10 text-green border-green/30",
    danger: "bg-red/10 text-red border-red/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---- panel ---------------------------------------------------------------- */
export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-panel/80 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

/* ---- section title -------------------------------------------------------- */
export function SectionTitle({
  kicker,
  title,
  sub,
}: {
  kicker?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-5">
      {kicker && (
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brass/80">
          {kicker}
        </div>
      )}
      <h2 className="font-display text-2xl font-semibold leading-tight text-ink md:text-[28px]">
        {title}
      </h2>
      {sub && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-mid">{sub}</p>}
    </div>
  );
}

/* ---- hero concentration micro-viz (the datum, not decoration) ------------- */
export function ConcentrationStrip({ filled, total }: { filled: number; total: number }) {
  const bars = Array.from({ length: total });
  return (
    <div className="mt-3">
      <div className="flex items-end gap-[1.5px]" aria-hidden="true">
        {bars.map((_, i) => {
          const on = i < filled;
          return (
            <span
              key={i}
              style={{
                height: on ? 16 : 9,
                flex: "1 1 0",
                borderRadius: 1,
                transformOrigin: "bottom",
                background: on ? "#f0a92e" : "#23262d",
                opacity: prefersReduced ? 1 : 0,
                animation: prefersReduced ? "none" : "segin .5s cubic-bezier(.2,.7,.2,1) forwards",
                animationDelay: Math.min(i * 11, 620) + "ms",
              }}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-low">
        Each bar = one station, ranked by volume ·{" "}
        <span className="text-brass">brass = the {filled} that cover 80%</span>
      </p>
    </div>
  );
}

/* ---- brand marks ---------------------------------------------------------- */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="#15171c" stroke="rgba(154,166,189,0.2)" />
      <path d="M20 7l9.5 4.2v6.1c0 6.2-4 11.8-9.5 13.7C14.5 29.1 10.5 23.5 10.5 17.3v-6.1L20 7z" fill="url(#shield)" opacity="0.16" />
      <path d="M20 7l9.5 4.2v6.1c0 6.2-4 11.8-9.5 13.7C14.5 29.1 10.5 23.5 10.5 17.3v-6.1L20 7z" stroke="#d9a94f" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="14.6" cy="16" r="1.7" fill="#d9a94f" />
      <circle cx="25.4" cy="14.4" r="1.7" fill="#f0a92e" />
      <circle cx="21" cy="23.4" r="1.7" fill="#d9a94f" />
      <path d="M14.6 16L25.4 14.4L21 23.4" stroke="#d9a94f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <defs>
        <linearGradient id="shield" x1="10" y1="7" x2="30" y2="31">
          <stop stopColor="#f0a92e" />
          <stop offset="1" stopColor="#d9a94f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function MapplsBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-3 py-1.5">
      <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-gradient-to-br from-[#E8423B] to-[#F6A21E]">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
        </svg>
      </span>
      <span className="text-[12px] font-medium text-mid">
        Powered by <span className="font-semibold text-ink">Mappls</span>
      </span>
    </span>
  );
}
