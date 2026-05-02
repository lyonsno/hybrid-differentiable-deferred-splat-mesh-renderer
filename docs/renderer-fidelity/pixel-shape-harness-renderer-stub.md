# Pixel Shape Harness: Renderer Stub

## Status

Stub only. The `renderer-path-integration` lane must wire real synthetic fixture loading.

## What exists now

`src/main.ts` detects `?synthetic=shape-witness-<fixtureId>` and:

- Logs a console warning documenting that real fixture loading is not yet wired.
- Exposes `window.__MESH_SPLAT_SMOKE__.rendererLabel = "shape-witness"` and `shapeWitnessFixtureId` so the
  capture harness can identify that the query param was recognized.
- Does **not** set `ready: true`. The harness records `rendererStubWarning: true` in capture metadata
  until real fixture loading is wired.
- Renders the default Scaniverse asset as a placeholder (the real renderer path runs).

`scripts/visual-smoke/pixel-shape-capture.mjs` captures a 512×512 canvas screenshot from whatever the
renderer currently shows and returns `{ png: Buffer, metadata }` with `metadata.rendererStubWarning: true`.

## What the renderer-path-integration lane must do

1. Add a synthetic fixture loader that reads `?synthetic=shape-witness-<fixtureId>` and loads the
   fixture data provided by the `synthetic-shape-fixtures` lane instead of the Scaniverse asset.
2. Set `window.__MESH_SPLAT_SMOKE__.ready = true` once the fixture is rendered.
3. Remove or update `exposeShapeWitnessStubEvidence()` in `src/main.ts` to delegate to the real loader.

## URL query shape (metadata handshake)

```
?synthetic=shape-witness-isotropic-circle
?synthetic=shape-witness-edge-on-ribbon
?synthetic=shape-witness-rotated-ellipse
?synthetic=shape-witness-near-plane-slab
?synthetic=shape-witness-dense-foreground
```

## Capture contract

`captureShapeWitness(fixtureId, { baseUrl })` from `scripts/visual-smoke/pixel-shape-capture.mjs`:

- Launches real Chromium with `--enable-unsafe-webgpu`.
- Navigates to `<baseUrl>?synthetic=shape-witness-<fixtureId>`.
- Waits for `window.__MESH_SPLAT_SMOKE__.ready === true` or times out.
- Captures a 512×512 PNG screenshot of the canvas.
- Returns `{ png: Buffer, metadata: { fixtureId, rendererStubWarning, ... } }`.

The `png` buffer is the input to geometric assertion functions from the `pixel-geometry-assertions` lane.

## Anti-evidence (packet non-goals)

- Do not replace this stub with a CPU-only image generator.
- Do not call `rendererStubWarning: false` from the stub — it must signal its own incompleteness.
- Do not make the stub expose `ready: true` without actual fixture loading behind it.
