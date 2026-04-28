# Visual Smoke Report

- Status: PROVISIONAL
- Generated: 2026-04-28T00:31:32.918Z
- URL: http://127.0.0.1:49925/
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Image Evidence

- Canvas PNG: 1280x720
- Nonblank: true
- Changed pixels: 25759 / 921600 (2.795%)
- Average background delta: 2.81
- Distinct colors: 4

## Splat Evidence

- Real Scaniverse evidence: false
- Source kind: not reported
- Splat count: 0
- Asset path: not reported
- Summary: PROVISIONAL: canvas is nonblank, but real Scaniverse splat evidence is not present.

## Sibling Contract Notes

- Synthetic or fixture content may validate this harness, but it does not close first smoke.
- To close first smoke, the integrated page should expose `window.__MESH_SPLAT_SMOKE__` or canvas/body data attributes with `sourceKind` set to real Scaniverse PLY/SPZ content, a positive `splatCount`, and an `assetPath`.
- The screenshot must remain nonblank after fixed overlays such as `#stats` are hidden, so overlay text cannot satisfy the canvas check.

## Page Evidence

```json
{
  "statsText": "1280×720 | 120 fps | render: 0.06ms",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "1280×720 | 120 fps | render: 0.06ms",
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
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)"
    }
  ],
  "pageErrors": []
}
```
