import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

spec = importlib.util.spec_from_file_location("convert_textures", Path(__file__).resolve().parents[1] / "tools/convert_textures.py")
converter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(converter)


class TextureConversionTests(unittest.TestCase):
    def test_opaque_variants_and_alpha_preservation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            Image.new("RGB", (64, 48), (52, 125, 76)).save(root / "leaf-albedo-v1.png")
            Image.new("RGBA", (32, 20), (220, 180, 130, 255)).save(root / "opaque-albedo-v1.png")
            Image.new("RGBA", (32, 20), (220, 180, 130, 128)).save(root / "alpha-albedo-v1.png")
            indexed = Image.new("P", (10, 10), 0)
            indexed.info["transparency"] = 0
            indexed.save(root / "indexed-albedo-v1.png")
            originals = {p.name: p.read_bytes() for p in root.glob("*.png")}
            results = converter.convert_directory(root)
            self.assertEqual(len(results), 4)
            manifest = json.loads((root / "formats.json").read_text())
            self.assertEqual(manifest["leaf-albedo-v1"], "leaf-albedo-v1.jpg")
            self.assertEqual(manifest["alpha-albedo-v1"], "alpha-albedo-v1.png")
            self.assertEqual(manifest["indexed-albedo-v1"], "indexed-albedo-v1.png")
            self.assertFalse((root / "alpha-albedo-v1.jpg").exists())
            for name, contents in originals.items():
                self.assertEqual((root / name).read_bytes(), contents)
            with Image.open(root / "leaf-albedo-v1.jpg") as image:
                self.assertEqual((image.format, image.mode, image.size), ("JPEG", "RGB", (64, 48)))
            before = (root / "leaf-albedo-v1.jpg").stat().st_mtime_ns
            converter.convert_directory(root)
            self.assertEqual((root / "leaf-albedo-v1.jpg").stat().st_mtime_ns, before)
            (root / "leaf-albedo-v1.png").unlink()
            converter.convert_directory(root)
            self.assertEqual(json.loads((root / "formats.json").read_text())["leaf-albedo-v1"], "leaf-albedo-v1.jpg")


if __name__ == "__main__":
    unittest.main()
