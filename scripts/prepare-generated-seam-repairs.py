#!/usr/bin/env python3
"""Normalize generated seamless part donors onto the calibrated 1024 canvas."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
SOURCE = PACK / "source" / "ai-completion" / "animation-v1-seam-repair"
OUTPUT = PACK / "textures" / "animation-v1"
TEXTURES = PACK / "textures"
COMPOSER = ROOT / "scripts" / "compose-semantic-completion.py"


def load_composer():
    spec = importlib.util.spec_from_file_location("semantic_completion", COMPOSER)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load semantic completion helpers")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    rows, columns = np.nonzero(mask)
    if not len(columns):
        raise RuntimeError("Empty foreground")
    return int(columns.min()), int(rows.min()), int(columns.max() + 1), int(rows.max() + 1)


def keep_largest(rgba: np.ndarray) -> np.ndarray:
    labels, count = ndimage.label(rgba[:, :, 3] > 8)
    if count <= 1:
        return rgba
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    keep = labels == int(np.argmax(sizes))
    rgba[~keep] = 0
    return rgba


def decontaminate_translucent_edges(rgba: np.ndarray) -> np.ndarray:
    alpha = rgba[:, :, 3]
    solid = alpha >= 192
    edge = (alpha > 0) & (alpha < 192)
    if np.any(solid) and np.any(edge):
        _, nearest = ndimage.distance_transform_edt(~solid, return_indices=True)
        rgba[edge, :3] = rgba[nearest[0][edge], nearest[1][edge], :3]
    return rgba


def remove_neutral_matte_fringe(rgba: np.ndarray) -> np.ndarray:
    mask = rgba[:, :, 3] > 0
    if not np.any(mask):
        return rgba
    inward = ndimage.distance_transform_edt(mask)
    deep = inward >= 4.0
    if not np.any(deep):
        return rgba
    _, nearest_deep = ndimage.distance_transform_edt(~deep, return_indices=True)
    rgb = rgba[:, :, :3]
    neutral_light = (rgb.min(axis=2) > 175) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 30)
    inner_rgb = rgb[nearest_deep[0], nearest_deep[1]]
    inner_is_neutral_white = (
        (inner_rgb.min(axis=2) > 170)
        & ((inner_rgb.max(axis=2) - inner_rgb.min(axis=2)) < 34)
    )
    fringe = neutral_light & (inward <= 3.5) & ~inner_is_neutral_white
    rgba[fringe] = 0
    return rgba


def add_rounded_skin_root(
    rgba: np.ndarray,
    root_box: tuple[int, int, int, int],
    foot_top: int,
) -> np.ndarray:
    """Replace a cropped thigh top with a smooth, normally hidden hip cap."""

    height, width = rgba.shape[:2]
    scale = 4
    cap = Image.new("L", (width * scale, height * scale), 0)
    ImageDraw.Draw(cap).ellipse(tuple(value * scale for value in root_box), fill=255)
    cap_alpha = np.asarray(
        cap.resize((width, height), Image.Resampling.LANCZOS),
        dtype=np.uint8,
    )
    rows, _ = np.indices((height, width))
    current_alpha = rgba[:, :, 3].copy()
    foreground = current_alpha > 8
    old_rows, _ = np.nonzero(foreground)
    old_top = int(old_rows.min())
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    reliable_skin = (
        foreground
        & (rows < foot_top - 8)
        & (red > 185)
        & (red > green + 7)
        & (green > blue - 10)
    )
    if not np.any(reliable_skin):
        raise RuntimeError("Cannot find reliable skin pixels for rounded leg root")

    sample_band = reliable_skin & (rows >= old_top + 12) & (rows <= old_top + 70)
    if not np.any(sample_band):
        sample_band = reliable_skin
    base_color = np.median(rgba[sample_band, :3], axis=0).astype(np.uint8)
    cap_pixels = (cap_alpha > 0) & (rows < foot_top - 8)
    rgba[cap_pixels, :3] = base_color
    rgba[cap_pixels, 3] = np.maximum(current_alpha[cap_pixels], cap_alpha[cap_pixels])

    # Paint over the old flat cut and its dark/red outline.  This zone remains
    # underneath the skirt in every accepted pose, so a quiet continuous fill
    # is preferable to retaining a visible crop scar.
    old_cut = (cap_alpha > 0) & (rows >= old_top - 2) & (rows <= old_top + 10)
    rgba[old_cut, :3] = base_color
    rgba[old_cut, 3] = np.maximum(rgba[old_cut, 3], cap_alpha[old_cut])
    return rgba


def smooth_leg_skin(rgba: np.ndarray, foot_top: int) -> np.ndarray:
    """Heal checker remnants and splice lines while preserving the outline."""

    rows, _ = np.indices(rgba.shape[:2])
    alpha = rgba[:, :, 3]
    foreground = alpha > 8
    inward = ndimage.distance_transform_edt(foreground)
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    reliable_skin = (
        foreground
        & (rows < foot_top - 8)
        & (red > 180)
        & (red > green + 5)
        & (green > blue - 12)
    )
    heal_zone = foreground & (rows < foot_top - 8) & (inward >= 3.5)
    if not np.any(reliable_skin) or not np.any(heal_zone):
        return rgba

    weights = reliable_skin.astype(np.float32)
    skin_sigma = 12.0
    blurred_weight = ndimage.gaussian_filter(weights, sigma=skin_sigma, mode="nearest")
    healed = np.zeros((*alpha.shape, 3), dtype=np.float32)
    for channel in range(3):
        weighted = rgba[:, :, channel].astype(np.float32) * weights
        healed[:, :, channel] = ndimage.gaussian_filter(
            weighted,
            sigma=skin_sigma,
            mode="nearest",
        ) / np.maximum(blurred_weight, 1e-5)

    # Keep only the narrow approved outline untouched.  The wider interior
    # becomes one continuous anime-style skin gradient.
    blend = np.clip((inward - 2.5) / 2.5, 0.0, 1.0)
    blend = np.where(heal_zone, blend, 0.0)[:, :, None]
    current = rgba[:, :, :3].astype(np.float32)
    rgba[:, :, :3] = np.clip(current * (1.0 - blend) + healed * blend, 0, 255).astype(np.uint8)
    # Generated donors also carried faint internal alpha bands.  Interior skin
    # must be fully opaque; only the outer antialiased contour may be partial.
    solid_skin = foreground & (rows < foot_top - 8) & (inward >= 2.5)
    rgba[solid_skin, 3] = 255
    return rgba


def normalize(
    name: str,
    donor_name: str,
    reference_path: Path,
    foot_name: str | None,
    output_name: str,
    composer,
    offset: tuple[float, float] = (0.0, 0.0),
    rounded_root: tuple[int, int, int, int] | None = None,
) -> None:
    donor = composer.remove_light_matte(composer.load_rgba(SOURCE / donor_name))
    reference = np.asarray(Image.open(reference_path).convert("RGBA"), dtype=np.uint8)
    source_box = bbox(donor[:, :, 3] > 8)
    target_box = bbox(reference[:, :, 3] > 8)
    source_width = source_box[2] - source_box[0]
    source_height = source_box[3] - source_box[1]
    target_width = target_box[2] - target_box[0]
    target_height = target_box[3] - target_box[1]
    scale_x = target_width / source_width
    scale_y = target_height / source_height
    translate_x = target_box[0] - source_box[0] * scale_x + offset[0]
    translate_y = target_box[1] - source_box[1] * scale_y + offset[1]
    matrix = np.asarray(
        [[scale_x, 0.0, translate_x], [0.0, scale_y, translate_y]],
        dtype=np.float64,
    )
    warped = composer.warp_with_matrix(donor, reference, matrix)
    warped = keep_largest(warped)
    if foot_name is not None:
        foot = np.asarray(Image.open(TEXTURES / foot_name).convert("RGBA"), dtype=np.uint8)
        foot_box = bbox(foot[:, :, 3] > 0)
        rows, columns = np.indices(warped.shape[:2])
        red = warped[:, :, 0].astype(np.int16)
        green = warped[:, :, 1].astype(np.int16)
        blue = warped[:, :, 2].astype(np.int16)

        # Reconstruct the opaque skin interior.  The generator baked its
        # preview checker into RGB, leaving gray/white cells in pale skin.
        foreground = warped[:, :, 3] > 8
        silhouette = ndimage.binary_fill_holes(foreground)
        inward = ndimage.distance_transform_edt(silhouette)
        skin_zone = silhouette & (rows < foot_box[1])
        good_skin = (
            (warped[:, :, 3] > 160)
            & (red > 185)
            & (red > green + 10)
            & (green > blue - 8)
        )
        neutral_baked = (
            (warped[:, :, :3].min(axis=2) > 145)
            & ((warped[:, :, :3].max(axis=2) - warped[:, :, :3].min(axis=2)) < 34)
        )
        damaged_skin = skin_zone & (inward > 2.0) & (neutral_baked | (warped[:, :, 3] < 242))
        if np.any(good_skin) and np.any(damaged_skin):
            _, nearest_skin = ndimage.distance_transform_edt(~good_skin, return_indices=True)
            warped[damaged_skin, :3] = warped[
                nearest_skin[0][damaged_skin],
                nearest_skin[1][damaged_skin],
                :3,
            ]
            warped[damaged_skin, 3] = 255

        red = warped[:, :, 0].astype(np.int16)
        green = warped[:, :, 1].astype(np.int16)
        blue = warped[:, :, 2].astype(np.int16)
        skin = (
            (warped[:, :, 3] > 0)
            & (red > 185)
            & (red > green + 12)
            & (green > blue - 4)
        )
        lower_zone = (
            (rows >= foot_box[1] - 24)
            & (columns >= foot_box[0] - 14)
            & (columns < foot_box[2] + 14)
        )
        warped[lower_zone & ~skin] = 0

        alpha_mask = warped[:, :, 3] > 0
        inward_distance = ndimage.distance_transform_edt(alpha_mask)
        neutral_light = (
            (warped[:, :, :3].min(axis=2) > 178)
            & ((warped[:, :, :3].max(axis=2) - warped[:, :, :3].min(axis=2)) < 30)
        )
        matte_fringe = neutral_light & (inward_distance <= 3.25) & (rows < foot_box[1])
        warped[matte_fringe] = 0

        combined = Image.fromarray(warped, "RGBA")
        combined.alpha_composite(Image.fromarray(foot, "RGBA"))
        warped = np.asarray(combined, dtype=np.uint8).copy()
        if rounded_root is not None:
            warped = add_rounded_skin_root(warped, rounded_root, foot_box[1])
            warped = smooth_leg_skin(warped, foot_box[1])
    warped = remove_neutral_matte_fringe(warped)
    warped = decontaminate_translucent_edges(warped)
    warped[warped[:, :, 3] == 0, :3] = 0
    Image.fromarray(warped, "RGBA").save(OUTPUT / output_name, optimize=True)
    print(name, "source", source_box, "target", target_box, "matrix", matrix.tolist())


def main() -> None:
    composer = load_composer()
    normalize(
        "far leg",
        "leg-far-donor.png",
        TEXTURES / "leg-far-full.png",
        "foot-far.png",
        "leg-far-complete-v3.png",
        composer,
        rounded_root=(292, 694, 382, 792),
    )
    normalize(
        "near leg",
        "leg-near-donor.png",
        TEXTURES / "leg-near-full.png",
        "foot-near.png",
        "leg-near-complete-v3.png",
        composer,
        rounded_root=(391, 690, 510, 798),
    )
    normalize(
        "far arm",
        "arm-far-donor.png",
        OUTPUT / "arm-far-complete-v4.png",
        None,
        "arm-far-complete-v5.png",
        composer,
    )
    normalize(
        "near arm",
        "arm-near-donor.png",
        OUTPUT / "arm-near-complete-v2.png",
        None,
        "arm-near-complete-v3.png",
        composer,
    )
    normalize(
        "tail",
        "tail-donor.png",
        OUTPUT / "tail-complete-v3.png",
        None,
        "tail-complete-v5.png",
        composer,
        (-18.0, -6.0),
    )


if __name__ == "__main__":
    main()
