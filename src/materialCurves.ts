const LUT_SIZE = 256;

export interface MaterialCurveParams {
  contrast: number;   // 0 = flat, 1 = identity, 2 = high contrast
  brightness: number; // -1 to 1, added after contrast
  gamma: number;      // 0.1 to 3.0, < 1 brightens midtones, > 1 darkens
}

export const DEFAULT_CURVE: MaterialCurveParams = {
  contrast: 1.0,
  brightness: 0.0,
  gamma: 1.0,
};

export interface MaterialCurves {
  readonly roughnessLUT: GPUTexture;
  readonly metalnessLUT: GPUTexture;
  readonly albedoLUT: GPUTexture;
  readonly roughnessLUTView: GPUTextureView;
  readonly metalnessLUTView: GPUTextureView;
  readonly albedoLUTView: GPUTextureView;
  update(roughness: MaterialCurveParams, metalness: MaterialCurveParams, albedo: MaterialCurveParams): void;
  destroy(): void;
}

function generateLUT(params: MaterialCurveParams): Float32Array {
  const data = new Float32Array(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) {
    let v = i / (LUT_SIZE - 1);
    // Contrast: pivot around 0.5
    v = (v - 0.5) * params.contrast + 0.5;
    // Brightness
    v += params.brightness;
    // Clamp before gamma
    v = Math.max(0, Math.min(1, v));
    // Gamma
    v = Math.pow(v, params.gamma);
    data[i] = Math.max(0, Math.min(1, v));
  }
  return data;
}

/** Convert f32 to f16 (IEEE 754 half-precision), returned as u16. */
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

function uploadLUT(device: GPUDevice, texture: GPUTexture, data: Float32Array): void {
  // Convert to rgba16float (1D textures need a supported format)
  const rgba = new Uint16Array(LUT_SIZE * 4);
  for (let i = 0; i < LUT_SIZE; i++) {
    rgba[i * 4] = f32ToF16(data[i]);
    rgba[i * 4 + 1] = 0;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = f32ToF16(1);
  }
  device.queue.writeTexture(
    { texture },
    rgba,
    { bytesPerRow: LUT_SIZE * 8 },
    { width: LUT_SIZE },
  );
}

export function createMaterialCurves(device: GPUDevice): MaterialCurves {
  const createLUTTexture = (label: string) => device.createTexture({
    label,
    size: [LUT_SIZE],
    dimension: "1d",
    format: "rgba16float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const roughnessLUT = createLUTTexture("roughness_lut");
  const metalnessLUT = createLUTTexture("metalness_lut");
  const albedoLUT = createLUTTexture("albedo_lut");

  // Initialize with identity curves
  const identity = generateLUT(DEFAULT_CURVE);
  uploadLUT(device, roughnessLUT, identity);
  uploadLUT(device, metalnessLUT, identity);
  uploadLUT(device, albedoLUT, identity);

  return {
    roughnessLUT,
    metalnessLUT,
    albedoLUT,
    roughnessLUTView: roughnessLUT.createView(),
    metalnessLUTView: metalnessLUT.createView(),
    albedoLUTView: albedoLUT.createView(),

    update(roughness: MaterialCurveParams, metalness: MaterialCurveParams, albedo: MaterialCurveParams) {
      uploadLUT(device, roughnessLUT, generateLUT(roughness));
      uploadLUT(device, metalnessLUT, generateLUT(metalness));
      uploadLUT(device, albedoLUT, generateLUT(albedo));
    },

    destroy() {
      roughnessLUT.destroy();
      metalnessLUT.destroy();
      albedoLUT.destroy();
    },
  };
}
