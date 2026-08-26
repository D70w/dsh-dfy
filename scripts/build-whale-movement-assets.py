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


SEGMENTS = (
    {"name": "run_prepare", "start": 38, "end": 93, "loop": False},
    {"name": "run_cycle", "start": 93, "end": 114, "loop": True},
    # Include deceleration, turn-back, and a short settled front-facing hold;
    # omit the redundant long idle tail at the end of the source.
    {"name": "run_finish", "start": 262, "end": 346, "loop": False},
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the three-part whale desktop-pet movement action pack."
    )
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


def foreground_component(brightness: np.ndarray, threshold: int) -> np.ndarray:
    binary = (brightness > threshold).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        raise RuntimeError("No connected foreground component found")
    component_id = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    component = np.where(labels == component_id, 255, 0).astype(np.uint8)
    return fill_holes(component)


def matte_frame(
    bgr: np.ndarray, threshold: int, edge_upper: int
) -> tuple[np.ndarray, list[int], int]:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    brightness = rgb.max(axis=2).astype(np.float32)
    component = foreground_component(brightness, threshold)

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
    rgba = np.dstack((rgba_rgb.astype(np.uint8), alpha))

    points = cv2.findNonZero((alpha > 0).astype(np.uint8))
    if points is None:
        raise RuntimeError("Alpha matte is empty")
    x, y, width, height = cv2.boundingRect(points)
    return rgba, [x, y, x + width, y + height], int(np.count_nonzero(alpha))


def stabilize_frame(
    rgba: np.ndarray,
    bbox: list[int],
    anchor_x: int,
    anchor_bottom: int,
) -> np.ndarray:
    x1, y1, x2, y2 = bbox
    bbox_center_x = (x1 + x2) * 0.5
    dx = int(round(anchor_x - bbox_center_x))
    dy = int(round(anchor_bottom - y2))
    if dx == 0 and dy == 0:
        return rgba
    height, width = rgba.shape[:2]
    matrix = np.float32([[1, 0, dx], [0, 1, dy]])
    return cv2.warpAffine(
        rgba,
        matrix,
        (width, height),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )


def encode_segment(
    frames: list[np.ndarray],
    output: Path,
    fps: float,
    width: int,
    height: int,
    crf: int,
) -> None:
    # PyAV can expose yuva420p on the encoder while silently writing an
    # opaque yuv420p WebM on some Windows builds. Use the bundled FFmpeg
    # CLI for the final mux: its libvpx path writes the VP9 alpha plane in
    # WebM BlockAdditional, which browsers can composite as real transparency.
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(prefix="whale-alpha-") as temp_dir:
        temp = Path(temp_dir)
        for index, rgba in enumerate(frames, start=1):
            Image.fromarray(rgba, "RGBA").save(
                temp / f"frame-{index:06d}.png", compress_level=1
            )
        rate = str(Fraction(str(fps)).limit_denominator(1000))
        command = [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-framerate",
            rate,
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
    if args.edge_upper <= args.threshold:
        raise SystemExit("--edge-upper must be greater than --threshold")

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
    if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
        raise SystemExit("Invalid source video metadata")

    required_frames = {index for segment in SEGMENTS for index in range(segment["start"], segment["end"])}
    decoded: dict[int, np.ndarray] = {}
    source_index = 0
    while True:
        ok, bgr = capture.read()
        if not ok:
            break
        if source_index in required_frames:
            decoded[source_index] = bgr
        source_index += 1
        if source_index > max(required_frames):
            break
    capture.release()

    missing = sorted(required_frames.difference(decoded))
    if missing:
        raise RuntimeError(f"Missing decoded source frames: {missing[:8]}")

    asset_entries: list[dict[str, object]] = []
    anchor_x = width // 2
    anchor_bottom = height - 28
    for segment in SEGMENTS:
        rgba_frames: list[np.ndarray] = []
        bounds: list[list[int]] = []
        areas: list[int] = []
        for source_frame in range(segment["start"], segment["end"]):
            rgba, bbox, area = matte_frame(
                decoded[source_frame], args.threshold, args.edge_upper
            )
            rgba = stabilize_frame(rgba, bbox, anchor_x, anchor_bottom)
            alpha_points = cv2.findNonZero((rgba[:, :, 3] > 0).astype(np.uint8))
            if alpha_points is None:
                raise RuntimeError(f"Stabilized frame became empty: {source_frame}")
            stable_bbox = cv2.boundingRect(alpha_points)
            bbox = [
                stable_bbox[0],
                stable_bbox[1],
                stable_bbox[0] + stable_bbox[2],
                stable_bbox[1] + stable_bbox[3],
            ]
            area = int(np.count_nonzero(rgba[:, :, 3]))
            rgba_frames.append(rgba)
            bounds.append(bbox)
            areas.append(area)

        filename = f"{segment['name']}.webm"
        encode_segment(
            rgba_frames,
            movement_dir / filename,
            fps,
            width,
            height,
            args.crf,
        )
        Image.fromarray(rgba_frames[len(rgba_frames) // 2], "RGBA").save(
            movement_dir / f"{segment['name']}-poster.png", compress_level=6
        )
        asset_entries.append(
            {
                "name": segment["name"],
                "file": f"../assets/movement/{filename}",
                "startFrame": segment["start"],
                "endFrameExclusive": segment["end"],
                "frameCount": len(rgba_frames),
                "durationSeconds": round(len(rgba_frames) / fps, 6),
                "loop": segment["loop"],
                "canvas": [width, height],
                "anchor": {"x": 0.5, "y": 1.0, "space": "full-canvas-normalized"},
                "anchorPixels": [anchor_x, anchor_bottom],
                "stabilized": True,
                "bounds": bounds,
                "foregroundAreaRange": [min(areas), max(areas)],
            }
        )

    animation = {
        "version": 1,
        "name": "move_horizontal",
        "source": str(args.input.resolve()),
        "fps": fps,
        "canvas": [width, height],
        "idle": {"driver": "live2d", "state": "front_idle"},
        "states": asset_entries,
        "sequence": ["run_prepare", "run_cycle", "run_finish"],
        "transitionContract": {
            "prepareToCycle": {"sourceFrames": [92, 93], "adjacent": True},
            "cycleWrap": {"sourceFrames": [113, 93], "nextPoseReference": 114},
            "cycleToFinish": {
                "sourceFrames": [113, 262],
                "phaseReference": [114, 262],
            },
            "finishToIdle": {"sourceFrame": 345, "driver": "live2d"},
        },
        "matte": {
            "background": "connected pure black",
            "threshold": args.threshold,
            "edgeUpper": args.edge_upper,
            "holePolicy": "filled interior",
            "edgeDecontamination": True,
            "alpha": "real transparent VP9 WebM",
        },
    }
    (metadata_dir / "animation.json").write_text(
        json.dumps(animation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "output": str(output),
                "fps": fps,
                "size": [width, height],
                "states": [
                    {
                        "name": entry["name"],
                        "frames": entry["frameCount"],
                        "duration": entry["durationSeconds"],
                    }
                    for entry in asset_entries
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
