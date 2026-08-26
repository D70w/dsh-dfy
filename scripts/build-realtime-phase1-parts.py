#!/usr/bin/env python3
"""Extract the approved phase-1 realtime rig master into independent PNGs.

The generated source master contains a baked neutral checker.  This script
deterministically extracts exactly fifteen connected foreground components,
restores soft edge alpha, and writes one file per semantic Part.  It never
creates an atlas or animation frame.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "character-packs/default-whale/source/realtime-phase1"
SOURCE = SOURCE_DIR / "parts-master-v1.png"
OUTPUT = SOURCE_DIR / "parts-v1"
LAYOUT = SOURCE_DIR / "parts-v1.json"
PREVIEW = SOURCE_DIR / "parts-v1-preview.png"


@dataclass(frozen=True)
class PartSpec:
    id: str
    center: tuple[int, int]


PARTS = (
    PartSpec("hair-back", (286, 218)),
    PartSpec("head", (702, 205)),
    PartSpec("ahoge", (1128, 262)),
    PartSpec("body", (236, 535)),
    PartSpec("upper-arm-near", (570, 516)),
    PartSpec("forearm-near", (788, 520)),
    PartSpec("upper-arm-far", (1032, 514)),
    PartSpec("forearm-far", (1245, 520)),
    PartSpec("thigh-near", (570, 758)),
    PartSpec("lower-leg-near", (794, 758)),
    PartSpec("thigh-far", (1035, 758)),
    PartSpec("lower-leg-far", (1237, 754)),
    PartSpec("tail", (292, 945)),
    PartSpec("front-hair-lock", (708, 963)),
    PartSpec("neck-overlap", (1053, 990)),
)


def components(image: Image.Image) -> tuple[np.ndarray, np.ndarray, dict[int, tuple[float, float]]]:
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    high = rgb.max(axis=2).astype(np.int16)
    low = rgb.min(axis=2).astype(np.int16)
    mean = rgb.mean(axis=2)
    # Generated art is chromatic/dark; the baked checker is neutral and light.
    seed = ((high - low) > 12) | (mean < 222)
    seed = ndimage.binary_closing(seed, iterations=1)
    labels, count = ndimage.label(seed, structure=np.ones((3, 3), dtype=bool))
    sizes = np.bincount(labels.ravel())
    centers: dict[int, tuple[float, float]] = {}
    for label in range(1, count + 1):
        if sizes[label] < 220:
            continue
        y, x = ndimage.center_of_mass(seed, labels, label)
        centers[label] = (float(x), float(y))
    return rgb, labels, centers


def extract(
    rgb: np.ndarray,
    labels: np.ndarray,
    centers: dict[int, tuple[float, float]],
    spec: PartSpec,
) -> Image.Image:
    target_x, target_y = spec.center
    label = min(
        centers,
        key=lambda item: (centers[item][0] - target_x) ** 2 + (centers[item][1] - target_y) ** 2,
    )
    foreground = labels == label
    filled = ndimage.binary_fill_holes(foreground)

    high = rgb.max(axis=2).astype(np.int16)
    low = rgb.min(axis=2).astype(np.int16)
    mean = rgb.mean(axis=2)
    expanded = ndimage.binary_dilation(filled, iterations=2)
    edge = expanded & ~filled
    chroma = (high - low).astype(np.float32)
    darkness = np.clip((244 - mean) / 28, 0, 1)
    edge_alpha = np.clip(chroma / 22, 0, 1) * 0.72 + darkness * 0.28
    alpha = filled.astype(np.float32)
    alpha[edge] = edge_alpha[edge]
    alpha[alpha < 0.045] = 0

    rgba = np.empty((*rgb.shape[:2], 4), dtype=np.uint8)
    rgba[..., :3] = rgb
    rgba[..., 3] = np.round(alpha * 255).astype(np.uint8)
    ys, xs = np.where(rgba[..., 3] > 2)
    if len(xs) == 0:
        raise RuntimeError(f"empty component: {spec.id}")
    pad = 5
    left = max(0, int(xs.min()) - pad)
    top = max(0, int(ys.min()) - pad)
    right = min(rgba.shape[1], int(xs.max()) + pad + 1)
    bottom = min(rgba.shape[0], int(ys.max()) + pad + 1)
    return Image.fromarray(rgba[top:bottom, left:right], "RGBA")


def main() -> None:
    rgb, labels, centers = components(Image.open(SOURCE))
    rendered = [(spec, extract(rgb, labels, centers, spec)) for spec in PARTS]
    if len({part.tobytes() for _, part in rendered}) != len(PARTS):
        raise RuntimeError("two semantic part centers resolved to the same component")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    metadata: dict[str, dict[str, object]] = {}
    for spec, part in rendered:
        path = OUTPUT / f"{spec.id}.png"
        part.save(path)
        metadata[spec.id] = {
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "size": list(part.size),
            "sourceCenter": list(spec.center),
        }

    cell_w = 320
    cell_h = 250
    columns = 3
    rows = (len(rendered) + columns - 1) // columns
    sheet = Image.new("RGB", (cell_w * columns, cell_h * rows), (19, 22, 30))
    draw = ImageDraw.Draw(sheet)
    for index, (spec, part) in enumerate(rendered):
        scale = min((cell_w - 24) / part.width, (cell_h - 42) / part.height, 1)
        shown = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.LANCZOS)
        x = index % columns * cell_w + (cell_w - shown.width) // 2
        y = index // columns * cell_h + 28 + (cell_h - 36 - shown.height) // 2
        sheet.paste(shown, (x, y), shown)
        draw.text((index % columns * cell_w + 10, index // columns * cell_h + 8), spec.id, fill=(235, 239, 248))
    sheet.save(PREVIEW)

    LAYOUT.write_text(json.dumps({
        "schemaVersion": 1,
        "kind": "independent-static-parts",
        "partCount": len(PARTS),
        "animationFrames": 0,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "parts": metadata,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(PARTS)} independent static PNG parts to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
