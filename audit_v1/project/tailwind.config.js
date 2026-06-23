/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0e1014",
        panel: "#15171c",
        panel2: "#1b1e24",
        panel3: "#23262d",
        line: "rgba(154,166,189,0.10)",
        line2: "rgba(154,166,189,0.18)",
        ink: "#ECEEF2",
        mid: "#9aa6bd",
        low: "#8a93a6",
        steel: "#9aa6bd",
        struct: "#4d7be8",
        brand: "#f0a92e",
        brand2: "#d9892a",
        brass: "#f0a92e",
        brassHi: "#f7c25a",
        antique: "#d9a94f",
        harm: "#ef4444",
        red: "#ef4444",
        danger: "#ef4444",
        good: "#2dbd8a",
        green: "#2dbd8a",
      },
      fontFamily: {
        display: ['"Geist"', "system-ui", "sans-serif"],
        sans: ['"Geist"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
        geist: ['"Geist"', "system-ui", "sans-serif"],
        geistMono: ['"Geist Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
