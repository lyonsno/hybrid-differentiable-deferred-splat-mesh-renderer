import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  OPERATOR_WITNESS_CAPTURE_IDS,
  buildOperatorWitnessLoopPlan,
  classifyOperatorWitnessLoop,
  summarizeOperatorWitnessTiming,
} from "../../scripts/visual-smoke/operator-witness-loop.mjs";

const BASE_URL =
  "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu";

test("operator witness loop plan captures whole render before close crops and interaction frames", () => {
  const plan = buildOperatorWitnessLoopPlan(BASE_URL);

  assert.deepEqual(
    plan.map((capture) => [capture.id, capture.evidenceRole, capture.expectedRendererLabel]),
    [
      [OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, "operator-visual", "tile-local-visible"],
      [OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, "operator-visual", "tile-local-visible"],
      [OPERATOR_WITNESS_CAPTURE_IDS.porousClose, "operator-visual", "tile-local-visible"],
      [OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, "operator-filmstrip", "tile-local-visible"],
      [OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, "operator-filmstrip", "tile-local-visible"],
    ]
  );
  assert.equal(plan[0].url, `${BASE_URL}&renderer=tile-local-visible`);
  assert.deepEqual(
    plan.map((capture) => capture.witnessView),
    ["default", "dessert-close", "dessert-porous-close", "dessert-porous-close", "dessert-porous-close"]
  );
  assert.ok(plan.every((capture) => capture.timeoutMs === 15000));
  assert.ok(plan.every((capture) => capture.timeoutCanvasClipMs === 1500));
  assert.ok(plan.every((capture) => capture.timeoutScreenshotMs === 15000));
  assert.deepEqual(plan[3].interactions, [{ type: "drag", button: "left", dx: -120, dy: 0 }]);
  assert.deepEqual(plan[4].interactions, [{ type: "drag", button: "left", dx: 120, dy: 0 }]);
});

test("operator witness loop plan keeps one canonical page route for warmed captures", () => {
  const plan = buildOperatorWitnessLoopPlan(BASE_URL);

  assert.deepEqual(
    [...new Set(plan.map((capture) => capture.url))],
    [`${BASE_URL}&renderer=tile-local-visible`]
  );
});

test("operator witness loop plan keeps trace diagnostics out of the visual route", () => {
  const plan = buildOperatorWitnessLoopPlan(`${BASE_URL}&traceAnchors=fresh-a@120,140:lacunar-hole`);

  assert.ok(plan.every((capture) => !new URL(capture.url).searchParams.has("traceAnchors")));
  assert.ok(plan.every((capture) => !new URL(capture.url).searchParams.has("traceAnchor")));
  assert.ok(plan.every((capture) => !new URL(capture.url).searchParams.has("presentationAnchors")));
});

test("operator witness loop plan defaults to the current GPU tile-local smoke route", () => {
  const plan = buildOperatorWitnessLoopPlan("http://127.0.0.1:5173/");

  for (const capture of plan) {
    const params = new URL(capture.url).searchParams;
    assert.equal(params.get("asset"), "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");
    assert.equal(params.get("arenaBackend"), "gpu");
    assert.equal(params.get("tileSizePx"), "16");
    assert.equal(params.get("maxRefsPerTile"), "256");
    assert.equal(params.get("renderer"), "tile-local-visible");
  }
});

test("operator witness loop plan overrides stale CPU or old tile budget query params", () => {
  const plan = buildOperatorWitnessLoopPlan(
    "http://127.0.0.1:5173/?asset=/other.json&arenaBackend=cpu&tileSizePx=6&maxRefsPerTile=32"
  );

  for (const capture of plan) {
    const params = new URL(capture.url).searchParams;
    assert.equal(params.get("asset"), "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");
    assert.equal(params.get("arenaBackend"), "gpu");
    assert.equal(params.get("tileSizePx"), "16");
    assert.equal(params.get("maxRefsPerTile"), "256");
  }
});

test("operator witness loop plan inherits caller timeout instead of enforcing a hidden cap", () => {
  const plan = buildOperatorWitnessLoopPlan(BASE_URL, { timeoutMs: 60000 });

  assert.ok(plan.every((capture) => capture.timeoutMs === 60000));
  assert.ok(plan.every((capture) => capture.timeoutScreenshotMs === 60000));
});

test("operator witness loop classifier requires all visual captures to be real nonblank Scaniverse evidence", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, { witnessView: "dessert-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, { witnessView: "dessert-porous-close" }),
    ],
    contactSheetPath: "smoke-reports/operator-witness/contact-sheet.png",
  });

  assert.equal(result.closeable, true);
  assert.equal(result.summary.status, "PASS");
  assert.equal(result.metrics.captureCount, 5);
  assert.equal(result.metrics.operatorVisualCaptures, 3);
  assert.equal(result.metrics.filmstripCaptures, 2);
  assert.equal(result.metrics.contactSheetPath, "smoke-reports/operator-witness/contact-sheet.png");
  assert.deepEqual(result.metrics.witnessViews, ["default", "dessert-close", "dessert-porous-close"]);
});

test("operator witness loop classifier fails when a visual frame times out or lacks real splat evidence", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
        realSplatEvidence: false,
        pageEvidence: { sourceKind: "", splatCount: 0, assetPath: "" },
      }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { harnessPassed: false }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight),
    ],
  });

  assert.equal(result.closeable, false);
  assert.deepEqual(
    result.findings.map((finding) => finding.kind),
    ["missing-real-splat-evidence", "capture-smoke-failed", "blank-capture", "missing-contact-sheet"]
  );
});

test("operator witness loop classifier preserves real Scaniverse evidence separately from timeout closure", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, {
        harnessPassed: false,
        realSplatEvidence: false,
        imageNonblank: true,
        pageEvidence: {
          sourceKind: "scaniverse_ply",
          splatCount: 94406,
          assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
        },
      }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, { witnessView: "dessert-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, { witnessView: "dessert-porous-close" }),
    ],
    contactSheetPath: "smoke-reports/operator-witness/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.deepEqual(result.findings.map((finding) => finding.kind), ["capture-smoke-failed"]);
});

test("operator witness loop classifier summarizes capture timing bottlenecks", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, {
        timing: {
          totalMs: 1200,
          stages: [
            { name: "apply-view", elapsedMs: 40 },
            { name: "readiness", elapsedMs: 900 },
            { name: "screenshot", elapsedMs: 260 },
          ],
        },
      }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
        witnessView: "dessert-close",
        timing: {
          totalMs: 1800,
          stages: [
            { name: "apply-view", elapsedMs: 60 },
            { name: "readiness", elapsedMs: 1600 },
            { name: "screenshot", elapsedMs: 140 },
          ],
        },
      }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, { witnessView: "dessert-porous-close" }),
    ],
    contactSheetPath: "smoke-reports/operator-witness/contact-sheet.png",
  });

  assert.equal(result.metrics.timing.totalCaptureMs, 3000);
  assert.deepEqual(result.metrics.timing.slowestCapture, {
    id: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    totalMs: 1800,
  });
  assert.deepEqual(result.metrics.timing.slowestStage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    name: "readiness",
    elapsedMs: 1600,
  });
});

test("operator witness timing summary preserves app-side frame stage attribution", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
      timing: {
        totalMs: 1800,
        stages: [{ name: "view-readiness", elapsedMs: 1600 }],
      },
      pageEvidence: {
        operatorWitness: {
          frameSerial: 7,
          frameTimings: {
            totalMs: 1420,
            stages: [
              { name: "alpha-density", elapsedMs: 20 },
              { name: "tile-local-scene-state", elapsedMs: 1310 },
              { name: "evidence-exposure", elapsedMs: 90 },
            ],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.slowestAppFrameStage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    name: "tile-local-scene-state",
    elapsedMs: 1310,
    frameSerial: 7,
  });
  assert.deepEqual(timing.slowestAppFrameTotal, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    elapsedMs: 1420,
    frameSerial: 7,
  });
});

test("operator witness timing summary exposes source-frontier pack substage attribution", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      timing: {
        totalMs: 4200,
        stages: [{ name: "view-readiness", elapsedMs: 3200 }],
      },
      pageEvidence: {
        operatorWitness: {
          frameSerial: 22,
          frameTimings: {
            totalMs: 3010,
            stages: [
              { name: "wgsl-source-frontier-pack/stream-projected-tile-refs", elapsedMs: 1210.4 },
              { name: "wgsl-source-frontier-pack/finalize-candidate-lists", elapsedMs: 348.2 },
              {
                name: "wgsl-source-frontier-pack/counts",
                elapsedMs: 0,
                detail: {
                  bucketCount: 471,
                  projectedTileRefs: 221440,
                  streamTileCandidateCount: 420000,
                  streamCoverageRejectCount: 198560,
                  streamPositiveCoverageCount: 221440,
                  candidateRecordCount: 91392,
                  supportSampleRecordCount: 18816,
                  supportSampleEvaluationCount: 3543040,
                  supportSampleSkipCount: 8230,
                  supportSampleSkippedEvaluationCount: 131680,
                  supportSamplePositiveWeightCount: 45612,
                  supportSampleRetainCount: 20491,
                  supportSampleGroupCount: 7530,
                },
              },
              { name: "wgsl-source-frontier-pack-candidate-source-inputs", elapsedMs: 1778.7 },
              { name: "evidence-exposure", elapsedMs: 3.4 },
            ],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.sourceFrontierPack.slowestSubstage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 22,
    name: "wgsl-source-frontier-pack/stream-projected-tile-refs",
    elapsedMs: 1210.4,
  });
  assert.deepEqual(timing.sourceFrontierPack.counts, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 22,
    bucketCount: 471,
    projectedTileRefs: 221440,
    streamTileCandidateCount: 420000,
    streamCoverageRejectCount: 198560,
    streamPositiveCoverageCount: 221440,
    candidateRecordCount: 91392,
    supportSampleRecordCount: 18816,
    supportSampleEvaluationCount: 3543040,
    supportSampleSkipCount: 8230,
    supportSampleSkippedEvaluationCount: 131680,
    supportSamplePositiveWeightCount: 45612,
    supportSampleRetainCount: 20491,
    supportSampleGroupCount: 7530,
  });
});

test("operator witness timing summary carries source-frontier stream inner ledger counters", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      pageEvidence: {
        operatorWitness: {
          frameSerial: 81,
          frameTimings: {
            totalMs: 3747.9,
            stages: [
              { name: "wgsl-source-frontier-pack/stream-projected-tile-refs", elapsedMs: 1884.8 },
              {
                name: "wgsl-source-frontier-pack/counts",
                elapsedMs: 0,
                detail: {
                  bucketCount: 1787,
                  projectedTileRefs: 664755,
                  streamSplatCount: 94406,
                  streamDenseRowCount: 38680,
                  streamSparseRowCount: 0,
                  streamTileCandidateCount: 1015779,
                  streamCoverageRejectCount: 351024,
                  streamPositiveCoverageCount: 664755,
                  coverageRetainCount: 400054,
                  retentionRetainCount: 181163,
                  occlusionRetainCount: 181163,
                  materializationSkipCount: 102304,
                  candidateRecordCount: 320071,
                  supportSampleEvaluationCount: 10636080,
                  supportSampleSkipCount: 419097,
                  supportSampleSkippedEvaluationCount: 6705552,
                  supportSamplePositiveWeightCount: 1182068,
                  supportSampleRetainCount: 487331,
                  supportSampleRecordCount: 223155,
                  supportSampleGroupCount: 28592,
                },
              },
            ],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.sourceFrontierPack.counts, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 81,
    bucketCount: 1787,
    projectedTileRefs: 664755,
    streamSplatCount: 94406,
    streamDenseRowCount: 38680,
    streamSparseRowCount: 0,
    streamTileCandidateCount: 1015779,
    streamCoverageRejectCount: 351024,
    streamPositiveCoverageCount: 664755,
    coverageRetainCount: 400054,
    retentionRetainCount: 181163,
    occlusionRetainCount: 181163,
    materializationSkipCount: 102304,
    candidateRecordCount: 320071,
    supportSampleEvaluationCount: 10636080,
    supportSampleSkipCount: 419097,
    supportSampleSkippedEvaluationCount: 6705552,
    supportSamplePositiveWeightCount: 1182068,
    supportSampleRetainCount: 487331,
    supportSampleRecordCount: 223155,
    supportSampleGroupCount: 28592,
  });
});

test("operator witness timing summary uses readiness-observed source-frontier pack frames", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      timing: {
        totalMs: 9200,
        stages: [{ name: "view-readiness", elapsedMs: 3986 }],
      },
      pageEvidence: {
        readinessDiagnosticsByStage: {
          viewReadiness: {
            observedAppFrame: {
              frameSerial: 45,
              totalMs: 3818,
              slowestStage: {
                name: "wgsl-source-frontier-pack-candidate-source-inputs",
                elapsedMs: 2076.2,
              },
              sourceFrontierPack: {
                slowestSubstage: {
                  frameSerial: 45,
                  name: "wgsl-source-frontier-pack/stream-projected-tile-refs",
                  elapsedMs: 1934.6,
                },
                counts: {
                  frameSerial: 45,
                  bucketCount: 1186,
                  projectedTileRefs: 903112,
                  candidateRecordCount: 320071,
                  supportSampleRecordCount: 196340,
                  supportSampleGroupCount: 18976,
                },
              },
            },
          },
        },
        operatorWitness: {
          frameSerial: 46,
          frameTimings: {
            totalMs: 22.5,
            stages: [
              { name: "wgsl-source-frontier-pack/stream-projected-tile-refs", elapsedMs: 8.2 },
              {
                name: "wgsl-source-frontier-pack/counts",
                elapsedMs: 0,
                detail: {
                  bucketCount: 12,
                  projectedTileRefs: 800,
                  candidateRecordCount: 256,
                },
              },
            ],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.sourceFrontierPack.slowestSubstage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 45,
    name: "wgsl-source-frontier-pack/stream-projected-tile-refs",
    elapsedMs: 1934.6,
  });
  assert.deepEqual(timing.sourceFrontierPack.counts, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 45,
    bucketCount: 1186,
    projectedTileRefs: 903112,
    candidateRecordCount: 320071,
    supportSampleRecordCount: 196340,
    supportSampleGroupCount: 18976,
  });
});

test("operator witness timing summary ties source-frontier counts to the slowest substage frame", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
      pageEvidence: {
        operatorWitness: {
          frameSerial: 17,
          frameTimings: {
            totalMs: 1350,
            stages: [
              { name: "wgsl-source-frontier-pack/stream-projected-tile-refs", elapsedMs: 900 },
              {
                name: "wgsl-source-frontier-pack/counts",
                elapsedMs: 0,
                detail: {
                  bucketCount: 900,
                  projectedTileRefs: 900000,
                  candidateRecordCount: 300000,
                },
              },
            ],
          },
        },
      },
    }),
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      timing: {
        stages: [{ name: "view-readiness", elapsedMs: 2600 }],
      },
      pageEvidence: {
        readinessDiagnosticsByStage: {
          viewReadiness: {
            observedAppFrame: {
              frameSerial: 44,
              totalMs: 2500,
              sourceFrontierPack: {
                slowestSubstage: {
                  frameSerial: 44,
                  name: "wgsl-source-frontier-pack/stream-projected-tile-refs",
                  elapsedMs: 2100,
                },
                counts: {
                  frameSerial: 44,
                  bucketCount: 700,
                  projectedTileRefs: 700000,
                  candidateRecordCount: 280000,
                },
              },
            },
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.sourceFrontierPack.slowestSubstage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 44,
    name: "wgsl-source-frontier-pack/stream-projected-tile-refs",
    elapsedMs: 2100,
  });
  assert.deepEqual(timing.sourceFrontierPack.counts, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 44,
    bucketCount: 700,
    projectedTileRefs: 700000,
    candidateRecordCount: 280000,
  });
});

test("operator witness timing summary exposes tile-local scene-state refresh substages", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
      pageEvidence: {
        operatorWitness: {
          frameSerial: 32,
          frameTimings: {
            totalMs: 4032.5,
            stages: [
              { name: "tile-local-scene-state-refresh/signature-check", elapsedMs: 3.2 },
              { name: "tile-local-scene-state-refresh/create-state", elapsedMs: 3918.4 },
              { name: "compact-source-stream-retention", elapsedMs: 2875.1 },
            ],
          },
        },
      },
    }),
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      timing: {
        stages: [{ name: "interaction-readiness", elapsedMs: 5100 }],
      },
      pageEvidence: {
        readinessDiagnosticsByStage: {
          interactionReadiness: {
            observedAppFrame: {
              frameSerial: 37,
              totalMs: 4960,
              tileLocalSceneStateRefresh: {
                slowestSubstage: {
                  frameSerial: 37,
                  name: "tile-local-scene-state-refresh/create-state",
                  elapsedMs: 4821.9,
                },
              },
            },
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.tileLocalSceneStateRefresh.slowestSubstage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 37,
    name: "tile-local-scene-state-refresh/create-state",
    elapsedMs: 4821.9,
  });
});

test("operator witness timing summary prefers nested scene-state create leaves over the parent stage", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      pageEvidence: {
        operatorWitness: {
          frameSerial: 41,
          frameTimings: {
            totalMs: 3110.2,
            stages: [
              { name: "tile-local-scene-state-refresh/signature-check", elapsedMs: 1.1 },
              { name: "tile-local-scene-state-refresh/create-state", elapsedMs: 3000.2 },
              {
                name: "tile-local-scene-state-refresh/create-state/source-frontier/create-tile-headers",
                elapsedMs: 2844.7,
              },
              {
                name: "tile-local-scene-state-refresh/create-state/source-frontier/create-bind-group",
                elapsedMs: 12.3,
              },
            ],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.tileLocalSceneStateRefresh.slowestSubstage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 41,
    name: "tile-local-scene-state-refresh/create-state/source-frontier/create-tile-headers",
    elapsedMs: 2844.7,
  });
});

test("operator witness timing summary preserves fallback count frame provenance", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
      pageEvidence: {
        operatorWitness: {
          frameSerial: 17,
          frameTimings: {
            totalMs: 1350,
            stages: [
              {
                name: "wgsl-source-frontier-pack/counts",
                elapsedMs: 0,
                detail: {
                  bucketCount: 900,
                  projectedTileRefs: 900000,
                  candidateRecordCount: 300000,
                },
              },
            ],
          },
        },
      },
    }),
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      timing: {
        stages: [{ name: "view-readiness", elapsedMs: 2600 }],
      },
      pageEvidence: {
        readinessDiagnosticsByStage: {
          viewReadiness: {
            observedAppFrame: {
              frameSerial: 44,
              totalMs: 2500,
              sourceFrontierPack: {
                slowestSubstage: {
                  frameSerial: 44,
                  name: "wgsl-source-frontier-pack/stream-projected-tile-refs",
                  elapsedMs: 2100,
                },
              },
            },
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.sourceFrontierPack.slowestSubstage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    frameSerial: 44,
    name: "wgsl-source-frontier-pack/stream-projected-tile-refs",
    elapsedMs: 2100,
  });
  assert.deepEqual(timing.sourceFrontierPack.counts, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    frameSerial: 17,
    bucketCount: 900,
    projectedTileRefs: 900000,
    candidateRecordCount: 300000,
  });
  assert.notEqual(
    timing.sourceFrontierPack.counts.frameSerial,
    timing.sourceFrontierPack.slowestSubstage.frameSerial,
    "fallback counts must carry their own frame provenance instead of looking same-frame",
  );
});

test("operator witness timing summary exposes operator-visible readiness latency above app frame stages", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, {
      timing: {
        totalMs: 3277,
        stages: [
          { name: "apply-view", elapsedMs: 1 },
          { name: "view-readiness", elapsedMs: 1148 },
          { name: "screenshot", elapsedMs: 34 },
        ],
      },
      pageEvidence: {
        operatorWitness: {
          frameSerial: 3,
          frameTimings: {
            stages: [
              { name: "wgsl-source-frontier-pack-candidate-source-inputs", elapsedMs: 875.7 },
            ],
          },
        },
      },
    }),
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, {
      timing: {
        totalMs: 14592,
        stages: [
          { name: "view-readiness", elapsedMs: 4976 },
          { name: "interactions", elapsedMs: 2 },
          { name: "interaction-readiness", elapsedMs: 5426 },
        ],
      },
    }),
  ]);

  assert.deepEqual(timing.slowestOperatorReadiness, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft,
    name: "interaction-readiness",
    elapsedMs: 5426,
  });
  assert.deepEqual(timing.operatorReadinessVsAppFrameStage, {
    status: "operator-readiness-exceeds-app-frame-stage",
    readinessMs: 5426,
    appFrameStageMs: 875.7,
    gapMs: 4550.3,
  });
});

test("operator witness timing summary compares readiness against whole app-frame total", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, {
      timing: {
        totalMs: 3277,
        stages: [
          { name: "apply-view", elapsedMs: 1 },
          { name: "view-readiness", elapsedMs: 3100 },
          { name: "screenshot", elapsedMs: 34 },
        ],
      },
      pageEvidence: {
        operatorWitness: {
          frameSerial: 3,
          frameTimings: {
            totalMs: 3300,
            stages: [
              { name: "wgsl-source-frontier-pack-candidate-source-inputs", elapsedMs: 875.7 },
              { name: "evidence-exposure", elapsedMs: 4 },
            ],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.operatorReadinessVsAppFrameTotal, {
    status: "app-frame-total-covers-operator-readiness",
    readinessCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.wholeRender,
    appFrameTotalCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.wholeRender,
    readinessMs: 3100,
    appFrameTotalMs: 3300,
    gapMs: -200,
  });
});

test("operator witness timing summary compares readiness against poll-observed app frame total", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      timing: {
        totalMs: 4700,
        stages: [{ name: "view-readiness", elapsedMs: 4554 }],
      },
      pageEvidence: {
        readinessDiagnosticsByStage: {
          viewReadiness: {
            observedAppFrame: {
              frameSerial: 46,
              totalMs: 4384.7,
              slowestStage: {
                name: "wgsl-source-frontier-pack-candidate-source-inputs",
                elapsedMs: 2543.9,
              },
            },
          },
        },
        operatorWitness: {
          frameSerial: 47,
          frameTimings: {
            totalMs: 17.5,
            stages: [{ name: "evidence-exposure", elapsedMs: 1 }],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.operatorReadinessVsAppFrameTotal, {
    status: "operator-readiness-exceeds-app-frame-total",
    readinessCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    appFrameTotalCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    readinessMs: 4554,
    appFrameTotalMs: 17.5,
    gapMs: 4536.5,
  });
  assert.deepEqual(timing.operatorReadinessVsObservedAppFrameTotal, {
    status: "operator-readiness-exceeds-app-frame-total",
    readinessCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    appFrameTotalCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    readinessMs: 4554,
    appFrameTotalMs: 4384.7,
    gapMs: 169.3,
    frameSerial: 46,
    slowestStage: {
      name: "wgsl-source-frontier-pack-candidate-source-inputs",
      elapsedMs: 2543.9,
    },
  });
});

test("operator witness timing summary prefers the slowest poll observed frame over the final poll frame", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      timing: {
        totalMs: 8200,
        stages: [{ name: "view-readiness", elapsedMs: 8010 }],
      },
      pageEvidence: {
        readinessDiagnosticsByStage: {
          viewReadiness: {
            observedAppFrame: {
              frameSerial: 39,
              totalMs: 23.6,
              slowestStage: { name: "evidence-exposure", elapsedMs: 1.2 },
            },
            slowestPoll: {
              pollDurationMs: 7771,
              pollCount: 3,
              observedAppFrame: {
                frameSerial: 38,
                totalMs: 7849.4,
                slowestStage: {
                  name: "wgsl-source-frontier-pack-candidate-source-inputs",
                  elapsedMs: 4701.3,
                },
              },
            },
          },
        },
        operatorWitness: {
          frameSerial: 40,
          frameTimings: {
            totalMs: 23.6,
            stages: [{ name: "evidence-exposure", elapsedMs: 1.2 }],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.operatorReadinessVsObservedAppFrameTotal, {
    status: "operator-readiness-exceeds-app-frame-total",
    readinessCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    appFrameTotalCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    readinessMs: 8010,
    appFrameTotalMs: 7849.4,
    gapMs: 160.6,
    frameSerial: 38,
    slowestStage: {
      name: "wgsl-source-frontier-pack-candidate-source-inputs",
      elapsedMs: 4701.3,
    },
  });
});

test("operator witness timing summary does not cover readiness with an unrelated app-frame total", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
      timing: {
        totalMs: 5300,
        stages: [{ name: "view-readiness", elapsedMs: 5000 }],
      },
      pageEvidence: {
        operatorWitness: {
          frameSerial: 11,
          frameTimings: {
            totalMs: 1000,
            stages: [{ name: "source-frontier-pack", elapsedMs: 800 }],
          },
        },
      },
    }),
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, {
      timing: {
        totalMs: 900,
        stages: [{ name: "view-readiness", elapsedMs: 700 }],
      },
      pageEvidence: {
        operatorWitness: {
          frameSerial: 12,
          frameTimings: {
            totalMs: 6000,
            stages: [{ name: "source-frontier-pack", elapsedMs: 5800 }],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.slowestAppFrameTotal, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
    elapsedMs: 6000,
    frameSerial: 12,
  });
  assert.deepEqual(timing.operatorReadinessVsAppFrameTotal, {
    status: "operator-readiness-exceeds-app-frame-total",
    readinessCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    appFrameTotalCaptureId: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    readinessMs: 5000,
    appFrameTotalMs: 1000,
    gapMs: 4000,
  });
});

test("operator witness timing summary includes session-level initial readiness", () => {
  const timing = summarizeOperatorWitnessTiming(
    [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, {
        timing: {
          totalMs: 3277,
          stages: [
            { name: "apply-view", elapsedMs: 1 },
            { name: "view-readiness", elapsedMs: 1148 },
          ],
        },
        pageEvidence: {
          operatorWitness: {
            frameSerial: 3,
            frameTimings: {
              stages: [
                { name: "wgsl-source-frontier-pack-candidate-source-inputs", elapsedMs: 875.7 },
              ],
            },
          },
        },
      }),
    ],
    {
      stages: [
        { name: "new-page", elapsedMs: 22 },
        { name: "initial-readiness", elapsedMs: 6120 },
      ],
    }
  );

  assert.deepEqual(timing.slowestOperatorReadiness, {
    captureId: "session",
    name: "initial-readiness",
    elapsedMs: 6120,
  });
  assert.deepEqual(timing.operatorReadinessVsAppFrameStage, {
    status: "operator-readiness-exceeds-app-frame-stage",
    readinessMs: 6120,
    appFrameStageMs: 875.7,
    gapMs: 5244.3,
  });
});

test("operator witness report prints the slowest app-side frame stage", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const reportStart = source.indexOf("function renderOperatorWitnessLoopReport");
  const reportEnd = source.indexOf("function renderOperatorTimingTable", reportStart);
  const reportSource = source.slice(reportStart, reportEnd);
  const formatterStart = source.indexOf("function formatSourceFrontierPackCounts");
  const formatterEnd = source.indexOf("function formatReadinessDiagnostics", formatterStart);
  const formatterSource = source.slice(formatterStart, formatterEnd);

  assert.match(reportSource, /Slowest app frame stage:/);
  assert.match(reportSource, /timing\.slowestAppFrameStage/);
  assert.match(reportSource, /Slowest app frame total:/);
  assert.match(reportSource, /timing\.slowestAppFrameTotal/);
  assert.match(reportSource, /Source-frontier pack slowest substage:/);
  assert.match(reportSource, /timing\.sourceFrontierPack\?\.slowestSubstage/);
  assert.match(reportSource, /Tile-local scene-state slowest substage:/);
  assert.match(reportSource, /timing\.tileLocalSceneStateRefresh\?\.slowestSubstage/);
  assert.match(reportSource, /Source-frontier pack counts:/);
  assert.match(reportSource, /formatSourceFrontierPackCounts\(timing\.sourceFrontierPack\?\.counts\)/);
  assert.match(formatterSource, /streamTileCandidates/);
  assert.match(formatterSource, /streamCoverageRejects/);
  assert.match(formatterSource, /materializationSkips/);
  assert.match(formatterSource, /supportSampleEvaluations/);
  assert.match(formatterSource, /supportSampleCandidateSkips/);
  assert.match(formatterSource, /supportSampleCandidateSkippedEvaluations/);
  assert.match(formatterSource, /supportSampleSkips/);
  assert.match(formatterSource, /supportSampleSkippedEvaluations/);
  assert.match(formatterSource, /supportSamplePositiveWeights/);
  assert.match(reportSource, /Operator readiness vs observed poll frame total:/);
  assert.match(reportSource, /timing\.operatorReadinessVsObservedAppFrameTotal/);
});

test("operator witness report prints operator readiness separately from app frame stage timing", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const reportStart = source.indexOf("function renderOperatorWitnessLoopReport");
  const reportEnd = source.indexOf("function renderOperatorTimingTable", reportStart);
  const reportSource = source.slice(reportStart, reportEnd);

  assert.match(reportSource, /Slowest operator readiness:/);
  assert.match(reportSource, /Operator readiness vs app frame stage:/);
  assert.match(reportSource, /operatorReadinessVsAppFrameStage/);
  assert.match(reportSource, /Operator readiness vs app frame total:/);
  assert.match(reportSource, /operatorReadinessVsAppFrameTotal/);
});

test("live stats overlay exposes app-frame latency instead of only GPU render timing", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const overlayStart = source.indexOf("// Stats overlay");
  const overlayEnd = source.indexOf("statsEl.textContent = statsText;", overlayStart);
  const overlaySource = source.slice(overlayStart, overlayEnd);
  const formatterSource = extractFunctionSource(source, "formatFrameTimingOverlay");
  const retainSource = extractFunctionSource(source, "shouldRetainFrameTimingOverlay");

  assert.match(
    overlaySource,
    /formatFrameTimingOverlay\(frameTiming\)/,
    "stats overlay should render app-frame timing from the live frame timing draft",
  );
  assert.match(
    overlaySource,
    /statsText \+= ` \| \$\{frameTimingOverlay\}`/,
    "stats overlay should append app-frame timing before the GPU-only timestamp labels",
  );
  assert.match(
    formatterSource,
    /app frame: \$\{roundRuntimeMetric\(performance\.now\(\) - timing\.startedAtMs\)\}ms/,
    "overlay app-frame timing should include wall elapsed since frame start",
  );
  assert.match(
    formatterSource,
    /slowest app stage:/,
    "overlay should name the slowest CPU-side frame stage",
  );
  assert.match(
    formatterSource,
    /source-frontier pack:/,
    "overlay should expose source-frontier pack cost separately from GPU render timing",
  );
  assert.match(
    formatterSource,
    /sourceFrontierPackMs = Math\.max\(sourceFrontierPackMs,\s*stage\.elapsedMs\)/,
    "source-frontier overlay timing should report the dominant pack stage instead of double-counting nested stages",
  );
  assert.doesNotMatch(
    formatterSource,
    /sourceFrontierPackMs \+= stage\.elapsedMs/,
    "source-frontier overlay timing must not exceed app-frame time by summing nested stages",
  );
  assert.match(
    source,
    /let recentSlowFrameTimingOverlay:\s*\{\s*readonly text: string;\s*readonly observedAtMs: number;\s*\} \| null = null/,
    "live HUD should retain the last slow app frame long enough for a human or settled screenshot to see it",
  );
  assert.match(
    retainSource,
    /FRAME_TIMING_OVERLAY_RETAIN_THRESHOLD_MS/,
    "recent-frame retention should have an explicit latency threshold",
  );
  assert.match(
    retainSource,
    /stage\.name\.startsWith\("wgsl-source-frontier-pack"\)/,
    "source-frontier pack frames should be retained even if later cheap frames overwrite the live overlay",
  );
  assert.match(
    overlaySource,
    /recent slow app frame:/,
    "stats overlay should print the retained slow frame separately from the current frame",
  );
});

test("live stats overlay times tile-local scene rebuild as operator-visible latency", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const frameSource = source.slice(
    source.indexOf("function frame("),
    source.indexOf("function createSortSettleState", source.indexOf("function frame(")),
  );
  const formatterSource = extractFunctionSource(source, "formatFrameTimingOverlay");

  assert.match(
    frameSource,
    /timeFrameStage\(\s*frameTiming,\s*"tile-local-scene-state-refresh"/,
    "tile-local rebuild must be a named frame stage instead of disappearing behind GPU render timing",
  );
  assert.match(
    frameSource,
    /ensureTileLocalSceneState\(/,
    "the named rebuild stage should enclose the tile-local state refresh path",
  );
  assert.match(
    formatterSource,
    /tileLocalSceneRefreshMs/,
    "HUD formatter should expose tile-local rebuild latency as a first-class operator-correlated number",
  );
  assert.match(
    formatterSource,
    /tile-local rebuild:/,
    "HUD text should name tile-local rebuild separately from source-frontier pack and GPU render timing",
  );
});

test("tile-local scene refresh records internal substages for operator latency forensics", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const ensureSource = extractFunctionSource(source, "ensureTileLocalSceneState");

  assert.match(
    ensureSource,
    /timeOptionalFrameStage\(\s*frameTiming,\s*"tile-local-scene-state-refresh\/signature-check"/,
    "signature freshness must be timed separately from state creation",
  );
  assert.match(
    ensureSource,
    /timeOptionalFrameStage\(\s*frameTiming,\s*"tile-local-scene-state-refresh\/create-state"/,
    "state creation must be timed as the dominant suspected scene-state wall",
  );
  assert.match(
    ensureSource,
    /timeOptionalFrameStage\(\s*frameTiming,\s*"tile-local-scene-state-refresh\/destroy-previous-state"/,
    "previous-state teardown must not be hidden inside the same opaque refresh total",
  );
});

test("source-frontier scene-state construction records leaf timings under create-state", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const sceneSource = extractFunctionSource(source, "createWgslProjectedSourceFrontierTileLocalSceneState");

  for (const stageName of [
    "tile-local-scene-state-refresh/create-state/source-frontier/project-splats",
    "tile-local-scene-state-refresh/create-state/source-frontier/estimate-ref-budget",
    "tile-local-scene-state-refresh/create-state/source-frontier/create-plan",
    "tile-local-scene-state-refresh/create-state/source-frontier/create-pipeline",
    "tile-local-scene-state-refresh/create-state/source-frontier/create-tile-headers",
    "tile-local-scene-state-refresh/create-state/source-frontier/create-ref-buffers",
    "tile-local-scene-state-refresh/create-state/source-frontier/create-bind-group",
    "tile-local-scene-state-refresh/create-state/source-frontier/source-depth-evidence",
    "tile-local-scene-state-refresh/create-state/source-frontier/diagnostics",
  ]) {
    assert.match(
      sceneSource,
      new RegExp(`timeOptionalFrameStage\\(\\s*frameTiming,\\s*"${stageName.replaceAll("/", "\\/")}"`),
      `${stageName} should be timed as a tile-local scene-state leaf`,
    );
  }
});

test("GPU arena scene-state construction records leaf timings under create-state", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuSource = extractFunctionSource(source, "createGpuArenaTileLocalSceneState");

  for (const stageName of [
    "tile-local-scene-state-refresh/create-state/gpu-arena/build-compact-source",
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-plan",
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-runtime",
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-pipeline",
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-ref-stream-state",
    "tile-local-scene-state-refresh/create-state/gpu-arena/create-bind-group",
    "tile-local-scene-state-refresh/create-state/gpu-arena/source-depth-evidence",
    "tile-local-scene-state-refresh/create-state/gpu-arena/diagnostics",
  ]) {
    assert.match(
      gpuSource,
      new RegExp(`timeOptionalFrameStage\\(\\s*frameTiming,\\s*"${stageName.replaceAll("/", "\\/")}"`),
      `${stageName} should be timed as a tile-local scene-state leaf`,
    );
  }
});

test("operator witness app frame timing routes requested GPU presentation through compact retained source runtime", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const ensureStart = source.indexOf("function ensureTileLocalSceneState");
  const ensureEnd = source.indexOf("function captureCurrentTileLocalSignature", ensureStart);
  const ensureSource = source.slice(ensureStart, ensureEnd);
  const gpuSource = extractFunctionSource(source, "createGpuArenaTileLocalSceneState");
  const dispatchStart = source.indexOf("const tileLocalComputePass = encoder.beginComputePass");
  const dispatchEnd = source.indexOf("tileLocalComputePass.end()", dispatchStart);
  const dispatchSource = source.slice(dispatchStart, dispatchEnd);

  assert.match(ensureSource, /footprintParams,\s*frameTiming/);
  assert.match(gpuSource, /buildCompactRetainedSourceForRuntime/);
  assert.match(gpuSource, /buildGpuArenaRetainedSourceConstructionEvidence\(compactSource\)/);
  assert.match(gpuSource, /createGpuTileContributorArenaRuntime/);
  assert.match(gpuSource, /compactRetainedSourceBudgetDiagnostics/);
  assert.doesNotMatch(gpuSource, /gpuLiveMaxTileRefs/);
  assert.doesNotMatch(gpuSource, /estimatedGpuLiveBudgetDiagnostics/);
  assert.match(dispatchSource, /gpuDispatchEnqueueStartedAtMs/);
  assert.match(dispatchSource, /tileLocalState\.gpuArenaRuntime\.dispatch\(tileLocalComputePass/);
  assert.match(dispatchSource, /tileLocalState\.pipeline\.dispatchComposite\(tileLocalComputePass/);
});

test("source-frontier evidence names shader-built compositor custody after CPU materialization removal", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const evidenceSource = extractFunctionSource(source, "buildWgslProjectedSourceFrontierConstructionEvidence");
  const sceneSource = extractFunctionSource(source, "createWgslProjectedSourceFrontierTileLocalSceneState");

  assert.doesNotMatch(
    sceneSource,
    /timeOptionalFrameStage\(\s*frameTiming,\s*"wgsl-source-frontier-production-election-retained-payload-cpu-materialize"/,
    "source-frontier route must not rebuild retained payloads on the CPU before compositor handoff",
  );
  assert.doesNotMatch(
    evidenceSource,
    /"wgsl-source-frontier-production-election-retained-payload-cpu-materialize"/,
    "retained-source evidence must not preserve the removed CPU retained-payload materialization owner",
  );
  assert.match(
    evidenceSource,
    /currentCompositorBinding:\s*"wgsl-projected-ref-stream-shader-built-current-compositor-source"/,
    "the source-frontier live route must name the shader-built compositor source as current custody",
  );
  assert.match(
    evidenceSource,
    /nextGpuOffloadStage = "live-wgsl-production-candidate-source-identity"/,
    "the next offload boundary should point at GPU candidate-source identity, not CPU retained-payload materialization",
  );
});

test("source-frontier evidence no longer names production-election ledger reuse before compositor handoff", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const evidenceSource = extractFunctionSource(source, "buildWgslProjectedSourceFrontierConstructionEvidence");
  const sceneSource = extractFunctionSource(source, "createWgslProjectedSourceFrontierTileLocalSceneState");

  assert.doesNotMatch(
    sceneSource,
    /timeOptionalFrameStage\(\s*frameTiming,\s*"wgsl-source-frontier-production-election-ledger-reuse"/,
    "source-frontier route must not run CPU production-election ledger reuse before compositor handoff",
  );
  assert.doesNotMatch(
    evidenceSource,
    /ledgerReuseStage|retainedPayloadCpuMaterializeStage/,
    "retained-source evidence must not keep removed CPU ledger/materialization stage aliases",
  );
  assert.match(
    evidenceSource,
    /cpuOwnedStages:\s*\[[\s\S]*"wgsl-source-frontier-project-splats"[\s\S]*"wgsl-source-frontier-estimate-ref-budget"[\s\S]*\]/,
    "retained-source evidence should keep only projection and ref-budget estimation as CPU-owned source-frontier stages",
  );
});

test("static dessert debug modes can publish compact ref readbacks without enabling heavy per-pixel probes", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const refStatsSource = extractFunctionSource(source, "enqueueTileLocalRefStatsReadback");
  const projectedStreamSource = extractFunctionSource(source, "enqueueWgslProjectedRefStreamReadback");
  const outputTextureSource = extractFunctionSource(source, "enqueueTileLocalOutputTextureReadback");
  const compositorInputSource = extractFunctionSource(source, "enqueueTileLocalCompositorInputReadback");
  const cpuReferenceSource = extractFunctionSource(source, "ensureCpuReferenceCompositorInputReadback");

  assert.doesNotMatch(refStatsSource, /state\.debugMode !== "final-color"/);
  assert.doesNotMatch(projectedStreamSource, /state\.debugMode !== "final-color"/);
  assert.match(outputTextureSource, /state\.debugMode !== "final-color"/);
  assert.match(compositorInputSource, /state\.debugMode !== "final-color"/);
  assert.match(cpuReferenceSource, /state\.debugMode !== "final-color"/);
});

test("source-frontier state leaves CPU retained compact contributors empty until live readback diagnostics", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const sourceFrontierSource = extractFunctionSource(source, "createWgslProjectedSourceFrontierTileLocalSceneState");
  const refreshSource = extractFunctionSource(source, "refreshTileLocalDiagnostics");

  assert.match(sourceFrontierSource, /runtimeContributors:\s*\[\]/);
  assert.match(sourceFrontierSource, /gpuArenaProjectedContributors:\s*\[\]/);
  assert.match(sourceFrontierSource, /gpuArenaProjectedConicSources:\s*splats/);
  assert.match(refreshSource, /runtimeConicSources:\s*state\.gpuArenaProjectedConicSources/);
  assert.doesNotMatch(sourceFrontierSource, /runtimeContributors:\s*compactSource\.retainedRecords/);
});

test("operator witness evidence distinguishes GPU arena consumption from retained-source construction ownership", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuSource = extractFunctionSource(source, "createGpuArenaTileLocalSceneState");
  const evidenceSource = extractFunctionSource(source, "buildGpuArenaRetainedSourceConstructionEvidence");
  const runtimeEvidenceSource = extractFunctionSource(source, "buildArenaRuntimeEvidence");
  const exposureStart = source.indexOf("function exposeTileLocalRuntimeEvidence");
  const exposureEnd = source.indexOf("function traceContributorListByAnchorId", exposureStart);
  const exposureSource = source.slice(exposureStart, exposureEnd);

  assert.match(gpuSource, /retainedSourceConstruction,/);
  assert.match(evidenceSource, /effectiveSourceBackend:\s*"deterministic-gpu-retention-carrier"/);
  assert.match(evidenceSource, /runtimeConsumerBackend:\s*"gpu-contributor-arena-runtime"/);
  assert.match(evidenceSource, /falseClosureGuard:\s*"gpu-retention-carrier-does-not-imply-wgsl-source-construction"/);
  assert.match(evidenceSource, /nextGpuOffloadStage:\s*"wgsl-projected-ref-stream"/);
  assert.match(runtimeEvidenceSource, /retainedSourceConstruction:\s*tileLocalState\?\.retainedSourceConstruction/);
  assert.match(exposureSource, /retainedSourceConstruction:\s*tileLocalState\.retainedSourceConstruction/);
});

test("operator witness compact source timing exposes internal construction stages", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const compactSourceStart = source.indexOf("function buildCompactRetainedSourceForRuntime");
  const compactSourceEnd = source.indexOf("function estimateCompactProjectedTileRefCount", compactSourceStart);
  const compactSource = source.slice(compactSourceStart, compactSourceEnd);

  assert.match(compactSource, /presentationScope,\s*frameTiming,\s*}:/);
  assert.match(compactSource, /rendererMetadata,\s*frameTiming,\s*}:/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-project-splats"/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-estimate-ref-budget"/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-stream-retention"/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-finalize-retained"/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-pixel-traces"/);
});

test("compact stream retention hot path avoids duplicate key scans", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const retainStart = source.indexOf("function compactRetainTopRecord");
  const retainEnd = source.indexOf("function compactMergedTileCandidateRecords", retainStart);
  const retainSource = source.slice(retainStart, retainEnd);

  assert.doesNotMatch(retainSource, /records\.some/);
  assert.doesNotMatch(retainSource, /compactProjectionRetentionRecordKey/);
});

test("compact stream retention caches capped-list worst records", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const bucketStart = source.indexOf("interface CompactStreamingTileBucket");
  const mergeEnd = source.indexOf("function streamCompactProjectedTileRefs", bucketStart);
  const retentionSource = source.slice(bucketStart, mergeEnd);

  assert.match(retentionSource, /interface CompactRetainedRecordList/);
  assert.match(retentionSource, /worstIndex:\s*number/);
  assert.match(retentionSource, /function compactRetainedRecordListWorstIndex/);
  assert.match(retentionSource, /compactRetainTopRecord\(\s*recordList:\s*CompactRetainedRecordList/);
  assert.match(retentionSource, /compareRecords\(record,\s*records\[recordList\.worstIndex\]\)\s*>=\s*0/);
});

test("compact stream retention avoids dense tile-x range allocation", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const streamStart = source.indexOf("function streamCompactProjectedTileRefs");
  const streamEnd = source.indexOf("function compactSourceBoundedTileRefCount", streamStart);
  const streamSource = source.slice(streamStart, streamEnd);

  assert.match(streamSource, /function compactStreamDenseTileXRange/);
  assert.match(streamSource, /for\s*\(\s*let tileX = minTileX;\s*tileX <= maxTileX;\s*tileX \+= 1\s*\)/);
  assert.doesNotMatch(streamSource, /compactSourceTileXRange\(minTileX,\s*maxTileX\)/);
});

test("compact stream retention precomputes covariance density parameters", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const streamStart = source.indexOf("function streamCompactProjectedTileRefs");
  const streamEnd = source.indexOf("function compactSourceBoundedTileRefCount", streamStart);
  const streamSource = source.slice(streamStart, streamEnd);
  const densityStart = source.indexOf("\nfunction compactSourceCovarianceDensity(");
  const clampStart = source.indexOf("function compactClamp", densityStart);
  const densitySource = source.slice(densityStart, clampStart);

  assert.match(streamSource, /const densityParams = compactSourceCovarianceDensityParams\(covariance\)/);
  assert.match(streamSource, /densityParams,/);
  assert.match(densitySource, /densityParams:\s*CompactSourceCovarianceDensityParams/);
  assert.doesNotMatch(densitySource, /covariance\.yy\s*\/\s*covariance\.determinant/);
  assert.doesNotMatch(densitySource, /Math\.sqrt\(covariance\.determinant\)/);
});

test("compact stream retention scores local conic support separately from tile integral coverage", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const streamStart = source.indexOf("function streamCompactProjectedTileRefs");
  const streamEnd = source.indexOf("function compactStreamDenseTileXRange", streamStart);
  const streamSource = source.slice(streamStart, streamEnd);
  const bucketStart = source.indexOf("interface CompactStreamingTileBucket");
  const bucketEnd = source.indexOf("function compactMergedTileCandidateRecords", bucketStart);
  const bucketSource = source.slice(bucketStart, bucketEnd);
  const contributorStart = source.indexOf("interface CompactRuntimeContributorTemplate");
  const contributorEnd = source.indexOf("function compactSourceAnchorTileIndexes", contributorStart);
  const contributorSource = source.slice(contributorStart, contributorEnd);

  assert.match(source, /const COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS = 4/);
  assert.match(bucketSource, /supportSampleRecords:\s*compactSupportSampleRecordLists\(\)/);
  assert.match(bucketSource, /function compactRetainSupportSampleRecords/);
  assert.match(bucketSource, /const sampleLimit = Math\.max\(1,\s*Math\.ceil\(maxRefsPerTile \/ \(samplesPerAxis \* samplesPerAxis \* 2\)\)\)/);
  assert.match(bucketSource, /const supportSampleWeight = compactSourceConicPixelWeight\(record,\s*\[x,\s*y\]\) \* record\.opacity/);
  assert.match(bucketSource, /const safeSupportLuminance = Math\.max\(0,\s*finiteOrZero\(supportLuminance\)\)/);
  assert.match(bucketSource, /const supportSampleRetentionWeight = supportSampleWeight \* safeSupportLuminance/);
  assert.match(bucketSource, /compareCompactProjectionSupportSamplePriority/);
  assert.match(streamSource, /const localSupportWeight = compactSourceTileLocalSupportWeight\(\{/);
  assert.match(streamSource, /onEntry\(\{ splatOrdinal, splat, tileIndex, tileX, tileY, coverageWeight, localSupportWeight \}\)/);
  assert.match(contributorSource, /const retentionSupportWeight = Math\.max\(safeCoverageWeight,\s*safeLocalSupportWeight\)/);
  assert.match(contributorSource, /retentionWeight:\s*retentionSupportWeight \* template\.opacity \* template\.luminance/);
  assert.match(contributorSource, /occlusionWeight:\s*retentionSupportWeight \* template\.opacity/);
});

test("source-frontier candidate packing reuses flattened support samples per bucket", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const sourceFrontierStart = source.indexOf("function buildWgslSourceFrontierCandidateSources");
  const sourceFrontierEnd = source.indexOf("function createWgslProjectedRefStreamState", sourceFrontierStart);
  const sourceFrontierSource = source.slice(sourceFrontierStart, sourceFrontierEnd);
  const gpuCarrierStart = source.indexOf("function buildCompactRetainedRecordsWithGpuCarrier");
  const gpuCarrierEnd = source.indexOf("function compactMergedTileCandidateRecords", gpuCarrierStart);
  const gpuCarrierSource = source.slice(gpuCarrierStart, gpuCarrierEnd);
  const mergeSource = extractFunctionSource(source, "compactMergedTileCandidateRecords");

  assert.match(
    sourceFrontierSource,
    /const\s+bucketSupportSampleRecordGroups\s*=\s*compactSupportSampleCandidateRecordGroups\(bucket\)/,
    "source-frontier packing should capture per-bucket support sample groups once",
  );
  assert.match(
    sourceFrontierSource,
    /const\s+bucketSupportSampleRecords\s*=\s*compactSupportSampleCandidateRecords\(bucketSupportSampleRecordGroups\)/,
    "source-frontier packing should flatten support samples once per bucket",
  );
  assert.match(
    sourceFrontierSource,
    /compactMergedTileCandidateRecords\(bucket,\s*bucketSupportSampleRecords\)/,
    "source-frontier merge must reuse the already-flattened support samples",
  );
  assert.match(
    gpuCarrierSource,
    /const\s+bucketSupportSampleRecordGroups\s*=\s*compactSupportSampleCandidateRecordGroups\(bucket\)/,
    "GPU carrier finalize should share the same once-per-bucket support sample materialization contract",
  );
  assert.match(
    gpuCarrierSource,
    /const\s+bucketSupportSampleRecords\s*=\s*compactSupportSampleCandidateRecords\(bucketSupportSampleRecordGroups\)/,
    "GPU carrier finalize should flatten support samples once per bucket",
  );
  assert.match(
    gpuCarrierSource,
    /compactMergedTileCandidateRecords\(bucket,\s*bucketSupportSampleRecords\)/,
    "GPU carrier merge must reuse the already-flattened support samples",
  );
  assert.doesNotMatch(
    mergeSource,
    /compactSupportSampleCandidateRecords\(bucket\)/,
    "merge must not silently rematerialize support samples after the caller already needs them",
  );
  assert.doesNotMatch(
    mergeSource,
    /for\s*\(\s*const record of\s*\[/,
    "merge must not allocate a synthetic mega-list before de-duplicating candidate rows",
  );
});

test("source-frontier support sample retention clones records only after capped-list acceptance", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const supportRetainStart = source.indexOf("function compactRetainSupportSampleRecords");
  const supportRetainEnd = source.indexOf("\nfunction compactRetainSupportSampleRecord(", supportRetainStart);
  const supportRetainSource = source.slice(supportRetainStart, supportRetainEnd);
  const supportRecordRetainStart = source.indexOf("\nfunction compactRetainSupportSampleRecord(");
  const supportRecordRetainEnd = source.indexOf("function compactCompareSupportSampleCandidateToRecord", supportRecordRetainStart);
  const supportRecordRetainSource = source.slice(supportRecordRetainStart, supportRecordRetainEnd);

  assert.ok(supportRetainStart >= 0, "support sample retention helper should exist");
  assert.ok(supportRetainEnd > supportRetainStart, "support sample retention source should be bounded");
  assert.ok(supportRecordRetainStart >= 0, "support sample record insertion helper should exist");
  assert.ok(supportRecordRetainEnd > supportRecordRetainStart, "support sample record insertion source should be bounded");

  assert.match(
    supportRetainSource,
    /compactRetainSupportSampleRecord\(\{\s*recordList:\s*bucket\.supportSampleRecords\[sampleIndex\],\s*record,\s*supportSampleWeight,\s*supportSampleRetentionWeight,\s*limit:\s*sampleLimit,\s*\}\)/,
    "support sample hot loop must route candidates through a helper that can reject before cloning",
  );
  assert.doesNotMatch(
    supportRetainSource,
    /\{\s*\.\.\.record,\s*supportSampleWeight,\s*supportSampleRetentionWeight\s*\}/,
    "support sample hot loop must not clone the full contributor before capped-list acceptance",
  );
  assert.doesNotMatch(
    supportRetainSource,
    /compactRetainTopRecord\(\s*bucket\.supportSampleRecords\[sampleIndex\]/,
    "generic retain helper requires a prebuilt record and should not own support sample hot-loop insertion",
  );
  assert.match(
    supportRecordRetainSource,
    /compactCompareSupportSampleCandidateToRecord\(\s*record,\s*supportSampleWeight,\s*supportSampleRetentionWeight,\s*records\[recordList\.worstIndex\],?\s*\)\s*>=\s*0/,
    "support sample helper must compare candidate priority against the cached worst row before allocation",
  );
  assert.match(
    supportRecordRetainSource,
    /const\s+supportRecord:\s*GpuTileContributorArenaProjectedContributor\s*=\s*\{\s*\.\.\.record,\s*supportSampleWeight,\s*supportSampleRetentionWeight,?\s*\}/,
    "support sample helper should clone only after the candidate is known to enter the retained list",
  );
});

test("source-frontier support sample retention skips bounded candidates before per-sample conic evals", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const sourceFrontierSource = extractFunctionSource(source, "buildWgslSourceFrontierCandidateSources");
  const supportRetainSource = extractFunctionSource(source, "compactRetainSupportSampleRecords");
  const skipSource = extractFunctionSource(source, "compactCanSkipSupportSampleRecords");
  const supportBoundSource = extractFunctionSource(source, "compactSourceTileLocalSupportWeight");
  const metricRectSource = extractFunctionSource(source, "compactSourceMinimumMahalanobis2InRect");
  const supportLoopIndex = supportRetainSource.indexOf("for (let sampleY");
  const skipIndex = supportRetainSource.indexOf("compactCanSkipSupportSampleRecords");
  const fullListGateIndex = skipSource.indexOf("records.length < limit");
  const zeroBoundIndex = skipSource.indexOf("supportSampleWeightUpperBound <= 1e-8");

  assert.match(
    sourceFrontierSource,
    /compactRetainSupportSampleRecords\(\{[\s\S]*?localSupportWeight:\s*finiteOrZero\(localSupportWeight\),/,
    "source-frontier support retention should pass the tile-local conic support upper bound",
  );
  assert.match(
    supportRetainSource,
    /readonly localSupportWeight:\s*number/,
    "support retention should require the existing per-ref local support bound",
  );
  assert.match(supportRetainSource, /const supportLuminance =/);
  assert.match(
    supportRetainSource,
    /const supportSampleWeightUpperBound = Math\.max\(0,\s*finiteOrZero\(localSupportWeight\)\) \* record\.opacity/,
  );
  assert.match(
    supportBoundSource,
    /compactSourceMinimumMahalanobis2InRect/,
    "support upper bound must minimize the conic metric over the whole tile rectangle, not clamp x/y independently",
  );
  assert.match(metricRectSource, /testVerticalEdge\(minDx\)/);
  assert.match(metricRectSource, /testVerticalEdge\(maxDx\)/);
  assert.match(metricRectSource, /testHorizontalEdge\(minDy\)/);
  assert.match(metricRectSource, /testHorizontalEdge\(maxDy\)/);
  assert.match(metricRectSource, /-\(densityParams\.invXy \* dx\) \/ densityParams\.invYy/);
  assert.match(metricRectSource, /-\(densityParams\.invXy \* dy\) \/ densityParams\.invXx/);
  assert.ok(skipIndex >= 0, "support retention should call the bounded skip helper");
  assert.ok(supportLoopIndex > skipIndex, "bounded skip must run before the per-sample conic loop");
  assert.match(supportRetainSource, /ledger\.supportSampleSkipCount \+= 1/);
  assert.match(supportRetainSource, /ledger\.supportSampleSkippedEvaluationCount \+= samplesPerAxis \* samplesPerAxis/);
  assert.match(skipSource, /if \(records\.length < limit\) \{\s*return false;\s*\}/);
  assert.ok(fullListGateIndex >= 0, "skip helper should check list saturation");
  assert.ok(zeroBoundIndex > fullListGateIndex, "zero-bound pruning must not bypass the full-list gate");
  assert.match(
    skipSource,
    /compactCompareSupportSampleCandidateToRecord\(\s*record,\s*supportSampleWeightUpperBound,\s*supportSampleRetentionWeightUpperBound,\s*records\[recordList\.worstIndex\],?\s*\)\s*<\s*0/,
    "skip helper must refuse to prune if the upper-bound candidate could beat any sample list worst row",
  );
});

test("source-frontier stream packing reuses per-splat contributor templates", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const sourceFrontierStart = source.indexOf("function buildWgslSourceFrontierCandidateSources");
  const sourceFrontierEnd = source.indexOf("function createWgslProjectedRefStreamState", sourceFrontierStart);
  const sourceFrontierSource = source.slice(sourceFrontierStart, sourceFrontierEnd);
  const streamStart = source.indexOf("function streamCompactProjectedTileRefs");
  const streamEnd = source.indexOf("function compactSourceBoundedTileRefCount", streamStart);
  const streamSource = source.slice(streamStart, streamEnd);
  const templateSource = source.slice(
    source.indexOf("interface CompactRuntimeContributorTemplate"),
    source.indexOf("function compactCoverageEntryToRuntimeContributor"),
  );

  assert.match(
    streamSource,
    /splatOrdinal/,
    "projected tile ref streaming should expose the source splat ordinal for allocation-free per-splat lookup",
  );
  assert.match(
    templateSource,
    /function compactRuntimeContributorTemplateForSplat/,
    "runtime contributor template construction should be a named pre-stream helper",
  );
  assert.match(
    templateSource,
    /function compactRuntimeContributorFromTemplate/,
    "runtime contributor materialization should reuse the precomputed static splat fields",
  );
  assert.match(
    sourceFrontierSource,
    /const contributorTemplates = frontierSource\.splats\.map\(\(splat\) => compactRuntimeContributorTemplateForSplat/,
    "source-frontier packing should precompute one contributor template per source splat",
  );
  assert.match(
    sourceFrontierSource,
    /onEntry\(\{ splatOrdinal, tileIndex, tileX, tileY, coverageWeight, localSupportWeight \}\)/,
    "source-frontier packing should consume the streaming splat ordinal instead of map-looking up by splat id",
  );
  assert.match(
    sourceFrontierSource,
    /const template = contributorTemplates\[splatOrdinal\][\s\S]*compactRuntimeContributorFromTemplate\(\{\s*template,/,
    "source-frontier packing should materialize projected contributors from the precomputed template",
  );
  assert.doesNotMatch(
    sourceFrontierSource,
    /new Map\(frontierSource\.splats\.map/,
    "source-frontier packing should not allocate a splat-index lookup map in the stream hot path",
  );
  assert.doesNotMatch(
    sourceFrontierSource,
    /compactCoverageEntryToRuntimeContributor\(\{\s*entry:/,
    "source-frontier packing should not rebuild static contributor fields from coverage entries per projected tile ref",
  );
});

test("source-frontier stream packing uses indexed tile buckets instead of hot-path Map lookups", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const sourceFrontierStart = source.indexOf("function buildWgslSourceFrontierCandidateSources");
  const sourceFrontierEnd = source.indexOf("function createWgslProjectedRefStreamState", sourceFrontierStart);
  const sourceFrontierSource = source.slice(sourceFrontierStart, sourceFrontierEnd);
  const bucketSource = source.slice(
    source.indexOf("interface CompactStreamingTileBucket"),
    source.indexOf("function compactRetainedRecordList"),
  );

  assert.match(
    bucketSource,
    /type CompactStreamingTileBucketStore =/,
    "source-frontier stream should have an indexed tile-bucket store for fixed tile-index domains",
  );
  assert.match(
    sourceFrontierSource,
    /const buckets = compactStreamingTileBucketStore\(frontierSource\.tileCount\)/,
    "source-frontier candidate packing should allocate indexed bucket storage once per frame",
  );
  assert.match(
    sourceFrontierSource,
    /compactStreamingTileBucket\(buckets,\s*tileIndex\)/,
    "projected tile refs should address buckets directly by tile index",
  );
  assert.match(
    sourceFrontierSource,
    /for \(const bucket of compactStreamingTileBucketValues\(buckets\)\)/,
    "finalization should iterate only populated indexed buckets",
  );
  assert.doesNotMatch(
    sourceFrontierSource,
    /const buckets = new Map<number, CompactStreamingTileBucket>\(\)/,
    "source-frontier hot path should not pay Map lookup overhead for tile-indexed buckets",
  );
});

test("source-frontier stream gates capped-list admission before projected contributor materialization", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const sourceFrontierSource = extractFunctionSource(source, "buildWgslSourceFrontierCandidateSources");
  const admissionSource = extractFunctionSource(source, "compactSourceFrontierCandidateAdmission");
  const sourceFrontierAdmissionIndex = sourceFrontierSource.indexOf("compactSourceFrontierCandidateAdmission");
  const materializeIndex = sourceFrontierSource.indexOf("compactRuntimeContributorFromTemplate");

  assert.ok(
    sourceFrontierAdmissionIndex >= 0,
    "source-frontier hot path should run a scalar capped-list admission gate",
  );
  assert.ok(
    materializeIndex > sourceFrontierAdmissionIndex,
    "source-frontier hot path must decide admission before building the full projected contributor object",
  );
  assert.match(
    sourceFrontierSource,
    /if \(!admission\.needsMaterialization\) \{\s*streamLedger\.materializationSkipCount \+= 1;\s*return;\s*\}/,
    "source-frontier hot path should skip record materialization when the candidate cannot alter any retained source pool",
  );
  assert.match(
    admissionSource,
    /compactCandidateCanEnterCoverageRecordList/,
    "admission gate must preserve coverage candidate-source semantics",
  );
  assert.match(
    admissionSource,
    /compactCandidateCanEnterRetentionRecordList/,
    "admission gate must preserve retention-priority candidate-source semantics",
  );
  assert.match(
    admissionSource,
    /compactCandidateCanEnterOcclusionRecordList/,
    "admission gate must preserve occlusion-priority candidate-source semantics",
  );
  assert.match(
    admissionSource,
    /compactCanSkipSupportSampleCandidate/,
    "admission gate must still account for the support-sample upper-bound pools before pruning",
  );
});

test("source-frontier stream gates support-sample election separately from materialization", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const sourceFrontierSource = extractFunctionSource(source, "buildWgslSourceFrontierCandidateSources");
  const admissionSource = extractFunctionSource(source, "compactSourceFrontierCandidateAdmission");
  const supportRetainIndex = sourceFrontierSource.indexOf("compactRetainSupportSampleRecords");
  const supportGateIndex = sourceFrontierSource.indexOf("admission.needsSupportSamples");

  assert.match(
    sourceFrontierSource,
    /const admission = compactSourceFrontierCandidateAdmission\(\{/,
    "source-frontier hot path should compute materialization and support-sample admission together",
  );
  assert.match(
    sourceFrontierSource,
    /if \(!admission\.needsMaterialization\) \{\s*streamLedger\.materializationSkipCount \+= 1;\s*return;\s*\}/,
    "materialization skip should remain controlled by the materialization admission bit",
  );
  assert.ok(
    supportGateIndex >= 0,
    "source-frontier hot path should branch on the support-sample admission bit",
  );
  assert.ok(
    supportRetainIndex > supportGateIndex,
    "support-sample election should be guarded before entering the per-sample conic loop",
  );
  assert.match(
    sourceFrontierSource,
    /if \(admission\.needsSupportSamples\) \{\s*compactRetainSupportSampleRecords\(\{/,
    "support sampling should run only when the upper-bound support election can still affect a sample list",
  );
  assert.match(
    sourceFrontierSource,
    /else \{\s*streamLedger\.supportSampleCandidateSkipCount \+= 1;\s*streamLedger\.supportSampleCandidateSkippedEvaluationCount \+= COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS \* COMPACT_SOURCE_RETENTION_SUPPORT_SAMPLES_PER_AXIS;\s*\}/,
    "support-sample admission skips should remain visible in the existing skipped-evaluation counters",
  );
  assert.match(
    admissionSource,
    /needsMaterialization:/,
    "admission helper should expose materialization admission separately",
  );
  assert.match(
    admissionSource,
    /needsSupportSamples:/,
    "admission helper should expose support-sample admission separately",
  );
});

test("compact finalize retention routes bounded priority candidate lists through the GPU carrier", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const electionSource = readFileSync(new URL("../../src/compactRetentionElection.js", import.meta.url), "utf8");
  const compactSourceStart = source.indexOf("function buildCompactRetainedSourceForRuntime");
  const compactSourceEnd = source.indexOf("function estimateCompactProjectedTileRefCount", compactSourceStart);
  const compactSource = source.slice(compactSourceStart, compactSourceEnd);

  assert.match(compactSource, /buildCompactRetainedRecordsWithGpuCarrier/);
  assert.match(source, /buildProjectionRetentionArena\(\{/);
  assert.match(source, /coverageRecords,/);
  assert.match(source, /retentionRecords,/);
  assert.match(source, /occlusionRecords,/);
  assert.match(source, /supportSampleRecords,/);
  assert.match(source, /supportSampleRecordGroups,/);
  assert.match(source, /buildDeterministicGpuTileProjectionRetentionArena,/);
  assert.match(source, /compareCompactProjectionSupportSamplePriority,/);
  assert.match(electionSource, /const SUPPORT_SAMPLE_FINAL_FRACTION = 0\.25/);
  assert.match(electionSource, /const priorityTarget = maxRefsPerTile - supportTarget/);
  assert.match(electionSource, /const coverageRecords = candidateSources\?\.coverageRecords \?\? records/);
  assert.doesNotMatch(electionSource, /const supportGlobalTarget = supportSampleGroups\.length > 0/);
  assert.doesNotMatch(electionSource, /maxRefsPerTile - Math\.max\(16,\s*Math\.floor\(maxRefsPerTile \* 0\.125\)\)/);
});

test("compact finalize retention uses non-string full-identity keys", () => {
  const source = readFileSync(new URL("../../src/compactRetentionElection.js", import.meta.url), "utf8");
  const keyStart = source.indexOf("function compactProjectionRetentionRecordKey");
  const keyEnd = source.indexOf("function finiteOrZero", keyStart);
  const keySource = source.slice(keyStart, keyEnd);
  const balancedStart = source.indexOf("function compactProjectionRoundRobinSelect");
  const balancedEnd = source.indexOf("function compactProjectionBackfillRetentionRecords", balancedStart);
  const balancedSource = source.slice(balancedStart, balancedEnd);

  assert.match(keySource, /function compactProjectionRetentionRecordKey\([^)]*\)/);
  assert.match(keySource, /BigInt\(contributor\.tileIndex\)\s*<<\s*64n/);
  assert.match(keySource, /BigInt\(contributor\.splatIndex\)\s*<<\s*32n/);
  assert.match(keySource, /BigInt\(contributor\.originalId\)/);
  assert.doesNotMatch(keySource, /`/);
  assert.doesNotMatch(balancedSource, /`\$\{poolIndex\}:/);
});

test("operator witness loop classifier rejects otherwise-valid captures on stale CPU or 6px routes", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, { arenaBackend: "cpu", tileSizePx: "6" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, { witnessView: "dessert-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, { witnessView: "dessert-porous-close" }),
    ],
    contactSheetPath: "smoke-reports/operator-witness/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.deepEqual(
    result.findings.map((finding) => finding.kind),
    ["operator-route-fallback", "operator-route-fallback"]
  );
});

test("visual smoke CLI exposes an operator witness loop batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--operator-witness-loop/);
  assert.match(source, /runOperatorWitnessLoop/);
  assert.match(source, /buildOperatorWitnessLoopPlan\(baseUrl, \{ timeoutMs: options\.timeoutMs \}\)/);
});

test("visual smoke CLI routes both initial and post-interaction readiness timeouts into reports", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);
  const initialWait = frameSource.indexOf("waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, timeoutMs, {");
  const interactionWait = frameSource.indexOf("applyCaptureInteractions", initialWait + 1);
  const catchStart = frameSource.indexOf("} catch (error) {", initialWait);
  const routedFailure = frameSource.indexOf("captureTimeoutFailureWithRoute", catchStart);

  assert.ok(initialWait > 0);
  assert.ok(interactionWait > initialWait);
  assert.ok(catchStart > interactionWait);
  assert.ok(routedFailure > catchStart);
});

test("operator witness readiness polling uses the capture timeout instead of the 1s generic evidence cap", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const waitStart = source.indexOf("async function waitForVisualSmokeCaptureReady");
  const waitEnd = source.indexOf("function operatorWitnessReadinessMatches", waitStart);
  const waitSource = source.slice(waitStart, waitEnd);

  assert.match(waitSource, /collectReadinessEvidenceWithTimeout\(page, timeoutMs\)/);
  assert.doesNotMatch(waitSource, /collectPageEvidenceWithTimeout\(page, timeoutMs\)/);
});

test("operator witness readiness polling uses compact readiness evidence before full settled evidence", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const waitStart = source.indexOf("async function waitForVisualSmokeCaptureReady");
  const waitEnd = source.indexOf("function describeVisualSmokeReadiness", waitStart);
  const waitSource = source.slice(waitStart, waitEnd);
  const collectorStart = source.indexOf("async function collectReadinessEvidence");
  const collectorEnd = source.indexOf("async function collectReadinessEvidenceWithTimeout", collectorStart);
  const collectorSource = source.slice(collectorStart, collectorEnd);
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(waitSource, /collectReadinessEvidenceWithTimeout\(page, timeoutMs\)/);
  assert.match(collectorSource, /readinessEvidence:\s*\{/);
  assert.match(collectorSource, /perPixelFinalColorAccumulation:\s*Array\.isArray/);
  assert.doesNotMatch(collectorSource, /\.\.\.smoke/);
  assert.doesNotMatch(collectorSource, /bodyText/);
  assert.match(frameSource, /collectPageEvidenceWithTimeout\(page, timeoutMs\)/);
});

test("operator witness readiness polling records poll diagnostics on returned evidence", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const waitStart = source.indexOf("async function waitForVisualSmokeCaptureReady");
  const waitEnd = source.indexOf("function describeVisualSmokeReadiness", waitStart);
  const waitSource = source.slice(waitStart, waitEnd);

  assert.match(waitSource, /let pollCount = 0/);
  assert.match(waitSource, /const readinessPolls = \[\]/);
  assert.match(waitSource, /pollCount\+\+/);
  assert.match(waitSource, /const pollStartedAt = Date\.now\(\)/);
  assert.match(waitSource, /pollDurationMs/);
  assert.match(waitSource, /describeVisualSmokeReadiness\(lastEvidence,\s*\{/);
  assert.match(waitSource, /readinessPolls\.push/);
  assert.match(waitSource, /summarizeReadinessPollHistory\(readinessPolls\)/);
  assert.match(waitSource, /readinessDiagnostics/);
  assert.match(waitSource, /return lastEvidence/);
  assert.match(waitSource, /error\.readinessDiagnostics = lastEvidence\.readinessDiagnostics/);
});

test("operator witness readiness diagnostics name blocker classes", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const tileLocalComparisonSource = readFileSync(
    new URL("../../scripts/visual-smoke/tile-local-comparison.mjs", import.meta.url),
    "utf8",
  );
  const helperStart = source.indexOf("function describeVisualSmokeReadiness");
  const helperEnd = source.indexOf("function tileLocalRetainedRefs", helperStart);
  const helperSource = source.slice(helperStart, helperEnd);

  assert.match(helperSource, /visualSmokeCaptureReadinessBlockers/);
  assert.match(tileLocalComparisonSource, /smoke-ready-flag-not-true/);
  assert.match(helperSource, /operator-witness-view-mismatch/);
  assert.match(helperSource, /operator-witness-revision-pending/);
  assert.match(helperSource, /tile-local-diagnostics-missing/);
  assert.match(helperSource, /tile-local-retained-refs-missing/);
  assert.match(helperSource, /tile-local-ref-density-missing/);
  assert.match(helperSource, /pollCount/);
  assert.match(helperSource, /elapsedMs/);
  assert.match(helperSource, /failedPolls/);
  assert.match(helperSource, /lastFailedBlockers/);
  assert.match(helperSource, /slowestPoll/);
});

test("operator witness report renders readiness diagnostics per capture", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const reportStart = source.indexOf("function renderOperatorWitnessLoopReport");
  const reportEnd = source.indexOf("function renderGpuLiveParityMugshotReport", reportStart);
  const reportSource = source.slice(reportStart, reportEnd);
  const formatterStart = source.indexOf("function formatReadinessDiagnostics");
  const formatterEnd = source.indexOf("function printSummary", formatterStart);
  const formatterSource = source.slice(formatterStart, formatterEnd);

  assert.match(reportSource, /Readiness diagnostics:/);
  assert.match(reportSource, /formatReadinessDiagnostics\(capture\.pageEvidence\.readinessDiagnostics\)/);
  assert.match(formatterSource, /failed=/);
  assert.match(formatterSource, /lastFailed=/);
  assert.match(formatterSource, /slowestPoll=/);
  assert.match(formatterSource, /source=/);
  assert.match(formatterSource, /observedFrame=/);
  assert.match(formatterSource, /observedFrameTotal=/);
  assert.match(formatterSource, /observedFrameSlowestStage=/);
  assert.match(formatterSource, /slowestPollObservedFrameTotal=/);
  assert.match(formatterSource, /slowestPollObservedFrameSlowestStage=/);
});

test("operator witness session preserves initial readiness diagnostics by stage", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);
  const loopStart = source.indexOf("async function runOperatorWitnessLoop");
  const loopEnd = source.indexOf("async function runGpuLiveParityMugshot", loopStart);
  const loopSource = source.slice(loopStart, loopEnd);
  const reportStart = source.indexOf("function renderOperatorWitnessLoopReport");
  const reportEnd = source.indexOf("function renderGpuLiveParityMugshotReport", reportStart);
  const reportSource = source.slice(reportStart, reportEnd);

  assert.match(sessionSource, /const readinessDiagnosticsByStage = \{\}/);
  assert.match(sessionSource, /const initialReadinessEvidence = await timeStage\(timing, "initial-readiness"/);
  assert.match(sessionSource, /readinessDiagnosticsByStage\.initialReadiness = initialReadinessEvidence\.readinessDiagnostics/);
  assert.match(sessionSource, /readinessDiagnosticsByStage/);
  assert.match(loopSource, /readinessDiagnosticsByStage: session\.readinessDiagnosticsByStage/);
  assert.match(reportSource, /Initial readiness diagnostics:/);
});

test("operator witness frame preserves view and interaction readiness diagnostics by stage", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);
  const reportStart = source.indexOf("function renderOperatorWitnessLoopReport");
  const reportEnd = source.indexOf("function renderGpuLiveParityMugshotReport", reportStart);
  const reportSource = source.slice(reportStart, reportEnd);
  const formatterStart = source.indexOf("function formatReadinessDiagnosticsByStage");
  const formatterEnd = source.indexOf("function printSummary", formatterStart);
  const formatterSource = source.slice(formatterStart, formatterEnd);

  assert.match(frameSource, /const readinessDiagnosticsByStage = \{\}/);
  assert.match(frameSource, /readinessDiagnosticsByStage\.viewReadiness = readinessEvidence\.readinessDiagnostics/);
  assert.match(frameSource, /readinessDiagnosticsByStage\.interactionReadiness = readinessEvidence\.readinessDiagnostics/);
  assert.match(frameSource, /readinessDiagnosticsByStage,/);
  assert.match(reportSource, /Readiness stages:/);
  assert.match(reportSource, /formatReadinessDiagnosticsByStage\(capture\.pageEvidence\.readinessDiagnosticsByStage\)/);
  assert.match(formatterSource, /viewReadiness/);
  assert.match(formatterSource, /interactionReadiness/);
});

test("operator witness frame refreshes settled evidence after readiness and settle wait", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);
  const settleWait = frameSource.indexOf("settle-before-interaction");
  const settledRead = frameSource.indexOf("collect-settled-evidence");

  assert.match(frameSource, /let readinessEvidence/);
  assert.ok(settledRead > settleWait, "settled evidence must be collected after the settle wait");
  assert.match(frameSource, /collectPageEvidenceWithTimeout\(page, timeoutMs\)/);
});

test("operator witness session caches the canvas clip before per-frame captures", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(sessionSource, /clip = await .*canvasClip\(canvas,/s);
  assert.match(sessionSource, /clip,/);
  assert.doesNotMatch(frameSource, /canvasClip\(canvas,/);
});

test("operator witness session hides overlays once before per-frame captures", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(sessionSource, /page\.addStyleTag\(\{/);
  assert.doesNotMatch(frameSource, /page\.addStyleTag\(\{/);
});

test("operator witness frame screenshots are bounded by the capture screenshot timeout", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(
    frameSource,
    /page\.screenshot\(\{\s*path: screenshotPath,\s*clip,\s*timeout: capture\.timeoutScreenshotMs \?\? TIMEOUT_SCREENSHOT_MS,\s*\}\)/
  );
});

test("operator witness harness timeouts are routed into failure captures", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(frameSource, /if \(!isRecoverableVisualSmokeTimeout\(error\)\) \{/);
  assert.match(frameSource, /error: normalizeVisualSmokeTimeoutError\(error, timeoutMs\),/);
});

test("operator witness timeout reports refresh full evidence after compact readiness polling", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const captureSource = extractFunctionSource(source, "captureTimeoutFailure");
  const helperSource = extractFunctionSource(source, "collectTimeoutPageEvidence");
  const compactEvidenceCheck = helperSource.indexOf("isCompactReadinessEvidence(lastEvidence)");
  const fullEvidenceRefresh = helperSource.indexOf("collectPageEvidence(page).catch", compactEvidenceCheck);
  const preserveReadinessDiagnostics = helperSource.indexOf("readinessDiagnostics:", fullEvidenceRefresh);

  assert.doesNotMatch(captureSource, /error\.lastEvidence \?\? await collectPageEvidence/);
  assert.match(captureSource, /collectTimeoutPageEvidence\(\{ page, lastEvidence: error\.lastEvidence \}\)/);
  assert.ok(compactEvidenceCheck !== -1, "timeout evidence must detect compact readiness snapshots");
  assert.ok(fullEvidenceRefresh > compactEvidenceCheck, "compact timeout evidence must trigger a full page evidence refresh");
  assert.ok(
    preserveReadinessDiagnostics > fullEvidenceRefresh,
    "full timeout evidence must retain the readiness diagnostic history from the compact poll"
  );
});

test("operator witness initial page readiness timeouts produce a first-capture failure report", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);

  assert.match(sessionSource, /page\.locator\("canvas"\)\.first\(\)/);
  assert.match(sessionSource, /captureTimeoutFailureWithRoute\(\{/);
  assert.match(sessionSource, /capture: plan\[0\],/);
  assert.match(sessionSource, /error: normalizeVisualSmokeTimeoutError\(error, timeoutMs\),/);
});

test("operator witness interactions bound their canvas lookup by the capture timeout", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);
  const interactionStart = source.indexOf("async function applyCaptureInteractions");
  const interactionEnd = source.indexOf("async function captureTimeoutFailure", interactionStart);
  const interactionSource = source.slice(interactionStart, interactionEnd);

  assert.match(frameSource, /applyCaptureInteractions\(\{ page, canvas, interactions: capture\.interactions, timeoutMs \}\)/);
  assert.match(
    interactionSource,
    /withTimeout\(\s*canvas\.boundingBox\(\),\s*timeoutMs,\s*`operator witness interaction canvas lookup timed out after \$\{timeoutMs\}ms`\s*\)/
  );
  assert.match(
    interactionSource,
    /withTimeout\(\s*runCaptureInteractions\(\{ page, canvas, interactions, timeoutMs \}\),\s*timeoutMs,\s*`operator witness interactions timed out after \$\{timeoutMs\}ms`\s*\)/
  );
});

test("operator witness interactions use the app-side camera hook before mouse fallback", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const interactionStart = source.indexOf("async function applyCaptureInteractions");
  const interactionEnd = source.indexOf("async function captureTimeoutFailure", interactionStart);
  const interactionSource = source.slice(interactionStart, interactionEnd);
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(interactionSource, /applyOperatorWitnessInteraction\(\{ page, interaction, timeoutMs \}\)/);
  assert.match(interactionSource, /if \(appliedRevision !== null && handledByHook\) \{/);
  assert.match(mainSource, /__MESH_SPLAT_APPLY_WITNESS_INTERACTION__/);
});

test("operator witness session stops after a timeout capture to avoid racing the same page", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);

  assert.match(sessionSource, /const captureResult = await .*captureOperatorWitnessFrame\(\{/s);
  assert.match(sessionSource, /if \(captureResult\.captureFailure\) \{\s*break;\s*\}/);
});

function extractFunctionSource(source, functionName) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\b`).exec(source);
  const start = match?.index ?? -1;
  assert.notEqual(start, -1, `missing function ${functionName}`);
  const paramsStart = source.indexOf("(", start);
  assert.notEqual(paramsStart, -1, `missing function params ${functionName}`);
  let paramDepth = 0;
  let paramsEnd = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") paramDepth += 1;
    if (char === ")") {
      paramDepth -= 1;
      if (paramDepth === 0) {
        paramsEnd = index;
        break;
      }
    }
  }
  assert.notEqual(paramsEnd, -1, `unterminated function params ${functionName}`);
  const bodyStart = source.indexOf("{", paramsEnd);
  assert.notEqual(bodyStart, -1, `missing function body ${functionName}`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`unterminated function ${functionName}`);
}

function witnessCapture(
  id,
  {
    harnessPassed = true,
    realSplatEvidence = true,
    sourceKind = "scaniverse_ply",
    witnessView = "default",
    pageEvidence,
    imageNonblank = harnessPassed,
    assetPath = "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
    arenaBackend = "gpu",
    tileSizePx = "16",
    maxRefsPerTile = "256",
    timing,
  } = {}
) {
  const realPageEvidence = pageEvidence ?? {
    sourceKind,
    assetPath,
    rendererLabel: "tile-local-visible-gaussian-compositor",
    canvas: { width: 1280, height: 720 },
    tileLocal: { refs: 94406, tileColumns: 80, tileRows: 45 },
    splatCount: 94406,
  };
  return {
    id,
    title: id,
    evidenceRole: id.includes("orbit") ? "operator-filmstrip" : "operator-visual",
    screenshotPath: `smoke-reports/operator-witness/${id}.png`,
    classification: {
      harnessPassed,
      realSplatEvidence,
      nonblank: harnessPassed,
      sourceKind,
    },
    imageAnalysis: {
      nonblank: imageNonblank,
      changedPixelRatio: imageNonblank ? 0.12 : 0,
      width: 1280,
      height: 720,
    },
    pageEvidence: realPageEvidence,
    routeIdentity: {
      witnessView,
      renderer: "tile-local-visible",
      assetPath,
      arenaBackend,
      tileSizePx,
      maxRefsPerTile,
      traceAnchors: null,
      presentationAnchors: null,
    },
    timing,
  };
}
