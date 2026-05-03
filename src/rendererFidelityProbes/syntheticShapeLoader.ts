/**
 * syntheticShapeLoader.ts
 *
 * Converts synthetic fixture data (SplatAttributeData[]) into the SplatAttributes
 * format that the real renderer expects.
 *
 * Owned by: renderer-path-integration lane, pixel-witness-shape-guillotine packet.
 *
 * The companion `syntheticShapeLoader.js` is the plain-JS version for smoke tests
 * (no compilation needed). Both files must be kept in sync.
 *
 * Field conventions:
 *   positions:   Float32Array [x, y, z, ...] — world-space
 *   colors:      Float32Array [r, g, b, ...] — sh_dc_rgb linear [0, 1]
 *   opacities:   Float32Array [op, ...]       — unit-space [0, 1]
 *   radii:       Float32Array [r, ...]        — max of exp(scale_xyz) per splat
 *   scales:      Float32Array [lsx, lsy, lsz, ...] — log-space per-splat
 *   rotations:   Float32Array [w, x, y, z, ...] — wxyz unit quaternion
 *   originalIds: Uint32Array [0, 1, 2, ...]   — sequential
 *   bounds:      { min, max, center, radius }  — tight bounds over positions
 *   layout:      standard FIRST_SMOKE_SPLAT_LAYOUT
 *   sourceKind:  "shape-witness-<fixture-id>"
 */

import type { SplatAttributes, SplatBounds } from "../splats.js";
import type { ShapeFixture } from "../syntheticShapeFixtures.js";
import type { Camera } from "../camera.js";
import { FIRST_SMOKE_SPLAT_LAYOUT } from "../splats.js";

// ---------------------------------------------------------------------------
// Rendering parameters for shape-witness mode
// ---------------------------------------------------------------------------

/**
 * Splat scale for shape-witness fixtures.
 *
 * The plate renderer shader uses: anisotropicScale = splatScale / 600
 * With splatScale = 600, anisotropicScale = 1.0 — projected Jacobian NDC
 * radii are used directly. Synthetic fixtures use world-space scale radii
 * in the 0.02–2.0 range, compatible with Jacobian projection at 4–8 unit depth.
 *
 * Real Scaniverse uses splatScale = 3000 (5x) because its world-space units
 * are smaller than synthetic fixtures.
 */
export const SHAPE_WITNESS_SPLAT_SCALE = 600;

/** Near-plane fade: no fade for synthetic fixtures (both = 0 disables it). */
export const SHAPE_WITNESS_NEAR_FADE_START_NDC = 0;
export const SHAPE_WITNESS_NEAR_FADE_END_NDC = 0;

/** Minimum rendered splat radius in pixels. Small value for synthetic scenes. */
export const SHAPE_WITNESS_MIN_RADIUS_PX = 0.5;

// ---------------------------------------------------------------------------
// Main conversion function
// ---------------------------------------------------------------------------

/**
 * Convert a ShapeFixture into a SplatAttributes object the real renderer accepts.
 * Uses the real FIRST_SMOKE_SPLAT_LAYOUT for full compatibility with the renderer.
 */
export function splatAttributesFromFixture(fixture: ShapeFixture): SplatAttributes {
  const splats = fixture.splats;
  const count = splats.length;

  const positions   = new Float32Array(count * 3);
  const colors      = new Float32Array(count * 3);
  const opacities   = new Float32Array(count);
  const radii       = new Float32Array(count);
  const scales      = new Float32Array(count * 3);
  const rotations   = new Float32Array(count * 4);
  const originalIds = new Uint32Array(count);

  for (let i = 0; i < count; i++) {
    const s = splats[i];

    // position [x, y, z]
    positions[i * 3 + 0] = s.position[0];
    positions[i * 3 + 1] = s.position[1];
    positions[i * 3 + 2] = s.position[2];

    // color [r, g, b] — sh_dc_rgb, already linear
    colors[i * 3 + 0] = s.color[0];
    colors[i * 3 + 1] = s.color[1];
    colors[i * 3 + 2] = s.color[2];

    // opacity — unit-space [0, 1]
    opacities[i] = s.opacity;

    // radius — max of exp(log-scale) across xyz axes
    const maxScale = Math.max(
      Math.exp(s.scale[0]),
      Math.exp(s.scale[1]),
      Math.exp(s.scale[2])
    );
    radii[i] = Math.max(maxScale, 1e-6);

    // scales — log-space [lsx, lsy, lsz]
    scales[i * 3 + 0] = s.scale[0];
    scales[i * 3 + 1] = s.scale[1];
    scales[i * 3 + 2] = s.scale[2];

    // rotations — wxyz quaternion
    rotations[i * 4 + 0] = s.rotation[0]; // w
    rotations[i * 4 + 1] = s.rotation[1]; // x
    rotations[i * 4 + 2] = s.rotation[2]; // y
    rotations[i * 4 + 3] = s.rotation[3]; // z

    // originalId — sequential
    originalIds[i] = i;
  }

  const bounds = computeBounds(positions, count);

  return {
    count,
    sourceKind: `shape-witness-${fixture.id}`,
    positions,
    colors,
    opacities,
    radii,
    scales,
    rotations,
    originalIds,
    bounds,
    layout: FIRST_SMOKE_SPLAT_LAYOUT,
  };
}

// ---------------------------------------------------------------------------
// Camera configuration helpers
// ---------------------------------------------------------------------------

/**
 * Configure a Camera for a synthetic fixture camera specification.
 *
 * Sets cam.position, cam.target, cam.fovY, cam.near, cam.far directly.
 * Also computes cam.azimuth, cam.elevation, cam.distance from the
 * position/target pair so the orbit system stays consistent.
 */
export function configureCameraForFixture(
  cam: Camera,
  fixtureCamera: { position: readonly [number, number, number]; target: readonly [number, number, number]; fov: number; near?: number },
  bounds: SplatBounds
): void {
  const px = fixtureCamera.position[0];
  const py = fixtureCamera.position[1];
  const pz = fixtureCamera.position[2];
  const tx = fixtureCamera.target[0];
  const ty = fixtureCamera.target[1];
  const tz = fixtureCamera.target[2];

  // Direction from target to camera: this is the "back" vector.
  const dx = px - tx;
  const dy = py - ty;
  const dz = pz - tz;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const safeDistance = Math.max(distance, 1e-6);

  // Normalized back vector
  const bx = dx / safeDistance;
  const by = dy / safeDistance;
  const bz = dz / safeDistance;

  // Orbit parameterization: back = [cosEl * sinAz, sinEl, cosEl * cosAz]
  // elevation = arcsin(by), azimuth = atan2(bx, bz)
  const elevation = Math.asin(Math.max(-1, Math.min(1, by)));
  const cosEl = Math.cos(elevation);
  const azimuth = cosEl > 1e-6
    ? Math.atan2(bx / cosEl, bz / cosEl)
    : 0; // degenerate (looking straight up/down)

  cam.position = [px, py, pz];
  cam.target   = [tx, ty, tz];
  cam.fovY     = (fixtureCamera.fov * Math.PI) / 180;
  cam.azimuth  = azimuth;
  cam.elevation = elevation;
  cam.distance  = safeDistance;
  cam.navigationScale = Math.max(bounds.radius, 0.1);

  const paddedRadius = Math.max(bounds.radius, safeDistance * 0.5);
  if (typeof fixtureCamera.near === "number" && fixtureCamera.near > 0) {
    cam.near = fixtureCamera.near;
    cam.far  = safeDistance + paddedRadius * 4;
  } else {
    cam.near = Math.max(0.001, safeDistance - paddedRadius * 2);
    cam.far  = safeDistance + paddedRadius * 4;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function computeBounds(positions: Float32Array, count: number): SplatBounds {
  if (count === 0) {
    return {
      min: [0, 0, 0] as unknown as import("../math.js").vec3,
      max: [0, 0, 0] as unknown as import("../math.js").vec3,
      center: [0, 0, 0] as unknown as import("../math.js").vec3,
      radius: 1,
    };
  }

  let minX = positions[0];
  let minY = positions[1];
  let minZ = positions[2];
  let maxX = positions[0];
  let maxY = positions[1];
  let maxZ = positions[2];

  for (let i = 1; i < count; i++) {
    const x = positions[i * 3 + 0];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  const halfDiag = Math.sqrt(
    ((maxX - minX) / 2) ** 2 +
    ((maxY - minY) / 2) ** 2 +
    ((maxZ - minZ) / 2) ** 2
  );
  const radius = Math.max(halfDiag, 0.01);

  return {
    min: [minX, minY, minZ] as unknown as import("../math.js").vec3,
    max: [maxX, maxY, maxZ] as unknown as import("../math.js").vec3,
    center: [cx, cy, cz] as unknown as import("../math.js").vec3,
    radius,
  };
}
