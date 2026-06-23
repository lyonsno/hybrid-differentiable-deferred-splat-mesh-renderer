import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const overlay = readFileSync(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");

assert.match(overlay, /solveEmissive\(/, "embeddable Kaminos overlay handle exposes live emissive solve");
assert.match(overlay, /updateEmissive\(/, "embeddable Kaminos overlay handle exposes raw emissive update");
assert.match(overlay, /solveHueGatedEmissive/, "overlay route uses the shared hue-gated emissive solver");
assert.match(overlay, /emissiveSplats/, "overlay solve reports emissive splat count to the host UI");

