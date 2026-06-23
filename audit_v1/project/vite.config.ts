import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Extract React FIRST so it lands in its own chunk and isn't trapped
        // behind the heavy three.js bundle (which would force three to load
        // before the dashboard could render). Then split the 3D/animation libs
        // (three / R3F / gsap / lenis) that only the Landing hero needs into a
        // separate lazy vendor bundle. framer-motion intentionally stays in the
        // index path; three is not split further.
        manualChunks(id) {
          if (
            id.includes("react-dom") ||
            /node_modules\/(react|react-router|react-router-dom|scheduler)\//.test(
              id
            )
          )
            return "react";
          if (/three|@react-three|gsap|lenis/.test(id)) return "three";
        },
      },
    },
  },
});
