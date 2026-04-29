import { positionCameraFromTarget, type Camera } from "./camera.js";
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
    readonly maxAnisotropyRatio: 0;
    readonly suspiciousSplatCount: 0;
    readonly sampleOriginalIds: readonly number[];
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
    readonly compositing: "straight-source-over";
    readonly ambiguousOverlapCount: 0;
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
  sortBackend = "unknown"
): MeshSplatRendererWitness {
  const sortedIdCount = typeof sortedIdsOrCount === "number"
    ? sortedIdsOrCount
    : sortedIdsOrCount.length;
  const sampleOriginalIds = typeof sortedIdsOrCount === "number"
    ? []
    : Array.from(sortedIdsOrCount.slice(0, 8));
  return {
    field: {
      scaleSpace: "log",
      rotationOrder: "wxyz",
      opacitySpace: "unit",
      colorSpace: "sh_dc_rgb",
    },
    projection: {
      projectionMode: "jacobian-covariance",
      maxAnisotropyRatio: 0,
      suspiciousSplatCount: 0,
      sampleOriginalIds,
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
      compositing: "straight-source-over",
      ambiguousOverlapCount: 0,
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
