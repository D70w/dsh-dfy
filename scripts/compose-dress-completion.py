#!/usr/bin/env python3
"""Register an AI dress donor and fill only occluded dress pixels.

The user's ownership annotation remains the geometry authority.  AI output is
never accepted as a replacement image: it is aligned to the exact visible
mother pixels and may contribute only where those pixels are absent.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
WORK = PACK / "source" / "ai-completion" / "torso-dress-v4"
VISIBLE = WORK / "dress-visible-exact.png"
TARGET = WORK / "dress-complete-target-mask.png"
OUTPUT = PACK / "textures" / "dress-complete-v2.png"
CHECK = PACK / "debug" / "dress-complete-v2-check.png"
REPORT = PACK / "reports" / "dress-complete-v2.json"


def rgba(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)


def register_donor(donor: np.ndarray, visible: np.ndarray) -> tuple[np.ndarray, dict]:
    detector = cv2.SIFT_create(nfeatures=3000, contrastThreshold=0.02)
    donor_mask = (donor[:, :, 3] > 32).astype(np.uint8) * 255
    visible_mask = (visible[:, :, 3] > 32).astype(np.uint8) * 255
    donor_gray = cv2.cvtColor(donor[:, :, :3], cv2.COLOR_RGB2GRAY)
    visible_gray = cv2.cvtColor(visible[:, :, :3], cv2.COLOR_RGB2GRAY)
    donor_points, donor_desc = detector.detectAndCompute(donor_gray, donor_mask)
    visible_points, visible_desc = detector.detectAndCompute(visible_gray, visible_mask)
    if donor_desc is None or visible_desc is None:
        raise RuntimeError("Not enough visible texture features to register donor")

    pairs = cv2.BFMatcher().knnMatch(donor_desc, visible_desc, k=2)
    matches = [first for first, second in pairs if first.distance < 0.72 * second.distance]
    if len(matches) < 12:
        raise RuntimeError(f"Only {len(matches)} reliable donor matches")

    source = np.float32([donor_points[item.queryIdx].pt for item in matches])
    destination = np.float32([visible_points[item.trainIdx].pt for item in matches])
    matrix, inliers = cv2.estimateAffinePartial2D(
        source,
        destination,
        method=cv2.RANSAC,
        ransacReprojThreshold=6.0,
        maxIters=5000,
        confidence=0.999,
        refineIters=20,
    )
    if matrix is None or inliers is None or int(inliers.sum()) < 20:
        raise RuntimeError("AI donor registration did not reach the inlier threshold")

    height, width = visible.shape[:2]
    alpha = donor[:, :, 3:4].astype(np.float32) / 255.0
    premultiplied = donor[:, :, :3].astype(np.float32) * alpha
    warped_alpha = cv2.warpAffine(
        alpha,
        matrix,
        (width, height),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )
    warped_rgb = cv2.warpAffine(
        premultiplied,
        matrix,
        (width, height),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )
    if warped_alpha.ndim == 2:
        warped_alpha = warped_alpha[:, :, None]
    straight_rgb = np.divide(
        warped_rgb,
        np.maximum(warped_alpha, 1 / 255),
        out=np.zeros_like(warped_rgb),
        where=warped_alpha > 1 / 255,
    )
    warped = np.concatenate(
        [np.clip(straight_rgb, 0, 255), np.clip(warped_alpha * 255, 0, 255)],
        axis=2,
    ).astype(np.uint8)
    return warped, {
        "featureMatches": len(matches),
        "inliers": int(inliers.sum()),
        "matrix": matrix.tolist(),
    }


def checker(width: int, height: int, cell: int = 24) -> np.ndarray:
    rows, columns = np.indices((height, width))
    light = ((rows // cell + columns // cell) % 2) == 0
    result = np.empty((height, width, 3), dtype=np.uint8)
    result[light] = (245, 247, 251)
    result[~light] = (218, 224, 234)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--donor", type=Path, required=True)
    args = parser.parse_args()

    visible = rgba(VISIBLE)
    donor = rgba(args.donor)
    target = np.asarray(Image.open(TARGET).convert("L"), dtype=np.uint8) > 127
    warped, registration = register_donor(donor, visible)

    visible_alpha = visible[:, :, 3].astype(np.float32) / 255.0
    donor_alpha = warped[:, :, 3].astype(np.float32) / 255.0
    permitted_donor_alpha = donor_alpha * target.astype(np.float32)

    # Exact mother pixels always win.  The registered donor is exposed only
    # through transparent/occluded areas of the approved ownership mask.
    output = warped.copy()
    output[:, :, 3] = np.clip(permitted_donor_alpha * 255, 0, 255).astype(np.uint8)
    has_visible = visible[:, :, 3] > 0
    output[has_visible] = visible[has_visible]
    output[~target] = 0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    CHECK.parent.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(output, "RGBA").save(OUTPUT, optimize=True)

    alpha = output[:, :, 3:4].astype(np.float32) / 255.0
    check_rgb = (
        output[:, :, :3].astype(np.float32) * alpha
        + checker(output.shape[1], output.shape[0]).astype(np.float32) * (1 - alpha)
    ).astype(np.uint8)
    Image.fromarray(check_rgb, "RGB").save(CHECK, optimize=True)

    missing = target & (visible[:, :, 3] == 0)
    filled = missing & (output[:, :, 3] > 8)
    report = {
        **registration,
        "donor": str(args.donor),
        "output": str(OUTPUT),
        "visiblePixelsPreserved": int(np.count_nonzero(has_visible)),
        "missingTargetPixels": int(np.count_nonzero(missing)),
        "missingPixelsFilled": int(np.count_nonzero(filled)),
        "fillRatio": float(np.count_nonzero(filled) / max(1, np.count_nonzero(missing))),
        "outsideTargetAlphaPixels": int(np.count_nonzero((output[:, :, 3] > 0) & ~target)),
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
