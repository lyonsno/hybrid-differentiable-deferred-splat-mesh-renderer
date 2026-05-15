import assert from "node:assert/strict";
import test from "node:test";

import { buildGpuLivePerAnchorTraceRecords } from "../../src/rendererFidelityProbes/gpuLiveTraceExtraction.js";
import {
  PIXEL_CONTRIBUTOR_TRACE_SCHEMA,
  validatePixelContributorTraceRecord,
} from "../../src/rendererFidelityProbes/pixelContributorTraceSchema.js";

const TILE_SIZE_PX = 16;
const TILE_COLUMNS = 216;
const TILE_ROWS = 113;
const MAX_TILE_REFS = TILE_COLUMNS * TILE_ROWS * 4;

test("GPU-live trace extraction decodes readback tile buffers into schema-valid anchor records", () => {
  const blackBand = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.find(
    (anchor) => anchor.id === "black-band-dropout-2300-1055",
  );
  const offset = blackBand.canonicalTileAddress.tileIndex * 4;
  const snapshot = makeReadbackSnapshot();
  writeGpuLiveContributor(snapshot, offset, {
    splatIndex: 87386,
    originalId: 87386,
    tileIndex: blackBand.canonicalTileAddress.tileIndex,
    coverageWeight: 0.25,
    opacity: 0.178431391716,
    centerPx: [blackBand.x + 0.5, blackBand.y + 0.5],
    inverseConic: [1, 0, 1],
    viewRank: 75720,
  });
  writeGpuLiveContributor(snapshot, offset + 1, {
    splatIndex: 87369,
    originalId: 87369,
    tileIndex: blackBand.canonicalTileAddress.tileIndex,
    coverageWeight: 0.5,
    opacity: 0.368627458811,
    centerPx: [blackBand.x + 2.5, blackBand.y + 0.5],
    inverseConic: [1, 0, 1],
    viewRank: 79126,
  });
  const headerBase = blackBand.canonicalTileAddress.tileIndex * 4;
  snapshot.tileHeaders[headerBase] = offset;
  snapshot.tileHeaders[headerBase + 1] = 2;
  snapshot.tileHeaders[headerBase + 2] = 2;
  snapshot.tileHeaders[headerBase + 3] = 0;

  const traces = buildGpuLivePerAnchorTraceRecords({
    ...snapshot,
    maxTileRefs: MAX_TILE_REFS,
    tileSizePx: TILE_SIZE_PX,
    tileColumns: TILE_COLUMNS,
    tileRows: TILE_ROWS,
    viewportWidth: 3456,
    viewportHeight: 1804,
    sourceColors: new Map([
      [87386, [0.328064262867, 0.222050338984, 0.140501201153]],
      [87369, [0.40145856142, 0.328064262867, 0.279134780169]],
    ]),
    viewDepthBySplatIndex: new Map([
      [87386, -0.5866499543190002],
      [87369, -0.5753166079521179],
    ]),
    rendererMetadata: {
      requestedRenderer: "tile-local-visible",
      effectiveRenderer: "tile-local-visible-gaussian-compositor",
      requestedArenaBackend: "gpu",
      effectiveArenaBackend: "gpu",
      tileSizePx: TILE_SIZE_PX,
      maxRefsPerTile: 256,
    },
    dispatchCache: {
      tileIndex: blackBand.canonicalTileAddress.tileIndex,
      clearFrameId: 12,
      buildFrameId: 12,
      compositeFrameId: 12,
      cacheState: "current",
    },
  });

  assert.deepEqual(
    traces.map((trace) => trace.anchorPixel.id),
    PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.map((anchor) => anchor.id),
  );

  const byAnchorId = new Map(traces.map((trace) => [trace.anchorPixel.id, trace]));
  const blackBandTrace = byAnchorId.get("black-band-dropout-2300-1055");
  assert.equal(blackBandTrace.status, "present");
  assert.deepEqual(blackBandTrace.blockers, []);
  assert.deepEqual(validatePixelContributorTraceRecord(blackBandTrace.traceRecord), []);
  assert.deepEqual(
    blackBandTrace.traceRecord.projectedContributors.map(({ splatIndex, originalId, projectionStatus }) => [
      splatIndex,
      originalId,
      projectionStatus,
    ]),
    [
      [87386, 87386, "gpu-live-readback-retained"],
      [87369, 87369, "gpu-live-readback-retained"],
    ],
  );
  assert.deepEqual(
    blackBandTrace.traceRecord.orderedContributors.map(({ splatIndex, orderIndex, viewRank, orderBackend }) => [
      splatIndex,
      orderIndex,
      viewRank,
      orderBackend,
    ]),
    [
      [87386, 0, 75720, "gpu-live-tile-ref-readback"],
      [87369, 1, 79126, "gpu-live-tile-ref-readback"],
    ],
  );
  assert.equal(blackBandTrace.traceRecord.finalColorAccumulation.steps.length, 2);
  assert.equal(blackBandTrace.traceRecord.rendererMetadata.effectiveArenaBackend, "gpu");
  assert.equal(blackBandTrace.traceRecord.dispatchCache.cacheState, "current");

  assert.equal(byAnchorId.get("lacunar-hole-dessert-1260-930").status, "blocked");
  assert.match(
    byAnchorId.get("lacunar-hole-dessert-1260-930").blockers[0].reason,
    /gpu-live readback has no retained contributors/,
  );
});

test("GPU-live trace extraction blocks instead of fabricating required depth evidence", () => {
  const blackBand = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.find(
    (anchor) => anchor.id === "black-band-dropout-2300-1055",
  );
  const offset = blackBand.canonicalTileAddress.tileIndex * 4;
  const snapshot = makeReadbackSnapshot();
  writeGpuLiveContributor(snapshot, offset, {
    splatIndex: 87386,
    originalId: 87386,
    tileIndex: blackBand.canonicalTileAddress.tileIndex,
    coverageWeight: 0.25,
    opacity: 0.2,
    centerPx: [blackBand.x + 0.5, blackBand.y + 0.5],
    inverseConic: [1, 0, 1],
    viewRank: 75720,
  });
  const headerBase = blackBand.canonicalTileAddress.tileIndex * 4;
  snapshot.tileHeaders[headerBase] = offset;
  snapshot.tileHeaders[headerBase + 1] = 1;
  snapshot.tileHeaders[headerBase + 2] = 1;

  const traces = buildGpuLivePerAnchorTraceRecords({
    ...snapshot,
    maxTileRefs: MAX_TILE_REFS,
    tileSizePx: TILE_SIZE_PX,
    tileColumns: TILE_COLUMNS,
    tileRows: TILE_ROWS,
    sourceColors: new Map([[87386, [0.3, 0.2, 0.1]]]),
    viewDepthBySplatIndex: new Map(),
  });

  const blackBandTrace = traces.find((trace) => trace.anchorPixel.id === "black-band-dropout-2300-1055");
  assert.equal(blackBandTrace.status, "blocked");
  assert.deepEqual(blackBandTrace.traceRecord.projectedContributors, []);
  assert.match(blackBandTrace.blockers[0].reason, /missing viewDepth for splat 87386/);
  assert.deepEqual(validatePixelContributorTraceRecord(blackBandTrace.traceRecord), []);
});

function makeReadbackSnapshot() {
  return {
    tileHeaders: new Uint32Array(TILE_COLUMNS * TILE_ROWS * 4),
    tileRefs: new Uint32Array(MAX_TILE_REFS * 4),
    tileCoverageWeights: new Float32Array(MAX_TILE_REFS),
    alphaParams: new Float32Array(MAX_TILE_REFS * 8),
  };
}

function writeGpuLiveContributor(snapshot, refIndex, {
  splatIndex,
  originalId,
  tileIndex,
  coverageWeight,
  opacity,
  centerPx,
  inverseConic,
  viewRank,
}) {
  const refBase = refIndex * 4;
  snapshot.tileRefs[refBase] = splatIndex;
  snapshot.tileRefs[refBase + 1] = originalId;
  snapshot.tileRefs[refBase + 2] = tileIndex;
  snapshot.tileRefs[refBase + 3] = refIndex;
  snapshot.tileCoverageWeights[refIndex] = coverageWeight;

  const alphaBase = refIndex * 4;
  snapshot.alphaParams[alphaBase] = opacity;
  snapshot.alphaParams[alphaBase + 1] = centerPx[0];
  snapshot.alphaParams[alphaBase + 2] = centerPx[1];
  snapshot.alphaParams[alphaBase + 3] = viewRank;

  const conicBase = (MAX_TILE_REFS + refIndex) * 4;
  snapshot.alphaParams[conicBase] = inverseConic[0];
  snapshot.alphaParams[conicBase + 1] = inverseConic[1];
  snapshot.alphaParams[conicBase + 2] = inverseConic[2];
}
