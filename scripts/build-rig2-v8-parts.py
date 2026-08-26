#!/usr/bin/env python3
"""Extract the v8 reference-matched WhaleRig parts into a transparent atlas.

The image generator returned a checkerboard baked into RGB pixels, so this
builder performs deterministic background removal.  It treats only large
near-neutral light regions connected to a cell edge (plus large enclosed
checker regions such as the tail socket) as background.  Small enclosed white
areas are retained, which preserves the maid frills and highlights.

Each source cell contains exactly one semantic part.  Parts are packed without
resizing; runtime bindings own all assembly scale, pivots and z-order.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "character-packs/default-whale/source/side-rig-parts-v8-candidate.png"
OUT_DIR = ROOT / "artifacts/whale-rig2-poc"
OUT_IMAGE = OUT_DIR / "parts-v8-transparent.png"
OUT_LAYOUT = OUT_DIR / "parts-v8-layout.json"
OUT_PREVIEW = OUT_DIR / "parts-v8-preview.png"


@dataclass(frozen=True)
class PartSpec:
    id: str
    role: str
    center: tuple[int, int]


PARTS = (
    PartSpec("head-base", "head", (182, 155)),
    PartSpec("bangs", "front-hair", (442, 144)),
    PartSpec("back-hair", "back-hair", (760, 198)),
    PartSpec("side-lock-near", "side-hair-near", (1035, 141)),
    PartSpec("side-lock-far", "side-hair-far", (176, 428)),
    PartSpec("ahoge", "ahoge", (432, 433)),
    PartSpec("headdress", "headdress", (755, 470)),
    PartSpec("torso", "torso", (1039, 443)),
    PartSpec("skirt-front", "skirt-front", (236, 697)),
    PartSpec("skirt-back", "skirt-back", (576, 700)),
    PartSpec("upper-arm-near", "upper-arm-near", (826, 697)),
    PartSpec("forearm-near", "forearm-near", (1051, 698)),
    PartSpec("upper-arm-far", "upper-arm-far", (171, 902)),
    PartSpec("forearm-far", "forearm-far", (433, 914)),
    PartSpec("thigh-near", "thigh-near", (800, 901)),
    PartSpec("thigh-far", "thigh-far", (1010, 906)),
    PartSpec("lower-leg-near", "lower-leg-near", (170, 1119)),
    PartSpec("lower-leg-far", "lower-leg-far", (408, 1118)),
    PartSpec("tail-body", "tail-body", (698, 1124)),
    PartSpec("tail-flukes", "tail-flukes", (1054, 1108)),
)


def source_components(image: Image.Image) -> tuple[np.ndarray, np.ndarray, dict[int, tuple[float, float]]]:
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    hi = rgb.max(axis=2).astype(np.int16)
    lo = rgb.min(axis=2).astype(np.int16)
    mean = rgb.mean(axis=2)
    seed = ((hi - lo) > 13) | (mean < 226)
    labels, count = ndimage.label(seed, structure=np.ones((3, 3), dtype=bool))
    sizes = np.bincount(labels.ravel())
    centers: dict[int, tuple[float, float]] = {}
    for label in range(1, count + 1):
        if sizes[label] < 300:
            continue
        y, x = ndimage.center_of_mass(seed, labels, label)
        centers[label] = (float(x), float(y))
    return rgb, labels, centers


def extract_part(
    rgb: np.ndarray,
    labels: np.ndarray,
    centers: dict[int, tuple[float, float]],
    spec: PartSpec,
) -> Image.Image:
    target_x, target_y = spec.center
    label = min(centers, key=lambda item: (centers[item][0] - target_x) ** 2 + (centers[item][1] - target_y) ** 2)
    foreground = labels == label
    filled = ndimage.binary_fill_holes(foreground)

    # The root socket is a genuine hole, unlike the enclosed white frills.
    if spec.id == "tail-body":
        holes, hole_count = ndimage.label(filled & ~foreground, structure=np.ones((3, 3), dtype=bool))
        hole_sizes = np.bincount(holes.ravel())
        for hole in range(1, hole_count + 1):
            if hole_sizes[hole] >= 180:
                filled[holes == hole] = False

    hi = rgb.max(axis=2).astype(np.int16)
    lo = rgb.min(axis=2).astype(np.int16)
    mean = rgb.mean(axis=2)
    expanded = ndimage.binary_dilation(filled, iterations=1)
    edge = expanded & ~filled
    chroma = (hi - lo).astype(np.float32)
    darkness = np.clip((244 - mean) / 22, 0, 1)
    edge_alpha = np.clip(chroma / 20, 0, 1) * 0.75 + darkness * 0.25
    alpha = filled.astype(np.float32)
    alpha[edge] = edge_alpha[edge]
    alpha[alpha < 0.04] = 0

    rgba = np.empty((*rgb.shape[:2], 4), dtype=np.uint8)
    rgba[..., :3] = rgb
    rgba[..., 3] = np.round(alpha * 255).astype(np.uint8)

    ys, xs = np.where(rgba[..., 3] > 2)
    if len(xs) == 0:
        raise RuntimeError(f"empty v8 crop after masking {spec.id}")
    pad = 4
    left = max(0, int(xs.min()) - pad)
    top = max(0, int(ys.min()) - pad)
    right = min(rgba.shape[1], int(xs.max()) + pad + 1)
    bottom = min(rgba.shape[0], int(ys.max()) + pad + 1)
    return Image.fromarray(rgba[top:bottom, left:right], "RGBA")


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    rgb, labels, centers = source_components(source)
    rendered = [(spec, extract_part(rgb, labels, centers, spec)) for spec in PARTS]

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
            "sourceCenter": list(spec.center),
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
        "source": str(SOURCE.relative_to(ROOT)),
        "reference": "reference/run_reference_frames/run-master-v2/normalized/frame-00.png",
        "note": "v8 candidate; runtime integration only after golden-pose assembly passes",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_IMAGE.relative_to(ROOT)} {sheet.size} with {len(PARTS)} parts")


if __name__ == "__main__":
    main()
