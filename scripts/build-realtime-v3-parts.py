#!/usr/bin/env python3
"""Extract the corrected Golden-Pose candidate sheet.

The sheet intentionally omits a face/head base; the v2 head candidate remains
the temporary identity anchor until the static Golden Pose gate is passed.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "character-packs/default-whale/source/realtime-v3-candidate"
SOURCE = SOURCE_DIR / "parts-master-v3-candidate.png"
OUTPUT = SOURCE_DIR / "parts-v3"
LAYOUT = SOURCE_DIR / "parts-v3.json"
PREVIEW = SOURCE_DIR / "parts-v3-preview.png"

shared_spec = importlib.util.spec_from_file_location(
    "realtime_parts_v2", ROOT / "scripts/build-realtime-v2-parts.py"
)
if shared_spec is None or shared_spec.loader is None:
    raise RuntimeError("unable to load candidate extraction helpers")
shared = importlib.util.module_from_spec(shared_spec)
sys.modules[shared_spec.name] = shared
shared_spec.loader.exec_module(shared)


PARTS = (
    shared.PartSpec("hair-back", (320, 255)),
    shared.PartSpec("headband", (755, 150)),
    shared.PartSpec("side-bow-fin", (1070, 215)),
    shared.PartSpec("ahoge", (950, 355)),
    shared.PartSpec("torso", (230, 610)),
    shared.PartSpec("skirt-front", (640, 640)),
    shared.PartSpec("skirt-back", (1025, 640)),
    shared.PartSpec("upper-arm-near", (160, 865)),
    shared.PartSpec("forearm-near", (340, 880)),
    shared.PartSpec("upper-arm-far", (160, 1095)),
    shared.PartSpec("forearm-far", (340, 1110)),
    shared.PartSpec("leg-near", (560, 905)),
    shared.PartSpec("leg-far", (715, 905)),
    shared.PartSpec("shoe-near", (550, 1130)),
    shared.PartSpec("shoe-far", (715, 1130)),
    shared.PartSpec("tail-root", (1005, 875)),
    shared.PartSpec("tail-mid", (995, 1015)),
    shared.PartSpec("tail-flukes", (1005, 1140)),
)


def clean_generated_connectors(part_id: str, part: Image.Image) -> Image.Image:
    """Remove model-sheet socket markers that are not character artwork."""
    cleaned = part.copy()
    alpha = cleaned.getchannel("A")
    draw = ImageDraw.Draw(alpha)
    w, h = cleaned.size
    if part_id == "hair-back":
        draw.rectangle((w * .43, h * .91, w * .57, h), fill=0)
    elif part_id == "torso":
        draw.ellipse((-w * .10, h * .20, w * .22, h * .58), fill=0)
        draw.ellipse((w * .78, h * .16, w * 1.08, h * .56), fill=0)
        draw.rectangle((w * .42, h * .85, w * .60, h), fill=0)
    elif part_id.startswith("upper-arm"):
        draw.rectangle((w * .32, h * .72, w * .72, h), fill=0)
    elif part_id.startswith("leg-"):
        draw.rectangle((w * .31, 0, w * .69, h * .18), fill=0)
        draw.rectangle((w * .31, h * .84, w * .69, h), fill=0)
    elif part_id.startswith("shoe-"):
        draw.rectangle((w * .31, 0, w * .72, h * .30), fill=0)
    elif part_id == "tail-root":
        draw.rectangle((w * .34, h * .72, w * .65, h), fill=0)
    elif part_id == "tail-mid":
        draw.rectangle((w * .32, h * .70, w * .68, h), fill=0)
    elif part_id == "tail-flukes":
        draw.rectangle((w * .41, h * .57, w * .59, h), fill=0)
    cleaned.putalpha(alpha)
    return cleaned


def main() -> None:
    rgb, labels, centers = shared.components(Image.open(SOURCE))
    rendered = [
        (spec, clean_generated_connectors(spec.id, shared.extract(rgb, labels, centers, spec)))
        for spec in PARTS
    ]
    duplicates: dict[bytes, list[str]] = {}
    for spec, part in rendered:
        duplicates.setdefault(part.tobytes(), []).append(spec.id)
    collisions = [ids for ids in duplicates.values() if len(ids) > 1]
    if collisions:
        raise RuntimeError(f"semantic centers resolved to duplicate components: {collisions}")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    metadata: dict[str, dict[str, object]] = {}
    for spec, part in rendered:
        path = OUTPUT / f"{spec.id}.png"
        part.save(path)
        metadata[spec.id] = {
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "size": list(part.size),
            "sourceCenter": list(spec.center),
        }

    cell_w, cell_h, columns = 300, 250, 4
    rows = (len(rendered) + columns - 1) // columns
    sheet = Image.new("RGB", (cell_w * columns, cell_h * rows), (19, 22, 30))
    draw = ImageDraw.Draw(sheet)
    for index, (spec, part) in enumerate(rendered):
        scale = min((cell_w - 24) / part.width, (cell_h - 42) / part.height, 1)
        shown = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.LANCZOS)
        x = index % columns * cell_w + (cell_w - shown.width) // 2
        y = index // columns * cell_h + 28 + (cell_h - 36 - shown.height) // 2
        sheet.paste(shown, (x, y), shown)
        draw.text((index % columns * cell_w + 10, index // columns * cell_h + 8), spec.id, fill=(235, 239, 248))
    sheet.save(PREVIEW)

    LAYOUT.write_text(json.dumps({
        "schemaVersion": 3,
        "kind": "corrected-golden-pose-candidate-static-parts",
        "status": "candidate-not-production",
        "partCount": len(PARTS),
        "animationFrames": 0,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "reference": "artifacts/run-master-v3-normalized/frame-30.png",
        "temporaryHeadSource": "character-packs/default-whale/source/realtime-v2-candidate/parts-v2/head-base.png",
        "parts": metadata,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(PARTS)} corrected candidate parts to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
