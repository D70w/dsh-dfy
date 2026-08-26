from __future__ import annotations

import argparse
from pathlib import Path

import cv2
from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract dense reference frames for the greeting motion.")
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--first", type=int, default=20)
    parser.add_argument("--last", type=int, default=92)
    parser.add_argument("--step", type=int, default=4)
    args = parser.parse_args()

    capture = cv2.VideoCapture(str(args.video))
    fps = capture.get(cv2.CAP_PROP_FPS) or 24
    frames: list[tuple[int, Image.Image]] = []
    for frame_index in range(args.first, args.last + 1, args.step):
        capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ok, frame = capture.read()
        if not ok:
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = Image.fromarray(rgb)
        image.thumbnail((420, 420), Image.Resampling.LANCZOS)
        frames.append((frame_index, image))
    capture.release()
    if not frames:
        raise SystemExit("no video frames extracted")

    columns = 4
    label_height = 34
    cell_width = max(image.width for _, image in frames)
    cell_height = max(image.height for _, image in frames) + label_height
    rows = (len(frames) + columns - 1) // columns
    sheet = Image.new("RGB", (cell_width * columns, cell_height * rows), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (frame_index, image) in enumerate(frames):
        x = index % columns * cell_width
        y = index // columns * cell_height
        sheet.paste(image, (x, y))
        draw.text((x + 8, y + image.height + 7), f"{frame_index / fps:.2f}s  frame {frame_index}", fill="black", font=font)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, quality=92)
    print(f"saved {args.output} frames={len(frames)} fps={fps:.3f}")


if __name__ == "__main__":
    main()
