# Ember Atlas — NASA MODIS × VIIRS

An independent NASA Space Apps prototype with **Live** and **History** modes. MODIS and VIIRS observe thermal anomalies with different resolution, sensitivity and acquisition times. Ember Atlas retains their provenance, aligns observations into common daily cells, fits an overlap-era scaling baseline, and compares activity with actual historical seasons.

The published site is [Ember Atlas](https://snslighting.github.io/ember-atlas/), with [Live observations](https://snslighting.github.io/ember-atlas/observatory.html) and [History](https://snslighting.github.io/ember-atlas/history.html).
The local project lives at `C:\Codex\NASA Space Apps\ember atlas`.

## Local review

Node.js 22 or newer is recommended.

```powershell
cd 'C:\Codex\NASA Space Apps\ember atlas'
npm.cmd install
npm.cmd start
```

- Overview: http://localhost:3000/
- History: http://localhost:3000/history.html
- Live: http://localhost:3000/observatory.html
- California case: http://localhost:3000/history.html?case=california&month=2020-09
- Amazon case: http://localhost:3000/history.html?case=amazon&month=2019-08
- Current Uzbekistan + seasonal context: http://localhost:3000/observatory.html?country=UZB

Saved real NASA data needs no key to browse. The local server refreshes public worldwide NRT files every 15 minutes while it runs; pages check published/local metadata every 60 seconds without reloading. Stop the server to stop local retrieval. Check now checks the current snapshot; it does not guarantee a new NASA publication.

## Architecture

Existing animated Earth, satellites, page swipes, scroll animations, reduced-motion preference, English map labels, sharper road maps, satellite/night/daily imagery, area drawing, country/region drill-down, map expansion, sidebar collapse, on-map Back/close and Hide detections are retained.

- **Live:** `provider.js` fetches the small version manifest and compressed/date/sensor shards. `analysis-worker.js` handles filtering, approximate daily grid, viewport queries and CSV export. The existing canvas map renders only visible bins.
- **History:** `history-provider.js` uses gzip with JSON fallback, a 48-partition memory LRU, persistent browser cache and a four-download queue. `history-worker.js` isolates aggregation/calibration from the UI. `history-engine.js` loads compact annual summaries for the timeline, then only intersecting year/geographic cell partitions for the selected map. Custom AOIs load their intersecting partitions and recompute historical statistics.
- **UI:** `history-app.js` connects the monthly calendar, selected period, sensor views, raw source-count comparison, metrics, provenance and the existing map shell. Calendar missing months stay blank. Map symbols are common cell centers; original source point coordinates remain in the offline download cache.
- **Static output:** `build.js` creates versioned assets in `docs/`, preserves the subpath used by GitHub Pages, and appends current NRT summaries. It never needs the ignored historical raw download cache.

Historical files follow this layout:

```
data/history/metadata.json
 data/history/<case>/<year>/summary.json[.gz]
 data/history/<case>/<year>/<5-degree-x>_<5-degree-y>.json[.gz]
 data/history/<case>/recent/{cells,summary}.json[.gz]
```

Metadata lists coverage, product eras, source links, retrieval dates, source checksums and partition versions. A public derived record is separate from the private/offline source cache.

## Real historical coverage in this build

The initial input contains **731 real NASA source files, 1,225,406 source rows before geographic/quality filtering, and 1,007,542 accepted rows**. Original input counts include records outside the Uzbekistan country polygon in bounding-box API downloads. Counts are not unique fires.

| Case | Archive coverage | Default example |
|---|---|---|
| Uzbekistan | MODIS November 2000–June 2026 SP; S-NPP January 2012 onward; NOAA-20 April 2018 onward; July–October 2026 NRT appended separately | August 2024 |
| Northern California, [-123, 38, -120, 41] | September 2017–2024 SP | September 2020 |
| Amazon / Rondônia, [-64, -13, -60, -8] | August 2017–2024 SP | August 2019 |

Recent worldwide MODIS/NOAA-20 observations are available in Live, but **decades of global history are not populated**. California and Amazon have selected seasonal months only. Historical country/region selection shows only the archived case's coverage, not a complete country-wide history. Latest UTC days and all NRT periods are provisional.

NOAA-21 NRT is represented by the ingestion schema, but no NOAA-21 historical series is downloaded in this build and NASA currently lists no corresponding SP area product. Its contribution stays missing.

## Historical preprocessing and reproduction

1. Browse existing derived data without downloading raw archives.
2. For reproducing Uzbekistan's public annual archives through 2024, no key is needed.
3. For area API case studies and 2025–2026 continuation, set `FIRMS_MAP_KEY` in the environment or an ignored local `.env` file. Request your own key from NASA FIRMS. Never place it in frontend code.
4. Download and build:

```powershell
npm.cmd run history:fetch -- --cases=uzbekistan --years=2000-2024
npm.cmd run history:fetch -- --cases=uzbekistan --years=2025-2026
npm.cmd run history:fetch -- --cases=california,amazon --years=2017-2024
npm.cmd run history:build
npm.cmd run data:refresh
npm.cmd run history:append
npm.cmd run history:audit
npm.cmd test
npm.cmd run build
```

The downloader is resumable, checksum-aware, uses two concurrent requests, retries failures, respects NASA's five-day area-query limit, and checks actual product availability. Inspect its reported failures before building. Annual country archives are preferred; unavailable annual files fall back to bounded SP/NRT area queries. Modify `history-catalog.js` to extend case/month coverage deliberately.

`.history-source/manifest.json` describes inputs as `firms-history-input-v1`, with caseID, year, product, processing SP/NRT, date bounds, local CSV filename, sanitized source link, retrieval timestamp and SHA-256. The offline builder accepts another manifest path. It validates dates/checksums, clips Uzbekistan to the country polygon, deduplicates source observations within year/product, applies quality filters and emits cells/summaries. Raw files and private API keys are ignored by Git.

## Common representation and baseline harmonization

Historical quality rules are fixed: MODIS native confidence ≥40; VIIRS nominal/high only. VIIRS low/nominal/high →30/70/95 are filtering scores, **not probabilities**.

For each approximate 1 km cell and UTC day retain MODIS/S-NPP/NOAA-20/NOAA-21 counts, date, grid ID/center, maximum valid nonnegative FRP, confidence filter score, acquisition time bounds, satellites and product names. Maximum FRP is never summed energy. Per-product summaries allow NRT to update one satellite without erasing others or keeping superseded FRP/time values. Source observation counts and occupied-cell counts are displayed separately. Combined VIIRS occupied cells are a union; reference VIIRS counts are also shown.

For each AOI and VIIRS product:
- Train using SP paired daily occupied-cell totals through 2020.
- `k = sum(MODIS cells) / sum(VIIRS product cells)`.
- Require at least 30 paired days, three training years, and positive totals.
- Include source-covered zero-detection days; exclude missing product days and all NRT.
- Daily `H = (M + kV) / 2` when both exist; use M or kV when only one calibrated contribution exists.
- Reference VIIRS priority: S-NPP, then NOAA-20, then NOAA-21. Satellites are not added together into H.
- Monthly activity is the sum of daily H. Units are a MODIS-scale occupied-cell activity proxy; there is no arbitrary 0–100 cap.
- SP after 2020 is held out. Report paired sample sizes, daily RMSE and bias of kV−M. Earlier periods are in-sample.

This is the **Baseline harmonization model**, a simple statistical prototype. It addresses aggregate sensitivity differences; it does not validate matched fire events or remove cloud/overpass/clear-sky sampling biases.

## Seasonal baseline and Live context

Compare the selected month's exact covered calendar dates with those dates in other SP years for the same AOI. Exclude the selected year and all provisional NRT reference periods. Reference years must cover every selected date. Partial current months therefore compare like dates.

At least five comparison years are required. Report:
- Midrank percentile: 100 × (years below + 0.5 × tied years) / N.
- Seasonal median and H/median if median >0.
- Sample z-score when variance >0.
- Normal <80th percentile; Elevated ≥80; Unusual ≥95.
- Critical activity ≥99 with at least 20 comparison years. This labels relative activity, not emergency risk.

Live historical context uses its exact selected date window and fixed historical quality rules, independently of the display confidence slider. It is offered for Uzbekistan country/regions and AOIs fully within the California/Rondônia case boxes. Other places correctly report missing historical coverage. Incomplete current days can depress current counts.

The Live short-window calendar still shows window-relative peaks (mean +1.5 standard deviations); these are labeled **Window peaks**, separate from historical categories.

## Data sources and map imagery

Primary NASA sources:
- https://firms.modaps.eosdis.nasa.gov/download/
- https://firms.modaps.eosdis.nasa.gov/api/area/
- https://firms.modaps.eosdis.nasa.gov/api/data_availability/
- Annual country catalog: https://firms.modaps.eosdis.nasa.gov/data/country/yearly_summary_files.txt
- Public MODIS rolling CSV: https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_7d.csv
- Public NOAA-20 CSV: https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv

Public annual archives currently extend through 2024. Product availability was queried for this build: SP through June 30, 2026 and current NRT from July 1, 2026. Availability can change; the downloader checks it rather than hardcoding current cutoffs.

Map imagery is independent of FIRMS observations: OpenFreeMap road/dark styles with English labels, EOX Sentinel-2 cloudless 2025 imagery, NASA Blue Marble, 2012 nighttime lights and dated MODIS true-color. Composites are not live imagery. Natural Earth borders are generalized, not legal boundary authority. Baikonur is included in Kazakhstan and retained as a selectable lease area. Imagery attribution remains visible.

## Updates, local build and deployment

The existing GitHub Actions workflow fetches public NASA worldwide NRT every 15 minutes, checks/tests data and builds Pages. Both modes poll small metadata files every 60 seconds and preserve the last successful real values if fetching fails. Browser-hidden tabs pause checks.

`append-live-history.js` preserves accumulated derived NRT for the three cases and refreshes each newly supplied product/date. Scheduled builds restore/save these recent partitions through Actions cache, then generate fresh metadata. Cache retention is best effort: a cold cache starts from checked-in derived history, so continuity beyond committed archives is not guaranteed until a durable archive store is added. NRT is never calibration training.

A push to `main` activates the publisher. Review changes locally and obtain explicit user approval before pushing or dispatching the publisher. Local `npm run build` only writes files.

To verify the static Pages subpath locally:

```powershell
npm.cmd run build
npm.cmd run preview
```

Open http://localhost:3001/ember-atlas/history.html. Deploy only after explicit user approval.

## Validation

Automated tests cover existing animations/navigation/map interactions, confidence/provenance and compressed Live data; historical sensor eras, calibration split, missing-vs-zero coverage, anomaly sample sizes/thresholds, partial seasonal windows, real NASA case loading, lazy partition loading, map selection/export and current context. Desktop/phone browser checks complement these tests; test fixtures are never served as product data.

## Limitations and future work

Detections are thermal anomalies, not confirmed wildfires, unique fire events or burned area. No coverage mask accounts for clouds or overpass effort. Grid-center country/AOI assignment has edge uncertainty. Raw source counts include repeat acquisitions. Global historical coverage, NOAA-21 SP, cell-level transfer calibration, clear-sky normalization, independent validation, transition diagnostics and uncertainty intervals remain future work.

Persist NRT in a durable versioned store, replace provisional NRT with SP when it becomes available, extend area/month coverage, and add smaller temporal partitions as records grow. Exports are selected common cells with provenance; original raw point drill-down is an optional future extension.

The reproducible [historical baseline audit](HISTORY-ANALYSIS.md) lists actual fitted factors, paired sample sizes and held-out errors for all three cases.
