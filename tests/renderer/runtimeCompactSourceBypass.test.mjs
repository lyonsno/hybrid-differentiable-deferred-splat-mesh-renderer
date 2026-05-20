import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("requested GPU arena runtime constructs compact retained source without the CPU bridge", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuFactoryStart = mainSource.indexOf("function createGpuArenaTileLocalSceneState");
  const cpuFactoryStart = mainSource.indexOf("function createCpuTileLocalSceneState");

  assert.ok(gpuFactoryStart >= 0, "GPU arena path should have its own scene-state factory");
  assert.ok(cpuFactoryStart > gpuFactoryStart, "CPU bridge factory should remain separate");

  const gpuFactorySource = mainSource.slice(gpuFactoryStart, cpuFactoryStart);
  assert.doesNotMatch(gpuFactorySource, /buildTileLocalPrepassBridge/);
  assert.doesNotMatch(gpuFactorySource, /buildGpuLiveAnchorContributorTraces/);
  assert.match(gpuFactorySource, /buildCompactRetainedSourceForRuntime/);
  assert.match(gpuFactorySource, /buildDeterministicGpuTileProjectionRetentionArena/);
  assert.match(gpuFactorySource, /createGpuTileContributorArenaRuntime/);
  assert.match(gpuFactorySource, /compactSource\.retainedRecords/);
  assert.match(gpuFactorySource, /compactSource\.projectedContributorCount/);
  assert.match(gpuFactorySource, /compactSource\.droppedContributorCount/);
});
