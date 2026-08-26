#!/usr/bin/env python3
"""Normalize the user-provided 1254px V1 update without replacing formal V1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
SOURCE = PACK / "source" / "user-updated-v1-candidate-1254"
OUTPUT = PACK / "textures" / "animation-v1-gpt-update-candidate"
DEBUG = PACK / "debug" / "animation-v1-gpt-update-candidate"
REPORT = PACK / "reports" / "animation-v1-gpt-update-candidate.json"
CURRENT = PACK / "debug" / "animation-v1" / "semantic-reconstruction.png"


ASSETS = {
    "hair-back-complete": ("hair-back.png", "下部后发"),
    "tail-complete": ("tail.png", "鲸尾"),
    "leg-far-complete": ("leg-far.png", "远侧腿"),
    "leg-near-complete": ("leg-near.png", "近侧腿"),
    "arm-far-complete": ("arm-far.png", "远侧手臂"),
    "arm-near-root": ("arm-near-root.png", "近侧隐藏肩根"),
    "arm-near-complete": ("arm-near.png", "近侧手臂"),
    "dress-complete": ("dress.png", "完整连衣裙"),
    "head-front-complete": ("head-front.png", "头部与上部后发"),
    "ahoge-complete": ("ahoge.png", "呆毛"),
}

ORDER = [
    "hair-back-complete",
    "tail-complete",
    "leg-far-complete",
    "leg-near-complete",
    "arm-far-complete",
    "dress-complete",
    "arm-near-complete",
    "head-front-complete",
    "ahoge-complete",
]

POST_TRANSFORMS = {
    # Keep both legs at the same visual size as requested. The far leg is
    # shifted left around the calibrated hip centre so equal sizing does not
    # make the two shoes overlap.
    "leg-far-complete": {
        "uniformScale": 0.798,
        "targetLeft": 262,
        "targetBottom": 997,
    },
}


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (Path("C:/Windows/Fonts/msyh.ttc"), Path("C:/Windows/Fonts/simhei.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def largest_component(mask: np.ndarray) -> tuple[np.ndarray, int, int]:
    labels, count = ndimage.label(mask)
    if count == 0:
        raise RuntimeError("Asset has no visible component")
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    selected = int(np.argmax(sizes))
    return labels == selected, count, int(sizes[selected])


def alpha_bbox(alpha: np.ndarray) -> list[int] | None:
    rows, columns = np.nonzero(alpha > 0)
    if not len(columns):
        return None
    return [
        int(columns.min()),
        int(rows.min()),
        int(columns.max() + 1),
        int(rows.max() + 1),
    ]


def sanitize_rgba(image: Image.Image) -> tuple[Image.Image, dict]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[:, :, 3]
    raw_visible = alpha > 8
    main, component_count, main_pixels = largest_component(raw_visible)
    removed_pixels = int(np.count_nonzero(raw_visible & ~main))
    rgba[~main] = 0

    inward = ndimage.distance_transform_edt(main)
    stable = main & (inward >= 3.0) & (alpha >= 220)
    if not np.any(stable):
        stable = main & (inward >= 2.0)
    if not np.any(stable):
        stable = main
    _, nearest = ndimage.distance_transform_edt(~stable, return_indices=True)
    fringe = main & ((alpha < 96) | (inward < 1.5))
    rgba[fringe, :3] = rgba[nearest[0][fringe], nearest[1][fringe], :3]

    # GPT left the whole interior at alpha 252-254. Make the semantic interior
    # fully opaque while retaining the original one-pixel antialiased contour.
    solid = main & (inward >= 2.0)
    rgba[solid, 3] = 255
    rgba[~main] = 0
    rgba[rgba[:, :, 3] == 0, :3] = 0

    normalized = Image.fromarray(rgba, "RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
    result = np.asarray(normalized, dtype=np.uint8).copy()
    result[result[:, :, 3] <= 2] = 0
    resized_mask = result[:, :, 3] > 0
    resized_inward = ndimage.distance_transform_edt(resized_mask)
    result[resized_mask & (resized_inward >= 2.0), 3] = 255
    result[result[:, :, 3] == 0, :3] = 0
    output = Image.fromarray(result, "RGBA")

    details = {
        "sourceSize": list(image.size),
        "sourceMainBbox": alpha_bbox(np.where(main, alpha, 0)),
        "sourceComponentCount": component_count,
        "sourceMainPixels": main_pixels,
        "removedDebrisPixels": removed_pixels,
        "outputBbox": alpha_bbox(result[:, :, 3]),
        "outputOpaquePixels": int(np.count_nonzero(result[:, :, 3] == 255)),
        "outputPartialPixels": int(
            np.count_nonzero((result[:, :, 3] > 0) & (result[:, :, 3] < 255))
        ),
    }
    return output, details


def apply_post_transform(image: Image.Image, config: dict) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return image
    crop = image.crop(bbox)
    scale = float(config["uniformScale"])
    resized = crop.resize(
        (
            max(1, int(round(crop.width * scale))),
            max(1, int(round(crop.height * scale))),
        ),
        Image.Resampling.LANCZOS,
    )
    x = int(config["targetLeft"])
    y = int(config["targetBottom"]) - resized.height
    canvas = Image.new("RGBA", image.size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (x, y))
    rgba = np.asarray(canvas, dtype=np.uint8).copy()
    rgba[rgba[:, :, 3] <= 2] = 0
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return Image.fromarray(rgba, "RGBA")


def composite(layers: dict[str, Image.Image], offsets: dict[str, tuple[int, int]] | None = None) -> Image.Image:
    offsets = offsets or {}
    result = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    for name in ORDER:
        dx, dy = offsets.get(name, (0, 0))
        result.alpha_composite(layers[name], (dx, dy))
    return result


def checker(size: tuple[int, int], cell: int = 18) -> Image.Image:
    width, height = size
    rows, columns = np.indices((height, width))
    tiles = ((rows // cell + columns // cell) % 2)[:, :, None]
    light = np.where(tiles, np.array([238, 242, 250]), np.array([211, 219, 232]))
    dark = np.where(tiles, np.array([54, 64, 83]), np.array([31, 38, 52]))
    rgb = np.where((columns < width // 2)[:, :, None], light, dark).astype(np.uint8)
    return Image.fromarray(rgb, "RGB").convert("RGBA")


def flatten(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    result = Image.new("RGBA", image.size, (*color, 255))
    result.alpha_composite(image)
    return result


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    result = Image.new("RGBA", size, (17, 21, 31, 255))
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    result.alpha_composite(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return result


def write_overview(layers: dict[str, Image.Image]) -> None:
    panel_width, panel_height = 360, 360
    columns = 5
    rows = 2
    sheet = Image.new("RGBA", (columns * panel_width, rows * panel_height), (17, 21, 31, 255))
    title_font = font(23)
    for index, name in enumerate(ASSETS):
        x = (index % columns) * panel_width
        y = (index // columns) * panel_height
        area = checker((panel_width - 20, panel_height - 62))
        layer = layers[name]
        bbox = layer.getchannel("A").getbbox()
        if bbox:
            part = layer.crop(bbox)
            part.thumbnail((area.width - 34, area.height - 34), Image.Resampling.LANCZOS)
            area.alpha_composite(part, ((area.width - part.width) // 2, (area.height - part.height) // 2))
        sheet.alpha_composite(area, (x + 10, y + 52))
        ImageDraw.Draw(sheet).text(
            (x + 14, y + 10), ASSETS[name][1], font=title_font, fill=(241, 245, 255, 255)
        )
    sheet.convert("RGB").save(DEBUG / "candidate-assets-overview.png", optimize=True)


def write_comparison(candidate: Image.Image) -> None:
    current = Image.open(CURRENT).convert("RGBA")
    comparison = Image.new("RGBA", (2048, 1024), (24, 30, 43, 255))
    comparison.alpha_composite(current, (0, 0))
    comparison.alpha_composite(candidate, (1024, 0))
    draw = ImageDraw.Draw(comparison)
    label_font = font(26)
    draw.text((18, 18), "当前正式 V1", font=label_font, fill=(245, 248, 255, 255))
    draw.text((1042, 18), "GPT 更新候选 V1", font=label_font, fill=(245, 248, 255, 255))
    comparison.convert("RGB").save(DEBUG / "current-vs-candidate.png", optimize=True)

    light_dark = Image.new("RGBA", (1440, 720), (17, 21, 31, 255))
    for column, color in enumerate(((245, 247, 252), (24, 30, 43))):
        scene = flatten(candidate, color).crop((110, 10, 1010, 1024))
        light_dark.alpha_composite(fit(scene, (720, 720)), (column * 720, 0))
    light_dark.convert("RGB").save(DEBUG / "candidate-light-dark.png", optimize=True)


def write_motion_stress(layers: dict[str, Image.Image]) -> None:
    cases = [
        ("标准装配", {}),
        (
            "上下部后发与呆毛错位",
            {
                "head-front-complete": (4, -2),
                "hair-back-complete": (-3, 2),
                "ahoge-complete": (2, -3),
            },
        ),
        (
            "双臂肩根错位",
            {"arm-far-complete": (-6, 3), "arm-near-complete": (6, -3)},
        ),
        (
            "双腿与鲸尾根部错位",
            {
                "leg-far-complete": (-6, 5),
                "leg-near-complete": (7, 4),
                "tail-complete": (8, -2),
            },
        ),
    ]
    panel = (620, 720)
    header = 54
    sheet = Image.new("RGBA", (1240, (panel[1] + header) * 2), (17, 21, 31, 255))
    draw = ImageDraw.Draw(sheet)
    label_font = font(24)
    for index, (label, offsets) in enumerate(cases):
        x = (index % 2) * panel[0]
        y = (index // 2) * (panel[1] + header)
        draw.text((x + 12, y + 10), label, font=label_font, fill=(241, 245, 255, 255))
        candidate = composite(layers, offsets)
        color = (245, 247, 252) if index % 2 == 0 else (24, 30, 43)
        scene = flatten(candidate, color).crop((110, 10, 1010, 1024))
        sheet.alpha_composite(fit(scene, panel), (x, y + header))
    sheet.convert("RGB").save(DEBUG / "candidate-motion-stress.png", optimize=True)


def write_seam_audit(layers: dict[str, Image.Image]) -> None:
    rows = [
        (
            "上下后发接缝",
            (440, 455, 860, 705),
            {
                "head-front-complete": (4, -2),
                "hair-back-complete": (-3, 2),
                "ahoge-complete": (2, -3),
            },
        ),
        (
            "双臂肩根",
            (150, 430, 680, 735),
            {"arm-far-complete": (-6, 3), "arm-near-complete": (6, -3)},
        ),
        (
            "裙下双腿与鲸尾根",
            (170, 590, 990, 1024),
            {
                "leg-far-complete": (-6, 5),
                "leg-near-complete": (7, 4),
                "tail-complete": (8, -2),
            },
        ),
    ]
    panel = (360, 320)
    header = 52
    sheet = Image.new("RGBA", (panel[0] * 4, (panel[1] + header) * len(rows)), (17, 21, 31, 255))
    draw = ImageDraw.Draw(sheet)
    label_font = font(23)
    standard = composite(layers)
    for row_index, (label, box, offsets) in enumerate(rows):
        y = row_index * (panel[1] + header)
        draw.text(
            (12, y + 9),
            f"{label}：标准浅底 / 错位浅底 / 标准深底 / 错位深底",
            font=label_font,
            fill=(241, 245, 255, 255),
        )
        stressed = composite(layers, offsets)
        views = (
            flatten(standard, (245, 247, 252)).crop(box),
            flatten(stressed, (245, 247, 252)).crop(box),
            flatten(standard, (24, 30, 43)).crop(box),
            flatten(stressed, (24, 30, 43)).crop(box),
        )
        for column, view in enumerate(views):
            sheet.alpha_composite(fit(view, panel), (column * panel[0], y + header))
    sheet.convert("RGB").save(DEBUG / "candidate-seam-audit.png", optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    DEBUG.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    layers: dict[str, Image.Image] = {}
    report_assets: dict[str, dict] = {}
    for name, (source_name, _) in ASSETS.items():
        source_path = SOURCE / source_name
        normalized, details = sanitize_rgba(Image.open(source_path))
        post_transform = POST_TRANSFORMS.get(name)
        if post_transform is not None:
            normalized = apply_post_transform(normalized, post_transform)
            transformed = np.asarray(normalized, dtype=np.uint8)
            details["postTransform"] = post_transform
            details["outputBboxAfterPostTransform"] = alpha_bbox(transformed[:, :, 3])
        output_path = OUTPUT / f"{name}.png"
        normalized.save(output_path, optimize=True)
        layers[name] = normalized
        report_assets[name] = {
            "source": source_path.relative_to(PACK).as_posix(),
            "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
            "output": output_path.relative_to(PACK).as_posix(),
            **details,
        }

    candidate = composite(layers)
    candidate.save(DEBUG / "candidate-reconstruction.png", optimize=True)
    write_overview(layers)
    write_comparison(candidate)
    write_motion_stress(layers)
    write_seam_audit(layers)

    report = {
        "schemaVersion": 1,
        "kind": "user-updated-v1-candidate",
        "active": False,
        "formalV1Untouched": True,
        "canvasSize": [1024, 1024],
        "sourceCanvasSize": [1254, 1254],
        "scale": 1024 / 1254,
        "assets": report_assets,
        "zOrderBackToFront": ORDER,
        "optionalJointFills": ["arm-near-root"],
        "ignoredDuplicate": "The eleventh supplied image was byte-identical to leg-near.png.",
        "status": "VISUAL_REVIEW_REQUIRED",
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
