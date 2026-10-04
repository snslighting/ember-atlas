# Monitoring interface verification

Verified locally before publishing the early-warning upgrade:

- Actual NASA live and historical observations load; unavailable history stays explicit.
- Activity details include timeline, raw native provenance, history, and uncertainty.
- Chronological playback supports stepping, play/pause, and hides later observations.
- Month/week/day calendar resolution works; choosing September 2023 updates replay to that month.
- Rectangle and polygon selection filter actual observations; the on-map close button clears selection.
- English country search selects Uzbekistan; street imagery renders without console errors.
- Enlarged map fills the viewport, restores on close, and traps keyboard focus.
- Local California watchlist persists across reload and records the actual changed monitoring state.
- Desktop, tablet (820×1024), and phone (390×844) were checked; the embedded map has a nonzero width and the page fits the viewport.
- The last mobile recheck after the navigation refinement could not run because browser automatic approval review encountered an account usage limit. Earlier responsive checks passed.

Final validation: 95 tests pass; the production build succeeds. A privacy/resource audit scanned 1,632 public files, checked 31 static resources, and verified all 742 monitoring partition files. No NASA key is present in the public build, and private source paths are blocked locally. Work's harmonization source and documentation remain unchanged.

Historical replay evidence is in MONITORING-REPLAY.md and monitoring-replay.json: eight real case-study months, 96 prefix checkpoints, and 13,600 independent percentile calculations. Without independent incident ground truth, these checks do not establish wildfire prediction accuracy.

## Explorer restoration

Monitor now defaults to worldwide Live/NRT observations; Calendar is part of Monitor rather than a separate header destination. The shared country/region explorer and English label layer are reused from Sensors/Analyze. On the production preview, actual worldwide data loaded with 69,933 activity groups and 234,173 latest-acquisition footprint-support cells, without console errors. Kazakhstan → Kyzylorda → Kazakhstan and on-map clear were checked. Desktop sidebar collapse expands the map to full viewport width. Phone enlarged-map dimensions were 390×772 pixels with no horizontal overflow, and the tablet page (820 pixels) also stayed within the viewport. Analyze keeps its calendar below the map while expanded controls move into the sidebar. All 100 regression tests passed, including menu order and browser Back/Forward direction checks.

## Attention list and coordinate precision — 2026-10-04

The sidebar opens on Attention, with an independent Map controls view. Cards render in batches of 25, retaining the ranked 250-group cap and the full worldwide map. The queue uses the sidebar's single scroll surface, larger text and 44-pixel minimum action targets. Search includes coordinates; Show more, card inspection, map location and native-coordinate copying were checked on actual NASA records.

Coordinates now come from one deterministic latest source observation, retaining the original numeric latitude and longitude. They are explicitly labeled as a reported satellite pixel center, not an exact building/fire or an inferred group centroid. Missing source rows show a labeled representative center and no native-copy action. Details retain acquisition UTC, sensor, source ID in exports, scan/track pixel dimensions, and original raw-coordinate precision. A location marker focuses the selected source pixel; it does not claim a measured fire perimeter. Replay tests exclude later source coordinates.

The expandable Accuracy & detection limits section explains small house-fire limitations, nominal VIIRS/MODIS resolution, obscuration/overpass gaps, possible non-fire heat sources, confidence versus probability, partial historical coverage and acquisition versus refresh time. Ember Atlas has no independently validated incident-level fire accuracy percentage; the prior chronological/percentile checks are not that validation. Sources: NASA FIRMS [notes](https://firms.modaps.eosdis.nasa.gov/alerts/notes.php) and [MODIS attributes](https://firms.modaps.eosdis.nasa.gov/descriptions/FIRMS_MODIS_Firehotspots.html).

Production preview: 56,379 worldwide groups; 25 of the first 250 cards rendered initially. The coordinate 40.01484, 68.44353 was verified in the queue, selected detail, and map tooltip for a VIIRS source acquired 2026-10-03 22:18 UTC. Show more expanded the Uzbekistan list from 25 to 39, and searching that latitude returned one activity. Phone 390×844, tablet 820×1024 and desktop 1440×1000 checks passed without horizontal overflow; phone detail and limits expansion worked, and quick actions measured 44 pixels high. No browser console errors were reported.

All 103 tests pass. Public artifact audit: 1,633 files, 31 resources, 742 monitoring partitions; no private key or private source files exposed. Work's harmonization calculations and calibration remain unchanged.

### Worldwide ranking and immediate focus follow-up

A user observed that seasonal-priority ranking made the worldwide attention queue look concentrated in Uzbekistan. Worldwide Live/NRT now samples geographic buckets using current acquisition/trend evidence, leaving the scientific states and baseline coverage unchanged. The actual first entries span locations such as 17.98457, -94.52936; 28.58096, 17.33086; 51.03514, 2.28704; -3.04849, 112.08546; and -11.05066, -62.57382. Clicking the main activity card immediately created the marker at 17.98457, -94.52936 before the full raw-row detail report returned. Native source coordinates remain distinct from approximate group centers.

Summary evidence now displays from the completed snapshot immediately while original raw rows/timeline load separately; unavailable tabs and full export remain disabled until that report arrives. Competing selections discard older report responses. Routine refresh preserves a selected activity and does not recenter a map the user has panned. All 106 tests pass, including geographic representation despite 300 archived-area groups, source coordinate precision, replay cutoff, and global totals/map evidence remaining complete beyond the 250-card list cap.

Final phone targeting check: opening an activity keeps the 410-pixel map fully inside the viewport (top 267, bottom 677 at 390×844). Detail scrolling changes only the sidebar scroll position; a regression test prevents document-level scrolling from hiding the target.
