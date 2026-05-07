import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_TILE_LOCAL_BUDGET_CONFIG,
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

test("tile-local budget config rejects partial or invalid sweep pairs", () => {
  assert.throws(
    () => resolveTileLocalBudgetConfig("?tileSizePx=16"),
    /tileSizePx and maxRefsPerTile must be provided together/
  );
  assert.throws(
    () => resolveTileLocalBudgetConfig("?tileSizePx=0&maxRefsPerTile=128"),
    /tileSizePx must be a positive integer/
  );
  assert.throws(
    () => resolveTileLocalBudgetConfig("?tileSizePx=16&maxRefsPerTile=12.5"),
    /maxRefsPerTile must be a positive integer/
  );
});

test("main consumes query-controlled tile-local budget config", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(source, /resolveTileLocalBudgetConfig/);
  assert.match(source, /TILE_LOCAL_BUDGET_CONFIG\.tileSizePx/);
  assert.match(source, /TILE_LOCAL_BUDGET_CONFIG\.maxRefsPerTile/);
  assert.doesNotMatch(source, /const TILE_LOCAL_PROVISIONAL_TILE_SIZE_PX = 6;/);
});
