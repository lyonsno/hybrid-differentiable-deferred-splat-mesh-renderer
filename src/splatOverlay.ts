/**
 * Embeddable splat renderer overlay for Kaminos P0 integration.
 *
 * Creates a transparent WebGPU canvas overlaid on a host container,
 * renders Gaussian splats synced to external camera matrices.
 * Owns its own WebGPU device/context — no shared command encoder.
 */

import { initGPU, resizeCanvas, type GPU } from "./gpu.js";
import {
  createSplatRenderer,
  type SplatRenderer,
  type SplatScene,
} from "./splatRenderer.js";
import { decodeLocalPlySplatPayload } from "./localPly.js";
import { fetchFirstSmokeSplatPayload, type SplatAttributes } from "./splats.js";
import { type AlphaDensityAccountingMode } from "./realSmokeScene.js";
import { shouldRefreshAlphaDensity } from "./alphaDensityRefresh.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SplatOverlayHandle {
  /** Update camera matrices from host (call each frame before render). */
  setCameraMatrices(
    viewMatrix: Float32Array,
    projectionMatrix: Float32Array,
    cameraPosition: Float32Array,
  ): void;
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
}

export interface SplatOverlayOptions {
  /** Light direction — default: camera-following. */
  lightDirection?: [number, number, number];
  lightIntensity?: number;
  ambientIntensity?: number;
  alphaDensityMode?: AlphaDensityAccountingMode;
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

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const ALPHA_DENSITY_SETTLE_MS = 200;

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

  const lightIntensity = options.lightIntensity ?? 3.0;
  const ambientIntensity = options.ambientIntensity ?? 0.12;
  const alphaDensityMode: AlphaDensityAccountingMode = options.alphaDensityMode ?? "coverage-aware";

  // Mutable state
  let scene: SplatScene | null = null;
  let depthTexture: GPUTexture | null = null;
  let running = false;
  let animFrameId = 0;

  // Camera state (written by host via setCameraMatrices)
  let currentView = new Float32Array(16);
  let currentProj = new Float32Array(16);
  let currentViewProj = new Float32Array(16);
  let currentCameraPos = new Float32Array(3);

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

  function initScene(attributes: SplatAttributes) {
    if (scene) {
      renderer.destroyScene(scene);
      scene = null;
    }
    const { width, height } = resizeCanvas(gpu);
    const initView = currentView[0] === 0
      ? new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
      : currentView;
    const initProj = currentProj[0] === 0
      ? new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -0.02, 0])
      : currentProj;
    const initViewProj = multiplyMat4(initProj, initView);
    scene = renderer.loadScene(attributes, alphaDensityMode, initView, initViewProj, width, height);
  }

  async function loadPly(source: string | ArrayBuffer, fileName?: string) {
    let bytes: ArrayBuffer;
    if (typeof source === "string") {
      const resp = await fetch(source);
      if (!resp.ok) throw new Error(`Failed to fetch PLY: ${resp.status}`);
      bytes = await resp.arrayBuffer();
      fileName = fileName ?? source.split("/").pop() ?? "scene.ply";
    } else {
      bytes = source;
      fileName = fileName ?? "scene.ply";
    }
    initScene(decodeLocalPlySplatPayload(fileName, bytes));
  }

  async function loadManifest(url: string) {
    const attributes = await fetchFirstSmokeSplatPayload(url);
    initScene(attributes);
  }

  function loadAttributes(attributes: SplatAttributes) {
    initScene(attributes);
  }

  function frame() {
    if (!running || !scene) {
      if (running) animFrameId = requestAnimationFrame(frame);
      return;
    }

    const now = performance.now();
    const { width, height } = resizeCanvas(gpu);

    // Resize depth texture
    if (!depthTexture || depthTexture.width !== width || depthTexture.height !== height) {
      depthTexture?.destroy();
      depthTexture = gpu.device.createTexture({
        size: { width, height },
        format: "depth32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    // Resize compositor
    scene = renderer.resizeViewport(scene, width, height);

    // Alpha-density refresh
    const adState = renderer.alphaDensityState(scene);
    if (shouldRefreshAlphaDensity(adState.refreshState, currentView, width, height, now, ALPHA_DENSITY_SETTLE_MS)) {
      renderer.refreshAlphaDensity(scene, currentViewProj, width, height, alphaDensityMode);
    }

    const encoder = gpu.device.createCommandEncoder();

    // Sort
    if (renderer.shouldRefreshSort(scene, currentView, now)) {
      renderer.encodeSort(scene, encoder, currentView);
    }

    // Compute render
    const lightDir = options.lightDirection ?? cameraFollowLightDir(currentCameraPos);
    renderer.renderFrame(scene, {
      viewProj: currentViewProj,
      viewMatrix: currentView,
      cameraPosition: currentCameraPos,
      viewportWidth: width,
      viewportHeight: height,
      lightDirection: lightDir,
      lightIntensity,
      ambientIntensity,
      transparentBackground: true,
    }, encoder);

    // Present to overlay canvas
    const textureView = gpu.context.getCurrentTexture().createView();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });
    renderer.presentTexture(renderPass, scene.litView);
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
    depthTexture?.destroy();
    gpu.device.destroy();
    canvas.remove();
  }

  return {
    setCameraMatrices,
    loadPly,
    loadManifest,
    loadAttributes,
    start,
    stop,
    destroy,
    canvas,
    get scene() { return scene; },
  };
}
