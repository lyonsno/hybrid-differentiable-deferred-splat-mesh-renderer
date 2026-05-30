import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_TILE_LOCAL_BUDGET_CONFIG,
  classifyCompactSourceConstructionBudget,
  classifyTileLocalProjectedRefGuard,
  resolveTileLocalBudgetConfig,
} from "../../src/tileLocalBudgetConfig.js";

test("tile-local budget config keeps the landed 6px/32-ref default", () => {
  assert.deepEqual(resolveTileLocalBudgetConfig(""), DEFAULT_TILE_LOCAL_BUDGET_CONFIG);
  assert.deepEqual(DEFAULT_TILE_LOCAL_BUDGET_CONFIG, {
    tileSizePx: 6,
    maxRefsPerTile: 32,
  });
});

test("tile-local budget config parses coupled query params without a lower artificial ceiling", () => {
  assert.deepEqual(
    resolveTileLocalBudgetConfig("?renderer=tile-local-visible&tileSizePx=32&maxRefsPerTile=512"),
    {
      tileSizePx: 32,
      maxRefsPerTile: 512,
    }
  );
});

test("tile-local budget config falls back visibly instead of crashing on partial or invalid sweep pairs", () => {
  assert.deepEqual(resolveTileLocalBudgetConfig("?tileSizePx=16"), {
    ...DEFAULT_TILE_LOCAL_BUDGET_CONFIG,
    invalidReason: "tileSizePx and maxRefsPerTile must be provided together",
  });
  assert.deepEqual(resolveTileLocalBudgetConfig("?tileSizePx=0&maxRefsPerTile=128"), {
    ...DEFAULT_TILE_LOCAL_BUDGET_CONFIG,
    invalidReason: "tileSizePx must be a positive integer",
  });
  assert.deepEqual(resolveTileLocalBudgetConfig("?tileSizePx=16&maxRefsPerTile=12.5"), {
    ...DEFAULT_TILE_LOCAL_BUDGET_CONFIG,
    invalidReason: "maxRefsPerTile must be a positive integer",
  });
});

test("main consumes query-controlled tile-local budget config", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /resolveTileLocalBudgetConfig/);
  assert.match(source, /TILE_LOCAL_BUDGET_CONFIG\.tileSizePx/);
  assert.match(source, /TILE_LOCAL_BUDGET_CONFIG\.maxRefsPerTile/);
  assert.match(source, /TILE_LOCAL_BUDGET_CONFIG\.invalidReason/);
  assert.doesNotMatch(source, /const TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX = 6;/);
});

test("projected-ref guard classifies exact-route retained handoff by finite capacity", () => {
  const verdict = classifyTileLocalProjectedRefGuard({
    requestedArenaBackend: "gpu",
    projectedRefs: 20_000_001,
    maxProjectedRefs: 20_000_000,
    viewportWidth: 3456,
    viewportHeight: 1916,
    tileSizePx: 16,
    maxRefsPerTile: 256,
  });

  assert.equal(verdict.classification, "guard-misapplied-to-retained-handoff");
  assert.equal(verdict.guardedQuantity, "dense-projected-tile-refs");
  assert.equal(verdict.handoffQuantity, "per-tile-retained-ref-capacity");
  assert.equal(verdict.tileColumns, 216);
  assert.equal(verdict.tileRows, 120);
  assert.equal(verdict.tileCount, 25_920);
  assert.equal(verdict.retainedBudgetRefs, 6_635_520);
  assert.equal(verdict.retainedBudgetWithinProjectedLimit, true);
  assert.equal(verdict.projectedRefs, 20_000_001);
  assert.equal(verdict.maxProjectedRefs, 20_000_000);
  assert.equal(`${verdict.projectedRefs} > ${verdict.maxProjectedRefs}`, "20000001 > 20000000");
  assert.equal(verdict.raisesCap, false);
});

test("compact source construction classifies full-scene overflow as a bounded presentation source", () => {
  const verdict = classifyCompactSourceConstructionBudget({
    projectedRefs: 20_000_001,
    maxProjectedRefs: 20_000_000,
    retainedBudgetRefs: 6_635_520,
    presentationScope: "full-scene",
    forceAnchorOnly: false,
    allowAnchorOnlyBudgetFallback: false,
    anchorTileCount: 0,
    maxTilesPerSplat: 9,
  });

  assert.equal(verdict.classification, "compact-source-full-scene-bounded-overflow");
  assert.equal(verdict.projectedOverflow, true);
  assert.equal(verdict.retainedBudgetWithinProjectedLimit, true);
  assert.equal(verdict.shouldRestrictToAnchorTiles, false);
  assert.equal(verdict.shouldBoundSplatTileFootprints, true);
  assert.equal(verdict.maxTilesPerSplat, 9);
  assert.equal(verdict.shouldThrowProjectedRefBudgetError, false);
  assert.match(verdict.diagnostic, /bounded presentation source/i);
});

test("compact source construction keeps already-bounded full-scene overflow as a blocker", () => {
  const verdict = classifyCompactSourceConstructionBudget({
    projectedRefs: 20_000_001,
    maxProjectedRefs: 20_000_000,
    retainedBudgetRefs: 6_635_520,
    presentationScope: "full-scene",
    forceAnchorOnly: false,
    allowAnchorOnlyBudgetFallback: false,
    anchorTileCount: 0,
  });

  assert.equal(verdict.classification, "compact-source-full-scene-overflow");
  assert.equal(verdict.shouldBoundSplatTileFootprints, false);
  assert.equal(verdict.shouldThrowProjectedRefBudgetError, true);
  assert.match(verdict.diagnostic, /would walk dense projected tile refs/i);
});

test("main classifies the post-bound compact source estimate as hard budget evidence", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const streamingStart = source.indexOf("function buildStreamingCompactRetainedSourceForRuntime");
  const streamingEnd = source.indexOf("function buildCompactSourceConstructionEvidence");

  assert.ok(streamingStart >= 0, "streaming compact source builder should exist");
  assert.ok(streamingEnd > streamingStart, "streaming compact source builder slice should be bounded");

  const streamingSource = source.slice(streamingStart, streamingEnd);
  const estimateStart = streamingSource.indexOf("estimateCompactProjectedTileRefCount");
  const classifyStart = streamingSource.indexOf("classifyCompactSourceConstructionBudget", estimateStart);

  assert.ok(estimateStart >= 0, "streaming builder should estimate compact projected tile refs");
  assert.ok(classifyStart > estimateStart, "streaming builder should classify the already-bounded estimate");
  assert.match(
    streamingSource.slice(estimateStart, classifyStart),
    /maxTilesPerSplat/,
    "the projected-ref estimate should apply maxTilesPerSplat before classification",
  );
  assert.doesNotMatch(
    streamingSource.slice(classifyStart, streamingSource.indexOf("});", classifyStart)),
    /maxTilesPerSplat/,
    "the classifier should not reclassify an already-bounded overflow as bounded-safe",
  );
});

test("compact source construction keeps anchor-bounded overflow on the retained diagnostic route", () => {
  const verdict = classifyCompactSourceConstructionBudget({
    projectedRefs: 20_000_001,
    maxProjectedRefs: 20_000_000,
    retainedBudgetRefs: 6_635_520,
    presentationScope: "anchor-neighborhood",
    forceAnchorOnly: false,
    allowAnchorOnlyBudgetFallback: true,
    anchorTileCount: 24,
  });

  assert.equal(verdict.classification, "compact-source-anchor-bounded-overflow");
  assert.equal(verdict.shouldRestrictToAnchorTiles, true);
  assert.equal(verdict.shouldThrowProjectedRefBudgetError, false);
  assert.equal(verdict.projectedRefBudgetOverflow?.mode, "diagnostic-retained-handoff");
});
