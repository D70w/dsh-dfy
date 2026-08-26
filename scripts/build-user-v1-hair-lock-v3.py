#!/usr/bin/env python3
"""Build a smooth whole-lock replacement from the user-supplied 1254px donor."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
CANDIDATE = PACK / "textures" / "animation-v1-gpt-update-candidate"
TARGET = CANDIDATE / "head-front-complete.png"
DONOR = PACK / "source" / "user-updated-v1-candidate-1254" / "head-front-smooth-lock-donor.png"
OUTPUT = CANDIDATE / "head-front-complete-v3.png"
DEBUG = PACK / "debug" / "animation-v1-gpt-update-candidate"
REPORT = PACK / "reports" / "animation-v1-hair-lock-v3.json"
SIZE = (1024, 1024)

# The polygon encloses the complete semantic lock under the screen-left cheek,
# including an overlap zone hidden inside the hair mass. Replacing the entire
# lock avoids the kink created by attaching a new tip to an old cut edge.
LOCK_POLYGON = np.array(
    [[236, 428], [278, 425], [316, 447], [327, 486], [323, 529], [300, 567],
     [258, 576], [232, 552], [226, 503], [230, 459]],
    dtype=np.int32,
)
ROOT_BLEND_START_Y = 430
ROOT_BLEND_END_Y = 468


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (Path("C:/Windows/Fonts/msyh.ttc"), Path("C:/Windows/Fonts/simhei.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def rgba(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)


def alignment(source: np.ndarray, target: np.ndarray) -> tuple[np.ndarray, int, int]:
    source_gray = cv2.cvtColor(source[:, :, :3], cv2.COLOR_RGB2GRAY)
    target_gray = cv2.cvtColor(target[:, :, :3], cv2.COLOR_RGB2GRAY)
    source_gray[source[:, :, 3] < 32] = 0
    target_gray[target[:, :, 3] < 32] = 0
    sift = cv2.SIFT_create(nfeatures=5000)
    source_points, source_descriptors = sift.detectAndCompute(source_gray, None)
    target_points, target_descriptors = sift.detectAndCompute(target_gray, None)
    if source_descriptors is None or target_descriptors is None:
        raise RuntimeError("无法提取头部对齐特征")
    matches = cv2.BFMatcher().knnMatch(source_descriptors, target_descriptors, k=2)
    good = [left for left, right in matches if left.distance < 0.72 * right.distance]
    source_xy = np.float32([source_points[match.queryIdx].pt for match in good])
    target_xy = np.float32([target_points[match.trainIdx].pt for match in good])
    matrix, inliers = cv2.estimateAffinePartial2D(
        source_xy,
        target_xy,
        method=cv2.RANSAC,
        ransacReprojThreshold=4,
        maxIters=5000,
        confidence=0.999,
    )
    if matrix is None or inliers is None:
        raise RuntimeError("无法建立稳定的头部锚点对齐")
    inlier_count = int(inliers.sum())
    scale = float(np.hypot(matrix[0, 0], matrix[1, 0]))
    rotation = float(np.degrees(np.arctan2(matrix[1, 0], matrix[0, 0])))
    if len(good) < 180 or inlier_count < 150 or not 0.55 <= scale <= 0.59 or abs(rotation) > 1.0:
        raise RuntimeError(
            f"头部对齐质量不足：good={len(good)}, inliers={inlier_count}, scale={scale:.4f}, rotation={rotation:.3f}"
        )
    return matrix.astype(np.float32), len(good), inlier_count


def warp_rgba_premultiplied(source: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    alpha = source[:, :, 3].astype(np.float32) / 255.0
    premultiplied = source[:, :, :3].astype(np.float32) * alpha[:, :, None]
    warped_alpha = cv2.warpAffine(alpha, matrix, SIZE, flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT)
    warped_premultiplied = cv2.warpAffine(
        premultiplied,
        matrix,
        SIZE,
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
    )
    warped_alpha = np.clip(warped_alpha, 0, 1)
    rgb = np.zeros_like(warped_premultiplied)
    visible = warped_alpha > 1 / 255
    rgb[visible] = warped_premultiplied[visible] / warped_alpha[visible, None]
    result = np.zeros((SIZE[1], SIZE[0], 4), dtype=np.uint8)
    result[:, :, :3] = np.clip(np.rint(rgb), 0, 255).astype(np.uint8)
    result[:, :, 3] = np.clip(np.rint(warped_alpha * 255), 0, 255).astype(np.uint8)
    result[result[:, :, 3] <= 2] = 0
    return result


def polygon_mask() -> np.ndarray:
    mask = np.zeros((SIZE[1], SIZE[0]), dtype=np.uint8)
    cv2.fillPoly(mask, [LOCK_POLYGON], 255)
    return mask > 0


def semantic_hair_mask(image: np.ndarray, region: np.ndarray) -> np.ndarray:
    red = image[:, :, 0].astype(np.int16)
    green = image[:, :, 1].astype(np.int16)
    blue = image[:, :, 2].astype(np.int16)
    alpha = image[:, :, 3]
    blue_core = (
        region
        & (alpha > 16)
        & (blue > 58)
        & (blue > red * 1.18)
        & (blue > green * 1.03)
    )
    labels, count = ndimage.label(blue_core)
    if count == 0:
        raise RuntimeError("语义区域内没有识别到蓝色发束")
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    core = labels == int(np.argmax(sizes))
    # Grow into the exact dark outline while remaining inside the semantic
    # polygon and original alpha. This preserves a clean antialiased contour.
    return region & (alpha > 2) & ndimage.binary_dilation(core, iterations=5)


def color_match(donor: np.ndarray, target: np.ndarray) -> tuple[np.ndarray, list[float]]:
    donor_alpha = donor[:, :, 3]
    target_alpha = target[:, :, 3]
    sample_region = np.zeros((SIZE[1], SIZE[0]), dtype=bool)
    sample_region[350:505, 205:335] = True
    common = sample_region & (donor_alpha > 220) & (target_alpha > 220)
    donor_rgb = donor[:, :, :3].astype(np.float32)
    target_rgb = target[:, :, :3].astype(np.float32)
    donor_blue = common & (donor_rgb[:, :, 2] > donor_rgb[:, :, 0] * 1.15)
    if int(donor_blue.sum()) < 500:
        return donor.copy(), [1.0, 1.0, 1.0]
    ratios = []
    adjusted = donor.copy()
    for channel in range(3):
        source_values = donor_rgb[:, :, channel][donor_blue]
        target_values = target_rgb[:, :, channel][donor_blue]
        valid = source_values > 12
        ratio = float(np.median(target_values[valid] / source_values[valid]))
        ratios.append(float(np.clip(ratio, 0.84, 1.16)))
        adjusted[:, :, channel] = np.clip(
            np.rint(donor_rgb[:, :, channel] * ratios[-1]), 0, 255
        ).astype(np.uint8)
    adjusted[adjusted[:, :, 3] == 0, :3] = 0
    return adjusted, ratios


def composite_whole_lock(target: np.ndarray, donor: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    region = polygon_mask()
    donor_mask = semantic_hair_mask(donor, region)
    target_mask = semantic_hair_mask(target, region)
    rows = np.arange(SIZE[1], dtype=np.float32)[:, None]
    root_blend = np.clip(
        (rows - ROOT_BLEND_START_Y) / (ROOT_BLEND_END_Y - ROOT_BLEND_START_Y),
        0,
        1,
    )
    donor_weight = donor_mask.astype(np.float32) * root_blend
    target_remove = target_mask.astype(np.float32) * root_blend

    target_alpha = target[:, :, 3].astype(np.float32) / 255
    donor_alpha = donor[:, :, 3].astype(np.float32) / 255
    target_premul = target[:, :, :3].astype(np.float32) * target_alpha[:, :, None]
    donor_premul = donor[:, :, :3].astype(np.float32) * donor_alpha[:, :, None]

    kept_alpha = target_alpha * (1 - target_remove)
    kept_premul = target_premul * (1 - target_remove[:, :, None])
    placed_alpha = donor_alpha * donor_weight
    placed_premul = donor_premul * donor_weight[:, :, None]
    out_alpha = placed_alpha + kept_alpha * (1 - placed_alpha)
    out_premul = placed_premul + kept_premul * (1 - placed_alpha[:, :, None])
    result = np.zeros_like(target)
    visible = out_alpha > 1 / 255
    result[:, :, :3][visible] = np.clip(
        np.rint(out_premul[visible] / out_alpha[visible, None]), 0, 255
    ).astype(np.uint8)
    result[:, :, 3] = np.clip(np.rint(out_alpha * 255), 0, 255).astype(np.uint8)
    result[result[:, :, 3] <= 2] = 0

    changed = np.any(result != target, axis=2)
    if np.any(changed & ~region):
        raise RuntimeError("整束替换修改了语义区域外的像素")
    return result, donor_mask, changed


def flatten(image: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", image.size, color)
    canvas.alpha_composite(image)
    return canvas


def audit(before: np.ndarray, donor: np.ndarray, after: np.ndarray, changed: np.ndarray) -> Image.Image:
    crop_box = (190, 395, 350, 600)
    before_image = Image.fromarray(before, "RGBA").crop(crop_box)
    donor_image = Image.fromarray(donor, "RGBA").crop(crop_box)
    after_image = Image.fromarray(after, "RGBA").crop(crop_box)
    changed_crop = changed[crop_box[1]:crop_box[3], crop_box[0]:crop_box[2]]
    overlay = after_image.copy()
    overlay_array = np.asarray(overlay, dtype=np.uint8).copy()
    edge = ndimage.binary_dilation(changed_crop, iterations=1) ^ ndimage.binary_erosion(changed_crop, iterations=1)
    overlay_array[edge, :3] = (255, 82, 142)
    overlay_array[edge, 3] = 255
    overlay = Image.fromarray(overlay_array, "RGBA")

    sources = (before_image, donor_image, after_image, overlay)
    labels = ("旧发束", "对齐后的完整新发束", "V3 整束替换", "粉线=实际修改边界")
    panel_width, panel_height = 480, 615
    sheet = Image.new("RGBA", (panel_width * 2, panel_height * 2), (14, 19, 30, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = font(24)
    for index, source in enumerate(sources):
        background = (238, 242, 250, 255) if index < 2 else (18, 25, 39, 255)
        panel = flatten(source, background).resize((panel_width, panel_height - 44), Image.Resampling.NEAREST)
        x = (index % 2) * panel_width
        y = (index // 2) * panel_height
        draw.text((x + 12, y + 7), labels[index], font=title_font, fill=(241, 246, 255, 255))
        sheet.alpha_composite(panel, (x, y + 44))
    return sheet


def main() -> None:
    target = rgba(TARGET)
    donor = rgba(DONOR)
    if target.shape[:2] != (SIZE[1], SIZE[0]) or donor.shape[:2] != (1254, 1254):
        raise RuntimeError("V3 发束输入画布尺寸不符合预期")
    matrix, good_matches, inliers = alignment(donor, target)
    aligned = warp_rgba_premultiplied(donor, matrix)
    aligned, color_ratios = color_match(aligned, target)
    result, donor_mask, changed = composite_whole_lock(target, aligned)

    # The completed lock must remain connected to the main head component.
    labels, _ = ndimage.label(result[:, :, 3] > 8)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    main_label = int(np.argmax(sizes))
    if int((donor_mask & (labels == main_label)).sum()) < int(donor_mask.sum() * 0.9):
        raise RuntimeError("V3 发束没有稳定连接到头部主图层")

    Image.fromarray(result, "RGBA").save(OUTPUT, optimize=True)
    DEBUG.mkdir(parents=True, exist_ok=True)
    audit(target, aligned, result, changed).convert("RGB").save(DEBUG / "hair-lock-v3-audit.png", optimize=True)
    Image.fromarray(aligned, "RGBA").save(DEBUG / "hair-lock-v3-aligned-donor.png", optimize=True)
    report = {
        "schemaVersion": 1,
        "kind": "whole-semantic-hair-lock-replacement",
        "target": str(TARGET.relative_to(PACK)).replace("\\", "/"),
        "donor": str(DONOR.relative_to(PACK)).replace("\\", "/"),
        "output": str(OUTPUT.relative_to(PACK)).replace("\\", "/"),
        "canvasSize": list(SIZE),
        "alignmentMatrix": matrix.tolist(),
        "goodFeatureMatches": good_matches,
        "alignmentInliers": inliers,
        "colorRatios": color_ratios,
        "donorLockPixels": int(donor_mask.sum()),
        "changedPixels": int(changed.sum()),
        "unchangedOutsideSemanticRegion": True,
        "targetSha256": sha256(TARGET),
        "donorSha256": sha256(DONOR),
        "outputSha256": sha256(OUTPUT),
        "status": "VISUAL_REVIEW_REQUIRED",
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
