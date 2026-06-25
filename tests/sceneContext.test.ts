import assert from "node:assert/strict";
import test from "node:test";

// Test the type shape and telemetry contract — not GPU rendering.

test("HybridRenderSceneContextV0 type has required P0 fields", async () => {
  // Dynamic import to test the exported type exists
  const mod = await import("../src/sceneContext.ts");
  // The type is compile-time only, but we can check the telemetry function exists
  assert.equal(typeof mod.classifySceneContextHonored, "function");
});

test("classifySceneContextHonored reports environment as honorable", async () => {
  const { classifySceneContextHonored } = await import("../src/sceneContext.ts");
  const result = classifySceneContextHonored({
    schema: "hybrid-render.scene-context.v0",
    producer: { app: "kaminos" },
    frame: { worldUnits: "meters", upAxis: "Y", handedness: "right", colorSpace: "linear-srgb" },
    camera: {
      viewMatrix: Array(16).fill(0),
      projectionMatrix: Array(16).fill(0),
      positionWorld: [0, 0, 0],
      viewport: { width: 800, height: 600, devicePixelRatio: 2 },
    },
    lighting: {
      environment: { kind: "preset", preset: "studio_small_09", intensity: 1.0 },
      exposure: 1.0,
      toneMapping: "reinhard",
    },
    composition: { mode: "overlay", background: "transparent" },
    objects: [],
  });
  assert.equal(result.schema, "hybrid-render.scene-context.v0");
  assert.equal(result.accepted, true);
  assert.equal(result.honored.environment, true);
  assert.equal(result.honored.exposure, true);
  assert.equal(result.honored.toneMapping, false); // not yet implemented
  assert.equal(result.honored.lights, false);
  assert.equal(result.honored.depthSource, false);
});

test("classifySceneContextHonored rejects unknown schema", async () => {
  const { classifySceneContextHonored } = await import("../src/sceneContext.ts");
  const result = classifySceneContextHonored({ schema: "unknown.v99" } as any);
  assert.equal(result.accepted, false);
});

test("classifySceneContextHonored handles missing lighting", async () => {
  const { classifySceneContextHonored } = await import("../src/sceneContext.ts");
  const result = classifySceneContextHonored({
    schema: "hybrid-render.scene-context.v0",
    producer: { app: "test" },
    frame: { worldUnits: "meters", upAxis: "Y", handedness: "right", colorSpace: "linear-srgb" },
    camera: {
      viewMatrix: Array(16).fill(0),
      projectionMatrix: Array(16).fill(0),
      positionWorld: [0, 0, 0],
      viewport: { width: 800, height: 600, devicePixelRatio: 1 },
    },
    composition: { mode: "overlay", background: "transparent" },
    objects: [],
  } as any);
  assert.equal(result.accepted, true);
  assert.equal(result.honored.environment, false);
});
