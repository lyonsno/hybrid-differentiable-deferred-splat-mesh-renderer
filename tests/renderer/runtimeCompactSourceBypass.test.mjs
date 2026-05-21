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

test("requested GPU arena compact source preserves projected overflow diagnostics for retained handoff", () => {
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
    /buildStreamingCompactRetainedSourceForRuntime/,
    "compact source construction must stream retained rows without first materializing global projected refs",
  );
  assert.match(
    compactSourceSource,
    /estimateCompactProjectedTileRefCount/,
    "compact source construction must estimate projected tile spans before deciding whether the route is dense-budget overflowed",
  );
  assert.match(
    compactSourceSource,
    /const\s+retainedTileIndexes\s*=\s*useAnchorPrefilter\s*\?\s*presentationTileIndexes\s*:\s*anchorTileIndexes/,
    "dense exact routes must separate traced anchor evidence from the wider retained presentation footprint",
  );
  assert.match(
    compactSourceSource,
    /onlyTileIndexes:\s*useAnchorPrefilter\s*\?\s*retainedTileIndexes\s*:\s*null/,
    "dense exact routes must restrict compact source projection to retained presentation tiles before covariance construction",
  );
  assert.match(
    compactSourceSource,
    /candidateSplatIndexes:\s*anchorCandidateSplatIndexes/,
    "dense exact routes must select bounded anchor-near splat ids before full compact covariance projection",
  );
  assert.match(
    compactSourceSource,
    /compactSourceAnchorTileNeighborhoodIndexes/,
    "dense exact routes must retain bounded anchor neighborhoods so row-producing diagnostics can still render nonblank canvas evidence",
  );
  assert.match(
    compactSourceSource,
    /COMPACT_SOURCE_PRESENTATION_TILE_NEIGHBORHOOD_RADIUS/,
    "dense exact routes must distinguish the anchor evidence neighborhood from the wider retained presentation footprint",
  );
  assert.match(
    compactSourceSource,
    /maxCandidatesPerTile:\s*useAnchorPrefilter\s*\?\s*maxRefsPerTile\s*:\s*maxRefsPerTile\s*\*\s*4/,
    "widened presentation footprint must tighten candidate selection instead of replaying the radius expansion timeout",
  );
  assert.doesNotMatch(
    compactSourceSource,
    /buildProjectedGaussianTileCoverage/,
    "compact source construction must not call dense projected coverage before retained rows exist",
  );
  assert.match(
    compactSourceSource,
    /onlyTileIndexes:\s*retainOnlyAnchorTiles\s*\?\s*effectiveAnchorTileIndexes\s*:\s*null/,
    "overflowed compact routes must restrict the streaming pass to anchor tiles instead of scanning every dense tile ref",
  );
});
