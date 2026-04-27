"""Ghost splat detection — identifies and culls phantom geometry behind reflective surfaces.

Phone scans reconstruct reflections as real geometry: phantom rooms behind mirrors,
ghost objects in windows. This module detects and masks those splats.

Pipeline:
  1. SAM3 reflective surface detection on harvest views
  2. Plane fitting to frontmost splats in each reflective region
  3. Depth culling of splats behind fitted planes
  4. Photometric inconsistency flagging across views
"""

from __future__ import annotations

import numpy as np

from splat_oracle.harvest import HarvestView
from splat_oracle.loader import SplatCloud
from splat_oracle.materials import REFLECTIVE_CLASSES, MATERIAL_PROMPTS

# Derive reflective prompts from the centralized vocabulary
REFLECTIVE_PROMPTS = {
    k: MATERIAL_PROMPTS[k]
    for k in REFLECTIVE_CLASSES
    if k in MATERIAL_PROMPTS
}


def _fit_plane(points: np.ndarray) -> tuple[np.ndarray, float]:
    """Fit a plane to 3D points via SVD. Returns (normal, d) where normal·p + d = 0."""
    centroid = points.mean(axis=0)
    centered = points - centroid
    _, _, Vt = np.linalg.svd(centered)
    normal = Vt[-1]
    d = -np.dot(normal, centroid)
    return normal, d


def _frontmost_fraction(
    depths: np.ndarray,
    fraction: float = 0.2,
) -> np.ndarray:
    """Return indices of the frontmost fraction of points by depth."""
    n_front = max(3, int(len(depths) * fraction))
    return np.argsort(depths)[:n_front]


def detect_reflective_regions(
    views: list[HarvestView],
    min_score: float = 0.25,
) -> list[dict]:
    """Run SAM3 on harvest views to find reflective surfaces.

    Returns list of dicts with:
        view_index, label, mask, score, splat_ids
    """
    from splat_oracle.segmentation import get_sam3
    from PIL import Image

    _, processor = get_sam3()
    regions = []

    for vi, view in enumerate(views):
        img_array = (np.clip(view.color, 0, 1) * 255).astype(np.uint8)
        img = Image.fromarray(img_array)
        state = processor.set_image(img)

        for label, prompt in REFLECTIVE_PROMPTS.items():
            s = processor.set_text_prompt(prompt, state)
            scores = np.array(s["scores"])
            masks = np.array(s["masks"])

            if scores.size == 0:
                continue

            for i in range(len(scores)):
                score = float(scores[i])
                if score < min_score:
                    continue

                mask = masks[i, 0].astype(bool)  # (H, W)
                # Collect splat IDs under this mask
                valid = mask & (view.splat_id >= 0)
                if not valid.any():
                    continue

                splat_ids = np.unique(view.splat_id[valid])

                regions.append({
                    "view_index": vi,
                    "label": label,
                    "mask": mask,
                    "score": score,
                    "splat_ids": splat_ids,
                })

    return regions


def fit_reflective_planes(
    cloud: SplatCloud,
    regions: list[dict],
    views: list[HarvestView],
) -> list[dict]:
    """Fit planes to the front surface of each detected reflective region.

    For each region, take the frontmost splats (by depth from the detecting camera)
    and fit a plane. This plane represents the actual reflective surface (mirror,
    window, etc). Anything behind it in that direction is a ghost candidate.

    Returns regions augmented with 'plane_normal', 'plane_d', 'plane_centroid'.
    """
    for region in regions:
        view = views[region["view_index"]]
        splat_ids = region["splat_ids"]

        if len(splat_ids) < 3:
            region["plane_normal"] = None
            continue

        positions = cloud.positions[splat_ids]

        # Depths from this camera: use the view's depth buffer
        # For each splat, get its approximate depth from the splat_id buffer
        depths = np.full(len(splat_ids), np.inf, dtype=np.float32)
        for idx, sid in enumerate(splat_ids):
            hit = view.splat_id == sid
            if hit.any():
                d = view.depth[hit]
                depths[idx] = d[d > 0].min() if (d > 0).any() else np.inf

        # Fit plane to frontmost 20% of splats
        front_idx = _frontmost_fraction(depths, fraction=0.2)
        front_positions = positions[front_idx]

        if len(front_positions) < 3:
            region["plane_normal"] = None
            continue

        normal, d = _fit_plane(front_positions)
        centroid = front_positions.mean(axis=0)

        # Orient normal toward camera (away from ghost space)
        cam_pos = views[region["view_index"]].camera.position
        if np.dot(normal, cam_pos - centroid) < 0:
            normal = -normal
            d = -d

        region["plane_normal"] = normal
        region["plane_d"] = d
        region["plane_centroid"] = centroid

    return regions


def cull_ghost_splats(
    cloud: SplatCloud,
    regions: list[dict],
    margin: float = 0.0,
) -> None:
    """Mark splats behind reflective planes as ghosts.

    A splat is a ghost candidate if:
    - It was detected as part of a reflective region
    - Its position is behind the fitted plane (on the non-camera side)
    - It's further than `margin` behind the plane

    Sets cloud.ghost_mask (True = ghost splat).
    """
    N = cloud.num_points
    ghost_votes = np.zeros(N, dtype=np.float32)

    for region in regions:
        normal = region.get("plane_normal")
        if normal is None:
            continue

        d = region["plane_d"]
        score = region["score"]

        # Check ALL splats near this region, not just the detected ones
        # signed_dist > 0 = in front of plane (toward camera), < 0 = behind (ghost space)
        signed_dist = cloud.positions @ normal + d

        # Ghost candidates: behind the plane by more than margin
        behind = signed_dist < -margin

        # Only consider splats that are spatially near the reflective region
        centroid = region["plane_centroid"]
        region_radius = np.linalg.norm(
            cloud.positions[region["splat_ids"]] - centroid, axis=1
        ).max() * 1.5  # extend slightly

        near_region = np.linalg.norm(cloud.positions - centroid, axis=1) < region_radius

        ghost_candidates = behind & near_region
        ghost_votes[ghost_candidates] += score

    # A splat is a ghost if it accumulated enough votes
    cloud.ghost_mask = ghost_votes > 0.5


def detect_photometric_inconsistency(
    cloud: SplatCloud,
    views: list[HarvestView],
    variance_threshold: float = 0.15,
) -> None:
    """Flag splats with suspicious color variance across views.

    Ghost splats (reflections) appear/disappear/shift color as the camera moves
    relative to the reflective surface. Real geometry has stable color across views.

    Augments existing ghost_mask with photometric evidence.
    """
    N = cloud.num_points

    # Collect per-splat colors across views
    color_samples = [[] for _ in range(N)]
    for view in views:
        valid = view.splat_id >= 0
        ids = view.splat_id[valid]
        colors = view.color[valid]

        for sid, color in zip(ids, colors):
            if len(color_samples[sid]) < 20:  # cap samples per splat
                color_samples[sid].append(color)

    # Compute variance per splat
    variance = np.zeros(N, dtype=np.float32)
    sample_count = np.zeros(N, dtype=np.int32)

    for i in range(N):
        samples = color_samples[i]
        if len(samples) >= 3:
            arr = np.array(samples)
            # MAD-based robust spread (not standard deviation)
            median = np.median(arr, axis=0)
            mad = np.median(np.abs(arr - median), axis=0)
            variance[i] = mad.mean()
            sample_count[i] = len(samples)

    # High variance + enough samples → photometric ghost candidate
    photo_ghost = (variance > variance_threshold) & (sample_count >= 4)

    if cloud.ghost_mask is None:
        cloud.ghost_mask = photo_ghost
    else:
        # Combine: either geometric ghost OR photometric ghost
        cloud.ghost_mask = cloud.ghost_mask | photo_ghost


def detect_ghosts(
    cloud: SplatCloud,
    views: list[HarvestView],
    min_reflective_score: float = 0.25,
    depth_margin: float = 0.0,
    variance_threshold: float = 0.15,
) -> list[dict]:
    """Full ghost detection pipeline.

    1. Detect reflective surfaces via SAM3
    2. Fit planes to reflective regions
    3. Cull splats behind those planes
    4. Flag photometrically inconsistent splats

    Returns detected reflective regions. Modifies cloud.ghost_mask in-place.
    """
    # Stage 1: Detect reflective surfaces
    regions = detect_reflective_regions(views, min_score=min_reflective_score)

    if regions:
        # Stage 2: Fit planes
        regions = fit_reflective_planes(cloud, regions, views)

        # Stage 3: Depth culling
        cull_ghost_splats(cloud, regions, margin=depth_margin)

    # Stage 4: Photometric inconsistency
    detect_photometric_inconsistency(cloud, views, variance_threshold=variance_threshold)

    n_ghosts = cloud.ghost_mask.sum() if cloud.ghost_mask is not None else 0
    return regions
