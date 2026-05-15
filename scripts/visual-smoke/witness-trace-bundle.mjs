import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { cropPngBuffer, centerCropBox } from "./png-crop.mjs";

export const WITNESS_TRACE_ANCHOR_PIXELS = [
  {
    id: "lacunar-hole-dessert-1260-930",
    label: "lacunar hole dessert",
    x: 1260,
    y: 930,
    cropWidth: 256,
    cropHeight: 256,
  },
  {
    id: "dense-foreground-leak-1580-1260",
    label: "dense foreground leak",
    x: 1580,
    y: 1260,
    cropWidth: 256,
    cropHeight: 256,
  },
  {
    id: "black-band-dropout-2300-1055",
    label: "black band dropout",
    x: 2300,
    y: 1055,
    cropWidth: 384,
    cropHeight: 192,
  },
];

export const WITNESS_TRACE_SCHEMA_REF = "origin/cc/trace-schema-anchor-0514@3cd5919";
export const WITNESS_TRACE_PROJECTION_REF =
  "origin/cc/projection-pixel-trace-0514@ba76a485cf34bf514eca1d862399eb6e71fcd1ef";
export const WITNESS_TRACE_SYNTHETIC_REF =
  "origin/cc/synthetic-trace-parity-oracle-0514@b3eadeba5d607753270c190d3f27b7e4f2b586e7";
export const WITNESS_TRACE_ORDERING_REF = "origin/cc/ordering-band-row-trace-0514@13cfcca";
export const WITNESS_TRACE_ORDERING_REPORT = "8176bf3f";
export const WITNESS_TRACE_RETENTION_REF =
  "origin/cc/retention-pixel-trace-0514@79cb725fb7ec55c1fb8f2c22276e58945b0a8744";
export const WITNESS_TRACE_RETENTION_REPORT = "def83a63";
export const WITNESS_TRACE_FINAL_ACCUMULATION_REF =
  "origin/cc/final-accumulation-trace-0515@f5f0fbb7689dac0cc3ef997f0e3cdb4ccf0d2cd5";
export const WITNESS_TRACE_FINAL_ACCUMULATION_REPORT = "db4c263e";

export function buildWitnessTraceBundle({ witness, appRoot, packetPath, thesisPath }) {
  const git = readGitInfo(appRoot);
  const finalColorCapture = witness.captures.find((capture) => capture.id === "final-color");
  if (!finalColorCapture) {
    throw new Error("Static dessert witness bundle requires the final-color capture");
  }

  const finalColorScreenshot = path.resolve(appRoot, finalColorCapture.screenshotPath);
  const anchorPixels = WITNESS_TRACE_ANCHOR_PIXELS.map((anchor) => ({
    id: anchor.id,
    label: anchor.label,
    x: anchor.x,
    y: anchor.y,
    status: "present",
    source: "packet",
    crop: centerCropBox(anchor.x, anchor.y, anchor.cropWidth, anchor.cropHeight),
  }));
  const crops = anchorPixels.map((anchor) => ({
    id: `${anchor.id}-crop`,
    anchorPixelId: anchor.id,
    sourceCaptureId: finalColorCapture.id,
    sourceScreenshotPath: finalColorCapture.screenshotPath,
    path: path.join("crops", `${anchor.id}.png`),
    box: anchor.crop,
    status: "present",
  }));

  const traceJson = {
    schema: {
      status: "present",
      source: packetSource("trace-schema-anchor", WITNESS_TRACE_SCHEMA_REF, packetPath, thesisPath),
      note: "Canonical trace schema is consumed, not redefined, by the witness bundle.",
    },
    projection: {
      status: "present",
      source: packetSource("projection-pixel-trace", WITNESS_TRACE_PROJECTION_REF, packetPath, thesisPath),
      note: "Projection provenance is referenced from the sibling report surface.",
    },
    syntheticParity: {
      status: "present",
      source: packetSource("synthetic-trace-parity-oracle", WITNESS_TRACE_SYNTHETIC_REF, packetPath, thesisPath),
      note: "Synthetic parity provenance is referenced from the sibling report surface.",
    },
    retention: {
      status: "present",
      source: packetSource("retention-pixel-trace", WITNESS_TRACE_RETENTION_REF, packetPath, thesisPath),
      note: `Retention lane landed in report ${WITNESS_TRACE_RETENTION_REPORT} on the retention branch; the bundle no longer uses a stale missing placeholder for this section.`,
    },
    ordering: {
      status: "present",
      source: packetSource("ordering-band-row-trace", WITNESS_TRACE_ORDERING_REF, packetPath, thesisPath),
      note: `Ordering lane landed in report ${WITNESS_TRACE_ORDERING_REPORT} on the ordering branch; the bundle no longer uses a stale missing placeholder for this section.`,
    },
    finalAccumulation: {
      status: "present",
      source: packetSource("final-accumulation-trace", WITNESS_TRACE_FINAL_ACCUMULATION_REF, packetPath, thesisPath),
      note: `Final accumulation lane landed in report ${WITNESS_TRACE_FINAL_ACCUMULATION_REPORT} on the final-accumulation branch; the bundle no longer uses a stale missing placeholder for this section.`,
    },
  };

  return {
    generatedAt: witness.generatedAt,
    smokeUrl: witness.baseUrl,
    branch: git.branch,
    commit: git.commit,
    repoRoot: appRoot,
    packet: {
      path: packetPath,
      thesisPath,
      stewardTopos: "pixel-trace-steward-0514",
    },
    viewport: witness.options?.viewport ?? null,
    anchorPixels,
    crops,
    traceJson,
    summary: witness.classification.summary.text,
    passFailNotes: buildPassFailNotes(witness),
    captures: summarizeCaptures(witness),
    witness,
    _artifacts: {
      finalColorScreenshot,
    },
  };
}

export async function writeWitnessTraceBundle(bundle, { reportDir }) {
  await mkdir(reportDir, { recursive: true });
  await mkdir(path.join(reportDir, "crops"), { recursive: true });

  const finalColorScreenshot = bundle._artifacts.finalColorScreenshot;
  const screenshotBuffer = await readFile(finalColorScreenshot);

  for (const crop of bundle.crops) {
    const result = cropPngBuffer(screenshotBuffer, crop.box);
    await writeFile(path.join(reportDir, crop.path), result.png);
  }

  const tracePath = path.join(reportDir, "trace.json");
  const reportPath = path.join(reportDir, "report.md");
  const bundleJson = JSON.stringify(publicBundle(bundle), null, 2);

  await writeFile(tracePath, `${bundleJson}\n`);
  await writeFile(reportPath, renderWitnessTraceBundleReport(bundle));
  await writeFile(path.join(reportDir, "analysis.json"), `${bundleJson}\n`);

  return {
    tracePath,
    reportPath,
  };
}

export function renderWitnessTraceBundleReport(bundle) {
  return `# Witness Trace Bundle

- Status: ${bundle.passFailNotes.some((note) => note.startsWith("FAIL:")) ? "FAIL" : "PASS"}
- Generated: ${bundle.generatedAt}
- Smoke URL: ${bundle.smokeUrl}
- Branch: ${bundle.branch}
- Commit: ${bundle.commit}
- Packet: \`${bundle.packet.path}\`
- Thesis: \`${bundle.packet.thesisPath}\`
- Steward topos: \`${bundle.packet.stewardTopos}\`
- Viewport: ${formatViewport(bundle.viewport)}
- Summary: ${bundle.summary}

## Anchor Pixels

${bundle.anchorPixels
  .map(
    (anchor) => `### ${anchor.id}

- Label: ${anchor.label}
- Pixel: ${anchor.x}, ${anchor.y}
- Crop: ${anchor.crop.x}, ${anchor.crop.y}, ${anchor.crop.width}x${anchor.crop.height}
- Status: ${anchor.status}
`
  )
  .join("\n")}

## Crops

${bundle.crops
  .map(
    (crop) => `### ${crop.id}

- Source capture: ${crop.sourceCaptureId}
- Source screenshot: \`${crop.sourceScreenshotPath}\`
- Output path: \`${crop.path}\`
- Box: ${crop.box.x}, ${crop.box.y}, ${crop.box.width}x${crop.box.height}
- Status: ${crop.status}
`
  )
  .join("\n")}

## Trace JSON

\`\`\`json
${JSON.stringify(bundle.traceJson, null, 2)}
\`\`\`

## Pass / Fail Notes

${bundle.passFailNotes.map((note) => `- ${note}`).join("\n")}
`;
}

function buildPassFailNotes(witness) {
  const notes = [];
  const status = witness.classification?.closeable ? "PASS" : "FAIL";
  const summary = String(witness.classification?.summary?.text ?? "no summary available");
  notes.push(summary.startsWith(`${status}:`) ? summary : `${status}: ${summary}`);
  for (const finding of witness.classification?.findings ?? []) {
    notes.push(`${finding.kind}: ${finding.summary}`);
  }
  notes.push(
    `retention: landed report ${WITNESS_TRACE_RETENTION_REPORT} on ${WITNESS_TRACE_RETENTION_REF}; explicit placeholder retired from the bundle`
  );
  notes.push(
    `ordering: landed report ${WITNESS_TRACE_ORDERING_REPORT} on ${WITNESS_TRACE_ORDERING_REF}; explicit placeholder retired from the bundle`
  );
  notes.push(
    `finalAccumulation: landed report ${WITNESS_TRACE_FINAL_ACCUMULATION_REPORT} on ${WITNESS_TRACE_FINAL_ACCUMULATION_REF}; explicit placeholder retired from the bundle`
  );
  return notes;
}

function summarizeCaptures(witness) {
  return witness.captures.map((capture) => ({
    id: capture.id,
    title: capture.title,
    screenshotPath: capture.screenshotPath,
    rendererLabel: capture.pageEvidence?.rendererLabel ?? "",
    assetPath: capture.pageEvidence?.assetPath ?? "",
    splatCount: capture.pageEvidence?.splatCount ?? 0,
    tileRefs: capture.pageEvidence?.tileLocal?.refs ?? 0,
    nonblank: Boolean(capture.classification?.nonblank),
    realSplatEvidence: Boolean(capture.classification?.realSplatEvidence),
    summary: capture.classification?.summary ?? "",
  }));
}

function readGitInfo(appRoot) {
  const branch = runGit(appRoot, ["branch", "--show-current"]) || "HEAD";
  const commit = runGit(appRoot, ["rev-parse", "HEAD"]);
  return { branch, commit };
}

function runGit(appRoot, args) {
  return execFileSync("git", ["-C", appRoot, ...args], { encoding: "utf8" }).trim();
}

function packetSource(lane, ref, packetPath, thesisPath) {
  return {
    lane,
    ref,
    packetPath,
    thesisPath,
  };
}

function publicBundle(bundle) {
  return {
    generatedAt: bundle.generatedAt,
    smokeUrl: bundle.smokeUrl,
    branch: bundle.branch,
    commit: bundle.commit,
    repoRoot: bundle.repoRoot,
    packet: bundle.packet,
    viewport: bundle.viewport,
    anchorPixels: bundle.anchorPixels,
    crops: bundle.crops,
    traceJson: bundle.traceJson,
    summary: bundle.summary,
    passFailNotes: bundle.passFailNotes,
    captures: bundle.captures,
  };
}

function formatViewport(viewport) {
  if (!viewport || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) {
    return "not reported";
  }
  return `${viewport.width}x${viewport.height}`;
}
