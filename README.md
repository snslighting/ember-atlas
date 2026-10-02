# Ember Atlas — MODIS × VIIRS

**Website:** https://snslighting.github.io/ember-atlas/
**Repository:** https://github.com/snslighting/ember-atlas

A redesigned three-page Earth observation website: an animated WebGL Earth landing page with Lenis smooth scrolling, an automatically updating observatory, and a dedicated methodology page. Responsive layouts and reduced-motion support are included.

## Actual NASA data

The observatory serves actual NASA FIRMS observations from MODIS_NRT and VIIRS_NOAA20_NRT for the latest five UTC days. A GitHub Actions publisher downloads official public rolling CSVs, filters the three study-area bounding boxes, validates data, builds the site, and deploys it. No repository secret or browser-exposed API key is needed. Your local ignored key remains available for the area API.

The publisher is scheduled every 15 minutes (minutes 7, 22, 37, and 52 UTC). GitHub scheduling and publication can be delayed; NASA data have acquisition and processing latency. This is near-real-time, not an instantaneous guaranteed feed. The dashboard polls a small version manifest every 60 seconds, fetches records only when a new publication is available, and updates without reloading. Manual dates, sensor selection, confidence, map position, and selected day are retained when possible. Follow latest dates enables a rolling date window. After 45 minutes without a successful newer retrieval the view marks data stale; failures retain the last actual records and retry. Hidden tabs pause checks and immediately check when resumed.

Official automatic download sources:
- https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_7d.csv
- https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv

The [checked-in analysis](NASA-DATA-ANALYSIS.md) identifies its retrieval date. Each deployment also includes an updated analysis at /data/analysis.md and metadata at /data/status.json.

## Run locally

Requires Node.js 20 or newer:

```powershell
cd 'C:\Codex\NASA Space Apps'
npm.cmd install
npm.cmd start
```

Open http://localhost:3000. The default saved NASA snapshot needs no key. For live retrieval, set FIRMS_MAP_KEY in an environment variable or a local ignored `.env` file, then restart the server. The local observatory retrieves NASA data automatically. An upstream failure retains clearly labeled actual snapshot data; it never substitutes synthetic records.

## Refresh and publish observations

```powershell
npm.cmd run data:refresh
node analyze-data.js
npm.cmd run build
npm.cmd test
```

`data:refresh` uses the local key if configured, otherwise official public CSV downloads. Set FIRMS_PUBLIC_DOWNLOADS=1 to force public sources. All requested products must succeed and validate before replacing the snapshot. It stores public observations and metadata in `data/firms.json`; no API URL containing the key is saved. `build` copies the real snapshot and relative static assets into `docs/`. Commit the refreshed `data/`, `docs/`, and analysis report and push `main` to publish. GitHub Pages uses GitHub Actions; `.github/workflows/publish.yml` runs on main pushes, scheduled intervals, and manual dispatch. It refreshes data before testing, building, and publishing the artifact. Never commit `.env` or put the key in browser code. The static Pages site cannot contact the credentialed API directly; the scheduled publisher handles cloud refreshes.

## Analysis baseline

Common region/date/confidence filters precede aggregation. Records group by an approximate latitude-adjusted 1 km row grid and UTC day. Each cell retains sensor and product memberships, satellite identifiers, observation count, observation time range, mean location, maximum normalized confidence, and maximum FRP. Original confidence and satellite metadata are preserved for raw observations. VIIRS l/n/h and low/nominal/high map heuristically to 30/70/95; MODIS numeric confidence is retained.

Daily occupied cells form the calendar. A peak exceeds the selected window's mean + 1.5 population standard deviations. Five days cannot establish historical anomalies or seasonality. Zero selected detections do not prove no fire. Raw records are available in MODIS, VIIRS, and Compare views; CSV export reflects the map selection.

The grid is approximate and has boundary artifacts. It does not validate matches between fire events, correct for overpasses/clouds/missing coverage, calibrate sensors scientifically, or estimate burned area. FIRMS thermal anomalies include agricultural burning and other heat sources. Counts are neither unique fires nor fire extent. Bounding boxes are not administrative polygons. Production scientific validation requires historical records, coverage masks, an equal-area projection, sensor calibration, and independent evaluation.

## Project files

- `index.html`, `landing.js`, `site.css`: animated Earth landing page.
- `observatory.html`, `dashboard.css`, `app.js`: automatic-update analysis workspace.
- `method.html`: dedicated methodology page.
- `fetch-firms.js`: public download or private local area-API retrieval.
- `.github/workflows/publish.yml`: scheduled NASA refresh, validation, and Pages deployment.
- `refresh-state.js`: rolling dates and freshness logic.
- `data/firms.json`: original-observation metadata and retrieval manifest.
- `core.js`: normalization, approximate grid, calendar calculations.
- `app.js`, `provider.js`: interactive map and actual-data providers.
- `server.js`: local-only HTTP server and optional live NASA requests.
- `build.js`: GitHub Pages static build in `docs/`.
- `analyze-data.js`: reproducible actual-data analysis report.
- `core.test.js`, `nasa-data.test.js`: processing and data-integrity checks.

Leaflet is bundled with its license. OpenStreetMap tiles and optional fonts require internet. The server binds to 127.0.0.1.

## Shared scene and motion

All three pages share `earth.js`, `motion.js`, and `navigation.js`. The landing globe initially faces Eurasia and occupies about 70% of the desktop hero width, capped on very wide screens. Drag the globe to rotate it; focused arrow keys rotate it and Home restores Eurasia. Rotation carries across internal page links. The observatory and method sheets sit above a dimmed Earth backdrop. Native cross-document view transitions swipe the sheets while preserving the scene and navigation; unsupported browsers use an exit/entrance animation. Reduced-motion preferences disable movement. Smooth scrolling, section reveals, orbital motion, and pointer-lit cards run without interfering with the observatory map.

The shared styling lives in `experience.css`. Every release versions HTML page links, styles, scripts, and local module imports together so cached styles cannot put the Earth over new page content. The WebGL scene has an isolated, clipped background layer; content and transition snapshots remain above it. The globe uses orthographic projection for a predictable 68% desktop width. The map uses one non-wrapping world, hard geographic bounds, and a viewport-aware minimum zoom; it cannot pan into duplicate worlds. Regression checks cover release invalidation, navigation behavior, and map viewport limits.
