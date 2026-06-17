import { initGPU, resizeCanvas, GPU } from "./gpu.js";
import {
  bindCameraControls,
  cameraHasActiveInput,
  createCamera,
  getProjectionMatrix,
  getViewMatrix,
  panCamera,
  rotateCameraView,
  updateCamera,
  positionCameraFromTarget,
} from "./camera.js";
import { handleDoubleClickPivot } from "./clickToPivot.js";
import { loadDroppedSplatFile } from "./localPly.js";
import {
  createRenderDemandState,
  markRenderFrameFinished,
  requestRenderFrame,
  shouldContinueRendering,
} from "./renderDemand.js";
import { createTimestamps, resolveTimestamps, readTimestamps, TimestampHelper } from "./timestamps.js";
import {
  REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  applyRealScaniverseWitnessView,
  composeFirstSmokeViewProjection,
  configureCameraForSplatBounds,
  createMeshSplatSmokeEvidence,
  createMeshSplatRendererWitness,
  exposeMeshSplatSmokeEvidence,
  exposeMeshSplatRendererWitness,
  REAL_SCANIVERSE_SPLAT_SCALE,
  REAL_SCANIVERSE_MIN_RADIUS_PX,
  REAL_SCANIVERSE_NEAR_FADE_END_NDC,
  REAL_SCANIVERSE_NEAR_FADE_START_NDC,
  type AlphaDensityAccountingMode,
  type RealScaniverseWitnessViewMode,
} from "./realSmokeScene.js";
import {
  fetchFirstSmokeSplatPayload,
  type SplatAttributes,
} from "./splats.js";
import {
  createSplatRenderer,
  startFrameTiming,
  timeFrameStage,
  finishFrameTiming,
  formatFrameTimingOverlay,
  exposeOperatorWitnessFrameTimings,
  exposeOperatorWitnessFrameState,
  type SplatScene,
  type SplatRenderer,
} from "./splatRenderer.js";
import { shouldRefreshAlphaDensity } from "./alphaDensityRefresh.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statsEl = document.getElementById("stats")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const SORT_BACKEND = "gpu-bitonic-cpu-depth-keys";
const ALPHA_DENSITY_SETTLE_MS = 200;

// Light control state -- L key cycles modes, arrow keys adjust angle in fixed mode
type LightMode = "camera" | "fixed" | "overhead" | "rim";
const LIGHT_MODES: LightMode[] = ["camera", "fixed", "overhead", "rim"];
let lightModeIndex = 0;
let fixedLightAzimuth = 0.8;  // radians
let fixedLightElevation = 0.6; // radians
let lightIntensity = 3.0;
let ambientIntensity = 0.12;

// ---------------------------------------------------------------------------
// URL param helpers
// ---------------------------------------------------------------------------

function selectedSplatAssetPath(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("splat") ?? REAL_SCANIVERSE_SMOKE_ASSET_PATH;
}

function selectedAlphaDensityMode(): AlphaDensityAccountingMode {
  const params = new URLSearchParams(window.location.search);
  return params.get("alpha-density") === "center-tile" ? "center-tile" : "coverage-aware";
}

function selectedRealScaniverseWitnessViewMode(): RealScaniverseWitnessViewMode {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("witness-view");
  if (raw === "dessert-close" || raw === "dessert-porous-close") {
    return raw;
  }
  return "default";
}

function normalizeOperatorWitnessViewMode(mode: string): RealScaniverseWitnessViewMode {
  if (mode === "dessert-close" || mode === "dessert-porous-close") {
    return mode;
  }
  return "default";
}

// ---------------------------------------------------------------------------
// Light direction computation
// ---------------------------------------------------------------------------

function computeLightDirection(cameraPos: Float32Array): [number, number, number] {
  const mode = LIGHT_MODES[lightModeIndex];
  let lx: number, ly: number, lz: number;
  if (mode === "camera") {
    lx = -cameraPos[0]; ly = -cameraPos[1]; lz = -cameraPos[2];
    const len = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
    lx /= len; ly /= len; lz /= len;
  } else if (mode === "overhead") {
    lx = 0; ly = -1; lz = 0;
  } else if (mode === "rim") {
    lx = cameraPos[0]; ly = -0.5; lz = cameraPos[2];
    const len = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
    lx /= len; ly /= len; lz /= len;
  } else {
    // Fixed: spherical coordinates
    const ce = Math.cos(fixedLightElevation);
    lx = Math.cos(fixedLightAzimuth) * ce;
    ly = -Math.sin(fixedLightElevation);
    lz = Math.sin(fixedLightAzimuth) * ce;
  }
  return [lx, ly, lz];
}

// ---------------------------------------------------------------------------
// Drag-drop PLY loading
// ---------------------------------------------------------------------------

function bindDroppedSplatLoading(
  canvas: HTMLCanvasElement,
  loadFile: (file: File) => Promise<void>,
): void {
  window.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    void loadFile(event.dataTransfer.files[0]);
  });
  canvas.addEventListener("dragenter", () => { canvas.dataset.dropTarget = "true"; });
  canvas.addEventListener("dragleave", () => { delete canvas.dataset.dropTarget; });
  canvas.addEventListener("drop", () => { delete canvas.dataset.dropTarget; });
}

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

const ALPHA_DENSITY_MODE = selectedAlphaDensityMode();
const REAL_SCANIVERSE_WITNESS_VIEW = selectedRealScaniverseWitnessViewMode();

async function main() {
  const gpu = await initGPU(canvas);
  const cam = createCamera();

  const renderer = createSplatRenderer({
    device: gpu.device,
    format: gpu.format,
    f16Supported: gpu.f16Supported,
    timestampsSupported: gpu.timestampsSupported,
  });

  // Expose camera control for harvest view capture
  (window as unknown as Record<string, unknown>).__MESH_SPLAT_SET_CAMERA__ = (params: {
    azimuth?: number; elevation?: number; distance?: number;
  }) => {
    if (params.azimuth !== undefined) cam.azimuth = params.azimuth;
    if (params.elevation !== undefined) cam.elevation = params.elevation;
    if (params.distance !== undefined) cam.distance = params.distance;
    positionCameraFromTarget(cam);
    requestFrame();
  };

  const renderDemand = createRenderDemandState();
  const requestFrame = () => {
    if (requestRenderFrame(renderDemand)) {
      requestAnimationFrame(frame);
    }
  };
  bindCameraControls(cam, canvas, {
    requestRender: requestFrame,
    onDoubleClick(clickX, clickY, viewportWidth, viewportHeight) {
      if (!activeScene) return;
      handleDoubleClickPivot(cam, activeScene.attributes, clickX, clickY, viewportWidth, viewportHeight);
    },
  });
  window.addEventListener("resize", requestFrame);

  const ts = createTimestamps(gpu.device, gpu.timestampsSupported);

  // ---- G-buffer view mode: cycle with 'G' key ----
  type GBufferViewMode = "color" | "depth" | "normal" | "roughness" | "lit";
  let gbufferViewMode: GBufferViewMode = "color";
  window.addEventListener("keydown", (e) => {
    if (e.key === "g" || e.key === "G") {
      const modes: GBufferViewMode[] = ["color", "depth", "normal", "roughness", "lit"];
      const idx = modes.indexOf(gbufferViewMode);
      gbufferViewMode = modes[(idx + 1) % modes.length];
      console.log(`G-buffer view: ${gbufferViewMode}`);
    }
    if (e.key === "l" || e.key === "L") {
      lightModeIndex = (lightModeIndex + 1) % LIGHT_MODES.length;
      console.log(`Light mode: ${LIGHT_MODES[lightModeIndex]}`);
      requestFrame();
    }
    // Arrow keys adjust fixed light angle, +/- adjust intensity
    if (e.key === "ArrowLeft") { fixedLightAzimuth -= 0.15; requestFrame(); }
    if (e.key === "ArrowRight") { fixedLightAzimuth += 0.15; requestFrame(); }
    if (e.key === "ArrowUp") { fixedLightElevation = Math.min(fixedLightElevation + 0.1, Math.PI / 2 - 0.05); requestFrame(); }
    if (e.key === "ArrowDown") { fixedLightElevation = Math.max(fixedLightElevation - 0.1, -Math.PI / 2 + 0.05); requestFrame(); }
    if (e.key === "+" || e.key === "=") { lightIntensity = Math.min(lightIntensity + 0.5, 10.0); requestFrame(); }
    if (e.key === "-" || e.key === "_") { lightIntensity = Math.max(lightIntensity - 0.5, 0.5); requestFrame(); }
    if (e.key === "[") { ambientIntensity = Math.max(ambientIntensity - 0.03, 0.0); requestFrame(); }
    if (e.key === "]") { ambientIntensity = Math.min(ambientIntensity + 0.03, 0.5); requestFrame(); }
  });

  // ---- Scene state ----
  let depthTexture: GPUTexture | null = null;
  let lastTime = performance.now();
  let frameCount = 0;
  let frameSerial = 0;
  let fpsAccum = 0;
  let displayFps = 0;
  let gpuTimings: Map<string, number> = new Map();
  let operatorWitnessViewMode: RealScaniverseWitnessViewMode = REAL_SCANIVERSE_WITNESS_VIEW;
  let operatorWitnessRevision = 0;

  statsEl.textContent = "Loading real Scaniverse splats...";
  const assetPath = selectedSplatAssetPath();
  let activeScene: SplatScene | null = null;

  // ---- Operator witness view switching ----
  const runtimeWindow = window as unknown as {
    __MESH_SPLAT_SET_WITNESS_VIEW__?: (mode: string) => {
      applied: boolean;
      witnessView?: RealScaniverseWitnessViewMode;
      revision?: number;
      reason?: string;
    };
    __MESH_SPLAT_APPLY_WITNESS_INTERACTION__?: (interaction: {
      type?: string;
      button?: string;
      dx?: number;
      dy?: number;
    }) => {
      applied: boolean;
      witnessView?: RealScaniverseWitnessViewMode;
      revision?: number;
      reason?: string;
    };
  };
  runtimeWindow.__MESH_SPLAT_SET_WITNESS_VIEW__ = (mode: string) => {
    if (!activeScene) {
      return { applied: false, reason: "scene is not loaded" };
    }
    const nextMode = normalizeOperatorWitnessViewMode(mode);
    configureCameraForSplatBounds(cam, activeScene.attributes.bounds);
    applyRealScaniverseWitnessView(cam, activeScene.attributes.bounds, nextMode);
    updateCamera(cam, 0);
    activeScene._internal.sortState.needsSort = true;
    operatorWitnessViewMode = nextMode;
    operatorWitnessRevision++;
    requestFrame();
    return { applied: true, witnessView: operatorWitnessViewMode, revision: operatorWitnessRevision };
  };
  runtimeWindow.__MESH_SPLAT_APPLY_WITNESS_INTERACTION__ = (interaction) => {
    if (!activeScene) {
      return { applied: false, reason: "scene is not loaded" };
    }
    if (!interaction || interaction.type !== "drag") {
      return { applied: false, reason: `unsupported operator witness interaction: ${interaction?.type ?? "unknown"}` };
    }
    const dx = Number(interaction.dx ?? 0);
    const dy = Number(interaction.dy ?? 0);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      return { applied: false, reason: "operator witness drag delta must be finite" };
    }
    const button = interaction.button === "middle" || interaction.button === "right" ? interaction.button : "left";
    if (button === "middle" || button === "right") {
      panCamera(cam, dx, dy, canvas.clientWidth || canvas.width || 1, canvas.clientHeight || canvas.height || 1);
    } else {
      rotateCameraView(cam, dx, dy);
    }
    updateCamera(cam, 0);
    activeScene._internal.sortState.needsSort = true;
    operatorWitnessRevision++;
    requestFrame();
    return { applied: true, witnessView: operatorWitnessViewMode, revision: operatorWitnessRevision };
  };

  // ---- Scene loading ----

  async function updateSceneLoadStage(label: string): Promise<void> {
    statsEl.textContent = label;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  async function replaceSplatScene(attributes: SplatAttributes, sceneAssetPath: string): Promise<void> {
    const previousScene = activeScene;
    await updateSceneLoadStage(`Preparing ${attributes.count.toLocaleString()} splats...`);
    configureCameraForSplatBounds(cam, attributes.bounds);
    applyRealScaniverseWitnessView(cam, attributes.bounds, REAL_SCANIVERSE_WITNESS_VIEW);
    updateCamera(cam, 0);
    const initialView = getViewMatrix(cam);
    const initialViewportWidth = Math.max(canvas.clientWidth || canvas.width || 1, 1);
    const initialViewportHeight = Math.max(canvas.clientHeight || canvas.height || 1, 1);
    const initialAspect = initialViewportWidth / initialViewportHeight;
    const initialViewProj = composeFirstSmokeViewProjection(
      getProjectionMatrix(cam, initialAspect),
      initialView,
    );

    await updateSceneLoadStage(`Creating GPU buffers for ${attributes.count.toLocaleString()} splats...`);

    await updateSceneLoadStage(`Computing alpha density for ${attributes.count.toLocaleString()} splats...`);

    activeScene = renderer.loadScene(
      attributes,
      ALPHA_DENSITY_MODE,
      initialView,
      initialViewProj,
      initialViewportWidth,
      initialViewportHeight,
    );

    exposeMeshSplatSmokeEvidence(
      createMeshSplatSmokeEvidence(attributes, attributes.count, sceneAssetPath, SORT_BACKEND),
      canvas,
    );
    exposeMeshSplatRendererWitness(
      createMeshSplatRendererWitness(attributes, attributes.count, sceneAssetPath, SORT_BACKEND, {
        viewProj: initialViewProj,
        viewportWidth: initialViewportWidth,
        viewportHeight: initialViewportHeight,
        splatScale: REAL_SCANIVERSE_SPLAT_SCALE,
        minRadiusPx: REAL_SCANIVERSE_MIN_RADIUS_PX,
      }),
      canvas,
    );
    if (previousScene) {
      renderer.destroyScene(previousScene);
    }
    requestFrame();
  }

  // ---- Initial load ----
  await replaceSplatScene(await fetchFirstSmokeSplatPayload(assetPath), assetPath);

  bindDroppedSplatLoading(canvas, async (file) => {
    statsEl.textContent = `Loading ${file.name}...`;
    try {
      await replaceSplatScene(await loadDroppedSplatFile(file), `local-file:${file.name}`);
    } catch (err) {
      statsEl.textContent = err instanceof Error ? err.message : String(err);
      requestFrame();
    }
  });

  // ---- Render loop ----
  async function frame() {
    markRenderFrameFinished(renderDemand);
    const now = performance.now();
    const frameTiming = startFrameTiming(now);
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    const scene = activeScene;
    if (!scene) return;

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

    // Resize compute compositor textures if viewport changed
    activeScene = renderer.resizeViewport(scene, width, height);
    const resizedScene = activeScene;

    // Upload uniforms
    const view = getViewMatrix(cam);
    const proj = getProjectionMatrix(cam, aspect);
    const viewProj = composeFirstSmokeViewProjection(proj, view);

    // Alpha-density refresh (settled view)
    const alphaDensityRefreshed = shouldRefreshAlphaDensity(
      renderer.alphaDensityState(resizedScene).refreshState,
      view, width, height, now, ALPHA_DENSITY_SETTLE_MS,
    );
    if (alphaDensityRefreshed) {
      timeFrameStage(frameTiming, "alpha-density-refresh", () => {
        renderer.refreshAlphaDensity(resizedScene, viewProj, width, height, ALPHA_DENSITY_MODE);
      });
    }

    const encoder = gpu.device.createCommandEncoder();

    // GPU sort
    const gpuSortRefreshed = renderer.shouldRefreshSort(resizedScene, view, now);
    if (gpuSortRefreshed) {
      timeFrameStage(frameTiming, "gpu-sort-refresh", () => {
        renderer.encodeSort(resizedScene, encoder, view);
      });
    }
    const pendingGpuSort = renderer.sortRefreshPending(resizedScene, view);

    // Render splats (compositor + screen-space normals + deferred lighting)
    const cameraPosition = new Float32Array(cam.position);
    renderer.renderFrame(resizedScene, {
      viewProj,
      viewMatrix: view,
      cameraPosition,
      viewportWidth: width,
      viewportHeight: height,
      lightDirection: computeLightDirection(cameraPosition),
      lightIntensity,
      ambientIntensity,
    }, encoder);

    // ---- Present to screen ----
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
        ? { timestampWrites: { querySet: ts.querySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } }
        : {}),
    });
    if (writeTimestamps) {
      ts.labels.push("render", "render_end");
    }

    // G-buffer debug views or final lit/color output
    if (gbufferViewMode === "depth") {
      renderer.gbufferDebugPresenter.drawDepth(renderPass, resizedScene.gbufferDepthView);
    } else if (gbufferViewMode === "normal") {
      renderer.gbufferDebugPresenter.drawNormal(renderPass, resizedScene.gbufferDepthView, resizedScene.gbufferNormalView, resizedScene.gbufferMaterialView);
    } else if (gbufferViewMode === "roughness") {
      renderer.gbufferDebugPresenter.drawRoughness(renderPass, resizedScene.gbufferDepthView, resizedScene.gbufferNormalView, resizedScene.gbufferMaterialView);
    } else if (gbufferViewMode === "lit") {
      renderer.presentTexture(renderPass, resizedScene.litView);
    } else {
      renderer.presentTexture(renderPass, resizedScene.outputView);
    }
    renderPass.end();

    if (writeTimestamps) {
      resolveTimestamps(encoder, ts);
    }

    timeFrameStage(frameTiming, "queue-submit", () => {
      gpu.device.queue.submit([encoder.finish()]);
    });

    // Read GPU timings (async, one frame behind)
    if (writeTimestamps) {
      readTimestamps(ts).then((t) => { gpuTimings = t; });
    }

    // Expose frame state to operator witness
    exposeOperatorWitnessFrameState({
      frameSerial,
      witnessView: operatorWitnessViewMode,
      revision: operatorWitnessRevision,
    });

    // ---- Stats overlay ----
    const alphaSummary = renderer.alphaDensityState(resizedScene).summary;
    const lightLabel = LIGHT_MODES[lightModeIndex] + (LIGHT_MODES[lightModeIndex] === "fixed" ? ` az:${fixedLightAzimuth.toFixed(1)} el:${fixedLightElevation.toFixed(1)}` : "");
    let statsText = `${width}x${height} | ${displayFps} fps | ${resizedScene.count.toLocaleString()} splats | light: ${lightLabel} (${lightIntensity.toFixed(1)}) amb:${ambientIntensity.toFixed(2)} | view: ${gbufferViewMode}`;
    const frameTimingOverlay = formatFrameTimingOverlay(frameTiming);
    statsText += ` | ${frameTimingOverlay}`;
    if (gpuTimings.size > 0) {
      for (const [label, ms] of gpuTimings) {
        statsText += ` | ${label}: ${ms.toFixed(2)}ms`;
      }
    }
    statsEl.textContent = statsText;
    exposeOperatorWitnessFrameTimings(finishFrameTiming(frameTiming));

    if (shouldContinueRendering({
      activeInput,
      pendingGpuSort,
      pendingAlphaDensity: renderer.alphaDensityState(resizedScene).refreshState.needsRefresh,
    })) {
      requestFrame();
    }
  }

  requestFrame();
}

main().catch((err) => {
  document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:16px">${err.message}\n\n${err.stack}</pre>`;
});
