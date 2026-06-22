import brdfLutShader from "./shaders/ibl_brdf_lut.wgsl?raw";
import mipgenShader from "./shaders/ibl_mipgen.wgsl?raw";

export interface IBLResources {
  readonly brdfLUT: GPUTexture;
  readonly brdfLUTView: GPUTextureView;
  readonly envTexture: GPUTexture;
  readonly envTextureView: GPUTextureView;
  readonly envSampler: GPUSampler;
  readonly hasEnvironment: boolean;
  loadEquirectHDR(data: ArrayBuffer, width: number, height: number): void;
  loadEquirectRGBA(data: Float32Array, width: number, height: number): void;
  destroy(): void;
}

const BRDF_LUT_SIZE = 256;

export function createIBL(device: GPUDevice): IBLResources {
  // --- BRDF LUT generation ---
  const brdfLUT = device.createTexture({
    label: "brdf_lut",
    size: [BRDF_LUT_SIZE, BRDF_LUT_SIZE],
    format: "rgba16float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });

  const brdfModule = device.createShaderModule({ label: "ibl_brdf_lut", code: brdfLutShader });
  const brdfBGL = device.createBindGroupLayout({
    label: "brdf_lut_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });
  const brdfPipeline = device.createComputePipeline({
    label: "brdf_lut_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [brdfBGL] }),
    compute: { module: brdfModule, entryPoint: "main" },
  });
  const brdfParamsBuffer = device.createBuffer({
    label: "brdf_lut_params",
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(brdfParamsBuffer, 0, new Uint32Array([BRDF_LUT_SIZE, 0, 0, 0]));

  // Generate BRDF LUT immediately
  const brdfBG = device.createBindGroup({
    layout: brdfBGL,
    entries: [
      { binding: 0, resource: brdfLUT.createView() },
      { binding: 1, resource: { buffer: brdfParamsBuffer } },
    ],
  });
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass({ label: "brdf_lut_gen" });
  pass.setPipeline(brdfPipeline);
  pass.setBindGroup(0, brdfBG);
  pass.dispatchWorkgroups(Math.ceil(BRDF_LUT_SIZE / 8), Math.ceil(BRDF_LUT_SIZE / 8));
  pass.end();
  device.queue.submit([encoder.finish()]);
  brdfParamsBuffer.destroy();

  // --- Mip chain generator ---
  const mipModule = device.createShaderModule({ label: "ibl_mipgen", code: mipgenShader });
  const mipBGL = device.createBindGroupLayout({
    label: "ibl_mipgen_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "unfilterable-float" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
    ],
  });
  const mipPipeline = device.createComputePipeline({
    label: "ibl_mipgen_pipeline",
    layout: device.createPipelineLayout({ bindGroupLayouts: [mipBGL] }),
    compute: { module: mipModule, entryPoint: "main" },
  });

  // --- Environment texture (equirect) ---
  // Start with a 1x1 white placeholder; replaced when loadEquirectHDR is called
  let envTexture = device.createTexture({
    label: "env_equirect",
    size: [1, 1],
    format: "rgba16float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  let envTextureView = envTexture.createView();
  let hasEnvironment = false;

  const envSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "clamp-to-edge",
  });

  return {
    brdfLUT,
    brdfLUTView: brdfLUT.createView(),
    get envTexture() { return envTexture; },
    get envTextureView() { return envTextureView; },
    envSampler,
    get hasEnvironment() { return hasEnvironment; },

    loadEquirectRGBA(data: Float32Array, width: number, height: number) {
      envTexture.destroy();
      const mipCount = Math.floor(Math.log2(Math.max(width, height))) + 1;
      envTexture = device.createTexture({
        label: "env_equirect",
        size: [width, height],
        mipLevelCount: mipCount,
        format: "rgba16float",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING,
      });
      // Convert f32 RGBA to f16 for upload (mip 0)
      const f16Data = new Uint16Array(width * height * 4);
      for (let i = 0; i < data.length; i++) {
        f16Data[i] = f32ToF16(data[i]);
      }
      device.queue.writeTexture(
        { texture: envTexture, mipLevel: 0 },
        f16Data,
        { bytesPerRow: width * 8 },
        { width, height },
      );

      // Generate mip chain via compute downsample
      const mipEncoder = device.createCommandEncoder({ label: "env_mipgen" });
      let mipW = width;
      let mipH = height;
      for (let level = 1; level < mipCount; level++) {
        const srcView = envTexture.createView({ baseMipLevel: level - 1, mipLevelCount: 1 });
        const dstView = envTexture.createView({ baseMipLevel: level, mipLevelCount: 1 });
        mipW = Math.max(1, mipW >> 1);
        mipH = Math.max(1, mipH >> 1);
        const bg = device.createBindGroup({
          layout: mipBGL,
          entries: [
            { binding: 0, resource: srcView },
            { binding: 1, resource: dstView },
          ],
        });
        const pass = mipEncoder.beginComputePass({ label: `env_mip_${level}` });
        pass.setPipeline(mipPipeline);
        pass.setBindGroup(0, bg);
        pass.dispatchWorkgroups(Math.ceil(mipW / 8), Math.ceil(mipH / 8));
        pass.end();
      }
      device.queue.submit([mipEncoder.finish()]);

      envTextureView = envTexture.createView();
      hasEnvironment = true;
      console.log(`Environment mip chain: ${mipCount} levels from ${width}x${height}`);
    },

    loadEquirectHDR(data: ArrayBuffer, width: number, height: number) {
      // Parse Radiance HDR (.hdr) RGBE format
      const rgbaF32 = decodeRadianceHDR(data, width, height);
      this.loadEquirectRGBA(rgbaF32, width, height);
    },

    destroy() {
      brdfLUT.destroy();
      envTexture.destroy();
    },
  };
}

/** Convert f32 to IEEE 754 half-precision (f16), returned as u16. */
function f32ToF16(value: number): number {
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  f32[0] = value;
  const bits = u32[0];
  const sign = (bits >>> 16) & 0x8000;
  const exp = ((bits >>> 23) & 0xFF) - 127 + 15;
  const frac = bits & 0x7FFFFF;
  if (exp <= 0) return sign;
  if (exp >= 31) return sign | 0x7C00;
  return sign | (exp << 10) | (frac >>> 13);
}

/** Decode Radiance .hdr (RGBE) format into RGBA float32 array. */
function decodeRadianceHDR(buffer: ArrayBuffer, expectedWidth: number, expectedHeight: number): Float32Array {
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  // Skip header lines until empty line
  while (offset < bytes.length) {
    let lineEnd = offset;
    while (lineEnd < bytes.length && bytes[lineEnd] !== 10) lineEnd++;
    const line = String.fromCharCode(...bytes.slice(offset, lineEnd));
    offset = lineEnd + 1;
    if (line.trim() === "" || line.startsWith("-Y") || line.startsWith("+Y")) {
      if (line.startsWith("-Y") || line.startsWith("+Y")) {
        // Found resolution line, data follows
        break;
      }
    }
  }

  const width = expectedWidth;
  const height = expectedHeight;
  const result = new Float32Array(width * height * 4);

  // Decode scanlines (supports both uncompressed and RLE)
  for (let y = 0; y < height; y++) {
    const scanline = new Uint8Array(width * 4);

    if (offset + 4 <= bytes.length && bytes[offset] === 2 && bytes[offset + 1] === 2) {
      // New RLE format
      offset += 4; // skip 2, 2, width_hi, width_lo
      for (let ch = 0; ch < 4; ch++) {
        let x = 0;
        while (x < width) {
          const code = bytes[offset++];
          if (code > 128) {
            const count = code - 128;
            const val = bytes[offset++];
            for (let i = 0; i < count; i++) {
              scanline[x * 4 + ch] = val;
              x++;
            }
          } else {
            for (let i = 0; i < code; i++) {
              scanline[x * 4 + ch] = bytes[offset++];
              x++;
            }
          }
        }
      }
    } else {
      // Uncompressed
      for (let x = 0; x < width; x++) {
        scanline[x * 4] = bytes[offset++];
        scanline[x * 4 + 1] = bytes[offset++];
        scanline[x * 4 + 2] = bytes[offset++];
        scanline[x * 4 + 3] = bytes[offset++];
      }
    }

    // Convert RGBE to float
    for (let x = 0; x < width; x++) {
      const r = scanline[x * 4];
      const g = scanline[x * 4 + 1];
      const b = scanline[x * 4 + 2];
      const e = scanline[x * 4 + 3];
      const idx = (y * width + x) * 4;
      if (e === 0) {
        result[idx] = 0; result[idx + 1] = 0; result[idx + 2] = 0; result[idx + 3] = 1;
      } else {
        const scale = Math.pow(2, e - 128 - 8);
        result[idx] = r * scale;
        result[idx + 1] = g * scale;
        result[idx + 2] = b * scale;
        result[idx + 3] = 1;
      }
    }
  }

  return result;
}

/** Parse .hdr header to extract width and height. */
export function parseHDRHeader(buffer: ArrayBuffer): { width: number; height: number } {
  const bytes = new Uint8Array(buffer);
  const text = String.fromCharCode(...bytes.slice(0, Math.min(bytes.length, 512)));
  const match = text.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
  if (!match) throw new Error("Could not parse HDR resolution from header");
  return { width: parseInt(match[2], 10), height: parseInt(match[1], 10) };
}
