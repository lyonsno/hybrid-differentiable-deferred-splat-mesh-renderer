import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTraceAnchorVisualInertnessWitness,
  encodePng,
} from "../../scripts/visual-smoke/trace-anchor-visual-inertness.mjs";

test("trace-anchor visual inertness witness preserves whole-frame, crop, and target deltas", () => {
  const baseline = image(5, 5, (x, y) => (x === 2 && y === 2 ? [5, 5, 10, 255] : [20, 20, 20, 255]));
  const traced = image(5, 5, (x, y) => {
    if (x === 2 && y === 2) return [162, 93, 53, 255];
    if (x === 4 && y === 0) return [45, 20, 20, 255];
    return [20, 20, 20, 255];
  });

  const witness = buildTraceAnchorVisualInertnessWitness({
    variants: [
      { id: "baseline", title: "No traceAnchors", image: baseline, route: { traceAnchors: "" } },
      { id: "traced", title: "Dark lacuna traced", image: traced, route: { traceAnchors: "dark-lacunar-hole@2,2" } },
    ],
    target: { id: "dark-lacunar-hole", x: 2, y: 2 },
    cropRadius: 1,
  });

  assert.equal(witness.classification, "trace-anchor-global-route-perturbation");
  assert.equal(witness.wholeFrame.width, 5);
  assert.equal(witness.wholeFrame.height, 5);
  assert.equal(witness.wholeFrame.totalPixels, 25);
  assert.equal(witness.comparisons[0].wholeFrame.changedPixels, 2);
  assert.equal(witness.comparisons[0].crop.changedPixels, 1);
  assert.deepEqual(witness.comparisons[0].target.before.rgba8, [5, 5, 10, 255]);
  assert.deepEqual(witness.comparisons[0].target.after.rgba8, [162, 93, 53, 255]);
  assert.deepEqual(witness.comparisons[0].target.deltaRgba8, [157, 88, 43, 0]);
  assert.equal(witness.comparisons[0].target.rgbLumaDelta, 96);
  assert.equal(witness.comparisons[0].outsideCrop.changedPixels, 1);
  assert.equal(witness.artifacts.fullFrameContactSheet.width, 15);
  assert.equal(witness.artifacts.fullFrameContactSheet.height, 5);
  assert.equal(witness.artifacts.cropContactSheet.width, 9);
  assert.equal(witness.artifacts.cropContactSheet.height, 3);
  assert.equal(Buffer.isBuffer(encodePng(witness.artifacts.fullFrameContactSheet)), true);
});

function image(width, height, pixelFor) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      rgba.set(pixelFor(x, y), offset);
    }
  }
  return { width, height, rgba };
}
