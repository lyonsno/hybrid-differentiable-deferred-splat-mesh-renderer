export const SLAB_FOOTPRINT_STATUS = {
  rejectCenter: "reject-center",
  axisCrossesNearPlane: "axis-crosses-near-plane",
  pathologicalFootprint: "pathological-footprint",
  accepted: "accepted",
};

export const SLAB_RECOMMENDATION = {
  reject: "reject",
  sliceOrLod: "slice-or-lod",
  lodOrClamp: "lod-or-clamp",
  keep: "keep",
};

const DEFAULT_MIN_CLIP_W = 0.0001;
const DEFAULT_SPLAT_SCALE_DIVISOR = 600;
const DEFAULT_MAX_FOOTPRINT_RATIO = 0.65;

export function classifySlabSplatFootprint(input) {
  const centerClip = readClipVec(input.centerClip, "centerClip");
  const axisEndpointClips = input.axisEndpointClips ?? [];
  if (!Array.isArray(axisEndpointClips) || axisEndpointClips.length === 0) {
    throw new Error("axisEndpointClips must contain at least one clip-space endpoint");
  }

  const viewportMinPx = readPositiveNumber(input.viewportMinPx, "viewportMinPx");
  const minClipW = input.minClipW ?? DEFAULT_MIN_CLIP_W;
  const splatScale = input.splatScale ?? 1;
  const splatScaleDivisor = input.splatScaleDivisor ?? DEFAULT_SPLAT_SCALE_DIVISOR;
  const maxFootprintPx = input.maxFootprintPx ?? viewportMinPx * DEFAULT_MAX_FOOTPRINT_RATIO;

  readPositiveNumber(minClipW, "minClipW");
  readPositiveNumber(splatScale, "splatScale");
  readPositiveNumber(splatScaleDivisor, "splatScaleDivisor");
  readPositiveNumber(maxFootprintPx, "maxFootprintPx");

  if (!centerInsideClip(centerClip, minClipW)) {
    return {
      status: SLAB_FOOTPRINT_STATUS.rejectCenter,
      recommendation: SLAB_RECOMMENDATION.reject,
      reason: "center outside clip volume",
      maxFootprintPx,
      majorRadiusPx: 0,
      crossingAxes: axisEndpointClips.length,
    };
  }

  const centerNdc = [centerClip[0] / centerClip[3], centerClip[1] / centerClip[3]];
  const projectedAxes = [];
  let crossingAxes = 0;

  for (const endpoint of axisEndpointClips) {
    const endpointClip = readClipVec(endpoint, "axisEndpointClips[]");
    if (!centerInsideClip(endpointClip, minClipW)) {
      crossingAxes += 1;
      continue;
    }
    projectedAxes.push([
      endpointClip[0] / endpointClip[3] - centerNdc[0],
      endpointClip[1] / endpointClip[3] - centerNdc[1],
    ]);
  }

  const footprint = estimateFootprintRadiusPx(projectedAxes, viewportMinPx, splatScale, splatScaleDivisor);

  if (crossingAxes > 0) {
    return {
      status: SLAB_FOOTPRINT_STATUS.axisCrossesNearPlane,
      recommendation: SLAB_RECOMMENDATION.sliceOrLod,
      reason: "at least one covariance axis endpoint crosses the near plane before projection",
      maxFootprintPx,
      majorRadiusPx: footprint.majorRadiusPx,
      crossingAxes,
    };
  }

  if (footprint.majorRadiusPx > maxFootprintPx) {
    return {
      status: SLAB_FOOTPRINT_STATUS.pathologicalFootprint,
      recommendation: SLAB_RECOMMENDATION.lodOrClamp,
      reason: "projected covariance footprint exceeds the configured screen cap",
      maxFootprintPx,
      majorRadiusPx: footprint.majorRadiusPx,
      crossingAxes,
    };
  }

  return {
    status: SLAB_FOOTPRINT_STATUS.accepted,
    recommendation: SLAB_RECOMMENDATION.keep,
    reason: "center and covariance endpoints are projectable inside the footprint cap",
    maxFootprintPx,
    majorRadiusPx: footprint.majorRadiusPx,
    crossingAxes,
  };
}

export function estimateFootprintRadiusPx(projectedAxes, viewportMinPx, splatScale = 1, splatScaleDivisor = DEFAULT_SPLAT_SCALE_DIVISOR) {
  if (!Array.isArray(projectedAxes)) {
    throw new Error("projectedAxes must be an array");
  }
  readPositiveNumber(viewportMinPx, "viewportMinPx");
  readPositiveNumber(splatScale, "splatScale");
  readPositiveNumber(splatScaleDivisor, "splatScaleDivisor");

  let a = 0;
  let b = 0;
  let d = 0;
  for (const axis of projectedAxes) {
    if (!Array.isArray(axis) || axis.length !== 2) {
      throw new Error("projected axis must be a two-element vector");
    }
    const x = readFiniteNumber(axis[0], "projected axis x");
    const y = readFiniteNumber(axis[1], "projected axis y");
    a += x * x;
    b += x * y;
    d += y * y;
  }

  const trace = 0.5 * (a + d);
  const diff = 0.5 * (a - d);
  const root = Math.sqrt(diff * diff + b * b);
  const lambda0 = Math.max(trace + root, 0);
  const radiusNdc = Math.sqrt(lambda0) * (splatScale / splatScaleDivisor);

  return {
    majorRadiusPx: radiusNdc * viewportMinPx * 0.5,
    majorRadiusNdc: radiusNdc,
  };
}

function centerInsideClip(clip, minClipW) {
  return clip[3] > minClipW && clip[2] >= 0 && clip[2] <= clip[3];
}

function readClipVec(value, name) {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(`${name} must be a four-element clip-space vector`);
  }
  return value.map((component, index) => readFiniteNumber(component, `${name}[${index}]`));
}

function readPositiveNumber(value, name) {
  const number = readFiniteNumber(value, name);
  if (number <= 0) {
    throw new Error(`${name} must be positive`);
  }
  return number;
}

function readFiniteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
  return value;
}
