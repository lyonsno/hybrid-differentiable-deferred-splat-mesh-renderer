"""Multi-view emissive extraction for Gaussian splat PLYs.

Renders the splat scene from multiple orbit views, runs SuperMat on each to
get per-view albedo, computes the delta (original_color - albedo) per view,
projects each delta back onto splats, and takes the per-channel minimum across
all views. Specular highlights vanish because they're view-dependent; emissive
survives because it's constant.

Usage:
    python multiview_emissive.py \
        --ply input.ply \
        --original-ply original_untouched.ply \
        --renderer-url http://localhost:5173 \
        --output output_with_emissive.ply \
        --work-dir ~/dev/emissive_work \
        --device mps

Requires:
    - Renderer dev server running (for headless screenshots)
    - SuperMat at ~/dev/SuperMat with checkpoint
    - MoGE at ~/dev/moge-standalone (for plyfile)
    - render-splat-screenshot.mjs in the renderer repo
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from plyfile import PlyData, PlyElement

logging.basicConfig(level=logging.INFO, format="%(message)s")
LOG = logging.getLogger(__name__)

SH_C0 = 0.28209479177387814

# Orbit camera positions: azimuth, elevation pairs
# 4 cardinal + 2 elevated for decent coverage
ORBIT_VIEWS = [
    {"azimuth": 0.0,          "elevation": 0.25, "label": "front"},
    {"azimuth": 3.14159,      "elevation": 0.25, "label": "back"},
    {"azimuth": 1.5708,       "elevation": 0.25, "label": "right"},
    {"azimuth": -1.5708,      "elevation": 0.25, "label": "left"},
    {"azimuth": 0.7854,       "elevation": 0.6,  "label": "front-right-up"},
    {"azimuth": -2.3562,      "elevation": 0.6,  "label": "back-left-up"},
]


def render_view(renderer_url: str, splat_path: str, view: dict,
                output_png: Path, camera_json: Path, width: int, height: int,
                distance: float, settle_ms: int, renderer_dir: Path):
    """Render a single view using the headless screenshot script."""
    cmd = [
        "node", str(renderer_dir / "scripts" / "render-splat-screenshot.mjs"),
        "--splat", splat_path,
        "--output", str(output_png),
        "--url", renderer_url,
        "--width", str(width),
        "--height", str(height),
        "--settle-ms", str(settle_ms),
        "--azimuth", str(view["azimuth"]),
        "--elevation", str(view["elevation"]),
        "--distance", str(distance),
    ]
    LOG.info(f"  Rendering {view['label']}...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60,
                            cwd=str(renderer_dir))
    if result.returncode != 0:
        LOG.error(f"  Screenshot failed: {result.stderr[-200:]}")
        return False
    return True


def run_supermat(image_path: Path, output_dir: Path, supermat_dir: Path,
                 device: str, image_size: int = 1024):
    """Run SuperMat on an image."""
    cmd = [
        str(supermat_dir / ".venv" / "bin" / "python"),
        str(supermat_dir / "inference_supermat.py"),
        "--input", str(image_path),
        "--output-dir", str(output_dir),
        "--checkpoint", str(supermat_dir / "checkpoints" / "supermat.pth"),
        "--base-model", "sd2-community/stable-diffusion-2-1",
        "--device", device,
        "--image-size", str(image_size),
        "--seed", "42",
    ]
    LOG.info(f"  Running SuperMat on {image_path.name}...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120,
                            cwd=str(supermat_dir))
    if result.returncode != 0:
        LOG.error(f"  SuperMat failed: {result.stderr[-300:]}")
        return False
    return True


def compute_orbit_camera(azimuth: float, elevation: float, distance: float,
                          target: np.ndarray, near: float, far: float,
                          fovY: float = np.pi / 3, aspect: float = 1.0
                          ) -> tuple[np.ndarray, np.ndarray]:
    """Compute view and projection matrices matching the renderer's orbit camera."""
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


def project_splats(positions: np.ndarray, view: np.ndarray, proj: np.ndarray,
                   vp_w: int, vp_h: int, map_w: int, map_h: int
                   ) -> tuple[np.ndarray, np.ndarray]:
    """Project splat positions to pixel coords using view/proj matrices."""
    viewProj = proj @ view
    N = positions.shape[0]
    pts_h = np.concatenate([positions, np.ones((N, 1))], axis=1)
    clip = (viewProj @ pts_h.T).T
    w_clip = clip[:, 3]
    valid = w_clip > 0.01
    ndc_x = clip[:, 0] / np.where(valid, w_clip, 1.0)
    ndc_y = clip[:, 1] / np.where(valid, w_clip, 1.0)
    px = ((ndc_x + 1) * 0.5 * vp_w) * (map_w / vp_w)
    py = ((ndc_y + 1) * 0.5 * vp_h) * (map_h / vp_h)
    valid &= (px >= 0) & (px < map_w) & (py >= 0) & (py < map_h)
    return np.stack([px, py], axis=1), valid


def sample_rgb(img: np.ndarray, uv: np.ndarray, valid: np.ndarray) -> np.ndarray:
    """Sample RGB values from image at projected positions."""
    N = uv.shape[0]
    result = np.zeros((N, 3), dtype=np.float32)
    h, w = img.shape[:2]
    vi = np.where(valid)[0]
    px_i = np.clip(uv[valid, 0].astype(int), 0, w - 1)
    py_i = np.clip(uv[valid, 1].astype(int), 0, h - 1)
    result[vi] = img[py_i, px_i]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ply", type=Path, required=True,
                        help="PLY to render (should be in renderer's smoke-assets or accessible path)")
    parser.add_argument("--original-ply", type=Path, required=True,
                        help="Original PLY with baked-lighting SH colors (before albedo replacement)")
    parser.add_argument("--output", type=Path, required=True,
                        help="Output PLY with emissive_r/g/b attributes")
    parser.add_argument("--renderer-url", type=str, default="http://localhost:5173")
    parser.add_argument("--renderer-dir", type=Path,
                        default=Path.home() / "dev" / "hybrid-differentiable-defferred-splat-mesh-renderer")
    parser.add_argument("--supermat-dir", type=Path,
                        default=Path.home() / "dev" / "SuperMat")
    parser.add_argument("--splat-url-path", type=str, default=None,
                        help="Path to PLY as seen by the renderer (e.g. smoke-assets/foo.ply). "
                             "If not provided, uses --ply as-is.")
    parser.add_argument("--work-dir", type=Path, required=True,
                        help="Working directory for intermediate files")
    parser.add_argument("--device", type=str, default="mps")
    parser.add_argument("--width", type=int, default=2048)
    parser.add_argument("--height", type=int, default=2048)
    parser.add_argument("--distance", type=float, default=2.0)
    parser.add_argument("--settle-ms", type=int, default=5000)
    parser.add_argument("--supermat-size", type=int, default=1024)
    parser.add_argument("--emissive-vis", type=Path, default=None,
                        help="Also write an emissive visualization PLY")
    args = parser.parse_args()

    args.work_dir.mkdir(parents=True, exist_ok=True)
    splat_url = args.splat_url_path or str(args.ply)

    # Load original PLY (with baked-lighting colors)
    LOG.info(f"Loading original PLY: {args.original_ply}")
    orig_ply = PlyData.read(str(args.original_ply))
    orig_verts = orig_ply["vertex"]
    N = len(orig_verts.data)
    positions = np.stack([
        np.array(orig_verts["x"]),
        np.array(orig_verts["y"]),
        np.array(orig_verts["z"]),
    ], axis=1)

    # Original baked-lighting colors
    orig_colors = np.stack([
        np.clip(0.5 + SH_C0 * np.array(orig_verts["f_dc_0"]), 0, 1),
        np.clip(0.5 + SH_C0 * np.array(orig_verts["f_dc_1"]), 0, 1),
        np.clip(0.5 + SH_C0 * np.array(orig_verts["f_dc_2"]), 0, 1),
    ], axis=1).astype(np.float32)

    LOG.info(f"  {N} splats")

    # Compute scene bounds for camera framing
    scene_center = np.median(positions, axis=0)
    scene_extent = np.max(positions, axis=0) - np.min(positions, axis=0)
    scene_radius = np.linalg.norm(scene_extent) * 0.5
    near = max(0.0005, args.distance - scene_radius * 2)
    far = args.distance + scene_radius * 4
    LOG.info(f"  Scene center: {scene_center}, radius: {scene_radius:.2f}")
    LOG.info(f"  Camera distance: {args.distance}, near: {near:.4f}, far: {far:.2f}")

    # Per-view delta accumulator
    emissive_candidates = np.full((N, 3, len(ORBIT_VIEWS)), 999.0, dtype=np.float32)
    view_valid = np.zeros((N, len(ORBIT_VIEWS)), dtype=bool)

    for vi, view in enumerate(ORBIT_VIEWS):
        label = view["label"]
        render_path = args.work_dir / f"render_{label}.png"
        supermat_dir = args.work_dir / f"supermat_{label}"

        # Step 1: Render
        if not render_view(args.renderer_url, splat_url, view,
                           render_path, render_path,  # camera_path unused now
                           args.width, args.height, args.distance, args.settle_ms,
                           args.renderer_dir):
            LOG.warning(f"  Skipping {label} — render failed")
            continue

        # Step 2: SuperMat
        if not run_supermat(render_path, supermat_dir, args.supermat_dir,
                            args.device, args.supermat_size):
            LOG.warning(f"  Skipping {label} — SuperMat failed")
            continue

        # Find the albedo output
        albedo_candidates = list(supermat_dir.rglob("albedo.png"))
        if not albedo_candidates:
            LOG.warning(f"  Skipping {label} — no albedo output found")
            continue
        albedo_path = albedo_candidates[0]

        # Step 3: Compute camera matrices from orbit params
        view_mat, proj_mat = compute_orbit_camera(
            view["azimuth"], view["elevation"], args.distance,
            scene_center, near, far,
        )

        # Step 4: Load albedo and project
        albedo_img = np.array(Image.open(albedo_path).convert("RGB")).astype(np.float32) / 255.0
        ah, aw = albedo_img.shape[:2]

        uv, valid = project_splats(positions, view_mat, proj_mat,
                                    args.width, args.height, aw, ah)
        albedo_sampled = sample_rgb(albedo_img, uv, valid)

        # Step 4: Compute delta for this view
        delta = orig_colors - albedo_sampled  # positive where original is brighter
        delta = np.maximum(delta, 0)  # only keep positive (brighter than albedo)

        # Store
        emissive_candidates[:, :, vi] = delta
        view_valid[:, vi] = valid
        valid_count = valid.sum()
        has_emission = (np.sqrt((delta ** 2).sum(axis=1)) > 0.05)[valid].sum()
        LOG.info(f"  {label}: {valid_count} splats projected, {has_emission} with emission > 0.05")

    # Step 5: Per-channel minimum across valid views
    # For each splat, only consider views where it was actually visible
    LOG.info("Computing per-channel minimum across views...")
    emissive = np.zeros((N, 3), dtype=np.float32)
    num_valid_views = view_valid.sum(axis=1)

    # Vectorized per-channel min across valid views
    for i in range(N):
        nv = num_valid_views[i]
        if nv == 0:
            continue
        valid_view_indices = np.where(view_valid[i])[0]
        # emissive_candidates shape is [N, 3, num_total_views]
        # Select valid views: [3, num_valid_views]
        vals = emissive_candidates[i][:, valid_view_indices]
        # Min across views (axis=1), result is [3]
        emissive[i] = np.min(vals, axis=1)

    emit_mag = np.sqrt((emissive ** 2).sum(axis=1))
    emissive_count = (emit_mag > 0.05).sum()
    multi_view_count = (num_valid_views >= 2).sum()
    LOG.info(f"Results:")
    LOG.info(f"  Splats with >= 2 views: {multi_view_count}")
    LOG.info(f"  Emissive splats (mag > 0.05): {emissive_count}")
    LOG.info(f"  Max emissive magnitude: {emit_mag.max():.3f}")

    # Load the target PLY (might be the albedo-baked version)
    LOG.info(f"Loading target PLY: {args.ply}")
    target_ply = PlyData.read(str(args.ply))
    target_verts = target_ply["vertex"]

    # Add emissive attributes
    old_dtype = target_verts.data.dtype
    new_fields = list(old_dtype.descr)
    for fn in ["emissive_r", "emissive_g", "emissive_b"]:
        if fn not in old_dtype.names:
            new_fields.append((fn, "f4"))

    new_data = np.empty(N, dtype=np.dtype(new_fields))
    for name in old_dtype.names:
        new_data[name] = target_verts.data[name]
    new_data["emissive_r"] = emissive[:, 0]
    new_data["emissive_g"] = emissive[:, 1]
    new_data["emissive_b"] = emissive[:, 2]

    new_vertex = PlyElement.describe(new_data, "vertex")
    other_elements = [el for el in target_ply.elements if el.name != "vertex"]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    PlyData([new_vertex] + other_elements, text=False).write(str(args.output))
    LOG.info(f"Wrote: {args.output}")

    # Optional: emissive visualization PLY
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
