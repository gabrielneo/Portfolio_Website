# Neo Yi Kai · Portfolio

Personal portfolio for BA / PM roles in healthtech and public services.
Live at https://gabrielneo.github.io/Portfolio_Website/

Built with React 19, Vite, Tailwind CSS and React Three Fiber (the interactive
constellation background).

## Edit the content

All the words on the page live in [`src/portfolioData.ts`](src/portfolioData.ts): profile
and contact details, hero, focus, strengths, projects (with their detail
pop-ups), experience and values. Change the text there and the layout updates
itself.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173/
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Publish

Every push to `main` builds the site and publishes it with GitHub Actions
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

One-time setup: in the repo, go to **Settings → Pages → Build and deployment**
and set **Source** to **GitHub Actions**.

## Accessibility and performance

- Every text colour meets WCAG AA contrast on the dark background.
- Keyboard friendly: skip link, visible focus rings, an accessible mobile menu,
  expandable timeline items, and a project dialog that closes with Esc.
- The 3D constellation (`src/components/BackgroundCanvas.tsx` + `NetworkScene.tsx`)
  runs on desktops only, at a 1–2× resolution cap, and reacts to the cursor and
  scroll speed. Phones, modest GPUs and Reduce Motion get a static CSS
  gradient mesh instead, and never download three.js.
- The glowing cursor trail is mouse/trackpad only and off with Reduce Motion.
- **Resume** opens an in-page preview (Google Drive viewer) with Download PDF
  and Open in Google Docs. The viewer only loads when someone opens it.
- Fonts are bundled with the site; the only third-party request is the resume
  preview, on demand.
- Builds use relative paths, so `dist/` works from any folder or URL.
