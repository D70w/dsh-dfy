#!/usr/bin/env python3
"""Prepare exact-visible semantic layers and conservative completion envelopes."""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
TEXTURES = PACK / "textures"
WORK = PACK / "source" / "animation-assets-v1"
VISIBLE = WORK / "visible"
TARGETS = WORK / "targets"
DRESS_VISIBLE = PACK / "source" / "ai-completion" / "torso-dress-v4" / "dress-visible-exact.png"
DRESS_TARGET = PACK / "source" / "ai-completion" / "torso-dress-v4" / "dress-complete-target-mask.png"
DRESS_COMPLETE = TEXTURES / "dress-complete-v2.png"


GROUPS = {
    "arm-near": ["upper-arm-near.png", "forearm-near-clean.png"],
    "arm-far": ["upper-arm-far.png", "forearm-far.png"],
    "leg-near": ["thigh-near.png", "calf-near.png", "foot-near.png"],
    "leg-far": ["thigh-far.png", "calf-far.png", "foot-far.png"],
    "tail": ["tail.png"],
    "hair-back": ["hair-back.png"],
    "ahoge": ["ahoge.png"],
}


ROOT_OVERLAPS = {
    "arm-near": (430, 480, 525, 575),
    "arm-far": (245, 490, 330, 580),
    "leg-near": (390, 785, 535, 880),
    "leg-far": (285, 785, 410, 880),
    "tail": (610, 710, 710, 835),
    "hair-back": (360, 140, 670, 590),
    "ahoge": (300, 55, 425, 135),
}


def composite(names: list[str]) -> Image.Image:
    output = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    for name in names:
        output.alpha_composite(Image.open(TEXTURES / name).convert("RGBA"))
    return output


def conservative_target(image: Image.Image, root_overlap: tuple[int, int, int, int]) -> Image.Image:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    mask = alpha > 0
    root = Image.new("L", image.size, 0)
    ImageDraw.Draw(root).ellipse(root_overlap, fill=255)
    root_mask = np.asarray(root, dtype=np.uint8) > 0
    support = mask | root_mask
    support = cv2.morphologyEx(
        support.astype(np.uint8) * 255,
        cv2.MORPH_CLOSE,
        np.ones((9, 9), dtype=np.uint8),
    )
    return Image.fromarray(support, "L")


def keep_blue_character_part(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    source = rgba[:, :, 3] > 0
    blue_core = source & (blue > red + 22) & (blue > green + 8)
    support = ndimage.binary_dilation(blue_core, iterations=3) & source
    labels, count = ndimage.label(support)
    if count:
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        support = labels == int(np.argmax(sizes))
    rgba[~support] = 0
    return Image.fromarray(rgba, "RGBA")


def main() -> None:
    VISIBLE.mkdir(parents=True, exist_ok=True)
    TARGETS.mkdir(parents=True, exist_ok=True)
    for asset_id, names in GROUPS.items():
        visible = composite(names)
        if asset_id in {"hair-back", "tail", "ahoge"}:
            visible = keep_blue_character_part(visible)
        if asset_id in {"hair-back", "tail"}:
            rgba = np.asarray(visible, dtype=np.uint8).copy()
            exclusions = np.asarray(Image.open(DRESS_VISIBLE).convert("RGBA"), dtype=np.uint8)[:, :, 3] > 0
            for arm_name in ("arm-near", "arm-far"):
                arm_path = VISIBLE / f"{arm_name}-visible-exact.png"
                if arm_path.exists():
                    exclusions |= np.asarray(Image.open(arm_path).convert("RGBA"), dtype=np.uint8)[:, :, 3] > 0
            rgba[exclusions] = 0
            if asset_id == "hair-back":
                # This polygon was owned by the old coarse hair polygon but is
                # visibly a navy/gold dress fragment.  Leave it transparent so
                # the registered clean-hair donor can supply the hidden root.
                rows, columns = np.indices(rgba.shape[:2])
                local = (rows >= 560) & (rows < 640) & (columns >= 550) & (columns < 610)
                red = rgba[:, :, 0].astype(np.int16)
                green = rgba[:, :, 1].astype(np.int16)
                blue = rgba[:, :, 2].astype(np.int16)
                non_hair = local & (rgba[:, :, 3] > 0) & ~((blue > red + 22) & (blue > green + 8))
                contamination = ndimage.binary_dilation(non_hair, iterations=2) & local
                rgba[contamination] = 0
            visible = Image.fromarray(rgba, "RGBA")
        visible.save(VISIBLE / f"{asset_id}-visible-exact.png", optimize=True)
        target = conservative_target(visible, ROOT_OVERLAPS[asset_id])
        if asset_id in {"arm-near", "arm-far", "tail", "hair-back"}:
            target_array = np.asarray(target, dtype=np.uint8) > 0
            visible_array = np.asarray(visible.getchannel("A"), dtype=np.uint8) > 0
            dress_occluder_path = DRESS_COMPLETE if DRESS_COMPLETE.exists() else DRESS_TARGET
            dress_image = Image.open(dress_occluder_path)
            if dress_image.mode == "RGBA":
                dress_occluder = np.asarray(dress_image.convert("RGBA"), dtype=np.uint8)[:, :, 3] > 250
            else:
                dress_occluder = np.asarray(dress_image.convert("L"), dtype=np.uint8) > 127
            head_occluder = np.asarray(Image.open(TEXTURES / "head.png").convert("RGBA"), dtype=np.uint8)[:, :, 3] > 250
            if asset_id == "tail":
                occluder = dress_occluder
            elif asset_id == "hair-back":
                occluder = dress_occluder | head_occluder
                for arm_name in ("arm-near", "arm-far"):
                    arm_complete = TEXTURES / "animation-v1" / f"{arm_name}-complete.png"
                    arm_target = TARGETS / f"{arm_name}-target-mask.png"
                    if arm_complete.exists():
                        occluder |= np.asarray(Image.open(arm_complete).convert("RGBA"), dtype=np.uint8)[:, :, 3] > 250
                    elif arm_target.exists():
                        occluder |= np.asarray(Image.open(arm_target).convert("L"), dtype=np.uint8) > 127
            else:
                occluder = dress_occluder | head_occluder
            target = Image.fromarray(((visible_array | (target_array & occluder)) * 255).astype(np.uint8), "L")
        target.save(TARGETS / f"{asset_id}-target-mask.png", optimize=True)
        print(asset_id, int(np.count_nonzero(np.asarray(visible.getchannel('A')))), int(np.count_nonzero(np.asarray(target))))


if __name__ == "__main__":
    main()
