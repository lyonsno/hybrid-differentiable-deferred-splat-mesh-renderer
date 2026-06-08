# Operator Witness Loop Report

- Status: PASS
- Generated: 2026-06-08T01:52:53.865Z
- Base URL: http://127.0.0.1:6177/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier
- Contact sheet: `operator-witness-contact-sheet.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Inspect whole-render-first operator visual evidence before choosing the next renderer repair.
- Expected visual delta: none expected from this harness-only slice
- Evidence surface: operator witness loop report, contact sheet, per-frame screenshots, and route identity JSON


## Witness Set

- Capture count: 5
- Operator visual captures: 3
- Filmstrip captures: 2
- Witness views: default, dessert-close, dessert-porous-close
- Renderers: tile-local-visible
- Arena backends: gpu
- Tile budgets: 16px/256 refs

## Timing

- Total loop ms: 54796
- Total capture ms: 52821
- Slowest capture: porous-close-orbit-right (15914ms)
- Slowest stage: dessert-close-final-color/settle-before-interaction (5002ms)
- Slowest operator readiness: porous-close-final-color/view-readiness (3022ms)
- Slowest app frame stage: whole-render-final-color/tile-local-scene-state-refresh (608.5ms, frame 3)
- Slowest app frame total: whole-render-final-color (611.3ms, frame 3)
- Source-frontier pack slowest substage: porous-close-orbit-left/wgsl-source-frontier-pack/stream-projected-tile-refs (1364.4ms, frame 58)
- Source-frontier pack counts: capture=porous-close-orbit-left frame=58 buckets=1890 projectedRefs=642413 streamSplats=76480 streamDenseRows=218535 streamSparseRows=0 streamTileCandidates=642413 streamCoverageRejects=0 streamPositiveCoverage=642413 coverageRetains=517354 retentionRetains=379740 occlusionRetains=389496 materializationSkips=89099 candidateRecords=417077 coverageRecords=340087 retentionRecords=193666 occlusionRecords=193666 supportSampleEvaluations=2956976 supportSampleCandidateSkips=368503 supportSampleCandidateSkippedEvaluations=5896048 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733938 supportSampleRetains=914243 supportSampleRecords=235302 supportSampleGroups=30240
- Operator readiness vs app frame stage: operator-readiness-exceeds-app-frame-stage (3022ms readiness vs 608.5ms app-frame stage; gap 2413.5ms)
- Operator readiness vs app frame total: operator-readiness-exceeds-app-frame-total (3022ms readiness vs 14.6ms app-frame total; gap 3007.4ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Operator readiness vs observed poll frame total: operator-readiness-exceeds-app-frame-total (3022ms readiness vs 2858.1ms app-frame total; gap 163.9ms; readiness capture porous-close-final-color, app-frame capture porous-close-final-color)
- Initial readiness diagnostics: ready=true source=compact-readiness polls=5 failed=4 elapsed=1762ms slowestPoll=802ms@3 observedFrame=2 observedFrameTotal=4.2ms observedFrameSlowestStage=evidence-exposure:3.9ms observedSourceFrontierPackSubstage=not reported observedSourceFrontierPackCounts=not reported slowestPollObservedFrame=not reported slowestPollObservedFrameTotal=not reportedms slowestPollObservedFrameSlowestStage=not reported slowestPollSourceFrontierPackSubstage=not reported slowestPollSourceFrontierPackCounts=not reported blockers=none lastFailed=visual-smoke-not-ready

- whole-render-final-color: 5739ms (apply-view:1ms, view-readiness:613ms, settle-before-interaction:5001ms, collect-settled-evidence:10ms, screenshot:25ms, image-analysis:74ms, trace-canvas-parity:14ms, classify-smoke:1ms, witness-diagnostics:0ms)
- dessert-close-final-color: 7259ms (apply-view:1ms, view-readiness:2115ms, settle-before-interaction:5002ms, collect-settled-evidence:8ms, screenshot:47ms, image-analysis:73ms, trace-canvas-parity:13ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-final-color: 8202ms (apply-view:1ms, view-readiness:3022ms, settle-before-interaction:5002ms, collect-settled-evidence:8ms, screenshot:71ms, image-analysis:83ms, trace-canvas-parity:15ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-left: 15707ms (apply-view:1ms, view-readiness:2579ms, settle-before-interaction:5002ms, interactions:2ms, interaction-readiness:2927ms, settle-after-interaction:5002ms, collect-settled-evidence:10ms, screenshot:87ms, image-analysis:83ms, trace-canvas-parity:14ms, classify-smoke:0ms, witness-diagnostics:0ms)
- porous-close-orbit-right: 15914ms (apply-view:1ms, view-readiness:2945ms, settle-before-interaction:5000ms, interactions:2ms, interaction-readiness:2789ms, settle-after-interaction:5002ms, collect-settled-evidence:3ms, screenshot:77ms, image-analysis:81ms, trace-canvas-parity:14ms, classify-smoke:0ms, witness-diagnostics:0ms)

## Captures

### Whole render final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6177/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier&renderer=tile-local-visible
- Screenshot: `whole-render-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 37590
- Witness view: default
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 40593 / 921600 (4.405%)
- Total capture ms: 5739
- Readiness diagnostics: ready=true source=compact-readiness polls=1 failed=0 elapsed=613ms slowestPoll=613ms@1 observedFrame=3 observedFrameTotal=611.3ms observedFrameSlowestStage=tile-local-scene-state-refresh:608.5ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (399.7ms, frame 3) observedSourceFrontierPackCounts=frame=3 buckets=177 projectedRefs=503235 streamSplats=94406 streamDenseRows=207614 streamSparseRows=0 streamTileCandidates=503235 streamCoverageRejects=0 streamPositiveCoverage=503235 coverageRetains=121098 retentionRetains=73269 occlusionRetains=75978 materializationSkips=300998 candidateRecords=60093 coverageRecords=37590 retentionRecords=19796 occlusionRecords=19796 supportSampleEvaluations=2265776 supportSampleCandidateSkips=60626 supportSampleCandidateSkippedEvaluations=970016 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=1203717 supportSampleRetains=105787 supportSampleRecords=20798 supportSampleGroups=2832 slowestPollObservedFrame=3 slowestPollObservedFrameTotal=611.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:608.5ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (399.7ms, frame 3) slowestPollSourceFrontierPackCounts=frame=3 buckets=177 projectedRefs=503235 streamSplats=94406 streamDenseRows=207614 streamSparseRows=0 streamTileCandidates=503235 streamCoverageRejects=0 streamPositiveCoverage=503235 coverageRetains=121098 retentionRetains=73269 occlusionRetains=75978 materializationSkips=300998 candidateRecords=60093 coverageRecords=37590 retentionRecords=19796 occlusionRecords=19796 supportSampleEvaluations=2265776 supportSampleCandidateSkips=60626 supportSampleCandidateSkippedEvaluations=970016 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=1203717 supportSampleRetains=105787 supportSampleRecords=20798 supportSampleGroups=2832 blockers=none lastFailed=none
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=613ms slowestPoll=613ms@1 observedFrame=3 observedFrameTotal=611.3ms observedFrameSlowestStage=tile-local-scene-state-refresh:608.5ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (399.7ms, frame 3) observedSourceFrontierPackCounts=frame=3 buckets=177 projectedRefs=503235 streamSplats=94406 streamDenseRows=207614 streamSparseRows=0 streamTileCandidates=503235 streamCoverageRejects=0 streamPositiveCoverage=503235 coverageRetains=121098 retentionRetains=73269 occlusionRetains=75978 materializationSkips=300998 candidateRecords=60093 coverageRecords=37590 retentionRecords=19796 occlusionRecords=19796 supportSampleEvaluations=2265776 supportSampleCandidateSkips=60626 supportSampleCandidateSkippedEvaluations=970016 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=1203717 supportSampleRetains=105787 supportSampleRecords=20798 supportSampleGroups=2832 slowestPollObservedFrame=3 slowestPollObservedFrameTotal=611.3ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:608.5ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (399.7ms, frame 3) slowestPollSourceFrontierPackCounts=frame=3 buckets=177 projectedRefs=503235 streamSplats=94406 streamDenseRows=207614 streamSparseRows=0 streamTileCandidates=503235 streamCoverageRejects=0 streamPositiveCoverage=503235 coverageRetains=121098 retentionRetains=73269 occlusionRetains=75978 materializationSkips=300998 candidateRecords=60093 coverageRecords=37590 retentionRecords=19796 occlusionRecords=19796 supportSampleEvaluations=2265776 supportSampleCandidateSkips=60626 supportSampleCandidateSkippedEvaluations=970016 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=1203717 supportSampleRetains=105787 supportSampleRecords=20798 supportSampleGroups=2832 blockers=none lastFailed=none}

### Dessert close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6177/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier&renderer=tile-local-visible
- Screenshot: `dessert-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 157547
- Witness view: dessert-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 206477 / 921600 (22.404%)
- Total capture ms: 7259
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2114ms slowestPoll=1904ms@3 observedFrame=24 observedFrameTotal=1949.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:1823.7ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1106.9ms, frame 24) observedSourceFrontierPackCounts=frame=24 buckets=861 projectedRefs=724912 streamSplats=94406 streamDenseRows=254646 streamSparseRows=0 streamTileCandidates=724912 streamCoverageRejects=0 streamPositiveCoverage=724912 coverageRetains=363555 retentionRetains=239008 occlusionRetains=241668 materializationSkips=286113 candidateRecords=230145 coverageRecords=157547 retentionRecords=84160 occlusionRecords=84160 supportSampleEvaluations=2879696 supportSampleCandidateSkips=258818 supportSampleCandidateSkippedEvaluations=4141088 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2388741 supportSampleRetains=464630 supportSampleRecords=100737 supportSampleGroups=13776 slowestPollObservedFrame=24 slowestPollObservedFrameTotal=1949.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:1823.7ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1106.9ms, frame 24) slowestPollSourceFrontierPackCounts=frame=24 buckets=861 projectedRefs=724912 streamSplats=94406 streamDenseRows=254646 streamSparseRows=0 streamTileCandidates=724912 streamCoverageRejects=0 streamPositiveCoverage=724912 coverageRetains=363555 retentionRetains=239008 occlusionRetains=241668 materializationSkips=286113 candidateRecords=230145 coverageRecords=157547 retentionRecords=84160 occlusionRecords=84160 supportSampleEvaluations=2879696 supportSampleCandidateSkips=258818 supportSampleCandidateSkippedEvaluations=4141088 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2388741 supportSampleRetains=464630 supportSampleRecords=100737 supportSampleGroups=13776 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2114ms slowestPoll=1904ms@3 observedFrame=24 observedFrameTotal=1949.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:1823.7ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1106.9ms, frame 24) observedSourceFrontierPackCounts=frame=24 buckets=861 projectedRefs=724912 streamSplats=94406 streamDenseRows=254646 streamSparseRows=0 streamTileCandidates=724912 streamCoverageRejects=0 streamPositiveCoverage=724912 coverageRetains=363555 retentionRetains=239008 occlusionRetains=241668 materializationSkips=286113 candidateRecords=230145 coverageRecords=157547 retentionRecords=84160 occlusionRecords=84160 supportSampleEvaluations=2879696 supportSampleCandidateSkips=258818 supportSampleCandidateSkippedEvaluations=4141088 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2388741 supportSampleRetains=464630 supportSampleRecords=100737 supportSampleGroups=13776 slowestPollObservedFrame=24 slowestPollObservedFrameTotal=1949.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:1823.7ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1106.9ms, frame 24) slowestPollSourceFrontierPackCounts=frame=24 buckets=861 projectedRefs=724912 streamSplats=94406 streamDenseRows=254646 streamSparseRows=0 streamTileCandidates=724912 streamCoverageRejects=0 streamPositiveCoverage=724912 coverageRetains=363555 retentionRetains=239008 occlusionRetains=241668 materializationSkips=286113 candidateRecords=230145 coverageRecords=157547 retentionRecords=84160 occlusionRecords=84160 supportSampleEvaluations=2879696 supportSampleCandidateSkips=258818 supportSampleCandidateSkippedEvaluations=4141088 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2388741 supportSampleRetains=464630 supportSampleRecords=100737 supportSampleGroups=13776 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close final color

- Evidence role: operator-visual
- URL: http://127.0.0.1:6177/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier&renderer=tile-local-visible
- Screenshot: `porous-close-final-color.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 320071
- Witness view: dessert-porous-close
- Interaction count: 0
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921234 / 921600 (99.960%)
- Total capture ms: 8202
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=3022ms slowestPoll=2809ms@3 observedFrame=46 observedFrameTotal=2858.1ms observedFrameSlowestStage=tile-local-scene-state-refresh:2689.5ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1309.4ms, frame 46) observedSourceFrontierPackCounts=frame=46 buckets=1787 projectedRefs=664755 streamSplats=79708 streamDenseRows=226687 streamSparseRows=0 streamTileCandidates=664755 streamCoverageRejects=0 streamPositiveCoverage=664755 coverageRetains=509887 retentionRetains=370834 occlusionRetains=377020 materializationSkips=112455 candidateRecords=400084 coverageRecords=320071 retentionRecords=181163 occlusionRecords=181163 supportSampleEvaluations=3012032 supportSampleCandidateSkips=364048 supportSampleCandidateSkippedEvaluations=5824768 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2759727 supportSampleRetains=890167 supportSampleRecords=223155 supportSampleGroups=28592 slowestPollObservedFrame=46 slowestPollObservedFrameTotal=2858.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2689.5ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1309.4ms, frame 46) slowestPollSourceFrontierPackCounts=frame=46 buckets=1787 projectedRefs=664755 streamSplats=79708 streamDenseRows=226687 streamSparseRows=0 streamTileCandidates=664755 streamCoverageRejects=0 streamPositiveCoverage=664755 coverageRetains=509887 retentionRetains=370834 occlusionRetains=377020 materializationSkips=112455 candidateRecords=400084 coverageRecords=320071 retentionRecords=181163 occlusionRecords=181163 supportSampleEvaluations=3012032 supportSampleCandidateSkips=364048 supportSampleCandidateSkippedEvaluations=5824768 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2759727 supportSampleRetains=890167 supportSampleRecords=223155 supportSampleGroups=28592 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=3022ms slowestPoll=2809ms@3 observedFrame=46 observedFrameTotal=2858.1ms observedFrameSlowestStage=tile-local-scene-state-refresh:2689.5ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1309.4ms, frame 46) observedSourceFrontierPackCounts=frame=46 buckets=1787 projectedRefs=664755 streamSplats=79708 streamDenseRows=226687 streamSparseRows=0 streamTileCandidates=664755 streamCoverageRejects=0 streamPositiveCoverage=664755 coverageRetains=509887 retentionRetains=370834 occlusionRetains=377020 materializationSkips=112455 candidateRecords=400084 coverageRecords=320071 retentionRecords=181163 occlusionRecords=181163 supportSampleEvaluations=3012032 supportSampleCandidateSkips=364048 supportSampleCandidateSkippedEvaluations=5824768 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2759727 supportSampleRetains=890167 supportSampleRecords=223155 supportSampleGroups=28592 slowestPollObservedFrame=46 slowestPollObservedFrameTotal=2858.1ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2689.5ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1309.4ms, frame 46) slowestPollSourceFrontierPackCounts=frame=46 buckets=1787 projectedRefs=664755 streamSplats=79708 streamDenseRows=226687 streamSparseRows=0 streamTileCandidates=664755 streamCoverageRejects=0 streamPositiveCoverage=664755 coverageRetains=509887 retentionRetains=370834 occlusionRetains=377020 materializationSkips=112455 candidateRecords=400084 coverageRecords=320071 retentionRecords=181163 occlusionRecords=181163 supportSampleEvaluations=3012032 supportSampleCandidateSkips=364048 supportSampleCandidateSkippedEvaluations=5824768 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2759727 supportSampleRetains=890167 supportSampleRecords=223155 supportSampleGroups=28592 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame left

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:6177/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-left.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 340087
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921330 / 921600 (99.971%)
- Total capture ms: 15707
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2927ms slowestPoll=2675ms@3 observedFrame=58 observedFrameTotal=2761.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:2598ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1364.4ms, frame 58) observedSourceFrontierPackCounts=frame=58 buckets=1890 projectedRefs=642413 streamSplats=76480 streamDenseRows=218535 streamSparseRows=0 streamTileCandidates=642413 streamCoverageRejects=0 streamPositiveCoverage=642413 coverageRetains=517354 retentionRetains=379740 occlusionRetains=389496 materializationSkips=89099 candidateRecords=417077 coverageRecords=340087 retentionRecords=193666 occlusionRecords=193666 supportSampleEvaluations=2956976 supportSampleCandidateSkips=368503 supportSampleCandidateSkippedEvaluations=5896048 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733938 supportSampleRetains=914243 supportSampleRecords=235302 supportSampleGroups=30240 slowestPollObservedFrame=58 slowestPollObservedFrameTotal=2761.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2598ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1364.4ms, frame 58) slowestPollSourceFrontierPackCounts=frame=58 buckets=1890 projectedRefs=642413 streamSplats=76480 streamDenseRows=218535 streamSparseRows=0 streamTileCandidates=642413 streamCoverageRejects=0 streamPositiveCoverage=642413 coverageRetains=517354 retentionRetains=379740 occlusionRetains=389496 materializationSkips=89099 candidateRecords=417077 coverageRecords=340087 retentionRecords=193666 occlusionRecords=193666 supportSampleEvaluations=2956976 supportSampleCandidateSkips=368503 supportSampleCandidateSkippedEvaluations=5896048 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733938 supportSampleRetains=914243 supportSampleRecords=235302 supportSampleGroups=30240 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=1 failed=0 elapsed=2579ms slowestPoll=2579ms@1 observedFrame=48 observedFrameTotal=2576.8ms observedFrameSlowestStage=tile-local-scene-state-refresh:2559.8ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1300.3ms, frame 48) observedSourceFrontierPackCounts=frame=48 buckets=1787 projectedRefs=664755 streamSplats=79708 streamDenseRows=226687 streamSparseRows=0 streamTileCandidates=664755 streamCoverageRejects=0 streamPositiveCoverage=664755 coverageRetains=509887 retentionRetains=370834 occlusionRetains=377020 materializationSkips=112455 candidateRecords=400084 coverageRecords=320071 retentionRecords=181163 occlusionRecords=181163 supportSampleEvaluations=3012032 supportSampleCandidateSkips=364048 supportSampleCandidateSkippedEvaluations=5824768 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2759727 supportSampleRetains=890167 supportSampleRecords=223155 supportSampleGroups=28592 slowestPollObservedFrame=48 slowestPollObservedFrameTotal=2576.8ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2559.8ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1300.3ms, frame 48) slowestPollSourceFrontierPackCounts=frame=48 buckets=1787 projectedRefs=664755 streamSplats=79708 streamDenseRows=226687 streamSparseRows=0 streamTileCandidates=664755 streamCoverageRejects=0 streamPositiveCoverage=664755 coverageRetains=509887 retentionRetains=370834 occlusionRetains=377020 materializationSkips=112455 candidateRecords=400084 coverageRecords=320071 retentionRecords=181163 occlusionRecords=181163 supportSampleEvaluations=3012032 supportSampleCandidateSkips=364048 supportSampleCandidateSkippedEvaluations=5824768 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2759727 supportSampleRetains=890167 supportSampleRecords=223155 supportSampleGroups=28592 blockers=none lastFailed=none} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2927ms slowestPoll=2675ms@3 observedFrame=58 observedFrameTotal=2761.2ms observedFrameSlowestStage=tile-local-scene-state-refresh:2598ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1364.4ms, frame 58) observedSourceFrontierPackCounts=frame=58 buckets=1890 projectedRefs=642413 streamSplats=76480 streamDenseRows=218535 streamSparseRows=0 streamTileCandidates=642413 streamCoverageRejects=0 streamPositiveCoverage=642413 coverageRetains=517354 retentionRetains=379740 occlusionRetains=389496 materializationSkips=89099 candidateRecords=417077 coverageRecords=340087 retentionRecords=193666 occlusionRecords=193666 supportSampleEvaluations=2956976 supportSampleCandidateSkips=368503 supportSampleCandidateSkippedEvaluations=5896048 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733938 supportSampleRetains=914243 supportSampleRecords=235302 supportSampleGroups=30240 slowestPollObservedFrame=58 slowestPollObservedFrameTotal=2761.2ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2598ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1364.4ms, frame 58) slowestPollSourceFrontierPackCounts=frame=58 buckets=1890 projectedRefs=642413 streamSplats=76480 streamDenseRows=218535 streamSparseRows=0 streamTileCandidates=642413 streamCoverageRejects=0 streamPositiveCoverage=642413 coverageRetains=517354 retentionRetains=379740 occlusionRetains=389496 materializationSkips=89099 candidateRecords=417077 coverageRecords=340087 retentionRecords=193666 occlusionRecords=193666 supportSampleEvaluations=2956976 supportSampleCandidateSkips=368503 supportSampleCandidateSkippedEvaluations=5896048 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733938 supportSampleRetains=914243 supportSampleRecords=235302 supportSampleGroups=30240 blockers=none lastFailed=visual-smoke-not-ready}

### Porous close orbit frame right

- Evidence role: operator-filmstrip
- URL: http://127.0.0.1:6177/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=source-frontier&renderer=tile-local-visible
- Screenshot: `porous-close-orbit-right.png`
- Renderer label: tile-local-visible-gaussian-compositor
- Tile refs: 302509
- Witness view: dessert-porous-close
- Interaction count: 1
- Nonblank: true
- Real splat evidence: true
- Changed pixels: 921120 / 921600 (99.948%)
- Total capture ms: 15914
- Readiness diagnostics: ready=true source=compact-readiness polls=3 failed=2 elapsed=2789ms slowestPoll=2542ms@3 observedFrame=82 observedFrameTotal=2622.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:2471.3ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1244ms, frame 82) observedSourceFrontierPackCounts=frame=82 buckets=1699 projectedRefs=666381 streamSplats=79770 streamDenseRows=227222 streamSparseRows=0 streamTileCandidates=666381 streamCoverageRejects=0 streamPositiveCoverage=666381 coverageRetains=495725 retentionRetains=359296 occlusionRetains=363625 materializationSkips=125208 candidateRecords=383864 coverageRecords=302509 retentionRecords=170618 occlusionRecords=170618 supportSampleEvaluations=2975536 supportSampleCandidateSkips=355202 supportSampleCandidateSkippedEvaluations=5683232 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733870 supportSampleRetains=865226 supportSampleRecords=213331 supportSampleGroups=27184 slowestPollObservedFrame=82 slowestPollObservedFrameTotal=2622.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2471.3ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1244ms, frame 82) slowestPollSourceFrontierPackCounts=frame=82 buckets=1699 projectedRefs=666381 streamSplats=79770 streamDenseRows=227222 streamSparseRows=0 streamTileCandidates=666381 streamCoverageRejects=0 streamPositiveCoverage=666381 coverageRetains=495725 retentionRetains=359296 occlusionRetains=363625 materializationSkips=125208 candidateRecords=383864 coverageRecords=302509 retentionRecords=170618 occlusionRecords=170618 supportSampleEvaluations=2975536 supportSampleCandidateSkips=355202 supportSampleCandidateSkippedEvaluations=5683232 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733870 supportSampleRetains=865226 supportSampleRecords=213331 supportSampleGroups=27184 blockers=none lastFailed=visual-smoke-not-ready
- Readiness stages: viewReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2944ms slowestPoll=2725ms@3 observedFrame=73 observedFrameTotal=2769ms observedFrameSlowestStage=tile-local-scene-state-refresh:2602ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1241.1ms, frame 73) observedSourceFrontierPackCounts=frame=73 buckets=1787 projectedRefs=664755 streamSplats=79708 streamDenseRows=226687 streamSparseRows=0 streamTileCandidates=664755 streamCoverageRejects=0 streamPositiveCoverage=664755 coverageRetains=509887 retentionRetains=370834 occlusionRetains=377020 materializationSkips=112455 candidateRecords=400084 coverageRecords=320071 retentionRecords=181163 occlusionRecords=181163 supportSampleEvaluations=3012032 supportSampleCandidateSkips=364048 supportSampleCandidateSkippedEvaluations=5824768 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2759727 supportSampleRetains=890167 supportSampleRecords=223155 supportSampleGroups=28592 slowestPollObservedFrame=73 slowestPollObservedFrameTotal=2769ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2602ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1241.1ms, frame 73) slowestPollSourceFrontierPackCounts=frame=73 buckets=1787 projectedRefs=664755 streamSplats=79708 streamDenseRows=226687 streamSparseRows=0 streamTileCandidates=664755 streamCoverageRejects=0 streamPositiveCoverage=664755 coverageRetains=509887 retentionRetains=370834 occlusionRetains=377020 materializationSkips=112455 candidateRecords=400084 coverageRecords=320071 retentionRecords=181163 occlusionRecords=181163 supportSampleEvaluations=3012032 supportSampleCandidateSkips=364048 supportSampleCandidateSkippedEvaluations=5824768 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2759727 supportSampleRetains=890167 supportSampleRecords=223155 supportSampleGroups=28592 blockers=none lastFailed=visual-smoke-not-ready} | interactionReadiness{ready=true source=compact-readiness polls=3 failed=2 elapsed=2789ms slowestPoll=2542ms@3 observedFrame=82 observedFrameTotal=2622.6ms observedFrameSlowestStage=tile-local-scene-state-refresh:2471.3ms observedSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1244ms, frame 82) observedSourceFrontierPackCounts=frame=82 buckets=1699 projectedRefs=666381 streamSplats=79770 streamDenseRows=227222 streamSparseRows=0 streamTileCandidates=666381 streamCoverageRejects=0 streamPositiveCoverage=666381 coverageRetains=495725 retentionRetains=359296 occlusionRetains=363625 materializationSkips=125208 candidateRecords=383864 coverageRecords=302509 retentionRecords=170618 occlusionRecords=170618 supportSampleEvaluations=2975536 supportSampleCandidateSkips=355202 supportSampleCandidateSkippedEvaluations=5683232 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733870 supportSampleRetains=865226 supportSampleRecords=213331 supportSampleGroups=27184 slowestPollObservedFrame=82 slowestPollObservedFrameTotal=2622.6ms slowestPollObservedFrameSlowestStage=tile-local-scene-state-refresh:2471.3ms slowestPollSourceFrontierPackSubstage=wgsl-source-frontier-pack/stream-projected-tile-refs (1244ms, frame 82) slowestPollSourceFrontierPackCounts=frame=82 buckets=1699 projectedRefs=666381 streamSplats=79770 streamDenseRows=227222 streamSparseRows=0 streamTileCandidates=666381 streamCoverageRejects=0 streamPositiveCoverage=666381 coverageRetains=495725 retentionRetains=359296 occlusionRetains=363625 materializationSkips=125208 candidateRecords=383864 coverageRecords=302509 retentionRecords=170618 occlusionRecords=170618 supportSampleEvaluations=2975536 supportSampleCandidateSkips=355202 supportSampleCandidateSkippedEvaluations=5683232 supportSampleSkips=0 supportSampleSkippedEvaluations=0 supportSamplePositiveWeights=2733870 supportSampleRetains=865226 supportSampleRecords=213331 supportSampleGroups=27184 blockers=none lastFailed=visual-smoke-not-ready}


## Findings

- None

## Route Identity

```json
[
  {
    "id": "whole-render-final-color",
    "role": "operator-visual",
    "routeIdentity": {
      "captureId": "whole-render-final-color",
      "evidenceRole": "operator-visual",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "default",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": "source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  },
  {
    "id": "dessert-close-final-color",
    "role": "operator-visual",
    "routeIdentity": {
      "captureId": "dessert-close-final-color",
      "evidenceRole": "operator-visual",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": "source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  },
  {
    "id": "porous-close-final-color",
    "role": "operator-visual",
    "routeIdentity": {
      "captureId": "porous-close-final-color",
      "evidenceRole": "operator-visual",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-porous-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": "source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  },
  {
    "id": "porous-close-orbit-left",
    "role": "operator-filmstrip",
    "routeIdentity": {
      "captureId": "porous-close-orbit-left",
      "evidenceRole": "operator-filmstrip",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-porous-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": "source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  },
  {
    "id": "porous-close-orbit-right",
    "role": "operator-filmstrip",
    "routeIdentity": {
      "captureId": "porous-close-orbit-right",
      "evidenceRole": "operator-filmstrip",
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "witnessView": "dessert-porous-close",
      "renderer": "tile-local-visible",
      "arenaBackend": "gpu",
      "effectiveArenaBackend": "gpu",
      "tileSizePx": "16",
      "maxRefsPerTile": "256",
      "wgslProjectedRefStream": "source-frontier",
      "tileDebug": null,
      "debug": null,
      "traceAnchors": null,
      "traceAnchor": null,
      "presentationAnchors": null,
      "presentationAnchor": null,
      "tileLocalPresentationAnchors": null,
      "tileLocalPresentationAnchor": null,
      "presentationScope": "full-scene",
      "presentationMode": null,
      "tileLocalPresentationScope": null,
      "tileLocalPresentationMode": null,
      "viewport": {
        "width": 1280,
        "height": 720
      },
      "canvas": {
        "width": 1280,
        "height": 720,
        "clientWidth": 1280,
        "clientHeight": 720
      }
    }
  }
]
```

## Boundary

- This is operator visual evidence, not trace evidence.
- Trace and presentation anchors are removed from every capture URL.
- Broad multi-anchor trace diagnostics remain a separate blocker.
- This harness does not claim production visual repair.

## Summary

PASS: operator witness loop captured whole render, close crops, and interaction filmstrip as real Scaniverse visual evidence.
