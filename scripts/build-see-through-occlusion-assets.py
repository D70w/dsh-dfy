"""Build deterministic front occlusion layers from the approved See-through art.

The source torso combines the shirt, collar and bow in one bitmap.  The runtime
needs the collar/bow in front of the neck while keeping the shirt behind it, so
this script derives a small alpha-only foreground layer without repainting or
rescaling any source pixel.
"""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "character-packs" / "default-whale" / "source" / "see-through-idle-rig-v1"


def build_collar_front() -> None:
    source = Image.open(ASSET_DIR / "torso.png").convert("RGBA")
    width, height = source.size
    source_alpha = source.getchannel("A")

    geometry = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(geometry)
    draw.rectangle((0, 0, width, 118), fill=255)

    # The opening follows the tapered neck silhouette.  Pixels in this opening
    # remain behind the neck; dark bow/brooch pixels are restored below.
    neck_opening = [(76, 0), (166, 0), (157, 20), (143, 39), (121, 47), (99, 39), (85, 20)]
    draw.polygon(neck_opening, fill=0)

    pixels = source.load()
    mask = geometry.load()
    alpha = source_alpha.load()
    for y in range(min(118, height)):
        for x in range(width):
            if alpha[x, y] == 0:
                mask[x, y] = 0
                continue
            red, green, blue, _ = pixels[x, y]
            luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
            navy_or_outline = blue > red * 1.08 or luminance < 112
            jewel = blue > 105 and blue > green * 1.08
            if navy_or_outline or jewel:
                mask[x, y] = alpha[x, y]
            else:
                mask[x, y] = min(mask[x, y], alpha[x, y])

    foreground = source.copy()
    foreground.putalpha(geometry)
    foreground.save(ASSET_DIR / "collar-front.png", optimize=True)


if __name__ == "__main__":
    build_collar_front()
