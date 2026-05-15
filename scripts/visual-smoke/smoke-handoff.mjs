export function buildSmokeHandoff(options = {}, defaults = {}) {
  const smokeKind = options.smokeKind ?? defaults.smokeKind ?? "visual";
  return {
    smokeKind,
    decisionRequested:
      options.decisionRequested ??
      defaults.decisionRequested ??
      "Decide whether this smoke satisfies the branch-specific evidence contract.",
    expectedVisualDelta:
      options.expectedVisualDelta ??
      defaults.expectedVisualDelta ??
      (smokeKind === "telemetry" ? "none expected" : "not specified"),
    evidenceSurface:
      options.evidenceSurface ??
      defaults.evidenceSurface ??
      "report.md, analysis.json, page evidence, and captured canvas screenshot",
  };
}

export function parseSmokeKind(value) {
  if (value === "visual" || value === "telemetry") {
    return value;
  }
  throw new Error(`Invalid smoke kind ${value}; expected visual or telemetry`);
}

export function renderSmokeHandoffSection(smokeHandoff) {
  return `## Smoke Handoff

- Smoke kind: ${smokeHandoff.smokeKind}
- Decision requested: ${smokeHandoff.decisionRequested}
- Expected visual delta: ${smokeHandoff.expectedVisualDelta}
- Evidence surface: ${smokeHandoff.evidenceSurface}
`;
}
