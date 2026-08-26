from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def alpha_components(image: Image.Image) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    alpha = np.asarray(image.getchannel("A"))
    # The supplied atlases already contain genuine alpha. Strong alpha pixels
    # identify neighboring parts; softer edge pixels are assigned back only to
    # their adjacent part below, never by inspecting RGB colors.
    # 64 keeps visually opaque regions intact while separating components
    # whose very soft anti-alias fringes merely touch in the atlas layout.
    _, labels, stats, centroids = cv2.connectedComponentsWithStats((alpha > 64).astype(np.uint8), 8)
    return alpha, labels, stats, centroids


def component_at(image: Image.Image, anchor: tuple[int, int], padding: int = 8) -> tuple[Image.Image, list[int]]:
    alpha, labels, stats, centroids = alpha_components(image)
    x, y = anchor
    label = int(labels[y, x])
    if label == 0:
        candidates = [index for index in range(1, len(stats)) if int(stats[index, cv2.CC_STAT_AREA]) > 1000]
        label = min(candidates, key=lambda index: (float(centroids[index, 0]) - x) ** 2 + (float(centroids[index, 1]) - y) ** 2)
    core = labels == label
    soft_edge = cv2.dilate(core.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1).astype(bool) & (labels == 0) & (alpha > 0)
    expanded = core | soft_edge
    rgba = np.asarray(image).copy()
    rgba[~expanded, 3] = 0
    ys, xs = np.nonzero(rgba[:, :, 3])
    left = max(0, int(xs.min()) - padding)
    top = max(0, int(ys.min()) - padding)
    right = min(image.width, int(xs.max()) + padding + 1)
    bottom = min(image.height, int(ys.max()) + padding + 1)
    return Image.fromarray(rgba, "RGBA").crop((left, top, right, bottom)), [left, top, right, bottom]


def crop_alpha(image: Image.Image, box: tuple[int, int, int, int]) -> tuple[Image.Image, list[int]]:
    cropped = image.crop(box)
    alpha = np.asarray(cropped.getchannel("A"))
    ys, xs = np.nonzero(alpha)
    if len(xs) == 0:
        raise ValueError(f"Empty alpha crop: {box}")
    left = int(xs.min())
    top = int(ys.min())
    right = int(xs.max()) + 1
    bottom = int(ys.max()) + 1
    return cropped.crop((left, top, right, bottom)), [box[0] + left, box[1] + top, box[0] + right, box[1] + bottom]


def component_region(
    image: Image.Image,
    anchor: tuple[int, int],
    box: tuple[int, int, int, int],
    padding: int = 8,
) -> tuple[Image.Image, list[int]]:
    alpha, labels, stats, centroids = alpha_components(image)
    x, y = anchor
    label = int(labels[y, x])
    if label == 0:
        candidates = [index for index in range(1, len(stats)) if int(stats[index, cv2.CC_STAT_AREA]) > 1000]
        label = min(candidates, key=lambda index: (float(centroids[index, 0]) - x) ** 2 + (float(centroids[index, 1]) - y) ** 2)
    core = labels == label
    soft_edge = cv2.dilate(core.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1).astype(bool) & (labels == 0) & (alpha > 0)
    expanded = core | soft_edge
    left, top, right, bottom = box
    region = np.zeros_like(expanded)
    region[top:bottom, left:right] = True
    rgba = np.asarray(image).copy()
    rgba[~(expanded & region), 3] = 0
    isolated = Image.fromarray(rgba, "RGBA")
    return crop_alpha(isolated, box)


def save_part(output: Path, name: str, part: Image.Image, source_box: list[int], manifest: dict) -> None:
    filename = f"{name}.png"
    part.save(output / filename, format="PNG")
    manifest[name] = {
        "file": filename,
        "width": part.width,
        "height": part.height,
        "sourceBox": source_box,
    }


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: extract-community-rig-v2.py STRUCTURAL.png FACIAL.png OUTPUT_DIR")
    structural_path = Path(sys.argv[1]).resolve()
    facial_path = Path(sys.argv[2]).resolve()
    output = Path(sys.argv[3]).resolve()
    output.mkdir(parents=True, exist_ok=True)

    structural = Image.open(structural_path).convert("RGBA")
    facial = Image.open(facial_path).convert("RGBA")
    shutil.copy2(structural_path, output / "structural-atlas-transparent.png")
    shutil.copy2(facial_path, output / "facial-atlas-transparent.png")

    manifest: dict[str, object] = {
        "version": 2,
        "source": "user-provided true-alpha atlases",
        "structuralSize": [structural.width, structural.height],
        "facialSize": [facial.width, facial.height],
        "parts": {},
    }
    parts: dict = manifest["parts"]  # type: ignore[assignment]

    structural_components = {
        "hair-back": (180, 300),
        "tail": (520, 470),
        "hair-front": (220, 850),
        "arm-far": (560, 930),
        "arm-near": (850, 940),
        "ahoge": (1116, 908),
    }
    for name, anchor in structural_components.items():
        part, box = component_at(structural, anchor)
        save_part(output, name, part, box, parts)

    for name, (anchor, box) in {
        "body": ((820, 400), (570, 80, 955, 770)),
        "head-base": ((1100, 350), (955, 180, 1254, 650)),
    }.items():
        part, source_box = component_region(structural, anchor, box)
        save_part(output, name, part, source_box, parts)

    facial_components = {
        "eye-open-left": (300, 280),
        "eye-open-right": (900, 280),
        "eye-closed-left": (300, 570),
        "eye-closed-right": (900, 570),
        "brow-neutral-left": (180, 850),
        "brow-neutral-right": (430, 850),
        "brow-alt-left": (780, 850),
        "brow-alt-right": (1060, 850),
        "mouth-smug": (400, 1050),
        "mouth-happy": (850, 1050),
    }
    for name, anchor in facial_components.items():
        part, box = component_at(facial, anchor)
        save_part(output, name, part, box, parts)

    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
