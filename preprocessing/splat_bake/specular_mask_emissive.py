"""Emissive extraction via specular-mask light sweep.

Two-pass approach:
  Pass 1: Render PBR splats through deferred renderer with N different light
           directions. Measure per-splat variance of the lit output across the
           sweep. High variance = specular. Low variance = diffuse/emissive.
  Pass 2: Compute emissive as (original_color - albedo), masked by the
           specular variance. High-variance (specular) regions get zeroed.

Usage:
    python specular_mask_emissive.py \
        --albedo-ply evil_orb_albedo_pbr_2k.ply \
        --original-ply evil_orb_trimmed_050.ply \
        --renderer-url http://localhost:5176 \
        --splat-url-path smoke-assets/evil_orb_albedo_pbr_2k.ply \
        --output evil_orb_final_emissive.ply \
        --work-dir ~/dev/emissive_sweep \
        --distance 2.0

Requires the renderer worktree server with __MESH_SPLAT_SET_LIGHT__ API.
"""

from __future__ import annotations

import argparse
import json
import logging
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image
from plyfile import PlyData, PlyElement

logging.basicConfig(level=logging.INFO, format="%(message)s")
LOG = logging.getLogger(__name__)

SH_C0 = 0.28209479177387814

# Light sweep: diverse directions for maximum specular coverage.
# Mix of azimuths and elevations so every surface normal gets hit by at least a few lights.
LIGHT_SWEEP = [
    # Side lights (mid elevation)
    {"azimuth": 1.2,   "elevation": 0.4,  "label": "side_right"},
    {"azimuth": -1.2,  "elevation": 0.4,  "label": "side_left"},
    # Rim/back lights
    {"azimuth": 2.5,   "elevation": 0.3,  "label": "rim_right"},
    {"azimuth": -2.5,  "elevation": 0.3,  "label": "rim_left"},
    # Overhead and underfoot — catch top/bottom-facing surfaces
    {"azimuth": 0.5,   "elevation": 1.1,  "label": "overhead_front"},
    {"azimuth": -0.5,  "elevation": -0.2, "label": "low_left"},
    # Three-quarter lights
    {"azimuth": 0.8,   "elevation": 0.6,  "label": "three_quarter_right"},
    {"azimuth": -0.8,  "elevation": 0.6,  "label": "three_quarter_left"},
    # High overhead (near-zenith) — catches upward-facing surfaces
    {"azimuth": 0.0,   "elevation": 1.4,  "label": "zenith"},
    # Low from behind — catches downward-facing and back-facing surfaces
    {"azimuth": 3.0,   "elevation": -0.3, "label": "low_back"},
    # Front fill at different elevation than existing
    {"azimuth": 0.0,   "elevation": 0.0,  "label": "front_level"},
    # Diagonal — hits surfaces that face between the cardinal directions
    {"azimuth": 1.8,   "elevation": 0.8,  "label": "high_right_back"},
    {"azimuth": -1.8,  "elevation": -0.1, "label": "low_left_back"},
]


def compute_orbit_camera(azimuth, elevation, distance, target, near, far,
                          fovY=np.pi/3, aspect=1.0):
    ca, sa = np.cos(azimuth), np.sin(azimuth)
    ce, se = np.cos(elevation), np.sin(elevation)
    back = np.array([sa * ce, se, ca * ce])
    eye = target + back * distance
    forward = target - eye
    forward /= np.linalg.norm(forward)
    world_up = np.array([0.0, 1.0, 0.0])
    right = np.cross(forward, world_up)
    rn = np.linalg.norm(right)
    if rn < 1e-6:
        world_up = np.array([0.0, 0.0, 1.0])
        right = np.cross(forward, world_up)
    right /= np.linalg.norm(right)
    up = np.cross(right, forward)
    view = np.eye(4)
    view[0, :3] = right
    view[1, :3] = up
    view[2, :3] = -forward
    view[:3, 3] = [-np.dot(right, eye), -np.dot(up, eye), np.dot(forward, eye)]
    f = 1.0 / np.tan(fovY / 2)
    proj = np.zeros((4, 4))
    proj[0, 0] = f / aspect
    proj[1, 1] = f
    proj[2, 2] = -(far + near) / (far - near)
    proj[2, 3] = -2 * far * near / (far - near)
    proj[3, 2] = -1
    return view, proj


def project_splats(positions, viewProj, vp_w, vp_h, map_w, map_h):
    """Project positions using the renderer's actual viewProj (includes Y flip)."""
    N = positions.shape[0]
    pts_h = np.concatenate([positions, np.ones((N, 1))], axis=1)
    clip = (viewProj @ pts_h.T).T
    w_clip = clip[:, 3]
    valid = w_clip > 0.01
    ndc_x = clip[:, 0] / np.where(valid, w_clip, 1.0)
    ndc_y = clip[:, 1] / np.where(valid, w_clip, 1.0)
    px = ((ndc_x + 1) * 0.5 * vp_w) * (map_w / vp_w)
    py = ((1 - ndc_y) * 0.5 * vp_h) * (map_h / vp_h)
    valid &= (px >= 0) & (px < map_w) & (py >= 0) & (py < map_h)
    return np.stack([px, py], axis=1), valid


def sample_rgb(img, uv, valid):
    N = uv.shape[0]
    result = np.zeros((N, 3), dtype=np.float32)
    h, w = img.shape[:2]
    vi = np.where(valid)[0]
    px_i = np.clip(uv[valid, 0].astype(int), 0, w - 1)
    py_i = np.clip(uv[valid, 1].astype(int), 0, h - 1)
    result[vi] = img[py_i, px_i]
    return result


def render_light_sweep(renderer_url, splat_url, cameras, lights,
                       work_dir, width, height, settle_ms, renderer_dir,
                       distance=2.0):
    """Render all camera × light combinations in a single browser session.

    cameras: list of {azimuth, elevation, label}
    lights: list of {azimuth, elevation, label}

    Returns dict mapping (cam_label, light_label) -> camera_state,
    and writes PNGs to work_dir/lit_{cam_label}_{light_label}.png.
    """
    # Build the render schedule as JSON
    schedule = []
    for cam in cameras:
        for light in lights:
            fname = f"lit_{cam['label']}_{light['label']}.png"
            cam_json = f"{cam['label']}_{light['label']}.camera.json"
            schedule.append({
                "cam_az": cam["azimuth"], "cam_el": cam["elevation"],
                "light_az": light["azimuth"], "light_el": light["elevation"],
                "file": fname, "cam_file": cam_json,
            })

    schedule_json = json.dumps(schedule)
    script = f"""
const {{ chromium }} = require('playwright-core');
const fs = require('fs');
(async () => {{
  const browser = await chromium.launch({{ channel: 'chrome', headless: true, args: ['--enable-unsafe-webgpu'] }});
  const page = await (await browser.newContext({{ viewport: {{ width: {width}, height: {height} }}, deviceScaleFactor: 1 }})).newPage();
  await page.goto('{renderer_url}/?splat={splat_url}', {{ waitUntil: 'networkidle' }});
  await page.waitForFunction(() => {{ const c = document.body.dataset.smokeSplatCount; return c && Number(c) > 0; }}, {{ timeout: 60000 }});
  await page.waitForTimeout({settle_ms});

  // Switch to lit view once
  for (let i = 0; i < 4; i++) {{ await page.keyboard.press('g'); await page.waitForTimeout(200); }}
  await page.evaluate(() => {{ document.getElementById('stats').style.display = 'none'; }});
  await page.waitForTimeout(500);

  const schedule = {schedule_json};
  let lastCamKey = null;

  for (const s of schedule) {{
    const camKey = s.cam_az + ',' + s.cam_el;
    if (camKey !== lastCamKey) {{
      await page.evaluate((p) => window.__MESH_SPLAT_SET_CAMERA__({{
        distance: {distance}, azimuth: p.cam_az, elevation: p.cam_el
      }}), s);
      await page.waitForTimeout(800);
      lastCamKey = camKey;
    }}
    await page.evaluate((p) => window.__MESH_SPLAT_SET_LIGHT__({{
      mode: 'fixed', azimuth: p.light_az, elevation: p.light_el,
      intensity: 5.0, ambient: 0.0, specularOnly: false
    }}), s);
    await page.waitForTimeout(300);
    const buf = await (await page.$('canvas')).screenshot({{ type: 'png' }});
    fs.writeFileSync('{work_dir}/' + s.file, buf);
    const cam = await page.evaluate(() => window.__MESH_SPLAT_CAMERA_STATE__);
    fs.writeFileSync('{work_dir}/' + s.cam_file, JSON.stringify(cam));
  }}
  await browser.close();
}})();
"""
    result = subprocess.run(
        ["node", "-e", script],
        capture_output=True, text=True, timeout=300,
        cwd=str(renderer_dir),
    )
    if result.returncode != 0:
        LOG.error(f"  Batch render failed: {result.stderr[-500:]}")
        return None

    # Read back camera states
    cam_states = {}
    for s in schedule:
        cam_path = work_dir / s["cam_file"]
        try:
            with open(cam_path) as f:
                cam_states[(
                    next(c["label"] for c in cameras if c["azimuth"] == s["cam_az"] and c["elevation"] == s["cam_el"]),
                    next(l["label"] for l in lights if l["azimuth"] == s["light_az"] and l["elevation"] == s["light_el"]),
                )] = json.load(f)
        except Exception:
            pass
    return cam_states


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--albedo-ply", type=Path, required=True,
                        help="PLY with albedo-baked SH colors + normals + roughness + metallic")
    parser.add_argument("--original-ply", type=Path, required=True,
                        help="Original PLY with baked-lighting SH colors")
    parser.add_argument("--renderer-url", type=str, default="http://localhost:5176")
    parser.add_argument("--renderer-dir", type=Path,
                        default=Path("/private/tmp/renderer-splatipede-0619"))
    parser.add_argument("--splat-url-path", type=str, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--emissive-vis", type=Path, default=None)
    parser.add_argument("--work-dir", type=Path, required=True)
    parser.add_argument("--cam-azimuth", type=float, default=3.14159)
    parser.add_argument("--cam-elevation", type=float, default=0.25)
    parser.add_argument("--distance", type=float, default=2.0)
    parser.add_argument("--width", type=int, default=2048)
    parser.add_argument("--height", type=int, default=2048)
    parser.add_argument("--settle-ms", type=int, default=3000)
    parser.add_argument("--variance-threshold", type=float, default=0.05,
                        help="CV threshold — keep splats above this (light-validated surfaces)")
    args = parser.parse_args()

    args.work_dir.mkdir(parents=True, exist_ok=True)

    # Load original PLY
    LOG.info(f"Loading original PLY: {args.original_ply}")
    orig_ply = PlyData.read(str(args.original_ply))
    orig_verts = orig_ply["vertex"]
    N = len(orig_verts.data)
    positions = np.stack([
        np.array(orig_verts["x"]),
        np.array(orig_verts["y"]),
        np.array(orig_verts["z"]),
    ], axis=1)

    orig_colors = np.stack([
        np.clip(0.5 + SH_C0 * np.array(orig_verts["f_dc_0"]), 0, 1),
        np.clip(0.5 + SH_C0 * np.array(orig_verts["f_dc_1"]), 0, 1),
        np.clip(0.5 + SH_C0 * np.array(orig_verts["f_dc_2"]), 0, 1),
    ], axis=1).astype(np.float32)

    # Load albedo PLY for the albedo colors
    LOG.info(f"Loading albedo PLY: {args.albedo_ply}")
    albedo_ply = PlyData.read(str(args.albedo_ply))
    albedo_verts = albedo_ply["vertex"]
    albedo_colors = np.stack([
        np.clip(0.5 + SH_C0 * np.array(albedo_verts["f_dc_0"]), 0, 1),
        np.clip(0.5 + SH_C0 * np.array(albedo_verts["f_dc_1"]), 0, 1),
        np.clip(0.5 + SH_C0 * np.array(albedo_verts["f_dc_2"]), 0, 1),
    ], axis=1).astype(np.float32)

    LOG.info(f"  {N} splats")

    # Triangulated camera views: primary + two offsets at ~30° separation.
    # Breaks face-on specular symmetry from any single viewing angle.
    CAMERAS = [
        {"azimuth": args.cam_azimuth, "elevation": args.cam_elevation, "label": "cam0"},
        {"azimuth": args.cam_azimuth + 0.45, "elevation": args.cam_elevation + 0.25, "label": "cam1"},
        {"azimuth": args.cam_azimuth - 0.45, "elevation": args.cam_elevation - 0.20, "label": "cam2"},
    ]

    # Pass 1: Batch render all cameras × lights in a single browser session
    total_renders = len(CAMERAS) * len(LIGHT_SWEEP)
    LOG.info(f"Pass 1: Light sweep ({len(CAMERAS)} cameras × {len(LIGHT_SWEEP)} lights = {total_renders} renders)...")

    cam_states = render_light_sweep(
        args.renderer_url, args.splat_url_path, CAMERAS, LIGHT_SWEEP,
        args.work_dir, args.width, args.height, args.settle_ms, args.renderer_dir,
        distance=args.distance,
    )
    if cam_states is None:
        LOG.error("Batch render failed")
        return

    LOG.info(f"  Got {len(cam_states)} camera states")

    # Per-camera: compute CV, then take max CV across cameras per splat
    per_cam_cv = np.zeros((N, len(CAMERAS)), dtype=np.float32)

    for ci, cam in enumerate(CAMERAS):
        cam_label = cam["label"]
        # Get viewProj for this camera (from any light's camera state)
        cam_state = None
        for light in LIGHT_SWEEP:
            key = (cam_label, light["label"])
            if key in cam_states:
                cam_state = cam_states[key]
                break
        if cam_state is None:
            LOG.warning(f"  No camera state for {cam_label}, skipping")
            continue

        viewProj_mat = np.array(cam_state["viewProjMatrix"]).reshape(4, 4).T
        vp_w = cam_state["viewportWidth"]
        vp_h = cam_state["viewportHeight"]
        LOG.info(f"  Camera '{cam_label}': target={cam_state.get('cameraTarget')}")

        # Collect lit values for all lights from this camera
        n_lights = len(LIGHT_SWEEP)
        lit_values = np.zeros((N, 3, n_lights), dtype=np.float32)
        view_valid = np.zeros((N, n_lights), dtype=bool)

        for li, light in enumerate(LIGHT_SWEEP):
            render_path = args.work_dir / f"lit_{cam_label}_{light['label']}.png"
            if not render_path.exists():
                continue
            lit_img = np.array(Image.open(render_path).convert("RGB")).astype(np.float32) / 255.0
            lh, lw = lit_img.shape[:2]
            uv, valid = project_splats(positions, viewProj_mat, vp_w, vp_h, lw, lh)
            lit_values[:, :, li] = sample_rgb(lit_img, uv, valid)
            view_valid[:, li] = valid

        # Compute CV for this camera
        num_valid = view_valid.sum(axis=1)
        for i in range(N):
            nv = num_valid[i]
            if nv < 2:
                continue
            vi = np.where(view_valid[i])[0]
            vals = lit_values[i, :, vi]
            means = np.mean(vals, axis=1)
            stds = np.std(vals, axis=1)
            safe_means = np.maximum(means, 0.001)
            per_cam_cv[i, ci] = np.max(stds / safe_means)

        cam_cv = per_cam_cv[:, ci]
        nz = cam_cv[cam_cv > 0]
        if len(nz) > 0:
            LOG.info(f"    CV: 50th={np.percentile(nz, 50):.4f}, 90th={np.percentile(nz, 90):.4f}, "
                     f"95th={np.percentile(nz, 95):.4f}, max={nz.max():.4f}")

    # Min CV across cameras — only validate if ALL cameras see variance.
    # This kills face-on specular leaks: a splat that's face-on to one camera
    # has low CV from that camera, even if the other camera sees high CV.
    coeff_var = per_cam_cv.min(axis=1)

    nz = coeff_var[coeff_var > 0]
    LOG.info(f"  Combined CV: 50th={np.percentile(nz, 50):.4f}, 90th={np.percentile(nz, 90):.4f}, "
             f"95th={np.percentile(nz, 95):.4f}")

    specular_mask = coeff_var > args.variance_threshold
    specular_count = specular_mask.sum()
    LOG.info(f"  Light-validated (CV > {args.variance_threshold}): {specular_count} splats ({100*specular_count/N:.1f}%)")

    LOG.info("Pass 2: Emissive solve...")
    raw_emissive = np.maximum(0, orig_colors - albedo_colors)
    emissive = raw_emissive.copy()
    # Keep emissive only where the light sweep validates the surface (high CV).
    # Low CV = light can't reach = emissive signal unreliable.
    emissive[~specular_mask] = 0

    emit_mag = np.sqrt((emissive ** 2).sum(axis=1))
    raw_emit_mag = np.sqrt((raw_emissive ** 2).sum(axis=1))
    LOG.info(f"  Raw emissive (before mask): {(raw_emit_mag > 0.05).sum()} splats")
    LOG.info(f"  Final emissive (after mask): {(emit_mag > 0.05).sum()} splats")
    LOG.info(f"  Removed by specular mask: {(raw_emit_mag > 0.05).sum() - (emit_mag > 0.05).sum()}")
    LOG.info(f"  Max emissive magnitude: {emit_mag.max():.3f}")

    LOG.info(f"  Light-validated: {specular_mask.sum()}, "
             f"emissive survived: {(specular_mask & (raw_emit_mag > 0.05)).sum()}")

    # Write output PLY
    old_dtype = albedo_verts.data.dtype
    new_fields = list(old_dtype.descr)
    for fn in ["emissive_r", "emissive_g", "emissive_b"]:
        if fn not in old_dtype.names:
            new_fields.append((fn, "f4"))

    new_data = np.empty(N, dtype=np.dtype(new_fields))
    for name in old_dtype.names:
        new_data[name] = albedo_verts.data[name]
    new_data["emissive_r"] = emissive[:, 0]
    new_data["emissive_g"] = emissive[:, 1]
    new_data["emissive_b"] = emissive[:, 2]

    new_vertex = PlyElement.describe(new_data, "vertex")
    other_elements = [el for el in albedo_ply.elements if el.name != "vertex"]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    PlyData([new_vertex] + other_elements, text=False).write(str(args.output))
    LOG.info(f"Wrote: {args.output}")

    # Emissive visualization
    if args.emissive_vis:
        vis_data = np.copy(new_data)
        boost = 3.0
        vis_data["f_dc_0"] = (np.clip(emissive[:, 0] * boost, 0, 1) - 0.5) / SH_C0
        vis_data["f_dc_1"] = (np.clip(emissive[:, 1] * boost, 0, 1) - 0.5) / SH_C0
        vis_data["f_dc_2"] = (np.clip(emissive[:, 2] * boost, 0, 1) - 0.5) / SH_C0
        vis_vertex = PlyElement.describe(vis_data, "vertex")
        PlyData([vis_vertex] + other_elements, text=False).write(str(args.emissive_vis))
        LOG.info(f"Wrote emissive vis: {args.emissive_vis}")


if __name__ == "__main__":
    main()
