# Visual Smoke Report

- Status: PASS
- Generated: 2026-06-15T18:56:33.941Z
- URL: http://localhost:5176/?renderer=compute
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Decide whether this smoke satisfies the branch-specific evidence contract.
- Expected visual delta: not specified
- Evidence surface: report.md, analysis.json, page evidence, and captured canvas screenshot


## Image Evidence

- Canvas PNG: 1280x720
- Nonblank: true
- Changed pixels: 15170 / 921600 (1.646%)
- Average background delta: 0.84
- Distinct colors: 9567

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
    "changedPixelRatio": 0.01646050347222222
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
          "maxMajorRadiusPx": 10.272416039377363,
          "maxMinorRadiusPx": 4.805782168780995,
          "maxAreaPx": 133.36447452671877,
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
      "summary": "Alpha density witness found 13 hot tiles with max mass 8241.01.",
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
          "maxTileAlphaMass": 8241.012676510241,
          "maxTileSplatCount": 10660,
          "hotTileCount": 13,
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
  "rendererLabel": "compute",
  "fps": 0,
  "tileLocalStatus": "not-applicable",
  "tileLocalDisabledReason": null,
  "arenaRuntime": {
    "requestedArenaBackend": "cpu",
    "effectiveArenaBackend": "cpu"
  },
  "operatorWitness": {
    "witnessView": "default",
    "revision": 0,
    "frameSerial": 1,
    "frameTimings": {
      "totalMs": 1.8,
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
          "name": "gpu-sort-refresh",
          "elapsedMs": 1
        },
        {
          "name": "queue-submit",
          "elapsedMs": 0
        },
        {
          "name": "evidence-exposure",
          "elapsedMs": 0.2
        }
      ]
    }
  },
  "tileLocal": {
    "refs": 0,
    "budget": {}
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
        "maxMajorRadiusPx": 10.272416039377363,
        "maxMinorRadiusPx": 4.805782168780995,
        "maxAreaPx": 133.36447452671877,
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
          "projectedSupportCount": 88035,
          "nearFloorMinorCount": 86949,
          "maxMajorRadiusPx": 10.272416039377363,
          "medianMajorRadiusPx": 1.5,
          "medianMinorRadiusPx": 1.5,
          "supportAreaPxSum": 664159.2774568386,
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
          "projectedSupportCount": 91752,
          "nearFloorMinorCount": 90696,
          "maxMajorRadiusPx": 10.272416039377363,
          "medianMajorRadiusPx": 1.5,
          "medianMinorRadiusPx": 1.5,
          "supportAreaPxSum": 689442.5415982895,
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
        "maxTileAlphaMass": 8241.012676510241,
        "maxTileSplatCount": 10660,
        "hotTileCount": 13,
        "tileEntryCount": 107881,
        "maxSplatCoveredTileCount": 4,
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
  "statsText": "1280×720 | 0 fps | 94,406 real Scaniverse splats | renderer: compute | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 90,551 splats/13 tiles | arena requested: cpu | arena effective: cpu | app frame: 1.6ms | slowest app stage: gpu-sort-refresh 1ms",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "1280×720 | 0 fps | 94,406 real Scaniverse splats | renderer: compute | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 90,551 splats/13 tiles | arena requested: cpu | arena effective: cpu | app frame: 1.6ms | slowest app stage: gpu-sort-refresh 1ms",
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
