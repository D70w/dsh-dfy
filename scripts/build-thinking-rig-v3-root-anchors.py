"""Build a root-anchored front-hair split for the thinking rig.

The PSD layers are full-canvas and correctly aligned, but a rigid transform on
an entire lock moves its root away from the scalp.  This keeps a measured root
cap static and fades each moving lock in below the cap, which is the 2D
equivalent of pinning the first mesh row to the head bone.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "character-packs" / "default-whale" / "source" / "thinking-rig-v3"
AUDIT = Path.home() / "AppData" / "Local" / "Temp" / "codex-front-hair-psd-audit"
SIZE = (1280, 1280)


def rgba(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if image.size != SIZE:
        raise ValueError(f"expected {SIZE}, got {image.size}: {path}")
    return image


def feathered_polygon(points: list[tuple[int, int]], blur: float = 7.0) -> Image.Image:
    mask = Image.new("L", SIZE, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(blur))


def vertical_fade(start: int, end: int) -> Image.Image:
    rows = np.arange(SIZE[1], dtype=np.float32)[:, None]
    alpha = np.clip((rows - start) / max(1, end - start), 0.0, 1.0)
    return Image.fromarray(np.repeat(np.round(alpha * 255).astype(np.uint8), SIZE[0], axis=1), "L")


def apply_mask(image: Image.Image, mask: Image.Image) -> Image.Image:
    result = image.copy()
    result.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
    return result


def main() -> None:
    composite = rgba(AUDIT / "psd-composite.png")

    # The user supplied the missing 150x143 ahoge as an exact crop from the
    # approved flattened front hair.  Pixel matching against that source puts
    # its top-left at (467, 5); preserve that authored coordinate rather than
    # estimating placement in the runtime.
    ahoge_source = Image.open(PACK / "ahoge-source.png").convert("RGBA")
    if ahoge_source.size != (150, 143):
        raise ValueError(f"expected ahoge crop (150, 143), got {ahoge_source.size}")
    ahoge = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    ahoge.alpha_composite(ahoge_source, (467, 5))
    ahoge.save(PACK / "ahoge.png", optimize=True)

    # This is deliberately a hair-shaped mask, rather than a rectangular crop:
    # it covers the crown, bang roots, both temples and the upper lock entries
    # while leaving the face transparent.  The cap is rendered after moving
    # locks, so it closes any sub-pixel root gap without adding a new outline.
    root_mask = feathered_polygon(
        [
            (360, 70), (835, 70), (855, 175), (842, 275),
            (820, 350), (770, 390), (700, 385), (640, 405),
            (570, 385), (500, 395), (430, 370), (380, 300),
        ],
        blur=8.0,
    )
    root_cap = apply_mask(composite, root_mask)
    root_cap.save(PACK / "front-hair-root-cap.png", optimize=True)

    # Keep the authored PSD layer colors and alpha.  Only the root rows are
    # pinned; the lower rows remain available for the spring controls.
    specs = {
        "front-hair-crown.png": (285, 365),
        "front-hair-upper-r.png": (255, 335),
        "front-hair-long-r.png": (300, 380),
        "front-hair-long-l.png": (315, 395),
        "front-hair-side-l.png": (275, 350),
    }
    for name, (start, end) in specs.items():
        source = rgba(PACK / name)
        moving = apply_mask(source, vertical_fade(start, end))
        moving.save(PACK / name.replace(".png", "-moving.png"), optimize=True)

    print(f"built ahoge, root cap and {len(specs)} pinned moving layers in {PACK}")


if __name__ == "__main__":
    main()
