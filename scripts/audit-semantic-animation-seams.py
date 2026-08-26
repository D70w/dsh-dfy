#!/usr/bin/env python3
"""Render enlarged bind-pose seam crops for manual visual review."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
MASTER = PACK / "source" / "whale-maid-master-1024.png"
RECONSTRUCTION = PACK / "debug" / "animation-v1" / "semantic-reconstruction.png"
OUTPUT = PACK / "debug" / "animation-v1" / "semantic-seam-audit.png"
EDGE_OUTPUT = PACK / "debug" / "animation-v1" / "semantic-asset-edge-audit.png"
STRESS_OUTPUT = PACK / "debug" / "animation-v1" / "semantic-motion-stress-audit.png"

CROPS = [
    ("头颈与远侧肩", (220, 400, 430, 620)),
    ("近侧肩与袖根", (405, 440, 660, 715)),
    ("裙摆与鲸尾根", (500, 600, 760, 865)),
    ("裙摆与双腿", (245, 690, 550, 1018)),
]

EDGE_CROPS = [
    (
        "头部下缘与发束",
        PACK / "textures" / "animation-v1" / "head-front-complete.png",
        (180, 390, 680, 590),
    ),
    (
        "远侧手臂肩根",
        PACK / "textures" / "animation-v1" / "arm-far-complete.png",
        (235, 485, 355, 585),
    ),
    (
        "双腿轮廓与袜口",
        None,
        (250, 690, 550, 1024),
    ),
    (
        "裙摆与鲸尾根",
        PACK / "textures" / "animation-v1" / "tail-complete.png",
        (500, 600, 790, 880),
    ),
]


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (Path("C:/Windows/Fonts/msyh.ttc"), Path("C:/Windows/Fonts/simhei.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    result = Image.new("RGB", size, (26, 31, 43))
    copy = image.convert("RGB")
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    result.paste(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return result


def flatten_on(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    background = Image.new("RGBA", image.size, (*color, 255))
    background.alpha_composite(image)
    return background.convert("RGB")


def write_edge_audit(reconstruction: Image.Image) -> None:
    panel = (480, 360)
    header = 54
    sheet = Image.new(
        "RGB",
        (panel[0] * 3, (panel[1] + header) * len(EDGE_CROPS)),
        (17, 21, 31),
    )
    draw = ImageDraw.Draw(sheet)
    label_font = font(24)
    near_leg = Image.open(PACK / "textures" / "animation-v1" / "leg-near-complete.png").convert("RGBA")
    far_leg = Image.open(PACK / "textures" / "animation-v1" / "leg-far-complete.png").convert("RGBA")

    for row, (label, asset_path, box) in enumerate(EDGE_CROPS):
        y = row * (panel[1] + header)
        draw.text(
            (12, y + 10),
            f"{label}：单件浅底 / 单件深底 / 装配后",
            font=label_font,
            fill=(238, 243, 255),
        )
        if asset_path is None:
            asset = Image.new("RGBA", reconstruction.size, (0, 0, 0, 0))
            asset.alpha_composite(far_leg)
            asset.alpha_composite(near_leg)
        else:
            asset = Image.open(asset_path).convert("RGBA")
        asset_crop = asset.crop(box)
        reconstruction_crop = reconstruction.crop(box)
        views = (
            flatten_on(asset_crop, (245, 247, 252)),
            flatten_on(asset_crop, (25, 30, 43)),
            flatten_on(reconstruction_crop, (25, 30, 43)),
        )
        for column, image in enumerate(views):
            sheet.paste(fit(image, panel), (column * panel[0], y + header))

    EDGE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(EDGE_OUTPUT, optimize=True)
    print(EDGE_OUTPUT)


def translate(image: Image.Image, dx: int, dy: int) -> Image.Image:
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.alpha_composite(image, (dx, dy))
    return result


def write_motion_stress_audit() -> None:
    texture_root = PACK / "textures" / "animation-v1"
    order = [
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
    assets = {
        name: Image.open(texture_root / f"{name}.png").convert("RGBA")
        for name in order
    }
    cases = [
        ("标准装配", {}),
        (
            "头与后发反向位移",
            {"head-front-complete": (7, -4), "hair-back-complete": (-3, 2)},
        ),
        (
            "双臂根部位移",
            {"arm-far-complete": (-6, 3), "arm-near-complete": (6, -3)},
        ),
        (
            "腿与鲸尾根部位移",
            {
                "leg-far-complete": (-6, 5),
                "leg-near-complete": (7, 3),
                "tail-complete": (8, -2),
            },
        ),
    ]
    panel = (620, 720)
    header = 54
    sheet = Image.new("RGB", (panel[0] * 2, (panel[1] + header) * 2), (17, 21, 31))
    draw = ImageDraw.Draw(sheet)
    label_font = font(24)
    crop_box = (145, 45, 995, 1024)

    for index, (label, offsets) in enumerate(cases):
        x = (index % 2) * panel[0]
        y = (index // 2) * (panel[1] + header)
        draw.text((x + 12, y + 10), label, font=label_font, fill=(238, 243, 255))
        assembled = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        for name in order:
            dx, dy = offsets.get(name, (0, 0))
            assembled.alpha_composite(translate(assets[name], dx, dy))
        crop = assembled.crop(crop_box)
        background = (245, 247, 252) if index % 2 == 0 else (25, 30, 43)
        sheet.paste(fit(flatten_on(crop, background), panel), (x, y + header))

    STRESS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(STRESS_OUTPUT, optimize=True)
    print(STRESS_OUTPUT)


def main() -> None:
    master = Image.open(MASTER).convert("RGBA")
    reconstruction = Image.open(RECONSTRUCTION).convert("RGBA")
    panel = (420, 420)
    header = 54
    sheet = Image.new("RGB", (panel[0] * 3, (panel[1] + header) * len(CROPS)), (17, 21, 31))
    draw = ImageDraw.Draw(sheet)
    label_font = font(24)

    for row, (label, box) in enumerate(CROPS):
        y = row * (panel[1] + header)
        draw.text((12, y + 10), f"{label}：母图 / 重组 / 差异热区", font=label_font, fill=(238, 243, 255))
        master_crop = master.crop(box)
        reconstruction_crop = reconstruction.crop(box)
        difference = ImageChops.difference(master_crop, reconstruction_crop).convert("RGB")
        diff = np.asarray(difference, dtype=np.uint8)
        intensity = diff.max(axis=2)
        heat = np.zeros((*intensity.shape, 3), dtype=np.uint8)
        heat[:, :, 0] = np.clip(intensity * 2, 0, 255)
        heat[:, :, 1] = np.clip(intensity // 4, 0, 80)
        heat[:, :, 2] = np.clip(intensity // 8, 0, 40)
        heat_image = Image.fromarray(heat, "RGB")
        for column, image in enumerate((master_crop, reconstruction_crop, heat_image)):
            sheet.paste(fit(image, panel), (column * panel[0], y + header))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)
    write_edge_audit(reconstruction)
    write_motion_stress_audit()


if __name__ == "__main__":
    main()
