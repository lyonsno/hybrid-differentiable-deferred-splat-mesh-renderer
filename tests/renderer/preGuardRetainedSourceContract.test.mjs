import assert from "node:assert/strict";
import test from "node:test";

import { classifyPreGuardRetainedSource } from "../../src/rendererFidelityProbes/preGuardRetainedSourceContract.js";

test("pre-guard retained source rejects retained rows born after dense CPU projection", () => {
  const result = classifyPreGuardRetainedSource({
    route: "cpu-prepass-bridge",
    constructsFullDenseProjection: true,
    traceLawRetainedRows: true,
    compactRetainedOffsets: true,
    projectedGuard: {
      projectedRefs: 20000001,
      maxProjectedRefs: 20000000,
    },
    retainedCapacity: 6635520,
    preservedFields: {
      contributorIdentity: true,
      sourceColor: true,
      materialHooks: true,
      observationIdentity: true,
    },
  });

  assert.equal(result.classification, "pre-guard-source-blocked-by-projection-construction");
  assert.equal(result.guardQuantity, "dense-projected-tile-refs");
  assert.equal(result.handoffQuantity, "compact-retained-rows");
  assert.equal(result.retainedCapacityBelowProjectedGuard, true);
  assert.deepEqual(result.blockers, ["full-dense-cpu-projection-before-retention"]);
});

test("pre-guard retained source rejects direct GPU-live dense tile slots as trace-law source", () => {
  const result = classifyPreGuardRetainedSource({
    route: "direct-gpu-live",
    constructsFullDenseProjection: false,
    traceLawRetainedRows: false,
    compactRetainedOffsets: false,
    directGpuAddressClassification: "dense-index-consumed-as-compact-offset",
    preservedFields: {
      contributorIdentity: true,
      sourceColor: false,
      materialHooks: false,
      observationIdentity: true,
    },
  });

  assert.equal(result.classification, "pre-guard-source-not-lawful");
  assert.deepEqual(result.blockers, [
    "missing-trace-law-retained-rows",
    "dense-gpu-live-addressing",
  ]);
});

test("pre-guard retained source blocks compact candidates that drop deferred fields", () => {
  const result = classifyPreGuardRetainedSource({
    route: "compact-pre-guard",
    constructsFullDenseProjection: false,
    traceLawRetainedRows: true,
    compactRetainedOffsets: true,
    retentionPolicyProven: true,
    preservedFields: {
      contributorIdentity: true,
      sourceColor: true,
      materialHooks: false,
      observationIdentity: true,
    },
  });

  assert.equal(result.classification, "pre-guard-source-blocked-by-deferred-fields");
  assert.deepEqual(result.missingDeferredFields, ["materialHooks"]);
});

test("pre-guard retained source accepts only compact trace-law rows with retention and deferred custody", () => {
  const result = classifyPreGuardRetainedSource({
    route: "compact-pre-guard",
    constructsFullDenseProjection: false,
    traceLawRetainedRows: true,
    compactRetainedOffsets: true,
    retentionPolicyProven: true,
    preservedFields: {
      contributorIdentity: true,
      sourceColor: true,
      materialHooks: true,
      observationIdentity: true,
    },
  });

  assert.equal(result.classification, "pre-guard-source-candidate");
  assert.deepEqual(result.blockers, []);
});
