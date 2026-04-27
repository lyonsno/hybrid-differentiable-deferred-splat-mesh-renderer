"""SAM3 MLX text-prompted material segmentation for harvest views.

Runs SAM 3.1 on each harvest view with the material vocabulary, then
projects segment masks back to splat IDs via majority vote.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from splat_oracle.harvest import HarvestView
from splat_oracle.loader import SplatCloud
from splat_oracle.materials import MATERIAL_CLASSES, MATERIAL_PROMPTS, CLASS_NAMES


@dataclass
class SegmentationResult:
    """Per-view segmentation output."""

    view_index: int
    # Per-material: list of (mask, score) tuples
    material_masks: dict[str, list[tuple[np.ndarray, float]]]


def _load_sam3():
    """Load SAM3 MLX model and processor (cached after first call)."""
    from sam3 import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor

    model = build_sam3_image_model()
    processor = Sam3Processor(model, confidence_threshold=0.15)
    return model, processor


# Module-level cache
_sam3_cache: tuple | None = None


def get_sam3():
    """Get or create the cached SAM3 model and processor."""
    global _sam3_cache
    if _sam3_cache is None:
        _sam3_cache = _load_sam3()
    return _sam3_cache


def segment_view(
    view: HarvestView,
    view_index: int,
    vocabulary: dict[str, str] | None = None,
    min_score: float = 0.2,
) -> SegmentationResult:
    """Run SAM3 text-prompted segmentation on a single harvest view.

    Args:
        view: The rendered harvest view.
        view_index: Index of this view in the harvest set.
        vocabulary: Material name -> text prompt mapping. Defaults to MATERIAL_PROMPTS.
        min_score: Minimum confidence to keep a mask.

    Returns:
        SegmentationResult with per-material masks and scores.
    """
    from PIL import Image

    if vocabulary is None:
        vocabulary = MATERIAL_PROMPTS

    _, processor = get_sam3()

    # Convert harvest color buffer to PIL image
    img_array = (np.clip(view.color, 0, 1) * 255).astype(np.uint8)
    img = Image.fromarray(img_array)

    # Encode image once
    state = processor.set_image(img)

    material_masks: dict[str, list[tuple[np.ndarray, float]]] = {}

    for mat_name, prompt in vocabulary.items():
        result_state = processor.set_text_prompt(prompt, state)
        masks = result_state.get("masks", [])
        scores = result_state.get("scores", [])

        kept = []
        for mask, score in zip(masks, scores):
            score_val = float(score)
            if score_val >= min_score:
                # Convert to numpy bool array if needed
                mask_np = np.asarray(mask, dtype=bool)
                if mask_np.ndim == 3:
                    mask_np = mask_np[0]  # take first channel if multi-channel
                kept.append((mask_np, score_val))

        if kept:
            material_masks[mat_name] = kept

    return SegmentationResult(
        view_index=view_index,
        material_masks=material_masks,
    )


def project_to_splats(
    cloud: SplatCloud,
    views: list[HarvestView],
    seg_results: list[SegmentationResult],
) -> None:
    """Project per-view material segments back to splats via majority vote.

    For each splat, collect all material votes across all views (weighted by
    mask confidence), then assign the material with the highest total vote.

    Modifies cloud in-place: sets material_class and material_confidence.
    """
    N = cloud.num_points
    n_classes = len(MATERIAL_CLASSES)

    # Vote accumulator: (N, n_classes) — weighted vote count per splat per class
    votes = np.zeros((N, n_classes), dtype=np.float32)

    for seg in seg_results:
        view = views[seg.view_index]
        splat_ids = view.splat_id  # (H, W) int32, -1 = no hit

        for mat_name, mask_scores in seg.material_masks.items():
            class_idx = MATERIAL_CLASSES.get(mat_name, 0)
            if class_idx == 0:
                continue  # skip "unknown"

            for mask, score in mask_scores:
                # Find splat IDs under this mask
                valid = mask & (splat_ids >= 0)
                if not valid.any():
                    continue

                hit_ids = splat_ids[valid]
                # Accumulate weighted votes
                np.add.at(votes[:, class_idx], hit_ids, score)

    # Assign material class = argmax of votes (0 = unknown if no votes)
    total_votes = votes.sum(axis=1)
    has_votes = total_votes > 0

    material_class = np.zeros(N, dtype=np.int32)  # default: unknown
    material_confidence = np.zeros(N, dtype=np.float32)

    if has_votes.any():
        material_class[has_votes] = votes[has_votes].argmax(axis=1)
        # Confidence = winning class votes / total votes
        winning_votes = votes[has_votes, material_class[has_votes]]
        material_confidence[has_votes] = winning_votes / total_votes[has_votes]

    cloud.material_class = material_class
    cloud.material_confidence = material_confidence


def segment_scene(
    cloud: SplatCloud,
    views: list[HarvestView],
    vocabulary: dict[str, str] | None = None,
    min_score: float = 0.2,
) -> list[SegmentationResult]:
    """Full segmentation pipeline: segment all views, project to splats.

    Args:
        cloud: The splat cloud to annotate.
        views: Rendered harvest views.
        vocabulary: Material vocabulary. Defaults to MATERIAL_PROMPTS.
        min_score: Minimum SAM3 confidence to keep a mask.

    Returns:
        List of per-view SegmentationResults. Also modifies cloud in-place.
    """
    results = []
    for i, view in enumerate(views):
        seg = segment_view(view, i, vocabulary=vocabulary, min_score=min_score)
        results.append(seg)

    project_to_splats(cloud, views, results)
    return results
