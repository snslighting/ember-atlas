# Ember Atlas monitoring method

This is an independent decision-support prototype for satellite-observed burning activity. It does not predict ignition, declare a wildfire, measure burned area, determine extinguishment, or replace an emergency agency's decisions. The underlying harmonization is Work's unchanged `evidence-grid-v2`; see [HARMONIZATION.md](HARMONIZATION.md) and the original [Work report](../Ember-Atlas-Harmonization-Report.md).

## Scientific foundation and representation

`harmonization.js` allocates approximate north-aligned scan/track rectangles into a latitude-adjusted one-kilometre support grid. It conserves each unique observation's evidence weight, preserves native categorical/numeric confidence and product/satellite/acquisition provenance, and separately records near-time cross-sensor coincidence. Support cells indicate possible observational support, not the position or perimeter of a physical fire. Polar geometry uses Work's explicit fallback.

Monitoring uses MODIS native confidence ≥40 and VIIRS nominal/high. These are reproducible quality filters, not probabilities. A new comparable historical support archive is built from actual source observations through this same Work function. It is separate from the legacy `data/history` centre-cell archive used by the existing Analyze page. **Legacy centre-cell counts must not be compared numerically to monitoring footprint-support counts.** Existing Analyze/Sensors functionality is retained; the Monitor map renders support rectangles and approximate native raw pixels rather than reverting to centre dots.

## Data and Area of Interest

`data/monitor/manifest.json` records 743 source files, NASA URLs, SHA-256 checksums, products, coverage dates and retrieval metadata. Uzbekistan covers its declared country polygon from late 2000 onward; later appended NRT is provisional. Northern California has September SP observations for 2017–2024. Rondônia has August SP observations for 2017–2024. Eastern Australia covers the declared 145–150°E, 24–20°S area for 2018–2023 using Work's supplemental MODIS/S-NPP inputs. These are study areas, not complete administrative or global historical coverage.

Live observations retain the existing worldwide MODIS + NOAA-20 VIIRS NRT pipeline. Comparable history is available only where a prepared archive covers the selected location **and season**. Elsewhere the map and activity tracker work, while historical inference explicitly reports insufficient history. Missing history is never silently replaced with another region's baseline.

Rectangle and simple-polygon AOIs select source centres before Work's footprint allocation in both live and custom historical calculations. The same selected source can support cells outside the drawn outline; this expresses approximate pixel support. Country search uses English country names. Custom history loads relevant raw source partitions and unions declared coverage once before aggregation; adjacent geographic tiles cannot duplicate a reference day. AOIs outside a preset's archive have partial or unavailable history, not invented zero activity.

## Activity event formation and identity

`event-tracking.js` bins acquisition times into 15-minute groups, calls Work's grid unchanged, and finds eight-neighbour support components with latitude-adjusted adjacency. A component can link to previously observed adjacent support within 24 hours. This gap policy is configurable and is an association heuristic, not a verified pass or fire-lifetime model. Exact observation duplicates are removed. Cross-bin coincidence can be underrepresented; a 15-minute acquisition bin is **not** proof of an independent pass.

IDs derive deterministically from the first contributing source identity, with persisted source-overlap identity recovery on refresh. Continuing components retain IDs. Merges preserve aliases; disconnected branches retain a parent ID. A compact browser registry stores up to 3,000 records per scope, six scopes, and the latest 32 source IDs per event. Source-overlap recovery protects identity when a rolling window drops earlier observations. Registry retention is seven days; it does not preserve an unlimited event archive. Adjacent agricultural, industrial or wildfire activity can merge, and one physical activity can split into multiple groups.

No new observation does not mean extinguishment. Recent registry entries survive an empty refresh; retained entries identify last-known evidence and may lack contributing raw records in the current snapshot. Observation age and uncertainty remain visible. The tracker is not an independently validated fire inventory.

## Seasonal baseline and calibration

`early-warning.js` compares a daily support statistic to **earlier SP years at the same place and season**. Seasonal windows are the same calendar day or ±7/±14 calendar days, including the year boundary. Each reference year contributes the median of its covered seasonal days. This avoids pretending fifteen neighbouring days are fifteen independent years. At least five reference years are required for a percentile.

Work's `seasonal-calibration.js` is reused unchanged: paired SP daily MODIS/VIIRS occupied-support totals, calendar-month ratios shrunk toward the regional ratio, ≥30 paired days and ≥3 training years. The cutoff is `min(2020, inference year − 1)`. S-NPP, NOAA-20 and NOAA-21 remain distinct products; priority is S-NPP, then NOAA-20, then NOAA-21 when trained and currently covered. Historic comparison uses the same selected reference product and current MODIS availability. Where VIIRS observations exist but scaling is untrained, combined inference is unavailable rather than falsely Normal. A MODIS-only descriptive value can still be displayed explicitly.

No NRT, selected-year future day, or later year enters calibration training or baseline references. Model preparation after 2020 reuses the same fixed-cutoff Work calculation using only SP through 2020. No future holdout statistics are substituted for training. Offline calendar entries each use their own previous-year reference set. Current replay-day calendar totals are replaced by the observed prefix, preventing end-of-day leakage.

Area headline metrics describe the latest covered UTC day's **AOI-wide** activity. Event historical context describes its first support cell's fixed 0.25° monitoring zone, intersected with a custom AOI where relevant. A zone can contain several activity groups; its percentile is not the percentile of that individual group's area. Latest days are incomplete; comparing an incomplete total to completed historical days is conservative for exceedance but is not adjusted for acquisition opportunity or cloud exposure.

## Anomalies, trend and index

The empirical percentile is `100 × (count(reference < current) + 0.5 × count(reference = current)) / reference years`. Outputs include median, mean, Q25/Q75, IQR, Q90/Q95/Q99, min/max, current/median ratio, robust MAD score, and frequency of similar-or-higher reference values. A zero median or MAD produces an unavailable ratio/score. Small reference sets yield coarse percentiles: 100 does not establish a one-percent physical event probability.

Support-footprint anomalies remain separate. FRP is maximum observed **single-pixel** MW, never summed fire power or energy. A calibrated FRP anomaly is unavailable because these inputs do not support a sensor/geometry-stratified calibration.

Event trend requires three acquisition groups with resolved elapsed time. It compares the latest three observed support counts, unique newly supported cells per elapsed hour, and footprint-centroid displacement. Strictly positive successive changes mean Increasing; negative changes mean Decreasing; equal changes mean Stable; other combinations mean Mixed. Rapidly increasing requires the observed increase also to be at or above the 95th percentile of earlier SP event-growth samples in the same archive and calendar month. Persistence distributions likewise use earlier SP event samples. They are regional event-sample distributions, not independent wildfire frequencies. Viewing geometry, clouds, mixed agricultural activity and sampling cadence can alter these measurements.

Maximum-pixel FRP trend is reported only when the same product and satellite contributed positive FRP in all three groups. This remains descriptive, not geometry-corrected energy growth.

The **Ember seasonal activity index** is the empirical seasonal percentile on 0–100. No arbitrary weighted risk score is invented. Persistence percentile, expansion percentile, sensor evidence, observation age and quality remain separate components in detail/export.

## Transparent monitoring policy

These are prototype policy choices, not learned emergency-dispatch thresholds:

| State | Rule |
|---|---|
| Insufficient history | Fewer than five comparable prior years, unavailable seasonal coverage, or untrained required scaling |
| Normal | Available seasonal percentile below 80 |
| Watch | Percentile at least 80 |
| Elevated | Percentile at least 95 |
| Critical | Percentile at least 99, at least twenty comparable prior years, ≥3 acquisition groups spanning ≥3 hours, both MODIS and VIIRS, at least Moderate evidence, latest observation no older than 48 hours |

Critical cannot usually be established in the prepared overlap-era archives, which lack twenty earlier paired VIIRS years. This deliberately conservative restriction is visible, rather than fabricating precision. Historical extreme activity with fewer years can still be Elevated.

Approaching critical conditions requires at least the 95th percentile, a historically Rapidly increasing support trend, and a measured increase from the previous acquisition prefix's zone percentile. It indicates observed escalation toward this policy's conditions; it does not predict ignition or a future wildfire.

High evidence requires separated repetition, both sensors and near-time coincident support. Moderate evidence requires repetition or both sensors. Otherwise evidence is Limited. These descriptions are not calibrated confidence probabilities. Observation gaps become explicit after twelve hours; >48 hours is stale. Stale activities sort below recent activities, and cannot receive Critical. Queue order then uses state, approaching conditions, seasonal percentile, observed duration and observation age. Reasons are exported with every state.

## Sustained unusual periods and replay

Critical-period detection marks at least two consecutive covered days at or above the earlier-years 95th seasonal percentile. Gaps or nonqualifying days break runs. Calendar cards show duration, peak activity, percentile and contributing products. “Sustained unusual period” does not imply Critical event state or a confirmed wildfire. Replay exposes only acquired observations; no interpolated perimeter is drawn. Completed future periods and future calendar days stay hidden.

`validate-monitor.js` runs chronological prefixes across eight real case-months spanning four areas, northern winter/spring, September, Amazon August, and southern autumn/summer. It asserts timing/reference isolation and independent percentile arithmetic, and records trigger checkpoints, subsequent activity, state-change fraction, sampled alert persistence, a non-persistence proxy and threshold sensitivity. See [MONITORING-REPLAY.md](validation/MONITORING-REPLAY.md) and its machine-readable results. Unit tests additionally cover lineage, rolling identity, empty updates, zero distributions, native quality, unavailable calibration, sensor eras, storage failures and AOIs.

No independent wildfire/exposure labels exist for this evaluation. **False-warning frequency, ignition-to-detection delay and physical hazard accuracy cannot be identified.** Non-persistence is a clearly labelled proxy that can reflect gaps or lineage changes. Passing arithmetic/replay checks establishes implementation consistency, not emergency suitability.

## Runtime, freshness and failure

Offline preprocessing verifies source checksums and builds gzip geographic/year partitions, sparse zone context tiles, fixed-cutoff Work models and seasonal calendars. Browser workers track events and compute current comparisons. The new monitoring partitions are gzip-only and require a current browser with native decompression; unsupported browsers get an explicit message, while existing Sensors/Analyze compatibility paths are unchanged. Four-download queues, bounded caches, shared distributions, canvas support rectangles, viewport queries and collapsed overlays limit rendering cost. The default footprint view shows the latest observed acquisition per activity, so replay can show contraction as well as expansion; an All observed support option preserves the cumulative record. Custom AOIs necessarily load intersecting prepared raw partitions; no decades of global raw observations are shipped.

The server/secure GitHub workflow performs FIRMS retrieval with an ignored environment file or repository secret. Public files contain observations and provenance, never MAP_KEY. Pages poll snapshot metadata every sixty seconds; the existing secure retrieval schedule publishes new snapshots independently. A check is not a new satellite observation. NRT is not a continuous camera feed.

Failed updates retain the last valid snapshot with its timestamp. With no valid data, an explicit unavailable state is shown. No fake observations are generated. Watchlists and state-change alerts are browser-local and checked while the page is open; no SMS/email/push service is claimed. Storage failure is disclosed. Animation-off preferences and all existing site animations remain supported.

## Primary source context

[NASA FIRMS on polar-orbiting snapshots and geostationary coverage](https://wiki.earthdata.nasa.gov/spaces/FIRMS/blog/2024/06/25/377718041/Geostationary%2BActive%2BFire%2BDetection%2BData%2Bin%2BFIRMS) explains why these observations are temporally intermittent. [NASA's FEDS event dataset notes](https://gis.earthdata.nasa.gov/portal/home/item.html?id=fac8f2ba3f054ff8ab5231e511e5dacd) illustrate why satellite activity groups need not match agency fire incidents. [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/map/?os=firetv) documents active-fire observations and cloud limitations. These sources inform the interpretation; Ember Atlas does not claim to implement FEDS or a geostationary feed.

Live refreshes keep the complete activity identity registry in the worker for the current Area of Interest. The smaller browser-storage registry is a reload fallback; replay does not overwrite the last live identity snapshot.
