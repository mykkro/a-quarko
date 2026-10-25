"""Create JPEG delivery variants of opaque albedo PNGs; preserve originals/alpha.

Usage: python tools/convert_textures.py [directory] [--quality 92] [--force]
Requires Pillow: python -m pip install Pillow
"""
import argparse
import json
from pathlib import Path
import tempfile

from PIL import Image, ImageOps


def has_transparency(image):
    if "A" in image.getbands() or "transparency" in image.info:
        return image.convert("RGBA").getchannel("A").getextrema()[0] < 255
    return False


def convert_directory(directory, quality=92, force=False):
    directory = Path(directory).resolve()
    if not directory.is_dir():
        raise ValueError(f"Texture directory does not exist: {directory}")
    if not 1 <= quality <= 100:
        raise ValueError("JPEG quality must be between 1 and 100")
    manifest = directory / "formats.json"
    existing = json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists() else {}
    if not isinstance(existing, dict):
        raise ValueError("Texture manifest must contain a filename mapping")
    # A checkout may contain delivery JPEGs but omit the large source PNGs.
    formats = {key: value for key, value in existing.items() if isinstance(key, str) and isinstance(value, str) and Path(value).name == value and (directory / value).is_file()}
    results = []
    for source in sorted(directory.glob("*-albedo-v1.png")):
        with Image.open(source) as original:
            if has_transparency(original):
                formats[source.stem] = source.name
                results.append({"source": source.name, "file": source.name, "status": "preserved alpha", "before": source.stat().st_size, "after": source.stat().st_size})
                continue
            target = source.with_suffix(".jpg")
            if force or not target.exists() or target.stat().st_mtime_ns < source.stat().st_mtime_ns:
                image = ImageOps.exif_transpose(original).convert("RGB")
                # Same dimensions, no alpha flattening, no modification of the PNG.
                with tempfile.NamedTemporaryFile(dir=directory, suffix=".jpg", delete=False) as temp:
                    temp_path = Path(temp.name)
                try:
                    options = {"quality": quality, "subsampling": 0, "optimize": True, "progressive": True}
                    if original.info.get("icc_profile"):
                        options["icc_profile"] = original.info["icc_profile"]
                    image.save(temp_path, "JPEG", **options)
                    temp_path.replace(target)
                finally:
                    temp_path.unlink(missing_ok=True)
                status = "converted"
            else:
                status = "up to date"
            formats[source.stem] = target.name
            results.append({"source": source.name, "file": target.name, "status": status, "before": source.stat().st_size, "after": target.stat().st_size})
    content = json.dumps(formats, ensure_ascii=False, indent=2) + "\n"
    if not manifest.exists() or manifest.read_text(encoding="utf-8") != content:
        manifest.write_text(content, encoding="utf-8")
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=Path, default=Path(__file__).resolve().parents[1] / "dist/assets/textures")
    parser.add_argument("--quality", type=int, default=92, help="JPEG quality, 1–100 (default 92); use --force to re-encode existing files")
    parser.add_argument("--force", action="store_true", help="Re-encode JPEG variants; original PNGs are always preserved")
    args = parser.parse_args()
    try:
        results = convert_directory(args.directory, args.quality, args.force)
    except (ValueError, OSError) as error:
        parser.exit(1, f"Conversion failed: {error}\n")
    for row in results:
        print(f"{row['source']} -> {row['file']}: {row['status']}")
    before, after = sum(r["before"] for r in results), sum(r["after"] for r in results)
    saving = 100 * (1 - after / before) if before else 0
    print(f"{len(results)} textures: {before / 1e6:.2f} MB -> {after / 1e6:.2f} MB ({saving:.1f}% smaller)")


if __name__ == "__main__":
    main()
