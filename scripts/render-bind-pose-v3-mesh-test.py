#!/usr/bin/env python3
"""Render a seamless two-bone weighted-mesh knee feasibility test."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CANVAS_SIZE = (1024, 1024)
BACKGROUND = (18, 25, 39, 255)
NEAR_LEG_PARTS = {"thigh-near", "calf-near", "knee-near", "foot-near"}
GRID_X = np.array([392, 412, 432, 452, 472, 492, 516, 546], dtype=np.float64)
GRID_Y = np.array([820, 832, 844, 856, 868, 880, 892, 906, 922, 944, 972, 1020], dtype=np.float64)


def rotation_about(pivot: tuple[float, float], degrees: float) -> np.ndarray:
    radians = np.deg2rad(degrees)
    cosine = float(np.cos(radians))
    sine = float(np.sin(radians))
    px, py = pivot
    return np.array([
        [cosine, -sine, px - cosine * px + sine * py],
        [sine, cosine, py - sine * px - cosine * py],
        [0.0, 0.0, 1.0],
    ])


def transform_point(matrix: np.ndarray, point: tuple[float, float]) -> tuple[float, float]:
    result = matrix @ np.array([point[0], point[1], 1.0])
    return float(result[0]), float(result[1])


def on_background(character: Image.Image) -> Image.Image:
    background = Image.new("RGBA", CANVAS_SIZE, BACKGROUND)
    background.alpha_composite(character)
    return background


def build_leg_texture(root: Path) -> Image.Image:
    visible = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    for part_id in ("thigh-near", "calf-near", "knee-near", "foot-near"):
        visible.alpha_composite(Image.open(root / "textures" / f"{part_id}.png").convert("RGBA"))

    visible_array = np.asarray(visible, dtype=np.uint8).copy()
    visible_array[:820, :, 3] = 0
    return Image.fromarray(visible_array, "RGBA")


def bilinear_sample(source: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    height, width = source.shape[:2]
    x = np.clip(x, 0, width - 1)
    y = np.clip(y, 0, height - 1)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    x1 = np.minimum(x0 + 1, width - 1)
    y1 = np.minimum(y0 + 1, height - 1)
    fx = (x - x0)[..., None]
    fy = (y - y0)[..., None]
    top = source[y0, x0] * (1.0 - fx) + source[y0, x1] * fx
    bottom = source[y1, x0] * (1.0 - fx) + source[y1, x1] * fx
    return top * (1.0 - fy) + bottom * fy


def alpha_over(destination: np.ndarray, source: np.ndarray, yy: np.ndarray, xx: np.ndarray) -> None:
    source_alpha = source[:, 3:4] / 255.0
    destination_pixels = destination[yy, xx]
    destination_alpha = destination_pixels[:, 3:4] / 255.0
    output_alpha = source_alpha + destination_alpha * (1.0 - source_alpha)
    numerator = source[:, :3] * source_alpha + destination_pixels[:, :3] * destination_alpha * (1.0 - source_alpha)
    output_rgb = np.divide(numerator, output_alpha, out=np.zeros_like(numerator), where=output_alpha > 1e-8)
    destination[yy, xx, :3] = output_rgb
    destination[yy, xx, 3:4] = output_alpha * 255.0


def rasterize_triangle(
    source: np.ndarray,
    destination: np.ndarray,
    source_triangle: np.ndarray,
    destination_triangle: np.ndarray,
) -> None:
    minimum = np.floor(destination_triangle.min(axis=0)).astype(int)
    maximum = np.ceil(destination_triangle.max(axis=0)).astype(int)
    min_x = max(0, minimum[0])
    min_y = max(0, minimum[1])
    max_x = min(CANVAS_SIZE[0] - 1, maximum[0])
    max_y = min(CANVAS_SIZE[1] - 1, maximum[1])
    if min_x > max_x or min_y > max_y:
        return

    x_grid, y_grid = np.meshgrid(np.arange(min_x, max_x + 1), np.arange(min_y, max_y + 1))
    points = np.stack((x_grid.ravel() + 0.5, y_grid.ravel() + 0.5), axis=1)
    a, b, c = destination_triangle
    denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(denominator) < 1e-8:
        return
    weight_a = ((b[1] - c[1]) * (points[:, 0] - c[0]) + (c[0] - b[0]) * (points[:, 1] - c[1])) / denominator
    weight_b = ((c[1] - a[1]) * (points[:, 0] - c[0]) + (a[0] - c[0]) * (points[:, 1] - c[1])) / denominator
    weight_c = 1.0 - weight_a - weight_b
    inside = (weight_a >= -1e-6) & (weight_b >= -1e-6) & (weight_c >= -1e-6)
    if not np.any(inside):
        return

    weights = np.stack((weight_a[inside], weight_b[inside], weight_c[inside]), axis=1)
    source_points = weights @ source_triangle
    sampled = bilinear_sample(source, source_points[:, 0], source_points[:, 1])
    pixel_x = np.floor(points[inside, 0]).astype(int)
    pixel_y = np.floor(points[inside, 1]).astype(int)
    alpha_over(destination, sampled, pixel_y, pixel_x)


def deform_leg(texture: Image.Image, thigh_degrees: float, calf_degrees: float) -> tuple[Image.Image, list[tuple[float, float]]]:
    thigh_matrix = rotation_about((462, 838), thigh_degrees)
    moved_knee = transform_point(thigh_matrix, (468, 880))
    calf_matrix = rotation_about(moved_knee, calf_degrees) @ thigh_matrix

    source_vertices: list[np.ndarray] = []
    destination_vertices: list[np.ndarray] = []
    for y in GRID_Y:
        calf_weight = float(np.clip((y - 858.0) / 44.0, 0.0, 1.0))
        for x in GRID_X:
            point = np.array([x, y, 1.0])
            thigh_point = thigh_matrix @ point
            calf_point = calf_matrix @ point
            deformed = thigh_point * (1.0 - calf_weight) + calf_point * calf_weight
            source_vertices.append(np.array([x, y]))
            destination_vertices.append(deformed[:2])

    source_array = np.asarray(texture, dtype=np.float64)
    output_array = np.zeros((CANVAS_SIZE[1], CANVAS_SIZE[0], 4), dtype=np.float64)
    columns = len(GRID_X)
    rows = len(GRID_Y)
    triangles: list[tuple[int, int, int]] = []
    for row in range(rows - 1):
        for column in range(columns - 1):
            top_left = row * columns + column
            top_right = top_left + 1
            bottom_left = top_left + columns
            bottom_right = bottom_left + 1
            triangles.append((top_left, bottom_left, bottom_right))
            triangles.append((top_left, bottom_right, top_right))
    for indices in triangles:
        src = np.stack([source_vertices[index] for index in indices])
        dst = np.stack([destination_vertices[index] for index in indices])
        rasterize_triangle(source_array, output_array, src, dst)

    output = Image.fromarray(np.clip(output_array, 0, 255).astype(np.uint8), "RGBA")
    return output, [tuple(vertex) for vertex in destination_vertices]


def render_character(root: Path, metadata: dict[str, object], mesh_leg: Image.Image) -> Image.Image:
    character = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    mesh_drawn = False
    for layer in sorted(metadata["parts"], key=lambda item: float(item["zIndex"])):
        part_id = str(layer["id"])
        base_id = part_id.removesuffix("-underlay")
        if base_id in NEAR_LEG_PARTS:
            continue
        if part_id == "body-base" and not mesh_drawn:
            character.alpha_composite(mesh_leg)
            mesh_drawn = True
        character.alpha_composite(Image.open(root / str(layer["texture"])).convert("RGBA"))
    return character


def draw_mesh_overlay(image: Image.Image, vertices: list[tuple[float, float]]) -> Image.Image:
    result = image.copy()
    draw = ImageDraw.Draw(result)
    columns = len(GRID_X)
    rows = len(GRID_Y)
    for row in range(rows):
        draw.line([vertices[row * columns + column] for column in range(columns)], fill=(30, 240, 255, 210), width=1)
    for column in range(columns):
        draw.line([vertices[row * columns + column] for row in range(rows)], fill=(30, 240, 255, 210), width=1)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Render two-bone mesh knee test.")
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    metadata = json.loads((args.root / "rig" / "parts.json").read_text(encoding="utf-8"))
    debug = args.root / "debug"

    leg_texture = build_leg_texture(args.root)
    leg_texture.save(args.root / "textures" / "leg-near-mesh-source.png", optimize=True)
    mesh_leg, vertices = deform_leg(leg_texture, 20, 30)
    mesh_leg.save(debug / "mesh-test-leg-near-20-30.png", optimize=True)
    character = render_character(args.root, metadata, mesh_leg)
    on_background(character).convert("RGB").save(debug / "mesh-test-character.png", optimize=True)
    on_background(draw_mesh_overlay(character, vertices)).convert("RGB").save(
        debug / "mesh-test-character-with-grid.png",
        optimize=True,
    )
    print(json.dumps({
        "texture": "textures/leg-near-mesh-source.png",
        "meshColumns": len(GRID_X),
        "meshRows": len(GRID_Y),
        "thighDegrees": 20,
        "calfDegrees": 30,
        "status": "REVIEW",
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
