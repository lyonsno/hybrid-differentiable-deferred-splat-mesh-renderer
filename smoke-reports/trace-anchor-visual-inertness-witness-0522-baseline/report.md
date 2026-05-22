# Visual Smoke Report

- Status: PASS
- Generated: 2026-05-22T21:38:56.305Z
- URL: http://127.0.0.1:61742/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Compare no-trace baseline route against traced dark-lacuna route for trace-anchor visual inertness.
- Expected visual delta: none expected if traceAnchors are visually inert
- Evidence surface: full-frame canvas, analysis.json, and later contact-sheet/diff artifact set


## Image Evidence

- Canvas PNG: 3456x1916
- Nonblank: true
- Changed pixels: 21035 / 6621696 (0.318%)
- Average background delta: 2.73
- Distinct colors: 398

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
    "changedPixelRatio": 0.003176678603185649
  },
  "findings": [
    {
      "kind": "projection-anisotropy",
      "owner": "conic-reckoner",
      "severity": "suspect",
      "summary": "Projection anisotropy witness found ratio 68.88 across 1245 splats; footprint witness found 6159 high-energy splats with max major radius 39058.39 px; route to conic-reckoner after field metadata is canonical.",
      "evidence": {
        "maxAnisotropyRatio": 68.87746044164028,
        "suspiciousSplatCount": 1245,
        "sampleOriginalIds": [
          87,
          88,
          102,
          103,
          131,
          205,
          238,
          255
        ],
        "footprint": {
          "maxMajorRadiusPx": 39058.391918553534,
          "maxMinorRadiusPx": 2515.6462420401867,
          "maxAreaPx": 192137977.0964242,
          "areaCapPx": 66216.96,
          "majorRadiusCapPx": 1245.4,
          "highEnergySplatCount": 6159,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            250,
            767,
            772,
            1111,
            1122,
            1140,
            1177,
            1178
          ]
        }
      }
    },
    {
      "kind": "compositing-ambiguous",
      "owner": "alpha-ledger",
      "severity": "suspect",
      "summary": "Alpha density witness found 2066 hot tiles with max mass 404604.23.",
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
          "maxTileAlphaMass": 404604.2336065514,
          "maxTileSplatCount": 3750,
          "hotTileCount": 2066,
          "sampleOriginalIds": [
            0,
            5,
            6,
            17,
            19,
            20,
            22,
            31
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
  "rendererLabel": "tile-local-visible-budget-disabled-plate",
  "fps": 1,
  "tileLocalStatus": "budget-disabled",
  "tileLocalDisabledReason": "compact retained source produced no retained contributors for gpu arena runtime",
  "arenaRuntime": {
    "requestedArenaBackend": "gpu",
    "effectiveArenaBackend": "cpu",
    "unavailableReason": "gpu contributor arena runtime unavailable",
    "skippedReason": "compact retained source produced no retained contributors for gpu arena runtime"
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
      "maxAnisotropyRatio": 68.87746044164028,
      "suspiciousSplatCount": 1245,
      "sampleOriginalIds": [
        87,
        88,
        102,
        103,
        131,
        205,
        238,
        255
      ],
      "fieldMaxAnisotropyRatio": 190.56626845863002,
      "fieldSuspiciousSplatCount": 8398,
      "rotationOrderComparison": {
        "wxyz": {
          "rotationOrder": "wxyz",
          "maxProjectedAnisotropyRatio": 68.87746044164028,
          "suspiciousProjectedSplatCount": 1245,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            87,
            88,
            102,
            103,
            131,
            205,
            238,
            255
          ]
        },
        "xyzw": {
          "rotationOrder": "xyzw",
          "maxProjectedAnisotropyRatio": 77.1933235206813,
          "suspiciousProjectedSplatCount": 1935,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            89,
            91,
            131,
            256,
            286,
            300,
            310,
            437
          ]
        }
      },
      "footprint": {
        "maxMajorRadiusPx": 39058.391918553534,
        "maxMinorRadiusPx": 2515.6462420401867,
        "maxAreaPx": 192137977.0964242,
        "areaCapPx": 66216.96,
        "majorRadiusCapPx": 1245.4,
        "highEnergySplatCount": 6159,
        "projectedSplatCount": 94406,
        "sampleOriginalIds": [
          250,
          767,
          772,
          1111,
          1122,
          1140,
          1177,
          1178
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
        "maxTileAlphaMass": 404604.2336065514,
        "maxTileSplatCount": 3750,
        "hotTileCount": 2066,
        "tileEntryCount": 2804715,
        "maxSplatCoveredTileCount": 1880,
        "maxCenterTileDroppedCoverageFraction": 0.9997531188901105,
        "sampleOriginalIds": [
          0,
          5,
          6,
          17,
          19,
          20,
          22,
          31
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
  "statsText": "3456×1916 | 1 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-budget-disabled-plate | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 79,805 splats/2066 tiles | arena requested: gpu | arena effective: cpu | arena unavailable: gpu contributor arena runtime unavailable | arena skipped: compact retained source produced no retained contributors for gpu arena runtime | arena fallback: requested gpu arena backend fell back to the CPU bridge | compact retained source produced no retained contributors for gpu arena runtime",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "3456×1916 | 1 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-budget-disabled-plate | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 79,805 splats/2066 tiles | arena requested: gpu | arena effective: cpu | arena unavailable: gpu contributor arena runtime unavailable | arena skipped: compact retained source produced no retained contributors for gpu arena runtime | arena fallback: requested gpu arena backend fell back to the CPU bridge | compact retained source produced no retained contributors for gpu arena runtime",
  "canvas": {
    "width": 3456,
    "height": 1916,
    "clientWidth": 3456,
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
