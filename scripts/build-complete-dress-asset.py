#!/usr/bin/env python3
"""Build the complete, arm-independent one-piece dress rig asset."""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
TEXTURES = PACK / "textures"
ANNOTATION = PACK / "source" / "dress-ownership-annotation-v1.png"
DONOR = PACK / "source" / "ai-completion" / "dress-complete-donor-v2.png"
OUTPUT = TEXTURES / "dress-complete-v1.png"
DEBUG = PACK / "debug" / "dress-complete-v1-check.png"

TARGET_BOX = (188, 440, 472, 412)
ARM_PARTS = (
    "upper-arm-near",
    "forearm-near",
    "upper-arm-far",
    "forearm-far",
)


def largest_contour(mask: np.ndarray) -> np.ndarray:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("No usable contour found")
    return max(contours, key=cv2.contourArea)


def ownership_mask(annotation: np.ndarray) -> np.ndarray:
    red = (
        (annotation[:, :, 0] > 180)
        & (annotation[:, :, 1] < 100)
        & (annotation[:, :, 2] < 100)
        & (annotation[:, :, 3] > 100)
    )
    closed = cv2.morphologyEx(
        red.astype(np.uint8) * 255,
        cv2.MORPH_CLOSE,
        np.ones((9, 9), dtype=np.uint8),
    )
    result = np.zeros((1024, 1024), dtype=np.uint8)
    cv2.drawContours(result, [largest_contour(closed)], -1, 255, cv2.FILLED)
    return result


def donor_art(donor: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    rgb = donor[:, :, :3].astype(np.int16)
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    seed = (maximum - minimum > 10) | (
        (maximum > 30) & (maximum < 210) & (maximum - minimum > 4)
    )
    mask = cv2.morphologyEx(
        seed.astype(np.uint8) * 255,
        cv2.MORPH_CLOSE,
        np.ones((9, 9), dtype=np.uint8),
    )
    mask = cv2.dilate(mask, np.ones((5, 5), dtype=np.uint8))
    contour = largest_contour(mask)
    art_mask = np.zeros_like(mask)
    cv2.drawContours(art_mask, [contour], -1, 255, cv2.FILLED)
    x, y, width, height = cv2.boundingRect(contour)
    return donor[y:y + height, x:x + width], art_mask[y:y + height, x:x + width]


def arm_exclusion() -> np.ndarray:
    arm = np.zeros((1024, 1024), dtype=bool)
    for part_id in ARM_PARTS:
        alpha = np.asarray(
            Image.open(TEXTURES / f"{part_id}.png").convert("RGBA"),
            dtype=np.uint8,
        )[:, :, 3]
        arm |= alpha > 8
    return ndimage.binary_dilation(arm, iterations=10)


def main() -> None:
    annotation = np.asarray(Image.open(ANNOTATION).convert("RGBA"), dtype=np.uint8)
    mother = np.asarray(Image.open(TEXTURES / "body-base.png").convert("RGBA"), dtype=np.uint8)
    donor = np.asarray(Image.open(DONOR).convert("RGBA"), dtype=np.uint8)

    owned = ownership_mask(annotation)
    donor_crop, donor_mask = donor_art(donor)
    target_x, target_y, target_width, target_height = TARGET_BOX
    donor_crop = cv2.resize(
        donor_crop,
        (target_width, target_height),
        interpolation=cv2.INTER_LANCZOS4,
    )
    donor_mask = cv2.resize(
        donor_mask,
        (target_width, target_height),
        interpolation=cv2.INTER_LINEAR,
    )

    result = np.zeros((1024, 1024, 4), dtype=np.uint8)
    target = np.s_[target_y:target_y + target_height, target_x:target_x + target_width]
    result[target] = donor_crop
    result[target][..., 3] = donor_mask

    # Preserve exact mother pixels wherever they are trustworthy.  A generous
    # exclusion around both arm assemblies prevents sleeve/cuff fragments from
    # leaking into the semantic dress asset.  The generated donor is used only
    # in those hidden overlap zones.
    exact = (mother[:, :, 3] > 0) & (owned > 0) & ~arm_exclusion()
    result[exact] = mother[exact]
    result[result[:, :, 3] == 0, :3] = 0
    Image.fromarray(result, "RGBA").save(OUTPUT, optimize=True)

    preview = Image.new("RGBA", (2048, 1024), (18, 25, 39, 255))
    preview.alpha_composite(Image.fromarray(result, "RGBA"), (0, 0))
    preview.alpha_composite(Image.open(PACK / "source" / "whale-maid-master-1024.png").convert("RGBA"), (1024, 0))
    preview.save(DEBUG, optimize=True)
    print(f"{OUTPUT} size=1024x1024 visible={int(np.count_nonzero(result[:, :, 3] > 8))}")


if __name__ == "__main__":
    main()
