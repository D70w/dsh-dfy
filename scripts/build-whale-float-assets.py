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


# The source is 24 FPS / 8 seconds. These boundaries are matched to the
# visible beats: enter float, one complete repeating sway, then descend.
SEGMENTS = (
    {"name": "float_prepare", "start": 0, "end": 79, "loop": False},
    {"name": "float_cycle", "start": 79, "end": 120, "loop": True},
    {"name": "float_finish", "start": 120, "end": 192, "loop": False},
)
MOTION_NAME = "float_vertical"
METADATA_FILENAME = "animation.json"
CYCLE_CONTRACT = {
    "prepareToCycle": {"sourceFrames": [78, 79], "adjacent": True},
    "cycleWrap": {"sourceFrames": [119, 79], "lagFrames": 41},
    "cycleToFinish": {"sourceFrames": [119, 120], "adjacent": True},
    "finishToIdle": {"sourceFrame": 191, "driver": "live2d"},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build vertical floating action assets.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--threshold", type=int, default=3)
    parser.add_argument("--edge-upper", type=int, default=22)
    parser.add_argument("--crf", type=int, default=18)
    return parser.parse_args()


def fill_holes(mask: np.ndarray) -> np.ndarray:
    padded = cv2.copyMakeBorder(mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    flood = padded.copy()
    flood_mask = np.zeros((flood.shape[0] + 2, flood.shape[1] + 2), np.uint8)
    cv2.floodFill(flood, flood_mask, (0, 0), 255)
    holes = cv2.bitwise_not(flood)[1:-1, 1:-1]
    return cv2.bitwise_or(mask, holes)


def matte_frame(bgr: np.ndarray, threshold: int, edge_upper: int) -> np.ndarray:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    brightness = rgb.max(axis=2).astype(np.float32)
    binary = (brightness > threshold).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        raise RuntimeError("No connected foreground component found")
    component_id = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    component = np.where(labels == component_id, 255, 0).astype(np.uint8)
    component = fill_holes(component)

    kernel = np.ones((3, 3), np.uint8)
    interior = cv2.erode(component, kernel, iterations=1)
    boundary = (component > 0) & (interior == 0)
    alpha = component.copy()
    edge_alpha = np.clip(
        (brightness - threshold) / max(1, edge_upper - threshold) * 255.0,
        0,
        255,
    ).astype(np.uint8)
    alpha[boundary] = np.minimum(alpha[boundary], edge_alpha[boundary])
    alpha[interior > 0] = 255

    rgba_rgb = rgb.astype(np.float32)
    fringe = (alpha > 0) & (alpha < 190)
    if np.any(fringe):
        scale = np.minimum(255.0 / np.maximum(alpha[fringe].astype(np.float32), 1), 2.0)
        rgba_rgb[fringe] = np.minimum(255.0, rgba_rgb[fringe] * scale[:, None])
    return np.dstack((rgba_rgb.astype(np.uint8), alpha))


def encode_segment(
    frames: list[np.ndarray], output: Path, fps: float, crf: int
) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(prefix="whale-float-alpha-") as temp_dir:
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
    output = args.output.resolve()
    movement_dir = output / "assets" / "movement"
    metadata_dir = output / "metadata"
    movement_dir.mkdir(parents=True, exist_ok=True)
    metadata_dir.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(str(args.input))
    if not capture.isOpened():
        raise SystemExit(f"Unable to open {args.input}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    decoded: dict[int, np.ndarray] = {}
    required = {i for segment in SEGMENTS for i in range(segment["start"], segment["end"])}
    index = 0
    while True:
        ok, bgr = capture.read()
        if not ok:
            break
        if index in required:
            decoded[index] = bgr
        index += 1
    capture.release()
    missing = sorted(required.difference(decoded))
    if missing:
        raise RuntimeError(f"Missing decoded source frames: {missing[:8]}")

    entries: list[dict[str, object]] = []
    for segment in SEGMENTS:
        rgba_frames = [
            matte_frame(decoded[i], args.threshold, args.edge_upper)
            for i in range(segment["start"], segment["end"])
        ]
        filename = f"{segment['name']}.webm"
        encode_segment(rgba_frames, movement_dir / filename, fps, args.crf)
        Image.fromarray(rgba_frames[len(rgba_frames) // 2], "RGBA").save(
            movement_dir / f"{segment['name']}-poster.png", compress_level=6
        )
        entries.append({
            "name": segment["name"],
            "file": f"../assets/movement/{filename}",
            "startFrame": segment["start"],
            "endFrameExclusive": segment["end"],
            "frameCount": len(rgba_frames),
            "durationSeconds": round(len(rgba_frames) / fps, 6),
            "loop": segment["loop"],
            "canvas": [width, height],
            "anchor": {"x": 0.5, "y": 1.0, "space": "full-canvas-normalized"},
            "preservePoseMotion": True,
        })

    animation = {
        "version": 1,
        "name": MOTION_NAME,
        "source": str(args.input.resolve()),
        "fps": fps,
        "canvas": [width, height],
        "idle": {"driver": "live2d", "state": "front_idle"},
        "states": entries,
        "sequence": ["float_prepare", "float_cycle", "float_finish"],
        "cycleContract": CYCLE_CONTRACT,
        "matte": {
            "background": "connected pure black",
            "threshold": args.threshold,
            "edgeUpper": args.edge_upper,
            "alpha": "real transparent VP9 WebM",
        },
    }
    (metadata_dir / METADATA_FILENAME).write_text(
        json.dumps(animation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "output": str(output),
        "fps": fps,
        "frames": frame_count,
        "canvas": [width, height],
        "states": [
            {"name": e["name"], "frames": e["frameCount"], "duration": e["durationSeconds"]}
            for e in entries
        ],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
