import bloomThresholdShader from "./shaders/bloom_threshold.wgsl?raw";
import bloomBlurShader from "./shaders/bloom_blur.wgsl?raw";

export interface BloomParams {
  threshold: number;
  softKnee: number;
  intensity: number;
}

export const DEFAULT_BLOOM_PARAMS: BloomParams = {
  threshold: 0.8,
  softKnee: 0.5,
  intensity: 0.5,
};

export interface BloomResources {
  readonly bloomTexture: GPUTexture;
  readonly bloomView: GPUTextureView;
  encode(
    encoder: GPUCommandEncoder,
    materialView: GPUTextureView,
    viewport: [number, number],
    params: BloomParams,
    emissiveIntensity: number,
  ): void;
  destroy(): void;
}

export function createBloom(device: GPUDevice, width: number, height: number): BloomResources {
  const halfW = Math.ceil(width / 2);
  const halfH = Math.ceil(height / 2);

  // Shader modules
  const thresholdModule = device.createShaderModule({ label: "bloom_threshold", code: bloomThresholdShader });
  const blurModule = device.createShaderModule({ label: "bloom_blur", code: bloomBlurShader });

  // Threshold pass BGL
  const thresholdBGL = device.createBindGroupLayout({
    label: "bloom_threshold_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "uint" } }, // material G-buffer
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });

  // Blur pass BGL
  const blurBGL = device.createBindGroupLayout({
    label: "bloom_blur_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, sampler: { type: "filtering" } },
    ],
  });

  // Pipelines
  const thresholdPipeline = device.createComputePipeline({
    label: "bloom_threshold",
    layout: device.createPipelineLayout({ bindGroupLayouts: [thresholdBGL] }),
    compute: { module: thresholdModule, entryPoint: "main" },
  });

  const blurPipeline = device.createComputePipeline({
    label: "bloom_blur",
    layout: device.createPipelineLayout({ bindGroupLayouts: [blurBGL] }),
    compute: { module: blurModule, entryPoint: "main" },
  });

  // Textures: bloom source (half-res) + ping-pong for blur
  const bloomA = device.createTexture({
    label: "bloom_a", size: [halfW, halfH], format: "rgba16float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });
  const bloomB = device.createTexture({
    label: "bloom_b", size: [halfW, halfH], format: "rgba16float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });

  const blurSampler = device.createSampler({
    magFilter: "linear", minFilter: "linear",
    addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge",
  });

  // Uniform buffers
  const thresholdUB = device.createBuffer({
    label: "bloom_threshold_ub", size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const blurHorizUB = device.createBuffer({
    label: "bloom_blur_horiz_ub", size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const blurVertUB = device.createBuffer({
    label: "bloom_blur_vert_ub", size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return {
    bloomTexture: bloomA, // final bloom result after vertical blur writes back to A
    bloomView: bloomA.createView(),

    encode(
      encoder: GPUCommandEncoder,
      materialView: GPUTextureView,
      viewport: [number, number],
      params: BloomParams,
      emissiveIntensity: number,
    ) {
      const [w, h] = viewport;
      const hw = Math.ceil(w / 2);
      const hh = Math.ceil(h / 2);

      // Threshold: extract emissive pixels from material G-buffer to half-res bloomA
      device.queue.writeBuffer(thresholdUB, 0, new Float32Array([params.threshold, params.softKnee, emissiveIntensity, 0]));
      {
        const bg = device.createBindGroup({
          layout: thresholdBGL,
          entries: [
            { binding: 0, resource: materialView },
            { binding: 1, resource: bloomA.createView() },
            { binding: 2, resource: { buffer: thresholdUB } },
          ],
        });
        const pass = encoder.beginComputePass({ label: "bloom_threshold" });
        pass.setPipeline(thresholdPipeline);
        pass.setBindGroup(0, bg);
        pass.dispatchWorkgroups(Math.ceil(hw / 8), Math.ceil(hh / 8));
        pass.end();
      }

      // Horizontal blur: bloomA → bloomB
      device.queue.writeBuffer(blurHorizUB, 0, new Float32Array([1.0 / hw, 0, 1.0 / hw, 1.0 / hh]));
      {
        const bg = device.createBindGroup({
          layout: blurBGL,
          entries: [
            { binding: 0, resource: bloomA.createView() },
            { binding: 1, resource: bloomB.createView() },
            { binding: 2, resource: { buffer: blurHorizUB } },
            { binding: 3, resource: blurSampler },
          ],
        });
        const pass = encoder.beginComputePass({ label: "bloom_blur_h" });
        pass.setPipeline(blurPipeline);
        pass.setBindGroup(0, bg);
        pass.dispatchWorkgroups(Math.ceil(hw / 8), Math.ceil(hh / 8));
        pass.end();
      }

      // Vertical blur: bloomB → bloomA
      device.queue.writeBuffer(blurVertUB, 0, new Float32Array([0, 1.0 / hh, 1.0 / hw, 1.0 / hh]));
      {
        const bg = device.createBindGroup({
          layout: blurBGL,
          entries: [
            { binding: 0, resource: bloomB.createView() },
            { binding: 1, resource: bloomA.createView() },
            { binding: 2, resource: { buffer: blurVertUB } },
            { binding: 3, resource: blurSampler },
          ],
        });
        const pass = encoder.beginComputePass({ label: "bloom_blur_v" });
        pass.setPipeline(blurPipeline);
        pass.setBindGroup(0, bg);
        pass.dispatchWorkgroups(Math.ceil(hw / 8), Math.ceil(hh / 8));
        pass.end();
      }
    },

    destroy() {
      bloomA.destroy();
      bloomB.destroy();
      thresholdUB.destroy();
      blurHorizUB.destroy();
      blurVertUB.destroy();
    },
  };
}
