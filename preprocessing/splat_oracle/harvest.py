"""Harvest view renderer — renders splats from multiple viewpoints.

Produces color, depth, and splat-ID buffers for each camera.
Uses torch for GPU-accelerated (MPS/CUDA) or CPU rendering.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch

from splat_oracle.camera import Camera, generate_harvest_cameras
from splat_oracle.loader import SplatCloud


@dataclass
class HarvestView:
    """Output of rendering one harvest camera."""

    camera: Camera
    color: np.ndarray  # (H, W, 3) float32 — linear RGB
    depth: np.ndarray  # (H, W) float32 — camera-space depth (0 = no hit)
    splat_id: np.ndarray  # (H, W) int32 — index of dominant splat (-1 = no hit)
    weight: np.ndarray  # (H, W) float32 — accumulated alpha weight


def _get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _project_splats(
    positions: torch.Tensor,  # (N, 3)
    viewproj: torch.Tensor,  # (4, 4)
    width: int,
    height: int,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Project splat centers to screen space.

    Returns:
        screen_xy: (N, 2) pixel coordinates
        depth: (N,) camera-space depth
        visible: (N,) bool mask
    """
    N = positions.shape[0]
    ones = torch.ones(N, 1, device=positions.device, dtype=positions.dtype)
    pos_h = torch.cat([positions, ones], dim=1)  # (N, 4)

    clip = (viewproj @ pos_h.T).T  # (N, 4)
    w = clip[:, 3]

    # Frustum culling: behind camera or too far
    visible = w > 0.001

    ndc = clip[:, :3] / w.unsqueeze(1).clamp(min=0.001)

    screen_x = (ndc[:, 0] * 0.5 + 0.5) * width
    screen_y = (1.0 - (ndc[:, 1] * 0.5 + 0.5)) * height  # flip Y
    screen_xy = torch.stack([screen_x, screen_y], dim=1)

    # Visible = in front of camera and within extended frustum
    visible = visible & (ndc[:, 0] > -1.5) & (ndc[:, 0] < 1.5)
    visible = visible & (ndc[:, 1] > -1.5) & (ndc[:, 1] < 1.5)

    depth = w  # w = -view_z = positive distance from camera

    return screen_xy, depth, visible


def _compute_splat_radii(
    scales: torch.Tensor,  # (N, 3)
    depth: torch.Tensor,  # (N,)
    focal_y: float,
) -> torch.Tensor:
    """Compute approximate screen-space radius for each splat.

    Uses the maximum scale axis projected to screen space.
    """
    # exp(scale) gives the actual Gaussian sigma in world space
    world_radius = torch.exp(scales).max(dim=1).values  # (N,)
    # Project to screen: r_screen = r_world * focal / depth
    screen_radius = world_radius * focal_y / depth.clamp(min=0.01)
    return screen_radius.clamp(min=0.5, max=256.0)


def render_harvest_view(
    cloud: SplatCloud,
    camera: Camera,
    device: torch.device | None = None,
) -> HarvestView:
    """Render a single harvest view from the given camera.

    Uses a tile-based approach: for each splat, scatter its contribution
    to nearby pixels weighted by a 2D Gaussian falloff.
    """
    if device is None:
        device = _get_device()

    H, W = camera.height, camera.width

    # Upload data to device
    positions = torch.tensor(cloud.positions, device=device, dtype=torch.float32)
    colors = torch.tensor(cloud.colors, device=device, dtype=torch.float32)
    opacities = torch.tensor(cloud.opacities, device=device, dtype=torch.float32)
    scales = torch.tensor(cloud.scales, device=device, dtype=torch.float32)

    viewproj = torch.tensor(camera.viewproj, device=device, dtype=torch.float32)

    # Project
    screen_xy, depth, visible = _project_splats(positions, viewproj, W, H)

    # Focal length from projection matrix
    focal_y = camera.proj_matrix[1, 1] * H / 2

    # Screen-space radii
    radii = _compute_splat_radii(scales, depth, focal_y)

    # Sort by depth (back to front for alpha compositing)
    vis_idx = torch.where(visible)[0]
    if len(vis_idx) == 0:
        return HarvestView(
            camera=camera,
            color=np.zeros((H, W, 3), dtype=np.float32),
            depth=np.zeros((H, W), dtype=np.float32),
            splat_id=np.full((H, W), -1, dtype=np.int32),
            weight=np.zeros((H, W), dtype=np.float32),
        )

    vis_depths = depth[vis_idx]
    sort_order = torch.argsort(vis_depths, descending=True)  # back to front
    sorted_idx = vis_idx[sort_order]

    # Initialize output buffers (on CPU for scatter — MPS doesn't support scatter well)
    color_buf = np.zeros((H, W, 3), dtype=np.float32)
    depth_buf = np.zeros((H, W), dtype=np.float32)
    splat_id_buf = np.full((H, W), -1, dtype=np.int32)
    weight_buf = np.zeros((H, W), dtype=np.float32)
    transmittance = np.ones((H, W), dtype=np.float32)

    # Move sorted data to CPU for the scatter loop
    s_xy = screen_xy[sorted_idx].cpu().numpy()
    s_depth = depth[sorted_idx].cpu().numpy()
    s_radii = radii[sorted_idx].cpu().numpy()
    s_colors = colors[sorted_idx].cpu().numpy()
    s_opacities = opacities[sorted_idx].cpu().numpy()
    s_indices = sorted_idx.cpu().numpy()

    # Splat rendering loop — vectorized per-splat
    for i in range(len(sorted_idx)):
        cx, cy = s_xy[i]
        r = s_radii[i]
        r_int = int(np.ceil(r * 2))  # render within 2-sigma

        x0 = max(0, int(cx) - r_int)
        x1 = min(W, int(cx) + r_int + 1)
        y0 = max(0, int(cy) - r_int)
        y1 = min(H, int(cy) + r_int + 1)

        if x0 >= x1 or y0 >= y1:
            continue

        # Pixel grid
        yy, xx = np.mgrid[y0:y1, x0:x1]
        dx = xx.astype(np.float32) - cx
        dy = yy.astype(np.float32) - cy

        # 2D Gaussian weight
        sigma = max(r * 0.5, 0.5)
        gauss = np.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))

        alpha = float(s_opacities[i]) * gauss

        # Alpha compositing (front-to-back would be more efficient but
        # back-to-front is simpler and matches the sort order)
        T = transmittance[y0:y1, x0:x1]
        contribution = alpha * T

        color_buf[y0:y1, x0:x1] += contribution[..., None] * s_colors[i]
        weight_buf[y0:y1, x0:x1] += contribution

        # Track dominant splat (highest contribution)
        mask = contribution > 0.01
        if mask.any():
            depth_buf[y0:y1, x0:x1] = np.where(
                mask & (contribution > 0.1 * T),
                s_depth[i],
                depth_buf[y0:y1, x0:x1],
            )
            splat_id_buf[y0:y1, x0:x1] = np.where(
                mask & (contribution > 0.1 * T),
                s_indices[i],
                splat_id_buf[y0:y1, x0:x1],
            )

        transmittance[y0:y1, x0:x1] *= (1.0 - alpha)

    return HarvestView(
        camera=camera,
        color=color_buf,
        depth=depth_buf,
        splat_id=splat_id_buf,
        weight=weight_buf,
    )


def render_harvest_views(
    cloud: SplatCloud,
    width: int = 512,
    height: int = 512,
    fov_y_deg: float = 60.0,
    radius_scale: float = 2.0,
) -> list[HarvestView]:
    """Render all harvest views for a splat cloud.

    Args:
        cloud: The splat cloud to render.
        width: Output image width.
        height: Output image height.
        fov_y_deg: Vertical field of view in degrees.
        radius_scale: Camera distance = bbox_diagonal * radius_scale.

    Returns:
        List of HarvestView objects, one per camera.
    """
    center = cloud.bbox_center
    diag = np.linalg.norm(cloud.bbox_size)
    radius = diag * radius_scale

    cameras = generate_harvest_cameras(
        center=center,
        radius=radius,
        width=width,
        height=height,
        fov_y_deg=fov_y_deg,
    )

    device = _get_device()
    views = []
    for cam in cameras:
        view = render_harvest_view(cloud, cam, device=device)
        views.append(view)

    return views
