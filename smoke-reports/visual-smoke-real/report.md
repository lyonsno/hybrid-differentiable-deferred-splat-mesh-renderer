# Visual Smoke Report

- Status: PASS
- Generated: 2026-04-28T02:42:56.331Z
- URL: http://127.0.0.1:63569/
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Image Evidence

- Canvas PNG: 1280x720
- Nonblank: true
- Changed pixels: 57911 / 921600 (6.284%)
- Average background delta: 5.71
- Distinct colors: 24831

## Splat Evidence

- Real Scaniverse evidence: true
- Source kind: real_scaniverse_ply
- Splat count: 94406
- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Summary: PASS: nonblank real_scaniverse_ply capture with 94406 splats from /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json.

## Sibling Contract Notes

- Synthetic or fixture content may validate this harness, but it does not close first smoke.
- To close first smoke, the integrated page should expose `window.__MESH_SPLAT_SMOKE__` or canvas/body data attributes with `sourceKind` set to real Scaniverse PLY/SPZ content, a positive `splatCount`, and an `assetPath`.
- The screenshot must remain nonblank after fixed overlays such as `#stats` are hidden, so overlay text cannot satisfy the canvas check.

## Page Evidence

```json
{
  "ready": true,
  "sourceKind": "real_scaniverse_ply",
  "realScaniverse": true,
  "realSplatEvidence": true,
  "synthetic": false,
  "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
  "splatCount": 94406,
  "sortedIdCount": 94406,
  "boundsRadius": 0.22154541313648224,
  "statsText": "1280×720 | 111 fps | 94,406 real Scaniverse splats | render: 2.80ms",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "1280×720 | 111 fps | 94,406 real Scaniverse splats | render: 2.80ms",
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
