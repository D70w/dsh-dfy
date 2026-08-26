from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image


PART_NAMES = (
    "rear-hair",
    "head",
    "torso",
    "tail-body",
    "near-upper-arm",
    "near-forearm",
    "far-upper-arm",
    "far-forearm",
    "near-thigh",
    "near-lower-leg",
    "near-shoe",
    "far-thigh",
    "far-lower-leg",
    "far-shoe",
    "front-hair-lock",
    "tail-flukes",
)

PART_NAMES_V4 = (
    "rear-hair",
    "head",
    "torso",
    "tail-body",
    "far-upper-arm",
    "far-forearm",
    "near-upper-arm",
    "near-forearm",
    "far-thigh",
    "far-lower-leg",
    "far-shoe",
    "near-thigh",
    "near-lower-leg",
    "near-shoe",
    "front-hair-lock",
    "tail-flukes",
)


def is_checker(pixel: tuple[int, int, int]) -> bool:
    darkest = min(pixel)
    lightest = max(pixel)
    return darkest >= 224 and lightest - darkest <= 10


def transparent_checker(image: Image.Image) -> Image.Image:
    """Remove only near-neutral checker pixels connected to an image edge."""

    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    outside = bytearray(width * height)
    pending: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if outside[index] or not is_checker(pixels[x, y]):
            return
        outside[index] = 1
        pending.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)
    while pending:
        x, y = pending.popleft()
        if x:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    rgba = rgb.convert("RGBA")
    alpha = Image.new("L", (width, height), 255)
    alpha.putdata(bytes(0 if value else 255 for value in outside))
    rgba.putalpha(alpha)
    return rgba


def trim(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("empty component cell")
    return image.crop(bounds)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the transparent side-view WhaleRig atlas.")
    parser.add_argument("parts_sheet", type=Path)
    parser.add_argument("front_character", type=Path)
    parser.add_argument("atlas", type=Path)
    parser.add_argument("layout", type=Path)
    parser.add_argument("--v4-order", action="store_true", help="use the corrected far/near order from v4")
    args = parser.parse_args()

    source = transparent_checker(Image.open(args.parts_sheet))
    columns = rows = 4
    components: dict[str, Image.Image] = {}
    names = PART_NAMES_V4 if args.v4_order else PART_NAMES
    for index, name in enumerate(names):
        column, row = index % columns, index // columns
        left = round(column * source.width / columns)
        right = round((column + 1) * source.width / columns)
        top = round(row * source.height / rows)
        bottom = round((row + 1) * source.height / rows)
        components[name] = trim(source.crop((left, top, right, bottom)))

    if args.v4_order:
        # The v4 rear-hair cell includes a duplicate crown and ahoge. The head
        # cell owns those pixels; retain only the overlap-ready flowing length.
        rear_hair = components["rear-hair"]
        components["rear-hair"] = trim(rear_hair.crop((0, round(rear_hair.height * 0.34), rear_hair.width, rear_hair.height)))
    else:
        # Historical v2/v3 tail cells also contained a duplicate fluke. Keep
        # only their flexible stalk; v4 already has a dedicated clean stalk.
        tail = components["tail-body"]
        components["tail-body"] = trim(tail.crop((0, 0, round(tail.width * 0.68), tail.height)))

    cell = 256
    atlas = Image.new("RGBA", (cell * 5, cell * 4))
    front = Image.open(args.front_character).convert("RGBA").resize((224, 224), Image.Resampling.LANCZOS)
    atlas.alpha_composite(front, (16, 16))
    layout: dict[str, list[int]] = {"front": [16, 16, 224, 224]}

    for index, name in enumerate(names, start=1):
        component = components[name]
        component.thumbnail((224, 224), Image.Resampling.LANCZOS)
        cell_x = index % 5 * cell
        cell_y = index // 5 * cell
        x = cell_x + (cell - component.width) // 2
        y = cell_y + (cell - component.height) // 2
        atlas.alpha_composite(component, (x, y))
        layout[name] = [x, y, component.width, component.height]

    args.atlas.parent.mkdir(parents=True, exist_ok=True)
    args.layout.parent.mkdir(parents=True, exist_ok=True)
    runtime = atlas.quantize(
        colors=192,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    )
    runtime.save(args.atlas, optimize=True)
    args.layout.write_text(json.dumps({"atlas": list(atlas.size), "parts": layout}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
