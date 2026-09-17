#!/usr/bin/env python3
"""Build smaller RGB textures for the mobile scene from bundled source images.

Run from any directory: python scripts/build-mobile-assets.py
Development dependency: Pillow. The running website does not require Python.
Original high-quality textures, environment HDR, and GLB assets are never written.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

try:
    import PIL
    from PIL import Image
except ImportError as error:
    raise SystemExit("Pillow is required to rebuild mobile textures: python -m pip install Pillow") from error


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUTPUT = DIST / "assets" / "mobile"
SURFACES = ("paving", "grass", "wall", "roof")
QUALITY = {"diff": 82, "nor": 90, "rough": 80}
MAX_SURFACE_BYTES = 800_000

SOURCES = {
    "paving": {
        "title": "Rectangular Paving",
        "creator": "Dimitrios Savva / Poly Haven",
        "url": "https://polyhaven.com/a/rectangular_paving",
    },
    "grass": {
        "title": "Grass001",
        "creator": "Lennart Demes / ambientCG",
        "url": "https://ambientcg.com/a/Grass001",
    },
    "wall": {
        "title": "Beige Wall 001",
        "provider": "Poly Haven",
        "url": "https://polyhaven.com/a/beige_wall_001",
    },
    "roof": {
        "title": "Roof Slates 03",
        "provider": "Poly Haven",
        "url": "https://polyhaven.com/a/roof_slates_03",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dist_path(path: Path) -> str:
    return path.relative_to(DIST).as_posix()


def build_one(source: Path, target: Path, max_edge: int, quality: int, kind: str,
              attribution: dict, license_info: dict) -> dict:
    before_hash = sha256(source)
    with Image.open(source) as original:
        original.load()
        if original.format != "JPEG":
            raise ValueError(f"Expected JPEG source: {source}")
        source_size, source_mode = original.size, original.mode
        # Work on raw RGB channels. No ICC conversion, tone curve, sharpening,
        # contrast adjustment, or normal-vector renormalization is performed.
        converted = original.copy() if original.mode == "RGB" else original.convert("RGB")
        converted.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        output_size = converted.size
        # 4:4:4 prevents chroma subsampling from unnecessarily mixing normal-map
        # components. Baseline JPEG is used for broad, inexpensive decoding.
        converted.save(target, format="JPEG", quality=quality, subsampling=0,
                       optimize=True, progressive=False)

    with Image.open(target) as verify:
        verify.verify()
    with Image.open(target) as verify:
        verify.load()
        if verify.format != "JPEG" or verify.mode != "RGB" or verify.size != output_size:
            raise ValueError(f"Invalid generated texture: {target}")
        if max(verify.size) > max_edge:
            raise ValueError(f"Generated texture exceeds size limit: {target}")
    if sha256(source) != before_hash:
        raise RuntimeError(f"Source was modified during the build: {source}")

    return {
        "source": {
            "path": dist_path(source), "width": source_size[0], "height": source_size[1],
            "mode": source_mode, "format": "JPEG", "bytes": source.stat().st_size,
            "sha256": before_hash,
        },
        "output": {
            "path": dist_path(target), "width": output_size[0], "height": output_size[1],
            "mode": "RGB", "format": "JPEG", "bytes": target.stat().st_size,
            "sha256": sha256(target),
        },
        "kind": kind,
        "transform": {
            "resize": "thumbnail; preserve aspect ratio; never upscale",
            "max_edge_px": max_edge, "resampling": "Lanczos",
            "jpeg_quality": quality, "jpeg_subsampling": "4:4:4",
            "jpeg_optimize": True, "jpeg_progressive": False,
            "color_adjustments": "none",
            "normal_vector_edits": "none",
            "source_file_preserved": True,
        },
        "upstream_asset": attribution,
        "license": license_info,
    }


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records = []
    for surface in SURFACES:
        for suffix, quality in QUALITY.items():
            filename = f"{surface}_{suffix}.jpg"
            license_info = {
                "spdx": "CC0-1.0",
                "inheritance": "Derived only by resizing and JPEG encoding; inherits the bundled source asset's CC0 terms.",
                "bundled_license": "assets/LICENSES.txt",
                "attribution_records": ["credits.html", "assets/landmarks/V8-SOURCES.md"],
            }
            records.append(build_one(
                DIST / "assets" / "realism" / filename, OUTPUT / filename,
                512, quality, {"diff": "diffuse", "nor": "normal", "rough": "roughness"}[suffix],
                SOURCES[surface], license_info,
            ))

    surface_source_bytes = sum(r["source"]["bytes"] for r in records)
    surface_output_bytes = sum(r["output"]["bytes"] for r in records)
    if surface_output_bytes >= MAX_SURFACE_BYTES:
        raise RuntimeError(f"Surface texture budget exceeded: {surface_output_bytes} bytes")

    records.append(build_one(
        DIST / "assets" / "water-normal.jpg", OUTPUT / "water-normal.jpg", 256, 90, "water_normal",
        {"title": "Three.js example water normals", "provider": "Three.js contributors",
         "url": "https://threejs.org/examples/textures/waternormals.jpg"},
        {"spdx": "MIT",
         "inheritance": "Resized from the bundled Three.js water normal; retains the source MIT license and copyright notice.",
         "bundled_license": "vendor/LICENSE.txt",
         "attribution_records": ["credits.html", "assets/LICENSES.txt"]},
    ))
    source_bytes = sum(r["source"]["bytes"] for r in records)
    output_bytes = sum(r["output"]["bytes"] for r in records)
    summary = {
        "surface_textures": 12,
        "surface_source_bytes": surface_source_bytes,
        "surface_output_bytes": surface_output_bytes,
        "surface_reduction_percent": round(100 * (1 - surface_output_bytes / surface_source_bytes), 2),
        "surface_budget_bytes": MAX_SURFACE_BYTES,
        "files": len(records),
        "total_source_bytes": source_bytes,
        "total_output_bytes": output_bytes,
        "total_reduction_percent": round(100 * (1 - output_bytes / source_bytes), 2),
    }
    manifest = {
        "schema_version": 1,
        "profile": "mobile",
        "generator": {"script": "scripts/build-mobile-assets.py", "library": "Pillow", "version": PIL.__version__},
        "scope": "Mobile texture alternatives only. Original textures, environment HDR, and GLB models are unchanged.",
        "licensing": "Every output inherits its source asset's terms. Existing credits and license files remain required; these files are not relicensed.",
        "environment_hdr": {"path": "assets/realism/environment.hdr", "action": "reuse original; not copied"},
        "summary": summary,
        "files": records,
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    for record in records:
        src, out = record["source"], record["output"]
        print(f"{out['path']}: {src['width']}x{src['height']} / {src['bytes']} bytes -> "
              f"{out['width']}x{out['height']} / {out['bytes']} bytes")


if __name__ == "__main__":
    main()
