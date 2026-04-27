"""Monkey-patches SAM3 to run on MPS (Apple Silicon) instead of CUDA.

SAM3 hardcodes device="cuda" and .cuda() calls throughout. This module
patches the installed package at import time so the image inference path
works on MPS. Video/tracker paths are not patched (we don't need them).

Usage:
    import splat_oracle.sam3_mps_patch  # must be imported before sam3
    from sam3.model_builder import build_sam3_image_model
    model = build_sam3_image_model(device="mps")
"""

from __future__ import annotations

import os
import re
import sys
import types

# Set the MPS fallback env var so unsupported ops fall back to CPU
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"


def _install_triton_stub():
    """Install a fake triton module so sam3.model.edt doesn't crash on import."""
    fake_edt = types.ModuleType("sam3.model.edt")

    def _edt_triton_stub(*args, **kwargs):
        raise RuntimeError(
            "edt_triton requires Triton (CUDA only). "
            "This op is only used in video tracking, not image segmentation."
        )

    fake_edt.edt_triton = _edt_triton_stub
    sys.modules["sam3.model.edt"] = fake_edt


def _patch_file(filepath: str, device: str = "mps"):
    """Patch hardcoded CUDA references in a Python source file."""
    with open(filepath) as f:
        source = f.read()

    original = source

    # Replace device="cuda" with device parameter
    source = source.replace('device="cuda"', f'device="{device}"')
    source = source.replace("device='cuda'", f"device='{device}'")

    # Replace .cuda() calls with .to("{device}")
    # But not in comments or strings that explain things
    source = re.sub(
        r'(?<!\w)\.cuda\(\)',
        f'.to("{device}")',
        source,
    )

    if source != original:
        with open(filepath, "w") as f:
            f.write(source)
        return True
    return False


def patch_sam3_for_mps():
    """Patch all SAM3 source files to replace CUDA with MPS."""
    import sam3

    pkg_dir = os.path.dirname(sam3.__file__)

    # Files in the image inference path that have hardcoded CUDA
    files_to_patch = [
        "model_builder.py",
        "model/position_encoding.py",
        "model/decoder.py",
        "model/vl_combiner.py",
        "model/io_utils.py",
        "model/sam3_image_processor.py",
        "model/sam3_image.py",
    ]

    patched = []
    for rel_path in files_to_patch:
        full_path = os.path.join(pkg_dir, rel_path)
        if os.path.exists(full_path) and _patch_file(full_path):
            patched.append(rel_path)

    return patched


# Auto-install the triton stub on import
_install_triton_stub()
