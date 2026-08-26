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


# The optimized source is a native left-facing performance. Keep it unmirrored.
# Finish removes most of the redundant side-facing hold while retaining a short
# settled beat before the authored turn back to the front.
REFERENCE_FPS = 24.0
SEGMENTS = (
    {"name": "run_left_prepare", "ranges": ((24, 48),), "loop": False},
    {"name": "run_left_cycle", "ranges": ((48, 64),), "loop": True},
    {"name": "run_left_finish", "ranges": ((112, 132), (148, 169)), "loop": False},
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build native left-facing run assets from an adaptive-background source."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--lower", type=float, default=10.0)
    parser.add_argument("--upper", type=float, default=34.0)
    parser.add_argument("--crf", type=int, default=18)
    parser.add_argument(
        "--preserve-alpha",
        action="store_true",
        help="Decode and preserve an existing alpha channel instead of rematting.",
    )
    parser.add_argument(
        "--alpha-threshold",
        type=int,
        default=0,
        help="Contract a preserved source alpha matte; useful for wide export halos.",
    )
    return parser.parse_args()


def fill_holes(mask: np.ndarray) -> np.ndarray:
    padded = cv2.copyMakeBorder(mask, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    flood = padded.copy()
    flood_mask = np.zeros((flood.shape[0] + 2, flood.shape[1] + 2), np.uint8)
    cv2.floodFill(flood, flood_mask, (0, 0), 255)
    holes = cv2.bitwise_not(flood)[1:-1, 1:-1]
    return cv2.bitwise_or(mask, holes)


def estimate_background(rgb: np.ndarray) -> np.ndarray:
    edge = 12
    border = np.concatenate(
        (
            rgb[:edge].reshape(-1, 3),
            rgb[-edge:].reshape(-1, 3),
            rgb[:, :edge].reshape(-1, 3),
            rgb[:, -edge:].reshape(-1, 3),
        ),
        axis=0,
    )
    return np.median(border, axis=0).astype(np.float32)


def adaptive_matte(
    bgr: np.ndarray, lower: float, upper: float
) -> tuple[np.ndarray, list[int], int, list[int]]:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    background = estimate_background(rgb)
    distance = np.sqrt(
        np.mean((rgb.astype(np.float32) - background[None, None, :]) ** 2, axis=2)
    )

    binary = np.where(distance > lower, 255, 0).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        raise RuntimeError("No foreground component found")
    component_id = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    component = np.where(labels == component_id, 255, 0).astype(np.uint8)
    # Keep authored background windows between hair curls, limbs, skirt, and
    # tail. Filling every enclosed region turns a chroma background into opaque
    # coloured blobs inside those gaps.

    # The source's white background is baked into a 1–2 px antialiased halo.
    # Contract the matte by roughly one pixel, then feather inward. This keeps
    # fine hair strands while preventing the white mixture from becoming an
    # opaque outline on dark desktop backgrounds.
    inside_distance = cv2.distanceTransform(component, cv2.DIST_L2, 3)
    geometric_alpha = np.clip((inside_distance - 1.05) / 1.25 * 255, 0, 255)
    colour_alpha = np.clip(
        (distance - lower) / max(1.0, upper - lower) * 255, 0, 255
    )
    # Apply the colour matte throughout the geometric component. Chroma-key
    # compression can leave a 2–3 px band that is geometrically interior but
    # still mostly background-coloured; limiting only the outer feather would
    # preserve that band as an opaque pink/white fringe.
    alpha_float = np.minimum(geometric_alpha, colour_alpha)
    alpha = alpha_float.astype(np.uint8)

    # Remove the current black/gray/white background colour from partially
    # transparent edge pixels so the result stays clean on both light and dark UI.
    output_rgb = rgb.astype(np.float32)
    fringe = (alpha > 0) & (alpha < 255)
    if np.any(fringe):
        a = np.maximum(alpha[fringe].astype(np.float32)[:, None] / 255.0, 0.08)
        output_rgb[fringe] = np.clip(
            (output_rgb[fringe] - background[None, :] * (1.0 - a)) / a,
            0,
            255,
        )

    points = cv2.findNonZero((alpha > 0).astype(np.uint8))
    if points is None:
        raise RuntimeError("Alpha matte is empty")
    x, y, width, height = cv2.boundingRect(points)
    rgba = np.dstack((output_rgb.astype(np.uint8), alpha))
    return (
        rgba,
        [x, y, x + width, y + height],
        int(np.count_nonzero(alpha)),
        [int(round(value)) for value in background],
    )


def encode_segment(frames: list[np.ndarray], output: Path, fps: float, crf: int) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(prefix="whale-left-run-alpha-") as temp_dir:
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


def decode_alpha_frames(
    input_path: Path,
    width: int,
    height: int,
    required: set[int],
) -> tuple[dict[int, np.ndarray], int]:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
    ]
    if input_path.suffix.lower() == ".webm":
        command.extend(["-c:v", "libvpx-vp9"])
    command.extend(
        [
            "-i",
            str(input_path),
            "-an",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "pipe:1",
        ]
    )
    process = subprocess.Popen(command, stdout=subprocess.PIPE)
    if process.stdout is None:
        raise RuntimeError("Unable to read decoded alpha frames")
    frame_bytes = width * height * 4
    decoded: dict[int, np.ndarray] = {}
    index = 0
    while True:
        chunk = process.stdout.read(frame_bytes)
        if not chunk:
            break
        if len(chunk) != frame_bytes:
            process.kill()
            raise RuntimeError(f"Truncated RGBA frame {index}")
        if index in required:
            decoded[index] = np.frombuffer(chunk, dtype=np.uint8).reshape(
                height, width, 4
            ).copy()
        index += 1
    return_code = process.wait()
    if return_code != 0:
        raise subprocess.CalledProcessError(return_code, command)
    return decoded, index


def main() -> None:
    args = parse_args()
    if not args.input.is_file():
        raise SystemExit(f"Missing input video: {args.input}")
    if args.upper <= args.lower:
        raise SystemExit("--upper must be greater than --lower")

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
    segments = tuple(
        {
            **segment,
            "ranges": tuple(
                (
                    int(round(start * fps / REFERENCE_FPS)),
                    int(round(end * fps / REFERENCE_FPS)),
                )
                for start, end in segment["ranges"]
            ),
        }
        for segment in SEGMENTS
    )
    required = {
        frame
        for segment in segments
        for start, end in segment["ranges"]
        for frame in range(start, end)
    }
    capture.release()
    decoded: dict[int, np.ndarray] = {}
    if args.preserve_alpha:
        decoded, index = decode_alpha_frames(args.input, width, height, required)
    else:
        capture = cv2.VideoCapture(str(args.input))
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
        raise RuntimeError(f"Missing source frames: {missing[:8]}")

    states: list[dict[str, object]] = []
    for segment in segments:
        source_frames = [
            frame
            for start, end in segment["ranges"]
            for frame in range(start, end)
        ]
        rgba_frames: list[np.ndarray] = []
        bounds: list[list[int]] = []
        areas: list[int] = []
        backgrounds: list[list[int]] = []
        for source_frame in source_frames:
            if args.preserve_alpha:
                rgba = decoded[source_frame].copy()
                if args.alpha_threshold > 0:
                    source_alpha = rgba[:, :, 3].astype(np.float32)
                    rgba[:, :, 3] = np.clip(
                        (source_alpha - args.alpha_threshold)
                        * 255.0
                        / max(1, 255 - args.alpha_threshold),
                        0,
                        255,
                    ).astype(np.uint8)
                alpha = rgba[:, :, 3]
                points = cv2.findNonZero((alpha > 0).astype(np.uint8))
                if points is None:
                    raise RuntimeError(f"Alpha matte is empty at frame {source_frame}")
                x, y, box_width, box_height = cv2.boundingRect(points)
                bbox = [x, y, x + box_width, y + box_height]
                area = int(np.count_nonzero(alpha))
                background = [0, 0, 0]
            else:
                rgba, bbox, area, background = adaptive_matte(
                    decoded[source_frame], args.lower, args.upper
                )
            rgba_frames.append(rgba)
            bounds.append(bbox)
            areas.append(area)
            backgrounds.append(background)

        filename = f"{segment['name']}.webm"
        encode_segment(rgba_frames, movement_dir / filename, fps, args.crf)
        Image.fromarray(rgba_frames[len(rgba_frames) // 2], "RGBA").save(
            movement_dir / f"{segment['name']}-poster.png", compress_level=6
        )
        states.append(
            {
                "name": segment["name"],
                "file": f"../assets/movement/{filename}",
                "sourceRanges": [list(item) for item in segment["ranges"]],
                "frameCount": len(rgba_frames),
                "durationSeconds": round(len(rgba_frames) / fps, 6),
                "loop": segment["loop"],
                "canvas": [width, height],
                "anchor": {"x": 0.5, "y": 1.0, "space": "full-canvas-normalized"},
                "authoredFacing": "left",
                "mirrorAtRuntime": False,
                "bounds": bounds,
                "foregroundAreaRange": [min(areas), max(areas)],
                "backgroundSamples": backgrounds,
            }
        )

    manifest = {
        "version": 1,
        "name": "move_left_optimized",
        "source": str(args.input.resolve()),
        "fps": fps,
        "sourceFrameCount": frame_count,
        "canvas": [width, height],
        "states": states,
        "sequence": ["run_left_prepare", "run_left_cycle", "run_left_finish"],
        "transitionContract": {
            "prepareToCycle": {
                "sourceFrames": [
                    int(round(47 * fps / REFERENCE_FPS)),
                    int(round(48 * fps / REFERENCE_FPS)),
                ],
                "adjacent": True,
            },
            "cycleWrap": {
                "sourceFrames": [
                    int(round(63 * fps / REFERENCE_FPS)),
                    int(round(48 * fps / REFERENCE_FPS)),
                ],
                "periodFrames": int(round(16 * fps / REFERENCE_FPS)),
            },
            "cycleToFinish": {
                "sourceFrames": [
                    int(round(63 * fps / REFERENCE_FPS)),
                    int(round(112 * fps / REFERENCE_FPS)),
                ],
                "phaseLagFrames": int(round(64 * fps / REFERENCE_FPS)),
            },
            "finishHoldCompression": {
                "sourceFrames": [
                    int(round(131 * fps / REFERENCE_FPS)),
                    int(round(148 * fps / REFERENCE_FPS)),
                ],
                "stationaryPose": True,
            },
            "finishToIdle": {
                "sourceFrame": int(round(168 * fps / REFERENCE_FPS)),
                "driver": "live2d",
            },
        },
        "matte": {
            "background": (
                "preserved source alpha"
                if args.preserve_alpha
                else "per-frame adaptive border colour"
            ),
            "lower": args.lower,
            "upper": args.upper,
            "alpha": "real transparent VP9 WebM",
            "edgeDecontamination": not args.preserve_alpha,
            "sourceAlphaPreserved": args.preserve_alpha,
            "sourceAlphaThreshold": (
                args.alpha_threshold if args.preserve_alpha else None
            ),
        },
    }
    (metadata_dir / "animation.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "output": str(output),
                "fps": fps,
                "sourceFrames": frame_count,
                "canvas": [width, height],
                "states": [
                    {
                        "name": state["name"],
                        "frames": state["frameCount"],
                        "duration": state["durationSeconds"],
                    }
                    for state in states
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
