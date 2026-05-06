/**
 * syntheticShapeFixtures.ts
 *
 * TypeScript typed definitions for synthetic splat scene fixtures used in the
 * pixel-witness-shape-guillotine campaign.  This file is the typed build source;
 * `src/rendererFidelityProbes/syntheticShapeFixtures.js` is the compiled-equivalent
 * module that smoke tests import directly (without TypeScript compilation).
 *
 * Each fixture defines:
 *   - A small set of splat attributes using the real renderer's field conventions
 *   - Camera parameters for deterministic rendering
 *   - Expected rendered-pixel invariants for a geometric pixel analyzer to check
 *
 * Field conventions:
 *   scale:    log-space ([sx, sy, sz] where actual scale = Math.exp(s))
 *   rotation: wxyz quaternion, unit-length
 *   opacity:  unit-space [0, 1]
 *   color:    sh_dc_rgb linear [r, g, b]
 *
 * Capture viewport: 512×512
 * Renderer URL query: ?synthetic=shape-witness-<id-suffix>
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single Gaussian splat in the synthetic fixture format.
 * Matches the field conventions of the live renderer.
 */
export interface SplatAttributeData {
  /** World-space position [x, y, z]. */
  readonly position: readonly [number, number, number];
  /** Log-space scales [lsx, lsy, lsz].  Actual scale = Math.exp(ls). */
  readonly scale: readonly [number, number, number];
  /** wxyz unit quaternion [w, x, y, z]. */
  readonly rotation: readonly [number, number, number, number];
  /** Opacity in [0, 1] (unit-space; renderer may apply activation). */
  readonly opacity: number;
  /** sh_dc_rgb linear color [r, g, b]. */
  readonly color: readonly [number, number, number];
}

/**
 * Camera description for a synthetic fixture scene.
 * `near` is optional and defaults to a renderer-appropriate value.
 */
export interface FixtureCamera {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  /** Vertical field of view in degrees. */
  readonly fov: number;
  /** Optional explicit near-plane distance. */
  readonly near?: number;
}

/**
 * Expected rendered-pixel invariants for one fixture.
 * These are the claims that a geometric pixel analyzer checks
 * against the captured canvas screenshot.
 */
export interface ShapeInvariants {
  /**
   * The kind of invariant this fixture exercises.
   *
   * - "circular-mask":       projected footprint is nearly round (aspectRatio ≈ 1)
   * - "thin-ribbon":         projected footprint is very elongated edge-on ribbon
   * - "oriented-ellipse":    projected footprint has a measurable principal axis angle
   * - "bounded-slab":        near-plane splat does not flood the viewport
   * - "foreground-suppression": opaque foreground blocks bright background
   */
  readonly kind:
    | "circular-mask"
    | "thin-ribbon"
    | "oriented-ellipse"
    | "bounded-slab"
    | "foreground-suppression";

  /**
   * Expected center of the rendered splat in screen space.
   * Tolerance in pixels.
   */
  readonly center?: {
    readonly x: number;
    readonly y: number;
    readonly tolerancePx: number;
  };

  /**
   * Expected aspect ratio (majorAxis / minorAxis) of the rendered footprint.
   * For circular-mask: should be close to 1.0.
   * For oriented-ellipse: should be significantly > 1.
   */
  readonly aspectRatio?: {
    readonly min: number;
    readonly max: number;
  };

  /**
   * Expected thickness ratio (minorAxis / majorAxis) of the rendered footprint.
   * Inverse of aspectRatio; convenient for expressing "thin ribbon" constraints.
   * - circular-mask:  min ≥ 0.8
   * - thin-ribbon:    max ≤ 0.15
   */
  readonly thicknessRatio?: {
    readonly min?: number;
    readonly max?: number;
  };

  /**
   * Expected principal axis angle in image space (degrees, 0–180).
   * 0° = horizontal, 90° = vertical, 45° = diagonal.
   */
  readonly axisAngleDeg?: {
    readonly expected: number;
    readonly toleranceDeg: number;
  };

  /**
   * Maximum fraction of the 512×512 viewport that may be changed by this fixture.
   * Used for near-plane-slab: a flooding splat would exceed this bound.
   */
  readonly maxChangedPixelRatio?: number;

  /**
   * Fixed expected background for invariants where corner-estimated background
   * would normalize away the failure.  Used for near-plane-slab screen-flood
   * detection against the renderer clear color.
   */
  readonly backgroundColor?: readonly [number, number, number, number];

  /**
   * Maximum mean RGB delta between each capture corner and `backgroundColor`.
   * Used as a direct corner-flood guard for near-plane-slab.
   */
  readonly cornerMaxMeanDeltaFromBackground?: number;

  /**
   * Minimum fraction of the foreground coverage area that must be suppressing
   * the bright background.  Used for dense-foreground fixtures.
   */
  readonly foregroundSuppressionRatio?: {
    readonly min: number;
  };
}

/**
 * One complete synthetic shape fixture.
 */
export interface ShapeFixture {
  /** Fixture ID matching the pattern "shape-witness-<type>". */
  readonly id: string;
  /** Splat attribute records for this scene. */
  readonly splats: readonly SplatAttributeData[];
  /** Camera parameters. */
  readonly camera: FixtureCamera;
  /** Capture viewport — always 512×512 per the metadata handshake. */
  readonly viewport: { readonly width: 512; readonly height: 512 };
  /** Expected rendered-pixel invariants for the pixel analyzer. */
  readonly expectedInvariants: ShapeInvariants;
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/** Convert a world-space scale radius to log-space. */
function logScale(s: number): number {
  return Math.log(s);
}

function camera(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  fov = 60
): FixtureCamera {
  return { position, target, fov };
}

function splat(attrs: SplatAttributeData): SplatAttributeData {
  return attrs;
}

// ---------------------------------------------------------------------------
// Quaternion constants
// ---------------------------------------------------------------------------

/** Identity quaternion [w=1, x=0, y=0, z=0]. */
const IDENTITY_QUAT: readonly [number, number, number, number] = [1, 0, 0, 0];

/** 45° rotation around the Z axis [wxyz]. */
const ROT_45_Z: readonly [number, number, number, number] = [
  Math.cos(Math.PI / 8),
  0,
  0,
  Math.sin(Math.PI / 8),
];

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

/**
 * isotropic-circle
 *
 * Single round splat, head-on to camera.
 * All three world-space scales are equal → circular projected footprint.
 */
const isotropicCircle: ShapeFixture = {
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
 * Highly anisotropic splat (X=1.2, Y=0.02, Z=1.2; anisotropy ≈ 60).
 * Camera on the Z axis — sees the thin Y edge of the disk → ribbon.
 */
const edgeOnRibbon: ShapeFixture = {
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
 * Anisotropic splat (X=0.8, Y=0.15; anisotropy ≈ 5.3), rotated 45° around Z.
 * Camera looking straight down Z → projects diagonal ellipse at 45°.
 */
const rotatedEllipse: ShapeFixture = {
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
 * Large splat at Z = -0.05 with camera at Z = 0.5, near = 0.1.
 * Splat is just past the near plane.  A correct renderer clips/fades it;
 * a broken one floods the screen.
 */
const nearPlaneSlab: ShapeFixture = {
  id: "shape-witness-near-plane-slab",
  splats: [
    splat({
      position: [0, 0, 0.35],
      scale: [logScale(2.0), logScale(2.0), logScale(0.08)],
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
    backgroundColor: [5, 5, 10, 255],
    maxChangedPixelRatio: 0.35,
    cornerMaxMeanDeltaFromBackground: 20,
  },
};

/**
 * dense-foreground
 *
 * 4 opaque dark foreground splats at Z = 0 in front of 1 large bright
 * background splat at Z = -2.  Background should not bleed through.
 */
const denseForeground: ShapeFixture = {
  id: "shape-witness-dense-foreground",
  splats: [
    // Background: bright, behind foreground
    splat({
      position: [0, 0, -2],
      scale: [logScale(1.0), logScale(1.0), logScale(0.1)],
      rotation: IDENTITY_QUAT,
      opacity: 0.95,
      color: [1.0, 1.0, 1.0],
    }),
    // Foreground: 4 opaque dark splats arranged in 2×2 grid
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

/** All five fixture definitions. */
export const SHAPE_FIXTURES: readonly ShapeFixture[] = [
  isotropicCircle,
  edgeOnRibbon,
  rotatedEllipse,
  nearPlaneSlab,
  denseForeground,
];

/**
 * Look up a fixture by its full ID.
 */
export function getShapeFixture(id: string): ShapeFixture | undefined {
  return SHAPE_FIXTURES.find((f) => f.id === id);
}

/**
 * Fixture ID constants for URL query parameters.
 * Renderer URL: ?synthetic=<FIXTURE_IDS.key>
 */
export const FIXTURE_IDS = {
  isotropicCircle: "shape-witness-isotropic-circle",
  edgeOnRibbon: "shape-witness-edge-on-ribbon",
  rotatedEllipse: "shape-witness-rotated-ellipse",
  nearPlaneSlab: "shape-witness-near-plane-slab",
  denseForeground: "shape-witness-dense-foreground",
} as const;
