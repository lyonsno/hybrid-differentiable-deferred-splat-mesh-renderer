"""Adaptive camera placement for MoGE/SuperMat baking.

Generates camera viewpoints that produce natural-looking photographs
suitable for monocular normal/material estimation. Biased toward the
distribution of real phone photography: eye-level elevation, natural
distance, slight downward tilt, landscape orientation.

Requires an up direction (from operator or inference) and a scene
center. Uses Gaussian opacity as a soft occupancy field to avoid
placing cameras inside geometry. Scores candidates by frame fill
and COVER directional coverage.
"""

from __future__ import annotations

import logging
import math

import numpy as np

from splat_oracle.camera import Camera, look_at, perspective
from splat_oracle.loader import SplatCloud

LOG = logging.getLogger(__name__)


def gaussian_occupancy_at(
    point: np.ndarray,
    positions: np.ndarray,
    scales: np.ndarray,
    opacities: np.ndarray,
    max_dist_sigma: float = 3.0,
) -> float:
    """Evaluate soft Gaussian occupancy at a query point.

    Tests whether a camera position would be inside dense geometry
    by evaluating the sum of Gaussian contributions at that point.

    Args:
        point: (3,) query position.
        positions: (N, 3) Gaussian centers.
        scales: (N, 3) log-scale per axis.
        opacities: (N,) opacity in [0, 1].
        max_dist_sigma: Only consider Gaussians within this many sigmas.

    Returns:
        occupancy: float — accumulated opacity-weighted Gaussian density.
            Values > ~0.3 suggest the point is inside geometry.
    """
    sigma = np.exp(scales)  # (N, 3) actual scale
    max_sigma = sigma.max(axis=1)  # (N,) — largest axis

    # Quick distance filter
    delta = positions - point[None, :]  # (N, 3)
    dist = np.linalg.norm(delta, axis=1)  # (N,)
    nearby = dist < max_sigma * max_dist_sigma
    if not nearby.any():
        return 0.0

    # Evaluate Gaussian at query point for nearby splats
    delta_near = delta[nearby]
    sigma_near = sigma[nearby]
    opacity_near = opacities[nearby]

    # Mahalanobis-ish distance (axis-aligned)
    normalized = (delta_near / (sigma_near + 1e-8)) ** 2
    gauss = np.exp(-0.5 * normalized.sum(axis=1))
    weighted = (gauss * opacity_near).sum()

    return float(weighted)


def generate_candidate_cameras(
    center: np.ndarray,
    up: np.ndarray,
    radius: float,
    width: int = 512,
    height: int = 512,
    fov_y_deg: float = 50.0,
    n_azimuth: int = 12,
    n_elevation: int = 4,
    n_distance: int = 3,
) -> list[Camera]:
    """Generate candidate cameras biased toward natural phone photography.

    Distribution priors:
    - Azimuth: uniform around the scene (every 30° for n_azimuth=12)
    - Elevation: biased toward eye-level with slight downward tilt.
      Range: -10° to +50° above horizon (not straight down, not from below)
    - Distance: multiple distances to ensure frame-filling at various scales.
      Range: 0.8× to 2.0× scene radius
    - FOV: 50° (typical phone camera)
    - Orientation: landscape (wider than tall)

    Args:
        center: (3,) scene center.
        up: (3,) unit up direction.
        radius: Scene radius (95th percentile distance from center).
        width: Image width.
        height: Image height.
        fov_y_deg: Vertical field of view.
        n_azimuth: Number of azimuthal positions.
        n_elevation: Number of elevation levels.
        n_distance: Number of distance levels.

    Returns:
        List of candidate Camera objects.
    """
    center = np.asarray(center, dtype=np.float32)
    up = np.asarray(up, dtype=np.float32)
    up = up / (np.linalg.norm(up) + 1e-8)

    # Build a right/forward basis from up
    # Pick a right vector perpendicular to up
    trial = np.array([1, 0, 0], dtype=np.float32)
    if abs(np.dot(up, trial)) > 0.9:
        trial = np.array([0, 0, 1], dtype=np.float32)
    right = np.cross(up, trial)
    right = right / (np.linalg.norm(right) + 1e-8)
    forward = np.cross(right, up)
    forward = forward / (np.linalg.norm(forward) + 1e-8)

    # Elevation angles: biased toward eye-level / slightly above
    # -10° (slightly below eye level) to +50° (elevated three-quarter)
    # More samples near 10-30° (the sweet spot for phone photos)
    elevations_deg = np.linspace(-10, 50, n_elevation)

    # Distance multipliers: closer and further from scene
    distances = np.linspace(0.8, 2.0, n_distance) * radius

    # Azimuth: uniform around the scene
    azimuths = np.linspace(0, 2 * math.pi, n_azimuth, endpoint=False)

    near = radius * 0.01
    far = radius * 20.0
    aspect = width / height
    proj = perspective(fov_y_deg, aspect, near, far)

    cameras = []
    for dist in distances:
        for elev_deg in elevations_deg:
            elev = math.radians(elev_deg)
            cos_e = math.cos(elev)
            sin_e = math.sin(elev)

            for azimuth in azimuths:
                # Camera position on hemisphere
                cos_a = math.cos(azimuth)
                sin_a = math.sin(azimuth)

                # Horizontal direction from center
                horiz = right * cos_a + forward * sin_a
                # Camera position
                eye = center + horiz * cos_e * dist + up * sin_e * dist

                # Look at center with slight downward bias:
                # target is slightly below scene center (mimics looking
                # slightly down, as people naturally do)
                target = center - up * radius * 0.1

                view = look_at(eye, target, up)
                cameras.append(Camera(
                    view_matrix=view, proj_matrix=proj,
                    width=width, height=height,
                ))

    LOG.info(f"Generated {len(cameras)} candidate cameras "
             f"({n_azimuth} azimuth × {n_elevation} elevation × {n_distance} distance)")
    return cameras


def estimate_frame_fill(
    camera: Camera,
    positions: np.ndarray,
    scales: np.ndarray | None = None,
    opacities: np.ndarray | None = None,
    grid_size: int = 32,
) -> float:
    """Estimate what fraction of the frame would be filled with opaque scene content.

    Projects each splat as a screen-space disc weighted by opacity and
    accumulates into a low-res coverage grid. This gives a much better
    estimate than bounding-box-of-projected-points because it accounts
    for splat size, depth, and opacity.

    Args:
        camera: Camera to evaluate.
        positions: (N, 3) Gaussian positions.
        scales: (N, 3) log-scale per axis. If None, treats splats as points.
        opacities: (N,) opacity in [0, 1]. If None, assumes 1.0.
        grid_size: Resolution of the coverage grid (32 = fast, 64 = precise).

    Returns:
        fill: float in [0, 1] — fraction of grid cells with accumulated
            opacity > 0.1 (i.e., meaningfully covered).
    """
    N = positions.shape[0]
    ones = np.ones((N, 1), dtype=np.float32)
    pts_h = np.concatenate([positions, ones], axis=1)  # (N, 4)

    viewproj = camera.viewproj  # (4, 4)
    clip = (viewproj @ pts_h.T).T  # (N, 4)
    w = clip[:, 3]

    # In front of camera
    visible = w > 0.01
    if visible.sum() < 10:
        return 0.0

    ndc_x = clip[visible, 0] / w[visible]
    ndc_y = clip[visible, 1] / w[visible]
    depth = w[visible]

    # Screen space [0, 1]
    sx = ndc_x * 0.5 + 0.5
    sy = 1.0 - (ndc_y * 0.5 + 0.5)

    # Only count splats in frame
    in_frame = (sx >= 0) & (sx < 1) & (sy >= 0) & (sy < 1)
    if in_frame.sum() < 5:
        return 0.0

    # Compute screen-space radius for each visible splat
    if scales is not None:
        vis_scales = scales[np.where(visible)[0][in_frame]]
        world_radius = np.exp(vis_scales).max(axis=1)  # max axis
        focal_y = camera.proj_matrix[1, 1] * camera.height / 2
        screen_radius = world_radius * focal_y / np.maximum(depth[in_frame], 0.01)
        # Normalize to [0, 1] grid coordinates
        screen_radius_norm = screen_radius / camera.height
    else:
        screen_radius_norm = np.full(in_frame.sum(), 1.0 / grid_size)

    if opacities is not None:
        vis_opacity = opacities[np.where(visible)[0][in_frame]]
    else:
        vis_opacity = np.ones(in_frame.sum(), dtype=np.float32)

    # Accumulate into low-res grid
    grid = np.zeros((grid_size, grid_size), dtype=np.float32)
    gx = np.clip((sx[in_frame] * grid_size).astype(int), 0, grid_size - 1)
    gy = np.clip((sy[in_frame] * grid_size).astype(int), 0, grid_size - 1)

    # Each splat contributes opacity weighted by its screen coverage
    # Larger splats (closer) contribute more
    coverage_weight = np.clip(screen_radius_norm * grid_size, 0.1, 4.0)
    contribution = vis_opacity * coverage_weight

    np.add.at(grid, (gy, gx), contribution)

    # Fraction of cells with meaningful coverage
    covered_cells = (grid > 0.1).sum()
    total_cells = grid_size * grid_size

    return float(covered_cells / total_cells)


def filter_and_score_cameras(
    candidates: list[Camera],
    cloud: SplatCloud,
    up: np.ndarray,
    occupancy_threshold: float = 0.3,
    min_frame_fill: float = 0.05,
) -> list[tuple[int, Camera, float]]:
    """Filter candidates by free-space and score by frame fill + elevation bias.

    Args:
        candidates: List of candidate cameras.
        cloud: SplatCloud for occupancy testing.
        up: (3,) up direction for elevation scoring.
        occupancy_threshold: Reject cameras with occupancy above this.
        min_frame_fill: Reject cameras with frame fill below this.

    Returns:
        List of (index, camera, score) tuples, sorted by score descending.
        Score combines frame fill and phone-like elevation bias.
    """
    up = np.asarray(up, dtype=np.float32)
    up = up / (np.linalg.norm(up) + 1e-8)
    center = cloud.bbox_center

    results = []
    rejected_occupancy = 0
    rejected_fill = 0

    for i, cam in enumerate(candidates):
        cam_pos = cam.position

        # Free-space test
        occ = gaussian_occupancy_at(
            cam_pos, cloud.positions, cloud.scales, cloud.opacities,
        )
        if occ > occupancy_threshold:
            rejected_occupancy += 1
            continue

        # Frame fill (weighted by depth/opacity/scale)
        fill = estimate_frame_fill(cam, cloud.positions, cloud.scales, cloud.opacities)
        if fill < min_frame_fill:
            rejected_fill += 1
            continue

        # Elevation bias: prefer cameras at 10-30° above horizon
        # (the sweet spot for phone photography)
        cam_to_center = center - cam_pos
        cam_to_center = cam_to_center / (np.linalg.norm(cam_to_center) + 1e-8)
        elevation_cos = np.dot(cam_to_center, -up)  # positive = looking down
        elevation_angle = math.degrees(math.asin(np.clip(elevation_cos, -1, 1)))
        # Peak score at ~20° downward tilt
        elevation_score = math.exp(-0.5 * ((elevation_angle - 20) / 20) ** 2)

        # Combined score
        score = fill * 0.7 + elevation_score * 0.3

        results.append((i, cam, score))

    LOG.info(f"Camera filtering: {len(results)} accepted, "
             f"{rejected_occupancy} rejected (occupancy), "
             f"{rejected_fill} rejected (frame fill)")

    results.sort(key=lambda x: x[2], reverse=True)
    return results


def select_adaptive_cameras(
    cloud: SplatCloud,
    up: np.ndarray,
    n_cameras: int = 8,
    width: int = 512,
    height: int = 512,
) -> list[Camera]:
    """Full adaptive camera selection pipeline.

    1. Generate candidate cameras biased toward phone photography
    2. Filter by free-space and frame fill
    3. Select top N by combined score

    For better coverage-aware selection, use CoverageTracker from
    coverage.py after rendering the initial harvest views.

    Args:
        cloud: SplatCloud.
        up: (3,) up direction (from operator or estimation).
        n_cameras: Number of cameras to select.
        width: Image width.
        height: Image height.

    Returns:
        List of selected Camera objects.
    """
    center = cloud.bbox_center
    dists = np.linalg.norm(cloud.positions - center, axis=1)
    radius = float(np.percentile(dists, 95))

    LOG.info(f"Generating adaptive cameras: center={center}, radius={radius:.3f}")

    candidates = generate_candidate_cameras(
        center=center, up=up, radius=radius,
        width=width, height=height,
    )

    scored = filter_and_score_cameras(candidates, cloud, up)

    if len(scored) == 0:
        LOG.warning("No valid cameras found — falling back to default harvest cameras")
        from splat_oracle.camera import generate_harvest_cameras
        return generate_harvest_cameras(center, radius, width, height)[:n_cameras]

    selected = [cam for _, cam, _ in scored[:n_cameras]]
    LOG.info(f"Selected {len(selected)} cameras (top scores: "
             f"{', '.join(f'{s:.3f}' for _, _, s in scored[:n_cameras])})")

    return selected
