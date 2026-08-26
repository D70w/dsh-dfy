from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def is_checker_background(pixel: tuple[int, int, int]) -> bool:
    """Match only the near-neutral whites used by the baked checkerboard."""

    darkest = min(pixel)
    lightest = max(pixel)
    return darkest >= 238 and lightest - darkest <= 12


def remove_edge_connected_checkerboard(image: Image.Image) -> Image.Image:
    """Remove checkerboard pixels reachable from the canvas edge.

    Restricting removal to edge-connected pixels preserves the character's
    enclosed white headdress, apron, blouse, ruffles, highlights, and eyes.
    """

    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    background = bytearray(width * height)
    pending: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if background[index] or not is_checker_background(pixels[x, y]):
            return
        background[index] = 1
        pending.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while pending:
        x, y = pending.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    rgba = rgb.convert("RGBA")
    alpha = Image.new("L", (width, height), 255)
    alpha.putdata(bytes(0 if value else 255 for value in background))
    rgba.putalpha(alpha)
    return rgba


def remove_small_sprite_fragments(image: Image.Image) -> Image.Image:
    """Keep the authored character silhouette and discard disconnected grid leakage."""

    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    width, height = rgba.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []

    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if visited[start_index] or pixels[start_x, start_y] == 0:
                continue
            visited[start_index] = 1
            pending = deque([(start_x, start_y)])
            points: list[tuple[int, int]] = []
            while pending:
                x, y = pending.popleft()
                points.append((x, y))
                for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if next_x < 0 or next_x >= width or next_y < 0 or next_y >= height:
                        continue
                    index = next_y * width + next_x
                    if visited[index] or pixels[next_x, next_y] == 0:
                        continue
                    visited[index] = 1
                    pending.append((next_x, next_y))
            components.append(points)

    if not components:
        return rgba
    largest = max(len(points) for points in components)
    writable = alpha.load()
    for points in components:
        if len(points) >= largest * 0.08:
            continue
        for x, y in points:
            writable[x, y] = 0
    rgba.putalpha(alpha)
    return rgba


def build_sprite_sheet(
    image: Image.Image,
    columns: int,
    rows: int,
    cell_size: int,
    colors: int,
) -> Image.Image:
    """Remove the connected checkerboard and normalize a regular sprite grid."""

    transparent = remove_edge_connected_checkerboard(image)
    runtime = Image.new("RGBA", (columns * cell_size, rows * cell_size))
    for row in range(rows):
        top = round(row * transparent.height / rows)
        bottom = round((row + 1) * transparent.height / rows)
        for column in range(columns):
            left = round(column * transparent.width / columns)
            right = round((column + 1) * transparent.width / columns)
            cell = remove_small_sprite_fragments(transparent.crop((left, top, right, bottom)))
            cell.thumbnail((cell_size, cell_size), Image.Resampling.LANCZOS)
            x = column * cell_size + (cell_size - cell.width) // 2
            y = row * cell_size + (cell_size - cell.height) // 2
            runtime.alpha_composite(cell, (x, y))
    return runtime.quantize(
        colors=colors,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the approved whale-pet character PNGs.")
    parser.add_argument("input", type=Path)
    parser.add_argument("transparent_source", type=Path)
    parser.add_argument("runtime_png", type=Path)
    parser.add_argument("--sprite-source", type=Path)
    parser.add_argument("--sprite-runtime", type=Path)
    parser.add_argument("--sprite-columns", type=int, default=4)
    parser.add_argument("--sprite-rows", type=int, default=4)
    parser.add_argument("--sprite-cell-size", type=int, default=192)
    parser.add_argument("--sprite-colors", type=int, default=128)
    args = parser.parse_args()

    approved = Image.open(args.input)
    transparent = remove_edge_connected_checkerboard(approved)

    args.transparent_source.parent.mkdir(parents=True, exist_ok=True)
    args.runtime_png.parent.mkdir(parents=True, exist_ok=True)
    transparent.save(args.transparent_source, optimize=True)

    runtime = transparent.resize((224, 224), Image.Resampling.LANCZOS)
    runtime.save(args.runtime_png, optimize=True)

    if (args.sprite_source is not None or args.sprite_runtime is not None):
        if args.sprite_source is None or args.sprite_runtime is None:
            parser.error("--sprite-source and --sprite-runtime must be provided together")
        if args.sprite_columns <= 0 or args.sprite_rows <= 0 or args.sprite_cell_size <= 0:
            parser.error("sprite grid values must be positive")
        if args.sprite_colors < 16 or args.sprite_colors > 256:
            parser.error("--sprite-colors must be between 16 and 256")
        sprite = build_sprite_sheet(
            Image.open(args.sprite_source),
            args.sprite_columns,
            args.sprite_rows,
            args.sprite_cell_size,
            args.sprite_colors,
        )
        args.sprite_runtime.parent.mkdir(parents=True, exist_ok=True)
        sprite.save(args.sprite_runtime, optimize=True)


if __name__ == "__main__":
    main()
