from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("x", type=int)
    parser.add_argument("y", type=int)
    parser.add_argument("width", type=int)
    parser.add_argument("height", type=int)
    args = parser.parse_args()
    rgba = np.asarray(Image.open(args.image).convert("RGBA"))
    crop = rgba[args.y:args.y + args.height, args.x:args.x + args.width]
    rgb = crop[:, :, :3].astype(np.int16)
    brightness = rgb.max(axis=2)
    saturation = rgb.max(axis=2) - rgb.min(axis=2)
    mask = (brightness > 70) & (saturation > 25)
    ys, xs = np.where(mask)
    if not len(xs):
        raise SystemExit("no character-like pixels")
    print({"x": int(xs.min()), "y": int(ys.min()), "right": int(xs.max()), "bottom": int(ys.max()), "width": int(xs.max() - xs.min() + 1), "height": int(ys.max() - ys.min() + 1)})


if __name__ == "__main__":
    main()
