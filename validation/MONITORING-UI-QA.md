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
