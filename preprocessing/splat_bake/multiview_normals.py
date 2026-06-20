"""Multi-view MoGE consensus normal baking.

Renders N orbit views of a splat PLY, runs MoGE on each, projects normals
back to splats, and takes the median across views. Hallucinated normal grain
(not grounded in 3D structure) scatters across views and gets killed by the
median. Real geometric detail converges and survives.

Usage:
    python multiview_normals.py \
        --ply input.ply \
        --output output.ply \
        --views 8 \
        --renderer-url http://localhost:5174 \
        --device mps

Requires: running dev server (npm run dev), MoGE installed, Playwright.
"""
from __future__ import annotations

import argparse
import json
import logging
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from plyfile import PlyData, PlyElement

logging.basicConfig(level=logging.INFO, format="%(message)s")
LOG = logging.getLogger(__name__)


def render_orbit_views(
    ply_path: Path,
    output_dir: Path,
    n_views: int,
    renderer_url: str,
    width: int = 1024,
    height: int = 1024,
    elevation: float = 0.25,
    azimuth_center: float | None = None,
    azimuth_spread: float | None = None,
    distance: float | None = None,
    **kwargs,
) -> list[dict]:
    """Render N orbit views using the headless screenshot tool.

    If azimuth_center and azimuth_spread are given, views are distributed
    within [center - spread/2, center + spread/2] instead of full 360°.

    Returns list of {image_path, camera_path, azimuth, elevation} dicts.
    """
    views = []
    script = Path(__file__).parent.parent.parent / "scripts" / "render-splat-screenshot.mjs"

    # Build view list: if center/spread given, distribute within the arc.
    # If elevation_spread is also given, create a grid of (azimuth, elevation) pairs.
    elevation_spread = kwargs.get("elevation_spread", 0.0)
    view_params = []
    if azimuth_center is not None and azimuth_spread is not None and elevation_spread > 0:
        # Grid: distribute across azimuth × elevation
        n_az = max(2, int(np.ceil(np.sqrt(n_views))))
        n_el = max(2, n_views // n_az)
        for ia in range(n_az):
            az = azimuth_center - azimuth_spread / 2 + (ia / max(1, n_az - 1)) * azimuth_spread if n_az > 1 else azimuth_center
            for ie in range(n_el):
                el = elevation - elevation_spread / 2 + (ie / max(1, n_el - 1)) * elevation_spread if n_el > 1 else elevation
                view_params.append((az, el))
                if len(view_params) >= n_views:
                    break
            if len(view_params) >= n_views:
                break
    elif azimuth_center is not None and azimuth_spread is not None:
        for i in range(n_views):
            if n_views == 1:
                az = azimuth_center
            else:
                t = i / (n_views - 1)
                az = azimuth_center - azimuth_spread / 2 + t * azimuth_spread
            view_params.append((az, elevation))
    else:
        for i in range(n_views):
            view_params.append(((2 * np.pi * i) / n_views, elevation))

    for i, (azimuth, elev) in enumerate(view_params):
        img_path = output_dir / f"view_{i:02d}.png"
        cam_path = output_dir / f"view_{i:02d}.camera.json"

        # Compute path relative to project root so Vite can serve it.
        # Use Path (not .resolve()) to preserve symlinks.
        project_root = script.parent.parent
        try:
            # Try the literal path first (preserves symlinks)
            rel_ply = str(Path(ply_path).relative_to(project_root))
        except ValueError:
            try:
                rel_ply = str(ply_path.resolve().relative_to(project_root.resolve()))
            except ValueError:
                rel_ply = str(ply_path)

        LOG.info(f"Rendering view {i+1}/{n_views}: azimuth={azimuth:.2f}, elevation={elev:.2f}")
        cmd = [
            "node", str(script),
            "--splat", rel_ply,
            "--output", str(img_path),
            "--width", str(width),
            "--height", str(height),
            "--azimuth", str(azimuth),
            "--elevation", str(elev),
            "--settle-ms", "2000",
            "--url", renderer_url,
        ]
        if distance is not None:
            cmd.extend(["--distance", str(distance)])
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180, cwd=str(project_root))
        if result.returncode != 0:
            LOG.warning(f"  Render failed: {result.stderr[:200]}")
            continue

        if img_path.exists() and cam_path.exists():
            views.append({
                "image_path": img_path,
                "camera_path": cam_path,
                "azimuth": azimuth,
                "elevation": elev,
                "index": i,
            })
        else:
            LOG.warning(f"  Missing output for view {i}")

    LOG.info(f"Rendered {len(views)}/{n_views} views")
    return views


def run_moge_normals(image: np.ndarray, device: torch.device, model=None):
    """Run MoGE normal estimation. Returns normal map (H, W, 3) in [-1, 1] and the model."""
    sys.path.insert(0, "/tmp/moge-standalone")
    from moge.model.v2 import MoGeModel

    if model is None:
        LOG.info("Loading MoGE-2 vits-normal...")
        model = MoGeModel.from_pretrained("Ruicheng/moge-2-vits-normal").to(device).eval()

    img_tensor = torch.from_numpy(image.copy()).permute(2, 0, 1).unsqueeze(0).float() / 255.0
    img_tensor = img_tensor.to(device)

    with torch.no_grad():
        output = model.infer(img_tensor)
    normals = output["normal"].cpu().numpy()[0]
    return normals, model


def project_splats_to_view(positions: np.ndarray, camera: dict, normal_map_shape: tuple[int, int]):
    """Project splat positions to pixel coordinates matching the renderer exactly.

    The renderer computes:
        clip = FLIP_Y * proj * view * pos
        ndc = clip.xy / clip.w
        screen.x = (ndc.x * 0.5 + 0.5) * viewport.x
        screen.y = (1.0 - (ndc.y * 0.5 + 0.5)) * viewport.y

    The camera JSON stores raw view and proj (without FLIP_Y). The two Y-flips
    (FLIP_Y in viewProj and the 1.0- in screen.y) cancel out, giving:
        screen.x = (raw_ndc.x * 0.5 + 0.5) * viewport.x
        screen.y = (raw_ndc.y * 0.5 + 0.5) * viewport.y

    Returns (uv, valid) arrays.
    """
    N = positions.shape[0]
    normal_h, normal_w = normal_map_shape

    view_matrix = np.array(camera["viewMatrix"]).reshape(4, 4).T
    proj_matrix = np.array(camera["projectionMatrix"]).reshape(4, 4).T
    vp_w = camera["viewportWidth"]
    vp_h = camera["viewportHeight"]

    # Apply VIEWER_VERTICAL_FLIP to match the renderer's viewProj.
    # The renderer composes: viewProj = FLIP_Y * proj * view
    # FLIP_Y negates row 1 of the result.
    viewProj = proj_matrix @ view_matrix
    viewProj[1, :] = -viewProj[1, :]  # FLIP_Y

    pts_h = np.concatenate([positions, np.ones((N, 1))], axis=1)
    clip = (viewProj @ pts_h.T).T
    w_clip = clip[:, 3]
    valid = w_clip > 0.01
    ndc_x = clip[:, 0] / np.where(valid, w_clip, 1.0)
    ndc_y = clip[:, 1] / np.where(valid, w_clip, 1.0)

    # With FLIP_Y baked in, NDC Y+ points DOWN. Correct mapping per README footgun #3:
    px = ((ndc_x + 1) * 0.5 * vp_w) * (normal_w / vp_w)
    py = ((1 - ndc_y) * 0.5 * vp_h) * (normal_h / vp_h)
    valid &= (px >= 0) & (px < normal_w) & (py >= 0) & (py < normal_h)
    uv = np.stack([px, py], axis=1)
    return uv, valid


def sample_normal_map(normal_map: np.ndarray, uv: np.ndarray, valid: np.ndarray,
                      cam_to_world_rot: np.ndarray | None = None) -> np.ndarray:
    """Bilinear sample normals from map at projected positions.

    If cam_to_world_rot is provided (3x3 rotation matrix), transforms the
    sampled camera-space normals to world space before returning.
    MoGE outputs normals in camera space: X=right, Y=down, Z=toward camera.
    """
    H, W, _ = normal_map.shape
    N = uv.shape[0]
    normals = np.full((N, 3), np.nan, dtype=np.float32)
    valid_uv = uv[valid]
    col, row = valid_uv[:, 0], valid_uv[:, 1]
    col0 = np.floor(col).astype(int)
    row0 = np.floor(row).astype(int)
    col1 = np.minimum(col0 + 1, W - 1)
    row1 = np.minimum(row0 + 1, H - 1)
    dc, dr = col - col0, row - row0

    n = (normal_map[row0, col0] * (1 - dc)[:, None] * (1 - dr)[:, None] +
         normal_map[row0, col1] * dc[:, None] * (1 - dr)[:, None] +
         normal_map[row1, col0] * (1 - dc)[:, None] * dr[:, None] +
         normal_map[row1, col1] * dc[:, None] * dr[:, None])

    norms = np.linalg.norm(n, axis=1, keepdims=True)
    n = n / np.maximum(norms, 1e-8)

    # Transform from camera space to world space
    if cam_to_world_rot is not None:
        n = (cam_to_world_rot @ n.T).T

    normals[valid] = n
    return normals


def consensus_normals(
    all_normals: list[np.ndarray],
    min_views: int = 2,
    angular_threshold_deg: float = 45.0,
) -> np.ndarray:
    """Compute consensus normals from multiple views.

    For each splat:
    1. Collect all non-NaN normal estimates across views
    2. If fewer than min_views, use the single best or default
    3. Compute component-wise median as initial estimate
    4. Reject outliers beyond angular_threshold from median
    5. Re-average the inliers

    Returns (N, 3) consensus normals.
    """
    N = all_normals[0].shape[0]
    n_views = len(all_normals)

    # Stack: (n_views, N, 3)
    stacked = np.stack(all_normals, axis=0)

    # Count valid (non-NaN) observations per splat
    valid_mask = ~np.isnan(stacked[:, :, 0])  # (n_views, N)
    valid_counts = valid_mask.sum(axis=0)  # (N,)

    # Component-wise median (ignoring NaN)
    median_normals = np.nanmedian(stacked, axis=0)  # (N, 3)
    median_len = np.linalg.norm(median_normals, axis=1, keepdims=True)
    median_normals = median_normals / np.maximum(median_len, 1e-8)

    # Outlier rejection: compute angular distance from median
    cos_threshold = np.cos(np.radians(angular_threshold_deg))
    result = np.zeros((N, 3), dtype=np.float32)
    result_counts = np.zeros(N, dtype=np.int32)

    for v in range(n_views):
        view_normals = stacked[v]  # (N, 3)
        is_valid = valid_mask[v]  # (N,)

        # Dot product with median
        dots = np.sum(view_normals * median_normals, axis=1)  # (N,)
        is_inlier = is_valid & (dots > cos_threshold)

        result[is_inlier] += view_normals[is_inlier]
        result_counts[is_inlier] += 1

    # Normalize averaged inliers
    has_result = result_counts >= min_views
    result_len = np.linalg.norm(result, axis=1, keepdims=True)
    result = result / np.maximum(result_len, 1e-8)

    # Fall back to median for splats with too few inlier views
    fallback = (~has_result) & (valid_counts > 0)
    result[fallback] = median_normals[fallback]

    # Default normal for splats with no valid observations
    no_data = valid_counts == 0
    result[no_data] = [0.0, -1.0, 0.0]

    LOG.info(f"Consensus: {has_result.sum()} splats with {min_views}+ inlier views, "
             f"{fallback.sum()} fallback to median, {no_data.sum()} no data")

    return result


def save_ply_with_normals(original_ply: PlyData, normals: np.ndarray, output_path: Path):
    """Write PLY with nx, ny, nz."""
    verts = original_ply["vertex"]
    N = len(verts.data)
    old_dtype = verts.data.dtype
    new_fields = list(old_dtype.descr)
    for fn in ("nx", "ny", "nz"):
        if fn not in old_dtype.names:
            new_fields.append((fn, "f4"))
    new_dtype = np.dtype(new_fields)
    new_data = np.empty(N, dtype=new_dtype)
    for name in old_dtype.names:
        new_data[name] = verts.data[name]
    new_data["nx"] = normals[:, 0]
    new_data["ny"] = normals[:, 1]
    new_data["nz"] = normals[:, 2]

    new_vertex = PlyElement.describe(new_data, "vertex")
    other_elements = [el for el in original_ply.elements if el.name != "vertex"]
    out_ply = PlyData([new_vertex] + other_elements, text=False)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_ply.write(str(output_path))
    LOG.info(f"Wrote {output_path} ({N} splats with consensus normals)")


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ply", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--views", type=int, default=8, help="Number of orbit views")
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--elevation", type=float, default=0.25)
    parser.add_argument("--azimuth-center", type=float, default=None,
                        help="Center azimuth for views (default: full orbit)")
    parser.add_argument("--azimuth-spread", type=float, default=None,
                        help="Total azimuth spread in radians (default: 2*pi full orbit). "
                             "E.g. 1.57 for ±45° around center")
    parser.add_argument("--distance", type=float, default=None,
                        help="Camera distance override")
    parser.add_argument("--elevation-spread", type=float, default=0.0,
                        help="Elevation variation in radians (e.g. 0.2 for ±0.1)")
    parser.add_argument("--renderer-url", type=str, default="http://localhost:5174")
    parser.add_argument("--device", type=str, default="mps")
    parser.add_argument("--min-views", type=int, default=2,
                        help="Minimum inlier views for consensus")
    parser.add_argument("--angular-threshold", type=float, default=45.0,
                        help="Angular threshold (degrees) for outlier rejection")
    parser.add_argument("--keep-renders", action="store_true",
                        help="Keep rendered images instead of cleaning up")
    parser.add_argument("--normal-maps-dir", type=Path, default=None,
                        help="Save individual normal maps to this directory")
    args = parser.parse_args()

    device = torch.device(args.device)

    # Load PLY
    LOG.info(f"Loading PLY: {args.ply}")
    plydata = PlyData.read(str(args.ply))
    verts = plydata["vertex"]
    positions = np.stack([
        np.asarray(verts["x"]),
        np.asarray(verts["y"]),
        np.asarray(verts["z"]),
    ], axis=1)
    N = positions.shape[0]
    LOG.info(f"  {N} splats")

    # Render orbit views
    with tempfile.TemporaryDirectory(prefix="multiview_normals_") as tmpdir:
        render_dir = Path(tmpdir) if not args.keep_renders else Path(args.output.parent / "multiview_renders")
        render_dir.mkdir(parents=True, exist_ok=True)

        views = render_orbit_views(
            ply_path=args.ply,
            output_dir=render_dir,
            n_views=args.views,
            renderer_url=args.renderer_url,
            width=args.width,
            height=args.height,
            elevation=args.elevation,
            azimuth_center=args.azimuth_center,
            azimuth_spread=args.azimuth_spread,
            distance=args.distance,
            elevation_spread=args.elevation_spread,
        )

        if not views:
            LOG.error("No views rendered. Is the dev server running?")
            sys.exit(1)

        # Run MoGE on each view and project normals
        moge_model = None
        all_normals = []

        if args.normal_maps_dir:
            args.normal_maps_dir.mkdir(parents=True, exist_ok=True)

        for view in views:
            LOG.info(f"\n--- View {view['index']+1}/{args.views} (azimuth={view['azimuth']:.2f}) ---")

            # Load rendered image
            image = np.array(Image.open(view["image_path"]).convert("RGB"))
            LOG.info(f"  Image: {image.shape[1]}x{image.shape[0]}")

            # Run MoGE (reuse model across views)
            normal_map, moge_model = run_moge_normals(image, device, model=moge_model)
            LOG.info(f"  Normal map: {normal_map.shape}")

            if args.normal_maps_dir:
                vis = ((normal_map * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)
                Image.fromarray(vis).save(args.normal_maps_dir / f"normals_{view['index']:02d}.png")

            # Load camera
            with open(view["camera_path"]) as f:
                camera = json.load(f)

            # Project and sample (no rotation for now — debug)
            uv, valid = project_splats_to_view(positions, camera, normal_map.shape[:2])
            view_normals = sample_normal_map(normal_map, uv, valid)
            LOG.info(f"  Projected: {valid.sum()}/{N} visible")

            all_normals.append(view_normals)

    # Compute consensus
    LOG.info(f"\n--- Computing consensus from {len(all_normals)} views ---")
    consensus = consensus_normals(
        all_normals,
        min_views=args.min_views,
        angular_threshold_deg=args.angular_threshold,
    )

    # Save
    save_ply_with_normals(plydata, consensus, args.output)


if __name__ == "__main__":
    main()
