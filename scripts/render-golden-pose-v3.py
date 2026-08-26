#!/usr/bin/env python3
"""Render the corrected static Golden Pose candidate and comparison sheet.

This is an acceptance artifact, not an animation source.  Every rendered layer
is one reusable semantic Part; the mother frame is used only in the comparison
panels and never by the runtime assembly.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / "character-packs/default-whale/source/realtime-v2-candidate/parts-v2"
V3 = ROOT / "character-packs/default-whale/source/realtime-v3-candidate/parts-v3"
REFERENCE = ROOT / "artifacts/run-master-v3-normalized/frame-30.png"
OUT = ROOT / "artifacts/whale-realtime-golden-v3"
SCALE = 4
CANVAS = 224


@dataclass(frozen=True)
class Layer:
    id: str
    path: Path
    pivot: tuple[float, float]
    target: tuple[float, float]
    scale: tuple[float, float]
    angle: float = 0


LAYERS = (
    Layer("tail-root", V3 / "tail-root.png", (18, 48), (123, 157), (.30, .28), -4),
    Layer("tail-mid", V3 / "tail-mid.png", (4, 66), (166, 160), (.28, .25), -3),
    Layer("tail-flukes", V3 / "tail-flukes.png", (174, 60), (198, 166), (.23, .30), 2),
    Layer("hair-back", V3 / "hair-back.png", (205, 480), (88, 119), (.30, .30)),
    Layer("leg-far", V3 / "leg-far.png", (49, 6), (108, 159), (.15, .15), -24),
    Layer("shoe-far", V3 / "shoe-far.png", (54, 8), (121, 190), (.16, .16), -14),
    Layer("skirt-back", V3 / "skirt-back.png", (164, 14), (94, 139), (.31, .22)),
    Layer("upper-arm-far", V3 / "upper-arm-far.png", (61, 7), (88, 111), (.09, .09), -25),
    Layer("forearm-far", V3 / "forearm-far.png", (174, 59), (94, 123), (.09, .09), -8),
    Layer("torso", V3 / "torso.png", (106, 8), (78, 108), (.29, .24)),
    Layer("leg-near", V3 / "leg-near.png", (49, 6), (91, 159), (.15, .15), 25),
    Layer("shoe-near", V3 / "shoe-near.png", (55, 8), (78, 191), (.17, .17), 18),
    Layer("skirt-front", V3 / "skirt-front.png", (167, 14), (94, 139), (.31, .22)),
    Layer("upper-arm-near", V3 / "upper-arm-near.png", (63, 7), (72, 111), (.09, .09), 29),
    Layer("forearm-near", V3 / "forearm-near.png", (173, 59), (66, 123), (.09, .09), 4),
    Layer("head-base", V2 / "head-base.png", (125, 260), (77, 112), (.34, .34)),
    Layer("headband", V3 / "headband.png", (148, 94), (70, 46), (.27, .27), -2),
    Layer("side-bow-fin", V3 / "side-bow-fin.png", (58, 76), (91, 62), (.25, .25), 0),
    Layer("ahoge", V3 / "ahoge.png", (62, 100), (69, 24), (.32, .32), 0),
)


BONES = (
    ("pelvis", (96, 157), (88, 135)),
    ("spine", (88, 135), (79, 112)),
    ("neck", (79, 112), (67, 72)),
    ("arm-near-upper", (72, 111), (66, 123)),
    ("arm-near-fore", (66, 123), (56, 119)),
    ("arm-far-upper", (88, 111), (94, 123)),
    ("arm-far-fore", (94, 123), (88, 120)),
    ("leg-near-thigh", (91, 159), (84, 174)),
    ("leg-near-calf", (84, 174), (78, 191)),
    ("foot-near", (78, 191), (62, 200)),
    ("leg-far-thigh", (108, 159), (115, 174)),
    ("leg-far-calf", (115, 174), (121, 190)),
    ("foot-far", (121, 190), (135, 194)),
    ("tail-root", (104, 156), (138, 159)),
    ("tail-mid", (138, 159), (175, 163)),
    ("tail-tip", (175, 163), (198, 166)),
)


def affine_layer(layer: Layer) -> Image.Image:
    source = Image.open(layer.path).convert("RGBA")
    angle = math.radians(layer.angle)
    cosine, sine = math.cos(angle), math.sin(angle)
    sx, sy = layer.scale[0] * SCALE, layer.scale[1] * SCALE
    px, py = layer.pivot
    tx, ty = layer.target[0] * SCALE, layer.target[1] * SCALE
    forward = np.array([
        [cosine * sx, -sine * sy, tx - cosine * sx * px + sine * sy * py],
        [sine * sx, cosine * sy, ty - sine * sx * px - cosine * sy * py],
        [0, 0, 1],
    ], dtype=np.float64)
    inverse = np.linalg.inv(forward)
    return source.transform(
        (CANVAS * SCALE, CANVAS * SCALE),
        Image.Transform.AFFINE,
        data=(inverse[0, 0], inverse[0, 1], inverse[0, 2], inverse[1, 0], inverse[1, 1], inverse[1, 2]),
        resample=Image.Resampling.BICUBIC,
    )


def checker(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, (18, 25, 39, 255))
    draw = ImageDraw.Draw(image)
    cell = 14
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2 == 0:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(22, 31, 48, 255))
    return image


def draw_bones(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image)
    for _, start, end in BONES:
        draw.line((*start, *end), fill=(100, 210, 255, 235), width=1)
    for _, start, _ in BONES:
        x, y = start
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(255, 209, 102, 255))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    assembly_hi = Image.new("RGBA", (CANVAS * SCALE, CANVAS * SCALE), (0, 0, 0, 0))
    for layer in LAYERS:
        assembly_hi.alpha_composite(affine_layer(layer))
    assembly = assembly_hi.resize((CANVAS, CANVAS), Image.Resampling.LANCZOS)
    assembly.save(OUT / "golden-assembly.png")

    bones = assembly.copy()
    draw_bones(bones)
    bones.save(OUT / "golden-assembly-bones.png")

    reference = Image.open(REFERENCE).convert("RGBA")
    overlay = Image.blend(reference, assembly, .5)
    overlay.save(OUT / "golden-overlay-50.png")

    panel = checker((CANVAS * 3, CANVAS))
    for index, image in enumerate((reference, assembly, overlay)):
        panel.alpha_composite(image, (CANVAS * index, 0))
    labels = ImageDraw.Draw(panel)
    for index, label in enumerate(("MOTHER FRAME", "LAYER ASSEMBLY", "50% OVERLAY")):
        labels.rounded_rectangle((index * CANVAS + 6, 6, index * CANVAS + 92, 22), radius=4, fill=(9, 15, 25, 220))
        labels.text((index * CANVAS + 10, 9), label, fill=(235, 244, 255, 255))
    panel.convert("RGB").save(OUT / "golden-comparison.png")


if __name__ == "__main__":
    main()
