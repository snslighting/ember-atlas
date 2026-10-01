# Ember Atlas — MODIS × VIIRS

A local NASA Space Apps prototype: interactive hotspot map, sensor views and comparison, region/date/confidence filters, daily burning-activity calendar, window-relative critical days, popup provenance, and CSV export.

## Run

Requires Node.js 20 or newer. In PowerShell:

```powershell
cd 'C:\Codex\NASA Space Apps'
npm.cmd install
npm.cmd start
```

Open http://localhost:3000. Run `npm.cmd test` for the aggregation, calendar, demo reproducibility, and FIRMS parser checks. No build step is required; the server serves ES modules and local Leaflet assets. Map tiles and optional fonts require internet; the data, controls, markers and analysis operate without NASA credentials. Without tiles the map remains a geographic canvas with selectable markers.

## Data

The default is a deterministic **synthetic** September 2026 scenario, with an activity surge September 17–21 across Amazon, California, and Central Asia. It is not an observed NASA dataset. No accuracy claims are made.

For NASA observations, request a free key at https://firms.modaps.eosdis.nasa.gov/api/map_key/, then restart:

```powershell
$env:FIRMS_MAP_KEY = 'your-key'
npm.cmd start
```

Choose NASA FIRMS in the provider selector. The server fetches latest-three-day MODIS_NRT and VIIRS_NOAA20_NRT area CSVs; it keeps the key server-side. Date filters reset to available observations. Missing credentials or upstream failures fall back to clearly labeled synthetic data. The live provider uses preset bounding boxes; this prototype does not ingest historical archive files. Documentation: https://firms.modaps.eosdis.nasa.gov/api/area/.

## Baseline and limits

Apply common region/date/confidence filters, then group observations by approximate latitude-adjusted 1 km cell and UTC day. Each cell retains all sensor memberships and observation count, uses mean coordinates, maximum FRP and maximum normalized confidence. Numeric MODIS confidence is retained; VIIRS l/n/h maps heuristically to 30/70/95. Raw observations remain available through sensor/Compare views. CSV exports the visible map selection.

Calendar counts daily occupied cells. A critical day exceeds the selected window's mean + 1.5 population standard deviations, with zero-count days included. This is a descriptive signal, not a historically trained anomaly model. Zero detections do not establish absence of fire.

The spatial grid is approximate, has latitude/boundary artifacts, and is not a validated equal-area projection or fire-event matcher. Sensor resolution, clouds, overpasses, missing coverage and confidence calibration are not corrected. Counts are neither unique fires nor burned area. Harmonization does not infer fire absence or reconstruct a validated continuous climate record. Production work requires official archive observations, coverage masks, an equal-area grid, calibration, and independent evaluation.

## GitHub Pages

`npm.cmd run build` generates the self-contained static demo in `docs/`, including Leaflet and its license. Configure repository Settings → Pages → Deploy from a branch → `main` → `/docs`. Relative asset URLs support project subpaths. The hosted demo computes all analyses in the browser and needs no API credentials. The NASA FIRMS selection explains that live data requires the local Node server; API keys must never be embedded in a public Pages site. Rebuild and commit `docs/` after edits.

## Structure

- `server.js`: local static server and optional FIRMS provider with demo fallback.
- `core.js`: deterministic data, normalization, grid baseline, daily metrics.
- `app.js`: interactive Leaflet map and dashboard.
- `core.test.js`: meaningful data-processing tests.

The local server binds only to 127.0.0.1. No API key is stored in the project.
