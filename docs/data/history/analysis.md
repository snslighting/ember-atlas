# Historical baseline audit

Built: 2026-10-03T17:19:30.671Z. Inputs: 731 actual NASA files; 1,225,406 input rows; 1,007,542 accepted rows before the separately appended worldwide snapshot.

Quality: MODIS confidence at least 40 (native scale); VIIRS nominal/high only. Categories are not probabilities.

All diagnostics below are prototype cross-sensor disagreement, not scientific accuracy. Training is SP through 2020; holdout is later SP. NRT is never fitted.

## Uzbekistan

Bounds: 55.9, 37.1, 73.2, 45.6. 2000 onward · Standard Processing with provisional NRT appended. Covered daily records: 9468.

| VIIRS reference | Factor | Paired training days | Holdout days | RMSE cells/day | Bias cells/day |
|---|---:|---:|---:|---:|---:|
| S-NPP | 0.1688 | 3269 | 2007 | 7.72 | -2.33 |
| NOAA-20 | 0.1975 | 1006 | 2007 | 6.77 | -1.06 |
| NOAA-21 | unavailable | 0 | 0 | — | — |

Default period 2024-08: H=92.77, 1388 common daily cells, 101 MODIS and 2311 quality-filtered VIIRS source observations. Normal; 24 comparable other SP years.

## Northern California

Bounds: -123, 38, -120, 41. September case study · 2017–2024. Covered daily records: 245.

| VIIRS reference | Factor | Paired training days | Holdout days | RMSE cells/day | Bias cells/day |
|---|---:|---:|---:|---:|---:|
| S-NPP | 0.5610 | 120 | 120 | 17.76 | 4.66 |
| NOAA-20 | 0.5450 | 90 | 120 | 15.98 | 4.39 |
| NOAA-21 | unavailable | 0 | 0 | — | — |

Default period 2020-09: H=5024.70, 11330 common daily cells, 7682 MODIS and 71542 quality-filtered VIIRS source observations. Unusual; 7 comparable other SP years.

## Amazon · Rondônia

Bounds: -64, -13, -60, -8. August case study · 2017–2024. Covered daily records: 253.

| VIIRS reference | Factor | Paired training days | Holdout days | RMSE cells/day | Bias cells/day |
|---|---:|---:|---:|---:|---:|
| S-NPP | 0.4562 | 124 | 124 | 89.51 | -12.89 |
| NOAA-20 | 0.4515 | 93 | 124 | 93.05 | -9.96 |
| NOAA-21 | unavailable | 0 | 0 | — | — |

Default period 2019-08: H=7482.62, 24471 common daily cells, 9269 MODIS and 72761 quality-filtered VIIRS source observations. Unusual; 7 comparable other SP years.

## Interpretation limits

File availability is not clear-sky sampling coverage. Source counts are not unique fires or burned area. Calibration is a ratio of area-level paired occupied-cell totals, not a validated cell-by-cell transfer model. Training-period examples are in-sample. NRT is provisional and recent days are incomplete.

Original sources, retrieval timestamps and SHA-256 checksums are listed in data/history/metadata.json. Private key strings are omitted.
