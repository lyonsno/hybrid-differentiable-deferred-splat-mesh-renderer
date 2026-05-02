import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGpuTileCoverageBridge,
  buildTileLocalContributorArena,
} from "../../src/gpuTileCoverageBridge.js";

function syntheticDenseTileCoverage() {
  const surface = Array.from({ length: 6 }, (_, index) => ({
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: index,
    originalId: 100 + index,
    coverageWeight: 10 - index * 0.1,
    retentionWeight: 0.35,
    occlusionWeight: 0.35,
    occlusionDensity: 0.08,
    opacity: 0.08,
    viewDepth: 0.3 + index * 0.01,
    viewRank: 1 + index,
  }));
  const darkForeground = {
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: 6,
    originalId: 800,
    coverageWeight: 0.2,
    retentionWeight: 0.004,
    occlusionWeight: 0.19,
    occlusionDensity: 0.95,
    opacity: 0.95,
    viewDepth: 0.18,
    viewRank: 0,
  };
  const brightBehind = {
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: 7,
    originalId: 900,
    coverageWeight: 0.25,
    retentionWeight: 1.05,
    occlusionWeight: 0.15,
    occlusionDensity: 0.6,
    opacity: 0.6,
    viewDepth: 0.62,
    viewRank: 7,
  };

  return {
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    tileColumns: 1,
    tileRows: 1,
    sourceSplatCount: 8,
    splats: Array.from({ length: 8 }, (_, index) => ({
      splatIndex: index,
      originalId: index === 6 ? 800 : index === 7 ? 900 : 100 + index,
      centerPx: [32, 32],
      covariancePx: { xx: 16, xy: 0, yy: 16 },
      tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 0, maxTileY: 0 },
    })),
    tileEntries: [...surface, darkForeground, brightBehind],
    maxRefsPerTile: 4,
  };
}

function retainedIdsFromBridge(bridge) {
  const ids = [];
  for (let index = 0; index < bridge.retainedTileEntryCount; index += 1) {
    ids.push(bridge.tileRefs[index * 4 + 1]);
  }
  return ids;
}

function retainedIdsFromArena(arena) {
  return arena.contributors
    .sort((left, right) => left.contributorIndex - right.contributorIndex)
    .map((contributor) => contributor.originalId);
}

test("CPU contributor arena preserves dense tile facts before legacy flat-list truncation", () => {
  const coverage = syntheticDenseTileCoverage();
  const bridge = buildGpuTileCoverageBridge(coverage);
  const arena = buildTileLocalContributorArena(coverage, {
    maxRefsPerTile: 4,
    depthBandCount: 4,
  });

  assert.equal(arena.version, 1);
  assert.equal(arena.metadata.tileCount, 1);
  assert.equal(arena.metadata.projectedContributorCount, 8);
  assert.equal(arena.metadata.retainedContributorCount, 4);
  assert.equal(arena.metadata.droppedContributorCount, 4);
  assert.equal(arena.overflowReasons.perTileRetainedCap, 1);
  assert.deepEqual(arena.tileHeaders[0], {
    contributorOffset: 0,
    retainedContributorCount: 4,
    projectedContributorCount: 8,
    droppedContributorCount: 4,
    overflowFlags: 1,
    maxRetainedViewRank: 7,
    minRetainedDepth: 0.18,
    maxRetainedDepth: 0.62,
  });

  const byId = new Map(arena.projectedContributors.map((contributor) => [contributor.originalId, contributor]));
  assert.equal(byId.get(800).retained, true, "dark high-opacity foreground contributor should survive the cap");
  assert.equal(byId.get(900).retained, true, "bright behind-surface contributor should survive the cap");
  assert.equal(byId.get(105).overflowReason, "perTileRetainedCap");
  assert.equal(byId.get(105).retained, false);

  assert.equal(byId.get(800).viewRank, 0);
  assert.equal(byId.get(900).viewRank, 7);
  assert.equal(byId.get(800).depthBand, 0);
  assert.equal(byId.get(900).depthBand, 3);
  assert.ok(byId.get(900).coverageWeight > 0);
  assert.ok(byId.get(900).opacity > 0);
  assert.deepEqual(byId.get(900).centerPx, [32, 32]);
  assert.deepEqual(byId.get(900).inverseConic, [0.0625, -0, 0.0625]);
  assert.ok(byId.get(900).transmittanceBefore >= 0);
  assert.ok(byId.get(900).transmittanceBefore < byId.get(800).transmittanceBefore);

  assert.deepEqual(retainedIdsFromArena(arena), retainedIdsFromBridge(bridge));
  assert.deepEqual(retainedIdsFromBridge(bridge), retainedIdsFromArena(bridge.contributorArena));
  assert.equal(bridge.contributorArena.tileHeaders[0].droppedContributorCount, 4);
});
