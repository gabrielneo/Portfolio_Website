import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

/**
 * The page as HTML, rendered once at build time (scripts/prerender.mjs) and written into dist/index.html. Visitors see the content
 * as soon as the HTML arrives, before any JavaScript runs, and a link such as #projects lands on its section. The browser then
 * hydrates the same markup (src/main.tsx).
 */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
