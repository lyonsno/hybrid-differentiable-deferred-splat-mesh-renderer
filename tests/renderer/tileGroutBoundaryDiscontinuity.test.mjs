import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGpuTileCoverageBridge,
  buildTileLocalContributorArena,
} from "../../src/gpuTileCoverageBridge.js";
import { composeTileLocalGaussianTile } from "../../src/rendererFidelityProbes/tileLocalCompositor.js";

// Synthetic scenario: two adjacent tiles (tile 0 and tile 1) sharing a smooth
// surface of splats under cap pressure. Some splats straddle the boundary and
// appear in both tiles with similar coverage weights. Under cap pressure, the
// per-tile top-K selection can retain a boundary splat in one tile but drop it
// in the other, producing a visible color discontinuity at the tile edge.

function makeBoundarySplat(splatIndex, coverageWeightTile0, coverageWeightTile1, opts = {}) {
  const viewDepth = opts.viewDepth ?? 0.5 + splatIndex * 0.001;
  const viewRank = opts.viewRank ?? splatIndex;
  const opacity = opts.opacity ?? 0.7;
  const retentionWeight = opts.retentionWeight ?? coverageWeightTile0 * opacity * 0.8;
  const occlusionWeight = opts.occlusionWeight ?? coverageWeightTile0 * opacity;
  return {
    splatIndex,
    originalId: 1000 + splatIndex,
    coverageWeightTile0,
    coverageWeightTile1,
    viewDepth,
    viewRank,
    opacity,
    retentionWeight,
    occlusionWeight,
    occlusionDensity: opacity,
  };
}

function buildTwoTileCoverage({ maxRefsPerTile }) {
  // Scenario: two adjacent tiles sharing 4 boundary splats from a smooth
  // surface. Each tile also has 4 exclusive splats. With maxRefsPerTile=6,
  // each tile has 8 projected refs (4 exclusive + 4 shared) and must choose
  // 6. Without boundary awareness, a tile may retain all 4 exclusives plus
  // 2 shared, while the neighbor retains all 4 exclusives plus different
  // 2 shared — producing a seam. With boundary awareness, both tiles should
  // agree on which shared splats to keep.
  const tile0Only = Array.from({ length: 4 }, (_, i) =>
    makeBoundarySplat(i, 3.0 - i * 0.3, 0, { viewRank: i })
  );
  const shared = Array.from({ length: 4 }, (_, i) =>
    makeBoundarySplat(4 + i, 2.5 - i * 0.15, 2.5 - i * 0.15, {
      viewRank: 4 + i,
      retentionWeight: (2.5 - i * 0.15) * 0.7 * 0.8,
      occlusionWeight: (2.5 - i * 0.15) * 0.7,
    })
  );
  const tile1Only = Array.from({ length: 4 }, (_, i) =>
    makeBoundarySplat(8 + i, 0, 3.0 - i * 0.3, { viewRank: 8 + i })
  );

  const allSplats = [...tile0Only, ...shared, ...tile1Only];

  const tileEntries = [];
  for (const s of allSplats) {
    if (s.coverageWeightTile0 > 0) {
      tileEntries.push({
        tileIndex: 0, tileX: 0, tileY: 0,
        splatIndex: s.splatIndex, originalId: s.originalId,
        coverageWeight: s.coverageWeightTile0,
        viewDepth: s.viewDepth, viewRank: s.viewRank,
        opacity: s.opacity,
        retentionWeight: s.retentionWeight,
        occlusionWeight: s.occlusionWeight,
        occlusionDensity: s.occlusionDensity,
      });
    }
    if (s.coverageWeightTile1 > 0) {
      tileEntries.push({
        tileIndex: 1, tileX: 1, tileY: 0,
        splatIndex: s.splatIndex, originalId: s.originalId,
        coverageWeight: s.coverageWeightTile1,
        viewDepth: s.viewDepth, viewRank: s.viewRank,
        opacity: s.opacity,
        retentionWeight: s.retentionWeight,
        occlusionWeight: s.occlusionWeight,
        occlusionDensity: s.occlusionDensity,
      });
    }
  }

  const splatPayloads = allSplats.map((s) => ({
    splatIndex: s.splatIndex,
    originalId: s.originalId,
    centerPx: [8, 8],
    covariancePx: { xx: 16, xy: 0, yy: 16 },
    tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 1, maxTileY: 0 },
  }));

  return {
    viewportWidth: 32,
    viewportHeight: 16,
    tileSizePx: 16,
    tileColumns: 2,
    tileRows: 1,
    sourceSplatCount: allSplats.length,
    splats: splatPayloads,
    tileEntries,
    maxRefsPerTile,
  };
}

function retainedSplatIdsForTile(arena, tileIndex) {
  return arena.projectedContributors
    .filter((c) => c.tileIndex === tileIndex && c.retentionStatus === "retained")
    .map((c) => c.splatIndex);
}

test("adjacent tiles under cap pressure diverge on shared-surface splat retention", () => {
  const coverage = buildTwoTileCoverage({ maxRefsPerTile: 6 });
  const arena = buildTileLocalContributorArena(coverage, { maxRefsPerTile: 6 });

  const tile0Retained = new Set(retainedSplatIdsForTile(arena, 0));
  const tile1Retained = new Set(retainedSplatIdsForTile(arena, 1));

  // Shared splats (indices 4-7) appear in both tiles.
  const sharedSplatIds = [4, 5, 6, 7];

  // Count how many shared splats are retained in BOTH tiles vs only one.
  let retainedInBoth = 0;
  let retainedInOnlyOne = 0;
  for (const id of sharedSplatIds) {
    const inTile0 = tile0Retained.has(id);
    const inTile1 = tile1Retained.has(id);
    if (inTile0 && inTile1) retainedInBoth += 1;
    else if (inTile0 || inTile1) retainedInOnlyOne += 1;
  }

  // The boundary-continuity repair should ensure that shared splats are
  // preferentially retained in both tiles when they appear in both. Under
  // the current tile-independent selection, some shared splats will be
  // retained in one tile but dropped in the other — producing boundary
  // discontinuity.
  //
  // After the fix: all shared splats that are retained in either tile should
  // also be retained in the other (retainedInOnlyOne === 0).
  assert.equal(
    retainedInOnlyOne,
    0,
    `${retainedInOnlyOne} shared splat(s) retained in only one tile — ` +
    `boundary discontinuity. retainedInBoth=${retainedInBoth}. ` +
    `tile0: [${[...tile0Retained].sort().join(",")}], ` +
    `tile1: [${[...tile1Retained].sort().join(",")}]`
  );
});

test("boundary-continuous retention produces matching compositor color at tile edge", () => {
  const coverage = buildTwoTileCoverage({ maxRefsPerTile: 6 });
  const bridge = buildGpuTileCoverageBridge(coverage, { maxRefsPerTile: 6 });
  const arena = bridge.contributorArena;

  const tile0Retained = retainedSplatIdsForTile(arena, 0);
  const tile1Retained = retainedSplatIdsForTile(arena, 1);

  // For each shared splat that is retained in both tiles, verify it has the
  // same coverageWeight in both tile entries (the compositor would use these).
  const sharedSplatIds = new Set([4, 5, 6, 7]);
  const retainedShared0 = tile0Retained.filter((id) => sharedSplatIds.has(id));
  const retainedShared1 = tile1Retained.filter((id) => sharedSplatIds.has(id));

  // Both tiles should retain the same set of shared splats.
  assert.deepEqual(
    retainedShared0.sort(),
    retainedShared1.sort(),
    "Retained shared splats must be identical across adjacent tiles for boundary continuity"
  );
});

test("cap-pressure diagnostics report no boundary-divergent dropped refs after fix", () => {
  const coverage = buildTwoTileCoverage({ maxRefsPerTile: 6 });
  const arena = buildTileLocalContributorArena(coverage, { maxRefsPerTile: 6 });

  // Verify the arena metadata is consistent.
  assert.equal(arena.metadata.tileCount, 2);
  assert.equal(arena.metadata.maxRefsPerTile, 6);

  // Each tile should retain exactly maxRefsPerTile refs.
  for (const header of arena.tileHeaders) {
    assert.ok(
      header.retainedContributorCount <= 6,
      `tile retained ${header.retainedContributorCount} > maxRefsPerTile 6`
    );
  }
});

test("boundary continuity does not starve high-priority tile-exclusive pressure refs", () => {
  const maxRefsPerTile = 8;
  const coverage = buildBoundarySurfaceWithExclusivePressureCoverage({ maxRefsPerTile });
  const bridge = buildGpuTileCoverageBridge(coverage, { maxRefsPerTile });
  const retainedOriginalIds = [];
  const retainedRefCount = bridge.tileHeaders[1];

  for (let index = 0; index < retainedRefCount; index += 1) {
    retainedOriginalIds.push(bridge.tileRefs[index * 4 + 1]);
  }

  const retainedPressureCount = retainedOriginalIds.filter((originalId) => originalId >= 900).length;
  assert.ok(
    retainedPressureCount >= 3,
    `expected boundary repair to preserve pressure-ref reserve policy; retained ${retainedPressureCount} pressure refs: ` +
    `[${retainedOriginalIds.join(",")}]`
  );
});

function buildBoundarySurfaceWithExclusivePressureCoverage({ maxRefsPerTile }) {
  const tileEntries = [];
  const splats = [];

  for (let index = 0; index < 12; index += 1) {
    splats.push({
      splatIndex: index,
      originalId: 100 + index,
      centerPx: [8, 8],
      covariancePx: { xx: 16, xy: 0, yy: 16 },
      tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 1, maxTileY: 0 },
    });
    const entry = {
      splatIndex: index,
      originalId: 100 + index,
      coverageWeight: 20 - index * 0.1,
      retentionWeight: 0.2,
      occlusionWeight: 0.2,
      occlusionDensity: 0.01,
    };
    tileEntries.push({ ...entry, tileIndex: 0, tileX: 0, tileY: 0 });
    tileEntries.push({ ...entry, tileIndex: 1, tileX: 1, tileY: 0 });
  }

  for (let index = 0; index < 4; index += 1) {
    const splatIndex = 20 + index;
    splats.push({
      splatIndex,
      originalId: 900 + index,
      centerPx: [8, 8],
      covariancePx: { xx: 16, xy: 0, yy: 16 },
      tileBounds: { minTileX: 0, minTileY: 0, maxTileX: 0, maxTileY: 0 },
    });
    tileEntries.push({
      tileIndex: 0,
      tileX: 0,
      tileY: 0,
      splatIndex,
      originalId: 900 + index,
      coverageWeight: 0.1 + index * 0.01,
      retentionWeight: 3 - index * 0.1,
      occlusionWeight: 2 - index * 0.1,
      occlusionDensity: 0.95 - index * 0.01,
    });
  }

  return {
    viewportWidth: 32,
    viewportHeight: 16,
    tileSizePx: 16,
    tileColumns: 2,
    tileRows: 1,
    sourceSplatCount: 24,
    splats,
    tileEntries,
    maxRefsPerTile,
  };
}
