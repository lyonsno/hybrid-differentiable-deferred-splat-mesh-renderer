# Witness Scope

Lane: `witness-scope` in `metadosis/coordination-packets/meshsplat-renderer-fidelity-truth-table_2026-04-28.md`.

Status: investigation-only witness surface. This lane does not change production renderer behavior and does not change first-smoke pass/fail thresholds.

## Purpose

The current visual smoke harness can prove that a canvas is nonblank and that the page reports real Scaniverse splat evidence. That is necessary, but not enough for renderer-fidelity failures: a final blended image alone cannot say whether a bad frame came from field decode, projection geometry, alpha compositing, or near-plane clipping.

This lane adds a witness classification surface for reviewer-facing reports:

- keep the existing visual-smoke threshold policy untouched;
- collect optional structured witness data from `window.__MESH_SPLAT_WITNESS__`;
- classify the witness data into owner lanes and failure families;
- make missing witness data explicit instead of silently treating the final image as diagnostic truth.

## Concrete Artifact

Added `src/rendererFidelityProbes/witnessCapture.js`:

- `createWitnessCapture(...)` creates a browser-facing witness payload.
- `exposeWitnessCapture(...)` exposes it as `window.__MESH_SPLAT_WITNESS__`.
- The payload records the consumed input contracts: `field-autopsy` at `66b4ea26e5d81ac614f4452b8d21308c4e432e1a`, `slab-sentinel` at `ca96409`, with `conic-reckoner` and `alpha-ledger` still unsettled.

Added `scripts/visual-smoke/witness-diagnostics.mjs`:

- routes canonical-field anisotropy evidence to `conic-reckoner`;
- routes near-plane/pathological footprint evidence to `slab-sentinel`;
- routes noncanonical field metadata to `field-autopsy` before trusting projection symptoms;
- marks alpha overlap evidence as blocked until `alpha-ledger` settles its contract.

Updated `scripts/run-visual-smoke.mjs`:

- captures `window.__MESH_SPLAT_WITNESS__` into `pageEvidence.witness`;
- emits a `Renderer Fidelity Witness` section in `report.md`;
- preserves the existing nonblank and `--require-real-splat` behavior unchanged.

Added `tests/smoke/witness-diagnostics.test.mjs`:

- dessert-style anisotropy with canonical field metadata is classified as `projection-anisotropy -> conic-reckoner`, not as a field decode failure;
- Oakland-style foreground slab evidence is classified as `near-plane-slab -> slab-sentinel` while the visual smoke classification remains passing;
- invalid field metadata is classified first as `field-metadata-mismatch -> field-autopsy`, and projection anisotropy becomes blocked until the field evidence is fixed.

## Witness Payload Shape

Future overlays or probe pages should expose:

```js
window.__MESH_SPLAT_WITNESS__ = {
  contractInputs: {
    fieldAutopsy: "66b4ea26e5d81ac614f4452b8d21308c4e432e1a",
    slabSentinel: "ca96409",
    conicReckoner: "unsettled",
    alphaLedger: "unsettled",
  },
  field: {
    scaleSpace: "log",
    rotationOrder: "wxyz",
    opacitySpace: "unit",
    colorSpace: "sh_dc_rgb",
  },
  projection: {
    maxAnisotropyRatio: 17.5,
    suspiciousSplatCount: 34,
    sampleOriginalIds: [804, 1205, 1209],
  },
  slab: {
    statusCounts: {
      "axis-crosses-near-plane": 12,
      "pathological-footprint": 5,
      accepted: 1924,
    },
    maxMajorRadiusPx: 300000,
    footprintCapPx: 468,
    sampleOriginalIds: [18, 47, 91],
  },
};
```

The payload is optional. When absent, the smoke report now says the witness is missing rather than pretending the screenshot alone can classify the failure.

## Dessert Spatula Anisotropy

The useful witness would have been:

- field contract snapshot: `scaleSpace = log`, `rotationOrder = wxyz`, `opacitySpace = unit`, `colorSpace = sh_dc_rgb`;
- projection counters: maximum anisotropy ratio, count of suspiciously elongated splats, and a few original IDs;
- screenshot and image stats from the existing smoke harness.

With those facts together, the report can say:

- if field metadata is canonical, do not chase opacity, SH DC, scale activation, or quaternion order first;
- route the failure to `conic-reckoner` as `projection-anisotropy`;
- keep the final geometric conclusion pending until the conic contract lands.

That would have made the dessert spatula issue a projection witness immediately, instead of a four-way ambiguity between field decode, projection, alpha, and clipping.

## Oakland Foreground Slab

The useful witness would have been:

- slab-sentinel status counts for `axis-crosses-near-plane`, `pathological-footprint`, `reject-center`, and `accepted`;
- max projected major radius and the investigation cap used by slab-sentinel;
- sample original IDs for the splats causing the slab;
- unchanged first-smoke classification showing whether the canvas still passes real-splat smoke.

With those facts together, the report can say:

- the frame is a real nonblank Scaniverse smoke capture;
- the foreground slab is a clipping/LOD witness, not a reason to weaken smoke thresholds;
- route the failure to `slab-sentinel` as `near-plane-slab`;
- leave final near-plane response choices blocked on `conic-reckoner` for support geometry and `alpha-ledger` for opacity/energy compensation.

## Build-Ready Fixes

Build-ready, pending steward implementation mode:

- expose a debug-only witness overlay or query-flagged probe that writes `window.__MESH_SPLAT_WITNESS__` from renderer-side counters;
- add slab-sentinel status counters to that witness payload once the production classifier exists;
- add conic-reckoner anisotropy counters once the projection contract is settled;
- include sample original IDs in every witness family so screenshots can be tied back to source rows.

This lane intentionally does not wire production counters into `src/main.ts`, the shader, or renderer state because the packet remains investigation-only.

## Sibling Contracts Consumed

- `field-autopsy`: consumed `origin/cc/field-autopsy` at `66b4ea26e5d81ac614f4452b8d21308c4e432e1a` for canonical field witness labels: log scale, `wxyz` rotation, unit opacity, SH DC color.
- `slab-sentinel`: consumed `origin/cc/slab-sentinel` at `ca96409` for near-plane/pathological footprint status names and the idea that witness classification is separate from production response.
- `conic-reckoner`: not settled. Projection anisotropy is routed to this owner but not treated as final proof of a specific conic bug.
- `alpha-ledger`: not settled. Alpha/overlap witness data is reported as blocked rather than classified as a final compositing failure.

## Remaining Unknowns

- The final conic witness fields should be renamed or extended after `conic-reckoner` lands the projection contract.
- Alpha witness fields should wait for `alpha-ledger`; otherwise witness-scope would invent a compositing contract.
- The witness payload currently describes the diagnostic contract and report plumbing. A later build packet should decide where debug-only counters live in the production renderer and how they are toggled for screenshots.
