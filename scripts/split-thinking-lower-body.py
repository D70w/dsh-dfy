from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "character-packs/default-whale/source/thinking-rig-v3"


def split_components(source: str, output_left: str, output_right: str) -> None:
    image = Image.open(ROOT / source).convert("RGBA")
    rgba = np.asarray(image).copy()
    alpha = rgba[:, :, 3]
    labels_count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 4).astype(np.uint8), 8)
    components = [index for index in range(1, labels_count) if stats[index, cv2.CC_STAT_AREA] > 100]
    components.sort(key=lambda index: stats[index, cv2.CC_STAT_LEFT])
    if len(components) != 2:
        raise RuntimeError(f"{source}: expected two connected components, found {len(components)}")

    for output, component in zip((output_left, output_right), components):
        result = rgba.copy()
        result[labels != component, 3] = 0
        Image.fromarray(result, "RGBA").save(ROOT / output)


split_components("legwear.png", "legwear-left.png", "legwear-right.png")
split_components("footwear.png", "footwear-left.png", "footwear-right.png")
