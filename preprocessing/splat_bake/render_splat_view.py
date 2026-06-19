"""Render a splat PLY to an image for MoGE/SuperMat consumption.

Simple CPU splat rendering: projects each splat center to screen space,
splats a colored disc, composites front-to-back. Not production quality —
just enough for MoGE normal estimation and SuperMat material decomposition.

Reads Kaminos correction sidecars when present.

Usage:
    python render_splat_view.py --ply input.ply --output render.png
    python render_splat_view.py --ply input.ply --output render.png --width 1024 --height 1024
    python render_splat_view.py --ply input.ply --output render.png --azimuth 0.5 --elevation 0.3
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import numpy as np
from PIL import Image
from plyfile import PlyData

logging.basicConfig(level=logging.INFO, format="%(message)s")
LOG = logging.getLogger(__name__)

SH_C0 = 0.28209479177387814


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def load_kaminos_sidecar(ply_path: Path) -> dict | None:
    sidecar_path = Path(str(ply_path) + ".kaminos-splat.json")
    if not sidecar_path.exists():
        return None
    LOG.info(f"Found Kaminos sidecar: {sidecar_path}")
    with open(sidecar_path) as f:
        return json.load(f).get("correction", {})


def apply_correction(pos: np.ndarray, correction: dict) -> tuple[np.ndarray, np.ndarray]:
    N = pos.shape[0]
    p = pos.copy()

    offset = correction.get("centroidOffset")
    if offset:
        p -= np.array(offset)

    flips = correction.get("axisFlips")
    if flips:
        p *= np.array(flips)

    rot = correction.get("orientation", {}).get("rotation")
    if rot and any(r != 0 for r in rot):
        rx, ry, rz = rot
        cx, sx = np.cos(rx), np.sin(rx)
        cy, sy = np.cos(ry), np.sin(ry)
        cz, sz = np.cos(rz), np.sin(rz)
        R = (np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]]) @
             np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]) @
             np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]]))
        p = p @ R.T

    crop = correction.get("crop", {})
    if crop.get("enabled"):
        cmin, cmax = np.array(crop["min"]), np.array(crop["max"])
        mask = np.all(p >= cmin, axis=1) & np.all(p <= cmax, axis=1)
    else:
        mask = np.ones(N, dtype=bool)

    return p, mask


def orbit_camera(azimuth: float, elevation: float, distance: float, target: np.ndarray):
    """Compute view matrix for an orbit camera."""
    ca, sa = np.cos(azimuth), np.sin(azimuth)
    ce, se = np.cos(elevation), np.sin(elevation)

    eye = target + distance * np.array([sa * ce, -se, ca * ce])
    forward = target - eye
    forward /= np.linalg.norm(forward)

    up = np.array([0.0, -1.0, 0.0])  # Y-down convention
    right = np.cross(forward, up)
    right_norm = np.linalg.norm(right)
    if right_norm < 1e-6:
        up = np.array([0.0, 0.0, 1.0])
        right = np.cross(forward, up)
    right /= np.linalg.norm(right)
    up = np.cross(right, forward)

    R = np.eye(4)
    R[0, :3] = right
    R[1, :3] = up
    R[2, :3] = -forward
    T = np.eye(4)
    T[:3, 3] = -eye
    return R @ T


def render_splats(positions, colors, opacities, radii, view_matrix, proj_matrix,
                  width, height):
    """Simple front-to-back splat render."""
    N = positions.shape[0]

    # Transform to camera space
    pts_h = np.concatenate([positions, np.ones((N, 1))], axis=1)
    pts_cam = (view_matrix @ pts_h.T).T[:, :3]

    # Depth sort (front to back)
    depths = pts_cam[:, 2]
    order = np.argsort(depths)

    # Project to screen
    pts_clip = (proj_matrix @ np.concatenate([pts_cam, np.ones((N, 1))], axis=1).T).T
    w = pts_clip[:, 3:4]
    ndc = pts_clip[:, :2] / np.maximum(np.abs(w), 1e-8)
    px = ((ndc[:, 0] + 1) * 0.5 * width).astype(int)
    py = ((ndc[:, 1] + 1) * 0.5 * height).astype(int)

    # Render
    canvas = np.zeros((height, width, 3), dtype=np.float32)
    alpha_acc = np.zeros((height, width), dtype=np.float32)

    for idx in order:
        if depths[idx] <= 0.01:
            continue
        x, y = px[idx], py[idx]
        r = max(1, int(radii[idx] * width / (2 * max(depths[idx], 0.1))))
        r = min(r, 8)  # cap radius for speed
        a = opacities[idx]
        c = colors[idx]

        y0 = max(0, y - r)
        y1 = min(height, y + r + 1)
        x0 = max(0, x - r)
        x1 = min(width, x + r + 1)

        if x0 >= x1 or y0 >= y1:
            continue

        remaining = 1.0 - alpha_acc[y0:y1, x0:x1]
        contrib = a * remaining
        canvas[y0:y1, x0:x1] += contrib[:, :, None] * c
        alpha_acc[y0:y1, x0:x1] += contrib

    canvas = np.clip(canvas, 0, 1)
    return (canvas * 255).astype(np.uint8)


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ply", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--azimuth", type=float, default=0.0)
    parser.add_argument("--elevation", type=float, default=0.3)
    parser.add_argument("--fov", type=float, default=50.0, help="Vertical FOV in degrees")
    parser.add_argument("--ignore-sidecar", action="store_true")
    args = parser.parse_args()

    LOG.info(f"Loading: {args.ply}")
    plydata = PlyData.read(str(args.ply))
    verts = plydata["vertex"]
    N = len(verts.data)

    positions = np.stack([
        np.asarray(verts["x"]),
        np.asarray(verts["y"]),
        np.asarray(verts["z"]),
    ], axis=1).astype(np.float32)

    # Colors from SH
    if "f_dc_0" in verts.data.dtype.names:
        colors = np.stack([
            np.clip(0.5 + SH_C0 * np.asarray(verts["f_dc_0"]), 0, 1),
            np.clip(0.5 + SH_C0 * np.asarray(verts["f_dc_1"]), 0, 1),
            np.clip(0.5 + SH_C0 * np.asarray(verts["f_dc_2"]), 0, 1),
        ], axis=1).astype(np.float32)
    elif "red" in verts.data.dtype.names:
        colors = np.stack([
            np.asarray(verts["red"]) / 255.0,
            np.asarray(verts["green"]) / 255.0,
            np.asarray(verts["blue"]) / 255.0,
        ], axis=1).astype(np.float32)
    else:
        colors = np.ones((N, 3), dtype=np.float32) * 0.5

    # Opacity
    if "opacity" in verts.data.dtype.names:
        opacities = sigmoid(np.asarray(verts["opacity"])).astype(np.float32)
    else:
        opacities = np.ones(N, dtype=np.float32)

    # Radii from scales
    if "scale_0" in verts.data.dtype.names:
        scales = np.stack([
            np.asarray(verts["scale_0"]),
            np.asarray(verts["scale_1"]),
            np.asarray(verts["scale_2"]),
        ], axis=1)
        radii = np.max(np.exp(scales), axis=1).astype(np.float32)
    else:
        radii = np.ones(N, dtype=np.float32) * 0.01

    LOG.info(f"  {N} splats")

    # Apply sidecar
    correction = None if args.ignore_sidecar else load_kaminos_sidecar(args.ply)
    if correction:
        positions, crop_mask = apply_correction(positions, correction)
        positions = positions[crop_mask]
        colors = colors[crop_mask]
        opacities = opacities[crop_mask]
        radii = radii[crop_mask]
        LOG.info(f"  After sidecar: {positions.shape[0]} splats")

    # Compute scene bounds for camera
    center = np.median(positions, axis=0)
    extent = np.max(positions, axis=0) - np.min(positions, axis=0)
    scene_radius = np.linalg.norm(extent) * 0.5
    distance = scene_radius * 2.5

    LOG.info(f"  Center: {center}, extent: {extent}, distance: {distance:.2f}")

    # Camera
    view = orbit_camera(args.azimuth, args.elevation, distance, center)

    # Perspective projection
    fov_rad = np.radians(args.fov)
    aspect = args.width / args.height
    near, far = 0.01, distance * 10
    f = 1.0 / np.tan(fov_rad * 0.5)
    proj = np.zeros((4, 4))
    proj[0, 0] = f / aspect
    proj[1, 1] = f
    proj[2, 2] = -(far + near) / (far - near)
    proj[2, 3] = -2 * far * near / (far - near)
    proj[3, 2] = -1

    LOG.info(f"Rendering {positions.shape[0]} splats at {args.width}x{args.height}...")
    img = render_splats(positions, colors, opacities, radii, view, proj,
                        args.width, args.height)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img).save(args.output)
    LOG.info(f"Saved: {args.output}")


if __name__ == "__main__":
    main()
