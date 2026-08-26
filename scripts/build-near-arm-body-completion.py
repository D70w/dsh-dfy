#!/usr/bin/env python3
"""Build the hidden torso/skirt/hair layer behind the complete near arm."""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
TEXTURES = PACK / "textures"
SOURCE = PACK / "source" / "whale-maid-master-1024.png"
DONOR = PACK / "source" / "ai-completion" / "near-arm-body-donor-v3.png"
OUTPUT = TEXTURES / "near-arm-body-completion.png"
DEBUG = PACK / "debug" / "near-arm-body-completion-check.png"

CROP = (384, 448, 768, 832)
ARM_POLYGON_WORLD = [
    (451, 507), (487, 493), (526, 526), (565, 586), (624, 614),
    (664, 665), (653, 718), (605, 744), (552, 696), (512, 636),
    (474, 584),
]


def alpha(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[:, :, 3]


def resized_crop(source: np.ndarray) -> np.ndarray:
    crop = Image.fromarray(source, "RGBA").crop(CROP)
    return np.asarray(crop.resize((1024, 1024), Image.Resampling.LANCZOS), dtype=np.uint8)


def crop_polygon() -> np.ndarray:
    width = CROP[2] - CROP[0]
    height = CROP[3] - CROP[1]
    return np.asarray([
        (
            round((x - CROP[0]) * 1024 / width),
            round((y - CROP[1]) * 1024 / height),
        )
        for x, y in ARM_POLYGON_WORLD
    ], dtype=np.int32)


def align_donor(target: np.ndarray, donor: np.ndarray) -> np.ndarray:
    donor = cv2.resize(donor, (1024, 1024), interpolation=cv2.INTER_LANCZOS4)
    excluded = np.zeros((1024, 1024), dtype=np.uint8)
    cv2.fillPoly(excluded, [crop_polygon()], 255)
    excluded = cv2.dilate(excluded, np.ones((31, 31), dtype=np.uint8))
    alignment_mask = np.where((target[:, :, 3] > 240) & (excluded == 0), 255, 0).astype(np.uint8)

    target_gray = cv2.cvtColor(target[:, :, :3], cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    donor_gray = cv2.cvtColor(donor[:, :, :3], cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    warp = np.eye(2, 3, dtype=np.float32)
    _, warp = cv2.findTransformECC(
        target_gray,
        donor_gray,
        warp,
        cv2.MOTION_AFFINE,
        (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 500, 1e-7),
        alignment_mask,
        5,
    )
    return cv2.warpAffine(
        donor,
        warp,
        (1024, 1024),
        flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )


def donor_art_mask(aligned: np.ndarray) -> np.ndarray:
    rgb = aligned[:, :, :3].astype(np.int16)
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    # Image generation flattened the preview checkerboard.  Saturated character
    # pixels are reliable seeds; dilation restores antialiased black outlines and
    # near-white fabric highlights without retaining the neutral checkerboard.
    seed = (maximum - minimum > 10) | ((maximum > 45) & (maximum < 220) & (maximum - minimum > 5))
    mask = cv2.morphologyEx(seed.astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((9, 9), dtype=np.uint8))
    mask = cv2.dilate(mask, np.ones((7, 7), dtype=np.uint8))
    labels_count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
    kept = np.zeros_like(mask)
    for label in range(1, labels_count):
        if stats[label, cv2.CC_STAT_AREA] > 1500:
            kept[labels == label] = 255
    return cv2.GaussianBlur(kept, (0, 0), 1)


def main() -> None:
    source = np.asarray(Image.open(SOURCE).convert("RGBA"), dtype=np.uint8)
    target = resized_crop(source)
    donor = np.asarray(Image.open(DONOR).convert("RGBA"), dtype=np.uint8)
    aligned = align_donor(target, donor)
    aligned[:, :, 3] = donor_art_mask(aligned)

    donor_world = np.asarray(
        Image.fromarray(aligned, "RGBA").resize(
            (CROP[2] - CROP[0], CROP[3] - CROP[1]),
            Image.Resampling.LANCZOS,
        ),
        dtype=np.uint8,
    )
    world = np.zeros_like(source)
    world[CROP[1]:CROP[3], CROP[0]:CROP[2]] = donor_world

    # Sleeve, cuff and hand are one moving foreground assembly.  The hidden
    # completion therefore covers the union of both original arm parts.
    arm = (alpha(TEXTURES / "upper-arm-near.png") > 8) | (alpha(TEXTURES / "forearm-near.png") > 8)
    reveal_zone = ndimage.binary_dilation(arm, iterations=7)
    edge = Image.fromarray((reveal_zone * 255).astype(np.uint8), "L")
    edge = edge.filter(ImageFilter.GaussianBlur(1.0))
    reveal_alpha = np.asarray(edge, dtype=np.uint8)

    result = world.copy()
    result[:, :, 3] = np.minimum(world[:, :, 3], reveal_alpha)
    result[result[:, :, 3] == 0, :3] = 0
    Image.fromarray(result, "RGBA").save(OUTPUT, optimize=True)

    debug = Image.new("RGBA", (2048, 1024), (18, 25, 39, 255))
    debug.alpha_composite(Image.open(SOURCE).convert("RGBA"), (0, 0))
    without_arm = Image.fromarray(source, "RGBA")
    without_arm_array = np.asarray(without_arm, dtype=np.uint8).copy()
    without_arm_array[arm] = 0
    restored = Image.fromarray(result, "RGBA")
    restored.alpha_composite(Image.fromarray(without_arm_array, "RGBA"))
    debug.alpha_composite(restored, (1024, 0))
    debug.save(DEBUG, optimize=True)
    print(f"{OUTPUT} opaque={int(np.count_nonzero(result[:, :, 3] > 8))}")


if __name__ == "__main__":
    main()
