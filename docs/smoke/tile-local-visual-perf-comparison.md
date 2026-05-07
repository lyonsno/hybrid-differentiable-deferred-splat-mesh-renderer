# Tile-Local Visual/Perf Comparison Smoke

Lane: `visual-perf-witness`

The tile-local Gaussian compositor smoke compares three renderer modes in one report:

- Plate baseline: default renderer, expected label `plate`.
- Silent prepass: `renderer=tile-local`, expected label `plate+tile-local-prepass`, with positive tile-local refs while preserving plate presentation.
- Visible tile-local compositor: `renderer=tile-local-visible`, expected requested label `tile-local-visible`, explicit effective renderer reporting, positive tile-local refs or an explicit budget skip reason, image evidence distinguishable from plate, no bridge-block diagnostic label, and no catastrophic FPS collapse.

Run:

```bash
npm run smoke:visual:real -- --tile-local-comparison --out-dir /tmp/tile-local-visual-perf-comparison
```

The command writes `plate.png`, `tile-local-prepass.png`, `tile-local-visible.png`, `analysis.json`, and `report.md` into the output directory. It exits nonzero when the requested `tile-local-visible` request resolves to an unlabeled or quiet plate fallback, still reports the historical bridge diagnostic, lacks tile-local refs or explicit skip evidence, lacks real Scaniverse evidence, or drops below the comparison FPS floor.

The bridge diagnostic history is intentionally part of the witness. A current `tile-local-visible-bridge-diagnostic` capture is useful evidence, but it must fail this comparison once the real Gaussian compositor slice is being validated.
