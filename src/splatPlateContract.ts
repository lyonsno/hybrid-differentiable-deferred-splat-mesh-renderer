export const SPLAT_PLATE_VERTICES_PER_SPLAT = 6;
export const SPLAT_PLATE_FRAME_UNIFORM_BYTES = 96;
export const SPLAT_PLATE_SPLAT_ROW_BYTES = 32;
export const SPLAT_PLATE_BUFFER_BINDINGS = {
  positions: 0,
  colors: 1,
  opacities: 2,
  scales: 3,
  rotations: 4,
  sortedIndices: 5,
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

export function computeSplatPlateRadiusPx(
  radius: number,
  clipW: number,
  splatScale = 1,
  minRadiusPx = 1.5
): number {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new Error("Splat radius must be a finite non-negative number");
  }
  if (!Number.isFinite(clipW)) {
    throw new Error("Splat clip w must be finite");
  }
  if (!Number.isFinite(splatScale) || splatScale < 0) {
    throw new Error("Splat scale must be a finite non-negative number");
  }
  if (!Number.isFinite(minRadiusPx) || minRadiusPx < 0) {
    throw new Error("Minimum splat radius must be a finite non-negative number");
  }

  const safeW = Math.max(Math.abs(clipW), 0.001);
  return Math.max((radius * splatScale) / safeW, minRadiusPx);
}

export function writeSplatPlateFrameUniforms(
  target: Float32Array,
  viewProj: Float32Array,
  width: number,
  height: number,
  splatScale = 1,
  minRadiusPx = 1.5,
  nearFadeStartNdc = 0,
  nearFadeEndNdc = 0.08
): void {
  if (target.length < SPLAT_PLATE_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT) {
    throw new Error("Splat plate frame uniform target is too small");
  }

  target.set(viewProj, 0);
  target[16] = width;
  target[17] = height;
  target[18] = splatScale;
  target[19] = minRadiusPx;
  target[20] = nearFadeStartNdc;
  target[21] = nearFadeEndNdc;
  target[22] = 0;
  target[23] = 0;
}
