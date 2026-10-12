# Isometric explainers

Interactive isometric figures that explain how things work. Each figure is a real, well-made machine whose working
*is* the idea, drawn as SVG with the [anatomy kit](kit/) and driven by a small model, so the picture and the numbers
cannot disagree.

| Figure | Page |
|---|---|
| How a B-2 flies without a tail: a flying wing on a test bench, stick, flight computers, nine trailing-edge surfaces, buried engines, a rotary launcher | `/b2-spirit/` |
| How browser fingerprinting works: ten diagrams, a sieve machine, a sequence, a request in DevTools, a MacBook with callouts, pixel grids, a crowd chart, a tracker log, three browsers, and a live probe of your own | `/fingerprint-sieve/` |

## Run it

Needs Node 20 or newer. There are no dependencies to install.

```bash
npm run dev
```

Open <http://localhost:4321>. Editing anything in `figures/`, `kit/` or `scripts/` rebuilds and reloads the page.
`PORT=5000 npm run dev` picks another port.

```bash
npm run build     # writes the whole site to dist/
npm run preview   # serves dist/ exactly as it will be deployed
```

## Deploy

The output in `dist/` is plain static files, so it works on any static host. It ships configured for Cloudflare
Workers static assets ([wrangler.jsonc](wrangler.jsonc)):

```bash
npm run deploy    # builds, then runs `wrangler deploy` (log in once with `npx wrangler login`)
```

Other hosts: build command `npm run build`, publish directory `dist`. That is the whole configuration for Vercel,
Netlify, GitHub Pages or Cloudflare Pages.

To deploy from CI, run `npm run build` and then `npx wrangler@4 deploy` with `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` set. Rename the Worker in `wrangler.jsonc` (`name`) before the first deploy.

## How a figure is made

```
figures/b2-spirit/
  meta.json     slug, title and blurb for the gallery
  model.mjs     the truth: real dimensions, planform, control law, turn-rate formula
  shared.mjs    geometry used by both the build and the live page (control-surface frames, stick, dial)
  build.mjs     builds the static drawing, proves it with the audit, writes dist/b2-spirit/index.html
  live.js       the page's behaviour: tour, pointer and keyboard, actuators, readout
  b2.css        page furniture and the lit-system styling
kit/            the drawing kit (camera, solids, lathe, tubes, audit)
scripts/        dev server, site build, and the browser checks below
```

`build.mjs` records the true shape of every part it draws, lets `kit/audit.mjs` measure which surface is nearer
wherever two parts overlap (so painter's order is proven, not tuned by eye), and can then check that nothing passes
through anything.

### Checks

```bash
npm run audit     # geometry audit: clearances, supports, depth order, folds. Must end "audit passed"
npm run lines     # every seam, rule and tick must end on something (needs Chrome; run after npm run build)
node scripts/capture.mjs dist/b2-spirit/index.html --out shots/fig.png --width 1100
node scripts/drive.mjs dist/b2-spirit/index.html --actions steps.json   # scripted pointer/keys, shots, sheets
```

`scripts/capture.mjs` and `scripts/drive.mjs` find Chrome, Chromium, Canary or a Playwright cache; set
`CHROME_PATH` if yours is somewhere else.

### Add a figure

1. Create `figures/<name>/` with a `meta.json` (`slug`, `title`, `blurb`) and a `build.mjs` that writes its page to the
   path given by `--out`. Copy `figures/b2-spirit/` as a starting point.
2. `npm run dev`. The gallery at `/` lists every folder that has both files.

## Accuracy

Dimensions and engine numbers are the published Block 30 figures (69 ft, 172 ft, 4 x F118-GE-100 at 17,300 lbf, no
afterburner, 16 B61 or 80 JDAM). The control law in the figure (gains, travel, actuator slew) is a simplified
sketch for explanation, not the real flight-control software, and the layout of surfaces and engines inside the
wing is illustrative.
