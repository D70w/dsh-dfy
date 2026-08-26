#!/usr/bin/env python3
"""Prepare a focused, marked crop for the near-arm skirt inpaint pass."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
SOURCE = PACK / "source" / "whale-maid-master-1024.png"
OUTPUT = PACK / "source" / "ai-completion" / "near-arm-skirt-masked.png"
CROP = (384, 448, 768, 832)


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    crop = source.crop(CROP)
    draw = ImageDraw.Draw(crop, "RGBA")
    # Cover the complete near arm as one movable unit: sleeve, cuff and hand.
    polygon_world = [
        (451, 507),
        (487, 493),
        (526, 526),
        (565, 586),
        (624, 614),
        (664, 665),
        (653, 718),
        (605, 744),
        (552, 696),
        (512, 636),
        (474, 584),
    ]
    polygon_local = [(x - CROP[0], y - CROP[1]) for x, y in polygon_world]
    draw.polygon(polygon_local, fill=(255, 0, 255, 255))
    draw.line(polygon_local + [polygon_local[0]], fill=(255, 255, 255, 255), width=3)
    crop.resize((1024, 1024), Image.Resampling.LANCZOS).save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
