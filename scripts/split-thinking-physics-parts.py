"""Split the thinking-pose skirt and handwear into independently bound layers.

All source images are already full-canvas, premultiplied-looking RGBA exports.
The split keeps that 1280x1280 registration and only attenuates alpha around a
small seam, so a neutral pose still lines up with the original art.
"""

from pathlib import Path
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "character-packs/default-whale/source/thinking-rig-v3"


def write_split(source_name: str, names_and_weights: list[tuple[str, np.ndarray]]) -> None:
    source_path = ROOT / source_name
    image = Image.open(source_path).convert("RGBA")
    rgba = np.asarray(image).copy()
    alpha = rgba[:, :, 3].astype(np.float32)
    for output_name, weight in names_and_weights:
        out = rgba.copy()
        out[:, :, 3] = np.rint(alpha * np.clip(weight, 0.0, 1.0)).astype(np.uint8)
        Image.fromarray(out, "RGBA").save(ROOT / output_name)


height, width = 1280, 1280
y = np.arange(height, dtype=np.float32)[:, None]
x = np.arange(width, dtype=np.float32)[None, :]

# The skirt's visual mass changes below the waistline.  A short complementary
# feather avoids a hard pixel seam while keeping the waistband/root on the
# upper, more rigid layer.  The lower layer therefore owns the hem, bows and
# frill, where the heavier secondary motion is meant to read.
skirt_lower = np.clip((y - 824.0) / 12.0, 0.0, 1.0)
skirt_upper = 1.0 - skirt_lower
write_split("bottomwear.png", [("skirt-upper.png", skirt_upper), ("skirt-lower.png", skirt_lower)])


def diagonal_skirt_panel_weights() -> list[np.ndarray]:
    """Return four complementary masks whose seams fan out toward the hem."""
    yy = np.arange(height, dtype=np.float32)[:, None]
    xx = np.broadcast_to(np.arange(width, dtype=np.float32)[None, :], (height, width))
    t = np.clip((yy - 700.0) / 270.0, 0.0, 1.0)
    # The blue skirt opens from a narrow waist into a broad hem.  These four
    # lines follow that perspective instead of making an artificial vertical
    # left/right split.
    boundaries = [
        540.0 + (449.0 - 540.0) * t,
        590.0 + (500.0 - 590.0) * t,
        640.0 + (640.0 - 640.0) * t,
        690.0 + (780.0 - 690.0) * t,
        739.0 + (832.0 - 739.0) * t,
    ]
    base = np.zeros((height, width), dtype=np.int8)
    for index in range(1, 4):
        base += (xx >= boundaries[index]).astype(np.int8)
    weights = [(base == index).astype(np.float32) for index in range(4)]
    feather = 4.0
    for boundary_index in range(1, 4):
        boundary = boundaries[boundary_index]
        mask = np.abs(xx - boundary) < feather
        left_weight = np.clip((boundary + feather - xx) / (2.0 * feather), 0.0, 1.0)
        right_weight = np.clip((xx - (boundary - feather)) / (2.0 * feather), 0.0, 1.0)
        for index in range(4):
            weights[index][mask] = 0.0
        weights[boundary_index - 1][mask] = left_weight[mask]
        weights[boundary_index][mask] = right_weight[mask]
    return weights


panel_weights = diagonal_skirt_panel_weights()
write_split(
    "bottomwear.png",
    [
        ("skirt-panel-left-outer.png", panel_weights[0]),
        ("skirt-panel-left-inner.png", panel_weights[1]),
        ("skirt-panel-right-inner.png", panel_weights[2]),
        ("skirt-panel-right-outer.png", panel_weights[3]),
    ],
)

# The two sleeves are separated by a clear gap in the authored handwear
# export.  The screen-right arm is the torso-anchored arm; the screen-left
# pointing arm remains free to receive a small delayed grab response.
hand_right = np.clip((x - 672.0) / 10.0, 0.0, 1.0)
hand_left = 1.0 - hand_right
write_split("handwear.png", [("handwear-left.png", hand_left), ("handwear-right.png", hand_right)])

print("wrote skirt-upper.png, skirt-lower.png, handwear-left.png, handwear-right.png")
