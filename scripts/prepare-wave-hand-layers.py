from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter


HAND_REGION_TOP = 242


def multiply_alpha(source: Image.Image, selection: Image.Image, invert: bool = False) -> Image.Image:
    output = source.copy()
    alpha = source.getchannel("A")
    # Every original pixel belongs to exactly one layer, preserving the source
    # anti-aliased alpha without creating semi-transparent double edges.
    alpha_pixels = alpha.load()
    selection_pixels = selection.load()
    output_alpha = Image.new("L", source.size, 0)
    output_pixels = output_alpha.load()
    for y in range(source.height):
        for x in range(source.width):
            keep = selection_pixels[x, y] == 0 if invert else selection_pixels[x, y] != 0
            output_pixels[x, y] = alpha_pixels[x, y] if keep else 0
    output.putalpha(output_alpha)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Split the original resting hand from the left sleeve.")
    parser.add_argument("arm_source", type=Path)
    parser.add_argument("sleeve_destination", type=Path)
    parser.add_argument("hand_destination", type=Path)
    args = parser.parse_args()

    source = Image.open(args.arm_source).convert("RGBA")
    selection = Image.new("L", source.size, 0)
    pixels = source.load()
    selected = selection.load()
    for y in range(HAND_REGION_TOP, source.height):
        for x in range(source.width):
            red, green, blue, alpha = pixels[x, y]
            # Skin and its warm brown outline are warmer than the white/purple
            # cuff and the navy sleeve. This retains the original drawn hand
            # while leaving the embroidered cuff in the sleeve layer.
            if alpha > 0 and red >= 72 and red - blue >= 4 and red >= green - 4:
                selected[x, y] = 255

    selection = selection.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    selection = selection.point(lambda value: 255 if value >= 128 else 0)

    hand = multiply_alpha(source, selection)
    sleeve = multiply_alpha(source, selection, invert=True)
    if hand.getchannel("A").getbbox() is None or sleeve.getchannel("A").getbbox() is None:
        raise SystemExit("failed to split hand and sleeve")

    args.sleeve_destination.parent.mkdir(parents=True, exist_ok=True)
    args.hand_destination.parent.mkdir(parents=True, exist_ok=True)
    sleeve.save(args.sleeve_destination, optimize=True)
    hand.save(args.hand_destination, optimize=True)
    print(f"sleeve bbox={sleeve.getchannel('A').getbbox()} hand bbox={hand.getchannel('A').getbbox()}")


if __name__ == "__main__":
    main()
