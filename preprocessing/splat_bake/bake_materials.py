"""Bake material maps (roughness, metallic, normals) into a Gaussian splat PLY.

Reads Kaminos correction sidecars (.kaminos-splat.json) when present to apply
rotation, axis flips, centroid offset, and crop before projecting splats to
screen space. ALL splats are retained in the output — cropped-out splats get
default material values.

Usage:
    python bake_materials.py --ply input.ply \
        --roughness roughness.png --metallic metallic.png \
        --output output.ply

    python bake_materials.py --ply input.ply \
        --roughness roughness.png --metallic metallic.png \
        --normal-map normals.png \
        --output output.ply
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from plyfile import PlyData, PlyElement

logging.basicConfig(level=logging.INFO, format="%(message)s")
LOG = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Kaminos sidecar (shared with bake_normals.py)
# ---------------------------------------------------------------------------

def load_kaminos_sidecar(ply_path: Path) -> dict | None:
    sidecar_path = Path(str(ply_path) + ".kaminos-splat.json")
    if not sidecar_path.exists():
        return None
    LOG.info(f"Found Kaminos sidecar: {sidecar_path}")
    with open(sidecar_path) as f:
        data = json.load(f)
    return data.get("correction", {})


def apply_sidecar_correction(positions: np.ndarray, correction: dict
                              ) -> tuple[np.ndarray, np.ndarray]:
    N = positions.shape[0]
    pos = positions.copy()

    offset = correction.get("centroidOffset")
    if offset:
        pos[:, 0] -= offset[0]
        pos[:, 1] -= offset[1]
        pos[:, 2] -= offset[2]
        LOG.info(f"  Applied centroidOffset: {offset}")

    flips = correction.get("axisFlips")
    if flips:
        pos[:, 0] *= flips[0]
        pos[:, 1] *= flips[1]
        pos[:, 2] *= flips[2]
        LOG.info(f"  Applied axisFlips: {flips}")

    rot = correction.get("orientation", {}).get("rotation")
    if rot and any(r != 0 for r in rot):
        rx, ry, rz = rot
        cx, sx = np.cos(rx), np.sin(rx)
        cy, sy = np.cos(ry), np.sin(ry)
        cz, sz = np.cos(rz), np.sin(rz)
        Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
        Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
        Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
        R = Rz @ Ry @ Rx
        pos = pos @ R.T
        LOG.info(f"  Applied rotation: {rot}")

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

def load_ply_raw(path: Path):
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
# Sampling
# ---------------------------------------------------------------------------

def project_to_screen(positions, intrinsics, extrinsics, image_size):
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


def sample_map(the_map, uv, valid):
    is_scalar = the_map.ndim == 2
    if is_scalar:
        the_map = the_map[:, :, None]
    H, W, C = the_map.shape
    N = uv.shape[0]
    result = np.zeros((N, C), dtype=np.float32)
    valid_uv = uv[valid]
    col, row = valid_uv[:, 0], valid_uv[:, 1]
    col0 = np.floor(col).astype(int)
    row0 = np.floor(row).astype(int)
    col1 = np.minimum(col0 + 1, W - 1)
    row1 = np.minimum(row0 + 1, H - 1)
    dc, dr = col - col0, row - row0
    v = (the_map[row0, col0] * (1 - dc)[:, None] * (1 - dr)[:, None] +
         the_map[row0, col1] * dc[:, None] * (1 - dr)[:, None] +
         the_map[row1, col0] * (1 - dc)[:, None] * dr[:, None] +
         the_map[row1, col1] * dc[:, None] * dr[:, None])
    result[valid] = v
    if is_scalar:
        return result[:, 0]
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ply", type=Path, required=True)
    parser.add_argument("--roughness", type=Path, default=None)
    parser.add_argument("--metallic", type=Path, default=None)
    parser.add_argument("--normal-map", type=Path, default=None)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--default-roughness", type=float, default=0.5)
    parser.add_argument("--default-metallic", type=float, default=0.0)
    parser.add_argument("--ignore-sidecar", action="store_true")
    args = parser.parse_args()

    if not args.roughness and not args.metallic and not args.normal_map:
        parser.error("Provide at least one of --roughness, --metallic, --normal-map")

    LOG.info(f"Loading PLY: {args.ply}")
    plydata, positions, meta = load_ply_raw(args.ply)
    N = positions.shape[0]
    LOG.info(f"  {N} splats")

    # Kaminos sidecar
    correction = None if args.ignore_sidecar else load_kaminos_sidecar(args.ply)
    if correction:
        corrected_pos, crop_mask = apply_sidecar_correction(positions, correction)
    else:
        corrected_pos = positions
        crop_mask = np.ones(N, dtype=bool)

    intrinsics = meta["intrinsics"]
    extrinsics = meta["extrinsics"]
    image_size = meta["image_size"]

    # Load maps
    maps = {}
    target_h, target_w = None, None

    if args.roughness:
        r = np.array(Image.open(args.roughness).convert("L")).astype(np.float32) / 255.0
        maps["roughness"] = r
        target_h, target_w = r.shape[:2]
        LOG.info(f"Roughness map: {r.shape[1]}x{r.shape[0]}")
    if args.metallic:
        m = np.array(Image.open(args.metallic).convert("L")).astype(np.float32) / 255.0
        maps["metallic"] = m
        target_h, target_w = m.shape[:2]
        LOG.info(f"Metallic map: {m.shape[1]}x{m.shape[0]}")
    if args.normal_map:
        n = np.array(Image.open(args.normal_map).convert("RGB")).astype(np.float32) / 255.0
        n = n * 2.0 - 1.0
        maps["normal"] = n
        target_h, target_w = n.shape[:2]
        LOG.info(f"Normal map: {n.shape[1]}x{n.shape[0]}")

    if intrinsics is None or extrinsics is None or image_size is None:
        LOG.warning("PLY missing camera metadata — using map dimensions as fallback")
        f_px = max(target_w, target_h)
        intrinsics = np.array([[f_px, 0, target_w/2], [0, f_px, target_h/2], [0, 0, 1]])
        extrinsics = np.eye(4)
        image_size = (target_w, target_h)

    # Scale intrinsics to map resolution
    ply_w, ply_h = image_size
    sx, sy = target_w / ply_w, target_h / ply_h
    scaled_intrinsics = intrinsics.copy()
    scaled_intrinsics[0, :] *= sx
    scaled_intrinsics[1, :] *= sy

    LOG.info(f"Projecting {N} splats...")
    uv, valid = project_to_screen(corrected_pos, scaled_intrinsics, extrinsics,
                                   (target_w, target_h))
    bakeable = valid & crop_mask
    LOG.info(f"  {bakeable.sum()}/{N} bakeable")

    # Sample
    sampled = {}
    if "roughness" in maps:
        sampled["roughness"] = sample_map(maps["roughness"], uv, bakeable)
        sampled["roughness"][~bakeable] = args.default_roughness
    if "metallic" in maps:
        sampled["metallic"] = sample_map(maps["metallic"], uv, bakeable)
        sampled["metallic"][~bakeable] = args.default_metallic
    if "normal" in maps:
        normals = sample_map(maps["normal"], uv, bakeable)
        norms = np.linalg.norm(normals, axis=1, keepdims=True)
        normals = normals / np.maximum(norms, 1e-8)
        normals[~bakeable] = [0.0, -1.0, 0.0]
        sampled["nx"] = normals[:, 0]
        sampled["ny"] = normals[:, 1]
        sampled["nz"] = normals[:, 2]

    # Build output PLY — ALL splats retained
    verts = plydata["vertex"]
    old_dtype = verts.data.dtype
    new_fields = list(old_dtype.descr)
    for fn in ["roughness", "metallic", "nx", "ny", "nz"]:
        if fn in sampled and fn not in old_dtype.names:
            new_fields.append((fn, "f4"))

    new_dtype = np.dtype(new_fields)
    new_data = np.empty(N, dtype=new_dtype)
    for name in old_dtype.names:
        new_data[name] = verts.data[name]
    for fn, values in sampled.items():
        new_data[fn] = values

    new_vertex = PlyElement.describe(new_data, "vertex")
    other_elements = [el for el in plydata.elements if el.name != "vertex"]
    out_ply = PlyData([new_vertex] + other_elements, text=False)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    out_ply.write(str(args.output))

    baked = [k for k in sampled if k not in ("nx", "ny", "nz")]
    if any(k in sampled for k in ("nx", "ny", "nz")):
        baked.append("normals")
    LOG.info(f"Wrote {args.output} ({N} splats, baked: {', '.join(baked)})")


if __name__ == "__main__":
    main()
