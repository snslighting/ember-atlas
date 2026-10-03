# NASA Space Apps challenge coverage

The new monitoring upgrade is prepared locally. The existing published version remains unchanged until deployment is requested. Core harmonization is Work's current algorithm. Status “Implemented” means an observable prototype capability, not operational or physical wildfire validation.

| Requirement | Feature / implementation | Status and limits | Demonstrate |
|---|---|---|---|
| MODIS/VIIRS harmonization | Work `harmonization.js`, `seasonal-calibration.js`; `monitor-preprocess.js` | Implemented; approximate support geometry and descriptive evidence | Switch Monitor evidence view between raw MODIS, raw VIIRS and harmonized support rectangles; export contributing sources |
| Burning activity calendar | `monitor-app.js`, `monitor-engine.js`, offline seasonal calendars | Implemented; month/week/day, missing coverage blank, NRT provisional | Open Calendar, change resolution, hover and select a period to update map/queue/comparison |
| Historical fire patterns | `data/monitor`, seasonality bars, existing Analyze | Implemented for four prepared study areas; distinct legacy units documented | Choose a preset, inspect calendar across years and seasonal pattern |
| Unusual conditions | `early-warning.js` seasonal reference distributions | Implemented; prior SP years, same place/season, five-year minimum | Inspect a priority event's History tab: median, percentile, ratio, robust score, actual reference dates |
| Critical periods | `criticalPeriods`, calendar outlines and period cards | Implemented sustained unusual periods; no wildfire declaration | Select an amber-outlined run/card; inspect duration, peak and sensors |
| Anticipating critical periods | `assessEvent`, previous-prefix comparison | Implemented evidence-based Approaching critical; requires historical rapid growth and rising percentile | Inspect reasons during replay; no ignition prediction or invented forecast |
| Early warning | Normal/Watch/Elevated/Critical rules and exported reasons | Implemented transparent prototype rules; twenty-year Critical requirement usually cannot be met in overlap-era archives | Replay actual high and quieter periods and compare state/reasons; show insufficient-history cases |
| Emergency response support | Priority queue, freshness, event detail/map/export | Implemented evidence triage; no dispatch or confirmed incident infrastructure | Select a recent high-ranked activity; inspect observation gaps, location and raw evidence |
| Monitoring guidance | Measured queue order, visible independent index components | Implemented; stale activities demoted | Compare percentile, persistence, expansion and freshness between activities |
| Selected Area of Interest | `monitor-map.js`, `monitor-aoi.js`, engine AOI filtering | Implemented presets, English country search, rectangle and polygon; history limited by coverage | Draw an AOI, inspect recalculated context, clear it via on-map ×; switch presets |
| Scientist use | Provenance, native quality, SP/NRT distinction, replay and JSON export | Implemented reproducible evidence audit; no invented FRP anomaly | Inspect Raw satellite data and exported acquisition/source/checksum fields |
| Land-manager use | Seasonal pattern, sustained periods, browser watchlist | Implemented browser-local monitoring; active page required | Save an AOI, reload, see retained watchlist and in-app state-change feed |
| Current data | Existing `provider.js`, secure FIRMS retrieval, monitoring worker | Implemented actual worldwide MODIS + NOAA-20 NRT, sixty-second snapshot checks | Live mode: compare snapshot/latest acquisition timestamps; Check now; hide overlays |
| Historical data | `build-monitor-history.js`, `prepare-monitor-context.js`, `monitor-provider.js` | Implemented 743 actual files; Uzbekistan, California September, Amazon August, Eastern Australia 2018–2023 | Load real case shortcuts; inspect seasonal coverage and unavailable months |
| Stable activity tracking | `event-tracking.js`, browser registry | Implemented IDs, merge aliases, split parent, seven-day last-known retention | Select event, step acquisitions and inspect lineage; tests cover rolling and empty snapshots |
| Trend / persistence | Latest three acquisition groups, historical growth/persistence distributions | Implemented; bins are not independently verified passes | Timeline and detail show observed support change, new-cell rate and centroid displacement |
| Observation uncertainty | Work cell uncertainty and `assessEvent` evidence/freshness | Implemented; no confidence probabilities or extinguishment inference | Inspect limited evidence and old observation cases |
| Raw vs harmonized visualization | Monitor canvas support/native approximate pixels | Implemented; observed geometry, not interpolated fire perimeter | Zoom in and change evidence view; overlays can be hidden while navigating |
| Replay validation | `validate-monitor.js`, `monitoring.test.js` | Implemented multi-region, multiple seasons, prefix isolation, measured proxies and sensitivity; no wildfire ground truth | Open validation report; explain proxy limits and conservative Critical coverage |
| Performance / static hosting | Gzip partitions, prepared contexts, workers, viewport canvas, cache | Implemented local and GitHub Pages build; no global historical raw download | Run build and subpath preview; keep animation controls and existing maps available |

## A thirty-second local demonstration

1. Open **Monitor Current Activity** from the existing animated landing page. Show the NASA snapshot time and the ranked evidence queue.
2. Open **Amazon August 2024** or **Uzbekistan April 2021**; select an activity and show why its percentile differs from the AOI headline metric. Explain that the event context uses a fixed local monitoring zone.
3. Step backward in replay. Observations, details and current-day calendar totals follow that prefix without future information.
4. Show Calendar's long-term seasonal pattern, a sustained unusual run, and a quiet/insufficient-history period. Draw an Area of Interest and save it in Live mode.

Method: [EARLY_WARNING_METHOD.md](EARLY_WARNING_METHOD.md). Validation: [MONITORING-REPLAY.md](validation/MONITORING-REPLAY.md). Work's original report and harmonization implementation are preserved separately.
