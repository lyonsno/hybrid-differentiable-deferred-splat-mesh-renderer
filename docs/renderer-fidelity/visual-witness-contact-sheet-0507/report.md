# Visual Witness Contact Sheet

- Status: baseline witness captured; candidate sweep labels are not yet surfaced by the runtime, so this lane reports current `tile-local-visible` evidence plus crop-level close-ups rather than inventing a tile/cap sweep.
- Generated: 2026-05-07T19:11:29Z
- Worktree: `/private/tmp/hybrid-differentiable-defferred-splat-mesh-renderer-visual-witness-contact-sheet-0507`
- Source capture: `/private/tmp/visual-witness-contact-sheet-0507-dessert`
- Contact sheet: `contact-sheet.png`
- HTML sheet: `contact-sheet.html`

## What Is In The Sheet

- Plate baseline final color from the current fixed dessert witness.
- Tile-local visible final color from the same fixed dessert view.
- Coverage weight, accumulated alpha, transmittance, tile-ref density, and conic-shape debug captures.
- Rim-band and porous-body close-ups cropped from the current fixed dessert witness using the recorded witness crop rectangles.
- A note card for the Oakland table crop request: the Oakland asset path exists only in a diagnostic test fixture in this tree, so there is no checked-in Oakland capture to include here.

## Current Runtime Labels

- Plate renderer label: `plate`
- Tile-local renderer label: `tile-local-visible-gaussian-compositor`
- Tile-local debug labels: `tile-local-visible-debug-coverage-weight`, `tile-local-visible-debug-accumulated-alpha`, `tile-local-visible-debug-transmittance`, `tile-local-visible-debug-tile-ref-count`, `tile-local-visible-debug-conic-shape`
- Same asset: `true`
- Same viewport: `true`

## Crop Rectangles

- Rim band: `x=390, y=322, width=500, height=115`
- Porous body: `x=520, y=270, width=260, height=150`

## Evidence Notes

- The fixed dessert witness reports `77,221` retained tile refs after cap, `3,286,010` projected tile refs before cap, `1,937` capped tiles, and `1,952` saturated retained tiles.
- The current tile-local / plate changed-pixel ratio is `1.2435832112604295`, which stays below the witness boundary of `2`.
- The candidate tile/cap matrix from the packet still needs a runtime/sweep surface before a true sweep contact sheet can be rendered.

## Repro

1. Capture the fixed dessert witness on the local dev server.
2. Open `contact-sheet.html` in a browser.
3. Screenshot the page to `contact-sheet.png`.

