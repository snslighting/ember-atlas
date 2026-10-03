# Reproducible harmonization validation

Generated 2026-10-03T18:21:19.432Z. Training ends 2020; SP years 2021–2024 are held out. Region-specific seasonal calibration is compared with the prior regional count-ratio model. Reference is MODIS consistency, not ground truth. No claim of scientific correctness.

| Region | VIIRS slot | Held-out days | Baseline RMSE | Seasonal RMSE | Seasonal MAE | Seasonal bias |
|---|---|---:|---:|---:|---:|---:|
| uzbekistan | s | 2007 | 7.719 | 7.088 | 3.844 | -2.183 |
| uzbekistan | j | 2007 | 6.773 | 6.734 | 3.699 | -1.297 |
| california | s | 120 | 17.757 | 17.757 | 9.361 | 4.661 |
| california | j | 120 | 15.975 | 15.975 | 8.558 | 4.388 |
| amazon | s | 124 | 89.514 | 89.514 | 66.484 | -12.889 |
| amazon | j | 124 | 93.048 | 93.048 | 66.885 | -9.964 |

Raw source hashes and NASA URLs, 5/15/30 minute matching sensitivity, confidence distributions, FRP availability and association by FRP bin, footprint conservation, and current NRT coverage are in `harmonization-results.json`. Raw associations are stratified by region, year, and VIIRS product; Uzbekistan samples all seasons while the California and Amazon cases cover only September/August respectively.

Run `node validate-harmonization.js` from the repository. Cached `.history-source/manifest.json` and its checksummed CSV files, and built historical summaries are required. Do not reinterpret unmatched observations as omission/commission errors. Footprint support counts and legacy center-cell counts are different estimands; their difference alone is not an improvement score.

Limitations: detection-only CSVs lack clouds, clear-sky non-fire opportunities, exact pixel corners/azimuth, M13 parent pixel IDs and independent ground truth. No probability of fire, burned area, total daily FRP, emission estimate or operational early-warning accuracy is established. Seasonal coefficients are based on region/month daily counts, not fitted to individual spatial-temporal pairs; those matches are a separate diagnostic. No extrapolation of regional coefficients globally.