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
import { loadDroppedSplatFile, decodeLocalPlySplatPayload } from "./localPly.js";
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
  type SplatScene,
  type SplatRenderer,
} from "./splatRenderer.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statsEl = document.getElementById("stats")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const SORT_BACKEND = "gpu-bitonic-cpu-depth-keys";

// Light control state -- L key cycles modes, arrow keys adjust angle in fixed mode
type LightMode = "camera" | "fixed" | "overhead" | "rim";
const LIGHT_MODES: LightMode[] = ["camera", "fixed", "overhead", "rim"];
let lightModeIndex = 0;
let fixedLightAzimuth = 0.8;  // radians
let fixedLightElevation = 0.6; // radians
let lightIntensity = 3.0;
let ambientIntensity = 0.12;
let specularOnly = false;

// ---------------------------------------------------------------------------
// URL param helpers
// ---------------------------------------------------------------------------

function selectedSplatAssetPath(): string {
  const params = new URLSearchParams(window.location.search);
  const splat = params.get("splat");
  if (splat === null) return REAL_SCANIVERSE_SMOKE_ASSET_PATH;
  // Restrict to same-origin paths — reject absolute URLs to prevent SSRF
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(splat)) {
    console.warn("?splat= must be a relative path, not an absolute URL");
    return REAL_SCANIVERSE_SMOKE_ASSET_PATH;
  }
  return splat;
}

function selectedRealScaniverseWitnessViewMode(): RealScaniverseWitnessViewMode {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("witness-view");
  if (raw === "dessert-close" || raw === "dessert-porous-close") {
    return raw;
  }
  return "default";
}

function selectedSplatScale(): number | undefined {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("splatScale");
  if (raw === null) return undefined;
  const val = Number(raw);
  return Number.isFinite(val) && val > 0 ? val : undefined;
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

function computeLightDirection(cameraPos: Float32Array, cameraTarget: readonly number[]): [number, number, number] {
  const mode = LIGHT_MODES[lightModeIndex];
  let lx: number, ly: number, lz: number;
  if (mode === "camera") {
    // Light points from camera toward the orbit target, not toward the origin
    lx = cameraTarget[0] - cameraPos[0];
    ly = cameraTarget[1] - cameraPos[1];
    lz = cameraTarget[2] - cameraPos[2];
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
    target?: [number, number, number];
  }) => {
    if (params.target !== undefined) {
      cam.target = [...params.target];
      cam.panOffset = [0, 0, 0];
    }
    if (params.azimuth !== undefined) cam.azimuth = params.azimuth;
    if (params.elevation !== undefined) cam.elevation = params.elevation;
    if (params.distance !== undefined) cam.distance = params.distance;
    positionCameraFromTarget(cam);
    requestFrame();
  };

  // Light control API for headless emissive extraction pipeline
  (window as unknown as Record<string, unknown>).__MESH_SPLAT_SET_LIGHT__ = (params: {
    mode?: string; azimuth?: number; elevation?: number; intensity?: number; ambient?: number; specularOnly?: boolean;
  }) => {
    if (params.mode !== undefined) {
      const idx = LIGHT_MODES.indexOf(params.mode as LightMode);
      if (idx >= 0) lightModeIndex = idx;
    }
    if (params.azimuth !== undefined) fixedLightAzimuth = params.azimuth;
    if (params.elevation !== undefined) fixedLightElevation = params.elevation;
    if (params.intensity !== undefined) lightIntensity = params.intensity;
    if (params.ambient !== undefined) ambientIntensity = params.ambient;
    if (params.specularOnly !== undefined) specularOnly = params.specularOnly;
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
  type GBufferViewMode = "color" | "normal" | "roughness" | "metalness" | "lit";
  const debugParam = new URLSearchParams(window.location.search).get("debug");
  let gbufferViewMode: GBufferViewMode = (debugParam as GBufferViewMode) || "color";
  window.addEventListener("keydown", (e) => {
    if (e.key === "g" || e.key === "G") {
      const modes: GBufferViewMode[] = ["color", "normal", "roughness", "metalness", "lit"];
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
  const urlSplatScale = selectedSplatScale();
  async function fetchSplatAttributes(path: string): Promise<SplatAttributes> {
    if (path.toLowerCase().endsWith(".ply")) {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to fetch PLY: ${response.status} ${response.statusText}`);
      const attrs = decodeLocalPlySplatPayload(path, await response.arrayBuffer());
      // URL param overrides auto-detected scale
      if (urlSplatScale !== undefined) attrs.splatScale = urlSplatScale;
      return attrs;
    }
    return fetchFirstSmokeSplatPayload(path);
  }
  await replaceSplatScene(await fetchSplatAttributes(assetPath), assetPath);

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

    // Upload uniforms
    const view = getViewMatrix(cam);
    const proj = getProjectionMatrix(cam, aspect);
    const viewProj = composeFirstSmokeViewProjection(proj, view);

    // Expose camera state for headless baking pipeline
    (window as unknown as Record<string, unknown>).__MESH_SPLAT_CAMERA_STATE__ = {
      viewMatrix: Array.from(view),
      projectionMatrix: Array.from(proj),
      viewProjMatrix: Array.from(viewProj),
      viewportWidth: width,
      viewportHeight: height,
      cameraPosition: Array.from(cam.position),
      cameraTarget: Array.from(cam.target),
      distance: cam.distance,
      azimuth: cam.azimuth,
      elevation: cam.elevation,
    };

    const encoder = gpu.device.createCommandEncoder();

    // GPU sort
    const gpuSortRefreshed = renderer.shouldRefreshSort(scene, view, now);
    if (gpuSortRefreshed) {
      timeFrameStage(frameTiming, "gpu-sort-refresh", () => {
        renderer.encodeSort(scene, encoder, view);
      });
    }
    const pendingGpuSort = renderer.sortRefreshPending(scene, view);

    // Render splats (compositor + screen-space normals + deferred lighting)
    const cameraPosition = new Float32Array(cam.position);
    renderer.renderFrame(scene, {
      viewProj,
      viewMatrix: view,
      projMatrix: proj,
      cameraPosition,
      viewportWidth: width,
      viewportHeight: height,
      lightDirection: computeLightDirection(cameraPosition, cam.target),
      lightIntensity,
      ambientIntensity,
      specularOnly,
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
    if (gbufferViewMode === "normal") {
      renderer.gbufferDebugPresenter.drawNormal(renderPass, scene.gbufferDepthView, scene.gbufferNormalView, scene.gbufferMaterialView);
    } else if (gbufferViewMode === "roughness") {
      renderer.gbufferDebugPresenter.drawRoughness(renderPass, scene.gbufferDepthView, scene.gbufferNormalView, scene.gbufferMaterialView);
    } else if (gbufferViewMode === "metalness") {
      renderer.gbufferDebugPresenter.drawMetalness(renderPass, scene.gbufferDepthView, scene.gbufferNormalView, scene.gbufferMaterialView);
    } else if (gbufferViewMode === "lit") {
      renderer.presentTexture(renderPass, scene.litView);
    } else {
      renderer.presentTexture(renderPass, scene.outputView);
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

    // ---- Stats overlay ----
    const alphaSummary = renderer.alphaDensityState(scene).summary;
    const lightLabel = LIGHT_MODES[lightModeIndex] + (LIGHT_MODES[lightModeIndex] === "fixed" ? ` az:${fixedLightAzimuth.toFixed(1)} el:${fixedLightElevation.toFixed(1)}` : "");
    let statsText = `${width}x${height} | ${displayFps} fps | ${scene.count.toLocaleString()} splats | light: ${lightLabel} (${lightIntensity.toFixed(1)}) amb:${ambientIntensity.toFixed(2)} | view: ${gbufferViewMode}`;
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
      pendingAlphaDensity: renderer.alphaDensityState(scene).refreshState.needsRefresh,
    })) {
      requestFrame();
    }
  }

  requestFrame();
}

main().catch((err) => {
  document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:16px">${err.message}\n\n${err.stack}</pre>`;
});
