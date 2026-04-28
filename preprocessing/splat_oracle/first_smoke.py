"""Export real Scaniverse PLY splats into the first WebGPU smoke payload."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np

from splat_oracle.loader import SplatCloud, load_splats


SCHEMA = "scaniverse_first_smoke_splat_v1"
STRIDE_BYTES = 32
FIELDS = [
    {
        "name": "position",
        "component_type": "float32",
        "components": 3,
        "byte_offset": 0,
    },
    {
        "name": "color",
        "component_type": "float32",
        "components": 3,
        "byte_offset": 12,
    },
    {
        "name": "opacity",
        "component_type": "float32",
        "components": 1,
        "byte_offset": 24,
    },
    {
        "name": "radius",
        "component_type": "float32",
        "components": 1,
        "byte_offset": 28,
    },
]


def export_first_smoke_asset(
    source_path: str | Path,
    output_dir: str | Path,
    *,
    asset_name: str = "scaniverse-first-smoke",
    max_distance_from_source_bbox_center: float | None = None,
) -> dict[str, Any]:
    """Write a browser-smoke splat payload and return its manifest.

    The binary row order is the original PLY vertex order. That makes row index
    equal to the original 0-based splat ID, while the uint32 sidecar gives
    downstream loaders an explicit identity buffer when they need one.
    """

    source = Path(source_path)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    cloud = load_splats(source)
    source_filter = None
    identity_scheme = "row_index_is_original_zero_based_file_order"
    if max_distance_from_source_bbox_center is not None:
        cloud, source_filter = filter_cloud_by_radial_distance(
            cloud, max_distance_from_source_bbox_center
        )
        identity_scheme = "row_index_is_filtered_zero_based_payload_order"

    rows = make_first_smoke_rows(cloud)
    ids = np.arange(cloud.num_points, dtype="<u4")
    scales = np.asarray(cloud.scales, dtype="<f4")
    rotations = np.asarray(cloud.rotations, dtype="<f4")

    payload_name = f"{asset_name}.f32.bin"
    ids_name = f"{asset_name}.ids.u32.bin"
    scales_name = f"{asset_name}.scales.f32.bin"
    rotations_name = f"{asset_name}.rotations.f32.bin"
    manifest_name = f"{asset_name}.json"

    payload_path = output / payload_name
    ids_path = output / ids_name
    scales_path = output / scales_name
    rotations_path = output / rotations_name
    manifest_path = output / manifest_name

    rows.astype("<f4", copy=False).tofile(payload_path)
    ids.tofile(ids_path)
    scales.tofile(scales_path)
    rotations.tofile(rotations_path)

    manifest = make_first_smoke_manifest(
        source,
        cloud,
        payload_name=payload_name,
        payload_byte_length=payload_path.stat().st_size,
        ids_name=ids_name,
        ids_byte_length=ids_path.stat().st_size,
        scales_name=scales_name,
        scales_byte_length=scales_path.stat().st_size,
        rotations_name=rotations_name,
        rotations_byte_length=rotations_path.stat().st_size,
        asset_name=asset_name,
        identity_scheme=identity_scheme,
        source_filter=source_filter,
    )
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def filter_cloud_by_radial_distance(
    cloud: SplatCloud, max_distance_from_source_bbox_center: float
) -> tuple[SplatCloud, dict[str, Any]]:
    if not np.isfinite(max_distance_from_source_bbox_center):
        raise ValueError("max distance must be finite")
    if max_distance_from_source_bbox_center <= 0:
        raise ValueError("max distance must be positive")

    source_center = np.asarray(cloud.bbox_center, dtype=np.float32)
    distances = np.linalg.norm(
        np.asarray(cloud.positions, dtype=np.float32) - source_center, axis=1
    )
    keep = distances <= max_distance_from_source_bbox_center
    if not np.any(keep):
        raise ValueError("distance filter would remove every splat")

    filtered = SplatCloud(
        positions=cloud.positions[keep],
        colors=cloud.colors[keep],
        opacities=cloud.opacities[keep],
        scales=cloud.scales[keep],
        rotations=cloud.rotations[keep],
        sh_coeffs=cloud.sh_coeffs[keep] if cloud.sh_coeffs is not None else None,
        sh_degree=cloud.sh_degree,
        material_class=_filter_optional(cloud.material_class, keep),
        material_confidence=_filter_optional(cloud.material_confidence, keep),
        albedo=_filter_optional(cloud.albedo, keep),
        roughness=_filter_optional(cloud.roughness, keep),
        metalness=_filter_optional(cloud.metalness, keep),
        ghost_mask=_filter_optional(cloud.ghost_mask, keep),
    )
    source_filter = {
        "kind": "radial_distance_from_source_bbox_center",
        "source_bbox_center": _json_vec3(source_center),
        "max_distance": float(max_distance_from_source_bbox_center),
        "input_splat_count": int(cloud.num_points),
        "kept_splat_count": int(filtered.num_points),
        "dropped_splat_count": int(cloud.num_points - filtered.num_points),
        "identity_note": "IDs are zero-based filtered payload row indices for renderer addressing, not original source-file row numbers.",
    }
    return filtered, source_filter


def make_first_smoke_rows(cloud: SplatCloud) -> np.ndarray:
    """Return little-endian-ready float32 rows for first smoke."""

    if cloud.num_points == 0:
        raise ValueError("Cannot export an empty splat cloud")

    positions = np.asarray(cloud.positions, dtype=np.float32)
    colors = np.clip(np.asarray(cloud.colors, dtype=np.float32), 0.0, 1.0)
    opacities = np.clip(np.asarray(cloud.opacities, dtype=np.float32), 0.0, 1.0)
    radii = radius_seed_from_scales(cloud.scales)

    _require_shape("positions", positions, (cloud.num_points, 3))
    _require_shape("colors", colors, (cloud.num_points, 3))
    _require_shape("opacities", opacities, (cloud.num_points,))
    _require_shape("radii", radii, (cloud.num_points,))

    rows = np.empty((cloud.num_points, 8), dtype=np.float32)
    rows[:, 0:3] = positions
    rows[:, 3:6] = colors
    rows[:, 6] = opacities
    rows[:, 7] = radii

    if not np.isfinite(rows).all():
        raise ValueError("First-smoke payload contains non-finite values")
    return rows


def radius_seed_from_scales(scales: np.ndarray) -> np.ndarray:
    """Decode log-space anisotropic scale into one scalar world-radius seed."""

    scale_array = np.asarray(scales, dtype=np.float32)
    if scale_array.ndim != 2 or scale_array.shape[1] != 3:
        raise ValueError(f"scales must have shape (N, 3), got {scale_array.shape}")
    radii = np.exp(scale_array, dtype=np.float32).max(axis=1)
    if not np.isfinite(radii).all():
        raise ValueError("Decoded radius seeds contain non-finite values")
    return radii.astype(np.float32, copy=False)


def make_first_smoke_manifest(
    source: Path,
    cloud: SplatCloud,
    *,
    payload_name: str,
    payload_byte_length: int,
    ids_name: str,
    ids_byte_length: int,
    scales_name: str,
    scales_byte_length: int,
    rotations_name: str,
    rotations_byte_length: int,
    asset_name: str,
    identity_scheme: str = "row_index_is_original_zero_based_file_order",
    source_filter: dict[str, Any] | None = None,
) -> dict[str, Any]:
    bbox_min = np.asarray(cloud.bbox_min, dtype=np.float32)
    bbox_max = np.asarray(cloud.bbox_max, dtype=np.float32)
    center = ((bbox_min + bbox_max) * 0.5).astype(np.float32)
    radius = float(np.linalg.norm((bbox_max - bbox_min) * 0.5))

    manifest = {
        "schema": SCHEMA,
        "asset_name": asset_name,
        "source": {
            "kind": source_kind(source),
            "filename": source.name,
            "sha256": _sha256(source),
            "byte_length": source.stat().st_size,
        },
        "splat_count": int(cloud.num_points),
        "endianness": "little",
        "stride_bytes": STRIDE_BYTES,
        "fields": FIELDS,
        "payload": {
            "path": payload_name,
            "component_type": "float32",
            "byte_length": int(payload_byte_length),
        },
        "identity": {
            "scheme": identity_scheme,
            "ids_component_type": "uint32",
            "ids_path": ids_name,
        },
        "ids": {
            "path": ids_name,
            "byte_length": int(ids_byte_length),
            "first_id": 0,
            "last_id": int(cloud.num_points - 1),
        },
        "shape": {
            "scales_path": scales_name,
            "scales_component_type": "float32",
            "scales_byte_length": int(scales_byte_length),
            "rotations_path": rotations_name,
            "rotations_component_type": "float32",
            "rotations_byte_length": int(rotations_byte_length),
            "rotation_order": "wxyz",
            "scale_space": "log",
        },
        "bounds": {
            "min": _json_vec3(bbox_min),
            "max": _json_vec3(bbox_max),
            "center": _json_vec3(center),
            "radius": radius,
        },
        "decode": {
            "color": "displayable RGB float3 from loader: SH DC via 0.5 + 0.28209479 * f_dc, or uchar RGB / 255",
            "opacity": "float opacity from loader: sigmoid(opacity) for PLY logit field, or 1.0 when absent",
            "radius": "max(exp(scale_0), exp(scale_1), exp(scale_2)) from log-space PLY scale fields",
        },
    }
    if source_filter is not None:
        manifest["source_filter"] = source_filter
    return manifest


def source_kind(source: Path) -> str:
    suffix = source.suffix.lower()
    if suffix == ".spz":
        return "spz"
    if suffix == ".ply":
        return "scaniverse_ply"
    return suffix.lstrip(".") or "splat"


def _json_vec3(values: np.ndarray) -> list[float]:
    return [float(v) for v in np.asarray(values, dtype=np.float32).reshape(3)]


def _require_shape(name: str, values: np.ndarray, expected: tuple[int, ...]) -> None:
    if values.shape != expected:
        raise ValueError(f"{name} must have shape {expected}, got {values.shape}")


def _filter_optional(values: np.ndarray | None, keep: np.ndarray) -> np.ndarray | None:
    return values[keep] if values is not None else None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
