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
import { loadDroppedSplatFile, decodeLocalPlySplatPayload, tryFetchSidecar, applySidecarCorrections } from "./localPly.js";
import { parseHDRHeader } from "./ibl.js";
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

// Slider elements
const emIntensitySlider = document.getElementById("emIntensity") as HTMLInputElement | null;
const emIntensityValEl = document.getElementById("emIntensityVal");
const emThresholdSlider = document.getElementById("emThreshold") as HTMLInputElement | null;
const emThresholdValEl = document.getElementById("emThresholdVal");
const lightIntensitySliderEl = document.getElementById("lightIntensitySlider") as HTMLInputElement | null;
const lightIntensityValEl = document.getElementById("lightIntensityVal");
const ambientSliderEl = document.getElementById("ambientSlider") as HTMLInputElement | null;
const ambientValEl = document.getElementById("ambientVal");
const aoRadiusSlider = document.getElementById("aoRadius") as HTMLInputElement | null;
const aoRadiusValEl = document.getElementById("aoRadiusVal");
const aoIntensitySlider = document.getElementById("aoIntensity") as HTMLInputElement | null;
const aoIntensityValEl = document.getElementById("aoIntensityVal");
const aoFalloffSlider = document.getElementById("aoFalloff") as HTMLInputElement | null;
const aoFalloffValEl = document.getElementById("aoFalloffVal");
const aoSlicesSlider = document.getElementById("aoSlices") as HTMLInputElement | null;
const aoSlicesValEl = document.getElementById("aoSlicesVal");
const aoStepsSlider = document.getElementById("aoSteps") as HTMLInputElement | null;
const aoStepsValEl = document.getElementById("aoStepsVal");
const aoThicknessSlider = document.getElementById("aoThickness") as HTMLInputElement | null;
const aoThicknessValEl = document.getElementById("aoThicknessVal");
const envIntensitySlider = document.getElementById("envIntensity") as HTMLInputElement | null;
const envIntensityValEl = document.getElementById("envIntensityVal");
const envRotationSlider = document.getElementById("envRotation") as HTMLInputElement | null;
const envRotationValEl = document.getElementById("envRotationVal");
const bloomThresholdSlider = document.getElementById("bloomThreshold") as HTMLInputElement | null;
const bloomThresholdValEl = document.getElementById("bloomThresholdVal");
const bloomIntensitySlider = document.getElementById("bloomIntensity") as HTMLInputElement | null;
const bloomIntensityValEl = document.getElementById("bloomIntensityVal");
const envSelectEl = document.getElementById("envSelect") as HTMLSelectElement | null;
const roughContrastSlider = document.getElementById("roughContrast") as HTMLInputElement | null;
const roughContrastValEl = document.getElementById("roughContrastVal");
const roughBrightSlider = document.getElementById("roughBright") as HTMLInputElement | null;
const roughBrightValEl = document.getElementById("roughBrightVal");
const metalContrastSlider = document.getElementById("metalContrast") as HTMLInputElement | null;
const metalContrastValEl = document.getElementById("metalContrastVal");
const metalBrightSlider = document.getElementById("metalBright") as HTMLInputElement | null;
const metalBrightValEl = document.getElementById("metalBrightVal");
const albedoContrastSlider = document.getElementById("albedoContrast") as HTMLInputElement | null;
const albedoContrastValEl = document.getElementById("albedoContrastVal");
const albedoBrightSlider = document.getElementById("albedoBright") as HTMLInputElement | null;
const albedoBrightValEl = document.getElementById("albedoBrightVal");

// Light control state -- L key cycles modes, arrow keys adjust angle in fixed mode
type LightMode = "camera" | "fixed" | "overhead" | "rim";
const LIGHT_MODES: LightMode[] = ["camera", "fixed", "overhead", "rim"];

// ---------------------------------------------------------------------------
// Settings persistence (localStorage)
// ---------------------------------------------------------------------------

const SETTINGS_KEY = "meshsplat-renderer-settings";

interface RendererSettings {
  lightModeIndex: number;
  fixedLightAzimuth: number;
  fixedLightElevation: number;
  lightIntensity: number;
  ambientIntensity: number;
  emissiveIntensity: number;
  emissiveThreshold: number;
  aoRadius: number;
  aoIntensity: number;
  aoFalloff: number;
  aoSlices: number;
  aoSteps: number;
  aoThickness: number;
  envIntensity: number;
  envRotation: number;
  bloomThreshold: number;
  bloomSoftKnee: number;
  bloomIntensity: number;
  roughContrast: number;
  roughBright: number;
  metalContrast: number;
  metalBright: number;
  albedoContrast: number;
  albedoBright: number;
  envMap: string;
}

const DEFAULT_SETTINGS: RendererSettings = {
  lightModeIndex: 0,
  fixedLightAzimuth: 0.8,
  fixedLightElevation: 0.6,
  lightIntensity: 3.0,
  ambientIntensity: 0.12,
  emissiveIntensity: 3.0,
  emissiveThreshold: 0.05,
  aoRadius: 0.15,
  aoIntensity: 1.5,
  aoFalloff: 1.0,
  aoSlices: 3,
  aoSteps: 4,
  aoThickness: 1.81,
  envIntensity: 1.0,
  envRotation: 0.0,
  bloomThreshold: 0.8,
  bloomSoftKnee: 0.5,
  bloomIntensity: 0.5,
  roughContrast: 1.0,
  roughBright: 0.0,
  metalContrast: 1.0,
  metalBright: 0.0,
  albedoContrast: 1.0,
  albedoBright: 0.0,
  envMap: "studio_small_09",
};

function loadSettings(): RendererSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore parse errors */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: RendererSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const settings = loadSettings();

let lightModeIndex = settings.lightModeIndex;
let fixedLightAzimuth = settings.fixedLightAzimuth;
let fixedLightElevation = settings.fixedLightElevation;
let lightIntensity = settings.lightIntensity;
let ambientIntensity = settings.ambientIntensity;
let specularOnly = false;
let emissiveIntensity = settings.emissiveIntensity;
let emissiveThreshold = settings.emissiveThreshold;
let aoRadius = settings.aoRadius;
let aoIntensity = settings.aoIntensity;
let aoFalloff = settings.aoFalloff;
let aoSlices = settings.aoSlices;
let aoSteps = settings.aoSteps;
let aoThickness = settings.aoThickness;
let envIntensity = settings.envIntensity;
let envRotation = settings.envRotation;
let bloomThreshold = settings.bloomThreshold;
let bloomSoftKnee = settings.bloomSoftKnee;
let bloomIntensity = settings.bloomIntensity;
let roughContrast = settings.roughContrast;
let roughBright = settings.roughBright;
let metalContrast = settings.metalContrast;
let metalBright = settings.metalBright;
let albedoContrast = settings.albedoContrast;
let albedoBright = settings.albedoBright;

// ---------------------------------------------------------------------------
// URL param helpers
// ---------------------------------------------------------------------------

function selectedSplatAssetPath(): string | null {
  const params = new URLSearchParams(window.location.search);
  const splat = params.get("splat");
  if (splat === null) return null; // No default — require drag-and-drop or ?splat=
  // Restrict to same-origin paths — reject absolute URLs to prevent SSRF
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(splat)) {
    console.warn("?splat= must be a relative path, not an absolute URL");
    return null;
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

function bindDroppedFileLoading(
  canvas: HTMLCanvasElement,
  loadSplatFile: (file: File) => Promise<void>,
  loadHDRFile: (file: File) => Promise<void>,
): void {
  window.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file.name.toLowerCase().endsWith(".hdr")) {
      void loadHDRFile(file);
    } else {
      void loadSplatFile(file);
    }
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
  type GBufferViewMode = "color" | "normal" | "roughness" | "metalness" | "ao" | "lit";
  const debugParam = new URLSearchParams(window.location.search).get("debug");
  let gbufferViewMode: GBufferViewMode = (debugParam as GBufferViewMode) || "color";
  window.addEventListener("keydown", (e) => {
    if (e.key === "g" || e.key === "G") {
      const modes: GBufferViewMode[] = ["color", "normal", "roughness", "metalness", "ao", "lit"];
      const idx = modes.indexOf(gbufferViewMode);
      gbufferViewMode = modes[(idx + 1) % modes.length];
      console.log(`G-buffer view: ${gbufferViewMode}`);
    }
    if (e.key === "l" || e.key === "L") {
      lightModeIndex = (lightModeIndex + 1) % LIGHT_MODES.length;
      console.log(`Light mode: ${LIGHT_MODES[lightModeIndex]}`);
      syncSliders();
      requestFrame();
    }
    // Arrow keys adjust fixed light angle, +/- adjust intensity
    if (e.key === "ArrowLeft") { fixedLightAzimuth -= 0.15; requestFrame(); }
    if (e.key === "ArrowRight") { fixedLightAzimuth += 0.15; requestFrame(); }
    if (e.key === "ArrowUp") { fixedLightElevation = Math.min(fixedLightElevation + 0.1, Math.PI / 2 - 0.05); requestFrame(); }
    if (e.key === "ArrowDown") { fixedLightElevation = Math.max(fixedLightElevation - 0.1, -Math.PI / 2 + 0.05); requestFrame(); }
    if (e.key === "+" || e.key === "=") { lightIntensity = Math.min(lightIntensity + 0.5, 10.0); syncSliders(); requestFrame(); }
    if (e.key === "-" || e.key === "_") { lightIntensity = Math.max(lightIntensity - 0.5, 0.5); syncSliders(); requestFrame(); }
    if (e.key === "[") { ambientIntensity = Math.max(ambientIntensity - 0.03, 0.0); syncSliders(); requestFrame(); }
    if (e.key === "]") { ambientIntensity = Math.min(ambientIntensity + 0.03, 0.5); syncSliders(); requestFrame(); }
    if (e.key === "e") { emissiveIntensity = Math.min(emissiveIntensity + 0.5, 20.0); syncSliders(); requestFrame(); }
    if (e.key === "E") { emissiveIntensity = Math.max(emissiveIntensity - 0.5, 0.0); syncSliders(); requestFrame(); }
    if (e.key === "t") { emissiveThreshold = Math.min(emissiveThreshold + 0.01, 1.0); syncSliders(); requestFrame(); }
    if (e.key === "T") { emissiveThreshold = Math.max(emissiveThreshold - 0.01, 0.0); syncSliders(); requestFrame(); }
  });

  // ---- Slider bindings ----
  function syncSliders() {
    if (emIntensitySlider) { emIntensitySlider.value = String(emissiveIntensity); }
    if (emIntensityValEl) { emIntensityValEl.textContent = emissiveIntensity.toFixed(1); }
    if (emThresholdSlider) { emThresholdSlider.value = String(emissiveThreshold); }
    if (emThresholdValEl) { emThresholdValEl.textContent = emissiveThreshold.toFixed(3); }
    if (lightIntensitySliderEl) { lightIntensitySliderEl.value = String(lightIntensity); }
    if (lightIntensityValEl) { lightIntensityValEl.textContent = lightIntensity.toFixed(1); }
    if (ambientSliderEl) { ambientSliderEl.value = String(ambientIntensity); }
    if (ambientValEl) { ambientValEl.textContent = ambientIntensity.toFixed(2); }
    if (aoRadiusSlider) { aoRadiusSlider.value = String(aoRadius); }
    if (aoRadiusValEl) { aoRadiusValEl.textContent = aoRadius.toFixed(2); }
    if (aoIntensitySlider) { aoIntensitySlider.value = String(aoIntensity); }
    if (aoIntensityValEl) { aoIntensityValEl.textContent = aoIntensity.toFixed(1); }
    if (aoFalloffSlider) { aoFalloffSlider.value = String(aoFalloff); }
    if (aoFalloffValEl) { aoFalloffValEl.textContent = aoFalloff.toFixed(1); }
    if (aoSlicesSlider) { aoSlicesSlider.value = String(aoSlices); }
    if (aoSlicesValEl) { aoSlicesValEl.textContent = String(aoSlices); }
    if (aoStepsSlider) { aoStepsSlider.value = String(aoSteps); }
    if (aoStepsValEl) { aoStepsValEl.textContent = String(aoSteps); }
    if (aoThicknessSlider) { aoThicknessSlider.value = String(aoThickness); }
    if (aoThicknessValEl) { aoThicknessValEl.textContent = aoThickness.toFixed(2); }
    if (envIntensitySlider) { envIntensitySlider.value = String(envIntensity); }
    if (envIntensityValEl) { envIntensityValEl.textContent = envIntensity.toFixed(2); }
    if (envRotationSlider) { envRotationSlider.value = String(envRotation); }
    if (envRotationValEl) { envRotationValEl.textContent = envRotation.toFixed(2); }
    if (bloomThresholdSlider) { bloomThresholdSlider.value = String(bloomThreshold); }
    if (bloomThresholdValEl) { bloomThresholdValEl.textContent = bloomThreshold.toFixed(2); }
    if (bloomIntensitySlider) { bloomIntensitySlider.value = String(bloomIntensity); }
    if (bloomIntensityValEl) { bloomIntensityValEl.textContent = bloomIntensity.toFixed(2); }
    if (roughContrastSlider) { roughContrastSlider.value = String(roughContrast); }
    if (roughContrastValEl) { roughContrastValEl.textContent = roughContrast.toFixed(2); }
    if (roughBrightSlider) { roughBrightSlider.value = String(roughBright); }
    if (roughBrightValEl) { roughBrightValEl.textContent = roughBright.toFixed(2); }
    if (metalContrastSlider) { metalContrastSlider.value = String(metalContrast); }
    if (metalContrastValEl) { metalContrastValEl.textContent = metalContrast.toFixed(2); }
    if (metalBrightSlider) { metalBrightSlider.value = String(metalBright); }
    if (metalBrightValEl) { metalBrightValEl.textContent = metalBright.toFixed(2); }
    if (albedoContrastSlider) { albedoContrastSlider.value = String(albedoContrast); }
    if (albedoContrastValEl) { albedoContrastValEl.textContent = albedoContrast.toFixed(2); }
    if (albedoBrightSlider) { albedoBrightSlider.value = String(albedoBright); }
    if (albedoBrightValEl) { albedoBrightValEl.textContent = albedoBright.toFixed(2); }

    // Persist all settings to localStorage
    saveSettings({
      lightModeIndex, fixedLightAzimuth, fixedLightElevation, lightIntensity, ambientIntensity,
      emissiveIntensity, emissiveThreshold, aoRadius, aoIntensity, aoFalloff, aoSlices, aoSteps,
      aoThickness, envIntensity, envRotation, bloomThreshold, bloomSoftKnee, bloomIntensity,
      roughContrast, roughBright, metalContrast, metalBright, albedoContrast, albedoBright,
      envMap: envSelectEl?.value ?? "studio_small_09",
    });
  }
  emIntensitySlider?.addEventListener("input", () => {
    emissiveIntensity = Number(emIntensitySlider!.value);
    syncSliders();
    requestFrame();
  });
  emThresholdSlider?.addEventListener("input", () => {
    emissiveThreshold = Number(emThresholdSlider!.value);
    syncSliders();
    requestFrame();
  });
  lightIntensitySliderEl?.addEventListener("input", () => {
    lightIntensity = Number(lightIntensitySliderEl!.value);
    syncSliders();
    requestFrame();
  });
  ambientSliderEl?.addEventListener("input", () => {
    ambientIntensity = Number(ambientSliderEl!.value);
    syncSliders();
    requestFrame();
  });
  aoRadiusSlider?.addEventListener("input", () => {
    aoRadius = Number(aoRadiusSlider!.value);
    syncSliders();
    requestFrame();
  });
  aoIntensitySlider?.addEventListener("input", () => {
    aoIntensity = Number(aoIntensitySlider!.value);
    syncSliders();
    requestFrame();
  });
  aoFalloffSlider?.addEventListener("input", () => {
    aoFalloff = Number(aoFalloffSlider!.value);
    syncSliders();
    requestFrame();
  });
  aoSlicesSlider?.addEventListener("input", () => {
    aoSlices = Number(aoSlicesSlider!.value);
    syncSliders();
    requestFrame();
  });
  aoStepsSlider?.addEventListener("input", () => {
    aoSteps = Number(aoStepsSlider!.value);
    syncSliders();
    requestFrame();
  });
  aoThicknessSlider?.addEventListener("input", () => {
    aoThickness = Number(aoThicknessSlider!.value);
    syncSliders();
    requestFrame();
  });
  envIntensitySlider?.addEventListener("input", () => {
    envIntensity = Number(envIntensitySlider!.value);
    syncSliders();
    requestFrame();
  });
  envRotationSlider?.addEventListener("input", () => {
    envRotation = Number(envRotationSlider!.value);
    syncSliders();
    requestFrame();
  });
  bloomThresholdSlider?.addEventListener("input", () => {
    bloomThreshold = Number(bloomThresholdSlider!.value);
    syncSliders();
    requestFrame();
  });
  bloomIntensitySlider?.addEventListener("input", () => {
    bloomIntensity = Number(bloomIntensitySlider!.value);
    syncSliders();
    requestFrame();
  });

  // Material curve sliders
  for (const [slider, setter] of [
    [roughContrastSlider, (v: number) => { roughContrast = v; }],
    [roughBrightSlider, (v: number) => { roughBright = v; }],
    [metalContrastSlider, (v: number) => { metalContrast = v; }],
    [metalBrightSlider, (v: number) => { metalBright = v; }],
    [albedoContrastSlider, (v: number) => { albedoContrast = v; }],
    [albedoBrightSlider, (v: number) => { albedoBright = v; }],
  ] as [HTMLInputElement | null, (v: number) => void][]) {
    slider?.addEventListener("input", () => {
      setter(Number(slider.value));
      syncSliders();
      requestFrame();
    });
  }

  // Environment map selector
  const ENV_URLS: Record<string, string> = {
    studio_small_09: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
    kloofendal_48d: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr",
    empty_warehouse_01: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr",
    royal_esplanade: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/royal_esplanade_1k.hdr",
    moonlit_golf: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/moonlit_golf_1k.hdr",
  };
  envSelectEl?.addEventListener("change", () => {
    const url = ENV_URLS[envSelectEl!.value];
    if (!url) return;
    statsEl.textContent = `Loading environment...`;
    fetch(url).then(async (resp) => {
      if (!resp.ok) { console.warn(`Failed: ${resp.status}`); return; }
      const buffer = await resp.arrayBuffer();
      const { width, height } = parseHDRHeader(buffer);
      renderer.ibl.loadEquirectHDR(buffer, width, height);
      console.log(`Loaded: ${envSelectEl!.value} (${width}x${height})`);
      syncSliders(); // persist env map selection
      requestFrame();
    }).catch(err => console.warn("Env load failed:", err));
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

  const assetPath = selectedSplatAssetPath();
  if (assetPath !== null) {
    statsEl.textContent = `Loading ${assetPath}...`;
  }
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
      const skipSidecar = new URLSearchParams(window.location.search).has("nosidecar");
      const [response, sidecar] = await Promise.all([
        fetch(path).then(r => { if (!r.ok) throw new Error(`Failed to fetch PLY: ${r.status} ${r.statusText}`); return r; }),
        skipSidecar ? Promise.resolve(undefined) : tryFetchSidecar(path),
      ]);
      let attrs = decodeLocalPlySplatPayload(path, await response.arrayBuffer());
      const sidecarLog: Record<string, unknown> = {
        schema: "handy-renderman.sidecar-load-log.v0",
        timestamp: new Date().toISOString(),
        plyPath: path,
        sidecarFound: !!sidecar,
        rawSplatCount: attrs.count,
        rawBoundsMin: Array.from(attrs.bounds.min),
        rawBoundsMax: Array.from(attrs.bounds.max),
      };
      if (sidecar) {
        console.log(`Applying Kaminos sidecar corrections from ${path}.kaminos-splat.json`);
        sidecarLog.sidecar = sidecar;
        sidecarLog.preCropCount = attrs.count;
        attrs = applySidecarCorrections(attrs, sidecar);
        sidecarLog.postCropCount = attrs.count;
        sidecarLog.correctedBoundsMin = Array.from(attrs.bounds.min);
        sidecarLog.correctedBoundsMax = Array.from(attrs.bounds.max);
      }
      // Write sidecar load log to .telemetry/sidecar-load.json
      fetch("/api/sidecar-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sidecarLog, null, 2),
      }).catch(() => {});
      // URL param overrides auto-detected scale
      if (urlSplatScale !== undefined) attrs.splatScale = urlSplatScale;
      return attrs;
    }
    return fetchFirstSmokeSplatPayload(path);
  }
  if (assetPath !== null) {
    await replaceSplatScene(await fetchSplatAttributes(assetPath), assetPath);
  } else {
    statsEl.textContent = "Drop a .ply file to load";
  }

  bindDroppedFileLoading(canvas, async (file) => {
    statsEl.textContent = `Loading ${file.name}...`;
    try {
      await replaceSplatScene(await loadDroppedSplatFile(file), `local-file:${file.name}`);
    } catch (err) {
      statsEl.textContent = err instanceof Error ? err.message : String(err);
      requestFrame();
    }
  }, async (file) => {
    statsEl.textContent = `Loading HDR environment ${file.name}...`;
    try {
      const buffer = await file.arrayBuffer();
      const { width, height } = parseHDRHeader(buffer);
      renderer.ibl.loadEquirectHDR(buffer, width, height);
      console.log(`Loaded HDR environment: ${file.name} (${width}x${height})`);
      requestFrame();
    } catch (err) {
      statsEl.textContent = err instanceof Error ? err.message : String(err);
      requestFrame();
    }
  });

  // ---- Initialize sliders from persisted settings ----
  if (envSelectEl && settings.envMap) { envSelectEl.value = settings.envMap; }
  syncSliders();

  // ---- Load default environment map ----
  const envUrl = new URLSearchParams(window.location.search).get("env")
    ?? ENV_URLS[settings.envMap] ?? ENV_URLS.studio_small_09;
  fetch(envUrl).then(async (resp) => {
    if (!resp.ok) { console.warn(`Failed to load env map: ${resp.status}`); return; }
    const buffer = await resp.arrayBuffer();
    const { width, height } = parseHDRHeader(buffer);
    renderer.ibl.loadEquirectHDR(buffer, width, height);
    console.log(`Loaded HDR environment: ${envUrl.split("/").pop()} (${width}x${height})`);
    requestFrame();
  }).catch(err => console.warn("Env map load failed:", err));

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
      emissiveIntensity,
      emissiveThreshold,
      near: cam.near,
      far: cam.far,
      aoRadius,
      aoIntensity,
      aoFalloff,
      aoSlices,
      aoSteps,
      aoThickness,
      envIntensity,
      envRotation,
      bloomThreshold,
      bloomSoftKnee: 0.5,
      bloomIntensity,
      roughnessCurve: { contrast: roughContrast, brightness: roughBright, gamma: 1.0 },
      metalnessCurve: { contrast: metalContrast, brightness: metalBright, gamma: 1.0 },
      albedoCurve: { contrast: albedoContrast, brightness: albedoBright, gamma: 1.0 },
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
    } else if (gbufferViewMode === "ao") {
      renderer.gbufferDebugPresenter.drawDepth(renderPass, scene.aoView);
    } else if (gbufferViewMode === "lit") {
      renderer.presentTexture(renderPass, scene.litView);
      if (bloomIntensity > 0) {
        renderer.presentBloom(renderPass, scene.bloomView, bloomIntensity);
      }
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
    let statsText = `${width}x${height} | ${displayFps} fps | ${scene.count.toLocaleString()} splats | light: ${lightLabel} (${lightIntensity.toFixed(1)}) amb:${ambientIntensity.toFixed(2)} | em:${emissiveIntensity.toFixed(1)} thr:${emissiveThreshold.toFixed(3)} | view: ${gbufferViewMode}`;
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
