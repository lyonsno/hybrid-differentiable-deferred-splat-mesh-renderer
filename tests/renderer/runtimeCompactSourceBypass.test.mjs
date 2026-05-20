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

test("requested GPU arena compact source keeps projected coverage inside the live ref budget", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuFactoryStart = mainSource.indexOf("function createGpuArenaTileLocalSceneState");
  const cpuFactoryStart = mainSource.indexOf("function createCpuTileLocalSceneState");
  const compactSourceStart = mainSource.indexOf("function buildCompactRetainedSourceForRuntime");
  const compactSourceEnd = mainSource.indexOf("interface RuntimeCompactTileCoverage");

  assert.ok(gpuFactoryStart >= 0, "GPU arena path should have its own scene-state factory");
  assert.ok(cpuFactoryStart > gpuFactoryStart, "CPU bridge factory should remain separate");
  assert.ok(compactSourceStart >= 0, "compact source builder should exist");
  assert.ok(compactSourceEnd > compactSourceStart, "compact source source slice should be bounded");

  const gpuFactorySource = mainSource.slice(gpuFactoryStart, cpuFactoryStart);
  const compactSourceSource = mainSource.slice(compactSourceStart, compactSourceEnd);

  assert.match(
    gpuFactorySource,
    /maxTileEntries:\s*TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES/,
    "GPU compact source must receive the same projected-ref budget as the CPU bridge",
  );
  assert.match(
    compactSourceSource,
    /buildProjectedGaussianTileCoverage\(\{[\s\S]*maxTileEntries,/,
    "compact projected coverage must stop before materializing unbounded high-viewport refs",
  );
});
