import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rendererUrl = new URL("../src/splatRenderer.ts", import.meta.url);
const overlayUrl = new URL("../src/splatOverlay.ts", import.meta.url);

test("renderer depth capture exposes the latest r32float NDC surface", async () => {
  const renderer = await readFile(rendererUrl, "utf8");

  assert.match(renderer, /format:\s*"r32float-ndc"/);
  assert.match(
    renderer,
    /gbufferDepthTexture[\s\S]*GPUTextureUsage\.COPY_SRC/,
    "the renderer-owned depth surface must be copyable for bake coverage",
  );
  assert.match(renderer, /copyTextureToBuffer\(/);
  assert.match(
    renderer,
    /Math\.ceil\(unpaddedBytesPerRow\s*\/\s*256\)\s*\*\s*256/,
    "WebGPU readback rows must use 256-byte alignment",
  );
  assert.match(
    renderer,
    /mapped\.subarray\(row \* paddedFloatsPerRow, row \* paddedFloatsPerRow \+ width\)/,
    "the public depth frame must not leak row padding",
  );
});

test("overlay publishes depth capture from its renderer-owned scene", async () => {
  const overlay = await readFile(overlayUrl, "utf8");

  assert.match(overlay, /captureDepthFrame\(\): Promise<SplatDepthFrame>/);
  assert.match(overlay, /Cannot capture splat depth before a scene is loaded/);
  assert.match(overlay, /return renderer\.readDepthFrame\(scene\)/);
});
