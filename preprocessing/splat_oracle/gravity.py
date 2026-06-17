"""Gravity estimation and scene orientation from splat geometry.

Estimates the scene's up direction (gravity vector) and ground plane
from the Gaussian splat covariance structure. Each splat's thin axis
(smallest scale) gives its local surface normal. The dominant normal
direction across many splats reveals the gravity-aligned up vector.

Scaniverse captures are typically already ARKit gravity-aligned, so
the up direction is usually close to a coordinate axis. This module
detects which direction and refines it from the geometry.

IMPORTANT: 3DGS-trained PLYs are typically pre-normalized (centered,
scaled to [-1,1]) with zero normals — ARKit gravity alignment is lost.
The covariance thin-axis approach is also unreliable for vegetation/
foliage scenes (~33% alignment on tested outdoor scene). For
pre-normalized PLYs, the operator should provide the up direction
rather than relying on automatic estimation.
"""

from __future__ import annotations

import logging

import numpy as np

from splat_oracle.loader import SplatCloud

LOG = logging.getLogger(__name__)


def covariance_normals(cloud: SplatCloud) -> np.ndarray:
    """Compute per-splat normals from the Gaussian covariance structure.

    The normal direction is the thin axis of the ellipsoid — the axis
    with the smallest scale. This is the same computation used in the
    GPU projection shader.

    Args:
        cloud: SplatCloud with scales (N, 3) log-scale and rotations (N, 4) wxyz quaternion.

    Returns:
        normals: (N, 3) float32 unit normals.
    """
    N = cloud.num_points
    scales = np.exp(cloud.scales)  # (N, 3) — actual scale per axis
    rotations = cloud.rotations    # (N, 4) — wxyz quaternion

    # Build rotation matrices from quaternions (wxyz convention)
    w, x, y, z = rotations[:, 0], rotations[:, 1], rotations[:, 2], rotations[:, 3]

    # Rotation matrix columns (world-space axes of the ellipsoid)
    # Column 0: rotated X axis
    ax0 = np.stack([
        1 - 2 * (y * y + z * z),
        2 * (x * y + w * z),
        2 * (x * z - w * y),
    ], axis=1)  # (N, 3)

    # Column 1: rotated Y axis
    ax1 = np.stack([
        2 * (x * y - w * z),
        1 - 2 * (x * x + z * z),
        2 * (y * z + w * x),
    ], axis=1)

    # Column 2: rotated Z axis
    ax2 = np.stack([
        2 * (x * z + w * y),
        2 * (y * z - w * x),
        1 - 2 * (x * x + y * y),
    ], axis=1)

    # Scale each axis
    ax0 *= scales[:, 0:1]
    ax1 *= scales[:, 1:2]
    ax2 *= scales[:, 2:3]

    # The normal is the axis with the smallest magnitude (thinnest direction)
    len0 = np.sum(ax0 ** 2, axis=1)  # (N,)
    len1 = np.sum(ax1 ** 2, axis=1)
    len2 = np.sum(ax2 ** 2, axis=1)

    # Select the shortest axis per splat
    min_is_0 = (len0 <= len1) & (len0 <= len2)
    min_is_1 = (len1 < len0) & (len1 <= len2)
    # min_is_2 = everything else

    normals = np.where(min_is_0[:, None], ax0,
              np.where(min_is_1[:, None], ax1, ax2))

    # Normalize
    norms = np.linalg.norm(normals, axis=1, keepdims=True)
    normals = normals / np.maximum(norms, 1e-8)

    return normals.astype(np.float32)


def estimate_gravity(
    cloud: SplatCloud,
    normals: np.ndarray | None = None,
) -> np.ndarray:
    """Estimate the scene's up direction (gravity vector) from splat normals.

    Uses a normal histogram approach: the dominant normal direction across
    many splats reveals the gravity-aligned up vector. Floor, table, and
    wall surfaces vote for gravity via their normals.

    Handles the sign ambiguity (normals can point up or down) by clustering
    both hemispheres and picking the one with more votes.

    Args:
        cloud: SplatCloud.
        normals: (N, 3) pre-computed normals. If None, computes from covariance.

    Returns:
        up: (3,) float32 unit vector pointing "up" (anti-gravity).
    """
    if normals is None:
        normals = covariance_normals(cloud)

    N = normals.shape[0]

    # Quantize normal directions into a coarse spherical histogram.
    # Use icosahedral-ish binning: project onto 26 canonical directions
    # (6 axis-aligned + 8 corners + 12 edges)
    candidates = []

    # 6 axis-aligned
    for axis in range(3):
        for sign in [-1, 1]:
            d = np.zeros(3, dtype=np.float32)
            d[axis] = sign
            candidates.append(d)

    # 8 corners
    s = 1.0 / np.sqrt(3)
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            for sz in [-1, 1]:
                candidates.append(np.array([sx * s, sy * s, sz * s], dtype=np.float32))

    # 12 edge midpoints
    s2 = 1.0 / np.sqrt(2)
    for a in range(3):
        for b in range(a + 1, 3):
            for sa in [-1, 1]:
                for sb in [-1, 1]:
                    d = np.zeros(3, dtype=np.float32)
                    d[a] = sa * s2
                    d[b] = sb * s2
                    candidates.append(d)

    candidates = np.array(candidates)  # (26, 3)

    # Vote: each splat's normal votes for the closest candidate direction.
    # Use abs(dot product) to handle sign ambiguity.
    dots = np.abs(normals @ candidates.T)  # (N, 26)
    votes = dots.sum(axis=0)  # (26,) — sum of alignment scores

    best_idx = np.argmax(votes)
    best_dir = candidates[best_idx]

    # Refine: average the normals that are well-aligned with the winner
    alignment = normals @ best_dir  # (N,) — signed dot product
    well_aligned = np.abs(alignment) > 0.7  # within ~45 degrees

    if well_aligned.sum() > 10:
        # Use signed alignment to resolve up vs down
        # More normals should point "up" (away from ground) in most scenes
        aligned_normals = normals[well_aligned]
        signed = aligned_normals @ best_dir
        # Flip normals that disagree with best_dir so they all point the same way
        consistent = aligned_normals * np.sign(signed)[:, None]
        refined = consistent.mean(axis=0)
        refined = refined / (np.linalg.norm(refined) + 1e-8)
    else:
        refined = best_dir

    # Convention: "up" should point away from the ground.
    # Heuristic: the center of mass of the scene is usually above the ground plane.
    # If most splats are above the center along the up direction, flip.
    center = cloud.positions.mean(axis=0)
    positions_centered = cloud.positions - center
    height_scores = positions_centered @ refined

    # If more than 60% of splats are below the midpoint, we're pointing down → flip
    below_median = (height_scores < np.median(height_scores)).mean()
    if below_median > 0.6:
        refined = -refined

    LOG.info(f"Estimated gravity up direction: [{refined[0]:.3f}, {refined[1]:.3f}, {refined[2]:.3f}]")
    LOG.info(f"  {well_aligned.sum()}/{N} splats well-aligned ({100 * well_aligned.mean():.1f}%)")

    return refined.astype(np.float32)


def estimate_ground_plane(
    cloud: SplatCloud,
    up: np.ndarray,
    percentile: float = 5.0,
) -> float:
    """Estimate the ground plane height along the up direction.

    Args:
        cloud: SplatCloud.
        up: (3,) up direction unit vector.
        percentile: Height percentile to use as ground (5 = near bottom).

    Returns:
        ground_height: scalar height along the up direction.
    """
    heights = cloud.positions @ up
    ground = np.percentile(heights, percentile)
    LOG.info(f"Ground plane height: {ground:.3f} (at {percentile}th percentile)")
    return float(ground)


def estimate_scene_orientation(
    cloud: SplatCloud,
) -> dict:
    """Full scene orientation estimation.

    Returns:
        Dict with:
        - up: (3,) up direction
        - center: (3,) scene center
        - ground_height: float
        - radius: float — scene radius for camera placement
        - forward: (3,) a reasonable default forward direction
    """
    normals = covariance_normals(cloud)
    up = estimate_gravity(cloud, normals)
    center = cloud.positions.mean(axis=0).astype(np.float32)
    ground_height = estimate_ground_plane(cloud, up)

    # Scene radius: use the 95th percentile distance from center
    # (avoids outlier splats inflating the radius)
    dists = np.linalg.norm(cloud.positions - center, axis=1)
    radius = float(np.percentile(dists, 95))

    # Forward direction: perpendicular to up, pointing toward
    # the densest part of the scene. Use the principal direction
    # of positions projected onto the plane perpendicular to up.
    projected = cloud.positions - center
    projected = projected - np.outer(projected @ up, up)  # project onto plane
    if np.linalg.norm(projected.std(axis=0)) > 1e-6:
        # SVD to find dominant direction in the horizontal plane
        _, _, Vt = np.linalg.svd(projected, full_matrices=False)
        forward = Vt[0].astype(np.float32)
        # Ensure perpendicular to up
        forward = forward - np.dot(forward, up) * up
        forward = forward / (np.linalg.norm(forward) + 1e-8)
    else:
        # Degenerate case: pick any perpendicular direction
        forward = np.cross(up, np.array([1, 0, 0], dtype=np.float32))
        if np.linalg.norm(forward) < 0.1:
            forward = np.cross(up, np.array([0, 0, 1], dtype=np.float32))
        forward = forward / (np.linalg.norm(forward) + 1e-8)

    LOG.info(f"Scene orientation: center=[{center[0]:.3f}, {center[1]:.3f}, {center[2]:.3f}], "
             f"radius={radius:.3f}, ground={ground_height:.3f}")

    return {
        "up": up,
        "center": center,
        "ground_height": ground_height,
        "radius": radius,
        "forward": forward.astype(np.float32),
    }
