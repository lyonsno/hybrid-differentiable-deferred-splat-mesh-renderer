"""PBR baking diagnostic viewer — saves per-view intermediate results.

Renders harvest views, runs MoGE/SuperMat on each, and saves:
- Color render per view
- MoGE normal map per view (visualized as RGB)
- SuperMat roughness map per view
- SuperMat metallic map per view
- Splat coverage map per view (which splats are visible)
- Viewing angle map per view (how face-on each pixel is)
- A contact sheet summary

Usage:
    python -m splat_oracle.pbr_diagnostics --input scene.ply --output-dir /tmp/pbr_diag
    python -m splat_oracle.pbr_diagnostics --input scene.ply --output-dir /tmp/pbr_diag --views 4
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import numpy as np
from PIL import Image

from splat_oracle.loader import SplatCloud, load_spz, load_ply
from splat_oracle.harvest import HarvestView, render_harvest_views

LOG = logging.getLogger(__name__)


def _save_normal_vis(normal_map: np.ndarray, path: Path):
    """Save a normal map as RGB visualization ([-1,1] → [0,255])."""
    vis = ((normal_map * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(vis).save(path)


def _save_scalar_vis(scalar_map: np.ndarray, path: Path, label: str = ""):
    """Save a scalar [0,1] map as grayscale PNG."""
    vis = (scalar_map * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(vis).save(path)


def _save_color_vis(color: np.ndarray, path: Path):
    """Save a float32 [0,1] color image as PNG."""
    vis = (np.clip(color, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(vis).save(path)


def _save_coverage_vis(splat_ids: np.ndarray, weight: np.ndarray, path: Path):
    """Save a coverage visualization: green = covered, red = uncovered, brightness = weight."""
    H, W = splat_ids.shape
    vis = np.zeros((H, W, 3), dtype=np.uint8)
    covered = splat_ids >= 0
    # Green channel = covered, brightness by weight
    w_norm = np.clip(weight / max(weight.max(), 1e-8), 0, 1)
    vis[covered, 1] = (w_norm[covered] * 255).astype(np.uint8)
    vis[~covered, 0] = 40  # dim red for uncovered
    Image.fromarray(vis).save(path)


def _save_viewing_angle_vis(
    normal_map: np.ndarray,
    view: HarvestView,
    path: Path,
):
    """Save viewing angle visualization: bright = face-on, dark = glancing."""
    R = view.camera.view_matrix[:3, :3]
    forward = -R.T @ np.array([0, 0, 1], dtype=np.float32)
    forward = forward / (np.linalg.norm(forward) + 1e-8)

    # Transform normals to world space
    R_inv = R.T
    H, W, _ = normal_map.shape
    flat = normal_map.reshape(-1, 3)
    world = (R_inv @ flat.T).T.reshape(H, W, 3)

    facing = np.abs(np.einsum('ijk,k->ij', world, forward))
    vis = (facing * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(vis).save(path)


def run_diagnostics(
    cloud: SplatCloud,
    output_dir: Path,
    max_views: int | None = None,
    harvest_width: int = 512,
    harvest_height: int = 512,
    run_moge: bool = True,
    run_supermat: bool = True,
    device: str = "mps",
):
    """Run the full diagnostic pipeline and save per-view results.

    Args:
        cloud: SplatCloud to diagnose.
        output_dir: Directory to write diagnostic images.
        max_views: Max views to process (None = all 16).
        harvest_width: Harvest view width.
        harvest_height: Harvest view height.
        run_moge: Whether to run MoGE normal estimation.
        run_supermat: Whether to run SuperMat material estimation.
        device: Device string.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # Render harvest views
    LOG.info(f"Rendering harvest views ({harvest_width}x{harvest_height})...")
    views = render_harvest_views(
        cloud,
        width=harvest_width,
        height=harvest_height,
    )

    if max_views is not None and max_views < len(views):
        # Select views with best coverage
        scored = [(v, v.weight.sum()) for v in views]
        scored.sort(key=lambda x: x[1], reverse=True)
        views = [v for v, _ in scored[:max_views]]

    LOG.info(f"Processing {len(views)} views...")

    view_summaries = []

    for vi, view in enumerate(views):
        view_dir = output_dir / f"view_{vi:02d}"
        view_dir.mkdir(parents=True, exist_ok=True)

        # Camera info
        cam_pos = view.camera.position
        R = view.camera.view_matrix[:3, :3]
        forward = -R.T @ np.array([0, 0, 1], dtype=np.float32)

        summary = {
            "view_index": vi,
            "camera_position": cam_pos.tolist(),
            "camera_forward": (forward / (np.linalg.norm(forward) + 1e-8)).tolist(),
            "total_weight": float(view.weight.sum()),
            "covered_pixels": int((view.splat_id >= 0).sum()),
            "total_pixels": int(view.splat_id.size),
            "coverage_pct": float((view.splat_id >= 0).mean() * 100),
            "unique_splats": int(len(np.unique(view.splat_id[view.splat_id >= 0]))),
        }

        # Save color render
        _save_color_vis(view.color, view_dir / "color.png")
        LOG.info(f"  View {vi}: coverage {summary['coverage_pct']:.1f}%, "
                 f"{summary['unique_splats']} unique splats")

        # Save coverage map
        _save_coverage_vis(view.splat_id, view.weight, view_dir / "coverage.png")

        # Save depth visualization
        depth = view.depth
        valid_depth = depth[depth > 0]
        if len(valid_depth) > 0:
            d_min, d_max = valid_depth.min(), valid_depth.max()
            depth_norm = np.where(depth > 0, (depth - d_min) / max(d_max - d_min, 1e-8), 0)
            _save_scalar_vis(1.0 - depth_norm, view_dir / "depth.png")
        summary["depth_range"] = [float(valid_depth.min()), float(valid_depth.max())] if len(valid_depth) > 0 else None

        # MoGE normals
        if run_moge:
            try:
                import torch
                from splat_oracle.moge_normals import estimate_normals_for_view, _camera_space_to_world_normals

                torch_device = torch.device(device)
                normal_map = estimate_normals_for_view(view, device=torch_device)

                _save_normal_vis(normal_map, view_dir / "moge_normals_camera.png")

                world_normals = _camera_space_to_world_normals(normal_map, view)
                _save_normal_vis(world_normals, view_dir / "moge_normals_world.png")
                _save_viewing_angle_vis(normal_map, view, view_dir / "viewing_angle.png")

                summary["moge_normal_range"] = [
                    float(normal_map.min()), float(normal_map.max())
                ]
                summary["moge_status"] = "ok"
            except Exception as e:
                LOG.warning(f"  MoGE failed on view {vi}: {e}")
                summary["moge_status"] = f"error: {e}"

        # SuperMat materials
        if run_supermat:
            try:
                from splat_oracle.supermat_materials import estimate_materials_for_view

                roughness_map, metallic_map = estimate_materials_for_view(view, device=device)

                _save_scalar_vis(roughness_map, view_dir / "supermat_roughness.png")
                _save_scalar_vis(metallic_map, view_dir / "supermat_metallic.png")

                summary["roughness_mean"] = float(roughness_map[view.splat_id >= 0].mean()) if (view.splat_id >= 0).any() else None
                summary["metallic_mean"] = float(metallic_map[view.splat_id >= 0].mean()) if (view.splat_id >= 0).any() else None
                summary["supermat_status"] = "ok"
            except Exception as e:
                LOG.warning(f"  SuperMat failed on view {vi}: {e}")
                summary["supermat_status"] = f"error: {e}"

        view_summaries.append(summary)

    # Write summary JSON
    report = {
        "splat_count": cloud.num_points,
        "bbox_center": cloud.bbox_center.tolist(),
        "bbox_size": cloud.bbox_size.tolist(),
        "num_views": len(views),
        "harvest_resolution": [harvest_width, harvest_height],
        "views": view_summaries,
    }
    with open(output_dir / "report.json", "w") as f:
        json.dump(report, f, indent=2)
    LOG.info(f"Wrote diagnostic report to {output_dir / 'report.json'}")

    # Contact sheet: all color renders in a grid
    _save_contact_sheet(views, output_dir / "contact_sheet.png", "color")

    LOG.info(f"Diagnostics complete: {output_dir}")


def _save_contact_sheet(views: list[HarvestView], path: Path, mode: str = "color"):
    """Save a contact sheet of all views in a grid."""
    n = len(views)
    cols = min(4, n)
    rows = (n + cols - 1) // cols

    H, W = views[0].color.shape[:2]
    sheet = np.zeros((rows * H, cols * W, 3), dtype=np.uint8)

    for i, view in enumerate(views):
        r, c = divmod(i, cols)
        img = np.clip(view.color, 0, 1)
        sheet[r * H:(r + 1) * H, c * W:(c + 1) * W] = (img * 255).astype(np.uint8)

    Image.fromarray(sheet).save(path)
    LOG.info(f"Saved contact sheet: {path}")


def main():
    parser = argparse.ArgumentParser(
        description="Run PBR baking diagnostics — inspect per-view MoGE/SuperMat results.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--input", type=Path, required=True, help="Input PLY or SPZ file")
    parser.add_argument("--output-dir", type=Path, required=True, help="Output directory for diagnostics")
    parser.add_argument("--device", type=str, default="mps", help="Device (mps/cuda/cpu)")
    parser.add_argument("--width", type=int, default=512, help="Harvest view width")
    parser.add_argument("--height", type=int, default=512, help="Harvest view height")
    parser.add_argument("--views", type=int, default=None, help="Max views to process (default: all 16)")
    parser.add_argument("--no-moge", action="store_true", help="Skip MoGE normal estimation")
    parser.add_argument("--no-supermat", action="store_true", help="Skip SuperMat material estimation")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    path = args.input
    if path.suffix.lower() == ".spz":
        cloud = load_spz(path)
    else:
        cloud = load_ply(path)
    LOG.info(f"Loaded {cloud.num_points} splats from {path}")

    run_diagnostics(
        cloud,
        output_dir=args.output_dir,
        max_views=args.views,
        harvest_width=args.width,
        harvest_height=args.height,
        run_moge=not args.no_moge,
        run_supermat=not args.no_supermat,
        device=args.device,
    )


if __name__ == "__main__":
    main()
