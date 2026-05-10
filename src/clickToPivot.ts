import type { mat4, vec3 } from "./math.js";
import type { SplatAttributes } from "./splats.js";
import type { Camera } from "./camera.js";
import { getProjectionMatrix, getViewMatrix, positionCameraFromTarget } from "./camera.js";

export interface ClickToPivotCandidate {
  readonly splatIndex: number;
  readonly screenDistancePx: number;
  readonly viewDepth: number;
  readonly opacity: number;
  readonly score: number;
  readonly worldPosition: vec3;
}

export interface ClickToPivotResult {
  readonly candidate: ClickToPivotCandidate | null;
  readonly searched: number;
}

export interface ClickToPivotOptions {
  readonly clickX: number;
  readonly clickY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly searchRadiusPx?: number;
  readonly minOpacity?: number;
}

const DEFAULT_SEARCH_RADIUS_PX = 24;
const DEFAULT_MIN_OPACITY = 0.05;

export function findClickToPivotCandidate(
  attributes: SplatAttributes,
  viewProj: mat4,
  viewportWidth: number,
  viewportHeight: number,
  options: ClickToPivotOptions
): ClickToPivotResult {
  const searchRadius = options.searchRadiusPx ?? DEFAULT_SEARCH_RADIUS_PX;
  const minOpacity = options.minOpacity ?? DEFAULT_MIN_OPACITY;
  const clickX = options.clickX;
  const clickY = options.clickY;

  let bestCandidate: ClickToPivotCandidate | null = null;
  let searched = 0;

  for (let i = 0; i < attributes.count; i++) {
    const px = i * 3;
    const x = attributes.positions[px];
    const y = attributes.positions[px + 1];
    const z = attributes.positions[px + 2];

    // Project to clip space
    const clipX = viewProj[0] * x + viewProj[4] * y + viewProj[8] * z + viewProj[12];
    const clipY = viewProj[1] * x + viewProj[5] * y + viewProj[9] * z + viewProj[13];
    const clipW = viewProj[3] * x + viewProj[7] * y + viewProj[11] * z + viewProj[15];

    // Behind camera
    if (clipW <= 0) continue;

    const ndcX = clipX / clipW;
    const ndcY = clipY / clipW;

    // NDC to pixel (y-down)
    const screenX = (ndcX * 0.5 + 0.5) * viewportWidth;
    const screenY = (1 - (ndcY * 0.5 + 0.5)) * viewportHeight;

    const dx = screenX - clickX;
    const dy = screenY - clickY;
    const screenDistancePx = Math.sqrt(dx * dx + dy * dy);

    if (screenDistancePx > searchRadius) continue;

    searched++;

    const opacity = attributes.opacities[i];
    if (opacity < minOpacity) continue;

    // View depth (z in clip/w gives NDC depth, but for scoring we want linear view depth)
    const clipZ = viewProj[2] * x + viewProj[6] * y + viewProj[10] * z + viewProj[14];
    const viewDepth = clipZ / clipW;

    // Score: prefer close to click center, high opacity, and nearer depth
    // Normalize screen distance by search radius, depth by [0,1] NDC range
    const proximityScore = 1 - screenDistancePx / searchRadius;
    const opacityScore = opacity;
    const depthScore = 1 - Math.max(0, Math.min(1, viewDepth));
    const score = proximityScore * 0.4 + opacityScore * 0.3 + depthScore * 0.3;

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = {
        splatIndex: i,
        screenDistancePx,
        viewDepth,
        opacity,
        score,
        worldPosition: [x, y, z],
      };
    }
  }

  return { candidate: bestCandidate, searched };
}

export function reanchorOrbitTarget(cam: Camera, worldPoint: vec3): void {
  cam.target = [worldPoint[0], worldPoint[1], worldPoint[2]];
  cam.panOffset = [0, 0, 0];
  positionCameraFromTarget(cam);
}

export function handleDoubleClickPivot(
  cam: Camera,
  attributes: SplatAttributes,
  clickX: number,
  clickY: number,
  viewportWidth: number,
  viewportHeight: number
): ClickToPivotResult {
  const view = getViewMatrix(cam);
  const proj = getProjectionMatrix(cam, viewportWidth / viewportHeight);
  const viewProj = multiplyMat4(proj, view);

  const result = findClickToPivotCandidate(
    attributes,
    viewProj,
    viewportWidth,
    viewportHeight,
    { clickX, clickY, viewportWidth, viewportHeight }
  );

  if (result.candidate) {
    reanchorOrbitTarget(cam, result.candidate.worldPosition);
  }

  return result;
}

function multiplyMat4(a: mat4, b: mat4): mat4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}
