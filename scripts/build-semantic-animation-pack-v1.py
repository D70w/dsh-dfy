#!/usr/bin/env python3
"""Assemble complete semantic animation assets and render a bind-pose audit."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
TEXTURES = PACK / "textures"
OUTPUT = TEXTURES / "animation-v1"
DEBUG = PACK / "debug" / "animation-v1"
REPORT = PACK / "reports" / "animation-assets-v1.json"
MASTER = PACK / "source" / "whale-maid-master-1024.png"
VISIBLE_WORK = PACK / "source" / "animation-assets-v1" / "visible"
DRESS_VISIBLE = PACK / "source" / "ai-completion" / "torso-dress-v4" / "dress-visible-exact.png"

LABELS = {
    "hair-back-complete": "后发",
    "tail-complete": "鲸尾",
    "leg-far-complete": "远侧腿",
    "leg-near-complete": "近侧腿",
    "arm-far-complete": "远侧手臂",
    "arm-near-root": "近侧隐藏肩根",
    "arm-near-complete": "近侧手臂",
    "dress-complete": "完整连衣裙",
    "head-front-complete": "头部与前发",
    "ahoge-complete": "呆毛",
}


def composite(paths: list[Path]) -> Image.Image:
    result = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    for path in paths:
        result.alpha_composite(Image.open(path).convert("RGBA"))
    return result


def save_complete(name: str, paths: list[Path]) -> Path:
    path = OUTPUT / f"{name}.png"
    composite(paths).save(path, optimize=True)
    return path


def restore_exact_visible(
    asset_path: Path,
    visible_paths: list[Path],
    master: Image.Image,
) -> None:
    """Copy each visible master pixel once, avoiding doubled AA outlines."""

    asset = np.asarray(Image.open(asset_path).convert("RGBA"), dtype=np.uint8).copy()
    master_array = np.asarray(master.convert("RGBA"), dtype=np.uint8)
    visible = np.zeros(asset.shape[:2], dtype=bool)
    for path in visible_paths:
        visible |= np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[:, :, 3] > 0
    visible &= master_array[:, :, 3] > 0
    asset[visible] = master_array[visible]
    asset[asset[:, :, 3] == 0, :3] = 0
    Image.fromarray(asset, "RGBA").save(asset_path, optimize=True)


def compose_root_completion(
    asset_path: Path,
    visible_paths: list[Path],
    master: Image.Image,
    root_box: tuple[int, int, int, int],
) -> None:
    """Keep AI pixels only at a joint root; restore the rest from the master."""

    asset = np.asarray(Image.open(asset_path).convert("RGBA"), dtype=np.uint8).copy()
    master_array = np.asarray(master.convert("RGBA"), dtype=np.uint8)
    visible = np.zeros(asset.shape[:2], dtype=bool)
    for path in visible_paths:
        visible |= np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[:, :, 3] > 0
    root_mask = Image.new("L", (asset.shape[1], asset.shape[0]), 0)
    ImageDraw.Draw(root_mask).ellipse(root_box, fill=255)
    root_mask = root_mask.filter(ImageFilter.GaussianBlur(radius=4.0))
    weight = np.asarray(root_mask, dtype=np.float32)[:, :, None] / 255.0

    candidate_alpha = asset[:, :, 3:4].astype(np.float32) / 255.0
    master_alpha = master_array[:, :, 3:4].astype(np.float32) / 255.0
    candidate_rgb = asset[:, :, :3].astype(np.float32)
    master_rgb = master_array[:, :, :3].astype(np.float32)
    visible_3d = visible[:, :, None]

    # Visible arm pixels crossfade from generated root to exact mother-image
    # art. Hidden cap pixels fade with the same soft ellipse.
    final_alpha = np.where(
        visible_3d,
        candidate_alpha * weight + master_alpha * (1.0 - weight),
        candidate_alpha * weight,
    )
    final_premultiplied = np.where(
        visible_3d,
        candidate_rgb * candidate_alpha * weight
        + master_rgb * master_alpha * (1.0 - weight),
        candidate_rgb * candidate_alpha * weight,
    )
    final_rgb = np.divide(
        final_premultiplied,
        np.maximum(final_alpha, 1 / 255),
        out=np.zeros_like(final_premultiplied),
        where=final_alpha > 1 / 255,
    )
    result = np.concatenate([final_rgb, final_alpha * 255], axis=2)
    result = np.clip(result, 0, 255).astype(np.uint8)
    result[result[:, :, 3] == 0, :3] = 0
    Image.fromarray(result, "RGBA").save(asset_path, optimize=True)


def extend_hidden_root(
    asset_path: Path,
    ellipse: tuple[int, int, int, int],
) -> None:
    """Add a rounded, normally occluded joint cap using nearest asset color."""

    image = Image.open(asset_path).convert("RGBA")
    rgba = np.asarray(image, dtype=np.uint8).copy()
    scale = 4
    root = Image.new("L", (image.width * scale, image.height * scale), 0)
    draw = ImageDraw.Draw(root)
    draw.ellipse(tuple(value * scale for value in ellipse), fill=255)
    root_alpha = np.asarray(root.resize(image.size, Image.Resampling.LANCZOS), dtype=np.uint8)
    existing = rgba[:, :, 3] > 8
    addition = (root_alpha > 0) & ~existing
    if not np.any(addition):
        return
    _, nearest = ndimage.distance_transform_edt(~existing, return_indices=True)
    rgba[addition, :3] = rgba[nearest[0][addition], nearest[1][addition], :3]
    rgba[addition, 3] = root_alpha[addition]
    Image.fromarray(rgba, "RGBA").save(asset_path, optimize=True)


def feather_hidden_completion(
    asset_path: Path,
    visible_paths: list[Path],
    master: Image.Image,
    band: float,
) -> None:
    """Blend completion colors into exact visible colors without moving edges."""

    rgba = np.asarray(Image.open(asset_path).convert("RGBA"), dtype=np.uint8).copy()
    master_array = np.asarray(master.convert("RGBA"), dtype=np.uint8)
    visible = np.zeros(rgba.shape[:2], dtype=bool)
    for path in visible_paths:
        visible |= np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[:, :, 3] > 0
    visible &= master_array[:, :, 3] > 0
    hidden = (rgba[:, :, 3] > 0) & ~visible
    if not np.any(hidden) or not np.any(visible):
        return
    distance, nearest = ndimage.distance_transform_edt(~visible, return_indices=True)
    weight = np.clip(1.0 - distance / max(1.0, band), 0.0, 1.0)
    weight = np.where(hidden, weight, 0.0)[:, :, None]
    nearest_rgb = master_array[nearest[0], nearest[1], :3].astype(np.float32)
    current_rgb = rgba[:, :, :3].astype(np.float32)
    rgba[:, :, :3] = np.clip(current_rgb * (1.0 - weight) + nearest_rgb * weight, 0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(asset_path, optimize=True)


def clean_disconnected_debris(
    image: Image.Image,
    *,
    minimum_override: int | None = None,
) -> tuple[Image.Image, dict[str, int]]:
    """Remove only disconnected specks; preserve the main anti-aliased edge.

    Generated and polygon-cut assets occasionally contain isolated outline
    pixels or tiny fragments from a neighbouring semantic part.  The cutoff is
    relative to the largest component so it is safe for both a small ahoge and
    a large dress.  Tail root completion intentionally consists of two useful
    components, so any substantial secondary component remains intact.
    """

    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[:, :, 3]
    labels, count = ndimage.label(alpha > 0)
    if count == 0:
        return Image.fromarray(rgba, "RGBA"), {
            "componentCountBefore": 0,
            "componentCountAfter": 0,
            "removedPixels": 0,
        }

    core_sizes = np.bincount(labels[alpha > 8], minlength=count + 1)
    largest = int(core_sizes[1:].max(initial=0))
    minimum = minimum_override if minimum_override is not None else max(24, int(round(largest * 0.005)))
    keep_ids = np.flatnonzero(core_sizes >= minimum)
    keep_ids = keep_ids[keep_ids != 0]
    keep = np.isin(labels, keep_ids)
    removed = (alpha > 0) & ~keep
    rgba[removed] = 0
    rgba[rgba[:, :, 3] == 0, :3] = 0

    return Image.fromarray(rgba, "RGBA"), {
        "componentCountBefore": int(count),
        "componentCountAfter": int(len(keep_ids)),
        "removedPixels": int(np.count_nonzero(removed)),
    }


def checker(size: tuple[int, int], cell: int = 18) -> Image.Image:
    width, height = size
    rows, columns = np.indices((height, width))
    tiles = ((rows // cell + columns // cell) % 2)[:, :, None]
    light = np.where(tiles, np.array([235, 239, 247]), np.array([206, 214, 228]))
    dark = np.where(tiles, np.array([55, 64, 82]), np.array([34, 40, 54]))
    rgb = np.where((columns < width // 2)[:, :, None], light, dark).astype(np.uint8)
    return Image.fromarray(rgb, "RGB").convert("RGBA")


def load_label_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def write_asset_overview(assets: dict[str, Path]) -> None:
    columns = 5
    panel_width, panel_height = 360, 360
    rows = (len(assets) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * panel_width, rows * panel_height), (19, 24, 35, 255))
    title_font = load_label_font(24)
    meta_font = load_label_font(16)

    for index, (name, path) in enumerate(assets.items()):
        x = (index % columns) * panel_width
        y = (index // columns) * panel_height
        panel = checker((panel_width - 20, panel_height - 62))
        image = Image.open(path).convert("RGBA")
        bbox = image.getchannel("A").getbbox()
        if bbox:
            crop = image.crop(bbox)
            crop.thumbnail((panel_width - 54, panel_height - 96), Image.Resampling.LANCZOS)
            panel.alpha_composite(crop, ((panel.width - crop.width) // 2, (panel.height - crop.height) // 2))
        sheet.alpha_composite(panel, (x + 10, y + 52))
        draw = ImageDraw.Draw(sheet)
        draw.text((x + 14, y + 10), LABELS[name], font=title_font, fill=(241, 245, 255, 255))
        draw.text((x + 14, y + 330), "透明底 · 原画布坐标", font=meta_font, fill=(159, 174, 201, 255))

    sheet.convert("RGB").save(DEBUG / "semantic-assets-overview.png", optimize=True)


def build_joint_underlay(dress_path: Path, occluder_paths: list[Path], output: Path) -> None:
    """Build dress-colored socket fills without reusing old limb/tail pixels."""

    dress = np.asarray(Image.open(dress_path).convert("RGBA"), dtype=np.uint8)
    dress_mask = dress[:, :, 3] > 8
    expanded = ndimage.binary_dilation(dress_mask, iterations=12)
    ring = expanded & ~dress_mask
    occluders = np.zeros(dress_mask.shape, dtype=bool)
    for path in occluder_paths:
        occluders |= np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[:, :, 3] > 8
    occluders = ndimage.binary_dilation(occluders, iterations=2)
    ring &= occluders

    result = np.zeros_like(dress)
    if np.any(ring):
        distance, nearest = ndimage.distance_transform_edt(~dress_mask, return_indices=True)
        result[ring, :3] = dress[nearest[0][ring], nearest[1][ring], :3]
        result[ring, 3] = np.clip(255 - distance[ring] * 8, 150, 255).astype(np.uint8)
    Image.fromarray(result, "RGBA").save(output, optimize=True)


def extract_soft_root(
    source: Path,
    output: Path,
    root_box: tuple[int, int, int, int],
) -> None:
    image = np.asarray(Image.open(source).convert("RGBA"), dtype=np.uint8)
    mask = Image.new("L", (image.shape[1], image.shape[0]), 0)
    ImageDraw.Draw(mask).ellipse(root_box, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=2.0))
    weight = np.asarray(mask, dtype=np.float32) / 255.0
    result = image.copy()
    result[:, :, 3] = np.round(result[:, :, 3].astype(np.float32) * weight).astype(np.uint8)
    result[result[:, :, 3] == 0, :3] = 0
    Image.fromarray(result, "RGBA").save(output, optimize=True)


def remove_far_arm_hair_contamination(path: Path) -> None:
    rgba = np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8).copy()
    rows, columns = np.indices(rgba.shape[:2])
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    cyan = (
        (rgba[:, :, 3] > 8)
        & (columns >= 250)
        & (columns < 284)
        & (rows >= 518)
        & (rows < 556)
        & (blue > red + 50)
        & (green > red + 25)
        & (green > 105)
    )
    labels, count = ndimage.label(cyan)
    for component in range(1, count + 1):
        component_mask = labels == component
        if np.count_nonzero(component_mask) >= 40:
            rgba[ndimage.binary_dilation(component_mask, iterations=1)] = 0
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)


def clean_thin_root_spurs(
    path: Path,
    box: tuple[int, int, int, int],
) -> None:
    """Remove one-pixel hair/outline arcs attached to a generated joint cap."""

    rgba = np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[:, :, 3]
    mask = alpha > 0
    x0, y0, x1, y1 = box
    local = mask[y0:y1, x0:x1]
    structure = ndimage.generate_binary_structure(2, 1)
    opened = ndimage.binary_opening(local, structure=structure, iterations=2)
    restored_edge = ndimage.binary_dilation(opened, structure=structure, iterations=1) & local
    removed = local & ~restored_edge
    rgba[y0:y1, x0:x1][removed] = 0
    rgba[rgba[:, :, 3] == 0, :3] = 0
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    DEBUG.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    master = Image.open(MASTER).convert("RGBA")

    assets: dict[str, Path] = {}
    assets["hair-back-complete"] = OUTPUT / "hair-back-complete.png"
    assets["tail-complete"] = OUTPUT / "tail-complete.png"
    shutil.copy2(OUTPUT / "hair-back-complete-v6.png", assets["hair-back-complete"])
    # v3 has a continuous hidden root.  v4 matched the visible silhouette a
    # little more closely but split that root into a floating island, which can
    # flash during a wide tail swing.
    shutil.copy2(OUTPUT / "tail-complete-v5.png", assets["tail-complete"])
    assets["leg-far-complete"] = OUTPUT / "leg-far-complete.png"
    assets["leg-near-complete"] = OUTPUT / "leg-near-complete.png"
    shutil.copy2(OUTPUT / "leg-far-complete-v3.png", assets["leg-far-complete"])
    shutil.copy2(OUTPUT / "leg-near-complete-v3.png", assets["leg-near-complete"])
    assets["arm-far-complete"] = OUTPUT / "arm-far-complete.png"
    assets["arm-near-root"] = OUTPUT / "arm-near-root.png"
    assets["arm-near-complete"] = OUTPUT / "arm-near-complete.png"
    shutil.copy2(OUTPUT / "arm-far-complete-v5.png", assets["arm-far-complete"])
    shutil.copy2(OUTPUT / "arm-near-complete-v2.png", assets["arm-near-complete"])
    extract_soft_root(
        OUTPUT / "arm-near-complete-v3.png",
        assets["arm-near-root"],
        (440, 490, 505, 555),
    )
    assets["dress-complete"] = OUTPUT / "dress-complete.png"
    shutil.copy2(TEXTURES / "dress-complete-v2.png", assets["dress-complete"])

    # The old head polygon accidentally owned collar and sleeve pixels.  Remove
    # every pixel already owned by the semantic dress/arm layers; keep the
    # original face, front hair, head cap, headwear and side locks untouched.
    head = composite([TEXTURES / "head-underlay.png", TEXTURES / "head.png"])
    rows, columns = np.indices((1024, 1024))
    hair_back = np.asarray(
        Image.open(assets["hair-back-complete"]).convert("RGBA"),
        dtype=np.uint8,
    ).copy()
    master_array = np.asarray(master, dtype=np.uint8)
    # The original head polygon ended in a straight diagonal across the rear
    # hair.  Transfer the upper back-hair/root into the head layer, and leave a
    # 15 px concealed overlap before the lower hair becomes independently
    # deformable.  This produces a complete head silhouette without carrying
    # the entire trailing hair mass twice.
    transfer_mask = (hair_back[:, :, 3] > 0) & (rows < 545)
    transfer = np.zeros_like(hair_back)
    transfer[transfer_mask] = hair_back[transfer_mask]
    exact_transfer = transfer_mask & (master_array[:, :, 3] > 0)
    transfer[exact_transfer] = master_array[exact_transfer]
    head_fade = np.clip((545.0 - rows) / 10.0, 0.0, 1.0)
    transfer[:, :, 3] = np.round(
        transfer[:, :, 3].astype(np.float32) * head_fade,
    ).astype(np.uint8)
    transfer[transfer[:, :, 3] == 0, :3] = 0
    transferred_head = Image.fromarray(transfer, "RGBA")
    transferred_head.alpha_composite(head)
    head = transferred_head
    hair_back_remove_mask = transfer_mask & (rows < 525)
    head_array = np.asarray(head, dtype=np.uint8).copy()
    exclusions = np.zeros((1024, 1024), dtype=bool)
    for path in (
        DRESS_VISIBLE,
        VISIBLE_WORK / "arm-near-visible-exact.png",
        VISIBLE_WORK / "arm-far-visible-exact.png",
    ):
        exclusions |= np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[:, :, 3] > 0
    head_array[exclusions] = 0

    assets["head-front-complete"] = OUTPUT / "head-front-complete.png"
    Image.fromarray(head_array, "RGBA").save(assets["head-front-complete"], optimize=True)

    assets["ahoge-complete"] = OUTPUT / "ahoge-complete.png"
    shutil.copy2(VISIBLE_WORK / "ahoge-visible-exact.png", assets["ahoge-complete"])

    # Every visible bind-pose pixel comes from the approved mother image once.
    # AI/deterministic completion remains only in the normally occluded roots.
    visible_sources = {
        "hair-back-complete": [VISIBLE_WORK / "hair-back-visible-exact.png"],
        "dress-complete": [DRESS_VISIBLE],
        "arm-near-complete": [
            TEXTURES / "upper-arm-near.png",
            TEXTURES / "forearm-near-clean.png",
        ],
        "ahoge-complete": [VISIBLE_WORK / "ahoge-visible-exact.png"],
    }
    for name, paths in visible_sources.items():
        restore_exact_visible(assets[name], paths, master)

    # Apply the upper/lower back-hair ownership split after visible restoration
    # so the master-pixel restore cannot accidentally recreate the duplicate.
    hair_back_result = np.asarray(
        Image.open(assets["hair-back-complete"]).convert("RGBA"),
        dtype=np.uint8,
    ).copy()
    hair_back_result[hair_back_remove_mask] = 0
    hair_fade = np.clip((rows - 525.0) / 10.0, 0.0, 1.0)
    hair_fade_zone = transfer_mask & (rows >= 525) & (rows < 535)
    hair_back_result[hair_fade_zone, 3] = np.round(
        hair_back_result[hair_fade_zone, 3].astype(np.float32)
        * hair_fade[hair_fade_zone],
    ).astype(np.uint8)
    hair_back_result[hair_back_result[:, :, 3] == 0, :3] = 0
    Image.fromarray(hair_back_result, "RGBA").save(
        assets["hair-back-complete"],
        optimize=True,
    )

    compose_root_completion(
        assets["arm-far-complete"],
        [TEXTURES / "upper-arm-far.png", TEXTURES / "forearm-far.png"],
        master,
        (270, 500, 332, 560),
    )
    remove_far_arm_hair_contamination(assets["arm-far-complete"])
    clean_thin_root_spurs(assets["arm-far-complete"], (235, 510, 310, 590))

    # The cleaned head mask itself is the ownership mask; restore its visible
    # pixels from the mother image after transferring collar fragments.
    head_visible = np.asarray(Image.open(assets["head-front-complete"]).convert("RGBA"), dtype=np.uint8)
    head_result = head_visible.copy()
    head_mask = (head_visible[:, :, 3] > 0) & (master_array[:, :, 3] > 0)
    head_result[head_mask] = master_array[head_mask]
    Image.fromarray(head_result, "RGBA").save(assets["head-front-complete"], optimize=True)

    cleanup: dict[str, dict[str, int]] = {}
    for name, path in assets.items():
        cleaned, details = clean_disconnected_debris(
            Image.open(path),
        )
        cleaned.save(path, optimize=True)
        cleanup[name] = details

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
    reconstruction = composite([assets[name] for name in order])
    reconstruction.save(DEBUG / "semantic-reconstruction.png", optimize=True)
    write_asset_overview(assets)

    difference = ImageChops.difference(master, reconstruction)
    difference.save(DEBUG / "semantic-reconstruction-diff.png", optimize=True)
    master_array = np.asarray(master, dtype=np.uint8)
    reconstruction_array = np.asarray(reconstruction, dtype=np.uint8)
    changed = np.any(np.abs(master_array.astype(np.int16) - reconstruction_array.astype(np.int16)) > 8, axis=2)
    visible_master = master_array[:, :, 3] > 8

    comparison = Image.new("RGBA", (2048, 1024), (26, 31, 43, 255))
    comparison.alpha_composite(master, (0, 0))
    comparison.alpha_composite(reconstruction, (1024, 0))
    comparison.convert("RGB").save(DEBUG / "semantic-master-vs-reconstruction.png", optimize=True)

    report = {
        "schemaVersion": 1,
        "kind": "complete-semantic-animation-assets",
        "canvasSize": [1024, 1024],
        "assets": {name: path.relative_to(PACK).as_posix() for name, path in assets.items()},
        "zOrderBackToFront": order,
        "optionalJointFills": ["arm-near-root"],
        "changedVisibleMasterPixels": int(np.count_nonzero(changed & visible_master)),
        "changedVisibleMasterRatio": float(np.count_nonzero(changed & visible_master) / max(1, np.count_nonzero(visible_master))),
        "cleanup": cleanup,
        "visualChecks": {
            "transparentCanvas": "PASS",
            "disconnectedDebris": "PASS",
            "bindPoseAssembly": "REVIEW_REQUIRED",
            "edgeQuality": "REVIEW_REQUIRED",
            "motionStress": "REVIEW_REQUIRED",
        },
        "status": "VISUAL_REVIEW_REQUIRED",
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
