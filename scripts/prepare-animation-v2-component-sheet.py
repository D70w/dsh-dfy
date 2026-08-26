#!/usr/bin/env python3
"""Extract, clean and assemble the approved animation-v2 component sheet."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "component-sheet-v2"
SOURCE = PACK / "source" / "component-sheet-original.png"
TRIMMED = PACK / "trimmed"
TEXTURES = PACK / "textures"
DEBUG = PACK / "debug"
REPORT = PACK / "report.json"
CURRENT_RECONSTRUCTION = (
    ROOT
    / "character-packs"
    / "default-whale"
    / "source"
    / "bind-pose-v3"
    / "debug"
    / "animation-v1"
    / "semantic-reconstruction.png"
)


COMPONENTS = {
    "face-base": {
        "label": "脸与基础头部",
        "roi": (25, 115, 340, 470),
        "position": (222, 181),
        "scale": (0.98, 0.98),
    },
    "hair-front": {
        "label": "前发与头饰",
        "roi": (395, 0, 860, 490),
        "position": (174, 75),
        "scale": (0.98, 0.98),
    },
    "hair-back": {
        "label": "后发",
        "roi": (910, 20, 1448, 570),
        "position": (320, 95),
        "scale": (0.98, 0.98),
    },
    "dress-body": {
        "label": "完整连衣裙",
        "roi": (0, 465, 510, 950),
        "position": (202, 438),
        "scale": (0.96, 0.96),
    },
    "arm-far": {
        "label": "远侧手臂",
        "roi": (410, 500, 700, 770),
        "position": (190, 525),
        "scale": (0.78, 0.78),
    },
    "arm-near": {
        "label": "近侧手臂",
        "roi": (720, 500, 1010, 775),
        "position": (444, 510),
        "scale": (0.90, 0.90),
    },
    "leg-far": {
        "label": "远侧腿",
        "roi": (490, 750, 700, 1086),
        "position": (282, 750),
        "scale": (0.95, 0.95),
    },
    "leg-near": {
        "label": "近侧腿",
        "roi": (720, 750, 930, 1086),
        "position": (398, 755),
        "scale": (0.95, 0.95),
    },
    "tail": {
        "label": "鲸尾",
        "roi": (950, 555, 1448, 940),
        "position": (555, 551),
        "scale": (0.945, 0.945),
    },
}

ORDER = [
    "hair-back",
    "tail",
    "leg-far",
    "leg-near",
    "arm-far",
    "dress-body",
    "arm-near",
    "face-base",
    "hair-front",
]


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (Path("C:/Windows/Fonts/msyh.ttc"), Path("C:/Windows/Fonts/simhei.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def largest_component(mask: np.ndarray) -> tuple[np.ndarray, int, int]:
    labels, count = ndimage.label(mask)
    if count == 0:
        raise RuntimeError("Component ROI is empty")
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    selected = int(np.argmax(sizes))
    return labels == selected, count, int(sizes[selected])


def clean_component(source: np.ndarray, roi: tuple[int, int, int, int]) -> tuple[Image.Image, dict]:
    x0, y0, x1, y1 = roi
    crop = source[y0:y1, x0:x1].copy()
    raw_mask = crop[:, :, 3] > 8
    mask, component_count, selected_pixels = largest_component(raw_mask)

    # Fill only pinholes. Large intentional openings, such as the face opening
    # in the front hair, remain transparent.
    holes = ndimage.binary_fill_holes(mask) & ~mask
    hole_labels, hole_count = ndimage.label(holes)
    if hole_count:
        hole_sizes = np.bincount(hole_labels.ravel())
        fill_ids = np.flatnonzero((hole_sizes > 0) & (hole_sizes <= 16))
        fill_ids = fill_ids[fill_ids != 0]
        mask |= np.isin(hole_labels, fill_ids)

    rows, columns = np.nonzero(mask)
    bx0 = max(0, int(columns.min()) - 5)
    by0 = max(0, int(rows.min()) - 5)
    bx1 = min(crop.shape[1], int(columns.max()) + 6)
    by1 = min(crop.shape[0], int(rows.max()) + 6)
    crop = crop[by0:by1, bx0:bx1]
    mask = mask[by0:by1, bx0:bx1]

    # Rebuild alpha from the silhouette because the supplied sheet has almost
    # no fully opaque pixels. Supersampling keeps one clean antialiased edge.
    binary = Image.fromarray((mask.astype(np.uint8) * 255), "L")
    high = binary.resize((binary.width * 4, binary.height * 4), Image.Resampling.NEAREST)
    high = high.filter(ImageFilter.GaussianBlur(radius=1.15))
    clean_alpha = np.asarray(
        high.resize(binary.size, Image.Resampling.LANCZOS),
        dtype=np.uint8,
    ).copy()
    clean_alpha[mask & (ndimage.distance_transform_edt(mask) >= 2.0)] = 255

    # Remove cyan/magenta matte contamination by borrowing RGB from the nearest
    # stable interior pixel while retaining the newly antialiased silhouette.
    interior = mask & (ndimage.distance_transform_edt(mask) >= 3.0)
    if not np.any(interior):
        interior = mask
    _, nearest = ndimage.distance_transform_edt(~interior, return_indices=True)
    edge = (clean_alpha > 0) & ~interior
    crop[edge, :3] = crop[nearest[0][edge], nearest[1][edge], :3]
    crop[:, :, 3] = clean_alpha
    crop[clean_alpha == 0, :3] = 0

    result = Image.fromarray(crop, "RGBA")
    details = {
        "sourceRoi": list(roi),
        "sourceLocalBbox": [bx0, by0, bx1, by1],
        "roiComponentCount": component_count,
        "selectedPixels": selected_pixels,
        "trimmedSize": list(result.size),
        "opaquePixels": int(np.count_nonzero(clean_alpha == 255)),
        "partialPixels": int(np.count_nonzero((clean_alpha > 0) & (clean_alpha < 255))),
    }
    return result, details


def place_on_canvas(image: Image.Image, config: dict) -> Image.Image:
    sx, sy = config["scale"]
    resized = image.resize(
        (
            max(1, int(round(image.width * sx))),
            max(1, int(round(image.height * sy))),
        ),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    canvas.alpha_composite(resized, tuple(config["position"]))
    return canvas


def checker(size: tuple[int, int], cell: int = 18) -> Image.Image:
    width, height = size
    rows, columns = np.indices((height, width))
    tiles = ((rows // cell + columns // cell) % 2)[:, :, None]
    light = np.where(tiles, np.array([238, 242, 250]), np.array([211, 219, 232]))
    dark = np.where(tiles, np.array([53, 63, 82]), np.array([31, 38, 52]))
    rgb = np.where((columns < width // 2)[:, :, None], light, dark).astype(np.uint8)
    return Image.fromarray(rgb, "RGB").convert("RGBA")


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    result = Image.new("RGBA", size, (17, 21, 31, 255))
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    result.alpha_composite(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return result


def write_overview(trimmed: dict[str, Image.Image]) -> None:
    panel_width, panel_height = 400, 400
    columns = 3
    rows = 3
    sheet = Image.new("RGBA", (panel_width * columns, panel_height * rows), (17, 21, 31, 255))
    title_font = font(23)
    for index, name in enumerate(ORDER):
        x = (index % columns) * panel_width
        y = (index // columns) * panel_height
        area = checker((panel_width - 20, panel_height - 62))
        part = trimmed[name].copy()
        part.thumbnail((area.width - 34, area.height - 34), Image.Resampling.LANCZOS)
        area.alpha_composite(part, ((area.width - part.width) // 2, (area.height - part.height) // 2))
        sheet.alpha_composite(area, (x + 10, y + 52))
        ImageDraw.Draw(sheet).text(
            (x + 14, y + 10),
            COMPONENTS[name]["label"],
            font=title_font,
            fill=(241, 245, 255, 255),
        )
    sheet.convert("RGB").save(DEBUG / "component-overview.png", optimize=True)


def write_assembly_debug(assembly: Image.Image) -> None:
    panel = (720, 720)
    sheet = Image.new("RGBA", (panel[0] * 2, panel[1]), (17, 21, 31, 255))
    for column, background in enumerate(((245, 247, 252), (24, 30, 43))):
        flattened = Image.new("RGBA", assembly.size, (*background, 255))
        flattened.alpha_composite(assembly)
        crop = flattened.crop((125, 20, 1010, 1024))
        sheet.alpha_composite(fit(crop, panel), (column * panel[0], 0))
    sheet.convert("RGB").save(DEBUG / "static-assembly-light-dark.png", optimize=True)

    if CURRENT_RECONSTRUCTION.exists():
        current = Image.open(CURRENT_RECONSTRUCTION).convert("RGBA")
        comparison = Image.new("RGBA", (2048, 1024), (24, 30, 43, 255))
        comparison.alpha_composite(current, (0, 0))
        comparison.alpha_composite(assembly, (1024, 0))
        draw = ImageDraw.Draw(comparison)
        label_font = font(26)
        draw.text((18, 18), "当前 animation-v1", font=label_font, fill=(245, 248, 255, 255))
        draw.text((1042, 18), "新组件 animation-v2 初始重组", font=label_font, fill=(245, 248, 255, 255))
        comparison.convert("RGB").save(DEBUG / "v1-vs-v2-assembly.png", optimize=True)


def translate(image: Image.Image, dx: int, dy: int) -> Image.Image:
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.alpha_composite(image, (dx, dy))
    return result


def write_motion_stress_debug(layers: dict[str, Image.Image]) -> None:
    cases = [
        ("标准装配", {}),
        (
            "头部与后发小幅错位",
            {"face-base": (2, 1), "hair-front": (3, -2), "hair-back": (-3, 2)},
        ),
        (
            "双臂肩根错位",
            {"arm-far": (-6, 3), "arm-near": (6, -3)},
        ),
        (
            "腿与鲸尾根部错位",
            {"leg-far": (-6, 5), "leg-near": (7, 4), "tail": (8, -2)},
        ),
    ]
    panel = (620, 720)
    header = 54
    sheet = Image.new("RGBA", (panel[0] * 2, (panel[1] + header) * 2), (17, 21, 31, 255))
    draw = ImageDraw.Draw(sheet)
    label_font = font(24)
    for index, (label, offsets) in enumerate(cases):
        x = (index % 2) * panel[0]
        y = (index // 2) * (panel[1] + header)
        draw.text((x + 12, y + 10), label, font=label_font, fill=(241, 245, 255, 255))
        assembly = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        for name in ORDER:
            dx, dy = offsets.get(name, (0, 0))
            assembly.alpha_composite(translate(layers[name], dx, dy))
        background = (245, 247, 252) if index % 2 == 0 else (24, 30, 43)
        flattened = Image.new("RGBA", assembly.size, (*background, 255))
        flattened.alpha_composite(assembly)
        crop = flattened.crop((125, 20, 1010, 1024))
        sheet.alpha_composite(fit(crop, panel), (x, y + header))
    sheet.convert("RGB").save(DEBUG / "motion-stress.png", optimize=True)


def main() -> None:
    TRIMMED.mkdir(parents=True, exist_ok=True)
    TEXTURES.mkdir(parents=True, exist_ok=True)
    DEBUG.mkdir(parents=True, exist_ok=True)
    source_image = Image.open(SOURCE).convert("RGBA")
    source = np.asarray(source_image, dtype=np.uint8)

    trimmed: dict[str, Image.Image] = {}
    layers: dict[str, Image.Image] = {}
    details: dict[str, dict] = {}
    for name, config in COMPONENTS.items():
        component, component_details = clean_component(source, tuple(config["roi"]))
        trimmed[name] = component
        component.save(TRIMMED / f"{name}.png", optimize=True)
        layer = place_on_canvas(component, config)
        layers[name] = layer
        layer.save(TEXTURES / f"{name}.png", optimize=True)
        details[name] = {
            **component_details,
            "position": list(config["position"]),
            "scale": list(config["scale"]),
        }

    assembly = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    for name in ORDER:
        assembly.alpha_composite(layers[name])
    assembly.save(DEBUG / "static-assembly.png", optimize=True)
    write_overview(trimmed)
    write_assembly_debug(assembly)
    write_motion_stress_debug(layers)

    original_alpha = source[:, :, 3]
    report = {
        "schemaVersion": 1,
        "kind": "animation-v2-component-sheet",
        "source": SOURCE.relative_to(PACK).as_posix(),
        "sourceSize": list(source_image.size),
        "sourceAlpha": {
            "opaquePixels": int(np.count_nonzero(original_alpha == 255)),
            "partialPixels": int(np.count_nonzero((original_alpha > 0) & (original_alpha < 255))),
            "transparentPixels": int(np.count_nonzero(original_alpha == 0)),
        },
        "components": details,
        "zOrderBackToFront": ORDER,
        "active": False,
        "rejectionReason": "User rejected the animation-v2 visual direction and requested animation-v1.",
        "status": "REJECTED_BY_USER",
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
