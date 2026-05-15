import assert from "node:assert/strict";
import test from "node:test";

import {
  BLACK_BAND_TRACE_ANCHOR,
  buildBandDispatchCacheTrace,
  buildBandPixelOrderTraceRecord,
} from "../../src/rendererFidelityProbes/bandOrderTrace.js";
import { validatePixelContributorTraceRecord } from "../../src/rendererFidelityProbes/pixelContributorTraceSchema.js";

test("band order trace emits canonical ordered contributors and dispatch/cache freshness", () => {
  const record = buildBandPixelOrderTraceRecord({
    contributors: [
      bandContributor({
        splatIndex: 18,
        originalId: 1800,
        viewRank: 30,
        viewDepth: -4.4,
        centerPx: [2300.5, 1055.5],
      }),
      bandContributor({
        splatIndex: 11,
        originalId: 1100,
        viewRank: 12,
        viewDepth: -7.25,
        centerPx: [2300.4, 1055.4],
      }),
      bandContributor({
        splatIndex: 91,
        originalId: 9100,
        viewRank: 99,
        viewDepth: -2.0,
        centerPx: [2400, 1180],
      }),
    ],
    dispatchCache: buildBandDispatchCacheTrace({
      tileColumns: 216,
      tileRows: 113,
      tileSizePx: 16,
      viewportWidth: 3456,
      viewportHeight: 1804,
      currentFrameId: 88,
      clearFrameId: 88,
      buildFrameId: 88,
      compositeFrameId: 88,
      cacheState: "current",
    }),
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible",
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
      tileSizePx: 16,
      maxRefsPerTile: 256,
    },
  });

  assert.equal(record.anchorPixel.id, BLACK_BAND_TRACE_ANCHOR.id);
  assert.deepEqual(record.tileAddress, {
    tileSizePx: 16,
    tileX: 143,
    tileY: 65,
    tileIndex: 14183,
    localX: 12,
    localY: 15,
  });
  assert.deepEqual(
    record.orderedContributors.map((contributor) => [
      contributor.orderIndex,
      contributor.splatIndex,
      contributor.originalId,
      contributor.viewRank,
      contributor.viewDepth,
      contributor.tieBreakKey,
      contributor.orderBackend,
    ]),
    [
      [0, 11, 1100, 12, -7.25, "rank:12|depth:-7.25|original:1100|splat:11", "gpu-sorted-index-rank-inversion"],
      [1, 18, 1800, 30, -4.4, "rank:30|depth:-4.4|original:1800|splat:18", "gpu-sorted-index-rank-inversion"],
    ],
  );
  assert.deepEqual(record.dispatchCache, {
    tileIndex: 14183,
    clearFrameId: 88,
    buildFrameId: 88,
    compositeFrameId: 88,
    tileY: 65,
    tileSpan: {
      minTileX: 139,
      maxTileX: 149,
      minTileY: 64,
      maxTileY: 66,
    },
    cacheState: "current",
    presentationFrameId: 88,
    rowDispatchState: {
      tileCoveredByClear: true,
      tileCoveredByBuild: true,
      tileCoveredByComposite: true,
      rowCoveredByComposite: true,
      currentFrameComplete: true,
    },
  });
  assert.deepEqual(validatePixelContributorTraceRecord(record), []);
});

test("band order trace names missing per-pixel ordering instrumentation when support is absent", () => {
  const record = buildBandPixelOrderTraceRecord({
    contributors: [],
    dispatchCache: buildBandDispatchCacheTrace({
      tileColumns: 216,
      tileRows: 113,
      tileSizePx: 16,
      viewportWidth: 3456,
      viewportHeight: 1804,
      currentFrameId: 89,
      clearFrameId: 88,
      buildFrameId: 88,
      compositeFrameId: 89,
      cacheState: "stale-cache",
    }),
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible-stale-cache",
    },
  });

  assert.deepEqual(record.orderedContributors, []);
  assert.deepEqual(record.blockers, [
    {
      field: "orderedContributors",
      reason: "tileLocal.perPixelOrderedContributors missing for black-band-dropout-2300-1055",
    },
  ]);
  assert.equal(record.dispatchCache.cacheState, "stale-cache");
  assert.equal(record.dispatchCache.rowDispatchState.currentFrameComplete, false);
  assert.deepEqual(validatePixelContributorTraceRecord(record), []);
});

function bandContributor(overrides = {}) {
  return {
    splatIndex: 1,
    originalId: 100,
    tileIndex: 14183,
    viewRank: 1,
    viewDepth: -1,
    centerPx: [2300.5, 1055.5],
    inverseConic: [0.5, 0, 0.5],
    opacity: 0.7,
    coverageWeight: 0.8,
    ...overrides,
  };
}
