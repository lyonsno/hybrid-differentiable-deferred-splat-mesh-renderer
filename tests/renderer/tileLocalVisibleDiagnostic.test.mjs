import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("main exposes a visible tile-local Gaussian compositor without replacing the prepass smoke mode", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const gpuSource = readFileSync(new URL("../../src/gpu.ts", import.meta.url), "utf8");

  assert.match(source, /"tile-local-visible"/);
  assert.match(source, /tile-local-visible-gaussian-compositor/);
  assert.match(source, /createTileLocalTexturePresenter/);
  assert.match(source, /dispatchComposite/);
  assert.doesNotMatch(source, /dispatchBridgeDiagnosticComposite/);
  assert.match(source, /tileLocalPresenter\.draw/);
  assert.match(source, /gpu-sorted-index-rank-inversion/);
  assert.match(source, /orderingBackend:\s*TILE_LOCAL_ORDERING_BACKEND/);
  assert.doesNotMatch(source, /buildTileLocalOrderingRanks/);
  assert.doesNotMatch(source, /syncTileLocalOrderingKeys/);
  assert.match(source, /params\.get\("renderer"\)\s*===\s*"tile-local-visible"/);
  assert.match(source, /params\.get\("renderer"\)\s*===\s*"tile-local"/);
  assert.match(gpuSource, /maxStorageBuffersPerShaderStage:\s*adapter\.limits\.maxStorageBuffersPerShaderStage/);
});

test("tile-local visible shader composites ordered tile refs with sample-local conic coverage, alpha, and real colors", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");

  assert.match(shader, /fn composite_tiles/);
  assert.match(shader, /textureDimensions\(outputColor\)/);
  assert.match(shader, /var<storage, read> colors/);
  assert.match(shader, /tileHeaders\[tileId\]/);
  assert.match(shader, /load_tile_ref\(refIndex\)/);
  assert.match(shader, /var<storage, read> opacities/);
  assert.match(shader, /let alphaParam = alphaParams\[alphaParamIndex\]/);
  assert.match(shader, /let conicParam = alphaParams\[alphaParamIndex \+ frame\.maxTileRefs\]/);
  assert.match(shader, /alphaParam\.yz/);
  assert.match(shader, /conicParam\.x/);
  assert.match(shader, /conicParam\.y/);
  assert.match(shader, /conicParam\.z/);
  assert.match(shader, /let tileCoverageWeight = max\(tileCoverageWeights\[refIndex\], 0\.0\)/);
  assert.match(shader, /if\s*\(tileCoverageWeight <= 0\.0\)\s*\{\s*continue;\s*\}/);
  assert.match(shader, /let pixelCoverageWeight = conic_pixel_weight\(alphaParam, conicParam, pixelCenter\)/);
  assert.match(shader, /let sourceFrontierSupportWeight = conic_pixel_weight_with_falloff_scale\(alphaParam,\s*conicParam,\s*pixelCenter,\s*SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE\)/);
  assert.match(shader, /let alphaTransferWeight = source_frontier_alpha_transfer_weight\(pixelCoverageWeight,\s*tileCoverageWeight,\s*sourceFrontierSupportWeight,\s*sourceFrontierClassMask\)/);
  assert.match(shader, /1\.0\s*-\s*pow\(1\.0\s*-\s*sourceOpacity,\s*alphaTransferWeight\)/);
  assert.match(shader, /let orderingKey = splatId/);
  assert.match(shader, /let sourceOpacity = clamp\(opacities\[splatId\]/);
  assert.doesNotMatch(shader, /alphaParams\[refIndex\] = vec4f\(0\.35/);
  assert.match(shader, /conic_pixel_weight/);
  assert.match(shader, /conic_falloff_scale/);
  assert.match(shader, /fn conic_falloff_scale\(\) -> f32\s*\{\s*return 2\.0;\s*\}/);
  assert.doesNotMatch(shader, /frame\.tileSizePx >= 16\.0 && frame\.maxTileRefs >= 256u/);
  assert.match(shader, /mahalanobis2/);
  assert.match(shader, /return conic_pixel_weight_with_falloff_scale\(alphaParam,\s*conicParam,\s*pixelCenter,\s*conic_falloff_scale\(\)\)/);
  assert.match(shader, /const SOURCE_FRONTIER_SUPPORT_FALLOFF_SCALE = 0\.5/);
  assert.doesNotMatch(shader, /exp\(-2\.0 \* mahalanobis2\)/);
  assert.doesNotMatch(shader, /tileCoverageWeights\[refIndex\][^;]*\*\s*conic_pixel_weight/);
  assert.doesNotMatch(shader, /for \(var candidate = 0u; candidate < refLimit/);
  assert.match(shader, /remainingTransmission/);
  assert.doesNotMatch(shader, /identityTint/);
  assert.doesNotMatch(shader, /occupancyWitness/);
  assert.doesNotMatch(shader, /alphaScale \* 0\.0/);
});

test("tile-local visible compositor consumes the retained tile header count without a hidden 32-ref cap", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.doesNotMatch(shader, /min\(header\.y,\s*32u\)/);
  assert.match(shader, /let tileCapacity = tile_ref_capacity_per_tile\(\)/);
  assert.match(shader, /fn source_frontier_compositor_ref_limit\([\s\S]*headerRefCount:\s*u32[\s\S]*gpuScatterCount:\s*u32[\s\S]*tileCapacity:\s*u32/);
  assert.match(shader, /let liveRefCount = source_frontier_compositor_ref_limit\(header\.y,\s*gpuScatterCount,\s*tileCapacity\)/);
  assert.match(shader, /let flatRemainingRefs = frame\.maxTileRefs - min\(header\.x,\s*frame\.maxTileRefs\)/);
  assert.match(shader, /let refLimit = min\(liveRefCount,\s*flatRemainingRefs\)/);
  assert.match(source, /visible-compositor cap/);
  assert.match(source, /visibleCompositedRefLimit/);
});

test("CPU tile-local path does not dispatch orphaned ordering-rank work after ordering keys leave the shader bind group", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.doesNotMatch(shader, /orderingKeys/);
  assert.doesNotMatch(source, /createGpuOrderingRanker/);
  assert.doesNotMatch(source, /encodeGpuOrderingRanks/);
  assert.doesNotMatch(source, /orderingRanksNeedDispatch/);
  assert.doesNotMatch(source, /tile_local_ordering_ranks/);
});

test("GPU live tile-ref builder scatters a projected conic footprint across every overlapped tile", () => {
  const shader = readFileSync(new URL("../../src/shaders/gpu_tile_coverage.wgsl", import.meta.url), "utf8");
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(shader, /var<storage, read> scales/);
  assert.match(shader, /var<storage, read> rotations/);
  assert.match(shader, /var<storage, read> opacities/);
  assert.match(shader, /frame\.splatScale/);
  assert.match(shader, /frame\.minRadiusPx/);
  assert.match(shader, /fn projectAxisJacobian/);
  assert.match(shader, /fn gpu_live_projected_conic/);
  assert.match(shader, /fn gpu_live_footprint_policy_scale/);
  assert.match(shader, /frame\.viewport\.x \* frame\.viewport\.y \* 0\.01/);
  assert.match(shader, /min\(frame\.viewport\.x, frame\.viewport\.y\) \* 0\.65/);
  assert.match(shader, /let tileBounds = gpu_live_compact_footprint_bounds\(conic, centerPx, tileSizePx\)/);
  assert.doesNotMatch(shader, /return 10\.0/);
  assert.match(shader, /\b(?:let|var) minTileX =/);
  assert.match(shader, /\b(?:let|var) maxTileX =/);
  assert.match(shader, /\b(?:let|var) minTileY =/);
  assert.match(shader, /\b(?:let|var) maxTileY =/);
  assert.match(shader, /for\s*\(var tileY = minTileY; tileY <= maxTileY; tileY = tileY \+ 1u\)/);
  assert.match(shader, /for\s*\(var tileX = minTileX; tileX <= maxTileX; tileX = tileX \+ 1u\)/);
  assert.doesNotMatch(shader, /let firstTile = tileY \* frame\.tileGrid\.x \+ tileX;[\s\S]*tileRefs\[refIndex\] = vec4u\(splatId, splatId, firstTile, refIndex\);/);
  assert.match(source, /estimatedGpuLiveProjectedTileRefs/);
  assert.match(source, /projectedTileEntryCount: projectedRefs/);
});

test("GPU live diagnostics estimate full-frame retention audit from tile custody without fake region audits", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /estimatedGpuLiveRetentionAudit\(compactSource\.tileRefCustody,\s*plan\.tileCount\)/);
  assert.match(source, /function estimatedGpuLiveRetentionAudit\(/);
  assert.match(source, /gpu-live-custody-estimate/);
  assert.match(source, /cappedTileCount:\s*tileRefCustody\.cappedTileCount/);
  assert.match(source, /projectedTileEntryCount:\s*tileRefCustody\.projectedTileEntryCount/);
  assert.match(source, /currentRetainedEntryCount:\s*tileRefCustody\.retainedTileEntryCount/);
  assert.match(source, /legacyRetainedEntryCount:\s*tileRefCustody\.retainedTileEntryCount/);
  assert.match(source, /gpu-live-region-unavailable:porous-body/);
  assert.match(source, /gpu-live-region-unavailable:center-leak-band/);
  assert.doesNotMatch(source, /const retentionAudit = emptyTileRetentionAudit\(\)/);
});

test("tile-local texture presenter samples the offscreen tile-local output", () => {
  const source = readFileSync(new URL("../../src/tileLocalTexturePresenter.ts", import.meta.url), "utf8");
  const shader = readFileSync(new URL("../../src/shaders/tile_local_present.wgsl", import.meta.url), "utf8");

  assert.match(source, /createTileLocalTexturePresenter/);
  assert.match(source, /GPUTextureView/);
  assert.match(source, /magFilter:\s*"nearest"/);
  assert.match(source, /minFilter:\s*"nearest"/);
  assert.match(source, /texture:\s*\{\s*sampleType:\s*"float"\s*\}/);
  assert.match(shader, /textureSample/);
  assert.match(shader, /@vertex/);
  assert.match(shader, /@fragment/);
});

test("tile-local visible smoke exposes anchor-local output texture readback before presentation", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /outputTextureReadback/);
  assert.match(source, /copyTextureToBuffer/);
  assert.match(source, /halfFloatToNumber/);
  assert.match(source, /outputTextureRgba8/);
});

test("tile-local visible smoke reconstructs anchor colors from live compositor input buffers", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const runtimeSource = readFileSync(new URL("../../src/gpuTileContributorArenaRuntime.ts", import.meta.url), "utf8");

  assert.match(source, /compositorInputReadback/);
  assert.match(source, /copyBufferToBuffer/);
  assert.match(source, /liveCompositorRgba8/);
  assert.match(source, /pixelCoverageWeight/);
  assert.doesNotMatch(source, /live compositor input readback requires the gpu arena runtime/);
  assert.match(runtimeSource, /GPUBufferUsage\.COPY_SRC/);
});

test("CPU reference route exposes compositor input diagnostics from CPU-owned state without GPU readback", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /ensureCpuReferenceCompositorInputReadback/);
  assert.match(source, /source:\s*"cpu-reference-diagnostic-state"/);
  assert.match(source, /tileRefData:\s*legacyProjection\?\.tileRefs \?\? bridge\.tileRefs/);
  assert.match(source, /state\.arenaBackend !== "cpu"/);
  assert.match(source, /if\s*\(\s*state\.arenaBackend !== "gpu"\s*\)\s*\{\s*state\.pendingCompositorInputReadback = undefined;\s*return;\s*\}/);
  assert.match(source, /tileRefs:\s*state\.tileRefData!/);
  assert.match(
    source,
    /const evidenceFrameId = tileLocalState\?\.lastCompositedFrame \?\? operatorWitness\?\.frameSerial \?\? -1/
  );
  assert.doesNotMatch(
    source,
    /const evidenceFrameId = operatorWitness\?\.frameSerial \?\? tileLocalState\?\.lastCompositedFrame \?\? -1/
  );
  assert.match(
    source,
    /const traceAnchors: readonly PixelTraceAnchor\[\] = tileLocalState\s*\?\s*tileLocalState\.traceAnchors \?\? TILE_LOCAL_TRACE_ANCHORS \?\? \[\]\s*:\s*\[\]/
  );
});

test("direct GPU live route reports retained refs from compacted tile headers instead of capacity estimates", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /interface TileLocalRefStatsReadback/);
  assert.match(source, /enqueueTileLocalRefStatsReadback/);
  assert.match(source, /resolveTileLocalRefStatsReadback/);
  assert.match(source, /tile_local_live_ref_stats_tile_headers_readback/);
  assert.match(source, /tile_local_live_ref_stats_scatter_cursors_readback/);
  assert.match(source, /encoder\.copyBufferToBuffer\(state\.tileHeaderBuffer,\s*0,\s*tileHeaderBuffer/);
  assert.match(source, /encoder\.copyBufferToBuffer\(tileLocalRefStatsReadbackSourceBuffer\(state\)/);
  assert.match(source, /encoder\.copyBufferToBuffer\(tileLocalRefStatsReadbackSourceBuffer\(state\),\s*0,\s*tileScatterCursorBuffer/);
  assert.match(source, /const refStatsReadback = summarizeTileLocalRefStatsReadback/);
  assert.match(source, /tileCapacity:\s*gpuLiveEffectiveRefsPerTile\(pending\.plan\)/);
  assert.match(source, /state\.refStatsReadback = refStatsReadback/);
  assert.match(source, /publishTileLocalRefStatsReadback\(state,\s*refStatsReadback\)/);
  assert.match(source, /function tileLocalRefStatsReadbackSourceBuffer/);
  assert.match(source, /state\.gpuArenaRuntime\?\.buffers\.scatterCursorBuffer \?\? state\.tileScatterCursorBuffer/);
  assert.match(source, /state\.gpuArenaRuntime\s*\?\s*TILE_LOCAL_PROVISIONAL_MAX_REFS_PER_TILE\s*:\s*gpuLiveEffectiveRefsPerTile\(state\.plan\)/);
  assert.match(source, /summarizeTileLocalRefStatsReadback/);
  assert.match(source, /tileHeaders\[headerBase \+ 1\]/);
  assert.match(source, /const headerRetainedRefs = Math\.min\(tileHeaders\[headerBase \+ 1\]/);
  assert.doesNotMatch(source, /const tileRetainedRefs = Math\.min\(projectedRefs,\s*pending\.tileCapacity\)/);
  assert.match(source, /tileLocalRefAccounting/);
  assert.match(source, /source:\s*"gpu-tile-header-and-scatter-readback"/);
  assert.match(source, /refAccounting/);
  assert.match(source, /refs:\s*refAccounting\?\.retainedRefs/);
  assert.match(source, /estimatedRetainedRefs/);
  assert.match(source, /allocatedRefs:\s*state\.plan\.maxTileRefs/);
  assert.match(source, /mapStarted:\s*false/);
  assert.match(source, /if\s*\(pending\.mapStarted\)/);
  assert.match(source, /pending\.mapStarted\s*=\s*true/);
  assert.match(source, /state\.pendingRefStatsReadback\s*=\s*undefined/);
  assert.match(source, /cancelled:\s*false/);
  assert.match(source, /state\.disposed\s*=\s*true/);
  assert.match(source, /pendingRefStatsReadback\.cancelled\s*=\s*true/);
  assert.match(source, /pendingRefStatsReadback\.tileHeaderBuffer/);
  assert.match(source, /pendingRefStatsReadback\.tileScatterCursorBuffer/);
  assert.match(source, /pendingCompositorInputReadback\.cancelled\s*=\s*true/);
  assert.match(source, /tileLocalRefStatsReadbackCanPublish/);
  assert.match(source, /tileLocalCompositorInputReadbackCanPublish/);
  assert.match(source, /pending\.frameId\s*===\s*state\.lastCompositedFrame/);
  assert.match(source, /const stateRefStatsReadback = tileLocalState\?\.refStatsReadback\?\.frameId === evidenceFrameId/);
  assert.match(source, /const refStatsReadback = stateRefStatsReadback \?\? publishedRefStatsReadback/);
  assert.match(source, /const diagnostics = refreshTileLocalDiagnostics\(state,\s*\[\],\s*readback\)/);
  assert.match(source, /tileLocalRefAccounting\(state,\s*diagnostics,\s*readback\)/);
  assert.match(source, /scene\.tileLocalState\.lastCompositedFrame/);
});
