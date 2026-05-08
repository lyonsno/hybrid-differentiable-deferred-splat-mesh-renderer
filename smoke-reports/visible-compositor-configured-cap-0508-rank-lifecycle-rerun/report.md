# Visual Smoke Report

- Status: PASS
- Generated: 2026-05-08T23:54:22.067Z
- URL: http://127.0.0.1:61621/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Image Evidence

- Canvas PNG: 1780x1916
- Nonblank: true
- Changed pixels: 262069 / 3410480 (7.684%)
- Average background delta: 8.37
- Distinct colors: 96612

## Splat Evidence

- Real Scaniverse evidence: true
- Source kind: scaniverse_ply
- Splat count: 94406
- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Sort backend: gpu-bitonic-cpu-depth-keys
- Summary: PASS: nonblank scaniverse_ply capture with 94406 splats from /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json.

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
    "nonblank": true,
    "realSplatEvidence": true,
    "closeable": true,
    "harnessPassed": true,
    "sourceKind": "scaniverse_ply",
    "splatCount": 94406,
    "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
    "summary": "PASS: nonblank scaniverse_ply capture with 94406 splats from /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json.",
    "reasons": []
  },
  "imageSummary": {
    "nonblank": true,
    "changedPixelRatio": 0.07684226267270296
  },
  "findings": [
    {
      "kind": "projection-anisotropy",
      "owner": "conic-reckoner",
      "severity": "suspect",
      "summary": "Projection anisotropy witness found ratio 118.90 across 1594 splats; footprint witness found 1 high-energy splats with max major radius 144.92 px; route to conic-reckoner after field metadata is canonical.",
      "evidence": {
        "maxAnisotropyRatio": 118.90349485550345,
        "suspiciousSplatCount": 1594,
        "sampleOriginalIds": [
          89,
          90,
          91,
          93,
          102,
          103,
          104,
          105
        ],
        "footprint": {
          "maxMajorRadiusPx": 144.91858581393922,
          "maxMinorRadiusPx": 93.7584905289495,
          "maxAreaPx": 38994.93121168008,
          "areaCapPx": 34104.8,
          "majorRadiusCapPx": 1157,
          "highEnergySplatCount": 1,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            92947
          ]
        }
      }
    },
    {
      "kind": "compositing-ambiguous",
      "owner": "alpha-ledger",
      "severity": "suspect",
      "summary": "Alpha density witness found 162 hot tiles with max mass 620190.63.",
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
          "maxTileAlphaMass": 620190.6339414512,
          "maxTileSplatCount": 9343,
          "hotTileCount": 162,
          "sampleOriginalIds": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7
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
    "cpuBuildDurationMs": 24370,
    "gpuDispatchDurationMs": 0
  },
  "tileLocal": {
    "status": "current",
    "refs": 393770,
    "allocatedRefs": 393770,
    "tileColumns": 112,
    "tileRows": 120,
    "orderingBackend": "gpu-sorted-index-rank-inversion",
    "debugMode": "final-color",
    "visibleCompositedRefLimit": 256,
    "freshness": {
      "status": "current",
      "cachedFrameAgeMs": 0,
      "cachedFrame": 1,
      "currentFrameSignature": "tile-local@11bc454c",
      "cachedFrameSignature": "tile-local@11bc454c"
    },
    "budget": {
      "status": "current",
      "tileSizePx": 16,
      "maxRefsPerTile": 256,
      "currentViewportWidth": 1780,
      "currentViewportHeight": 1916,
      "currentTileColumns": 112,
      "currentTileRows": 120,
      "maxProjectedRefs": 20000000,
      "overflowReasons": []
    },
    "budgetDiagnostics": {
      "version": 1,
      "arenaRefs": {
        "projected": 3225969,
        "retained": 393770,
        "dropped": 2832199,
        "cappedTileCount": 1168,
        "saturatedRetainedTileCount": 1168,
        "maxProjectedRefsPerTile": 7177,
        "maxRetainedRefsPerTile": 256
      },
      "overflowReasons": [
        {
          "reason": "per-tile-ref-cap",
          "projectedRefs": 3225969,
          "retainedRefs": 393770,
          "droppedRefs": 2832199,
          "cappedTileCount": 1168,
          "maxRefsPerTile": 256
        }
      ],
      "capPressure": {
        "version": 1,
        "classification": "over-cap",
        "refs": {
          "projected": 3225969,
          "retained": 393770,
          "dropped": 2832199,
          "maxRefsPerTile": 256,
          "tileCount": 13440
        },
        "retainedBands": {
          "front": {
            "total": 120986,
            "coverageHigh": 5245,
            "coverageMedium": 14656,
            "coverageLow": 101085
          },
          "middle": {
            "total": 213050,
            "coverageHigh": 3679,
            "coverageMedium": 16155,
            "coverageLow": 193216
          },
          "back": {
            "total": 59734,
            "coverageHigh": 413,
            "coverageMedium": 2766,
            "coverageLow": 56555
          }
        },
        "droppedBands": {
          "front": {
            "total": 819594,
            "coverageHigh": 3833,
            "coverageMedium": 11087,
            "coverageLow": 804674
          },
          "middle": {
            "total": 1413845,
            "coverageHigh": 2931,
            "coverageMedium": 13369,
            "coverageLow": 1397545
          },
          "back": {
            "total": 598760,
            "coverageHigh": 485,
            "coverageMedium": 2576,
            "coverageLow": 595699
          }
        },
        "overflowReasons": {
          "none": 393770,
          "perTileRetainedCap": 0,
          "perTileRetainedCapPolicyReserve": 115407,
          "perTileRetainedCapForegroundBand": 778557,
          "perTileRetainedCapMiddleBand": 1355185,
          "perTileRetainedCapBehindSurfaceBand": 583050
        },
        "lossSignals": {
          "foregroundDroppedRefs": 819594,
          "behindSurfaceDroppedRefs": 598760,
          "policyReserveDisplacedRefs": 115407,
          "highCoverageDroppedRefs": 7249,
          "highRetentionDroppedRefs": 269,
          "highOcclusionDroppedRefs": 672
        },
        "policyHooks": [
          {
            "kind": "tile-local-lod",
            "reason": "compress dense same-tile contributors before the retained-ref cap rather than raising it",
            "raisesCap": false
          },
          {
            "kind": "tile-local-aggregation",
            "reason": "aggregate low-priority dropped contributors into explicit evidence instead of hiding loss",
            "raisesCap": false
          }
        ]
      },
      "retainedBands": {
        "front": {
          "total": 120986,
          "coverageHigh": 5245,
          "coverageMedium": 14656,
          "coverageLow": 101085
        },
        "middle": {
          "total": 213050,
          "coverageHigh": 3679,
          "coverageMedium": 16155,
          "coverageLow": 193216
        },
        "back": {
          "total": 59734,
          "coverageHigh": 413,
          "coverageMedium": 2766,
          "coverageLow": 56555
        }
      },
      "droppedBands": {
        "front": {
          "total": 819594,
          "coverageHigh": 3833,
          "coverageMedium": 11087,
          "coverageLow": 804674
        },
        "middle": {
          "total": 1413845,
          "coverageHigh": 2931,
          "coverageMedium": 13369,
          "coverageLow": 1397545
        },
        "back": {
          "total": 598760,
          "coverageHigh": 485,
          "coverageMedium": 2576,
          "coverageLow": 595699
        }
      },
      "heat": {
        "cpu": {
          "projectedRefs": 3225969,
          "projectedRefsPerTile": 240.027455,
          "projectedToRetainedRatio": 8.192521,
          "buildDurationMs": 24370
        },
        "gpu": {
          "retainedRefs": 393770,
          "retainedRefBufferBytes": 6300320,
          "coverageWeightBufferBytes": 1575080,
          "alphaParamBufferBytes": 12600640,
          "orderingKeyBufferBytes": 1575080
        }
      }
    },
    "diagnostics": {
      "version": 1,
      "debugMode": "final-color",
      "tileGrid": {
        "columns": 112,
        "rows": 120,
        "tileSizePx": 16
      },
      "tileRefs": {
        "total": 393770,
        "nonEmptyTiles": 3792,
        "maxPerTile": 256,
        "averagePerNonEmptyTile": 103.8423,
        "density": 0.282143
      },
      "tileRefCustody": {
        "projectedTileEntryCount": 3225969,
        "retainedTileEntryCount": 393770,
        "evictedTileEntryCount": 2832199,
        "cappedTileCount": 1168,
        "saturatedRetainedTileCount": 1168,
        "maxProjectedRefsPerTile": 7177,
        "maxRetainedRefsPerTile": 256,
        "headerRefCount": 393770,
        "headerAccountingMatches": true
      },
      "retentionAudit": {
        "fullFrame": {
          "region": "full-frame",
          "tileCount": 3792,
          "cappedTileCount": 1168,
          "projectedTileEntryCount": 3225969,
          "currentRetainedEntryCount": 393770,
          "legacyRetainedEntryCount": 393770,
          "addedByPolicyCount": 115407,
          "droppedByPolicyCount": 115407,
          "addedRetentionWeightSum": 2032.183051,
          "droppedRetentionWeightSum": 4307.031664,
          "addedOcclusionWeightSum": 2901.174243,
          "droppedOcclusionWeightSum": 8326.474861,
          "addedByPolicySamples": [
            {
              "tileIndex": 5206,
              "tileX": 54,
              "tileY": 46,
              "splatIndex": 38595,
              "originalId": 38595,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.862745,
              "viewRank": 70101
            },
            {
              "tileIndex": 5206,
              "tileX": 54,
              "tileY": 46,
              "splatIndex": 40325,
              "originalId": 40325,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.654902,
              "viewRank": 73395
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 13168,
              "originalId": 13168,
              "coverageWeight": 0.000003,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.956863,
              "viewRank": 29125
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 38091,
              "originalId": 38091,
              "coverageWeight": 0.000003,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.666667,
              "viewRank": 65655
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 12778,
              "originalId": 12778,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.87451,
              "viewRank": 46327
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 29005,
              "originalId": 29005,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.764706,
              "viewRank": 75427
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 19852,
              "originalId": 19852,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.713726,
              "viewRank": 75347
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 5579,
              "originalId": 5579,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.764706,
              "viewRank": 45265
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 91026,
              "originalId": 91026,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.682353,
              "viewRank": 83693
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 13783,
              "originalId": 13783,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.74902,
              "viewRank": 74025
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 7410,
              "originalId": 7410,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.619608,
              "viewRank": 74721
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 16318,
              "originalId": 16318,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.945098,
              "viewRank": 78508
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 5206,
              "tileX": 54,
              "tileY": 46,
              "splatIndex": 7989,
              "originalId": 7989,
              "coverageWeight": 0.000725,
              "retentionWeight": 0.000033,
              "occlusionWeight": 0.000108,
              "occlusionDensity": 0.14902,
              "viewRank": 73010
            },
            {
              "tileIndex": 5206,
              "tileX": 54,
              "tileY": 46,
              "splatIndex": 74488,
              "originalId": 74488,
              "coverageWeight": 0.000453,
              "retentionWeight": 0.000029,
              "occlusionWeight": 0.000059,
              "occlusionDensity": 0.129412,
              "viewRank": 76375
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 62091,
              "originalId": 62091,
              "coverageWeight": 0.014098,
              "retentionWeight": 0.0017,
              "occlusionWeight": 0.002433,
              "occlusionDensity": 0.172549,
              "viewRank": 62714
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 15399,
              "originalId": 15399,
              "coverageWeight": 0.008558,
              "retentionWeight": 0.000854,
              "occlusionWeight": 0.001342,
              "occlusionDensity": 0.156863,
              "viewRank": 71195
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 57896,
              "originalId": 57896,
              "coverageWeight": 0.002906,
              "retentionWeight": 0.000339,
              "occlusionWeight": 0.000467,
              "occlusionDensity": 0.160784,
              "viewRank": 61289
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 33615,
              "originalId": 33615,
              "coverageWeight": 0.001487,
              "retentionWeight": 0.000142,
              "occlusionWeight": 0.000198,
              "occlusionDensity": 0.133333,
              "viewRank": 63664
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 35749,
              "originalId": 35749,
              "coverageWeight": 0.001331,
              "retentionWeight": 0.0002,
              "occlusionWeight": 0.000318,
              "occlusionDensity": 0.239216,
              "viewRank": 73757
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 62973,
              "originalId": 62973,
              "coverageWeight": 0.000555,
              "retentionWeight": 0.000072,
              "occlusionWeight": 0.000109,
              "occlusionDensity": 0.196078,
              "viewRank": 69895
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 39329,
              "originalId": 39329,
              "coverageWeight": 0.000323,
              "retentionWeight": 0.000051,
              "occlusionWeight": 0.000075,
              "occlusionDensity": 0.231373,
              "viewRank": 73065
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 61253,
              "originalId": 61253,
              "coverageWeight": 0.000272,
              "retentionWeight": 0.00003,
              "occlusionWeight": 0.00005,
              "occlusionDensity": 0.184314,
              "viewRank": 68792
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 7989,
              "originalId": 7989,
              "coverageWeight": 0.000258,
              "retentionWeight": 0.000012,
              "occlusionWeight": 0.000039,
              "occlusionDensity": 0.14902,
              "viewRank": 73010
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 29636,
              "originalId": 29636,
              "coverageWeight": 0.000242,
              "retentionWeight": 0.000033,
              "occlusionWeight": 0.000047,
              "occlusionDensity": 0.192157,
              "viewRank": 72484
            }
          ]
        },
        "regions": {
          "porousBody": {
            "region": "porous-body",
            "tileCount": 500,
            "cappedTileCount": 369,
            "projectedTileEntryCount": 1229246,
            "currentRetainedEntryCount": 109143,
            "legacyRetainedEntryCount": 109143,
            "addedByPolicyCount": 36312,
            "droppedByPolicyCount": 36312,
            "addedRetentionWeightSum": 636.093236,
            "droppedRetentionWeightSum": 1677.837081,
            "addedOcclusionWeightSum": 1003.593432,
            "droppedOcclusionWeightSum": 3031.644527,
            "addedByPolicySamples": [
              {
                "tileIndex": 5206,
                "tileX": 54,
                "tileY": 46,
                "splatIndex": 38595,
                "originalId": 38595,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.862745,
                "viewRank": 70101
              },
              {
                "tileIndex": 5206,
                "tileX": 54,
                "tileY": 46,
                "splatIndex": 40325,
                "originalId": 40325,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.654902,
                "viewRank": 73395
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 13168,
                "originalId": 13168,
                "coverageWeight": 0.000003,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000003,
                "occlusionDensity": 0.956863,
                "viewRank": 29125
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 38091,
                "originalId": 38091,
                "coverageWeight": 0.000003,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000002,
                "occlusionDensity": 0.666667,
                "viewRank": 65655
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 12778,
                "originalId": 12778,
                "coverageWeight": 0.000002,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000002,
                "occlusionDensity": 0.87451,
                "viewRank": 46327
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 29005,
                "originalId": 29005,
                "coverageWeight": 0.000002,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.764706,
                "viewRank": 75427
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 19852,
                "originalId": 19852,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.713726,
                "viewRank": 75347
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 5579,
                "originalId": 5579,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.764706,
                "viewRank": 45265
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 91026,
                "originalId": 91026,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.682353,
                "viewRank": 83693
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 13783,
                "originalId": 13783,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.74902,
                "viewRank": 74025
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 7410,
                "originalId": 7410,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.619608,
                "viewRank": 74721
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 16318,
                "originalId": 16318,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.945098,
                "viewRank": 78508
              }
            ],
            "droppedByPolicySamples": [
              {
                "tileIndex": 5206,
                "tileX": 54,
                "tileY": 46,
                "splatIndex": 7989,
                "originalId": 7989,
                "coverageWeight": 0.000725,
                "retentionWeight": 0.000033,
                "occlusionWeight": 0.000108,
                "occlusionDensity": 0.14902,
                "viewRank": 73010
              },
              {
                "tileIndex": 5206,
                "tileX": 54,
                "tileY": 46,
                "splatIndex": 74488,
                "originalId": 74488,
                "coverageWeight": 0.000453,
                "retentionWeight": 0.000029,
                "occlusionWeight": 0.000059,
                "occlusionDensity": 0.129412,
                "viewRank": 76375
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 62091,
                "originalId": 62091,
                "coverageWeight": 0.014098,
                "retentionWeight": 0.0017,
                "occlusionWeight": 0.002433,
                "occlusionDensity": 0.172549,
                "viewRank": 62714
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 15399,
                "originalId": 15399,
                "coverageWeight": 0.008558,
                "retentionWeight": 0.000854,
                "occlusionWeight": 0.001342,
                "occlusionDensity": 0.156863,
                "viewRank": 71195
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 57896,
                "originalId": 57896,
                "coverageWeight": 0.002906,
                "retentionWeight": 0.000339,
                "occlusionWeight": 0.000467,
                "occlusionDensity": 0.160784,
                "viewRank": 61289
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 33615,
                "originalId": 33615,
                "coverageWeight": 0.001487,
                "retentionWeight": 0.000142,
                "occlusionWeight": 0.000198,
                "occlusionDensity": 0.133333,
                "viewRank": 63664
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 35749,
                "originalId": 35749,
                "coverageWeight": 0.001331,
                "retentionWeight": 0.0002,
                "occlusionWeight": 0.000318,
                "occlusionDensity": 0.239216,
                "viewRank": 73757
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 62973,
                "originalId": 62973,
                "coverageWeight": 0.000555,
                "retentionWeight": 0.000072,
                "occlusionWeight": 0.000109,
                "occlusionDensity": 0.196078,
                "viewRank": 69895
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 39329,
                "originalId": 39329,
                "coverageWeight": 0.000323,
                "retentionWeight": 0.000051,
                "occlusionWeight": 0.000075,
                "occlusionDensity": 0.231373,
                "viewRank": 73065
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 61253,
                "originalId": 61253,
                "coverageWeight": 0.000272,
                "retentionWeight": 0.00003,
                "occlusionWeight": 0.00005,
                "occlusionDensity": 0.184314,
                "viewRank": 68792
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 7989,
                "originalId": 7989,
                "coverageWeight": 0.000258,
                "retentionWeight": 0.000012,
                "occlusionWeight": 0.000039,
                "occlusionDensity": 0.14902,
                "viewRank": 73010
              },
              {
                "tileIndex": 5313,
                "tileX": 49,
                "tileY": 47,
                "splatIndex": 29636,
                "originalId": 29636,
                "coverageWeight": 0.000242,
                "retentionWeight": 0.000033,
                "occlusionWeight": 0.000047,
                "occlusionDensity": 0.192157,
                "viewRank": 72484
              }
            ]
          },
          "centerLeakBand": {
            "region": "center-leak-band",
            "tileCount": 858,
            "cappedTileCount": 803,
            "projectedTileEntryCount": 2790722,
            "currentRetainedEntryCount": 212863,
            "legacyRetainedEntryCount": 212863,
            "addedByPolicyCount": 86565,
            "droppedByPolicyCount": 86565,
            "addedRetentionWeightSum": 1826.881999,
            "droppedRetentionWeightSum": 3996.298623,
            "addedOcclusionWeightSum": 2657.11173,
            "droppedOcclusionWeightSum": 7667.830248,
            "addedByPolicySamples": [
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 66075,
                "originalId": 66075,
                "coverageWeight": 0.000003,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000002,
                "occlusionDensity": 0.823529,
                "viewRank": 23887
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 59325,
                "originalId": 59325,
                "coverageWeight": 0.000002,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000002,
                "occlusionDensity": 0.772549,
                "viewRank": 32212
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 61033,
                "originalId": 61033,
                "coverageWeight": 0.000002,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.890196,
                "viewRank": 74678
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 18236,
                "originalId": 18236,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.839216,
                "viewRank": 74305
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 12701,
                "originalId": 12701,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.835294,
                "viewRank": 50130
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 4002,
                "originalId": 4002,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.764706,
                "viewRank": 94234
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 85410,
                "originalId": 85410,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.901961,
                "viewRank": 41649
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 43136,
                "originalId": 43136,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.796078,
                "viewRank": 83235
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 64588,
                "originalId": 64588,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.960784,
                "viewRank": 72250
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 13783,
                "originalId": 13783,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.74902,
                "viewRank": 74025
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 41590,
                "originalId": 41590,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.988235,
                "viewRank": 77187
              },
              {
                "tileIndex": 5645,
                "tileX": 45,
                "tileY": 50,
                "splatIndex": 76984,
                "originalId": 76984,
                "coverageWeight": 0.000131,
                "retentionWeight": 0.000032,
                "occlusionWeight": 0.000125,
                "occlusionDensity": 0.952941,
                "viewRank": 71014
              }
            ],
            "droppedByPolicySamples": [
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 29636,
                "originalId": 29636,
                "coverageWeight": 0.003239,
                "retentionWeight": 0.000436,
                "occlusionWeight": 0.000622,
                "occlusionDensity": 0.192157,
                "viewRank": 72484
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 15335,
                "originalId": 15335,
                "coverageWeight": 0.002295,
                "retentionWeight": 0.000374,
                "occlusionWeight": 0.000522,
                "occlusionDensity": 0.227451,
                "viewRank": 70811
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 29670,
                "originalId": 29670,
                "coverageWeight": 0.001212,
                "retentionWeight": 0.000171,
                "occlusionWeight": 0.000261,
                "occlusionDensity": 0.215686,
                "viewRank": 71995
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 10647,
                "originalId": 10647,
                "coverageWeight": 0.000543,
                "retentionWeight": 0.000037,
                "occlusionWeight": 0.000057,
                "occlusionDensity": 0.105882,
                "viewRank": 77987
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 41528,
                "originalId": 41528,
                "coverageWeight": 0.000508,
                "retentionWeight": 0.00006,
                "occlusionWeight": 0.000107,
                "occlusionDensity": 0.211765,
                "viewRank": 78625
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 78425,
                "originalId": 78425,
                "coverageWeight": 0.000466,
                "retentionWeight": 0.000038,
                "occlusionWeight": 0.000073,
                "occlusionDensity": 0.156863,
                "viewRank": 69314
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 28571,
                "originalId": 28571,
                "coverageWeight": 0.000296,
                "retentionWeight": 0.00004,
                "occlusionWeight": 0.00006,
                "occlusionDensity": 0.203922,
                "viewRank": 69250
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 41579,
                "originalId": 41579,
                "coverageWeight": 0.000293,
                "retentionWeight": 0.000028,
                "occlusionWeight": 0.000052,
                "occlusionDensity": 0.176471,
                "viewRank": 79352
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 61313,
                "originalId": 61313,
                "coverageWeight": 0.000192,
                "retentionWeight": 0.00001,
                "occlusionWeight": 0.000036,
                "occlusionDensity": 0.188235,
                "viewRank": 90574
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 34803,
                "originalId": 34803,
                "coverageWeight": 0.000005,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.160784,
                "viewRank": 45520
              },
              {
                "tileIndex": 5644,
                "tileX": 44,
                "tileY": 50,
                "splatIndex": 33127,
                "originalId": 33127,
                "coverageWeight": 0.000005,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000002,
                "occlusionDensity": 0.317647,
                "viewRank": 37718
              },
              {
                "tileIndex": 5645,
                "tileX": 45,
                "tileY": 50,
                "splatIndex": 61357,
                "originalId": 61357,
                "coverageWeight": 0.008933,
                "retentionWeight": 0.001762,
                "occlusionWeight": 0.002487,
                "occlusionDensity": 0.278431,
                "viewRank": 74647
              }
            ]
          }
        }
      },
      "coverageWeight": {
        "min": 0,
        "max": 16.837622,
        "mean": 0.098971
      },
      "alpha": {
        "maxSourceOpacity": 1,
        "meanSourceOpacity": 0.38901,
        "estimatedMaxAccumulatedAlpha": 1,
        "estimatedMinTransmittance": 0,
        "alphaParamRefs": 393770
      },
      "conicShape": {
        "maxMajorRadiusPx": 152.239229,
        "minMinorRadiusPx": 1.5,
        "maxAnisotropyRatio": 56.637658
      }
    }
  },
  "tileLocalDiagnostics": {
    "version": 1,
    "debugMode": "final-color",
    "tileGrid": {
      "columns": 112,
      "rows": 120,
      "tileSizePx": 16
    },
    "tileRefs": {
      "total": 393770,
      "nonEmptyTiles": 3792,
      "maxPerTile": 256,
      "averagePerNonEmptyTile": 103.8423,
      "density": 0.282143
    },
    "tileRefCustody": {
      "projectedTileEntryCount": 3225969,
      "retainedTileEntryCount": 393770,
      "evictedTileEntryCount": 2832199,
      "cappedTileCount": 1168,
      "saturatedRetainedTileCount": 1168,
      "maxProjectedRefsPerTile": 7177,
      "maxRetainedRefsPerTile": 256,
      "headerRefCount": 393770,
      "headerAccountingMatches": true
    },
    "retentionAudit": {
      "fullFrame": {
        "region": "full-frame",
        "tileCount": 3792,
        "cappedTileCount": 1168,
        "projectedTileEntryCount": 3225969,
        "currentRetainedEntryCount": 393770,
        "legacyRetainedEntryCount": 393770,
        "addedByPolicyCount": 115407,
        "droppedByPolicyCount": 115407,
        "addedRetentionWeightSum": 2032.183051,
        "droppedRetentionWeightSum": 4307.031664,
        "addedOcclusionWeightSum": 2901.174243,
        "droppedOcclusionWeightSum": 8326.474861,
        "addedByPolicySamples": [
          {
            "tileIndex": 5206,
            "tileX": 54,
            "tileY": 46,
            "splatIndex": 38595,
            "originalId": 38595,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.862745,
            "viewRank": 70101
          },
          {
            "tileIndex": 5206,
            "tileX": 54,
            "tileY": 46,
            "splatIndex": 40325,
            "originalId": 40325,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.654902,
            "viewRank": 73395
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 13168,
            "originalId": 13168,
            "coverageWeight": 0.000003,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000003,
            "occlusionDensity": 0.956863,
            "viewRank": 29125
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 38091,
            "originalId": 38091,
            "coverageWeight": 0.000003,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000002,
            "occlusionDensity": 0.666667,
            "viewRank": 65655
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 12778,
            "originalId": 12778,
            "coverageWeight": 0.000002,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000002,
            "occlusionDensity": 0.87451,
            "viewRank": 46327
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 29005,
            "originalId": 29005,
            "coverageWeight": 0.000002,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000001,
            "occlusionDensity": 0.764706,
            "viewRank": 75427
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 19852,
            "originalId": 19852,
            "coverageWeight": 0.000001,
            "retentionWeight": 0,
            "occlusionWeight": 0.000001,
            "occlusionDensity": 0.713726,
            "viewRank": 75347
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 5579,
            "originalId": 5579,
            "coverageWeight": 0.000001,
            "retentionWeight": 0,
            "occlusionWeight": 0.000001,
            "occlusionDensity": 0.764706,
            "viewRank": 45265
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 91026,
            "originalId": 91026,
            "coverageWeight": 0.000001,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.682353,
            "viewRank": 83693
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 13783,
            "originalId": 13783,
            "coverageWeight": 0.000001,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.74902,
            "viewRank": 74025
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 7410,
            "originalId": 7410,
            "coverageWeight": 0.000001,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.619608,
            "viewRank": 74721
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 16318,
            "originalId": 16318,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.945098,
            "viewRank": 78508
          }
        ],
        "droppedByPolicySamples": [
          {
            "tileIndex": 5206,
            "tileX": 54,
            "tileY": 46,
            "splatIndex": 7989,
            "originalId": 7989,
            "coverageWeight": 0.000725,
            "retentionWeight": 0.000033,
            "occlusionWeight": 0.000108,
            "occlusionDensity": 0.14902,
            "viewRank": 73010
          },
          {
            "tileIndex": 5206,
            "tileX": 54,
            "tileY": 46,
            "splatIndex": 74488,
            "originalId": 74488,
            "coverageWeight": 0.000453,
            "retentionWeight": 0.000029,
            "occlusionWeight": 0.000059,
            "occlusionDensity": 0.129412,
            "viewRank": 76375
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 62091,
            "originalId": 62091,
            "coverageWeight": 0.014098,
            "retentionWeight": 0.0017,
            "occlusionWeight": 0.002433,
            "occlusionDensity": 0.172549,
            "viewRank": 62714
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 15399,
            "originalId": 15399,
            "coverageWeight": 0.008558,
            "retentionWeight": 0.000854,
            "occlusionWeight": 0.001342,
            "occlusionDensity": 0.156863,
            "viewRank": 71195
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 57896,
            "originalId": 57896,
            "coverageWeight": 0.002906,
            "retentionWeight": 0.000339,
            "occlusionWeight": 0.000467,
            "occlusionDensity": 0.160784,
            "viewRank": 61289
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 33615,
            "originalId": 33615,
            "coverageWeight": 0.001487,
            "retentionWeight": 0.000142,
            "occlusionWeight": 0.000198,
            "occlusionDensity": 0.133333,
            "viewRank": 63664
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 35749,
            "originalId": 35749,
            "coverageWeight": 0.001331,
            "retentionWeight": 0.0002,
            "occlusionWeight": 0.000318,
            "occlusionDensity": 0.239216,
            "viewRank": 73757
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 62973,
            "originalId": 62973,
            "coverageWeight": 0.000555,
            "retentionWeight": 0.000072,
            "occlusionWeight": 0.000109,
            "occlusionDensity": 0.196078,
            "viewRank": 69895
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 39329,
            "originalId": 39329,
            "coverageWeight": 0.000323,
            "retentionWeight": 0.000051,
            "occlusionWeight": 0.000075,
            "occlusionDensity": 0.231373,
            "viewRank": 73065
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 61253,
            "originalId": 61253,
            "coverageWeight": 0.000272,
            "retentionWeight": 0.00003,
            "occlusionWeight": 0.00005,
            "occlusionDensity": 0.184314,
            "viewRank": 68792
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 7989,
            "originalId": 7989,
            "coverageWeight": 0.000258,
            "retentionWeight": 0.000012,
            "occlusionWeight": 0.000039,
            "occlusionDensity": 0.14902,
            "viewRank": 73010
          },
          {
            "tileIndex": 5313,
            "tileX": 49,
            "tileY": 47,
            "splatIndex": 29636,
            "originalId": 29636,
            "coverageWeight": 0.000242,
            "retentionWeight": 0.000033,
            "occlusionWeight": 0.000047,
            "occlusionDensity": 0.192157,
            "viewRank": 72484
          }
        ]
      },
      "regions": {
        "porousBody": {
          "region": "porous-body",
          "tileCount": 500,
          "cappedTileCount": 369,
          "projectedTileEntryCount": 1229246,
          "currentRetainedEntryCount": 109143,
          "legacyRetainedEntryCount": 109143,
          "addedByPolicyCount": 36312,
          "droppedByPolicyCount": 36312,
          "addedRetentionWeightSum": 636.093236,
          "droppedRetentionWeightSum": 1677.837081,
          "addedOcclusionWeightSum": 1003.593432,
          "droppedOcclusionWeightSum": 3031.644527,
          "addedByPolicySamples": [
            {
              "tileIndex": 5206,
              "tileX": 54,
              "tileY": 46,
              "splatIndex": 38595,
              "originalId": 38595,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.862745,
              "viewRank": 70101
            },
            {
              "tileIndex": 5206,
              "tileX": 54,
              "tileY": 46,
              "splatIndex": 40325,
              "originalId": 40325,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.654902,
              "viewRank": 73395
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 13168,
              "originalId": 13168,
              "coverageWeight": 0.000003,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.956863,
              "viewRank": 29125
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 38091,
              "originalId": 38091,
              "coverageWeight": 0.000003,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.666667,
              "viewRank": 65655
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 12778,
              "originalId": 12778,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.87451,
              "viewRank": 46327
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 29005,
              "originalId": 29005,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.764706,
              "viewRank": 75427
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 19852,
              "originalId": 19852,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.713726,
              "viewRank": 75347
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 5579,
              "originalId": 5579,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.764706,
              "viewRank": 45265
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 91026,
              "originalId": 91026,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.682353,
              "viewRank": 83693
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 13783,
              "originalId": 13783,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.74902,
              "viewRank": 74025
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 7410,
              "originalId": 7410,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.619608,
              "viewRank": 74721
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 16318,
              "originalId": 16318,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.945098,
              "viewRank": 78508
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 5206,
              "tileX": 54,
              "tileY": 46,
              "splatIndex": 7989,
              "originalId": 7989,
              "coverageWeight": 0.000725,
              "retentionWeight": 0.000033,
              "occlusionWeight": 0.000108,
              "occlusionDensity": 0.14902,
              "viewRank": 73010
            },
            {
              "tileIndex": 5206,
              "tileX": 54,
              "tileY": 46,
              "splatIndex": 74488,
              "originalId": 74488,
              "coverageWeight": 0.000453,
              "retentionWeight": 0.000029,
              "occlusionWeight": 0.000059,
              "occlusionDensity": 0.129412,
              "viewRank": 76375
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 62091,
              "originalId": 62091,
              "coverageWeight": 0.014098,
              "retentionWeight": 0.0017,
              "occlusionWeight": 0.002433,
              "occlusionDensity": 0.172549,
              "viewRank": 62714
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 15399,
              "originalId": 15399,
              "coverageWeight": 0.008558,
              "retentionWeight": 0.000854,
              "occlusionWeight": 0.001342,
              "occlusionDensity": 0.156863,
              "viewRank": 71195
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 57896,
              "originalId": 57896,
              "coverageWeight": 0.002906,
              "retentionWeight": 0.000339,
              "occlusionWeight": 0.000467,
              "occlusionDensity": 0.160784,
              "viewRank": 61289
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 33615,
              "originalId": 33615,
              "coverageWeight": 0.001487,
              "retentionWeight": 0.000142,
              "occlusionWeight": 0.000198,
              "occlusionDensity": 0.133333,
              "viewRank": 63664
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 35749,
              "originalId": 35749,
              "coverageWeight": 0.001331,
              "retentionWeight": 0.0002,
              "occlusionWeight": 0.000318,
              "occlusionDensity": 0.239216,
              "viewRank": 73757
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 62973,
              "originalId": 62973,
              "coverageWeight": 0.000555,
              "retentionWeight": 0.000072,
              "occlusionWeight": 0.000109,
              "occlusionDensity": 0.196078,
              "viewRank": 69895
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 39329,
              "originalId": 39329,
              "coverageWeight": 0.000323,
              "retentionWeight": 0.000051,
              "occlusionWeight": 0.000075,
              "occlusionDensity": 0.231373,
              "viewRank": 73065
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 61253,
              "originalId": 61253,
              "coverageWeight": 0.000272,
              "retentionWeight": 0.00003,
              "occlusionWeight": 0.00005,
              "occlusionDensity": 0.184314,
              "viewRank": 68792
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 7989,
              "originalId": 7989,
              "coverageWeight": 0.000258,
              "retentionWeight": 0.000012,
              "occlusionWeight": 0.000039,
              "occlusionDensity": 0.14902,
              "viewRank": 73010
            },
            {
              "tileIndex": 5313,
              "tileX": 49,
              "tileY": 47,
              "splatIndex": 29636,
              "originalId": 29636,
              "coverageWeight": 0.000242,
              "retentionWeight": 0.000033,
              "occlusionWeight": 0.000047,
              "occlusionDensity": 0.192157,
              "viewRank": 72484
            }
          ]
        },
        "centerLeakBand": {
          "region": "center-leak-band",
          "tileCount": 858,
          "cappedTileCount": 803,
          "projectedTileEntryCount": 2790722,
          "currentRetainedEntryCount": 212863,
          "legacyRetainedEntryCount": 212863,
          "addedByPolicyCount": 86565,
          "droppedByPolicyCount": 86565,
          "addedRetentionWeightSum": 1826.881999,
          "droppedRetentionWeightSum": 3996.298623,
          "addedOcclusionWeightSum": 2657.11173,
          "droppedOcclusionWeightSum": 7667.830248,
          "addedByPolicySamples": [
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 66075,
              "originalId": 66075,
              "coverageWeight": 0.000003,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.823529,
              "viewRank": 23887
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 59325,
              "originalId": 59325,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.772549,
              "viewRank": 32212
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 61033,
              "originalId": 61033,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.890196,
              "viewRank": 74678
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 18236,
              "originalId": 18236,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.839216,
              "viewRank": 74305
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 12701,
              "originalId": 12701,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.835294,
              "viewRank": 50130
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 4002,
              "originalId": 4002,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.764706,
              "viewRank": 94234
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 85410,
              "originalId": 85410,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.901961,
              "viewRank": 41649
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 43136,
              "originalId": 43136,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.796078,
              "viewRank": 83235
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 64588,
              "originalId": 64588,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.960784,
              "viewRank": 72250
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 13783,
              "originalId": 13783,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.74902,
              "viewRank": 74025
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 41590,
              "originalId": 41590,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.988235,
              "viewRank": 77187
            },
            {
              "tileIndex": 5645,
              "tileX": 45,
              "tileY": 50,
              "splatIndex": 76984,
              "originalId": 76984,
              "coverageWeight": 0.000131,
              "retentionWeight": 0.000032,
              "occlusionWeight": 0.000125,
              "occlusionDensity": 0.952941,
              "viewRank": 71014
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 29636,
              "originalId": 29636,
              "coverageWeight": 0.003239,
              "retentionWeight": 0.000436,
              "occlusionWeight": 0.000622,
              "occlusionDensity": 0.192157,
              "viewRank": 72484
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 15335,
              "originalId": 15335,
              "coverageWeight": 0.002295,
              "retentionWeight": 0.000374,
              "occlusionWeight": 0.000522,
              "occlusionDensity": 0.227451,
              "viewRank": 70811
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 29670,
              "originalId": 29670,
              "coverageWeight": 0.001212,
              "retentionWeight": 0.000171,
              "occlusionWeight": 0.000261,
              "occlusionDensity": 0.215686,
              "viewRank": 71995
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 10647,
              "originalId": 10647,
              "coverageWeight": 0.000543,
              "retentionWeight": 0.000037,
              "occlusionWeight": 0.000057,
              "occlusionDensity": 0.105882,
              "viewRank": 77987
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 41528,
              "originalId": 41528,
              "coverageWeight": 0.000508,
              "retentionWeight": 0.00006,
              "occlusionWeight": 0.000107,
              "occlusionDensity": 0.211765,
              "viewRank": 78625
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 78425,
              "originalId": 78425,
              "coverageWeight": 0.000466,
              "retentionWeight": 0.000038,
              "occlusionWeight": 0.000073,
              "occlusionDensity": 0.156863,
              "viewRank": 69314
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 28571,
              "originalId": 28571,
              "coverageWeight": 0.000296,
              "retentionWeight": 0.00004,
              "occlusionWeight": 0.00006,
              "occlusionDensity": 0.203922,
              "viewRank": 69250
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 41579,
              "originalId": 41579,
              "coverageWeight": 0.000293,
              "retentionWeight": 0.000028,
              "occlusionWeight": 0.000052,
              "occlusionDensity": 0.176471,
              "viewRank": 79352
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.000192,
              "retentionWeight": 0.00001,
              "occlusionWeight": 0.000036,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 34803,
              "originalId": 34803,
              "coverageWeight": 0.000005,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.160784,
              "viewRank": 45520
            },
            {
              "tileIndex": 5644,
              "tileX": 44,
              "tileY": 50,
              "splatIndex": 33127,
              "originalId": 33127,
              "coverageWeight": 0.000005,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.317647,
              "viewRank": 37718
            },
            {
              "tileIndex": 5645,
              "tileX": 45,
              "tileY": 50,
              "splatIndex": 61357,
              "originalId": 61357,
              "coverageWeight": 0.008933,
              "retentionWeight": 0.001762,
              "occlusionWeight": 0.002487,
              "occlusionDensity": 0.278431,
              "viewRank": 74647
            }
          ]
        }
      }
    },
    "coverageWeight": {
      "min": 0,
      "max": 16.837622,
      "mean": 0.098971
    },
    "alpha": {
      "maxSourceOpacity": 1,
      "meanSourceOpacity": 0.38901,
      "estimatedMaxAccumulatedAlpha": 1,
      "estimatedMinTransmittance": 0,
      "alphaParamRefs": 393770
    },
    "conicShape": {
      "maxMajorRadiusPx": 152.239229,
      "minMinorRadiusPx": 1.5,
      "maxAnisotropyRatio": 56.637658
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
      "maxAnisotropyRatio": 118.90349485550345,
      "suspiciousSplatCount": 1594,
      "sampleOriginalIds": [
        89,
        90,
        91,
        93,
        102,
        103,
        104,
        105
      ],
      "fieldMaxAnisotropyRatio": 190.56626845863002,
      "fieldSuspiciousSplatCount": 8398,
      "rotationOrderComparison": {
        "wxyz": {
          "rotationOrder": "wxyz",
          "maxProjectedAnisotropyRatio": 118.90349485550345,
          "suspiciousProjectedSplatCount": 1594,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            89,
            90,
            91,
            93,
            102,
            103,
            104,
            105
          ]
        },
        "xyzw": {
          "rotationOrder": "xyzw",
          "maxProjectedAnisotropyRatio": 92.38640026368341,
          "suspiciousProjectedSplatCount": 1513,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            87,
            93,
            131,
            132,
            236,
            237,
            300,
            497
          ]
        }
      },
      "footprint": {
        "maxMajorRadiusPx": 144.91858581393922,
        "maxMinorRadiusPx": 93.7584905289495,
        "maxAreaPx": 38994.93121168008,
        "areaCapPx": 34104.8,
        "majorRadiusCapPx": 1157,
        "highEnergySplatCount": 1,
        "projectedSplatCount": 94406,
        "sampleOriginalIds": [
          92947
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
          "projectedCenterCount": 0,
          "projectedSupportCount": 0,
          "nearFloorMinorCount": 0,
          "maxMajorRadiusPx": 0,
          "medianMajorRadiusPx": 0,
          "medianMinorRadiusPx": 0,
          "supportAreaPxSum": 0,
          "sampleOriginalIds": []
        },
        "porousBody": {
          "crop": {
            "x": 520,
            "y": 270,
            "width": 260,
            "height": 150
          },
          "projectedCenterCount": 0,
          "projectedSupportCount": 0,
          "nearFloorMinorCount": 0,
          "maxMajorRadiusPx": 0,
          "medianMajorRadiusPx": 0,
          "medianMinorRadiusPx": 0,
          "supportAreaPxSum": 0,
          "sampleOriginalIds": []
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
        "maxTileAlphaMass": 620190.6339414512,
        "maxTileSplatCount": 9343,
        "hotTileCount": 162,
        "tileEntryCount": 588544,
        "maxSplatCoveredTileCount": 224,
        "maxCenterTileDroppedCoverageFraction": 0.9999999999999992,
        "sampleOriginalIds": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
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
  "statsText": "1780×1916 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/162 tiles | tile-local: 112x120 tiles/393770 refs | tile-local budget: cap 20,000,000 | per-tile cap 256 | tile-budget: 16px/256 refs | visible-compositor cap: 256 refs | tile-order: gpu-sorted-index-rank-inversion | arena requested: gpu | arena effective: gpu | arena CPU build: 24370.000ms | arena GPU dispatch: 0.000ms",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "1780×1916 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/162 tiles | tile-local: 112x120 tiles/393770 refs | tile-local budget: cap 20,000,000 | per-tile cap 256 | tile-budget: 16px/256 refs | visible-compositor cap: 256 refs | tile-order: gpu-sorted-index-rank-inversion | arena requested: gpu | arena effective: gpu | arena CPU build: 24370.000ms | arena GPU dispatch: 0.000ms",
  "canvas": {
    "width": 1780,
    "height": 1916,
    "clientWidth": 1780,
    "clientHeight": 1916
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
    }
  ],
  "pageErrors": []
}
```
