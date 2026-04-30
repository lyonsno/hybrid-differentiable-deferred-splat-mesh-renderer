import { buildGpuTileCoverageBridge } from "./gpuTileCoverageBridge.js";
import { buildProjectedGaussianTileCoverage } from "./rendererFidelityProbes/tileCoverage.js";

export function buildTileLocalPrepassBridge({
  attributes,
  viewProj,
  viewportWidth,
  viewportHeight,
  tileSizePx,
  samplesPerAxis,
  splatScale,
  minRadiusPx,
}) {
  const viewportMin = Math.max(Math.min(viewportWidth, viewportHeight), 1);
  const splats = [];

  for (let index = 0; index < attributes.count; index++) {
    const centerPx = projectSplatCenterPx(attributes, viewProj, index, viewportWidth, viewportHeight);
    if (!centerPx) {
      continue;
    }
    const scaleBase = index * 3;
    const sx = Math.exp(attributes.scales[scaleBase] ?? 0);
    const sy = Math.exp(attributes.scales[scaleBase + 1] ?? 0);
    const radiusX = Math.max(minRadiusPx, sx * splatScale * viewportMin / 1200);
    const radiusY = Math.max(minRadiusPx, sy * splatScale * viewportMin / 1200);
    splats.push({
      splatIndex: index,
      originalId: attributes.originalIds[index] ?? index,
      centerPx,
      covariancePx: {
        xx: radiusX * radiusX,
        xy: 0,
        yy: radiusY * radiusY,
      },
    });
  }

  const coverage = buildProjectedGaussianTileCoverage({
    viewportWidth,
    viewportHeight,
    tileSizePx,
    samplesPerAxis,
    splats,
  });
  return buildGpuTileCoverageBridge({
    ...coverage,
    sourceSplatCount: attributes.count,
  });
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
