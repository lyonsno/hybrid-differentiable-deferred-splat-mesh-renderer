import {
  createAlphaDensityRefreshState,
  shouldRefreshAlphaDensity,
  type AlphaDensityRefreshState,
} from "./alphaDensityRefresh.js";
import { initGPU, resizeCanvas, GPU } from "./gpu.js";
import {
  bindCameraControls,
  cameraHasActiveInput,
  createCamera,
  getProjectionMatrix,
  getViewMatrix,
  updateCamera,
} from "./camera.js";
import { createStorageBuffer, createTexture2D, createUniformBuffer } from "./buffers.js";
import {
  createGpuTileCoveragePlan,
  GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
  writeGpuTileCoverageFrameUniforms,
  type GpuTileCoverageDebugMode,
  type GpuTileCoveragePlan,
} from "./gpuTileCoverage.js";
import {
  createGpuTileCoveragePipelineSkeleton,
  type GpuTileCoveragePipelineSkeleton,
} from "./gpuTileCoverageRenderer.js";
import {
  createGpuTileCoverageBridgeBuffers,
  writeGpuTileCoverageAlphaParams,
  type TileRefCustodySummary,
  type TileRetentionAudit,
} from "./gpuTileCoverageBridge.js";
import {
  createGpuSortPrototype,
  encodeGpuSortPrototype,
  writeViewDepthSortInput,
  type GpuSortPrototype,
} from "./gpuSortPrototype.js";
import {
  createGpuOrderingRanker,
  encodeGpuOrderingRanks,
  type GpuOrderingRanker,
} from "./gpuOrderingRanks.js";
import { loadDroppedSplatFile } from "./localPly.js";
import {
  createRenderDemandState,
  markRenderFrameFinished,
  requestRenderFrame,
  shouldDispatchTileLocalCompositor,
  shouldContinueRendering,
} from "./renderDemand.js";
import { createTimestamps, resolveTimestamps, readTimestamps, TimestampHelper } from "./timestamps.js";
import {
  REAL_SCANIVERSE_MIN_RADIUS_PX,
  REAL_SCANIVERSE_NEAR_FADE_END_NDC,
  REAL_SCANIVERSE_NEAR_FADE_START_NDC,
  REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  REAL_SCANIVERSE_SPLAT_SCALE,
  composeFirstSmokeViewProjection,
  configureCameraForSplatBounds,
  createMeshSplatSmokeEvidence,
  createMeshSplatRendererWitness,
  exposeMeshSplatSmokeEvidence,
  exposeMeshSplatRendererWitness,
  writeAlphaDensityCompensatedOpacities,
  type AlphaDensityAccountingMode,
  type AlphaDensityCompensationSummary,
} from "./realSmokeScene.js";
import {
  summarizeTileLocalDiagnostics,
  type TileLocalDiagnosticSummary,
} from "./rendererFidelityProbes/tileLocalDiagnostics.js";
import {
  createSplatPlateRenderer,
  SPLAT_PLATE_FRAME_UNIFORM_BYTES,
  writeSplatPlateFrameUniforms,
} from "./splatPlateRenderer.js";
import { captureViewDepthKey, viewDepthKeyChanged } from "./splatSort.js";
import {
  fetchFirstSmokeSplatPayload,
  uploadSplatAttributeBuffers,
  type SplatAttributes,
  type SplatGpuBuffers,
} from "./splats.js";
import {
  buildTileLocalPrepassBridge,
  captureTileLocalPrepassBridgeSignature,
  tileLocalPrepassBridgeSignatureChanged,
  type TileLocalPrepassBudgetDiagnostics,
} from "./tileLocalPrepassBridge.js";
import { createTileLocalTexturePresenter } from "./tileLocalTexturePresenter.js";
import {
  splatAttributesFromFixture,
  configureCameraForFixture,
  SHAPE_WITNESS_SPLAT_SCALE,
  SHAPE_WITNESS_MIN_RADIUS_PX,
  SHAPE_WITNESS_NEAR_FADE_START_NDC as SHAPE_WITNESS_NEAR_FADE_START,
  SHAPE_WITNESS_NEAR_FADE_END_NDC as SHAPE_WITNESS_NEAR_FADE_END,
} from "./rendererFidelityProbes/syntheticShapeLoader.js";
import { getShapeFixture } from "./syntheticShapeFixtures.js";

const statsEl = document.getElementById("stats")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const SORT_BACKEND = "gpu-bitonic-cpu-depth-keys";
const TILE_LOCAL_ORDERING_BACKEND = "gpu-sorted-index-rank-inversion";
const GPU_SORT_SETTLE_MS = 160;
const ALPHA_DENSITY_SETTLE_MS = 160;
const ALPHA_DENSITY_MODE = selectedAlphaDensityMode();
const RENDERER_MODE = selectedRendererMode();
const TILE_LOCAL_DEBUG_MODE = selectedTileLocalDebugMode();
const TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX = 6;
const TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES = 1;
const TILE_LOCAL_PROVISIONAL_MAX_SPLATS = 150_000;
const TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES = 20_000_000;
const TILE_LOCAL_UNSAFE = selectedTileLocalUnsafeMode();

interface ActiveSplatScene {
  attributes: SplatAttributes;
  buffers: SplatGpuBuffers;
  sortedIndexBuffer: GPUBuffer;
  splatBindGroup: GPUBindGroup;
  gpuSort: GpuSortPrototype;
  sortState: SortSettleState;
  effectiveOpacities: Float32Array;
  alphaDensityState: AlphaDensityState;
  tileLocalState: TileLocalSceneState | null;
  tileLocalDisabledReason: string | null;
  tileLocalLastSkipReason: string | null;
  tileLocalLastSkipSignature: string | null;
  rendererMode: RendererMode;
  count: number;
  assetPath: string;
}

interface TileLocalSceneState {
  viewportWidth: number;
  viewportHeight: number;
  plan: GpuTileCoveragePlan;
  pipeline: GpuTileCoveragePipelineSkeleton;
  bindGroup: GPUBindGroup;
  frameUniformBuffer: GPUBuffer;
  frameUniformData: Float32Array;
  projectedBoundsBuffer: GPUBuffer;
  tileHeaderBuffer: GPUBuffer;
  tileHeaderData: Uint32Array;
  tileRefBuffer: GPUBuffer;
  tileCoverageWeightBuffer: GPUBuffer;
  tileCoverageWeightData: Float32Array;
  orderingKeyBuffer: GPUBuffer;
  orderingKeyData: Uint32Array;
  orderingRanker: GpuOrderingRanker;
  orderingRanksNeedDispatch: boolean;
  alphaParamBuffer: GPUBuffer;
  alphaParamData: Float32Array;
  tileRefShapeParams: Float32Array;
  outputTexture: GPUTexture;
  outputView: GPUTextureView;
  tileEntryCount: number;
  tileRefCustody: TileRefCustodySummary;
  retentionAudit: TileRetentionAudit;
  budgetDiagnostics: TileLocalPrepassBudgetDiagnostics;
  tileRefSplatIds: Uint32Array;
  prepassSignature: string;
  debugMode: GpuTileCoverageDebugMode;
  diagnostics: TileLocalDiagnosticSummary;
  needsDispatch: boolean;
  lastCompositedAtMs: number;
  lastCompositedFrame: number;
  lastCompositedSignature: string;
}

type RendererMode = "plate" | "tile-local" | "tile-local-visible";

interface RuntimeFootprintParams {
  readonly splatScale: number;
  readonly minRadiusPx: number;
  readonly nearFadeEndNdc: number;
}

interface SortSettleState {
  lastSortedViewDepthKey: Float32Array;
  observedViewDepthKey: Float32Array;
  lastViewDepthChangeMs: number;
  needsSort: boolean;
}

interface AlphaDensityState {
  refreshState: AlphaDensityRefreshState;
  summary: AlphaDensityCompensationSummary;
}

async function main() {
  const gpu = await initGPU(canvas);
  const cam = createCamera();
  const renderDemand = createRenderDemandState();
  const requestFrame = () => {
    if (requestRenderFrame(renderDemand)) {
      requestAnimationFrame(frame);
    }
  };
  bindCameraControls(cam, canvas, requestFrame);
  window.addEventListener("resize", requestFrame);

  const ts = createTimestamps(gpu.device, gpu.timestampsSupported);

  const uniformBuffer = createUniformBuffer(gpu.device, SPLAT_PLATE_FRAME_UNIFORM_BYTES, "frame_uniforms");
  const uniformData = new Float32Array(SPLAT_PLATE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);

  // Bind group layout
  const bgl = gpu.device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const bindGroup = gpu.device.createBindGroup({
    layout: bgl,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const splatRenderer = createSplatPlateRenderer(gpu.device, gpu.format, bgl);
  const tileLocalPresenter = createTileLocalTexturePresenter(gpu.device, gpu.format);

  // shape-witness: detect ?synthetic=shape-witness-<id> and load the real synthetic fixture
  // through the real WebGPU renderer path. This is the renderer-path-integration lane wiring.
  // The fixture data replaces the real Scaniverse asset; the real compositor and plate
  // renderer process the synthetic splats exactly as they would real splat data.
  const shapeWitnessFixtureId = selectedShapeWitnessFixtureId();

  statsEl.textContent = "Loading real Scaniverse splats...";
  const assetPath = selectedSplatAssetPath();
  let activeScene: ActiveSplatScene | null = null;

  function replaceSplatScene(attributes: SplatAttributes, sceneAssetPath: string): void {
    const previous = activeScene;
    configureCameraForSplatBounds(cam, attributes.bounds);
    updateCamera(cam, 0);
    const initialView = getViewMatrix(cam);
    const initialViewportWidth = Math.max(canvas.clientWidth || canvas.width || 1, 1);
    const initialViewportHeight = Math.max(canvas.clientHeight || canvas.height || 1, 1);
    const initialAspect = initialViewportWidth / initialViewportHeight;
    const initialViewProj = composeFirstSmokeViewProjection(
      getProjectionMatrix(cam, initialAspect),
      initialView
    );
    const gpuSort = createGpuSortPrototype(gpu.device, attributes.count, "first_smoke_gpu_bitonic_sort");
    const sortState = createSortSettleState(initialView);
    const buffers = uploadSplatAttributeBuffers(gpu.device, attributes);
    const effectiveOpacities = new Float32Array(attributes.count);
    const initialSplatScale = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_SPLAT_SCALE : REAL_SCANIVERSE_SPLAT_SCALE;
    const initialMinRadiusPx = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_MIN_RADIUS_PX : REAL_SCANIVERSE_MIN_RADIUS_PX;
    const alphaDensitySummary = writeAlphaDensityCompensatedOpacities(
      effectiveOpacities,
      attributes,
      initialViewProj,
      initialViewportWidth,
      initialViewportHeight,
      initialSplatScale,
      initialMinRadiusPx,
      ALPHA_DENSITY_MODE
    );
    gpu.device.queue.writeBuffer(buffers.opacityBuffer, 0, effectiveOpacities);
    const sortedIndexBuffer = gpuSort.indexBuffer;
    const splatBindGroup = splatRenderer.createBindGroup({
      positionBuffer: buffers.positionBuffer,
      colorBuffer: buffers.colorBuffer,
      opacityBuffer: buffers.opacityBuffer,
      scaleBuffer: buffers.scaleBuffer,
      rotationBuffer: buffers.rotationBuffer,
      sortedIndexBuffer,
    });
    const provisionalTileLocalDisabledReason = tileLocalDisabledReasonForAttributes(attributes);
    let tileLocalDisabledReason = provisionalTileLocalDisabledReason;
    let tileLocalState: TileLocalSceneState | null = null;
    if (usesTileLocalPrepass(RENDERER_MODE) && !tileLocalDisabledReason) {
      try {
        tileLocalState = createTileLocalSceneState(
          gpu.device,
          attributes,
          buffers,
          sortedIndexBuffer,
          effectiveOpacities,
          initialView,
          initialViewProj,
          initialViewportWidth,
          initialViewportHeight,
          {
            splatScale: initialSplatScale,
            minRadiusPx: initialMinRadiusPx,
            nearFadeEndNdc: shapeWitnessFixtureId !== null ? SHAPE_WITNESS_NEAR_FADE_END : REAL_SCANIVERSE_NEAR_FADE_END_NDC,
          }
        );
      } catch (err) {
        if (!isTileLocalBudgetError(err)) {
          throw err;
        }
        tileLocalDisabledReason = errorMessage(err);
      }
    }
    activeScene = {
      attributes,
      buffers,
      sortedIndexBuffer,
      splatBindGroup,
      gpuSort,
      sortState,
      effectiveOpacities,
      alphaDensityState: {
        refreshState: createAlphaDensityRefreshState(
          initialView,
          initialViewportWidth,
          initialViewportHeight
        ),
        summary: alphaDensitySummary,
      },
      tileLocalState,
      tileLocalDisabledReason,
      tileLocalLastSkipReason: null,
      tileLocalLastSkipSignature: null,
      rendererMode: RENDERER_MODE,
      count: attributes.count,
      assetPath: sceneAssetPath,
    };
    exposeMeshSplatSmokeEvidence(
      createMeshSplatSmokeEvidence(attributes, attributes.count, sceneAssetPath, SORT_BACKEND),
      canvas
    );
    exposeMeshSplatRendererWitness(
      createMeshSplatRendererWitness(
        attributes,
        attributes.count,
        sceneAssetPath,
        SORT_BACKEND,
        {
          viewProj: initialViewProj,
          viewportWidth: initialViewportWidth,
          viewportHeight: initialViewportHeight,
          splatScale: REAL_SCANIVERSE_SPLAT_SCALE,
          minRadiusPx: REAL_SCANIVERSE_MIN_RADIUS_PX,
        }
      ),
      canvas
    );
    destroySplatScene(previous);
    requestFrame();
  }

  if (shapeWitnessFixtureId !== null) {
    // Load and render the synthetic fixture through the REAL renderer path.
    // No CPU-only fake, no alternate renderer — the same WebGPU tile-local compositor
    // and plate renderer that processes real Scaniverse splats processes the fixture data.
    const fullFixtureId = `shape-witness-${shapeWitnessFixtureId}`;
    const fixture = getShapeFixture(fullFixtureId);
    if (fixture === undefined) {
      console.error(
        `[shape-witness] Unrecognized fixture ID: "${fullFixtureId}". ` +
        `Valid IDs: shape-witness-{isotropic-circle,edge-on-ribbon,rotated-ellipse,near-plane-slab,dense-foreground}`
      );
      // Fall back to real Scaniverse so the page is not blank.
      replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);
    } else {
      statsEl.textContent = `Loading shape-witness fixture: ${shapeWitnessFixtureId}...`;
      const fixtureAttributes = splatAttributesFromFixture(fixture);
      // replaceSplatScene uses the bounds-based camera internally; we will override
      // the camera immediately after with the fixture's exact camera specification.
      replaceSplatScene(fixtureAttributes, `shape-witness:${fullFixtureId}`);
      // Override camera to fixture specification (replaces the bounds-based camera set above).
      configureCameraForFixture(cam, fixture.camera, fixtureAttributes.bounds);
      // Expose shape-witness smoke evidence with ready: true so the capture harness can proceed.
      // This overwrites the replaceSplatScene evidence with shape-witness-specific metadata.
      exposeShapeWitnessSmokeEvidence(shapeWitnessFixtureId, fixtureAttributes.count);
      statsEl.textContent = `shape-witness: ${shapeWitnessFixtureId} | renderer: shape-witness | splats: ${fixtureAttributes.count}`;
    }
  } else {
    replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);
  }
  bindDroppedSplatLoading(canvas, async (file) => {
    statsEl.textContent = `Loading ${file.name}...`;
    try {
      replaceSplatScene(await loadDroppedSplatFile(file), `local-file:${file.name}`);
    } catch (err) {
      statsEl.textContent = err instanceof Error ? err.message : String(err);
      requestFrame();
    }
  });

  let depthTexture: GPUTexture | null = null;

  let lastTime = performance.now();
  let frameCount = 0;
  let frameSerial = 0;
  let fpsAccum = 0;
  let displayFps = 0;
  let gpuTimings: Map<string, number> = new Map();

  async function frame() {
    markRenderFrameFinished(renderDemand);
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    const scene = activeScene;
    if (!scene) {
      return;
    }

    frameCount++;
    frameSerial++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      displayFps = Math.round(frameCount / fpsAccum);
      frameCount = 0;
      fpsAccum = 0;
    }

    updateCamera(cam, dt);

    const activeInput = cameraHasActiveInput(cam);
    const { width, height } = resizeCanvas(gpu);
    const aspect = width / height;

    // Recreate depth texture on resize
    if (!depthTexture || depthTexture.width !== width || depthTexture.height !== height) {
      depthTexture?.destroy();
      depthTexture = gpu.device.createTexture({
        size: { width, height },
        format: "depth32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    // Upload uniforms
    const view = getViewMatrix(cam);
    const proj = getProjectionMatrix(cam, aspect);
    const viewProj = composeFirstSmokeViewProjection(proj, view);
    const alphaRefreshed = shouldRefreshAlphaDensity(
      scene.alphaDensityState.refreshState,
      view,
      width,
      height,
      now,
      ALPHA_DENSITY_SETTLE_MS
    );
    // Use shape-witness rendering parameters when rendering synthetic fixtures.
    // Shape-witness fixtures are defined in world-space units compatible with splatScale=600.
    // Real Scaniverse uses splatScale=3000 for its own unit system.
    const activeSplatScale = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_SPLAT_SCALE : REAL_SCANIVERSE_SPLAT_SCALE;
    const activeMinRadiusPx = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_MIN_RADIUS_PX : REAL_SCANIVERSE_MIN_RADIUS_PX;
    if (alphaRefreshed) {
      scene.alphaDensityState.summary = writeAlphaDensityCompensatedOpacities(
        scene.effectiveOpacities,
        scene.attributes,
        viewProj,
        width,
        height,
        activeSplatScale,
        activeMinRadiusPx,
        ALPHA_DENSITY_MODE
      );
      gpu.device.queue.writeBuffer(scene.buffers.opacityBuffer, 0, scene.effectiveOpacities);
      if (scene.tileLocalState) {
        syncTileLocalAlphaParams(gpu.device.queue, scene.tileLocalState, scene.effectiveOpacities);
        scene.tileLocalState.needsDispatch = true;
      }
    }
    const activeNearFadeStart = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_NEAR_FADE_START : REAL_SCANIVERSE_NEAR_FADE_START_NDC;
    const activeNearFadeEnd = shapeWitnessFixtureId !== null ? SHAPE_WITNESS_NEAR_FADE_END : REAL_SCANIVERSE_NEAR_FADE_END_NDC;
    writeSplatPlateFrameUniforms(
      uniformData,
      viewProj,
      width,
      height,
      activeSplatScale,
      activeMinRadiusPx,
      activeNearFadeStart,
      activeNearFadeEnd
    );
    gpu.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = gpu.device.createCommandEncoder();
    const gpuSortRefreshed = shouldRefreshGpuSort(scene.sortState, view, now);
    if (gpuSortRefreshed) {
      writeViewDepthSortInput(gpu.device.queue, scene.gpuSort, scene.attributes.positions, view);
      encodeGpuSortPrototype(encoder, scene.gpuSort);
      if (scene.tileLocalState) {
        encodeGpuOrderingRanks(encoder, scene.tileLocalState.orderingRanker);
        scene.tileLocalState.orderingRanksNeedDispatch = false;
        scene.tileLocalState.needsDispatch = true;
      }
    }
    const pendingGpuSort = gpuSortRefreshPending(scene.sortState, view);
    const pendingAlphaDensity = scene.alphaDensityState.refreshState.needsRefresh;
    const tileLocalCurrentSignature = scene.tileLocalState
      ? captureCurrentTileLocalSignature(view, viewProj, width, height, {
        splatScale: activeSplatScale,
        minRadiusPx: activeMinRadiusPx,
        nearFadeEndNdc: activeNearFadeEnd,
      })
      : null;
    if (
      scene.tileLocalState &&
      tileLocalCurrentSignature !== scene.tileLocalState.lastCompositedSignature
    ) {
      scene.tileLocalState.needsDispatch = true;
    }

    if (scene.tileLocalState && shouldDispatchTileLocalCompositor({
      needsDispatch: scene.tileLocalState.needsDispatch,
      activeInput,
      pendingGpuSort,
      pendingAlphaDensity,
    })) {
      try {
        const tileLocalState = ensureTileLocalSceneState(
          gpu.device,
          scene,
          scene.tileLocalState,
          view,
          viewProj,
          width,
          height,
          true,
          {
            splatScale: activeSplatScale,
            minRadiusPx: activeMinRadiusPx,
            nearFadeEndNdc: activeNearFadeEnd,
          }
        );
        scene.tileLocalState = tileLocalState;
        scene.tileLocalLastSkipReason = null;
        scene.tileLocalLastSkipSignature = null;
        if (tileLocalState.orderingRanksNeedDispatch) {
          encodeGpuOrderingRanks(encoder, tileLocalState.orderingRanker);
          tileLocalState.orderingRanksNeedDispatch = false;
        }
        writeGpuTileCoverageFrameUniforms(
          tileLocalState.frameUniformData,
          viewProj,
          tileLocalState.plan,
          tileLocalState.debugMode
        );
        gpu.device.queue.writeBuffer(tileLocalState.frameUniformBuffer, 0, tileLocalState.frameUniformData);
        const tileLocalComputePass = encoder.beginComputePass();
        if (scene.rendererMode === "tile-local-visible") {
          tileLocalState.pipeline.dispatchComposite(tileLocalComputePass, tileLocalState.bindGroup, tileLocalState.plan);
        } else {
          tileLocalState.pipeline.dispatch(tileLocalComputePass, tileLocalState.bindGroup, tileLocalState.plan);
        }
        tileLocalComputePass.end();
        tileLocalState.needsDispatch = false;
        tileLocalState.lastCompositedAtMs = now;
        tileLocalState.lastCompositedFrame = frameSerial;
        tileLocalState.lastCompositedSignature = tileLocalCurrentSignature ?? tileLocalState.prepassSignature;
      } catch (err) {
        if (!isTileLocalBudgetError(err)) {
          throw err;
        }
        scene.tileLocalLastSkipReason = errorMessage(err);
        scene.tileLocalLastSkipSignature = tileLocalCurrentSignature;
        scene.tileLocalState.needsDispatch = false;
      }
    }

    const textureView = gpu.context.getCurrentTexture().createView();

    const writeTimestamps = ts && !ts.mapping;
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
      ...(writeTimestamps
        ? {
            timestampWrites: {
              querySet: ts.querySet,
              beginningOfPassWriteIndex: 0,
              endOfPassWriteIndex: 1,
            },
          }
        : {}),
    });

    if (writeTimestamps) {
      ts.labels.push("render", "render_end");
    }

    if (scene.rendererMode === "tile-local-visible" && scene.tileLocalState) {
      tileLocalPresenter.draw(renderPass, scene.tileLocalState.outputView);
    } else {
      renderPass.setBindGroup(0, bindGroup);
      splatRenderer.draw(renderPass, scene.splatBindGroup, scene.count);
    }
    renderPass.end();

    if (writeTimestamps) {
      resolveTimestamps(encoder, ts);
    }

    gpu.device.queue.submit([encoder.finish()]);

    // Read GPU timings (async, one frame behind)
    if (writeTimestamps) {
      readTimestamps(ts).then((t) => {
        gpuTimings = t;
      });
    }

    // Stats overlay
    const alphaSummary = scene.alphaDensityState.summary;
    const requestedRenderer = scene.rendererMode;
    const baseRendererLabel = labelRendererMode(
      scene.rendererMode,
      scene.tileLocalState,
      scene.tileLocalDisabledReason,
      scene.tileLocalLastSkipReason
    );
    const effectiveRenderer = baseRendererLabel;
    // In shape-witness mode, prefix the renderer label so the capture harness sees "shape-witness".
    const rendererLabel = shapeWitnessFixtureId !== null
      ? `shape-witness`
      : baseRendererLabel;
    const splatKindLabel = shapeWitnessFixtureId !== null
      ? `shape-witness (${shapeWitnessFixtureId})`
      : "real Scaniverse splats";
    const tileLocalBudget = tileLocalBudgetEvidence(
      scene.tileLocalState,
      scene.tileLocalDisabledReason,
      scene.tileLocalLastSkipReason,
      width,
      height
    );
    let statsText = `${width}×${height} | ${displayFps} fps | ${scene.count.toLocaleString()} ${splatKindLabel} | requested renderer: ${requestedRenderer} | effective renderer: ${effectiveRenderer} | renderer: ${rendererLabel} | sort: ${SORT_BACKEND} | alpha: ${alphaSummary.accountingMode} density ${alphaSummary.compensatedSplatCount.toLocaleString()} splats/${alphaSummary.hotTileCount} tiles`;
    if (scene.tileLocalState) {
      statsText += ` | tile-local: ${scene.tileLocalState.plan.tileColumns}x${scene.tileLocalState.plan.tileRows} tiles/${scene.tileLocalState.tileEntryCount} refs`;
      const budgetText = formatTileLocalBudgetLabel(tileLocalBudget);
      if (budgetText) {
        statsText += ` | tile-local budget: ${budgetText}`;
      }
      statsText += ` | tile-order: ${TILE_LOCAL_ORDERING_BACKEND}`;
      const freshness = tileLocalPresentationFreshness(
        scene.tileLocalState,
        scene.tileLocalLastSkipReason,
        scene.tileLocalLastSkipSignature,
        now
      );
      if (freshness.status === "stale-cache") {
        statsText += ` | tile-local stale-cache: ${Math.round(freshness.cachedFrameAgeMs ?? 0)}ms old`;
        statsText += ` | tile-local current-grid: ${tileColumnsForViewport(width)}x${tileRowsForViewport(height)} tiles`;
      }
      if (scene.tileLocalState.debugMode !== "final-color") {
        statsText += ` | tile-debug: ${scene.tileLocalState.debugMode}`;
      }
    }
    if (!scene.tileLocalState) {
      const budgetText = formatTileLocalBudgetLabel(tileLocalBudget);
      if (budgetText) {
        statsText += ` | tile-local budget: ${budgetText}`;
      }
    }
    if (gpuTimings.size > 0) {
      for (const [label, ms] of gpuTimings) {
        statsText += ` | ${label}: ${ms.toFixed(2)}ms`;
      }
    }
    statsEl.textContent = statsText;
    exposeTileLocalRuntimeEvidence(
      requestedRenderer,
      effectiveRenderer,
      rendererLabel,
      displayFps,
      scene.tileLocalState,
      scene.tileLocalDisabledReason,
      scene.tileLocalLastSkipReason,
      scene.tileLocalLastSkipSignature,
      now,
      width,
      height,
      tileLocalBudget
    );

    if (shouldContinueRendering({
      activeInput,
      pendingGpuSort,
      pendingAlphaDensity,
      pendingTileLocalCompositor: shouldDispatchTileLocalCompositor({
        needsDispatch: scene.tileLocalState?.needsDispatch === true,
        activeInput,
        pendingGpuSort,
        pendingAlphaDensity,
      }),
    })) {
      requestFrame();
    }
  }

  requestFrame();
}

function createSortSettleState(viewMatrix: Float32Array): SortSettleState {
  const viewDepthKey = captureViewDepthKey(viewMatrix);
  return {
    lastSortedViewDepthKey: viewDepthKey,
    observedViewDepthKey: viewDepthKey,
    lastViewDepthChangeMs: Number.NEGATIVE_INFINITY,
    needsSort: true,
  };
}

function shouldRefreshGpuSort(
  state: SortSettleState,
  viewMatrix: Float32Array,
  nowMs: number
): boolean {
  if (viewDepthKeyChanged(state.observedViewDepthKey, viewMatrix)) {
    state.observedViewDepthKey = captureViewDepthKey(viewMatrix);
    state.lastViewDepthChangeMs = nowMs;
  }

  if (!state.needsSort && !viewDepthKeyChanged(state.lastSortedViewDepthKey, viewMatrix)) {
    return false;
  }
  if (!state.needsSort && nowMs - state.lastViewDepthChangeMs < GPU_SORT_SETTLE_MS) {
    return false;
  }

  state.lastSortedViewDepthKey = captureViewDepthKey(viewMatrix);
  state.observedViewDepthKey = state.lastSortedViewDepthKey;
  state.needsSort = false;
  return true;
}

function gpuSortRefreshPending(state: SortSettleState, viewMatrix: Float32Array): boolean {
  return state.needsSort || viewDepthKeyChanged(state.lastSortedViewDepthKey, viewMatrix);
}

function createTileLocalSceneState(
  device: GPUDevice,
  attributes: SplatAttributes,
  buffers: SplatGpuBuffers,
  sortedIndexBuffer: GPUBuffer,
  effectiveOpacities: Float32Array,
  viewMatrix: Float32Array,
  viewProj: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  footprintParams: RuntimeFootprintParams
): TileLocalSceneState {
  const bridgeInput = {
    attributes,
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
  };
  const bridgeBuildStartedAtMs = performance.now();
  const bridge = buildTileLocalPrepassBridge(bridgeInput);
  const bridgeBuildDurationMs = Math.max(0, performance.now() - bridgeBuildStartedAtMs);
  const prepassSignature = captureTileLocalPrepassBridgeSignature(bridgeInput);
  const plan = createGpuTileCoveragePlan({
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    splatCount: attributes.count,
    maxTileRefs: Math.max(bridge.tileEntryCount, 1),
  });
  const budgetDiagnostics: TileLocalPrepassBudgetDiagnostics = {
    ...bridge.budgetDiagnostics,
    heat: {
      cpu: {
        ...bridge.budgetDiagnostics.heat.cpu,
        buildDurationMs: roundRuntimeMetric(bridgeBuildDurationMs),
      },
      gpu: {
        ...bridge.budgetDiagnostics.heat.gpu,
        alphaParamBufferBytes: plan.alphaParamBytes,
        orderingKeyBufferBytes: plan.orderingKeyBytes,
      },
    },
  };
  const pipeline = createGpuTileCoveragePipelineSkeleton(device, "rgba16float");
  const frameUniformBuffer = createUniformBuffer(
    device,
    GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES,
    "tile_local_frame_uniforms"
  );
  const frameUniformData = new Float32Array(GPU_TILE_COVERAGE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT);
  const alphaParamData = new Float32Array(Math.max(plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  const orderingKeyData = new Uint32Array(Math.max(plan.orderingKeyBytes / Uint32Array.BYTES_PER_ELEMENT, 4));
  orderingKeyData.fill(0xffffffff);
  const tileRefSplatIds = new Uint32Array(plan.maxTileRefs);
  for (let refIndex = 0; refIndex < plan.maxTileRefs; refIndex++) {
    const splatId = bridge.tileRefs[refIndex * 4] ?? 0;
    tileRefSplatIds[refIndex] = splatId;
  }
  writeGpuTileCoverageAlphaParams(alphaParamData, bridge, effectiveOpacities, plan.maxTileRefs);

  const bridgeBuffers = createGpuTileCoverageBridgeBuffers(device, bridge);
  const alphaParamBuffer = createStorageBuffer(device, alphaParamData.buffer, "tile_local_alpha_params");
  const orderingKeyBuffer = createStorageBuffer(
    device,
    orderingKeyData.buffer as ArrayBuffer,
    "tile_local_ordering_ranks"
  );
  const orderingRanker = createGpuOrderingRanker(
    device,
    {
      splatCount: attributes.count,
      sortedIndexCount: Math.max(attributes.count, 1),
    },
    sortedIndexBuffer,
    orderingKeyBuffer,
    "tile_local_ordering_ranks"
  );
  const outputTexture = createTexture2D(
    device,
    viewportWidth,
    viewportHeight,
    "rgba16float",
    GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
    "tile_local_output"
  );
  const outputView = outputTexture.createView();

  const bindGroup = pipeline.createBindGroup({
    frameUniformBuffer,
    positionBuffer: buffers.positionBuffer,
    colorBuffer: buffers.colorBuffer,
    projectedBoundsBuffer: bridgeBuffers.projectedBoundsBuffer,
    tileHeaderBuffer: bridgeBuffers.tileHeaderBuffer,
    tileRefBuffer: bridgeBuffers.tileRefBuffer,
    tileCoverageWeightBuffer: bridgeBuffers.tileCoverageWeightBuffer,
    orderingKeyBuffer,
    alphaParamBuffer,
    outputColorView: outputView,
  });

  return {
    viewportWidth,
    viewportHeight,
    plan,
    pipeline,
    bindGroup,
    frameUniformBuffer,
    frameUniformData,
    projectedBoundsBuffer: bridgeBuffers.projectedBoundsBuffer,
    tileHeaderBuffer: bridgeBuffers.tileHeaderBuffer,
    tileHeaderData: bridge.tileHeaders,
    tileRefBuffer: bridgeBuffers.tileRefBuffer,
    tileCoverageWeightBuffer: bridgeBuffers.tileCoverageWeightBuffer,
    tileCoverageWeightData: bridge.tileCoverageWeights,
    orderingKeyBuffer,
    orderingKeyData,
    orderingRanker,
    orderingRanksNeedDispatch: true,
    alphaParamBuffer,
    alphaParamData,
    tileRefShapeParams: bridge.tileRefShapeParams,
    outputTexture,
    outputView,
    tileEntryCount: bridge.tileEntryCount,
    tileRefCustody: bridge.tileRefCustody,
    retentionAudit: bridge.retentionAudit,
    budgetDiagnostics,
    tileRefSplatIds,
    prepassSignature,
    debugMode: TILE_LOCAL_DEBUG_MODE,
    diagnostics: summarizeTileLocalDiagnostics({
      debugMode: TILE_LOCAL_DEBUG_MODE,
      plan,
      tileEntryCount: bridge.tileEntryCount,
      tileHeaders: bridge.tileHeaders,
      tileRefCustody: bridge.tileRefCustody,
      retentionAudit: bridge.retentionAudit,
      tileCoverageWeights: bridge.tileCoverageWeights,
      alphaParamData,
    }),
    needsDispatch: true,
    lastCompositedAtMs: 0,
    lastCompositedFrame: -1,
    lastCompositedSignature: prepassSignature,
  };
}

function roundRuntimeMetric(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

function ensureTileLocalSceneState(
  device: GPUDevice,
  scene: ActiveSplatScene,
  state: TileLocalSceneState,
  viewMatrix: Float32Array,
  viewProj: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  allowViewRebuild: boolean,
  footprintParams: RuntimeFootprintParams
): TileLocalSceneState {
  const bridgeInput = {
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
  };
  const viewportMatches = state.viewportWidth === viewportWidth && state.viewportHeight === viewportHeight;
  const bridgeStillFresh = !tileLocalPrepassBridgeSignatureChanged(state.prepassSignature, bridgeInput);
  if (viewportMatches && (bridgeStillFresh || !allowViewRebuild)) {
    return state;
  }
  const nextState = createTileLocalSceneState(
    device,
    scene.attributes,
    scene.buffers,
    scene.sortedIndexBuffer,
    scene.effectiveOpacities,
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    footprintParams
  );
  destroyTileLocalSceneState(state);
  return nextState;
}

function captureCurrentTileLocalSignature(
  viewMatrix: Float32Array,
  viewProj: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  footprintParams: RuntimeFootprintParams
): string {
  return captureTileLocalPrepassBridgeSignature({
    viewMatrix,
    viewProj,
    viewportWidth,
    viewportHeight,
    tileSizePx: TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    samplesPerAxis: TILE_LOCAL_PROVISIONAL_COVERAGE_SAMPLES,
    splatScale: footprintParams.splatScale,
    minRadiusPx: footprintParams.minRadiusPx,
    maxTileEntries: TILE_LOCAL_PROVISIONAL_MAX_TILE_ENTRIES,
    nearFadeEndNdc: footprintParams.nearFadeEndNdc,
  });
}

function syncTileLocalAlphaParams(
  queue: GPUQueue,
  state: TileLocalSceneState,
  effectiveOpacities: Float32Array
): void {
  const alphaParamData = new Float32Array(Math.max(state.plan.alphaParamBytes / Float32Array.BYTES_PER_ELEMENT, 8));
  writeGpuTileCoverageAlphaParams(alphaParamData, state, effectiveOpacities, state.plan.maxTileRefs);
  state.alphaParamData.set(alphaParamData);
  queue.writeBuffer(state.alphaParamBuffer, 0, alphaParamData);
  refreshTileLocalDiagnostics(state);
}

function destroyTileLocalSceneState(state: TileLocalSceneState): void {
  state.frameUniformBuffer.destroy();
  state.projectedBoundsBuffer.destroy();
  state.tileHeaderBuffer.destroy();
  state.tileRefBuffer.destroy();
  state.tileCoverageWeightBuffer.destroy();
  state.orderingKeyBuffer.destroy();
  state.orderingRanker.paramsBuffer.destroy();
  state.alphaParamBuffer.destroy();
  state.outputTexture.destroy();
}

function selectedSplatAssetPath(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("asset") || REAL_SCANIVERSE_SMOKE_ASSET_PATH;
}

function selectedAlphaDensityMode(): AlphaDensityAccountingMode {
  const params = new URLSearchParams(window.location.search);
  return params.get("alpha") === "center-tile" ? "center-tile" : "coverage-aware";
}

function selectedTileLocalDebugMode(): GpuTileCoverageDebugMode {
  const params = new URLSearchParams(window.location.search);
  switch (params.get("tileDebug") ?? params.get("debug")) {
    case "coverage":
    case "coverage-weight":
      return "coverage-weight";
    case "alpha":
    case "accumulated-alpha":
      return "accumulated-alpha";
    case "transmission":
    case "transmittance":
      return "transmittance";
    case "refs":
    case "tile-refs":
    case "tile-ref-count":
      return "tile-ref-count";
    case "conic":
    case "conic-shape":
      return "conic-shape";
    default:
      return "final-color";
  }
}

function selectedTileLocalUnsafeMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("tileLocalUnsafe") || params.get("tileLocalBudget") === "unsafe";
}

function selectedRendererMode(): RendererMode {
  const params = new URLSearchParams(window.location.search);
  if (params.get("renderer") === "tile-local-visible") {
    return "tile-local-visible";
  }
  return params.get("renderer") === "tile-local" ? "tile-local" : "plate";
}

function usesTileLocalPrepass(mode: RendererMode): boolean {
  return mode === "tile-local" || mode === "tile-local-visible";
}

// ---------------------------------------------------------------------------
// shape-witness helpers (renderer-path-integration lane)
//
// These functions support real synthetic fixture loading via ?synthetic=shape-witness-<id>.
// The fixture data is loaded through the real WebGPU renderer path (not a CPU fake).
// ---------------------------------------------------------------------------

/**
 * Returns the fixture ID suffix from ?synthetic=shape-witness-<id>, or null if absent.
 * Example: ?synthetic=shape-witness-isotropic-circle → "isotropic-circle"
 */
function selectedShapeWitnessFixtureId(): string | null {
  const params = new URLSearchParams(window.location.search);
  const synthetic = params.get("synthetic");
  if (!synthetic || !synthetic.startsWith("shape-witness-")) {
    return null;
  }
  return synthetic.slice("shape-witness-".length);
}

/**
 * Exposes shape-witness smoke evidence after the real fixture has been loaded and rendered.
 * Sets ready: true and rendererLabel: "shape-witness" so the pixel-shape-gate capture
 * harness knows the fixture rendered through the real WebGPU path.
 *
 * This is called AFTER replaceSplatScene() to layer shape-witness-specific fields
 * on top of the base scene evidence. Each render frame, exposeTileLocalRuntimeEvidence()
 * will merge into __MESH_SPLAT_SMOKE__ with rendererLabel = "shape-witness".
 */
function exposeShapeWitnessSmokeEvidence(fixtureId: string, splatCount: number): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: Record<string, unknown>;
  };
  runtimeWindow.__MESH_SPLAT_SMOKE__ = {
    ...(runtimeWindow.__MESH_SPLAT_SMOKE__ ?? {}),
    ready: true,
    rendererLabel: "shape-witness",
    synthetic: true,
    realSplatEvidence: false,
    sourceKind: `shape-witness-real-renderer`,
    shapeWitnessFixtureId: fixtureId,
    shapeWitnessSplatCount: splatCount,
    shapeWitnessRealRenderer: true,
    // rendererLabel stays "shape-witness" each frame via the frame() closure override
  };
}

function tileLocalDisabledReasonForAttributes(attributes: SplatAttributes): string | null {
  if (!usesTileLocalPrepass(RENDERER_MODE) || TILE_LOCAL_UNSAFE) {
    return null;
  }
  if (attributes.count > TILE_LOCAL_PROVISIONAL_MAX_SPLATS) {
    return `tile-local disabled: ${attributes.count.toLocaleString()} splats exceeds provisional budget ${TILE_LOCAL_PROVISIONAL_MAX_SPLATS.toLocaleString()}`;
  }
  return null;
}

function isTileLocalBudgetError(err: unknown): boolean {
  return err instanceof Error && /projected tile refs exceed budget/.test(err.message);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function labelRendererMode(
  mode: RendererMode,
  tileLocalState: TileLocalSceneState | null,
  tileLocalDisabledReason: string | null = null,
  tileLocalLastSkipReason: string | null = null
): string {
  if (mode === "tile-local-visible" && tileLocalState) {
    const staleSuffix = tileLocalLastSkipReason ? "-stale-cache" : "";
    if (tileLocalState.debugMode !== "final-color") {
      return `tile-local-visible-debug-${tileLocalState.debugMode}${staleSuffix}`;
    }
    return `tile-local-visible-gaussian-compositor${staleSuffix}`;
  }
  if (mode === "tile-local-visible" && tileLocalDisabledReason) {
    return "tile-local-visible-budget-disabled-plate";
  }
  if (mode === "tile-local" && tileLocalState) {
    return tileLocalLastSkipReason ? "plate+tile-local-prepass-stale-cache" : "plate+tile-local-prepass";
  }
  if (mode === "tile-local" && tileLocalDisabledReason) {
    return "plate+tile-local-prepass-budget-disabled";
  }
  return mode;
}

function refreshTileLocalDiagnostics(state: TileLocalSceneState): TileLocalDiagnosticSummary {
  state.diagnostics = summarizeTileLocalDiagnostics({
    debugMode: state.debugMode,
    plan: state.plan,
    tileEntryCount: state.tileEntryCount,
    tileHeaders: state.tileHeaderData,
    tileRefCustody: state.tileRefCustody,
    retentionAudit: state.retentionAudit,
    tileCoverageWeights: state.tileCoverageWeightData,
    alphaParamData: state.alphaParamData,
  });
  return state.diagnostics;
}

function exposeTileLocalRuntimeEvidence(
  requestedRenderer: RendererMode,
  effectiveRenderer: string,
  rendererLabel: string,
  fps: number,
  tileLocalState: TileLocalSceneState | null,
  tileLocalDisabledReason: string | null,
  tileLocalLastSkipReason: string | null,
  tileLocalLastSkipSignature: string | null,
  nowMs: number,
  viewportWidth: number,
  viewportHeight: number,
  tileLocalBudget: ReturnType<typeof tileLocalBudgetEvidence>
): void {
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SMOKE__?: Record<string, unknown>;
    __MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__?: TileLocalDiagnosticSummary;
  };
  const diagnostics = tileLocalState ? refreshTileLocalDiagnostics(tileLocalState) : undefined;
  const freshness = tileLocalState
    ? tileLocalPresentationFreshness(tileLocalState, tileLocalLastSkipReason, tileLocalLastSkipSignature, nowMs)
    : undefined;
  const tileLocalStatus = tileLocalRuntimeStatus({
    tileLocalState,
    tileLocalDisabledReason,
    tileLocalLastSkipReason,
    freshness,
  });
  const tileLocalEvidence: Record<string, unknown> = {
    status: tileLocalStatus,
    requestedRenderer,
    effectiveRenderer,
    rendererLabel,
    tileSizePx: tileLocalBudget.tileSizePx,
    tileColumns: tileLocalBudget.currentTileColumns,
    tileRows: tileLocalBudget.currentTileRows,
    maxRefsPerTile: tileLocalBudget.maxRefsPerTile,
    maxProjectedRefs: tileLocalBudget.maxProjectedRefs,
    projectedRefs: tileLocalBudget.projectedRefs,
    retainedRefs: tileLocalBudget.retainedRefs,
    droppedRefs: tileLocalBudget.droppedRefs,
    skippedProjectedRefs: tileLocalBudget.skippedProjectedRefs,
    skipReason: tileLocalBudget.skipReason,
    overflowReasons: tileLocalBudget.overflowReasons,
  };
  if (tileLocalState && diagnostics) {
    tileLocalEvidence.refs = diagnostics.tileRefs.total;
    tileLocalEvidence.allocatedRefs = tileLocalState.tileEntryCount;
    tileLocalEvidence.orderingBackend = TILE_LOCAL_ORDERING_BACKEND;
    tileLocalEvidence.debugMode = tileLocalState.debugMode;
    tileLocalEvidence.freshness = freshness;
    tileLocalEvidence.budget = {
      ...tileLocalBudget,
      status: tileLocalStatus,
    };
    tileLocalEvidence.budgetDiagnostics = tileLocalState.budgetDiagnostics;
    tileLocalEvidence.diagnostics = diagnostics;
  } else {
    tileLocalEvidence.budget = {
      ...tileLocalBudget,
      status: tileLocalStatus,
    };
  }
  runtimeWindow.__MESH_SPLAT_SMOKE__ = {
    ...(runtimeWindow.__MESH_SPLAT_SMOKE__ ?? {}),
    requestedRenderer,
    effectiveRenderer,
    rendererLabel,
    fps,
    tileLocalStatus,
    tileLocalDisabledReason,
    tileLocalLastSkipReason,
    tileLocal: tileLocalEvidence,
  };
  if (diagnostics) {
    runtimeWindow.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__ = diagnostics;
  } else {
    delete runtimeWindow.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__;
  }
}

function tileLocalRuntimeStatus({
  tileLocalState,
  tileLocalDisabledReason,
  tileLocalLastSkipReason,
  freshness,
}: {
  tileLocalState: TileLocalSceneState | null;
  tileLocalDisabledReason: string | null;
  tileLocalLastSkipReason: string | null;
  freshness?: { status?: string };
}): string {
  if (tileLocalDisabledReason) return "budget-disabled";
  if (tileLocalLastSkipReason) return "stale-cache";
  if (tileLocalState) return freshness?.status === "current" ? "current" : "current";
  return "not-applicable";
}

function tileLocalPresentationFreshness(
  state: TileLocalSceneState,
  tileLocalLastSkipReason: string | null,
  tileLocalLastSkipSignature: string | null,
  nowMs: number
) {
  const currentFrameSignature = shortTileLocalSignature(tileLocalLastSkipSignature ?? state.lastCompositedSignature);
  const cachedFrameSignature = shortTileLocalSignature(state.lastCompositedSignature);
  if (tileLocalLastSkipReason) {
    return {
      status: "stale-cache",
      cachedFrameAgeMs: Math.max(0, Math.round(nowMs - state.lastCompositedAtMs)),
      cachedFrame: state.lastCompositedFrame,
      currentFrameSignature,
      cachedFrameSignature,
    };
  }
  return {
    status: "current",
    cachedFrameAgeMs: 0,
    cachedFrame: state.lastCompositedFrame,
    currentFrameSignature: cachedFrameSignature,
    cachedFrameSignature,
  };
}

function tileLocalBudgetEvidence(
  tileLocalState: TileLocalSceneState | null,
  tileLocalDisabledReason: string | null,
  tileLocalLastSkipReason: string | null,
  viewportWidth: number,
  viewportHeight: number
) {
  const parsed = parseTileLocalBudgetSkipReason(tileLocalLastSkipReason ?? tileLocalDisabledReason);
  const diagnostics = tileLocalState?.budgetDiagnostics ?? null;
  const arenaRefs = diagnostics?.arenaRefs ?? null;
  const projectedBudgetReason = diagnostics?.overflowReasons?.find((reason) => reason.reason === "projected-ref-budget");
  return {
    status: tileLocalDisabledReason
      ? "budget-disabled"
      : tileLocalLastSkipReason
        ? "stale-cache"
        : tileLocalState
          ? "current"
          : "not-applicable",
    tileSizePx: tileLocalState?.plan.tileSizePx ?? TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX,
    currentViewportWidth: viewportWidth,
    currentViewportHeight: viewportHeight,
    currentTileColumns: tileColumnsForViewport(viewportWidth),
    currentTileRows: tileRowsForViewport(viewportHeight),
    maxRefsPerTile: arenaRefs?.maxRetainedRefsPerTile ?? null,
    maxProjectedRefs: projectedBudgetReason?.maxProjectedRefs ?? parsed?.maxProjectedRefs ?? null,
    projectedRefs: arenaRefs?.projected ?? null,
    retainedRefs: arenaRefs?.retained ?? null,
    droppedRefs: arenaRefs?.dropped ?? null,
    skippedProjectedRefs: parsed?.skippedProjectedRefs ?? null,
    skipReason: tileLocalLastSkipReason ?? tileLocalDisabledReason ?? null,
    overflowReasons: diagnostics?.overflowReasons?.map((reason) => reason.reason) ?? (parsed ? ["projected-ref-budget"] : []),
  };
}

function formatTileLocalBudgetLabel(budget: ReturnType<typeof tileLocalBudgetEvidence>): string {
  if (budget.projectedRefs !== null && budget.retainedRefs !== null && budget.droppedRefs !== null) {
    const capParts = [];
    if (budget.maxProjectedRefs !== null) {
      capParts.push(`cap ${budget.maxProjectedRefs.toLocaleString()}`);
    }
    if (budget.maxRefsPerTile !== null) {
      capParts.push(`per-tile cap ${budget.maxRefsPerTile.toLocaleString()}`);
    }
    const suffix = capParts.length > 0 ? ` | ${capParts.join(" | ")}` : "";
    return `projected ${budget.projectedRefs.toLocaleString()} retained ${budget.retainedRefs.toLocaleString()} dropped ${budget.droppedRefs.toLocaleString()}${suffix}${budget.skipReason ? ` | skip ${budget.skipReason}` : ""}`;
  }
  if (budget.skippedProjectedRefs !== null && budget.maxProjectedRefs !== null) {
    return `skipped ${budget.skippedProjectedRefs.toLocaleString()} projected refs | cap ${budget.maxProjectedRefs.toLocaleString()}${budget.skipReason ? ` | skip ${budget.skipReason}` : ""}`;
  }
  if (budget.skipReason) {
    return budget.skipReason;
  }
  return "";
}

function parseTileLocalBudgetSkipReason(reason: string | null): { skippedProjectedRefs: number; maxProjectedRefs: number } | null {
  const match = /projected tile refs exceed budget:\s*([\d,]+)\s*>\s*([\d,]+)/i.exec(reason ?? "");
  if (!match) {
    return null;
  }
  return {
    skippedProjectedRefs: Number(match[1].replaceAll(",", "")),
    maxProjectedRefs: Number(match[2].replaceAll(",", "")),
  };
}

function tileColumnsForViewport(viewportWidth: number): number {
  return Math.ceil(Math.max(viewportWidth, 1) / TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX);
}

function tileRowsForViewport(viewportHeight: number): number {
  return Math.ceil(Math.max(viewportHeight, 1) / TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX);
}

function shortTileLocalSignature(signature: string): string {
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index++) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `tile-local@${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function bindDroppedSplatLoading(
  canvas: HTMLCanvasElement,
  loadFile: (file: File) => Promise<void>
): void {
  window.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes("Files")) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files.length) {
      return;
    }
    event.preventDefault();
    void loadFile(event.dataTransfer.files[0]);
  });
  canvas.addEventListener("dragenter", () => {
    canvas.dataset.dropTarget = "true";
  });
  canvas.addEventListener("dragleave", () => {
    delete canvas.dataset.dropTarget;
  });
  canvas.addEventListener("drop", () => {
    delete canvas.dataset.dropTarget;
  });
}

function destroySplatScene(scene: ActiveSplatScene | null): void {
  if (!scene) {
    return;
  }
  if (scene.tileLocalState) {
    destroyTileLocalSceneState(scene.tileLocalState);
  }
  scene.buffers.positionBuffer.destroy();
  scene.buffers.colorBuffer.destroy();
  scene.buffers.opacityBuffer.destroy();
  scene.buffers.scaleBuffer.destroy();
  scene.buffers.rotationBuffer.destroy();
  scene.buffers.originalIdBuffer.destroy();
  scene.gpuSort.keyBuffer.destroy();
  scene.sortedIndexBuffer.destroy();
}

main().catch((err) => {
  document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:16px">${err.message}\n\n${err.stack}</pre>`;
});
