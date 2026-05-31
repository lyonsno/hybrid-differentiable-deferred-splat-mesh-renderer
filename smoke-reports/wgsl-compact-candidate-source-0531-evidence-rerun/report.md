# Visual Smoke Report

- Status: FAIL
- Generated: 2026-05-31T22:23:17.346Z
- URL: http://127.0.0.1:61732/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256&wgslProjectedRefStream=on
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: telemetry
- Decision requested: verify WGSL projected-ref stream consumes compact candidate source before review
- Expected visual delta: none required; telemetry source-domain repair only
- Evidence surface: pageEvidence.tileLocal.wgslProjectedRefStream.readback


## Image Evidence

- Canvas PNG: 1280x720
- Nonblank: false
- Changed pixels: 0 / 921600 (0.000%)
- Average background delta: 0.00
- Distinct colors: 1

## Splat Evidence

- Real Scaniverse evidence: false
- Source kind: scaniverse_ply
- Splat count: 94406
- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Sort backend: gpu-bitonic-cpu-depth-keys
- Summary: FAIL: canvas screenshot is blank or indistinguishable from its background.

## Renderer Fidelity Witness

- Threshold policy: witness-only; does not alter visual smoke pass/fail thresholds
- Findings: 2

```json
{
  "consumedContracts": {
    "fieldAutopsy": "66b4ea26e5d81ac614f4452b8d21308c4e432e1a",
    "slabSentinel": "ca96409",
    "conicReckoner": "f9e3498c00d44f2bb70eba1013f11c2f39b1aff1",
    "alphaLedger": "0474666"
  },
  "thresholdPolicy": "witness-only; does not alter visual smoke pass/fail thresholds",
  "smokeClassification": {
    "nonblank": false,
    "realSplatEvidence": false,
    "closeable": false,
    "harnessPassed": false,
    "sourceKind": "scaniverse_ply",
    "splatCount": 94406,
    "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
    "summary": "FAIL: canvas screenshot is blank or indistinguishable from its background.",
    "reasons": [
      "canvas screenshot is blank or indistinguishable from its background",
      "real Scaniverse splat evidence is required for first-smoke closure"
    ]
  },
  "imageSummary": {
    "nonblank": false,
    "changedPixelRatio": 0
  },
  "findings": [
    {
      "kind": "projection-anisotropy",
      "owner": "conic-reckoner",
      "severity": "suspect",
      "summary": "Projection anisotropy witness found ratio 81.03 across 1182 splats; footprint witness found 101 high-energy splats with max major radius 178.89 px; route to conic-reckoner after field metadata is canonical.",
      "evidence": {
        "maxAnisotropyRatio": 81.03444813242491,
        "suspiciousSplatCount": 1182,
        "sampleOriginalIds": [
          92,
          93,
          102,
          103,
          104,
          238,
          255,
          256
        ],
        "footprint": {
          "maxMajorRadiusPx": 178.89189197430719,
          "maxMinorRadiusPx": 81.73403613977938,
          "maxAreaPx": 37550.22975288294,
          "areaCapPx": 9216,
          "majorRadiusCapPx": 468,
          "highEnergySplatCount": 101,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            1753,
            2143,
            2826,
            4002,
            4003,
            4004,
            4013,
            4018
          ]
        }
      }
    },
    {
      "kind": "compositing-ambiguous",
      "owner": "alpha-ledger",
      "severity": "suspect",
      "summary": "Alpha density witness found 153 hot tiles with max mass 454451.78.",
      "evidence": {
        "alphaEnergyPolicy": "bounded-footprint-energy-cap",
        "nearPlaneAlphaFade": {
          "startNdc": 0,
          "endNdc": 0.08
        },
        "compositing": "straight-source-over",
        "ambiguousOverlapCount": 0,
        "overlapDensity": {
          "tileSizePx": 48,
          "alphaMassCap": 1728,
          "maxTileAlphaMass": 454451.7822861773,
          "maxTileSplatCount": 8076,
          "hotTileCount": 153,
          "sampleOriginalIds": [
            0,
            5,
            6,
            7,
            9,
            10,
            13,
            16
          ]
        }
      }
    }
  ]
}
```

## Sibling Contract Notes

- Synthetic or fixture content may validate this harness, but it does not close first smoke.
- To close first smoke, the integrated page should expose `window.__MESH_SPLAT_SMOKE__` or canvas/body data attributes with `sourceKind` set to real Scaniverse PLY/SPZ content, a positive `splatCount`, and an `assetPath`.
- The screenshot must remain nonblank after fixed overlays such as `#stats` are hidden, so overlay text cannot satisfy the canvas check.

## Page Evidence

```json
{
  "ready": true,
  "sourceKind": "scaniverse_ply",
  "realScaniverse": true,
  "realSplatEvidence": true,
  "synthetic": false,
  "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
  "splatCount": 94406,
  "sortedIdCount": 94406,
  "sortBackend": "gpu-bitonic-cpu-depth-keys",
  "boundsRadius": 0.22154541313648224,
  "rendererLabel": "tile-local-visible-gaussian-compositor",
  "fps": 0,
  "tileLocalStatus": "current",
  "tileLocalDisabledReason": null,
  "arenaRuntime": {
    "requestedArenaBackend": "gpu",
    "effectiveArenaBackend": "gpu",
    "gpuDispatchEnqueueDurationMs": 0
  },
  "operatorWitness": {
    "witnessView": "dessert-close",
    "revision": 0,
    "frameSerial": 2,
    "frameTimings": {
      "totalMs": 19.7,
      "stages": [
        {
          "name": "frame-uniforms",
          "elapsedMs": 0
        },
        {
          "name": "uniform-upload",
          "elapsedMs": 0
        },
        {
          "name": "queue-submit",
          "elapsedMs": 0
        },
        {
          "name": "tile-local-readback-resolve",
          "elapsedMs": 0
        },
        {
          "name": "evidence-exposure",
          "elapsedMs": 19.3
        }
      ]
    }
  },
  "tileLocal": {
    "status": "current",
    "refs": 157547,
    "allocatedRefs": 157547,
    "refAccounting": {
      "status": "diagnostic-summary",
      "source": "tile-header-diagnostics",
      "retainedRefs": 157547,
      "allocatedRefs": 157547,
      "estimatedRetainedRefs": 157547,
      "projectedRefs": 724912,
      "droppedRefs": 567365,
      "nonEmptyTiles": 861,
      "saturatedTiles": 546,
      "maxRefsPerTile": 256,
      "tileCount": 3600,
      "tileCapacity": 43
    },
    "tileColumns": 80,
    "tileRows": 45,
    "perPixelProjectedContributors": [],
    "perPixelRetainedContributors": [],
    "perPixelFinalColorAccumulation": [],
    "presentationScope": "full-scene",
    "traceAnchors": [],
    "perPixelDeadSplatElectorLedger": {
      "status": "blocked",
      "anchorLedgers": [],
      "summary": {
        "totalAnchors": 0,
        "categoryCounts": {},
        "wrongRetainedSetAnchorIds": [],
        "laterTransferFailureAnchorIds": []
      },
      "contract": {
        "consumes": [
          "gpu-live-trace:per-pixel-retained-contributors.projectedContributors",
          "gpu-live-trace:per-pixel-retained-contributors.retainedContributors",
          "gpu-live-trace:per-pixel-retained-contributors.droppedContributors"
        ],
        "categories": [
          "blocked-missing-retention-trace",
          "source-sparse",
          "wrong-retained-set",
          "later-transfer-failure",
          "narrower-blocker"
        ],
        "owns": [
          "retained-vs-dropped contributor identity",
          "foreground sealing role survival under cap pressure",
          "retained slate role/depth/weight summaries"
        ],
        "separatesFrom": [
          "visual-policy-repair",
          "global-opacity-scale-tuning",
          "tile-size-or-cap-change",
          "camera-or-projection-repair",
          "source-decode",
          "urmina-backend-construction",
          "deferred-gbuffer-voting"
        ]
      }
    },
    "perPixelRetainedToOrderedSurvivalLedger": {
      "status": "classified",
      "contract": {
        "consumes": [
          "gpu-live-trace:per-pixel-retained-contributors.retainedContributors",
          "gpu-live-trace:per-pixel-ordered-contributors.orderedContributors",
          "gpu-live-trace:per-pixel-final-color-accumulation.steps"
        ],
        "categories": [
          "ordered-present",
          "projected-foreground-dropped-before-retention",
          "retained-missing-from-order",
          "ordered-present-final-alpha-weak",
          "trace-blocked",
          "narrower-role-source-blocker"
        ],
        "owns": [
          "projected foreground support lost before retained tile rows",
          "retained foreground contributor identity surviving into ordered output",
          "ordered rank/depth/tie-break custody for retained foreground contributors",
          "final accumulation alpha/RGB participation for retained foreground contributors"
        ],
        "separatesFrom": [
          "retention-policy-repair",
          "visual-policy-repair",
          "global-opacity-scale-tuning",
          "tile-size-or-cap-change",
          "camera-or-projection-repair",
          "source-decode",
          "urmina-backend-construction",
          "deferred-gbuffer-voting"
        ]
      },
      "summary": {
        "anchorCount": 0,
        "totalAnchors": 0,
        "categoryCounts": {},
        "mechanismCounts": {},
        "retainedForegroundCount": 0,
        "orderedForegroundCount": 0,
        "missingFromOrderCount": 0,
        "accumulatedForegroundCount": 0
      },
      "anchorLedgers": []
    },
    "orderingBackend": "gpu-sorted-index-rank-inversion",
    "debugMode": "final-color",
    "visibleCompositedRefLimit": 256,
    "freshness": {
      "status": "current",
      "cachedFrameAgeMs": 0,
      "cachedFrame": 1,
      "currentFrameSignature": "tile-local@87196525",
      "cachedFrameSignature": "tile-local@87196525"
    },
    "budget": {
      "status": "current",
      "tileSizePx": 16,
      "maxRefsPerTile": 256,
      "currentViewportWidth": 1280,
      "currentViewportHeight": 720,
      "currentTileColumns": 80,
      "currentTileRows": 45,
      "maxProjectedRefs": 20000000,
      "overflowReasons": [],
      "guardPolicy": null
    },
    "compactSourceConstruction": {
      "classification": "compact-source-valid",
      "prestreamClassification": "compact-source-full-scene-bounded-overflow",
      "guardedQuantity": "compact-source-dense-projected-tile-refs",
      "presentationScope": "full-scene",
      "forceAnchorOnly": false,
      "allowAnchorOnlyBudgetFallback": false,
      "shouldRestrictToAnchorTiles": false,
      "shouldBoundSplatTileFootprints": true,
      "projectedOverflow": false,
      "retainedBudgetWithinProjectedLimit": true,
      "tileCount": 3600,
      "sourceTileCount": 3600,
      "traceTileCount": 0,
      "candidateSplatCount": 94406,
      "projectedSplatCount": 94406,
      "fullSceneConstructionRefUpperBound": 339861600,
      "projectedRefEstimate": 724912,
      "streamedProjectedRefs": 724912,
      "projectedRefs": 724912,
      "retainedRefs": 157547,
      "droppedRefs": 567365,
      "maxProjectedRefs": 20000000,
      "retainedBudgetRefs": 921600,
      "maxRefsPerTile": 256,
      "maxTilesPerSplat": 9,
      "effectiveMaxTilesPerSplat": 9,
      "footprintComparisonClass": "bounded-full-scene-source"
    },
    "retainedSourceConstruction": {
      "requestedSourceBackend": "gpu-retained-source-substrate",
      "effectiveSourceBackend": "deterministic-gpu-retention-carrier",
      "oracleBackend": "cpu-reference",
      "runtimeConsumerBackend": "gpu-contributor-arena-runtime",
      "sourceHandoff": "cpu-projected-candidate-records",
      "falseClosureGuard": "gpu-retention-carrier-does-not-imply-wgsl-source-construction",
      "cpuOwnedStages": [
        "compact-source-project-splats",
        "compact-source-estimate-ref-budget",
        "compact-source-stream-retention",
        "compact-source-pixel-traces"
      ],
      "gpuReadyStages": [
        "gpu-projection-retention-election-carrier",
        "gpu-contributor-arena-count-prefix-scatter",
        "gpu-contributor-arena-legacy-compositor-consumer"
      ],
      "nextGpuOffloadStage": "wgsl-projected-ref-stream",
      "projectedRefs": 724912,
      "retainedRefs": 157547,
      "droppedRefs": 567365
    },
    "wgslProjectedRefStream": {
      "requestedBackend": "wgsl-projected-ref-stream",
      "effectiveBackend": "wgsl-projected-ref-stream-sidecar",
      "sourceRole": "diagnostic-sidecar-not-retention-source",
      "runtimeConsumerBackend": "none",
      "falseClosureGuard": "wgsl-projected-ref-stream-sidecar-does-not-feed-retention-or-compositor",
      "compactSourceProjectedRefs": 724912,
      "compactSourceRetainedRefs": 157547,
      "allocatedProjectedRefs": 724912,
      "tileCount": 3600,
      "maxRefsPerTile": 201,
      "dispatchEnqueueDurationMs": 0,
      "readback": {
        "status": "present",
        "source": "wgsl-projected-ref-stream-readback",
        "frameId": 1,
        "tileCount": 3600,
        "tileCapacity": 201,
        "allocatedProjectedRefs": 724912,
        "compactSourceProjectedRefs": 724912,
        "compactSourceRetainedRefs": 157547,
        "projectedScatterRefs": 0,
        "retainedRefs": 0,
        "droppedRefs": 0,
        "projectedRefDelta": -724912,
        "nonEmptyTiles": 0,
        "saturatedTiles": 0,
        "maxRefsPerTile": 0,
        "headerRetainedRefs": 0,
        "headerProjectedRefs": 0,
        "headerCountClass": "headers-empty",
        "comparisonClass": "underpopulated-vs-compact-projected-refs"
      }
    },
    "budgetDiagnostics": {
      "version": 1,
      "arenaRefs": {
        "projected": 724912,
        "retained": 157547,
        "dropped": 567365,
        "cappedTileCount": 546,
        "saturatedRetainedTileCount": 546,
        "maxProjectedRefsPerTile": 3568,
        "maxRetainedRefsPerTile": 256
      },
      "overflowReasons": [
        {
          "reason": "per-tile-ref-cap",
          "projectedRefs": 724912,
          "retainedRefs": 157547,
          "droppedRefs": 567365,
          "cappedTileCount": 546,
          "maxRefsPerTile": 256
        }
      ],
      "capPressure": {
        "version": 1,
        "classification": "over-cap",
        "refs": {
          "projected": 724912,
          "retained": 157547,
          "dropped": 567365,
          "maxRefsPerTile": 256,
          "tileCount": 3600
        },
        "retainedBands": {
          "front": {
            "total": 0,
            "coverageHigh": 0,
            "coverageMedium": 0,
            "coverageLow": 0
          },
          "middle": {
            "total": 0,
            "coverageHigh": 0,
            "coverageMedium": 0,
            "coverageLow": 0
          },
          "back": {
            "total": 0,
            "coverageHigh": 0,
            "coverageMedium": 0,
            "coverageLow": 0
          }
        },
        "droppedBands": {
          "front": {
            "total": 0,
            "coverageHigh": 0,
            "coverageMedium": 0,
            "coverageLow": 0
          },
          "middle": {
            "total": 0,
            "coverageHigh": 0,
            "coverageMedium": 0,
            "coverageLow": 0
          },
          "back": {
            "total": 0,
            "coverageHigh": 0,
            "coverageMedium": 0,
            "coverageLow": 0
          }
        },
        "overflowReasons": {},
        "lossSignals": {
          "foregroundDroppedRefs": 0,
          "behindSurfaceDroppedRefs": 0,
          "policyReserveDisplacedRefs": 0,
          "highCoverageDroppedRefs": 0,
          "highRetentionDroppedRefs": 0,
          "highOcclusionDroppedRefs": 0
        },
        "policyHooks": []
      },
      "retainedBands": {
        "front": {
          "total": 0,
          "coverageHigh": 0,
          "coverageMedium": 0,
          "coverageLow": 0
        },
        "middle": {
          "total": 0,
          "coverageHigh": 0,
          "coverageMedium": 0,
          "coverageLow": 0
        },
        "back": {
          "total": 0,
          "coverageHigh": 0,
          "coverageMedium": 0,
          "coverageLow": 0
        }
      },
      "droppedBands": {
        "front": {
          "total": 0,
          "coverageHigh": 0,
          "coverageMedium": 0,
          "coverageLow": 0
        },
        "middle": {
          "total": 0,
          "coverageHigh": 0,
          "coverageMedium": 0,
          "coverageLow": 0
        },
        "back": {
          "total": 0,
          "coverageHigh": 0,
          "coverageMedium": 0,
          "coverageLow": 0
        }
      },
      "heat": {
        "cpu": {
          "projectedRefs": 724912,
          "projectedRefsPerTile": 201.36444444444444,
          "projectedToRetainedRatio": 4.601242803734759
        },
        "gpu": {
          "retainedRefs": 157547,
          "retainedRefBufferBytes": 2520752,
          "coverageWeightBufferBytes": 630188,
          "alphaParamBufferBytes": 5041504
        }
      }
    },
    "diagnostics": {
      "version": 1,
      "debugMode": "final-color",
      "tileGrid": {
        "columns": 80,
        "rows": 45,
        "tileSizePx": 16
      },
      "tileRefs": {
        "total": 157547,
        "nonEmptyTiles": 861,
        "maxPerTile": 256,
        "averagePerNonEmptyTile": 182.981417,
        "density": 0.239167
      },
      "tileRefCustody": {
        "projectedTileEntryCount": 724912,
        "retainedTileEntryCount": 157547,
        "evictedTileEntryCount": 567365,
        "cappedTileCount": 546,
        "saturatedRetainedTileCount": 546,
        "maxProjectedRefsPerTile": 3568,
        "maxRetainedRefsPerTile": 256,
        "headerRefCount": 157547,
        "headerAccountingMatches": true
      },
      "runtimeRefBudget": {
        "classification": "telemetry-insufficient",
        "tileCount": 3600,
        "runtimeRetainedRefs": 157547,
        "effectiveRefsPerTile": 43.763056,
        "maxTraceRetainedContributors": 0,
        "maxTraceFinalSteps": 0,
        "blockingAnchors": [],
        "frameHeaderAccounting": {
          "projectedTileEntryCount": 724912,
          "retainedTileEntryCount": 157547,
          "evictedTileEntryCount": 567365,
          "cappedTileCount": 546,
          "saturatedRetainedTileCount": 546,
          "maxProjectedRefsPerTile": 3568,
          "maxRetainedRefsPerTile": 256,
          "headerRefCount": 157547,
          "headerAccountingMatches": true
        },
        "anchorTileEvidence": []
      },
      "presentationFootprint": {
        "classification": "telemetry-insufficient",
        "frameTileCount": 3600,
        "nonEmptyTileCount": 861,
        "nonEmptyTileRatio": 0.239167,
        "retainedRefCount": 157547,
        "anchorFinalRowsPresent": false,
        "blocker": ""
      },
      "retentionAudit": {
        "fullFrame": {
          "region": "gpu-live-custody-estimate",
          "tileCount": 3600,
          "cappedTileCount": 546,
          "projectedTileEntryCount": 724912,
          "currentRetainedEntryCount": 157547,
          "legacyRetainedEntryCount": 157547,
          "addedByPolicyCount": 0,
          "droppedByPolicyCount": 0,
          "addedRetentionWeightSum": 0,
          "droppedRetentionWeightSum": 0,
          "addedOcclusionWeightSum": 0,
          "droppedOcclusionWeightSum": 0,
          "addedByPolicySamples": [],
          "droppedByPolicySamples": []
        },
        "regions": {
          "porousBody": {
            "region": "gpu-live-region-unavailable:porous-body",
            "tileCount": 0,
            "cappedTileCount": 0,
            "projectedTileEntryCount": 0,
            "currentRetainedEntryCount": 0,
            "legacyRetainedEntryCount": 0,
            "addedByPolicyCount": 0,
            "droppedByPolicyCount": 0,
            "addedRetentionWeightSum": 0,
            "droppedRetentionWeightSum": 0,
            "addedOcclusionWeightSum": 0,
            "droppedOcclusionWeightSum": 0,
            "addedByPolicySamples": [],
            "droppedByPolicySamples": []
          },
          "centerLeakBand": {
            "region": "gpu-live-region-unavailable:center-leak-band",
            "tileCount": 0,
            "cappedTileCount": 0,
            "projectedTileEntryCount": 0,
            "currentRetainedEntryCount": 0,
            "legacyRetainedEntryCount": 0,
            "addedByPolicyCount": 0,
            "droppedByPolicyCount": 0,
            "addedRetentionWeightSum": 0,
            "droppedRetentionWeightSum": 0,
            "addedOcclusionWeightSum": 0,
            "droppedOcclusionWeightSum": 0,
            "addedByPolicySamples": [],
            "droppedByPolicySamples": []
          }
        }
      },
      "coverageWeight": {
        "min": 0,
        "max": 18.005634,
        "mean": 0.353084
      },
      "alpha": {
        "maxSourceOpacity": 0.999,
        "meanSourceOpacity": 0.328736,
        "estimatedMaxAccumulatedAlpha": 1,
        "estimatedMinTransmittance": 0,
        "alphaParamRefs": 157547
      },
      "conicShape": {
        "maxMajorRadiusPx": 188.369457,
        "minMinorRadiusPx": 1.5,
        "maxAnisotropyRatio": 100.036645
      }
    },
    "pixelContributorTrace": {
      "schemaVersion": 1,
      "anchorPixel": {
        "id": "black-band-dropout-2300-1055",
        "kind": "black-band-dropout",
        "x": 2300,
        "y": 1055
      },
      "tileAddress": {
        "tileSizePx": 16,
        "tileX": 143,
        "tileY": 65,
        "tileIndex": 14183,
        "localX": 12,
        "localY": 15
      },
      "projectedContributors": [],
      "retainedContributors": [],
      "orderedContributors": [],
      "finalColorAccumulation": {
        "steps": [],
        "outputColor": [
          0.02,
          0.02,
          0.04,
          0
        ],
        "clearColor": [
          0.02,
          0.02,
          0.04
        ],
        "remainingTransmittance": 1
      },
      "dispatchCache": {
        "tileIndex": 5343,
        "clearFrameId": 1,
        "buildFrameId": 1,
        "compositeFrameId": 1,
        "tileY": 65,
        "tileSpan": {
          "minTileX": 139,
          "maxTileX": 149,
          "minTileY": 64,
          "maxTileY": 66
        },
        "cacheState": "current",
        "presentationFrameId": 1,
        "rowDispatchState": {
          "tileCoveredByClear": false,
          "tileCoveredByBuild": false,
          "tileCoveredByComposite": false,
          "rowCoveredByComposite": false,
          "currentFrameComplete": false
        }
      },
      "rendererMetadata": {
        "requestedRenderer": "tile-local-visible",
        "effectiveRenderer": "tile-local-visible-gaussian-compositor",
        "requestedArenaBackend": "gpu",
        "effectiveArenaBackend": "gpu",
        "tileSizePx": 16,
        "maxRefsPerTile": 256,
        "viewport": {
          "width": 1280,
          "height": 720
        }
      },
      "deferredFields": {
        "preserved": true,
        "deferredSurface": null,
        "missingReason": "production deferred G-buffer voting is outside the trace packet scope"
      },
      "blockers": [
        {
          "field": "finalColorAccumulation.steps",
          "reason": "tileLocal.perPixelFinalColorAccumulation missing contributors for black-band-dropout-2300-1055"
        }
      ]
    }
  },
  "tileLocalDiagnostics": {
    "version": 1,
    "debugMode": "final-color",
    "tileGrid": {
      "columns": 80,
      "rows": 45,
      "tileSizePx": 16
    },
    "tileRefs": {
      "total": 157547,
      "nonEmptyTiles": 861,
      "maxPerTile": 256,
      "averagePerNonEmptyTile": 182.981417,
      "density": 0.239167
    },
    "tileRefCustody": {
      "projectedTileEntryCount": 724912,
      "retainedTileEntryCount": 157547,
      "evictedTileEntryCount": 567365,
      "cappedTileCount": 546,
      "saturatedRetainedTileCount": 546,
      "maxProjectedRefsPerTile": 3568,
      "maxRetainedRefsPerTile": 256,
      "headerRefCount": 157547,
      "headerAccountingMatches": true
    },
    "runtimeRefBudget": {
      "classification": "telemetry-insufficient",
      "tileCount": 3600,
      "runtimeRetainedRefs": 157547,
      "effectiveRefsPerTile": 43.763056,
      "maxTraceRetainedContributors": 0,
      "maxTraceFinalSteps": 0,
      "blockingAnchors": [],
      "frameHeaderAccounting": {
        "projectedTileEntryCount": 724912,
        "retainedTileEntryCount": 157547,
        "evictedTileEntryCount": 567365,
        "cappedTileCount": 546,
        "saturatedRetainedTileCount": 546,
        "maxProjectedRefsPerTile": 3568,
        "maxRetainedRefsPerTile": 256,
        "headerRefCount": 157547,
        "headerAccountingMatches": true
      },
      "anchorTileEvidence": []
    },
    "presentationFootprint": {
      "classification": "telemetry-insufficient",
      "frameTileCount": 3600,
      "nonEmptyTileCount": 861,
      "nonEmptyTileRatio": 0.239167,
      "retainedRefCount": 157547,
      "anchorFinalRowsPresent": false,
      "blocker": ""
    },
    "retentionAudit": {
      "fullFrame": {
        "region": "gpu-live-custody-estimate",
        "tileCount": 3600,
        "cappedTileCount": 546,
        "projectedTileEntryCount": 724912,
        "currentRetainedEntryCount": 157547,
        "legacyRetainedEntryCount": 157547,
        "addedByPolicyCount": 0,
        "droppedByPolicyCount": 0,
        "addedRetentionWeightSum": 0,
        "droppedRetentionWeightSum": 0,
        "addedOcclusionWeightSum": 0,
        "droppedOcclusionWeightSum": 0,
        "addedByPolicySamples": [],
        "droppedByPolicySamples": []
      },
      "regions": {
        "porousBody": {
          "region": "gpu-live-region-unavailable:porous-body",
          "tileCount": 0,
          "cappedTileCount": 0,
          "projectedTileEntryCount": 0,
          "currentRetainedEntryCount": 0,
          "legacyRetainedEntryCount": 0,
          "addedByPolicyCount": 0,
          "droppedByPolicyCount": 0,
          "addedRetentionWeightSum": 0,
          "droppedRetentionWeightSum": 0,
          "addedOcclusionWeightSum": 0,
          "droppedOcclusionWeightSum": 0,
          "addedByPolicySamples": [],
          "droppedByPolicySamples": []
        },
        "centerLeakBand": {
          "region": "gpu-live-region-unavailable:center-leak-band",
          "tileCount": 0,
          "cappedTileCount": 0,
          "projectedTileEntryCount": 0,
          "currentRetainedEntryCount": 0,
          "legacyRetainedEntryCount": 0,
          "addedByPolicyCount": 0,
          "droppedByPolicyCount": 0,
          "addedRetentionWeightSum": 0,
          "droppedRetentionWeightSum": 0,
          "addedOcclusionWeightSum": 0,
          "droppedOcclusionWeightSum": 0,
          "addedByPolicySamples": [],
          "droppedByPolicySamples": []
        }
      }
    },
    "coverageWeight": {
      "min": 0,
      "max": 18.005634,
      "mean": 0.353084
    },
    "alpha": {
      "maxSourceOpacity": 0.999,
      "meanSourceOpacity": 0.328736,
      "estimatedMaxAccumulatedAlpha": 1,
      "estimatedMinTransmittance": 0,
      "alphaParamRefs": 157547
    },
    "conicShape": {
      "maxMajorRadiusPx": 188.369457,
      "minMinorRadiusPx": 1.5,
      "maxAnisotropyRatio": 100.036645
    }
  },
  "witness": {
    "field": {
      "scaleSpace": "log",
      "rotationOrder": "wxyz",
      "opacitySpace": "unit",
      "colorSpace": "sh_dc_rgb"
    },
    "projection": {
      "projectionMode": "jacobian-covariance",
      "maxAnisotropyRatio": 81.03444813242491,
      "suspiciousSplatCount": 1182,
      "sampleOriginalIds": [
        92,
        93,
        102,
        103,
        104,
        238,
        255,
        256
      ],
      "fieldMaxAnisotropyRatio": 190.56626845863002,
      "fieldSuspiciousSplatCount": 8398,
      "rotationOrderComparison": {
        "wxyz": {
          "rotationOrder": "wxyz",
          "maxProjectedAnisotropyRatio": 81.03444813242491,
          "suspiciousProjectedSplatCount": 1182,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            92,
            93,
            102,
            103,
            104,
            238,
            255,
            256
          ]
        },
        "xyzw": {
          "rotationOrder": "xyzw",
          "maxProjectedAnisotropyRatio": 82.13449897409144,
          "suspiciousProjectedSplatCount": 1711,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            88,
            92,
            93,
            131,
            256,
            286,
            549,
            632
          ]
        }
      },
      "footprint": {
        "maxMajorRadiusPx": 178.89189197430719,
        "maxMinorRadiusPx": 81.73403613977938,
        "maxAreaPx": 37550.22975288294,
        "areaCapPx": 9216,
        "majorRadiusCapPx": 468,
        "highEnergySplatCount": 101,
        "projectedSplatCount": 94406,
        "sampleOriginalIds": [
          1753,
          2143,
          2826,
          4002,
          4003,
          4004,
          4013,
          4018
        ]
      },
      "cropSupport": {
        "rimBand": {
          "crop": {
            "x": 390,
            "y": 322,
            "width": 500,
            "height": 115
          },
          "projectedCenterCount": 32823,
          "projectedSupportCount": 37252,
          "nearFloorMinorCount": 5346,
          "maxMajorRadiusPx": 178.89189197430719,
          "medianMajorRadiusPx": 8.037641622055192,
          "medianMinorRadiusPx": 3.726796368177996,
          "supportAreaPxSum": 10065086.650913961,
          "sampleOriginalIds": [
            145,
            152,
            158,
            159,
            160,
            161,
            162,
            164,
            168,
            170,
            172,
            175
          ]
        },
        "porousBody": {
          "crop": {
            "x": 520,
            "y": 270,
            "width": 260,
            "height": 150
          },
          "projectedCenterCount": 27705,
          "projectedSupportCount": 30119,
          "nearFloorMinorCount": 5257,
          "maxMajorRadiusPx": 178.89189197430719,
          "medianMajorRadiusPx": 7.371574467974285,
          "medianMinorRadiusPx": 3.369168797491543,
          "supportAreaPxSum": 7508006.128699303,
          "sampleOriginalIds": [
            187,
            188,
            193,
            205,
            214,
            219,
            223,
            224,
            225,
            226,
            227,
            228
          ]
        }
      }
    },
    "slab": {
      "statusCounts": {
        "axis-crosses-near-plane": 0,
        "pathological-footprint": 0,
        "accepted": 94406
      },
      "maxMajorRadiusPx": 0,
      "footprintCapPx": 0.65,
      "sampleOriginalIds": []
    },
    "alpha": {
      "alphaEnergyPolicy": "bounded-footprint-energy-cap",
      "nearPlaneAlphaFade": {
        "startNdc": 0,
        "endNdc": 0.08
      },
      "compositing": "straight-source-over",
      "ambiguousOverlapCount": 0,
      "overlapDensity": {
        "accountingMode": "coverage-aware",
        "tileSizePx": 48,
        "alphaMassCap": 1728,
        "maxTileAlphaMass": 454451.7822861773,
        "maxTileSplatCount": 8076,
        "hotTileCount": 153,
        "tileEntryCount": 424291,
        "maxSplatCoveredTileCount": 143,
        "maxCenterTileDroppedCoverageFraction": 1,
        "sampleOriginalIds": [
          0,
          5,
          6,
          7,
          9,
          10,
          13,
          16
        ]
      }
    },
    "sort": {
      "backend": "gpu-bitonic-cpu-depth-keys",
      "sortedIdCount": 94406
    },
    "source": {
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "splatCount": 94406,
      "sortedSampleOriginalIds": []
    }
  },
  "statsText": "1280×720 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/153 tiles | tile-local: 80x45 tiles/157547 refs | tile-local budget: cap 20,000,000 | per-tile cap 256 | tile-budget: 16px/256 refs | visible-compositor cap: 256 refs | tile-order: gpu-sorted-index-rank-inversion | retained-source: deterministic-gpu-retention-carrier->gpu-contributor-arena-runtime | projected-stream: wgsl-projected-ref-stream-sidecar | arena requested: gpu | arena effective: gpu | arena GPU dispatch enqueue: 0.000ms | render: 0.00ms",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "1280×720 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/153 tiles | tile-local: 80x45 tiles/157547 refs | tile-local budget: cap 20,000,000 | per-tile cap 256 | tile-budget: 16px/256 refs | visible-compositor cap: 256 refs | tile-order: gpu-sorted-index-rank-inversion | retained-source: deterministic-gpu-retention-carrier->gpu-contributor-arena-runtime | projected-stream: wgsl-projected-ref-stream-sidecar | arena requested: gpu | arena effective: gpu | arena GPU dispatch enqueue: 0.000ms | render: 0.00ms",
  "canvas": {
    "width": 1280,
    "height": 720,
    "clientWidth": 1280,
    "clientHeight": 720
  }
}
```

## Console

```json
{
  "consoleMessages": [
    {
      "type": "debug",
      "text": "[vite] connecting..."
    },
    {
      "type": "debug",
      "text": "[vite] connected."
    },
    {
      "type": "debug",
      "text": "[vite] connecting..."
    },
    {
      "type": "debug",
      "text": "[vite] connected."
    },
    {
      "type": "warning",
      "text": "[Buffer \"wgsl_projected_ref_stream_tile_headers\"] usage (BufferUsage::(CopyDst|Storage)) doesn't include BufferUsage::CopySrc.\n - While validating source [Buffer \"wgsl_projected_ref_stream_tile_headers\"] usage.\n - While encoding [CommandEncoder (unlabeled)].CopyBufferToBuffer([Buffer \"wgsl_projected_ref_stream_tile_headers\"], 0, [Buffer \"wgsl_projected_ref_stream_tile_headers_readback\"], 0, 1568096).\n - While finishing [CommandEncoder (unlabeled)].\n"
    },
    {
      "type": "warning",
      "text": "[Invalid CommandBuffer] is invalid due to a previous error.\n - While calling [Queue].Submit([[Invalid CommandBuffer]])\n"
    }
  ],
  "pageErrors": []
}
```
