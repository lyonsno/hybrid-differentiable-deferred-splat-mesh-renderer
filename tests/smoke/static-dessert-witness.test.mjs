import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildStaticDessertVisualGapTraceCapture,
  buildStaticDessertWitnessPlan,
  classifyStaticDessertWitness,
  deriveStaticDessertVisualGapAnchorsFromImages,
} from "../../scripts/visual-smoke/static-dessert-witness.mjs";

test("static dessert witness plan captures final color and all debug modes for one fixed view", () => {
  const plan = buildStaticDessertWitnessPlan("http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");

  assert.deepEqual(
    plan.map((capture) => [capture.id, capture.expectedRendererLabel, capture.url]),
    [
      [
        "plate-final-color",
        "plate",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      ],
      [
        "final-color",
        "tile-local-visible",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256",
      ],
      [
        "coverage-weight",
        "tile-local-visible-debug-coverage-weight",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=coverage-weight",
      ],
      [
        "accumulated-alpha",
        "tile-local-visible-debug-accumulated-alpha",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=accumulated-alpha",
      ],
      [
        "transmittance",
        "tile-local-visible-debug-transmittance",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=transmittance",
      ],
      [
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count",
      ],
      [
        "conic-shape",
        "tile-local-visible-debug-conic-shape",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=conic-shape",
      ],
    ]
  );
  assert.deepEqual(
    plan
      .filter((capture) => capture.id !== "plate-final-color" && capture.id !== "final-color")
      .map((capture) => [capture.id, capture.readiness?.tileLocalDiagnostics]),
    [
      ["coverage-weight", { debugMode: "coverage-weight", requireTileRefs: true, requireDiagnostics: true }],
      ["accumulated-alpha", { debugMode: "accumulated-alpha", requireTileRefs: true, requireAlpha: true }],
      ["transmittance", { debugMode: "transmittance", requireTileRefs: true, requireTransmittance: true }],
      ["tile-ref-count", { debugMode: "tile-ref-count", requireTileRefs: true, requireRefDensity: true }],
      ["conic-shape", { debugMode: "conic-shape", requireTileRefs: true, requireConicShape: true }],
    ],
  );
});

test("static dessert witness plan preserves the close-up witness view across final and debug captures", () => {
  const plan = buildStaticDessertWitnessPlan(
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close"
  );

  assert.ok(plan.every((capture) => capture.url.includes("witnessView=dessert-close")));
  assert.equal(
    plan.find((capture) => capture.id === "final-color")?.url,
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256"
  );
  assert.equal(
    plan.find((capture) => capture.id === "conic-shape")?.url,
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=conic-shape"
  );
});

test("static dessert witness plan preserves the porous underfill witness view across final and debug captures", () => {
  const plan = buildStaticDessertWitnessPlan(
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close"
  );

  assert.ok(plan.every((capture) => capture.url.includes("witnessView=dessert-porous-close")));
  assert.equal(
    plan.find((capture) => capture.id === "final-color")?.url,
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256"
  );
  assert.equal(
    plan.find((capture) => capture.id === "tile-ref-count")?.url,
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&tileDebug=tile-ref-count"
  );
});

test("static dessert witness plan overrides stale CPU or old tile budget query params", () => {
  const plan = buildStaticDessertWitnessPlan(
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=cpu&tileSizePx=6&maxRefsPerTile=32&renderer=plate&traceAnchors=stale@1,2:old&traceAnchor=legacy@3,4:old&debug=legacy"
  );

  const finalColorUrl = new URL(plan.find((capture) => capture.id === "final-color")?.url);
  assert.equal(finalColorUrl.searchParams.get("arenaBackend"), "gpu");
  assert.equal(finalColorUrl.searchParams.get("tileSizePx"), "16");
  assert.equal(finalColorUrl.searchParams.get("maxRefsPerTile"), "256");

  const plateUrl = new URL(plan.find((capture) => capture.id === "plate-final-color")?.url);
  assert.equal(plateUrl.searchParams.has("arenaBackend"), false);
  assert.equal(plateUrl.searchParams.has("tileSizePx"), false);
  assert.equal(plateUrl.searchParams.has("maxRefsPerTile"), false);

  const debugUrls = plan
    .filter((capture) => capture.id !== "plate-final-color" && capture.id !== "final-color")
    .map((capture) => new URL(capture.url));
  assert.equal(debugUrls.every((url) => url.searchParams.get("arenaBackend") === "gpu"), true);
  assert.equal(debugUrls.every((url) => url.searchParams.get("tileSizePx") === "16"), true);
  assert.equal(debugUrls.every((url) => url.searchParams.get("maxRefsPerTile") === "256"), true);
  for (const url of [plateUrl, finalColorUrl, ...debugUrls]) {
    assert.equal(url.searchParams.has("traceAnchors"), false);
    assert.equal(url.searchParams.has("traceAnchor"), false);
    assert.equal(url.searchParams.has("debug"), false);
  }
});

test("static dessert visual gap trace capture preserves route while adding in-frame trace anchors", () => {
  const capture = buildStaticDessertVisualGapTraceCapture(
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&traceAnchors=stale@1,2:old&presentationAnchors=stale@3,4:old&presentationAnchor=stale@5,6:old&tileLocalPresentationAnchors=stale@7,8:old&tileLocalPresentationAnchor=stale@9,10:old&presentationScope=anchor-neighborhood&presentationMode=anchor-neighborhood&tileLocalPresentationScope=anchor-neighborhood&tileLocalPresentationMode=anchor-neighborhood",
    [
      { id: "gap one", kind: "plate-covered", x: 644.9, y: 351.1, score: 42.25, plateDelta: 80, tileLocalDelta: 12 },
      { id: "gap-two", kind: "tile-local-missing", x: 512, y: 390, score: 39 },
    ],
  );
  const url = new URL(capture.url);

  assert.equal(capture.id, "visual-gap-trace");
  assert.equal(capture.expectedRendererLabel, "tile-local-visible");
  assert.equal(url.searchParams.get("renderer"), "tile-local-visible");
  assert.equal(url.searchParams.get("arenaBackend"), "gpu");
  assert.equal(url.searchParams.get("tileSizePx"), "16");
  assert.equal(url.searchParams.get("maxRefsPerTile"), "256");
  assert.equal(url.searchParams.get("witnessView"), "dessert-close");
  assert.equal(url.searchParams.has("traceAnchor"), false);
  assert.equal(url.searchParams.has("presentationAnchors"), false);
  assert.equal(url.searchParams.has("presentationAnchor"), false);
  assert.equal(url.searchParams.has("tileLocalPresentationAnchors"), false);
  assert.equal(url.searchParams.has("tileLocalPresentationAnchor"), false);
  assert.equal(url.searchParams.has("presentationScope"), false);
  assert.equal(url.searchParams.has("presentationMode"), false);
  assert.equal(url.searchParams.has("tileLocalPresentationScope"), false);
  assert.equal(url.searchParams.has("tileLocalPresentationMode"), false);
  assert.equal(
    url.searchParams.get("traceAnchors"),
    "gap-one@644,351:plate-covered;gap-two@512,390:tile-local-missing",
  );
  assert.deepEqual(capture.visualGapAnchors[0], {
    id: "gap-one",
    kind: "plate-covered",
    x: 644,
    y: 351,
    score: 42.25,
    plateDelta: 80,
    tileLocalDelta: 12,
  });
});

test("static dessert visual gap derivation selects plate-covered pixels missing from tile-local output", () => {
  const plateImage = imageFromPixels(12, 12, (x, y) => {
    if (x === 8 && y === 8) return [220, 170, 120, 255];
    if (x === 4 && y === 4) return [160, 110, 80, 255];
    return [0, 0, 0, 255];
  });
  const finalImage = imageFromPixels(12, 12, (x, y) => {
    if (x === 4 && y === 4) return [155, 105, 78, 255];
    return [0, 0, 0, 255];
  });

  const anchors = deriveStaticDessertVisualGapAnchorsFromImages({
    plateImage,
    finalImage,
    stridePx: 4,
    minSpacingPx: 1,
  });

  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].x, 8);
  assert.equal(anchors[0].y, 8);
  assert.equal(anchors[0].kind, "plate-covered-tile-local-missing");
  assert.ok(anchors[0].plateDelta > anchors[0].tileLocalDelta);
});

test("static dessert visual gap derivation returns no anchors for equal or mismatched images", () => {
  const image = imageFromPixels(8, 8, () => [10, 20, 30, 255]);
  const differentSize = imageFromPixels(12, 8, () => [10, 20, 30, 255]);

  assert.deepEqual(deriveStaticDessertVisualGapAnchorsFromImages({ plateImage: image, finalImage: image }), []);
  assert.deepEqual(deriveStaticDessertVisualGapAnchorsFromImages({ plateImage: image, finalImage: differentSize }), []);
});

test("static dessert witness classifier requires one asset, one viewport, final color, and compact debug evidence", () => {
  const result = classifyStaticDessertWitness({
    captures: [
      witnessCapture("final-color", { rendererLabel: "tile-local-visible-gaussian-compositor" }),
      witnessCapture("plate-final-color", { rendererLabel: "plate" }),
      witnessCapture("coverage-weight"),
      witnessCapture("accumulated-alpha", {
        diagnostics: {
          alpha: { estimatedMaxAccumulatedAlpha: 0.91, estimatedMinTransmittance: 0.09 },
        },
      }),
      witnessCapture("transmittance", {
        diagnostics: {
          alpha: { estimatedMaxAccumulatedAlpha: 0.91, estimatedMinTransmittance: 0.09 },
        },
      }),
      witnessCapture("tile-ref-count", {
        diagnostics: {
          tileRefs: { total: 24000, maxPerTile: 32, nonEmptyTiles: 400 },
          tileRefCustody: {
            projectedTileEntryCount: 64000,
            retainedTileEntryCount: 24000,
            evictedTileEntryCount: 40000,
            cappedTileCount: 120,
            saturatedRetainedTileCount: 128,
            maxProjectedRefsPerTile: 700,
            maxRetainedRefsPerTile: 32,
            headerRefCount: 24000,
            headerAccountingMatches: true,
          },
          retentionAudit: {
            fullFrame: {
              region: "fixture-full-frame",
              projectedTileEntryCount: 64000,
              currentRetainedEntryCount: 24000,
              legacyRetainedEntryCount: 24000,
              addedByPolicyCount: 120,
              droppedByPolicyCount: 120,
            },
            regions: {
              porousBody: {
                region: "fixture-porous-body",
                projectedTileEntryCount: 7200,
                currentRetainedEntryCount: 512,
                legacyRetainedEntryCount: 512,
                cappedTileCount: 16,
                addedByPolicyCount: 19,
                droppedByPolicyCount: 19,
              },
              centerLeakBand: {
                region: "fixture-center-leak-band",
                projectedTileEntryCount: 9000,
                currentRetainedEntryCount: 1024,
                legacyRetainedEntryCount: 1024,
                addedByPolicyCount: 17,
                droppedByPolicyCount: 17,
              },
            },
          },
        },
      }),
      witnessCapture("conic-shape", {
        diagnostics: {
          conicShape: { maxMajorRadiusPx: 8, minMinorRadiusPx: 1, maxAnisotropy: 5 },
        },
      }),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        visualGapAnchors: [
          { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
        ],
        perPixelFinalColorAccumulation: [
          {
            status: "present",
            anchorPixel: { id: "visual-gap-1", x: 640, y: 342 },
            finalColorAccumulation: { steps: [{ splatIndex: 1 }], outputColor: [0.1, 0.2, 0.3, 0.44], remainingTransmittance: 0.56 },
          },
        ],
        perPixelRetainedToOrderedSurvivalLedger: {
          anchorLedgers: [
            {
              anchorPixel: { id: "visual-gap-1", x: 640, y: 342 },
              category: "ordered-present",
              mechanism: "retained-foreground-identity-survives-to-final-accumulation",
              counts: { projectedForeground: 3, retainedForeground: 2, orderedForeground: 3 },
              metrics: { projectedForegroundOcclusionWeight: 1.25, finalForegroundAlpha: 0.44 },
            },
          ],
        },
      }),
    ],
  });

  assert.equal(result.closeable, true);
  assert.equal(result.summary.status, "PASS");
  assert.equal(result.metrics.fixedView.viewport, "1280x720");
  assert.equal(result.metrics.tileRefs.total, 24000);
  assert.equal(result.metrics.tileRefCustody.projectedTileEntryCount, 64000);
  assert.equal(result.metrics.tileRefCustody.evictedTileEntryCount, 40000);
  assert.equal(result.metrics.tileRefCustody.headerAccountingMatches, true);
  assert.equal(result.metrics.retentionAudit.fullFrame.region, "fixture-full-frame");
  assert.equal(result.metrics.retentionAudit.fullFrame.addedByPolicyCount, 120);
  assert.equal(result.metrics.retentionAudit.regions.porousBody.region, "fixture-porous-body");
  assert.equal(result.metrics.retentionAudit.regions.porousBody.projectedTileEntryCount, 7200);
  assert.equal(result.metrics.retentionAudit.regions.porousBody.currentRetainedEntryCount, 512);
  assert.equal(result.metrics.retentionAudit.regions.porousBody.cappedTileCount, 16);
  assert.equal(result.metrics.retentionAudit.regions.centerLeakBand.region, "fixture-center-leak-band");
  assert.equal(result.metrics.retentionAudit.regions.centerLeakBand.addedByPolicyCount, 17);
  assert.equal(result.metrics.conicShape.maxAnisotropy, 5);
  assert.equal(result.metrics.rendererBridge.plateRendererLabel, "plate");
  assert.equal(result.metrics.rendererBridge.tileLocalRendererLabel, "tile-local-visible-gaussian-compositor");
  assert.equal(result.metrics.sourceSupport.rimBand.projectedCenterCount, 37);
  assert.equal(result.metrics.sourceSupport.rimBand.projectedSupportCount, 91);
  assert.deepEqual(result.metrics.sourceSupport.rimBand.sampleOriginalIds, [100, 101, 102]);
  assert.equal(result.metrics.sourceSupport.porousBody.projectedCenterCount, 63);
  assert.equal(result.metrics.sourceSupport.porousBody.projectedSupportCount, 144);
  assert.deepEqual(result.metrics.sourceSupport.porousBody.sampleOriginalIds, [200, 201, 202]);
  assert.equal(result.metrics.visualGapTrace.status, "present");
  assert.equal(result.metrics.visualGapTrace.anchorCount, 1);
  assert.equal(result.metrics.visualGapTrace.anchors[0].traceStatus, "present");
  assert.equal(result.metrics.visualGapTrace.anchors[0].traceComplete, true);
  assert.equal(result.metrics.visualGapTrace.anchors[0].category, "ordered-present");
  assert.equal(result.metrics.visualGapTrace.anchors[0].finalStepCount, 1);
  assert.equal(result.metrics.visualGapTrace.anchors[0].outputAlpha, 0.44);
  assert.equal(result.metrics.plateSeepageClassification.status, "classified");
  assert.equal(result.metrics.plateSeepageClassification.category, "alpha-under-accumulation");
  assert.equal(result.metrics.plateSeepageClassification.stage, "alpha-transfer");
  assert.equal(result.observations.visibleHoles.evidenceIds.includes("coverage-weight"), true);
  assert.equal(result.observations.plateSeepage.evidenceIds.includes("transmittance"), true);
  assert.equal(result.observations.budgetSkip.status, "separate-high-viewport-observation");
});

test("static dessert witness classifier classifies source-frontier plate seepage by foreground survival stage", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-through-dessert", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      witnessCapture("final-color", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute([]),
          traceAnchors: "",
          wgslProjectedRefStream: "source-frontier",
        },
      }),
      ...staticDessertRequiredCaptures().filter((capture) => capture.id !== "final-color"),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute(anchors),
          wgslProjectedRefStream: "source-frontier",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors, {
          category: "projected-foreground-dropped-before-retention",
          mechanism: "pixel-strong-projected-foreground-support-lost-before-retained-slate",
          counts: { projectedForegroundDroppedBeforeRetention: 4, retainedForeground: 0, orderedForeground: 0 },
        }),
      }),
    ],
  });

  assert.equal(result.closeable, true);
  assert.deepEqual(result.metrics.plateSeepageClassification, {
    status: "classified",
    category: "tile-list-loss",
    stage: "retention-election",
    sourceRoute: "wgsl-projected-ref-stream-source-frontier",
    anchorCount: 1,
    classifiedAnchorCount: 1,
    mechanismCounts: {
      "pixel-strong-projected-foreground-support-lost-before-retained-slate": 1,
    },
    blockerCount: 0,
  });
  assert.equal(result.observations.plateSeepage.status, "classified-for-review");
  assert.equal(result.observations.plateSeepage.boundary.includes("retention-election"), true);
});

test("static dessert witness classifier preserves effective source-frontier route identity", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-through-dessert", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const sourceFrontierRoute = {
    ...visualGapTraceRoute(anchors),
    effectiveWgslProjectedRefStream: "wgsl-projected-ref-stream-source-frontier",
  };
  const result = classifyStaticDessertWitness({
    captures: [
      witnessCapture("final-color", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...sourceFrontierRoute,
          traceAnchors: "",
        },
      }),
      ...staticDessertRequiredCaptures().filter((capture) => capture.id !== "final-color"),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: sourceFrontierRoute,
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors, {
          category: "narrower-role-source-blocker",
          mechanism: "no-retained-foreground-role-support",
          counts: { projectedForeground: 0, retainedForeground: 0, orderedForeground: 0 },
        }),
      }),
    ],
  });

  assert.equal(result.closeable, true);
  assert.equal(result.metrics.visualGapTrace.status, "present");
  assert.equal(
    result.metrics.plateSeepageClassification.sourceRoute,
    "wgsl-projected-ref-stream-source-frontier",
  );
  assert.equal(result.metrics.plateSeepageClassification.category, "source-role-loss");
  assert.equal(result.metrics.plateSeepageClassification.stage, "source-construction");
});

test("static dessert witness classifier refuses effective source route drift on visual gap traces", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-through-dessert", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      witnessCapture("final-color", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute([]),
          effectiveWgslProjectedRefStream: "wgsl-projected-ref-stream-source-frontier",
          traceAnchors: "",
        },
      }),
      ...staticDessertRequiredCaptures().filter((capture) => capture.id !== "final-color"),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute(anchors),
          effectiveWgslProjectedRefStream: "wgsl-projected-ref-stream-legacy-default",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors),
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "malformed");
  assert.match(result.metrics.visualGapTrace.routeStatus, /effectiveWgslProjectedRefStream/);
  assert.equal(result.findings.some((finding) => finding.kind === "visual-gap-trace-malformed"), true);
});

test("static dessert witness classifier does not blame alpha transfer without projected foreground authority", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-through-dessert", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      witnessCapture("final-color", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute([]),
          traceAnchors: "",
          wgslProjectedRefStream: "source-frontier",
        },
      }),
      ...staticDessertRequiredCaptures().filter((capture) => capture.id !== "final-color"),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute(anchors),
          wgslProjectedRefStream: "source-frontier",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors, {
          category: "ordered-present",
          mechanism: "retained-foreground-identity-survives-to-final-accumulation",
          counts: { projectedForeground: 0, retainedForeground: 30, orderedForeground: 30 },
          metrics: {
            retainedForegroundOcclusionWeight: 0.947383,
            orderedForegroundOcclusionWeight: 0.947383,
            finalForegroundAlpha: 0.407436,
          },
        }),
      }),
    ],
  });

  assert.equal(result.closeable, true);
  assert.deepEqual(result.metrics.plateSeepageClassification, {
    status: "classified",
    category: "coverage-underfill",
    stage: "source-frontier-coverage",
    sourceRoute: "wgsl-projected-ref-stream-source-frontier",
    anchorCount: 1,
    classifiedAnchorCount: 1,
    mechanismCounts: {
      "retained-foreground-identity-survives-to-final-accumulation": 1,
    },
    blockerCount: 0,
  });
  assert.equal(result.observations.plateSeepage.status, "classified-for-review");
  assert.equal(result.observations.plateSeepage.boundary.includes("source-frontier-coverage"), true);
  assert.notEqual(result.metrics.plateSeepageClassification.category, "alpha-under-accumulation");
});

test("static dessert witness classifier refuses incomplete visual gap trace evidence", () => {
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        visualGapAnchors: [
          { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
        ],
        perPixelFinalColorAccumulation: [],
        perPixelRetainedToOrderedSurvivalLedger: { anchorLedgers: [] },
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "partial");
  assert.equal(result.metrics.visualGapTrace.anchors[0].traceStatus, "missing-final-accumulation");
  assert.equal(result.findings.some((finding) => finding.kind === "visual-gap-trace-incomplete"), true);
});

test("static dessert witness classifier refuses visual gap traces missing alpha transfer evidence", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: [
          {
            status: "present",
            anchorPixel: { id: "visual-gap-1", x: 640, y: 342 },
            finalColorAccumulation: { steps: [{ splatIndex: 1 }] },
          },
        ],
        perPixelRetainedToOrderedSurvivalLedger: {
          anchorLedgers: [
            {
              anchorPixel: { id: "visual-gap-1", x: 640, y: 342 },
              category: "ordered-present",
              mechanism: "retained-foreground-identity-survives-to-final-accumulation",
              counts: { retainedForeground: 2, orderedForeground: 3 },
              metrics: {},
            },
          ],
        },
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "partial");
  assert.equal(result.metrics.visualGapTrace.anchors[0].traceStatus, "missing-alpha-transfer-evidence");
  assert.notEqual(result.metrics.plateSeepageClassification.category, "alpha-under-accumulation");
  assert.equal(result.findings.some((finding) => finding.kind === "visual-gap-trace-incomplete"), true);
});

test("static dessert witness classifier refuses absent or empty visual gap trace evidence", () => {
  const absent = classifyStaticDessertWitness({
    captures: staticDessertRequiredCaptures(),
  });
  const empty = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        visualGapAnchors: [],
      }),
    ],
  });

  assert.equal(absent.closeable, false);
  assert.equal(absent.metrics.visualGapTrace.status, "not-captured");
  assert.equal(absent.findings.some((finding) => finding.kind === "visual-gap-trace-not-captured"), true);
  assert.equal(empty.closeable, false);
  assert.equal(empty.metrics.visualGapTrace.status, "empty");
  assert.equal(empty.findings.some((finding) => finding.kind === "visual-gap-anchors-missing"), true);
});

test("static dessert witness classifier refuses debug final-color routes", () => {
  const result = classifyStaticDessertWitness({
    captures: [
      witnessCapture("final-color", {
        rendererLabel: "tile-local-visible-debug-coverage-weight",
        routeIdentity: {
          renderer: "tile-local-visible",
          tileDebug: "coverage-weight",
          presentationScope: "full-scene",
        },
      }),
      ...staticDessertRequiredCaptures().filter((capture) => capture.id !== "final-color"),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.findings.some((finding) => (
    finding.kind === "final-color-label-mismatch" &&
    finding.summary.includes("tile-local-visible-debug-coverage-weight")
  )), true);
});

test("static dessert witness classifier refuses malformed visual gap trace routes", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "plate",
        classification: {
          harnessPassed: false,
          realSplatEvidence: false,
          nonblank: false,
        },
        routeIdentity: {
          traceAnchors: "stale@1,2:old",
          presentationScope: "full-scene",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors),
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "malformed");
  assert.equal(result.metrics.visualGapTrace.routeStatus, "visual-gap trace capture did not pass visual smoke classification");
  assert.equal(result.findings.some((finding) => finding.kind === "visual-gap-trace-malformed"), true);
});

test("static dessert witness classifier refuses stale singular visual gap trace aliases", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: visualGapTraceRoute(anchors),
        url: `http://127.0.0.1:5173/?traceAnchors=${encodeURIComponent(encodeTraceAnchorsForTest(anchors))}&traceAnchor=stale@1,2:old`,
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors),
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "malformed");
  assert.equal(result.metrics.visualGapTrace.routeStatus, "visual-gap trace route carried stale singular traceAnchor");
  assert.equal(result.findings.some((finding) => finding.kind === "visual-gap-trace-malformed"), true);
});

test("static dessert witness classifier refuses stale presentation aliases on visual gap traces", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute(anchors),
          presentationAnchor: "stale@5,6:old",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors),
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "malformed");
  assert.equal(result.metrics.visualGapTrace.routeStatus, "visual-gap trace route carried presentation anchors");
});

test("static dessert witness classifier refuses visual gap traces on non-static routes", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute(anchors),
          renderer: "plate",
          arenaBackend: "cpu",
          tileSizePx: "4",
          maxRefsPerTile: "1",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors),
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "malformed");
  assert.match(result.metrics.visualGapTrace.routeStatus, /renderer instead of tile-local-visible/);
  assert.equal(result.findings.some((finding) => finding.kind === "visual-gap-trace-malformed"), true);
});

test("static dessert witness classifier refuses debug-mode visual gap trace routes", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-debug-coverage-weight",
        routeIdentity: {
          ...visualGapTraceRoute(anchors),
          tileDebug: "coverage-weight",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors),
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "malformed");
  assert.match(result.metrics.visualGapTrace.routeStatus, /renderer label tile-local-visible-debug-coverage-weight/);
  assert.equal(result.findings.some((finding) => finding.kind === "visual-gap-trace-malformed"), true);
});

test("static dessert witness classifier refuses hidden debug params on visual gap trace routes", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute(anchors),
          tileDebug: "coverage-weight",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: finalAccumulationRowsFor(anchors),
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors),
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "malformed");
  assert.equal(result.metrics.visualGapTrace.routeStatus, "visual-gap trace route carried debug mode params");
});

test("static dessert witness classifier refuses stale visual gap trace row coordinates", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const staleRows = finalAccumulationRowsFor(anchors).map((row) => ({
    ...row,
    anchorPixel: { id: "visual-gap-1", x: 1, y: 2 },
  }));
  const staleLedger = {
    anchorLedgers: survivalLedgerFor(anchors).anchorLedgers.map((ledger) => ({
      ...ledger,
      anchorPixel: { id: "visual-gap-1", x: 3, y: 4 },
    })),
  };
  const result = classifyStaticDessertWitness({
    captures: [
      ...staticDessertRequiredCaptures(),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: staleRows,
        perPixelRetainedToOrderedSurvivalLedger: staleLedger,
      }),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.visualGapTrace.status, "partial");
  assert.equal(result.metrics.visualGapTrace.anchors[0].traceStatus, "final-accumulation-anchor-mismatch");
  assert.equal(result.findings.some((finding) => finding.kind === "visual-gap-trace-incomplete"), true);
});

test("static dessert witness classifier flags tile-local final-color footprint expansion against plate", () => {
  const result = classifyStaticDessertWitness({
    captures: [
      witnessCapture("final-color", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        changedPixelRatio: 0.0924728732638889,
      }),
      witnessCapture("plate-final-color", {
        rendererLabel: "plate",
        changedPixelRatio: 0.03407335069444444,
      }),
      witnessCapture("coverage-weight"),
      witnessCapture("accumulated-alpha", {
        diagnostics: {
          alpha: { estimatedMaxAccumulatedAlpha: 1, estimatedMinTransmittance: 0 },
        },
      }),
      witnessCapture("transmittance", {
        diagnostics: {
          alpha: { estimatedMaxAccumulatedAlpha: 1, estimatedMinTransmittance: 0 },
        },
      }),
      witnessCapture("tile-ref-count"),
      witnessCapture("conic-shape"),
    ],
  });

  assert.equal(result.closeable, false);
  assert.equal(result.metrics.rendererBridge.plateChangedPixelRatio, 0.03407335069444444);
  assert.equal(result.metrics.rendererBridge.tileLocalChangedPixelRatio, 0.0924728732638889);
  assert.ok(result.metrics.rendererBridge.tileLocalToPlateChangedPixelRatio > 2.7);
  assert.equal(
    result.findings.some((finding) => finding.kind === "tile-local-visible-footprint-expansion"),
    true,
  );
});

test("static dessert witness classifier classifies residual holes after plate seepage is sealed", () => {
  const anchors = [
    { id: "visual-gap-1", kind: "plate-covered-tile-local-missing", x: 640, y: 342, score: 71, plateDelta: 88, tileLocalDelta: 9 },
  ];
  const result = classifyStaticDessertWitness({
    captures: [
      witnessCapture("final-color", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        changedPixelRatio: 0.0556642795138889,
        routeIdentity: {
          ...visualGapTraceRoute([]),
          traceAnchors: "",
          wgslProjectedRefStream: "source-frontier",
        },
      }),
      witnessCapture("plate-final-color", {
        rendererLabel: "plate",
        changedPixelRatio: 0.03407335069444444,
      }),
      witnessCapture("coverage-weight"),
      witnessCapture("accumulated-alpha", {
        diagnostics: {
          alpha: { estimatedMaxAccumulatedAlpha: 1, estimatedMinTransmittance: 0 },
        },
      }),
      witnessCapture("transmittance", {
        diagnostics: {
          alpha: { estimatedMaxAccumulatedAlpha: 1, estimatedMinTransmittance: 0 },
        },
      }),
      witnessCapture("tile-ref-count"),
      witnessCapture("conic-shape", {
        diagnostics: {
          conicShape: { maxMajorRadiusPx: 57.2, minMinorRadiusPx: 1.5, maxAnisotropy: 21.8 },
        },
      }),
      witnessCapture("visual-gap-trace", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        routeIdentity: {
          ...visualGapTraceRoute(anchors),
          wgslProjectedRefStream: "source-frontier",
        },
        visualGapAnchors: anchors,
        perPixelFinalColorAccumulation: [
          {
            status: "present",
            anchorPixel: { id: "visual-gap-1", x: 640, y: 342 },
            finalColorAccumulation: { steps: [{ splatIndex: 1 }], outputColor: [0.1, 0.2, 0.3, 0.98], remainingTransmittance: 0.02 },
          },
        ],
        perPixelRetainedToOrderedSurvivalLedger: survivalLedgerFor(anchors, {
          category: "ordered-present",
          mechanism: "retained-foreground-identity-survives-to-final-accumulation",
          counts: { projectedForeground: 4, retainedForeground: 4, orderedForeground: 4 },
          metrics: { projectedForegroundOcclusionWeight: 1.25, finalForegroundAlpha: 0.98 },
        }),
      }),
    ],
  });

  assert.equal(result.closeable, true);
  assert.equal(result.metrics.plateSeepageClassification.category, "no-seepage");
  assert.equal(result.observations.visibleHoles.status, "classified-for-review");
  assert.equal(result.observations.visibleHoles.category, "conic-coverage-pressure");
  assert.equal(result.observations.visibleHoles.stage, "conic-coverage-support");
  assert.equal(result.observations.visibleHoles.boundary.includes("conic anisotropy"), true);
  assert.equal(result.observations.visibleHoles.evidenceIds.includes("conic-shape"), true);
  assert.equal(result.observations.visibleHoles.evidenceIds.includes("coverage-weight"), true);
});

test("visual smoke CLI exposes a static dessert witness batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--static-dessert-witness/);
  assert.match(source, /runStaticDessertWitness/);
  assert.match(source, /renderStaticDessertWitnessReport/);
  assert.match(source, /Projected tile refs before cap/);
  assert.match(source, /Tile-local\/plate changed-pixel ratio/);
  assert.match(source, /Retention audit full frame/);
  assert.match(source, /Porous body retention audit/);
  assert.match(source, /metrics\.retentionAudit\.regions\.porousBody\.region/);
  assert.match(source, /Porous body projected support splats/);
  assert.match(source, /Center leak band retention audit/);
  assert.match(source, /metrics\.retentionAudit\.regions\.centerLeakBand\.region/);
  assert.match(source, /deriveStaticDessertVisualGapAnchors/);
  assert.match(source, /Visual Gap Trace/);
  assert.match(source, /Plate Seepage Classification/);
  assert.match(source, /metrics\.visualGapTrace\.anchors/);
  assert.match(source, /observations\.visibleHoles\.category/);
  assert.match(source, /observations\.visibleHoles\.stage/);
});

function staticDessertRequiredCaptures() {
  return [
    witnessCapture("final-color", {
      rendererLabel: "tile-local-visible-gaussian-compositor",
    }),
    witnessCapture("plate-final-color", {
      rendererLabel: "plate",
    }),
    witnessCapture("coverage-weight"),
    witnessCapture("accumulated-alpha", {
      diagnostics: {
        alpha: { estimatedMaxAccumulatedAlpha: 1, estimatedMinTransmittance: 0 },
      },
    }),
    witnessCapture("transmittance", {
      diagnostics: {
        alpha: { estimatedMaxAccumulatedAlpha: 1, estimatedMinTransmittance: 0 },
      },
    }),
    witnessCapture("tile-ref-count"),
    witnessCapture("conic-shape"),
  ];
}

function imageFromPixels(width, height, pixelFor) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      rgba.set(pixelFor(x, y), (y * width + x) * 4);
    }
  }
  return { width, height, rgba };
}

function witnessCapture(id, overrides = {}) {
  const rendererLabel = overrides.rendererLabel ?? `tile-local-visible-debug-${id}`;
  return {
    id,
    classification: {
      nonblank: true,
      realSplatEvidence: true,
      harnessPassed: true,
      ...overrides.classification,
    },
    pageEvidence: {
      rendererLabel,
      witness: {
        projection: {
          cropSupport: {
            rimBand: {
              crop: { x: 390, y: 322, width: 500, height: 115 },
              projectedCenterCount: 37,
              projectedSupportCount: 91,
              sampleOriginalIds: [100, 101, 102],
            },
            porousBody: {
              crop: { x: 520, y: 270, width: 260, height: 150 },
              projectedCenterCount: 63,
              projectedSupportCount: 144,
              sampleOriginalIds: [200, 201, 202],
            },
          },
        },
      },
      assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      splatCount: 94406,
      canvas: { width: 1280, height: 720, clientWidth: 1280, clientHeight: 720 },
      tileLocal: {
        refs: 24000,
        tileColumns: 80,
        tileRows: 45,
        perPixelFinalColorAccumulation: overrides.perPixelFinalColorAccumulation ?? [],
        perPixelRetainedToOrderedSurvivalLedger: overrides.perPixelRetainedToOrderedSurvivalLedger ?? {
          anchorLedgers: [],
        },
        diagnostics: {
          debugMode: id,
          tileRefs: { total: 24000, maxPerTile: 32, nonEmptyTiles: 400 },
          coverageWeight: { max: 1 },
          alpha: { estimatedMaxAccumulatedAlpha: 0.6, estimatedMinTransmittance: 0.4 },
          conicShape: { maxMajorRadiusPx: 8, minMinorRadiusPx: 1, maxAnisotropy: 4 },
          ...overrides.diagnostics,
        },
      },
    },
    imageAnalysis: {
      nonblank: true,
      changedPixelRatio: overrides.changedPixelRatio ?? 0.2,
      distinctColorCount: 1024,
    },
    visualGapAnchors: overrides.visualGapAnchors,
    routeIdentity: overrides.routeIdentity ?? (id === "visual-gap-trace"
      ? visualGapTraceRoute(overrides.visualGapAnchors ?? [])
      : undefined),
    url: overrides.url,
    screenshotPath: overrides.screenshotPath ?? `${id}.png`,
  };
}

function visualGapTraceRoute(anchors) {
  return {
    assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
    witnessView: "default",
    renderer: "tile-local-visible",
    arenaBackend: "gpu",
    tileSizePx: "16",
    maxRefsPerTile: "256",
    traceAnchors: encodeTraceAnchorsForTest(anchors),
    presentationScope: "full-scene",
  };
}

function encodeTraceAnchorsForTest(anchors) {
  return (Array.isArray(anchors) ? anchors : [])
    .map((anchor) => `${sanitizeTraceToken(anchor.id)}@${Math.floor(anchor.x)},${Math.floor(anchor.y)}:${sanitizeTraceToken(anchor.kind)}`)
    .join(";");
}

function sanitizeTraceToken(value) {
  return String(value).trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function finalAccumulationRowsFor(anchors) {
  return anchors.map((anchor) => ({
    status: "present",
    anchorPixel: { id: anchor.id, x: anchor.x, y: anchor.y },
    finalColorAccumulation: {
      steps: [{ splatIndex: 1 }],
      outputColor: [0.1, 0.2, 0.3, 0.44],
      remainingTransmittance: 0.56,
    },
  }));
}

function survivalLedgerFor(anchors, overrides = {}) {
  return {
    anchorLedgers: anchors.map((anchor) => ({
      anchorPixel: { id: anchor.id, x: anchor.x, y: anchor.y },
      category: overrides.category ?? "ordered-present",
      mechanism: overrides.mechanism ?? "retained-foreground-identity-survives-to-final-accumulation",
      counts: { retainedForeground: 2, orderedForeground: 3, ...overrides.counts },
      metrics: { finalForegroundAlpha: 0.44, ...overrides.metrics },
    })),
  };
}
