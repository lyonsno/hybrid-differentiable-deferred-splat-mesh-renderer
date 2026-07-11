/**
 * Embeddable splat renderer overlay for Kaminos P0 integration.
 *
 * Creates a transparent WebGPU canvas overlaid on a host container,
 * renders Gaussian splats synced to external camera matrices.
 * Can either own its WebGPU device or render on a host-owned device.
 */

import { initGPU, resizeCanvas } from "./gpu.js";
import {
  createSplatRenderer,
  mat4Inverse,
  type SplatScene,
} from "./splatRenderer.js";
import {
  createAlphaTexturePresenter,
  createHostDepthAlphaTexturePresenter,
  createProxyDepthAlphaTexturePresenter,
  type HostDepthTextureMetadata,
  type ProxyDepthPlane,
} from "./tileLocalTexturePresenter.js";
import { decodeLocalPlySplatPayload } from "./localPly.js";
import { fetchFirstSmokeSplatPayload, type SplatAttributes } from "./splats.js";
import { classifySceneContextHonored, ENV_PRESETS, type HybridRenderSceneContextV0, type SceneContextTelemetry } from "./sceneContext.js";
import { composeOverlayFrameMatrices } from "./splatOverlayFrame.js";
import { transformSceneSplatAttributes } from "./sceneSplatTransform.js";
import {
  applySplatCorrectionToAttributes,
  EMPTY_SPLAT_CORRECTION_STATUS,
  type SplatCorrectionIdentity,
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
  readonly meshDepthOcclusion: "proxy-geometry" | "host-depth-texture";
  readonly sharedCanvasComposite: false;
  readonly sharedCommandEncoder: false;
  readonly sharedDevice: boolean;
  readonly hostDepthTexture: boolean;
  readonly cropAppliedByRenderer: true;
}

export interface DepthCompositionTelemetry {
  readonly schema: "hybrid-render.depth-composition-telemetry.v0";
  readonly accepted: boolean;
  readonly source: "none" | "proxy-geometry" | "host-depth-texture";
  readonly active: boolean;
  readonly proxyCount: number;
  readonly hostDepthTexture: boolean;
  readonly honoredFields: readonly string[];
  readonly unsupportedFields: readonly string[];
  readonly timestamp: string;
}

/** Source identity for the loaded splat asset. */
export interface SplatSourceIdentity {
  /** URL, path, or label for the loaded asset. */
  readonly source: string;
  /** Loading method used. */
  readonly loadMethod: "ply-url" | "ply-arraybuffer" | "manifest" | "attributes" | "scene-splats";
  /** Whether Kaminos sidecar corrections have been applied upstream. */
  readonly correctionApplied: boolean;
  /** Scene-level splat ids loaded into the same renderer scene. */
  readonly sceneSplatIds?: readonly string[];
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

export interface SplatOverlaySceneEntry {
  readonly id: string;
  readonly source: string;
  readonly fileName?: string;
  readonly modelMatrix?: readonly number[];
  readonly correction?: SplatSourceIdentity["correctionIdentity"];
}

export interface SplatSceneIdentity {
  readonly source: "kaminos-scene-splats";
  readonly entryCount: number;
  readonly activeEntryId: string | null;
  readonly loadedEntryIds: readonly string[];
  readonly compatibilityMode: "first-entry";
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
  readonly normal?: {
    forceScreenSpace?: boolean;
  };
  readonly preview?: {
    sourceColor?: boolean;
  };
  readonly presentation?: {
    readonly mode?: "source-radiance" | "deferred-pbr";
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
  readonly normal: {
    readonly forceScreenSpace: boolean;
  };
  readonly preview: {
    readonly sourceColor: boolean;
  };
  readonly presentation: {
    readonly mode: "source-radiance" | "deferred-pbr";
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
  readonly presentation: {
    readonly requestedMode: "source-radiance" | "deferred-pbr";
    readonly effectiveMode: "source-radiance" | "deferred-pbr";
    readonly effectiveRoute: "source-radiance-copy" | "deferred-pbr-lighting";
  };
}

export interface SplatSceneEntry {
  readonly id: string;
  readonly source: string | ArrayBuffer;
  readonly fileName?: string;
  readonly modelMatrix?: readonly number[];
  readonly correction?: SplatCorrectionIdentity | null;
}

export interface SplatSceneIdentity {
  readonly schema: "hybrid-render.scene-splats.v0";
  readonly splats: readonly {
    readonly id: string;
    readonly source: string;
    readonly sourceCount: number;
    readonly keptCount: number;
    readonly cropAppliedByRenderer: boolean;
    readonly cropFrame: string;
  }[];
  readonly count: number;
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
  /** Set a host-renderer NDC depth texture view for mesh/splat occlusion. */
  setHostDepthTexture(textureView: GPUTextureView | null, metadata?: HostDepthTextureMetadata): void;
  /** Last scene-context telemetry, or null if setSceneContext has not been called. */
  readonly sceneContextTelemetry: SceneContextTelemetry | null;
  /** Effective depth-composition telemetry for the current scene context. */
  readonly depthCompositionTelemetry: DepthCompositionTelemetry;
  /** Last render-loop validation/runtime error, if the frame path failed after state acceptance. */
  readonly renderError: { readonly phase: string; readonly message: string; readonly name?: string } | null;
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
  /** Load Kaminos scene splat entries. Current compatibility path renders the first entry. */
  loadSceneSplats(entries: readonly SplatOverlaySceneEntry[]): Promise<void>;
  /** Load from our JSON manifest format (sidecar binary). */
  loadManifest(url: string): Promise<void>;
  /** Load pre-decoded SplatAttributes directly. */
  loadAttributes(attributes: SplatAttributes): void;
  /** Load all scene splats into one renderer-owned splat scene. */
  loadSceneSplats(entries: readonly SplatSceneEntry[]): Promise<void>;
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
  /** Scene-level ids currently owned by the renderer. Empty for single-splat compatibility mode. */
  readonly sceneSplatIds: readonly string[];
  /** Scene-level load identity and crop accounting. Null for single-splat compatibility mode. */
  readonly sceneIdentity: SplatSceneIdentity | null;
}

export interface SplatOverlayOptions {
  /** Light direction — default: camera-following. */
  lightDirection?: [number, number, number];
  lightIntensity?: number;
  ambientIntensity?: number;
  device?: GPUDevice;
  format?: GPUTextureFormat;
  timestampsSupported?: boolean;
  f16Supported?: boolean;
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
  normal: Object.freeze({ forceScreenSpace: false }),
  preview: Object.freeze({ sourceColor: false }),
  presentation: Object.freeze({ mode: "deferred-pbr" as const }),
  ao: Object.freeze({ enabled: true, radius: 0.15, intensity: 1.5, falloff: 1.0, thickness: 1.81, slices: 3, steps: 4 }),
  bloom: Object.freeze({ threshold: 0.8, softKnee: 0.5, intensity: 0.5 }),
});

function recomputeSplatBounds(positions: Float32Array, count: number): SplatAttributes["bounds"] {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < count; index += 1) {
    const base = index * 3;
    const x = positions[base];
    const y = positions[base + 1];
    const z = positions[base + 2];
    min[0] = Math.min(min[0], x); min[1] = Math.min(min[1], y); min[2] = Math.min(min[2], z);
    max[0] = Math.max(max[0], x); max[1] = Math.max(max[1], y); max[2] = Math.max(max[2], z);
  }
  if (count === 0) {
    min[0] = min[1] = min[2] = 0;
    max[0] = max[1] = max[2] = 0;
  }
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const size: [number, number, number] = [
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2],
  ];
  const radius = Math.max(...size) / 2;
  return { min, max, center, radius };
}

function copyFloatComponents(source: Float32Array | undefined, target: Float32Array | undefined, srcIndex: number, dstIndex: number, components: number, fallback = 0) {
  if (!target) return;
  const srcBase = srcIndex * components;
  const dstBase = dstIndex * components;
  for (let component = 0; component < components; component += 1) {
    target[dstBase + component] = source ? source[srcBase + component] : fallback;
  }
}

function concatenateSceneAttributes(entries: readonly SplatAttributes[]): SplatAttributes {
  if (entries.length === 0) throw new Error("loadSceneSplats requires at least one splat");
  const count = entries.reduce((sum, attrs) => sum + attrs.count, 0);
  const first = entries[0];
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const radii = new Float32Array(count);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  const originalIds = new Uint32Array(count);
  const hasAnyNormals = entries.some(attrs => !!attrs.normals);
  const normals = hasAnyNormals ? new Float32Array(count * 3) : undefined;
  const hasAnyDetailNormals = entries.some(attrs => !!attrs.detailNormals);
  const detailNormals = hasAnyDetailNormals ? new Float32Array(count * 3) : undefined;
  const roughness = new Float32Array(count);
  const metalness = new Float32Array(count);
  const emissive = new Float32Array(count * 3);
  const shCompatible = entries.every(attrs => attrs.sh?.degree === first.sh?.degree
    && attrs.sh?.coefficientCount === first.sh?.coefficientCount
    && attrs.sh?.basis === first.sh?.basis
    && attrs.sh?.layout === first.sh?.layout);
  const shCoefficients = shCompatible && first.sh
    ? new Float32Array(count * first.sh.coefficientCount * 3)
    : undefined;

  let dst = 0;
  for (const attrs of entries) {
    for (let src = 0; src < attrs.count; src += 1) {
      copyFloatComponents(attrs.positions, positions, src, dst, 3);
      copyFloatComponents(attrs.colors, colors, src, dst, 3);
      opacities[dst] = attrs.opacities[src];
      radii[dst] = attrs.radii[src];
      copyFloatComponents(attrs.scales, scales, src, dst, 3);
      copyFloatComponents(attrs.rotations, rotations, src, dst, 4);
      copyFloatComponents(attrs.normals, normals, src, dst, 3, 0);
      copyFloatComponents(attrs.detailNormals, detailNormals, src, dst, 3, 0);
      roughness[dst] = attrs.roughness ? attrs.roughness[src] : 0.45;
      metalness[dst] = attrs.metalness ? attrs.metalness[src] : 0.0;
      copyFloatComponents(attrs.emissive, emissive, src, dst, 3);
      if (shCoefficients && attrs.sh) {
        copyFloatComponents(attrs.sh.coefficients, shCoefficients, src, dst, attrs.sh.coefficientCount * 3);
      }
      originalIds[dst] = dst;
      dst += 1;
    }
  }

  return {
    count,
    sourceKind: "scene_splats",
    positions,
    colors,
    opacities,
    radii,
    scales,
    rotations,
    sh: shCoefficients && first.sh ? { ...first.sh, coefficients: shCoefficients } : undefined,
    normals,
    roughness,
    metalness,
    emissive,
    detailNormals,
    originalIds,
    bounds: recomputeSplatBounds(positions, count),
    layout: first.layout,
    splatScale: first.splatScale,
  };
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

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

  const gpu = await initGPU(canvas, {
    externalDevice: options.device,
    format: options.format,
    timestampsSupported: options.timestampsSupported,
    f16Supported: options.f16Supported,
  });
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
  const depthProxyPresenter = createProxyDepthAlphaTexturePresenter(gpu.device, gpu.format);
  const hostDepthPresenter = createHostDepthAlphaTexturePresenter(gpu.device, gpu.format);

  const lightIntensity = options.lightIntensity ?? 3.0;
  const ambientIntensity = options.ambientIntensity ?? 0.12;
  // Mutable state
  let scene: SplatScene | null = null;
  let lastAttributes: SplatAttributes | null = null;
  let preCropAttributes: SplatAttributes | null = null; // before crop, for re-crop on correction update
  let sourceIdentity: SplatSourceIdentity | null = null;
  let sceneIdentity: SplatSceneIdentity | null = null;
  let sceneSplatIds: string[] = [];
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
  let currentLightingView = new Float32Array(IDENTITY_MAT4);
  let currentLightingViewProj = new Float32Array(16);
  let currentLightingCameraPos = new Float32Array(3);
  let currentNormalMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  let _modelMatrix = new Float32Array(IDENTITY_MAT4);
  // Viewport override
  let _viewportOverride: { width: number; height: number; dpr: number } | null = null;
  // Scene context
  let _sceneContextTelemetry: SceneContextTelemetry | null = null;
  let _proxyDepthPlanes: ProxyDepthPlane[] = [];
  let _hostDepthTextureView: GPUTextureView | null = null;
  let _hostDepthMetadata: HostDepthTextureMetadata = {};
  let _hostDepthRequested = false;
  let _depthCompositionTelemetry: DepthCompositionTelemetry = makeDepthCompositionTelemetry([]);
  let _renderError: SplatOverlayHandle["renderError"] = null;
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
    currentLightingView = new Float32Array(frameMatrices.lightingViewMatrix);
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
    _hostDepthRequested = telemetry.accepted
      && telemetry.honored.depthSource
      && context.composition?.depthSource === "host-depth-texture";
    _proxyDepthPlanes = telemetry.accepted && telemetry.honored.depthSource
      && context.composition?.depthSource === "proxy-geometry"
      ? normalizeProxyDepthPlanes(context)
      : [];
    _depthCompositionTelemetry = makeDepthCompositionTelemetry(
      _proxyDepthPlanes,
      _hostDepthRequested,
      activeHostDepthTexture(),
      telemetry.unsupported,
    );

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

  function activeHostDepthTexture(): boolean {
    return _hostDepthRequested && !!_hostDepthTextureView;
  }

  function setHostDepthTexture(textureView: GPUTextureView | null, metadata: HostDepthTextureMetadata = {}) {
    _hostDepthTextureView = textureView;
    _hostDepthMetadata = metadata;
    _depthCompositionTelemetry = makeDepthCompositionTelemetry(
      _proxyDepthPlanes,
      _hostDepthRequested,
      activeHostDepthTexture(),
      _sceneContextTelemetry?.unsupported ?? [],
    );
  }

  function currentCapabilities(): SplatOverlayCapabilities {
    return Object.freeze({
      canvasMode: "dual-canvas-overlay" as const,
      meshDepthOcclusion: activeHostDepthTexture() ? "host-depth-texture" as const : "proxy-geometry" as const,
      sharedCanvasComposite: false as const,
      sharedCommandEncoder: false as const,
      sharedDevice: !gpu.ownsDevice,
      hostDepthTexture: activeHostDepthTexture(),
      cropAppliedByRenderer: true as const,
    });
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
    sceneIdentity = null;
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
    sceneIdentity = null;
    sceneSplatIds = [];
    preCropAttributes = attrs;
    sourceIdentity = {
      source: isUrl ? source : fileName,
      loadMethod: isUrl ? "ply-url" : "ply-arraybuffer",
      correctionApplied: false,
    };
    applyCorrectionToLoadedAttributes();
  }

  async function loadSceneSplats(entries: readonly SplatOverlaySceneEntry[]) {
    if (!entries.length) throw new Error("loadSceneSplats requires at least one splat entry");
    const entry = entries[0];
    const nextSceneIdentity: SplatSceneIdentity = {
      source: "kaminos-scene-splats",
      entryCount: entries.length,
      activeEntryId: entry.id ?? null,
      loadedEntryIds: entries.map((candidate) => candidate.id),
      compatibilityMode: "first-entry",
    };
    if (entry.modelMatrix) {
      if (entry.modelMatrix.length !== 16) throw new Error("loadSceneSplats entry modelMatrix must have 16 elements");
      setModelMatrix(new Float32Array(entry.modelMatrix));
    }
    correctionIdentity = entry.correction ?? null;
    await loadPly(entry.source, entry.fileName);
    sceneIdentity = nextSceneIdentity;
    if (entry.correction && sourceIdentity) {
      sourceIdentity = { ...sourceIdentity, correctionApplied: true, correctionIdentity: entry.correction };
    }
  }

  async function loadManifest(url: string) {
    const attributes = await fetchFirstSmokeSplatPayload(url);
    sceneIdentity = null;
    sceneSplatIds = [];
    sourceIdentity = {
      source: url,
      loadMethod: "manifest",
      correctionApplied: false,
    };
    preCropAttributes = attributes;
    applyCorrectionToLoadedAttributes();
  }

  function loadAttributes(attributes: SplatAttributes) {
    sceneIdentity = null;
    sceneSplatIds = [];
    sourceIdentity = {
      source: attributes.sourceKind,
      loadMethod: "attributes",
      correctionApplied: false,
    };
    preCropAttributes = attributes;
    applyCorrectionToLoadedAttributes();
  }

  async function loadSceneSplats(entries: readonly SplatSceneEntry[]) {
    if (entries.length === 0) throw new Error("loadSceneSplats requires at least one splat");
    const transformed: SplatAttributes[] = [];
    const splats: Array<SplatSceneIdentity["splats"][number]> = [];
    let totalSourceCount = 0;
    let totalKeptCount = 0;
    const warnings: string[] = [];

    for (const entry of entries) {
      let bytes: ArrayBuffer;
      let fileName = entry.fileName ?? `${entry.id}.ply`;
      const isUrl = typeof entry.source === "string";
      if (isUrl) {
        const resp = await fetch(entry.source);
        if (!resp.ok) throw new Error(`Failed to fetch scene splat ${entry.id}: ${resp.status}`);
        bytes = await resp.arrayBuffer();
        fileName = fileName || entry.source.split("/").pop() || `${entry.id}.ply`;
      } else {
        bytes = entry.source;
      }

      const decoded = decodeLocalPlySplatPayload(fileName, bytes);
      const corrected = applySplatCorrectionToAttributes(decoded, entry.correction);
      const worldAttrs = transformSceneSplatAttributes(corrected.attributes, entry.modelMatrix);
      transformed.push(worldAttrs);
      totalSourceCount += corrected.sourceCount;
      totalKeptCount += corrected.keptCount;
      if (corrected.warning) warnings.push(`${entry.id}:${corrected.warning}`);
      splats.push({
        id: entry.id,
        source: isUrl ? entry.source : fileName,
        sourceCount: corrected.sourceCount,
        keptCount: corrected.keptCount,
        cropAppliedByRenderer: corrected.cropAppliedByRenderer,
        cropFrame: corrected.cropFrame,
      });
    }

    const merged = concatenateSceneAttributes(transformed);
    sceneSplatIds = entries.map(entry => entry.id);
    sceneIdentity = {
      schema: "hybrid-render.scene-splats.v0",
      splats,
      count: sceneSplatIds.length,
    };
    correctionIdentity = null;
    preCropAttributes = null;
    sourceIdentity = {
      source: "scene-splats",
      loadMethod: "scene-splats",
      correctionApplied: splats.some(item => item.cropAppliedByRenderer),
      sceneSplatIds,
    };
    cropStatus = {
      cropAppliedByRenderer: splats.some(item => item.cropAppliedByRenderer),
      cropFrame: sceneSplatIds.length === 1 ? splats[0]?.cropFrame ?? "disabled" : "scene-splats",
      sourceCount: totalSourceCount,
      keptCount: totalKeptCount,
      warning: warnings.length > 0 ? warnings.join(";") : null,
    };
    initScene(merged);
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
      lightingViewMatrix: currentLightingView,
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
      forceScreenSpaceNormals: _rendererControls.normal.forceScreenSpace,
      presentationMode: _rendererControls.presentation.mode,
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
    const invViewProj = mat4Inverse(currentViewProj);
    const invLightingViewProj = mat4Inverse(currentLightingViewProj);
    gpu.device.pushErrorScope("validation");
    try {
      if (activeHostDepthTexture() && _hostDepthTextureView && invViewProj) {
        hostDepthPresenter.draw(
          renderPass,
          scene.litView,
          scene.gbufferDepthView,
          _hostDepthTextureView,
          currentViewProj,
          invViewProj,
          currentView,
          _hostDepthMetadata,
        );
      } else if (_proxyDepthPlanes.length > 0 && invLightingViewProj) {
        depthProxyPresenter.draw(
          renderPass,
          scene.litView,
          scene.gbufferDepthView,
          _proxyDepthPlanes,
          currentLightingViewProj,
          invLightingViewProj,
        );
      } else {
        alphaPresenter.draw(renderPass, scene.litView);
      }
      renderPass.end();

      gpu.device.queue.submit([encoder.finish()]);
    } catch (error) {
      _renderError = {
        phase: "frame",
        message: String(error instanceof Error ? error.message : error),
        name: error instanceof Error ? error.name : undefined,
      };
      throw error;
    } finally {
      gpu.device.popErrorScope().then((error) => {
        if (error) {
          _renderError = {
            phase: "frame-validation",
            message: error.message,
            name: error.constructor?.name,
          };
        }
      }).catch((error) => {
        _renderError = {
          phase: "frame-validation-scope",
          message: String(error instanceof Error ? error.message : error),
          name: error instanceof Error ? error.name : undefined,
        };
      });
    }

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
    if (gpu.ownsDevice) gpu.device.destroy();
    canvas.remove();
  }

  return {
    setCameraMatrices,
    setModelMatrix,
    setViewport,
    setCorrectionIdentity,
    setSceneContext,
    setHostDepthTexture,
    setRendererControls,
    loadPly,
    loadSceneSplats,
    loadManifest,
    loadAttributes,
    loadSceneSplats,
    start,
    stop,
    destroy,
    canvas,
    get scene() { return scene; },
    get capabilities() { return currentCapabilities(); },
    get sourceIdentity() { return sourceIdentity; },
    get sceneSplatIds() { return sceneSplatIds; },
    get sceneIdentity() { return sceneIdentity; },
    get sceneContextTelemetry() { return _sceneContextTelemetry; },
    get depthCompositionTelemetry() { return _depthCompositionTelemetry; },
    get renderError() { return _renderError; },
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

function makeDepthCompositionTelemetry(
  planes: readonly ProxyDepthPlane[],
  hostDepthRequested = false,
  hostDepthActive = false,
  unsupportedFields: readonly string[] = [],
): DepthCompositionTelemetry {
  const proxyActive = planes.length > 0;
  const active = hostDepthActive || proxyActive;
  const source = hostDepthActive ? "host-depth-texture" : (proxyActive ? "proxy-geometry" : "none");
  return {
    schema: "hybrid-render.depth-composition-telemetry.v0",
    accepted: hostDepthRequested || proxyActive,
    source,
    active,
    proxyCount: planes.length,
    hostDepthTexture: hostDepthActive,
    honoredFields: hostDepthActive
      ? ["composition.depthSource", "composition.hostDepth"]
      : (proxyActive ? ["composition.depthSource", "composition.depthProxies"] : []),
    unsupportedFields,
    timestamp: new Date().toISOString(),
  };
}

function normalizeProxyDepthPlanes(context: HybridRenderSceneContextV0): ProxyDepthPlane[] {
  const proxies = context.composition?.depthProxies;
  if (!Array.isArray(proxies)) return [];
  const planes: ProxyDepthPlane[] = [];
  for (const proxy of proxies) {
    if (planes.length >= 4 || proxy?.kind !== "plane") continue;
    const center = proxy.centerWorld;
    const normal = proxy.normalWorld;
    const radius = proxy.radius;
    if (!isFiniteVec3(center) || !isFiniteVec3(normal) || !Number.isFinite(radius) || radius <= 0) continue;
    const normalLength = Math.hypot(normal[0], normal[1], normal[2]);
    if (normalLength <= 1e-6) continue;
    planes.push({
      centerWorld: [center[0], center[1], center[2]],
      normalWorld: [normal[0] / normalLength, normal[1] / normalLength, normal[2] / normalLength],
      radius,
      depthBias: Number.isFinite(proxy.depthBias) ? proxy.depthBias! : 0.0005,
    });
  }
  return planes;
}

function isFiniteVec3(value: unknown): value is readonly [number, number, number] {
  return Array.isArray(value)
    && value.length === 3
    && value.every((component) => typeof component === "number" && Number.isFinite(component));
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
  const legacySourceColor = typeof input.preview?.sourceColor === "boolean"
    ? input.preview.sourceColor
    : fallback.preview.sourceColor;
  const presentationMode = input.presentation?.mode === "source-radiance" || input.presentation?.mode === "deferred-pbr"
    ? input.presentation.mode
    : legacySourceColor ? "source-radiance" : fallback.presentation.mode;
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
    normal: {
      forceScreenSpace: typeof input.normal?.forceScreenSpace === "boolean"
        ? input.normal.forceScreenSpace
        : fallback.normal.forceScreenSpace,
    },
    preview: {
      sourceColor: presentationMode === "source-radiance",
    },
    presentation: { mode: presentationMode },
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
      "normal.forceScreenSpace",
      "preview.sourceColor",
      "presentation.mode",
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
    presentation: {
      requestedMode: controls.presentation.mode,
      effectiveMode: controls.presentation.mode,
      effectiveRoute: controls.presentation.mode === "source-radiance"
        ? "source-radiance-copy"
        : "deferred-pbr-lighting",
    },
  };
}
