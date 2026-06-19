"""Bake MoGE-estimated normals into a Gaussian splat PLY.

Reads Kaminos correction sidecars (.kaminos-splat.json) when present to apply
rotation, axis flips, centroid offset, and crop before projecting splats to
screen space. The sidecar corrections affect which splats get normals and how
they map to the MoGE normal map, but the output PLY retains ALL splats
(including cropped-out ones, which get default normals).

Usage:
    python bake_normals.py --ply input.ply --image source.png --output output.ply
    python bake_normals.py --ply input.ply --image source.png --output output.ply --device mps
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from plyfile import PlyData, PlyElement

logging.basicConfig(level=logging.INFO, format="%(message)s")
LOG = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Kaminos sidecar
# ---------------------------------------------------------------------------

def load_kaminos_sidecar(ply_path: Path) -> dict | None:
    """Load a Kaminos correction sidecar if it exists."""
    sidecar_path = Path(str(ply_path) + ".kaminos-splat.json")
    if not sidecar_path.exists():
        return None
    LOG.info(f"Found Kaminos sidecar: {sidecar_path}")
    with open(sidecar_path) as f:
        data = json.load(f)
    return data.get("correction", {})


def apply_sidecar_correction(positions: np.ndarray, correction: dict
                              ) -> tuple[np.ndarray, np.ndarray]:
    """Apply Kaminos sidecar corrections to positions.

    Returns:
        corrected_positions: [N, 3] corrected positions
        crop_mask: [N] bool mask (True = inside crop, False = cropped out)
    """
    N = positions.shape[0]
    pos = positions.copy()

    # Centroid offset
    offset = correction.get("centroidOffset")
    if offset:
        pos[:, 0] -= offset[0]
        pos[:, 1] -= offset[1]
        pos[:, 2] -= offset[2]
        LOG.info(f"  Applied centroidOffset: {offset}")

    # Axis flips
    flips = correction.get("axisFlips")
    if flips:
        pos[:, 0] *= flips[0]
        pos[:, 1] *= flips[1]
        pos[:, 2] *= flips[2]
        LOG.info(f"  Applied axisFlips: {flips}")

    # Rotation (Euler XYZ)
    rot = correction.get("orientation", {}).get("rotation")
    if rot and any(r != 0 for r in rot):
        rx, ry, rz = rot
        # Build rotation matrix from Euler angles (XYZ order)
        cx, sx = np.cos(rx), np.sin(rx)
        cy, sy = np.cos(ry), np.sin(ry)
        cz, sz = np.cos(rz), np.sin(rz)
        Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
        Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
        Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
        R = Rz @ Ry @ Rx
        pos = pos @ R.T
        LOG.info(f"  Applied rotation: {rot}")

    # Crop
    crop = correction.get("crop", {})
    if crop.get("enabled"):
        cmin = np.array(crop["min"])
        cmax = np.array(crop["max"])
        crop_mask = np.all(pos >= cmin, axis=1) & np.all(pos <= cmax, axis=1)
        LOG.info(f"  Applied crop: {crop_mask.sum()}/{N} inside bounds")
    else:
        crop_mask = np.ones(N, dtype=bool)

    return pos, crop_mask


# ---------------------------------------------------------------------------
# PLY loading
# ---------------------------------------------------------------------------

def load_ply_raw(path: Path) -> tuple[PlyData, np.ndarray, dict]:
    """Load PLY and extract positions + intrinsics."""
    plydata = PlyData.read(str(path))
    verts = plydata["vertex"]
    positions = np.stack([
        np.asarray(verts["x"]),
        np.asarray(verts["y"]),
        np.asarray(verts["z"]),
    ], axis=1)

    intrinsics = extrinsics = image_size = None
    for element in plydata.elements:
        if element.name == "intrinsic":
            intrinsics = np.array([row[0] for row in element.data]).reshape(3, 3)
        elif element.name == "image_size":
            sizes = [row[0] for row in element.data]
            image_size = (int(sizes[0]), int(sizes[1]))
        elif element.name == "extrinsic":
            extrinsics = np.array([row[0] for row in element.data]).reshape(4, 4)

    return plydata, positions, {
        "intrinsics": intrinsics, "image_size": image_size, "extrinsics": extrinsics
    }


# ---------------------------------------------------------------------------
# Projection and sampling
# ---------------------------------------------------------------------------

def project_to_screen(positions, intrinsics, extrinsics, image_size):
    """Project 3D positions to 2D pixel coordinates."""
    N = positions.shape[0]
    pts_h = np.concatenate([positions, np.ones((N, 1))], axis=1)
    pts_cam = (extrinsics @ pts_h.T).T[:, :3]
    z = pts_cam[:, 2]
    valid = z > 0.01
    px = intrinsics[0, 0] * pts_cam[:, 0] / z + intrinsics[0, 2]
    py = intrinsics[1, 1] * pts_cam[:, 1] / z + intrinsics[1, 2]
    width, height = image_size
    valid &= (px >= 0) & (px < width) & (py >= 0) & (py < height)
    return np.stack([px, py], axis=1), valid


def sample_normal_map(normal_map, uv, valid):
    """Bilinear sample normals from map at projected positions."""
    H, W, _ = normal_map.shape
    N = uv.shape[0]
    normals = np.zeros((N, 3), dtype=np.float32)
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
    normals[valid] = n
    return normals


def run_moge_normals(image: np.ndarray, device: torch.device) -> np.ndarray:
    """Run MoGE vits-normal, return normal map in [-1, 1]."""
    sys.path.insert(0, "/tmp/moge-standalone")
    from moge.model.v2 import MoGeModel

    LOG.info("Loading MoGE-2 vits-normal...")
    model = MoGeModel.from_pretrained("Ruicheng/moge-2-vits-normal").to(device).eval()
    img_tensor = torch.from_numpy(image.copy()).permute(2, 0, 1).unsqueeze(0).float() / 255.0
    img_tensor = img_tensor.to(device)

    LOG.info("Running MoGE normal estimation...")
    with torch.no_grad():
        output = model.infer(img_tensor)
    normals = output["normal"].cpu().numpy()[0]
    LOG.info(f"Normal map: {normals.shape}, range [{normals.min():.3f}, {normals.max():.3f}]")
    return normals


def save_ply_with_normals(original_ply, normals, output_path):
    """Write new PLY with nx, ny, nz added."""
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
    LOG.info(f"Wrote {output_path} ({N} splats with normals)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ply", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True,
                        help="Source image to run MoGE on")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--device", type=str, default="mps")
    parser.add_argument("--normal-map-out", type=Path, default=None)
    parser.add_argument("--camera", type=Path, default=None,
                        help="Camera state JSON from render-splat-screenshot.mjs. "
                             "If provided, uses the renderer's view/projection matrices "
                             "instead of PLY stored intrinsics.")
    parser.add_argument("--ignore-sidecar", action="store_true",
                        help="Ignore Kaminos correction sidecar even if present")
    args = parser.parse_args()

    device = torch.device(args.device)

    LOG.info(f"Loading PLY: {args.ply}")
    plydata, positions, meta = load_ply_raw(args.ply)
    N = positions.shape[0]
    LOG.info(f"  {N} splats")

    # Load and apply Kaminos sidecar corrections
    correction = None if args.ignore_sidecar else load_kaminos_sidecar(args.ply)
    if correction:
        corrected_pos, crop_mask = apply_sidecar_correction(positions, correction)
    else:
        corrected_pos = positions
        crop_mask = np.ones(N, dtype=bool)

    # Load source image
    image = np.array(Image.open(args.image).convert("RGB"))
    LOG.info(f"Source image: {image.shape[1]}x{image.shape[0]}")

    # Run MoGE
    normal_map = run_moge_normals(image, device)

    if args.normal_map_out:
        vis = ((normal_map * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)
        Image.fromarray(vis).save(args.normal_map_out)
        LOG.info(f"Saved normal map: {args.normal_map_out}")

    # Project splats to screen space
    normal_h, normal_w = normal_map.shape[:2]

    if args.camera:
        # Use renderer camera matrices
        LOG.info(f"Using renderer camera from: {args.camera}")
        with open(args.camera) as f:
            cam = json.load(f)
        # WebGPU/GL stores matrices column-major in flat arrays — transpose to row-major for numpy
        view_matrix = np.array(cam["viewMatrix"]).reshape(4, 4).T
        proj_matrix = np.array(cam["projectionMatrix"]).reshape(4, 4).T
        vp_w = cam["viewportWidth"]
        vp_h = cam["viewportHeight"]

        # Project via viewProj using RAW positions — the renderer doesn't
        # apply sidecar corrections, it uses the PLY positions directly.
        viewProj = proj_matrix @ view_matrix
        pts_h = np.concatenate([positions, np.ones((N, 1))], axis=1)
        clip = (viewProj @ pts_h.T).T  # [N, 4]
        w_clip = clip[:, 3]
        valid = w_clip > 0.01
        ndc_x = clip[:, 0] / np.where(valid, w_clip, 1.0)
        ndc_y = clip[:, 1] / np.where(valid, w_clip, 1.0)
        # NDC [-1,1] -> pixel coords, scaled to normal map resolution
        px = ((ndc_x + 1) * 0.5 * vp_w) * (normal_w / vp_w)
        py = ((ndc_y + 1) * 0.5 * vp_h) * (normal_h / vp_h)  # no Y flip — renderer Y matches image Y
        valid &= (px >= 0) & (px < normal_w) & (py >= 0) & (py < normal_h)
        uv = np.stack([px, py], axis=1)
        LOG.info(f"Projecting {N} splats via renderer camera to {normal_w}x{normal_h}...")
    else:
        # Fall back to PLY stored intrinsics
        intrinsics = meta["intrinsics"]
        extrinsics = meta["extrinsics"]
        image_size = meta["image_size"]

        if intrinsics is None or extrinsics is None or image_size is None:
            LOG.warning("PLY missing camera metadata — using image dimensions as fallback")
            h, w = normal_h, normal_w
            f_px = max(w, h)
            intrinsics = np.array([[f_px, 0, w/2], [0, f_px, h/2], [0, 0, 1]])
            extrinsics = np.eye(4)
            image_size = (w, h)

        ply_w, ply_h = image_size
        sx, sy = normal_w / ply_w, normal_h / ply_h
        scaled_intrinsics = intrinsics.copy()
        scaled_intrinsics[0, :] *= sx
        scaled_intrinsics[1, :] *= sy

        LOG.info(f"Projecting {N} splats via PLY intrinsics to {normal_w}x{normal_h}...")
        uv, valid = project_to_screen(corrected_pos, scaled_intrinsics, extrinsics,
                                       (normal_w, normal_h))

    # Only bake normals for splats that are both in-view AND inside crop
    bakeable = valid & crop_mask
    LOG.info(f"  {bakeable.sum()}/{N} splats bakeable "
             f"({valid.sum()} in view, {crop_mask.sum()} inside crop)")

    # Sample normals
    normals = sample_normal_map(normal_map, uv, bakeable)
    normals[~bakeable] = [0.0, -1.0, 0.0]  # default for non-bakeable

    # Save — ALL splats kept, only bakeable ones get real normals
    save_ply_with_normals(plydata, normals, args.output)


if __name__ == "__main__":
    main()
