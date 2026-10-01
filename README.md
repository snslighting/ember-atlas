# Ember Atlas — MODIS × VIIRS

**Website:** https://snslighting.github.io/ember-atlas/
**Repository:** https://github.com/snslighting/ember-atlas

Interactive NASA FIRMS thermal-anomaly observations with sensor views, geographic/date/confidence filters, observation metadata, sensor comparison, daily burning-activity calendar, window-relative peak indicators, and CSV export.

## Actual NASA data

The website now serves an actual NASA FIRMS snapshot for September 27–October 1, 2026, retrieved October 1, 2026. It contains 22,797 observations across Amazon, California, and Central Asia bounding boxes, from MODIS_NRT and VIIRS_NOAA20_NRT. The app shows retrieval time and observation dates. This is a published snapshot, not an automatically refreshing live feed. Synthetic data is used only in an isolated test fixture; it is never a production fallback.

See [NASA-DATA-ANALYSIS.md](NASA-DATA-ANALYSIS.md) for actual counts, daily activity, and interpretation limits. Source documentation: https://firms.modaps.eosdis.nasa.gov/api/area/.

## Run locally

Requires Node.js 20 or newer:

```powershell
cd 'C:\Codex\NASA Space Apps'
npm.cmd install
npm.cmd start
```

Open http://localhost:3000. The default saved NASA snapshot needs no key. For live retrieval, set FIRMS_MAP_KEY in an environment variable or a local ignored `.env` file, then restart the server and select Refresh NASA. An upstream failure retains clearly labeled actual snapshot data; it never substitutes synthetic records.

## Refresh and publish observations

```powershell
npm.cmd run data:refresh
node analyze-data.js
npm.cmd run build
npm.cmd test
```

`data:refresh` uses the private local key to fetch latest-five-day MODIS and NOAA-20 VIIRS area CSVs. All six requests must succeed before replacing the snapshot. It stores public observations and metadata in `data/firms.json`; no API URL containing the key is saved. `build` copies the real snapshot and relative static assets into `docs/`. Commit the refreshed `data/`, `docs/`, and analysis report and push `main` to publish. GitHub Pages deploys `main → /docs`. Never commit `.env` or put the key in browser code. The static Pages site cannot contact the credentialed API directly; refresh requires the local script/server.

## Analysis baseline

Common region/date/confidence filters precede aggregation. Records group by an approximate latitude-adjusted 1 km row grid and UTC day. Each cell retains sensor and product memberships, satellite identifiers, observation count, observation time range, mean location, maximum normalized confidence, and maximum FRP. Original confidence and satellite metadata are preserved for raw observations. VIIRS l/n/h maps heuristically to 30/70/95; MODIS numeric confidence is retained.

Daily occupied cells form the calendar. A peak exceeds the selected window's mean + 1.5 population standard deviations. Five days cannot establish historical anomalies or seasonality. Zero selected detections do not prove no fire. Raw records are available in MODIS, VIIRS, and Compare views; CSV export reflects the map selection.

The grid is approximate and has boundary artifacts. It does not validate matches between fire events, correct for overpasses/clouds/missing coverage, calibrate sensors scientifically, or estimate burned area. FIRMS thermal anomalies include agricultural burning and other heat sources. Counts are neither unique fires nor fire extent. Bounding boxes are not administrative polygons. Production scientific validation requires historical records, coverage masks, an equal-area projection, sensor calibration, and independent evaluation.

## Project files

- `fetch-firms.js`: private-key NASA retrieval and public snapshot generation.
- `data/firms.json`: original-observation metadata and retrieval manifest.
- `core.js`: normalization, approximate grid, calendar calculations.
- `app.js`, `provider.js`: interactive map and actual-data providers.
- `server.js`: local-only HTTP server and optional live NASA requests.
- `build.js`: GitHub Pages static build in `docs/`.
- `analyze-data.js`: reproducible actual-data analysis report.
- `core.test.js`, `nasa-data.test.js`: processing and data-integrity checks.

Leaflet is bundled with its license. OpenStreetMap tiles and optional fonts require internet. The server binds to 127.0.0.1.
