import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GPU_TILE_COVERAGE_DEBUG_MODE_CODES,
  writeGpuTileCoverageFrameUniforms,
  createGpuTileCoveragePlan,
} from "../../node_modules/.cache/renderer-tests/src/gpuTileCoverage.js";
import {
  summarizeTileLocalDiagnostics,
} from "../../src/rendererFidelityProbes/tileLocalDiagnostics.js";

test("GPU tile coverage uniforms carry an explicit debug heatmap mode without changing the default", () => {
  const plan = createGpuTileCoveragePlan({
    viewportWidth: 64,
    viewportHeight: 32,
    tileSizePx: 8,
    splatCount: 2,
    maxTileRefs: 4,
  });
  const target = new Float32Array(24);
  const viewProj = Float32Array.from({ length: 16 }, (_, index) => index + 1);

  writeGpuTileCoverageFrameUniforms(target, viewProj, plan);
  assert.equal(new Uint32Array(target.buffer)[19], GPU_TILE_COVERAGE_DEBUG_MODE_CODES["final-color"]);

  writeGpuTileCoverageFrameUniforms(target, viewProj, plan, "transmittance");
  assert.equal(new Uint32Array(target.buffer)[19], GPU_TILE_COVERAGE_DEBUG_MODE_CODES.transmittance);
});

test("tile-local diagnostic summary exports coverage, alpha/transmittance, ref density, and conic shape", () => {
  const summary = summarizeTileLocalDiagnostics({
    debugMode: "accumulated-alpha",
    plan: {
      tileColumns: 2,
      tileRows: 1,
      tileSizePx: 8,
      maxTileRefs: 4,
    },
    tileEntryCount: 3,
    tileHeaders: Uint32Array.from([
      0, 2, 0, 0,
      2, 1, 0, 0,
    ]),
    tileRefCustody: {
      projectedTileEntryCount: 5,
      retainedTileEntryCount: 3,
      evictedTileEntryCount: 2,
      cappedTileCount: 1,
      saturatedRetainedTileCount: 1,
      maxProjectedRefsPerTile: 4,
      maxRetainedRefsPerTile: 2,
      headerRefCount: 3,
      headerAccountingMatches: true,
    },
    tileCoverageWeights: Float32Array.from([0.25, 0.75, 1.5, 0]),
    alphaParamData: Float32Array.from([
      0.5, 4, 4, 0,
      0.8, 5, 5, 0,
      0.25, 12, 4, 0,
      0, 0, 0, 0,
      0.25, 0, 1, 0,
      1, 0, 4, 0,
      0.0625, 0, 0.25, 0,
      1, 0, 1, 0,
    ]),
  });

  assert.equal(summary.version, 1);
  assert.equal(summary.debugMode, "accumulated-alpha");
  assert.equal(summary.tileRefs.total, 3);
  assert.equal(summary.tileRefs.nonEmptyTiles, 2);
  assert.equal(summary.tileRefs.maxPerTile, 2);
  assert.deepEqual(summary.tileRefCustody, {
    projectedTileEntryCount: 5,
    retainedTileEntryCount: 3,
    evictedTileEntryCount: 2,
    cappedTileCount: 1,
    saturatedRetainedTileCount: 1,
    maxProjectedRefsPerTile: 4,
    maxRetainedRefsPerTile: 2,
    headerRefCount: 3,
    headerAccountingMatches: true,
  });
  assert.equal(summary.coverageWeight.max, 1.5);
  assert(summary.alpha.estimatedMaxAccumulatedAlpha > 0.5);
  assert(summary.alpha.estimatedMinTransmittance < 0.5);
  assert.equal(summary.conicShape.maxMajorRadiusPx, 4);
  assert.equal(summary.conicShape.minMinorRadiusPx, 0.5);
});

test("tile-local diagnostic shader branches are debug-only and preserve final color as mode zero", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /debugMode:\s*u32/);
  assert.match(shader, /DEBUG_MODE_FINAL_COLOR/);
  assert.match(shader, /DEBUG_MODE_COVERAGE_WEIGHT/);
  assert.match(shader, /DEBUG_MODE_ACCUMULATED_ALPHA/);
  assert.match(shader, /DEBUG_MODE_TRANSMITTANCE/);
  assert.match(shader, /DEBUG_MODE_TILE_REF_COUNT/);
  assert.match(shader, /DEBUG_MODE_CONIC_SHAPE/);
  assert.match(shader, /if\s*\(frame\.debugMode\s*==\s*DEBUG_MODE_FINAL_COLOR\)/);
  assert.match(shader, /debug_heatmap_color/);
});
