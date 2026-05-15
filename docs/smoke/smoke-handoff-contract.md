# Smoke Handoff Contract

Status: repo-local policy for MeshSplat renderer work.

This repo has two different smoke meanings. Do not hand one to the operator as if it were the other.

## Visual Smoke

Visual smoke asks whether the rendered image, capture, or comparison looks acceptable for the stated renderer-fidelity claim.

Use this label when a human or visual harness is expected to judge:

- visible renderer quality;
- visual regressions against a baseline;
- whether a screenshot supports or contradicts a visual repair;
- contact sheets, final-color captures, crops, diagnostic heatmaps, or side-by-side image comparisons.

Before handing off visual smoke, say what visual delta is expected. If the image is expected to remain bad, say that explicitly and name the narrow visual symptom under test.

## Telemetry Smoke

Telemetry smoke asks whether runtime evidence surfaces are alive, correctly labeled, and populated.

Use this label when the branch is being judged by:

- backend labels, effective renderer labels, and requested/effective arena state;
- nonempty trace arrays, anchor records, timing counters, or diagnostic metadata;
- observation manifests and smoke report fields;
- proving that a branch exposes evidence for later visual repair without claiming a visual repair itself.

A browser page may be opened for telemetry smoke, but the screenshot is only a catastrophic sanity check unless the handoff says otherwise. The operator is not being asked to judge visual quality from telemetry smoke.

## Handoff Requirements

Every smoke handoff should state:

- `Smoke kind:` `visual` or `telemetry`.
- `Decision requested:` the exact merge, rerun, or investigation decision.
- `Expected visual delta:` what should look different, or `none expected`.
- `Evidence surface:` the report, URL, screenshot, trace field, timing field, or manifest field that carries the claim.

If a branch is mergeable because it improves observability while preserving known-bad output, say so directly. Do not imply that a human should visually approve a telemetry branch.

## Merge Readiness

For telemetry-only branches, visual ugliness is not merge-blocking unless it is new catastrophic anti-evidence: blank canvas, wrong asset, wrong renderer, wrong backend, broken navigation, missing real-splat evidence, or a visual change outside the branch contract.

For visual branches, telemetry presence is not enough. The handoff must include the intended visual comparison class and the expected direction of movement.
