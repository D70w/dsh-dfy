from __future__ import annotations

import argparse
from fractions import Fraction
from pathlib import Path

import av
import numpy as np
from PIL import Image


def parse_range(value: str) -> tuple[int, int]:
    try:
        start_text, end_text = value.split(":", 1)
        start, end = int(start_text), int(end_text)
    except ValueError as error:
        raise argparse.ArgumentTypeError("Use START:END frame ranges") from error
    if start < 0 or end < start:
        raise argparse.ArgumentTypeError(f"Invalid range: {value}")
    return start, end


def main() -> None:
    parser = argparse.ArgumentParser(description="Encode selected RGBA PNG frames as VP9 alpha WebM.")
    parser.add_argument("frames_dir", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("ranges", nargs="+", type=parse_range)
    args = parser.parse_args()

    frame_paths = sorted(args.frames_dir.glob("frame_*.png"))
    if not frame_paths:
        raise SystemExit(f"No frame PNGs found in {args.frames_dir}")

    selected: list[Path] = []
    for start, end in args.ranges:
        if end >= len(frame_paths):
            raise SystemExit(f"Range {start}:{end} exceeds {len(frame_paths)} frames")
        selected.extend(frame_paths[start : end + 1])

    first = np.asarray(Image.open(selected[0]).convert("RGBA"))
    height, width = first.shape[:2]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    container = av.open(str(args.output), mode="w")
    stream = container.add_stream("libvpx-vp9", rate=Fraction(24, 1))
    stream.width = width
    stream.height = height
    stream.pix_fmt = "yuva420p"
    stream.bit_rate = 0
    stream.gop_size = 48
    stream.options = {
        "crf": "18",
        "deadline": "good",
        "cpu-used": "2",
        "auto-alt-ref": "0",
        "row-mt": "1",
    }
    stream.metadata["alpha_mode"] = "1"

    for index, frame_path in enumerate(selected):
        rgba = np.asarray(Image.open(frame_path).convert("RGBA"))
        frame = av.VideoFrame.from_ndarray(rgba, format="rgba")
        frame.pts = index
        for packet in stream.encode(frame):
            container.mux(packet)
    for packet in stream.encode():
        container.mux(packet)
    container.close()
    print(f"encoded {len(selected)} frames to {args.output}")


if __name__ == "__main__":
    main()
