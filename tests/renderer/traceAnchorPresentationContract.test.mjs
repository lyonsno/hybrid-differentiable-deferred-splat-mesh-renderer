import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("trace anchors are passive diagnostics, not compact-source presentation selectors", async () => {
  const source = await readFile(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /const TILE_LOCAL_PRESENTATION_SCOPE = selectedTileLocalPresentationScope\(\);/,
    "main.ts must define an explicit presentation scope before compact-source construction",
  );
  assert.match(
    source,
    /readonly traceAnchors: readonly PixelTraceAnchor\[\];/,
    "CPU compact-source reference construction must keep trace anchors typed for diagnostics/readback",
  );
  assert.match(
    source,
    /readonly presentationScope: TileLocalPresentationScope;/,
    "CPU compact-source reference construction must keep an explicit presentation scope",
  );
  assert.doesNotMatch(
    source,
    /anchors:\s*TILE_LOCAL_PRESENTATION_ANCHORS \?\? \[\]/,
    "compact-source construction must not use presentation anchors as the default source selector",
  );
  assert.match(
    source,
    /presentationScope === "anchor-neighborhood"/,
    "anchor-scoped CPU reference presentation must be opt-in diagnostic behavior",
  );
  assert.doesNotMatch(
    source,
    /anchorTileIndexes:\s*traceAnchorTileIndexes/,
    "streaming retained-source selection must not collapse the rendered patch to trace-anchor tiles",
  );
  assert.match(
    source,
    /traceAnchorTileIndexes:\s*traceAnchorTileIndexes/,
    "streaming retained-source construction must receive trace-anchor tiles separately for trace evidence",
  );
  assert.match(
    source,
    /const sourceTileIndexes = anchorTileIndexes \?\?/,
    "streaming retained-source construction must name source-selection tiles separately from trace tiles",
  );
  assert.match(
    source,
    /const traceTileIndexes = traceAnchorTileIndexes \?\? sourceTileIndexes/,
    "streaming retained-source construction must default trace tiles to source tiles only when no separate trace scope is provided",
  );
  assert.doesNotMatch(
    source,
    /for \(const tileIndex of anchorTiles\)/,
    "anchor-neighborhood candidate selection must not multiply every splat by every selected tile",
  );
  assert.doesNotMatch(
    source,
    /for \(const tileIndex of onlyTileIndexes\)/,
    "anchor-neighborhood streaming must not multiply every splat by every selected presentation tile",
  );
  assert.match(
    source,
    /const selectedTileRows = onlyTileIndexes \? compactSourceSelectedTileRows/,
    "anchor-neighborhood streaming must index selected tiles by row before iterating",
  );
  assert.match(
    source,
    /presentationAnchors:\s*TILE_LOCAL_PRESENTATION_ANCHORS/,
    "runtime evidence must preserve the presentation/source-selection anchors separately",
  );
  assert.match(
    source,
    /traceAnchors:\s*TILE_LOCAL_TRACE_ANCHORS/,
    "trace anchors must remain available for readback and per-pixel traces",
  );
});
