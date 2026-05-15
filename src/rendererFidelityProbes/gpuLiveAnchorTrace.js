import { buildPerPixelProjectedContributorTraces } from "./projectionPixelTrace.js";
import { buildPerPixelRetainedContributorTraces } from "./retentionPixelTrace.js";

export function buildGpuLiveAnchorContributorTraces({
  attributes,
  viewMatrix,
  viewProj,
  effectiveOpacities,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  splatScale = 600,
  minRadiusPx = 1.5,
  maxRefsPerTile = 256,
  nearFadeEndNdc,
  rendererMetadata,
  anchors,
} = {}) {
  const projectedContributors = buildAnchorProjectedContributors({
    attributes,
    viewMatrix,
    viewProj,
    effectiveOpacities,
    viewportWidth,
    viewportHeight,
    tileSizePx,
    tileColumns,
    tileRows,
    splatScale,
    minRadiusPx,
    nearFadeEndNdc,
    anchors,
  });
  const retainedContributors = retainAnchorContributors(projectedContributors, maxRefsPerTile);
  return {
    projectedContributors,
    retainedContributors,
    perPixelProjectedContributors: buildPerPixelProjectedContributorTraces({
      projectedContributors,
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      tileRows,
      rendererMetadata,
      anchors,
    }),
    perPixelRetainedContributors: buildPerPixelRetainedContributorTraces({
      projectedContributors,
      retainedContributors,
      viewportWidth,
      viewportHeight,
      tileSizePx,
      tileColumns,
      tileRows,
      rendererMetadata,
      anchors,
    }),
  };
}

function buildAnchorProjectedContributors({
  attributes,
  viewMatrix,
  viewProj,
  effectiveOpacities,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  splatScale,
  minRadiusPx,
  nearFadeEndNdc,
  anchors,
}) {
  if (!attributes || !Number.isInteger(attributes.count) || attributes.count <= 0) {
    return [];
  }
  if (!viewMatrix || viewMatrix.length !== 16 || !viewProj || viewProj.length !== 16) {
    return [];
  }

  const safeViewportWidth = positiveInteger(viewportWidth, "viewportWidth");
  const safeViewportHeight = positiveInteger(viewportHeight, "viewportHeight");
  const safeTileSizePx = positiveInteger(tileSizePx, "tileSizePx");
  const safeTileColumns = positiveInteger(tileColumns ?? Math.ceil(safeViewportWidth / safeTileSizePx), "tileColumns");
  const safeTileRows = positiveInteger(tileRows ?? Math.ceil(safeViewportHeight / safeTileSizePx), "tileRows");
  const tileCount = safeTileColumns * safeTileRows;
  const ranksAndDepths = buildBackToFrontDepthEvidence(attributes, viewMatrix);
  const canonicalAnchors = (Array.isArray(anchors) ? anchors : []).filter(Boolean);
  const projectedContributors = [];

  for (let splatIndex = 0; splatIndex < attributes.count; splatIndex += 1) {
    const centerPx = projectSplatCenterPx(attributes, viewProj, splatIndex, safeViewportWidth, safeViewportHeight);
    if (!centerPx) continue;
    const covariancePx = projectedSplatCovariancePx({
      attributes,
      viewProj,
      index: splatIndex,
      viewportWidth: safeViewportWidth,
      viewportHeight: safeViewportHeight,
      splatScale,
      minRadiusPx,
      nearFadeEndNdc,
    });
    if (!covariancePx) continue;
    const inverseConic = invertCovariancePx(covariancePx);
    if (!inverseConic) continue;

    for (const anchor of canonicalAnchors) {
      const tileAddress = tileAddressForAnchor(anchor, {
        tileSizePx: safeTileSizePx,
        tileColumns: safeTileColumns,
        tileRows: safeTileRows,
      });
      if (tileAddress.tileIndex < 0 || tileAddress.tileIndex >= tileCount) continue;
      const coverageWeight = conicPixelWeight(centerPx, inverseConic, [anchor.x + 0.5, anchor.y + 0.5]);
      if (coverageWeight <= 1e-8) continue;
      const opacity = readOpacity(attributes, effectiveOpacities, splatIndex);
      const luminance = readLuminance(attributes, splatIndex);
      projectedContributors.push({
        splatIndex,
        originalId: readOriginalId(attributes, splatIndex),
        tileIndex: tileAddress.tileIndex,
        tileX: tileAddress.tileX,
        tileY: tileAddress.tileY,
        viewRank: ranksAndDepths.ranks[splatIndex] ?? splatIndex,
        viewDepth: ranksAndDepths.depths[splatIndex] ?? 0,
        depthBand: 0,
        coverageWeight,
        centerPx,
        inverseConic: [inverseConic.xx, inverseConic.xy, inverseConic.yy],
        opacity,
        coverageAlpha: transferCoverageAlpha(opacity, coverageWeight),
        transmittanceBefore: 1,
        retentionWeight: coverageWeight * opacity * luminance,
        occlusionWeight: coverageWeight * opacity,
        occlusionDensity: opacity,
        projectedIndex: projectedContributors.length,
      });
    }
  }

  return projectedContributors;
}

function retainAnchorContributors(projectedContributors, maxRefsPerTile) {
  const safeMaxRefsPerTile = positiveInteger(maxRefsPerTile, "maxRefsPerTile");
  const byTile = new Map();
  for (const contributor of projectedContributors) {
    if (!byTile.has(contributor.tileIndex)) byTile.set(contributor.tileIndex, []);
    byTile.get(contributor.tileIndex).push(contributor);
  }

  const retained = [];
  for (const contributors of byTile.values()) {
    const selected = contributors
      .slice()
      .sort(compareAnchorRetentionPriority)
      .slice(0, safeMaxRefsPerTile)
      .sort(compareAnchorCompositorOrder)
      .map((contributor) => ({
        ...contributor,
        retentionStatus: "retained",
        retained: true,
      }));
    retained.push(...selected);
  }
  return retained;
}

function compareAnchorRetentionPriority(left, right) {
  return (
    right.retentionWeight - left.retentionWeight ||
    right.occlusionWeight - left.occlusionWeight ||
    right.coverageWeight - left.coverageWeight ||
    left.viewRank - right.viewRank ||
    left.splatIndex - right.splatIndex
  );
}

function compareAnchorCompositorOrder(left, right) {
  return (
    left.tileIndex - right.tileIndex ||
    left.viewRank - right.viewRank ||
    left.viewDepth - right.viewDepth ||
    left.splatIndex - right.splatIndex
  );
}

function projectSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight) {
  const positionBase = index * 3;
  const clip = multiplyMat4Vec4(viewProj, [
    attributes.positions[positionBase],
    attributes.positions[positionBase + 1],
    attributes.positions[positionBase + 2],
    1,
  ]);
  if (!clipInside(clip)) return null;
  const invW = 1 / clip[3];
  const ndcX = clip[0] * invW;
  const ndcY = clip[1] * invW;
  return [
    (ndcX * 0.5 + 0.5) * viewportWidth,
    (0.5 - ndcY * 0.5) * viewportHeight,
  ];
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
  if (!Number.isFinite(centerClip[3]) || Math.abs(centerClip[3]) <= 0.0001) return null;

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

  const axisScale = finitePositiveOrDefault(splatScale, 600) / 600;
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
  return floorCovariancePrincipalRadii({ xx, xy, yy }, finiteNonNegativeOrDefault(minRadiusPx, 1.5));
}

function tileAddressForAnchor(anchor, { tileSizePx, tileColumns, tileRows }) {
  if (anchor?.canonicalTileAddress) {
    return {
      tileSizePx,
      ...anchor.canonicalTileAddress,
    };
  }
  const tileX = clamp(Math.floor(anchor.x / tileSizePx), 0, tileColumns - 1);
  const tileY = clamp(Math.floor(anchor.y / tileSizePx), 0, tileRows - 1);
  return {
    tileSizePx,
    tileX,
    tileY,
    tileIndex: tileY * tileColumns + tileX,
    localX: anchor.x - tileX * tileSizePx,
    localY: anchor.y - tileY * tileSizePx,
  };
}

function conicPixelWeight(centerPx, inverseConic, pixelCenter) {
  const dx = pixelCenter[0] - centerPx[0];
  const dy = pixelCenter[1] - centerPx[1];
  const mahalanobis2 = inverseConic.xx * dx * dx + 2 * inverseConic.xy * dx * dy + inverseConic.yy * dy * dy;
  return Math.exp(-2 * Math.max(mahalanobis2, 0));
}

function transferCoverageAlpha(opacity, coverageWeight) {
  if (opacity <= 0 || coverageWeight <= 0) return 0;
  return 1 - Math.pow(1 - opacity, coverageWeight);
}

function invertCovariancePx(covariance) {
  const det = covariance.xx * covariance.yy - covariance.xy * covariance.xy;
  if (!Number.isFinite(det) || det <= 1e-12) return null;
  return {
    xx: covariance.yy / det,
    xy: -covariance.xy / det,
    yy: covariance.xx / det,
  };
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
  return {
    xx: flooredMajorVariance * cos2 + flooredMinorVariance * sin2,
    xy: (flooredMajorVariance - flooredMinorVariance) * cosTheta * sinTheta,
    yy: flooredMajorVariance * sin2 + flooredMinorVariance * cos2,
  };
}

function buildBackToFrontDepthEvidence(attributes, viewMatrix) {
  const sortedIds = Array.from({ length: attributes.count }, (_, splatIndex) => ({
    splatIndex,
    depth:
      viewMatrix[2] * attributes.positions[splatIndex * 3] +
      viewMatrix[6] * attributes.positions[splatIndex * 3 + 1] +
      viewMatrix[10] * attributes.positions[splatIndex * 3 + 2] +
      viewMatrix[14],
  })).sort((left, right) => left.depth - right.depth || left.splatIndex - right.splatIndex);
  const ranks = new Uint32Array(Math.max(attributes.count, 1));
  const depths = new Float32Array(Math.max(attributes.count, 1));
  ranks.fill(0xffffffff);
  for (const { splatIndex, depth } of sortedIds) depths[splatIndex] = depth;
  for (let rank = 0; rank < sortedIds.length; rank += 1) ranks[sortedIds[rank].splatIndex] = rank;
  return { ranks, depths };
}

function nearPlaneSupportCrossesClip({ viewProj, center, centerClip, axes, nearFadeEndNdc }) {
  if (!Number.isFinite(nearFadeEndNdc) || nearFadeEndNdc <= 0) return false;
  const safeW = Math.max(centerClip[3], 0.0001);
  const centerNdcDepth = centerClip[2] / safeW;
  if (centerNdcDepth > nearFadeEndNdc) return false;
  for (const axis of axes) {
    const positiveClip = multiplyMat4Vec4(viewProj, [center[0] + axis[0], center[1] + axis[1], center[2] + axis[2], 1]);
    const negativeClip = multiplyMat4Vec4(viewProj, [center[0] - axis[0], center[1] - axis[1], center[2] - axis[2], 1]);
    if (!clipInside(positiveClip) || !clipInside(negativeClip)) return true;
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
  if (!Number.isFinite(length) || length <= 0.000001) return [1, 0, 0, 0];
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

function readOpacity(attributes, effectiveOpacities, splatIndex) {
  const source = effectiveOpacities?.[splatIndex] ?? attributes.opacities?.[splatIndex] ?? 1;
  return clamp01(source);
}

function readLuminance(attributes, splatIndex) {
  const base = splatIndex * 3;
  const red = readNonNegativeFinite(attributes.colors?.[base], 1);
  const green = readNonNegativeFinite(attributes.colors?.[base + 1], 1);
  const blue = readNonNegativeFinite(attributes.colors?.[base + 2], 1);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function readOriginalId(attributes, splatIndex) {
  return Number.isInteger(attributes.originalIds?.[splatIndex]) ? attributes.originalIds[splatIndex] : splatIndex;
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
  return value;
}

function finitePositiveOrDefault(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteNonNegativeOrDefault(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readNonNegativeFinite(value, fallback) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
