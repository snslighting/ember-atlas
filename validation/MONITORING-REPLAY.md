# Historical monitoring replay

Generated 2026-10-03T20:49:50.834Z. 743 actual source files. Work algorithm: evidence-grid-v2. Full measured results and source-catalog checksum: [monitoring-replay.json](monitoring-replay.json).

| Area | Month | Prefixes | Available acquisition bins | Triggered states | Percentile checks | Initial load | Median prefix | State changes | Non-persistence proxy |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| uzbekistan | 2021-04 | 12 | 315 | Elevated/Watch | 2718 | 13369 ms | 1814 ms | 7.0% | 91.9% |
| uzbekistan | 2024-01 | 12 | 98 | Elevated/Watch | 748 | 3324 ms | 184 ms | 1.6% | 89.6% |
| california | 2023-09 | 12 | 179 | Elevated/Watch | 1296 | 365 ms | 142 ms | 1.9% | 89.7% |
| california | 2020-09 | 12 | 298 | None | 0 | 7195 ms | 5467 ms | 0.0% | — |
| amazon | 2024-08 | 12 | 288 | Elevated/Watch | 2650 | 14999 ms | 5536 ms | 27.0% | 82.6% |
| amazon | 2023-08 | 12 | 250 | Elevated/Watch | 2602 | 4736 ms | 1315 ms | 10.1% | 92.3% |
| australia | 2023-12 | 12 | 167 | Elevated/Watch | 2568 | 1521 ms | 430 ms | 0.7% | 85.3% |
| australia | 2023-05 | 12 | 108 | Elevated/Watch | 1018 | 1107 ms | 120 ms | 0.6% | 79.9% |

Inference sees only detections at/before each checkpoint. Historical references and calibration training years must precede the checkpoint year. Calendar and period outputs are asserted not to reveal completed future days. Percentiles are checked against an independent midrank calculation from exported real reference-year values. Each run includes both first and last acquisition bins, with up to twelve stratified intermediate prefixes. Cases cover northern winter/spring, boreal September, Amazon August, southern autumn/summer, high and quieter activity, and insufficient-history states.

First triggers are checkpoint timestamps, so detection timing is interval-censored by this sampling and satellite observation gaps. No ignition-to-alert delay or wildfire anomaly accuracy can be inferred. Anomaly arithmetic agreement is not independent hazard accuracy. JSON includes individual timestamps/counts, sampled hours of repeated warnings, state-transition fractions and threshold sensitivity (75/80/90/95/99) using actual earlier-year references.

**False-warning frequency is not identifiable without independent wildfire/exposure ground truth.** The reported non-persistence proxy counts warning IDs that are not also warning IDs at the next sampled prefix, divided by sampled warning-ID exposures. It includes observation gaps, merges/splits, changed metrics and periods longer than 24 hours; it must not be presented as a wildfire false-positive rate. Alert persistence is observed between sampled acquisition boundaries, not continuous active burning.

Critical requires at least twenty comparable prior years, extreme percentile, separated persistence and multi-sensor evidence. Prepared post-VIIRS archives usually lack twenty comparable paired years; an absence of Critical is a conservative coverage limit, not an implementation failure. The thresholds are transparent prototype policies, not emergency-dispatch guidance.
