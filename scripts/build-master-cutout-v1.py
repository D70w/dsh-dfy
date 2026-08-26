#!/usr/bin/env python3
"""Build an exact-pixel Golden Pose cutout from the approved run master.

The output is a small set of static semantic PNGs.  It is not a pose sequence:
all parts come from one Golden Frame and the mother frame is never loaded by
the runtime.  Generated art may later fill hidden overlap zones, but never
replaces these visible identity pixels.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts/run-master-v3-normalized/frame-30.png"
OUTPUT = ROOT / "character-packs/default-whale/source/master-cutout-v1"
ARTIFACT = ROOT / "artifacts/whale-master-cutout-v1"
GENERATED = ROOT / "character-packs/default-whale/source/realtime-v3-candidate/parts-v3"
LEG_COMPLETION_MASTER = OUTPUT / "leg-completion-master-v1.png"


POLYGONS: dict[str, list[tuple[int, int]]] = {
    "ahoge": [(49, 0), (86, 0), (90, 31), (73, 35), (52, 27)],
    "head-hair": [
        (8, 18), (42, 0), (118, 0), (128, 29), (156, 42), (174, 77),
        (171, 126), (155, 151), (124, 155), (105, 137), (82, 127),
        (62, 132), (39, 132), (16, 112), (8, 76),
    ],
    "arm-near-upper": [(59, 103), (80, 104), (81, 118), (70, 131), (57, 126), (52, 114)],
    "arm-near-fore": [(40, 105), (61, 108), (72, 120), (68, 135), (45, 134), (36, 118)],
    "arm-far-upper": [(81, 102), (103, 103), (108, 117), (102, 129), (88, 126), (77, 115)],
    "arm-far-fore": [(87, 108), (106, 107), (115, 120), (106, 137), (84, 136), (78, 120)],
    "leg-near-thigh": [(48, 166), (85, 166), (85, 187), (74, 195), (49, 190), (43, 176)],
    "leg-near-calf": [(46, 178), (82, 178), (84, 207), (57, 215), (45, 194)],
    "foot-near": [(38, 190), (78, 190), (85, 214), (83, 224), (49, 224), (34, 207)],
    "leg-far-thigh": [(108, 167), (141, 167), (147, 186), (133, 194), (110, 187), (103, 176)],
    "leg-far-calf": [(109, 178), (146, 178), (153, 204), (122, 214), (109, 192)],
    "foot-far": [(117, 184), (151, 184), (159, 204), (153, 216), (121, 216), (113, 200)],
    "tail-root": [(108, 140), (140, 140), (172, 153), (174, 176), (144, 180), (120, 169)],
    "tail-mid": [(157, 147), (184, 141), (205, 151), (201, 180), (173, 184), (158, 171)],
    "tail-flukes": [(178, 136), (224, 137), (224, 211), (195, 208), (175, 188), (174, 159)],
}

ORDER = (
    "tail-root", "tail-mid", "tail-flukes",
    "leg-far-thigh", "leg-far-calf", "foot-far",
    "arm-far-upper", "arm-far-fore",
    "torso-skirt",
    "leg-near-thigh", "leg-near-calf", "foot-near",
    "arm-near-upper", "arm-near-fore",
    "head-hair", "ahoge",
)


def polygon_mask(size: tuple[int, int], points: list[tuple[int, int]], feather: float = .7) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather)) if feather > 0 else mask


def crop_part(source: Image.Image, mask: Image.Image, pad: int = 3) -> tuple[Image.Image, tuple[int, int]]:
    alpha = ImageChops.multiply(source.getchannel("A"), mask)
    box = alpha.getbbox()
    if box is None:
        raise RuntimeError("empty Golden Pose part")
    box = (
        max(0, box[0] - pad), max(0, box[1] - pad),
        min(source.width, box[2] + pad), min(source.height, box[3] + pad),
    )
    rgba = source.copy()
    rgba.putalpha(alpha)
    return rgba.crop(box), (box[0], box[1])


def paste_scaled(
    canvas: Image.Image,
    path: Path,
    target: tuple[float, float],
    pivot: tuple[float, float],
    scale: tuple[float, float],
) -> None:
    source = Image.open(path).convert("RGBA")
    shown = source.resize(
        (max(1, round(source.width * scale[0])), max(1, round(source.height * scale[1]))),
        Image.Resampling.LANCZOS,
    )
    origin = (round(target[0] - pivot[0] * scale[0]), round(target[1] - pivot[1] * scale[1]))
    canvas.alpha_composite(shown, origin)


def hidden_body_underlay(source: Image.Image) -> Image.Image:
    """Generated occlusion completion; source-visible pixels always cover it."""
    underlay = Image.new("RGBA", source.size, (0, 0, 0, 0))
    paste_scaled(underlay, GENERATED / "skirt-back.png", (94, 139), (164, 14), (.31, .22))
    paste_scaled(underlay, GENERATED / "torso.png", (78, 108), (106, 8), (.29, .24))
    paste_scaled(underlay, GENERATED / "skirt-front.png", (94, 139), (167, 14), (.31, .22))
    # Never expand the approved Golden silhouette in the bind pose.
    allowed = source.getchannel("A").filter(ImageFilter.MaxFilter(5))
    underlay.putalpha(ImageChops.multiply(underlay.getchannel("A"), allowed))
    return underlay


def hidden_limb_underlays() -> dict[str, Image.Image]:
    """Create per-bone hidden completions beneath the mother-pixel overlays."""
    output: dict[str, Image.Image] = {}
    legs = extract_leg_completions()
    for side in ("near", "far"):
        output[f"arm-{side}-upper-underlay"] = Image.open(GENERATED / f"upper-arm-{side}.png").convert("RGBA")
        output[f"arm-{side}-fore-underlay"] = Image.open(GENERATED / f"forearm-{side}.png").convert("RGBA")
        output[f"leg-{side}-thigh-underlay"] = legs[f"{side}-thigh"]
        output[f"leg-{side}-calf-underlay"] = legs[f"{side}-calf"]
        output[f"foot-{side}-underlay"] = legs[f"{side}-foot"]
    return output


def extract_leg_completions() -> dict[str, Image.Image]:
    image = Image.open(LEG_COMPLETION_MASTER).convert("RGB")
    rgb = np.asarray(image, dtype=np.uint8)
    high = rgb.max(axis=2).astype(np.int16)
    low = rgb.min(axis=2).astype(np.int16)
    mean = rgb.mean(axis=2)
    foreground = ((high - low) > 16) | (mean < 135)
    foreground = ndimage.binary_closing(foreground, structure=np.ones((3, 3), dtype=bool))
    labels, count = ndimage.label(foreground, structure=np.ones((3, 3), dtype=bool))
    sizes = np.bincount(labels.ravel())
    centers = {
        label: tuple(reversed(ndimage.center_of_mass(foreground, labels, label)))
        for label in range(1, count + 1) if sizes[label] > 1500
    }
    specs = {
        "near-thigh": (300, 300), "near-calf": (760, 300), "near-foot": (1230, 300),
        "far-thigh": (300, 735), "far-calf": (760, 735), "far-foot": (1230, 735),
    }
    output: dict[str, Image.Image] = {}
    for part_id, (target_x, target_y) in specs.items():
        label = min(centers, key=lambda current: (centers[current][0] - target_x) ** 2 + (centers[current][1] - target_y) ** 2)
        mask = ndimage.binary_fill_holes(labels == label)
        alpha = Image.fromarray((mask.astype(np.uint8) * 255), "L").filter(ImageFilter.GaussianBlur(.65))
        rgba = image.convert("RGBA")
        rgba.putalpha(alpha)
        box = alpha.getbbox()
        if box is None:
            raise RuntimeError(f"empty leg completion: {part_id}")
        pad = 4
        box = (max(0, box[0] - pad), max(0, box[1] - pad), min(image.width, box[2] + pad), min(image.height, box[3] + pad))
        output[part_id] = rgba.crop(box)
    return output


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    alpha = source.getchannel("A")
    masks = {part_id: polygon_mask(source.size, points) for part_id, points in POLYGONS.items()}

    # Ahoge is independently rotatable, so do not leave a duplicate in head.
    masks["head-hair"] = ImageChops.subtract(masks["head-hair"], masks["ahoge"])

    movers = Image.new("L", source.size, 0)
    for part_id in (
        "head-hair", "ahoge",
        "arm-near-upper", "arm-near-fore", "arm-far-upper", "arm-far-fore",
        "leg-near-thigh", "leg-near-calf", "foot-near",
        "leg-far-thigh", "leg-far-calf", "foot-far",
        "tail-root", "tail-mid", "tail-flukes",
    ):
        movers = ImageChops.lighter(movers, masks[part_id])
    # The torso/skirt is the exact residual silhouette after movable pieces.
    masks["torso-skirt"] = ImageChops.subtract(alpha, movers)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    ARTIFACT.mkdir(parents=True, exist_ok=True)
    metadata: dict[str, dict[str, object]] = {}
    assembly = Image.new("RGBA", source.size, (0, 0, 0, 0))
    underlay = hidden_body_underlay(source)
    underlay.save(OUTPUT / "body-underlay.png", optimize=True)
    assembly.alpha_composite(underlay)
    metadata["body-underlay"] = {
        "file": str((OUTPUT / "body-underlay.png").relative_to(ROOT)).replace("\\", "/"),
        "origin": [0, 0],
        "size": list(source.size),
        "zIndex": 3,
        "kind": "hidden-occlusion-completion",
    }
    limb_underlays = hidden_limb_underlays()
    for part_id, hidden in limb_underlays.items():
        hidden.save(OUTPUT / f"{part_id}.png", optimize=True)
        metadata[part_id] = {
            "file": str((OUTPUT / f"{part_id}.png").relative_to(ROOT)).replace("\\", "/"),
            "size": list(hidden.size),
            "kind": "hidden-occlusion-completion",
        }
    for z_index, part_id in enumerate(ORDER):
        part, origin = crop_part(source, masks[part_id])
        path = OUTPUT / f"{part_id}.png"
        part.save(path, optimize=True)
        metadata[part_id] = {
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "origin": list(origin),
            "size": list(part.size),
            "zIndex": z_index,
        }
        assembly.alpha_composite(part, origin)

    assembly.save(ARTIFACT / "golden-reassembly.png", optimize=True)
    difference = ImageChops.difference(source, assembly)
    difference.save(ARTIFACT / "golden-difference.png", optimize=True)
    diff = np.asarray(difference, dtype=np.uint8)
    changed = np.any(diff > 8, axis=2)
    report = {
        "schemaVersion": 1,
        "kind": "single-frame-semantic-cutout",
        "animationFrames": 0,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "partCount": len(ORDER) + 1 + len(limb_underlays),
        "changedPixelsOver8": int(changed.sum()),
        "changedPixelRatio": float(changed.mean()),
        "parts": metadata,
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (ARTIFACT / "acceptance.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    panel = Image.new("RGBA", (source.width * 3, source.height), (18, 25, 39, 255))
    overlay = Image.blend(source, assembly, .5)
    for index, image in enumerate((source, assembly, overlay)):
        panel.alpha_composite(image, (source.width * index, 0))
    draw = ImageDraw.Draw(panel)
    for index, label in enumerate(("MOTHER", "CUTOUT REASSEMBLY", "50% OVERLAY")):
        draw.rounded_rectangle((index * source.width + 6, 6, index * source.width + 112, 23), radius=4, fill=(9, 15, 25, 225))
        draw.text((index * source.width + 10, 9), label, fill=(235, 244, 255, 255))
    panel.convert("RGB").save(ARTIFACT / "golden-comparison.png", optimize=True)
    print(json.dumps({"parts": report["partCount"], "changedPixelRatio": report["changedPixelRatio"]}))


if __name__ == "__main__":
    main()
