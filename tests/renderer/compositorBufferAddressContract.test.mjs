import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCompositorBufferAddressContract,
  summarizeCompositorBufferAddressContract,
} from "../../src/rendererFidelityProbes/compositorBufferAddressContract.js";

test("classifies dense tile-slot headers consumed as compact live-buffer offsets", () => {
  const row = classifyCompositorBufferAddressContract({
    anchorId: "fresh-a",
    tileIndex: 10487,
    headerOffset: 2684672,
    headerCount: 0,
    scatterCount: 4363,
    refCount: 0,
    liveRefCapacity: 2360150,
    tileCapacity: 256,
    traceExpectedContributorCount: 256,
  });

  assert.equal(row.classification, "dense-index-consumed-as-compact-offset");
  assert.equal(row.denseTileSlotOffset, 2684672);
  assert.equal(row.requestedEnd, 2689035);
  assert.equal(row.capacityOverrun, 328885);
  assert.equal(row.effectiveCount, 4363);
});

test("keeps compact retained windows inside live capacity as address-contract-ok", () => {
  const row = classifyCompositorBufferAddressContract({
    anchorId: "compact-anchor",
    tileIndex: 10487,
    headerOffset: 512,
    headerCount: 256,
    scatterCount: 256,
    refCount: 256,
    liveRefCapacity: 2360150,
    tileCapacity: 256,
    traceExpectedContributorCount: 256,
  });

  assert.equal(row.classification, "address-contract-ok");
  assert.equal(row.capacityOverrun, 0);
  assert.equal(row.effectiveCount, 256);
});

test("separates missing compact-list population from dense-address overflow", () => {
  const row = classifyCompositorBufferAddressContract({
    anchorId: "empty-anchor",
    tileIndex: 10,
    headerOffset: 100,
    headerCount: 0,
    scatterCount: 0,
    refCount: 0,
    liveRefCapacity: 1000,
    tileCapacity: 16,
    traceExpectedContributorCount: 8,
  });

  assert.equal(row.classification, "compact-list-not-populated");
  assert.equal(row.requestedEnd, 100);
});

test("summarizes address contract rows by highest-priority classification", () => {
  const summary = summarizeCompositorBufferAddressContract([
    classifyCompositorBufferAddressContract({
      anchorId: "ok",
      tileIndex: 0,
      headerOffset: 0,
      headerCount: 2,
      scatterCount: 2,
      refCount: 2,
      liveRefCapacity: 10,
      tileCapacity: 4,
      traceExpectedContributorCount: 2,
    }),
    classifyCompositorBufferAddressContract({
      anchorId: "overflow",
      tileIndex: 4,
      headerOffset: 16,
      headerCount: 0,
      scatterCount: 2,
      refCount: 0,
      liveRefCapacity: 10,
      tileCapacity: 4,
      traceExpectedContributorCount: 2,
    }),
  ]);

  assert.equal(summary.classification, "dense-index-consumed-as-compact-offset");
  assert.deepEqual(summary.countsByClassification, {
    "address-contract-ok": 1,
    "dense-index-consumed-as-compact-offset": 1,
    "compact-list-not-populated": 0,
    "header-capacity-mismatch": 0,
    "address-underinstrumented": 0,
  });
});
