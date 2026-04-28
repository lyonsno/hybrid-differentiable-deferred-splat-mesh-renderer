export const SPLAT_PLATE_VERTICES_PER_SPLAT = 6;
export const SPLAT_PLATE_FRAME_UNIFORM_BYTES = 80;
export const SPLAT_PLATE_SPLAT_ROW_BYTES = 32;
export const SPLAT_PLATE_BUFFER_BINDINGS = {
  positions: 0,
  colors: 1,
  opacities: 2,
  radii: 3,
  sortedIndices: 4,
} as const;

export interface SplatPlateDrawCall {
  vertexCount: number;
  instanceCount: number;
}

export function getSplatPlateDrawCall(splatCount: number): SplatPlateDrawCall | null {
  if (!Number.isInteger(splatCount) || splatCount < 0) {
    throw new Error("Splat count must be a non-negative integer");
  }

  if (splatCount === 0) {
    return null;
  }

  return {
    vertexCount: SPLAT_PLATE_VERTICES_PER_SPLAT,
    instanceCount: splatCount,
  };
}

export function writeSplatPlateFrameUniforms(
  target: Float32Array,
  viewProj: Float32Array,
  width: number,
  height: number,
  splatScale = 1,
  minRadiusPx = 1.5
): void {
  if (target.length < SPLAT_PLATE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT) {
    throw new Error("Splat plate frame uniform target is too small");
  }

  target.set(viewProj, 0);
  target[16] = width;
  target[17] = height;
  target[18] = splatScale;
  target[19] = minRadiusPx;
}
