from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image


DRAW_ORDER = [
    "whale-fins", "hair-back", "tail", "human-ears",
    "leg-left", "leg-right", "neck", "skirt", "torso",
    "arm-left", "arm-right", "shoe-left", "shoe-right", "face",
    "brow-left", "brow-right", "eye-white-left", "iris-left", "lash-left",
    "eye-white-right", "iris-right", "lash-right", "mouth",
    "maid-headband", "hair-front", "side-bow", "ahoge",
]


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: render-see-through-bind-pose.py ASSET_DIR OUTPUT.png")
    base = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    manifest = json.loads((base / "manifest.json").read_text(encoding="utf-8"))
    canvas = Image.new("RGBA", tuple(manifest["designSize"]), (0, 0, 0, 0))
    for name in DRAW_ORDER:
        part = manifest["parts"][name]
        image = Image.open(base / part["file"]).convert("RGBA")
        canvas.alpha_composite(image, (part["x"], part["y"]))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)


if __name__ == "__main__":
    main()
