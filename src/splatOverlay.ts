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
import { decodeLocalPlySplatPayload, tryFetchSidecar, applySidecarCorrections, type KaminosSidecar } from "./localPly.js";
import { fetchFirstSmokeSplatPayload, type SplatAttributes } from "./splats.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Route capability facts for the overlay. All fields are explicit and immutable. */
export interface SplatOverlayCapabilities {
  readonly canvasMode: "dual-canvas-overlay";
  readonly meshDepthOcclusion: false;
  readonly sharedCanvasComposite: false;
  readonly sharedCommandEncoder: false;
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
    readonly axisFlips?: readonly boolean[];
    readonly centroidOffset?: readonly number[];
    readonly crop?: unknown;
  };
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

// ---------------------------------------------------------------------------
// Matrix utilities
// ---------------------------------------------------------------------------

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[j * 4 + i] =
        a[0 * 4 + i] * b[j * 4 + 0] +
        a[1 * 4 + i] * b[j * 4 + 1] +
        a[2 * 4 + i] * b[j * 4 + 2] +
        a[3 * 4 + i] * b[j * 4 + 3];
    }
  }
  return out;
}

// Y-flip to match WebGPU clip space convention used by the splat compositor
const VERTICAL_FLIP = new Float32Array([
  1, 0, 0, 0,
  0, -1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

function composeViewProj(proj: Float32Array, view: Float32Array): Float32Array {
  return multiplyMat4(VERTICAL_FLIP, multiplyMat4(proj, view));
}

function cameraFollowLightDir(pos: Float32Array): [number, number, number] {
  const len = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]) || 1;
  return [-pos[0] / len, -pos[1] / len, -pos[2] / len];
}

const IDENTITY_MAT4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const CAPABILITIES: SplatOverlayCapabilities = Object.freeze({
  canvasMode: "dual-canvas-overlay" as const,
  meshDepthOcclusion: false as const,
  sharedCanvasComposite: false as const,
  sharedCommandEncoder: false as const,
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
  let running = false;
  let animFrameId = 0;

  // Camera state (written by host via setCameraMatrices)
  let currentView = new Float32Array(16);
  let currentProj = new Float32Array(16);
  let currentViewProj = new Float32Array(16);
  let currentCameraPos = new Float32Array(3);
  // Model matrix (written by host via setModelMatrix) — not yet applied to rendering,
  // stored for contract completeness and future objectWorldMatrix integration.
  let _modelMatrix = new Float32Array(IDENTITY_MAT4);
  // Viewport override
  let _viewportOverride: { width: number; height: number; dpr: number } | null = null;

  function setCameraMatrices(
    viewMatrix: Float32Array,
    projectionMatrix: Float32Array,
    cameraPosition: Float32Array,
  ) {
    currentView.set(viewMatrix);
    currentProj.set(projectionMatrix);
    currentViewProj = composeViewProj(projectionMatrix, viewMatrix) as Float32Array<ArrayBuffer>;
    currentCameraPos.set(cameraPosition);
  }

  function setModelMatrix(matrix: Float32Array) {
    _modelMatrix = new Float32Array(matrix);
  }

  function setViewport(width: number, height: number, devicePixelRatio = 1) {
    _viewportOverride = { width, height, dpr: devicePixelRatio };
  }

  function setCorrectionIdentity(correction: SplatSourceIdentity["correctionIdentity"]) {
    if (sourceIdentity) {
      sourceIdentity = { ...sourceIdentity, correctionApplied: true, correctionIdentity: correction };
    }
    // Apply crop if correction includes crop bounds and we have pre-crop attributes
    const crop = correction?.crop as { enabled?: boolean; min?: number[]; max?: number[] } | undefined;
    if (crop?.enabled && preCropAttributes && crop.min && crop.max) {
      const sidecar: KaminosSidecar = {
        schema: "kaminos.splat-correction.v0",
        correction: {
          centroidOffset: correction?.centroidOffset as [number, number, number] | undefined,
          axisFlips: correction?.axisFlips
            ? (correction.axisFlips as (boolean | number)[]).map(v => typeof v === "boolean" ? (v ? -1 : 1) : (v ? -1 : 1)) as [number, number, number]
            : undefined,
          crop: {
            enabled: true,
            min: crop.min as [number, number, number],
            max: crop.max as [number, number, number],
          },
        },
      };
      const cropped = applySidecarCorrections(preCropAttributes, sidecar);
      if (cropped.count > 0) {
        console.log(`Overlay: applying crop from correction identity (${cropped.count}/${preCropAttributes.count} splats)`);
        initScene(cropped);
      } else {
        console.warn(`Overlay: crop would remove all splats, skipping`);
      }
    }
  }

  function initScene(attributes: SplatAttributes) {
    if (scene) {
      renderer.destroyScene(scene);
      scene = null;
    }
    const { width, height } = resizeCanvas(gpu);
    const initView = currentView[0] === 0
      ? new Float32Array(IDENTITY_MAT4)
      : currentView;
    const initProj = currentProj[0] === 0
      ? new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -0.02, 0])
      : currentProj;
    const initViewProj = multiplyMat4(initProj, initView);
    scene = renderer.loadScene(attributes, initView, initViewProj, width, height);
    lastAttributes = attributes;
  }

  async function loadPly(source: string | ArrayBuffer, fileName?: string) {
    let bytes: ArrayBuffer;
    const isUrl = typeof source === "string";
    if (isUrl) {
      const [resp, sidecar] = await Promise.all([
        fetch(source).then(r => { if (!r.ok) throw new Error(`Failed to fetch PLY: ${r.status}`); return r; }),
        tryFetchSidecar(source),
      ]);
      bytes = await resp.arrayBuffer();
      fileName = fileName ?? source.split("/").pop() ?? "scene.ply";
      const rawAttrs = decodeLocalPlySplatPayload(fileName, bytes);
      preCropAttributes = rawAttrs;
      let attrs = rawAttrs;
      if (sidecar) {
        console.log(`Applying Kaminos sidecar corrections from ${source}.kaminos-splat.json`);
        attrs = applySidecarCorrections(rawAttrs, sidecar);
        sourceIdentity = {
          source,
          loadMethod: "ply-url",
          correctionApplied: true,
          correctionIdentity: {
            rotation: sidecar.correction.orientation?.rotation,
            axisFlips: sidecar.correction.axisFlips?.map(v => v !== 1),
            centroidOffset: sidecar.correction.centroidOffset,
            crop: sidecar.correction.crop,
          },
        };
      } else {
        sourceIdentity = {
          source,
          loadMethod: "ply-url",
          correctionApplied: false,
        };
      }
      initScene(attrs);
    } else {
      bytes = source;
      fileName = fileName ?? "scene.ply";
      const attrs = decodeLocalPlySplatPayload(fileName, bytes);
      preCropAttributes = attrs;
      sourceIdentity = {
        source: fileName,
        loadMethod: "ply-arraybuffer",
        correctionApplied: false,
      };
      initScene(attrs);
    }
  }

  async function loadManifest(url: string) {
    const attributes = await fetchFirstSmokeSplatPayload(url);
    sourceIdentity = {
      source: url,
      loadMethod: "manifest",
      correctionApplied: false,
    };
    initScene(attributes);
  }

  function loadAttributes(attributes: SplatAttributes) {
    sourceIdentity = {
      source: attributes.sourceKind,
      loadMethod: "attributes",
      correctionApplied: false,
    };
    initScene(attributes);
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
      viewportWidth: plan.viewportWidth,
      viewportHeight: plan.viewportHeight,
      lightDirection: lightDir,
      lightIntensity,
      ambientIntensity,
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
  };
}
