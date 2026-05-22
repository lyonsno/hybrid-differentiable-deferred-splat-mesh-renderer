import assert from "node:assert/strict";
import test from "node:test";

import { buildOperatorFilmstripPlan } from "../../scripts/visual-smoke/operator-filmstrip.mjs";

test("operator filmstrip plan captures a compact default-camera sweep for the visible tile-local route", () => {
  const plan = buildOperatorFilmstripPlan(
    "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json"
  );

  assert.deepEqual(
    plan.map((capture) => [capture.id, capture.title, capture.gesture.kind, capture.url]),
    [
      [
        "default-camera",
        "Default camera",
        "none",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible",
      ],
      [
        "orbit-left",
        "Small orbit left",
        "drag",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible",
      ],
      [
        "zoom-in",
        "Small zoom in",
        "wheel",
        "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible",
      ],
    ]
  );
});
