import assert from "node:assert/strict";
import test from "node:test";

import { buildGpuTileCoverageBridge } from "../../src/gpuTileCoverageBridge.js";
import {
  PIXEL_CONTRIBUTOR_TRACE_SCHEMA,
  validatePixelContributorTraceRecord,
} from "../../src/rendererFidelityProbes/pixelContributorTraceSchema.js";
import {
  buildPerPixelRetainedContributorTraces,
} from "../../src/rendererFidelityProbes/retentionPixelTrace.js";

const TILE_SIZE_PX = 16;
const VIEWPORT_WIDTH = 3456;
const VIEWPORT_HEIGHT = 1600;
const TILE_COLUMNS = Math.ceil(VIEWPORT_WIDTH / TILE_SIZE_PX);
const TILE_ROWS = Math.ceil(VIEWPORT_HEIGHT / TILE_SIZE_PX);

test("retention pixel traces expose schema-shaped retained support for canonical anchors", () => {
  const fixture = buildRetentionFixture();
  const bridge = buildGpuTileCoverageBridge(fixture);

  assert.ok(Array.isArray(bridge.perPixelRetainedContributors), "bridge should expose per-pixel retained contributor traces");
  assert.equal(bridge.perPixelRetainedContributors.length, PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.length);
  assert.deepEqual(
    bridge.perPixelRetainedContributors.map((record) => record.anchorPixel.id),
    PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.map((anchor) => anchor.id),
  );

  const byAnchorId = new Map(bridge.perPixelRetainedContributors.map((record) => [record.anchorPixel.id, record]));
  assert.equal(byAnchorId.get("lacunar-hole-dessert-1260-930")?.status, "sufficient");
  assert.equal(byAnchorId.get("dense-foreground-leak-1580-1260")?.status, "misleadingly-sufficient");
  assert.equal(byAnchorId.get("black-band-dropout-2300-1055")?.status, "insufficient");

  for (const record of bridge.perPixelRetainedContributors) {
    assert.deepEqual(validatePixelContributorTraceRecord(record.traceRecord), [], `trace record should satisfy the canonical schema for ${record.anchorPixel.id}`);
  }
});

test("retention pixel traces classify absent and still-blocked anchors without dropping schema shape", () => {
  const absentTraces = buildPerPixelRetainedContributorTraces({
    projectedContributors: [],
    retainedContributors: [],
    viewportWidth: VIEWPORT_WIDTH,
    viewportHeight: VIEWPORT_HEIGHT,
    tileSizePx: TILE_SIZE_PX,
    tileColumns: TILE_COLUMNS,
    tileRows: TILE_ROWS,
  });

  assert.deepEqual(
    absentTraces.map((record) => record.status),
    Array.from({ length: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.length }, () => "absent"),
  );

  for (const record of absentTraces) {
    assert.deepEqual(validatePixelContributorTraceRecord(record.traceRecord), [], `absent trace record should satisfy the canonical schema for ${record.anchorPixel.id}`);
  }

  const blockedTraces = buildPerPixelRetainedContributorTraces({
    projectedContributors: null,
    retainedContributors: null,
    viewportWidth: VIEWPORT_WIDTH,
    viewportHeight: VIEWPORT_HEIGHT,
    tileSizePx: TILE_SIZE_PX,
    tileColumns: TILE_COLUMNS,
    tileRows: TILE_ROWS,
  });

  assert.deepEqual(
    blockedTraces.map((record) => record.status),
    Array.from({ length: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors.length }, () => "still-blocked"),
  );

  for (const record of blockedTraces) {
    assert.deepEqual(validatePixelContributorTraceRecord(record.traceRecord), [], `blocked trace record should satisfy the canonical schema for ${record.anchorPixel.id}`);
  }
});

function buildRetentionFixture() {
  let nextSplatIndex = 0;
  let nextOriginalId = 100;
  const projectedContributors = [
    ...buildTileContributors({
      anchor: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0],
      tileIndex: tileIndexForAnchor(PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[0]),
      retainedWeights: [1],
      droppedWeights: [],
      allocateSplatIndex: () => nextSplatIndex++,
      allocateOriginalId: () => nextOriginalId++,
    }),
    ...buildTileContributors({
      anchor: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[1],
      tileIndex: tileIndexForAnchor(PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[1]),
      retainedWeights: [0.9],
      droppedWeights: [0.1],
      allocateSplatIndex: () => nextSplatIndex++,
      allocateOriginalId: () => nextOriginalId++,
    }),
    ...buildTileContributors({
      anchor: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[2],
      tileIndex: tileIndexForAnchor(PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors[2]),
      retainedWeights: [0.2],
      droppedWeights: [0.8],
      allocateSplatIndex: () => nextSplatIndex++,
      allocateOriginalId: () => nextOriginalId++,
    }),
  ];

  const retainedContributors = projectedContributors.filter((contributor) => contributor.retained);
  const splats = projectedContributors.map((contributor) => ({
    splatIndex: contributor.splatIndex,
    centerPx: contributor.centerPx,
    covariancePx: { xx: 1, xy: 0, yy: 1 },
    tileBounds: {
      minTileX: contributor.tileX,
      maxTileX: contributor.tileX,
      minTileY: contributor.tileY,
      maxTileY: contributor.tileY,
    },
  }));

  return {
    viewportWidth: VIEWPORT_WIDTH,
    viewportHeight: VIEWPORT_HEIGHT,
    tileSizePx: TILE_SIZE_PX,
    tileColumns: TILE_COLUMNS,
    tileRows: TILE_ROWS,
    splats,
    tileEntries: projectedContributors,
    sourceSplatCount: projectedContributors.length,
    maxRefsPerTile: 8,
    contributorArena: {
      records: retainedContributors,
      contributors: retainedContributors,
      projectedContributors,
      metadata: {
        viewportWidth: VIEWPORT_WIDTH,
        viewportHeight: VIEWPORT_HEIGHT,
        tileSizePx: TILE_SIZE_PX,
        tileColumns: TILE_COLUMNS,
        tileRows: TILE_ROWS,
        tileCount: TILE_COLUMNS * TILE_ROWS,
        maxRefsPerTile: 8,
        projectedContributorCount: projectedContributors.length,
        retainedContributorCount: retainedContributors.length,
        droppedContributorCount: projectedContributors.length - retainedContributors.length,
      },
    },
  };
}

function buildTileContributors({
  anchor,
  tileIndex,
  retainedWeights,
  droppedWeights,
  allocateSplatIndex,
  allocateOriginalId,
}) {
  const tileX = tileIndex % TILE_COLUMNS;
  const tileY = Math.floor(tileIndex / TILE_COLUMNS);
  const contributors = [];
  let projectedIndex = 0;

  for (const [offset, coverageWeight] of retainedWeights.entries()) {
    const splatIndex = allocateSplatIndex();
    const originalId = allocateOriginalId();
    contributors.push(makeContributor({
      anchor,
      tileIndex,
      tileX,
      tileY,
      splatIndex,
      originalId,
      coverageWeight,
      retained: true,
      retentionStatus: "retained",
      retentionWeight: coverageWeight,
      occlusionWeight: coverageWeight,
      overflowReason: "none",
      retentionBand: offset === 0 ? "front" : "middle",
      projectedIndex,
    }));
    projectedIndex += 1;
  }

  for (const [offset, coverageWeight] of droppedWeights.entries()) {
    const splatIndex = allocateSplatIndex();
    const originalId = allocateOriginalId();
    contributors.push(makeContributor({
      anchor,
      tileIndex,
      tileX,
      tileY,
      splatIndex,
      originalId,
      coverageWeight,
      retained: false,
      retentionStatus: "dropped",
      retentionWeight: coverageWeight,
      occlusionWeight: coverageWeight,
      overflowReason: "perTileRetainedCap",
      retentionBand: offset === 0 ? "front" : "middle",
      projectedIndex,
    }));
    projectedIndex += 1;
  }

  return contributors;
}

function makeContributor({
  anchor,
  tileIndex,
  tileX,
  tileY,
  splatIndex,
  originalId,
  coverageWeight,
  retained,
  retentionStatus,
  retentionWeight,
  occlusionWeight,
  overflowReason,
  retentionBand,
  projectedIndex,
}) {
  return {
    splatIndex,
    originalId,
    tileIndex,
    tileX,
    tileY,
    projectedIndex,
    centerPx: [anchor.x, anchor.y],
    inverseConic: [1, 0, 1],
    coverageWeight,
    viewDepth: 0.5 + projectedIndex * 0.01,
    opacity: Math.min(1, coverageWeight),
    retained,
    retentionStatus,
    retentionWeight,
    occlusionWeight,
    overflowReason,
    retentionBand,
    hasSourceOpacity: true,
    hasSourceViewRank: true,
    viewRank: projectedIndex,
  };
}

function tileIndexForAnchor(anchor) {
  if (anchor.canonicalTileAddress?.tileIndex != null) {
    return anchor.canonicalTileAddress.tileIndex;
  }
  const tileX = Math.floor(anchor.x / TILE_SIZE_PX);
  const tileY = Math.floor(anchor.y / TILE_SIZE_PX);
  return tileY * TILE_COLUMNS + tileX;
}
