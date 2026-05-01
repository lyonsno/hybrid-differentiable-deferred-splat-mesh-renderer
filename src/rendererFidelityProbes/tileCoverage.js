const DEFAULT_TILE_SIZE_PX = 32;
const DEFAULT_SIGMA_RADIUS = 3;
const DEFAULT_SAMPLES_PER_AXIS = 5;
const EPSILON = 1e-9;

const readPositiveFinite = (value, name) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
  return value;
};

const readNonNegativeInteger = (value, name) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const readCenterPx = (centerPx) => {
  if (!Array.isArray(centerPx) || centerPx.length !== 2 || !centerPx.every(Number.isFinite)) {
    throw new Error("centerPx must be a finite [x, y] pair");
  }
  return centerPx;
};

const readCovariancePx = (covariancePx) => {
  const { xx, xy = 0, yy } = covariancePx ?? {};
  if (![xx, xy, yy].every(Number.isFinite)) {
    throw new Error("covariancePx must contain finite xx, xy, and yy values");
  }
  const determinant = xx * yy - xy * xy;
  if (xx <= 0 || yy <= 0 || determinant <= 0) {
    throw new Error("covariancePx must be positive definite");
  }
  return { xx, xy, yy, determinant };
};

const tileIndexFor = (tileX, tileY, tileColumns) => tileY * tileColumns + tileX;

const covarianceDensity = (x, y, centerPx, covariance) => {
  const dx = x - centerPx[0];
  const dy = y - centerPx[1];
  const invXx = covariance.yy / covariance.determinant;
  const invXy = -covariance.xy / covariance.determinant;
  const invYy = covariance.xx / covariance.determinant;
  const mahalanobis2 = invXx * dx * dx + 2 * invXy * dx * dy + invYy * dy * dy;
  const normalization = 1 / (2 * Math.PI * Math.sqrt(covariance.determinant));
  return normalization * Math.exp(-0.5 * mahalanobis2);
};

const integrateGaussianOverTile = ({
  centerPx,
  covariance,
  tileMinX,
  tileMinY,
  tileMaxX,
  tileMaxY,
  samplesPerAxis,
}) => {
  const width = tileMaxX - tileMinX;
  const height = tileMaxY - tileMinY;
  if (width <= 0 || height <= 0) return 0;

  let densitySum = 0;
  for (let yIndex = 0; yIndex < samplesPerAxis; yIndex++) {
    const y = tileMinY + ((yIndex + 0.5) / samplesPerAxis) * height;
    for (let xIndex = 0; xIndex < samplesPerAxis; xIndex++) {
      const x = tileMinX + ((xIndex + 0.5) / samplesPerAxis) * width;
      densitySum += covarianceDensity(x, y, centerPx, covariance);
    }
  }
  return (densitySum / (samplesPerAxis * samplesPerAxis)) * width * height;
};

const tileBoundsForSplat = ({ centerPx, covariance, viewportWidth, viewportHeight, tileSizePx, sigmaRadius }) => {
  const radiusX = sigmaRadius * Math.sqrt(covariance.xx);
  const radiusY = sigmaRadius * Math.sqrt(covariance.yy);
  const minX = clamp(centerPx[0] - radiusX, 0, viewportWidth);
  const maxX = clamp(centerPx[0] + radiusX, 0, viewportWidth);
  const minY = clamp(centerPx[1] - radiusY, 0, viewportHeight);
  const maxY = clamp(centerPx[1] + radiusY, 0, viewportHeight);
  const maxTileXLimit = Math.max(0, Math.ceil(viewportWidth / tileSizePx) - 1);
  const maxTileYLimit = Math.max(0, Math.ceil(viewportHeight / tileSizePx) - 1);

  return {
    minTileX: clamp(Math.floor(minX / tileSizePx), 0, maxTileXLimit),
    minTileY: clamp(Math.floor(minY / tileSizePx), 0, maxTileYLimit),
    maxTileX: clamp(Math.floor((maxX - EPSILON) / tileSizePx), 0, maxTileXLimit),
    maxTileY: clamp(Math.floor((maxY - EPSILON) / tileSizePx), 0, maxTileYLimit),
  };
};

export function buildProjectedGaussianTileCoverage({
  viewportWidth,
  viewportHeight,
  tileSizePx = DEFAULT_TILE_SIZE_PX,
  sigmaRadius = DEFAULT_SIGMA_RADIUS,
  samplesPerAxis = DEFAULT_SAMPLES_PER_AXIS,
  maxTileEntries = Number.POSITIVE_INFINITY,
  splats,
}) {
  readPositiveFinite(viewportWidth, "viewportWidth");
  readPositiveFinite(viewportHeight, "viewportHeight");
  readPositiveFinite(tileSizePx, "tileSizePx");
  readPositiveFinite(sigmaRadius, "sigmaRadius");
  readPositiveFinite(samplesPerAxis, "samplesPerAxis");
  if (!Number.isFinite(maxTileEntries) && maxTileEntries !== Number.POSITIVE_INFINITY) {
    throw new Error("maxTileEntries must be a positive finite number or Infinity");
  }
  if (maxTileEntries !== Number.POSITIVE_INFINITY) {
    readPositiveFinite(maxTileEntries, "maxTileEntries");
  }
  if (!Array.isArray(splats)) {
    throw new Error("splats must be an array");
  }

  const tileColumns = Math.max(1, Math.ceil(viewportWidth / tileSizePx));
  const tileRows = Math.max(1, Math.ceil(viewportHeight / tileSizePx));
  const splatCoverages = [];
  const tileEntries = [];

  for (const splat of splats) {
    const splatIndex = readNonNegativeInteger(splat.splatIndex, "splatIndex");
    const originalId = readNonNegativeInteger(splat.originalId, "originalId");
    const centerPx = readCenterPx(splat.centerPx);
    const covariance = readCovariancePx(splat.covariancePx);
    const tileBounds = tileBoundsForSplat({
      centerPx,
      covariance,
      viewportWidth,
      viewportHeight,
      tileSizePx,
      sigmaRadius,
    });
    const centerTile = {
      tileX: clamp(Math.floor(centerPx[0] / tileSizePx), 0, tileColumns - 1),
      tileY: clamp(Math.floor(centerPx[1] / tileSizePx), 0, tileRows - 1),
      tileIndex: 0,
      coverageWeight: 0,
    };
    centerTile.tileIndex = tileIndexFor(centerTile.tileX, centerTile.tileY, tileColumns);

    const splatTiles = [];
    for (let tileY = tileBounds.minTileY; tileY <= tileBounds.maxTileY; tileY++) {
      for (let tileX = tileBounds.minTileX; tileX <= tileBounds.maxTileX; tileX++) {
        const tileMinX = tileX * tileSizePx;
        const tileMinY = tileY * tileSizePx;
        const tileMaxX = Math.min(viewportWidth, tileMinX + tileSizePx);
        const tileMaxY = Math.min(viewportHeight, tileMinY + tileSizePx);
        const coverageWeight = integrateGaussianOverTile({
          centerPx,
          covariance,
          tileMinX,
          tileMinY,
          tileMaxX,
          tileMaxY,
          samplesPerAxis,
        });
        if (coverageWeight <= 0) continue;

        const tileIndex = tileIndexFor(tileX, tileY, tileColumns);
        const entry = { tileIndex, tileX, tileY, splatIndex, originalId, coverageWeight };
        splatTiles.push(entry);
        tileEntries.push(entry);
        if (tileEntries.length > maxTileEntries) {
          throw new Error(`projected tile refs exceed budget: ${tileEntries.length} > ${maxTileEntries}`);
        }
        if (tileIndex === centerTile.tileIndex) {
          centerTile.coverageWeight = coverageWeight;
        }
      }
    }

    splatCoverages.push({
      splatIndex,
      originalId,
      centerPx: [...centerPx],
      covariancePx: { xx: covariance.xx, xy: covariance.xy, yy: covariance.yy },
      centerTile,
      tileBounds,
      tiles: splatTiles,
      totalCoverageWeight: splatTiles.reduce((sum, entry) => sum + entry.coverageWeight, 0),
    });
  }

  tileEntries.sort((a, b) => a.tileIndex - b.tileIndex || a.splatIndex - b.splatIndex || a.originalId - b.originalId);

  return {
    viewportWidth,
    viewportHeight,
    tileSizePx,
    tileColumns,
    tileRows,
    sigmaRadius,
    samplesPerAxis,
    splats: splatCoverages,
    tileEntries,
  };
}

export function summarizeCenterTileCoverageFailure(coverage) {
  if (!coverage || !Array.isArray(coverage.splats)) {
    throw new Error("coverage must be a tile coverage result");
  }

  let worstSplat = null;
  for (const splat of coverage.splats) {
    const totalCoverageWeight = splat.totalCoverageWeight;
    const centerTileCoverageWeight = splat.centerTile.coverageWeight;
    const droppedCoverageWeight = Math.max(0, totalCoverageWeight - centerTileCoverageWeight);
    const droppedCoverageFraction =
      totalCoverageWeight > 0 ? droppedCoverageWeight / totalCoverageWeight : 0;
    const summary = {
      splatIndex: splat.splatIndex,
      originalId: splat.originalId,
      centerTile: { ...splat.centerTile },
      coveredTileCount: splat.tiles.length,
      totalCoverageWeight,
      centerTileCoverageWeight,
      droppedCoverageWeight,
      droppedCoverageFraction,
    };
    if (!worstSplat || summary.droppedCoverageFraction > worstSplat.droppedCoverageFraction) {
      worstSplat = summary;
    }
  }

  return {
    splatCount: coverage.splats.length,
    tileEntryCount: coverage.tileEntries.length,
    worstSplat,
  };
}
