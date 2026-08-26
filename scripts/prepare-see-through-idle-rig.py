from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


ALPHA_CUTOFF = 8
DESIGN_SIZE = 1280


def semantic_crop(
    source: Image.Image,
    source_box: tuple[int, int, int, int],
    output: Path,
    name: str,
    manifest: dict[str, object],
    polygon: list[tuple[int, int]] | None = None,
) -> None:
    rgba = np.asarray(source.convert("RGBA")).copy()
    alpha = rgba[:, :, 3]
    keep = np.zeros(alpha.shape, dtype=bool)
    left, top, right, bottom = source_box
    keep[top:bottom, left:right] = True
    if polygon is not None:
        polygon_mask = Image.new("L", (source.width, source.height), 0)
        ImageDraw.Draw(polygon_mask).polygon(polygon, fill=255)
        keep &= np.asarray(polygon_mask) > 0
    rgba[(~keep) | (alpha <= ALPHA_CUTOFF), 3] = 0
    ys, xs = np.nonzero(rgba[:, :, 3])
    if len(xs) == 0:
        raise ValueError(f"empty semantic part: {name}")
    trim = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    part = Image.fromarray(rgba, "RGBA").crop(trim)
    filename = f"{name}.png"
    part.save(output / filename)
    manifest[name] = {
        "file": filename,
        "x": trim[0],
        "y": trim[1],
        "width": part.width,
        "height": part.height,
    }


def difference_detail(
    source: Image.Image,
    reconstruction: Image.Image,
    polygon: list[tuple[int, int]],
    output: Path,
    name: str,
    manifest: dict[str, object],
) -> None:
    src = np.asarray(source.convert("RGBA"))
    rec = np.asarray(reconstruction.convert("RGBA"))
    delta = np.max(np.abs(src[:, :, :3].astype(np.int16) - rec[:, :, :3].astype(np.int16)), axis=2)
    missing = (delta > 22) | (src[:, :, 3].astype(np.int16) - rec[:, :, 3].astype(np.int16) > 18)
    region = Image.new("L", source.size, 0)
    ImageDraw.Draw(region).polygon(polygon, fill=255)
    mask = missing & (np.asarray(region) > 0) & (src[:, :, 3] > ALPHA_CUTOFF)
    mask = cv2.dilate(mask.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1).astype(bool)
    mask &= (np.asarray(region) > 0) & (src[:, :, 3] > ALPHA_CUTOFF)
    rgba = src.copy()
    rgba[~mask, 3] = 0
    ys, xs = np.nonzero(rgba[:, :, 3])
    if len(xs) == 0:
        raise ValueError(f"empty difference detail: {name}")
    trim = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    part = Image.fromarray(rgba, "RGBA").crop(trim)
    filename = f"{name}.png"
    part.save(output / filename)
    manifest[name] = {
        "file": filename,
        "x": trim[0],
        "y": trim[1],
        "width": part.width,
        "height": part.height,
    }


def cyan_bow_detail(source: Image.Image, output: Path, manifest: dict[str, object]) -> None:
    src = np.asarray(source.convert("RGBA"))
    red, green, blue, alpha = [src[:, :, index] for index in range(4)]
    region = np.zeros(alpha.shape, dtype=bool)
    region[285:375, 805:895] = True
    seed = region & (green > 125) & (blue > 200) & ((green.astype(np.int16) - red.astype(np.int16)) > 45) & (alpha > ALPHA_CUTOFF)
    mask = cv2.dilate(seed.astype(np.uint8), np.ones((5, 5), np.uint8), iterations=3).astype(bool)
    mask &= region & (alpha > ALPHA_CUTOFF)
    rgba = src.copy()
    rgba[~mask, 3] = 0
    ys, xs = np.nonzero(rgba[:, :, 3])
    trim = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    part = Image.fromarray(rgba, "RGBA").crop(trim)
    part.save(output / "side-bow.png")
    manifest["side-bow"] = {"file": "side-bow.png", "x": trim[0], "y": trim[1], "width": part.width, "height": part.height}


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: prepare-see-through-idle-rig.py INPUT_PART_DIR OUTPUT_DIR")
    source_dir = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    output.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, object] = {
        "version": 1,
        "designSize": [DESIGN_SIZE, DESIGN_SIZE],
        "source": "Live2D See-through / LayerDiff user export",
        "parts": {},
    }
    parts: dict[str, object] = manifest["parts"]  # type: ignore[assignment]

    def image(name: str) -> Image.Image:
        return Image.open(source_dir / f"{name}.png").convert("RGBA")

    direct = {
        "hair-back": ("back hair", (328, 139, 956, 849)),
        "tail": ("tail", (707, 673, 1048, 950)),
        "face": ("face", (482, 146, 780, 509)),
        "mouth": ("mouth", (601, 435, 648, 446)),
        "neck": ("neck", (594, 436, 664, 547)),
        "torso": ("topwear", (506, 504, 748, 944)),
        "human-ears": ("ears", (474, 395, 780, 462)),
    }
    for output_name, (source_name, box) in direct.items():
        semantic_crop(image(source_name), box, output, output_name, parts)

    split_parts = {
        "arm-left": ("handwear", (354, 533, 640, 840)),
        "arm-right": ("handwear", (640, 533, 901, 840)),
        "leg-left": ("legwear", (508, 855, 640, 1208)),
        "leg-right": ("legwear", (640, 855, 766, 1208)),
        "shoe-left": ("footwear", (519, 1116, 640, 1244)),
        "shoe-right": ("footwear", (640, 1116, 758, 1244)),
        "eye-white-left": ("eyewhite", (511, 351, 640, 420)),
        "eye-white-right": ("eyewhite", (640, 351, 744, 420)),
        "iris-left": ("irides", (529, 357, 640, 420)),
        "iris-right": ("irides", (640, 357, 724, 420)),
        "lash-left": ("eyelash", (494, 338, 640, 421)),
        "lash-right": ("eyelash", (640, 338, 773, 421)),
        "brow-left": ("eyebrow", (523, 299, 640, 324)),
        "brow-right": ("eyebrow", (640, 299, 729, 324)),
    }
    for output_name, (source_name, box) in split_parts.items():
        semantic_crop(image(source_name), box, output, output_name, parts)

    semantic_crop(image("front hair"), (421, 140, 826, 641), output, "hair-front", parts)
    semantic_crop(image("front hair"), (500, 9, 720, 160), output, "ahoge", parts)
    semantic_crop(image("bottomwear"), (395, 41, 873, 390), output, "maid-headband", parts)
    semantic_crop(image("bottomwear"), (395, 650, 873, 994), output, "skirt", parts)

    source_master = image("src_img")
    reconstruction = image("reconstruction")
    fin_polygons = [
        [(318, 430), (352, 404), (404, 389), (449, 405), (471, 435), (454, 463), (405, 476), (346, 459)],
        [(810, 425), (840, 400), (885, 394), (930, 418), (970, 440), (940, 468), (875, 476), (825, 455)],
    ]
    fin_canvas = np.zeros((DESIGN_SIZE, DESIGN_SIZE, 4), dtype=np.uint8)
    for index, polygon in enumerate(fin_polygons):
        temp_manifest: dict[str, object] = {}
        difference_detail(source_master, reconstruction, polygon, output, f"whale-fin-{index}", temp_manifest)
        detail = temp_manifest[f"whale-fin-{index}"]  # type: ignore[index]
        detail_image = Image.open(output / str(detail["file"])).convert("RGBA")  # type: ignore[index]
        x, y = int(detail["x"]), int(detail["y"])  # type: ignore[index]
        layer = Image.fromarray(fin_canvas, "RGBA")
        layer.alpha_composite(detail_image, (x, y))
        fin_canvas = np.asarray(layer).copy()
        (output / str(detail["file"])).unlink()  # type: ignore[index]
    fins = Image.fromarray(fin_canvas, "RGBA")
    alpha = np.asarray(fins.getchannel("A"))
    ys, xs = np.nonzero(alpha)
    trim = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    fins = fins.crop(trim)
    fins.save(output / "whale-fins.png")
    parts["whale-fins"] = {"file": "whale-fins.png", "x": trim[0], "y": trim[1], "width": fins.width, "height": fins.height}

    cyan_bow_detail(source_master, output, parts)

    source_master.save(output / "source-master.png")
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
