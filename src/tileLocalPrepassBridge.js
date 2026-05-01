import { buildGpuTileCoverageBridge } from "./gpuTileCoverageBridge.js";
import { buildProjectedGaussianTileCoverage } from "./rendererFidelityProbes/tileCoverage.js";

export function buildTileLocalPrepassBridge({
  attributes,
  viewMatrix,
  viewProj,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  samplesPerAxis,
  splatScale,
  minRadiusPx,
  maxRefsPerTile,
  maxTileEntries,
  nearFadeEndNdc,
}) {
  if (!viewMatrix || viewMatrix.length !== 16) {
    throw new Error("viewMatrix must contain 16 values");
  }
  const splats = [];

  for (let index = 0; index < attributes.count; index++) {
    const centerPx = projectSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight);
    if (!centerPx) {
      continue;
    }
    const covariancePx = projectedSplatCovariancePx({
      attributes,
      viewProj,
      index,
      viewportWidth,
      viewportHeight,
      splatScale,
      minRadiusPx,
      nearFadeEndNdc,
    });
    if (!covariancePx) {
      continue;
    }
    splats.push({
      splatIndex: index,
      originalId: attributes.originalIds[index] ?? index,
      centerPx,
      covariancePx,
    });
  }

  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth,
    viewportHeight,
    tileSizePx,
    samplesPerAxis,
    maxTileEntries,
    splats,
  });
  const orderedCoverage = orderCoverageEntriesForView(coverage, attributes, viewMatrix);
  return buildGpuTileCoverageBridge({
    ...orderedCoverage,
    sourceSplatCount: attributes.count,
    maxRefsPerTile,
  });
}

export function captureTileLocalPrepassBridgeSignature({
  viewMatrix,
  viewProj,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  samplesPerAxis,
  splatScale,
  minRadiusPx,
  maxRefsPerTile,
  maxTileEntries,
  nearFadeEndNdc,
}) {
  return JSON.stringify({
    viewMatrix: Array.from(viewMatrix ?? []),
    viewProj: Array.from(viewProj ?? []),
    viewportWidth,
    viewportHeight,
    tileSizePx,
    samplesPerAxis,
    splatScale,
    minRadiusPx,
    maxRefsPerTile: maxRefsPerTile ?? null,
    maxTileEntries: maxTileEntries ?? null,
    nearFadeEndNdc: nearFadeEndNdc ?? null,
  });
}

export function tileLocalPrepassBridgeSignatureChanged(previousSignature, input) {
  return previousSignature !== captureTileLocalPrepassBridgeSignature(input);
}

function orderCoverageEntriesForView(coverage, attributes, viewMatrix) {
  const ranks = buildBackToFrontRanks(attributes, viewMatrix);

  const tileEntries = coverage.tileEntries.map((entry) => ({
    ...entry,
    viewRank: ranks[entry.splatIndex],
    ...computeRetentionWeights(entry, attributes),
  })).sort((left, right) => {
    return (
      left.tileIndex - right.tileIndex ||
      right.coverageWeight - left.coverageWeight ||
      ranks[left.splatIndex] - ranks[right.splatIndex] ||
      left.splatIndex - right.splatIndex ||
      left.originalId - right.originalId
    );
  });

  return {
    ...coverage,
    tileEntries,
  };
}

function computeRetentionWeights(entry, attributes) {
  const coverageWeight = Number.isFinite(entry.coverageWeight) && entry.coverageWeight > 0
    ? entry.coverageWeight
    : 0;
  const opacity = readUnitInterval(attributes.opacities?.[entry.splatIndex], 1);
  const colorBase = entry.splatIndex * 3;
  const red = readNonNegativeFinite(attributes.colors?.[colorBase], 1);
  const green = readNonNegativeFinite(attributes.colors?.[colorBase + 1], 1);
  const blue = readNonNegativeFinite(attributes.colors?.[colorBase + 2], 1);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return {
    retentionWeight: coverageWeight * opacity * luminance,
    occlusionWeight: coverageWeight * opacity,
    occlusionDensity: opacity,
  };
}

function readUnitInterval(value, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function readNonNegativeFinite(value, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
}

function buildBackToFrontRanks(attributes, viewMatrix) {
  const sortedIds = Array.from({ length: attributes.count }, (_, splatIndex) => ({
    splatIndex,
    depth:
      viewMatrix[2] * attributes.positions[splatIndex * 3] +
      viewMatrix[6] * attributes.positions[splatIndex * 3 + 1] +
      viewMatrix[10] * attributes.positions[splatIndex * 3 + 2] +
      viewMatrix[14],
  })).sort((left, right) => left.depth - right.depth || left.splatIndex - right.splatIndex);

  const ranks = new Uint32Array(Math.max(attributes.count, 1));
  ranks.fill(0xffffffff);
  for (let rank = 0; rank < sortedIds.length; rank += 1) {
    ranks[sortedIds[rank].splatIndex] = rank;
  }
  return ranks;
}

function projectedSplatCovariancePx({
  attributes,
  viewProj,
  index,
  viewportWidth,
  viewportHeight,
  splatScale,
  minRadiusPx,
  nearFadeEndNdc,
}) {
  const positionBase = index * 3;
  const center = [
    attributes.positions[positionBase],
    attributes.positions[positionBase + 1],
    attributes.positions[positionBase + 2],
  ];
  const centerClip = multiplyMat4Vec4(viewProj, [center[0], center[1], center[2], 1]);
  if (!Number.isFinite(centerClip[3]) || Math.abs(centerClip[3]) <= 0.0001) {
    return null;
  }

  const scale = [
    Math.exp(attributes.scales?.[positionBase] ?? 0),
    Math.exp(attributes.scales?.[positionBase + 1] ?? 0),
    Math.exp(attributes.scales?.[positionBase + 2] ?? 0),
  ];
  const rotationBase = index * 4;
  const rotation = normalizeQuat([
    attributes.rotations?.[rotationBase] ?? 1,
    attributes.rotations?.[rotationBase + 1] ?? 0,
    attributes.rotations?.[rotationBase + 2] ?? 0,
    attributes.rotations?.[rotationBase + 3] ?? 0,
  ]);
  const axes = [
    scaleVector(rotateAxis(rotation, [1, 0, 0]), scale[0]),
    scaleVector(rotateAxis(rotation, [0, 1, 0]), scale[1]),
    scaleVector(rotateAxis(rotation, [0, 0, 1]), scale[2]),
  ];
  if (nearPlaneSupportCrossesClip({ viewProj, center, centerClip, axes, nearFadeEndNdc })) {
    return null;
  }
  const axisScale = splatScale / 600;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const axis of axes) {
    const projected = projectAxisJacobianPx(viewProj, axis, centerClip, viewportWidth, viewportHeight);
    const ax = projected[0] * axisScale;
    const ay = projected[1] * axisScale;
    xx += ax * ax;
    xy += ax * ay;
    yy += ay * ay;
  }

  return floorCovariancePrincipalRadii({ xx, xy, yy }, minRadiusPx);
}

function floorCovariancePrincipalRadii(covariance, minRadiusPx) {
  const minVariance = minRadiusPx * minRadiusPx;
  const determinant = covariance.xx * covariance.yy - covariance.xy * covariance.xy;
  if (covariance.xx <= 0 || covariance.yy <= 0 || determinant <= 0) {
    return { xx: minVariance, xy: 0, yy: minVariance };
  }

  const trace = covariance.xx + covariance.yy;
  const discriminant = Math.sqrt(Math.max((covariance.xx - covariance.yy) ** 2 + 4 * covariance.xy * covariance.xy, 0));
  const majorVariance = 0.5 * (trace + discriminant);
  const minorVariance = 0.5 * (trace - discriminant);
  const flooredMajorVariance = Math.max(majorVariance, minVariance);
  const flooredMinorVariance = Math.max(minorVariance, minVariance);
  if (flooredMajorVariance === majorVariance && flooredMinorVariance === minorVariance) {
    return covariance;
  }

  const theta = 0.5 * Math.atan2(2 * covariance.xy, covariance.xx - covariance.yy);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cos2 = cosTheta * cosTheta;
  const sin2 = sinTheta * sinTheta;
  const xy = (flooredMajorVariance - flooredMinorVariance) * cosTheta * sinTheta;
  return {
    xx: flooredMajorVariance * cos2 + flooredMinorVariance * sin2,
    xy,
    yy: flooredMajorVariance * sin2 + flooredMinorVariance * cos2,
  };
}

function nearPlaneSupportCrossesClip({ viewProj, center, centerClip, axes, nearFadeEndNdc }) {
  if (!Number.isFinite(nearFadeEndNdc) || nearFadeEndNdc <= 0) {
    return false;
  }
  const safeW = Math.max(centerClip[3], 0.0001);
  const centerNdcDepth = centerClip[2] / safeW;
  if (centerNdcDepth > nearFadeEndNdc) {
    return false;
  }
  for (const axis of axes) {
    const positiveClip = multiplyMat4Vec4(viewProj, [center[0] + axis[0], center[1] + axis[1], center[2] + axis[2], 1]);
    const negativeClip = multiplyMat4Vec4(viewProj, [center[0] - axis[0], center[1] - axis[1], center[2] - axis[2], 1]);
    if (!clipInside(positiveClip) || !clipInside(negativeClip)) {
      return true;
    }
  }
  return false;
}

function clipInside(clip) {
  return Number.isFinite(clip[3]) && clip[3] > 0.0001 && clip[2] >= 0 && clip[2] <= clip[3];
}

function multiplyMat4Vec4(matrix, vector) {
  return [
    matrix[0] * vector[0] + matrix[4] * vector[1] + matrix[8] * vector[2] + matrix[12] * vector[3],
    matrix[1] * vector[0] + matrix[5] * vector[1] + matrix[9] * vector[2] + matrix[13] * vector[3],
    matrix[2] * vector[0] + matrix[6] * vector[1] + matrix[10] * vector[2] + matrix[14] * vector[3],
    matrix[3] * vector[0] + matrix[7] * vector[1] + matrix[11] * vector[2] + matrix[15] * vector[3],
  ];
}

function projectAxisJacobianPx(viewProj, axis, centerClip, viewportWidth, viewportHeight) {
  const safeW = Math.max(Math.abs(centerClip[3]), 0.0001);
  const clipW2 = safeW * safeW;
  const row0 = [viewProj[0], viewProj[4], viewProj[8]];
  const row1 = [viewProj[1], viewProj[5], viewProj[9]];
  const row3 = [viewProj[3], viewProj[7], viewProj[11]];
  const jacobianX = [
    (centerClip[3] * row0[0] - centerClip[0] * row3[0]) / clipW2,
    (centerClip[3] * row0[1] - centerClip[0] * row3[1]) / clipW2,
    (centerClip[3] * row0[2] - centerClip[0] * row3[2]) / clipW2,
  ];
  const jacobianY = [
    (centerClip[3] * row1[0] - centerClip[1] * row3[0]) / clipW2,
    (centerClip[3] * row1[1] - centerClip[1] * row3[1]) / clipW2,
    (centerClip[3] * row1[2] - centerClip[1] * row3[2]) / clipW2,
  ];
  return [
    dot(jacobianX, axis) * viewportWidth * 0.5,
    dot(jacobianY, axis) * viewportHeight * 0.5,
  ];
}

function normalizeQuat(quat) {
  const length = Math.hypot(quat[0], quat[1], quat[2], quat[3]);
  if (!Number.isFinite(length) || length <= 0.000001) {
    return [1, 0, 0, 0];
  }
  return quat.map((component) => component / length);
}

function rotateAxis(quat, axis) {
  const u = [quat[1], quat[2], quat[3]];
  const uv = cross(u, axis);
  const uuv = cross(u, uv);
  return [
    axis[0] + 2 * (quat[0] * uv[0] + uuv[0]),
    axis[1] + 2 * (quat[0] * uv[1] + uuv[1]),
    axis[2] + 2 * (quat[0] * uv[2] + uuv[2]),
  ];
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function scaleVector(vector, scale) {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function projectSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight) {
  const base = index * 3;
  const x = attributes.positions[base];
  const y = attributes.positions[base + 1];
  const z = attributes.positions[base + 2];
  const clipX = viewProj[0] * x + viewProj[4] * y + viewProj[8] * z + viewProj[12];
  const clipY = viewProj[1] * x + viewProj[5] * y + viewProj[9] * z + viewProj[13];
  const clipZ = viewProj[2] * x + viewProj[6] * y + viewProj[10] * z + viewProj[14];
  const clipW = viewProj[3] * x + viewProj[7] * y + viewProj[11] * z + viewProj[15];
  if (!Number.isFinite(clipW) || clipW <= 0 || clipZ < 0 || clipZ > clipW) {
    return null;
  }
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  if (ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1) {
    return null;
  }
  return [(ndcX * 0.5 + 0.5) * viewportWidth, (0.5 - ndcY * 0.5) * viewportHeight];
}
