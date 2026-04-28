#!/usr/bin/env python3
"""Export a real splat file into the first-smoke browser payload."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "preprocessing"))

from splat_oracle.first_smoke import export_first_smoke_asset  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export a real .ply or .spz splat file into first-smoke WebGPU assets."
    )
    parser.add_argument("input", help="Input Scaniverse/3DGS PLY or SPZ file")
    parser.add_argument(
        "-o",
        "--output",
        default="smoke-assets/scaniverse-first-smoke",
        help="Output directory for .json, .f32.bin, and .ids.u32.bin files",
    )
    parser.add_argument(
        "--asset-name",
        default="scaniverse-first-smoke",
        help="Basename for emitted files",
    )
    args = parser.parse_args()

    manifest = export_first_smoke_asset(
        args.input, args.output, asset_name=args.asset_name
    )
    print(
        json.dumps(
            {"manifest": str(Path(args.output) / f"{args.asset_name}.json"), **manifest},
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
