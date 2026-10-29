import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this repo at https://gabrielneo.github.io/Portfolio_Website/
export default defineConfig({
  // Relative paths, so the build works from any folder or URL (GitHub Pages included).
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    // The lazily loaded 3D background (three.js) is ~250 KB gzipped on its own.
    chunkSizeWarningLimit: 1000,
  },
});
