#!/usr/bin/env python3
"""Build a skirt-only underlay for the region occluded by the near hand."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "bind-pose-v3"
TEXTURES = PACK / "textures"
OUTPUT = TEXTURES / "near-arm-skirt-completion.png"


def alpha(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[:, :, 3]


def main() -> None:
    body = np.asarray(Image.open(TEXTURES / "body-base.png").convert("RGBA"), dtype=np.uint8)
    forearm = alpha(TEXTURES / "forearm-near.png") > 8
    hand_coverage = ndimage.binary_dilation(forearm, iterations=5)

    silhouette_image = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(silhouette_image).polygon([
        (536, 622), (575, 625), (617, 647), (648, 680),
        (652, 708), (631, 721), (591, 708), (557, 684),
    ], fill=255)
    silhouette = np.asarray(silhouette_image, dtype=np.uint8) > 0

    # Only fill places hidden by the original complete arm and absent from the
    # exact body layer.  This prevents the donor from repainting visible art.
    missing = silhouette & hand_coverage & (body[:, :, 3] < 245)
    missing = ndimage.binary_closing(missing, iterations=2)
    mask = Image.fromarray((missing * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(1.1))

    # Extend only opaque navy mother pixels into the missing hand-shaped area.
    # Nearest-source propagation retains the exact original palette and cannot
    # invent another sleeve, hand, hair strand, or foreign edge.
    red = body[:, :, 0].astype(np.int16)
    green = body[:, :, 1].astype(np.int16)
    blue = body[:, :, 2].astype(np.int16)
    navy_source = (body[:, :, 3] > 245) & (blue > red + 28) & (blue > green + 18) & (red < 105)
    _, nearest = ndimage.distance_transform_edt(~navy_source, return_indices=True)
    donor_array = body[nearest[0], nearest[1], :3]
    donor_array = np.asarray(Image.fromarray(donor_array, "RGB").filter(ImageFilter.GaussianBlur(0.7)), dtype=np.uint8)

    result = np.zeros((1024, 1024, 4), dtype=np.uint8)
    result[:, :, :3] = donor_array
    result[:, :, 3] = np.asarray(mask, dtype=np.uint8)
    result[result[:, :, 3] == 0, :3] = 0
    Image.fromarray(result, "RGBA").save(OUTPUT, optimize=True)
    print(f"{OUTPUT} pixels={int(np.count_nonzero(result[:, :, 3]))}")


if __name__ == "__main__":
    main()
