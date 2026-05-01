# Tile-Local Debug Heatmaps

The tile-local visible compositor now has query-flagged diagnostic modes that leave the default `renderer=tile-local-visible` compositor path as final color:

| URL parameter | Renderer label | Visualized quantity |
| --- | --- | --- |
| `tileDebug=coverage-weight` | `tile-local-visible-debug-coverage-weight` | Per-pixel sum of retained tile-ref coverage weight after conic evaluation. |
| `tileDebug=accumulated-alpha` | `tile-local-visible-debug-accumulated-alpha` | Accumulated alpha after source-over transfer. |
| `tileDebug=transmittance` | `tile-local-visible-debug-transmittance` | Remaining transmittance after the retained ordered refs. |
| `tileDebug=tile-ref-count` | `tile-local-visible-debug-tile-ref-count` | Per-tile retained ref density, normalized against the current 32-ref cap. |
| `tileDebug=conic-shape` | `tile-local-visible-debug-conic-shape` | Encoded conic major radius, minor radius, and anisotropy from the retained inverse conic. |

The diagnostic selector is packed into the previously unused frame-uniform slot and defaults to mode `0` (`final-color`). No alpha, coverage, ordering, tile retention, or conic production semantics change unless a diagnostic URL parameter is present.

The browser also exposes compact evidence at `window.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__` and mirrors it under `window.__MESH_SPLAT_SMOKE__.tileLocal.diagnostics`. The summary includes tile-ref density, coverage-weight range, estimated accumulated alpha/transmittance from retained tile refs, and inverse-conic major/minor shape extrema.

Batch smoke capture:

```bash
npm run smoke:visual:real -- --tile-local-diagnostics --out-dir /tmp/tile-local-debug-heatmaps
```

The report captures all five diagnostic modes and writes each screenshot plus the compact JSON evidence into the smoke analysis file.
