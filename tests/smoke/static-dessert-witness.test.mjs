import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildStaticDessertWitnessPlan,
  classifyStaticDessertWitness,
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
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible",
      ],
      [
        "coverage-weight",
        "tile-local-visible-debug-coverage-weight",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=coverage-weight",
      ],
      [
        "accumulated-alpha",
        "tile-local-visible-debug-accumulated-alpha",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=accumulated-alpha",
      ],
      [
        "transmittance",
        "tile-local-visible-debug-transmittance",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=transmittance",
      ],
      [
        "tile-ref-count",
        "tile-local-visible-debug-tile-ref-count",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=tile-ref-count",
      ],
      [
        "conic-shape",
        "tile-local-visible-debug-conic-shape",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&tileDebug=conic-shape",
      ],
    ]
  );
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
              projectedTileEntryCount: 64000,
              currentRetainedEntryCount: 24000,
              legacyRetainedEntryCount: 24000,
              addedByPolicyCount: 120,
              droppedByPolicyCount: 120,
            },
            regions: {
              centerLeakBand: {
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
    ],
  });

  assert.equal(result.closeable, true);
  assert.equal(result.summary.status, "PASS");
  assert.equal(result.metrics.fixedView.viewport, "1280x720");
  assert.equal(result.metrics.tileRefs.total, 24000);
  assert.equal(result.metrics.tileRefCustody.projectedTileEntryCount, 64000);
  assert.equal(result.metrics.tileRefCustody.evictedTileEntryCount, 40000);
  assert.equal(result.metrics.tileRefCustody.headerAccountingMatches, true);
  assert.equal(result.metrics.retentionAudit.fullFrame.addedByPolicyCount, 120);
  assert.equal(result.metrics.retentionAudit.regions.centerLeakBand.addedByPolicyCount, 17);
  assert.equal(result.metrics.conicShape.maxAnisotropy, 5);
  assert.equal(result.metrics.rendererBridge.plateRendererLabel, "plate");
  assert.equal(result.metrics.rendererBridge.tileLocalRendererLabel, "tile-local-visible-gaussian-compositor");
  assert.equal(result.metrics.sourceSupport.rimBand.projectedCenterCount, 37);
  assert.equal(result.metrics.sourceSupport.rimBand.projectedSupportCount, 91);
  assert.deepEqual(result.metrics.sourceSupport.rimBand.sampleOriginalIds, [100, 101, 102]);
  assert.equal(result.observations.visibleHoles.evidenceIds.includes("coverage-weight"), true);
  assert.equal(result.observations.plateSeepage.evidenceIds.includes("transmittance"), true);
  assert.equal(result.observations.budgetSkip.status, "separate-high-viewport-observation");
});

test("visual smoke CLI exposes a static dessert witness batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--static-dessert-witness/);
  assert.match(source, /runStaticDessertWitness/);
  assert.match(source, /renderStaticDessertWitnessReport/);
  assert.match(source, /Projected tile refs before cap/);
  assert.match(source, /Retention audit full frame/);
  assert.match(source, /Center leak band retention audit/);
});

function witnessCapture(id, overrides = {}) {
  const rendererLabel = overrides.rendererLabel ?? `tile-local-visible-debug-${id}`;
  return {
    id,
    classification: {
      nonblank: true,
      realSplatEvidence: true,
      harnessPassed: true,
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
          },
        },
      },
      assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      splatCount: 94406,
      canvas: { width: 1280, height: 720, clientWidth: 1280, clientHeight: 720 },
      tileLocal: {
        refs: 24000,
        tileColumns: 214,
        tileRows: 120,
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
      changedPixelRatio: 0.2,
      distinctColorCount: 1024,
    },
  };
}
