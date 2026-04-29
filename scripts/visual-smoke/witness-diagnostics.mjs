import {
  WITNESS_CONTRACT_INPUTS,
  WITNESS_FIELD_CANONICAL,
} from "../../src/rendererFidelityProbes/witnessCapture.js";
import { classifyAlphaDensityWitness } from "../../src/rendererFidelityProbes/alphaDensity.js";

export const WITNESS_OWNER = {
  fieldAutopsy: "field-autopsy",
  conicReckoner: "conic-reckoner",
  slabSentinel: "slab-sentinel",
  alphaLedger: "alpha-ledger",
  alphaDensity: "alpha-density",
  witnessScope: "witness-scope",
};

export const WITNESS_FAILURE_KIND = {
  fieldMetadataMismatch: "field-metadata-mismatch",
  projectionAnisotropy: "projection-anisotropy",
  nearPlaneSlab: "near-plane-slab",
  compositingAmbiguous: "compositing-ambiguous",
  alphaDensityOcclusion: "alpha-density-occlusion",
  noWitnessEvidence: "no-witness-evidence",
};

const ANISOTROPY_RATIO_SUSPECT = 8;
const SLAB_STATUS_KEYS = ["axis-crosses-near-plane", "pathological-footprint"];

export function classifyWitnessCapture({
  pageEvidence = {},
  imageAnalysis = {},
  smokeClassification = undefined,
} = {}) {
  const witness = pageEvidence.witness ?? pageEvidence.rendererFidelityWitness ?? {};
  const fieldMismatches = fieldMetadataMismatches(witness.field);
  const findings = [];

  if (fieldMismatches.length > 0) {
    findings.push({
      kind: WITNESS_FAILURE_KIND.fieldMetadataMismatch,
      owner: WITNESS_OWNER.fieldAutopsy,
      severity: "actionable",
      summary: `Field metadata does not match the field-autopsy contract: ${fieldMismatches.join(", ")}.`,
      evidence: { mismatches: fieldMismatches, field: witness.field ?? null },
    });
  }

  const slabFinding = classifySlabWitness(witness.slab, imageAnalysis);
  if (slabFinding) findings.push(slabFinding);

  const projectionFinding = classifyProjectionWitness(witness.projection, fieldMismatches.length > 0);
  if (projectionFinding) findings.push(projectionFinding);

  const alphaFinding = classifyAlphaWitness(witness.alpha);
  if (alphaFinding) findings.push(alphaFinding);

  const alphaDensityFinding = classifyAlphaDensitySmokeWitness(witness.alphaDensity);
  if (alphaDensityFinding) findings.push(alphaDensityFinding);

  if (findings.length === 0 && Object.keys(witness).length === 0) {
    findings.push({
      kind: WITNESS_FAILURE_KIND.noWitnessEvidence,
      owner: WITNESS_OWNER.witnessScope,
      severity: "missing",
      summary: "Capture did not expose window.__MESH_SPLAT_WITNESS__; only final-image smoke evidence is available.",
      evidence: {},
    });
  }

  return {
    consumedContracts: { ...WITNESS_CONTRACT_INPUTS },
    thresholdPolicy: "witness-only; does not alter visual smoke pass/fail thresholds",
    smokeClassification: smokeClassification ? { ...smokeClassification } : undefined,
    imageSummary: {
      nonblank: Boolean(imageAnalysis.nonblank),
      changedPixelRatio: finiteOrZero(imageAnalysis.changedPixelRatio),
    },
    findings,
  };
}

function fieldMetadataMismatches(field = {}) {
  if (!field || typeof field !== "object") {
    return [];
  }

  const mismatches = [];
  for (const [key, expected] of Object.entries(WITNESS_FIELD_CANONICAL)) {
    const actual = field[key];
    if (actual !== undefined && actual !== expected) {
      mismatches.push(`${key} expected ${expected}, saw ${actual}`);
    }
  }
  return mismatches;
}

function classifyProjectionWitness(projection = {}, blockedByField) {
  if (!projection || typeof projection !== "object") return null;

  const maxAnisotropyRatio = finiteOrZero(projection.maxAnisotropyRatio);
  const suspiciousSplatCount = finiteOrZero(projection.suspiciousSplatCount);
  const footprint = projection.footprint && typeof projection.footprint === "object" ? projection.footprint : {};
  const highEnergySplatCount = finiteOrZero(footprint.highEnergySplatCount);
  if (maxAnisotropyRatio < ANISOTROPY_RATIO_SUSPECT && suspiciousSplatCount <= 0 && highEnergySplatCount <= 0) {
    return null;
  }

  const footprintSummary = highEnergySplatCount > 0
    ? `; footprint witness found ${highEnergySplatCount} high-energy splats with max major radius ${formatNumber(finiteOrZero(footprint.maxMajorRadiusPx))} px`
    : "";
  return {
    kind: WITNESS_FAILURE_KIND.projectionAnisotropy,
    owner: WITNESS_OWNER.conicReckoner,
    severity: blockedByField ? "blocked" : "suspect",
    summary:
      `Projection anisotropy witness found ratio ${formatNumber(maxAnisotropyRatio)} ` +
      `across ${suspiciousSplatCount} splats${footprintSummary}; route to conic-reckoner after field metadata is canonical.`,
    evidence: {
      maxAnisotropyRatio,
      suspiciousSplatCount,
      sampleOriginalIds: normalizeIds(projection.sampleOriginalIds),
      footprint: {
        maxMajorRadiusPx: finiteOrZero(footprint.maxMajorRadiusPx),
        maxMinorRadiusPx: finiteOrZero(footprint.maxMinorRadiusPx),
        maxAreaPx: finiteOrZero(footprint.maxAreaPx),
        areaCapPx: finiteOrZero(footprint.areaCapPx),
        majorRadiusCapPx: finiteOrZero(footprint.majorRadiusCapPx),
        highEnergySplatCount,
        projectedSplatCount: finiteOrZero(footprint.projectedSplatCount),
        sampleOriginalIds: normalizeIds(footprint.sampleOriginalIds),
      },
    },
  };
}

function classifySlabWitness(slab = {}, imageAnalysis = {}) {
  if (!slab || typeof slab !== "object") return null;

  const statusCounts = slab.statusCounts && typeof slab.statusCounts === "object" ? slab.statusCounts : {};
  const slabStatusCount = SLAB_STATUS_KEYS.reduce((sum, key) => sum + finiteOrZero(statusCounts[key]), 0);
  const maxMajorRadiusPx = finiteOrZero(slab.maxMajorRadiusPx);
  const footprintCapPx = finiteOrZero(slab.footprintCapPx);
  const exceedsCap = footprintCapPx > 0 && maxMajorRadiusPx > footprintCapPx;
  if (slabStatusCount <= 0 && !exceedsCap) return null;

  return {
    kind: WITNESS_FAILURE_KIND.nearPlaneSlab,
    owner: WITNESS_OWNER.slabSentinel,
    severity: "actionable",
    summary:
      `Near-plane slab witness found ${slabStatusCount} near-plane/pathological splats` +
      (exceedsCap ? ` with max radius ${formatNumber(maxMajorRadiusPx)} px over cap ${formatNumber(footprintCapPx)} px.` : "."),
    evidence: {
      statusCounts: { ...statusCounts },
      maxMajorRadiusPx,
      footprintCapPx,
      changedPixelRatio: finiteOrZero(imageAnalysis.changedPixelRatio),
      sampleOriginalIds: normalizeIds(slab.sampleOriginalIds),
    },
  };
}

function classifyAlphaWitness(alpha = {}) {
  if (!alpha || typeof alpha !== "object") return null;
  const overlapDensity = alpha.overlapDensity && typeof alpha.overlapDensity === "object"
    ? alpha.overlapDensity
    : {};
  const hotTileCount = finiteOrZero(overlapDensity.hotTileCount);
  if (!alpha.ambiguousOverlapCount && hotTileCount <= 0) return null;

  return {
    kind: WITNESS_FAILURE_KIND.compositingAmbiguous,
    owner: WITNESS_OWNER.alphaLedger,
    severity: alpha.ambiguousOverlapCount ? "blocked" : "suspect",
    summary: alpha.ambiguousOverlapCount
      ? "Overlap witness is present, but alpha-ledger has not settled the compositing contract yet."
      : `Alpha density witness found ${hotTileCount} hot tiles with max mass ${formatNumber(finiteOrZero(overlapDensity.maxTileAlphaMass))}.`,
    evidence: {
      ...alpha,
      overlapDensity: {
        tileSizePx: finiteOrZero(overlapDensity.tileSizePx),
        alphaMassCap: finiteOrZero(overlapDensity.alphaMassCap),
        maxTileAlphaMass: finiteOrZero(overlapDensity.maxTileAlphaMass),
        maxTileSplatCount: finiteOrZero(overlapDensity.maxTileSplatCount),
        hotTileCount,
        sampleOriginalIds: normalizeIds(overlapDensity.sampleOriginalIds),
      },
    },
  };
}

function classifyAlphaDensitySmokeWitness(alphaDensity) {
  if (!alphaDensity || typeof alphaDensity !== "object" || Object.keys(alphaDensity).length === 0) return null;

  const classification = classifyAlphaDensityWitness(alphaDensity);
  if (classification.primaryCause === "alpha-density-not-dominant") return null;

  return {
    kind: WITNESS_FAILURE_KIND.alphaDensityOcclusion,
    owner: WITNESS_OWNER.alphaDensity,
    severity: classification.policy === "do-not-tune-alpha" ? "blocked" : "suspect",
    summary:
      `Alpha-density witness classified ${classification.primaryCause} with surface transmission ` +
      `${formatNumber(classification.surfaceTransmission)}; ${classification.policy}.`,
    evidence: {
      ...classification,
      surfaceLayerCount: finiteOrZero(alphaDensity.surfaceLayerCount),
      surfaceAlpha: finiteOrZero(alphaDensity.surfaceAlpha),
      projectedAreaRatio: finiteOrZero(alphaDensity.projectedAreaRatio),
      sortInversions: finiteOrZero(alphaDensity.sortInversions),
    },
  };
}

function normalizeIds(value) {
  return Array.isArray(value) ? value.filter(Number.isInteger) : [];
}

function finiteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
