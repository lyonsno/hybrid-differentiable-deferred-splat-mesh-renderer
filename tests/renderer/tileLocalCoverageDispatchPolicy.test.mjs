import assert from "node:assert/strict";
import test from "node:test";

import {
  selectTileLocalCoverageDispatchMode,
} from "../../src/tileLocalCoverageDispatchPolicy.js";

test("tile-local visible composites GPU arena buffers without rebuilding tile refs", () => {
  assert.equal(
    selectTileLocalCoverageDispatchMode({
      rendererMode: "tile-local-visible",
      arenaBackend: "gpu",
      hasGpuArenaRuntime: true,
    }),
    "composite-only",
  );
});

test("tile-local visible keeps the full coverage pipeline when GPU arena buffers are absent", () => {
  assert.equal(
    selectTileLocalCoverageDispatchMode({
      rendererMode: "tile-local-visible",
      arenaBackend: "gpu",
      hasGpuArenaRuntime: false,
    }),
    "full-coverage-pipeline",
  );
});

test("CPU arena states already own tile refs and only need composite dispatch", () => {
  assert.equal(
    selectTileLocalCoverageDispatchMode({
      rendererMode: "tile-local-visible",
      arenaBackend: "cpu",
      hasGpuArenaRuntime: false,
    }),
    "composite-only",
  );
});
