#!/usr/bin/env python3
"""Build shoulder/elbow/wrist-ready arm layers from the approved V1 arms.

Visible pixels are partitioned exactly once from the approved source. Generated
images are never used as visible artwork. Small hidden sleeve overlaps are
deterministically extended from nearby source sleeve pixels.
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "character-packs/default-whale/source/bind-pose-v3/textures/animation-v1-gpt-update-candidate"
OUTPUT_DIR = SOURCE_DIR / "arm-rig-v1"
DEBUG_DIR = ROOT / "character-packs/default-whale/source/bind-pose-v3/debug/arm-rig-v1"
REPORT_PATH = ROOT / "character-packs/default-whale/source/bind-pose-v3/reports/arm-rig-v1.json"
SIZE = (1024, 1024)


@dataclass(frozen=True)
class ArmSpec:
    side: str
    source_name: str
    shoulder: tuple[float, float]
    elbow: tuple[float, float]
    wrist: tuple[float, float]
    hand_end: tuple[float, float]
    elbow_radius: float
    wrist_radius: float


SPECS = (
    ArmSpec("near", "arm-near-complete.png", (470, 535), (517, 590), (563, 642), (620, 676), 30, 23),
    ArmSpec("far", "arm-far-complete.png", (286, 550), (259, 592), (229, 638), (202, 667), 27, 21),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def projection_grid(start: tuple[float, float], end: tuple[float, float]) -> np.ndarray:
    yy, xx = np.indices((SIZE[1], SIZE[0]), dtype=np.float32)
    dx, dy = end[0] - start[0], end[1] - start[1]
    denominator = max(1.0, dx * dx + dy * dy)
    return ((xx - start[0]) * dx + (yy - start[1]) * dy) / denominator


def save_layer(source: np.ndarray, owned: np.ndarray, path: Path) -> None:
    result = np.zeros_like(source)
    result[owned] = source[owned]
    Image.fromarray(result, "RGBA").save(path, optimize=True)


def antialiased_capsule(
    start: tuple[float, float],
    end: tuple[float, float],
    start_radius: float,
    end_radius: float,
    supersample: int = 4,
) -> np.ndarray:
    scale = supersample
    sx, sy = start[0] * scale, start[1] * scale
    ex, ey = end[0] * scale, end[1] * scale
    dx, dy = ex - sx, ey - sy
    length = max(1.0, math.hypot(dx, dy))
    px, py = -dy / length, dx / length
    sr, er = start_radius * scale, end_radius * scale
    points = [
        (sx + px * sr, sy + py * sr),
        (ex + px * er, ey + py * er),
        (ex - px * er, ey - py * er),
        (sx - px * sr, sy - py * sr),
    ]
    mask = Image.new("L", (SIZE[0] * scale, SIZE[1] * scale), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(points, fill=255)
    draw.ellipse((sx - sr, sy - sr, sx + sr, sy + sr), fill=255)
    draw.ellipse((ex - er, ey - er, ex + er, ey + er), fill=255)
    return np.asarray(mask.resize(SIZE, Image.Resampling.LANCZOS), dtype=np.uint8)


def nearest_source_extension(
    source: np.ndarray,
    source_pixels: np.ndarray,
    alpha: np.ndarray,
) -> np.ndarray:
    result = np.zeros_like(source)
    target = alpha > 0
    if not np.any(target) or not np.any(source_pixels):
        return result
    _, indices = ndimage.distance_transform_edt(~source_pixels, return_indices=True)
    ys = indices[0][target]
    xs = indices[1][target]
    result[target, :3] = source[ys, xs, :3]
    result[target, 3] = alpha[target]
    return result


def checkerboard() -> Image.Image:
    yy, xx = np.indices((SIZE[1], SIZE[0]))
    tile = ((xx // 32 + yy // 32) % 2).astype(np.uint8)
    rgb = np.where(tile[:, :, None] == 0, np.array([239, 242, 248]), np.array([206, 214, 226])).astype(np.uint8)
    return Image.fromarray(rgb, "RGB").convert("RGBA")


def label(image: Image.Image, text: str) -> None:
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    draw.rounded_rectangle((16, 16, 254, 54), radius=10, fill=(10, 17, 29, 220), outline=(120, 230, 255, 255), width=2)
    draw.text((28, 29), text, font=font, fill=(238, 245, 255, 255))


def compose(paths: list[Path]) -> Image.Image:
    result = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    for path in paths:
        result.alpha_composite(Image.open(path).convert("RGBA"))
    return result


def rotate_layer(image: Image.Image, pivot: tuple[float, float], degrees: float) -> Image.Image:
    # PIL uses counter-clockwise positive angles; Canvas y-down uses clockwise.
    return image.rotate(-degrees, resample=Image.Resampling.BICUBIC, center=pivot)


def transform_chain(image: Image.Image, transforms: list[tuple[tuple[float, float], float]]) -> Image.Image:
    result = image
    for pivot, degrees in reversed(transforms):
        result = rotate_layer(result, pivot, degrees)
    return result


def build_arm(spec: ArmSpec) -> dict[str, object]:
    source_path = SOURCE_DIR / spec.source_name
    source_image = Image.open(source_path).convert("RGBA")
    source = np.asarray(source_image, dtype=np.uint8).copy()
    visible = source[:, :, 3] > 0

    shoulder_to_wrist = projection_grid(spec.shoulder, spec.wrist)
    elbow_t = float(((spec.elbow[0] - spec.shoulder[0]) * (spec.wrist[0] - spec.shoulder[0]) + (spec.elbow[1] - spec.shoulder[1]) * (spec.wrist[1] - spec.shoulder[1])) / max(1.0, (spec.wrist[0] - spec.shoulder[0]) ** 2 + (spec.wrist[1] - spec.shoulder[1]) ** 2))
    # The cuff begins shortly before the wrist center and belongs with the hand.
    hand_split = 0.79 if spec.side == "near" else 0.75
    upper_owned = visible & (shoulder_to_wrist <= elbow_t)
    forearm_owned = visible & (shoulder_to_wrist > elbow_t) & (shoulder_to_wrist <= hand_split)
    hand_owned = visible & (shoulder_to_wrist > hand_split)

    owned_union = upper_owned | forearm_owned | hand_owned
    duplicate_count = int(np.count_nonzero(upper_owned & forearm_owned) + np.count_nonzero(upper_owned & hand_owned) + np.count_nonzero(forearm_owned & hand_owned))
    missing_count = int(np.count_nonzero(visible & ~owned_union))

    paths = {
        "upper": OUTPUT_DIR / f"arm-{spec.side}-upper.png",
        "forearm": OUTPUT_DIR / f"arm-{spec.side}-forearm.png",
        "hand": OUTPUT_DIR / f"arm-{spec.side}-hand.png",
        "upperUnderlay": OUTPUT_DIR / f"arm-{spec.side}-elbow-upper-underlay.png",
        "forearmUnderlay": OUTPUT_DIR / f"arm-{spec.side}-elbow-forearm-underlay.png",
        "wristUnderlay": OUTPUT_DIR / f"arm-{spec.side}-wrist-underlay.png",
    }
    save_layer(source, upper_owned, paths["upper"])
    save_layer(source, forearm_owned, paths["forearm"])
    save_layer(source, hand_owned, paths["hand"])

    sleeve_blue = visible & (source[:, :, 2] > source[:, :, 0] * 0.85) & (source[:, :, 2] > source[:, :, 1] * 0.9) & (source[:, :, 0] < 110) & (source[:, :, 1] < 130)
    elbow_dx = spec.wrist[0] - spec.shoulder[0]
    elbow_dy = spec.wrist[1] - spec.shoulder[1]
    elbow_length = max(1.0, math.hypot(elbow_dx, elbow_dy))
    ux, uy = elbow_dx / elbow_length, elbow_dy / elbow_length
    upper_capsule = antialiased_capsule(
        (spec.elbow[0] - ux * 15, spec.elbow[1] - uy * 15),
        (spec.elbow[0] + ux * 35, spec.elbow[1] + uy * 35),
        spec.elbow_radius,
        spec.elbow_radius * 0.92,
    )
    forearm_capsule = antialiased_capsule(
        (spec.elbow[0] - ux * 35, spec.elbow[1] - uy * 35),
        (spec.elbow[0] + ux * 16, spec.elbow[1] + uy * 16),
        spec.elbow_radius * 0.92,
        spec.elbow_radius,
    )
    wrist_capsule = antialiased_capsule(
        (spec.wrist[0] - ux * 23, spec.wrist[1] - uy * 23),
        (spec.wrist[0] + ux * 17, spec.wrist[1] + uy * 17),
        spec.wrist_radius,
        spec.wrist_radius * 0.78,
    )
    # Hidden overlaps stay entirely inside the approved bind silhouette. The
    # neighbouring visible part covers them at bind; after rotation they bridge
    # the small joint wedge without producing an artificial outside bulge.
    upper_overlap = sleeve_blue & (upper_capsule > 0) & ~upper_owned
    forearm_overlap = sleeve_blue & (forearm_capsule > 0) & ~forearm_owned
    wrist_overlap = sleeve_blue & (wrist_capsule > 0) & ~forearm_owned
    save_layer(source, upper_overlap, paths["upperUnderlay"])
    save_layer(source, forearm_overlap, paths["forearmUnderlay"])
    save_layer(source, wrist_overlap, paths["wristUnderlay"])

    reconstruction = compose([paths["upper"], paths["forearm"], paths["hand"]])
    difference = ImageChops.difference(source_image, reconstruction)
    changed = np.any(np.asarray(difference, dtype=np.uint8) > 0, axis=2)

    return {
        "side": spec.side,
        "source": source_path.relative_to(ROOT).as_posix(),
        "sourceSha256": sha256(source_path),
        "shoulder": list(spec.shoulder),
        "elbow": list(spec.elbow),
        "wrist": list(spec.wrist),
        "handEnd": list(spec.hand_end),
        "visiblePixels": int(np.count_nonzero(visible)),
        "ownedPixels": {
            "upper": int(np.count_nonzero(upper_owned)),
            "forearm": int(np.count_nonzero(forearm_owned)),
            "hand": int(np.count_nonzero(hand_owned)),
        },
        "missingVisiblePixels": missing_count,
        "duplicateVisiblePixels": duplicate_count,
        "bindChangedPixels": int(np.count_nonzero(changed)),
        "assets": {key: path.relative_to(ROOT).as_posix() for key, path in paths.items()},
    }


def build_debug(report_arms: list[dict[str, object]]) -> None:
    overview = Image.new("RGBA", (SIZE[0] * 3, SIZE[1] * 2), (18, 25, 39, 255))
    bind_audit = Image.new("RGBA", (SIZE[0] * 3, SIZE[1] * 2), (18, 25, 39, 255))
    motion = Image.new("RGBA", (SIZE[0] * 3, SIZE[1] * 2), (18, 25, 39, 255))
    for row, arm in enumerate(report_arms):
        side = str(arm["side"])
        assets = {key: ROOT / value for key, value in dict(arm["assets"]).items()}
        source = Image.open(ROOT / str(arm["source"])).convert("RGBA")
        parts = [Image.open(assets[key]).convert("RGBA") for key in ("upper", "forearm", "hand")]
        reconstructed = compose([assets["upper"], assets["forearm"], assets["hand"]])
        panels = [checkerboard(), checkerboard(), checkerboard()]
        panels[0].alpha_composite(parts[0]); panels[0].alpha_composite(parts[1]); panels[0].alpha_composite(parts[2])
        panels[1].alpha_composite(Image.open(assets["upperUnderlay"]).convert("RGBA")); panels[1].alpha_composite(parts[0])
        panels[1].alpha_composite(Image.open(assets["forearmUnderlay"]).convert("RGBA")); panels[1].alpha_composite(parts[1])
        panels[2].alpha_composite(Image.open(assets["wristUnderlay"]).convert("RGBA")); panels[2].alpha_composite(parts[2])
        for col, panel in enumerate(panels):
            label(panel, [f"{side}: visible parts", f"{side}: elbow overlaps", f"{side}: wrist overlap"][col])
            overview.alpha_composite(panel, (col * SIZE[0], row * SIZE[1]))

        dark = Image.new("RGBA", SIZE, (18, 25, 39, 255)); dark.alpha_composite(source)
        light = checkerboard(); light.alpha_composite(reconstructed)
        diff = ImageChops.difference(source, reconstructed)
        diff_bg = Image.new("RGBA", SIZE, (18, 25, 39, 255)); diff_bg.alpha_composite(diff)
        for col, panel in enumerate((dark, light, diff_bg)):
            label(panel, [f"{side}: approved source", f"{side}: split reconstruction", f"{side}: exact difference"][col])
            bind_audit.alpha_composite(panel, (col * SIZE[0], row * SIZE[1]))

        upper = Image.open(assets["upper"]).convert("RGBA")
        forearm = Image.open(assets["forearm"]).convert("RGBA")
        hand = Image.open(assets["hand"]).convert("RGBA")
        upper_u = Image.open(assets["upperUnderlay"]).convert("RGBA")
        forearm_u = Image.open(assets["forearmUnderlay"]).convert("RGBA")
        wrist_u = Image.open(assets["wristUnderlay"]).convert("RGBA")
        poses = ((0, 0, 0), (-16, 28, -8), (16, -24, 9))
        for col, (shoulder_deg, elbow_deg, wrist_deg) in enumerate(poses):
            panel = checkerboard()
            shoulder = tuple(arm["shoulder"])
            elbow = tuple(arm["elbow"])
            wrist = tuple(arm["wrist"])
            panel.alpha_composite(transform_chain(upper_u, [(shoulder, shoulder_deg)]))
            panel.alpha_composite(transform_chain(forearm_u, [(shoulder, shoulder_deg), (elbow, elbow_deg)]))
            panel.alpha_composite(transform_chain(wrist_u, [(shoulder, shoulder_deg), (elbow, elbow_deg)]))
            panel.alpha_composite(transform_chain(upper, [(shoulder, shoulder_deg)]))
            panel.alpha_composite(transform_chain(forearm, [(shoulder, shoulder_deg), (elbow, elbow_deg)]))
            panel.alpha_composite(transform_chain(hand, [(shoulder, shoulder_deg), (elbow, elbow_deg), (wrist, wrist_deg)]))
            label(panel, f"{side}: shoulder {shoulder_deg:+d} / elbow {elbow_deg:+d} / wrist {wrist_deg:+d}")
            motion.alpha_composite(panel, (col * SIZE[0], row * SIZE[1]))

    overview.convert("RGB").save(DEBUG_DIR / "arm-rig-assets-overview.jpg", quality=92)
    bind_audit.convert("RGB").save(DEBUG_DIR / "arm-rig-bind-audit.jpg", quality=92)
    motion.convert("RGB").save(DEBUG_DIR / "arm-rig-motion-stress.jpg", quality=92)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    arms = [build_arm(spec) for spec in SPECS]
    build_debug(arms)
    all_exact = all(arm["missingVisiblePixels"] == 0 and arm["duplicateVisiblePixels"] == 0 and arm["bindChangedPixels"] == 0 for arm in arms)
    report = {
        "schemaVersion": 1,
        "id": "whale-maid-user-v1-arm-rig-assets",
        "canvasSize": list(SIZE),
        "visiblePixelPolicy": "exactly-once-from-approved-v1",
        "generatedDonorPolicy": "rejected-not-used",
        "runtimeAnimationFrames": 0,
        "arms": arms,
        "status": "PASS" if all_exact else "REVIEW",
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "arms": arms}, ensure_ascii=False))


if __name__ == "__main__":
    main()
