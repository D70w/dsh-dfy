from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(
            "usage: build-whale-sprite-preview.py <sprite-sheet.png> <output-dir>"
        )

    source_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    frames_dir = output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    atlas = Image.open(source_path).convert("RGBA")
    width, height = atlas.size
    columns = rows = 4
    x_edges = [round(index * width / columns) for index in range(columns + 1)]
    y_edges = [round(index * height / rows) for index in range(rows + 1)]
    frame_size = max(
        max(x_edges[index + 1] - x_edges[index] for index in range(columns)),
        max(y_edges[index + 1] - y_edges[index] for index in range(rows)),
    )

    frames: list[dict[str, object]] = []
    for row in range(rows):
        for column in range(columns):
            index = row * columns + column
            box = (
                x_edges[column],
                y_edges[row],
                x_edges[column + 1],
                y_edges[row + 1],
            )
            crop = atlas.crop(box)
            normalized = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
            offset = ((frame_size - crop.width) // 2, frame_size - crop.height)
            normalized.alpha_composite(crop, offset)
            filename = f"frame_{index:02d}.png"
            normalized.save(frames_dir / filename, optimize=True)

            alpha_bbox = normalized.getchannel("A").getbbox()
            frames.append(
                {
                    "index": index,
                    "file": f"frames/{filename}",
                    "sourceCell": list(box),
                    "normalizedSize": [frame_size, frame_size],
                    "alphaBounds": list(alpha_bbox) if alpha_bbox else None,
                }
            )

    atlas.save(output_dir / "source-atlas.png", optimize=True)
    metadata = {
        "source": source_path.name,
        "sourceSize": [width, height],
        "grid": [columns, rows],
        "frameCount": len(frames),
        "frameSize": [frame_size, frame_size],
        "normalization": "No scaling; odd grid cells are centered horizontally and bottom-aligned on a transparent 314px canvas.",
        "frames": frames,
    }
    (output_dir / "frames.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
