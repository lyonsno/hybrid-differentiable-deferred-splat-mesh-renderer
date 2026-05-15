#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

import { decodePng } from "./png-analysis.mjs";

const DEFAULT_SMOKE_ASSET = "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json";
const CONTACT_SHEET_VIEW_ORDER = Object.freeze([
  "dessert-wide",
  "dessert-close",
  "black-band-crop",
  "porous-body-crop",
  "toolbench-comparison",
]);

const CONTACT_SHEET_VIEW_DEFINITIONS = Object.freeze({
  "dessert-wide": {
    sourceMode: "static-dessert-witness",
    sourceView: "dessert-wide",
    outputSubdir: path.posix.join("source", "dessert-wide"),
    title: "Dessert wide",
  },
  "dessert-close": {
    sourceMode: "static-dessert-witness",
    sourceView: "dessert-close",
    outputSubdir: path.posix.join("source", "dessert-close"),
    title: "Dessert close",
  },
  "black-band-crop": {
    sourceMode: "derived-crop",
    sourceView: "dessert-close",
    outputSubdir: "black-band-crop",
    cropKey: "rimBand",
    title: "Black-band crop",
  },
  "porous-body-crop": {
    sourceMode: "derived-crop",
    sourceView: "dessert-porous-close",
    outputSubdir: "porous-body-crop",
    cropKey: "porousBody",
    title: "Porous-body crop",
  },
  "toolbench-comparison": {
    sourceMode: "tile-local-comparison",
    sourceView: "toolbench-comparison",
    outputSubdir: path.posix.join("source", "toolbench-comparison"),
    title: "Toolbench comparison",
  },
});

export function buildSmokeContactSheetLayout({ bundleSlug } = {}) {
  const resolvedSlug = bundleSlug || defaultBundleSlug();
  const bundleDir = path.posix.join("smoke-reports", resolvedSlug);
  return {
    bundleDir,
    manifestPath: path.posix.join(bundleDir, "manifest.json"),
    reportPath: path.posix.join(bundleDir, "report.md"),
    branchDirs: {
      main: path.posix.join(bundleDir, "main"),
      candidate: path.posix.join(bundleDir, "candidate"),
    },
  };
}

export function buildSmokeContactSheetPlan({ bundleSlug, branches = [] } = {}) {
  const layout = buildSmokeContactSheetLayout({ bundleSlug });
  return {
    bundleSlug: bundleSlug || defaultBundleSlug(),
    layout,
    branches: branches.map((branch) => buildBranchPlan(branch, layout)),
  };
}

export function renderSmokeContactSheetReport(plan) {
  return `# Smoke Contact Sheet

- Bundle: ${plan.bundleSlug}
- Bundle dir: \`${plan.layout.bundleDir}\`
- Manifest: \`${plan.layout.manifestPath}\`
- Branch report: \`${plan.layout.reportPath}\`

${plan.branches
  .map(
    (branch) => `## ${branch.role}

- Label: ${branch.label}
- SHA: ${branch.sha}
- Repo: \`${branch.repoPath}\`
- Branch report: \`${branch.reportPath}\`

- Views: ${branch.views.map((view) => `${view.name}: ${view.status}`).join(", ")}

${branch.views
  .map(
    (view) => `### ${view.title}

- Status: ${view.status}
- Source mode: ${view.sourceMode}
- Source view: ${view.sourceView}
- Output dir: \`${view.outputDir}\`
- Source run dir: \`${view.sourceRunDir}\`
${view.cropKey ? `- Crop key: ${view.cropKey}\n` : ""}${view.crop ? `- Crop: ${JSON.stringify(view.crop)}\n` : ""}${view.missingReason ? `- Missing: ${view.missingReason}\n` : ""}`
  )
  .join("\n")}`
  )
  .join("\n")}
`;
}

export async function buildSmokeContactSheetBundle({
  bundleSlug,
  mainRepo,
  candidateRepo,
  includeToolbenchComparison = true,
  dryRun = false,
  browserChannel,
  browserExecutable,
} = {}) {
  if (!mainRepo || !candidateRepo) {
    throw new Error("buildSmokeContactSheetBundle: mainRepo and candidateRepo are required");
  }

  const branches = [
    await resolveBranchDescriptor("main", mainRepo),
    await resolveBranchDescriptor("candidate", candidateRepo),
  ];
  const allowedViews = includeToolbenchComparison
    ? CONTACT_SHEET_VIEW_ORDER
    : CONTACT_SHEET_VIEW_ORDER.filter((view) => view !== "toolbench-comparison");
  const plan = buildSmokeContactSheetPlan({ bundleSlug, branches });
  for (const branch of plan.branches) {
    branch.availableViews = allowedViews;
    for (const view of branch.views) {
      view.status = allowedViews.includes(view.name) ? view.status : "missing";
      if (view.status === "missing" && view.name === "toolbench-comparison" && !includeToolbenchComparison) {
        view.missingReason = "toolbench comparison disabled by --no-toolbench";
      }
    }
  }

  if (dryRun) {
    return { plan, captures: [] };
  }

  await mkdir(plan.layout.bundleDir, { recursive: true });
  const captures = [];

  for (const branch of plan.branches) {
    await mkdir(branch.branchDir, { recursive: true });
    await writeFile(
      path.join(branch.branchDir, "branch.json"),
      `${JSON.stringify({ role: branch.role, label: branch.label, sha: branch.sha, repoPath: branch.repoPath }, null, 2)}\n`
    );

    const sourcePlans = uniqueSourcePlans(branch.views).filter((sourcePlan) =>
      includeToolbenchComparison ? true : sourcePlan.captureMode !== "tile-local-comparison"
    );
    const sourceCaptureResults = new Map();

    for (const sourcePlan of sourcePlans) {
      const sourceDir = path.join(branch.branchDir, "source", sourcePlan.sourceView);
      const captureResult = await runSmokeCapture({
        repoPath: branch.repoPath,
        captureMode: sourcePlan.captureMode,
        sourceView: sourcePlan.sourceView,
        outDir: sourceDir,
        browserChannel,
        browserExecutable,
      });
      sourceCaptureResults.set(sourcePlan.sourceView, {
        sourceDir,
        reportPath: path.join(sourceDir, "report.md"),
        analysisPath: path.join(sourceDir, "analysis.json"),
        ...captureResult,
      });
    }

    for (const view of branch.views) {
      if (view.sourceMode !== "derived-crop") {
        continue;
      }
      const sourceCapture = sourceCaptureResults.get(view.sourceView);
      if (!sourceCapture) {
        view.status = "missing";
        view.missingReason = `missing source capture ${view.sourceView}`;
        continue;
      }
      const crop = await extractCropRegion(sourceCapture.analysisPath, view.cropKey);
      if (!crop) {
        view.status = "missing";
        view.missingReason = `missing ${view.cropKey} crop metadata`;
        continue;
      }
      await mkdir(view.outputDir, { recursive: true });
      const sourcePng = await readFile(path.join(sourceCapture.sourceDir, "final-color.png"));
      await writeFile(path.join(view.outputDir, "final-color.png"), cropPngBuffer(sourcePng, crop));
      await writeFile(path.join(view.outputDir, "crop.json"), `${JSON.stringify({ crop, sourceView: view.sourceView }, null, 2)}\n`);
      await copyFile(path.join(sourceCapture.sourceDir, "analysis.json"), path.join(view.outputDir, "source-analysis.json"));
      await copyFile(path.join(sourceCapture.sourceDir, "report.md"), path.join(view.outputDir, "source-report.md"));
      view.crop = crop;
    }

    await writeFile(path.join(branch.branchDir, "report.md"), renderBranchReport(branch));
    captures.push({ branch, sourceCaptureResults });
  }

  await writeFile(plan.layout.manifestPath, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(plan.layout.reportPath, renderSmokeContactSheetReport(plan));
  return { plan, captures };
}

async function resolveBranchDescriptor(role, repoPath) {
  const label = await gitOutput(repoPath, ["branch", "--show-current"]);
  const sha = await gitOutput(repoPath, ["rev-parse", "--short", "HEAD"]);
  return {
    role,
    label: label || role,
    sha,
    repoPath,
    availableViews: CONTACT_SHEET_VIEW_ORDER,
  };
}

function buildBranchPlan(branch, layout) {
  const availableViews = new Set(branch.availableViews ?? CONTACT_SHEET_VIEW_ORDER);
  const branchDir = layout.branchDirs[branch.role] ?? path.posix.join(layout.bundleDir, branch.role);
  const views = CONTACT_SHEET_VIEW_ORDER.map((name) => buildViewPlan(name, branch.role, branchDir, availableViews));
  return {
    role: branch.role,
    label: branch.label,
    sha: branch.sha,
    repoPath: branch.repoPath,
    branchDir,
    reportPath: path.posix.join(branchDir, "report.md"),
    views,
  };
}

function buildViewPlan(name, role, branchDir, availableViews) {
  const definition = CONTACT_SHEET_VIEW_DEFINITIONS[name];
  return {
    name,
    title: definition.title,
    sourceMode: definition.sourceMode,
    sourceView: definition.sourceView,
    captureMode: captureModeForView(name),
    outputDir: path.posix.join(branchDir, definition.outputSubdir),
    sourceRunDir: path.posix.join(branchDir, "source", definition.sourceView),
    status: availableViews.has(name) ? "present" : "missing",
    role,
    cropKey: definition.cropKey,
  };
}

function uniqueSourcePlans(views) {
  const seen = new Set();
  const plans = [];
  for (const view of views) {
    const key = `${view.captureMode}:${view.sourceView}`;
    if (seen.has(key)) continue;
    seen.add(key);
    plans.push({
      captureMode: view.captureMode,
      sourceView: view.sourceView,
      sourceRunDir: view.sourceRunDir,
    });
  }
  return plans;
}

async function runSmokeCapture({ repoPath, captureMode, sourceView, outDir, browserChannel, browserExecutable }) {
  const smokeScript = fileURLToPath(new URL("../run-visual-smoke.mjs", import.meta.url));
  const args = [
    smokeScript,
    "--app-root",
    repoPath,
    "--report-dir",
    outDir,
    "--require-real-splat",
    "--timeout-ms",
    "60000",
    "--settle-ms",
    "5000",
    "--query",
    smokeCaptureQuery({ captureMode, sourceView }),
  ];
  if (browserChannel) {
    args.push("--browser-channel", browserChannel);
  }
  if (browserExecutable) {
    args.push("--browser-executable", browserExecutable);
  }
  if (captureMode === "static-dessert-witness") {
    args.push("--static-dessert-witness");
  } else if (captureMode === "tile-local-comparison") {
    args.push("--tile-local-comparison");
  } else {
    throw new Error(`Unknown source mode: ${captureMode}`);
  }

  return spawnPromise(process.execPath, args, { cwd: repoPath });
}

function smokeCaptureQuery({ captureMode, sourceView }) {
  const params = [`asset=${DEFAULT_SMOKE_ASSET}`];
  if (captureMode === "static-dessert-witness" && (sourceView === "dessert-close" || sourceView === "dessert-porous-close")) {
    params.push(`witnessView=${sourceView}`);
  }
  return params.join("&");
}

async function extractCropRegion(analysisPath, cropKey) {
  const analysis = JSON.parse(await readFile(analysisPath, "utf8"));
  const witnessCrop = analysis?.pageEvidence?.witness?.projection?.cropSupport?.[cropKey]?.crop;
  if (!witnessCrop) {
    return null;
  }
  return {
    x: Math.max(0, Math.floor(witnessCrop.x)),
    y: Math.max(0, Math.floor(witnessCrop.y)),
    width: Math.max(1, Math.floor(witnessCrop.width)),
    height: Math.max(1, Math.floor(witnessCrop.height)),
  };
}

function cropPngBuffer(pngBuffer, crop) {
  const image = decodePng(pngBuffer);
  const x = clamp(crop.x, 0, image.width - 1);
  const y = clamp(crop.y, 0, image.height - 1);
  const width = clamp(crop.width, 1, image.width - x);
  const height = clamp(crop.height, 1, image.height - y);
  const rgba = Buffer.alloc(width * height * 4);

  for (let row = 0; row < height; row += 1) {
    const sourceOffset = ((y + row) * image.width + x) * 4;
    const targetOffset = row * width * 4;
    image.rgba.copy(rgba, targetOffset, sourceOffset, sourceOffset + width * 4);
  }

  return encodePng({ width, height, rgba });
}

function encodePng({ width, height, rgba }) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    rgba.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rows.push(row);
  }
  return Buffer.concat([
    signature,
    pngChunk("IHDR", encodeIhdr(width, height)),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIhdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function renderBranchReport(branch) {
  return `# Smoke Contact Sheet Branch

- Role: ${branch.role}
- Label: ${branch.label}
- SHA: ${branch.sha}
- Repo: \`${branch.repoPath}\`

## Views

- ${branch.views.map((view) => `${view.name}: ${view.status}`).join("\n- ")}

${branch.views
  .map(
    (view) => `### ${view.title}

- Status: ${view.status}
- Source mode: ${view.sourceMode}
- Source view: ${view.sourceView}
- Output dir: \`${view.outputDir}\`
- Source run dir: \`${view.sourceRunDir}\`
${view.crop ? `- Crop: \`${JSON.stringify(view.crop)}\`` : ""}
${view.status === "missing" && view.missingReason ? `- Missing: ${view.missingReason}` : ""}`
  )
  .join("\n")}
`;
}

function captureModeForView(name) {
  const definition = CONTACT_SHEET_VIEW_DEFINITIONS[name];
  return definition.sourceMode === "tile-local-comparison"
    ? "tile-local-comparison"
    : "static-dessert-witness";
}

async function gitOutput(repoPath, args) {
  return spawnPromise("git", ["-C", repoPath, ...args], { captureStdout: true });
}

function defaultBundleSlug() {
  return `contact-sheet-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function spawnPromise(command, args, { cwd, captureStdout = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: captureStdout ? ["ignore", "pipe", "inherit"] : "inherit",
      env: process.env,
    });

    let stdout = "";
    if (captureStdout && child.stdout) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  buildSmokeContactSheetBundle(options)
    .then(({ plan }) => {
      if (options.dryRun) {
        process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      } else {
        process.stdout.write(`${JSON.stringify({ plan, reportPath: plan.layout.reportPath }, null, 2)}\n`);
      }
    })
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exit(1);
    });
}

function parseArgs(args) {
  const options = {
    bundleSlug: undefined,
    mainRepo: undefined,
    candidateRepo: undefined,
    includeToolbenchComparison: true,
    dryRun: false,
    browserChannel: process.env.VISUAL_SMOKE_BROWSER_CHANNEL || "chrome",
    browserExecutable: process.env.VISUAL_SMOKE_BROWSER_EXECUTABLE,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = () => {
      index += 1;
      if (index >= args.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      return args[index];
    };

    switch (arg) {
      case "--bundle-slug":
        options.bundleSlug = next();
        break;
      case "--main-repo":
        options.mainRepo = next();
        break;
      case "--candidate-repo":
        options.candidateRepo = next();
        break;
      case "--no-toolbench":
        options.includeToolbenchComparison = false;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--browser-channel":
        options.browserChannel = next();
        break;
      case "--browser-executable":
        options.browserExecutable = next();
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/visual-smoke/contact-sheet.mjs [options]

Options:
  --bundle-slug <slug>         Output slug under smoke-reports/. Defaults to a timestamped slug.
  --main-repo <path>           Main branch renderer checkout.
  --candidate-repo <path>      Candidate branch renderer checkout.
  --no-toolbench               Skip the tile-local comparison capture.
  --dry-run                    Print the plan without running captures.
  --browser-channel <name>     Browser channel for visual smoke capture.
  --browser-executable <path>  Browser executable path; overrides the channel.
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
