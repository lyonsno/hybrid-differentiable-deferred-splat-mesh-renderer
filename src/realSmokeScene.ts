import { positionCameraFromTarget, type Camera } from "./camera.js";
import { mulMat4, type mat4 } from "./math.js";
import { framingFromBounds, type SplatAttributes, type SplatBounds } from "./splats.js";

export const REAL_SCANIVERSE_SMOKE_ASSET_PATH =
  "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json";

export const REAL_SCANIVERSE_SPLAT_SCALE = 3000;
export const REAL_SCANIVERSE_MIN_RADIUS_PX = 1.5;
export const REAL_SCANIVERSE_NEAR_FADE_START_NDC = 0;
export const REAL_SCANIVERSE_NEAR_FADE_END_NDC = 0.08;
const MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION = 4;
const MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION = 1 / 64;
const MIN_ALPHA_DENSITY_OPACITY_FRACTION = 0.5;
const ALPHA_DENSITY_TILE_SIZE_PX = 48;
const ALPHA_DENSITY_GAUSSIAN_SUPPORT_SIGMA = 3;
const ALPHA_DENSITY_COVERAGE_SAMPLES_PER_AXIS = 5;
const STATIC_DESSERT_RIM_BAND_CROP = { x: 390, y: 322, width: 500, height: 115 } as const;
const STATIC_DESSERT_POROUS_BODY_CROP = { x: 520, y: 270, width: 260, height: 150 } as const;

const VIEWER_VERTICAL_FLIP = new Float32Array([
  1, 0, 0, 0,
  0, -1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

export interface MeshSplatSmokeEvidence {
  readonly ready: boolean;
  readonly sourceKind: string;
  readonly realScaniverse: true;
  readonly realSplatEvidence: true;
  readonly synthetic: false;
  readonly assetPath: string;
  readonly splatCount: number;
  readonly sortedIdCount: number;
  readonly sortBackend: string;
  readonly boundsRadius: number;
}

export interface MeshSplatRendererWitness {
  readonly field: {
    readonly scaleSpace: "log";
    readonly rotationOrder: "wxyz";
    readonly opacitySpace: "unit";
    readonly colorSpace: "sh_dc_rgb";
  };
  readonly projection: {
    readonly projectionMode: "jacobian-covariance";
    readonly maxAnisotropyRatio: number;
    readonly suspiciousSplatCount: number;
    readonly sampleOriginalIds: readonly number[];
    readonly fieldMaxAnisotropyRatio: number;
    readonly fieldSuspiciousSplatCount: number;
    readonly rotationOrderComparison?: ProjectedAnisotropyComparison;
    readonly footprint?: ProjectedFootprintSummary;
    readonly cropSupport?: {
      readonly rimBand: ProjectedCropSupportSummary;
      readonly porousBody: ProjectedCropSupportSummary;
    };
  };
  readonly slab: {
    readonly statusCounts: {
      readonly "axis-crosses-near-plane": 0;
      readonly "pathological-footprint": 0;
      readonly accepted: number;
    };
    readonly maxMajorRadiusPx: 0;
    readonly footprintCapPx: number;
    readonly sampleOriginalIds: readonly number[];
  };
  readonly alpha: {
    readonly alphaEnergyPolicy: "bounded-footprint-energy-cap";
    readonly nearPlaneAlphaFade: {
      readonly startNdc: number;
      readonly endNdc: number;
    };
    readonly compositing: "straight-source-over";
    readonly ambiguousOverlapCount: 0;
    readonly overlapDensity?: AlphaOverlapDensitySummary;
  };
  readonly sort: {
    readonly backend: string;
    readonly sortedIdCount: number;
  };
  readonly source: {
    readonly assetPath: string;
    readonly splatCount: number;
    readonly sortedSampleOriginalIds: readonly number[];
  };
}

export interface MeshSplatRendererWitnessOptions {
  readonly viewProj?: mat4;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly splatScale?: number;
  readonly minRadiusPx?: number;
}

export interface ProjectedAnisotropyComparison {
  readonly wxyz: ProjectedAnisotropySummary;
  readonly xyzw: ProjectedAnisotropySummary;
}

export interface ProjectedAnisotropySummary {
  readonly rotationOrder: "wxyz" | "xyzw";
  readonly maxProjectedAnisotropyRatio: number;
  readonly suspiciousProjectedSplatCount: number;
  readonly projectedSplatCount: number;
  readonly sampleOriginalIds: readonly number[];
}

export interface ProjectedFootprintSummary {
  readonly maxMajorRadiusPx: number;
  readonly maxMinorRadiusPx: number;
  readonly maxAreaPx: number;
  readonly areaCapPx: number;
  readonly majorRadiusCapPx: number;
  readonly highEnergySplatCount: number;
  readonly projectedSplatCount: number;
  readonly sampleOriginalIds: readonly number[];
}

export interface ProjectedCropSupportSummary {
  readonly crop: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly projectedCenterCount: number;
  readonly projectedSupportCount: number;
  readonly nearFloorMinorCount: number;
  readonly maxMajorRadiusPx: number;
  readonly medianMajorRadiusPx: number;
  readonly medianMinorRadiusPx: number;
  readonly supportAreaPxSum: number;
  readonly sampleOriginalIds: readonly number[];
}

export interface AlphaOverlapDensitySummary {
  readonly accountingMode: AlphaDensityAccountingMode;
  readonly tileSizePx: number;
  readonly alphaMassCap: number;
  readonly maxTileAlphaMass: number;
  readonly maxTileSplatCount: number;
  readonly hotTileCount: number;
  readonly tileEntryCount: number;
  readonly maxSplatCoveredTileCount: number;
  readonly maxCenterTileDroppedCoverageFraction: number;
  readonly sampleOriginalIds: readonly number[];
}

export interface AlphaDensityCompensationSummary extends AlphaOverlapDensitySummary {
  readonly compensatedSplatCount: number;
  readonly minCompensationExponent: number;
}

export type AlphaDensityAccountingMode = "coverage-aware" | "center-tile";

interface AlphaDensityTile {
  alphaMass: number;
  splatCount: number;
  sampleOriginalIds: number[];
}

interface AlphaDensityAccounting {
  readonly summary: AlphaOverlapDensitySummary;
  readonly tiles: Map<number, AlphaDensityTile>;
  readonly splatTileKeys: number[][];
}

declare global {
  interface Window {
    __MESH_SPLAT_SMOKE__?: MeshSplatSmokeEvidence;
    __MESH_SPLAT_WITNESS__?: MeshSplatRendererWitness;
  }
}

export function configureCameraForSplatBounds(camera: Camera, bounds: SplatBounds): void {
  const framing = framingFromBounds(bounds, { padding: 1.45 });
  camera.target = [...framing.target];
  camera.distance = framing.distance;
  camera.navigationScale = Math.max(bounds.radius, 0.1);
  camera.near = framing.near;
  camera.far = framing.far;
  camera.azimuth = 0;
  camera.elevation = 0.18;
  positionCameraFromTarget(camera);
}

export function composeFirstSmokeViewProjection(projection: mat4, view: mat4): mat4 {
  return mulMat4(VIEWER_VERTICAL_FLIP, mulMat4(projection, view));
}

export function createMeshSplatSmokeEvidence(
  attributes: SplatAttributes,
  sortedIdsOrCount: Uint32Array | number,
  assetPath = REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  sortBackend = "unknown"
): MeshSplatSmokeEvidence {
  const sortedIdCount = typeof sortedIdsOrCount === "number"
    ? sortedIdsOrCount
    : sortedIdsOrCount.length;
  return {
    ready: true,
    sourceKind: attributes.sourceKind,
    realScaniverse: true,
    realSplatEvidence: true,
    synthetic: false,
    assetPath,
    splatCount: attributes.count,
    sortedIdCount,
    sortBackend,
    boundsRadius: attributes.bounds.radius,
  };
}

export function createMeshSplatRendererWitness(
  attributes: SplatAttributes,
  sortedIdsOrCount: Uint32Array | number,
  assetPath = REAL_SCANIVERSE_SMOKE_ASSET_PATH,
  sortBackend = "unknown",
  options: MeshSplatRendererWitnessOptions = {}
): MeshSplatRendererWitness {
  const sortedIdCount = typeof sortedIdsOrCount === "number"
    ? sortedIdsOrCount
    : sortedIdsOrCount.length;
  const sampleOriginalIds = typeof sortedIdsOrCount === "number"
    ? []
    : Array.from(sortedIdsOrCount.slice(0, 8));
  const anisotropy = summarizeFieldAnisotropy(attributes);
  const projectedComparison = options.viewProj === undefined
    ? undefined
    : compareProjectedAnisotropyByRotationOrder(attributes, options.viewProj);
  const projectedFootprint = options.viewProj === undefined
    ? undefined
    : summarizeProjectedFootprint(attributes, options.viewProj, options);
  const cropSupport = options.viewProj === undefined
    ? undefined
    : {
        rimBand: summarizeProjectedCropSupport(
          attributes,
          options.viewProj,
          options,
          STATIC_DESSERT_RIM_BAND_CROP
        ),
        porousBody: summarizeProjectedCropSupport(
          attributes,
          options.viewProj,
          options,
          STATIC_DESSERT_POROUS_BODY_CROP
        ),
      };
  const overlapDensity = options.viewProj === undefined
    ? undefined
    : summarizeAlphaOverlapDensity(attributes, options.viewProj, options);
  const primaryProjection = projectedComparison?.wxyz;
  return {
    field: {
      scaleSpace: "log",
      rotationOrder: "wxyz",
      opacitySpace: "unit",
      colorSpace: "sh_dc_rgb",
    },
    projection: {
      projectionMode: "jacobian-covariance",
      maxAnisotropyRatio: primaryProjection?.maxProjectedAnisotropyRatio ?? anisotropy.maxAnisotropyRatio,
      suspiciousSplatCount: primaryProjection?.suspiciousProjectedSplatCount ?? anisotropy.suspiciousSplatCount,
      sampleOriginalIds: primaryProjection?.sampleOriginalIds ?? anisotropy.sampleOriginalIds,
      fieldMaxAnisotropyRatio: anisotropy.maxAnisotropyRatio,
      fieldSuspiciousSplatCount: anisotropy.suspiciousSplatCount,
      rotationOrderComparison: projectedComparison,
      footprint: projectedFootprint,
      cropSupport,
    },
    slab: {
      statusCounts: {
        "axis-crosses-near-plane": 0,
        "pathological-footprint": 0,
        accepted: attributes.count,
      },
      maxMajorRadiusPx: 0,
      footprintCapPx: 0.65 * Math.max(1, attributes.bounds.radius),
      sampleOriginalIds,
    },
    alpha: {
      alphaEnergyPolicy: "bounded-footprint-energy-cap",
      nearPlaneAlphaFade: {
        startNdc: REAL_SCANIVERSE_NEAR_FADE_START_NDC,
        endNdc: REAL_SCANIVERSE_NEAR_FADE_END_NDC,
      },
      compositing: "straight-source-over",
      ambiguousOverlapCount: 0,
      overlapDensity,
    },
    sort: {
      backend: sortBackend,
      sortedIdCount,
    },
    source: {
      assetPath,
      splatCount: attributes.count,
      sortedSampleOriginalIds: sampleOriginalIds,
    },
  };
}

export function compareProjectedAnisotropyByRotationOrder(
  attributes: SplatAttributes,
  viewProj: mat4
): ProjectedAnisotropyComparison {
  return {
    wxyz: summarizeProjectedAnisotropy(attributes, viewProj, "wxyz"),
    xyzw: summarizeProjectedAnisotropy(attributes, viewProj, "xyzw"),
  };
}

function summarizeFieldAnisotropy(attributes: SplatAttributes): {
  readonly maxAnisotropyRatio: number;
  readonly suspiciousSplatCount: number;
  readonly sampleOriginalIds: readonly number[];
} {
  const suspiciousRatio = 8;
  let maxAnisotropyRatio = 0;
  let suspiciousSplatCount = 0;
  const sampleOriginalIds: number[] = [];

  for (let index = 0; index < attributes.count; index++) {
    const base = index * 3;
    const scaleX = Math.exp(attributes.scales[base]);
    const scaleY = Math.exp(attributes.scales[base + 1]);
    const scaleZ = Math.exp(attributes.scales[base + 2]);
    const minScale = Math.max(Math.min(scaleX, scaleY, scaleZ), 1e-12);
    const maxScale = Math.max(scaleX, scaleY, scaleZ);
    const ratio = maxScale / minScale;
    if (!Number.isFinite(ratio)) continue;

    maxAnisotropyRatio = Math.max(maxAnisotropyRatio, ratio);
    if (ratio >= suspiciousRatio) {
      suspiciousSplatCount += 1;
      if (sampleOriginalIds.length < 8) {
        sampleOriginalIds.push(attributes.originalIds[index] ?? index);
      }
    }
  }

  return { maxAnisotropyRatio, suspiciousSplatCount, sampleOriginalIds };
}

function summarizeProjectedAnisotropy(
  attributes: SplatAttributes,
  viewProj: mat4,
  rotationOrder: "wxyz" | "xyzw"
): ProjectedAnisotropySummary {
  const suspiciousRatio = 8;
  let maxProjectedAnisotropyRatio = 0;
  let suspiciousProjectedSplatCount = 0;
  let projectedSplatCount = 0;
  const sampleOriginalIds: number[] = [];

  for (let index = 0; index < attributes.count; index++) {
    const projectedAxes = projectSplatAxesForWitness(attributes, viewProj, index, rotationOrder);
    if (!projectedAxes) continue;

    const ratio = projectedCovarianceAnisotropy(projectedAxes);
    if (!Number.isFinite(ratio)) continue;

    projectedSplatCount += 1;
    maxProjectedAnisotropyRatio = Math.max(maxProjectedAnisotropyRatio, ratio);
    if (ratio >= suspiciousRatio) {
      suspiciousProjectedSplatCount += 1;
      if (sampleOriginalIds.length < 8) {
        sampleOriginalIds.push(attributes.originalIds[index] ?? index);
      }
    }
  }

  return {
    rotationOrder,
    maxProjectedAnisotropyRatio,
    suspiciousProjectedSplatCount,
    projectedSplatCount,
    sampleOriginalIds,
  };
}

function projectSplatAxesForWitness(
  attributes: SplatAttributes,
  viewProj: mat4,
  index: number,
  rotationOrder: "wxyz" | "xyzw"
): readonly [number, number][] | null {
  const vecBase = index * 3;
  const quatBase = index * 4;
  const position: [number, number, number] = [
    attributes.positions[vecBase],
    attributes.positions[vecBase + 1],
    attributes.positions[vecBase + 2],
  ];
  const centerClip = transformPoint(viewProj, position);
  if (!clipInside(centerClip)) return null;

  const rotation = readRotation(attributes.rotations, quatBase, rotationOrder);
  const scales: [number, number, number] = [
    Math.exp(attributes.scales[vecBase]),
    Math.exp(attributes.scales[vecBase + 1]),
    Math.exp(attributes.scales[vecBase + 2]),
  ];
  const axes = [
    scale3(rotateAxis(rotation, [1, 0, 0]), scales[0]),
    scale3(rotateAxis(rotation, [0, 1, 0]), scales[1]),
    scale3(rotateAxis(rotation, [0, 0, 1]), scales[2]),
  ];
  return axes.map((axis) => projectAxisJacobian(viewProj, axis, centerClip));
}

function summarizeProjectedFootprint(
  attributes: SplatAttributes,
  viewProj: mat4,
  options: MeshSplatRendererWitnessOptions
): ProjectedFootprintSummary {
  const viewportWidth = positiveOrDefault(options.viewportWidth, 1280);
  const viewportHeight = positiveOrDefault(options.viewportHeight, 720);
  const viewportMin = Math.max(Math.min(viewportWidth, viewportHeight), 1);
  const splatScale = positiveOrDefault(options.splatScale, REAL_SCANIVERSE_SPLAT_SCALE);
  const minRadiusPx = positiveOrDefault(options.minRadiusPx, REAL_SCANIVERSE_MIN_RADIUS_PX);
  const areaCapPx = viewportWidth * viewportHeight * 0.01;
  const majorRadiusCapPx = viewportMin * 0.65;
  let maxMajorRadiusPx = 0;
  let maxMinorRadiusPx = 0;
  let maxAreaPx = 0;
  let highEnergySplatCount = 0;
  let projectedSplatCount = 0;
  const sampleOriginalIds: number[] = [];

  for (let index = 0; index < attributes.count; index++) {
    const projectedAxes = projectSplatAxesForWitness(attributes, viewProj, index, "wxyz");
    if (!projectedAxes) continue;

    const footprint = projectedFootprintFromAxes(
      projectedAxes,
      viewportMin,
      splatScale,
      minRadiusPx
    );
    projectedSplatCount += 1;
    maxMajorRadiusPx = Math.max(maxMajorRadiusPx, footprint.majorRadiusPx);
    maxMinorRadiusPx = Math.max(maxMinorRadiusPx, footprint.minorRadiusPx);
    maxAreaPx = Math.max(maxAreaPx, footprint.areaPx);
    if (footprint.areaPx > areaCapPx || footprint.majorRadiusPx > majorRadiusCapPx) {
      highEnergySplatCount += 1;
      if (sampleOriginalIds.length < 8) {
        sampleOriginalIds.push(attributes.originalIds[index] ?? index);
      }
    }
  }

  return {
    maxMajorRadiusPx,
    maxMinorRadiusPx,
    maxAreaPx,
    areaCapPx,
    majorRadiusCapPx,
    highEnergySplatCount,
    projectedSplatCount,
    sampleOriginalIds,
  };
}

function summarizeProjectedCropSupport(
  attributes: SplatAttributes,
  viewProj: mat4,
  options: MeshSplatRendererWitnessOptions,
  crop: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): ProjectedCropSupportSummary {
  const viewportWidth = positiveOrDefault(options.viewportWidth, 1280);
  const viewportHeight = positiveOrDefault(options.viewportHeight, 720);
  const viewportMin = Math.max(Math.min(viewportWidth, viewportHeight), 1);
  const splatScale = positiveOrDefault(options.splatScale, REAL_SCANIVERSE_SPLAT_SCALE);
  const minRadiusPx = positiveOrDefault(options.minRadiusPx, REAL_SCANIVERSE_MIN_RADIUS_PX);
  const cropMaxX = crop.x + crop.width;
  const cropMaxY = crop.y + crop.height;
  let projectedCenterCount = 0;
  let projectedSupportCount = 0;
  let nearFloorMinorCount = 0;
  let maxMajorRadiusPx = 0;
  let supportAreaPxSum = 0;
  const majorRadii: number[] = [];
  const minorRadii: number[] = [];
  const sampleOriginalIds: number[] = [];

  for (let index = 0; index < attributes.count; index++) {
    const center = projectSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight);
    if (!center) continue;

    if (center[0] >= crop.x && center[0] < cropMaxX && center[1] >= crop.y && center[1] < cropMaxY) {
      projectedCenterCount += 1;
    }

    const projectedAxes = projectSplatAxesForWitness(attributes, viewProj, index, "wxyz");
    if (!projectedAxes) continue;
    const footprint = projectedFootprintFromAxes(projectedAxes, viewportMin, splatScale, minRadiusPx);
    const supportIntersectsCrop =
      center[0] + footprint.majorRadiusPx >= crop.x &&
      center[0] - footprint.majorRadiusPx < cropMaxX &&
      center[1] + footprint.majorRadiusPx >= crop.y &&
      center[1] - footprint.majorRadiusPx < cropMaxY;
    if (!supportIntersectsCrop) continue;

    projectedSupportCount += 1;
    supportAreaPxSum += footprint.areaPx;
    maxMajorRadiusPx = Math.max(maxMajorRadiusPx, footprint.majorRadiusPx);
    majorRadii.push(footprint.majorRadiusPx);
    minorRadii.push(footprint.minorRadiusPx);
    if (footprint.minorRadiusPx <= minRadiusPx * 1.1) {
      nearFloorMinorCount += 1;
    }
    if (sampleOriginalIds.length < 12) {
      sampleOriginalIds.push(attributes.originalIds[index] ?? index);
    }
  }

  return {
    crop,
    projectedCenterCount,
    projectedSupportCount,
    nearFloorMinorCount,
    maxMajorRadiusPx,
    medianMajorRadiusPx: median(majorRadii),
    medianMinorRadiusPx: median(minorRadii),
    supportAreaPxSum,
    sampleOriginalIds,
  };
}

function summarizeAlphaOverlapDensity(
  attributes: SplatAttributes,
  viewProj: mat4,
  options: MeshSplatRendererWitnessOptions
): AlphaOverlapDensitySummary {
  const viewportWidth = positiveOrDefault(options.viewportWidth, 1280);
  const viewportHeight = positiveOrDefault(options.viewportHeight, 720);
  const splatScale = positiveOrDefault(options.splatScale, REAL_SCANIVERSE_SPLAT_SCALE);
  const minRadiusPx = positiveOrDefault(options.minRadiusPx, REAL_SCANIVERSE_MIN_RADIUS_PX);
  return buildAlphaDensityAccounting(
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    splatScale,
    minRadiusPx,
    "coverage-aware"
  ).summary;
}

export function writeAlphaDensityCompensatedOpacities(
  target: Float32Array,
  attributes: SplatAttributes,
  viewProj: mat4,
  viewportWidth: number,
  viewportHeight: number,
  splatScale = REAL_SCANIVERSE_SPLAT_SCALE,
  minRadiusPx = REAL_SCANIVERSE_MIN_RADIUS_PX,
  accountingMode: AlphaDensityAccountingMode = "coverage-aware"
): AlphaDensityCompensationSummary {
  if (target.length < attributes.count) {
    throw new RangeError("alpha density target is too small for the splat count");
  }

  const safeViewportWidth = positiveOrDefault(viewportWidth, 1280);
  const safeViewportHeight = positiveOrDefault(viewportHeight, 720);
  const safeSplatScale = positiveOrDefault(splatScale, REAL_SCANIVERSE_SPLAT_SCALE);
  const safeMinRadiusPx = positiveOrDefault(minRadiusPx, REAL_SCANIVERSE_MIN_RADIUS_PX);

  for (let index = 0; index < attributes.count; index++) {
    target[index] = clampUnit(attributes.opacities[index]);
  }

  const accounting = buildAlphaDensityAccounting(
    attributes,
    viewProj,
    safeViewportWidth,
    safeViewportHeight,
    safeSplatScale,
    safeMinRadiusPx,
    accountingMode
  );
  const alphaMassCap = accounting.summary.alphaMassCap;

  let compensatedSplatCount = 0;
  let minCompensationExponent = 1;
  for (let index = 0; index < attributes.count; index++) {
    const tileKeys = accounting.splatTileKeys[index];
    if (!tileKeys?.length) continue;

    let exponent = 1;
    for (const tileKey of tileKeys) {
      const tile = accounting.tiles.get(tileKey);
      if (!tile || tile.alphaMass <= alphaMassCap) continue;
      exponent = Math.min(exponent, Math.max(0, Math.min(1, alphaMassCap / tile.alphaMass)));
    }
    if (exponent >= 1) continue;

    const opacityFloor = target[index] * MIN_ALPHA_DENSITY_OPACITY_FRACTION;
    target[index] = Math.max(compensateAlphaOpticalDepth(target[index], exponent), opacityFloor);
    compensatedSplatCount += 1;
    minCompensationExponent = Math.min(minCompensationExponent, exponent);
  }

  return {
    ...accounting.summary,
    compensatedSplatCount,
    minCompensationExponent,
  };
}

function buildAlphaDensityAccounting(
  attributes: SplatAttributes,
  viewProj: mat4,
  viewportWidth: number,
  viewportHeight: number,
  splatScale: number,
  minRadiusPx: number,
  accountingMode: AlphaDensityAccountingMode
): AlphaDensityAccounting {
  const viewportMin = Math.max(Math.min(viewportWidth, viewportHeight), 1);
  const tileSizePx = ALPHA_DENSITY_TILE_SIZE_PX;
  const alphaMassCap = tileSizePx * tileSizePx * 0.75;
  const tileColumns = Math.max(1, Math.ceil(viewportWidth / tileSizePx));
  const tileRows = Math.max(1, Math.ceil(viewportHeight / tileSizePx));
  const splatTileKeys = Array.from({ length: attributes.count }, () => [] as number[]);
  const tiles = new Map<number, AlphaDensityTile>();
  let tileEntryCount = 0;
  let maxSplatCoveredTileCount = 0;
  let maxCenterTileDroppedCoverageFraction = 0;

  for (let index = 0; index < attributes.count; index++) {
    const opacity = clampUnit(attributes.opacities[index]);
    const center = projectSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight);
    if (!center) continue;

    const projectedAxes = projectSplatAxesForWitness(attributes, viewProj, index, "wxyz");
    if (!projectedAxes) continue;

    const footprint = projectedFootprintFromAxes(projectedAxes, viewportMin, splatScale, minRadiusPx);
    const centerTileX = clampInteger(Math.floor(center[0] / tileSizePx), 0, tileColumns - 1);
    const centerTileY = clampInteger(Math.floor(center[1] / tileSizePx), 0, tileRows - 1);
    const centerTileKey = centerTileY * tileColumns + centerTileX;

    if (accountingMode === "center-tile") {
      addAlphaDensityTileMass(
        tiles,
        centerTileKey,
        opacity * footprint.areaPx,
        index,
        attributes
      );
      splatTileKeys[index].push(centerTileKey);
      tileEntryCount += 1;
      maxSplatCoveredTileCount = Math.max(maxSplatCoveredTileCount, 1);
      continue;
    }

    const covariance = projectedCovariancePx(projectedAxes, viewportMin, splatScale);
    const bounds = projectedGaussianTileBounds(center, covariance, tileSizePx, tileColumns, tileRows);
    const touchedTiles: number[] = [];
    let totalCoverageWeight = 0;
    let centerTileCoverageWeight = 0;

    for (let tileY = bounds.minTileY; tileY <= bounds.maxTileY; tileY++) {
      for (let tileX = bounds.minTileX; tileX <= bounds.maxTileX; tileX++) {
        const tileKey = tileY * tileColumns + tileX;
        const coverageWeight = approximateGaussianTileCoverage(
          center,
          covariance,
          tileX * tileSizePx,
          tileY * tileSizePx,
          Math.min((tileX + 1) * tileSizePx, viewportWidth),
          Math.min((tileY + 1) * tileSizePx, viewportHeight)
        );
        if (coverageWeight <= 0) continue;

        addAlphaDensityTileMass(
          tiles,
          tileKey,
          opacity * footprint.areaPx * coverageWeight,
          index,
          attributes
        );
        touchedTiles.push(tileKey);
        totalCoverageWeight += coverageWeight;
        if (tileKey === centerTileKey) {
          centerTileCoverageWeight += coverageWeight;
        }
      }
    }

    if (touchedTiles.length === 0) {
      addAlphaDensityTileMass(
        tiles,
        centerTileKey,
        opacity * footprint.areaPx,
        index,
        attributes
      );
      touchedTiles.push(centerTileKey);
      totalCoverageWeight = 1;
      centerTileCoverageWeight = 1;
    }

    splatTileKeys[index].push(...touchedTiles);
    tileEntryCount += touchedTiles.length;
    maxSplatCoveredTileCount = Math.max(maxSplatCoveredTileCount, touchedTiles.length);
    if (totalCoverageWeight > 0) {
      maxCenterTileDroppedCoverageFraction = Math.max(
        maxCenterTileDroppedCoverageFraction,
        1 - centerTileCoverageWeight / totalCoverageWeight
      );
    }
  }

  return {
    summary: summarizeAlphaDensityTiles(
      tiles,
      tileSizePx,
      alphaMassCap,
      accountingMode,
      tileEntryCount,
      maxSplatCoveredTileCount,
      maxCenterTileDroppedCoverageFraction
    ),
    tiles,
    splatTileKeys,
  };
}

function summarizeAlphaDensityTiles(
  tiles: Map<number, AlphaDensityTile>,
  tileSizePx: number,
  alphaMassCap: number,
  accountingMode: AlphaDensityAccountingMode,
  tileEntryCount: number,
  maxSplatCoveredTileCount: number,
  maxCenterTileDroppedCoverageFraction: number
): AlphaOverlapDensitySummary {
  let maxTileAlphaMass = 0;
  let maxTileSplatCount = 0;
  let hotTileCount = 0;
  let sampleOriginalIds: number[] = [];
  for (const tile of tiles.values()) {
    if (tile.alphaMass > alphaMassCap) {
      hotTileCount += 1;
      if (sampleOriginalIds.length === 0) {
        sampleOriginalIds = tile.sampleOriginalIds;
      }
    }
    if (tile.alphaMass > maxTileAlphaMass) {
      maxTileAlphaMass = tile.alphaMass;
      maxTileSplatCount = tile.splatCount;
      if (hotTileCount === 0) {
        sampleOriginalIds = tile.sampleOriginalIds;
      }
    }
  }

  return {
    accountingMode,
    tileSizePx,
    alphaMassCap,
    maxTileAlphaMass,
    maxTileSplatCount,
    hotTileCount,
    tileEntryCount,
    maxSplatCoveredTileCount,
    maxCenterTileDroppedCoverageFraction,
    sampleOriginalIds,
  };
}

function addAlphaDensityTileMass(
  tiles: Map<number, AlphaDensityTile>,
  tileKey: number,
  alphaMass: number,
  splatIndex: number,
  attributes: SplatAttributes
): void {
  const tile = tiles.get(tileKey) ?? { alphaMass: 0, splatCount: 0, sampleOriginalIds: [] };
  tile.alphaMass += alphaMass;
  tile.splatCount += 1;
  if (tile.sampleOriginalIds.length < 8) {
    tile.sampleOriginalIds.push(attributes.originalIds[splatIndex] ?? splatIndex);
  }
  tiles.set(tileKey, tile);
}

function projectedCovariancePx(
  projectedAxes: readonly [number, number][],
  viewportMin: number,
  splatScale: number
): { readonly xx: number; readonly xy: number; readonly yy: number } {
  const axisScale = (splatScale / 600) * viewportMin * 0.5;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const axis of projectedAxes) {
    const axisX = axis[0] * axisScale;
    const axisY = axis[1] * axisScale;
    xx += axisX * axisX;
    xy += axisX * axisY;
    yy += axisY * axisY;
  }
  return { xx, xy, yy };
}

function projectedGaussianTileBounds(
  center: readonly [number, number],
  covariance: { readonly xx: number; readonly xy: number; readonly yy: number },
  tileSizePx: number,
  tileColumns: number,
  tileRows: number
): {
  readonly minTileX: number;
  readonly maxTileX: number;
  readonly minTileY: number;
  readonly maxTileY: number;
} {
  const supportX = ALPHA_DENSITY_GAUSSIAN_SUPPORT_SIGMA * Math.sqrt(Math.max(covariance.xx, 1e-6));
  const supportY = ALPHA_DENSITY_GAUSSIAN_SUPPORT_SIGMA * Math.sqrt(Math.max(covariance.yy, 1e-6));
  return {
    minTileX: clampInteger(Math.floor((center[0] - supportX) / tileSizePx), 0, tileColumns - 1),
    maxTileX: clampInteger(Math.floor((center[0] + supportX) / tileSizePx), 0, tileColumns - 1),
    minTileY: clampInteger(Math.floor((center[1] - supportY) / tileSizePx), 0, tileRows - 1),
    maxTileY: clampInteger(Math.floor((center[1] + supportY) / tileSizePx), 0, tileRows - 1),
  };
}

function approximateGaussianTileCoverage(
  center: readonly [number, number],
  covariance: { readonly xx: number; readonly xy: number; readonly yy: number },
  tileMinX: number,
  tileMinY: number,
  tileMaxX: number,
  tileMaxY: number
): number {
  const det = covariance.xx * covariance.yy - covariance.xy * covariance.xy;
  if (!Number.isFinite(det) || det <= 1e-12 || tileMaxX <= tileMinX || tileMaxY <= tileMinY) {
    return 0;
  }

  const invXX = covariance.yy / det;
  const invXY = -covariance.xy / det;
  const invYY = covariance.xx / det;
  const normalizer = 1 / (2 * Math.PI * Math.sqrt(det));
  const samples = ALPHA_DENSITY_COVERAGE_SAMPLES_PER_AXIS;
  const stepX = (tileMaxX - tileMinX) / samples;
  const stepY = (tileMaxY - tileMinY) / samples;
  let densitySum = 0;

  for (let sampleY = 0; sampleY < samples; sampleY++) {
    const y = tileMinY + (sampleY + 0.5) * stepY;
    const dy = y - center[1];
    for (let sampleX = 0; sampleX < samples; sampleX++) {
      const x = tileMinX + (sampleX + 0.5) * stepX;
      const dx = x - center[0];
      const mahalanobis = dx * dx * invXX + 2 * dx * dy * invXY + dy * dy * invYY;
      densitySum += normalizer * Math.exp(-0.5 * mahalanobis);
    }
  }

  return Math.max(0, Math.min(1, densitySum * stepX * stepY));
}

function projectSplatCenterPx(
  attributes: SplatAttributes,
  viewProj: mat4,
  index: number,
  viewportWidth: number,
  viewportHeight: number
): [number, number] | null {
  const vecBase = index * 3;
  const position: [number, number, number] = [
    attributes.positions[vecBase],
    attributes.positions[vecBase + 1],
    attributes.positions[vecBase + 2],
  ];
  const centerClip = transformPoint(viewProj, position);
  if (!clipInside(centerClip)) return null;

  const ndcX = centerClip[0] / centerClip[3];
  const ndcY = centerClip[1] / centerClip[3];
  const pixelX = (ndcX * 0.5 + 0.5) * viewportWidth;
  const pixelY = (0.5 - ndcY * 0.5) * viewportHeight;
  if (pixelX < 0 || pixelX >= viewportWidth || pixelY < 0 || pixelY >= viewportHeight) {
    return null;
  }
  return [pixelX, pixelY];
}

function readRotation(
  rotations: Float32Array,
  quatBase: number,
  rotationOrder: "wxyz" | "xyzw"
): [number, number, number, number] {
  const a = rotations[quatBase];
  const b = rotations[quatBase + 1];
  const c = rotations[quatBase + 2];
  const d = rotations[quatBase + 3];
  return rotationOrder === "wxyz" ? [a, b, c, d] : [d, a, b, c];
}

function transformPoint(matrix: mat4, point: readonly [number, number, number]): [number, number, number, number] {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15],
  ];
}

function clipInside(clip: readonly [number, number, number, number]): boolean {
  return clip[3] > 0.0001 && clip[2] >= 0 && clip[2] <= clip[3];
}

function projectAxisJacobian(
  viewProj: mat4,
  axis: readonly [number, number, number],
  centerClip: readonly [number, number, number, number]
): [number, number] {
  const safeW = Math.max(Math.abs(centerClip[3]), 0.0001);
  const clipW2 = safeW * safeW;
  const row0: [number, number, number] = [viewProj[0], viewProj[4], viewProj[8]];
  const row1: [number, number, number] = [viewProj[1], viewProj[5], viewProj[9]];
  const row3: [number, number, number] = [viewProj[3], viewProj[7], viewProj[11]];
  const jacobianX: [number, number, number] = [
    (centerClip[3] * row0[0] - centerClip[0] * row3[0]) / clipW2,
    (centerClip[3] * row0[1] - centerClip[0] * row3[1]) / clipW2,
    (centerClip[3] * row0[2] - centerClip[0] * row3[2]) / clipW2,
  ];
  const jacobianY: [number, number, number] = [
    (centerClip[3] * row1[0] - centerClip[1] * row3[0]) / clipW2,
    (centerClip[3] * row1[1] - centerClip[1] * row3[1]) / clipW2,
    (centerClip[3] * row1[2] - centerClip[1] * row3[2]) / clipW2,
  ];
  return [dot3(jacobianX, axis), dot3(jacobianY, axis)];
}

function projectedFootprintFromAxes(
  projectedAxes: readonly [number, number][],
  viewportMin: number,
  splatScale: number,
  minRadiusPx: number
): { readonly majorRadiusPx: number; readonly minorRadiusPx: number; readonly areaPx: number } {
  const eigenvalues = projectedCovarianceEigenvalues(projectedAxes);
  const radiusScale = splatScale / 600;
  const rawMajorRadiusPx = Math.sqrt(eigenvalues.major) * radiusScale * viewportMin * 0.5;
  const rawMinorRadiusPx = Math.sqrt(eigenvalues.minor) * radiusScale * viewportMin * 0.5;
  const majorRadiusPx = Math.max(rawMajorRadiusPx, minRadiusPx);
  const minorRadiusPx = boundedMinorRadiusPx(rawMajorRadiusPx, rawMinorRadiusPx, minRadiusPx);
  return {
    majorRadiusPx,
    minorRadiusPx,
    areaPx: Math.PI * majorRadiusPx * minorRadiusPx,
  };
}

function boundedMinorRadiusPx(
  rawMajorRadiusPx: number,
  rawMinorRadiusPx: number,
  minRadiusPx: number
): number {
  if (rawMinorRadiusPx >= minRadiusPx) {
    return rawMinorRadiusPx;
  }
  if (rawMajorRadiusPx < minRadiusPx) {
    return minRadiusPx;
  }
  const inflatedMinorPx = Math.max(
    rawMinorRadiusPx * MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION,
    minRadiusPx * MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION
  );
  return Math.min(minRadiusPx, inflatedMinorPx);
}

function projectedCovarianceAnisotropy(projectedAxes: readonly [number, number][]): number {
  const eigenvalues = projectedCovarianceEigenvalues(projectedAxes);
  return Math.sqrt(eigenvalues.major) / Math.max(Math.sqrt(eigenvalues.minor), 1e-12);
}

function projectedCovarianceEigenvalues(
  projectedAxes: readonly [number, number][]
): { readonly major: number; readonly minor: number } {
  let a = 0;
  let b = 0;
  let d = 0;
  for (const axis of projectedAxes) {
    a += axis[0] * axis[0];
    b += axis[0] * axis[1];
    d += axis[1] * axis[1];
  }
  const trace = 0.5 * (a + d);
  const diff = 0.5 * (a - d);
  const root = Math.sqrt(diff * diff + b * b);
  const lambda0 = Math.max(trace + root, 0);
  const lambda1 = Math.max(trace - root, 0);
  return { major: lambda0, minor: lambda1 };
}

function rotateAxis(
  rotation: readonly [number, number, number, number],
  axis: readonly [number, number, number]
): [number, number, number] {
  const length = Math.hypot(rotation[0], rotation[1], rotation[2], rotation[3]);
  const safeLength = Math.max(length, 0.000001);
  const w = rotation[0] / safeLength;
  const u: [number, number, number] = [
    rotation[1] / safeLength,
    rotation[2] / safeLength,
    rotation[3] / safeLength,
  ];
  const inner = add3(cross3(u, axis), scale3(axis, w));
  return add3(axis, scale3(cross3(u, inner), 2));
}

function add3(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(v: readonly [number, number, number], scalar: number): [number, number, number] {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function cross3(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function positiveOrDefault(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function compensateAlphaOpticalDepth(alpha: number, exponent: number): number {
  return 1 - Math.pow(1 - clampUnit(alpha), exponent);
}

export function exposeMeshSplatSmokeEvidence(
  evidence: MeshSplatSmokeEvidence,
  canvas: HTMLCanvasElement
): void {
  window.__MESH_SPLAT_SMOKE__ = evidence;
  document.body.dataset.smokeSourceKind = evidence.sourceKind;
  document.body.dataset.smokeSplatCount = String(evidence.splatCount);
  document.body.dataset.smokeAssetPath = evidence.assetPath;
  document.body.dataset.smokeReady = String(evidence.ready);
  document.body.dataset.smokeSortBackend = evidence.sortBackend;
  canvas.dataset.smokeSourceKind = evidence.sourceKind;
  canvas.dataset.smokeSplatCount = String(evidence.splatCount);
  canvas.dataset.smokeAssetPath = evidence.assetPath;
  canvas.dataset.smokeSortBackend = evidence.sortBackend;
}

export function exposeMeshSplatRendererWitness(
  witness: MeshSplatRendererWitness,
  canvas: HTMLCanvasElement
): void {
  window.__MESH_SPLAT_WITNESS__ = witness;
  canvas.dataset.rendererFidelityWitness = "true";
}
