import type { Config } from "tailwindcss";

// Dark slate + glass + teal/cyan accents. Text colours used on the page are
// checked against WCAG AA on the darkest background (see README).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0b0f19",
        accent: { DEFAULT: "#2dd4bf", strong: "#10b981", cyan: "#06b6d4", soft: "#99f6e4" },
      },
      fontFamily: {
        sans: ["Inter Variable", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,191,.18), 0 10px 40px -12px rgba(16,185,129,.35)",
        glass: "inset 0 1px 0 rgba(255,255,255,.04), 0 12px 40px -18px rgba(0,0,0,.6)",
      },
    },
  },
  plugins: [],
} satisfies Config;
