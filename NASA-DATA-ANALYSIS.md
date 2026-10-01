# NASA observation analysis

Retrieved: 2026-10-01T08:18:09.986Z. Observation dates: 2026-09-27 through 2026-10-01 (UTC).
Products: MODIS_NRT and VIIRS_NOAA20_NRT. 22,797 raw thermal-anomaly observations across three bounding boxes.

All figures below apply the dashboard default normalized confidence threshold of 40. VIIRS l/n/h maps heuristically to 30/70/95. Counts are observations and occupied grid cells, not unique fires or burned area.

| Study area | Raw records before filter | MODIS selected | VIIRS selected | Daily occupied cells | Cells with both sensors |
|---|---:|---:|---:|---:|---:|
| Amazon | 21328 | 3503 | 15945 | 11277 | 1063 |
| California | 574 | 76 | 453 | 255 | 32 |
| Central Asia | 895 | 42 | 813 | 670 | 17 |

## Daily burning activity

| Area | UTC date | Daily occupied cells |
|---|---|---:|
| Amazon | 2026-09-27 | 2171 |
| Amazon | 2026-09-28 | 2462 |
| Amazon | 2026-09-29 | 2590 |
| Amazon | 2026-09-30 | 2733 |
| Amazon | 2026-10-01 | 1321 |
| California | 2026-09-27 | 29 |
| California | 2026-09-28 | 57 |
| California | 2026-09-29 | 76 |
| California | 2026-09-30 | 88 |
| California | 2026-10-01 | 5 |
| Central Asia | 2026-09-27 | 154 |
| Central Asia | 2026-09-28 | 222 |
| Central Asia | 2026-09-29 | 183 |
| Central Asia | 2026-09-30 | 110 |
| Central Asia | 2026-10-01 | 1 |

These five days are insufficient to establish seasonal patterns or historical anomalies. Larger VIIRS counts do not by themselves show an increase in real burning: sensor sampling, sensitivity, cloud cover, and resolution differ. Cross-sensor occupied cells indicate spatial/date overlap under this approximate grid; they are not validated matches between fire events. Some thermal anomalies can be agricultural or industrial heat sources. Region filters use rectangular bounding boxes.

Source: https://firms.modaps.eosdis.nasa.gov/api/area/
