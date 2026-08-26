"""Normalize approved RGBA ImageGen outputs into design-space wave attachments."""

from math import cos, radians, sin
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACK_DIR = ROOT / "character-packs" / "default-whale" / "source" / "see-through-idle-rig-v1" / "wave-action-v1"
DESIGN_SIZE = 1280


def transform_attachment(
    source_name: str,
    output_name: str,
    source_anchor: tuple[float, float],
    design_anchor: tuple[float, float],
    scale: float,
    clockwise_degrees: float,
) -> tuple[int, int, int, int]:
    source = Image.open(PACK_DIR / "raw" / source_name).convert("RGBA")
    angle = radians(clockwise_degrees)
    cosine = cos(angle)
    sine = sin(angle)
    inverse_scale = 1 / scale
    anchor_x, anchor_y = source_anchor
    target_x, target_y = design_anchor
    inverse = (
        cosine * inverse_scale,
        sine * inverse_scale,
        anchor_x - cosine * inverse_scale * target_x - sine * inverse_scale * target_y,
        -sine * inverse_scale,
        cosine * inverse_scale,
        anchor_y + sine * inverse_scale * target_x - cosine * inverse_scale * target_y,
    )
    design_canvas = source.transform(
        (DESIGN_SIZE, DESIGN_SIZE),
        Image.Transform.AFFINE,
        inverse,
        resample=Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0),
    )
    bounds = design_canvas.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError(f"{source_name} became empty")
    cropped = design_canvas.crop(bounds)
    cropped.save(PACK_DIR / output_name, optimize=True)
    return bounds


if __name__ == "__main__":
    PACK_DIR.mkdir(parents=True, exist_ok=True)
    sleeve_bounds = transform_attachment(
        "wave-sleeve-source.png",
        "wave-sleeve.png",
        source_anchor=(950, 350),
        design_anchor=(485, 548),
        scale=0.25,
        clockwise_degrees=108,
    )
    palm_bounds = transform_attachment(
        "wave-palm-three-quarter-source.png",
        "wave-palm-three-quarter.png",
        source_anchor=(820, 1080),
        design_anchor=(398, 419),
        scale=0.105,
        clockwise_degrees=-15,
    )
    print(f"wave-sleeve.png {sleeve_bounds}")
    print(f"wave-palm-three-quarter.png {palm_bounds}")
