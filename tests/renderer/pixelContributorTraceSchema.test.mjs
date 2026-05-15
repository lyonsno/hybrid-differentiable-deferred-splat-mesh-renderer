import assert from "node:assert/strict";
import test from "node:test";

import {
  PIXEL_CONTRIBUTOR_TRACE_SCHEMA,
  summarizePixelContributorTraceSchema,
  validatePixelContributorTraceRecord,
  validatePixelContributorTraceSchema,
} from "../../src/rendererFidelityProbes/pixelContributorTraceSchema.js";

test("pixel contributor trace schema pins the same-pixel trace envelope", () => {
  const summary = summarizePixelContributorTraceSchema(PIXEL_CONTRIBUTOR_TRACE_SCHEMA);

  assert.equal(summary.version, 1);
  assert.deepEqual(summary.traceRecordFields, [
    "schemaVersion",
    "anchorPixel",
    "tileAddress",
    "projectedContributors",
    "retainedContributors",
    "orderedContributors",
    "finalColorAccumulation",
    "dispatchCache",
    "rendererMetadata",
    "deferredFields",
  ]);
  assert.deepEqual(summary.anchorPixelIds, [
    "lacunar-hole-dessert-1260-930",
    "dense-foreground-leak-1580-1260",
    "black-band-dropout-2300-1055",
  ]);
});

test("pixel contributor trace schema requires contributor identity through every trace list", () => {
  const summary = summarizePixelContributorTraceSchema(PIXEL_CONTRIBUTOR_TRACE_SCHEMA);

  for (const listName of [
    "projectedContributors",
    "retainedContributors",
    "orderedContributors",
    "finalColorAccumulation.steps",
  ]) {
    assert.deepEqual(summary.contributorIdentityFields[listName], ["splatIndex", "originalId"]);
  }
});

test("pixel contributor trace schema validator rejects silent contract drift", () => {
  assert.deepEqual(validatePixelContributorTraceSchema(PIXEL_CONTRIBUTOR_TRACE_SCHEMA), []);

  const drifted = {
    ...PIXEL_CONTRIBUTOR_TRACE_SCHEMA,
    traceRecord: {
      ...PIXEL_CONTRIBUTOR_TRACE_SCHEMA.traceRecord,
      fields: PIXEL_CONTRIBUTOR_TRACE_SCHEMA.traceRecord.fields.filter((field) => field.name !== "deferredFields"),
    },
  };

  assert.deepEqual(validatePixelContributorTraceSchema(drifted), [
    "traceRecord.fields missing required field deferredFields",
  ]);
});

test("pixel contributor trace schema validator rejects incomplete records", () => {
  const malformed = {
    schemaVersion: 1,
    anchorPixel: { id: "black-band-dropout-2300-1055", x: 2300, y: 1055 },
    tileAddress: { tileSizePx: 16, tileX: 143, tileY: 65, tileIndex: 14183, localX: 12, localY: 15 },
    projectedContributors: [{ splatIndex: 7 }],
    retainedContributors: [],
    orderedContributors: [],
    finalColorAccumulation: { steps: [], outputColor: [0, 0, 0, 1] },
    dispatchCache: { tileIndex: 14183, clearFrameId: 44, buildFrameId: 44, compositeFrameId: 44 },
    rendererMetadata: { requestedRenderer: "tile-local-visible", effectiveRenderer: "tile-local-visible" },
    deferredFields: { preserved: true },
  };

  assert.deepEqual(validatePixelContributorTraceRecord(malformed), [
    "projectedContributors[0] missing required field originalId",
  ]);
});
