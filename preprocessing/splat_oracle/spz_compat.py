"""Niantic SPZ import shim.

The PyPI package currently ships a Python package named ``spz`` whose
``__init__.py`` tries to import symbols from itself before the native extension
is seated. When that circular import appears, load the native extension file
directly and expose the same small surface the preprocessing loader needs.
"""

import importlib
import importlib.util
import os
import sys
from pathlib import Path
from types import ModuleType


_spz: ModuleType | None = None


def _native_extension_candidates() -> list[Path]:
    """Return plausible native SPZ extension paths in sys.path order."""
    candidates: list[Path] = []
    for path in sys.path:
        so_dir = Path(path) / "spz"
        if not so_dir.is_dir():
            continue
        for fname in os.listdir(so_dir):
            if fname.startswith("spz.") and (fname.endswith(".so") or fname.endswith(".pyd")):
                candidates.append(so_dir / fname)
    return candidates


def _load_extension_module(path: Path) -> ModuleType:
    """Load the native extension, bypassing the broken package initializer."""
    previous = sys.modules.pop("spz", None)
    try:
        spec = importlib.util.spec_from_file_location("spz", path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not build import spec for SPZ native extension at {path}")
        module = importlib.util.module_from_spec(spec)
        sys.modules["spz"] = module
        spec.loader.exec_module(module)
        return module
    except Exception:
        if previous is not None:
            sys.modules["spz"] = previous
        else:
            sys.modules.pop("spz", None)
        raise


def get_spz_module() -> ModuleType:
    """Return a loaded SPZ module with the expected native symbols."""
    global _spz
    if _spz is not None:
        return _spz

    try:
        module = importlib.import_module("spz")
        if hasattr(module, "GaussianSplat"):
            _spz = module
            return module
    except ImportError:
        pass

    for path in _native_extension_candidates():
        module = _load_extension_module(path)
        if hasattr(module, "GaussianSplat"):
            _spz = module
            return module

    raise ImportError(
        "Could not load the Niantic SPZ native extension. Install the `spz` "
        "package in this environment, or ensure site-packages/spz contains "
        "spz.<python-tag>.<platform>.so/.pyd."
    )


def __getattr__(name: str):
    if name in {"GaussianSplat", "CoordinateSystem", "BoundingBox", "load"}:
        return getattr(get_spz_module(), name)
    raise AttributeError(name)
