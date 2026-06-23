import { useEffect, useRef } from "react";
import { buildCity } from "./cityData";

/* Tier-2 fallback AND the Suspense / loading frame: a 2D-rendered poster of the
 * ignited 142-corner frame so the very first paint is already the punchline. */
export default function Poster({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth, H = window.innerHeight;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      cv.width = W * dpr; cv.height = H * dpr;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b0d12"; ctx.fillRect(0, 0, W, H);
      const c = buildCity(7000);
      const cx = W * 0.5, cy = H * 0.46, s = Math.min(W, H) / 14;
      for (let i = 0; i < c.count; i++) {
        if (c.hot[i]) continue;
        const x = cx + c.position[i * 3] * s, y = cy + c.position[i * 3 + 2] * s * 0.62 - c.position[i * 3 + 1] * s;
        ctx.fillStyle = "rgba(60,76,112,0.5)"; ctx.fillRect(x, y, 1.2, 1.2);
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < c.count; i++) {
        if (!c.hot[i]) continue;
        const x = cx + c.position[i * 3] * s, y = cy + c.position[i * 3 + 2] * s * 0.62 - c.position[i * 3 + 1] * s;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, "rgba(247,194,90,0.9)"); g.addColorStop(0.4, "rgba(240,169,46,0.5)"); g.addColorStop(1, "rgba(240,169,46,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.28); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      const vg = ctx.createRadialGradient(cx, cy, H * 0.2, cx, cy, H * 0.8);
      vg.addColorStop(0, "transparent"); vg.addColorStop(1, "rgba(6,8,12,0.9)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);
  return <canvas ref={ref} className={className} />;
}
