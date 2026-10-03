# End-to-end verification

Generated 2026-10-03T19:03:24.421Z. HTTP API and all ten source shards retrieved from localhost:3000. Both new modules and live/history/method routes return HTTP 200. California filtering retained 873 quality-selected raw detections and produced 859 detection-support cells. Derived CSV parsed back without losing source IDs, per-source contributions or uncertainty; raw views retain original observations. Evidence weights conserve the deduplicated detection count to 1e-7.

Run `node check-end-to-end.js` with the server running. The native browser's blob-download event did not arrive in the in-app browser test, so saving the CSV through that browser is unverified; the export handler returned without a browser error, and CSV generation/round-trip is verified here.
