import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyWitnessCapture,
  WITNESS_FAILURE_KIND,
  WITNESS_OWNER,
} from "../../scripts/visual-smoke/witness-diagnostics.mjs";

test("witness diagnostics route dessert-style anisotropy away from field decode when field metadata is canonical", () => {
  const result = classifyWitnessCapture({
    pageEvidence: {
      sourceKind: "scaniverse-ply",
      splatCount: 94406,
      assetPath: "smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      witness: {
        field: {
          scaleSpace: "log",
          rotationOrder: "wxyz",
          opacitySpace: "unit",
          colorSpace: "sh_dc_rgb",
        },
        projection: {
          maxAnisotropyRatio: 17.5,
          suspiciousSplatCount: 34,
          sampleOriginalIds: [804, 1205, 1209],
          footprint: {
            maxMajorRadiusPx: 913,
            maxMinorRadiusPx: 42,
            maxAreaPx: 120531,
            areaCapPx: 9216,
            majorRadiusCapPx: 468,
            highEnergySplatCount: 11,
            projectedSplatCount: 94406,
            sampleOriginalIds: [804, 1205],
          },
        },
      },
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.19 },
  });

  assert.deepEqual(result.consumedContracts, {
    fieldAutopsy: "66b4ea26e5d81ac614f4452b8d21308c4e432e1a",
    slabSentinel: "ca96409",
    conicReckoner: "f9e3498c00d44f2bb70eba1013f11c2f39b1aff1",
    alphaLedger: "0474666",
  });
  assert.equal(result.findings[0].kind, WITNESS_FAILURE_KIND.projectionAnisotropy);
  assert.equal(result.findings[0].owner, WITNESS_OWNER.conicReckoner);
  assert.equal(result.findings[0].severity, "suspect");
  assert.match(result.findings[0].summary, /anisotropy/i);
  assert.match(result.findings[0].summary, /footprint/i);
  assert.equal(result.findings[0].evidence.footprint.highEnergySplatCount, 11);
  assert.equal(result.findings.some((finding) => finding.owner === WITNESS_OWNER.fieldAutopsy), false);
});

test("witness diagnostics route Oakland foreground slabs to slab-sentinel without weakening visual smoke", () => {
  const result = classifyWitnessCapture({
    pageEvidence: {
      sourceKind: "scaniverse-ply",
      splatCount: 760641,
      assetPath: "/smoke-assets/oakland-pl-3/oakland-pl-3.json",
      witness: {
        field: {
          scaleSpace: "log",
          rotationOrder: "wxyz",
          opacitySpace: "unit",
          colorSpace: "sh_dc_rgb",
        },
        slab: {
          statusCounts: {
            "axis-crosses-near-plane": 12,
            "pathological-footprint": 5,
            accepted: 1924,
          },
          maxMajorRadiusPx: 300000,
          footprintCapPx: 468,
          sampleOriginalIds: [18, 47, 91],
        },
      },
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.86 },
    smokeClassification: {
      nonblank: true,
      realSplatEvidence: true,
      closeable: true,
      harnessPassed: true,
    },
  });

  assert.equal(result.findings[0].kind, WITNESS_FAILURE_KIND.nearPlaneSlab);
  assert.equal(result.findings[0].owner, WITNESS_OWNER.slabSentinel);
  assert.equal(result.findings[0].severity, "actionable");
  assert.match(result.findings[0].summary, /near-plane/i);
  assert.equal(result.smokeClassification.harnessPassed, true);
  assert.equal(result.thresholdPolicy, "witness-only; does not alter visual smoke pass/fail thresholds");
});

test("witness diagnostics flag field decode before routing projection symptoms", () => {
  const result = classifyWitnessCapture({
    pageEvidence: {
      sourceKind: "scaniverse-ply",
      splatCount: 128,
      witness: {
        field: {
          scaleSpace: "linear",
          rotationOrder: "xyzw",
          opacitySpace: "logit",
          colorSpace: "raw_dc",
        },
        projection: {
          maxAnisotropyRatio: 24,
          suspiciousSplatCount: 4,
        },
      },
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.12 },
  });

  assert.equal(result.findings[0].kind, WITNESS_FAILURE_KIND.fieldMetadataMismatch);
  assert.equal(result.findings[0].owner, WITNESS_OWNER.fieldAutopsy);
  assert.equal(result.findings[0].severity, "actionable");
  assert.equal(result.findings[1].kind, WITNESS_FAILURE_KIND.projectionAnisotropy);
  assert.equal(result.findings[1].severity, "blocked");
});

test("witness diagnostics route local alpha density to alpha-ledger", () => {
  const result = classifyWitnessCapture({
    pageEvidence: {
      sourceKind: "scaniverse-ply",
      splatCount: 94406,
      witness: {
        field: {
          scaleSpace: "log",
          rotationOrder: "wxyz",
          opacitySpace: "unit",
          colorSpace: "sh_dc_rgb",
        },
        alpha: {
          alphaEnergyPolicy: "bounded-footprint-energy-cap",
          compositing: "straight-source-over",
          ambiguousOverlapCount: 0,
          overlapDensity: {
            tileSizePx: 48,
            alphaMassCap: 1728,
            maxTileAlphaMass: 3400,
            maxTileSplatCount: 17,
            hotTileCount: 3,
            sampleOriginalIds: [20, 21, 22],
          },
        },
      },
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.18 },
  });

  assert.equal(result.findings[0].kind, WITNESS_FAILURE_KIND.compositingAmbiguous);
  assert.equal(result.findings[0].owner, WITNESS_OWNER.alphaLedger);
  assert.equal(result.findings[0].severity, "suspect");
  assert.match(result.findings[0].summary, /alpha density/i);
  assert.equal(result.findings[0].evidence.overlapDensity.hotTileCount, 3);
});

test("canonical renderer witness produces no diagnostic findings", () => {
  const result = classifyWitnessCapture({
    pageEvidence: {
      sourceKind: "real_scaniverse_ply",
      splatCount: 94406,
      witness: {
        field: {
          scaleSpace: "log",
          rotationOrder: "wxyz",
          opacitySpace: "unit",
          colorSpace: "sh_dc_rgb",
        },
        projection: {
          projectionMode: "jacobian-covariance",
          maxAnisotropyRatio: 0,
          suspiciousSplatCount: 0,
          sampleOriginalIds: [0, 1, 2],
        },
        slab: {
          statusCounts: {
            "axis-crosses-near-plane": 0,
            "pathological-footprint": 0,
            accepted: 94406,
          },
          maxMajorRadiusPx: 0,
          footprintCapPx: 468,
          sampleOriginalIds: [0, 1, 2],
        },
        alpha: {
          alphaEnergyPolicy: "bounded-footprint-energy-cap",
          ambiguousOverlapCount: 0,
        },
      },
    },
    imageAnalysis: { nonblank: true, changedPixelRatio: 0.18 },
  });

  assert.deepEqual(result.findings, []);
});
