import { initGPU, resizeCanvas, GPU } from "./gpu.js";
import { createCamera, bindCameraControls, updateCamera, getViewMatrix, getProjectionMatrix } from "./camera.js";
import { createUniformBuffer } from "./buffers.js";
import { createTimestamps, resolveTimestamps, readTimestamps, TimestampHelper } from "./timestamps.js";
import { mulMat4 } from "./math.js";
import testCubeShader from "./shaders/test_cube.wgsl?raw";

const statsEl = document.getElementById("stats")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

async function main() {
  const gpu = await initGPU(canvas);
  const cam = createCamera();
  bindCameraControls(cam, canvas);

  const ts = createTimestamps(gpu.device, gpu.timestampsSupported);

  // Frame uniforms: mat4x4 (64 bytes) + time (4 bytes) + padding (12 bytes) = 80 bytes
  const uniformBuffer = createUniformBuffer(gpu.device, 80, "frame_uniforms");
  const uniformData = new Float32Array(20); // 80 / 4

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

  // Pipeline
  const shaderModule = gpu.device.createShaderModule({ code: testCubeShader });

  const pipeline = gpu.device.createRenderPipeline({
    layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [{ format: gpu.format }],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back",
    },
    depthStencil: {
      format: "depth32float",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

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
    const viewProj = mulMat4(proj, view);
    uniformData.set(viewProj, 0);
    uniformData[16] = now / 1000;
    gpu.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = gpu.device.createCommandEncoder();

    const textureView = gpu.context.getCurrentTexture().createView();

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
      ...(ts
        ? {
            timestampWrites: {
              querySet: ts.querySet,
              beginningOfPassWriteIndex: 0,
              endOfPassWriteIndex: 1,
            },
          }
        : {}),
    });

    if (ts) {
      ts.labels.push("render", "render_end");
    }

    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(36);
    renderPass.end();

    if (ts) {
      resolveTimestamps(encoder, ts);
    }

    gpu.device.queue.submit([encoder.finish()]);

    // Read GPU timings (async, one frame behind)
    if (ts) {
      readTimestamps(ts).then((t) => {
        gpuTimings = t;
      });
    }

    // Stats overlay
    let statsText = `${width}×${height} | ${displayFps} fps`;
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

main().catch((err) => {
  document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:16px">${err.message}\n\n${err.stack}</pre>`;
});
