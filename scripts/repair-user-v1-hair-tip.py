#!/usr/bin/env python3
"""Recover the misplaced blue hair-tip pixels from the legacy far-arm cutout."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
TEXTURES = PACK / "textures"
CANDIDATE = TEXTURES / "animation-v1-gpt-update-candidate"
HEAD = CANDIDATE / "head-front-complete.png"
CLEAN_ARM = CANDIDATE / "arm-far-complete.png"
LEGACY_ARM = TEXTURES / "upper-arm-far.png"
OUTPUT = CANDIDATE / "head-front-complete-v2.png"
AUDIT = PACK / "debug" / "animation-v1-gpt-update-candidate" / "hair-tip-repair-audit.png"
REPORT = PACK / "reports" / "animation-v1-hair-tip-repair.json"
EXPECTED_SIZE = (1024, 1024)
SEARCH_BOX = (245, 510, 300, 570)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (Path("C:/Windows/Fonts/msyh.ttc"), Path("C:/Windows/Fonts/simhei.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def alpha_bbox(mask: np.ndarray) -> list[int]:
    rows, columns = np.nonzero(mask)
    return [int(columns.min()), int(rows.min()), int(columns.max() + 1), int(rows.max() + 1)]


def recover_tip_mask(head: np.ndarray, legacy_arm: np.ndarray, clean_arm: np.ndarray) -> np.ndarray:
    x0, y0, x1, y1 = SEARCH_BOX
    region = np.zeros(head.shape[:2], dtype=bool)
    region[y0:y1, x0:x1] = True

    # The clean complete arm covers all legitimate sleeve pixels. Pixels that
    # exist only in the legacy arm are the hair fragment that was cut into the
    # wrong layer. Select its dominant connected component, then retain its
    # nearby antialiased fringe from the original source.
    core_candidates = (legacy_arm[:, :, 3] > 5) & (clean_arm[:, :, 3] < 16) & region
    labels, count = ndimage.label(core_candidates)
    if count == 0:
        raise RuntimeError("未在旧手臂资产中找到可恢复的发梢")
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    core = labels == int(np.argmax(sizes))
    raw_fringe = (legacy_arm[:, :, 3] > 2) & (clean_arm[:, :, 3] < 16) & region
    selected = raw_fringe & ndimage.binary_dilation(core, iterations=4)

    # Never alter fully opaque pixels that already belong to the approved head
    # layer. The recovered patch fills transparent/antialiased missing space.
    selected &= head[:, :, 3] < 255
    bbox = alpha_bbox(selected)
    if not (400 <= int(selected.sum()) <= 520):
        raise RuntimeError(f"发梢恢复像素数量异常：{int(selected.sum())}")
    if bbox[0] < 245 or bbox[1] < 510 or bbox[2] > 300 or bbox[3] > 570:
        raise RuntimeError(f"发梢恢复区域越界：{bbox}")
    return selected


def make_audit(before: Image.Image, after: Image.Image, bbox: list[int]) -> Image.Image:
    margin = 36
    crop_box = (
        max(0, bbox[0] - margin),
        max(0, bbox[1] - margin),
        min(EXPECTED_SIZE[0], bbox[2] + margin),
        min(EXPECTED_SIZE[1], bbox[3] + margin),
    )
    panels: list[Image.Image] = []
    for source, background in (
        (before, (238, 242, 250, 255)),
        (after, (238, 242, 250, 255)),
        (before, (18, 25, 39, 255)),
        (after, (18, 25, 39, 255)),
    ):
        crop = source.crop(crop_box)
        canvas = Image.new("RGBA", crop.size, background)
        canvas.alpha_composite(crop)
        panels.append(canvas.resize((crop.width * 5, crop.height * 5), Image.Resampling.NEAREST))
    sheet = Image.new("RGBA", (panels[0].width * 2, panels[0].height * 2 + 72), (14, 19, 30, 255))
    labels = ("修复前·浅底", "修复后·浅底", "修复前·深底", "修复后·深底")
    draw = ImageDraw.Draw(sheet)
    title_font = font(24)
    for index, panel in enumerate(panels):
        column = index % 2
        row = index // 2
        y = row * panels[0].height + (72 if row == 1 else 0)
        sheet.alpha_composite(panel, (column * panels[0].width, y + 36))
        draw.text((column * panels[0].width + 12, y + 4), labels[index], font=title_font, fill=(241, 246, 255, 255))
    return sheet


def main() -> None:
    head_image = Image.open(HEAD).convert("RGBA")
    legacy_arm_image = Image.open(LEGACY_ARM).convert("RGBA")
    clean_arm_image = Image.open(CLEAN_ARM).convert("RGBA")
    if head_image.size != EXPECTED_SIZE or legacy_arm_image.size != EXPECTED_SIZE or clean_arm_image.size != EXPECTED_SIZE:
        raise RuntimeError("发梢恢复输入必须全部使用 1024×1024 共享画布")

    head = np.asarray(head_image, dtype=np.uint8)
    legacy_arm = np.asarray(legacy_arm_image, dtype=np.uint8)
    clean_arm = np.asarray(clean_arm_image, dtype=np.uint8)
    selected = recover_tip_mask(head, legacy_arm, clean_arm)

    patch = np.zeros_like(legacy_arm)
    patch[selected] = legacy_arm[selected]
    repaired = Image.alpha_composite(head_image, Image.fromarray(patch, "RGBA"))
    repaired_array = np.asarray(repaired, dtype=np.uint8)
    changed = np.any(repaired_array != head, axis=2)
    if np.any(changed & ~selected):
        raise RuntimeError("修复意外修改了发梢选择区域以外的像素")

    bbox = alpha_bbox(selected)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    repaired.save(OUTPUT, optimize=True)
    AUDIT.parent.mkdir(parents=True, exist_ok=True)
    make_audit(head_image, repaired, bbox).convert("RGB").save(AUDIT, optimize=True)

    report = {
        "schemaVersion": 1,
        "kind": "exact-hair-tip-layer-recovery",
        "sourceHead": str(HEAD.relative_to(PACK)).replace("\\", "/"),
        "legacyContaminatedArm": str(LEGACY_ARM.relative_to(PACK)).replace("\\", "/"),
        "cleanArmReference": str(CLEAN_ARM.relative_to(PACK)).replace("\\", "/"),
        "output": str(OUTPUT.relative_to(PACK)).replace("\\", "/"),
        "recoveredPixelCount": int(selected.sum()),
        "changedPixelCount": int(changed.sum()),
        "recoveredBbox": bbox,
        "canvasSize": list(EXPECTED_SIZE),
        "unchangedOutsideRecoveryMask": True,
        "inputHeadSha256": sha256(HEAD),
        "outputSha256": sha256(OUTPUT),
        "status": "VISUAL_REVIEW_REQUIRED",
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
