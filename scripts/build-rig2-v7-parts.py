#!/usr/bin/env python3
"""Build the reviewed WhaleRig 2 v7 parts master from category-approved drafts.

The image model is deliberately not trusted to preserve a complete inventory in
one pass. This script selects only approved categories from two drafts:

* structure draft: clean bald head base and two skirt-free thighs;
* side draft: left-facing hair, costume, arms, lower legs, tail and flukes.

It removes the magenta key with soft alpha/decontamination, packs every part
without resizing, and writes a machine-readable provenance/layout file.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
STRUCTURE = ROOT / "character-packs/default-whale/source/side-rig-parts-v6-structure-draft.png"
SIDE = ROOT / "character-packs/default-whale/source/side-rig-parts-v6-side-draft.png"
OUT_DIR = ROOT / "artifacts/whale-rig2-poc"
OUT_IMAGE = OUT_DIR / "parts-v7-transparent.png"
OUT_LAYOUT = OUT_DIR / "parts-v7-layout.json"
OUT_PREVIEW = OUT_DIR / "parts-v7-preview.png"


@dataclass(frozen=True)
class PartSpec:
    id: str
    role: str
    source: str
    bbox: tuple[int, int, int, int]


PARTS = (
    PartSpec("head-base", "head", "structure", (74, 138, 257, 353)),
    PartSpec("bangs", "front-hair", "side", (344, 125, 546, 333)),
    PartSpec("back-hair", "back-hair", "side", (605, 65, 945, 450)),
    PartSpec("side-lock-near", "side-hair-near", "side", (991, 179, 1067, 392)),
    PartSpec("side-lock-far", "side-hair-far", "side", (1124, 178, 1209, 377)),
    PartSpec("ahoge", "ahoge", "side", (113, 433, 205, 501)),
    PartSpec("headdress", "headdress", "side", (303, 393, 607, 595)),
    PartSpec("torso", "torso", "side", (664, 514, 826, 686)),
    PartSpec("skirt-front", "skirt-front", "side", (256, 654, 586, 818)),
    PartSpec("skirt-back", "skirt-back", "side", (847, 687, 1192, 839)),
    PartSpec("upper-arm-far", "upper-arm-far", "side", (93, 849, 202, 973)),
    PartSpec("forearm-far", "forearm-far", "side", (287, 861, 404, 969)),
    PartSpec("upper-arm-near", "upper-arm-near", "side", (505, 865, 601, 970)),
    PartSpec("forearm-near", "forearm-near", "side", (664, 866, 784, 976)),
    PartSpec("thigh-far", "thigh-far", "structure", (110, 1020, 208, 1177)),
    PartSpec("thigh-near", "thigh-near", "structure", (257, 1010, 357, 1176)),
    PartSpec("lower-leg-far", "lower-leg-far", "side", (55, 1023, 207, 1181)),
    PartSpec("lower-leg-near", "lower-leg-near", "side", (242, 1038, 376, 1195)),
    PartSpec("tail-body", "tail-body", "side", (803, 1059, 1022, 1190)),
    PartSpec("tail-flukes", "tail-flukes", "side", (1010, 991, 1221, 1193)),
)


def keyed_part(image: Image.Image, bbox: tuple[int, int, int, int], pad: int = 6) -> Image.Image:
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(image.width, x1 + pad)
    y1 = min(image.height, y1 + pad)
    rgb = np.asarray(image.crop((x0, y0, x1, y1)).convert("RGB"), dtype=np.float32)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    # Magenta score is high only on the synthetic key; blues, skin and whites
    # stay far below it. The broad ramp preserves antialiased edges.
    score = np.minimum(red, blue) - green
    key_gate = np.minimum(
        np.clip((red - 90) / 100, 0, 1),
        np.clip((blue - 90) / 100, 0, 1),
    )
    background_strength = np.clip((score - 35) / 125, 0, 1) * key_gate
    alpha = 1 - background_strength
    alpha[alpha < 0.025] = 0
    labels, count = ndimage.label(alpha > 0.08, structure=np.ones((3, 3), dtype=bool))
    if count > 1:
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        keep = int(np.argmax(sizes))
        alpha[labels != keep] = 0

    # Remove magenta spill from partially transparent pixels using the local
    # corner color as the known background in C = aF + (1-a)B.
    corner_samples = np.concatenate((rgb[:8, :8], rgb[-8:, -8:]), axis=0).reshape(-1, 3)
    background_rgb = np.median(corner_samples, axis=0)
    safe_alpha = np.maximum(alpha, 1 / 255)[..., None]
    foreground_rgb = (rgb - (1 - safe_alpha) * background_rgb) / safe_alpha
    foreground_rgb = np.clip(foreground_rgb, 0, 255)

    rgba = np.empty((*rgb.shape[:2], 4), dtype=np.uint8)
    rgba[..., :3] = foreground_rgb.astype(np.uint8)
    rgba[..., 3] = np.round(alpha * 255).astype(np.uint8)

    visible = rgba[..., 3] > 2
    ys, xs = np.where(visible)
    if len(xs) == 0:
        raise RuntimeError(f"empty keyed crop for bbox {bbox}")
    trim = 3
    left = max(0, int(xs.min()) - trim)
    top = max(0, int(ys.min()) - trim)
    right = min(rgba.shape[1], int(xs.max()) + trim + 1)
    bottom = min(rgba.shape[0], int(ys.max()) + trim + 1)
    return Image.fromarray(rgba[top:bottom, left:right], "RGBA")


def main() -> None:
    sources = {
        "structure": Image.open(STRUCTURE).convert("RGB"),
        "side": Image.open(SIDE).convert("RGB"),
    }
    rendered = [(spec, keyed_part(sources[spec.source], spec.bbox)) for spec in PARTS]

    canvas_width = 1536
    gutter = 28
    x = gutter
    y = gutter
    row_height = 0
    placements: dict[str, dict] = {}
    staged: list[tuple[Image.Image, int, int]] = []
    for spec, part in rendered:
        if x + part.width + gutter > canvas_width:
            x = gutter
            y += row_height + gutter
            row_height = 0
        staged.append((part, x, y))
        placements[spec.id] = {
            "role": spec.role,
            "rect": [x, y, part.width, part.height],
            "source": spec.source,
            "sourceBbox": list(spec.bbox),
        }
        x += part.width + gutter
        row_height = max(row_height, part.height)

    canvas_height = y + row_height + gutter
    sheet = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
    for part, px, py in staged:
        sheet.alpha_composite(part, (px, py))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT_IMAGE)
    preview = Image.new("RGB", sheet.size, (19, 22, 30))
    preview.paste(sheet, (0, 0), sheet)
    preview.save(OUT_PREVIEW)
    OUT_LAYOUT.write_text(json.dumps({
        "schemaVersion": 1,
        "imageSize": list(sheet.size),
        "parts": placements,
        "sources": {
            "structure": str(STRUCTURE.relative_to(ROOT)),
            "side": str(SIDE.relative_to(ROOT)),
        },
        "reference": "reference/run_reference_frames/run-master-v2/normalized/frame-00.png",
        "note": "v7 category-reviewed draft; no runtime integration before golden-pose overlay passes",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_IMAGE.relative_to(ROOT)} {sheet.size} with {len(PARTS)} parts")
    print(f"wrote {OUT_LAYOUT.relative_to(ROOT)} and {OUT_PREVIEW.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
