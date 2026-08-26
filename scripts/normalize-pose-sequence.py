from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def fit_background(image: Image.Image) -> np.ndarray:
    """Fit the generator's neutral vignette without sampling the character."""

    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    height, width, _ = rgb.shape
    border = max(12, min(width, height) // 12)
    yy, xx = np.mgrid[0:height, 0:width]
    sample = (xx < border) | (xx >= width - border) | (yy < border) | (yy >= height - border)
    x = (xx[sample] / max(1, width - 1) - 0.5).astype(np.float64)
    y = (yy[sample] / max(1, height - 1) - 0.5).astype(np.float64)
    design = np.column_stack((np.ones_like(x), x, y, x * x, y * y, x * y))
    gray = rgb[sample].mean(axis=1).astype(np.float64)
    coefficients, *_ = np.linalg.lstsq(design, gray, rcond=None)

    full_x = xx / max(1, width - 1) - 0.5
    full_y = yy / max(1, height - 1) - 0.5
    return (
        coefficients[0]
        + coefficients[1] * full_x
        + coefficients[2] * full_y
        + coefficients[3] * full_x * full_x
        + coefficients[4] * full_y * full_y
        + coefficients[5] * full_x * full_y
    ).astype(np.float32)


def components(mask: np.ndarray) -> list[tuple[list[tuple[int, int]], bool]]:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    found: list[tuple[list[tuple[int, int]], bool]] = []
    for start_y, start_x in zip(*np.nonzero(mask & ~visited), strict=False):
        if visited[start_y, start_x]:
            continue
        visited[start_y, start_x] = True
        queue = deque([(int(start_x), int(start_y))])
        points: list[tuple[int, int]] = []
        touches_edge = False
        while queue:
            x, y = queue.popleft()
            points.append((x, y))
            touches_edge = touches_edge or x == 0 or y == 0 or x == width - 1 or y == height - 1
            for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if next_x < 0 or next_x >= width or next_y < 0 or next_y >= height:
                    continue
                if visited[next_y, next_x] or not mask[next_y, next_x]:
                    continue
                visited[next_y, next_x] = True
                queue.append((next_x, next_y))
        found.append((points, touches_edge))
    return found


def extract_character(image: Image.Image) -> Image.Image:
    """Remove a neutral generated background while preserving enclosed whites."""

    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    model = fit_background(image)
    high = rgb.max(axis=2).astype(np.int16)
    low = rgb.min(axis=2).astype(np.int16)
    chroma = high - low
    brightness = rgb.mean(axis=2)
    model_distance = np.sqrt(((rgb.astype(np.float32) - model[..., None]) ** 2).sum(axis=2))
    candidate = (chroma <= 18) & (brightness >= 105) & (model_distance <= 34)

    background = np.zeros(candidate.shape, dtype=bool)
    minimum_hole = max(180, image.width * image.height // 9000)
    for points, touches_edge in components(candidate):
        if not touches_edge and len(points) < minimum_hole:
            continue
        xs = np.fromiter((point[0] for point in points), dtype=np.int32)
        ys = np.fromiter((point[1] for point in points), dtype=np.int32)
        if touches_edge or float(np.median(model_distance[ys, xs])) <= 17:
            background[ys, xs] = True

    alpha = np.full(candidate.shape, 255, dtype=np.uint8)
    alpha[background] = 0
    rgba = np.dstack((rgb, alpha))
    return Image.fromarray(rgba, mode="RGBA")


def remove_neutral_floor_artifacts(image: Image.Image) -> Image.Image:
    """Drop generator shadows/watermarks from the lower neutral backdrop.

    Authored blue shoes and tail pixels retain enough chroma to survive this
    source-specific cleanup; the option remains opt-in for ordinary pose art.
    """

    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    rgb = rgba[..., :3]
    height, width, _ = rgb.shape
    high = rgb.max(axis=2).astype(np.int16)
    low = rgb.min(axis=2).astype(np.int16)
    chroma = high - low
    brightness = rgb.mean(axis=2)
    yy, xx = np.mgrid[0:height, 0:width]
    shadow = (yy >= height * 0.76) & (chroma <= 22) & (brightness <= 185)
    watermark = (yy >= height * 0.82) & (xx >= width * 0.68) & (chroma <= 36)
    rgba[..., 3][shadow | watermark] = 0
    return Image.fromarray(rgba, mode="RGBA")


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    """Keep the connected authored silhouette and discard detached video debris."""

    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    found = components(rgba[..., 3] > 0)
    if not found:
        return image.convert("RGBA")
    points, _ = max(found, key=lambda item: len(item[0]))
    keep = np.zeros(rgba.shape[:2], dtype=bool)
    xs = np.fromiter((point[0] for point in points), dtype=np.int32)
    ys = np.fromiter((point[1] for point in points), dtype=np.int32)
    keep[ys, xs] = True
    rgba[..., 3][~keep] = 0
    return Image.fromarray(rgba, mode="RGBA")


def largest_face_box(image: Image.Image) -> tuple[int, int, int, int]:
    """Find the largest skin-tone component in the head region."""

    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    rgb = rgba[..., :3]
    height, width, _ = rgb.shape
    red, green, blue = (rgb[..., index].astype(np.int16) for index in range(3))
    skin = (
        (rgba[..., 3] > 0)
        & (red >= 170)
        & (green >= 95)
        & (blue >= 70)
        & (red - green >= 20)
        & (green - blue >= 0)
    )
    skin[:, int(width * 0.62):] = False
    skin[int(height * 0.68):, :] = False
    candidates = [points for points, _ in components(skin) if len(points) >= 40]
    if not candidates:
        raise ValueError("could not locate face component")
    face = max(candidates, key=len)
    xs = [point[0] for point in face]
    ys = [point[1] for point in face]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def normalize_to_face(
    image: Image.Image,
    face: tuple[int, int, int, int],
    reference: tuple[int, int, int, int],
) -> Image.Image:
    face_width = face[2] - face[0]
    face_height = face[3] - face[1]
    reference_width = reference[2] - reference[0]
    reference_height = reference[3] - reference[1]
    scale = ((reference_width / face_width) * (reference_height / face_height)) ** 0.5
    scaled = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    face_center = ((face[0] + face[2]) * scale / 2, (face[1] + face[3]) * scale / 2)
    reference_center = ((reference[0] + reference[2]) / 2, (reference[1] + reference[3]) / 2)
    offset = (round(reference_center[0] - face_center[0]), round(reference_center[1] - face_center[1]))
    canvas = Image.new("RGBA", image.size)
    canvas.alpha_composite(scaled, offset)
    return canvas


def alpha_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").getbbox()
    if box is None:
        raise ValueError("empty character frame")
    return box


def common_square(frames: list[Image.Image], padding: float) -> tuple[int, int, int, int]:
    boxes = [alpha_box(frame) for frame in frames]
    left = min(box[0] for box in boxes)
    top = min(box[1] for box in boxes)
    right = max(box[2] for box in boxes)
    bottom = max(box[3] for box in boxes)
    side = round(max(right - left, bottom - top) * (1 + padding * 2))
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    return round(center_x - side / 2), round(center_y - side / 2), round(center_x + side / 2), round(center_y + side / 2)


def crop_with_padding(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    output = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]))
    source_box = (
        max(0, box[0]),
        max(0, box[1]),
        min(image.width, box[2]),
        min(image.height, box[3]),
    )
    output.alpha_composite(image.crop(source_box), (source_box[0] - box[0], source_box[1] - box[1]))
    return output


def contact_sheet(frames: list[Image.Image], columns: int = 3) -> Image.Image:
    rows = (len(frames) + columns - 1) // columns
    cell = frames[0].width
    sheet = Image.new("RGBA", (columns * cell, rows * cell))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * cell, (index // columns) * cell))
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize generated character poses to one face anchor and canvas.")
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--reference", type=int, default=0)
    parser.add_argument("--size", type=int, default=192)
    parser.add_argument("--padding", type=float, default=0.04)
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--colors", type=int, default=128)
    parser.add_argument("--preserve-source-scale", action="store_true")
    parser.add_argument("--clean-neutral-floor", action="store_true")
    parser.add_argument("--keep-largest-component", action="store_true")
    args = parser.parse_args()

    if not 0 <= args.reference < len(args.inputs):
        parser.error("--reference is outside the input sequence")
    if args.size <= 0 or args.fps <= 0 or not 0 <= args.padding <= 0.25 or not 16 <= args.colors <= 256:
        parser.error("invalid output settings")

    extracted = [extract_character(Image.open(path)) for path in args.inputs]
    if args.clean_neutral_floor:
        extracted = [remove_neutral_floor_artifacts(frame) for frame in extracted]
    if args.keep_largest_component:
        extracted = [keep_largest_alpha_component(frame) for frame in extracted]
    faces = [largest_face_box(frame) for frame in extracted]
    normalized = extracted if args.preserve_source_scale else [
        normalize_to_face(frame, face, faces[args.reference])
        for frame, face in zip(extracted, faces, strict=True)
    ]
    crop = common_square(normalized, args.padding)
    runtime = [
        crop_with_padding(frame, crop).resize((args.size, args.size), Image.Resampling.LANCZOS)
        for frame in normalized
    ]

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(runtime):
        frame.save(args.output_dir / f"frame-{index:02d}.png", optimize=True)
    sheet = contact_sheet(runtime)
    sheet.save(args.output_dir / "contact-sheet.png", optimize=True)
    sheet.quantize(
        colors=args.colors,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    ).save(args.output_dir / "runtime-atlas.png", optimize=True)
    runtime[0].save(
        args.output_dir / "preview.gif",
        save_all=True,
        append_images=runtime[1:],
        duration=round(1000 / args.fps),
        loop=0,
        disposal=2,
        transparency=0,
    )
    for index, (face, frame) in enumerate(zip(faces, runtime, strict=True)):
        print(f"{index:02d} face={face} alpha={alpha_box(frame)}")


if __name__ == "__main__":
    main()
