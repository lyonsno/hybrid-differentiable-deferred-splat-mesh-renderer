import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const overlay = readFileSync(new URL("../src/splatOverlay.ts", import.meta.url), "utf8");

assert.match(overlay, /applySplatCorrectionToAttributes/, "embedded overlay applies correction crop to attributes");
assert.match(overlay, /function effectiveAttributesForSource\(/, "embedded overlay derives effective render attributes from raw source attributes");
assert.match(overlay, /if \(sourceAttributes\) initScene\(effectiveAttributesForSource\(sourceAttributes\)\)/, "setCorrectionIdentity rebuilds the scene after crop changes");
assert.match(overlay, /cropAppliedByRenderer/, "overlay handle exposes whether renderer-side crop was applied");
assert.doesNotMatch(overlay, /does not filter vertices/, "embedded overlay must not keep the old metadata-only crop TODO");
