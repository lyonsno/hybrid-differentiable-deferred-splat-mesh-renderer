# Alpha Ledger: Compositing, Sort, and Opacity Contract

Packet: `metadosis/coordination-packets/meshsplat-renderer-fidelity-truth-table_2026-04-28.md`

Lane: `alpha-ledger`

Status: investigation-only contract and probe. No production renderer behavior is changed here.

## Finding

The current first-smoke renderer is internally consistent for simple overlap cases:

- CPU sort orders splat ids by ascending view-space depth, so more negative view-space `z` values draw first and nearer splats draw later.
- Equal-depth ties use ascending original id order. Because the blend state is source-over, the later equal-depth id visibly lands on top.
- The shader returns straight RGB plus alpha, not premultiplied RGB. The pipeline blend state uses `src-alpha` and `one-minus-src-alpha` for color, and `one` plus `one-minus-src-alpha` for alpha.
- Fragment alpha is `clamp(opacity, 0, 1) * exp(-2 * r2)`, where `r2 = dot(local, local)` inside the unit ellipse.
- The viewer clears to opaque `{ r: 0.02, g: 0.02, b: 0.04, a: 1 }` and configures the canvas as `alphaMode: "opaque"`, so first-smoke color evidence should be interpreted as straight source-over into an opaque dark background.

This makes ordering/compositing less likely than projection, field decode, or near-plane support projection as the cause of broad current artifacts. It does not make the current path production-ready; it only pins what the current path means for deterministic overlap witnesses.

## Executable Probe

Probe: `src/rendererFidelityProbes/alphaCompositing.js`

Tests: `tests/renderer/alphaCompositing.test.mjs`

The probe models exactly the renderer-visible arithmetic that matters for small overlap scenes:

- `classifySplatOrder` sorts synthetic layers with the current CPU sort contract: ascending depth, then ascending id for stable ties.
- `sourceOverStraightAlpha` models the WebGPU blend state when the shader emits straight color.
- `composeStraightAlphaBackToFront` composes the sorted layers over the first-smoke opaque clear color and returns both final color and transfer weights.
- `gaussianCoverageAlpha` models the shader opacity transfer for a single fragment.

The deterministic cases cover:

- Two-splat overlap: far red at alpha `0.5`, near blue at alpha `0.25`, expected color `[0.3825, 0.0075, 0.265]`.
- Three-splat overlap: red, green, blue at alphas `0.5`, `0.25`, `0.125`, expected transfer weights red `0.328125`, green `0.21875`, blue `0.125`, clear `0.328125`.
- Equal-depth ties: ids `0`, `1`, `2` draw in id order, so id `2` is visibly topmost.
- Opacity transfer: activated opacity is clamped and multiplied by `exp(-2 * r2)` before blending.
- Premultiplication guard: feeding premultiplied RGB into the current straight-alpha blend state visibly darkens color, so future shader changes must update the blend contract at the same time.

## Provisional Contract

For first-smoke accountability, use these overlap rules until a production implementation packet replaces them:

1. Sort transparent splats back-to-front in view space before drawing.
2. For equal-depth ties, preserve original id order by drawing lower ids first and higher ids later.
3. Treat renderer payload opacity as already activated unit-interval opacity.
4. Convert per-fragment coverage with `opacity * exp(-2 * r2)` inside the projected ellipse.
5. Feed straight RGB and straight alpha into a straight source-over blend state, or change both shader output and blend factors together if moving to premultiplied alpha.
6. Interpret first-smoke screenshots as colors composited into the opaque dark clear color, not as transparent premultiplied framebuffer values.

## Sibling Contracts Consumed

- `field-autopsy`: consumed `origin/cc/field-autopsy` at `66b4ea26e5d81ac614f4452b8d21308c4e432e1a`. Opacity entering WebGPU is already activated with sigmoid; color is displayable SH DC or byte RGB clamped to unit interval; scale remains log-space and quaternion order is `wxyz`. This lane does not redefine those fields.
- `slab-sentinel`: consumed `origin/cc/slab-sentinel` at `ca9640941179ce5e753e807af56a1facb0c408db`. Near-plane crossing and pathological footprint classification may eventually route splats to LOD or clamp behavior; that response must use this alpha contract to preserve visible opacity and avoid energy jumps.
- `conic-reckoner`: not available at probe time. This lane does not define projected support geometry; it only defines how overlapping fragments should combine once geometry emits fragments.
- `witness-scope`: not consumed yet. The probe cases are suitable as tiny synthetic witness scenes if that lane adds visual overlay or screenshot fixtures.

## Build-Ready Fixes

Production code should eventually expose this contract as renderer-side diagnostics rather than relying on document knowledge:

- Add a tiny synthetic overlap scene or debug mode that renders two and three centered splats with known colors/opacities and checks the sampled center pixel against the probe values.
- Expose the current blend contract in renderer evidence: sort order, tie policy, shader alpha mode, clear color, and whether the shader output is straight or premultiplied.
- If slab-sentinel's future LOD/clamp path changes splat footprint area, require an alpha compensation rule in the implementation packet. Clamping size without compensating opacity changes apparent energy.

These are build-ready recommendations, but they are intentionally not implemented here because this packet is investigation-only and production renderer rewrites remain forbidden.

## Remaining Unknowns

- The current CPU sort is a center-depth approximation. It is deterministic for the small overlap witnesses above, but it cannot solve order-dependent transparency where large anisotropic splats interpenetrate or cover different depth ranges across their footprint.
- No GPU screenshot witness was added in this lane. The arithmetic probe is deterministic and fast, but it does not prove browser format conversion or hardware blending on every adapter.
- Gamma is only pinned operationally: shader colors are numeric unit RGB, no explicit linear/sRGB conversion appears in this path, and the canvas is opaque. A future photometric renderer should make render-target color space explicit before comparing screenshot values as physical color.
- Opacity compensation for slab LOD/clamp remains open. The correct response depends on whether future production behavior preserves peak opacity, integrated alpha, or visual salience.
