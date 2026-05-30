import assert from "node:assert/strict";
import test from "node:test";

import { packGpuArenaProjectedContributors } from "../src/gpuTileContributorArenaPacking.ts";

test("GPU arena packing assigns legacy ref indexes in canonical compositor order", () => {
  const contributors = [
    contributor({ splatIndex: 4, originalId: 40, tileIndex: 1, viewRank: 3, viewDepth: 0.75 }),
    contributor({ splatIndex: 2, originalId: 20, tileIndex: 0, viewRank: 2, viewDepth: 0.4 }),
    contributor({ splatIndex: 3, originalId: 30, tileIndex: 0, viewRank: 2, viewDepth: 0.3 }),
    contributor({ splatIndex: 1, originalId: 10, tileIndex: 0, viewRank: 0, viewDepth: 0.1 }),
  ];

  const packed = packGpuArenaProjectedContributors(contributors);

  assert.deepEqual(readPackedOriginalIds(packed.u32, contributors.length), [10, 30, 20, 40]);
  assert.deepEqual(readPackedLegacyRefIndexes(packed.u32, contributors.length), [0, 1, 2, 3]);
  assert.deepEqual(readPackedTileIndexes(packed.u32, contributors.length), [0, 0, 0, 1]);
});

function readPackedOriginalIds(packedU32: Uint32Array, count: number): number[] {
  return Array.from({ length: count }, (_, index) => packedU32[index * 8 + 1]);
}

function readPackedLegacyRefIndexes(packedU32: Uint32Array, count: number): number[] {
  return Array.from({ length: count }, (_, index) => packedU32[index * 8 + 3]);
}

function readPackedTileIndexes(packedU32: Uint32Array, count: number): number[] {
  return Array.from({ length: count }, (_, index) => packedU32[index * 8 + 2]);
}

function contributor(overrides: Partial<ReturnType<typeof contributorShape>> = {}) {
  return {
    ...contributorShape(),
    ...overrides,
  };
}

function contributorShape() {
  return {
    splatIndex: 0,
    originalId: 0,
    tileIndex: 0,
    viewRank: 0,
    viewDepth: 0,
    depthBand: 0,
    coverageWeight: 0.5,
    centerPx: [11, 12] as const,
    inverseConic: [0.25, 0, 0.25] as const,
    opacity: 0.2,
    coverageAlpha: 0.1,
    transmittanceBefore: 0.9,
    retentionWeight: 0.7,
    occlusionWeight: 0.6,
  };
}
