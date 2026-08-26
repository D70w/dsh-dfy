"""Import the six authored back-hair layers used by the thinking rig."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage


LAYER_MAP = {
    0: "back-hair-v2-center.png",
    1: "back-hair-v2-inner-r.png",
    2: "back-hair-v2-inner-l.png",
    3: "back-hair-v2-mid-l.png",
    4: "back-hair-v2-outer-r.png",
    5: "back-hair-v2-outer-l.png",
}


def full_canvas_layer(layer, size: tuple[int, int]) -> Image.Image:
    rendered = layer.composite().convert("RGBA")
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    if rendered.size == size:
        canvas.alpha_composite(rendered)
    else:
        canvas.alpha_composite(rendered, (layer.left, layer.top))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("psd", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    psd = PSDImage.open(args.psd)
    if psd.size != (1280, 1280):
        raise ValueError(f"expected 1280x1280 PSD, received {psd.size}")
    if len(psd) < len(LAYER_MAP):
        raise ValueError(f"expected six top-level hair layers, received {len(psd)}")

    args.output.mkdir(parents=True, exist_ok=True)
    exported = []
    for index, filename in LAYER_MAP.items():
        layer = psd[index]
        if layer.kind != "pixel" or not layer.is_visible():
            raise ValueError(f"layer {index} must be a visible pixel layer")
        image = full_canvas_layer(layer, psd.size)
        # The authored center layer contains two tiny disconnected blue marks
        # around x=94, far outside the approved hair silhouette (x>=301).  They
        # are export residue, not hair, and would otherwise swing in mid-air.
        if index == 0:
            image.paste((0, 0, 0, 0), (0, 0, 250, psd.height))
        image.save(args.output / filename)
        exported.append(filename)

    shutil.copy2(args.psd, args.output / "back-hair-source-v2.psd")
    print("imported " + ", ".join(exported))


if __name__ == "__main__":
    main()
