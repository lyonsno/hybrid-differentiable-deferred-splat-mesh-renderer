# Visual Smoke Report

- Status: PASS
- Generated: 2026-05-08T21:42:17.612Z
- URL: http://127.0.0.1:61618/?renderer=tile-local-visible&arenaBackend=gpu
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Image Evidence

- Canvas PNG: 1280x720
- Nonblank: true
- Changed pixels: 39051 / 921600 (4.237%)
- Average background delta: 4.09
- Distinct colors: 28531

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
    "changedPixelRatio": 0.042373046875
  },
  "findings": [
    {
      "kind": "projection-anisotropy",
      "owner": "conic-reckoner",
      "severity": "suspect",
      "summary": "Projection anisotropy witness found ratio 70.33 across 1174 splats; route to conic-reckoner after field metadata is canonical.",
      "evidence": {
        "maxAnisotropyRatio": 70.32900677284606,
        "suspiciousSplatCount": 1174,
        "sampleOriginalIds": [
          89,
          91,
          102,
          103,
          104,
          105,
          238,
          256
        ],
        "footprint": {
          "maxMajorRadiusPx": 51.362080196886815,
          "maxMinorRadiusPx": 24.028910843904978,
          "maxAreaPx": 3334.11186316797,
          "areaCapPx": 9216,
          "majorRadiusCapPx": 468,
          "highEnergySplatCount": 0,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": []
        }
      }
    },
    {
      "kind": "compositing-ambiguous",
      "owner": "alpha-ledger",
      "severity": "suspect",
      "summary": "Alpha density witness found 23 hot tiles with max mass 246902.52.",
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
          "maxTileAlphaMass": 246902.51990515858,
          "maxTileSplatCount": 16646,
          "hotTileCount": 23,
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
    "effectiveArenaBackend": "cpu",
    "cpuBuildDurationMs": 10076.7,
    "unavailableReason": "gpu arena runtime requires a retention adapter before cap-pressure scenes can bypass the CPU retained list"
  },
  "tileLocal": {
    "status": "current",
    "refs": 77221,
    "allocatedRefs": 94406,
    "tileColumns": 214,
    "tileRows": 120,
    "orderingBackend": "gpu-sorted-index-rank-inversion",
    "debugMode": "final-color",
    "freshness": {
      "status": "current",
      "cachedFrameAgeMs": 0,
      "cachedFrame": 1,
      "currentFrameSignature": "tile-local@51dadc24",
      "cachedFrameSignature": "tile-local@51dadc24"
    },
    "budget": {
      "status": "current",
      "tileSizePx": 6,
      "currentViewportWidth": 1280,
      "currentViewportHeight": 720,
      "currentTileColumns": 214,
      "currentTileRows": 120,
      "maxProjectedRefs": 20000000,
      "overflowReasons": []
    },
    "budgetDiagnostics": {
      "version": 1,
      "arenaRefs": {
        "projected": 3286010,
        "retained": 77221,
        "dropped": 3208789,
        "cappedTileCount": 1937,
        "saturatedRetainedTileCount": 1952,
        "maxProjectedRefsPerTile": 7231,
        "maxRetainedRefsPerTile": 32
      },
      "overflowReasons": [
        {
          "reason": "per-tile-ref-cap",
          "projectedRefs": 3286010,
          "retainedRefs": 77221,
          "droppedRefs": 3208789,
          "cappedTileCount": 1937,
          "maxRefsPerTile": 32
        }
      ],
      "capPressure": {
        "version": 1,
        "classification": "over-cap",
        "refs": {
          "projected": 3286010,
          "retained": 77221,
          "dropped": 3208789,
          "maxRefsPerTile": 32,
          "tileCount": 25680
        },
        "retainedBands": {
          "front": {
            "total": 24881,
            "coverageHigh": 3399,
            "coverageMedium": 3229,
            "coverageLow": 18253
          },
          "middle": {
            "total": 41330,
            "coverageHigh": 2606,
            "coverageMedium": 3295,
            "coverageLow": 35429
          },
          "back": {
            "total": 11010,
            "coverageHigh": 325,
            "coverageMedium": 821,
            "coverageLow": 9864
          }
        },
        "droppedBands": {
          "front": {
            "total": 951766,
            "coverageHigh": 5851,
            "coverageMedium": 26617,
            "coverageLow": 919298
          },
          "middle": {
            "total": 1607527,
            "coverageHigh": 4101,
            "coverageMedium": 28525,
            "coverageLow": 1574901
          },
          "back": {
            "total": 649496,
            "coverageHigh": 477,
            "coverageMedium": 4700,
            "coverageLow": 644319
          }
        },
        "overflowReasons": {
          "none": 77221,
          "perTileRetainedCap": 0,
          "perTileRetainedCapPolicyReserve": 26300,
          "perTileRetainedCapForegroundBand": 942216,
          "perTileRetainedCapMiddleBand": 1593328,
          "perTileRetainedCapBehindSurfaceBand": 646945
        },
        "lossSignals": {
          "foregroundDroppedRefs": 951766,
          "behindSurfaceDroppedRefs": 649496,
          "policyReserveDisplacedRefs": 26300,
          "highCoverageDroppedRefs": 10429,
          "highRetentionDroppedRefs": 184,
          "highOcclusionDroppedRefs": 894
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
          "total": 24881,
          "coverageHigh": 3399,
          "coverageMedium": 3229,
          "coverageLow": 18253
        },
        "middle": {
          "total": 41330,
          "coverageHigh": 2606,
          "coverageMedium": 3295,
          "coverageLow": 35429
        },
        "back": {
          "total": 11010,
          "coverageHigh": 325,
          "coverageMedium": 821,
          "coverageLow": 9864
        }
      },
      "droppedBands": {
        "front": {
          "total": 951766,
          "coverageHigh": 5851,
          "coverageMedium": 26617,
          "coverageLow": 919298
        },
        "middle": {
          "total": 1607527,
          "coverageHigh": 4101,
          "coverageMedium": 28525,
          "coverageLow": 1574901
        },
        "back": {
          "total": 649496,
          "coverageHigh": 477,
          "coverageMedium": 4700,
          "coverageLow": 644319
        }
      },
      "heat": {
        "cpu": {
          "projectedRefs": 3286010,
          "projectedRefsPerTile": 127.959891,
          "projectedToRetainedRatio": 42.553321,
          "buildDurationMs": 10076.7
        },
        "gpu": {
          "retainedRefs": 77221,
          "retainedRefBufferBytes": 1235536,
          "coverageWeightBufferBytes": 308884,
          "alphaParamBufferBytes": 3020992,
          "orderingKeyBufferBytes": 377624
        }
      }
    },
    "diagnostics": {
      "version": 1,
      "debugMode": "final-color",
      "tileGrid": {
        "columns": 214,
        "rows": 120,
        "tileSizePx": 6
      },
      "tileRefs": {
        "total": 77221,
        "nonEmptyTiles": 3811,
        "maxPerTile": 32,
        "averagePerNonEmptyTile": 20.262661,
        "density": 0.148403
      },
      "tileRefCustody": {
        "projectedTileEntryCount": 3286010,
        "retainedTileEntryCount": 77221,
        "evictedTileEntryCount": 3208789,
        "cappedTileCount": 1937,
        "saturatedRetainedTileCount": 1952,
        "maxProjectedRefsPerTile": 7231,
        "maxRetainedRefsPerTile": 32,
        "headerRefCount": 77221,
        "headerAccountingMatches": true
      },
      "retentionAudit": {
        "fullFrame": {
          "region": "full-frame",
          "tileCount": 3811,
          "cappedTileCount": 1937,
          "projectedTileEntryCount": 3286010,
          "currentRetainedEntryCount": 77221,
          "legacyRetainedEntryCount": 77221,
          "addedByPolicyCount": 26300,
          "droppedByPolicyCount": 26300,
          "addedRetentionWeightSum": 1463.320638,
          "droppedRetentionWeightSum": 1422.35818,
          "addedOcclusionWeightSum": 2102.808348,
          "droppedOcclusionWeightSum": 2759.815876,
          "addedByPolicySamples": [
            {
              "tileIndex": 9089,
              "tileX": 101,
              "tileY": 42,
              "splatIndex": 67782,
              "originalId": 67782,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.368627,
              "viewRank": 57525
            },
            {
              "tileIndex": 9090,
              "tileX": 102,
              "tileY": 42,
              "splatIndex": 65565,
              "originalId": 65565,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.635294,
              "viewRank": 41263
            },
            {
              "tileIndex": 9091,
              "tileX": 103,
              "tileY": 42,
              "splatIndex": 91077,
              "originalId": 91077,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.682353,
              "viewRank": 64255
            },
            {
              "tileIndex": 9091,
              "tileX": 103,
              "tileY": 42,
              "splatIndex": 65565,
              "originalId": 65565,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.635294,
              "viewRank": 41263
            },
            {
              "tileIndex": 9092,
              "tileX": 104,
              "tileY": 42,
              "splatIndex": 91077,
              "originalId": 91077,
              "coverageWeight": 0.000002,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.682353,
              "viewRank": 64255
            },
            {
              "tileIndex": 9092,
              "tileX": 104,
              "tileY": 42,
              "splatIndex": 18284,
              "originalId": 18284,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.568628,
              "viewRank": 62689
            },
            {
              "tileIndex": 9092,
              "tileX": 104,
              "tileY": 42,
              "splatIndex": 65565,
              "originalId": 65565,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.635294,
              "viewRank": 41263
            },
            {
              "tileIndex": 9093,
              "tileX": 105,
              "tileY": 42,
              "splatIndex": 1753,
              "originalId": 1753,
              "coverageWeight": 0.000012,
              "retentionWeight": 0.000005,
              "occlusionWeight": 0.000009,
              "occlusionDensity": 0.737255,
              "viewRank": 73939
            },
            {
              "tileIndex": 9093,
              "tileX": 105,
              "tileY": 42,
              "splatIndex": 91077,
              "originalId": 91077,
              "coverageWeight": 0.000008,
              "retentionWeight": 0.000002,
              "occlusionWeight": 0.000005,
              "occlusionDensity": 0.682353,
              "viewRank": 64255
            },
            {
              "tileIndex": 9093,
              "tileX": 105,
              "tileY": 42,
              "splatIndex": 65565,
              "originalId": 65565,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.635294,
              "viewRank": 41263
            },
            {
              "tileIndex": 9093,
              "tileX": 105,
              "tileY": 42,
              "splatIndex": 8133,
              "originalId": 8133,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.588235,
              "viewRank": 57696
            },
            {
              "tileIndex": 9094,
              "tileX": 106,
              "tileY": 42,
              "splatIndex": 77907,
              "originalId": 77907,
              "coverageWeight": 0.000004,
              "retentionWeight": 0.000002,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.72549,
              "viewRank": 76697
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 9089,
              "tileX": 101,
              "tileY": 42,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.000028,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000005,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 9090,
              "tileX": 102,
              "tileY": 42,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.000037,
              "retentionWeight": 0.000002,
              "occlusionWeight": 0.000007,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 9091,
              "tileX": 103,
              "tileY": 42,
              "splatIndex": 92475,
              "originalId": 92475,
              "coverageWeight": 0.000055,
              "retentionWeight": 0.00001,
              "occlusionWeight": 0.000014,
              "occlusionDensity": 0.25098,
              "viewRank": 48904
            },
            {
              "tileIndex": 9091,
              "tileX": 103,
              "tileY": 42,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.000046,
              "retentionWeight": 0.000002,
              "occlusionWeight": 0.000009,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 9092,
              "tileX": 104,
              "tileY": 42,
              "splatIndex": 85430,
              "originalId": 85430,
              "coverageWeight": 0.000109,
              "retentionWeight": 0.000012,
              "occlusionWeight": 0.000035,
              "occlusionDensity": 0.321569,
              "viewRank": 62557
            },
            {
              "tileIndex": 9092,
              "tileX": 104,
              "tileY": 42,
              "splatIndex": 92475,
              "originalId": 92475,
              "coverageWeight": 0.0001,
              "retentionWeight": 0.000018,
              "occlusionWeight": 0.000025,
              "occlusionDensity": 0.25098,
              "viewRank": 48904
            },
            {
              "tileIndex": 9092,
              "tileX": 104,
              "tileY": 42,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.000053,
              "retentionWeight": 0.000003,
              "occlusionWeight": 0.00001,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 9093,
              "tileX": 105,
              "tileY": 42,
              "splatIndex": 92475,
              "originalId": 92475,
              "coverageWeight": 0.000148,
              "retentionWeight": 0.000027,
              "occlusionWeight": 0.000037,
              "occlusionDensity": 0.25098,
              "viewRank": 48904
            },
            {
              "tileIndex": 9093,
              "tileX": 105,
              "tileY": 42,
              "splatIndex": 85430,
              "originalId": 85430,
              "coverageWeight": 0.00014,
              "retentionWeight": 0.000015,
              "occlusionWeight": 0.000045,
              "occlusionDensity": 0.321569,
              "viewRank": 62557
            },
            {
              "tileIndex": 9093,
              "tileX": 105,
              "tileY": 42,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.000058,
              "retentionWeight": 0.000003,
              "occlusionWeight": 0.000011,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 9093,
              "tileX": 105,
              "tileY": 42,
              "splatIndex": 7453,
              "originalId": 7453,
              "coverageWeight": 0.000012,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000004,
              "occlusionDensity": 0.337255,
              "viewRank": 68640
            },
            {
              "tileIndex": 9094,
              "tileX": 106,
              "tileY": 42,
              "splatIndex": 92475,
              "originalId": 92475,
              "coverageWeight": 0.00018,
              "retentionWeight": 0.000032,
              "occlusionWeight": 0.000045,
              "occlusionDensity": 0.25098,
              "viewRank": 48904
            }
          ]
        },
        "regions": {
          "porousBody": {
            "region": "porous-body",
            "tileCount": 909,
            "cappedTileCount": 791,
            "projectedTileEntryCount": 1569835,
            "currentRetainedEntryCount": 27057,
            "legacyRetainedEntryCount": 27057,
            "addedByPolicyCount": 10719,
            "droppedByPolicyCount": 10719,
            "addedRetentionWeightSum": 595.618308,
            "droppedRetentionWeightSum": 701.933993,
            "addedOcclusionWeightSum": 936.54106,
            "droppedOcclusionWeightSum": 1290.47025,
            "addedByPolicySamples": [
              {
                "tileIndex": 9298,
                "tileX": 96,
                "tileY": 43,
                "splatIndex": 7494,
                "originalId": 7494,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.423529,
                "viewRank": 65552
              },
              {
                "tileIndex": 9299,
                "tileX": 97,
                "tileY": 43,
                "splatIndex": 80810,
                "originalId": 80810,
                "coverageWeight": 0.000002,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000002,
                "occlusionDensity": 0.815686,
                "viewRank": 68274
              },
              {
                "tileIndex": 9299,
                "tileX": 97,
                "tileY": 43,
                "splatIndex": 59019,
                "originalId": 59019,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.905882,
                "viewRank": 52112
              },
              {
                "tileIndex": 9299,
                "tileX": 97,
                "tileY": 43,
                "splatIndex": 6331,
                "originalId": 6331,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.556863,
                "viewRank": 77793
              },
              {
                "tileIndex": 9300,
                "tileX": 98,
                "tileY": 43,
                "splatIndex": 85417,
                "originalId": 85417,
                "coverageWeight": 0.000003,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000002,
                "occlusionDensity": 0.741176,
                "viewRank": 36183
              },
              {
                "tileIndex": 9300,
                "tileX": 98,
                "tileY": 43,
                "splatIndex": 59019,
                "originalId": 59019,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.905882,
                "viewRank": 52112
              },
              {
                "tileIndex": 9300,
                "tileX": 98,
                "tileY": 43,
                "splatIndex": 60002,
                "originalId": 60002,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.662745,
                "viewRank": 64561
              },
              {
                "tileIndex": 9300,
                "tileX": 98,
                "tileY": 43,
                "splatIndex": 6331,
                "originalId": 6331,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.556863,
                "viewRank": 77793
              },
              {
                "tileIndex": 9301,
                "tileX": 99,
                "tileY": 43,
                "splatIndex": 85417,
                "originalId": 85417,
                "coverageWeight": 0.000004,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000003,
                "occlusionDensity": 0.741176,
                "viewRank": 36183
              },
              {
                "tileIndex": 9301,
                "tileX": 99,
                "tileY": 43,
                "splatIndex": 60002,
                "originalId": 60002,
                "coverageWeight": 0.000002,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.662745,
                "viewRank": 64561
              },
              {
                "tileIndex": 9301,
                "tileX": 99,
                "tileY": 43,
                "splatIndex": 59019,
                "originalId": 59019,
                "coverageWeight": 0.000002,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.905882,
                "viewRank": 52112
              },
              {
                "tileIndex": 9301,
                "tileX": 99,
                "tileY": 43,
                "splatIndex": 28980,
                "originalId": 28980,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.898039,
                "viewRank": 61799
              }
            ],
            "droppedByPolicySamples": [
              {
                "tileIndex": 9298,
                "tileX": 96,
                "tileY": 43,
                "splatIndex": 61313,
                "originalId": 61313,
                "coverageWeight": 0.000006,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.188235,
                "viewRank": 90574
              },
              {
                "tileIndex": 9299,
                "tileX": 97,
                "tileY": 43,
                "splatIndex": 83017,
                "originalId": 83017,
                "coverageWeight": 0.000316,
                "retentionWeight": 0.000034,
                "occlusionWeight": 0.000081,
                "occlusionDensity": 0.254902,
                "viewRank": 74026
              },
              {
                "tileIndex": 9299,
                "tileX": 97,
                "tileY": 43,
                "splatIndex": 61313,
                "originalId": 61313,
                "coverageWeight": 0.00001,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000002,
                "occlusionDensity": 0.188235,
                "viewRank": 90574
              },
              {
                "tileIndex": 9299,
                "tileX": 97,
                "tileY": 43,
                "splatIndex": 85430,
                "originalId": 85430,
                "coverageWeight": 0.000009,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000003,
                "occlusionDensity": 0.321569,
                "viewRank": 62557
              },
              {
                "tileIndex": 9300,
                "tileX": 98,
                "tileY": 43,
                "splatIndex": 62091,
                "originalId": 62091,
                "coverageWeight": 0.000453,
                "retentionWeight": 0.000055,
                "occlusionWeight": 0.000078,
                "occlusionDensity": 0.172549,
                "viewRank": 62714
              },
              {
                "tileIndex": 9300,
                "tileX": 98,
                "tileY": 43,
                "splatIndex": 83017,
                "originalId": 83017,
                "coverageWeight": 0.000314,
                "retentionWeight": 0.000033,
                "occlusionWeight": 0.00008,
                "occlusionDensity": 0.254902,
                "viewRank": 74026
              },
              {
                "tileIndex": 9300,
                "tileX": 98,
                "tileY": 43,
                "splatIndex": 33947,
                "originalId": 33947,
                "coverageWeight": 0.000043,
                "retentionWeight": 0.000011,
                "occlusionWeight": 0.000017,
                "occlusionDensity": 0.392157,
                "viewRank": 71883
              },
              {
                "tileIndex": 9300,
                "tileX": 98,
                "tileY": 43,
                "splatIndex": 39626,
                "originalId": 39626,
                "coverageWeight": 0.000027,
                "retentionWeight": 0.000004,
                "occlusionWeight": 0.000009,
                "occlusionDensity": 0.34902,
                "viewRank": 79033
              },
              {
                "tileIndex": 9301,
                "tileX": 99,
                "tileY": 43,
                "splatIndex": 62091,
                "originalId": 62091,
                "coverageWeight": 0.000698,
                "retentionWeight": 0.000084,
                "occlusionWeight": 0.00012,
                "occlusionDensity": 0.172549,
                "viewRank": 62714
              },
              {
                "tileIndex": 9301,
                "tileX": 99,
                "tileY": 43,
                "splatIndex": 83017,
                "originalId": 83017,
                "coverageWeight": 0.000273,
                "retentionWeight": 0.000029,
                "occlusionWeight": 0.00007,
                "occlusionDensity": 0.254902,
                "viewRank": 74026
              },
              {
                "tileIndex": 9301,
                "tileX": 99,
                "tileY": 43,
                "splatIndex": 33947,
                "originalId": 33947,
                "coverageWeight": 0.000146,
                "retentionWeight": 0.000039,
                "occlusionWeight": 0.000057,
                "occlusionDensity": 0.392157,
                "viewRank": 71883
              },
              {
                "tileIndex": 9301,
                "tileX": 99,
                "tileY": 43,
                "splatIndex": 39626,
                "originalId": 39626,
                "coverageWeight": 0.000142,
                "retentionWeight": 0.000019,
                "occlusionWeight": 0.00005,
                "occlusionDensity": 0.34902,
                "viewRank": 79033
              }
            ]
          },
          "centerLeakBand": {
            "region": "center-leak-band",
            "tileCount": 1604,
            "cappedTileCount": 1267,
            "projectedTileEntryCount": 3131729,
            "currentRetainedEntryCount": 44335,
            "legacyRetainedEntryCount": 44335,
            "addedByPolicyCount": 18451,
            "droppedByPolicyCount": 18451,
            "addedRetentionWeightSum": 1458.811149,
            "droppedRetentionWeightSum": 1418.107675,
            "addedOcclusionWeightSum": 2095.692274,
            "droppedOcclusionWeightSum": 2745.677287,
            "addedByPolicySamples": [
              {
                "tileIndex": 10786,
                "tileX": 86,
                "tileY": 50,
                "splatIndex": 37927,
                "originalId": 37927,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.980392,
                "viewRank": 56389
              },
              {
                "tileIndex": 10786,
                "tileX": 86,
                "tileY": 50,
                "splatIndex": 93749,
                "originalId": 93749,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.976471,
                "viewRank": 68135
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 88398,
                "originalId": 88398,
                "coverageWeight": 0.000006,
                "retentionWeight": 0.000003,
                "occlusionWeight": 0.000004,
                "occlusionDensity": 0.686275,
                "viewRank": 52122
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 78880,
                "originalId": 78880,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.933333,
                "viewRank": 72082
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 78446,
                "originalId": 78446,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.996078,
                "viewRank": 68583
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 37927,
                "originalId": 37927,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.980392,
                "viewRank": 56389
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 93749,
                "originalId": 93749,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.976471,
                "viewRank": 68135
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 82936,
                "originalId": 82936,
                "coverageWeight": 0.000042,
                "retentionWeight": 0.000017,
                "occlusionWeight": 0.000039,
                "occlusionDensity": 0.92549,
                "viewRank": 74976
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 76984,
                "originalId": 76984,
                "coverageWeight": 0.000025,
                "retentionWeight": 0.000006,
                "occlusionWeight": 0.000024,
                "occlusionDensity": 0.952941,
                "viewRank": 71014
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 56457,
                "originalId": 56457,
                "coverageWeight": 0.000003,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000003,
                "occlusionDensity": 0.972549,
                "viewRank": 38772
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 78880,
                "originalId": 78880,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.933333,
                "viewRank": 72082
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 78446,
                "originalId": 78446,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.996078,
                "viewRank": 68583
              }
            ],
            "droppedByPolicySamples": [
              {
                "tileIndex": 10786,
                "tileX": 86,
                "tileY": 50,
                "splatIndex": 78425,
                "originalId": 78425,
                "coverageWeight": 0.000001,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.156863,
                "viewRank": 69314
              },
              {
                "tileIndex": 10786,
                "tileX": 86,
                "tileY": 50,
                "splatIndex": 61313,
                "originalId": 61313,
                "coverageWeight": 0,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.188235,
                "viewRank": 90574
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 91629,
                "originalId": 91629,
                "coverageWeight": 0.000534,
                "retentionWeight": 0.000147,
                "occlusionWeight": 0.000201,
                "occlusionDensity": 0.376471,
                "viewRank": 65574
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 12246,
                "originalId": 12246,
                "coverageWeight": 0.000067,
                "retentionWeight": 0.000011,
                "occlusionWeight": 0.000016,
                "occlusionDensity": 0.235294,
                "viewRank": 72124
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 29074,
                "originalId": 29074,
                "coverageWeight": 0.000067,
                "retentionWeight": 0.000019,
                "occlusionWeight": 0.000026,
                "occlusionDensity": 0.388235,
                "viewRank": 62933
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 91858,
                "originalId": 91858,
                "coverageWeight": 0.000013,
                "retentionWeight": 0.000003,
                "occlusionWeight": 0.000003,
                "occlusionDensity": 0.270588,
                "viewRank": 59952
              },
              {
                "tileIndex": 10787,
                "tileX": 87,
                "tileY": 50,
                "splatIndex": 45846,
                "originalId": 45846,
                "coverageWeight": 0.000007,
                "retentionWeight": 0.000002,
                "occlusionWeight": 0.000006,
                "occlusionDensity": 0.878431,
                "viewRank": 86031
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 91629,
                "originalId": 91629,
                "coverageWeight": 0.000954,
                "retentionWeight": 0.000262,
                "occlusionWeight": 0.000359,
                "occlusionDensity": 0.376471,
                "viewRank": 65574
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 92947,
                "originalId": 92947,
                "coverageWeight": 0.00039,
                "retentionWeight": 0.000097,
                "occlusionWeight": 0.000203,
                "occlusionDensity": 0.521569,
                "viewRank": 47516
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 38865,
                "originalId": 38865,
                "coverageWeight": 0.000235,
                "retentionWeight": 0.000062,
                "occlusionWeight": 0.000092,
                "occlusionDensity": 0.392157,
                "viewRank": 76054
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 12246,
                "originalId": 12246,
                "coverageWeight": 0.000138,
                "retentionWeight": 0.000023,
                "occlusionWeight": 0.000032,
                "occlusionDensity": 0.235294,
                "viewRank": 72124
              },
              {
                "tileIndex": 10788,
                "tileX": 88,
                "tileY": 50,
                "splatIndex": 772,
                "originalId": 772,
                "coverageWeight": 0.000105,
                "retentionWeight": 0.000025,
                "occlusionWeight": 0.000036,
                "occlusionDensity": 0.345098,
                "viewRank": 75759
              }
            ]
          }
        }
      },
      "coverageWeight": {
        "min": 0,
        "max": 2.545029,
        "mean": 0.130771
      },
      "alpha": {
        "maxSourceOpacity": 1,
        "meanSourceOpacity": 0.689004,
        "estimatedMaxAccumulatedAlpha": 1,
        "estimatedMinTransmittance": 0,
        "alphaParamRefs": 94406
      },
      "conicShape": {
        "maxMajorRadiusPx": 57.208888,
        "minMinorRadiusPx": 1.5,
        "maxAnisotropyRatio": 21.418907
      }
    }
  },
  "tileLocalDiagnostics": {
    "version": 1,
    "debugMode": "final-color",
    "tileGrid": {
      "columns": 214,
      "rows": 120,
      "tileSizePx": 6
    },
    "tileRefs": {
      "total": 77221,
      "nonEmptyTiles": 3811,
      "maxPerTile": 32,
      "averagePerNonEmptyTile": 20.262661,
      "density": 0.148403
    },
    "tileRefCustody": {
      "projectedTileEntryCount": 3286010,
      "retainedTileEntryCount": 77221,
      "evictedTileEntryCount": 3208789,
      "cappedTileCount": 1937,
      "saturatedRetainedTileCount": 1952,
      "maxProjectedRefsPerTile": 7231,
      "maxRetainedRefsPerTile": 32,
      "headerRefCount": 77221,
      "headerAccountingMatches": true
    },
    "retentionAudit": {
      "fullFrame": {
        "region": "full-frame",
        "tileCount": 3811,
        "cappedTileCount": 1937,
        "projectedTileEntryCount": 3286010,
        "currentRetainedEntryCount": 77221,
        "legacyRetainedEntryCount": 77221,
        "addedByPolicyCount": 26300,
        "droppedByPolicyCount": 26300,
        "addedRetentionWeightSum": 1463.320638,
        "droppedRetentionWeightSum": 1422.35818,
        "addedOcclusionWeightSum": 2102.808348,
        "droppedOcclusionWeightSum": 2759.815876,
        "addedByPolicySamples": [
          {
            "tileIndex": 9089,
            "tileX": 101,
            "tileY": 42,
            "splatIndex": 67782,
            "originalId": 67782,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.368627,
            "viewRank": 57525
          },
          {
            "tileIndex": 9090,
            "tileX": 102,
            "tileY": 42,
            "splatIndex": 65565,
            "originalId": 65565,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.635294,
            "viewRank": 41263
          },
          {
            "tileIndex": 9091,
            "tileX": 103,
            "tileY": 42,
            "splatIndex": 91077,
            "originalId": 91077,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.682353,
            "viewRank": 64255
          },
          {
            "tileIndex": 9091,
            "tileX": 103,
            "tileY": 42,
            "splatIndex": 65565,
            "originalId": 65565,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.635294,
            "viewRank": 41263
          },
          {
            "tileIndex": 9092,
            "tileX": 104,
            "tileY": 42,
            "splatIndex": 91077,
            "originalId": 91077,
            "coverageWeight": 0.000002,
            "retentionWeight": 0,
            "occlusionWeight": 0.000001,
            "occlusionDensity": 0.682353,
            "viewRank": 64255
          },
          {
            "tileIndex": 9092,
            "tileX": 104,
            "tileY": 42,
            "splatIndex": 18284,
            "originalId": 18284,
            "coverageWeight": 0.000001,
            "retentionWeight": 0,
            "occlusionWeight": 0.000001,
            "occlusionDensity": 0.568628,
            "viewRank": 62689
          },
          {
            "tileIndex": 9092,
            "tileX": 104,
            "tileY": 42,
            "splatIndex": 65565,
            "originalId": 65565,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.635294,
            "viewRank": 41263
          },
          {
            "tileIndex": 9093,
            "tileX": 105,
            "tileY": 42,
            "splatIndex": 1753,
            "originalId": 1753,
            "coverageWeight": 0.000012,
            "retentionWeight": 0.000005,
            "occlusionWeight": 0.000009,
            "occlusionDensity": 0.737255,
            "viewRank": 73939
          },
          {
            "tileIndex": 9093,
            "tileX": 105,
            "tileY": 42,
            "splatIndex": 91077,
            "originalId": 91077,
            "coverageWeight": 0.000008,
            "retentionWeight": 0.000002,
            "occlusionWeight": 0.000005,
            "occlusionDensity": 0.682353,
            "viewRank": 64255
          },
          {
            "tileIndex": 9093,
            "tileX": 105,
            "tileY": 42,
            "splatIndex": 65565,
            "originalId": 65565,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.635294,
            "viewRank": 41263
          },
          {
            "tileIndex": 9093,
            "tileX": 105,
            "tileY": 42,
            "splatIndex": 8133,
            "originalId": 8133,
            "coverageWeight": 0,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.588235,
            "viewRank": 57696
          },
          {
            "tileIndex": 9094,
            "tileX": 106,
            "tileY": 42,
            "splatIndex": 77907,
            "originalId": 77907,
            "coverageWeight": 0.000004,
            "retentionWeight": 0.000002,
            "occlusionWeight": 0.000003,
            "occlusionDensity": 0.72549,
            "viewRank": 76697
          }
        ],
        "droppedByPolicySamples": [
          {
            "tileIndex": 9089,
            "tileX": 101,
            "tileY": 42,
            "splatIndex": 61313,
            "originalId": 61313,
            "coverageWeight": 0.000028,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000005,
            "occlusionDensity": 0.188235,
            "viewRank": 90574
          },
          {
            "tileIndex": 9090,
            "tileX": 102,
            "tileY": 42,
            "splatIndex": 61313,
            "originalId": 61313,
            "coverageWeight": 0.000037,
            "retentionWeight": 0.000002,
            "occlusionWeight": 0.000007,
            "occlusionDensity": 0.188235,
            "viewRank": 90574
          },
          {
            "tileIndex": 9091,
            "tileX": 103,
            "tileY": 42,
            "splatIndex": 92475,
            "originalId": 92475,
            "coverageWeight": 0.000055,
            "retentionWeight": 0.00001,
            "occlusionWeight": 0.000014,
            "occlusionDensity": 0.25098,
            "viewRank": 48904
          },
          {
            "tileIndex": 9091,
            "tileX": 103,
            "tileY": 42,
            "splatIndex": 61313,
            "originalId": 61313,
            "coverageWeight": 0.000046,
            "retentionWeight": 0.000002,
            "occlusionWeight": 0.000009,
            "occlusionDensity": 0.188235,
            "viewRank": 90574
          },
          {
            "tileIndex": 9092,
            "tileX": 104,
            "tileY": 42,
            "splatIndex": 85430,
            "originalId": 85430,
            "coverageWeight": 0.000109,
            "retentionWeight": 0.000012,
            "occlusionWeight": 0.000035,
            "occlusionDensity": 0.321569,
            "viewRank": 62557
          },
          {
            "tileIndex": 9092,
            "tileX": 104,
            "tileY": 42,
            "splatIndex": 92475,
            "originalId": 92475,
            "coverageWeight": 0.0001,
            "retentionWeight": 0.000018,
            "occlusionWeight": 0.000025,
            "occlusionDensity": 0.25098,
            "viewRank": 48904
          },
          {
            "tileIndex": 9092,
            "tileX": 104,
            "tileY": 42,
            "splatIndex": 61313,
            "originalId": 61313,
            "coverageWeight": 0.000053,
            "retentionWeight": 0.000003,
            "occlusionWeight": 0.00001,
            "occlusionDensity": 0.188235,
            "viewRank": 90574
          },
          {
            "tileIndex": 9093,
            "tileX": 105,
            "tileY": 42,
            "splatIndex": 92475,
            "originalId": 92475,
            "coverageWeight": 0.000148,
            "retentionWeight": 0.000027,
            "occlusionWeight": 0.000037,
            "occlusionDensity": 0.25098,
            "viewRank": 48904
          },
          {
            "tileIndex": 9093,
            "tileX": 105,
            "tileY": 42,
            "splatIndex": 85430,
            "originalId": 85430,
            "coverageWeight": 0.00014,
            "retentionWeight": 0.000015,
            "occlusionWeight": 0.000045,
            "occlusionDensity": 0.321569,
            "viewRank": 62557
          },
          {
            "tileIndex": 9093,
            "tileX": 105,
            "tileY": 42,
            "splatIndex": 61313,
            "originalId": 61313,
            "coverageWeight": 0.000058,
            "retentionWeight": 0.000003,
            "occlusionWeight": 0.000011,
            "occlusionDensity": 0.188235,
            "viewRank": 90574
          },
          {
            "tileIndex": 9093,
            "tileX": 105,
            "tileY": 42,
            "splatIndex": 7453,
            "originalId": 7453,
            "coverageWeight": 0.000012,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000004,
            "occlusionDensity": 0.337255,
            "viewRank": 68640
          },
          {
            "tileIndex": 9094,
            "tileX": 106,
            "tileY": 42,
            "splatIndex": 92475,
            "originalId": 92475,
            "coverageWeight": 0.00018,
            "retentionWeight": 0.000032,
            "occlusionWeight": 0.000045,
            "occlusionDensity": 0.25098,
            "viewRank": 48904
          }
        ]
      },
      "regions": {
        "porousBody": {
          "region": "porous-body",
          "tileCount": 909,
          "cappedTileCount": 791,
          "projectedTileEntryCount": 1569835,
          "currentRetainedEntryCount": 27057,
          "legacyRetainedEntryCount": 27057,
          "addedByPolicyCount": 10719,
          "droppedByPolicyCount": 10719,
          "addedRetentionWeightSum": 595.618308,
          "droppedRetentionWeightSum": 701.933993,
          "addedOcclusionWeightSum": 936.54106,
          "droppedOcclusionWeightSum": 1290.47025,
          "addedByPolicySamples": [
            {
              "tileIndex": 9298,
              "tileX": 96,
              "tileY": 43,
              "splatIndex": 7494,
              "originalId": 7494,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.423529,
              "viewRank": 65552
            },
            {
              "tileIndex": 9299,
              "tileX": 97,
              "tileY": 43,
              "splatIndex": 80810,
              "originalId": 80810,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.815686,
              "viewRank": 68274
            },
            {
              "tileIndex": 9299,
              "tileX": 97,
              "tileY": 43,
              "splatIndex": 59019,
              "originalId": 59019,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.905882,
              "viewRank": 52112
            },
            {
              "tileIndex": 9299,
              "tileX": 97,
              "tileY": 43,
              "splatIndex": 6331,
              "originalId": 6331,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.556863,
              "viewRank": 77793
            },
            {
              "tileIndex": 9300,
              "tileX": 98,
              "tileY": 43,
              "splatIndex": 85417,
              "originalId": 85417,
              "coverageWeight": 0.000003,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.741176,
              "viewRank": 36183
            },
            {
              "tileIndex": 9300,
              "tileX": 98,
              "tileY": 43,
              "splatIndex": 59019,
              "originalId": 59019,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.905882,
              "viewRank": 52112
            },
            {
              "tileIndex": 9300,
              "tileX": 98,
              "tileY": 43,
              "splatIndex": 60002,
              "originalId": 60002,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.662745,
              "viewRank": 64561
            },
            {
              "tileIndex": 9300,
              "tileX": 98,
              "tileY": 43,
              "splatIndex": 6331,
              "originalId": 6331,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.556863,
              "viewRank": 77793
            },
            {
              "tileIndex": 9301,
              "tileX": 99,
              "tileY": 43,
              "splatIndex": 85417,
              "originalId": 85417,
              "coverageWeight": 0.000004,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.741176,
              "viewRank": 36183
            },
            {
              "tileIndex": 9301,
              "tileX": 99,
              "tileY": 43,
              "splatIndex": 60002,
              "originalId": 60002,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.662745,
              "viewRank": 64561
            },
            {
              "tileIndex": 9301,
              "tileX": 99,
              "tileY": 43,
              "splatIndex": 59019,
              "originalId": 59019,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.905882,
              "viewRank": 52112
            },
            {
              "tileIndex": 9301,
              "tileX": 99,
              "tileY": 43,
              "splatIndex": 28980,
              "originalId": 28980,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.898039,
              "viewRank": 61799
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 9298,
              "tileX": 96,
              "tileY": 43,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.000006,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 9299,
              "tileX": 97,
              "tileY": 43,
              "splatIndex": 83017,
              "originalId": 83017,
              "coverageWeight": 0.000316,
              "retentionWeight": 0.000034,
              "occlusionWeight": 0.000081,
              "occlusionDensity": 0.254902,
              "viewRank": 74026
            },
            {
              "tileIndex": 9299,
              "tileX": 97,
              "tileY": 43,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.00001,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000002,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 9299,
              "tileX": 97,
              "tileY": 43,
              "splatIndex": 85430,
              "originalId": 85430,
              "coverageWeight": 0.000009,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.321569,
              "viewRank": 62557
            },
            {
              "tileIndex": 9300,
              "tileX": 98,
              "tileY": 43,
              "splatIndex": 62091,
              "originalId": 62091,
              "coverageWeight": 0.000453,
              "retentionWeight": 0.000055,
              "occlusionWeight": 0.000078,
              "occlusionDensity": 0.172549,
              "viewRank": 62714
            },
            {
              "tileIndex": 9300,
              "tileX": 98,
              "tileY": 43,
              "splatIndex": 83017,
              "originalId": 83017,
              "coverageWeight": 0.000314,
              "retentionWeight": 0.000033,
              "occlusionWeight": 0.00008,
              "occlusionDensity": 0.254902,
              "viewRank": 74026
            },
            {
              "tileIndex": 9300,
              "tileX": 98,
              "tileY": 43,
              "splatIndex": 33947,
              "originalId": 33947,
              "coverageWeight": 0.000043,
              "retentionWeight": 0.000011,
              "occlusionWeight": 0.000017,
              "occlusionDensity": 0.392157,
              "viewRank": 71883
            },
            {
              "tileIndex": 9300,
              "tileX": 98,
              "tileY": 43,
              "splatIndex": 39626,
              "originalId": 39626,
              "coverageWeight": 0.000027,
              "retentionWeight": 0.000004,
              "occlusionWeight": 0.000009,
              "occlusionDensity": 0.34902,
              "viewRank": 79033
            },
            {
              "tileIndex": 9301,
              "tileX": 99,
              "tileY": 43,
              "splatIndex": 62091,
              "originalId": 62091,
              "coverageWeight": 0.000698,
              "retentionWeight": 0.000084,
              "occlusionWeight": 0.00012,
              "occlusionDensity": 0.172549,
              "viewRank": 62714
            },
            {
              "tileIndex": 9301,
              "tileX": 99,
              "tileY": 43,
              "splatIndex": 83017,
              "originalId": 83017,
              "coverageWeight": 0.000273,
              "retentionWeight": 0.000029,
              "occlusionWeight": 0.00007,
              "occlusionDensity": 0.254902,
              "viewRank": 74026
            },
            {
              "tileIndex": 9301,
              "tileX": 99,
              "tileY": 43,
              "splatIndex": 33947,
              "originalId": 33947,
              "coverageWeight": 0.000146,
              "retentionWeight": 0.000039,
              "occlusionWeight": 0.000057,
              "occlusionDensity": 0.392157,
              "viewRank": 71883
            },
            {
              "tileIndex": 9301,
              "tileX": 99,
              "tileY": 43,
              "splatIndex": 39626,
              "originalId": 39626,
              "coverageWeight": 0.000142,
              "retentionWeight": 0.000019,
              "occlusionWeight": 0.00005,
              "occlusionDensity": 0.34902,
              "viewRank": 79033
            }
          ]
        },
        "centerLeakBand": {
          "region": "center-leak-band",
          "tileCount": 1604,
          "cappedTileCount": 1267,
          "projectedTileEntryCount": 3131729,
          "currentRetainedEntryCount": 44335,
          "legacyRetainedEntryCount": 44335,
          "addedByPolicyCount": 18451,
          "droppedByPolicyCount": 18451,
          "addedRetentionWeightSum": 1458.811149,
          "droppedRetentionWeightSum": 1418.107675,
          "addedOcclusionWeightSum": 2095.692274,
          "droppedOcclusionWeightSum": 2745.677287,
          "addedByPolicySamples": [
            {
              "tileIndex": 10786,
              "tileX": 86,
              "tileY": 50,
              "splatIndex": 37927,
              "originalId": 37927,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.980392,
              "viewRank": 56389
            },
            {
              "tileIndex": 10786,
              "tileX": 86,
              "tileY": 50,
              "splatIndex": 93749,
              "originalId": 93749,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.976471,
              "viewRank": 68135
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 88398,
              "originalId": 88398,
              "coverageWeight": 0.000006,
              "retentionWeight": 0.000003,
              "occlusionWeight": 0.000004,
              "occlusionDensity": 0.686275,
              "viewRank": 52122
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 78880,
              "originalId": 78880,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.933333,
              "viewRank": 72082
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 78446,
              "originalId": 78446,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.996078,
              "viewRank": 68583
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 37927,
              "originalId": 37927,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.980392,
              "viewRank": 56389
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 93749,
              "originalId": 93749,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.976471,
              "viewRank": 68135
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 82936,
              "originalId": 82936,
              "coverageWeight": 0.000042,
              "retentionWeight": 0.000017,
              "occlusionWeight": 0.000039,
              "occlusionDensity": 0.92549,
              "viewRank": 74976
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 76984,
              "originalId": 76984,
              "coverageWeight": 0.000025,
              "retentionWeight": 0.000006,
              "occlusionWeight": 0.000024,
              "occlusionDensity": 0.952941,
              "viewRank": 71014
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 56457,
              "originalId": 56457,
              "coverageWeight": 0.000003,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.972549,
              "viewRank": 38772
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 78880,
              "originalId": 78880,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.933333,
              "viewRank": 72082
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 78446,
              "originalId": 78446,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.996078,
              "viewRank": 68583
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 10786,
              "tileX": 86,
              "tileY": 50,
              "splatIndex": 78425,
              "originalId": 78425,
              "coverageWeight": 0.000001,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.156863,
              "viewRank": 69314
            },
            {
              "tileIndex": 10786,
              "tileX": 86,
              "tileY": 50,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 91629,
              "originalId": 91629,
              "coverageWeight": 0.000534,
              "retentionWeight": 0.000147,
              "occlusionWeight": 0.000201,
              "occlusionDensity": 0.376471,
              "viewRank": 65574
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 12246,
              "originalId": 12246,
              "coverageWeight": 0.000067,
              "retentionWeight": 0.000011,
              "occlusionWeight": 0.000016,
              "occlusionDensity": 0.235294,
              "viewRank": 72124
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 29074,
              "originalId": 29074,
              "coverageWeight": 0.000067,
              "retentionWeight": 0.000019,
              "occlusionWeight": 0.000026,
              "occlusionDensity": 0.388235,
              "viewRank": 62933
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 91858,
              "originalId": 91858,
              "coverageWeight": 0.000013,
              "retentionWeight": 0.000003,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.270588,
              "viewRank": 59952
            },
            {
              "tileIndex": 10787,
              "tileX": 87,
              "tileY": 50,
              "splatIndex": 45846,
              "originalId": 45846,
              "coverageWeight": 0.000007,
              "retentionWeight": 0.000002,
              "occlusionWeight": 0.000006,
              "occlusionDensity": 0.878431,
              "viewRank": 86031
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 91629,
              "originalId": 91629,
              "coverageWeight": 0.000954,
              "retentionWeight": 0.000262,
              "occlusionWeight": 0.000359,
              "occlusionDensity": 0.376471,
              "viewRank": 65574
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 92947,
              "originalId": 92947,
              "coverageWeight": 0.00039,
              "retentionWeight": 0.000097,
              "occlusionWeight": 0.000203,
              "occlusionDensity": 0.521569,
              "viewRank": 47516
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 38865,
              "originalId": 38865,
              "coverageWeight": 0.000235,
              "retentionWeight": 0.000062,
              "occlusionWeight": 0.000092,
              "occlusionDensity": 0.392157,
              "viewRank": 76054
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 12246,
              "originalId": 12246,
              "coverageWeight": 0.000138,
              "retentionWeight": 0.000023,
              "occlusionWeight": 0.000032,
              "occlusionDensity": 0.235294,
              "viewRank": 72124
            },
            {
              "tileIndex": 10788,
              "tileX": 88,
              "tileY": 50,
              "splatIndex": 772,
              "originalId": 772,
              "coverageWeight": 0.000105,
              "retentionWeight": 0.000025,
              "occlusionWeight": 0.000036,
              "occlusionDensity": 0.345098,
              "viewRank": 75759
            }
          ]
        }
      }
    },
    "coverageWeight": {
      "min": 0,
      "max": 2.545029,
      "mean": 0.130771
    },
    "alpha": {
      "maxSourceOpacity": 1,
      "meanSourceOpacity": 0.689004,
      "estimatedMaxAccumulatedAlpha": 1,
      "estimatedMinTransmittance": 0,
      "alphaParamRefs": 94406
    },
    "conicShape": {
      "maxMajorRadiusPx": 57.208888,
      "minMinorRadiusPx": 1.5,
      "maxAnisotropyRatio": 21.418907
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
      "maxAnisotropyRatio": 70.32900677284606,
      "suspiciousSplatCount": 1174,
      "sampleOriginalIds": [
        89,
        91,
        102,
        103,
        104,
        105,
        238,
        256
      ],
      "fieldMaxAnisotropyRatio": 190.56626845863002,
      "fieldSuspiciousSplatCount": 8398,
      "rotationOrderComparison": {
        "wxyz": {
          "rotationOrder": "wxyz",
          "maxProjectedAnisotropyRatio": 70.32900677284606,
          "suspiciousProjectedSplatCount": 1174,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            89,
            91,
            102,
            103,
            104,
            105,
            238,
            256
          ]
        },
        "xyzw": {
          "rotationOrder": "xyzw",
          "maxProjectedAnisotropyRatio": 62.84627883219033,
          "suspiciousProjectedSplatCount": 1714,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            87,
            93,
            131,
            250,
            549,
            632,
            692,
            863
          ]
        }
      },
      "footprint": {
        "maxMajorRadiusPx": 51.362080196886815,
        "maxMinorRadiusPx": 24.028910843904978,
        "maxAreaPx": 3334.11186316797,
        "areaCapPx": 9216,
        "majorRadiusCapPx": 468,
        "highEnergySplatCount": 0,
        "projectedSplatCount": 94406,
        "sampleOriginalIds": []
      },
      "cropSupport": {
        "rimBand": {
          "crop": {
            "x": 390,
            "y": 322,
            "width": 500,
            "height": 115
          },
          "projectedCenterCount": 87499,
          "projectedSupportCount": 88901,
          "nearFloorMinorCount": 47346,
          "maxMajorRadiusPx": 51.362080196886815,
          "medianMajorRadiusPx": 3.2926847247256466,
          "medianMinorRadiusPx": 1.5533136541375223,
          "supportAreaPxSum": 3883463.767823499,
          "sampleOriginalIds": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11
          ]
        },
        "porousBody": {
          "crop": {
            "x": 520,
            "y": 270,
            "width": 260,
            "height": 150
          },
          "projectedCenterCount": 91238,
          "projectedSupportCount": 92432,
          "nearFloorMinorCount": 49672,
          "maxMajorRadiusPx": 51.362080196886815,
          "medianMajorRadiusPx": 3.256140496005579,
          "medianMinorRadiusPx": 1.5394952765755674,
          "supportAreaPxSum": 3942324.978628497,
          "sampleOriginalIds": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11
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
        "maxTileAlphaMass": 246902.51990515858,
        "maxTileSplatCount": 16646,
        "hotTileCount": 23,
        "tileEntryCount": 180205,
        "maxSplatCoveredTileCount": 28,
        "maxCenterTileDroppedCoverageFraction": 1,
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
  "statsText": "1280×720 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/23 tiles | tile-local: 214x120 tiles/94406 refs | tile-order: gpu-sorted-index-rank-inversion | arena requested: gpu | arena effective: cpu | arena CPU build: 10076.700ms | arena unavailable: gpu arena runtime requires a retention adapter before cap-pressure scenes can bypass the CPU retained list | arena fallback: requested gpu arena backend fell back to the CPU bridge",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "1280×720 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/23 tiles | tile-local: 214x120 tiles/94406 refs | tile-order: gpu-sorted-index-rank-inversion | arena requested: gpu | arena effective: cpu | arena CPU build: 10076.700ms | arena unavailable: gpu arena runtime requires a retention adapter before cap-pressure scenes can bypass the CPU retained list | arena fallback: requested gpu arena backend fell back to the CPU bridge",
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
    }
  ],
  "pageErrors": []
}
```
