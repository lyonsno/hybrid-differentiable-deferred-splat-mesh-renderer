"""Unified PBR baking pipeline for splat clouds.

Renders harvest views, runs MoGE for normals and SuperMat for materials,
and bakes the results into per-splat attributes. Supports multi-view
fusion with viewing-angle weighting.

Usage:
    python -m splat_oracle.pbr_bake --input scene.ply --output scene_pbr.ply
    python -m splat_oracle.pbr_bake --input scene.ply --output scene_pbr.ply --views 6 --normals-only
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import numpy as np

from splat_oracle.loader import SplatCloud, load_spz, load_ply

LOG = logging.getLogger(__name__)


def select_harvest_views(
    views: list,
    max_views: int | None = None,
) -> list:
    """Select a subset of harvest views for baking.

    When max_views is set, selects views with the best coverage
    (highest total weight sum) to maximize splat coverage.

    Args:
        views: All available harvest views.
        max_views: Maximum number of views to use. None = use all.

    Returns:
        Selected views.
    """
    if max_views is None or max_views >= len(views):
        return views

    # Score each view by total weight (coverage)
    scored = [(v, v.weight.sum()) for v in views]
    scored.sort(key=lambda x: x[1], reverse=True)

    return [v for v, _ in scored[:max_views]]


def bake_pbr(
    cloud: SplatCloud,
    normals: bool = True,
    materials: bool = True,
    harvest_width: int = 512,
    harvest_height: int = 512,
    max_views: int | None = None,
    device: str = "mps",
) -> SplatCloud:
    """Run the full PBR baking pipeline on a splat cloud.

    1. Render harvest views from multiple viewpoints
    2. (Optional) Run MoGE for per-splat normals
    3. (Optional) Run SuperMat for per-splat roughness/metallic
    4. Fuse multi-view results and assign to cloud

    Args:
        cloud: Input SplatCloud.
        normals: Whether to bake MoGE normals.
        materials: Whether to bake SuperMat materials.
        harvest_width: Harvest view width.
        harvest_height: Harvest view height.
        max_views: Max number of harvest views (None = all 16).
        device: Torch/SuperMat device.

    Returns:
        The same SplatCloud with normals/roughness/metalness populated.
    """
    from splat_oracle.harvest import render_harvest_views

    LOG.info(f"Rendering harvest views ({harvest_width}x{harvest_height})...")
    views = render_harvest_views(
        cloud,
        width=harvest_width,
        height=harvest_height,
    )
    LOG.info(f"  {len(views)} harvest views rendered")

    views = select_harvest_views(views, max_views)
    LOG.info(f"  Using {len(views)} views for baking")

    if normals:
        import torch
        from splat_oracle.moge_normals import bake_normals_from_views

        torch_device = torch.device(device)
        cloud.normals = bake_normals_from_views(cloud, views, device=torch_device)

    if materials:
        from splat_oracle.supermat_materials import bake_materials_from_views

        cloud.roughness, cloud.metalness = bake_materials_from_views(
            cloud, views, device=device,
        )

    return cloud


def save_baked_ply(cloud: SplatCloud, output_path: Path):
    """Save a SplatCloud with baked PBR attributes as a PLY file.

    Writes standard 3DGS vertex properties plus optional nx/ny/nz,
    roughness, and metallic per-vertex attributes.
    """
    from plyfile import PlyData, PlyElement

    N = cloud.num_points

    # Build dtype
    fields = [
        ("x", "f4"), ("y", "f4"), ("z", "f4"),
        ("f_dc_0", "f4"), ("f_dc_1", "f4"), ("f_dc_2", "f4"),
        ("opacity", "f4"),
        ("scale_0", "f4"), ("scale_1", "f4"), ("scale_2", "f4"),
        ("rot_0", "f4"), ("rot_1", "f4"), ("rot_2", "f4"), ("rot_3", "f4"),
    ]

    if cloud.normals is not None:
        fields += [("nx", "f4"), ("ny", "f4"), ("nz", "f4")]
    if cloud.roughness is not None:
        fields.append(("roughness", "f4"))
    if cloud.metalness is not None:
        fields.append(("metallic", "f4"))

    dtype = np.dtype(fields)
    data = np.empty(N, dtype=dtype)

    data["x"] = cloud.positions[:, 0]
    data["y"] = cloud.positions[:, 1]
    data["z"] = cloud.positions[:, 2]

    # SH DC: reverse the color activation (linear RGB → SH DC coefficients)
    SH_C0 = 0.28209479177387814
    data["f_dc_0"] = (cloud.colors[:, 0] - 0.5) / SH_C0
    data["f_dc_1"] = (cloud.colors[:, 1] - 0.5) / SH_C0
    data["f_dc_2"] = (cloud.colors[:, 2] - 0.5) / SH_C0

    # Opacity: reverse sigmoid → logit
    o = np.clip(cloud.opacities, 1e-6, 1 - 1e-6)
    data["opacity"] = np.log(o / (1 - o))

    data["scale_0"] = cloud.scales[:, 0]
    data["scale_1"] = cloud.scales[:, 1]
    data["scale_2"] = cloud.scales[:, 2]
    data["rot_0"] = cloud.rotations[:, 0]
    data["rot_1"] = cloud.rotations[:, 1]
    data["rot_2"] = cloud.rotations[:, 2]
    data["rot_3"] = cloud.rotations[:, 3]

    if cloud.normals is not None:
        data["nx"] = cloud.normals[:, 0]
        data["ny"] = cloud.normals[:, 1]
        data["nz"] = cloud.normals[:, 2]
    if cloud.roughness is not None:
        data["roughness"] = cloud.roughness
    if cloud.metalness is not None:
        data["metallic"] = cloud.metalness

    vertex = PlyElement.describe(data, "vertex")
    PlyData([vertex], text=False).write(str(output_path))
    LOG.info(f"Saved baked PLY: {output_path} ({N} splats)")


def main():
    parser = argparse.ArgumentParser(
        description="Bake MoGE normals and SuperMat materials into a splat PLY.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--input", type=Path, required=True, help="Input PLY or SPZ file")
    parser.add_argument("--output", type=Path, required=True, help="Output PLY with baked PBR")
    parser.add_argument("--device", type=str, default="mps", help="Device (mps/cuda/cpu)")
    parser.add_argument("--width", type=int, default=512, help="Harvest view width")
    parser.add_argument("--height", type=int, default=512, help="Harvest view height")
    parser.add_argument("--max-views", type=int, default=None, help="Max harvest views (default: all 16)")
    parser.add_argument("--normals-only", action="store_true", help="Only bake normals, skip materials")
    parser.add_argument("--materials-only", action="store_true", help="Only bake materials, skip normals")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    # Load
    path = args.input
    if path.suffix.lower() == ".spz":
        cloud = load_spz(path)
    else:
        cloud = load_ply(path)
    LOG.info(f"Loaded {cloud.num_points} splats from {path}")

    do_normals = not args.materials_only
    do_materials = not args.normals_only

    bake_pbr(
        cloud,
        normals=do_normals,
        materials=do_materials,
        harvest_width=args.width,
        harvest_height=args.height,
        max_views=args.max_views,
        device=args.device,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    save_baked_ply(cloud, args.output)
    LOG.info("Done.")


if __name__ == "__main__":
    main()
