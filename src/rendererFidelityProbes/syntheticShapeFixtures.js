/**
 * syntheticShapeFixtures.js
 *
 * Synthetic splat scene definitions for the pixel-witness-shape-guillotine campaign.
 * Each fixture names expected rendered-pixel invariants that a geometric pixel analyzer
 * can check without human visual inspection.
 *
 * Field conventions (matching the real renderer):
 *   scale:    [sx, sy, sz] in log-space  (actual scale = Math.exp(s))
 *   rotation: [w, x, y, z] wxyz quaternion, unit-length
 *   opacity:  float in [0, 1] (unit-space; renderer applies sigmoid-like activation)
 *   color:    [r, g, b] sh_dc_rgb, linear floats (typically [0, 1])
 *   position: [x, y, z] world-space
 *
 * Capture viewport: 512x512
 * Renderer URL query: ?synthetic=shape-witness-<id-suffix>
 */

// ---------------------------------------------------------------------------
// Camera helpers
// ---------------------------------------------------------------------------

/**
 * Create a simple look-at camera for synthetic scenes.
 * Camera is placed at `position` looking toward `target`, with vertical field
 * of view `fov` in degrees.
 */
function camera(position, target, fov = 60) {
  return { position, target, fov };
}

// ---------------------------------------------------------------------------
// Splat attribute helpers
// ---------------------------------------------------------------------------

/**
 * Create a single splat record.
 *
 * @param {object} opts
 * @param {[number,number,number]} opts.position - world position
 * @param {[number,number,number]} opts.scale    - log-space scales [lsx, lsy, lsz]
 * @param {[number,number,number,number]} opts.rotation - wxyz unit quaternion
 * @param {number} opts.opacity  - [0, 1]
 * @param {[number,number,number]} opts.color   - sh_dc_rgb [r, g, b]
 */
function splat({ position, scale, rotation, opacity, color }) {
  return { position, scale, rotation, opacity, color };
}

/**
 * Identity quaternion: [w=1, x=0, y=0, z=0]
 * Represents no rotation.
 */
const IDENTITY_QUAT = [1, 0, 0, 0];

/**
 * Quaternion that rotates 45° around the Z axis.
 * q = cos(22.5°), 0, 0, sin(22.5°)  [wxyz]
 */
const ROT_45_Z = [
  Math.cos(Math.PI / 8),
  0,
  0,
  Math.sin(Math.PI / 8),
];

/**
 * Quaternion that rotates 90° around the X axis.
 * Turns the Y axis into the -Z axis — useful for edge-on ribbon (disk lying in XY plane,
 * now stands edge-on when camera approaches from +Z).
 * q = cos(45°), sin(45°), 0, 0  [wxyz]
 */
const ROT_90_X = [
  Math.cos(Math.PI / 4),
  Math.sin(Math.PI / 4),
  0,
  0,
];

// ---------------------------------------------------------------------------
// Log-scale helpers
// ---------------------------------------------------------------------------

/** Convert a world-space radius to log-scale. */
function logScale(s) {
  return Math.log(s);
}

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

/**
 * isotropic-circle
 *
 * A single isotropic Gaussian splat, viewed head-on.  All three world-space
 * scales are equal, so the projected footprint is a circle regardless of
 * view angle (as long as the view direction is not edge-on).
 *
 * Camera: 4 units back on the Z axis looking at the origin.
 * Splat:  radius 0.3 world units, identity rotation.
 *
 * Expected invariant:
 *   - circular-mask: aspect ratio ≈ 1.0, thickness ratio > 0.8
 *   - center near (256, 256) in 512×512 viewport
 */
const isotropicCircle = {
  id: "shape-witness-isotropic-circle",
  splats: [
    splat({
      position: [0, 0, 0],
      scale: [logScale(0.3), logScale(0.3), logScale(0.3)],
      rotation: IDENTITY_QUAT,
      opacity: 1.0,
      color: [0.8, 0.8, 0.8],
    }),
  ],
  camera: camera([0, 0, 4], [0, 0, 0], 60),
  viewport: { width: 512, height: 512 },
  expectedInvariants: {
    kind: "circular-mask",
    center: { x: 256, y: 256, tolerancePx: 20 },
    aspectRatio: { min: 0.8, max: 1.25 },
    thicknessRatio: { min: 0.8, max: 1.0 },
  },
};

/**
 * edge-on-ribbon
 *
 * A single highly anisotropic Gaussian splat viewed nearly edge-on.
 * The splat is a flat disk in the XZ plane (large X extent, large Z extent,
 * tiny Y extent).  The camera is on the Z axis, looking straight at the
 * origin — so it sees the large X axis and tiny Y edge, producing a ribbon.
 *
 * Splat scales (world space): X = 1.2, Y = 0.02, Z = 1.2  → anisotropy ≈ 60
 * Rotation: identity — disk lies in the XZ plane (axes X, Y, Z map to world X, Y, Z)
 * Camera: 4 units back on Z, looking at origin
 *
 * Expected invariant:
 *   - thin-ribbon: thickness ratio < 0.15
 */
const edgeOnRibbon = {
  id: "shape-witness-edge-on-ribbon",
  splats: [
    splat({
      position: [0, 0, 0],
      scale: [logScale(1.2), logScale(0.02), logScale(1.2)],
      rotation: IDENTITY_QUAT,
      opacity: 1.0,
      color: [0.7, 0.7, 0.9],
    }),
  ],
  camera: camera([0, 0, 4], [0, 0, 0], 60),
  viewport: { width: 512, height: 512 },
  expectedInvariants: {
    kind: "thin-ribbon",
    center: { x: 256, y: 256, tolerancePx: 20 },
    thicknessRatio: { max: 0.05 },
  },
};

/**
 * rotated-ellipse
 *
 * A single anisotropic Gaussian splat with its major axis rotated 45° in
 * the image plane.  Camera looks straight down the Z axis.  The splat is
 * elongated along the world X axis (scale X >> scale Y), then rotated 45°
 * around Z so the major axis projects diagonally.
 *
 * Splat scales (world space): X = 0.8, Y = 0.15, Z = 0.15  → anisotropy ≈ 5.3
 * Rotation: 45° around Z axis [wxyz = cos(π/8), 0, 0, sin(π/8)]
 * Camera: 4 units back on Z, looking at origin
 *
 * Expected invariant:
 *   - oriented-ellipse: principal axis at ~45°, tolerance ±15°
 */
const rotatedEllipse = {
  id: "shape-witness-rotated-ellipse",
  splats: [
    splat({
      position: [0, 0, 0],
      scale: [logScale(0.8), logScale(0.15), logScale(0.15)],
      rotation: ROT_45_Z,
      opacity: 1.0,
      color: [0.9, 0.7, 0.5],
    }),
  ],
  camera: camera([0, 0, 4], [0, 0, 0], 60),
  viewport: { width: 512, height: 512 },
  expectedInvariants: {
    kind: "oriented-ellipse",
    center: { x: 256, y: 256, tolerancePx: 20 },
    axisAngleDeg: { expected: 45, toleranceDeg: 15 },
    thicknessRatio: { max: 0.35 },
  },
};

/**
 * near-plane-slab
 *
 * A large splat placed very close to the near plane (just past it).
 * In a healthy renderer this splat is clipped or faded so it does not flood
 * the viewport.  If near-plane handling is broken, the splat fills the whole
 * screen.
 *
 * Camera: at Z = 0.5, near plane = 0.1, looking at origin (Z = 0).
 * Splat: large (radius 2.0), placed at Z = -0.05, just in front of camera.
 *
 * Expected invariant:
 *   - bounded-slab: maxChangedPixelRatio ≤ 0.35 (must NOT flood > 35% of 512×512)
 */
const nearPlaneSlab = {
  id: "shape-witness-near-plane-slab",
  splats: [
    splat({
      position: [0, 0, -0.05],
      scale: [logScale(2.0), logScale(2.0), logScale(0.05)],
      rotation: IDENTITY_QUAT,
      opacity: 1.0,
      color: [0.9, 0.5, 0.5],
    }),
  ],
  camera: {
    position: [0, 0, 0.5],
    target: [0, 0, 0],
    fov: 60,
    near: 0.1,
  },
  viewport: { width: 512, height: 512 },
  expectedInvariants: {
    kind: "bounded-slab",
    maxChangedPixelRatio: 0.35,
  },
};

/**
 * dense-foreground
 *
 * Multiple opaque dark foreground splats placed in front of a single large
 * bright background splat.  In a correct renderer the foreground splats
 * suppress the background — the bright color should not bleed through.
 *
 * Layout:
 *   - Background: large bright white splat at Z = -2, radius 1.0
 *   - Foreground: 4 opaque dark splats at Z = 0, radius 0.3 each,
 *     arranged in a 2×2 grid at ±0.3 in XY
 *
 * Camera: 4 units back on Z, looking at origin.
 *
 * Expected invariant:
 *   - foreground-suppression: foregroundSuppressionRatio ≥ 0.7
 *     (bright background leaks through < 30% of the foreground coverage area)
 */
const denseForeground = {
  id: "shape-witness-dense-foreground",
  splats: [
    // Background: large, bright, at depth -2
    splat({
      position: [0, 0, -2],
      scale: [logScale(1.0), logScale(1.0), logScale(0.1)],
      rotation: IDENTITY_QUAT,
      opacity: 0.95,
      color: [1.0, 1.0, 1.0],
    }),
    // Foreground: 4 opaque dark splats at depth 0, arranged in 2×2 grid
    splat({
      position: [-0.3, -0.3, 0],
      scale: [logScale(0.3), logScale(0.3), logScale(0.3)],
      rotation: IDENTITY_QUAT,
      opacity: 1.0,
      color: [0.05, 0.05, 0.05],
    }),
    splat({
      position: [0.3, -0.3, 0],
      scale: [logScale(0.3), logScale(0.3), logScale(0.3)],
      rotation: IDENTITY_QUAT,
      opacity: 1.0,
      color: [0.05, 0.05, 0.05],
    }),
    splat({
      position: [-0.3, 0.3, 0],
      scale: [logScale(0.3), logScale(0.3), logScale(0.3)],
      rotation: IDENTITY_QUAT,
      opacity: 1.0,
      color: [0.05, 0.05, 0.05],
    }),
    splat({
      position: [0.3, 0.3, 0],
      scale: [logScale(0.3), logScale(0.3), logScale(0.3)],
      rotation: IDENTITY_QUAT,
      opacity: 1.0,
      color: [0.05, 0.05, 0.05],
    }),
  ],
  camera: camera([0, 0, 4], [0, 0, 0], 60),
  viewport: { width: 512, height: 512 },
  expectedInvariants: {
    kind: "foreground-suppression",
    center: { x: 256, y: 256, tolerancePx: 30 },
    foregroundSuppressionRatio: { min: 0.7 },
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** All five fixture definitions, in dependency-graph order. */
export const SHAPE_FIXTURES = [
  isotropicCircle,
  edgeOnRibbon,
  rotatedEllipse,
  nearPlaneSlab,
  denseForeground,
];

/**
 * Look up a fixture by its full ID.
 * @param {string} id - e.g. "shape-witness-isotropic-circle"
 * @returns {object|undefined}
 */
export function getShapeFixture(id) {
  return SHAPE_FIXTURES.find((f) => f.id === id);
}

/**
 * Fixture ID constants for use in URL query parameters.
 * Renderer URL: ?synthetic=shape-witness-<FIXTURE_IDS[key]>
 */
export const FIXTURE_IDS = {
  isotropicCircle: "shape-witness-isotropic-circle",
  edgeOnRibbon: "shape-witness-edge-on-ribbon",
  rotatedEllipse: "shape-witness-rotated-ellipse",
  nearPlaneSlab: "shape-witness-near-plane-slab",
  denseForeground: "shape-witness-dense-foreground",
};
