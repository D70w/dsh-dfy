#!/usr/bin/env python3
"""Extract every decoded video frame inside one timestamp interval.

This source-preparation helper keeps the original video cadence.  It does not
interpolate, resize, remove backgrounds, or overwrite an existing output.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import av


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract a precise frame interval with PyAV.")
    parser.add_argument("video", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--start", type=float, required=True)
    parser.add_argument("--end", type=float, required=True)
    args = parser.parse_args()
    if not args.video.is_file() or args.start < 0 or args.end <= args.start:
        parser.error("invalid video or interval")
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        parser.error("output directory must be absent or empty")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    timestamps: list[float] = []
    with av.open(str(args.video)) as container:
        stream = container.streams.video[0]
        for frame in container.decode(stream):
            if frame.pts is None:
                continue
            timestamp = float(frame.pts * stream.time_base)
            if timestamp < args.start:
                continue
            if timestamp >= args.end:
                break
            index = len(timestamps)
            frame.to_image().save(args.output_dir / f"frame-{index:03d}.png", optimize=True)
            timestamps.append(timestamp)
        metadata = {
            "source": str(args.video),
            "intervalSeconds": [args.start, args.end],
            "sourceRate": str(stream.average_rate),
            "sourceSize": [stream.width, stream.height],
            "frames": len(timestamps),
            "timestamps": timestamps,
        }
    (args.output_dir / "timing.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({key: metadata[key] for key in metadata if key != "timestamps"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
