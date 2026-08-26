from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


# The generated source contains a deliberately long wrist. Keeping only this
# region gives the cuff enough overlap while preserving all five fingertips.
SOURCE_CROP_INSET_TOP = 140
TARGET_WIDTH = 142
BASE_WIDTH = 100
BASE_WRIST_ANCHOR = (70, 19)
GLOBAL_WRIST_ANCHOR = (426, 775)
OUTPUT_MARGIN = 4


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize the generated waving hand to the rig's arm canvas.")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGBA")
    alpha_bbox = source.getchannel("A").getbbox()
    if alpha_bbox is None:
        raise SystemExit("wave hand source has no visible alpha")

    left, top, right, bottom = alpha_bbox
    top = min(bottom - 1, top + SOURCE_CROP_INSET_TOP)
    hand = source.crop((left, top, right, bottom))
    target_height = round(hand.height * TARGET_WIDTH / hand.width)
    hand = hand.resize((TARGET_WIDTH, target_height), Image.Resampling.LANCZOS)
    visible_bbox = hand.getchannel("A").getbbox()
    if visible_bbox is None:
        raise SystemExit("resized wave hand has no visible alpha")

    crop_left, crop_top, crop_right, crop_bottom = visible_bbox
    canvas = Image.new(
        "RGBA",
        (crop_right - crop_left + OUTPUT_MARGIN * 2, crop_bottom - crop_top + OUTPUT_MARGIN * 2),
        (0, 0, 0, 0),
    )
    canvas.alpha_composite(hand.crop(visible_bbox), (OUTPUT_MARGIN, OUTPUT_MARGIN))

    scale = TARGET_WIDTH / BASE_WIDTH
    wrist_x = round(BASE_WRIST_ANCHOR[0] * scale - crop_left + OUTPUT_MARGIN)
    wrist_y = round(BASE_WRIST_ANCHOR[1] * scale - crop_top + OUTPUT_MARGIN)
    manifest_x = GLOBAL_WRIST_ANCHOR[0] - wrist_x
    manifest_y = GLOBAL_WRIST_ANCHOR[1] - wrist_y

    args.destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.destination, optimize=True)
    print(
        f"saved {args.destination} size={canvas.size} "
        f"manifest=(x={manifest_x}, y={manifest_y}, width={canvas.width}, height={canvas.height}) "
        f"wrist=({wrist_x}, {wrist_y})"
    )


if __name__ == "__main__":
    main()
