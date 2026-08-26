from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image


def is_background(pixel: tuple[int, int, int]) -> bool:
    red, green, blue = pixel
    return max(pixel) - min(pixel) <= 5 and min(pixel) >= 215


def cell_bounds(width: int, height: int, column: int, row: int) -> tuple[int, int, int, int]:
    x_edges = [round(index * width / 4) for index in range(5)]
    y_edges = [round(index * height / 2) for index in range(3)]
    return x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1]


def foreground_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    background = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def add(x: int, y: int) -> None:
        index = y * width + x
        if background[index] or not is_background(pixels[x, y]):
            return
        background[index] = 1
        queue.append((x, y))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)
    while queue:
        x, y = queue.popleft()
        if x > 0:
            add(x - 1, y)
        if x + 1 < width:
            add(x + 1, y)
        if y > 0:
            add(x, y - 1)
        if y + 1 < height:
            add(x, y + 1)

    xs: list[int] = []
    ys: list[int] = []
    for y in range(height):
        for x in range(width):
            if not background[y * width + x]:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: analyze-community-rig-atlas.py <atlas.png>")
    source = Path(sys.argv[1])
    image = Image.open(source).convert("RGB")
    cells = []
    for row in range(2):
        for column in range(4):
            bounds = cell_bounds(*image.size, column, row)
            bbox = foreground_bbox(image.crop(bounds))
            cells.append({"index": row * 4 + column, "cell": bounds, "contentBounds": bbox})
    print(json.dumps({"source": str(source), "size": image.size, "cells": cells}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
