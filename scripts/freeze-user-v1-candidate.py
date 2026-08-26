#!/usr/bin/env python3
"""Build a deterministic manifest for the user-approved V1 candidate layers."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
TEXTURES = PACK / "textures" / "animation-v1-gpt-update-candidate"
FORMAL = PACK / "textures" / "animation-v1"
OUTPUT = PACK / "candidate-v1.manifest.json"
CANVAS = (1024, 1024)

ASSETS = [
    {"id": "hair-back", "file": "hair-back-complete.png", "owner": "hair.back.lower", "z": 0, "parentBone": "head", "pivot": [600, 540], "pivotStatus": "estimated", "required": True},
    {"id": "tail", "file": "tail-complete.png", "owner": "tail", "z": 10, "parentBone": "tailRoot", "pivot": [602, 724], "pivotStatus": "estimated", "required": True},
    {"id": "leg-far", "file": "leg-far-complete.png", "owner": "leg.far", "z": 20, "parentBone": "hipFar", "pivot": [318.72449727670346, 731.4360196844331], "pivotStatus": "confirmed", "required": True},
    {"id": "leg-near", "file": "leg-near-complete.png", "owner": "leg.near", "z": 30, "parentBone": "hipNear", "pivot": [438.72449727670346, 731.4360196844331], "pivotStatus": "confirmed", "required": True},
    {"id": "arm-far", "file": "arm-far-complete.png", "owner": "arm.far", "z": 40, "parentBone": "shoulderFar", "pivot": [286, 550], "pivotStatus": "calibrated-preview", "required": True},
    {"id": "dress", "file": "dress-complete.png", "owner": "body.dress", "z": 50, "parentBone": "chest", "pivot": [378.72449727670346, 691.4360196844331], "pivotStatus": "confirmed-pelvis", "required": True},
    {"id": "arm-near", "file": "arm-near-complete.png", "owner": "arm.near", "z": 60, "parentBone": "shoulderNear", "pivot": [470, 535], "pivotStatus": "calibrated-preview", "required": True},
    {"id": "head-front", "file": "head-front-complete-v3.png", "owner": "head.front-and-upper-hair", "z": 70, "parentBone": "head", "pivot": [371, 500], "pivotStatus": "calibrated-preview", "required": True},
    {"id": "ahoge", "file": "ahoge-complete.png", "owner": "hair.ahoge", "z": 80, "parentBone": "ahogeRoot", "pivot": [354, 94], "pivotStatus": "estimated", "required": True},
    {"id": "arm-near-root-fill", "file": "arm-near-root.png", "owner": "arm.near.hidden-shoulder-fill", "z": 55, "parentBone": "shoulderNear", "pivot": [470, 535], "pivotStatus": "calibrated-preview", "required": False},
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_bbox(alpha: np.ndarray) -> list[int]:
    rows, columns = np.nonzero(alpha > 0)
    return [int(columns.min()), int(rows.min()), int(columns.max() + 1), int(rows.max() + 1)]


def inspect_asset(spec: dict) -> dict:
    path = TEXTURES / spec["file"]
    if not path.is_file():
        raise RuntimeError(f"候选资产缺失：{path}")
    image = Image.open(path).convert("RGBA")
    if image.size != CANVAS:
        raise RuntimeError(f"候选资产画布错误：{spec['file']} = {image.size}")
    rgba = np.asarray(image, dtype=np.uint8)
    alpha = rgba[:, :, 3]
    if np.any(rgba[alpha == 0, :3] != 0):
        raise RuntimeError(f"透明像素 RGB 未归零：{spec['file']}")
    labels, component_count = ndimage.label(alpha > 2)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    largest = int(sizes.max()) if component_count else 0
    visible = int(np.count_nonzero(alpha > 0))
    result = dict(spec)
    result.update({
        "path": f"textures/animation-v1-gpt-update-candidate/{spec['file']}",
        "sha256": sha256(path),
        "canvasSize": list(image.size),
        "alphaBbox": alpha_bbox(alpha),
        "visiblePixels": visible,
        "opaquePixels": int(np.count_nonzero(alpha == 255)),
        "partialAlphaPixels": int(np.count_nonzero((alpha > 0) & (alpha < 255))),
        "componentCount": int(component_count),
        "largestComponentPixels": largest,
        "largestComponentCoverage": round(largest / visible, 8) if visible else 0,
    })
    return result


def main() -> None:
    runtime_assets = [inspect_asset(spec) for spec in ASSETS]
    required = [asset for asset in runtime_assets if asset["required"]]
    if len({asset["id"] for asset in runtime_assets}) != len(runtime_assets):
        raise RuntimeError("候选资产 ID 重复")
    if len({asset["owner"] for asset in required}) != len(required):
        raise RuntimeError("必选资产语义所有者重复")
    forbidden = re.compile(r"(?:run|frame|pose)[-_]?\d+", re.IGNORECASE)
    for asset in runtime_assets:
        if forbidden.search(asset["file"]):
            raise RuntimeError(f"候选 Runtime 混入动作帧：{asset['file']}")

    formal_snapshot = []
    if FORMAL.is_dir():
        for path in sorted(FORMAL.glob("*.png")):
            formal_snapshot.append({"file": path.name, "sha256": sha256(path)})

    manifest = {
        "schemaVersion": 1,
        "id": "whale-maid-user-updated-v1-candidate",
        "kind": "static-semantic-layer-character-candidate",
        "active": False,
        "formalV1Untouched": True,
        "canvas": {"width": CANVAS[0], "height": CANVAS[1], "coordinateSystem": "canvas-y-down"},
        "animationFrames": 0,
        "runtimeSourcePolicy": {
            "allowsGif": False,
            "allowsVideo": False,
            "allowsAnimatedWebp": False,
            "allowsSpriteSheet": False,
            "allowsActionPngSequence": False,
        },
        "zOrderBackToFront": [asset["id"] for asset in sorted(required, key=lambda asset: asset["z"])],
        "assets": runtime_assets,
        "formalV1Snapshot": formal_snapshot,
        "acceptance": {
            "bindPose": "passed-candidate",
            "lightDarkBackground": "passed-candidate",
            "semanticMotionStress": "passed-candidate",
            "armHierarchy": "pending",
            "hairTailSpring": "not-started",
            "userPromotionToFormal": "pending",
        },
    }
    OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(OUTPUT.relative_to(ROOT)).replace("\\", "/"),
        "assetCount": len(runtime_assets),
        "requiredAssetCount": len(required),
        "animationFrames": 0,
        "active": False,
        "manifestSha256": sha256(OUTPUT),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
