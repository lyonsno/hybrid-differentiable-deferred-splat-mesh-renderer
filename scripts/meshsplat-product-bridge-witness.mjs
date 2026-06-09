#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = "meshsplat.product_bridge_witness.v1";
const CONSUMER_REPO = "hybrid-differentiable-defferred-splat-mesh-renderer";
const CONSUMER_BRIDGE_SLICE = "product-bridge-route-identity-sidecar-0609";

const ROUTE_DEFAULTS = {
  rendererRouteRequested: "tile-local-visible",
  rendererRouteEffective: "tile-local-visible-gaussian-compositor",
  rendererSourceRequested: "wgsl-projected-ref-stream-source-frontier->tile-local-visible-gaussian-compositor",
  rendererSourceEffective: "wgsl-projected-ref-stream-source-frontier->tile-local-visible-gaussian-compositor",
  effectiveCompositor: "tile-local-visible-gaussian-compositor",
  effectiveProjectedStream: "wgsl-projected-ref-stream-source-frontier",
  arena: "gpu",
  tileSizePx: 16,
  maxRefsPerTile: 256,
};

const PRIMARY_JSON = "meshsplat-product-bridge-witness.json";
const PRIMARY_MD = "meshsplat-product-bridge-witness.md";
const FAILURE_JSON = "meshsplat-product-bridge-witness.failure.json";

class BridgeWitnessError extends Error {
  constructor(message, phase, evidence = {}) {
    super(message);
    this.name = "BridgeWitnessError";
    this.phase = phase;
    this.evidence = evidence;
  }
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const parseArgs = (argv) => {
  const args = {
    writeMarkdown: false,
    rendererRouteRequested: ROUTE_DEFAULTS.rendererRouteRequested,
    rendererRouteEffective: ROUTE_DEFAULTS.rendererRouteEffective,
    rendererSourceRequested: ROUTE_DEFAULTS.rendererSourceRequested,
    rendererSourceEffective: ROUTE_DEFAULTS.rendererSourceEffective,
    effectiveCompositor: ROUTE_DEFAULTS.effectiveCompositor,
    effectiveProjectedStream: ROUTE_DEFAULTS.effectiveProjectedStream,
    arena: ROUTE_DEFAULTS.arena,
    tileSizePx: ROUTE_DEFAULTS.tileSizePx,
    maxRefsPerTile: ROUTE_DEFAULTS.maxRefsPerTile,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--write-markdown") {
      args.writeMarkdown = true;
      continue;
    }

    const value = argv[index + 1];
    switch (token) {
      case "--asset-witness-report":
        args.assetWitnessReport = value;
        index += 1;
        break;
      case "--asset-artifact":
        args.assetArtifact = value;
        index += 1;
        break;
      case "--output-dir":
        args.outputDir = value;
        index += 1;
        break;
      case "--renderer-route-requested":
        args.rendererRouteRequested = value;
        index += 1;
        break;
      case "--renderer-route-effective":
        args.rendererRouteEffective = value;
        index += 1;
        break;
      case "--renderer-source-requested":
        args.rendererSourceRequested = value;
        index += 1;
        break;
      case "--renderer-source-effective":
        args.rendererSourceEffective = value;
        index += 1;
        break;
      case "--effective-compositor":
        args.effectiveCompositor = value;
        index += 1;
        break;
      case "--effective-projected-stream":
        args.effectiveProjectedStream = value;
        index += 1;
        break;
      case "--arena":
        args.arena = value;
        index += 1;
        break;
      case "--tile-size-px":
        args.tileSizePx = Number(value);
        index += 1;
        break;
      case "--max-refs-per-tile":
        args.maxRefsPerTile = Number(value);
        index += 1;
        break;
      default:
        throw new BridgeWitnessError(`Unknown argument: ${token}`, "argument_validation");
    }
  }

  for (const required of ["assetWitnessReport", "assetArtifact", "outputDir"]) {
    if (!args[required]) {
      throw new BridgeWitnessError(`Missing required argument: --${toKebab(required)}`, "argument_validation");
    }
  }

  return args;
};

const toKebab = (value) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new BridgeWitnessError(
      `Unable to read asset witness report JSON: ${error.message}`,
      "report_read",
      { producer_report_path: resolve(path) },
    );
  }
};

const computeReportHash = (report) => {
  const canonical = { ...report };
  delete canonical.report_hash;
  delete canonical.report_sha256;
  return sha256(`${JSON.stringify(canonical, null, 2)}\n`);
};

const validateReportHash = (report, producerReportHash) => {
  const expected = report.report_hash ?? report.report_sha256;
  if (expected && expected !== producerReportHash) {
    throw new BridgeWitnessError("Asset witness report hash mismatch", "report_hash_validation", {
      producer_report_hash: producerReportHash,
      expected_report_hash: expected,
    });
  }
};

const readArtifact = (path, producerReportHash) => {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    throw new BridgeWitnessError("Missing primary artifact", "artifact_preflight", {
      producer_report_hash: producerReportHash,
      asset_artifact_hash: null,
      asset_artifact_path: absolutePath,
    });
  }

  const stats = statSync(absolutePath);
  if (!stats.isFile() || stats.size === 0) {
    throw new BridgeWitnessError("Missing primary artifact content", "artifact_preflight", {
      producer_report_hash: producerReportHash,
      asset_artifact_hash: null,
      asset_artifact_path: absolutePath,
    });
  }

  const bytes = readFileSync(absolutePath);
  return {
    absolutePath,
    bytes,
    text: bytes.toString("utf8"),
    hash: sha256(bytes),
  };
};

const parseObjGeometry = (text) => {
  const vertices = [];
  let faceCount = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("v ")) {
      const coords = line
        .split(/\s+/)
        .slice(1, 4)
        .map(Number);
      if (coords.length !== 3 || coords.some((value) => !Number.isFinite(value))) {
        throw new BridgeWitnessError("Invalid OBJ vertex coordinates", "geometry_validation");
      }
      vertices.push(coords);
      continue;
    }

    if (line.startsWith("f ")) {
      const refs = line.split(/\s+/).slice(1);
      if (refs.length < 3) {
        throw new BridgeWitnessError("Invalid OBJ face", "geometry_validation");
      }
      faceCount += 1;
    }
  }

  if (vertices.length === 0 || faceCount === 0) {
    throw new BridgeWitnessError("Blank geometry: asset artifact has no vertices or faces", "geometry_validation");
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const vertex of vertices) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], vertex[axis]);
      max[axis] = Math.max(max[axis], vertex[axis]);
    }
  }

  return {
    vertexCount: vertices.length,
    faceCount,
    bounds: { min, max },
  };
};

const validateAssetHash = (report, artifact, producerReportHash) => {
  const expected = report.asset_artifact_hash ?? report.artifact_hash;
  if (!expected) {
    throw new BridgeWitnessError("Missing artifact hash in asset witness report", "hash_validation", {
      producer_report_hash: producerReportHash,
      asset_artifact_hash: artifact.hash,
    });
  }
  if (expected !== artifact.hash) {
    throw new BridgeWitnessError("Artifact hash mismatch", "hash_validation", {
      producer_report_hash: producerReportHash,
      asset_artifact_hash: artifact.hash,
      expected_asset_artifact_hash: expected,
    });
  }
};

const arraysEqual = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((value, index) => Object.is(value, right[index]));

const validateBounds = (expected, actual) =>
  expected &&
  arraysEqual(expected.min, actual.min) &&
  arraysEqual(expected.max, actual.max);

const validateGeometry = (report, geometry, evidence) => {
  if (report.vertex_count !== geometry.vertexCount || report.face_count !== geometry.faceCount) {
    throw new BridgeWitnessError("Geometry count mismatch", "geometry_validation", {
      ...evidence,
      report_vertex_count: report.vertex_count,
      report_face_count: report.face_count,
      artifact_vertex_count: geometry.vertexCount,
      artifact_face_count: geometry.faceCount,
    });
  }
  if (!validateBounds(report.bounds, geometry.bounds)) {
    throw new BridgeWitnessError("Geometry bounds mismatch", "geometry_validation", {
      ...evidence,
      report_bounds: report.bounds,
      artifact_bounds: geometry.bounds,
    });
  }
};

const validateProducerIdentity = (report, evidence) => {
  for (const field of [
    "producer_repo",
    "producer_topos",
    "producer_mode",
    "source_evidence_origin",
    "source_scope_limitations",
  ]) {
    if (!report[field] || (Array.isArray(report[field]) && report[field].length === 0)) {
      throw new BridgeWitnessError(`Missing producer/source identity field: ${field}`, "producer_identity_validation", evidence);
    }
  }

  if (report.producer_repo !== "trellis2udio") {
    throw new BridgeWitnessError("Unexpected producer repo for product bridge sidecar", "producer_identity_validation", {
      ...evidence,
      producer_repo: report.producer_repo,
    });
  }

  const mode = String(report.producer_mode);
  const origin = String(report.source_evidence_origin);
  const limitations = Array.isArray(report.source_scope_limitations)
    ? report.source_scope_limitations.join(" ")
    : String(report.source_scope_limitations);
  const modeIsFixture = mode.includes("fixture");
  const modeIsLive = mode.includes("live");
  const originIsFixture = origin.includes("fixture");
  const limitationsMentionFixture = limitations.includes("fixture");

  if (modeIsLive && (originIsFixture || limitationsMentionFixture)) {
    throw new BridgeWitnessError("Fixture/live mode confusion", "producer_identity_validation", {
      ...evidence,
      producer_mode: mode,
      source_evidence_origin: origin,
      source_scope_limitations: report.source_scope_limitations,
    });
  }

  if (modeIsFixture && !originIsFixture) {
    throw new BridgeWitnessError("Fixture/live mode confusion", "producer_identity_validation", {
      ...evidence,
      producer_mode: mode,
      source_evidence_origin: origin,
    });
  }

  if (!modeIsFixture && !modeIsLive) {
    throw new BridgeWitnessError("Unsupported producer mode", "producer_identity_validation", {
      ...evidence,
      producer_mode: mode,
    });
  }
};

const validateRouteIdentity = (args, evidence) => {
  const fields = [
    "rendererRouteRequested",
    "rendererRouteEffective",
    "rendererSourceRequested",
    "rendererSourceEffective",
    "effectiveCompositor",
    "effectiveProjectedStream",
    "arena",
  ];
  const missing = fields.filter((field) => !String(args[field] ?? "").trim());
  if (missing.length > 0 || !Number.isInteger(args.tileSizePx) || !Number.isInteger(args.maxRefsPerTile)) {
    throw new BridgeWitnessError("Missing route/source identity", "route_identity_validation", {
      ...evidence,
      missing_route_identity_fields: missing,
      tile_size_px: args.tileSizePx,
      max_refs_per_tile: args.maxRefsPerTile,
    });
  }
};

const rendererCommit = () => {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return "unknown";
  }
  return result.stdout.trim();
};

const buildWitness = ({ args, report, producerReportHash, artifact, geometry }) => {
  const assetFormat = report.asset_format ?? report.artifact_format ?? basename(artifact.absolutePath).split(".").pop();
  const assetEvidence = {
    producer_report_hash: producerReportHash,
    asset_artifact_hash: artifact.hash,
    geometry_verified: true,
    route_identity_verified: true,
  };

  return {
    schema_version: SCHEMA_VERSION,
    bridge_run_id: `${producerReportHash.slice(0, 12)}-${artifact.hash.slice(0, 12)}`,
    created_at: new Date().toISOString(),
    producer_repo: report.producer_repo,
    producer_topos: report.producer_topos,
    producer_mode: report.producer_mode,
    producer_report_path: resolve(args.assetWitnessReport),
    producer_report_hash: producerReportHash,
    asset_artifact_path: artifact.absolutePath,
    asset_artifact_hash: artifact.hash,
    asset_format: assetFormat,
    vertex_count: geometry.vertexCount,
    face_count: geometry.faceCount,
    bounds: geometry.bounds,
    source_evidence_origin: report.source_evidence_origin,
    source_scope_limitations: report.source_scope_limitations,
    consumer_repo: CONSUMER_REPO,
    consumer_bridge_slice: CONSUMER_BRIDGE_SLICE,
    renderer_repo_commit: rendererCommit(),
    renderer_route_requested: args.rendererRouteRequested,
    renderer_route_effective: args.rendererRouteEffective,
    renderer_source_requested: args.rendererSourceRequested,
    renderer_source_effective: args.rendererSourceEffective,
    effective_compositor: args.effectiveCompositor,
    effective_projected_stream: args.effectiveProjectedStream,
    arena: args.arena,
    tile_size_px: args.tileSizePx,
    max_refs_per_tile: args.maxRefsPerTile,
    alpha_density_route_status: "not_exercised",
    visual_claim_status: "no_visual_convergence_claim",
    failure_phase: null,
    last_trustworthy_evidence: assetEvidence,
  };
};

const failureWitness = (phase, evidence = {}, args = {}) => ({
  schema_version: SCHEMA_VERSION,
  bridge_run_id: `failed-${Date.now()}`,
  created_at: new Date().toISOString(),
  producer_repo: null,
  producer_topos: null,
  producer_mode: null,
  producer_report_path: args.assetWitnessReport ? resolve(args.assetWitnessReport) : null,
  producer_report_hash: evidence.producer_report_hash ?? null,
  asset_artifact_path: args.assetArtifact ? resolve(args.assetArtifact) : null,
  asset_artifact_hash: evidence.asset_artifact_hash ?? null,
  asset_format: null,
  vertex_count: null,
  face_count: null,
  bounds: null,
  source_evidence_origin: null,
  source_scope_limitations: [],
  consumer_repo: CONSUMER_REPO,
  consumer_bridge_slice: CONSUMER_BRIDGE_SLICE,
  renderer_repo_commit: rendererCommit(),
  renderer_route_requested: args.rendererRouteRequested ?? ROUTE_DEFAULTS.rendererRouteRequested,
  renderer_route_effective: args.rendererRouteEffective ?? ROUTE_DEFAULTS.rendererRouteEffective,
  renderer_source_requested: args.rendererSourceRequested ?? ROUTE_DEFAULTS.rendererSourceRequested,
  renderer_source_effective: args.rendererSourceEffective ?? ROUTE_DEFAULTS.rendererSourceEffective,
  effective_compositor: args.effectiveCompositor ?? ROUTE_DEFAULTS.effectiveCompositor,
  effective_projected_stream: args.effectiveProjectedStream ?? ROUTE_DEFAULTS.effectiveProjectedStream,
  arena: args.arena ?? ROUTE_DEFAULTS.arena,
  tile_size_px: args.tileSizePx ?? ROUTE_DEFAULTS.tileSizePx,
  max_refs_per_tile: args.maxRefsPerTile ?? ROUTE_DEFAULTS.maxRefsPerTile,
  alpha_density_route_status: "not_exercised",
  visual_claim_status: "no_visual_convergence_claim",
  failure_phase: phase,
  last_trustworthy_evidence: evidence,
});

const writeJson = (path, value, flag = "wx") => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag });
};

const writeMarkdown = (path, witness) => {
  const body = [
    "# MeshSplat Product Bridge Witness",
    "",
    `- schema_version: ${witness.schema_version}`,
    `- bridge_run_id: ${witness.bridge_run_id}`,
    `- producer_repo: ${witness.producer_repo}`,
    `- producer_mode: ${witness.producer_mode}`,
    `- asset_artifact_hash: ${witness.asset_artifact_hash}`,
    `- vertex_count: ${witness.vertex_count}`,
    `- face_count: ${witness.face_count}`,
    `- renderer_route_requested: ${witness.renderer_route_requested}`,
    `- renderer_route_effective: ${witness.renderer_route_effective}`,
    `- renderer_source_effective: ${witness.renderer_source_effective}`,
    `- alpha_density_route_status: ${witness.alpha_density_route_status}`,
    `- visual_claim_status: ${witness.visual_claim_status}`,
    `- failure_phase: ${witness.failure_phase}`,
    "",
  ].join("\n");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, { flag: "wx" });
};

const outputPaths = (outputDir) => {
  const absoluteOutputDir = resolve(outputDir);
  return {
    outputDir: absoluteOutputDir,
    primaryJson: resolve(absoluteOutputDir, PRIMARY_JSON),
    primaryMarkdown: resolve(absoluteOutputDir, PRIMARY_MD),
    failureJson: resolve(absoluteOutputDir, FAILURE_JSON),
  };
};

export const runProductBridgeWitness = (argv = process.argv.slice(2)) => {
  let args = {};
  let paths = null;

  try {
    args = parseArgs(argv);
    paths = outputPaths(args.outputDir);
    mkdirSync(paths.outputDir, { recursive: true });

    const preexisting = [];
    if (existsSync(paths.primaryJson)) {
      preexisting.push(paths.primaryJson);
    }
    if (args.writeMarkdown && existsSync(paths.primaryMarkdown)) {
      preexisting.push(paths.primaryMarkdown);
    }
    if (preexisting.length > 0) {
      const evidence = {
        preexisting_primary_output: preexisting.includes(paths.primaryJson),
        preexisting_markdown_output: preexisting.includes(paths.primaryMarkdown),
        preexisting_outputs: preexisting,
      };
      writeJson(paths.failureJson, failureWitness("output_preflight", evidence, args));
      throw new BridgeWitnessError("Preexisting output would make this sidecar stale", "output_preflight", evidence);
    }

    const report = readJson(args.assetWitnessReport);
    const producerReportHash = computeReportHash(report);
    validateReportHash(report, producerReportHash);

    const reportEvidence = { producer_report_hash: producerReportHash };
    validateProducerIdentity(report, reportEvidence);

    const artifact = readArtifact(args.assetArtifact, producerReportHash);
    validateAssetHash(report, artifact, producerReportHash);

    const geometry = parseObjGeometry(artifact.text);
    const artifactEvidence = {
      producer_report_hash: producerReportHash,
      asset_artifact_hash: artifact.hash,
    };
    validateGeometry(report, geometry, artifactEvidence);
    validateRouteIdentity(args, artifactEvidence);

    const witness = buildWitness({ args, report, producerReportHash, artifact, geometry });
    writeJson(paths.primaryJson, witness);
    if (args.writeMarkdown) {
      writeMarkdown(paths.primaryMarkdown, witness);
    }
    return { ok: true, witnessPath: paths.primaryJson, witness };
  } catch (error) {
    if (error instanceof BridgeWitnessError) {
      if (paths && error.phase !== "output_preflight" && !existsSync(paths.primaryJson)) {
        writeJson(paths.primaryJson, failureWitness(error.phase, error.evidence, args));
      }
      return { ok: false, error };
    }
    const wrapped = new BridgeWitnessError(error.message, "unhandled_failure");
    if (paths && !existsSync(paths.primaryJson)) {
      writeJson(paths.primaryJson, failureWitness(wrapped.phase, wrapped.evidence, args));
    }
    return { ok: false, error: wrapped };
  }
};

const main = () => {
  const result = runProductBridgeWitness();
  if (result.ok) {
    process.stdout.write(`${result.witnessPath}\n`);
    return;
  }
  process.stderr.write(`${result.error.message}\n`);
  process.exitCode = 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
