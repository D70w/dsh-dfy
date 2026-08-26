#!/usr/bin/env python3
"""Render bind-pose v3 static joint tests from full-canvas layered parts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw


CANVAS_SIZE = (1024, 1024)
BACKGROUND = (18, 25, 39, 255)


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


def warp(image: Image.Image, forward: np.ndarray) -> Image.Image:
    inverse = np.linalg.inv(forward)
    affine = tuple(float(value) for value in (
        inverse[0, 0], inverse[0, 1], inverse[0, 2],
        inverse[1, 0], inverse[1, 1], inverse[1, 2],
    ))
    return image.transform(
        CANVAS_SIZE,
        Image.Transform.AFFINE,
        affine,
        resample=Image.Resampling.BICUBIC,
    )


def part_transform(part_id: str, pose: str) -> np.ndarray:
    identity = np.identity(3)
    base_id = part_id.removesuffix("-underlay")
    if pose == "arm-near-20" and base_id in {"upper-arm-near", "forearm-near"}:
        return rotation_about((470, 535), 20)
    if pose == "leg-near-20-30":
        hip_matrix = rotation_about((462, 838), 20)
        if base_id == "thigh-near":
            return hip_matrix
        if base_id == "knee-near":
            moved_knee = transform_point(hip_matrix, (468, 880))
            return rotation_about(moved_knee, 15) @ hip_matrix
        if base_id in {"calf-near", "foot-near"}:
            moved_knee = transform_point(hip_matrix, (468, 880))
            return rotation_about(moved_knee, 30) @ hip_matrix
    return identity


def render_pose(root: Path, metadata: dict[str, object], pose: str) -> Image.Image:
    character = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    layers = sorted(metadata["parts"], key=lambda item: float(item["zIndex"]))
    for layer in layers:
        part_id = str(layer["id"])
        texture = Image.open(root / str(layer["texture"])).convert("RGBA")
        matrix = part_transform(part_id, pose)
        if not np.allclose(matrix, np.identity(3)):
            texture = warp(texture, matrix)
        character.alpha_composite(texture)
    return character


def add_debug_overlay(image: Image.Image, pose: str) -> Image.Image:
    result = image.copy()
    draw = ImageDraw.Draw(result)
    points = {
        "近侧肩": (470, 535), "近侧肘": (563, 643),
        "近侧髋": (462, 838), "近侧膝": (468, 880), "近侧踝": (473, 920),
    }
    if pose == "arm-near-20":
        matrix = rotation_about((470, 535), 20)
        points["近侧肘"] = transform_point(matrix, points["近侧肘"])
    elif pose == "leg-near-20-30":
        hip_matrix = rotation_about((462, 838), 20)
        points["近侧膝"] = transform_point(hip_matrix, points["近侧膝"])
        knee_matrix = rotation_about(points["近侧膝"], 30) @ hip_matrix
        points["近侧踝"] = transform_point(knee_matrix, points["近侧踝"])
    if pose.startswith("arm"):
        line_points = [points["近侧肩"], points["近侧肘"]]
    elif pose.startswith("leg"):
        line_points = [points["近侧髋"], points["近侧膝"], points["近侧踝"]]
    else:
        line_points = []
    if line_points:
        draw.line(line_points, fill=(30, 240, 255, 255), width=4)
        for x, y in line_points:
            draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=(255, 92, 92, 255), outline="white", width=2)
    return result


def on_background(character: Image.Image) -> Image.Image:
    background = Image.new("RGBA", CANVAS_SIZE, BACKGROUND)
    background.alpha_composite(character)
    return background


def main() -> None:
    parser = argparse.ArgumentParser(description="Render Whale Maid v3 static joint tests.")
    parser.add_argument("root", type=Path)
    args = parser.parse_args()

    metadata = json.loads((args.root / "rig" / "parts.json").read_text(encoding="utf-8"))
    debug = args.root / "debug"
    debug.mkdir(parents=True, exist_ok=True)

    poses = ("bind", "arm-near-20", "leg-near-20-30")
    rendered: dict[str, Image.Image] = {}
    for pose in poses:
        character = render_pose(args.root, metadata, pose)
        rendered[pose] = character
        character.save(debug / f"static-test-{pose}.png", optimize=True)
        on_background(add_debug_overlay(character, pose)).convert("RGB").save(
            debug / f"static-test-{pose}-dark.png",
            optimize=True,
        )

    master = Image.open(args.root / "source" / "whale-maid-master-1024.png").convert("RGBA")
    bind_difference = ImageChops.difference(master, rendered["bind"])
    difference_array = np.asarray(bind_difference, dtype=np.uint8)
    bind_changed = np.any(difference_array > 2, axis=2)

    sheet = Image.new("RGBA", (3072, 1024), BACKGROUND)
    for index, pose in enumerate(poses):
        sheet.alpha_composite(on_background(add_debug_overlay(rendered[pose], pose)), (index * 1024, 0))
    sheet.convert("RGB").save(debug / "static-joint-test-sheet.png", optimize=True)

    texture_checks: list[dict[str, object]] = []
    for layer in metadata["parts"]:
        texture = Image.open(args.root / str(layer["texture"]))
        alpha = np.asarray(texture.convert("RGBA").getchannel("A"))
        texture_checks.append({
            "id": layer["id"],
            "size": list(texture.size),
            "mode": texture.mode,
            "alphaExtrema": list(texture.convert("RGBA").getchannel("A").getextrema()),
            "nonTransparentPixels": int(np.count_nonzero(alpha)),
            "pass": bool(texture.size == CANVAS_SIZE and texture.mode == "RGBA" and np.count_nonzero(alpha) > 0),
        })

    report = {
        "schemaVersion": 1,
        "bindPoseChangedPixelsOver2": int(bind_changed.sum()),
        "bindPoseChangedPixelRatio": float(bind_changed.mean()),
        "bindPosePass": bool(not np.any(bind_changed)),
        "textureChecksPass": all(item["pass"] for item in texture_checks),
        "visualReviewRequired": [
            "近侧手臂抬起20度后的肩部与袖口接缝",
            "近侧大腿20度、小腿30度后的裙底、膝部与袜口接缝",
            "隐藏补图是否出现拉丝、露洞或不属于该部件的纹理",
        ],
        "textures": texture_checks,
        "status": "REVIEW",
    }
    (args.root / "reports" / "static-joint-tests.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "bindPosePass": report["bindPosePass"],
        "textureChecksPass": report["textureChecksPass"],
        "status": report["status"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
