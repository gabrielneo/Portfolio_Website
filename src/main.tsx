import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./App";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The built page arrives pre-rendered (scripts/prerender.mjs): hydrate it. `npm run dev` serves an empty root: render it.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
