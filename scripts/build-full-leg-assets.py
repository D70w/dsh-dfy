#!/usr/bin/env python3
"""Build exact-visible full-leg textures with deterministic hidden thigh roots."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw
from scipy import ndimage


SIZE = (1024, 1024)


def composite(paths: list[Path]) -> Image.Image:
    result = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    for path in paths:
        result.alpha_composite(Image.open(path).convert("RGBA"))
    return result


def keep_largest_component(image: Image.Image) -> tuple[Image.Image, int]:
    source = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    labels, count = ndimage.label(source[:, :, 3] > 0)
    if count <= 1:
        return Image.fromarray(source, "RGBA"), 0
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    keep = labels == int(np.argmax(sizes))
    removed = int(np.count_nonzero((source[:, :, 3] > 0) & ~keep))
    source[~keep] = 0
    return Image.fromarray(source, "RGBA"), removed


def antialiased_tapered_capsule(
    start: tuple[float, float],
    end: tuple[float, float],
    start_radius: float,
    end_radius: float,
    supersample: int = 4,
) -> Image.Image:
    scale = supersample
    sx, sy = start[0] * scale, start[1] * scale
    ex, ey = end[0] * scale, end[1] * scale
    dx, dy = ex - sx, ey - sy
    length = max(1.0, math.hypot(dx, dy))
    px, py = -dy / length, dx / length
    rs, re = start_radius * scale, end_radius * scale
    points = [
        (sx + px * rs, sy + py * rs), (ex + px * re, ey + py * re),
        (ex - px * re, ey - py * re), (sx - px * rs, sy - py * rs),
    ]
    mask = Image.new("L", (SIZE[0] * scale, SIZE[1] * scale), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(points, fill=255)
    draw.ellipse((sx - rs, sy - rs, sx + rs, sy + rs), fill=255)
    draw.ellipse((ex - re, ey - re, ex + re, ey + re), fill=255)
    return mask.resize(SIZE, Image.Resampling.LANCZOS)


def hidden_root(
    visible: Image.Image,
    hip: tuple[float, float],
    knee: tuple[float, float],
) -> Image.Image:
    source = np.asarray(visible, dtype=np.uint8)
    visible_mask = source[:, :, 3] > 0
    skin_mask = (
        visible_mask
        & (source[:, :, 0] > 200)
        & (source[:, :, 1] > 90)
        & (source[:, :, 1] < 225)
        & (source[:, :, 2] > 70)
        & (source[:, :, 2] < 205)
        & (source[:, :, 0] > source[:, :, 1] + 18)
        & (source[:, :, 1] > source[:, :, 2] + 5)
    )
    root_alpha = np.asarray(antialiased_tapered_capsule(hip, knee, 27, 48), dtype=np.uint8)
    extension = (root_alpha > 0) & ~visible_mask
    result = np.zeros_like(source)
    if np.any(extension) and np.any(skin_mask):
        base_color = np.median(source[skin_mask, :3], axis=0)
        extension_y, extension_x = np.nonzero(extension)
        axis_dx = knee[0] - hip[0]
        axis_dy = knee[1] - hip[1]
        axis_length = max(1.0, math.hypot(axis_dx, axis_dy))
        perpendicular_distance = np.abs((extension_x - hip[0]) * axis_dy - (extension_y - hip[1]) * axis_dx) / axis_length
        normalized_x = np.clip(perpendicular_distance / 48, 0, 1)
        shade = 1.03 - 0.10 * normalized_x
        result[extension_y, extension_x, :3] = np.clip(base_color[None, :] * shade[:, None], 0, 255).astype(np.uint8)
        result[extension_y, extension_x, 3] = root_alpha[extension_y, extension_x]
    return Image.fromarray(result, "RGBA")


def fill_small_upper_holes(image: Image.Image, max_y: int = 870) -> tuple[Image.Image, int]:
    source = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    mask = source[:, :, 3] > 0
    y_grid, _ = np.indices(mask.shape)
    repaired = ndimage.binary_fill_holes(mask) | ndimage.binary_closing(mask, structure=np.ones((3, 3), dtype=bool))
    additions = repaired & ~mask & (y_grid < max_y)
    count = int(additions.sum())
    if count:
        _, indices = ndimage.distance_transform_edt(~mask, return_indices=True)
        source[additions, :3] = source[indices[0][additions], indices[1][additions], :3]
        source[additions, 3] = 255
    return Image.fromarray(source, "RGBA"), count


def build_leg(textures: Path, side: str, hip: tuple[float, float], knee: tuple[float, float]) -> tuple[Image.Image, Image.Image, dict[str, int]]:
    visible = composite([
        textures / f"thigh-{side}.png",
        textures / f"calf-{side}.png",
        textures / f"foot-{side}.png",
    ])
    visible, removed_visible = keep_largest_component(visible)
    hidden = hidden_root(visible, hip, knee)
    full = hidden.copy()
    full.alpha_composite(visible)
    full, filled_holes = fill_small_upper_holes(full)
    full, removed_full = keep_largest_component(full)
    return full, hidden, {"removedVisibleIslands": removed_visible, "filledUpperHoles": filled_holes, "removedFullIslands": removed_full}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Whale Maid full-leg assets.")
    parser.add_argument("root", type=Path)
    parser.add_argument("--rig", type=Path)
    args = parser.parse_args()
    textures = args.root / "textures"
    debug = args.root / "debug" / "leg-rig"
    reports = args.root / "reports"
    debug.mkdir(parents=True, exist_ok=True)

    rig_path = args.rig or args.root / "rig" / "pelvis-rig.calibrated.json"
    rig_data = json.loads(rig_path.read_text(encoding="utf-8"))
    near_leg = rig_data["legs"]["near"]
    far_leg = rig_data["legs"]["far"]
    near, near_hidden, near_cleanup = build_leg(textures, "near", (near_leg["hip"]["x"], near_leg["hip"]["y"]), (near_leg["knee"]["x"], near_leg["knee"]["y"]))
    far, far_hidden, far_cleanup = build_leg(textures, "far", (far_leg["hip"]["x"], far_leg["hip"]["y"]), (far_leg["knee"]["x"], far_leg["knee"]["y"]))
    near.save(textures / "leg-near-full.png", optimize=True)
    far.save(textures / "leg-far-full.png", optimize=True)
    near_hidden.save(textures / "hidden-thigh-near.png", optimize=True)
    far_hidden.save(textures / "hidden-thigh-far.png", optimize=True)

    body = Image.open(textures / "body-base.png").convert("RGBA")
    body_array = np.asarray(body, dtype=np.uint8).copy()
    y_grid, _ = np.indices(body_array.shape[:2])
    occlusion_alpha = np.where((y_grid >= 700) & (y_grid <= 858), body_array[:, :, 3], 0).astype(np.uint8)
    occlusion = body_array.copy()
    occlusion[:, :, 3] = occlusion_alpha
    occlusion[occlusion_alpha == 0, :3] = 0
    Image.fromarray(occlusion, "RGBA").save(textures / "skirt-occlusion.png", optimize=True)

    master = Image.open(args.root / "source" / "whale-maid-master-1024.png").convert("RGBA")
    static_ids_before = ["body-base-underlay", "hair-back", "tail", "upper-arm-far", "forearm-far"]
    static_ids_after = ["body-base", "upper-arm-near", "forearm-near", "head", "ahoge"]
    reconstruction = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    for part_id in static_ids_before:
        reconstruction.alpha_composite(Image.open(textures / f"{part_id}.png").convert("RGBA"))
    reconstruction.alpha_composite(far)
    reconstruction.alpha_composite(near)
    for part_id in static_ids_after:
        reconstruction.alpha_composite(Image.open(textures / f"{part_id}.png").convert("RGBA"))
    reconstruction.save(debug / "bind-full-legs.png", optimize=True)
    difference = ImageChops.difference(master, reconstruction)
    difference.save(debug / "bind-full-legs-diff.png", optimize=True)
    changed = np.any(np.asarray(difference, dtype=np.uint8) > 2, axis=2)

    report = {
        "schemaVersion": 1,
        "nearTexture": "textures/leg-near-full.png",
        "farTexture": "textures/leg-far-full.png",
        "skirtOcclusion": "textures/skirt-occlusion.png",
        "canvasSize": [1024, 1024],
        "mode": "RGBA",
        "bindChangedPixelsOver2": int(changed.sum()),
        "bindChangedPixelRatio": float(changed.mean()),
        "status": "REVIEW",
        "calibration": rig_path.relative_to(args.root).as_posix() if rig_path.is_relative_to(args.root) else str(rig_path),
        "edgeCleanup": {"near": near_cleanup, "far": far_cleanup},
        "notes": [
            "Visible pixels come only from the approved mother image.",
            "Hidden roots are deterministic nearest-pixel extensions and require pose review.",
            "These are rigid full-leg assets for occlusion validation, not final mesh weights.",
        ],
    }
    (reports / "full-leg-assets.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
