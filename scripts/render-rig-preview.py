from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image


Matrix = tuple[float, float, float, float, float, float]


def multiply(left: Matrix, right: Matrix) -> Matrix:
    return (
        left[0] * right[0] + left[2] * right[1],
        left[1] * right[0] + left[3] * right[1],
        left[0] * right[2] + left[2] * right[3],
        left[1] * right[2] + left[3] * right[3],
        left[0] * right[4] + left[2] * right[5] + left[4],
        left[1] * right[4] + left[3] * right[5] + left[5],
    )


def translation(x: float, y: float) -> Matrix:
    return (1, 0, 0, 1, x, y)


def rotation(degrees: float) -> Matrix:
    radians = degrees * math.pi / 180
    return (math.cos(radians), math.sin(radians), -math.sin(radians), math.cos(radians), 0, 0)


def scaling(x: float, y: float) -> Matrix:
    return (x, 0, 0, y, 0, 0)


def inverse(matrix: Matrix) -> Matrix:
    determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2]
    if abs(determinant) < 1e-8:
        raise ValueError("singular transform")
    return (
        matrix[3] / determinant,
        -matrix[1] / determinant,
        -matrix[2] / determinant,
        matrix[0] / determinant,
        (matrix[2] * matrix[5] - matrix[3] * matrix[4]) / determinant,
        (matrix[1] * matrix[4] - matrix[0] * matrix[5]) / determinant,
    )


def catmull(p0: float, p1: float, p2: float, p3: float, amount: float) -> float:
    squared = amount * amount
    cubed = squared * amount
    return 0.5 * (
        2 * p1 + (-p0 + p2) * amount
        + (2 * p0 - 5 * p1 + 4 * p2 - p3) * squared
        + (-p0 + 3 * p1 - 3 * p2 + p3) * cubed
    )


def sample_curve(curve: dict[str, Any], at: float) -> float:
    frames = curve["keyframes"]
    if at <= frames[0][0]:
        return frames[0][1]
    for index in range(1, len(frames)):
        right = frames[index]
        if at > right[0]:
            continue
        left = frames[index - 1]
        amount = (at - left[0]) / (right[0] - left[0])
        if curve.get("interpolation") == "step":
            return right[1] if at == right[0] else left[1]
        if curve.get("interpolation") == "cubic" and len(frames) >= 4:
            previous = frames[index - 2][1] if index > 1 else frames[-2][1]
            following = frames[index + 1][1] if index + 1 < len(frames) else frames[1][1]
            return catmull(previous, left[1], right[1], following, amount)
        return left[1] + (right[1] - left[1]) * amount
    return frames[-1][1]


def mesh_offset(part: dict[str, Any], values: dict[str, float], x_ratio: float, y_ratio: float) -> tuple[float, float]:
    offset_x = 0.0
    offset_y = 0.0
    for deformer in part.get("mesh", {}).get("deformers", []):
        normalized_x = (x_ratio - deformer["center"][0]) / deformer["radius"][0]
        normalized_y = (y_ratio - deformer["center"][1]) / deformer["radius"][1]
        distance_squared = normalized_x * normalized_x + normalized_y * normalized_y
        if distance_squared >= 1:
            continue
        weight = (1 - distance_squared) ** deformer.get("falloff", 2)
        amount = values.get(deformer["parameter"], 0) * weight
        offset_x += deformer["direction"][0] * amount
        offset_y += deformer["direction"][1] * amount
    return offset_x, offset_y


def deform_sprite(sprite: Image.Image, part: dict[str, Any], values: dict[str, float]) -> Image.Image:
    mesh = part.get("mesh")
    if mesh is None:
        return sprite
    columns = mesh["columns"]
    rows = mesh["rows"]
    cells: list[tuple[tuple[int, int, int, int], tuple[float, ...]]] = []
    for row in range(rows):
        for column in range(columns):
            x0 = column / columns
            x1 = (column + 1) / columns
            y0 = row / rows
            y1 = (row + 1) / rows
            corners = []
            for x_ratio, y_ratio in ((x0, y0), (x0, y1), (x1, y1), (x1, y0)):
                offset = mesh_offset(part, values, x_ratio, y_ratio)
                corners.append((sprite.width * x_ratio + offset[0], sprite.height * y_ratio + offset[1]))
            left = max(0, math.floor(min(point[0] for point in corners)))
            top = max(0, math.floor(min(point[1] for point in corners)))
            right = min(sprite.width, math.ceil(max(point[0] for point in corners)))
            bottom = min(sprite.height, math.ceil(max(point[1] for point in corners)))
            if right <= left or bottom <= top:
                continue
            source = (
                sprite.width * x0, sprite.height * y0,
                sprite.width * x0, sprite.height * y1,
                sprite.width * x1, sprite.height * y1,
                sprite.width * x1, sprite.height * y0,
            )
            cells.append(((left, top, right, bottom), source))
    return sprite.transform(sprite.size, Image.Transform.MESH, cells, Image.Resampling.BICUBIC)


def render(atlas: Image.Image, rig: dict[str, Any], motion: dict[str, Any], at: float, scale: int) -> Image.Image:
    values = {parameter["id"]: parameter["default"] for parameter in rig["parameters"]}
    pose = "front-run" if "front-run" in rig["poses"] else "side-run"
    values.update(rig["poses"][pose])
    for curve in motion["curves"]:
        values[curve["parameter"]] = sample_curve(curve, at)
    # Legacy preview packs used drive/output spring pairs but the v4 cutout
    # study writes its authored secondary values directly. Only emulate a
    # legacy spring when both ends of that historical pair are present.
    spring_pairs = (
        ("hairDrive", "leftHairSway"),
        ("hairDrive", "rightHairSway"),
        ("ahogeDrive", "ahogeSway"),
        ("skirtDrive", "skirtSway"),
        ("tailDrive", "tailSway"),
        ("hairDrive", "rearHairTilt"),
        ("hairDrive", "frontHairTilt"),
        ("tailDrive", "tailTilt"),
        ("tailDrive", "flukesTilt"),
    )
    for source, target in spring_pairs:
        if source in values and target in values:
            values[target] = values[source]

    parts = {part["id"]: part for part in rig["parts"]}
    worlds: dict[str, Matrix] = {}

    def world_for(part: dict[str, Any]) -> Matrix:
        if part["id"] in worlds:
            return worlds[part["id"]]
        x = part["position"][0] + values.get(part.get("translateXParameter"), 0)
        y = part["position"][1] + values.get(part.get("translateYParameter"), 0)
        pivot_x, pivot_y = part["pivot"]
        angle = values.get(part.get("rotationParameter"), 0)
        scale_x = values.get(part.get("scaleXParameter"), 1)
        scale_y = values.get(part.get("scaleYParameter"), 1)
        local = multiply(
            multiply(multiply(translation(x + pivot_x, y + pivot_y), rotation(angle)), scaling(scale_x, scale_y)),
            translation(-pivot_x, -pivot_y),
        )
        parent = (1, 0, 0, 1, 0, 0) if part["parent"] is None else world_for(parts[part["parent"]])
        worlds[part["id"]] = multiply(parent, local)
        return worlds[part["id"]]

    width, height = rig["canvas"]["width"] * scale, rig["canvas"]["height"] * scale
    output = Image.new("RGBA", (width, height))
    for part in sorted(rig["parts"], key=lambda item: item["z"]):
        opacity = values.get(part.get("opacityParameter"), 1)
        if opacity <= 0.001:
            continue
        frame_value = values.get(part.get("frameParameter"), -1)
        frames = part.get("frames")
        if frames is not None and frame_value >= 0:
            frame_index = min(len(frames) - 1, math.floor(frame_value))
            u, v, uv_width, uv_height = frames[frame_index]
        else:
            u, v, uv_width, uv_height = part["uv"]
        sprite = atlas.crop((u, v, u + uv_width, v + uv_height)).resize(tuple(part["size"]), Image.Resampling.LANCZOS)
        sprite = deform_sprite(sprite, part, values)
        if opacity < 0.999:
            alpha = sprite.getchannel("A").point(lambda value: round(value * opacity))
            sprite.putalpha(alpha)
        local_to_canvas = world_for(part)
        canvas_to_local = inverse(local_to_canvas)
        affine = (
            canvas_to_local[0] / scale,
            canvas_to_local[2] / scale,
            canvas_to_local[4],
            canvas_to_local[1] / scale,
            canvas_to_local[3] / scale,
            canvas_to_local[5],
        )
        bend = values.get(part.get("bendParameter"), 0)
        segments = part.get("segments", 4) if part.get("bendParameter") else 1
        if segments == 1:
            layer = sprite.transform((width, height), Image.Transform.AFFINE, affine, Image.Resampling.BICUBIC)
            output.alpha_composite(layer)
            continue
        strip_height = max(1, math.ceil(sprite.height / segments))
        for row in range(segments):
            top = round(row * sprite.height / segments)
            bottom = round((row + 1) * sprite.height / segments)
            strip = sprite.crop((0, top, sprite.width, bottom))
            ratio = (row + 0.5) / segments
            offset = bend * ratio * ratio
            strip_matrix = multiply(local_to_canvas, translation(offset, top))
            strip_inverse = inverse(strip_matrix)
            strip_affine = (
                strip_inverse[0] / scale,
                strip_inverse[2] / scale,
                strip_inverse[4],
                strip_inverse[1] / scale,
                strip_inverse[3] / scale,
                strip_inverse[5],
            )
            layer = strip.transform((width, height), Image.Transform.AFFINE, strip_affine, Image.Resampling.BICUBIC)
            output.alpha_composite(layer)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Render WhaleRig key phases without starting Harness.")
    parser.add_argument("atlas", type=Path)
    parser.add_argument("rig", type=Path)
    parser.add_argument("motion", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--scale", type=int, default=4)
    parser.add_argument("--gif", type=Path)
    parser.add_argument("--fps", type=int, default=33)
    parser.add_argument("--phase-count", type=int, default=24)
    parser.add_argument("--columns", type=int, default=8)
    args = parser.parse_args()

    atlas = Image.open(args.atlas).convert("RGBA")
    rig = json.loads(args.rig.read_text(encoding="utf-8"))
    motion = json.loads(args.motion.read_text(encoding="utf-8"))
    if args.phase_count <= 0 or args.columns <= 0:
        parser.error("phase-count and columns must be positive")
    phases = tuple(round(motion["durationMs"] * index / args.phase_count) for index in range(args.phase_count))
    frames = [render(atlas, rig, motion, phase, args.scale) for phase in phases]
    columns = min(args.columns, len(frames))
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (frames[0].width * columns, frames[0].height * rows), "white")
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * frame.width, (index // columns) * frame.height))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    if args.gif is not None:
        frame_count = max(2, round(motion["durationMs"] / 1000 * args.fps))
        animation = [
            render(atlas, rig, motion, motion["durationMs"] * index / frame_count, args.scale)
            for index in range(frame_count)
        ]
        gif_frames = []
        for frame in animation:
            background = Image.new("RGBA", frame.size, "white")
            background.alpha_composite(frame)
            gif_frames.append(background.convert("RGB"))
        args.gif.parent.mkdir(parents=True, exist_ok=True)
        gif_frames[0].save(
            args.gif,
            save_all=True,
            append_images=gif_frames[1:],
            duration=round(1000 / args.fps),
            loop=0,
            disposal=2,
        )


if __name__ == "__main__":
    main()
