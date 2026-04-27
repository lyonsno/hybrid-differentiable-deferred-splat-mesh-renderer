from __future__ import annotations

import numpy as np
import pytest

from splat_oracle.segmentation import segment_view


class FakeProcessor:
    def __init__(self):
        self.prompts: list[str] = []

    def set_image(self, image):
        assert image.size == (2, 2)
        return {"encoded": True}

    def set_text_prompt(self, prompt, state):
        self.prompts.append(prompt)
        if prompt == "painted wall":
            return {
                "masks": np.array(
                    [
                        [[[1, 0], [0, 1]]],
                        [[[0, 1], [0, 0]]],
                    ],
                    dtype=bool,
                ),
                "scores": np.array([0.8, 0.1], dtype=np.float32),
            }
        return {"masks": np.zeros((0, 1, 2, 2), dtype=bool), "scores": np.zeros((0,), dtype=np.float32)}


def test_segment_view_reuses_encoded_image_and_filters_low_confidence(monkeypatch):
    processor = FakeProcessor()
    monkeypatch.setattr("splat_oracle.segmentation.get_sam3", lambda: (object(), processor))

    view = type("FakeHarvestView", (), {})()
    view.color = np.ones((2, 2, 3), dtype=np.float32)
    view.depth = np.ones((2, 2), dtype=np.float32)
    view.splat_id = np.array([[0, 1], [2, 3]], dtype=np.int32)
    view.weight = np.ones((2, 2), dtype=np.float32)

    result = segment_view(
        view,
        view_index=7,
        vocabulary={"painted_wall": "painted wall", "mirror": "mirror"},
        min_score=0.2,
    )

    assert processor.prompts == ["painted wall", "mirror"]
    assert result.view_index == 7
    assert list(result.material_masks) == ["painted_wall"]
    mask, score = result.material_masks["painted_wall"][0]
    assert score == pytest.approx(0.8)
    assert mask.tolist() == [[True, False], [False, True]]
