"""Export a thinking-pose back-hair PSD for visual layer auditing.

The PSD remains the editable source.  This script writes full-canvas RGBA
layers and a contact sheet so layer identity, alpha, and bind registration can
be checked before replacing runtime assets.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw
from psd_tools import PSDImage


def full_canvas_layer(layer, size: tuple[int, int]) -> Image.Image:
    rendered = layer.composite().convert("RGBA")
    if rendered.size == size:
        return rendered
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(rendered, (layer.left, layer.top))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("psd", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    psd = PSDImage.open(args.psd)
    records = []
    exported: list[tuple[str, Image.Image]] = []

    for index, layer in enumerate(psd):
        if not layer.is_visible() or layer.kind != "pixel":
            continue
        image = full_canvas_layer(layer, psd.size)
        filename = f"layer-{index:02d}.png"
        image.save(args.output / filename)
        records.append(
            {
                "index": index,
                "name": layer.name,
                "kind": layer.kind,
                "bbox": list(layer.bbox),
                "opacity": layer.opacity,
                "file": filename,
            }
        )
        exported.append((f"{index}: {layer.name}", image))

    composite = psd.composite().convert("RGBA")
    composite.save(args.output / "psd-composite.png")

    thumb_size = 300
    label_height = 34
    sheet = Image.new("RGB", (thumb_size * 3, (thumb_size + label_height) * 2), (17, 29, 34))
    draw = ImageDraw.Draw(sheet)
    for slot, (label, image) in enumerate(exported):
        x = slot % 3 * thumb_size
        y = slot // 3 * (thumb_size + label_height)
        preview = Image.new("RGBA", psd.size, (10, 29, 35, 255))
        preview.alpha_composite(image)
        preview.thumbnail((thumb_size, thumb_size), Image.Resampling.LANCZOS)
        sheet.paste(preview.convert("RGB"), (x, y))
        draw.text((x + 8, y + thumb_size + 8), label, fill=(224, 246, 247))
    sheet.save(args.output / "layers-contact-sheet.jpg", quality=94)

    (args.output / "report.json").write_text(
        json.dumps(
            {
                "source": str(args.psd),
                "size": list(psd.size),
                "depth": psd.depth,
                "colorMode": int(psd.color_mode),
                "layers": records,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"size": psd.size, "layers": len(records), "output": str(args.output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
