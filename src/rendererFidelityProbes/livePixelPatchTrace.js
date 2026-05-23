const DEFAULT_DEFERRED_GUARDRAIL = Object.freeze({
  status: "loud-null",
  deferredSurface: null,
  surfaceKind: null,
  surfaceId: null,
  meshPrimitiveId: null,
  normal: null,
  albedo: null,
  roughness: null,
  metalness: null,
  materialClass: null,
  gbufferVoteWeight: null,
  normalConfidence: null,
  albedoConfidence: null,
  materialConfidence: null,
  missingReason: "production deferred G-buffer material/confidence fields are unavailable in this live optical trace",
});

const PATCH_ROLE_KEYS = Object.freeze({
  porousBodyHole: "porousBodyHole",
  plateRimEdge: "plateRimEdge",
  sealedNeighbor: "sealedNeighbors",
});

export function buildLivePixelPatchTraceEvidence({
  pageEvidence = {},
  url = "",
  viewport = {},
  branch,
  commit,
  image,
  sampledCanvasByAnchorId,
  cropPointers = [],
} = {}) {
  const readback = pageEvidence?.tileLocal?.compositorInputReadback;
  const anchors = Array.isArray(readback?.anchors) ? readback.anchors : [];
  if (readback?.status !== "present" || anchors.length === 0) {
    return undefined;
  }

  const routeIdentity = routeIdentityFromInputs({ pageEvidence, url, viewport, branch, commit, frameId: readback.frameId });
  const records = anchors.map((anchor) => patchRecordFromAnchor({
    anchor,
    pageEvidence,
    routeIdentity,
    image,
    sampledCanvasByAnchorId,
  }));
  const patchRoles = summarizePatchRoles(records);
  const redCheck = buildRedCheck({ records, patchRoles, cropPointers, routeIdentity });

  return {
    schemaVersion: 1,
    comparisonClass: "same-observation-live-pixel-patch",
    observationId: observationIdFromIdentity(routeIdentity),
    routeIdentity,
    patchRoles,
    redCheck,
    cropPointers: normalizeCropPointers(cropPointers),
    records,
  };
}

export function classifyLivePixelPatchTrace(trace = {}) {
  const records = Array.isArray(trace.records) ? trace.records : [];
  const redCheck = trace.redCheck && typeof trace.redCheck === "object" ? trace.redCheck : {};
  const blockedReasons = [];
  if (trace.comparisonClass !== "same-observation-live-pixel-patch") {
    blockedReasons.push("missing same-observation live patch comparison class");
  }
  if (!trace.observationId) {
    blockedReasons.push("missing observation id");
  }
  if (records.length < 3) {
    blockedReasons.push("patch has fewer than three anchor records");
  }
  if ((trace.patchRoles?.porousBodyHole ?? []).length === 0) {
    blockedReasons.push("missing porous-body hole anchor");
  }
  if ((trace.patchRoles?.plateRimEdge ?? []).length === 0) {
    blockedReasons.push("missing plate/rim edge anchor");
  }
  if ((trace.patchRoles?.sealedNeighbors ?? []).length === 0) {
    blockedReasons.push("missing matched sealed-neighbor anchor");
  }

  for (const record of records) {
    if (!record.routeIdentity || !record.tileAddress || !record.tileHeader || !record.presentationFreshness) {
      blockedReasons.push(`record ${record.id ?? "<unknown>"} missing route/tile/freshness fields`);
    }
    if (!record.deferredGuardrail || record.deferredGuardrail.status !== "loud-null") {
      blockedReasons.push(`record ${record.id ?? "<unknown>"} missing loud deferred guardrail fields`);
    }
    for (const contributor of record.contributors ?? []) {
      for (const field of [
        "splatIndex",
        "originalId",
        "centerPx",
        "inverseConic",
        "coverageWeight",
        "tileCoverageWeight",
        "pixelCoverageWeight",
        "sourceOpacity",
        "coverageAlpha",
        "transmittanceBefore",
        "transmittanceAfter",
        "sourceColor",
        "runningColor",
      ]) {
        if (contributor[field] === undefined) {
          blockedReasons.push(`record ${record.id ?? "<unknown>"} contributor missing ${field}`);
        }
      }
    }
  }

  if (blockedReasons.length > 0) {
    return {
      status: "trace-still-underinstrumented",
      severity: "blocked",
      summary: `Live pixel patch trace remains underinstrumented: ${blockedReasons.join("; ")}.`,
      blockedReasons,
      trace,
    };
  }

  return {
    status: redCheck.status ?? "live-pixel-trace-complete",
    severity: redCheck.status === "live-pixel-trace-complete" ? "pass" : "blocked",
    summary: redCheck.summary ?? "Live pixel patch trace has the required same-observation support, transfer, presentation, and deferred guardrail fields.",
    blockedReasons: [],
    trace,
  };
}

function patchRecordFromAnchor({ anchor, pageEvidence, routeIdentity, image, sampledCanvasByAnchorId }) {
  const id = stringValue(anchor.id);
  const pixel = normalizePixel(anchor.pixel);
  const tileAddress = normalizeTileAddress(anchor.tileAddress, routeIdentity);
  const sampledCanvasRgba8 = sampleCanvasRgba8({ id, pixel, routeIdentity, image, sampledCanvasByAnchorId });
  const outputTextureReadback = pageEvidence?.tileLocal?.outputTextureReadback;
  const outputTextureAnchor = Array.isArray(outputTextureReadback?.anchors)
    ? outputTextureReadback.anchors.find((candidate) => candidate?.id === id)
    : undefined;
  const freshness = pageEvidence?.tileLocal?.freshness && typeof pageEvidence.tileLocal.freshness === "object"
    ? pageEvidence.tileLocal.freshness
    : {};

  return {
    id,
    kind: stringValue(anchor.kind) || classifyAnchorKind(id),
    routeIdentity,
    pixel,
    tileAddress,
    tileHeader: {
      firstRefIndex: nonNegativeInteger(anchor.header?.firstRefIndex),
      retainedContributorCount: nonNegativeInteger(anchor.header?.refCount),
      projectedContributorCount: nonNegativeInteger(anchor.header?.projectedCount),
      droppedContributorCount: nonNegativeInteger(anchor.header?.droppedCount),
      gpuScatterCount: nonNegativeInteger(anchor.gpuScatterCount),
      tileCapacity: nonNegativeInteger(anchor.tileCapacity),
      refLimit: nonNegativeInteger(anchor.refLimit),
    },
    contributors: normalizeContributors(anchor.contributors),
    outputCanvas: {
      liveCompositorInputRgba: normalizeRgbaFloat(anchor.liveCompositorRgba),
      liveCompositorInputRgba8: normalizeRgba8(anchor.liveCompositorRgba8),
      sampledCanvasRgba8,
      outputTextureRgba: normalizeRgbaFloat(outputTextureAnchor?.outputTextureRgba),
      outputTextureRgba8: normalizeRgba8(outputTextureAnchor?.outputTextureRgba8),
      outputTextureFormat: stringValue(outputTextureReadback?.format) || null,
      outputTextureReadbackStatus: stringValue(outputTextureReadback?.status) || null,
      canvasFormat: stringValue(pageEvidence?.canvas?.format) || null,
      canvasAlphaMode: stringValue(pageEvidence?.canvas?.alphaMode) || null,
      canvasColorSpace: stringValue(pageEvidence?.canvas?.colorSpace) || null,
      copyPath: outputTextureReadback?.status === "present" ? "tile-local-output-texture-readback-to-canvas-sample" : "canvas-sample-only",
    },
    presentationFreshness: {
      frameId: routeIdentity.frameId,
      clearFrameId: finiteOrNull(freshness.clearFrameId),
      buildFrameId: finiteOrNull(freshness.buildFrameId),
      compositeFrameId: finiteOrNull(freshness.compositeFrameId),
      cacheState: stringValue(freshness.cacheState) || (pageEvidence?.tileLocalLastSkipReason ? "stale-cache" : "unknown"),
      skipReason: stringValue(pageEvidence?.tileLocalLastSkipReason) || null,
      tileLocalStatus: stringValue(pageEvidence?.tileLocalStatus) || stringValue(pageEvidence?.tileLocal?.status) || null,
      debugMode: stringValue(pageEvidence?.tileLocal?.debugMode) || null,
      orderingBackend: stringValue(pageEvidence?.tileLocal?.orderingBackend) || null,
    },
    deferredGuardrail: {
      ...DEFAULT_DEFERRED_GUARDRAIL,
    },
  };
}

function normalizeContributors(contributors) {
  if (!Array.isArray(contributors)) {
    return [];
  }
  return contributors.map((contributor, index) => ({
    layer: nonNegativeInteger(contributor.layer, index),
    refIndex: nonNegativeInteger(contributor.refIndex),
    splatIndex: nonNegativeInteger(contributor.splatIndex),
    originalId: nonNegativeInteger(contributor.originalId ?? contributor.splatIndex),
    alphaParamIndex: nonNegativeInteger(contributor.alphaParamIndex),
    centerPx: normalizePair(contributor.centerPx),
    inverseConic: normalizeTriple(contributor.inverseConic),
    coverageWeight: finiteNumber(contributor.coverageWeight ?? contributor.tileCoverageWeight, 0),
    tileCoverageWeight: finiteNumber(contributor.tileCoverageWeight ?? contributor.coverageWeight, 0),
    pixelCoverageWeight: finiteNumber(contributor.pixelCoverageWeight, 0),
    sourceOpacity: finiteNumber(contributor.sourceOpacity, 0),
    coverageAlpha: finiteNumber(contributor.coverageAlpha, 0),
    transmittanceBefore: finiteNumber(contributor.transmittanceBefore, 1),
    transmittanceAfter: finiteNumber(contributor.transmittanceAfter ?? contributor.remainingTransmission, 1),
    sourceColor: normalizeRgb(contributor.sourceColor),
    runningColor: normalizeRgb(contributor.runningColor),
    status: stringValue(contributor.status) || "unknown",
  }));
}

function buildRedCheck({ records, patchRoles, cropPointers, routeIdentity }) {
  const hole = firstRecord(records, patchRoles.porousBodyHole);
  const sealed = firstRecord(records, patchRoles.sealedNeighbors);
  const rim = firstRecord(records, patchRoles.plateRimEdge);
  if (!hole || !sealed || !rim) {
    return {
      status: "trace-still-underinstrumented",
      summary: "Patch trace lacks the hole/rim/sealed-neighbor triad required for mechanism routing.",
      context: { cropPointers: normalizeCropPointers(cropPointers), routeIdentity },
    };
  }

  const holeMaxPixelWeight = maxContributorField(hole, "pixelCoverageWeight");
  const sealedMaxPixelWeight = maxContributorField(sealed, "pixelCoverageWeight");
  const holeMaxTileWeight = maxContributorField(hole, "tileCoverageWeight");
  const sealedMaxTileWeight = maxContributorField(sealed, "tileCoverageWeight");
  const holeHasContributors = hole.contributors.length > 0 && hole.tileHeader.refLimit > 0;
  const sealedHasSupport = sealedMaxPixelWeight > 0.05 || sealedMaxTileWeight > 0.05;

  if (!holeHasContributors && sealedHasSupport) {
    return {
      status: "tile-center-admission-underfill",
      holeAnchorId: hole.id,
      matchedSealedNeighborId: sealed.id,
      rimAnchorId: rim.id,
      summary: `Hole ${hole.id} has no live contributors while sealed neighbor ${sealed.id} has support in the same observation.`,
      context: redCheckContext({ hole, sealed, rim, cropPointers, routeIdentity }),
    };
  }

  if (holeHasContributors && holeMaxTileWeight > 0.05 && holeMaxPixelWeight < 0.001 && sealedMaxPixelWeight > 0.05) {
    return {
      status: "screen-space-sampling-underfill",
      holeAnchorId: hole.id,
      matchedSealedNeighborId: sealed.id,
      rimAnchorId: rim.id,
      summary: `Hole ${hole.id} has admitted contributors and tile support, but pixel-center support ${round(holeMaxPixelWeight)} is far below sealed neighbor ${sealed.id} (${round(sealedMaxPixelWeight)}).`,
      context: redCheckContext({ hole, sealed, rim, cropPointers, routeIdentity }),
    };
  }

  if (holeHasContributors && holeMaxPixelWeight > 0.05 && maxContributorField(hole, "coverageAlpha") < 0.01) {
    return {
      status: "contributors-present-alpha-or-order-drop",
      holeAnchorId: hole.id,
      matchedSealedNeighborId: sealed.id,
      rimAnchorId: rim.id,
      summary: `Hole ${hole.id} has contributors and pixel support, but coverage alpha remains too small to explain sealing.`,
      context: redCheckContext({ hole, sealed, rim, cropPointers, routeIdentity }),
    };
  }

  if (holeHasContributors && rgbaDeltaMax(hole.outputCanvas.liveCompositorInputRgba8, hole.outputCanvas.sampledCanvasRgba8) > 3) {
    return {
      status: "presentation-drop-after-compositor",
      holeAnchorId: hole.id,
      matchedSealedNeighborId: sealed.id,
      rimAnchorId: rim.id,
      summary: `Hole ${hole.id} live compositor input differs from sampled canvas in the same observation.`,
      context: redCheckContext({ hole, sealed, rim, cropPointers, routeIdentity }),
    };
  }

  return {
    status: "live-pixel-trace-complete",
    holeAnchorId: hole.id,
    matchedSealedNeighborId: sealed.id,
    rimAnchorId: rim.id,
    summary: "Patch trace has live support, transfer, presentation, and canvas fields; no narrower blocker was classified by this red check.",
    context: redCheckContext({ hole, sealed, rim, cropPointers, routeIdentity }),
  };
}

function redCheckContext({ hole, sealed, rim, cropPointers, routeIdentity }) {
  return {
    routeIdentity,
    cropPointers: normalizeCropPointers(cropPointers),
    rows: [hole, sealed, rim].map((record) => ({
      id: record.id,
      kind: record.kind,
      pixel: record.pixel,
      tileAddress: record.tileAddress,
      tileHeader: record.tileHeader,
      maxTileCoverageWeight: round(maxContributorField(record, "tileCoverageWeight")),
      maxPixelCoverageWeight: round(maxContributorField(record, "pixelCoverageWeight")),
      maxCoverageAlpha: round(maxContributorField(record, "coverageAlpha")),
      liveCompositorInputRgba8: record.outputCanvas.liveCompositorInputRgba8,
      sampledCanvasRgba8: record.outputCanvas.sampledCanvasRgba8,
      cacheState: record.presentationFreshness.cacheState,
    })),
  };
}

function summarizePatchRoles(records) {
  const roles = {
    porousBodyHole: [],
    plateRimEdge: [],
    sealedNeighbors: [],
  };
  for (const record of records) {
    const role = roleForRecord(record);
    if (role === PATCH_ROLE_KEYS.porousBodyHole) roles.porousBodyHole.push(record.id);
    if (role === PATCH_ROLE_KEYS.plateRimEdge) roles.plateRimEdge.push(record.id);
    if (role === PATCH_ROLE_KEYS.sealedNeighbor) roles.sealedNeighbors.push(record.id);
  }
  return roles;
}

function roleForRecord(record) {
  const haystack = `${record.id} ${record.kind}`.toLowerCase();
  if (/(sealed|neighbor)/.test(haystack)) return PATCH_ROLE_KEYS.sealedNeighbor;
  if (/(rim|edge|plate)/.test(haystack)) return PATCH_ROLE_KEYS.plateRimEdge;
  if (/(hole|lacunar|porous)/.test(haystack)) return PATCH_ROLE_KEYS.porousBodyHole;
  return "";
}

function classifyAnchorKind(id) {
  const lower = id.toLowerCase();
  if (/(sealed|neighbor)/.test(lower)) return "sealed-neighbor";
  if (/(rim|edge|plate)/.test(lower)) return "plate-rim-edge";
  if (/(hole|lacunar|porous)/.test(lower)) return "porous-body-hole";
  return "unclassified-patch-anchor";
}

function routeIdentityFromInputs({ pageEvidence, url, viewport, branch, commit, frameId }) {
  const params = safeUrlSearchParams(url);
  const canvas = pageEvidence?.canvas && typeof pageEvidence.canvas === "object" ? pageEvidence.canvas : {};
  const budget = pageEvidence?.tileLocal?.budget && typeof pageEvidence.tileLocal.budget === "object"
    ? pageEvidence.tileLocal.budget
    : {};
  const requestedRenderer = params.get("renderer") || pageEvidence?.requestedRenderer || null;
  const requestedArenaBackend = params.get("arenaBackend") || pageEvidence?.arenaRuntime?.requestedArenaBackend || null;
  const width = finiteNumber(viewport.width ?? canvas.clientWidth ?? canvas.width, null);
  const height = finiteNumber(viewport.height ?? canvas.clientHeight ?? canvas.height, null);
  const canvasWidth = finiteNumber(canvas.width, width);
  const canvasHeight = finiteNumber(canvas.height, height);
  return {
    branch: stringValue(branch) || null,
    commit: stringValue(commit) || null,
    url,
    asset: params.get("asset") || pageEvidence?.assetPath || null,
    witnessView: params.get("witnessView") || params.get("view") || pageEvidence?.witnessView || null,
    viewport: {
      width,
      height,
    },
    backingScale: {
      x: width ? canvasWidth / width : null,
      y: height ? canvasHeight / height : null,
    },
    requestedRenderer,
    effectiveRenderer: stringValue(pageEvidence?.rendererLabel) || null,
    requestedArenaBackend,
    effectiveArenaBackend: stringValue(pageEvidence?.arenaRuntime?.effectiveArenaBackend) || null,
    tileSizePx: finiteNumber(params.get("tileSizePx"), finiteNumber(budget.tileSizePx, null)),
    maxRefsPerTile: finiteNumber(params.get("maxRefsPerTile"), finiteNumber(budget.maxRefsPerTile, finiteNumber(pageEvidence?.tileLocal?.visibleCompositedRefLimit, null))),
    frameId: finiteNumber(frameId, null),
  };
}

function sampleCanvasRgba8({ id, pixel, routeIdentity, image, sampledCanvasByAnchorId }) {
  const explicit = lookupSample(sampledCanvasByAnchorId, id);
  if (explicit.length === 4) return explicit;
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || !image.rgba) {
    return [];
  }
  const sx = finiteNumber(routeIdentity.backingScale?.x, 1) || 1;
  const sy = finiteNumber(routeIdentity.backingScale?.y, 1) || 1;
  const x = clampInteger(Math.floor((pixel.x + 0.5) * sx), 0, image.width - 1);
  const y = clampInteger(Math.floor((pixel.y + 0.5) * sy), 0, image.height - 1);
  const offset = (y * image.width + x) * 4;
  return [
    image.rgba[offset] ?? 0,
    image.rgba[offset + 1] ?? 0,
    image.rgba[offset + 2] ?? 0,
    image.rgba[offset + 3] ?? 255,
  ];
}

function lookupSample(samples, id) {
  if (samples instanceof Map) {
    return normalizeRgba8(samples.get(id));
  }
  if (samples && typeof samples === "object") {
    return normalizeRgba8(samples[id]);
  }
  return [];
}

function normalizeTileAddress(address, routeIdentity) {
  const tileX = nonNegativeInteger(address?.tileX);
  const tileY = nonNegativeInteger(address?.tileY);
  const tileIndex = nonNegativeInteger(address?.tileIndex);
  const tileColumns = Math.max(1, Math.ceil((routeIdentity.viewport?.width ?? 0) / Math.max(1, routeIdentity.tileSizePx ?? 1)));
  const tileRows = Math.max(1, Math.ceil((routeIdentity.viewport?.height ?? 0) / Math.max(1, routeIdentity.tileSizePx ?? 1)));
  return {
    tileX,
    tileY,
    tileIndex,
    localX: nonNegativeInteger(address?.localX),
    localY: nonNegativeInteger(address?.localY),
    neighborTileIndices: neighborTileIndices({ tileX, tileY, tileColumns, tileRows }),
  };
}

function neighborTileIndices({ tileX, tileY, tileColumns, tileRows }) {
  const indices = [];
  for (let y = Math.max(0, tileY - 1); y <= Math.min(tileRows - 1, tileY + 1); y += 1) {
    for (let x = Math.max(0, tileX - 1); x <= Math.min(tileColumns - 1, tileX + 1); x += 1) {
      indices.push(y * tileColumns + x);
    }
  }
  return indices;
}

function firstRecord(records, ids) {
  const idSet = new Set(ids ?? []);
  return records.find((record) => idSet.has(record.id)) ?? null;
}

function maxContributorField(record, field) {
  return (record.contributors ?? []).reduce((max, contributor) => Math.max(max, finiteNumber(contributor[field], 0)), 0);
}

function normalizeCropPointers(cropPointers) {
  return Array.isArray(cropPointers)
    ? cropPointers.map((pointer) => ({
        id: stringValue(pointer?.id) || null,
        path: stringValue(pointer?.path) || null,
        anchors: Array.isArray(pointer?.anchors) ? pointer.anchors.map(stringValue).filter(Boolean) : [],
      }))
    : [];
}

function observationIdFromIdentity(identity) {
  return [
    identity.branch,
    identity.commit,
    identity.asset,
    identity.witnessView,
    identity.viewport?.width && identity.viewport?.height ? `${identity.viewport.width}x${identity.viewport.height}` : null,
    identity.requestedRenderer,
    identity.effectiveArenaBackend,
    identity.tileSizePx ? `tile${identity.tileSizePx}` : null,
    identity.maxRefsPerTile ? `cap${identity.maxRefsPerTile}` : null,
    identity.frameId !== null ? `frame${identity.frameId}` : null,
  ].filter(Boolean).join("|");
}

function safeUrlSearchParams(url) {
  try {
    return new URL(url).searchParams;
  } catch {
    return new URLSearchParams("");
  }
}

function normalizePixel(pixel) {
  return {
    x: nonNegativeInteger(pixel?.x),
    y: nonNegativeInteger(pixel?.y),
  };
}

function normalizePair(value) {
  return Array.isArray(value) && value.length >= 2 ? [finiteNumber(value[0], 0), finiteNumber(value[1], 0)] : [0, 0];
}

function normalizeTriple(value) {
  return Array.isArray(value) && value.length >= 3
    ? [finiteNumber(value[0], 0), finiteNumber(value[1], 0), finiteNumber(value[2], 0)]
    : [0, 0, 0];
}

function normalizeRgb(value) {
  return Array.isArray(value) && value.length >= 3
    ? [round(finiteNumber(value[0], 0)), round(finiteNumber(value[1], 0)), round(finiteNumber(value[2], 0))]
    : [0, 0, 0];
}

function normalizeRgbaFloat(value) {
  return Array.isArray(value) && value.length >= 4
    ? [round(finiteNumber(value[0], 0)), round(finiteNumber(value[1], 0)), round(finiteNumber(value[2], 0)), round(finiteNumber(value[3], 0))]
    : [];
}

function normalizeRgba8(value) {
  return Array.isArray(value) && value.length >= 4
    ? [
        clampInteger(Math.round(finiteNumber(value[0], 0)), 0, 255),
        clampInteger(Math.round(finiteNumber(value[1], 0)), 0, 255),
        clampInteger(Math.round(finiteNumber(value[2], 0)), 0, 255),
        clampInteger(Math.round(finiteNumber(value[3], 255)), 0, 255),
      ]
    : [];
}

function rgbaDeltaMax(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length < 4 || right.length < 4) {
    return 0;
  }
  return Math.max(...[0, 1, 2, 3].map((index) => Math.abs(left[index] - right[index])));
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampInteger(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function round(value) {
  return Math.round(finiteNumber(value, 0) * 1_000_000) / 1_000_000;
}
