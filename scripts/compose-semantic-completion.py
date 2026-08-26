#!/usr/bin/env python3
"""Turn an AI semantic-part donor into an exact-coordinate animation asset."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage


def load_rgba(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)


def largest_component(mask: np.ndarray) -> np.ndarray:
    labels, count = ndimage.label(mask)
    if count == 0:
        raise RuntimeError("AI donor contains no detectable foreground")
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    return labels == int(np.argmax(sizes))


def remove_light_matte(donor: np.ndarray) -> np.ndarray:
    if np.any(donor[:, :, 3] < 250):
        return donor
    rgb = donor[:, :, :3].astype(np.float32)
    borders = np.concatenate(
        [rgb[:24].reshape(-1, 3), rgb[-24:].reshape(-1, 3), rgb[:, :24].reshape(-1, 3), rgb[:, -24:].reshape(-1, 3)]
    )
    background = np.median(borders, axis=0)
    distance = np.linalg.norm(rgb - background[None, None, :], axis=2)
    rough = largest_component(distance > 32)
    support = ndimage.binary_dilation(rough, iterations=3)
    alpha = np.clip((distance - 3) / 48, 0, 1) * support
    alpha = ndimage.gaussian_filter(alpha, sigma=0.45)
    safe = np.maximum(alpha[:, :, None], 1 / 255)
    foreground = (rgb - (1 - alpha[:, :, None]) * background[None, None, :]) / safe
    result = np.zeros_like(donor)
    result[:, :, :3] = np.clip(foreground, 0, 255).astype(np.uint8)
    result[:, :, 3] = np.round(alpha * 255).astype(np.uint8)
    result[result[:, :, 3] == 0, :3] = 0
    return result


def warp_with_matrix(donor: np.ndarray, visible: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    height, width = visible.shape[:2]
    alpha = donor[:, :, 3:4].astype(np.float32) / 255
    premultiplied = donor[:, :, :3].astype(np.float32) * alpha
    warped_alpha = cv2.warpAffine(alpha, matrix, (width, height), flags=cv2.INTER_LANCZOS4)
    warped_rgb = cv2.warpAffine(premultiplied, matrix, (width, height), flags=cv2.INTER_LANCZOS4)
    if warped_alpha.ndim == 2:
        warped_alpha = warped_alpha[:, :, None]
    straight = np.divide(
        warped_rgb,
        np.maximum(warped_alpha, 1 / 255),
        out=np.zeros_like(warped_rgb),
        where=warped_alpha > 1 / 255,
    )
    warped = np.concatenate([straight, warped_alpha * 255], axis=2)
    return np.clip(warped, 0, 255).astype(np.uint8)


def register(donor: np.ndarray, visible: np.ndarray) -> tuple[np.ndarray, dict]:
    sift = cv2.SIFT_create(nfeatures=2500, contrastThreshold=0.015)
    donor_points, donor_desc = sift.detectAndCompute(
        cv2.cvtColor(donor[:, :, :3], cv2.COLOR_RGB2GRAY),
        (donor[:, :, 3] > 24).astype(np.uint8) * 255,
    )
    visible_points, visible_desc = sift.detectAndCompute(
        cv2.cvtColor(visible[:, :, :3], cv2.COLOR_RGB2GRAY),
        (visible[:, :, 3] > 24).astype(np.uint8) * 255,
    )
    if donor_desc is None or visible_desc is None:
        raise RuntimeError("Not enough texture features for donor registration")
    pairs = cv2.BFMatcher().knnMatch(donor_desc, visible_desc, k=2)
    matches = [a for a, b in pairs if a.distance < 0.76 * b.distance]
    if len(matches) < 8:
        raise RuntimeError(f"Only {len(matches)} reliable feature matches")
    source = np.float32([donor_points[m.queryIdx].pt for m in matches])
    destination = np.float32([visible_points[m.trainIdx].pt for m in matches])
    matrix, inliers = cv2.estimateAffinePartial2D(
        source,
        destination,
        method=cv2.RANSAC,
        ransacReprojThreshold=5,
        maxIters=6000,
        confidence=0.999,
        refineIters=25,
    )
    count = 0 if inliers is None else int(inliers.sum())
    if matrix is None or count < 6:
        raise RuntimeError(f"Donor registration failed; inliers={count}")
    scale = float(np.hypot(matrix[0, 0], matrix[1, 0]))
    if not 0.15 <= scale <= 2.5:
        raise RuntimeError(f"Degenerate donor registration scale: {scale}")
    return warp_with_matrix(donor, visible, matrix), {
        "featureMatches": len(matches),
        "inliers": count,
        "matrix": matrix.tolist(),
    }


def make_check(image: np.ndarray) -> Image.Image:
    rows, columns = np.indices(image.shape[:2])
    tiles = ((rows // 24 + columns // 24) % 2)[:, :, None]
    backdrop = np.where(tiles, np.array([218, 224, 234]), np.array([245, 247, 251])).astype(np.float32)
    alpha = image[:, :, 3:4].astype(np.float32) / 255
    rgb = image[:, :, :3].astype(np.float32) * alpha + backdrop * (1 - alpha)
    return Image.fromarray(rgb.astype(np.uint8), "RGB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--donor", type=Path, required=True)
    parser.add_argument("--visible", type=Path, required=True)
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--check", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument(
        "--matrix",
        help="Optional donor-to-canvas affine matrix: a,b,tx,c,d,ty",
    )
    parser.add_argument(
        "--reject-light-ai",
        action="store_true",
        help="Remove neutral light matte remnants from donor-only pixels",
    )
    args = parser.parse_args()

    donor = remove_light_matte(load_rgba(args.donor))
    visible = load_rgba(args.visible)
    target = np.asarray(Image.open(args.target).convert("L"), dtype=np.uint8) > 127
    if args.matrix:
        values = [float(value) for value in args.matrix.split(",")]
        if len(values) != 6:
            raise ValueError("--matrix requires six comma-separated numbers")
        matrix = np.asarray(values, dtype=np.float64).reshape(2, 3)
        warped = warp_with_matrix(donor, visible, matrix)
        details = {"featureMatches": None, "inliers": None, "matrix": matrix.tolist(), "manualMatrix": True}
    else:
        warped, details = register(donor, visible)
    warped[~target] = 0
    exact = visible[:, :, 3] > 0
    if args.reject_light_ai:
        rgb = warped[:, :, :3].astype(np.int16)
        neutral_light = (
            (rgb.min(axis=2) > 145)
            & ((rgb.max(axis=2) - rgb.min(axis=2)) < 55)
            & ~exact
        )
        warped[neutral_light] = 0
    warped[exact] = visible[exact]

    for path in (args.output, args.check, args.report):
        path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(warped, "RGBA").save(args.output, optimize=True)
    make_check(warped).save(args.check, optimize=True)
    missing = target & ~exact
    filled = missing & (warped[:, :, 3] > 8)
    report = {
        **details,
        "donor": str(args.donor),
        "visible": str(args.visible),
        "target": str(args.target),
        "output": str(args.output),
        "exactVisiblePixels": int(np.count_nonzero(exact)),
        "filledHiddenPixels": int(np.count_nonzero(filled)),
        "outsideTargetAlphaPixels": int(np.count_nonzero((warped[:, :, 3] > 0) & ~target)),
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
