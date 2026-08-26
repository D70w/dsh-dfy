#!/usr/bin/env python3
"""Extract dress ownership directly from the user's blue/green annotation."""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
SOURCE = PACK / "source" / "whale-maid-master-1024.png"
ANNOTATION = PACK / "source" / "dress-ownership-annotation-v2.png"
OUTPUT_DIR = PACK / "source" / "ai-completion" / "torso-dress-v4"
TARGET_OUTPUT = OUTPUT_DIR / "dress-complete-target-mask.png"
VISIBLE_OUTPUT = OUTPUT_DIR / "dress-visible-exact.png"
OVERLAY_OUTPUT = OUTPUT_DIR / "dress-visible-ownership-check.png"


def source_on_white(source: np.ndarray) -> np.ndarray:
    alpha = source[:, :, 3:4].astype(np.float32) / 255
    return (source[:, :, :3] * alpha + 255 * (1 - alpha)).astype(np.uint8)


def outer_target(annotation: np.ndarray, changed: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    red = annotation[:, :, 0].astype(np.int16)
    green = annotation[:, :, 1].astype(np.int16)
    blue = annotation[:, :, 2].astype(np.int16)
    blue_line = changed & (blue > green + 30) & (blue > red + 70) & (blue > 130)
    closed = cv2.morphologyEx(
        blue_line.astype(np.uint8) * 255,
        cv2.MORPH_CLOSE,
        np.ones((7, 7), dtype=np.uint8),
    )
    closed = cv2.dilate(closed, np.ones((3, 3), dtype=np.uint8))
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("No closed blue dress outline found")
    contour = max(contours, key=cv2.contourArea)
    target = np.zeros(changed.shape, dtype=np.uint8)
    cv2.drawContours(target, [contour], -1, 255, cv2.FILLED)
    return target > 0, blue_line


def visible_fill(target: np.ndarray, changed: np.ndarray, blue_line: np.ndarray) -> np.ndarray:
    fill = changed & ~blue_line & target
    fill = cv2.morphologyEx(
        fill.astype(np.uint8) * 255,
        cv2.MORPH_CLOSE,
        np.ones((3, 3), dtype=np.uint8),
    ) > 0

    # Restore small enclosed blue/gold/black dress details that the blue-line
    # color test may temporarily classify as annotation.  Large gaps touching
    # the ownership boundary are arm/head occlusions and remain missing.
    gaps = target & ~fill
    count, labels, stats, _ = cv2.connectedComponentsWithStats(gaps.astype(np.uint8), 8)
    boundary = target & ~ndimage.binary_erosion(target, iterations=2)
    for label in range(1, count):
        component = labels == label
        if stats[label, cv2.CC_STAT_AREA] < 5000 and not np.any(component & boundary):
            fill |= component
    return fill


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = np.asarray(Image.open(SOURCE).convert("RGBA"), dtype=np.uint8)
    annotation = np.asarray(Image.open(ANNOTATION).convert("RGB"), dtype=np.uint8)
    reference = source_on_white(source)
    changed = np.max(
        np.abs(annotation.astype(np.int16) - reference.astype(np.int16)),
        axis=2,
    ) > 20

    target, blue_line = outer_target(annotation, changed)
    visible = visible_fill(target, changed, blue_line) & (source[:, :, 3] > 8)

    # The blue outline crosses the very top of both legs.  Remove only local
    # peach skin below the dress hem; this cannot affect garment colors.
    rows, columns = np.indices(visible.shape)
    red = source[:, :, 0].astype(np.int16)
    green = source[:, :, 1].astype(np.int16)
    blue = source[:, :, 2].astype(np.int16)
    leg_skin = (
        (rows > 830) & (columns > 280) & (columns < 540)
        & (red > 145) & (red > green + 8) & (green > blue + 3)
    )
    visible &= ~leg_skin

    extracted = np.zeros_like(source)
    extracted[visible] = source[visible]
    Image.fromarray(extracted, "RGBA").save(VISIBLE_OUTPUT, optimize=True)
    Image.fromarray((target * 255).astype(np.uint8), "L").save(TARGET_OUTPUT, optimize=True)

    overlay = source.copy()
    overlay[visible, :3] = (
        overlay[visible, :3].astype(np.float32) * 0.55
        + np.asarray([30, 255, 120], dtype=np.float32) * 0.45
    ).astype(np.uint8)
    Image.fromarray(overlay, "RGBA").save(OVERLAY_OUTPUT, optimize=True)
    print({
        "target": str(TARGET_OUTPUT),
        "visible": str(VISIBLE_OUTPUT),
        "ownershipCheck": str(OVERLAY_OUTPUT),
        "targetPixels": int(np.count_nonzero(target)),
        "visiblePixels": int(np.count_nonzero(visible)),
        "status": "AWAITING_VISUAL_APPROVAL_BEFORE_AI",
    })


if __name__ == "__main__":
    main()
