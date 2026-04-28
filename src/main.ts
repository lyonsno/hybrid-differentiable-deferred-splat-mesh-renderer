import { initGPU, resizeCanvas, GPU } from "./gpu.js";
import { createCamera, bindCameraControls, updateCamera, getViewMatrix, getProjectionMatrix } from "./camera.js";
import { createStorageBuffer, createUniformBuffer } from "./buffers.js";
import { createTimestamps, resolveTimestamps, readTimestamps, TimestampHelper } from "./timestamps.js";
import {
  REAL_SCANIVERSE_MIN_RADIUS_PX,
  REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  REAL_SCANIVERSE_SPLAT_SCALE,
  composeFirstSmokeViewProjection,
  configureCameraForSplatBounds,
  createMeshSplatSmokeEvidence,
  exposeMeshSplatSmokeEvidence,
} from "./realSmokeScene.js";
import {
  createSplatPlateRenderer,
  SPLAT_PLATE_FRAME_UNIFORM_BYTES,
  writeSplatPlateFrameUniforms,
} from "./splatPlateRenderer.js";
import { createSplatSortRefreshState, refreshSplatSortForView } from "./splatSort.js";
import { fetchFirstSmokeSplatPayload, uploadSplatAttributeBuffers } from "./splats.js";

const statsEl = document.getElementById("stats")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const CPU_SORT_REFRESH_MIN_INTERVAL_MS = 125;

async function main() {
  const gpu = await initGPU(canvas);
  const cam = createCamera();
  bindCameraControls(cam, canvas);

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
  statsEl.textContent = "Loading real Scaniverse splats...";
  const assetPath = selectedSplatAssetPath();
  const splatAttributes = await fetchFirstSmokeSplatPayload(assetPath);
  configureCameraForSplatBounds(cam, splatAttributes.bounds);
  updateCamera(cam, 0);
  const initialView = getViewMatrix(cam);
  const sortState = createSplatSortRefreshState(splatAttributes.positions, initialView);
  const splatBuffers = uploadSplatAttributeBuffers(gpu.device, splatAttributes);
  const sortedIndexBuffer = createStorageBuffer(
    gpu.device,
    sortState.sortedIds.buffer as ArrayBuffer,
    "first_smoke_sorted_splat_ids"
  );
  const splatBindGroup = splatRenderer.createBindGroup({
    positionBuffer: splatBuffers.positionBuffer,
    colorBuffer: splatBuffers.colorBuffer,
    opacityBuffer: splatBuffers.opacityBuffer,
    radiusBuffer: splatBuffers.radiusBuffer,
    scaleBuffer: splatBuffers.scaleBuffer,
    rotationBuffer: splatBuffers.rotationBuffer,
    sortedIndexBuffer,
  });
  const splatCount = splatAttributes.count;
  exposeMeshSplatSmokeEvidence(
    createMeshSplatSmokeEvidence(splatAttributes, sortState.sortedIds, assetPath),
    canvas
  );

  let depthTexture: GPUTexture | null = null;

  let lastTime = performance.now();
  let frameCount = 0;
  let fpsAccum = 0;
  let displayFps = 0;
  let gpuTimings: Map<string, number> = new Map();

  async function frame() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    frameCount++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      displayFps = Math.round(frameCount / fpsAccum);
      frameCount = 0;
      fpsAccum = 0;
    }

    updateCamera(cam, dt);

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
    if (
      refreshSplatSortForView(splatAttributes.positions, view, sortState, {
        minIntervalMs: CPU_SORT_REFRESH_MIN_INTERVAL_MS,
        nowMs: now,
      })
    ) {
      gpu.device.queue.writeBuffer(sortedIndexBuffer, 0, sortState.sortedIds);
    }
    writeSplatPlateFrameUniforms(
      uniformData,
      viewProj,
      width,
      height,
      REAL_SCANIVERSE_SPLAT_SCALE,
      REAL_SCANIVERSE_MIN_RADIUS_PX
    );
    gpu.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = gpu.device.createCommandEncoder();

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

    renderPass.setBindGroup(0, bindGroup);
    splatRenderer.draw(renderPass, splatBindGroup, splatCount);
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
    let statsText = `${width}×${height} | ${displayFps} fps | ${splatCount.toLocaleString()} real Scaniverse splats`;
    if (gpuTimings.size > 0) {
      for (const [label, ms] of gpuTimings) {
        statsText += ` | ${label}: ${ms.toFixed(2)}ms`;
      }
    }
    statsEl.textContent = statsText;

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function selectedSplatAssetPath(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("asset") || REAL_SCANIVERSE_SMOKE_ASSET_PATH;
}

main().catch((err) => {
  document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:16px">${err.message}\n\n${err.stack}</pre>`;
});
