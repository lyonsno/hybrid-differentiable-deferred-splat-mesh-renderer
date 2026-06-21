import depthPrefilterShader from "./shaders/gtao_depth_prefilter.wgsl?raw";
import gtaoMainShader from "./shaders/gtao_main.wgsl?raw";
import gtaoDenoiseShader from "./shaders/gtao_denoise.wgsl?raw";

export interface GTAOParams {
  radiusWorld: number;
  falloffEnd: number;
  intensity: number;
  thickness: number;
  sliceCount: number;
  stepsPerSlice: number;
  denoiseStrength: number;
}

export const DEFAULT_GTAO_PARAMS: GTAOParams = {
  radiusWorld: 0.15,
  falloffEnd: 1.0,
  intensity: 1.5,
  thickness: 1.81,
  sliceCount: 3,
  stepsPerSlice: 4,
  denoiseStrength: 60.0,
};

export interface GTAOResources {
  readonly aoTexture: GPUTexture;
  readonly aoView: GPUTextureView;
  encode(
    encoder: GPUCommandEncoder,
    depthView: GPUTextureView,
    normalView: GPUTextureView,
    viewport: [number, number],
    near: number,
    far: number,
    projMatrix: Float32Array,
    viewMatrix: Float32Array,
    params: GTAOParams,
    frameCounter: number,
  ): void;
  destroy(): void;
}

export function createGTAO(device: GPUDevice, width: number, height: number): GTAOResources {
  // Shader modules
  const prefilterModule = device.createShaderModule({ label: "gtao_depth_prefilter", code: depthPrefilterShader });
  const gtaoModule = device.createShaderModule({ label: "gtao_main", code: gtaoMainShader });
  const denoiseModule = device.createShaderModule({ label: "gtao_denoise", code: gtaoDenoiseShader });

  // Bind group layouts
  const prefilterBGL = device.createBindGroupLayout({
    label: "gtao_prefilter_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32float" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32float" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });

  const gtaoBGL = device.createBindGroupLayout({
    label: "gtao_main_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "uint" } }, // G-buffer normals
      { binding: 4, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32float" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });

  const denoiseBGL = device.createBindGroupLayout({
    label: "gtao_denoise_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32float" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });

  // Pipelines
  const prefilterPipeline = device.createComputePipeline({
    label: "gtao_prefilter",
    layout: device.createPipelineLayout({ bindGroupLayouts: [prefilterBGL] }),
    compute: { module: prefilterModule, entryPoint: "main" },
  });

  const gtaoPipeline = device.createComputePipeline({
    label: "gtao_main",
    layout: device.createPipelineLayout({ bindGroupLayouts: [gtaoBGL] }),
    compute: { module: gtaoModule, entryPoint: "main" },
  });

  const denoisePipeline = device.createComputePipeline({
    label: "gtao_denoise",
    layout: device.createPipelineLayout({ bindGroupLayouts: [denoiseBGL] }),
    compute: { module: denoiseModule, entryPoint: "main" },
  });

  // Textures
  const mip0 = device.createTexture({
    label: "gtao_mip0", size: [width, height], format: "r32float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });
  const mip1 = device.createTexture({
    label: "gtao_mip1", size: [Math.ceil(width / 2), Math.ceil(height / 2)], format: "r32float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });
  const mip2 = device.createTexture({
    label: "gtao_mip2", size: [Math.ceil(width / 4), Math.ceil(height / 4)], format: "r32float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });
  const aoRaw = device.createTexture({
    label: "gtao_raw", size: [width, height], format: "r32float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });
  const aoFinal = device.createTexture({
    label: "gtao_final", size: [width, height], format: "r32float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });

  // No sampler needed — using textureLoad instead of textureSampleLevel

  // Uniform buffers
  const prefilterUB = device.createBuffer({ label: "gtao_prefilter_ub", size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const gtaoUB = device.createBuffer({ label: "gtao_main_ub", size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const denoiseUB = device.createBuffer({ label: "gtao_denoise_ub", size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  return {
    aoTexture: aoFinal,
    aoView: aoFinal.createView(),

    encode(
      encoder: GPUCommandEncoder,
      depthView: GPUTextureView,
      normalView: GPUTextureView,
      viewport: [number, number],
      near: number,
      far: number,
      projMatrix: Float32Array,
      viewMatrix: Float32Array,
      params: GTAOParams,
      frameCounter: number,
    ) {
      const [w, h] = viewport;

      // Prefilter uniforms
      device.queue.writeBuffer(prefilterUB, 0, new Float32Array([near, far, w, h]));

      // GTAO uniforms
      // projInfo maps UV [0,1] → view-space XY at unit depth.
      // Our renderer has Y-down screen coords (UV 0,0 = top-left), so we negate projInfo.y/w.
      const projInfo = new Float32Array([
        2.0 / projMatrix[0],    // 2 / proj[0][0]
        -2.0 / projMatrix[5],   // -2 / proj[1][1] (Y-flip for top-left origin)
        -1.0 / projMatrix[0],   // -1 / proj[0][0]
        1.0 / projMatrix[5],    // 1 / proj[1][1] (Y-flip)
      ]);
      const gtaoF32 = new Float32Array(32); // 16 scalars/pad + 16 mat4 = 128 bytes
      gtaoF32.set(projInfo, 0);
      gtaoF32[4] = w;
      gtaoF32[5] = h;
      gtaoF32[6] = params.radiusWorld;
      gtaoF32[7] = params.falloffEnd;
      const gtaoU32 = new Uint32Array(gtaoF32.buffer);
      gtaoU32[8] = params.sliceCount;
      gtaoU32[9] = params.stepsPerSlice;
      gtaoU32[10] = frameCounter;
      gtaoF32[11] = params.intensity;
      gtaoF32[12] = params.thickness;
      // [13-15] = pad (vec3f)
      gtaoF32.set(viewMatrix, 16); // viewMatrix at float index 16 (byte offset 64)
      device.queue.writeBuffer(gtaoUB, 0, gtaoF32);

      // Denoise uniforms
      device.queue.writeBuffer(denoiseUB, 0, new Float32Array([w, h, params.denoiseStrength, 0]));

      // Pass 1: Depth prefilter
      {
        const bg = device.createBindGroup({
          layout: prefilterBGL,
          entries: [
            { binding: 0, resource: depthView },
            { binding: 1, resource: mip0.createView() },
            { binding: 2, resource: mip1.createView() },
            { binding: 3, resource: mip2.createView() },
            { binding: 4, resource: { buffer: prefilterUB } },
          ],
        });
        const pass = encoder.beginComputePass({ label: "gtao_prefilter" });
        pass.setPipeline(prefilterPipeline);
        pass.setBindGroup(0, bg);
        pass.dispatchWorkgroups(Math.ceil(w / 16), Math.ceil(h / 16));
        pass.end();
      }

      // Pass 2: GTAO main
      {
        const bg = device.createBindGroup({
          layout: gtaoBGL,
          entries: [
            { binding: 0, resource: mip0.createView() },
            { binding: 1, resource: mip1.createView() },
            { binding: 2, resource: mip2.createView() },
            { binding: 3, resource: normalView },
            { binding: 4, resource: aoRaw.createView() },
            { binding: 5, resource: { buffer: gtaoUB } },
          ],
        });
        const pass = encoder.beginComputePass({ label: "gtao_main" });
        pass.setPipeline(gtaoPipeline);
        pass.setBindGroup(0, bg);
        pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
        pass.end();
      }

      // Pass 3: Denoise
      {
        const bg = device.createBindGroup({
          layout: denoiseBGL,
          entries: [
            { binding: 0, resource: aoRaw.createView() },
            { binding: 1, resource: mip0.createView() },
            { binding: 2, resource: aoFinal.createView() },
            { binding: 3, resource: { buffer: denoiseUB } },
          ],
        });
        const pass = encoder.beginComputePass({ label: "gtao_denoise" });
        pass.setPipeline(denoisePipeline);
        pass.setBindGroup(0, bg);
        pass.dispatchWorkgroups(Math.ceil(w / 16), Math.ceil(h / 16));
        pass.end();
      }
    },

    destroy() {
      mip0.destroy();
      mip1.destroy();
      mip2.destroy();
      aoRaw.destroy();
      aoFinal.destroy();
      prefilterUB.destroy();
      gtaoUB.destroy();
      denoiseUB.destroy();
    },
  };
}
