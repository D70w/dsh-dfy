#!/usr/bin/env python3
"""Align AI-drawn thigh completions to the calibrated rig without replacing visible art."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


SIZE = (1024, 1024)


def composite(paths: list[Path]) -> Image.Image:
    result = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    for path in paths:
        result.alpha_composite(Image.open(path).convert("RGBA"))
    return result


def largest_component(mask: np.ndarray) -> np.ndarray:
    labels, count = ndimage.label(mask)
    if count == 0:
        raise ValueError("AI completion contains no foreground subject")
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    return labels == int(np.argmax(sizes))


def chroma_key_green(path: Path) -> Image.Image:
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    border = np.concatenate([rgb[:20].reshape(-1, 3), rgb[-20:].reshape(-1, 3), rgb[:, :20].reshape(-1, 3), rgb[:, -20:].reshape(-1, 3)])
    background = np.median(border, axis=0)
    margin = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    rough = largest_component(margin < 95)
    support = ndimage.binary_dilation(rough, iterations=2)
    alpha = np.clip((130 - margin) / 105, 0, 1) * support
    alpha = ndimage.gaussian_filter(alpha, sigma=0.45)
    safe = np.maximum(alpha[:, :, None], 1 / 255)
    foreground = (rgb - (1 - alpha[:, :, None]) * background[None, None, :]) / safe
    foreground = np.clip(foreground, 0, 255).astype(np.uint8)
    result = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    result[:, :, :3] = foreground
    result[:, :, 3] = np.round(alpha * 255).astype(np.uint8)
    result[result[:, :, 3] == 0, :3] = 0
    return Image.fromarray(result, "RGBA")


def skin_vertical_span(image: Image.Image) -> tuple[int, int]:
    rgba = np.asarray(image, dtype=np.uint8)
    alpha = rgba[:, :, 3] > 48
    skin = (
        alpha
        & (rgba[:, :, 0] > 155)
        & (rgba[:, :, 1] > 75)
        & (rgba[:, :, 1] < 242)
        & (rgba[:, :, 2] > 55)
        & (rgba[:, :, 0] > rgba[:, :, 1] + 8)
    )
    counts = skin.sum(axis=1)
    active = counts > 8
    labels, count = ndimage.label(active)
    if count == 0:
        raise ValueError("AI completion contains no continuous skin span")
    sizes = np.bincount(labels)
    sizes[0] = 0
    selected = labels == int(np.argmax(sizes))
    rows = np.flatnonzero(selected)
    return int(rows[0]), int(rows[-1] + 1)


def row_center(mask: np.ndarray, first: int, last: int) -> float:
    """Return the robust horizontal centre of foreground pixels in a row band."""
    ys, xs = np.nonzero(mask[max(0, first):min(mask.shape[0], last)])
    if len(xs) == 0:
        raise ValueError("AI completion anchor band contains no foreground")
    return float(np.median(xs))


def make_aligned_leg(
    source: Image.Image,
    hip: tuple[float, float],
    sock_anchor: tuple[float, float],
    width_multiplier: float = 1.0,
) -> Image.Image:
    """Map the AI leg's hip-to-sock axis onto the calibrated rig.

    The former implementation cropped only a skin-coloured strip and then put
    the broken source thigh/calf back on top.  That produced the conspicuous
    horizontal seam.  Keeping the generated hip, knee and calf as one image is
    what preserves the coherent anime contour.
    """
    alpha = np.asarray(source.getchannel("A"), dtype=np.uint8)
    foreground = alpha > 32
    skin_y0, skin_y1 = skin_vertical_span(source)
    source_hip = (row_center(foreground, skin_y0, skin_y0 + 32), float(skin_y0))
    source_sock = (row_center(foreground, skin_y1 - 32, skin_y1), float(skin_y1))

    source_dx = source_sock[0] - source_hip[0]
    source_dy = source_sock[1] - source_hip[1]
    target_dx = sock_anchor[0] - hip[0]
    target_dy = sock_anchor[1] - hip[1]
    source_length = math.hypot(source_dx, source_dy)
    target_length = math.hypot(target_dx, target_dy)
    if source_length < 1 or target_length < 1:
        raise ValueError("AI completion or calibrated leg has a degenerate axis")

    parallel_scale = target_length / source_length
    perpendicular_scale = parallel_scale * width_multiplier
    source_u = np.array([source_dx, source_dy], dtype=np.float64) / source_length
    source_v = np.array([-source_u[1], source_u[0]], dtype=np.float64)
    target_u = np.array([target_dx, target_dy], dtype=np.float64) / target_length
    target_v = np.array([-target_u[1], target_u[0]], dtype=np.float64)
    forward = np.column_stack((target_u, target_v)) @ np.diag((parallel_scale, perpendicular_scale)) @ np.vstack((source_u, source_v))
    inverse = np.linalg.inv(forward)
    source_hip_vector = np.array(source_hip, dtype=np.float64)
    hip_vector = np.array(hip, dtype=np.float64)
    translation = source_hip_vector - inverse @ hip_vector
    # Pillow's AFFINE coefficients map destination pixels back to source.
    a, b = float(inverse[0, 0]), float(inverse[0, 1])
    d, e = float(inverse[1, 0]), float(inverse[1, 1])
    c, f = float(translation[0]), float(translation[1])
    return source.transform(
        SIZE,
        Image.Transform.AFFINE,
        (a, b, c, d, e, f),
        resample=Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0),
    )


def median_row_width(image: Image.Image, y0: int, y1: int) -> float:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8) > 16
    widths: list[int] = []
    for y in range(max(0, y0), min(alpha.shape[0], y1)):
        xs = np.flatnonzero(alpha[y])
        if len(xs) > 0:
            widths.append(int(xs[-1] - xs[0] + 1))
    if not widths:
        raise ValueError("leg width reference contains no visible rows")
    return float(np.median(widths))


def clean_lower_body_artifacts(root: Path) -> dict[str, int]:
    """Remove warm old-leg remnants below the white skirt fringe.

    The lower body layers are drawn above the generated legs, so even tiny
    segmentation leftovers become conspicuous red/brown spikes.  Restricting
    the cleanup to y>=835 avoids all face, hand, bow and gold-trim artwork.
    """
    result: dict[str, int] = {}
    textures = root / "textures"
    for name in ("body-base.png", "body-base-underlay.png", "skirt-occlusion.png"):
        path = textures / name
        rgba = np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8).copy()
        red = rgba[:, :, 0].astype(np.int16)
        green = rgba[:, :, 1].astype(np.int16)
        blue = rgba[:, :, 2].astype(np.int16)
        rows = np.indices(rgba.shape[:2])[0]
        warm = (
            (rgba[:, :, 3] > 0)
            & (rows >= 835)
            & (red > green + 7)
            & (red > blue + 9)
        )
        removal = ndimage.binary_dilation(warm, iterations=2) & (rows >= 835)
        removed = int(np.count_nonzero((rgba[:, :, 3] > 0) & removal))
        rgba[removal] = 0
        Image.fromarray(rgba, "RGBA").save(path, optimize=True)
        result[name] = removed
    return result


def clean_visible(image: Image.Image) -> tuple[Image.Image, int]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    mask = rgba[:, :, 3] > 0
    keep = largest_component(mask)
    removed = int((mask & ~keep).sum())
    rgba[~keep] = 0
    return Image.fromarray(rgba, "RGBA"), removed


def build_side(root: Path, rig: dict, side: str) -> dict[str, int | float | str]:
    textures = root / "textures"
    source_path = root / "source" / "ai-completion" / f"{side}-leg-green.png"
    keyed = chroma_key_green(source_path)
    leg = rig["legs"][side]
    hip = (float(leg["hip"]["x"]), float(leg["hip"]["y"]))
    ankle = (float(leg["ankle"]["x"]), float(leg["ankle"]["y"]))
    foot, removed = clean_visible(Image.open(textures / f"foot-{side}.png").convert("RGBA"))
    foot_alpha = np.asarray(foot.getchannel("A"), dtype=np.uint8)
    foot_rows = np.flatnonzero((foot_alpha > 12).any(axis=1))
    if len(foot_rows) == 0:
        raise ValueError(f"original {side} foot contains no visible pixels")
    foot_top = int(foot_rows[0])
    sock_anchor = (ankle[0], float(foot_top + 5))
    reference = clean_visible(composite([
        textures / f"thigh-{side}.png",
        textures / f"calf-{side}.png",
    ]))[0]
    first_pass = make_aligned_leg(keyed, hip, sock_anchor)
    band_start = round(float(leg["knee"]["y"]) + 6)
    band_end = round(float(leg["ankle"]["y"]) - 8)
    reference_width = median_row_width(reference, band_start, band_end)
    generated_width = median_row_width(first_pass, band_start, band_end)
    width_multiplier = max(0.75, min(2.5, reference_width * 0.85 / generated_width))
    hidden = make_aligned_leg(keyed, hip, sock_anchor, width_multiplier)

    # The original sock frill is an ideal natural seam cover.  Remove the AI
    # shoe below it, then overlay the exact original sock and shoe artwork.
    hidden_rgba = np.asarray(hidden, dtype=np.uint8).copy()
    fade_start = foot_top + 3
    fade_end = foot_top + 13
    for y in range(max(0, fade_start), min(SIZE[1], fade_end)):
        hidden_rgba[y, :, 3] = np.round(
            hidden_rgba[y, :, 3].astype(np.float32) * (fade_end - y) / max(1, fade_end - fade_start)
        ).astype(np.uint8)
    hidden_rgba[max(0, fade_end):, :, :] = 0
    hidden = Image.fromarray(hidden_rgba, "RGBA")

    full = hidden.copy()
    full.alpha_composite(foot)
    full, removed_full = clean_visible(full)
    hidden.save(textures / f"hidden-thigh-{side}.png", optimize=True)
    full.save(textures / f"leg-{side}-full.png", optimize=True)
    keyed.save(root / "debug" / "leg-rig" / f"ai-{side}-keyed.png", optimize=True)
    return {
        "source": source_path.relative_to(root).as_posix(),
        "removedVisiblePixels": removed,
        "removedFullPixels": removed_full,
        "referenceWidth": round(reference_width, 2),
        "generatedWidthBeforeCorrection": round(generated_width, 2),
        "widthMultiplier": round(width_multiplier, 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build calibrated AI-completed leg textures.")
    parser.add_argument("root", type=Path)
    parser.add_argument("--rig", type=Path)
    args = parser.parse_args()
    rig_path = args.rig or args.root / "rig" / "pelvis-rig.calibrated.json"
    rig = json.loads(rig_path.read_text(encoding="utf-8"))
    report = {
        "schemaVersion": 1,
        "method": "ai-shape-completion-plus-exact-visible-overlay",
        "calibration": rig_path.relative_to(args.root).as_posix() if rig_path.is_relative_to(args.root) else str(rig_path),
        "near": build_side(args.root, rig, "near"),
        "far": build_side(args.root, rig, "far"),
        "lowerBodyCleanup": clean_lower_body_artifacts(args.root),
    }
    report_path = args.root / "reports" / "ai-leg-completion.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
