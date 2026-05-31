import assert from "node:assert/strict";
import test from "node:test";

import {
  selectCompactProjectionRetentionRecords,
} from "../../src/compactRetentionElection.js";

test("balanced compact retention gives priority pools hard seats before support backfill", () => {
  const maxRefsPerTile = 16;
  const occluder = contributor({
    id: 9001,
    retentionWeight: 0.05,
    occlusionWeight: 100,
    occlusionDensity: 100,
    coverageWeight: 0.1,
  });
  const retentionRecords = Array.from({ length: 8 }, (_, index) => contributor({
    id: 100 + index,
    retentionWeight: 80 - index,
    occlusionWeight: 1,
    coverageWeight: 1,
  }));
  const occlusionRecords = [
    occluder,
    ...Array.from({ length: 7 }, (_, index) => contributor({
      id: 200 + index,
      retentionWeight: 1,
      occlusionWeight: 40 - index,
      occlusionDensity: 40 - index,
      coverageWeight: 1,
    })),
  ];
  const coverageRecords = Array.from({ length: 8 }, (_, index) => contributor({
    id: 300 + index,
    retentionWeight: 1,
    occlusionWeight: 1,
    coverageWeight: 60 - index,
  }));
  const supportRecords = Array.from({ length: 64 }, (_, index) => contributor({
    id: 1000 + index,
    retentionWeight: 500,
    occlusionWeight: 1,
    coverageWeight: 500,
    supportSampleWeight: 1000 - index,
    supportSampleRetentionWeight: 1000 - index,
  }));
  const records = [
    ...retentionRecords,
    ...occlusionRecords,
    ...coverageRecords,
    ...supportRecords,
  ];

  const retained = selectCompactProjectionRetentionRecords(records, maxRefsPerTile, {
    coverageRecords,
    retentionRecords,
    occlusionRecords,
    supportSampleRecords: supportRecords,
    supportSampleRecordGroups: [supportRecords],
  });

  const retainedIds = new Set(retained.map((record) => record.originalId));
  const supportRetainedCount = retained.filter((record) => record.originalId >= 1000 && record.originalId < 2000).length;

  assert.equal(retained.length, maxRefsPerTile);
  assert.ok(retainedIds.has(occluder.originalId), "top occlusion candidate must survive bright support pressure");
  assert.ok(supportRetainedCount <= 4, "support candidates must not exceed the 25% final support quota");
  assert.ok(retained.some((record) => record.originalId >= 100 && record.originalId < 200));
  assert.ok(retained.some((record) => record.originalId >= 300 && record.originalId < 400));
});

function contributor({
  id,
  retentionWeight,
  occlusionWeight,
  coverageWeight,
  occlusionDensity = occlusionWeight,
  supportSampleWeight,
  supportSampleRetentionWeight,
}) {
  return {
    tileIndex: 0,
    tileX: 0,
    tileY: 0,
    splatIndex: id,
    originalId: id,
    projectedIndex: id,
    alphaParamIndex: id,
    viewRank: id,
    viewDepth: id,
    screenX: 0,
    screenY: 0,
    radiusPx: 1,
    opacity: 1,
    coverageWeight,
    retentionWeight,
    occlusionWeight,
    occlusionDensity,
    supportSampleWeight,
    supportSampleRetentionWeight,
  };
}
