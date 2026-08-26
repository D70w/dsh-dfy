#!/usr/bin/env python3
"""Extract only the exact visible dress pixels before any AI completion."""

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
OUTPUT_DIR = PACK / "source" / "ai-completion" / "torso-dress-v3"
VISIBLE_OUTPUT = OUTPUT_DIR / "dress-visible-exact.png"
OVERLAY_OUTPUT = OUTPUT_DIR / "dress-visible-ownership-check.png"


def alpha(part_id: str) -> np.ndarray:
    return np.asarray(
        Image.open(TEXTURES / f"{part_id}.png").convert("RGBA"),
        dtype=np.uint8,
    )[:, :, 3] > 8


def skirt_region(annotation: np.ndarray) -> np.ndarray:
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
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("The ownership annotation has no closed red contour")
    region = np.zeros((1024, 1024), dtype=np.uint8)
    cv2.drawContours(region, [max(contours, key=cv2.contourArea)], -1, 255, cv2.FILLED)
    region = ndimage.binary_dilation(region > 0, iterations=8)
    rows = np.indices(region.shape)[0]
    return region & (rows >= 585)


def bodice_region() -> np.ndarray:
    image = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(image).polygon(
        [
            (310, 465), (410, 465), (442, 488), (455, 535),
            (468, 603), (449, 625), (288, 625), (282, 585),
            (290, 520),
        ],
        fill=255,
    )
    return np.asarray(image, dtype=np.uint8) > 0


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = np.asarray(Image.open(SOURCE).convert("RGBA"), dtype=np.uint8)
    annotation = np.asarray(Image.open(ANNOTATION).convert("RGBA"), dtype=np.uint8)
    semantic_region = skirt_region(annotation) | bodice_region()

    # These are exact visible foreground masks.  The cleaned near-hand asset is
    # used deliberately; the obsolete forearm mask contained skirt pixels and
    # was the cause of the previous oversized, jagged hole.
    occluders = (
        alpha("upper-arm-near")
        | alpha("forearm-near-clean")
        | alpha("upper-arm-far")
        | alpha("forearm-far")
        | alpha("tail")
    )
    visible = semantic_region & (source[:, :, 3] > 8) & ~occluders

    # Remove one bright-blue front-hair strand touching the upper-left collar.
    # This color rule is intentionally limited to a small fixed box and cannot
    # affect the whale emblem or any navy/gold garment pixels.
    rows, columns = np.indices(visible.shape)
    red = source[:, :, 0].astype(np.int16)
    green = source[:, :, 1].astype(np.int16)
    blue = source[:, :, 2].astype(np.int16)
    local_hair = (
        (columns < 320) & (rows < 520) & (rows > 450)
        & (blue > 120) & (green > 50) & (blue > red + 50)
    )
    visible &= ~local_hair

    extracted = np.zeros_like(source)
    extracted[visible] = source[visible]
    Image.fromarray(extracted, "RGBA").save(VISIBLE_OUTPUT, optimize=True)

    overlay = source.copy()
    overlay[visible, :3] = (
        overlay[visible, :3].astype(np.float32) * 0.55
        + np.asarray([30, 255, 120], dtype=np.float32) * 0.45
    ).astype(np.uint8)
    Image.fromarray(overlay, "RGBA").save(OVERLAY_OUTPUT, optimize=True)

    print({
        "visible": str(VISIBLE_OUTPUT),
        "ownershipCheck": str(OVERLAY_OUTPUT),
        "visiblePixels": int(np.count_nonzero(visible)),
        "status": "AWAITING_VISUAL_APPROVAL_BEFORE_AI",
    })


if __name__ == "__main__":
    main()
