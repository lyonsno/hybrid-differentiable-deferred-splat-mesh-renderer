import type { Camera } from "./camera.js";
import { mulMat4, type mat4 } from "./math.js";
import { framingFromBounds, type SplatAttributes, type SplatBounds } from "./splats.js";

export const REAL_SCANIVERSE_SMOKE_ASSET_PATH =
  "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json";

export const REAL_SCANIVERSE_SPLAT_SCALE = 3000;
export const REAL_SCANIVERSE_MIN_RADIUS_PX = 1.5;

const VIEWER_VERTICAL_FLIP = new Float32Array([
  1, 0, 0, 0,
  0, -1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

export interface MeshSplatSmokeEvidence {
  readonly ready: boolean;
  readonly sourceKind: "real_scaniverse_ply";
  readonly realScaniverse: true;
  readonly realSplatEvidence: true;
  readonly synthetic: false;
  readonly assetPath: string;
  readonly splatCount: number;
  readonly sortedIdCount: number;
  readonly boundsRadius: number;
}

declare global {
  interface Window {
    __MESH_SPLAT_SMOKE__?: MeshSplatSmokeEvidence;
  }
}

export function configureCameraForSplatBounds(camera: Camera, bounds: SplatBounds): void {
  const framing = framingFromBounds(bounds, { padding: 1.45 });
  camera.target = [...framing.target];
  camera.distance = framing.distance;
  camera.near = framing.near;
  camera.far = framing.far;
  camera.azimuth = 0;
  camera.elevation = 0.18;
}

export function composeFirstSmokeViewProjection(projection: mat4, view: mat4): mat4 {
  return mulMat4(VIEWER_VERTICAL_FLIP, mulMat4(projection, view));
}

export function createMeshSplatSmokeEvidence(
  attributes: SplatAttributes,
  sortedIds: Uint32Array,
  assetPath = REAL_SCANIVERSE_SMOKE_ASSET_PATH
): MeshSplatSmokeEvidence {
  return {
    ready: true,
    sourceKind: "real_scaniverse_ply",
    realScaniverse: true,
    realSplatEvidence: true,
    synthetic: false,
    assetPath,
    splatCount: attributes.count,
    sortedIdCount: sortedIds.length,
    boundsRadius: attributes.bounds.radius,
  };
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
  canvas.dataset.smokeSourceKind = evidence.sourceKind;
  canvas.dataset.smokeSplatCount = String(evidence.splatCount);
  canvas.dataset.smokeAssetPath = evidence.assetPath;
}
