"""SPZ import shim — works around the circular import bug in the spz package.

The spz package's __init__.py does `from spz import ...` which resolves to
itself instead of the native .so module. We load the .so directly.
"""

import importlib
import importlib.util
import os
import sys


def _load_spz_native():
    """Load the spz native extension module, bypassing the broken __init__.py."""
    # Find the site-packages spz directory
    for path in sys.path:
        so_dir = os.path.join(path, "spz")
        if os.path.isdir(so_dir):
            # Look for the .so / .pyd
            for fname in os.listdir(so_dir):
                if fname.startswith("spz.cpython") and (
                    fname.endswith(".so") or fname.endswith(".pyd")
                ):
                    so_path = os.path.join(so_dir, fname)
                    # Load from the directory so the module name resolves as 'spz'
                    old_path = sys.path[:]
                    try:
                        sys.path = [
                            p
                            for p in sys.path
                            if os.path.abspath(p) != os.path.abspath(path)
                        ]
                        sys.path.insert(0, so_dir)
                        return importlib.import_module("spz")
                    finally:
                        sys.path = old_path
    raise ImportError("Could not find spz native extension (.so/.pyd)")


_spz = _load_spz_native()

GaussianSplat = _spz.GaussianSplat
CoordinateSystem = _spz.CoordinateSystem
BoundingBox = _spz.BoundingBox
load = _spz.load
