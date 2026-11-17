// Writes the rendered page into dist/index.html, after `vite build` (the browser bundle) and
// `vite build --ssr src/entry-server.tsx --outDir .ssr` (the same app, for Node).
//
// Why: dist/index.html used to ship an empty <div id="root">. Nothing appeared until the JavaScript
// had downloaded and run (about 1.5 s on a 4G phone), and a link to a section such as #projects
// landed at the top of the page, because the section did not exist yet when the browser looked for it.
import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "dist", "index.html");
const ssrDir = path.join(root, ".ssr");

const { render } = await import(pathToFileURL(path.join(ssrDir, "entry-server.js")).href);
const html = await readFile(htmlPath, "utf8");
const marker = '<div id="root"></div>';
if (!html.includes(marker)) throw new Error(`prerender: ${marker} not found in dist/index.html`);

const body = render();
if (!body.includes('id="projects"')) throw new Error("prerender: the rendered page has no #projects section");
await writeFile(htmlPath, html.replace(marker, `<div id="root">${body}</div>`));
await rm(ssrDir, { recursive: true, force: true });
console.log(`prerender: wrote ${(body.length / 1024).toFixed(1)} KB of HTML into dist/index.html`);
