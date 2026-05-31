import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("requested GPU arena runtime routes presentation through compact retained source without CPU prepass bridge", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuFactoryStart = mainSource.indexOf("function createGpuArenaTileLocalSceneState");
  const cpuFactoryStart = mainSource.indexOf("function createCpuTileLocalSceneState");

  assert.ok(gpuFactoryStart >= 0, "GPU arena path should have its own scene-state factory");
  assert.ok(cpuFactoryStart > gpuFactoryStart, "CPU bridge factory should remain separate");

  const gpuFactorySource = extractFunctionSource(mainSource, "createGpuArenaTileLocalSceneState");
  assert.doesNotMatch(gpuFactorySource, /buildTileLocalPrepassBridge/);
  assert.doesNotMatch(gpuFactorySource, /buildGpuLiveAnchorContributorTraces/);
  assert.doesNotMatch(gpuFactorySource, /adaptGpuArenaRetainedContributors/);
  assert.match(gpuFactorySource, /buildCompactRetainedSourceForRuntime/);
  assert.match(gpuFactorySource, /const\s+gpuArenaProjectedContributors\s*=\s*compactSource\.retainedRecords/);
  assert.match(gpuFactorySource, /createWgslProjectedRefStreamState/);
  assert.match(gpuFactorySource, /wgslProjectedRefStream,/);
  assert.match(gpuFactorySource, /wgslProjectedRefStreamEvidence,/);
  assert.match(gpuFactorySource, /createGpuTileCoveragePipelineSkeleton/);
  assert.match(gpuFactorySource, /createGpuTileContributorArenaRuntime/);
  assert.match(gpuFactorySource, /compactRetainedSourceBudgetDiagnostics/);
  assert.match(gpuFactorySource, /tileRefCustody:\s*compactSource\.tileRefCustody/);
  assert.match(gpuFactorySource, /gpuArenaRuntime,/);
  assert.doesNotMatch(gpuFactorySource, /gpuArenaRuntime:\s*null/);
  assert.doesNotMatch(gpuFactorySource, /estimatedGpuLiveTileRefCustody/);
  assert.doesNotMatch(gpuFactorySource, /estimatedGpuLiveBudgetDiagnostics/);
});

test("CPU reference compact source preserves projected overflow diagnostics for retained handoff", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const compactSourceStart = mainSource.indexOf("function buildCompactRetainedSourceForRuntime");
  const compactSourceEnd = mainSource.indexOf("interface RuntimeCompactTileCoverage");

  assert.ok(compactSourceStart >= 0, "compact source builder should exist");
  assert.ok(compactSourceEnd > compactSourceStart, "compact source source slice should be bounded");

  const compactSourceSource = mainSource.slice(compactSourceStart, compactSourceEnd);

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
    /const\s+retainedTileIndexes\s*=\s*useAnchorPrefilter\s*\?\s*presentationTileIndexes\s*:\s*traceAnchorTileIndexes/,
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
    /selectCompactAnchorCandidateSplatIndexes/,
    "widened presentation footprint must bound candidate selection instead of replaying the radius expansion timeout",
  );
  assert.doesNotMatch(
    compactSourceSource,
    /buildProjectedGaussianTileCoverage/,
    "compact source construction must not call dense projected coverage before retained rows exist",
  );
  assert.match(
    compactSourceSource,
    /onlyTileIndexes:\s*retainOnlyAnchorTiles\s*\?\s*sourceTileIndexes\s*:\s*null/,
    "overflowed compact routes must restrict the streaming pass to anchor tiles instead of scanning every dense tile ref",
  );
  assert.match(
    compactSourceSource,
    /const\s+sourceTileCount\s*=\s*retainOnlyAnchorTiles\s*\?\s*sourceTileIndexes\.size\s*:\s*tileCount/,
    "full-scene compact source evidence must report the full constructed footprint while anchor routes report anchor tiles",
  );
  assert.match(
    compactSourceSource,
    /const\s+projectedContributorCount\s*=\s*streamedProjectedContributorCount/,
    "compact-source projected refs must describe the source actually streamed, not an earlier overflow estimate",
  );
  assert.doesNotMatch(
    compactSourceSource,
    /Math\.max\(projectedRefBudgetOverflow\?\.projectedRefs/,
    "anchor-neighborhood compact-source evidence must not promote pre-restriction overflow into built-source projected refs",
  );
});

test("full-scene compact source bounds construction before covariance projection", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const compactSourceStart = mainSource.indexOf("function buildCompactRetainedSourceForRuntime");
  const compactSourceEnd = mainSource.indexOf("function buildStreamingCompactRetainedSourceForRuntime");

  assert.ok(compactSourceStart >= 0, "compact source builder should exist");
  assert.ok(compactSourceEnd > compactSourceStart, "compact source pre-streaming slice should be bounded");

  const compactSourceSource = mainSource.slice(compactSourceStart, compactSourceEnd);
  const constructionGuard = compactSourceSource.indexOf("fullSceneConstructionBudget");
  const constructionBound = compactSourceSource.indexOf("fullSceneConstructionMaxTilesPerSplat");
  const projectionStart = compactSourceSource.indexOf("projectRuntimeSplatsForCompactSource");

  assert.ok(constructionGuard >= 0, "full-scene compact source should expose a construction budget decision");
  assert.ok(constructionBound > constructionGuard, "full-scene budget pressure should produce a per-splat tile bound");
  assert.ok(projectionStart > constructionBound, "construction bound must be decided before expensive covariance projection");
  assert.match(
    compactSourceSource,
    /maxTilesPerSplat:\s*fullSceneConstructionMaxTilesPerSplat/,
    "bounded full-scene construction must pass the per-splat tile bound into compact source row construction",
  );
  assert.match(
    compactSourceSource,
    /fullSceneConstructionRefUpperBound,/,
    "bounded full-scene construction must keep the dense upper bound visible as diagnostic evidence",
  );
  assert.match(
    compactSourceSource,
    /prestreamConstructionBudget:\s*fullSceneConstructionBudget/,
    "bounded full-scene construction must preserve the prestream budget classification for witness reports",
  );
  assert.match(
    mainSource,
    /compactSourceConstruction:\s*compactSource\.compactSourceConstruction/,
    "GPU scene evidence must carry compact-source construction decisions into tile-local runtime evidence",
  );
  assert.match(
    mainSource,
    /compactSourceConstruction:\s*tileLocalState\.compactSourceConstruction/,
    "smoke page evidence must expose compact-source footprint class beside retained refs",
  );
  assert.doesNotMatch(
    compactSourceSource,
    /full-scene compact source construction upper bound/,
    "full-scene pressure should no longer force plate fallback before trying a bounded GPU source",
  );
});

test("tile-local-visible dispatch preserves CPU-populated refs when no GPU contributor arena runtime exists", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const renderLoopStart = mainSource.indexOf("const tileLocalComputePass = encoder.beginComputePass");
  const renderLoopEnd = mainSource.indexOf("tileLocalComputePass.end()", renderLoopStart);

  assert.ok(renderLoopStart >= 0, "tile-local render loop should encode a compute pass");
  assert.ok(renderLoopEnd > renderLoopStart, "tile-local render loop slice should be bounded");

  const renderLoopSource = mainSource.slice(renderLoopStart, renderLoopEnd);
  assert.match(renderLoopSource, /tileLocalState\.gpuArenaRuntime\.dispatch/);
  assert.match(renderLoopSource, /tileLocalState\.pipeline\.dispatchProjectedRefStream/);
  assert.match(renderLoopSource, /tileLocalState\.pipeline\.dispatchComposite/);
  assert.match(
    renderLoopSource,
    /const\s+compositePrebuiltCpuTileRefs\s*=\s*scene\.rendererMode === "tile-local-visible" &&\s*tileLocalState\.arenaBackend === "cpu";/,
    "CPU-backed visible composition must be keyed by effective arena ownership, not renderer mode alone",
  );
  assert.match(
    renderLoopSource,
    /else if \(compositePrebuiltCpuTileRefs\) \{\s*tileLocalState\.pipeline\.dispatchComposite/,
    "CPU-backed tile-local-visible must composite prebuilt refs without rerunning clear/build over them",
  );
  assert.match(
    renderLoopSource,
    /else \{\s*tileLocalState\.pipeline\.dispatch\(tileLocalComputePass,\s*tileLocalState\.bindGroup,\s*tileLocalState\.plan\);/,
    "non-visible tile-local fallback still owns the full clear/build/composite dispatch",
  );
});

test("direct GPU live tile-local-visible without a runtime still runs the full build dispatch", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const renderLoopStart = mainSource.indexOf("const tileLocalComputePass = encoder.beginComputePass");
  const renderLoopEnd = mainSource.indexOf("tileLocalComputePass.end()", renderLoopStart);

  assert.ok(renderLoopStart >= 0, "tile-local render loop should encode a compute pass");
  assert.ok(renderLoopEnd > renderLoopStart, "tile-local render loop slice should be bounded");

  const renderLoopSource = mainSource.slice(renderLoopStart, renderLoopEnd);
  assert.doesNotMatch(
    renderLoopSource,
    /else if \(scene\.rendererMode === "tile-local-visible"\) \{\s*tileLocalState\.pipeline\.dispatchComposite/,
    "renderer mode alone must not send direct GPU live evidence through composite-only dispatch",
  );
  assert.match(
    renderLoopSource,
    /else \{\s*tileLocalState\.pipeline\.dispatch\(tileLocalComputePass,\s*tileLocalState\.bindGroup,\s*tileLocalState\.plan\);/,
    "direct GPU live without a gpuArenaRuntime must fall through to clear/build/composite dispatch",
  );
});

test("WGSL projected-ref stream sidecar is not the retained source or compositor input", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const rendererSource = readFileSync(new URL("../../src/gpuTileCoverageRenderer.ts", import.meta.url), "utf8");
  const gpuFactorySource = extractFunctionSource(mainSource, "createGpuArenaTileLocalSceneState");
  const streamFactorySource = extractSourceBetween(
    mainSource,
    "function createWgslProjectedRefStreamState",
    "function buildGpuArenaRetainedSourceConstructionEvidence",
  );
  const streamEvidenceSource = extractFunctionSource(mainSource, "buildWgslProjectedRefStreamEvidence");
  const streamReadbackSource = extractFunctionSource(mainSource, "enqueueWgslProjectedRefStreamReadback");
  const streamReadbackSummarySource = extractFunctionSource(mainSource, "summarizeWgslProjectedRefStreamReadback");
  const renderLoopStart = mainSource.indexOf("const tileLocalComputePass = encoder.beginComputePass");
  const renderLoopEnd = mainSource.indexOf("tileLocalComputePass.end()", renderLoopStart);
  const renderLoopSource = mainSource.slice(renderLoopStart, renderLoopEnd);

  assert.match(rendererSource, /dispatchProjectedRefStream/);
  assert.match(rendererSource, /dispatchStage\(pass,\s*clearTilesPipeline/);
  assert.match(rendererSource, /dispatchStage\(pass,\s*buildTileRefsPipeline/);
  assert.doesNotMatch(
    rendererSource.slice(
      rendererSource.indexOf("dispatchProjectedRefStream"),
      rendererSource.indexOf("dispatchComposite"),
    ),
    /compositeTilesPipeline/,
    "the projected-stream sidecar must not composite into the visible output",
  );
  assert.match(streamFactorySource, /wgsl_projected_ref_stream_tile_headers/);
  assert.match(streamFactorySource, /wgsl_projected_ref_stream_tile_refs/);
  assert.match(streamFactorySource, /sourceRole:\s*"diagnostic-sidecar-not-retention-source"/);
  assert.match(streamFactorySource, /maxTileRefs:\s*Math\.max\(/);
  assert.match(streamEvidenceSource, /runtimeConsumerBackend:\s*"none"/);
  assert.match(streamEvidenceSource, /readback:\s*stream\?\.readback/);
  assert.match(
    streamEvidenceSource,
    /falseClosureGuard:\s*"wgsl-projected-ref-stream-sidecar-does-not-feed-retention-or-compositor"/,
  );
  assert.match(streamReadbackSource, /wgsl_projected_ref_stream_tile_headers_readback/);
  assert.match(streamReadbackSource, /wgsl_projected_ref_stream_scatter_cursors_readback/);
  assert.match(streamReadbackSource, /copyBufferToBuffer\(stream\.tileHeaderBuffer/);
  assert.match(streamReadbackSource, /copyBufferToBuffer\(stream\.tileScatterCursorBuffer/);
  assert.match(streamReadbackSummarySource, /projectedScatterRefs - stream\.compactSourceProjectedRefs/);
  assert.match(streamReadbackSummarySource, /classifyWgslProjectedRefStreamComparison\(/);
  assert.doesNotMatch(
    streamReadbackSummarySource,
    /"diverges-from-compact-projected-refs"/,
    "projected-stream evidence must distinguish raw GPU projection supersets from underpopulated compact-source reads",
  );
  assert.match(mainSource, /"raw-gpu-projection-superset"/);
  assert.match(mainSource, /"underpopulated-vs-compact-projected-refs"/);
  assert.match(streamReadbackSummarySource, /headerCountClass:[\s\S]*"headers-clear-only"/);
  assert.match(mainSource, /requested === "on" \|\| requested === "enabled" \|\| requested === "1"/);
  assert.match(gpuFactorySource, /const\s+gpuArenaProjectedContributors\s*=\s*compactSource\.retainedRecords/);
  assert.match(renderLoopSource, /dispatchProjectedRefStream/);
  assert.match(renderLoopSource, /gpuArenaRuntime\.dispatch/);
  assert.ok(
    renderLoopSource.indexOf("dispatchProjectedRefStream") < renderLoopSource.indexOf("gpuArenaRuntime.dispatch"),
    "sidecar projection should run before the retained-source runtime so it can become a comparable source witness",
  );
});

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf("{", start);
  assert.ok(bodyStart > start, `${name} should have a function body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${name} function body was not closed`);
}

function extractSourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${startMarker} should exist`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `${endMarker} should bound ${startMarker}`);
  return source.slice(start, end);
}
