from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import av
import cv2
import numpy as np
from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove a connected black background and encode a VP9 alpha WebM."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--lower", type=float, default=3.0)
    parser.add_argument("--upper", type=float, default=24.0)
    parser.add_argument("--crf", type=int, default=18)
    return parser.parse_args()


def matte_frame(
    bgr: np.ndarray, lower: float, upper: float
) -> tuple[np.ndarray, tuple[int, int, int, int], int]:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    brightness = rgb.max(axis=2).astype(np.float32)
    alpha = np.clip((brightness - lower) / (upper - lower) * 255.0, 0, 255).astype(
        np.uint8
    )

    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        (alpha > 0).astype(np.uint8), 8
    )
    if count <= 1:
        raise RuntimeError("No foreground component was found")
    foreground_id = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    alpha[labels != foreground_id] = 0

    x = int(stats[foreground_id, cv2.CC_STAT_LEFT])
    y = int(stats[foreground_id, cv2.CC_STAT_TOP])
    width = int(stats[foreground_id, cv2.CC_STAT_WIDTH])
    height = int(stats[foreground_id, cv2.CC_STAT_HEIGHT])
    area = int(stats[foreground_id, cv2.CC_STAT_AREA])
    rgba = np.dstack((rgb, alpha))
    return rgba, (x, y, x + width, y + height), area


def main() -> None:
    args = parse_args()
    if args.upper <= args.lower:
        raise SystemExit("--upper must be greater than --lower")

    output_dir = args.output_dir.resolve()
    frames_dir = output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(str(args.input))
    if not capture.isOpened():
        raise SystemExit(f"Unable to open {args.input}")

    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if frame_count <= 0 or fps <= 0 or width <= 0 or height <= 0:
        raise SystemExit("Invalid video metadata")

    output_webm = output_dir / "whale-jump-alpha.webm"
    container = av.open(str(output_webm), mode="w", format="webm")
    rate = Fraction(str(fps)).limit_denominator(1000)
    stream = container.add_stream("libvpx-vp9", rate=rate)
    stream.width = width
    stream.height = height
    stream.pix_fmt = "yuva420p"
    stream.bit_rate = 0
    stream.gop_size = max(1, round(fps * 2))
    stream.options = {
        "crf": str(args.crf),
        "deadline": "good",
        "cpu-used": "2",
        "auto-alt-ref": "0",
        "row-mt": "1",
    }
    stream.metadata["alpha_mode"] = "1"

    bounds: list[list[int]] = []
    areas: list[int] = []
    alpha_extrema = [255, 0]
    index = 0
    poster_index = frame_count // 2

    while True:
        ok, bgr = capture.read()
        if not ok:
            break
        rgba, bbox, area = matte_frame(bgr, args.lower, args.upper)
        alpha = rgba[:, :, 3]
        alpha_extrema[0] = min(alpha_extrema[0], int(alpha.min()))
        alpha_extrema[1] = max(alpha_extrema[1], int(alpha.max()))
        bounds.append(list(bbox))
        areas.append(area)

        image = Image.fromarray(rgba, "RGBA")
        image.save(frames_dir / f"frame_{index:03d}.png", compress_level=6)
        if index == poster_index:
            image.save(output_dir / "poster.png", compress_level=6)

        video_frame = av.VideoFrame.from_ndarray(rgba, format="rgba")
        video_frame.pts = index
        for packet in stream.encode(video_frame):
            container.mux(packet)
        index += 1

    capture.release()
    for packet in stream.encode():
        container.mux(packet)
    container.close()

    if index != frame_count:
        raise RuntimeError(f"Expected {frame_count} frames, decoded {index}")

    manifest = {
        "version": 1,
        "source": str(args.input.resolve()),
        "output": output_webm.name,
        "codec": "VP9 alpha in WebM",
        "size": [width, height],
        "fps": fps,
        "frameCount": frame_count,
        "durationMs": round(frame_count / fps * 1000),
        "alphaExtrema": alpha_extrema,
        "matte": {
            "background": "connected black background",
            "lower": args.lower,
            "upper": args.upper,
            "componentPolicy": "largest alpha-connected component",
            "rgbDecontamination": False,
        },
        "bounds": bounds,
        "foregroundAreaRange": [min(areas), max(areas)],
        "playback": {
            "loop": False,
            "returnToIdle": "crossfade 120ms after ended",
            "preload": "auto",
        },
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
