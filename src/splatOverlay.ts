/**
 * Embeddable splat renderer overlay for Kaminos P0 integration.
 *
 * Creates a transparent WebGPU canvas overlaid on a host container,
 * renders Gaussian splats synced to external camera matrices.
 * Owns its own WebGPU device/context — no shared command encoder.
 */

import { initGPU, resizeCanvas } from "./gpu.js";
import {
  createSplatRenderer,
  type SplatScene,
} from "./splatRenderer.js";
import { createAlphaTexturePresenter } from "./tileLocalTexturePresenter.js";
import { decodeLocalPlySplatPayload } from "./localPly.js";
import { fetchFirstSmokeSplatPayload, type SplatAttributes } from "./splats.js";
import { classifySceneContextHonored, ENV_PRESETS, type HybridRenderSceneContextV0, type SceneContextTelemetry } from "./sceneContext.js";
import { composeOverlayFrameMatrices } from "./splatOverlayFrame.js";
import {
  applySplatCorrectionToAttributes,
  EMPTY_SPLAT_CORRECTION_STATUS,
  type SplatCorrectionStatus,
} from "./splatCorrection.js";
import type { MaterialCurveParams } from "./materialCurves.js";

// Re-export the scene context type for consumers
export type { HybridRenderSceneContextV0, SceneContextTelemetry };
export { classifySceneContextHonored };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Route capability facts for the overlay. All fields are explicit and immutable. */
export interface SplatOverlayCapabilities {
  readonly canvasMode: "dual-canvas-overlay";
  readonly meshDepthOcclusion: false;
  readonly sharedCanvasComposite: false;
  readonly sharedCommandEncoder: false;
  readonly cropAppliedByRenderer: true;
}

/** Source identity for the loaded splat asset. */
export interface SplatSourceIdentity {
  /** URL, path, or label for the loaded asset. */
  readonly source: string;
  /** Loading method used. */
  readonly loadMethod: "ply-url" | "ply-arraybuffer" | "manifest" | "attributes";
  /** Whether Kaminos sidecar corrections have been applied upstream. */
  readonly correctionApplied: boolean;
  /** Correction identity fields, if known (from Kaminos sidecar). */
  readonly correctionIdentity?: {
    readonly rotation?: readonly number[];
    readonly axisFlips?: readonly (boolean | number)[];
    readonly centroidOffset?: readonly number[];
    readonly cropCoordinateMatrix?: readonly number[];
    readonly cropCoordinateFrame?: unknown;
    readonly crop?: unknown;
  };
}

export interface SplatRendererControlsV0 {
  readonly schema: "hybrid-render.splat-renderer-controls.v0";
  readonly material?: {
    readonly roughness?: Partial<MaterialCurveParams>;
    readonly metalness?: Partial<MaterialCurveParams>;
    readonly albedo?: Partial<MaterialCurveParams>;
  };
  readonly emissive?: {
    readonly intensity?: number;
    readonly threshold?: number;
  };
  readonly ao?: {
    readonly enabled?: boolean;
    readonly radius?: number;
    readonly intensity?: number;
    readonly falloff?: number;
    readonly thickness?: number;
    readonly slices?: number;
    readonly steps?: number;
  };
  readonly bloom?: {
    readonly threshold?: number;
    readonly softKnee?: number;
    readonly intensity?: number;
  };
}

export interface SplatRendererResolvedControlsV0 {
  readonly material: {
    readonly roughness: MaterialCurveParams;
    readonly metalness: MaterialCurveParams;
    readonly albedo: MaterialCurveParams;
  };
  readonly emissive: {
    readonly intensity: number;
    readonly threshold: number;
  };
  readonly ao: {
    readonly enabled: boolean;
    readonly radius: number;
    readonly intensity: number;
    readonly falloff: number;
    readonly thickness: number;
    readonly slices: number;
    readonly steps: number;
  };
  readonly bloom: {
    readonly threshold: number;
    readonly softKnee: number;
    readonly intensity: number;
  };
}

export interface SplatRendererControlsTelemetry {
  readonly schema: "hybrid-render.splat-renderer-controls-telemetry.v0";
  readonly accepted: boolean;
  readonly timestamp: string;
  readonly honoredFields: readonly string[];
  readonly unsupportedFields: readonly string[];
  readonly controls: SplatRendererResolvedControlsV0;
}

export interface SplatOverlayHandle {
  /** Update camera matrices from host (call each frame before render). */
  setCameraMatrices(
    viewMatrix: Float32Array,
    projectionMatrix: Float32Array,
    cameraPosition: Float32Array,
  ): void;
  /** Set the splat object's world transform (Kaminos scene object matrix). */
  setModelMatrix(matrix: Float32Array): void;
  /** Set viewport identity. If not called, uses the container's size. */
  setViewport(width: number, height: number, devicePixelRatio?: number): void;
  /** Mark that Kaminos sidecar corrections have been applied to the loaded asset. */
  setCorrectionIdentity(correction: SplatSourceIdentity["correctionIdentity"]): void;
  /** Set renderer-neutral scene context (lighting, exposure, composition). */
  setSceneContext(context: HybridRenderSceneContextV0): SceneContextTelemetry;
  /** Last scene-context telemetry, or null if setSceneContext has not been called. */
  readonly sceneContextTelemetry: SceneContextTelemetry | null;
  /** Set renderer-owned material/AO/emissive controls. */
  setRendererControls(controls: SplatRendererControlsV0): SplatRendererControlsTelemetry;
  /** Last accepted renderer-owned controls telemetry. */
  readonly rendererControlsTelemetry: SplatRendererControlsTelemetry;
  /** Effective environment map load state for diagnostics. */
  readonly environmentStatus: {
    readonly status: "none" | "loading" | "loaded" | "error";
    readonly source: string | null;
    readonly preset: string | null;
    readonly width: number | null;
    readonly height: number | null;
    readonly error: string | null;
  };
  /** Effective renderer crop application status for the currently loaded asset. */
  readonly cropStatus: SplatCorrectionStatus;
  /** Kaminos compatibility alias for cropStatus.cropAppliedByRenderer. */
  readonly cropAppliedByRenderer: boolean;
  /** Kaminos compatibility alias for renderer-side correction application telemetry. */
  readonly correctionApplication: {
    readonly cropApplied: boolean;
    readonly cropFrame: string;
    readonly sourceCount: number;
    readonly keptCount: number;
    readonly warning: string | null;
  };
  /** Load a PLY splat file from a URL or ArrayBuffer. */
  loadPly(source: string | ArrayBuffer, fileName?: string): Promise<void>;
  /** Load from our JSON manifest format (sidecar binary). */
  loadManifest(url: string): Promise<void>;
  /** Load pre-decoded SplatAttributes directly. */
  loadAttributes(attributes: SplatAttributes): void;
  /** Start the render loop (synced to host requestAnimationFrame). */
  start(): void;
  /** Stop rendering. */
  stop(): void;
  /** Clean up all GPU resources and remove the overlay canvas. */
  destroy(): void;
  /** The overlay canvas element (for CSS positioning by host). */
  readonly canvas: HTMLCanvasElement;
  /** Current scene (null if nothing loaded). */
  readonly scene: SplatScene | null;
  /** Route capability facts — always truthful, never claimed beyond what the overlay actually does. */
  readonly capabilities: SplatOverlayCapabilities;
  /** Source identity for the currently loaded splat asset. Null if nothing loaded. */
  readonly sourceIdentity: SplatSourceIdentity | null;
}

export interface SplatOverlayOptions {
  /** Light direction — default: camera-following. */
  lightDirection?: [number, number, number];
  lightIntensity?: number;
  ambientIntensity?: number;
}

function cameraFollowLightDir(pos: Float32Array): [number, number, number] {
  const len = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]) || 1;
  return [-pos[0] / len, -pos[1] / len, -pos[2] / len];
}

const IDENTITY_MAT4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const DEFAULT_CURVE_PARAMS: MaterialCurveParams = Object.freeze({ contrast: 1.0, brightness: 0.0, gamma: 1.0 });
const DEFAULT_RENDERER_CONTROLS: SplatRendererResolvedControlsV0 = Object.freeze({
  material: Object.freeze({
    roughness: Object.freeze({ ...DEFAULT_CURVE_PARAMS }),
    metalness: Object.freeze({ ...DEFAULT_CURVE_PARAMS }),
    albedo: Object.freeze({ ...DEFAULT_CURVE_PARAMS }),
  }),
  emissive: Object.freeze({ intensity: 3.0, threshold: 0.05 }),
  ao: Object.freeze({ enabled: true, radius: 0.15, intensity: 1.5, falloff: 1.0, thickness: 1.81, slices: 3, steps: 4 }),
  bloom: Object.freeze({ threshold: 0.8, softKnee: 0.5, intensity: 0.5 }),
});

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const CAPABILITIES: SplatOverlayCapabilities = Object.freeze({
  canvasMode: "dual-canvas-overlay" as const,
  meshDepthOcclusion: false as const,
  sharedCanvasComposite: false as const,
  sharedCommandEncoder: false as const,
  cropAppliedByRenderer: true as const,
});

export async function createSplatOverlay(
  container: HTMLElement,
  options: SplatOverlayOptions = {},
): Promise<SplatOverlayHandle> {
  // Create overlay canvas
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  container.style.position = container.style.position || "relative";
  container.appendChild(canvas);

  // Init our own WebGPU device + context (separate from host)
  const gpu = await initGPU(canvas);
  // Configure for transparency so Three.js canvas shows through
  gpu.context.configure({
    device: gpu.device,
    format: gpu.format,
    alphaMode: "premultiplied",
  });

  const renderer = createSplatRenderer({
    device: gpu.device,
    format: gpu.format,
    f16Supported: gpu.f16Supported,
    timestampsSupported: gpu.timestampsSupported,
  });

  const alphaPresenter = createAlphaTexturePresenter(gpu.device, gpu.format);

  const lightIntensity = options.lightIntensity ?? 3.0;
  const ambientIntensity = options.ambientIntensity ?? 0.12;
  // Mutable state
  let scene: SplatScene | null = null;
  let lastAttributes: SplatAttributes | null = null;
  let preCropAttributes: SplatAttributes | null = null; // before crop, for re-crop on correction update
  let sourceIdentity: SplatSourceIdentity | null = null;
  let correctionIdentity: SplatSourceIdentity["correctionIdentity"] | null = null;
  let cropStatus: SplatCorrectionStatus = EMPTY_SPLAT_CORRECTION_STATUS;
  let running = false;
  let animFrameId = 0;

  // Host camera/model state. The renderer receives positions in object-local
  // asset coordinates, so every rendered frame composes view * model before
  // projection/sorting and transforms camera position into the same local frame.
  let hostView = new Float32Array(16);
  let hostProj = new Float32Array(16);
  let hostCameraPos = new Float32Array(3);
  let currentView = new Float32Array(16);
  let currentProj = new Float32Array(16);
  let currentViewProj = new Float32Array(16);
  let currentCameraPos = new Float32Array(3);
  let currentLightingViewProj = new Float32Array(16);
  let currentLightingCameraPos = new Float32Array(3);
  let currentNormalMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  let _modelMatrix = new Float32Array(IDENTITY_MAT4);
  // Viewport override
  let _viewportOverride: { width: number; height: number; dpr: number } | null = null;
  // Scene context
  let _sceneContextTelemetry: SceneContextTelemetry | null = null;
  let _envIntensity = 1.0;
  let _envRotation = 0.0;
  let _exposure = 1.0;
  let _rendererControls = DEFAULT_RENDERER_CONTROLS;
  let _rendererControlsTelemetry = makeRendererControlsTelemetry(_rendererControls);
  let _envFetchAbort: AbortController | null = null;
  let _envRequestedUrl: string | null = null;
  let _environmentStatus: SplatOverlayHandle["environmentStatus"] = {
    status: "none",
    source: null,
    preset: null,
    width: null,
    height: null,
    error: null,
  };

  function setCameraMatrices(
    viewMatrix: Float32Array,
    projectionMatrix: Float32Array,
    cameraPosition: Float32Array,
  ) {
    hostView.set(viewMatrix);
    hostProj.set(projectionMatrix);
    hostCameraPos.set(cameraPosition);
    recomputeCurrentFrameMatrices();
  }

  function setModelMatrix(matrix: Float32Array) {
    _modelMatrix = new Float32Array(matrix);
    recomputeCurrentFrameMatrices();
  }

  function recomputeCurrentFrameMatrices() {
    const view = hostView[0] === 0 ? new Float32Array(IDENTITY_MAT4) : hostView;
    const proj = hostProj[0] === 0
      ? new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -0.02, 0])
      : hostProj;
    const frameMatrices = composeOverlayFrameMatrices(view, proj, _modelMatrix, hostCameraPos);
    currentView = new Float32Array(frameMatrices.viewMatrix);
    currentProj.set(proj);
    currentViewProj = new Float32Array(frameMatrices.viewProj);
    currentCameraPos = new Float32Array(frameMatrices.cameraPosition);
    currentLightingViewProj = new Float32Array(frameMatrices.lightingViewProj);
    currentLightingCameraPos = new Float32Array(frameMatrices.lightingCameraPosition);
    currentNormalMatrix = new Float32Array(frameMatrices.normalMatrix);
  }

  function setViewport(width: number, height: number, devicePixelRatio = 1) {
    _viewportOverride = { width, height, dpr: devicePixelRatio };
  }

  function setCorrectionIdentity(correction: SplatSourceIdentity["correctionIdentity"]) {
    correctionIdentity = correction;
    if (sourceIdentity) {
      sourceIdentity = { ...sourceIdentity, correctionApplied: true, correctionIdentity: correction };
    }
    applyCorrectionToLoadedAttributes();
  }

  function applyCorrectionToLoadedAttributes() {
    if (!preCropAttributes) return;
    const result = applySplatCorrectionToAttributes(preCropAttributes, correctionIdentity);
    cropStatus = {
      cropAppliedByRenderer: result.cropAppliedByRenderer,
      cropFrame: result.cropFrame,
      sourceCount: result.sourceCount,
      keptCount: result.keptCount,
      warning: result.warning,
    };
    initScene(result.attributes);
  }

  function setSceneContext(context: HybridRenderSceneContextV0): SceneContextTelemetry {
    const telemetry = classifySceneContextHonored(context);
    _sceneContextTelemetry = telemetry;

    if (!telemetry.accepted) return telemetry;

    // Apply honored fields
    const env = context.lighting?.environment;
    if (env && env.kind !== "none") {
      _envIntensity = env.intensity;
      _envRotation = env.rotationY ?? 0;

      // Load env map if URL or preset provided
      const url = env.kind === "hdr-url" ? env.url
        : env.kind === "preset" && env.preset ? ENV_PRESETS[env.preset]
        : undefined;
      if (url) {
        const alreadyRequested = _envRequestedUrl === url && _environmentStatus.status !== "none";
        if (!alreadyRequested) {
          // Abort any prior env map fetch to prevent stale loads
          _envFetchAbort?.abort();
          _envRequestedUrl = url;
          const abort = new AbortController();
          _envFetchAbort = abort;
          _environmentStatus = {
            status: "loading",
            source: url,
            preset: env.kind === "preset" ? env.preset ?? null : null,
            width: null,
            height: null,
            error: null,
          };
          fetch(url, { signal: abort.signal }).then(async (resp) => {
            if (abort.signal.aborted) return;
            if (!resp.ok) {
              _environmentStatus = {
                status: "error",
                source: url,
                preset: env.kind === "preset" ? env.preset ?? null : null,
                width: null,
                height: null,
                error: `HTTP ${resp.status}`,
              };
              return;
            }
            const data = await resp.arrayBuffer();
            if (abort.signal.aborted) return;
            const { parseHDRHeader } = await import("./ibl.js");
            const { width, height } = parseHDRHeader(data);
            renderer.ibl.loadEquirectHDR(data, width, height);
            _environmentStatus = {
              status: "loaded",
              source: url,
              preset: env.kind === "preset" ? env.preset ?? null : null,
              width,
              height,
              error: null,
            };
          }).catch((error) => {
            if (abort.signal.aborted) return;
            _environmentStatus = {
              status: "error",
              source: url,
              preset: env.kind === "preset" ? env.preset ?? null : null,
              width: null,
              height: null,
              error: error instanceof Error ? error.message : String(error),
            };
          });
        }
      }
    }

    if (context.lighting?.exposure !== undefined) {
      _exposure = context.lighting.exposure;
    }

    return telemetry;
  }

  function setRendererControls(controls: SplatRendererControlsV0): SplatRendererControlsTelemetry {
    _rendererControls = normalizeRendererControls(controls, _rendererControls);
    _rendererControlsTelemetry = makeRendererControlsTelemetry(_rendererControls);
    return _rendererControlsTelemetry;
  }

  function initScene(attributes: SplatAttributes) {
    if (scene) {
      renderer.destroyScene(scene);
      scene = null;
    }
    const { width, height } = resizeCanvas(gpu);
    recomputeCurrentFrameMatrices();
    scene = renderer.loadScene(attributes, currentView, currentViewProj, width, height);
    lastAttributes = attributes;
  }

  async function loadPly(source: string | ArrayBuffer, fileName?: string) {
    // The overlay loads raw PLY data, then applies any host-provided crop
    // identity in setCorrectionIdentity. Full orientation/offset correction
    // remains host-owned until Kaminos exports corrected standalone PLYs.
    let bytes: ArrayBuffer;
    const isUrl = typeof source === "string";
    if (isUrl) {
      const resp = await fetch(source);
      if (!resp.ok) throw new Error(`Failed to fetch PLY: ${resp.status}`);
      bytes = await resp.arrayBuffer();
      fileName = fileName ?? source.split("/").pop() ?? "scene.ply";
    } else {
      bytes = source;
      fileName = fileName ?? "scene.ply";
    }
    const attrs = decodeLocalPlySplatPayload(fileName, bytes);
    preCropAttributes = attrs;
    sourceIdentity = {
      source: isUrl ? source : fileName,
      loadMethod: isUrl ? "ply-url" : "ply-arraybuffer",
      correctionApplied: false,
    };
    applyCorrectionToLoadedAttributes();
  }

  async function loadManifest(url: string) {
    const attributes = await fetchFirstSmokeSplatPayload(url);
    sourceIdentity = {
      source: url,
      loadMethod: "manifest",
      correctionApplied: false,
    };
    preCropAttributes = attributes;
    applyCorrectionToLoadedAttributes();
  }

  function loadAttributes(attributes: SplatAttributes) {
    sourceIdentity = {
      source: attributes.sourceKind,
      loadMethod: "attributes",
      correctionApplied: false,
    };
    preCropAttributes = attributes;
    applyCorrectionToLoadedAttributes();
  }

  function frame() {
    if (!running || !scene) {
      if (running) animFrameId = requestAnimationFrame(frame);
      return;
    }

    const now = performance.now();
    const { width, height } = resizeCanvas(gpu);

    // Recreate compositor resources when canvas size changes
    const currentPlan = scene._internal.computeCompositor.resources.plan;
    if (lastAttributes && (width !== currentPlan.viewportWidth || height !== currentPlan.viewportHeight)) {
      initScene(lastAttributes);
      if (!scene) return;
    }

    const encoder = gpu.device.createCommandEncoder();

    // Sort
    if (renderer.shouldRefreshSort(scene, currentView, now)) {
      renderer.encodeSort(scene, encoder, currentView);
    }

    // Compute render (compositor + deferred lighting)
    const lightDir = options.lightDirection ?? cameraFollowLightDir(currentCameraPos);
    const plan = scene._internal.computeCompositor.resources.plan;
    renderer.renderFrame(scene, {
      viewProj: currentViewProj,
      viewMatrix: currentView,
      projMatrix: currentProj,
      cameraPosition: currentCameraPos,
      lightingViewProj: currentLightingViewProj,
      lightingCameraPosition: currentLightingCameraPos,
      normalMatrix: currentNormalMatrix,
      viewportWidth: plan.viewportWidth,
      viewportHeight: plan.viewportHeight,
      lightDirection: lightDir,
      lightIntensity,
      ambientIntensity,
      exposure: _exposure,
      envIntensity: _envIntensity,
      envRotation: _envRotation,
      emissiveIntensity: _rendererControls.emissive.intensity,
      emissiveThreshold: _rendererControls.emissive.threshold,
      aoRadius: _rendererControls.ao.radius,
      aoIntensity: _rendererControls.ao.enabled ? _rendererControls.ao.intensity : 0,
      aoFalloff: _rendererControls.ao.falloff,
      aoThickness: _rendererControls.ao.thickness,
      aoSlices: _rendererControls.ao.slices,
      aoSteps: _rendererControls.ao.steps,
      bloomThreshold: _rendererControls.bloom.threshold,
      bloomSoftKnee: _rendererControls.bloom.softKnee,
      bloomIntensity: _rendererControls.bloom.intensity,
      roughnessCurve: _rendererControls.material.roughness,
      metalnessCurve: _rendererControls.material.metalness,
      albedoCurve: _rendererControls.material.albedo,
    }, encoder);

    // Present to overlay canvas with premultiplied alpha
    const textureView = gpu.context.getCurrentTexture().createView();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });
    alphaPresenter.draw(renderPass, scene.litView);
    renderPass.end();

    gpu.device.queue.submit([encoder.finish()]);

    animFrameId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    animFrameId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = 0;
    }
  }

  function destroy() {
    stop();
    _envFetchAbort?.abort();
    _envFetchAbort = null;
    if (scene) {
      renderer.destroyScene(scene);
      scene = null;
    }
    gpu.device.destroy();
    canvas.remove();
  }

  return {
    setCameraMatrices,
    setModelMatrix,
    setViewport,
    setCorrectionIdentity,
    setSceneContext,
    setRendererControls,
    loadPly,
    loadManifest,
    loadAttributes,
    start,
    stop,
    destroy,
    canvas,
    get scene() { return scene; },
    capabilities: CAPABILITIES,
    get sourceIdentity() { return sourceIdentity; },
    get sceneContextTelemetry() { return _sceneContextTelemetry; },
    get rendererControlsTelemetry() { return _rendererControlsTelemetry; },
    get environmentStatus() { return _environmentStatus; },
    get cropStatus() { return cropStatus; },
    get cropAppliedByRenderer() { return cropStatus.cropAppliedByRenderer; },
    get correctionApplication() {
      return {
        cropApplied: cropStatus.cropAppliedByRenderer,
        cropFrame: cropStatus.cropFrame,
        sourceCount: cropStatus.sourceCount,
        keptCount: cropStatus.keptCount,
        warning: cropStatus.warning,
      };
    },
  };
}

function clampFinite(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function normalizeCurve(
  input: Partial<MaterialCurveParams> | undefined,
  fallback: MaterialCurveParams,
): MaterialCurveParams {
  return {
    contrast: clampFinite(input?.contrast, fallback.contrast, 0, 3),
    brightness: clampFinite(input?.brightness, fallback.brightness, -1, 1),
    gamma: clampFinite(input?.gamma, fallback.gamma, 0.1, 3),
  };
}

function normalizeRendererControls(
  input: SplatRendererControlsV0,
  fallback: SplatRendererResolvedControlsV0 = DEFAULT_RENDERER_CONTROLS,
): SplatRendererResolvedControlsV0 {
  return {
    material: {
      roughness: normalizeCurve(input.material?.roughness, fallback.material.roughness),
      metalness: normalizeCurve(input.material?.metalness, fallback.material.metalness),
      albedo: normalizeCurve(input.material?.albedo, fallback.material.albedo),
    },
    emissive: {
      intensity: clampFinite(input.emissive?.intensity, fallback.emissive.intensity, 0, 20),
      threshold: clampFinite(input.emissive?.threshold, fallback.emissive.threshold, 0, 1),
    },
    ao: {
      enabled: typeof input.ao?.enabled === "boolean" ? input.ao.enabled : fallback.ao.enabled,
      radius: clampFinite(input.ao?.radius, fallback.ao.radius, 0, 5),
      intensity: clampFinite(input.ao?.intensity, fallback.ao.intensity, 0, 5),
      falloff: clampFinite(input.ao?.falloff, fallback.ao.falloff, 0.01, 5),
      thickness: clampFinite(input.ao?.thickness, fallback.ao.thickness, 0, 5),
      slices: Math.round(clampFinite(input.ao?.slices, fallback.ao.slices, 1, 8)),
      steps: Math.round(clampFinite(input.ao?.steps, fallback.ao.steps, 1, 8)),
    },
    bloom: {
      threshold: clampFinite(input.bloom?.threshold, fallback.bloom.threshold, 0, 5),
      softKnee: clampFinite(input.bloom?.softKnee, fallback.bloom.softKnee, 0, 1),
      intensity: clampFinite(input.bloom?.intensity, fallback.bloom.intensity, 0, 10),
    },
  };
}

function makeRendererControlsTelemetry(
  controls: SplatRendererResolvedControlsV0,
): SplatRendererControlsTelemetry {
  return {
    schema: "hybrid-render.splat-renderer-controls-telemetry.v0",
    accepted: true,
    timestamp: new Date().toISOString(),
    honoredFields: [
      "material.roughness",
      "material.metalness",
      "material.albedo",
      "emissive.intensity",
      "emissive.threshold",
      "ao.enabled",
      "ao.radius",
      "ao.intensity",
      "ao.falloff",
      "ao.thickness",
      "ao.slices",
      "ao.steps",
      "bloom.threshold",
      "bloom.softKnee",
      "bloom.intensity",
    ],
    unsupportedFields: [],
    controls,
  };
}
