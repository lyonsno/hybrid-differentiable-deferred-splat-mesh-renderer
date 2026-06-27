import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const OVERLAY_PATH = new URL("../src/splatOverlay.ts", import.meta.url);

test("overlay exposes renderer-owned material, AO, bloom, and emissive controls", async () => {
  const overlay = await readFile(OVERLAY_PATH, "utf8");

  assert.match(overlay, /hybrid-render\.splat-renderer-controls\.v0/);
  assert.match(overlay, /export interface SplatRendererControlsV0/);
  assert.match(overlay, /setRendererControls\(controls: SplatRendererControlsV0\): SplatRendererControlsTelemetry/);
  assert.match(overlay, /readonly rendererControlsTelemetry: SplatRendererControlsTelemetry/);
  assert.match(overlay, /roughnessCurve:\s*_rendererControls\.material\.roughness/);
  assert.match(overlay, /metalnessCurve:\s*_rendererControls\.material\.metalness/);
  assert.match(overlay, /albedoCurve:\s*_rendererControls\.material\.albedo/);
  assert.match(overlay, /emissiveIntensity:\s*_rendererControls\.emissive\.intensity/);
  assert.match(overlay, /aoRadius:\s*_rendererControls\.ao\.radius/);
  assert.match(overlay, /bloomIntensity:\s*_rendererControls\.bloom\.intensity/);
});
