from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


# Frames 10 and 21 are the closest non-adjacent pair in the normalized source.
# Therefore 10..20 is one unique gait cycle and frame 21 is its duplicate end.
SOURCE_CYCLE_INDICES = tuple(range(10, 21))
KEY_INDICES = (10, 11, 13, 14, 16, 17, 19, 20)
FPS = 60
CANVAS = 112


def load_frames(directory: Path) -> list[np.ndarray]:
    paths = sorted(directory.glob("frame-*.png"))
    if len(paths) != 24:
        raise ValueError(f"expected 24 normalized source frames, got {len(paths)}")
    return [np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8) for path in paths]


def motion_gray(frame: np.ndarray) -> np.ndarray:
    alpha = frame[..., 3:4].astype(np.float32) / 255
    composite = frame[..., :3].astype(np.float32) * alpha + 255 * (1 - alpha)
    return cv2.cvtColor(composite.astype(np.uint8), cv2.COLOR_RGB2GRAY)


def bounded_flow(left: np.ndarray, right: np.ndarray, grid: int = 14) -> np.ndarray:
    flow = cv2.calcOpticalFlowFarneback(
        motion_gray(left),
        motion_gray(right),
        None,
        0.5,
        4,
        21,
        5,
        7,
        1.5,
        0,
    )
    coarse = cv2.resize(flow, (grid, grid), interpolation=cv2.INTER_AREA)
    return cv2.resize(coarse, (left.shape[1], left.shape[0]), interpolation=cv2.INTER_CUBIC)


def remap(image: np.ndarray, flow: np.ndarray, amount: float) -> np.ndarray:
    height, width = image.shape[:2]
    grid_x, grid_y = np.meshgrid(np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32))
    map_x = grid_x - flow[..., 0] * amount
    map_y = grid_y - flow[..., 1] * amount
    return cv2.remap(
        image,
        map_x,
        map_y,
        interpolation=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )


def interpolate(left: np.ndarray, right: np.ndarray, forward: np.ndarray, backward: np.ndarray, amount: float) -> np.ndarray:
    left_float = left.astype(np.float32) / 255
    right_float = right.astype(np.float32) / 255
    left_float[..., :3] *= left_float[..., 3:4]
    right_float[..., :3] *= right_float[..., 3:4]
    left_warped = remap(left_float, forward, amount)
    right_warped = remap(right_float, backward, 1 - amount)
    mixed = left_warped * (1 - amount) + right_warped * amount
    alpha = mixed[..., 3:4]
    mixed[..., :3] = np.divide(mixed[..., :3], alpha, out=np.zeros_like(mixed[..., :3]), where=alpha > 1e-5)
    return np.clip(mixed * 255, 0, 255).astype(np.uint8)


def resize_runtime(frame: np.ndarray) -> np.ndarray:
    return cv2.resize(frame, (CANVAS, CANVAS), interpolation=cv2.INTER_AREA)


def build_morph_loop(source: list[np.ndarray], duration_ms: int) -> list[np.ndarray]:
    keys = [source[index] for index in KEY_INDICES]
    pairs = []
    for index, left in enumerate(keys):
        right = keys[(index + 1) % len(keys)]
        pairs.append((bounded_flow(left, right), bounded_flow(right, left)))
    count = round(duration_ms / 1000 * FPS)
    output: list[np.ndarray] = []
    for index in range(count):
        phase = index / count * len(keys)
        segment = math.floor(phase) % len(keys)
        amount = phase - math.floor(phase)
        left = keys[segment]
        right = keys[(segment + 1) % len(keys)]
        forward, backward = pairs[segment]
        output.append(resize_runtime(interpolate(left, right, forward, backward, amount)))
    return output


def build_single_texture_mesh_loop(source: list[np.ndarray], duration_ms: int) -> list[np.ndarray]:
    keys = [source[index] for index in KEY_INDICES]
    canonical = keys[0]
    # Each field maps a target-pose pixel back into the single canonical
    # texture. Interpolating fields models a bounded runtime mesh without
    # crossfading two full-character cels.
    target_to_canonical = [bounded_flow(key, canonical) for key in keys]
    count = round(duration_ms / 1000 * FPS)
    output: list[np.ndarray] = []
    canonical_float = canonical.astype(np.float32) / 255
    canonical_float[..., :3] *= canonical_float[..., 3:4]
    for index in range(count):
        phase = index / count * len(keys)
        segment = math.floor(phase) % len(keys)
        amount = phase - math.floor(phase)
        left = target_to_canonical[segment]
        right = target_to_canonical[(segment + 1) % len(keys)]
        field = left * (1 - amount) + right * amount
        warped = remap(canonical_float, -field, 1)
        alpha = warped[..., 3:4]
        warped[..., :3] = np.divide(
            warped[..., :3], alpha, out=np.zeros_like(warped[..., :3]), where=alpha > 1e-5,
        )
        output.append(resize_runtime(np.clip(warped * 255, 0, 255).astype(np.uint8)))
    return output


def build_step_loop(source: list[np.ndarray], duration_ms: int) -> list[np.ndarray]:
    count = round(duration_ms / 1000 * FPS)
    return [resize_runtime(source[math.floor(index / count * len(source)) % len(source)]) for index in range(count)]


def composite(frame: np.ndarray, size: int = 336) -> np.ndarray:
    enlarged = cv2.resize(frame, (size, size), interpolation=cv2.INTER_NEAREST)
    alpha = enlarged[..., 3:4].astype(np.float32) / 255
    background = np.full((size, size, 3), 248, dtype=np.float32)
    return np.clip(enlarged[..., :3] * alpha + background * (1 - alpha), 0, 255).astype(np.uint8)


def write_loop(path: Path, frames: list[np.ndarray], repeats: int = 4) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (CANVAS, CANVAS))
    if not writer.isOpened():
        raise RuntimeError("mp4v VideoWriter unavailable")
    for _ in range(repeats):
        for frame in frames:
            writer.write(cv2.cvtColor(composite(frame, CANVAS), cv2.COLOR_RGB2BGR))
    writer.release()


def write_comparison(
    path: Path,
    current: list[np.ndarray],
    corrected_step: list[np.ndarray],
    blended: list[np.ndarray],
    single: list[np.ndarray],
    seconds: int = 7,
) -> None:
    panel = 280
    header = 54
    width = panel * 4
    height = header + panel
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (width, height))
    if not writer.isOpened():
        raise RuntimeError("comparison VideoWriter unavailable")
    labels = (
        "CURRENT: 2+ CYCLES / 720ms",
        "FIXED RHYTHM: 1 CYCLE / 1350ms",
        "8 POSE / 1350ms FLOW BLEND",
        "1 TEXTURE / 8 MESH POSE",
    )
    loops = (current, corrected_step, blended, single)
    for index in range(seconds * FPS):
        canvas = np.full((height, width, 3), 248, dtype=np.uint8)
        for column, (label, loop) in enumerate(zip(labels, loops, strict=True)):
            x = column * panel
            canvas[header:, x:x + panel] = composite(loop[index % len(loop)], panel)
            cv2.putText(canvas, label, (x + 9, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.43, (28, 36, 52), 1, cv2.LINE_AA)
        writer.write(cv2.cvtColor(canvas, cv2.COLOR_RGB2BGR))
    writer.release()


def write_contact_sheet(path: Path, frames: list[np.ndarray], count: int = 24) -> None:
    columns = 8
    rows = math.ceil(count / columns)
    cell = CANVAS * 2
    sheet = np.full((rows * cell, columns * cell, 3), 248, dtype=np.uint8)
    for index in range(count):
        frame = frames[round(index / count * len(frames)) % len(frames)]
        sheet[(index // columns) * cell:(index // columns + 1) * cell,
              (index % columns) * cell:(index % columns + 1) * cell] = composite(frame, cell)
    Image.fromarray(sheet).save(path)


def temporal_metrics(frames: list[np.ndarray]) -> dict[str, float | int]:
    premultiplied = []
    for frame in frames:
        value = frame.astype(np.float32) / 255
        value[..., :3] *= value[..., 3:4]
        premultiplied.append(value)
    differences = np.array([
        np.mean(np.abs(premultiplied[(index + 1) % len(frames)] - frame))
        for index, frame in enumerate(premultiplied)
    ])
    return {
        "frames": len(frames),
        "heldFrames": int(np.count_nonzero(differences < 1e-6)),
        "meanDelta": round(float(differences.mean()), 6),
        "p95Delta": round(float(np.percentile(differences, 95)), 6),
        "maxDelta": round(float(differences.max()), 6),
        "deltaVariation": round(float(differences.std() / max(differences.mean(), 1e-6)), 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build an isolated 8-pose mesh-morph feasibility study.")
    parser.add_argument("frames", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    source = load_frames(args.frames)
    current = build_step_loop(source, 720)
    cycle = [source[index] for index in SOURCE_CYCLE_INDICES]
    corrected_step = build_step_loop(cycle, 1350)
    fast = build_morph_loop(source, 1000)
    natural = build_morph_loop(source, 1350)
    single = build_single_texture_mesh_loop(source, 1350)
    args.output.mkdir(parents=True, exist_ok=True)
    write_loop(args.output / "candidate-corrected-cycle-step-1350ms-112px.mp4", corrected_step)
    write_loop(args.output / "candidate-8pose-1350ms-112px.mp4", natural)
    write_loop(args.output / "candidate-single-texture-mesh-1350ms-112px.mp4", single)
    write_comparison(args.output / "comparison-corrected-cycle-60fps.mp4", current, corrected_step, natural, single)
    write_contact_sheet(args.output / "candidate-8pose-1350ms-phases.png", natural)
    write_contact_sheet(args.output / "candidate-single-texture-mesh-1350ms-phases.png", single)
    report = {
        "sourceCycle": list(SOURCE_CYCLE_INDICES),
        "sourceKeyPoses": list(KEY_INDICES),
        "fps": FPS,
        "canvas": [CANVAS, CANVAS],
        "currentStep720": temporal_metrics(current),
        "correctedCycleStep1350": temporal_metrics(corrected_step),
        "meshMorph1000": temporal_metrics(fast),
        "meshMorph1350": temporal_metrics(natural),
        "singleTextureMesh1350": temporal_metrics(single),
    }
    (args.output / "metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
