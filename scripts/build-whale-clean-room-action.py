from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from fractions import Fraction
from pathlib import Path

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a transparent one-shot room-cleaning desktop-pet action."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--lower", type=float, default=3.0)
    parser.add_argument("--upper", type=float, default=24.0)
    parser.add_argument("--min-component-area", type=int, default=24)
    parser.add_argument("--crf", type=int, default=18)
    return parser.parse_args()


def fill_holes(mask: np.ndarray) -> np.ndarray:
    padded = cv2.copyMakeBorder(mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    flood = padded.copy()
    flood_mask = np.zeros((flood.shape[0] + 2, flood.shape[1] + 2), np.uint8)
    cv2.floodFill(flood, flood_mask, (0, 0), 255)
    holes = cv2.bitwise_not(flood)[1:-1, 1:-1]
    return cv2.bitwise_or(mask, holes)


def matte_frame(
    bgr: np.ndarray,
    lower: float,
    upper: float,
    min_component_area: int,
) -> tuple[np.ndarray, list[int], int, int]:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    brightness = rgb.max(axis=2).astype(np.float32)
    alpha_float = np.clip((brightness - lower) / (upper - lower) * 255, 0, 255)
    seed = np.where(alpha_float > 0, 255, 0).astype(np.uint8)

    count, labels, stats, _ = cv2.connectedComponentsWithStats(seed, 8)
    if count <= 1:
        raise RuntimeError("No foreground components found")
    valid_ids = [
        component_id
        for component_id in range(1, count)
        if stats[component_id, cv2.CC_STAT_AREA] >= min_component_area
    ]
    if not valid_ids:
        raise RuntimeError("All foreground components were filtered")
    retained = np.isin(labels, valid_ids)
    alpha_float[~retained] = 0
    # Do not fill enclosed holes: the curls, arm gaps, broom bristles, and dust
    # contain legitimate background windows. Filling them would produce opaque
    # black blobs on light desktop backgrounds.
    alpha = alpha_float.astype(np.uint8)

    output_rgb = rgb.astype(np.float32)
    fringe = (alpha > 0) & (alpha < 255)
    if np.any(fringe):
        a = np.maximum(alpha[fringe].astype(np.float32)[:, None] / 255.0, 0.08)
        output_rgb[fringe] = np.clip(output_rgb[fringe] / a, 0, 255)

    points = cv2.findNonZero((alpha > 0).astype(np.uint8))
    if points is None:
        raise RuntimeError("Alpha matte is empty")
    x, y, width, height = cv2.boundingRect(points)
    rgba = np.dstack((output_rgb.astype(np.uint8), alpha))
    return (
        rgba,
        [x, y, x + width, y + height],
        int(np.count_nonzero(alpha)),
        len(valid_ids),
    )


def encode(frames: list[np.ndarray], output: Path, fps: float, crf: int) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(prefix="whale-clean-room-alpha-") as temp_dir:
        temp = Path(temp_dir)
        for index, rgba in enumerate(frames, start=1):
            Image.fromarray(rgba, "RGBA").save(
                temp / f"frame-{index:06d}.png", compress_level=1
            )
        command = [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-framerate",
            str(Fraction(str(fps)).limit_denominator(1000)),
            "-i",
            str(temp / "frame-%06d.png"),
            "-an",
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-b:v",
            "0",
            "-crf",
            str(crf),
            "-auto-alt-ref",
            "0",
            "-row-mt",
            "1",
            "-metadata:s:v:0",
            "alpha_mode=1",
            str(output),
        ]
        subprocess.run(command, check=True)


def main() -> None:
    args = parse_args()
    if not args.input.is_file():
        raise SystemExit(f"Missing input video: {args.input}")
    if args.upper <= args.lower:
        raise SystemExit("--upper must be greater than --lower")

    output = args.output.resolve()
    action_dir = output / "assets" / "actions"
    metadata_dir = output / "metadata"
    action_dir.mkdir(parents=True, exist_ok=True)
    metadata_dir.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(str(args.input))
    if not capture.isOpened():
        raise SystemExit(f"Unable to open {args.input}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frames: list[np.ndarray] = []
    bounds: list[list[int]] = []
    areas: list[int] = []
    component_counts: list[int] = []
    while True:
        ok, bgr = capture.read()
        if not ok:
            break
        rgba, bbox, area, component_count = matte_frame(
            bgr, args.lower, args.upper, args.min_component_area
        )
        frames.append(rgba)
        bounds.append(bbox)
        areas.append(area)
        component_counts.append(component_count)
    capture.release()
    if len(frames) != frame_count:
        raise RuntimeError(f"Expected {frame_count} frames, decoded {len(frames)}")

    output_webm = action_dir / "clean_room.webm"
    encode(frames, output_webm, fps, args.crf)
    Image.fromarray(frames[72], "RGBA").save(
        action_dir / "clean_room-poster.png", compress_level=6
    )

    manifest = {
        "version": 1,
        "name": "clean_room",
        "source": str(args.input.resolve()),
        "file": "../assets/actions/clean_room.webm",
        "fps": fps,
        "frameCount": frame_count,
        "durationSeconds": round(frame_count / fps, 6),
        "canvas": [width, height],
        "loop": False,
        "anchor": {"x": 0.5, "y": 1.0, "space": "full-canvas-normalized"},
        "returnToIdle": {
            "method": "crossfade",
            "durationMs": 180,
            "reason": "source ends while the broom is still visible",
        },
        "matte": {
            "background": "connected black",
            "lower": args.lower,
            "upper": args.upper,
            "minComponentArea": args.min_component_area,
            "preserveDisconnectedEffects": True,
            "alpha": "real transparent VP9 WebM",
        },
        "bounds": bounds,
        "foregroundAreaRange": [min(areas), max(areas)],
        "retainedComponentCountRange": [min(component_counts), max(component_counts)],
    }
    (metadata_dir / "animation.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "output": str(output_webm),
                "fps": fps,
                "frames": frame_count,
                "duration": frame_count / fps,
                "canvas": [width, height],
                "componentRange": manifest["retainedComponentCountRange"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
