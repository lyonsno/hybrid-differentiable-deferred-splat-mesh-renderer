import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sourceFrontierProjectedSupportFallbackByAnchorId } from "../../src/rendererFidelityProbes/sourceFrontierEvidence.js";

test("source-frontier projected-support fallback is behaviorally route-gated", () => {
  const primary = new Map([
    ["primary-present", [{ splatIndex: 10 }]],
    ["primary-empty", []],
  ]);
  const fallback = new Map([
    ["primary-present", [{ splatIndex: 99 }]],
    ["primary-empty", [{ splatIndex: 20 }]],
    ["fallback-only", [{ splatIndex: 30 }]],
  ]);

  const sourceFrontier = sourceFrontierProjectedSupportFallbackByAnchorId(
    primary,
    fallback,
    "source-frontier-score",
  );

  assert.deepEqual(sourceFrontier.get("primary-present"), [{ splatIndex: 10 }]);
  assert.deepEqual(sourceFrontier.get("primary-empty"), [{ splatIndex: 20 }]);
  assert.deepEqual(sourceFrontier.get("fallback-only"), [{ splatIndex: 30 }]);

  const legacy = sourceFrontierProjectedSupportFallbackByAnchorId(
    primary,
    fallback,
    "legacy-identity",
  );

  assert.equal(legacy, primary, "legacy/CPU diagnostic rows must not backfill projected support");
  assert.equal(legacy.get("fallback-only"), undefined);
});

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

test("production-election compact source consumes the election ledger without duplicate source-table scans", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const productionCompactSource = extractFunctionSource(
    mainSource,
    "compactRetainedSourceForWgslProjectedSourceFrontier",
  );

  assert.match(
    productionCompactSource,
    /const\s+droppedRecords\s*=\s*productionElection\.droppedRecords/,
    "production-election compact source should consume the election's dropped ledger instead of rebuilding it",
  );
  assert.match(
    productionCompactSource,
    /const\s+projectedCountsByTile\s*=\s*productionElection\.projectedCountsByTile/,
    "production-election compact source should consume projected counts from the election ledger",
  );
  assert.match(
    productionCompactSource,
    /const\s+retainedCountsByTile\s*=\s*productionElection\.retainedCountsByTile/,
    "production-election compact source should consume retained counts from the election ledger",
  );
  assert.doesNotMatch(
    productionCompactSource,
    /new Set\(retainedRecords\.map\(runtimeCompactSourceRecordKey\)\)/,
    "source-frontier compact source must not re-key retained records after production election",
  );
  assert.doesNotMatch(
    productionCompactSource,
    /projectedCandidateRecords\.filter/,
    "source-frontier compact source must not re-filter projected rows after production election",
  );
  assert.doesNotMatch(
    productionCompactSource,
    /droppedRecords:\s*\[\]/,
    "a populated droppedContributorCount must not be paired with an empty droppedRecords list",
  );
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
  assert.match(mainSource, /"compact-candidate-footprint-divergence"/);
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

test("WGSL projected-ref stream consumes compact source candidates and footprint bounds", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const coverageSource = readFileSync(new URL("../../src/gpuTileCoverage.ts", import.meta.url), "utf8");
  const rendererSource = readFileSync(new URL("../../src/gpuTileCoverageRenderer.ts", import.meta.url), "utf8");
  const shaderSource = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const gpuFactorySource = extractFunctionSource(mainSource, "createGpuArenaTileLocalSceneState");
  const compactSourceSource = extractSourceBetween(
    mainSource,
    "function buildStreamingCompactRetainedSourceForRuntime",
    "function buildCompactSourceConstructionEvidence",
  );
  const streamFactorySource = extractSourceBetween(
    mainSource,
    "function createWgslProjectedRefStreamState",
    "function buildGpuArenaRetainedSourceConstructionEvidence",
  );

  assert.match(
    compactSourceSource,
    /candidateSplatIndexes:\s*compactSourceCandidateSplatIndexes/,
    "compact retained source must preserve the splat-index universe it actually projected",
  );
  assert.match(
    streamFactorySource,
    /const\s+tileHeaderBuffer\s*=\s*createTileHeaderStorageBuffer\([\s\S]*compactSource\.candidateSplatIndexes/,
    "WGSL projected-ref sidecar must seed compact source splat ids into the tile-header source table instead of iterating raw source order",
  );
  assert.match(
    streamFactorySource,
    /sourceSplatCount:\s*compactSource\.candidateSplatIndexes\.length/,
    "WGSL projected-ref sidecar dispatch count must be the compact candidate count, not attributes.count",
  );
  assert.doesNotMatch(
    streamFactorySource,
    /splatCount:\s*splatCount,\s*maxTileRefs:[\s\S]*splatCount,/,
    "WGSL projected-ref sidecar must not size its evidence stream by raw splat count as a hidden source substitute",
  );
  assert.match(
    streamFactorySource,
    /maxTilesPerSplat:\s*compactSource\.compactSourceConstruction\?\.effectiveMaxTilesPerSplat/,
    "WGSL projected-ref sidecar must inherit the compact source footprint cap when one is active",
  );
  assert.doesNotMatch(
    gpuFactorySource,
    /sourceSplatIndexBuffer/,
    "visible compositor bind group must not spend an extra storage binding for identity source indexes",
  );
  assert.match(mainSource, /function createTileHeaderStorageBuffer/);
  assert.match(coverageSource, /readonly sourceSplatCount: number;/);
  assert.match(coverageSource, /readonly maxTilesPerSplat\?: number \| null;/);
  assert.match(coverageSource, /buildTileRefs:\s*linearDispatch\(plan\.sourceSplatCount\)/);
  assert.doesNotMatch(rendererSource, /sourceSplatIndexBuffer: GPUBuffer/);
  assert.doesNotMatch(shaderSource, /@binding\(10\) var<storage, read> sourceSplatIndexes: array<u32>/);
  assert.match(shaderSource, /let sourceOrdinal = globalId\.x/);
  assert.match(shaderSource, /var splatId = sourceOrdinal/);
  assert.match(shaderSource, /let sourceMetadata = tileHeaders\[tile_count\(\) \+ sourceOrdinal\]/);
  assert.match(shaderSource, /splatId = sourceMetadata\.x/);
  assert.match(shaderSource, /candidateSourceClassMask = sourceMetadata\.y/);
  assert.match(shaderSource, /sourceOrdinal >= frame\.sourceSplatCount/);
  assert.match(shaderSource, /frame\.maxTilesPerSplat > 0u/);
});

test("WGSL projected source-frontier route skips CPU streaming retention and visibly owns source construction", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const shaderSource = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const coverageRendererSource = readFileSync(new URL("../../src/gpuTileCoverageRenderer.ts", import.meta.url), "utf8");
  const productionElectionConsumerSource = readFileSync(
    new URL("../../src/gpuProductionElectionConsumer.ts", import.meta.url),
    "utf8",
  );
  const productionElectionConsumerShader = readFileSync(
    new URL("../../src/shaders/gpu_production_election_consumer.wgsl", import.meta.url),
    "utf8",
  );
  const productionElectionPrefixScatterSource = readFileSync(
    new URL("../../src/gpuProductionElectionPrefixScatter.ts", import.meta.url),
    "utf8",
  );
  const productionElectionPrefixScatterShader = readFileSync(
    new URL("../../src/shaders/gpu_production_election_prefix_scatter.wgsl", import.meta.url),
    "utf8",
  );
  const renderLoopStart = mainSource.indexOf("const tileLocalComputePass = encoder.beginComputePass");
  const renderLoopEnd = mainSource.indexOf("tileLocalComputePass.end()", renderLoopStart);
  const renderLoopSource = mainSource.slice(renderLoopStart, renderLoopEnd);
  const gpuFactorySource = extractFunctionSource(mainSource, "createGpuArenaTileLocalSceneState");
  const frontierFactorySource = extractFunctionSource(mainSource, "createWgslProjectedSourceFrontierTileLocalSceneState");
  const modeSource = extractFunctionSource(mainSource, "selectedWgslProjectedRefStreamMode");
  const compactSourceConstruction = extractFunctionSource(mainSource, "buildWgslProjectedSourceFrontierCompactSourceConstruction");
  const retainedSourceEvidence = extractFunctionSource(mainSource, "buildWgslProjectedSourceFrontierConstructionEvidence");
  const streamEvidenceSource = extractFunctionSource(mainSource, "buildWgslProjectedRefStreamEvidence");
  const runtimeEvidenceSource = extractFunctionSource(mainSource, "exposeTileLocalRuntimeEvidence");
  const retentionScoreSource = extractSourceBetween(
    shaderSource,
    "fn gpu_live_retention_pool_score(",
    "fn gpu_live_overflow_election_slot",
  );
  const enqueueCompositorInputReadbackSource = extractFunctionSource(mainSource, "enqueueTileLocalCompositorInputReadback");
  const compositorInputReadbackSource = extractFunctionSource(mainSource, "resolveTileLocalCompositorInputReadback");
  const readCompositorInputAnchorSource = extractFunctionSource(mainSource, "readCompositorInputAnchor");
  const refStatsPublisherSource = extractFunctionSource(mainSource, "publishTileLocalRefStatsReadback");
  const refStatsEnqueueSource = extractFunctionSource(mainSource, "enqueueTileLocalRefStatsReadback");
  const refStatsSummarySource = extractFunctionSource(mainSource, "summarizeTileLocalRefStatsReadback");
  const budgetReadbackSource = extractFunctionSource(mainSource, "runtimeBudgetDiagnosticsForRefStatsReadback");
  const retainedSourceRefreshSource = extractFunctionSource(mainSource, "refreshWgslSourceFrontierRetainedSourceConstructionEvidence");
  const retainedRowsFromRefStatsSource = extractFunctionSource(
    mainSource,
    "sourceFrontierRetainedRowsFromRefStatsReadback",
  );
  const retainedRowsSummarySource = extractFunctionSource(
    mainSource,
    "summarizeWgslSourceFrontierRetainedRowsFromCompositorInputReadback",
  );
  const sourceFrontierReadLimitSource = extractFunctionSource(mainSource, "sourceFrontierCompositorReadLimit");
  const retainedRowsRefreshSource = extractFunctionSource(
    mainSource,
    "refreshWgslSourceFrontierRetainedRowsEvidence",
  );
  const tileRefPayloadEncodingSource = extractFunctionSource(mainSource, "tileRefPayloadEncodingForState");

  assert.match(modeSource, /"source-frontier"/);
  assert.match(modeSource, /requested === "source"/);
  assert.match(gpuFactorySource, /WGSL_PROJECTED_REF_STREAM_MODE === "source-frontier"/);
  assert.match(gpuFactorySource, /createWgslProjectedSourceFrontierTileLocalSceneState/);
  assert.doesNotMatch(
    frontierFactorySource,
    /buildCompactRetainedSourceForRuntime/,
    "source-frontier route must not synchronously enter CPU compact retained-source streaming",
  );
  assert.match(frontierFactorySource, /projectRuntimeSplatsForCompactSource/);
  assert.match(frontierFactorySource, /estimateCompactProjectedTileRefCount/);
  assert.match(
    frontierFactorySource,
    /sourceFrontierTileRefCapacity[\s\S]*gpuLiveMaxTileRefs\([\s\S]*frontierSource\.tileCount[\s\S]*frontierSource\.projectedRefEstimate/,
    "source-frontier route must request the compositor's hardware-aware per-tile capacity, not collapse capacity to average projected refs per tile",
  );
  assert.match(
    frontierFactorySource,
    /maxTileRefs:\s*sourceFrontierTileRefCapacity/,
    "source-frontier plan must pass the per-tile source capacity into the GPU tile ref arena",
  );
  assert.doesNotMatch(
    frontierFactorySource,
    /maxTileRefs:\s*Math\.max\([\s\S]*sourceFrontierTileRefCapacity[\s\S]*frontierSource\.projectedRefEstimate/,
    "source-frontier plan must not re-expand beyond the hardware-aware source capacity after gpuLiveMaxTileRefs clamps it",
  );
  assert.match(frontierFactorySource, /createTileHeaderStorageBuffer\([\s\S]*frontierSource\.candidateSplatIndexes/);
  assert.match(frontierFactorySource, /gpuArenaRuntime:\s*null/);
  assert.match(frontierFactorySource, /arenaBackend:\s*"gpu"/);
  assert.match(
    compactSourceConstruction,
    /retainedBudgetRefs:\s*plan\.maxTileRefs/,
    "source-frontier compact construction evidence must expose the actual allocated plan capacity",
  );
  assert.match(
    compactSourceConstruction,
    /maxRefsPerTile:\s*gpuLiveEffectiveRefsPerTile\(plan\)/,
    "source-frontier compact construction evidence must expose the effective hardware-aware per-tile cap",
  );
  assert.match(retainedSourceEvidence, /effectiveSourceBackend:\s*"wgsl-projected-ref-stream-source-frontier"/);
  assert.match(retainedSourceEvidence, /sourceHandoff:\s*"wgsl-projected-ref-stream-gpu-buffers"/);
  assert.match(
    retainedSourceEvidence,
    /"wgsl-source-frontier-bounded-pool-seat-election"/,
    "source-frontier retained-source evidence must advertise the bounded pool-seat election stage",
  );
  assert.match(
    shaderSource,
    /var<storage, read_write> tileRefs: array<atomic<u32>>[\s\S]*atomicCompareExchangeWeak\(&tileRefs\[scoreIndex\]/,
    "source-frontier visible input must use score-based GPU retention election inside the existing tile-ref buffer, not only first-arrival scatter slots",
  );
  assert.match(
    shaderSource,
    /RETENTION_SCORE_LOCK_BIT[\s\S]*atomicCompareExchangeWeak\(&tileRefs\[scoreIndex\],\s*previous,\s*lockedScore\)[\s\S]*atomicStore\(&tileRefs\[scoreIndex\],\s*score\)/,
    "source-frontier score election must lock the slot while publishing payload so a losing invocation cannot overwrite the final winning record",
  );
  assert.match(
    shaderSource,
    /fn gpu_live_retention_pool_score\([\s\S]*sourceDepthNdc:\s*f32[\s\S]*pool:\s*u32[\s\S]*coverageBucket[\s\S]*occlusionDensityBucket[\s\S]*occlusionWeightBucket[\s\S]*retentionBucket[\s\S]*depthBucket/,
    "source-frontier GPU retention pool scoring must include projected depth/frontness and the selected pool, not only coverage and opacity",
  );
  assert.match(
    shaderSource,
    /const SOURCE_FRONTIER_FOREGROUND_RETENTION_SCORE_FLOOR = 224u/,
    "source-frontier foreground/support candidates need a bounded primary-score floor instead of losing election solely on tile-center coverage",
  );
  assert.match(
    retentionScoreSource,
    /candidateSourceClassMask:\s*u32[\s\S]*source_frontier_retention_primary_bucket\([\s\S]*candidateSourceClassMask[\s\S]*pool[\s\S]*CANDIDATE_SOURCE_CLASS_RETENTION_MASK \| CANDIDATE_SOURCE_CLASS_SUPPORT_MASK/,
    "source-frontier retention scoring must consume the candidate class mask and protect foreground/support candidates inside their bounded pool",
  );
  assert.match(
    shaderSource,
    /fn gpu_live_source_luminance\([\s\S]*colors\[colorBase\][\s\S]*0\.2126[\s\S]*0\.7152[\s\S]*0\.0722/,
    "source-frontier GPU retention election must derive a luminance term from live source colors instead of scoring only coverage and depth",
  );
  assert.match(
    shaderSource,
    /fn gpu_live_retention_pool_score\([\s\S]*sourceLuminance:\s*f32[\s\S]*pool:\s*u32[\s\S]*retentionSignal[\s\S]*tileCoverageWeight \* max\(sourceOpacity[\s\S]*max\(sourceLuminance[\s\S]*occlusionSignal[\s\S]*tileCoverageWeight \* max\(sourceOpacity[\s\S]*retentionBucket[\s\S]*occlusionWeightBucket/,
    "source-frontier GPU retention pool scoring must carry production-like retention and occlusion score channels before depth tie-breaking",
  );
  assert.match(
    shaderSource,
    /fn gpu_live_retention_pool_score\([\s\S]*if \(pool == RETENTION_POOL_OCCLUSION\)[\s\S]*occlusionDensityBucket << 23u[\s\S]*occlusionWeightBucket << 15u[\s\S]*coverageBucket << 7u/,
    "source-frontier GPU retention pool scoring must preserve an occlusion pool that packs opacity/density ahead of occlusion weight",
  );
  assert.doesNotMatch(
    retentionScoreSource,
    /sourceOrdinal:\s*u32/,
    "source-frontier retention score must not retain a dead sourceOrdinal parameter after depth-aware tie-breaking switched to splat identity",
  );
  assert.match(
    shaderSource,
    /let sourceDepthNdc = centerClip\.z \/ max\(centerClip\.w, 0\.000001\)[\s\S]*let sourceLuminance = gpu_live_source_luminance\(splatId\)[\s\S]*gpu_live_retention_pool_score\([\s\S]*sourceLuminance[\s\S]*sourceDepthNdc[\s\S]*candidateSourceClassMask[\s\S]*poolSlot\.pool/,
    "source-frontier build must pass projected depth, source class identity, and selected pool into the retained-ref pool score",
  );
  assert.match(
    shaderSource,
    /const SOURCE_FRONTIER_COMPOSITOR_ORDER_BUCKET_COUNT = 16u/,
    "source-frontier compositor ordering must declare its provisional depth-bucket approximation explicitly",
  );
  assert.match(
    shaderSource,
    /fn gpu_live_compositor_order_slot\([\s\S]*sourceDepthNdc:\s*f32[\s\S]*projectedSlot:\s*u32[\s\S]*tileCapacity:\s*u32[\s\S]*frontness[\s\S]*bucket[\s\S]*bucketWidth/,
    "source-frontier compositor ordering must derive storage slots from projected depth buckets, not first-arrival slot order",
  );
  assert.match(
    shaderSource,
    /let compositorOrderSlot = gpu_live_compositor_order_slot\(sourceDepthNdc,\s*projectedSlot,\s*tileCapacity\)[\s\S]*let poolSlot = gpu_live_retention_pool_slot\(projectedSlot,\s*compositorOrderSlot,\s*tileId,\s*splatId,\s*candidateSourceClassMask,\s*tileCapacity\)[\s\S]*poolSlot\.slot/,
    "source-frontier retained refs must feed provisional back-to-front order through bounded retention pool slots",
  );
  assert.doesNotMatch(
    shaderSource,
    /let poolSlot = poolStart \+ \(\(depthLocalSlot \+ \(priorityOrdinal \/ 3u\)\) % poolWidth\)/,
    "source-frontier bounded pool seats must not make candidate class pool bands the outer compositor draw order",
  );
  assert.match(
    shaderSource,
    /let orderedPoolSlot = gpu_live_depth_ordered_pool_slot\(\s*compositorOrderSlot,\s*projectedSlot,\s*tileId,\s*splatId,\s*pool,\s*safeCapacity,\s*\)/,
    "source-frontier bounded pool seats must preserve compositor depth order as the outer slot coordinate",
  );
  assert.doesNotMatch(
    shaderSource,
    /let slot = gpu_live_retention_election_slot\(projectedSlot,\s*tileId,\s*splatId,\s*tileCapacity\);/,
    "source-frontier must not let first-arrival projectedSlot impersonate compositor draw order",
  );
  assert.match(
    shaderSource,
    /fn source_frontier_compositor_ref_limit\([\s\S]*headerRefCount:\s*u32[\s\S]*gpuScatterCount:\s*u32[\s\S]*tileCapacity:\s*u32[\s\S]*gpuScatterCount > 0u[\s\S]*return min\(gpuScatterCount,\s*tileCapacity\)/,
    "source-frontier compositor must normally consume the compacted retained prefix after GPU compaction, not the full sparse capacity",
  );
  assert.match(
    shaderSource,
    /let liveRefCount = source_frontier_compositor_ref_limit\(header\.y,\s*gpuScatterCount,\s*tileCapacity\)/,
    "source-frontier compositor must use the shared sparse-bucket scan limit instead of the old scatter-prefix count",
  );
  assert.doesNotMatch(
    shaderSource,
    /let liveRefCount = select\(min\(gpuScatterCount,\s*tileCapacity\),\s*header\.y,\s*header\.y > 0u\)/,
    "source-frontier compositor must not hide high-bucket retained refs behind gpuScatterCount prefix scanning",
  );
  assert.match(
    retainedSourceEvidence,
    /"wgsl-source-frontier-depth-bucket-compositor-order"/,
    "source-frontier retained-source evidence must advertise the provisional depth-bucket compositor-order stage",
  );
  assert.match(
    retainedSourceEvidence,
    /"wgsl-source-frontier-production-weighted-retention-score"/,
    "source-frontier retained-source evidence must advertise that live GPU election now uses retention/occlusion-like production score channels",
  );
  assert.match(
    retainedSourceEvidence,
    /"wgsl-source-frontier-occlusion-density-retention-score"/,
    "source-frontier retained-source evidence must advertise that live GPU election now carries production-style occlusion-density priority",
  );
  assert.match(
    retainedSourceEvidence,
    /"wgsl-source-frontier-bounded-pool-seat-election"/,
    "source-frontier retained-source evidence must advertise bounded pool-seat election instead of implying scalar score closure",
  );
  assert.doesNotMatch(
    shaderSource,
    /let slot = atomicAdd\(&tileScatterCursors\[tileId\], 1u\);\s*if \(slot >= tileCapacity\) \{\s*continue;\s*\}/,
    "source-frontier must not silently drop overflow candidates before they can compete with weaker retained refs",
  );
  assert.match(
    enqueueCompositorInputReadbackSource,
    /tileRefPayloadEncoding:\s*tileRefPayloadEncodingForState\(state\)/,
    "compositor-input readback must route payload decoding through the effective retained-source backend",
  );
  assert.match(
    tileRefPayloadEncodingSource,
    /state\.wgslProjectedRefStream\?\.sourceRole === "visible-source-frontier-gpu-retention-election"/,
    "sidecar stream identity must still label source-frontier tile refs as score-packed",
  );
  assert.match(
    tileRefPayloadEncodingSource,
    /state\.retainedSourceConstruction\?\.effectiveSourceBackend === "wgsl-projected-ref-stream-source-frontier"/,
    "source-frontier live composition has no sidecar stream object, so retained-source construction must also label score-packed refs",
  );
  assert.match(
    readCompositorInputAnchorSource,
    /tileRefPayloadEncoding === "source-frontier-score"[\s\S]*retentionScore/,
    "source-frontier readback must expose packed retention score under score metadata",
  );
  assert.match(
    readCompositorInputAnchorSource,
    /const alphaTransferWeight = sourceFrontierAlphaTransferWeight\(\s*pixelCoverageWeight,\s*tileCoverageWeight,\s*sourceFrontierSupportPixelWeight,\s*candidateSourceClassMask,\s*\)/,
    "source-frontier live compositor-input readback must use the same class-aware alpha-transfer weight as final composition",
  );
  assert.match(
    readCompositorInputAnchorSource,
    /Math\.pow\(1 - sourceOpacity,\s*alphaTransferWeight\)/,
    "source-frontier live compositor-input readback coverage alpha must be driven by the class-aware transfer weight",
  );
  assert.doesNotMatch(
    readCompositorInputAnchorSource,
    /const coverageAlpha = clamp01\(1 - Math\.pow\(1 - sourceOpacity,\s*pixelCoverageWeight\)\)/,
    "source-frontier live compositor-input readback must not report stale conic-only alpha after the shader crosses the alpha bulkhead",
  );
  assert.doesNotMatch(
    readCompositorInputAnchorSource,
    /const originalId = tileRefs\[tileRefBase \+ 1\] \?\? splatIndex;/,
    "source-frontier readback must not expose the packed score word as originalId",
  );
  assert.match(
    retainedSourceEvidence,
    /retainedBudgetRefs:\s*plan\.maxTileRefs/,
    "source-frontier retained-source evidence must report the actual allocated GPU tile-ref arena, not only the projected estimate",
  );
  assert.match(
    retainedSourceEvidence,
    /maxRefsPerTile:\s*gpuLiveEffectiveRefsPerTile\(plan\)/,
    "source-frontier retained-source evidence must report the effective hardware-aware per-tile cap",
  );
  assert.match(
    retainedSourceEvidence,
    /accountingSource:\s*"gpu-ref-stats-readback-pending"/,
    "source-frontier retained-source evidence must mark retained/dropped counts as pending until live GPU ref stats arrive",
  );
  assert.match(
    retainedSourceEvidence,
    /const nextGpuOffloadStage = "live-wgsl-production-candidate-source-identity"[\s\S]*nextGpuOffloadStage,/,
    "after shader-built source-frontier owns live construction, the next retained-source frontier must move production candidate-source identity onto the GPU",
  );
  assert.match(
    retainedSourceEvidence,
    /candidateSourceIdentity:\s*sourceFrontierCandidateSourceIdentityEvidence\(\)/,
    "source-frontier retained-source evidence must not claim production candidate-source identity before that substrate returns on the GPU side",
  );
  assert.doesNotMatch(
    frontierFactorySource,
    /buildGpuProjectionRetentionCandidateSourceProductionElection\(\{/,
    "source-frontier live state must not run CPU production election before shader-built compositor source construction",
  );
  assert.doesNotMatch(
    frontierFactorySource,
    /buildGpuProjectionRetentionCandidateSourceElectionTable\(/,
    "source-frontier tile headers must not require CPU-packed candidate-source records on the live shader-built route",
  );
  assert.match(
    frontierFactorySource,
    /createTileHeaderStorageBuffer\(\s*device,\s*plan,\s*frontierSource\.candidateSplatIndexes,\s*"wgsl_source_frontier_tile_headers",\s*\)/,
    "source-frontier live route must seed only the compact source table and let the shader build the current tile refs",
  );
  assert.match(
    mainSource,
    /function sourceFrontierCandidateSourceIdentityEvidence\([\s\S]*productionElection[\s\S]*status:\s*"production-election-contract-consumed"[\s\S]*availableIdentity:\s*"record-group-production-election-contract"[\s\S]*consumptionPath:\s*"candidate-source-record-group-production-election-contract"/,
    "candidate-source evidence may claim production election only when driven by the runtime production-election result",
  );
  assert.match(
    mainSource,
    /sourceInputConsumption:\s*productionElection\.sourceInputConsumption/,
    "runtime evidence must preserve the production-election input consumption contract",
  );
  assert.match(
    mainSource,
    /presentWgslInputs:[\s\S]*"projected-contributor-score-table"/,
    "runtime evidence must preserve that production election consumed a projected contributor score table, not only sidecar class masks",
  );
  assert.match(
    mainSource,
    /falseClosureGuard:\s*"packed-production-election-contract-is-not-live-wgsl-compositor-consumption"/,
    "production-election evidence must still forbid treating this CPU/live-runtime contract as final WGSL compositor consumption",
  );
  assert.match(
    mainSource,
    /presentWgslInputs:[\s\S]*"retention-candidate-records"[\s\S]*"occlusion-candidate-records"[\s\S]*"coverage-candidate-records"[\s\S]*"support-sample-record-groups"/,
    "candidate-source identity evidence must name the seated class-tagged WGSL inputs",
  );
  assert.doesNotMatch(
    coverageRendererSource,
    /candidateSourceRecordsBuffer:\s*GPUBuffer/,
    "candidate-source records must not be wired into the already-full current compositor bind group",
  );
  assert.doesNotMatch(
    coverageRendererSource,
    /candidateSourceGroupsBuffer:\s*GPUBuffer/,
    "candidate-source groups must wait for a narrower future election consumer instead of the current compositor bind group",
  );
  assert.doesNotMatch(
    coverageRendererSource,
    /storageEntry\(GPU_TILE_COVERAGE_BINDINGS\.candidateSource/,
    "candidate-source bindings are reserved constants, not live storage entries on this 10-storage-buffer compositor layout",
  );
  assert.doesNotMatch(
    shaderSource,
    /@binding\(13\)\s*var<storage,\s*read>\s+candidateSourceRecords/,
    "the current compositor shader must not bind candidate-source records before the narrower election consumer exists",
  );
  assert.doesNotMatch(
    shaderSource,
    /@binding\(14\)\s*var<storage,\s*read>\s+candidateSourceGroups/,
    "the current compositor shader must not bind candidate-source groups before the narrower election consumer exists",
  );
  assert.match(
    retainedSourceEvidence,
    /candidateSourceRuntimeBuffers:\s*sourceFrontierCandidateSourceRuntimeBufferEvidence\(\{\}\)/,
    "source-frontier construction evidence must not claim runtime candidate-source buffer custody on the shader-built live route",
  );
  assert.doesNotMatch(
    retainedSourceEvidence,
    /gpuReadyStages:\s*\[[\s\S]*"wgsl-source-frontier-candidate-source-input-buffers"[\s\S]*\]/,
    "source-frontier construction evidence must not list blocked candidate-source input buffers as GPU-ready",
  );
  assert.doesNotMatch(
    retainedSourceEvidence,
    /gpuReadyStages:\s*\[[\s\S]*"wgsl-source-frontier-production-election-consumer"[\s\S]*\]/,
    "source-frontier construction evidence must not list blocked production-election consumers as GPU-ready",
  );
  assert.doesNotMatch(
    retainedSourceEvidence,
    /gpuReadyStages:\s*\[[\s\S]*"wgsl-production-election-compute-consumer"[\s\S]*\]/,
    "source-frontier construction evidence must not list blocked production-election compute consumers as GPU-ready",
  );
  assert.doesNotMatch(
    frontierFactorySource,
    /const candidateSourceRuntimeBuffersEvidence = sourceFrontierCandidateSourceRuntimeBufferEvidence\(candidateSourceBuffers\)/,
    "source-frontier live state must not allocate CPU-derived candidate-source runtime buffers before the shader-built compositor source",
  );
  assert.match(
    mainSource,
    /function sourceFrontierCandidateSourceRuntimeBufferEvidence\([\s\S]*status:\s*"runtime-state-buffers-present"[\s\S]*currentCompositorBinding:\s*"forbidden-current-compositor-bind-group-full"[\s\S]*nextConsumer:\s*"narrow-production-election-consumer"/,
    "candidate-source runtime evidence must prove buffer custody without pretending the current compositor bind group consumes those buffers",
  );
  assert.match(
    mainSource,
    /falseClosureGuard:\s*"candidate-source-runtime-buffers-do-not-imply-current-compositor-bind-group-consumption"/,
    "candidate-source runtime evidence must explicitly block bind-group proof substitution",
  );
  assert.match(
    retainedSourceEvidence,
    /productionElectionConsumer:\s*sourceFrontierProductionElectionConsumerEvidence\(\s*undefined,\s*sourceFrontierCandidateSourceRuntimeBufferEvidence\(\{\}\),\s*undefined,\s*\)/,
    "source-frontier construction evidence must not claim narrow production-election consumer custody until GPU candidate identity is restored",
  );
  assert.doesNotMatch(
    frontierFactorySource,
    /createGpuProductionElectionConsumerContract/,
    "source-frontier live state must not instantiate the CPU production-election consumer before GPU candidate identity is restored",
  );
  assert.match(
    mainSource,
    /interface SourceFrontierProductionElectionConsumerEvidence[\s\S]*"compute-consumer-contract-present"[\s\S]*"blocked-missing-production-election-consumer-input"/,
    "production-election consumer evidence must carry an explicit compute-present/blocked contract",
  );
  assert.match(
    mainSource,
    /function sourceFrontierProductionElectionConsumerEvidence\([\s\S]*status:\s*productionElectionComputeConsumer\.status[\s\S]*source:\s*productionElectionComputeConsumer\.source[\s\S]*consumedRuntimeBuffers:\s*productionElectionComputeConsumer\.consumedRuntimeBuffers/,
    "production-election consumer evidence must expose the dedicated compute-consumer contract instead of stopping at static identity provenance",
  );
  assert.match(
    mainSource,
    /currentCompositorBinding:\s*productionElectionComputeConsumer\.currentCompositorBinding[\s\S]*nextConsumerBoundary:\s*productionElectionComputeConsumer\.nextConsumerBoundary/,
    "production-election compute-consumer evidence must name prefix scatter as the next narrower consumer without expanding the current compositor bind group",
  );
  assert.match(
    mainSource,
    /falseClosureGuard:\s*productionElectionComputeConsumer\.falseClosureGuard/,
    "production-election compute-consumer evidence must not launder the narrow consumer contract into current compositor consumption",
  );
  assert.match(
    retainedSourceEvidence,
    /candidateSourceIdentity:\s*sourceFrontierCandidateSourceIdentityEvidence\(\)/,
    "source-frontier evidence must expose candidate-source identity as the next GPU frontier instead of laundering CPU candidate-source inputs",
  );
  assert.match(
    retainedSourceEvidence,
    /const nextGpuOffloadStage = "live-wgsl-production-candidate-source-identity"[\s\S]*nextGpuOffloadStage,/,
    "source-frontier construction evidence must name candidate-source identity as the remaining GPU frontier",
  );
  assert.match(
    retainedSourceEvidence,
    /productionElectionPrefixScatter:\s*sourceFrontierProductionElectionPrefixScatterEvidence\(\s*undefined,\s*undefined,\s*\)/,
    "source-frontier construction evidence must not claim prefix-scatter materialization on the shader-built live route",
  );
  assert.doesNotMatch(
    frontierFactorySource,
    /createGpuProductionElectionConsumerContract|createGpuProductionElectionPrefixScatterContract|dispatchGpuProductionElectionPrefixScatter|enqueueProductionElectionPrefixScatterReadback/,
    "source-frontier live state must not instantiate or read back the CPU production-election materialization sidecar",
  );
  assert.doesNotMatch(
    renderLoopSource,
    /dispatchGpuProductionElectionPrefixScatter|materializeGpuProductionElectionCompositorSource|productionElectionPrefixScatter/,
    "source-frontier render loop must not run the prefix-scatter sidecar before the shader-built compositor source",
  );
  assert.doesNotMatch(
    coverageRendererSource,
    /gpu_production_election_consumer|createGpuProductionElectionConsumerContract/,
    "the production-election consumer witness must remain separate from the current tile-local compositor renderer",
  );
  assert.doesNotMatch(
    coverageRendererSource,
    /gpu_production_election_prefix_scatter|createGpuProductionElectionPrefixScatterContract/,
    "the prefix-scatter witness must remain separate from the current tile-local compositor renderer",
  );
  assert.match(
    shaderSource,
    /@compute @workgroup_size\(64\)\s*fn compact_retained_refs\(/,
    "source-frontier must finalize GPU-retained rows with a compact prefix pass after score election",
  );
  assert.match(
    coverageRendererSource,
    /compactRetainedRefsPipeline/,
    "GPU tile coverage pipeline must expose the retained-row compaction stage",
  );
  assert.match(
    coverageRendererSource,
    /createComputePipeline\(device,\s*shaderModule,\s*pipelineLayout,\s*"compact_retained_refs"\)/,
    "GPU tile coverage pipeline must bind the compact_retained_refs WGSL entry point",
  );
  assert.match(
    coverageRendererSource,
    /dispatchStage\(pass,\s*buildTileRefsPipeline[\s\S]*dispatchStage\(pass,\s*compactRetainedRefsPipeline[\s\S]*dispatchStage\(pass,\s*compositeTilesPipeline/,
    "full tile coverage dispatch must compact retained rows between election and composition",
  );
  assert.match(
    coverageRendererSource,
    /dispatchProjectedRefStream[\s\S]*dispatchStage\(pass,\s*buildTileRefsPipeline[\s\S]*dispatchStage\(pass,\s*compactRetainedRefsPipeline/,
    "source-frontier projected stream dispatch must compact retained rows before exposing tile refs as a source",
  );
  assert.match(
    shaderSource,
    /tileHeaders\[tileId\]\s*=\s*vec4u\([\s\S]*retainedCount[\s\S]*projectedCount[\s\S]*projectedCount - min\(projectedCount,\s*retainedCount\)/,
    "compact_retained_refs must publish retained count, projected count, and dropped count into the tile header",
  );
  assert.match(
    shaderSource,
    /copy_retained_ref_payload\([\s\S]*compactRefIndex/,
    "compact_retained_refs must move elected sparse payloads into the retained prefix, not only count them",
  );
  assert.match(
    shaderSource,
    /fn copy_retained_ref_payload\([\s\S]*tile_ref_word_index\(compactRefIndex,\s*3u\)[\s\S]*compactRefIndex/,
    "compacted retained rows must repoint alpha/conic payload index to the compact row before tail slots are cleared",
  );
  assert.doesNotMatch(
    shaderSource,
    /fn copy_retained_ref_payload\([\s\S]*tile_ref_word_index\(compactRefIndex,\s*3u\)[\s\S]*atomicLoad\(&tileRefs\[tile_ref_word_index\(sourceRefIndex,\s*3u\)\]\)/,
    "compacted retained rows must not keep stale sparse alpha payload indexes that tail clearing can erase",
  );
  assert.doesNotMatch(
    shaderSource,
    /fn source_frontier_compositor_ref_limit\([\s\S]*return tileCapacity/,
    "after GPU retained-row compaction, source-frontier composition must not fall back to scanning full sparse tile capacity",
  );
  assert.match(
    refStatsEnqueueSource,
    /tileHeaderBuffer[\s\S]*copyBufferToBuffer\(state\.tileHeaderBuffer/,
    "source-frontier ref stats readback must copy compacted tile headers, not only scatter cursors",
  );
  assert.match(
    refStatsSummarySource,
    /tileHeaders[\s\S]*headerBase[\s\S]*tileHeaders\[headerBase \+ 1\]/,
    "source-frontier ref stats summary must use compacted tile-header retained counts",
  );
  assert.match(
    retainedSourceRefreshSource,
    /projectedRefs:\s*readback\.projectedScatterRefs/,
    "source-frontier retained-source evidence must refresh projected refs from live GPU scatter-cursor readback",
  );
  assert.match(
    retainedSourceRefreshSource,
    /retainedRefs:\s*readback\.retainedRefs/,
    "source-frontier retained-source evidence must refresh retained refs from live GPU scatter-cursor readback",
  );
  assert.match(
    retainedSourceRefreshSource,
    /droppedRefs:\s*readback\.droppedRefs/,
    "source-frontier retained-source evidence must refresh dropped refs from live GPU scatter-cursor readback",
  );
  assert.match(
    retainedSourceRefreshSource,
    /retainedRows:\s*sourceFrontierRetainedRowsFromRefStatsReadback\(readback\)/,
    "source-frontier live ref-stat publication must replace stale pending retained-row evidence with compacted row accounting",
  );
  assert.match(
    retainedRowsFromRefStatsSource,
    /source:\s*"gpu-ref-stats-readback"[\s\S]*projectedRows:\s*readback\.status === "present" \? readback\.projectedScatterRefs : 0[\s\S]*retainedRows:\s*readback\.status === "present" \? readback\.retainedRefs : 0[\s\S]*droppedRows:\s*readback\.status === "present" \? readback\.droppedRefs : 0/,
    "ref-stat retained-row evidence must identify its source while carrying compacted tile-header projected/retained/dropped row counts",
  );
  assert.match(
    retainedSourceEvidence,
    /retainedRows:\s*pendingWgslSourceFrontierRetainedRowsEvidence\(plan\)/,
    "source-frontier retained-source evidence must start with an explicit pending retained-row witness instead of only ref-stat counters",
  );
  assert.match(
    retainedRowsSummarySource,
    /payloadEncoding:\s*"source-frontier-score"/,
    "source-frontier retained-row witness must preserve that tile refs carry score-packed payloads",
  );
  assert.match(
    retainedRowsSummarySource,
    /source:\s*"gpu-compositor-input-readback"/,
    "source-frontier retained-row witness must be derived from live compositor-input buffers",
  );
  assert.match(
    retainedRowsSummarySource,
    /falseClosureGuard:\s*"source-frontier-retained-row-readback-is-production-gpu-prefix-scatter-not-production-retention-election"/,
    "source-frontier retained-row witness may now claim GPU prefix/scatter completion while preserving that retention election remains provisional",
  );
  assert.match(
    sourceFrontierReadLimitSource,
    /headerRefCount > 0[\s\S]*return headerRefCount[\s\S]*gpuScatterCount > 0[\s\S]*Math\.min\(gpuScatterCount,\s*tileCapacity\)/,
    "source-frontier CPU witnesses must share the shader's compact-prefix scan rule after GPU retained-row compaction",
  );
  assert.match(
    retainedRowsSummarySource,
    /const scanTileRows = Math\.min\([\s\S]*sourceFrontierCompositorReadLimit\(/,
    "source-frontier retained-row summary must use the shared compact-prefix scan limit",
  );
  assert.match(
    retainedRowsSummarySource,
    /retainedRows \+= scorePackedTileRows/,
    "source-frontier retained-row summary must report actual score-packed rows found in the compacted prefix",
  );
  assert.doesNotMatch(
    retainedRowsSummarySource,
    /retainedRows \+= retainedTileRows/,
    "source-frontier retained-row summary must not treat the old prefix scan length as retained-row evidence",
  );
  assert.match(
    readCompositorInputAnchorSource,
    /sourceFrontierCompositorReadLimit\(/,
    "source-frontier anchor readback must inspect high-bucket refs using the same scan limit as the compositor",
  );
  assert.match(
    compositorInputReadbackSource,
    /summarizeWgslSourceFrontierRetainedRowsFromCompositorInputReadback\(/,
    "source-frontier compositor-input readback must summarize retained rows from the live GPU buffers",
  );
  assert.match(
    compositorInputReadbackSource,
    /refreshWgslSourceFrontierRetainedRowsEvidence\(state,\s*retainedRowsReadback\)/,
    "source-frontier compositor-input readback must install retained-row evidence on the retained-source construction surface",
  );
  assert.match(
    retainedRowsRefreshSource,
    /retainedRows:\s*retainedRowsReadback[\s\S]*nextGpuOffloadStage:\s*"live-wgsl-production-candidate-source-identity"/,
    "pending or blocked retained-row evidence must keep the next frontier pointed at production candidate-source identity",
  );
  assert.match(
    retainedRowsRefreshSource,
    /retainedRowsReadback\.status === "present"[\s\S]*const nextGpuOffloadStage = state\.productionElectionPrefixScatter[\s\S]*accountingSource:\s*"gpu-compositor-input-readback-present"[\s\S]*nextGpuOffloadStage,/,
    "present live retained-row readback must select the next frontier from seated prefix-scatter custody before falling back through compute-consumer and runtime candidate-source buffer custody",
  );
  assert.match(
    retainedRowsRefreshSource,
    /const candidateSourceRuntimeBuffers = sourceFrontierCandidateSourceRuntimeBufferEvidence\(state\)/,
    "retained-row refresh must re-read candidate-source buffer custody from live runtime state before advancing the source frontier",
  );
  assert.match(
    retainedRowsRefreshSource,
    /const nextGpuOffloadStage = state\.productionElectionPrefixScatter\s*\?\s*"live-wgsl-production-election-compositor-consumption"[\s\S]*:\s*state\.productionElectionComputeConsumer\s*\?\s*"live-wgsl-production-election-prefix-scatter"[\s\S]*:\s*candidateSourceRuntimeBuffers\.status === "runtime-state-buffers-present"[\s\S]*"live-wgsl-production-candidate-source-election"[\s\S]*"live-wgsl-production-candidate-source-identity"/,
    "present retained rows must preserve candidate-source identity as the fallback frontier until newer runtime custody is actually seated",
  );
  assert.match(
    retainedRowsRefreshSource,
    /const nextBlockedStage = nextGpuOffloadStage/,
    "frontier blockers must mirror the same candidate-source-aware next frontier instead of reintroducing old prefix-scatter or bindings language",
  );
  assert.match(
    retainedRowsRefreshSource,
    /nextGpuOffloadStage,[\s\S]*frontierBlockedStages:\s*\[[\s\S]*nextBlockedStage[\s\S]*\]/,
    "present retained-row refresh must publish the same compute-consumer-aware boundary in next stage and blockers",
  );
  assert.doesNotMatch(
    retainedRowsRefreshSource,
    /nextGpuOffloadStage:\s*candidateSourceRuntimeBuffers\.status === "runtime-state-buffers-present"\s*\?\s*"live-wgsl-production-candidate-source-election"/,
    "present retained-row refresh must not regress directly from seated candidate-source buffers to the old production-election boundary",
  );
  assert.match(
    retainedRowsRefreshSource,
    /frontierBlockedStages:\s*\[[\s\S]*nextBlockedStage[\s\S]*\]/,
    "present retained-row evidence must publish the compute-consumer-aware next blocked stage instead of a stale literal frontier",
  );
  assert.match(
    retainedRowsRefreshSource,
    /return;\s*\}\s*state\.retainedSourceConstruction = \{[\s\S]*retainedRows:\s*retainedRowsReadback[\s\S]*nextGpuOffloadStage:\s*"live-wgsl-production-candidate-source-identity"/,
    "blocked or pending retained-row evidence must be handled only after the present branch returns",
  );
  assert.match(
    retainedRowsRefreshSource,
    /state\.retainedSourceConstruction = \{[\s\S]*retainedRows:\s*retainedRowsReadback[\s\S]*nextGpuOffloadStage:\s*"live-wgsl-production-candidate-source-identity"[\s\S]*frontierBlockedStages:\s*\[[\s\S]*"live-wgsl-production-candidate-source-identity"[\s\S]*\]/,
    "blocked or pending retained-row evidence must restore candidate-source identity blockers instead of prefix/scatter blockers",
  );
  assert.doesNotMatch(
    retainedRowsRefreshSource,
    /compact-source-stream-retention|compact-source-pixel-traces|live-wgsl-production-election-candidate-source-bindings/,
    "retained-row refresh must not reintroduce stale compact-stream blockers or old candidate-source bindings frontier language",
  );
  assert.match(
    retainedSourceRefreshSource,
    /retainedSourceConstruction\.accountingSource === "gpu-compositor-input-readback-present"[\s\S]*retainedSourceConstruction\.retainedRows\?\.status === "present"[\s\S]*return;/,
    "ref-stats publication must not overwrite the compositor-input retained-row proof that advanced the source frontier",
  );
  assert.match(
    refStatsPublisherSource,
    /refreshWgslSourceFrontierRetainedSourceConstructionEvidence\(state,\s*readback\)/,
    "source-frontier live ref-stat publication must update retained-source construction evidence before exposing smoke state",
  );
  assert.match(
    refStatsPublisherSource,
    /retainedSourceConstruction:\s*state\.retainedSourceConstruction/,
    "source-frontier live ref-stat publication must republish retained-source construction evidence into the same smoke snapshot",
  );
  assert.match(
    refStatsPublisherSource,
    /smoke\.arenaRuntime = \{[\s\S]*retainedSourceConstruction:\s*state\.retainedSourceConstruction/,
    "source-frontier live ref-stat publication must keep arena-runtime retained-source evidence in sync when that surface exists",
  );
  assert.match(
    retainedSourceEvidence,
    /frontierBlockedStages:\s*\[[\s\S]*nextGpuOffloadStage[\s\S]*\]/,
    "source-frontier retained-source evidence must name only the live candidate-source identity frontier after CPU materialization is removed",
  );
  assert.doesNotMatch(
    retainedSourceEvidence,
    /wgsl-source-frontier-pack-candidate-source-inputs|wgsl-source-frontier-production-election-runtime|retainedPayloadCpuMaterializeStage/,
    "source-frontier construction evidence must not preserve removed CPU pack/election/materialization blockers",
  );
  assert.match(streamEvidenceSource, /"wgsl-projected-ref-stream-source-frontier"/);
  assert.match(
    streamEvidenceSource,
    /allocatedProjectedRefs:\s*compactSource\.compactSourceConstruction\?\.retainedBudgetRefs/,
    "source-frontier stream evidence must expose the allocated GPU source arena capacity",
  );
  assert.match(
    runtimeEvidenceSource,
    /allocatedRefs:\s*refAccounting\?\.allocatedRefs/,
    "source-frontier smoke evidence must publish live readback allocated refs instead of stale CPU tileEntryCount",
  );
  assert.match(
    runtimeEvidenceSource,
    /refreshTileLocalDiagnostics\(tileLocalState,\s*perPixelFinalColorAccumulation,\s*refStatsReadback\)/,
    "source-frontier smoke diagnostics must consume same-frame published readback when state was rebuilt",
  );
  assert.match(
    refStatsPublisherSource,
    /const diagnostics = refreshTileLocalDiagnostics\(state,\s*\[\],\s*readback\)/,
    "source-frontier readback publication must refresh diagnostics after installing live GPU ref stats",
  );
  assert.match(
    refStatsPublisherSource,
    /refreshStatsOverlayTileLocalRefAccounting\(state,\s*refAccounting\)/,
    "source-frontier readback publication must update the visible overlay instead of leaving stale zero refs",
  );
  assert.match(
    refStatsPublisherSource,
    /diagnostics,/,
    "source-frontier readback publication must republish diagnostics with live GPU ref stats",
  );
  assert.match(
    refStatsPublisherSource,
    /__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__ = diagnostics/,
    "source-frontier readback publication must update the standalone diagnostics evidence surface",
  );
  assert.match(
    refStatsPublisherSource,
    /runtimeBudgetDiagnosticsForRefStatsReadback\(state\.budgetDiagnostics,\s*state\.plan,\s*readback\)/,
    "source-frontier readback publication must update budget diagnostics from live dropped/saturated ref stats",
  );
  assert.match(
    mainSource,
    /function omitPerTileRetainedCapOverflowReason/,
    "source-frontier budget diagnostics must be able to drop stale per-tile cap pressure on zero-drop live readback",
  );
  assert.match(
    budgetReadbackSource,
    /droppedRefs > 0[\s\S]*omitPerTileRetainedCapOverflowReason\(base\.capPressure\.overflowReasons\)[\s\S]*perTileRetainedCap:\s*droppedRefs[\s\S]*:\s*omitPerTileRetainedCapOverflowReason\(base\.capPressure\.overflowReasons\)/,
    "source-frontier budget diagnostics must prefer live zero-drop readback over stale nested cap-pressure overflow reasons",
  );
  assert.match(
    compositorInputReadbackSource,
    /tileCapacity:\s*gpuLiveEffectiveRefsPerTile\(pending\.plan\)/,
    "source-frontier compositor-input readback must report the effective plan cap rather than a hardcoded requested cap",
  );
  assert.match(
    compositorInputReadbackSource,
    /publishTileLocalCompositorInputReadback\(\s*state,\s*compositorInputReadback,\s*pending\.sourceColors,\s*pending\.tileRefPayloadEncoding,\s*\)/,
    "source-frontier compositor-input readback publication must preserve tile-ref payload identity so legacy rows cannot impersonate projected support",
  );
  assert.match(
    mainSource,
    /function publishTileLocalCompositorInputReadback[\s\S]*buildPerPixelFinalColorAccumulationTraces\([\s\S]*contributorsByAnchorId:\s*sourceFrontierContributorsByAnchorId[\s\S]*buildRetainedToOrderedSurvivalLedger\(/,
    "source-frontier readback publication must refresh final accumulation and retained-to-ordered survival from live anchor rows",
  );
  assert.match(
    mainSource,
    /function publishTileLocalCompositorInputReadback[\s\S]*projectedContributorsByAnchorId:\s*sourceFrontierProjectedSupportFallbackByAnchorId\(\s*traceContributorListByAnchorId\(\s*state\.perPixelProjectedContributors,\s*"projectedContributors",\s*\),\s*sourceFrontierContributorsByAnchorId,\s*tileRefPayloadEncoding,\s*\)/,
    "source-frontier readback publication must route-gate projected foreground support fallback instead of letting legacy compositor rows impersonate projected authority",
  );
  assert.match(
    runtimeEvidenceSource,
    /const compositorInputProjectedSupportEncoding\s*=[\s\S]*compositorInputReadback\?\.source === "gpu-buffer-readback"[\s\S]*source-frontier-score[\s\S]*: "legacy-identity"/,
    "source-frontier runtime evidence must classify CPU diagnostic and legacy readback rows as legacy before projected-support fallback",
  );
  assert.match(
    runtimeEvidenceSource,
    /projectedContributorsByAnchorId:\s*sourceFrontierProjectedSupportFallbackByAnchorId\(\s*traceContributorListByAnchorId\(\s*tileLocalState\.perPixelProjectedContributors,\s*"projectedContributors",\s*\),\s*compositorInputContributorsByAnchorId,\s*compositorInputProjectedSupportEncoding,\s*\)/,
    "source-frontier runtime evidence must route-gate projected foreground support fallback when compact projected traces are sparse",
  );
  assert.match(renderLoopSource, /else \{\s*tileLocalState\.pipeline\.dispatch\(tileLocalComputePass,\s*tileLocalState\.bindGroup,\s*tileLocalState\.plan\);/);
  assert.match(
    mainSource,
    /overlayTileLocalRefStatsReadback\(scene\.tileLocalState,\s*runtimeWindow\.__MESH_SPLAT_SMOKE__\)/,
    "operator overlay must prefer live/published ref stats over pending zero placeholders",
  );
});

test("source-frontier alpha-density evidence separates CPU compensation from the GPU alpha-param carrier", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const frontierFactorySource = extractFunctionSource(mainSource, "createWgslProjectedSourceFrontierTileLocalSceneState");
  const runtimeEvidenceSource = extractFunctionSource(mainSource, "exposeTileLocalRuntimeEvidence");
  const statsOverlayStart = mainSource.indexOf("// Stats overlay");
  const statsOverlayEnd = mainSource.indexOf("statsEl.textContent = statsText;", statsOverlayStart);
  assert.ok(statsOverlayStart >= 0, "stats overlay source should exist");
  assert.ok(statsOverlayEnd > statsOverlayStart, "stats overlay assignment should exist");
  const statsOverlaySource = mainSource.slice(statsOverlayStart, statsOverlayEnd);

  assert.match(mainSource, /interface AlphaDensityRouteEvidence/);
  assert.match(frontierFactorySource, /alphaDensityRoute:\s*createSourceFrontierAlphaDensityRouteEvidence\(\)/);
  assert.match(mainSource, /effectiveBackend:\s*"wgsl-source-frontier-alpha-param-carrier"/);
  assert.match(mainSource, /compensatedOpacitySource:\s*"cpu-reference-opacity-buffer"/);
  assert.match(mainSource, /falseClosureGuard:\s*"gpu-alpha-param-carrier-does-not-imply-gpu-opacity-compensation"/);
  assert.match(runtimeEvidenceSource, /alphaDensityRoute:\s*tileLocalState\.alphaDensityRoute/);
  assert.match(statsOverlaySource, /alpha-density route:/);
  assert.match(statsOverlaySource, /scene\.tileLocalState\.alphaDensityRoute\.effectiveBackend/);
});

test("source-frontier declares a GPU alpha-density compensation substrate without claiming live runtime compensation", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuAlphaDensitySource = readFileSync(
    new URL("../../src/gpuAlphaDensityCompensation.ts", import.meta.url),
    "utf8",
  );
  const shaderSource = readFileSync(
    new URL("../../src/shaders/gpu_alpha_density_compensation.wgsl", import.meta.url),
    "utf8",
  );
  const evidenceSource = extractFunctionSource(mainSource, "createSourceFrontierAlphaDensityRouteEvidence");

  assert.match(mainSource, /createGpuAlphaDensityCompensationSubstrateEvidence/);
  assert.match(evidenceSource, /compensatedOpacitySource:\s*"cpu-reference-opacity-buffer"/);
  assert.match(
    evidenceSource,
    /gpuCompensationSubstrate:\s*createGpuAlphaDensityCompensationSubstrateEvidence\(\)/,
    "source-frontier route evidence should expose the GPU compensation substrate separately from the live opacity source",
  );
  assert.match(
    gpuAlphaDensitySource,
    /tileMassEncoding:\s*"fixed-point-u32-atomic"/,
    "GPU substrate evidence must pin the atomic-safe tile-mass encoding",
  );
  assert.match(
    gpuAlphaDensitySource,
    /falseClosureGuard:\s*"gpu-alpha-density-substrate-does-not-imply-live-runtime-compensation"/,
    "substrate evidence must not close over live runtime compensation before wiring exists",
  );
  assert.match(shaderSource, /@compute[\s\S]*fn\s+clear_alpha_density_tile_mass/);
  assert.match(shaderSource, /@compute[\s\S]*fn\s+scatter_alpha_density_tile_mass/);
  assert.match(shaderSource, /@compute[\s\S]*fn\s+write_compensated_opacity/);
  assert.match(shaderSource, /var<storage,\s*read_write>\s+tileAlphaMass:\s*array<atomic<u32>>/);
  assert.match(shaderSource, /atomicAdd\(&tileAlphaMass\[/);
});

test("default live projected-ref stream mode uses source-frontier with explicit diagnostic opt-outs", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const modeSource = extractFunctionSource(mainSource, "selectedWgslProjectedRefStreamMode");

  assert.match(modeSource, /if \(!requested\) \{\s*return "source-frontier";\s*\}/);
  assert.match(modeSource, /requested === "disabled"/);
  assert.match(modeSource, /requested === "off"/);
  assert.match(modeSource, /requested === "0"/);
  assert.match(modeSource, /return "disabled";/);
  assert.match(modeSource, /requested === "sidecar"/);
  assert.match(modeSource, /return "sidecar";/);
});

test("production-election prefix scatter remains a sidecar materializer but not the source-frontier live compositor source", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const prefixScatterSource = readFileSync(
    new URL("../../src/gpuProductionElectionPrefixScatter.ts", import.meta.url),
    "utf8",
  );
  const prefixScatterShader = readFileSync(
    new URL("../../src/shaders/gpu_production_election_prefix_scatter.wgsl", import.meta.url),
    "utf8",
  );
  const renderLoopStart = mainSource.indexOf("const tileLocalComputePass = encoder.beginComputePass");
  const renderLoopEnd = mainSource.indexOf("tileLocalComputePass.end()", renderLoopStart);
  const renderLoopSource = mainSource.slice(renderLoopStart, renderLoopEnd);
  const compactSourceFallback = extractFunctionSource(mainSource, "compactRetainedSourceForWgslProjectedSourceFrontier");
  const retainedSourceEvidence = extractFunctionSource(mainSource, "buildWgslProjectedSourceFrontierConstructionEvidence");
  const sourceFrontierSource = extractFunctionSource(mainSource, "createWgslProjectedSourceFrontierTileLocalSceneState");

  assert.match(
    prefixScatterSource,
    /materializeGpuProductionElectionCompositorSource/,
    "prefix-scatter contract must expose a dedicated compositor-source materialization dispatch",
  );
  assert.match(
    prefixScatterShader,
    /@compute @workgroup_size\(64\)\s*fn materialize_production_election_compositor_source/,
    "prefix-scatter WGSL must materialize retained production-election rows into compositor-readable tile buffers",
  );
  assert.match(
    prefixScatterShader,
    /materializedPrefixCounts\[[\s\S]*tileHeaders\[[\s\S]*tileRefs\[[\s\S]*tileCoverageWeights\[[\s\S]*alphaParams\[/,
    "materialization must bridge prefix-scatter retained rows into tile headers, refs, weights, and alpha/conic payloads",
  );
  assert.match(
    prefixScatterSource,
    /PROJECTED_CONTRIBUTOR_COMPOSITOR_SLOT_FIELD[\s\S]*projectedContributorPayload\.u32\[u32Base \+ PROJECTED_CONTRIBUTOR_COMPOSITOR_SLOT_FIELD\] = compositorSlot/,
    "prefix-scatter projected contributor payload must carry a deterministic per-tile compositor slot instead of relying on GPU atomic arrival order",
  );
  assert.match(
    prefixScatterShader,
    /let slot = projected_u32\(retainedRecordIndex,\s*PROJECTED_CONTRIBUTOR_COMPOSITOR_SLOT_FIELD\)/,
    "materializer must consume the precomputed compositor slot from sorted projected contributor rows",
  );
  assert.doesNotMatch(
    prefixScatterShader,
    /let slot = materializedRetainedRecordIndices\[retainedRecordIndex\]/,
    "materializer must not use schedule-dependent prefix-scatter atomic slots as compositor order",
  );
  assert.match(
    prefixScatterSource,
    /const retainedRecords = \[\.\.\.productionElection\.retainedRecords\]\.sort\(compareCompactProjectionRetentionCompositorOrder\)/,
    "prefix-scatter compositor materialization must preserve per-tile alpha-compositing order instead of selection order",
  );
  assert.match(
    compactSourceFallback,
    /const retainedRecords = \[\.\.\.productionElection\.retainedRecords\]\.sort\(compareCompactProjectionRetentionCompositorOrder\)/,
    "production-election retained-source fallback evidence must use the same compositor ordering contract as the live materializer",
  );
  assert.doesNotMatch(
    renderLoopSource,
    /dispatchGpuProductionElectionPrefixScatter\(\s*tileLocalComputePass,\s*tileLocalState\.productionElectionPrefixScatter\s*\)[\s\S]*materializeGpuProductionElectionCompositorSource\(\s*tileLocalComputePass,\s*tileLocalState\.productionElectionPrefixScatter[\s\S]*tileLocalState\.pipeline\.dispatchComposite/,
    "source-frontier render loop must not materialize CPU production-election prefix-scatter output before current compositor dispatch",
  );
  assert.doesNotMatch(
    renderLoopSource,
    /else if \(tileLocalState\.productionElectionPrefixScatter\) \{\s*tileLocalState\.pipeline\.dispatchComposite\(tileLocalComputePass,\s*tileLocalState\.bindGroup,\s*tileLocalState\.plan\);\s*\} else if \(compositePrebuiltCpuTileRefs\)/,
    "seated production-election prefix scatter must not choose the compositor over the shader-built source-frontier pipeline",
  );
  assert.match(
    retainedSourceEvidence,
    /currentCompositorBinding:\s*"wgsl-projected-ref-stream-shader-built-current-compositor-source"/,
    "retained-source evidence must state that the live compositor source is shader-built projected refs",
  );
  assert.doesNotMatch(
    retainedSourceEvidence,
    /currentCompositorBinding:\s*productionElectionPrefixScatter\s*\?/,
    "retained-source evidence must not make current compositor custody depend on CPU production-election prefix scatter",
  );
  assert.match(
    retainedSourceEvidence,
    /falseClosureGuard:\s*"shader-built-source-frontier-is-not-production-pool-seat-election-or-visual-quality-closure"/,
    "shader-built source-frontier evidence must keep GPU construction closure separate from production-election and visual-quality closure",
  );
  assert.doesNotMatch(
    sourceFrontierSource,
    /buildWgslSourceFrontierCandidateSources/,
    "source-frontier live state must not stream CPU candidate-source records before the shader-built compositor source",
  );
  assert.doesNotMatch(
    sourceFrontierSource,
    /buildGpuProjectionRetentionCandidateSourceProductionElection/,
    "source-frontier live state must not run CPU production election before the shader-built compositor source",
  );
  assert.doesNotMatch(
    sourceFrontierSource,
    /createGpuProductionElectionPrefixScatterContract/,
    "source-frontier live state must not create CPU election prefix-scatter materialization for the current compositor source",
  );
  assert.doesNotMatch(
    retainedSourceEvidence,
    /"wgsl-source-frontier-pack-candidate-source-inputs"|"wgsl-source-frontier-production-election-runtime"|"wgsl-source-frontier-production-election-retained-payload-cpu-materialize"/,
    "source-frontier retained-source evidence must not list CPU candidate-source/election/materialization as live-route stages after shader construction owns the compositor source",
  );
});

test("live production-election materializer consumes projected contributor payload buffers instead of bespoke retained rows", () => {
  const prefixScatterSource = readFileSync(
    new URL("../../src/gpuProductionElectionPrefixScatter.ts", import.meta.url),
    "utf8",
  );
  const prefixScatterShader = readFileSync(
    new URL("../../src/shaders/gpu_production_election_prefix_scatter.wgsl", import.meta.url),
    "utf8",
  );
  const retainedPayloadLoop = prefixScatterSource.slice(
    prefixScatterSource.indexOf("const retainedRecords ="),
    prefixScatterSource.indexOf("const retainedRecordTileIndexesBuffer"),
  );

  assert.doesNotMatch(
    prefixScatterSource,
    /RETAINED_ROW_[UF]32_STRIDE|retainedRecordPayloadU32|retainedRecordPayloadF32/,
    "live production-election materialization must not build bespoke CPU retained-payload row buffers",
  );
  assert.match(
    prefixScatterSource,
    /packGpuArenaProjectedContributors\(\s*retainedRecords\s*\)/,
    "materialization should consume the shared projected-contributor payload packing contract",
  );
  assert.match(
    prefixScatterSource,
    /const\s+retainedRecords\s*=\s*\[\.\.\.productionElection\.retainedRecords\]\.sort\(compareCompactProjectionRetentionCompositorOrder\)[\s\S]*packGpuArenaProjectedContributors\(\s*retainedRecords\s*\)/,
    "the reusable projected-contributor payload is lawful only when retained rows are already in the same deterministic storage order",
  );
  assert.match(
    prefixScatterSource,
    /projectedContributorPayload\.u32\[u32Base \+ PROJECTED_CONTRIBUTOR_CLASS_MASK_FIELD\][\s\S]*projectedContributorPayload\.u32\[u32Base \+ PROJECTED_CONTRIBUTOR_COMPOSITOR_SLOT_FIELD\]/,
    "source-frontier sidecar fields should annotate the same projected-contributor rows consumed by the materializer",
  );
  assert.doesNotMatch(
    retainedPayloadLoop,
    /coverageWeight|opacity|centerPx|inverseConic|retentionWeight/,
    "the live prefix-scatter constructor should not copy retained payload fields into CPU-side materialization rows",
  );
  assert.match(
    prefixScatterShader,
    /@binding\(8\)\s*var<storage,\s*read>\s+projectedContributorU32:[\s\S]*@binding\(9\)\s*var<storage,\s*read>\s+projectedContributorF32:/,
    "materializer shader should read the reusable projected-contributor payload source",
  );
  for (const field of ["2u", "3u", "4u", "5u", "6u", "7u", "8u", "11u"]) {
    assert.match(
      prefixScatterShader,
      new RegExp(`projected_f32\\(retainedRecordIndex,\\s*${field}\\)`),
      "coverage, opacity, center/conic, and retention payloads should come from projected contributor fields",
    );
  }
});

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  const parameterStart = source.indexOf("(", start);
  assert.ok(parameterStart > start, `${name} should have parameters`);
  let parameterDepth = 0;
  let parameterEnd = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "(") {
      parameterDepth += 1;
    } else if (character === ")") {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        parameterEnd = index;
        break;
      }
    }
  }
  assert.ok(parameterEnd > parameterStart, `${name} parameter list should close`);
  const bodyStart = source.indexOf("{", parameterEnd);
  assert.ok(bodyStart > parameterEnd, `${name} should have a function body`);
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
