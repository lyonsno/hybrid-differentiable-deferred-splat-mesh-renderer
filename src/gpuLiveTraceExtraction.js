import { buildPerPixelProjectedContributorTraces } from "./rendererFidelityProbes/projectionPixelTrace.js";
import { buildPerPixelRetainedContributorTraces } from "./rendererFidelityProbes/retentionPixelTrace.js";
import { buildPerPixelFinalColorAccumulationTraces } from "./rendererFidelityProbes/finalAccumulationTrace.js";
import { PIXEL_CONTRIBUTOR_TRACE_SCHEMA } from "./rendererFidelityProbes/pixelContributorTraceSchema.js";

const DEFAULT_RENDERER_METADATA = Object.freeze({
  requestedRenderer: "tile-local-visible",
  effectiveRenderer: "tile-local-visible-gaussian-compositor",
  requestedArenaBackend: "gpu",
  effectiveArenaBackend: "gpu",
});

const DEFAULT_DISPATCH_CACHE = Object.freeze({
  clearFrameId: -1,
  buildFrameId: -1,
  compositeFrameId: -1,
  cacheState: "not-dispatched",
});

export function buildGpuLivePixelContributorTraces({
  attributes,
  effectiveOpacities = attributes?.opacities,
  viewMatrix,
  viewProj,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  tileColumns,
  tileRows,
  maxTileRefs,
  splatScale = 1,
  minRadiusPx = 1.5,
  rendererMetadata = DEFAULT_RENDERER_METADATA,
  dispatchCache = DEFAULT_DISPATCH_CACHE,
  anchors = PIXEL_CONTRIBUTOR_TRACE_SCHEMA.anchors,
} = {}) {
  const plan = normalizeTracePlan({ viewportWidth, viewportHeight, tileSizePx, tileColumns, tileRows, maxTileRefs });
  const anchorTileAddresses = new Map(anchors.map((anchor) => [anchor.id, tileAddressForAnchor(anchor, plan)]));
  const anchorTileIndexes = new Set([...anchorTileAddresses.values()].map((address) => address.tileIndex));
  const projectedByTile = new Map();
  const ranks = buildViewRanks(attributes, viewMatrix);

  for (let splatIndex = 0; splatIndex < (attributes?.count ?? 0); splatIndex += 1) {
    const conic = projectGpuLiveSplatConic({
      attributes,
      viewProj,
      splatIndex,
      viewportWidth: plan.viewportWidth,
      viewportHeight: plan.viewportHeight,
      splatScale,
      minRadiusPx,
    });
    if (!conic) {
      continue;
    }
    const tileBounds = tileBoundsForConic(conic, plan);
    for (const tileIndex of anchorTileIndexes) {
      const tileX = tileIndex % plan.tileColumns;
      const tileY = Math.floor(tileIndex / plan.tileColumns);
      if (tileX < tileBounds.minTileX || tileX > tileBounds.maxTileX || tileY < tileBounds.minTileY || tileY > tileBounds.maxTileY) {
        continue;
      }
      const coverageWeight = gpuLiveTileCoverageWeight(conic, tileCenterPx(tileX, tileY, plan.tileSizePx));
      const opacity = unitOpacity(effectiveOpacities?.[splatIndex] ?? attributes?.opacities?.[splatIndex] ?? 1);
      const record = {
        splatIndex,
        originalId: attributes?.originalIds?.[splatIndex] ?? splatIndex,
        tileIndex,
        tileX,
        tileY,
        projectedIndex: projectedByTile.get(tileIndex)?.length ?? 0,
        contributorIndex: -1,
        viewRank: ranks.ranks[splatIndex] ?? splatIndex,
        viewDepth: ranks.depths[splatIndex] ?? 0,
        depthBand: 0,
        coverageWeight,
        centerPx: conic.centerPx,
        inverseConic: conic.inverseConic,
        opacity,
        coverageAlpha: coverageAlpha(opacity, coverageWeight),
        transmittanceBefore: 1,
        retentionWeight: coverageWeight * opacity * luminanceForSplat(attributes, splatIndex),
        occlusionWeight: coverageWeight * opacity,
        occlusionDensity: opacity,
        retentionStatus: "projected",
        retentionBand: "middle",
        overflowReason: "none",
        retained: false,
      };
      if (!projectedByTile.has(tileIndex)) {
        projectedByTile.set(tileIndex, []);
      }
      projectedByTile.get(tileIndex).push(record);
    }
  }

  const projectedContributors = [...projectedByTile.values()].flatMap((tileRecords) => tileRecords);
  const retainedContributors = retainGpuLiveAnchorContributors(projectedByTile, plan);
  const metadata = {
    ...DEFAULT_RENDERER_METADATA,
    ...rendererMetadata,
    tileSizePx: plan.tileSizePx,
    maxRefsPerTile: plan.tileCapacity,
    viewport: {
      width: plan.viewportWidth,
      height: plan.viewportHeight,
    },
    traceExtractionBackend: "gpu-live-anchor-mirror",
  };
  const perPixelProjectedContributors = buildPerPixelProjectedContributorTraces({
    projectedContributors,
    viewportWidth: plan.viewportWidth,
    viewportHeight: plan.viewportHeight,
    tileSizePx: plan.tileSizePx,
    tileColumns: plan.tileColumns,
    tileRows: plan.tileRows,
    rendererMetadata: metadata,
    dispatchCache,
    anchors,
  });
  const perPixelRetainedContributors = buildPerPixelRetainedContributorTraces({
    projectedContributors,
    retainedContributors,
    viewportWidth: plan.viewportWidth,
    viewportHeight: plan.viewportHeight,
    tileSizePx: plan.tileSizePx,
    tileColumns: plan.tileColumns,
    tileRows: plan.tileRows,
    rendererMetadata: metadata,
    dispatchCache,
    anchors,
  });
  const perPixelFinalColorAccumulation = buildPerPixelFinalColorAccumulationTraces({
    contributors: retainedContributors,
    sourceColors: attributes?.colors,
    projectedContributorsByAnchorId: traceContributorListByAnchorId(perPixelProjectedContributors, "projectedContributors"),
    retainedContributorsByAnchorId: traceContributorListByAnchorId(perPixelRetainedContributors, "retainedContributors"),
    dispatchCache,
    rendererMetadata: metadata,
    tileSizePx: plan.tileSizePx,
    tileColumns: plan.tileColumns,
    anchors,
  });

  return {
    projectedContributors,
    retainedContributors,
    perPixelProjectedContributors,
    perPixelRetainedContributors,
    perPixelFinalColorAccumulation,
  };
}

function normalizeTracePlan({ viewportWidth, viewportHeight, tileSizePx, tileColumns, tileRows, maxTileRefs }) {
  const safeViewportWidth = positiveInteger(viewportWidth, "viewportWidth");
  const safeViewportHeight = positiveInteger(viewportHeight, "viewportHeight");
  const safeTileSizePx = positiveInteger(tileSizePx, "tileSizePx");
  const safeTileColumns = positiveInteger(tileColumns ?? Math.ceil(safeViewportWidth / safeTileSizePx), "tileColumns");
  const safeTileRows = positiveInteger(tileRows ?? Math.ceil(safeViewportHeight / safeTileSizePx), "tileRows");
  const tileCount = Math.max(1, safeTileColumns * safeTileRows);
  const safeMaxTileRefs = positiveInteger(maxTileRefs ?? tileCount, "maxTileRefs");
  return {
    viewportWidth: safeViewportWidth,
    viewportHeight: safeViewportHeight,
    tileSizePx: safeTileSizePx,
    tileColumns: safeTileColumns,
    tileRows: safeTileRows,
    tileCount,
    maxTileRefs: safeMaxTileRefs,
    tileCapacity: Math.max(Math.floor(safeMaxTileRefs / tileCount), 1),
  };
}

function retainGpuLiveAnchorContributors(projectedByTile, plan) {
  const retained = [];
  for (const [tileIndex, records] of [...projectedByTile.entries()].sort((left, right) => left[0] - right[0])) {
    const tileRecords = [...records].sort(compareGpuLiveShaderSlotOrder);
    let transmission = 1;
    for (let index = 0; index < tileRecords.length; index += 1) {
      const record = tileRecords[index];
      const kept = index < plan.tileCapacity;
      const next = {
        ...record,
        projectedIndex: index,
        contributorIndex: kept ? retained.length : -1,
        retentionStatus: kept ? "retained" : "dropped",
        retained: kept,
        overflowReason: kept ? "none" : "perTileRetainedCap",
        transmittanceBefore: transmission,
      };
      transmission *= 1 - record.opacity;
      if (kept) {
        retained.push(next);
      }
      tileRecords[index] = next;
    }
    projectedByTile.set(tileIndex, tileRecords);
  }
  return retained.sort(compareGpuLiveCompositorOrder);
}

function compareGpuLiveShaderSlotOrder(left, right) {
  return left.splatIndex - right.splatIndex || left.originalId - right.originalId;
}

function compareGpuLiveCompositorOrder(left, right) {
  return (
    left.tileIndex - right.tileIndex ||
    left.viewRank - right.viewRank ||
    left.viewDepth - right.viewDepth ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

function projectGpuLiveSplatConic({ attributes, viewProj, splatIndex, viewportWidth, viewportHeight, splatScale, minRadiusPx }) {
  if (!viewProj || viewProj.length < 16) {
    throw new Error("viewProj must contain 16 values");
  }
  const center = splatPosition(attributes, splatIndex);
  const centerClip = multiplyMat4Vec4(viewProj, [center[0], center[1], center[2], 1]);
  if (!Number.isFinite(centerClip[3]) || centerClip[3] <= 0) {
    return null;
  }
  const centerPx = [
    (centerClip[0] / Math.max(centerClip[3], 0.000001) * 0.5 + 0.5) * viewportWidth,
    (1 - (centerClip[1] / Math.max(centerClip[3], 0.000001) * 0.5 + 0.5)) * viewportHeight,
  ];
  const shape = makeSplatShape(attributes, splatIndex);
  const viewportScale = [viewportWidth * 0.5 * (splatScale / 600), viewportHeight * 0.5 * (splatScale / 600)];
  const axes = shape.map((axis) => {
    const projected = projectAxisJacobian(viewProj, axis, centerClip);
    return [projected[0] * viewportScale[0], projected[1] * viewportScale[1]];
  });
  const covXX = axes[0][0] ** 2 + axes[1][0] ** 2 + axes[2][0] ** 2;
  const covXY = axes[0][0] * axes[0][1] + axes[1][0] * axes[1][1] + axes[2][0] * axes[2][1];
  const covYY = axes[0][1] ** 2 + axes[1][1] ** 2 + axes[2][1] ** 2;
  const trace = 0.5 * (covXX + covYY);
  const diff = 0.5 * (covXX - covYY);
  const root = Math.sqrt(Math.max(diff * diff + covXY * covXY, 0));
  const lambda0 = Math.max(trace + root, 0);
  const lambda1 = Math.max(trace - root, 0);
  let majorDir = [1, 0];
  if (Math.abs(covXY) + Math.abs(lambda0 - covXX) > 1e-8) {
    majorDir = normalize2([covXY, lambda0 - covXX]);
  } else if (covYY > covXX) {
    majorDir = [0, 1];
  }
  const minorDir = [-majorDir[1], majorDir[0]];
  const rawMajorRadiusPx = Math.sqrt(lambda0);
  const rawMinorRadiusPx = Math.sqrt(lambda1);
  const floorPx = Math.max(finiteNonNegativeOrDefault(minRadiusPx, 1.5), 0);
  const uncappedMajorRadiusPx = Math.max(rawMajorRadiusPx, floorPx);
  const uncappedMinorRadiusPx = boundedMinorRadiusPx(rawMajorRadiusPx, rawMinorRadiusPx, floorPx);
  const footprintScale = gpuLiveFootprintPolicyScale({
    majorRadiusPx: uncappedMajorRadiusPx,
    minorRadiusPx: uncappedMinorRadiusPx,
    viewportWidth,
    viewportHeight,
    minRadiusPx: floorPx,
  });
  const minorRadiusPx = Math.max(uncappedMinorRadiusPx * footprintScale, floorPx);
  const majorRadiusPx = Math.max(uncappedMajorRadiusPx * footprintScale, minorRadiusPx);
  const majorInvVar = 1 / Math.max(majorRadiusPx * majorRadiusPx, 0.000001);
  const minorInvVar = 1 / Math.max(minorRadiusPx * minorRadiusPx, 0.000001);
  const inverseConic = [
    majorDir[0] * majorDir[0] * majorInvVar + minorDir[0] * minorDir[0] * minorInvVar,
    majorDir[0] * majorDir[1] * majorInvVar + minorDir[0] * minorDir[1] * minorInvVar,
    majorDir[1] * majorDir[1] * majorInvVar + minorDir[1] * minorDir[1] * minorInvVar,
  ];
  return { centerPx, inverseConic, majorRadiusPx, minorRadiusPx };
}

function tileBoundsForConic(conic, plan) {
  const support = Math.max(Math.max(conic.majorRadiusPx, conic.minorRadiusPx) * 3, plan.tileSizePx * 0.5);
  const viewportMax = [Math.max(plan.viewportWidth - 1, 0), Math.max(plan.viewportHeight - 1, 0)];
  const minCenterPx = [clamp(conic.centerPx[0] - support, 0, viewportMax[0]), clamp(conic.centerPx[1] - support, 0, viewportMax[1])];
  const maxCenterPx = [clamp(conic.centerPx[0] + support, 0, viewportMax[0]), clamp(conic.centerPx[1] + support, 0, viewportMax[1])];
  return {
    minTileX: Math.min(Math.floor(minCenterPx[0] / plan.tileSizePx), plan.tileColumns - 1),
    maxTileX: Math.min(Math.floor(maxCenterPx[0] / plan.tileSizePx), plan.tileColumns - 1),
    minTileY: Math.min(Math.floor(minCenterPx[1] / plan.tileSizePx), plan.tileRows - 1),
    maxTileY: Math.min(Math.floor(maxCenterPx[1] / plan.tileSizePx), plan.tileRows - 1),
  };
}

function tileAddressForAnchor(anchor, plan) {
  if (anchor?.canonicalTileAddress) {
    return { tileSizePx: plan.tileSizePx, ...anchor.canonicalTileAddress };
  }
  const tileX = clamp(Math.floor(anchor.x / plan.tileSizePx), 0, plan.tileColumns - 1);
  const tileY = clamp(Math.floor(anchor.y / plan.tileSizePx), 0, plan.tileRows - 1);
  return {
    tileSizePx: plan.tileSizePx,
    tileX,
    tileY,
    tileIndex: tileY * plan.tileColumns + tileX,
    localX: anchor.x - tileX * plan.tileSizePx,
    localY: anchor.y - tileY * plan.tileSizePx,
  };
}

function buildViewRanks(attributes, viewMatrix) {
  const count = Math.max(0, attributes?.count ?? 0);
  const ranks = new Uint32Array(Math.max(1, count));
  const depths = new Float32Array(Math.max(1, count));
  ranks.fill(0xffffffff);
  const sorted = Array.from({ length: count }, (_, splatIndex) => {
    const position = splatPosition(attributes, splatIndex);
    const depth = viewMatrix && viewMatrix.length >= 16
      ? viewMatrix[2] * position[0] + viewMatrix[6] * position[1] + viewMatrix[10] * position[2] + viewMatrix[14]
      : splatIndex;
    depths[splatIndex] = depth;
    return { splatIndex, depth };
  }).sort((left, right) => left.depth - right.depth || left.splatIndex - right.splatIndex);
  sorted.forEach(({ splatIndex }, rank) => {
    ranks[splatIndex] = rank;
  });
  return { ranks, depths };
}

function makeSplatShape(attributes, splatIndex) {
  const scaleBase = splatIndex * 3;
  const rotationBase = splatIndex * 4;
  const scale = [
    Math.exp(attributes?.scales?.[scaleBase] ?? 0),
    Math.exp(attributes?.scales?.[scaleBase + 1] ?? 0),
    Math.exp(attributes?.scales?.[scaleBase + 2] ?? 0),
  ];
  const rotation = normalizeQuat([
    attributes?.rotations?.[rotationBase] ?? 1,
    attributes?.rotations?.[rotationBase + 1] ?? 0,
    attributes?.rotations?.[rotationBase + 2] ?? 0,
    attributes?.rotations?.[rotationBase + 3] ?? 0,
  ]);
  return [
    scaleVector(rotateAxis(rotation, [1, 0, 0]), scale[0]),
    scaleVector(rotateAxis(rotation, [0, 1, 0]), scale[1]),
    scaleVector(rotateAxis(rotation, [0, 0, 1]), scale[2]),
  ];
}

function projectAxisJacobian(viewProj, axis, centerClip) {
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
  return [dot(jacobianX, axis), dot(jacobianY, axis)];
}

function boundedMinorRadiusPx(rawMajorRadiusPx, rawMinorRadiusPx, minRadiusPx) {
  if (rawMinorRadiusPx >= minRadiusPx) return rawMinorRadiusPx;
  if (rawMajorRadiusPx < minRadiusPx) return minRadiusPx;
  const inflatedMinor = Math.max(rawMinorRadiusPx * 4, minRadiusPx * 0.015625);
  return Math.min(minRadiusPx, inflatedMinor);
}

function gpuLiveFootprintPolicyScale({ majorRadiusPx, minorRadiusPx, viewportWidth, viewportHeight, minRadiusPx }) {
  const areaCapPx = viewportWidth * viewportHeight * 0.01;
  const majorRadiusCapPx = Math.max(Math.min(viewportWidth, viewportHeight) * 0.65, minRadiusPx);
  const footprintAreaPx = Math.PI * majorRadiusPx * minorRadiusPx;
  const areaScale = Math.sqrt(areaCapPx / Math.max(footprintAreaPx, areaCapPx));
  const majorScale = majorRadiusCapPx / Math.max(majorRadiusPx, majorRadiusCapPx);
  return Math.min(areaScale, majorScale, 1);
}

function gpuLiveTileCoverageWeight(conic, tileCenter) {
  const dx = tileCenter[0] - conic.centerPx[0];
  const dy = tileCenter[1] - conic.centerPx[1];
  const mahalanobis2 = conic.inverseConic[0] * dx * dx + 2 * conic.inverseConic[1] * dx * dy + conic.inverseConic[2] * dy * dy;
  return Math.exp(-0.5 * Math.max(mahalanobis2, 0));
}

function tileCenterPx(tileX, tileY, tileSizePx) {
  return [(tileX + 0.5) * tileSizePx, (tileY + 0.5) * tileSizePx];
}

function coverageAlpha(opacity, coverageWeight) {
  return coverageWeight > 0 ? clamp(1 - (1 - opacity) ** coverageWeight, 0, 1) : 0;
}

function traceContributorListByAnchorId(traces, listName) {
  return new Map((traces ?? []).map((trace) => [
    trace.anchorPixel.id,
    Array.isArray(trace.traceRecord?.[listName]) ? trace.traceRecord[listName] : [],
  ]));
}

function splatPosition(attributes, splatIndex) {
  const base = splatIndex * 3;
  return [
    finiteNumber(attributes?.positions?.[base], 0),
    finiteNumber(attributes?.positions?.[base + 1], 0),
    finiteNumber(attributes?.positions?.[base + 2], 0),
  ];
}

function luminanceForSplat(attributes, splatIndex) {
  const base = splatIndex * 3;
  const red = finiteNumber(attributes?.colors?.[base], 1);
  const green = finiteNumber(attributes?.colors?.[base + 1], 1);
  const blue = finiteNumber(attributes?.colors?.[base + 2], 1);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function multiplyMat4Vec4(matrix, vector) {
  return [
    matrix[0] * vector[0] + matrix[4] * vector[1] + matrix[8] * vector[2] + matrix[12] * vector[3],
    matrix[1] * vector[0] + matrix[5] * vector[1] + matrix[9] * vector[2] + matrix[13] * vector[3],
    matrix[2] * vector[0] + matrix[6] * vector[1] + matrix[10] * vector[2] + matrix[14] * vector[3],
    matrix[3] * vector[0] + matrix[7] * vector[1] + matrix[11] * vector[2] + matrix[15] * vector[3],
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

function normalize2(value) {
  const length = Math.hypot(value[0], value[1]);
  if (!Number.isFinite(length) || length <= 0.000001) return [1, 0];
  return [value[0] / length, value[1] / length];
}

function unitOpacity(value) {
  return clamp(finiteNumber(value, 1), 0, 0.999);
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${label} must be a positive integer`);
  return value;
}

function finiteNonNegativeOrDefault(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
