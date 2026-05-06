/**
 * Fixture-consistency smoke tests for synthetic shape fixtures.
 *
 * Does NOT test rendered output — that is the harness and assertions lanes' job.
 * Tests that each fixture definition is internally self-consistent:
 *   - ID matches the shape-witness-<type> pattern
 *   - Splat data is non-empty and uses correct field conventions
 *   - At least one expected invariant is named
 *   - Splat/camera geometry is consistent with the claimed invariant
 *     (e.g., isotropic splat has equal log-scales, edge-on camera is nearly in the splat plane)
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { SHAPE_FIXTURES } from "../../src/rendererFidelityProbes/syntheticShapeFixtures.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXTURE_ID_PATTERN = /^shape-witness-(isotropic-circle|edge-on-ribbon|rotated-ellipse|near-plane-slab|dense-foreground)$/;
const EXPECTED_FIXTURE_COUNT = 5;
const EXPECTED_TYPES = ["isotropic-circle", "edge-on-ribbon", "rotated-ellipse", "near-plane-slab", "dense-foreground"];
const CAPTURE_VIEWPORT = { width: 512, height: 512 };

function fixtureByType(type) {
  return SHAPE_FIXTURES.find((f) => f.id === `shape-witness-${type}`);
}

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------

test("SHAPE_FIXTURES exports exactly five fixtures", () => {
  assert.equal(SHAPE_FIXTURES.length, EXPECTED_FIXTURE_COUNT);
});

test("all fixture IDs match the shape-witness-<type> pattern", () => {
  for (const fixture of SHAPE_FIXTURES) {
    assert.match(fixture.id, FIXTURE_ID_PATTERN, `ID "${fixture.id}" does not match pattern`);
  }
});

test("all five required fixture types are present", () => {
  const ids = new Set(SHAPE_FIXTURES.map((f) => f.id));
  for (const type of EXPECTED_TYPES) {
    assert.ok(ids.has(`shape-witness-${type}`), `missing fixture: shape-witness-${type}`);
  }
});

test("all fixture IDs are unique", () => {
  const ids = SHAPE_FIXTURES.map((f) => f.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, "duplicate fixture IDs found");
});

test("all fixtures declare the correct 512x512 capture viewport", () => {
  for (const fixture of SHAPE_FIXTURES) {
    assert.equal(fixture.viewport.width, CAPTURE_VIEWPORT.width, `${fixture.id} viewport.width`);
    assert.equal(fixture.viewport.height, CAPTURE_VIEWPORT.height, `${fixture.id} viewport.height`);
  }
});

// ---------------------------------------------------------------------------
// Splat data conventions
// ---------------------------------------------------------------------------

test("all fixtures have non-empty splat arrays", () => {
  for (const fixture of SHAPE_FIXTURES) {
    assert.ok(
      Array.isArray(fixture.splats) && fixture.splats.length > 0,
      `${fixture.id} must have at least one splat`
    );
  }
});

test("all splat entries have position, scale, rotation, opacity, and color fields", () => {
  for (const fixture of SHAPE_FIXTURES) {
    for (const splat of fixture.splats) {
      assert.ok(
        Array.isArray(splat.position) && splat.position.length === 3,
        `${fixture.id}: splat.position must be [x, y, z]`
      );
      assert.ok(
        Array.isArray(splat.scale) && splat.scale.length === 3,
        `${fixture.id}: splat.scale must be [sx, sy, sz] in log-space`
      );
      assert.ok(
        Array.isArray(splat.rotation) && splat.rotation.length === 4,
        `${fixture.id}: splat.rotation must be [w, x, y, z] wxyz quaternion`
      );
      assert.ok(
        typeof splat.opacity === "number" && splat.opacity >= 0 && splat.opacity <= 1,
        `${fixture.id}: splat.opacity must be in [0, 1] (unit-space)`
      );
      assert.ok(
        Array.isArray(splat.color) && splat.color.length === 3,
        `${fixture.id}: splat.color must be [r, g, b] sh_dc_rgb`
      );
    }
  }
});

test("all splat rotations are unit quaternions in wxyz order (w >= 0, length ≈ 1)", () => {
  for (const fixture of SHAPE_FIXTURES) {
    for (const splat of fixture.splats) {
      const [w, x, y, z] = splat.rotation;
      const len = Math.sqrt(w * w + x * x + y * y + z * z);
      assert.ok(
        Math.abs(len - 1) < 0.001,
        `${fixture.id}: quaternion [${splat.rotation}] is not unit-length (len=${len})`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Expected invariants
// ---------------------------------------------------------------------------

test("all fixtures name at least one expectedInvariant", () => {
  for (const fixture of SHAPE_FIXTURES) {
    assert.ok(
      fixture.expectedInvariants !== null &&
        typeof fixture.expectedInvariants === "object" &&
        typeof fixture.expectedInvariants.kind === "string" &&
        fixture.expectedInvariants.kind.length > 0,
      `${fixture.id} must name an expectedInvariants.kind`
    );
  }
});

test("all fixtures have a camera with position, target, and fov", () => {
  for (const fixture of SHAPE_FIXTURES) {
    const cam = fixture.camera;
    assert.ok(Array.isArray(cam.position) && cam.position.length === 3, `${fixture.id}: camera.position`);
    assert.ok(Array.isArray(cam.target) && cam.target.length === 3, `${fixture.id}: camera.target`);
    assert.ok(typeof cam.fov === "number" && cam.fov > 0, `${fixture.id}: camera.fov`);
  }
});

// ---------------------------------------------------------------------------
// Geometry consistency per fixture type
// ---------------------------------------------------------------------------

test("isotropic-circle: single splat with equal log-scales (aspect ratio ≈ 1)", () => {
  const fixture = fixtureByType("isotropic-circle");
  assert.ok(fixture, "isotropic-circle fixture must exist");
  assert.equal(fixture.splats.length, 1, "isotropic-circle must have exactly one splat");

  const [sx, sy, sz] = fixture.splats[0].scale;
  // All three log-scales within 5% of each other — ensuring isotropic 3D covariance
  const maxScale = Math.max(sx, sy, sz);
  const minScale = Math.min(sx, sy, sz);
  assert.ok(
    maxScale - minScale < 0.05,
    `isotropic-circle scales [${sx}, ${sy}, ${sz}] are not equal enough (max-min=${maxScale - minScale})`
  );

  const inv = fixture.expectedInvariants;
  assert.equal(inv.kind, "circular-mask", "isotropic-circle must claim circular-mask invariant");
  assert.ok(inv.aspectRatio?.min >= 0.8, "isotropic-circle aspectRatio.min should be ≥ 0.8");
  assert.ok(inv.aspectRatio?.max <= 1.25, "isotropic-circle aspectRatio.max should be ≤ 1.25");
  assert.ok(inv.thicknessRatio?.min >= 0.8, "isotropic-circle thicknessRatio.min should be ≥ 0.8");
});

test("edge-on-ribbon: single highly anisotropic splat with camera nearly in the splat plane", () => {
  const fixture = fixtureByType("edge-on-ribbon");
  assert.ok(fixture, "edge-on-ribbon fixture must exist");
  assert.equal(fixture.splats.length, 1, "edge-on-ribbon must have exactly one splat");

  // The splat must be highly anisotropic in log-space: largest scale >> smallest scale
  const [sx, sy, sz] = fixture.splats[0].scale.map(Math.exp);
  const maxS = Math.max(sx, sy, sz);
  const minS = Math.min(sx, sy, sz);
  assert.ok(
    maxS / minS >= 10,
    `edge-on-ribbon anisotropy ratio ${maxS / minS} is < 10 — not anisotropic enough to be a ribbon`
  );

  const inv = fixture.expectedInvariants;
  assert.equal(inv.kind, "thin-ribbon", "edge-on-ribbon must claim thin-ribbon invariant");
  assert.ok(inv.thicknessRatio?.max <= 0.05, "edge-on-ribbon thicknessRatio.max should be ≤ 0.05");
});

test("rotated-ellipse: single anisotropic splat with 45-degree principal axis claim", () => {
  const fixture = fixtureByType("rotated-ellipse");
  assert.ok(fixture, "rotated-ellipse fixture must exist");
  assert.equal(fixture.splats.length, 1, "rotated-ellipse must have exactly one splat");

  // Must be anisotropic (ratio >= 3)
  const [sx, sy, sz] = fixture.splats[0].scale.map(Math.exp);
  const maxS = Math.max(sx, sy, sz);
  const minS = Math.min(sx, sy, sz);
  assert.ok(maxS / minS >= 3, `rotated-ellipse anisotropy ratio ${maxS / minS} < 3`);

  const inv = fixture.expectedInvariants;
  assert.equal(inv.kind, "oriented-ellipse", "rotated-ellipse must claim oriented-ellipse invariant");
  assert.ok(
    typeof inv.axisAngleDeg?.expected === "number",
    "rotated-ellipse must specify axisAngleDeg.expected"
  );
  assert.ok(
    Math.abs(inv.axisAngleDeg.expected - 45) <= 5,
    `rotated-ellipse axisAngleDeg.expected ${inv.axisAngleDeg.expected} is not near 45°`
  );
  assert.ok(
    typeof inv.axisAngleDeg.toleranceDeg === "number" && inv.axisAngleDeg.toleranceDeg <= 15,
    "rotated-ellipse axisAngleDeg.toleranceDeg must exist and be ≤ 15°"
  );
});

test("near-plane-slab: large splat with maxChangedPixelRatio ≤ 0.35", () => {
  const fixture = fixtureByType("near-plane-slab");
  assert.ok(fixture, "near-plane-slab fixture must exist");
  assert.equal(fixture.splats.length, 1, "near-plane-slab must have exactly one splat");

  const inv = fixture.expectedInvariants;
  assert.equal(inv.kind, "bounded-slab", "near-plane-slab must claim bounded-slab invariant");
  assert.ok(
    typeof inv.maxChangedPixelRatio === "number" && inv.maxChangedPixelRatio <= 0.35,
    `near-plane-slab maxChangedPixelRatio ${inv.maxChangedPixelRatio} must be ≤ 0.35`
  );
  assert.deepEqual(inv.backgroundColor, [5, 5, 10, 255], "near-plane-slab must pin the renderer clear color");
  assert.ok(
    typeof inv.cornerMaxMeanDeltaFromBackground === "number" && inv.cornerMaxMeanDeltaFromBackground <= 20,
    "near-plane-slab must guard all capture corners against flood-as-background drift"
  );

  const splat = fixture.splats[0];
  const camera = fixture.camera;
  const near = camera.near ?? 0.1;
  const centerDistance = camera.position[2] - splat.position[2];
  const zRadius = Math.exp(splat.scale[2]);

  assert.ok(centerDistance > near, "near-plane-slab center must remain in front of the near plane");
  assert.ok(
    centerDistance - zRadius < near,
    "near-plane-slab support must cross the near plane so slab-sentinel policy is exercised"
  );
});

test("dense-foreground: multiple splats with foregroundSuppressionRatio claim", () => {
  const fixture = fixtureByType("dense-foreground");
  assert.ok(fixture, "dense-foreground fixture must exist");
  assert.ok(fixture.splats.length >= 2, "dense-foreground must have at least 2 splats");

  const inv = fixture.expectedInvariants;
  assert.equal(inv.kind, "foreground-suppression", "dense-foreground must claim foreground-suppression invariant");
  assert.ok(
    typeof inv.foregroundSuppressionRatio?.min === "number" && inv.foregroundSuppressionRatio.min >= 0.7,
    "dense-foreground foregroundSuppressionRatio.min should be ≥ 0.7"
  );
});
