from __future__ import annotations

import argparse
from pathlib import Path

import cv2
from PIL import Image, ImageDraw


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--step", type=float, default=0.5)
    parser.add_argument("--columns", type=int, default=6)
    args = parser.parse_args()

    capture = cv2.VideoCapture(str(args.input))
    if not capture.isOpened():
        raise SystemExit(f"Unable to open {args.input}")

    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    stride = max(1, round(fps * args.step))
    indices = list(range(0, frame_count, stride))

    thumb_width = 192
    thumb_height = 288
    label_height = 28
    rows = (len(indices) + args.columns - 1) // args.columns
    sheet = Image.new(
        "RGB",
        (args.columns * thumb_width, rows * (thumb_height + label_height)),
        "#20242b",
    )
    draw = ImageDraw.Draw(sheet)

    for item_index, frame_index in enumerate(indices):
        capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ok, bgr = capture.read()
        if not ok:
            continue
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        frame = Image.fromarray(rgb).resize(
            (thumb_width, thumb_height), Image.Resampling.LANCZOS
        )
        x = (item_index % args.columns) * thumb_width
        y = (item_index // args.columns) * (thumb_height + label_height)
        sheet.paste(frame, (x, y))
        draw.text((x + 7, y + thumb_height + 6), f"{frame_index / fps:05.2f}s", fill="white")

    capture.release()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, quality=92)


if __name__ == "__main__":
    main()
