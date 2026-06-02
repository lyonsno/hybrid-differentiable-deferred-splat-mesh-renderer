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
  assert.match(shaderSource, /tileHeaders\[tile_count\(\) \+ sourceOrdinal\]\.x/);
  assert.match(shaderSource, /sourceOrdinal >= frame\.sourceSplatCount/);
  assert.match(shaderSource, /frame\.maxTilesPerSplat > 0u/);
});

test("WGSL projected source-frontier route skips CPU streaming retention and visibly owns source construction", () => {
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const shaderSource = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
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
    "fn gpu_live_retention_election_score(",
    "fn gpu_live_overflow_election_slot",
  );
  const enqueueCompositorInputReadbackSource = extractFunctionSource(mainSource, "enqueueTileLocalCompositorInputReadback");
  const compositorInputReadbackSource = extractFunctionSource(mainSource, "resolveTileLocalCompositorInputReadback");
  const readCompositorInputAnchorSource = extractFunctionSource(mainSource, "readCompositorInputAnchor");
  const refStatsPublisherSource = extractFunctionSource(mainSource, "publishTileLocalRefStatsReadback");
  const budgetReadbackSource = extractFunctionSource(mainSource, "runtimeBudgetDiagnosticsForRefStatsReadback");
  const retainedSourceRefreshSource = extractFunctionSource(mainSource, "refreshWgslSourceFrontierRetainedSourceConstructionEvidence");
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
    /"wgsl-source-frontier-depth-aware-retention-election"/,
    "source-frontier retained-source evidence must advertise the depth-aware GPU retention election stage",
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
    /fn gpu_live_retention_election_score\([\s\S]*sourceDepthNdc:\s*f32[\s\S]*depthBucket[\s\S]*coverageBucket[\s\S]*depthBucket/,
    "source-frontier GPU retention election must include projected depth/frontness, not only coverage and opacity",
  );
  assert.doesNotMatch(
    retentionScoreSource,
    /sourceOrdinal:\s*u32/,
    "source-frontier retention score must not retain a dead sourceOrdinal parameter after depth-aware tie-breaking switched to splat identity",
  );
  assert.match(
    shaderSource,
    /let sourceDepthNdc = centerClip\.z \/ max\(centerClip\.w, 0\.000001\)[\s\S]*gpu_live_retention_election_score\([\s\S]*sourceDepthNdc/,
    "source-frontier build must pass the current projected depth into the retained-ref election score",
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
    /let compositorOrderSlot = gpu_live_compositor_order_slot\(sourceDepthNdc,\s*projectedSlot,\s*tileCapacity\)[\s\S]*gpu_live_retention_election_slot\(projectedSlot,\s*compositorOrderSlot,\s*tileId,\s*splatId,\s*tileCapacity\)/,
    "source-frontier retained refs must feed the visible compositor in provisional back-to-front slot order",
  );
  assert.doesNotMatch(
    shaderSource,
    /let slot = gpu_live_retention_election_slot\(projectedSlot,\s*tileId,\s*splatId,\s*tileCapacity\);/,
    "source-frontier must not let first-arrival projectedSlot impersonate compositor draw order",
  );
  assert.match(
    shaderSource,
    /fn source_frontier_compositor_ref_limit\([\s\S]*headerRefCount:\s*u32[\s\S]*gpuScatterCount:\s*u32[\s\S]*tileCapacity:\s*u32[\s\S]*gpuScatterCount > 0u[\s\S]*return tileCapacity/,
    "source-frontier compositor must scan the full per-tile capacity when sparse depth buckets can place live refs beyond the scatter prefix",
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
    /nextGpuOffloadStage:\s*"gpu-retained-source-prefix-scatter"/,
    "after GPU retention election, the next retained-source frontier must be prefix/scatter construction rather than election itself",
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
    /falseClosureGuard:\s*"source-frontier-retained-row-readback-is-not-production-gpu-prefix-scatter"/,
    "source-frontier retained-row witness must not claim production GPU prefix/scatter completion",
  );
  assert.match(
    sourceFrontierReadLimitSource,
    /headerRefCount > 0[\s\S]*return headerRefCount[\s\S]*gpuScatterCount > 0[\s\S]*return tileCapacity/,
    "source-frontier CPU witnesses must share the shader's full-capacity scan rule for sparse depth buckets",
  );
  assert.match(
    retainedRowsSummarySource,
    /const scanTileRows = Math\.min\([\s\S]*sourceFrontierCompositorReadLimit\(/,
    "source-frontier retained-row summary must scan the sparse-bucket capacity, not only the scatter prefix",
  );
  assert.match(
    retainedRowsSummarySource,
    /retainedRows \+= scorePackedTileRows/,
    "source-frontier retained-row summary must report actual score-packed rows found during the full scan",
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
    /nextGpuOffloadStage:\s*"gpu-retained-source-prefix-scatter"/,
    "retained-row evidence must keep the next frontier pointed at production GPU prefix/scatter",
  );
  assert.match(
    retainedRowsRefreshSource,
    /retainedRowsReadback\.status !== "present"[\s\S]*retainedRows:\s*retainedRowsReadback[\s\S]*return/,
    "blocked or pending retained-row evidence must not overwrite already-live top-level retained/dropped ref accounting",
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
  assert.match(retainedSourceEvidence, /"compact-source-stream-retention"[\s\S]*frontierBlockedStages/);
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
  assert.match(renderLoopSource, /else \{\s*tileLocalState\.pipeline\.dispatch\(tileLocalComputePass,\s*tileLocalState\.bindGroup,\s*tileLocalState\.plan\);/);
  assert.match(
    mainSource,
    /overlayTileLocalRefStatsReadback\(scene\.tileLocalState,\s*runtimeWindow\.__MESH_SPLAT_SMOKE__\)/,
    "operator overlay must prefer live/published ref stats over pending zero placeholders",
  );
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
