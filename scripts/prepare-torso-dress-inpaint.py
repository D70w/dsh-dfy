#!/usr/bin/env python3
"""Extract exact torso/dress pixels and prepare a locked AI inpaint plate."""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
SOURCE = PACK / "source" / "whale-maid-master-1024.png"
ANNOTATION = PACK / "source" / "dress-ownership-annotation-v1.png"
TEXTURES = PACK / "textures"
WORK = PACK / "source" / "ai-completion" / "torso-dress-v2"

RAW = WORK / "torso-dress-visible-raw.png"
TARGET_MASK = WORK / "torso-dress-target-mask.png"
MISSING_MASK = WORK / "torso-dress-missing-mask.png"
AI_INPUT = WORK / "torso-dress-inpaint-input.png"

CROP = (150, 380, 700, 930)
ARM_PARTS = ("upper-arm-near", "forearm-near", "upper-arm-far", "forearm-far")


def largest_contour(mask: np.ndarray) -> np.ndarray:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("No closed ownership contour found")
    return max(contours, key=cv2.contourArea)


def dress_ownership(annotation: np.ndarray) -> np.ndarray:
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
    owned = np.zeros((1024, 1024), dtype=np.uint8)
    cv2.drawContours(owned, [largest_contour(closed)], -1, 255, cv2.FILLED)
    return owned > 0


def polygon_mask(points: list[tuple[int, int]]) -> np.ndarray:
    image = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(image).polygon(points, fill=255)
    return np.asarray(image, dtype=np.uint8) > 0


def part_alpha(part_id: str) -> np.ndarray:
    return np.asarray(
        Image.open(TEXTURES / f"{part_id}.png").convert("RGBA"),
        dtype=np.uint8,
    )[:, :, 3] > 8


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    source = np.asarray(Image.open(SOURCE).convert("RGBA"), dtype=np.uint8)
    annotation = np.asarray(Image.open(ANNOTATION).convert("RGBA"), dtype=np.uint8)

    dress = dress_ownership(annotation)
    # The neck belongs to the torso base so head rotation cannot expose a gap.
    # Its upper half is intentionally hidden beneath the head in the bind pose.
    neck = polygon_mask([(326, 424), (407, 424), (415, 480), (314, 480)])
    target = dress | neck

    arms = np.zeros(target.shape, dtype=bool)
    for part_id in ARM_PARTS:
        arms |= part_alpha(part_id)
    arms = ndimage.binary_dilation(arms, iterations=3)

    head = part_alpha("head")
    hair = part_alpha("hair-back")
    hidden = arms | (neck & (head | hair))
    visible = target & (source[:, :, 3] > 0) & ~hidden

    raw = np.zeros_like(source)
    raw[visible] = source[visible]
    missing = target & ~visible

    Image.fromarray(raw, "RGBA").save(RAW, optimize=True)
    Image.fromarray((target * 255).astype(np.uint8), "L").save(TARGET_MASK, optimize=True)
    Image.fromarray((missing * 255).astype(np.uint8), "L").save(MISSING_MASK, optimize=True)

    plate = np.zeros_like(source)
    plate[:, :, :3] = (18, 25, 39)
    plate[:, :, 3] = 255
    plate[visible, :3] = source[visible, :3]
    plate[missing, :3] = (255, 0, 255)
    crop = Image.fromarray(plate, "RGBA").crop(CROP)
    crop.resize((1024, 1024), Image.Resampling.LANCZOS).save(AI_INPUT, optimize=True)

    print({
        "raw": str(RAW),
        "targetPixels": int(np.count_nonzero(target)),
        "exactPixels": int(np.count_nonzero(visible)),
        "missingPixels": int(np.count_nonzero(missing)),
        "crop": CROP,
    })


if __name__ == "__main__":
    main()
