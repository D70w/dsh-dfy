#!/usr/bin/env python3
"""Remove skirt pixels accidentally attached to the near hand cutout."""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
TEXTURES = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3" / "textures"
SOURCE = TEXTURES / "forearm-near.png"
OUTPUT = TEXTURES / "forearm-near-clean.png"


def main() -> None:
    rgba = np.asarray(Image.open(SOURCE).convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[:, :, 3] > 8
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    rows = np.indices(alpha.shape)[0]

    skin = alpha & (red > 150) & (red > green + 8) & (green > blue + 3)
    cuff = alpha & (red > 175) & (green > 165) & (blue > 155) & ((np.maximum.reduce((red, green, blue)) - np.minimum.reduce((red, green, blue))) < 72)
    semantic = (skin | cuff) & (rows < 691)
    keep = ndimage.binary_dilation(semantic, iterations=4) & alpha
    keep = ndimage.binary_fill_holes(keep)
    removed = int(np.count_nonzero(alpha & ~keep))
    rgba[~keep] = 0
    Image.fromarray(rgba, "RGBA").save(OUTPUT, optimize=True)
    print(f"{OUTPUT} removed={removed}")


if __name__ == "__main__":
    main()
