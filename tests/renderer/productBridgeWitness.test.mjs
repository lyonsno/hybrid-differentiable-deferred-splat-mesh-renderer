import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const TOOL = new URL("../../scripts/meshsplat-product-bridge-witness.mjs", import.meta.url);

const TINY_OBJ = [
  "v 0 0 0",
  "v 1 0 0",
  "v 0 1 0",
  "v 1 1 0",
  "f 1 2 3",
  "f 2 4 3",
  "",
].join("\n");

const EMPTY_OBJ = "# deliberately empty geometry\n";

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

const reportHash = (report) => {
  const canonical = { ...report };
  delete canonical.report_hash;
  delete canonical.report_sha256;
  return sha256(`${JSON.stringify(canonical, null, 2)}\n`);
};

const makeTempDir = () => mkdtempSync(join(tmpdir(), "meshsplat-product-bridge-"));

const writeAssetFixture = (dir, contents = TINY_OBJ) => {
  const artifactPath = join(dir, "trellis2udio-fixture-tiny.obj");
  writeFileSync(artifactPath, contents);
  return artifactPath;
};

const writeWitnessReport = (dir, artifactPath, overrides = {}) => {
  const artifactContents = existsSync(artifactPath) ? readFileSync(artifactPath, "utf8") : TINY_OBJ;
  const report = {
    schema_version: "trellis2udio.asset_witness.v1",
    producer_repo: "trellis2udio",
    producer_topos: "trellis2udio-asset-witness-bonekiln",
    producer_mode: "fixture_tiny",
    asset_format: "obj",
    asset_artifact_hash: sha256(artifactContents),
    vertex_count: 4,
    face_count: 2,
    bounds: {
      min: [0, 0, 0],
      max: [1, 1, 0],
    },
    source_evidence_origin: "fixture_constructed",
    source_scope_limitations: [
      "fixture_tiny_geometry",
      "no_visual_convergence_claim",
      "no_trellis_quality_claim",
    ],
    ...overrides,
  };
  report.report_hash = reportHash(report);

  const reportPath = join(dir, "trellis2udio-asset-witness.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
};

const runBridge = (args, options = {}) =>
  spawnSync(process.execPath, [TOOL.pathname, ...args], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    ...options,
  });

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("product bridge sidecar writes route/source identity for a valid asset witness", () => {
  const dir = makeTempDir();
  const outputDir = join(dir, "bridge-output");
  const artifactPath = writeAssetFixture(dir);
  const reportPath = writeWitnessReport(dir, artifactPath);

  const result = runBridge([
    "--asset-witness-report",
    reportPath,
    "--asset-artifact",
    artifactPath,
    "--output-dir",
    outputDir,
    "--write-markdown",
  ]);

  assert.equal(result.status, 0, result.stderr);

  const witness = readJson(join(outputDir, "meshsplat-product-bridge-witness.json"));
  assert.equal(witness.schema_version, "meshsplat.product_bridge_witness.v1");
  assert.equal(witness.producer_repo, "trellis2udio");
  assert.equal(witness.producer_topos, "trellis2udio-asset-witness-bonekiln");
  assert.equal(witness.producer_mode, "fixture_tiny");
  assert.equal(witness.producer_report_hash, reportHash(readJson(reportPath)));
  assert.equal(witness.asset_artifact_hash, sha256(TINY_OBJ));
  assert.equal(witness.asset_format, "obj");
  assert.equal(witness.vertex_count, 4);
  assert.equal(witness.face_count, 2);
  assert.deepEqual(witness.bounds, { min: [0, 0, 0], max: [1, 1, 0] });
  assert.equal(witness.source_evidence_origin, "fixture_constructed");
  assert.equal(witness.consumer_repo, "hybrid-differentiable-defferred-splat-mesh-renderer");
  assert.equal(witness.consumer_bridge_slice, "product-bridge-route-identity-sidecar-0609");
  assert.equal(witness.renderer_route_requested, "tile-local-visible");
  assert.equal(witness.renderer_route_effective, "tile-local-visible-gaussian-compositor");
  assert.equal(
    witness.renderer_source_effective,
    "wgsl-projected-ref-stream-source-frontier->tile-local-visible-gaussian-compositor",
  );
  assert.equal(witness.effective_projected_stream, "wgsl-projected-ref-stream-source-frontier");
  assert.equal(witness.arena, "gpu");
  assert.equal(witness.tile_size_px, 16);
  assert.equal(witness.max_refs_per_tile, 256);
  assert.equal(witness.alpha_density_route_status, "not_exercised");
  assert.equal(witness.visual_claim_status, "no_visual_convergence_claim");
  assert.equal(witness.failure_phase, null);
  assert.deepEqual(witness.last_trustworthy_evidence, {
    producer_report_hash: witness.producer_report_hash,
    asset_artifact_hash: witness.asset_artifact_hash,
    geometry_verified: true,
    route_identity_verified: true,
  });
  assert.ok(existsSync(join(outputDir, "meshsplat-product-bridge-witness.md")));
});

test("product bridge sidecar fails loud for a missing primary artifact and still writes a failure report", () => {
  const dir = makeTempDir();
  const outputDir = join(dir, "bridge-output");
  const missingArtifact = join(dir, "missing.obj");
  const reportPath = writeWitnessReport(dir, missingArtifact);

  const result = runBridge([
    "--asset-witness-report",
    reportPath,
    "--asset-artifact",
    missingArtifact,
    "--output-dir",
    outputDir,
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing primary artifact/i);

  const witness = readJson(join(outputDir, "meshsplat-product-bridge-witness.json"));
  assert.equal(witness.failure_phase, "artifact_preflight");
  assert.equal(witness.last_trustworthy_evidence.producer_report_hash, reportHash(readJson(reportPath)));
  assert.equal(witness.last_trustworthy_evidence.asset_artifact_hash, null);
});

test("product bridge sidecar refuses stale preexisting output without overwriting it", () => {
  const dir = makeTempDir();
  const outputDir = join(dir, "bridge-output");
  const artifactPath = writeAssetFixture(dir);
  const reportPath = writeWitnessReport(dir, artifactPath);

  mkdirSync(outputDir);
  writeFileSync(join(outputDir, "meshsplat-product-bridge-witness.json"), "{\"stale\":true}\n", { flag: "wx" });

  const result = runBridge([
    "--asset-witness-report",
    reportPath,
    "--asset-artifact",
    artifactPath,
    "--output-dir",
    outputDir,
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /preexisting output/i);
  assert.deepEqual(readJson(join(outputDir, "meshsplat-product-bridge-witness.json")), { stale: true });

  const failure = readJson(join(outputDir, "meshsplat-product-bridge-witness.failure.json"));
  assert.equal(failure.failure_phase, "output_preflight");
  assert.equal(failure.last_trustworthy_evidence.preexisting_primary_output, true);
});

test("product bridge sidecar rejects hash mismatches and blank geometry", () => {
  const hashDir = makeTempDir();
  const hashOutputDir = join(hashDir, "bridge-output");
  const artifactPath = writeAssetFixture(hashDir);
  const reportPath = writeWitnessReport(hashDir, artifactPath, {
    asset_artifact_hash: sha256("not the asset"),
  });

  const hashResult = runBridge([
    "--asset-witness-report",
    reportPath,
    "--asset-artifact",
    artifactPath,
    "--output-dir",
    hashOutputDir,
  ]);

  assert.notEqual(hashResult.status, 0);
  assert.match(hashResult.stderr, /hash mismatch/i);
  assert.equal(readJson(join(hashOutputDir, "meshsplat-product-bridge-witness.json")).failure_phase, "hash_validation");

  const blankDir = makeTempDir();
  const blankOutputDir = join(blankDir, "bridge-output");
  const blankArtifactPath = writeAssetFixture(blankDir, EMPTY_OBJ);
  const blankReportPath = writeWitnessReport(blankDir, blankArtifactPath, {
    vertex_count: 0,
    face_count: 0,
    bounds: { min: [0, 0, 0], max: [0, 0, 0] },
  });

  const blankResult = runBridge([
    "--asset-witness-report",
    blankReportPath,
    "--asset-artifact",
    blankArtifactPath,
    "--output-dir",
    blankOutputDir,
  ]);

  assert.notEqual(blankResult.status, 0);
  assert.match(blankResult.stderr, /blank geometry/i);
  assert.equal(readJson(join(blankOutputDir, "meshsplat-product-bridge-witness.json")).failure_phase, "geometry_validation");
});

test("product bridge sidecar rejects fixture/live confusion and missing route identity", () => {
  const modeDir = makeTempDir();
  const modeOutputDir = join(modeDir, "bridge-output");
  const artifactPath = writeAssetFixture(modeDir);
  const reportPath = writeWitnessReport(modeDir, artifactPath, {
    producer_mode: "live_micro_smoke",
    source_evidence_origin: "fixture_constructed",
  });

  const modeResult = runBridge([
    "--asset-witness-report",
    reportPath,
    "--asset-artifact",
    artifactPath,
    "--output-dir",
    modeOutputDir,
  ]);

  assert.notEqual(modeResult.status, 0);
  assert.match(modeResult.stderr, /fixture\/live mode confusion/i);
  assert.equal(readJson(join(modeOutputDir, "meshsplat-product-bridge-witness.json")).failure_phase, "producer_identity_validation");

  const routeDir = makeTempDir();
  const routeOutputDir = join(routeDir, "bridge-output");
  const routeArtifactPath = writeAssetFixture(routeDir);
  const routeReportPath = writeWitnessReport(routeDir, routeArtifactPath);
  const routeResult = runBridge([
    "--asset-witness-report",
    routeReportPath,
    "--asset-artifact",
    routeArtifactPath,
    "--output-dir",
    routeOutputDir,
    "--renderer-route-requested",
    "",
  ]);

  assert.notEqual(routeResult.status, 0);
  assert.match(routeResult.stderr, /missing route\/source identity/i);
  assert.equal(readJson(join(routeOutputDir, "meshsplat-product-bridge-witness.json")).failure_phase, "route_identity_validation");
});
