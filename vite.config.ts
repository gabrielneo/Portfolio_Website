import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Preload the one font file the page needs first (Inter, Latin subset). The browser otherwise finds it only after the CSS has
 * downloaded and parsed, and the text re-renders when it arrives.
 */
function preloadLatinFont(): Plugin {
  return {
    name: "preload-latin-font",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const font = Object.keys(ctx.bundle ?? {}).find((f) => /inter-latin-wght-normal-[\w-]+\.woff2$/.test(f));
        if (!font) return html;
        return [{ tag: "link", attrs: { rel: "preload", href: `./${font}`, as: "font", type: "font/woff2", crossorigin: "" }, injectTo: "head-prepend" }];
      },
    },
  };
}

// GitHub Pages serves this repo at https://gabrielneo.github.io/Portfolio_Website/
export default defineConfig({
  // Relative paths, so the build works from any folder or URL (GitHub Pages included).
  base: "./",
  plugins: [react(), preloadLatinFont()],
  build: {
    target: "es2022",
    // The lazily loaded 3D background (three.js) is ~250 KB gzipped on its own.
    chunkSizeWarningLimit: 1000,
  },
});
