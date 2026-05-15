import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSmokeContactSheetPlan,
  renderSmokeContactSheetReport,
} from "../../scripts/visual-smoke/contact-sheet.mjs";

test("smoke contact-sheet plan uses a deterministic branch and view layout", () => {
  const plan = buildSmokeContactSheetPlan({
    bundleSlug: "main-vs-candidate",
    branches: [
      {
        role: "main",
        label: "main",
        sha: "37bcab1",
        availableViews: ["dessert-wide", "dessert-close", "black-band-crop", "porous-body-crop"],
      },
      {
        role: "candidate",
        label: "candidate",
        sha: "a1b2c3d",
        availableViews: [
          "dessert-wide",
          "dessert-close",
          "black-band-crop",
          "porous-body-crop",
          "toolbench-comparison",
        ],
      },
    ],
  });

  assert.deepEqual(plan.layout, {
    bundleDir: "smoke-reports/main-vs-candidate",
    manifestPath: "smoke-reports/main-vs-candidate/manifest.json",
    reportPath: "smoke-reports/main-vs-candidate/report.md",
    branchDirs: {
      main: "smoke-reports/main-vs-candidate/main",
      candidate: "smoke-reports/main-vs-candidate/candidate",
    },
  });

  assert.deepEqual(
    plan.branches.map((branch) => [
      branch.role,
      branch.label,
      branch.sha,
      branch.views.map((view) => `${view.name}:${view.status}`),
    ]),
    [
      [
        "main",
        "main",
        "37bcab1",
        [
          "dessert-wide:present",
          "dessert-close:present",
          "black-band-crop:present",
          "porous-body-crop:present",
          "toolbench-comparison:missing",
        ],
      ],
      [
        "candidate",
        "candidate",
        "a1b2c3d",
        [
          "dessert-wide:present",
          "dessert-close:present",
          "black-band-crop:present",
          "porous-body-crop:present",
          "toolbench-comparison:present",
        ],
      ],
    ]
  );

  assert.deepEqual(
    plan.branches[0].views.map((view) => [view.name, view.sourceMode, view.sourceView ?? null]),
    [
      ["dessert-wide", "static-dessert-witness", "dessert-wide"],
      ["dessert-close", "static-dessert-witness", "dessert-close"],
      ["black-band-crop", "derived-crop", "dessert-close"],
      ["porous-body-crop", "derived-crop", "dessert-porous-close"],
      ["toolbench-comparison", "tile-local-comparison", "toolbench-comparison"],
    ]
  );

  assert.match(renderSmokeContactSheetReport(plan), /main/);
  assert.match(renderSmokeContactSheetReport(plan), /37bcab1/);
  assert.match(renderSmokeContactSheetReport(plan), /toolbench-comparison: missing/i);
});
