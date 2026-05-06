/**
 * pixel-shape-gate.test.mjs
 *
 * Integrated shape-gate smoke test for the renderer-path-integration lane.
 * Exercises the full contract:
 *   fixture data -> SplatAttributes conversion -> geometric assertions.
 *
 * Two layers:
 *
 * Unit layer (always runs, no browser):
 *   - Fixture loader produces valid SplatAttributes shape from each fixture.
 *   - Shape-gate invariant checker functions work correctly on synthetic PNGs.
 *   - All 5 fixture IDs round-trip through URL builder → fixture lookup.
 *
 * Browser smoke layer (always runs, starts its own Vite server):
 *   - Launches a real browser, renders each fixture through the real WebGPU renderer,
 *     captures the canvas, and asserts geometric invariants from the fixture's
 *     expectedInvariants against the analyzeShape() output.
 *   - Starts a Vite dev server automatically (or uses RENDERER_URL if provided).
 *
 * Fail-first: the unit tests below will fail until the fixture loader
 * (`src/syntheticShapeLoader.ts`) is wired into `src/main.ts`.
 * Specifically, `splatAttributesFromFixture` must be importable from
 * `../../src/rendererFidelityProbes/syntheticShapeLoader.js`.
 */

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";

import {
  SHAPE_FIXTURES,
  getShapeFixture,
  FIXTURE_IDS,
} from "../../src/rendererFidelityProbes/syntheticShapeFixtures.js";
import { analyzeShape, computeForegroundSuppression } from "../../scripts/visual-smoke/pixel-shape-analysis.mjs";
import { decodePng } from "../../scripts/visual-smoke/png-analysis.mjs";
import {
  buildShapeWitnessUrl,
  SHAPE_WITNESS_FIXTURE_IDS,
  captureShapeWitness,
} from "../../scripts/visual-smoke/pixel-shape-capture.mjs";

// ---------------------------------------------------------------------------
// Fail-first: fixture loader module must exist (wired by this lane)
// ---------------------------------------------------------------------------

// This import will fail until we create src/rendererFidelityProbes/syntheticShapeLoader.js
// That is the correct fail-first state.
import {
  splatAttributesFromFixture,
  SHAPE_WITNESS_SPLAT_SCALE,
} from "../../src/rendererFidelityProbes/syntheticShapeLoader.js";

// ---------------------------------------------------------------------------
// PNG helpers (self-contained)
// ---------------------------------------------------------------------------

function makePng(width, height, pixelAt) {
  const scanlines = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelAt(x, y);
      const offset = 1 + x * 4;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
      row[offset + 3] = a;
    }
    scanlines.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", pngIhdr(width, height)),
    pngChunk("IDAT", deflateSync(Buffer.concat(scanlines))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngIhdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8; data[9] = 6; data[10] = 0; data[11] = 0; data[12] = 0;
  return data;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Round circle PNG: produces aspect ratio ≈ 1.0, thicknessRatio > 0.8. */
function makeCirclePng(size, radius) {
  const cx = size / 2;
  const cy = size / 2;
  return makePng(size, size, (x, y) => {
    const inCircle = (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
    return inCircle ? [200, 200, 200, 255] : [5, 5, 10, 255];
  });
}

/** Thin horizontal ribbon PNG: very small thicknessRatio. */
function makeThinRibbonPng(size, thickness) {
  const midY = Math.floor(size / 2);
  return makePng(size, size, (x, y) => {
    const inRibbon = Math.abs(y - midY) <= Math.floor(thickness / 2);
    return inRibbon ? [200, 200, 200, 255] : [5, 5, 10, 255];
  });
}

/** Diagonal ellipse PNG at ~45 degrees. */
function makeDiagonalEllipsePng(size, majorR, minorR, angleDeg) {
  const cx = size / 2;
  const cy = size / 2;
  const angleRad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  return makePng(size, size, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    // Rotate into ellipse's local frame.
    const localX = dx * cosA + dy * sinA;
    const localY = -dx * sinA + dy * cosA;
    const inEllipse = (localX / majorR) ** 2 + (localY / minorR) ** 2 <= 1;
    return inEllipse ? [220, 160, 80, 255] : [5, 5, 10, 255];
  });
}

/**
 * Simulates near-plane flooding: bright splat covers > 60% of frame
 * but leaves small dark corners so background estimation works.
 * The flood circle has radius = 90% of half the frame size.
 */
function makeFloodedPng(size) {
  const cx = size / 2;
  const cy = size / 2;
  const floodRadius = size * 0.45; // 90% of half-size: covers 63% of area
  return makePng(size, size, (x, y) => {
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    return dist <= floodRadius ? [200, 100, 100, 255] : [5, 5, 10, 255];
  });
}

/** Full-frame flood: no safe dark corners for corner-estimated background. */
function makeFullFrameFloodPng(size) {
  return makePng(size, size, () => [208, 116, 116, 255]);
}

function meanRgbDelta(a, b) {
  return (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
}

function readRgbaPixel(rgba, width, x, y) {
  const offset = (y * width + x) * 4;
  return [rgba[offset], rgba[offset + 1], rgba[offset + 2], rgba[offset + 3]];
}

function assertCornersNearBackground(png, backgroundColor, maxMeanDelta, label) {
  const { rgba, width, height } = decodePng(png);
  const corners = [
    ["top-left", 0, 0],
    ["top-right", width - 1, 0],
    ["bottom-left", 0, height - 1],
    ["bottom-right", width - 1, height - 1],
  ];
  for (const [name, x, y] of corners) {
    const delta = meanRgbDelta(readRgbaPixel(rgba, width, x, y), backgroundColor);
    assert.ok(
      delta <= maxMeanDelta,
      `${label} ${name} corner mean RGB delta ${delta.toFixed(1)} must be <= ${maxMeanDelta}`
    );
  }
}

// ---------------------------------------------------------------------------
// Unit tests: splatAttributesFromFixture conversion contract
// ---------------------------------------------------------------------------

test("splatAttributesFromFixture produces valid SplatAttributes shape for isotropic-circle", () => {
  const fixture = getShapeFixture(FIXTURE_IDS.isotropicCircle);
  assert.ok(fixture, "isotropic-circle fixture must exist");
  const attrs = splatAttributesFromFixture(fixture);

  assert.equal(attrs.count, fixture.splats.length, "count must match splat count");
  assert.ok(attrs.positions instanceof Float32Array, "positions must be Float32Array");
  assert.equal(attrs.positions.length, fixture.splats.length * 3, "positions has 3 components per splat");
  assert.ok(attrs.colors instanceof Float32Array, "colors must be Float32Array");
  assert.equal(attrs.colors.length, fixture.splats.length * 3, "colors has 3 components per splat");
  assert.ok(attrs.opacities instanceof Float32Array, "opacities must be Float32Array");
  assert.equal(attrs.opacities.length, fixture.splats.length, "opacities has 1 component per splat");
  assert.ok(attrs.radii instanceof Float32Array, "radii must be Float32Array");
  assert.equal(attrs.radii.length, fixture.splats.length, "radii has 1 component per splat");
  assert.ok(attrs.scales instanceof Float32Array, "scales must be Float32Array");
  assert.equal(attrs.scales.length, fixture.splats.length * 3, "scales has 3 components per splat");
  assert.ok(attrs.rotations instanceof Float32Array, "rotations must be Float32Array");
  assert.equal(attrs.rotations.length, fixture.splats.length * 4, "rotations has 4 components per splat");
  assert.ok(attrs.originalIds instanceof Uint32Array, "originalIds must be Uint32Array");
  assert.equal(attrs.originalIds.length, fixture.splats.length, "originalIds has 1 component per splat");
  assert.ok(attrs.bounds, "bounds must be defined");
  assert.ok(Number.isFinite(attrs.bounds.radius) && attrs.bounds.radius > 0, "bounds.radius must be positive finite");
  assert.equal(typeof attrs.sourceKind, "string", "sourceKind must be string");
  assert.ok(attrs.sourceKind.includes("shape-witness"), "sourceKind must identify shape-witness source");
  assert.ok(attrs.layout, "layout must be defined");
});

test("splatAttributesFromFixture correctly copies position data for all splats in dense-foreground", () => {
  const fixture = getShapeFixture(FIXTURE_IDS.denseForeground);
  assert.ok(fixture, "dense-foreground fixture must exist");
  const attrs = splatAttributesFromFixture(fixture);

  assert.equal(attrs.count, 5, "dense-foreground must have 5 splats (1 background + 4 foreground)");

  // First splat: background at [0, 0, -2]
  assert.ok(Math.abs(attrs.positions[0] - 0) < 1e-6, "splat 0 position.x");
  assert.ok(Math.abs(attrs.positions[1] - 0) < 1e-6, "splat 0 position.y");
  assert.ok(Math.abs(attrs.positions[2] - (-2)) < 1e-6, "splat 0 position.z");
});

test("splatAttributesFromFixture copies log-space scale data correctly", () => {
  const fixture = getShapeFixture(FIXTURE_IDS.isotropicCircle);
  assert.ok(fixture, "fixture must exist");
  const attrs = splatAttributesFromFixture(fixture);

  // isotropic-circle: scale = [log(0.3), log(0.3), log(0.3)] ≈ [-1.204, -1.204, -1.204]
  const expectedLogScale = Math.log(0.3);
  assert.ok(
    Math.abs(attrs.scales[0] - expectedLogScale) < 1e-5,
    `scales[0] must be log(0.3) ≈ ${expectedLogScale.toFixed(4)}, got ${attrs.scales[0]}`
  );
  assert.ok(
    Math.abs(attrs.scales[1] - expectedLogScale) < 1e-5,
    `scales[1] must be log(0.3) ≈ ${expectedLogScale.toFixed(4)}, got ${attrs.scales[1]}`
  );
});

test("splatAttributesFromFixture copies wxyz rotation correctly for rotated-ellipse", () => {
  const fixture = getShapeFixture(FIXTURE_IDS.rotatedEllipse);
  assert.ok(fixture, "rotated-ellipse fixture must exist");
  const attrs = splatAttributesFromFixture(fixture);

  // Rotation: ROT_45_Z = [cos(π/8), 0, 0, sin(π/8)] wxyz
  const w = Math.cos(Math.PI / 8);
  const z = Math.sin(Math.PI / 8);
  assert.ok(Math.abs(attrs.rotations[0] - w) < 1e-5, `rotations[0] (w) must be cos(π/8) ≈ ${w.toFixed(4)}`);
  assert.ok(Math.abs(attrs.rotations[1] - 0) < 1e-5, "rotations[1] (x) must be 0");
  assert.ok(Math.abs(attrs.rotations[2] - 0) < 1e-5, "rotations[2] (y) must be 0");
  assert.ok(Math.abs(attrs.rotations[3] - z) < 1e-5, `rotations[3] (z) must be sin(π/8) ≈ ${z.toFixed(4)}`);
});

test("splatAttributesFromFixture produces bounds that encompass all splat positions", () => {
  const fixture = getShapeFixture(FIXTURE_IDS.denseForeground);
  assert.ok(fixture, "fixture must exist");
  const attrs = splatAttributesFromFixture(fixture);
  const { bounds, positions, count } = attrs;

  for (let i = 0; i < count; i++) {
    const px = positions[i * 3 + 0];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];
    assert.ok(
      px >= bounds.min[0] - 1e-3 && px <= bounds.max[0] + 1e-3,
      `splat ${i} position.x (${px}) must be within bounds`
    );
    assert.ok(
      py >= bounds.min[1] - 1e-3 && py <= bounds.max[1] + 1e-3,
      `splat ${i} position.y (${py}) must be within bounds`
    );
    assert.ok(
      pz >= bounds.min[2] - 1e-3 && pz <= bounds.max[2] + 1e-3,
      `splat ${i} position.z (${pz}) must be within bounds`
    );
  }
});

test("splatAttributesFromFixture produces positive finite radii derived from splat scales", () => {
  for (const fixture of SHAPE_FIXTURES) {
    const attrs = splatAttributesFromFixture(fixture);
    for (let i = 0; i < attrs.count; i++) {
      assert.ok(
        Number.isFinite(attrs.radii[i]) && attrs.radii[i] > 0,
        `fixture ${fixture.id} splat ${i} radius must be positive finite, got ${attrs.radii[i]}`
      );
    }
  }
});

test("SHAPE_WITNESS_SPLAT_SCALE is a positive finite number", () => {
  assert.ok(
    Number.isFinite(SHAPE_WITNESS_SPLAT_SCALE) && SHAPE_WITNESS_SPLAT_SCALE > 0,
    `SHAPE_WITNESS_SPLAT_SCALE must be a positive finite number, got ${SHAPE_WITNESS_SPLAT_SCALE}`
  );
});

// ---------------------------------------------------------------------------
// Unit tests: geometric assertion functions work on synthetic PNGs
// ---------------------------------------------------------------------------

test("analyzeShape reports circular shape for a round PNG (isotropic-circle invariant)", () => {
  const size = 128;
  const radius = 40;
  const png = makeCirclePng(size, radius);
  const result = analyzeShape(png);

  // aspectRatio: bounding-box width / height — circle should be ≈ 1.0
  assert.ok(
    result.aspectRatio >= 0.8 && result.aspectRatio <= 1.25,
    `aspectRatio must be ≈ 1.0 for circle, got ${result.aspectRatio.toFixed(3)}`
  );
  // thicknessRatio: minorLength / majorLength — circle should be ≥ 0.8
  assert.ok(
    result.thicknessRatio >= 0.7,
    `thicknessRatio must be ≥ 0.7 for circle, got ${result.thicknessRatio.toFixed(3)}`
  );
  // centroid near center
  assert.ok(
    Math.abs(result.centroid.x - size / 2) < 10,
    `centroid.x must be near center (${size / 2}), got ${result.centroid.x.toFixed(1)}`
  );
});

test("analyzeShape reports thin shape for a ribbon PNG (edge-on-ribbon invariant)", () => {
  const size = 128;
  const png = makeThinRibbonPng(size, 3); // 3px ribbon in 128px frame
  const result = analyzeShape(png);

  // thicknessRatio must be < 0.15 for a thin ribbon
  assert.ok(
    result.thicknessRatio < 0.15,
    `thicknessRatio must be < 0.15 for thin ribbon, got ${result.thicknessRatio.toFixed(3)}`
  );
});

test("analyzeShape measures principal axis orientation for a 45-degree ellipse (rotated-ellipse invariant)", () => {
  const size = 128;
  const png = makeDiagonalEllipsePng(size, 50, 10, 45);
  const result = analyzeShape(png);

  // Principal axis angle should be near 45 degrees (tolerance ±15)
  const angleDeg = result.principalAxes.angleDeg;
  // angleDeg is in [-90, 90]; 45 is well within range
  assert.ok(
    Math.abs(angleDeg - 45) <= 15 || Math.abs(angleDeg + 45) <= 15,
    `principalAxes.angleDeg must be near ±45 degrees for diagonal ellipse, got ${angleDeg.toFixed(1)}`
  );
});

test("analyzeShape detects near-plane flooding for a fully filled PNG (bounded-slab invariant)", () => {
  const size = 128;
  const png = makeFloodedPng(size);
  const result = analyzeShape(png);

  // A fully-flooded image has changedPixelRatio ≈ 1.0 — must exceed 0.6 bound
  assert.ok(
    result.mask.changedPixelRatio > 0.6,
    `flooded PNG must have changedPixelRatio > 0.6, got ${result.mask.changedPixelRatio.toFixed(3)}`
  );
});

test("bounded-slab uses fixed clear background so whole-frame floods cannot become background", () => {
  const fixture = getShapeFixture(FIXTURE_IDS.nearPlaneSlab);
  assert.ok(fixture, "near-plane-slab fixture must exist");
  const inv = fixture.expectedInvariants;
  assert.equal(inv.kind, "bounded-slab", "near-plane-slab must use bounded-slab invariant");
  assert.deepEqual(inv.backgroundColor, [5, 5, 10, 255], "bounded-slab must declare the renderer clear background");
  assert.equal(inv.cornerMaxMeanDeltaFromBackground, 20, "bounded-slab must declare a corner flood guard");

  const png = makeFullFrameFloodPng(128);
  const result = analyzeShape(png, undefined, undefined, { backgroundColor: inv.backgroundColor });
  assert.ok(
    result.mask.changedPixelRatio > 0.95,
    `whole-frame flood must be measured as flood against fixed background, got ${result.mask.changedPixelRatio.toFixed(3)}`
  );
  assert.throws(
    () => assertCornersNearBackground(png, inv.backgroundColor, inv.cornerMaxMeanDeltaFromBackground, "whole-frame flood"),
    /corner mean RGB delta/,
    "corner guard must reject a flood that reaches every corner"
  );
});

// ---------------------------------------------------------------------------
// Unit tests: fixture → URL round-trip (ID contract)
// ---------------------------------------------------------------------------

test("all 5 SHAPE_FIXTURES round-trip through URL builder → fixture lookup", () => {
  for (const fixture of SHAPE_FIXTURES) {
    // fixture.id = "shape-witness-isotropic-circle" → suffix = "isotropic-circle"
    const suffix = fixture.id.replace("shape-witness-", "");
    const url = buildShapeWitnessUrl("http://localhost:5173", suffix);
    assert.ok(
      url.includes(`synthetic=shape-witness-${suffix}`),
      `URL for ${suffix} must contain correct query param`
    );
  }
});

test("FIXTURE_IDS constants match SHAPE_WITNESS_FIXTURE_IDS suffixes", () => {
  const fixtureSuffixes = new Set(SHAPE_WITNESS_FIXTURE_IDS);
  for (const [, fullId] of Object.entries(FIXTURE_IDS)) {
    const suffix = fullId.replace("shape-witness-", "");
    assert.ok(
      fixtureSuffixes.has(suffix),
      `FIXTURE_IDS value "${fullId}" suffix "${suffix}" must be in SHAPE_WITNESS_FIXTURE_IDS`
    );
  }
});

// ---------------------------------------------------------------------------
// Browser smoke layer — starts its own Vite server, renders through real WebGPU
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(__filename), "../..");

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

describe("browser shape-gate smoke", { timeout: 120_000 }, () => {
  let viteServer;
  let baseUrl;

  before(async () => {
    // Use RENDERER_URL if provided (e.g. someone already has vite running)
    if (process.env.RENDERER_URL) {
      baseUrl = process.env.RENDERER_URL;
      return;
    }
    const { createServer } = await import("vite");
    const port = await findFreePort();
    viteServer = await createServer({
      root: APP_ROOT,
      server: { host: "127.0.0.1", port, strictPort: true, open: false },
    });
    await viteServer.listen();
    baseUrl = viteServer.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`;
  });

  after(async () => {
    if (viteServer) await viteServer.close();
  });

  for (const fixture of SHAPE_FIXTURES) {
    const fixtureId = fixture.id.replace("shape-witness-", "");

    test(`fixture ${fixtureId} renders and passes geometric invariants`, async (t) => {
      t.timeout = 60_000;

      const { png, metadata } = await captureShapeWitness(fixtureId, {
        baseUrl,
        settleMs: 3000,
        timeoutMs: 30_000,
      });

      assert.ok(!metadata.rendererStubWarning,
        `Fixture ${fixtureId}: renderer must set ready=true (rendererStubWarning must be false). ` +
        `If this fails, the renderer-path-integration wiring in main.ts is incomplete.`
      );
      assert.equal(metadata.rendererLabel, "shape-witness",
        `Fixture ${fixtureId}: rendererLabel must be "shape-witness"`
      );

      const inv = fixture.expectedInvariants;
      const result = analyzeShape(png);

      // Always assert the captured image is not blank
      assert.ok(
        result.mask.changedPixels > 0,
        `Fixture ${fixtureId}: rendered image must have some foreground pixels`
      );

      // Assert kind-specific invariants
      switch (inv.kind) {
        case "circular-mask": {
          if (inv.aspectRatio) {
            assert.ok(
              result.aspectRatio >= inv.aspectRatio.min && result.aspectRatio <= inv.aspectRatio.max,
              `[${fixtureId}] aspectRatio ${result.aspectRatio.toFixed(3)} must be in [${inv.aspectRatio.min}, ${inv.aspectRatio.max}]`
            );
          }
          if (inv.thicknessRatio) {
            if (inv.thicknessRatio.min !== undefined) {
              assert.ok(
                result.thicknessRatio >= inv.thicknessRatio.min,
                `[${fixtureId}] thicknessRatio ${result.thicknessRatio.toFixed(3)} must be >= ${inv.thicknessRatio.min}`
              );
            }
          }
          if (inv.center) {
            assert.ok(
              Math.abs(result.centroid.x - inv.center.x) <= inv.center.tolerancePx,
              `[${fixtureId}] centroid.x ${result.centroid.x.toFixed(1)} must be within ${inv.center.tolerancePx}px of ${inv.center.x}`
            );
            assert.ok(
              Math.abs(result.centroid.y - inv.center.y) <= inv.center.tolerancePx,
              `[${fixtureId}] centroid.y ${result.centroid.y.toFixed(1)} must be within ${inv.center.tolerancePx}px of ${inv.center.y}`
            );
          }
          break;
        }
        case "thin-ribbon": {
          if (inv.thicknessRatio?.max !== undefined) {
            assert.ok(
              result.thicknessRatio <= inv.thicknessRatio.max,
              `[${fixtureId}] thicknessRatio ${result.thicknessRatio.toFixed(3)} must be <= ${inv.thicknessRatio.max} (edge-on ribbon must be thin)`
            );
          }
          break;
        }
        case "oriented-ellipse": {
          if (inv.axisAngleDeg) {
            const angleDeg = result.principalAxes.angleDeg;
            const expected = inv.axisAngleDeg.expected;
            const tolerance = inv.axisAngleDeg.toleranceDeg;
            // angleDeg and expected are both in [-90, 90]; wrap-around not needed here.
            assert.ok(
              Math.abs(angleDeg - expected) <= tolerance || Math.abs(angleDeg + expected) <= tolerance,
              `[${fixtureId}] principalAxes.angleDeg ${angleDeg.toFixed(1)} must be within ${tolerance}° of ±${expected}°`
            );
          }
          if (inv.thicknessRatio?.max !== undefined) {
            assert.ok(
              result.thicknessRatio <= inv.thicknessRatio.max,
              `[${fixtureId}] thicknessRatio ${result.thicknessRatio.toFixed(3)} must be <= ${inv.thicknessRatio.max} (oriented ellipse must stay elongated)`
            );
          }
          break;
        }
        case "bounded-slab": {
          assert.ok(
            Array.isArray(inv.backgroundColor) && inv.backgroundColor.length === 4,
            `[${fixtureId}] bounded-slab invariant must declare fixed backgroundColor`
          );
          assert.equal(
            typeof inv.cornerMaxMeanDeltaFromBackground,
            "number",
            `[${fixtureId}] bounded-slab invariant must declare cornerMaxMeanDeltaFromBackground`
          );
          const resultWithFixedBackground = analyzeShape(png, undefined, undefined, {
            backgroundColor: inv.backgroundColor,
          });
          // near-plane-slab: changedPixelRatio must NOT exceed the max
          assert.ok(
            resultWithFixedBackground.mask.changedPixelRatio <= inv.maxChangedPixelRatio,
            `[${fixtureId}] changedPixelRatio ${resultWithFixedBackground.mask.changedPixelRatio.toFixed(3)} must be <= ${inv.maxChangedPixelRatio} (near-plane slab must not flood screen)`
          );
          assertCornersNearBackground(
            png,
            inv.backgroundColor,
            inv.cornerMaxMeanDeltaFromBackground,
            `[${fixtureId}]`
          );
          break;
        }
        case "foreground-suppression": {
          // dense-foreground: decode the rendered PNG and compute foreground
          // suppression against a bright-white reference background. The fixture's
          // background splat is bright white; if the foreground is working, most of
          // those bright pixels should be hidden by dark opaque foreground splats.
          if (inv.foregroundSuppressionRatio) {
            const decoded = decodePng(png);
            const { rgba, width, height } = decoded;
            // Build a bright-white reference (what the image would look like
            // with only the background splat and no foreground).
            const bgRgba = new Uint8Array(width * height * 4);
            for (let i = 0; i < bgRgba.length; i += 4) {
              bgRgba[i] = 255;
              bgRgba[i + 1] = 255;
              bgRgba[i + 2] = 255;
              bgRgba[i + 3] = 255;
            }
            const { suppressionRatio } = computeForegroundSuppression(
              rgba, width, height, bgRgba,
            );
            assert.ok(
              suppressionRatio >= inv.foregroundSuppressionRatio.min,
              `[${fixtureId}] foreground suppression ratio ${suppressionRatio.toFixed(3)} must be >= ${inv.foregroundSuppressionRatio.min} (bright background must be hidden by opaque foreground)`
            );
          }
          break;
        }
      }
    });
  }

  test("edge-on ribbon shape failure is paired with tile-local footprint pressure", async (t) => {
    t.timeout = 60_000;

    const { metadata } = await captureShapeWitness("edge-on-ribbon", {
      baseUrl,
      rendererMode: "tile-local-visible",
      settleMs: 3000,
      timeoutMs: 30_000,
    });

    assert.ok(!metadata.rendererStubWarning, "edge-on ribbon must render through the real shape-witness path");
    assert.equal(metadata.rendererLabel, "shape-witness", "shape witness renderer label must survive tile-local mode");
    assert.ok(metadata.tileLocal, "tile-local-visible shape witness must expose tile-local pressure evidence");
    assert.equal(metadata.tileLocal.status, "current", "tile-local pressure evidence must be current, not stale");
    const tileGrid = metadata.tileLocal.tileColumns * metadata.tileLocal.tileRows;
    const coveredTileRatio = metadata.tileLocal.refs / tileGrid;
    assert.ok(
      coveredTileRatio <= 0.25,
      `edge-on ribbon should stay narrow in tile coverage, got ${metadata.tileLocal.refs}/${tileGrid} tile refs (${coveredTileRatio.toFixed(3)})`
    );
  });
});

// ---------------------------------------------------------------------------
// Helper used by browser layer
// ---------------------------------------------------------------------------

/**
 * Decode a PNG buffer for foreground suppression computation.
 * Returns null if decoding is not possible in this environment.
 */
