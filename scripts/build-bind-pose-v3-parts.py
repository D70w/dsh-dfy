#!/usr/bin/env python3
"""Build full-canvas visible parts and hidden overlap layers for bind-pose v3."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from scipy import ndimage


PART_ORDER = (
    "hair-back",
    "tail",
    "thigh-far",
    "calf-far",
    "knee-far",
    "foot-far",
    "upper-arm-far",
    "forearm-far",
    "body-base",
    "thigh-near",
    "calf-near",
    "knee-near",
    "foot-near",
    "upper-arm-near",
    "forearm-near",
    "head",
    "ahoge",
)

POLYGONS: dict[str, list[tuple[int, int]]] = {
    "hair-back": [
        (390, 95), (535, 90), (625, 125), (665, 275), (820, 355),
        (835, 565), (760, 665), (590, 670), (470, 600), (400, 490),
    ],
    "tail": [
        (535, 765), (625, 735), (735, 740), (775, 720), (780, 650),
        (815, 610), (960, 550), (1015, 565), (1020, 850), (930, 865),
        (790, 815), (705, 835), (610, 845), (535, 810),
    ],
    "thigh-far": [(294, 826), (400, 826), (400, 880), (292, 883)],
    "calf-far": [(298, 870), (394, 870), (392, 921), (295, 923)],
    "knee-far": [(308, 858), (382, 858), (394, 877), (384, 897), (310, 897), (299, 879)],
    "foot-far": [(276, 908), (402, 908), (402, 1003), (268, 1006)],
    "upper-arm-far": [
        (266, 522), (306, 535), (313, 578), (292, 625),
        (260, 653), (218, 642), (220, 605), (238, 559),
    ],
    "forearm-far": [
        (210, 624), (258, 628), (264, 657), (244, 681),
        (206, 691), (181, 674), (188, 642),
    ],
    "body-base": [
        (278, 442), (430, 438), (485, 485), (525, 550), (585, 650),
        (650, 742), (642, 790), (550, 837), (315, 840), (195, 800),
        (220, 735), (255, 680), (282, 635), (305, 580), (315, 515),
    ],
    "thigh-near": [(398, 826), (530, 826), (530, 884), (398, 885)],
    "calf-near": [(413, 872), (520, 872), (526, 925), (416, 927)],
    "knee-near": [(418, 858), (514, 858), (526, 877), (516, 897), (418, 897), (407, 878)],
    "foot-near": [(403, 910), (544, 910), (546, 1018), (397, 1018)],
    "upper-arm-near": [
        (438, 505), (483, 500), (523, 535), (562, 590),
        (587, 633), (566, 660), (530, 635), (492, 590), (458, 548),
    ],
    "forearm-near": [
        (548, 624), (592, 624), (622, 646), (652, 674),
        (643, 708), (603, 704), (566, 681), (548, 653),
    ],
    "head": [
        (165, 82), (435, 70), (545, 105), (620, 205), (660, 320),
        (635, 375), (545, 405), (520, 485), (455, 535), (275, 535),
        (180, 440),
    ],
    "ahoge": [(270, 0), (435, 0), (430, 88), (385, 96), (350, 82), (310, 103), (270, 82)],
}

PIVOTS: dict[str, tuple[int, int]] = {
    "hair-back": (475, 350),
    "tail": (560, 785),
    "thigh-far": (348, 838),
    "calf-far": (349, 876),
    "knee-far": (349, 878),
    "foot-far": (349, 916),
    "upper-arm-far": (286, 550),
    "forearm-far": (238, 637),
    "body-base": (405, 690),
    "thigh-near": (462, 838),
    "calf-near": (468, 880),
    "knee-near": (468, 880),
    "foot-near": (473, 920),
    "upper-arm-near": (470, 535),
    "forearm-near": (563, 643),
    "head": (371, 500),
    "ahoge": (352, 88),
}

JOINT_REGIONS: dict[str, list[tuple[int, int]]] = {
    "hair-back": [(395, 250), (560, 250), (580, 520), (410, 535)],
    "tail": [(510, 730), (650, 720), (665, 840), (520, 845)],
    "thigh-far": [(292, 812), (402, 812), (405, 894), (292, 894)],
    "calf-far": [(290, 852), (402, 852), (402, 934), (290, 934)],
    "knee-far": [(294, 848), (403, 848), (405, 904), (292, 904)],
    "foot-far": [(285, 892), (405, 892), (405, 940), (285, 940)],
    "upper-arm-far": [(248, 510), (320, 520), (315, 580), (242, 580)],
    "forearm-far": [(198, 610), (272, 610), (275, 670), (195, 680)],
    "thigh-near": [(395, 810), (530, 810), (532, 896), (395, 896)],
    "calf-near": [(402, 852), (535, 852), (535, 940), (402, 940)],
    "knee-near": [(398, 846), (537, 846), (540, 904), (396, 904)],
    "foot-near": [(405, 895), (540, 895), (545, 945), (405, 945)],
    "upper-arm-near": [(430, 492), (500, 492), (525, 565), (450, 570)],
    "forearm-near": [(535, 610), (610, 610), (635, 680), (545, 685)],
    "head": [(305, 465), (445, 460), (465, 555), (300, 555)],
    "ahoge": [(315, 65), (405, 65), (410, 125), (315, 125)],
}

BODY_FILL_REGIONS = [
    [(235, 500), (325, 500), (330, 635), (215, 655)],
    [(430, 485), (510, 485), (595, 645), (520, 670)],
    [(285, 790), (400, 790), (410, 865), (285, 865)],
    [(395, 790), (530, 790), (540, 865), (395, 865)],
    [(500, 700), (660, 700), (665, 835), (505, 835)],
    [(300, 440), (455, 440), (470, 555), (290, 555)],
]

ROLE_COLORS = {
    "hair-back": (239, 143, 189), "tail": (101, 168, 255),
    "thigh-far": (156, 158, 255), "calf-far": (156, 158, 255), "knee-far": (205, 168, 255), "foot-far": (156, 158, 255),
    "upper-arm-far": (156, 158, 255), "forearm-far": (156, 158, 255),
    "body-base": (255, 209, 102),
    "thigh-near": (120, 230, 255), "calf-near": (120, 230, 255), "knee-near": (77, 205, 238), "foot-near": (120, 230, 255),
    "upper-arm-near": (120, 230, 255), "forearm-near": (120, 230, 255),
    "head": (255, 159, 136), "ahoge": (239, 143, 189),
}

PARENT_BONES = {
    "hair-back": "head", "tail": "tailRoot",
    "thigh-far": "hipFar", "calf-far": "kneeFar", "knee-far": "kneeFar", "foot-far": "ankleFar",
    "upper-arm-far": "shoulderFar", "forearm-far": "elbowFar",
    "body-base": "pelvis",
    "thigh-near": "hipNear", "calf-near": "kneeNear", "knee-near": "kneeNear", "foot-near": "ankleNear",
    "upper-arm-near": "shoulderNear", "forearm-near": "elbowNear",
    "head": "neck", "ahoge": "ahogeRoot",
}


def polygon_mask(size: tuple[int, int], points: list[tuple[int, int]]) -> np.ndarray:
    image = Image.new("L", size, 0)
    ImageDraw.Draw(image).polygon(points, fill=255)
    return np.asarray(image, dtype=np.uint8) > 0


def ellipse_alpha_mask(size: tuple[int, int], bounds: tuple[int, int, int, int], blur: int = 3) -> np.ndarray:
    image = Image.new("L", size, 0)
    ImageDraw.Draw(image).ellipse(bounds, fill=255)
    if blur > 0:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(image, dtype=np.uint8)


def save_full_canvas(source: np.ndarray, alpha: np.ndarray, path: Path) -> None:
    rgba = source.copy()
    rgba[:, :, 3] = alpha
    rgba[alpha == 0, :3] = 0
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)


def nearest_extension(source: np.ndarray, visible: np.ndarray, allowed: np.ndarray, radius: int = 14) -> np.ndarray:
    dilated = ndimage.binary_dilation(visible, iterations=radius)
    extension = dilated & allowed & ~visible
    if not np.any(extension) or not np.any(visible):
        return np.zeros_like(source)
    _, indices = ndimage.distance_transform_edt(~visible, return_indices=True)
    result = np.zeros_like(source)
    nearest_y = indices[0][extension]
    nearest_x = indices[1][extension]
    result[extension, :3] = source[nearest_y, nearest_x, :3]
    result[extension, 3] = 255
    return result


def source_extension(source: np.ndarray, visible: np.ndarray, allowed: np.ndarray, radius: int = 14) -> np.ndarray:
    dilated = ndimage.binary_dilation(visible, iterations=radius)
    extension = dilated & allowed & ~visible
    result = np.zeros_like(source)
    result[extension] = source[extension]
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Whale Maid v3 full-canvas part textures.")
    parser.add_argument("master", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    textures = args.output / "textures"
    debug = args.output / "debug"
    rig = args.output / "rig"
    for directory in (textures, debug, rig):
        directory.mkdir(parents=True, exist_ok=True)
    for obsolete_name in ("knee-far-underlay.png", "knee-near-underlay.png"):
        (textures / obsolete_name).unlink(missing_ok=True)

    master = Image.open(args.master).convert("RGBA")
    source = np.asarray(master, dtype=np.uint8).copy()
    source_alpha = source[:, :, 3]
    source_mask = source_alpha > 0
    semantic_skin_mask = (
        (source[:, :, 0] > 180)
        & (source[:, :, 1] > 90)
        & (source[:, :, 1] < 235)
        & (source[:, :, 2] > 70)
        & (source[:, :, 2] < 220)
        & (source[:, :, 0] > source[:, :, 1])
        & (source_alpha > 0)
    )
    raw = {part_id: polygon_mask(master.size, points) & source_mask for part_id, points in POLYGONS.items()}
    raw["thigh-far"] &= semantic_skin_mask
    raw["thigh-near"] &= semantic_skin_mask

    owner = np.full(source_mask.shape, "body-base", dtype=object)
    owner[~source_mask] = ""
    for part_id in PART_ORDER:
        if part_id.startswith("knee-"):
            continue
        owner[raw[part_id]] = part_id

    visible_masks = {part_id: owner == part_id for part_id in PART_ORDER}
    skin_mask = semantic_skin_mask & (source_alpha == 255)
    knee_alpha_masks = {
        "knee-far": ellipse_alpha_mask(master.size, (300, 852, 398, 906), 3),
        "knee-near": ellipse_alpha_mask(master.size, (402, 852, 530, 908), 3),
    }
    for part_id, alpha_mask in knee_alpha_masks.items():
        visible_masks[part_id] = (alpha_mask > 0) & skin_mask
    all_underlays: list[np.ndarray] = []
    body_allowed = np.zeros(source_mask.shape, dtype=bool)
    for points in BODY_FILL_REGIONS:
        body_allowed |= polygon_mask(master.size, points)
    opaque_source = source_alpha == 255
    body_hidden = nearest_extension(source, visible_masks["body-base"], body_allowed & opaque_source, 72)
    body_hidden_path = textures / "body-base-underlay.png"
    Image.fromarray(body_hidden, "RGBA").save(body_hidden_path, optimize=True)
    all_underlays.append(body_hidden)

    metadata: list[dict[str, object]] = [{
        "id": "body-base-underlay",
        "texture": "textures/body-base-underlay.png",
        "parentBone": "pelvis",
        "zIndex": -100,
        "canvasSize": [1024, 1024],
        "kind": "hidden-occlusion-completion",
    }]
    for z_index, part_id in enumerate(PART_ORDER):
        visible = visible_masks[part_id]
        path = textures / f"{part_id}.png"
        if part_id.startswith("knee-"):
            alpha = np.where(visible, knee_alpha_masks[part_id], 0).astype(np.uint8)
            part_kind = "soft-joint-overlay-exact-mother-pixels"
        else:
            alpha = np.where(visible, source_alpha, 0).astype(np.uint8)
            part_kind = "exact-visible-mother-pixels"
        save_full_canvas(source, alpha, path)
        metadata.append({
            "id": part_id,
            "texture": f"textures/{part_id}.png",
            "parentBone": PARENT_BONES[part_id],
            "zIndex": z_index,
            "canvasSize": [1024, 1024],
            "pivotWorld": list(PIVOTS[part_id]),
            "kind": part_kind,
        })
        if part_id == "body-base" or part_id.startswith("knee-"):
            continue
        allowed = polygon_mask(master.size, JOINT_REGIONS[part_id]) & opaque_source
        if part_id.startswith("knee-"):
            extension = source_extension(source, visible, allowed & (source_alpha == 255), 22)
            underlay_z = z_index - 0.5
        else:
            extension = nearest_extension(source, visible, allowed, 28)
            underlay_z = -50 + z_index
        underlay_path = textures / f"{part_id}-underlay.png"
        Image.fromarray(extension, "RGBA").save(underlay_path, optimize=True)
        all_underlays.append(extension)
        metadata.append({
            "id": f"{part_id}-underlay",
            "texture": f"textures/{part_id}-underlay.png",
            "parentBone": PARENT_BONES[part_id],
            "zIndex": underlay_z,
            "canvasSize": [1024, 1024],
            "pivotWorld": list(PIVOTS[part_id]),
            "kind": "hidden-joint-overlap",
        })

    reconstruction = Image.new("RGBA", master.size, (0, 0, 0, 0))
    for part_id in PART_ORDER:
        reconstruction.alpha_composite(Image.open(textures / f"{part_id}.png").convert("RGBA"))
    reconstruction.save(debug / "reconstructed-bind-pose.png", optimize=True)

    reconstruction_with_underlays = Image.new("RGBA", master.size, (0, 0, 0, 0))
    layers: list[tuple[float, Path]] = [(-100, body_hidden_path)]
    for z_index, part_id in enumerate(PART_ORDER):
        if part_id != "body-base" and not part_id.startswith("knee-"):
            underlay_z = z_index - 0.5 if part_id.startswith("knee-") else -50 + z_index
            layers.append((underlay_z, textures / f"{part_id}-underlay.png"))
        layers.append((float(z_index), textures / f"{part_id}.png"))
    for _, layer_path in sorted(layers, key=lambda entry: entry[0]):
        reconstruction_with_underlays.alpha_composite(Image.open(layer_path).convert("RGBA"))
    reconstruction_with_underlays.save(debug / "reconstructed-with-underlays.png", optimize=True)
    difference = ImageChops.difference(master, reconstruction)
    difference.save(debug / "bind-pose-diff.png", optimize=True)
    diff_array = np.asarray(difference, dtype=np.uint8)
    changed = np.any(diff_array > 2, axis=2)

    ownership = Image.new("RGBA", master.size, (0, 0, 0, 255))
    ownership_array = np.asarray(ownership, dtype=np.uint8).copy()
    for part_id, color in ROLE_COLORS.items():
        ownership_array[visible_masks[part_id], :3] = color
    ownership_array[~source_mask, 3] = 0
    Image.fromarray(ownership_array, "RGBA").save(debug / "part-ownership.png", optimize=True)

    comparison = Image.new("RGBA", (3072, 1024), (18, 25, 39, 255))
    comparison.alpha_composite(master, (0, 0))
    comparison.alpha_composite(reconstruction, (1024, 0))
    comparison.alpha_composite(Image.blend(master, reconstruction, 0.5), (2048, 0))
    comparison.convert("RGB").save(debug / "bind-pose-comparison.png", optimize=True)

    report = {
        "schemaVersion": 1,
        "kind": "full-canvas-part-binding-source",
        "master": args.master.as_posix(),
        "canvasSize": [1024, 1024],
        "visiblePartCount": len(PART_ORDER),
        "hiddenCompletionCount": len(all_underlays),
        "changedPixelsOver2": int(changed.sum()),
        "changedPixelRatio": float(changed.mean()),
        "parts": metadata,
        "status": "PASS" if not np.any(changed) else "REVIEW",
    }
    (rig / "parts.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "visibleParts": report["visiblePartCount"],
        "hiddenCompletions": report["hiddenCompletionCount"],
        "changedPixelRatio": report["changedPixelRatio"],
    }))


if __name__ == "__main__":
    main()
