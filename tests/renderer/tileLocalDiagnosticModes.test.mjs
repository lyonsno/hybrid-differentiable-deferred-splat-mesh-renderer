import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GPU_TILE_COVERAGE_DEBUG_MODE_CODES,
  writeGpuTileCoverageFrameUniforms,
  createGpuTileCoveragePlan,
} from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";
import {
  summarizeTileLocalDiagnostics,
} from "../../src/rendererFidelityProbes/tileLocalDiagnostics.js";

test("GPU tile coverage uniforms carry an explicit debug heatmap mode without changing the default", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 64,
    viewportHeight: 32,
    tileSizePx: 8,
    splatCount: 2,
    maxTileRefs: 4,
  });
  const target = new Float32Array(28);
  const viewProj = Float32Array.from({ length: 16 }, (_, index) => index + 1);

  writeGpuTileCoverageFrameUniforms(target, viewProj, plan);
  assert.equal(target[19], GPU_TILE_COVERAGE_DEBUG_MODE_CODES["final-color"]);

  writeGpuTileCoverageFrameUniforms(target, viewProj, plan, "transmittance");
  assert.equal(target[19], GPU_TILE_COVERAGE_DEBUG_MODE_CODES.transmittance);
});

test("tile-local diagnostic summary exports coverage, alpha/transmittance, ref density, and conic shape", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "accumulated-alpha",
    plan: {
      tileColumns: 2,
      tileRows: 1,
      tileSizePx: 8,
      maxTileRefs: 4,
    },
    tileEntryCount: 3,
    tileHeaders: Uint32Array.from([
      0, 2, 0, 0,
      2, 1, 0, 0,
    ]),
    tileRefCustody: {
      projectedTileEntryCount: 5,
      retainedTileEntryCount: 3,
      evictedTileEntryCount: 2,
      cappedTileCount: 1,
      saturatedRetainedTileCount: 1,
      maxProjectedRefsPerTile: 4,
      maxRetainedRefsPerTile: 2,
      headerRefCount: 3,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: Float32Array.from([0.25, 0.75, 1.5, 0]),
    alphaParamData: Float32Array.from([
      0.5, 4, 4, 0,
      0.8, 5, 5, 0,
      0.25, 12, 4, 0,
      0, 0, 0, 0,
      0.25, 0, 1, 0,
      1, 0, 4, 0,
      0.0625, 0, 0.25, 0,
      1, 0, 1, 0,
    ]),
  });

  assert.equal(summary.version, 1);
  assert.equal(summary.debugMode, "accumulated-alpha");
  assert.equal(summary.tileRefs.total, 3);
  assert.equal(summary.tileRefs.nonEmptyTiles, 2);
  assert.equal(summary.tileRefs.maxPerTile, 2);
  assert.deepEqual(summary.tileRefCustody, {
    projectedTileEntryCount: 5,
    retainedTileEntryCount: 3,
    evictedTileEntryCount: 2,
    cappedTileCount: 1,
    saturatedRetainedTileCount: 1,
    maxProjectedRefsPerTile: 4,
    maxRetainedRefsPerTile: 2,
    headerRefCount: 3,
    headerAccountingMatches: true,
  });
  assert.equal(summary.coverageWeight.max, 1.5);
  assert(summary.alpha.estimatedMaxAccumulatedAlpha > 0.5);
  assert(summary.alpha.estimatedMinTransmittance < 0.5);
  assert.equal(summary.conicShape.maxMajorRadiusPx, 4);
  assert.equal(summary.conicShape.minMinorRadiusPx, 0.5);
});

test("tile-local diagnostic summary falls back to runtime contributor conics when alpha mirror is empty", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "conic-shape",
    plan: {
      tileColumns: 2,
      tileRows: 1,
      tileSizePx: 8,
      maxTileRefs: 8,
    },
    tileEntryCount: 0,
    tileHeaders: new Uint32Array(8),
    tileRefCustody: {
      projectedTileEntryCount: 2,
      retainedTileEntryCount: 2,
      evictedTileEntryCount: 0,
      cappedTileCount: 0,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 2,
      maxRetainedRefsPerTile: 2,
      headerRefCount: 2,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: new Float32Array(0),
    alphaParamData: new Float32Array(8),
    runtimeContributors: [
      { splatIndex: 10, originalId: 100, tileIndex: 0, inverseConic: [0.25, 0, 4] },
      { splatIndex: 11, originalId: 101, tileIndex: 0, inverseConic: [0.0625, 0, 0.25] },
    ],
  });

  assert.equal(summary.conicShape.maxMajorRadiusPx, 4);
  assert.equal(summary.conicShape.minMinorRadiusPx, 0.5);
  assert.equal(summary.conicShape.maxAnisotropyRatio, 4);
  assert.equal(summary.conicShape.source, "runtime-contributor-conics");
});

test("tile-local diagnostic summary falls back to projected frontier conics without retained runtime rows", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "conic-shape",
    plan: {
      tileColumns: 2,
      tileRows: 1,
      tileSizePx: 8,
      maxTileRefs: 8,
    },
    tileEntryCount: 0,
    tileHeaders: new Uint32Array(8),
    tileRefCustody: {
      projectedTileEntryCount: 2,
      retainedTileEntryCount: 0,
      evictedTileEntryCount: 0,
      cappedTileCount: 0,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 0,
      maxRetainedRefsPerTile: 0,
      headerRefCount: 0,
      headerAccountingMatches: false,
    },
    tileCoverageWeights: new Float32Array(0),
    alphaParamData: new Float32Array(8),
    runtimeContributors: [],
    runtimeConicSources: [
      { covariancePx: { xx: 16, xy: 0, yy: 0.25 } },
      { covariancePx: { xx: 4, xy: 0, yy: 1 } },
    ],
  });

  assert.equal(summary.conicShape.maxMajorRadiusPx, 4);
  assert.equal(summary.conicShape.minMinorRadiusPx, 0.5);
  assert.equal(summary.conicShape.maxAnisotropyRatio, 8);
  assert.equal(summary.conicShape.source, "projected-source-frontier-conics");
});

test("tile-local diagnostic summary uses GPU custody and opacity estimates when CPU tile arrays are absent", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "accumulated-alpha",
    plan: {
      tileColumns: 4,
      tileRows: 2,
      tileSizePx: 16,
      maxTileRefs: 2048,
    },
    tileEntryCount: 512,
    tileHeaders: new Uint32Array(4 * 4 * 2),
    tileRefCustody: {
      projectedTileEntryCount: 512,
      retainedTileEntryCount: 512,
      evictedTileEntryCount: 0,
      cappedTileCount: 0,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 64,
      maxRetainedRefsPerTile: 64,
      headerRefCount: 512,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: new Float32Array(0),
    alphaParamData: new Float32Array(8),
    sourceOpacities: Float32Array.from([0.1, 0.35, 0.7]),
  });

  assert.equal(summary.tileRefs.total, 512);
  assert.equal(summary.tileRefs.nonEmptyTiles, 8);
  assert.equal(summary.tileRefs.maxPerTile, 64);
  assert.equal(summary.alpha.maxSourceOpacity, 0.7);
  assert(summary.alpha.estimatedMaxAccumulatedAlpha > 0);
  assert(summary.alpha.estimatedMinTransmittance < 1);
});

test("tile-local diagnostic summary trusts live GPU ref readback when CPU tile arrays are empty", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns: 216,
      tileRows: 120,
      tileSizePx: 16,
      maxTileRefs: 6_635_520,
    },
    tileEntryCount: 0,
    tileHeaders: new Uint32Array(216 * 120 * 4),
    tileRefCustody: {
      projectedTileEntryCount: 833_927,
      retainedTileEntryCount: 0,
      evictedTileEntryCount: 206_284,
      cappedTileCount: 0,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 0,
      maxRetainedRefsPerTile: 0,
      headerRefCount: 0,
      headerAccountingMatches: false,
    },
    tileCoverageWeights: new Float32Array(0),
    alphaParamData: new Float32Array(8),
    runtimeRefStatsReadback: {
      status: "present",
      source: "gpu-tile-header-and-scatter-readback",
      frameId: 4,
      tileCount: 25_920,
      tileCapacity: 256,
      allocatedRefs: 6_635_520,
      projectedScatterRefs: 833_927,
      retainedRefs: 627_643,
      droppedRefs: 206_284,
      nonEmptyTiles: 2_472,
      saturatedTiles: 110,
      maxRefsPerTile: 256,
    },
  });

  assert.equal(summary.tileRefs.total, 627_643);
  assert.equal(summary.tileRefs.nonEmptyTiles, 2_472);
  assert.equal(summary.tileRefs.maxPerTile, 256);
  assert.equal(summary.runtimeRefBudget.runtimeRetainedRefs, 627_643);
  assert.equal(summary.runtimeRefBudget.effectiveRefsPerTile > 0, true);
  assert.equal(summary.runtimeRefBudget.frameHeaderAccounting.evictedTileEntryCount, 206_284);
  assert.equal(summary.runtimeRefBudget.frameHeaderAccounting.saturatedRetainedTileCount, 110);
  assert.equal(summary.presentationFootprint.classification, "frame-footprint-present");
  assert.equal(summary.presentationFootprint.retainedRefCount, 627_643);
});

test("tile-local diagnostic summary refuses source-frontier zero placeholders over live loss readback", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns: 80,
      tileRows: 45,
      tileSizePx: 16,
      maxTileRefs: 921_600,
    },
    tileEntryCount: 0,
    tileHeaders: new Uint32Array(80 * 45 * 4),
    tileRefCustody: {
      projectedTileEntryCount: 0,
      retainedTileEntryCount: 0,
      evictedTileEntryCount: 0,
      cappedTileCount: 0,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 0,
      maxRetainedRefsPerTile: 0,
      headerRefCount: 0,
      headerAccountingMatches: false,
    },
    tileCoverageWeights: new Float32Array(0),
    alphaParamData: new Float32Array(8),
    runtimeRefStatsReadback: {
      status: "present",
      source: "gpu-tile-header-and-scatter-readback",
      frameId: 1,
      tileCount: 3_600,
      tileCapacity: 256,
      allocatedRefs: 921_600,
      projectedScatterRefs: 503_235,
      retainedRefs: 37_590,
      droppedRefs: 465_645,
      nonEmptyTiles: 177,
      saturatedTiles: 131,
      maxRefsPerTile: 256,
    },
  });

  assert.equal(summary.tileRefCustody.projectedTileEntryCount, 503_235);
  assert.equal(summary.tileRefCustody.retainedTileEntryCount, 37_590);
  assert.equal(summary.tileRefCustody.evictedTileEntryCount, 465_645);
  assert.equal(summary.tileRefCustody.saturatedRetainedTileCount, 131);
  assert.equal(summary.runtimeRefBudget.frameHeaderAccounting.evictedTileEntryCount, 465_645);
  assert.equal(summary.runtimeRefBudget.frameHeaderAccounting.saturatedRetainedTileCount, 131);
  assert.equal(summary.presentationFootprint.classification, "frame-footprint-present");
});

test("tile-local diagnostic summary treats present live zero readback as evidence over stale custody", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns: 80,
      tileRows: 45,
      tileSizePx: 16,
      maxTileRefs: 921_600,
    },
    tileEntryCount: 0,
    tileHeaders: new Uint32Array(80 * 45 * 4),
    tileRefCustody: {
      projectedTileEntryCount: 503_235,
      retainedTileEntryCount: 37_590,
      evictedTileEntryCount: 465_645,
      cappedTileCount: 131,
      saturatedRetainedTileCount: 131,
      maxProjectedRefsPerTile: 256,
      maxRetainedRefsPerTile: 256,
      headerRefCount: 37_590,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: new Float32Array(0),
    alphaParamData: new Float32Array(8),
    runtimeRefStatsReadback: {
      status: "present",
      source: "gpu-tile-header-and-scatter-readback",
      frameId: 2,
      tileCount: 3_600,
      tileCapacity: 256,
      allocatedRefs: 921_600,
      projectedScatterRefs: 0,
      retainedRefs: 0,
      droppedRefs: 0,
      nonEmptyTiles: 0,
      saturatedTiles: 0,
      maxRefsPerTile: 0,
    },
  });

  assert.equal(summary.tileRefs.total, 0);
  assert.equal(summary.tileRefs.nonEmptyTiles, 0);
  assert.equal(summary.tileRefs.maxPerTile, 0);
  assert.deepEqual(summary.tileRefCustody, {
    projectedTileEntryCount: 0,
    retainedTileEntryCount: 0,
    evictedTileEntryCount: 0,
    cappedTileCount: 0,
    saturatedRetainedTileCount: 0,
    maxProjectedRefsPerTile: 0,
    maxRetainedRefsPerTile: 0,
    headerRefCount: 0,
    headerAccountingMatches: true,
  });
  assert.equal(summary.runtimeRefBudget.runtimeRetainedRefs, 0);
  assert.equal(summary.runtimeRefBudget.frameHeaderAccounting.evictedTileEntryCount, 0);
  assert.equal(summary.runtimeRefBudget.frameHeaderAccounting.saturatedRetainedTileCount, 0);
});

test("tile-local diagnostic summary classifies GPU runtime budget below trace retained contributors", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns: 216,
      tileRows: 120,
      tileSizePx: 16,
      maxTileRefs: 2360150,
    },
    tileEntryCount: 2360150,
    tileHeaders: new Uint32Array(216 * 120 * 4),
    tileRefCustody: {
      projectedTileEntryCount: 94406 * 9,
      retainedTileEntryCount: 2360150,
      evictedTileEntryCount: 0,
      cappedTileCount: 0,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 94406,
      maxRetainedRefsPerTile: 91,
      headerRefCount: 2360150,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: new Float32Array(0),
    alphaParamData: new Float32Array(8),
    traceCapacityEvidence: {
      anchors: [
        { id: "fresh-a", projectedCount: 2396, retainedCount: 256, finalStepCount: 256 },
        { id: "fresh-b", projectedCount: 2159, retainedCount: 256, finalStepCount: 256 },
        { id: "fresh-c", projectedCount: 2052, retainedCount: 256, finalStepCount: 256 },
      ],
    },
  });

  assert.equal(summary.runtimeRefBudget.classification, "runtime-capacity-loss");
  assert.equal(summary.runtimeRefBudget.tileCount, 25920);
  assert.equal(summary.runtimeRefBudget.maxTraceRetainedContributors, 256);
  assert.equal(summary.runtimeRefBudget.effectiveRefsPerTile < 256, true);
  assert.deepEqual(summary.runtimeRefBudget.blockingAnchors.map((anchor) => anchor.id), [
    "fresh-a",
    "fresh-b",
    "fresh-c",
  ]);
});

test("tile-local runtime budget exposes per-anchor live tile identities for trace comparison", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns: 2,
      tileRows: 1,
      tileSizePx: 16,
      maxTileRefs: 8,
    },
    tileEntryCount: 3,
    tileHeaders: Uint32Array.from([
      0, 2, 3, 1,
      2, 1, 1, 0,
    ]),
    tileRefCustody: {
      projectedTileEntryCount: 4,
      retainedTileEntryCount: 3,
      evictedTileEntryCount: 1,
      cappedTileCount: 1,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 3,
      maxRetainedRefsPerTile: 2,
      headerRefCount: 3,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: Float32Array.from([0.9, 0.8, 0.7]),
    alphaParamData: new Float32Array(8),
    runtimeContributors: [
      { splatIndex: 10, originalId: 100, tileIndex: 0 },
      { splatIndex: 11, originalId: 101, tileIndex: 0 },
      { splatIndex: 20, originalId: 200, tileIndex: 1 },
    ],
    traceCapacityEvidence: {
      anchors: [
        {
          id: "fresh-a",
          x: 7,
          y: 9,
          tileAddress: { tileSizePx: 16, tileX: 0, tileY: 0, tileIndex: 0, localX: 7, localY: 9 },
          projectedCount: 3,
          retainedCount: 3,
          finalStepCount: 3,
          retainedIdentities: [
            { splatIndex: 10, originalId: 100 },
            { splatIndex: 11, originalId: 101 },
            { splatIndex: 12, originalId: 102 },
          ],
        },
      ],
    },
  });

  assert.deepEqual(summary.runtimeRefBudget.frameHeaderAccounting, {
    projectedTileEntryCount: 4,
    retainedTileEntryCount: 3,
    evictedTileEntryCount: 1,
    cappedTileCount: 1,
    saturatedRetainedTileCount: 0,
    maxProjectedRefsPerTile: 3,
    maxRetainedRefsPerTile: 2,
    headerRefCount: 3,
    headerAccountingMatches: true,
  });
  assert.equal(summary.runtimeRefBudget.anchorTileEvidence.length, 1);
  const [anchor] = summary.runtimeRefBudget.anchorTileEvidence;
  assert.equal(anchor.id, "fresh-a");
  assert.deepEqual(anchor.anchorPixel, { x: 7, y: 9 });
  assert.deepEqual(anchor.tileAddress, { tileSizePx: 16, tileX: 0, tileY: 0, tileIndex: 0, localX: 7, localY: 9 });
  assert.equal(anchor.traceProjectedCount, 3);
  assert.equal(anchor.traceRetainedCount, 3);
  assert.equal(anchor.traceFinalStepCount, 3);
  assert.deepEqual(anchor.runtimeTileHeader, {
    contributorOffset: 0,
    retainedContributorCount: 2,
    projectedContributorCount: 3,
    droppedContributorCount: 1,
    overflowFlags: 1,
  });
  assert.equal(anchor.runtimeConsumedCount, 2);
  assert.notEqual(anchor.traceRetainedIdentityHash, anchor.runtimeConsumedIdentityHash);
  assert.deepEqual(anchor.traceRetainedIdentitySample, [
    { splatIndex: 10, originalId: 100 },
    { splatIndex: 11, originalId: 101 },
    { splatIndex: 12, originalId: 102 },
  ]);
  assert.deepEqual(anchor.runtimeConsumedIdentitySample, [
    { splatIndex: 10, originalId: 100 },
    { splatIndex: 11, originalId: 101 },
  ]);
  assert.deepEqual(anchor.missingTraceIdentitySample, [
    { splatIndex: 12, originalId: 102 },
  ]);
  assert.deepEqual(anchor.extraRuntimeIdentitySample, []);
  assert.equal(anchor.identityMatch, false);

  const gpuLiveMirrorSummary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns: 2,
      tileRows: 1,
      tileSizePx: 16,
      maxTileRefs: 8,
    },
    tileEntryCount: 3,
    tileHeaders: new Uint32Array(8),
    tileRefCustody: {
      projectedTileEntryCount: 4,
      retainedTileEntryCount: 3,
      evictedTileEntryCount: 1,
      cappedTileCount: 1,
      saturatedRetainedTileCount: 0,
      maxProjectedRefsPerTile: 3,
      maxRetainedRefsPerTile: 2,
      headerRefCount: 3,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: Float32Array.from([0.9, 0.8, 0.7]),
    alphaParamData: new Float32Array(8),
    runtimeContributors: [
      { splatIndex: 10, originalId: 100, tileIndex: 0 },
      { splatIndex: 11, originalId: 101, tileIndex: 0 },
      { splatIndex: 12, originalId: 102, tileIndex: 0 },
    ],
    traceCapacityEvidence: {
      anchors: [
        {
          id: "fresh-a",
          x: 7,
          y: 9,
          tileAddress: { tileSizePx: 16, tileX: 0, tileY: 0, tileIndex: 0, localX: 7, localY: 9 },
          projectedCount: 3,
          retainedCount: 3,
          finalStepCount: 3,
          retainedIdentities: [
            { splatIndex: 10, originalId: 100 },
            { splatIndex: 11, originalId: 101 },
            { splatIndex: 12, originalId: 102 },
          ],
        },
      ],
    },
  });
  assert.equal(gpuLiveMirrorSummary.runtimeRefBudget.anchorTileEvidence[0].runtimeConsumedCount, 3);
  assert.deepEqual(gpuLiveMirrorSummary.runtimeRefBudget.anchorTileEvidence[0].runtimeTileHeader, {
    contributorOffset: 0,
    retainedContributorCount: 3,
    projectedContributorCount: 3,
    droppedContributorCount: 0,
    overflowFlags: 0,
  });
  assert.equal(gpuLiveMirrorSummary.runtimeRefBudget.anchorTileEvidence[0].identityMatch, true);
});

test("tile-local runtime budget compares live identities against final accumulation when available", () => {
  const runtimeIdentities = [
    { splatIndex: 10, originalId: 100 },
    { splatIndex: 11, originalId: 101 },
    { splatIndex: 12, originalId: 102 },
    { splatIndex: 13, originalId: 103 },
  ];
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns: 8,
      tileRows: 8,
      tileSizePx: 16,
      maxTileRefs: 4,
    },
    tileEntryCount: runtimeIdentities.length,
    tileHeaders: Uint32Array.from([
      0, 4, 4, 0,
      ...new Array((8 * 8 - 1) * 4).fill(0),
    ]),
    tileRefCustody: {
      projectedTileEntryCount: 11,
      retainedTileEntryCount: runtimeIdentities.length,
      evictedTileEntryCount: 7,
      cappedTileCount: 1,
      saturatedRetainedTileCount: 1,
      maxProjectedRefsPerTile: 11,
      maxRetainedRefsPerTile: 4,
      headerRefCount: runtimeIdentities.length,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: Float32Array.from([1, 1, 1, 1]),
    alphaParamData: new Float32Array(8),
    runtimeContributors: runtimeIdentities.map((identity) => ({
      ...identity,
      tileIndex: 0,
    })),
    traceCapacityEvidence: {
      anchors: [
        {
          id: "fresh-a",
          x: 7,
          y: 9,
          tileAddress: { tileSizePx: 16, tileX: 0, tileY: 0, tileIndex: 0, localX: 7, localY: 9 },
          projectedCount: 11,
          retainedCount: 2,
          finalStepCount: 4,
          retainedIdentities: runtimeIdentities.slice(0, 2),
          finalIdentities: runtimeIdentities,
        },
      ],
    },
  });

  assert.equal(summary.runtimeRefBudget.classification, "no-capacity-discrepancy");
  const [anchor] = summary.runtimeRefBudget.anchorTileEvidence;
  assert.equal(anchor.traceComparisonIdentitySource, "final");
  assert.equal(anchor.identityMatch, true);
  assert.equal(anchor.runtimeConsumedCount, 4);
  assert.equal(anchor.traceRetainedCount, 2);
  assert.equal(anchor.traceFinalIdentitySample.length, 4);
  assert.deepEqual(anchor.missingTraceIdentitySample, []);
  assert.deepEqual(anchor.extraRuntimeIdentitySample, []);
});

test("tile-local runtime budget repairs legacy runtime headers with trace projected pressure", () => {
  const retainedIdentities = Array.from({ length: 4 }, (_, index) => ({
    splatIndex: 100 + index,
    originalId: 200 + index,
  }));
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns: 1,
      tileRows: 1,
      tileSizePx: 16,
      maxTileRefs: 4,
    },
    tileEntryCount: 4,
    tileHeaders: Uint32Array.from([
      0, 4, 4, 0,
    ]),
    tileRefCustody: {
      projectedTileEntryCount: 11,
      retainedTileEntryCount: 4,
      evictedTileEntryCount: 7,
      cappedTileCount: 1,
      saturatedRetainedTileCount: 1,
      maxProjectedRefsPerTile: 11,
      maxRetainedRefsPerTile: 4,
      headerRefCount: 4,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: Float32Array.from([1, 1, 1, 1]),
    alphaParamData: new Float32Array(8),
    runtimeContributors: retainedIdentities.map((identity) => ({
      ...identity,
      tileIndex: 0,
    })),
    traceCapacityEvidence: {
      anchors: [
        {
          id: "legacy-saturated-anchor",
          x: 7,
          y: 9,
          tileAddress: { tileSizePx: 16, tileX: 0, tileY: 0, tileIndex: 0, localX: 7, localY: 9 },
          projectedCount: 11,
          retainedCount: 4,
          finalStepCount: 4,
          retainedIdentities,
        },
      ],
    },
  });

  const [anchor] = summary.runtimeRefBudget.anchorTileEvidence;
  assert.deepEqual(anchor.runtimeTileHeader, {
    contributorOffset: 0,
    retainedContributorCount: 4,
    projectedContributorCount: 11,
    droppedContributorCount: 7,
    overflowFlags: 1,
  });
  assert.equal(anchor.runtimeConsumedCount, 4);
  assert.equal(anchor.identityMatch, true);
});

test("tile-local diagnostics classify anchor-only retained footprints as presentation blockers", () => {
  const tileColumns = 216;
  const tileRows = 120;
  const tileCount = tileColumns * tileRows;
  const tileHeaders = new Uint32Array(tileCount * 4);
  for (let tileIndex = 0; tileIndex < 150; tileIndex += 1) {
    tileHeaders[tileIndex * 4] = tileIndex * 256;
    tileHeaders[tileIndex * 4 + 1] = 256;
    tileHeaders[tileIndex * 4 + 2] = 900;
    tileHeaders[tileIndex * 4 + 3] = 1;
  }

  const summary = summarizeTileLocalDiagnostics({
    debugMode: "final-color",
    plan: {
      tileColumns,
      tileRows,
      tileSizePx: 16,
      maxTileRefs: 38_400,
    },
    tileEntryCount: 38_400,
    tileHeaders,
    tileRefCustody: {
      projectedTileEntryCount: 20_000_001,
      retainedTileEntryCount: 38_400,
      evictedTileEntryCount: 19_961_601,
      cappedTileCount: 150,
      saturatedRetainedTileCount: 150,
      maxProjectedRefsPerTile: 1422,
      maxRetainedRefsPerTile: 256,
      headerRefCount: 38_400,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: Float32Array.from({ length: 38_400 }, () => 0.05),
    alphaParamData: Float32Array.from({ length: 38_400 * 8 }, (_, index) => index % 4 === 0 ? 0.48 : 0),
    traceCapacityEvidence: {
      anchors: [
        { id: "fresh-a", projectedCount: 690, retainedCount: 242, finalStepCount: 256 },
        { id: "fresh-f", projectedCount: 909, retainedCount: 245, finalStepCount: 256 },
      ],
    },
  });

  assert.equal(summary.presentationFootprint.classification, "anchor-neighborhood-only-output");
  assert.equal(summary.presentationFootprint.frameTileCount, 25_920);
  assert.equal(summary.presentationFootprint.nonEmptyTileCount, 150);
  assert.equal(summary.presentationFootprint.nonEmptyTileRatio < 0.01, true);
  assert.equal(summary.presentationFootprint.anchorFinalRowsPresent, true);
  assert.match(summary.presentationFootprint.blocker, /compact rows are present/i);
});

test("tile-local diagnostic shader branches are debug-only and preserve final color as mode zero", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /debugMode:\s*f32/);
  assert.match(shader, /DEBUG_MODE_FINAL_COLOR/);
  assert.match(shader, /DEBUG_MODE_COVERAGE_WEIGHT/);
  assert.match(shader, /DEBUG_MODE_ACCUMULATED_ALPHA/);
  assert.match(shader, /DEBUG_MODE_TRANSMITTANCE/);
  assert.match(shader, /DEBUG_MODE_TILE_REF_COUNT/);
  assert.match(shader, /DEBUG_MODE_CONIC_SHAPE/);
  assert.match(shader, /if\s*\(frame\.debugMode\s*==\s*DEBUG_MODE_FINAL_COLOR\)/);
  assert.match(shader, /debug_heatmap_color/);
});

test("tile-local diagnostic shader uses detail-preserving heatmaps instead of binary saturated blobs", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /fn\s+diagnostic_log_heat/);
  assert.match(shader, /fn\s+diagnostic_contour/);
  assert.match(shader, /fn\s+tile_coord_stripe/);
  assert.match(shader, /diagnostic_contour\(coverageWeightSum/);
  assert.match(shader, /diagnostic_contour\(accumulatedAlpha/);
  assert.match(shader, /diagnostic_contour\(remainingTransmission/);
  assert.match(shader, /tile_coord_stripe\(pixelCenter/);
});
