# Evil Orb Surviving-Shell Shader Coherence

Generated: 2026-06-29

## Scope

This report follows the operator correction that a front-shell / cropped-hemisphere asset shape does not excuse surviving side-shell pixels from shader incoherence when viewed directly. The question here is not whether the Evil Orb source is a partial shell; it is whether the renderer is doing additional normal/material damage to the side surface that remains.

## Implemented Changes

- Added view-grazing normal recovery:
  - Projection still writes source/baked normals when they are trustworthy.
  - The screen-space normal pass now reads source normals and blends toward depth-derived normals only when the source normal is grazing relative to the current view.
  - The recovered normal field is filtered back into the G-buffer normal texture so GTAO and deferred lighting consume the same stabilized normal field.

- Added normal-confidence material damping:
  - Projection writes `normalFacingConfidence` into a new projection-cache slot.
  - Tile compositing votes that confidence per pixel and stores it in the unused material alpha channel.
  - Deferred lighting uses low confidence to increase roughness and reduce metallic response, limiting IBL amplification where source normals are known to be view-unstable.

- Tuned recovered-normal smoothing:
  - Bilateral normal filter now uses a wider spatial kernel and looser normal similarity so recovered side normals are smoothed instead of preserving speckle-level discontinuities.

## Valid Evidence

Primary targeted side-view witnesses use the overlay asset center from Kaminos handoff telemetry:

- `postfix-smooth-targeted-plusx-side-default.png`
- `postfix-smooth-targeted-minusx-side-default.png`
- `postfix-smooth-targeted-plusx-side-force-screen.png`

Their paired JSON files record:

- renderer controls accepted by Kaminos / renderer telemetry,
- `normal.forceScreenSpace` state,
- camera position and target,
- `cropAppliedByRenderer: true`,
- source asset `evil_orb_final_composite.ply`.

Earlier diagonal witnesses are retained for comparison:

- `side-baseline-baked-ao-on.png`
- `side-screen-normals-ao-on.png`
- `side-baked-ao-off.png`
- `side-matte-baked-ao-on.png`

## Invalid / Weak Evidence

The `postfix-tight-explicit-*-side-*` captures targeted world origin, not the overlay asset center. They mostly looked at the backdrop and should not be used as evidence of side-shell rendering quality.

The first `postfix-close-*` captures are valid as renderer runs but less useful as acceptance evidence because they were produced by drag-derived diagonal camera poses rather than explicit side poses.

## Visual Read

The current patch reduces the worst "black/white metallic island" character compared with the original side-view symptom, and it avoids treating AO as the primary cause. However, the valid targeted side witnesses still show high-frequency breakup on the side shell. Forced screen-space normals look materially similar to the default recovered-normal path, which means the remaining artifact is not just baked-normal sign/coherence. It follows the frayed depth/geometry field of the cropped shell and remains amplified by material response.

This slice is therefore progress, not closure. The renderer now carries a better normal trust signal and has a bounded recovery path, but the side shell is still not visually coherent enough to call the issue solved.

## Verification

- `node --experimental-strip-types --experimental-transform-types --test tests/ibl.test.ts`
- `npx tsc --noEmit`
- `npm run test:renderer`
- `npm test`
- `git diff --check`

All listed commands passed on 2026-06-29.

## Residual

The next slice should not start with AO. The remaining target is side-shell depth/geometry normal stability:

- inspect the depth-derived normal field directly, ideally via a reusable Kaminos normal/debug capture,
- decide whether the renderer needs a confidence-aware spatial denoise pass for splat-derived depth normals,
- consider using splat footprint / opacity / depth-neighborhood stability as the confidence signal instead of only source-normal facing confidence.

Do not close this as an asset-shape-only problem. The source shape explains why there is a thin surviving side shell; it does not settle whether the renderer has made the surviving shell shade coherently.
