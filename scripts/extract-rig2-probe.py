#!/usr/bin/env python3
"""WhaleRig 2.0 phase 1A probe matting.

Deterministically turns the baked-checker RGB side-rig sheet
(character-packs/default-whale/source/side-rig-parts-v5.png) into a true RGBA
sheet and a connected-component layout report.

Strategy (no simple white threshold -- that would eat the apron/lace/skin):
  1. Detect the two "expected checkerboard" colors from the image border ring.
  2. Mark every pixel "background-ish" that is within `tolerance` (per channel)
     of either checker color.
  3. Flood-fill from the image borders through background-ish pixels only
     (4-connectivity). Anything reached is background; everything else is
     opaque character foreground. Interior whites/lace enclosed by character
     outlines stay opaque by construction.
  4. Label 8-connected foreground components, keep only components above a
     pixel floor as parts, and report every smaller blob as a dropped fragment.
  5. Verify hard invariants and write them into the report -- corners must be
     alpha 0, interior white must stay opaque. The script exits non-zero and
     prints FAIL rather than faking a pass.

Outputs (all under artifacts/whale-rig2-poc/):
  parts-transparent.png  true RGBA sheet (background alpha 0)
  parts-layout.json      kept parts as {id: [x, y, w, h]} + metadata
  matting-report.json    full bbox/pixel/alpha/verification diagnostics

Optional --debug-preview writes a contact sheet so the result can be eyeballed.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = REPO_ROOT / "character-packs" / "default-whale" / "source" / "side-rig-parts-v5.png"
DEFAULT_OUTDIR = REPO_ROOT / "artifacts" / "whale-rig2-poc"

# Near-neutral bright gray definition used to locate checker cells on the border.
NEUTRAL_EPS = 10
BORDER_BRIGHT_MIN = 200
# A component below this pixel count is a background fragment, not a part.
DEFAULT_MIN_PART_PIXELS = 2000
# "Interior white" verification threshold: pixels at/above this brightness and
# near-neutral inside the character must stay opaque.
DEFAULT_WHITE_MIN = 244
GOLDEN_OPAQUE_POINTS = (
    (145, 725), (195, 735), (220, 745),
    (750, 735), (775, 725), (800, 745),
)
GOLDEN_TRANSPARENT_POINTS = (
    (0, 0), (320, 440), (620, 700), (1180, 900),
)

# The two thigh cuffs contain near-white lace that is open to the checkerboard
# through tiny antialias gaps. Boundary flood alone therefore mistakes it for
# background. These source-space polygons cover only the lace bands, never the
# surrounding checker cells; bright, near-neutral pixels inside are restored.
WHITE_DETAIL_RECTS = (
    (119, 695, 170, 145),
    (710, 698, 166, 147),
)


def restore_authored_white_details(arr: np.ndarray, outside: np.ndarray) -> np.ndarray:
    minimum = np.min(arr, axis=2)
    maximum = np.max(arr, axis=2)
    near_white_art = (minimum >= 220) & ((maximum - minimum) <= 24)
    repaired = outside.copy()
    foreground = ~outside
    for x, y, width, height in WHITE_DETAIL_RECTS:
        roi = foreground[y:y + height, x:x + width]
        # Bridge tiny antialias gaps in the lace outline, fill only the enclosed
        # regions, then restore near-white source pixels. The operation never
        # expands the opaque silhouette into the surrounding checkerboard.
        bridged = ndimage.binary_closing(roi, structure=np.ones((7, 7), dtype=bool), iterations=2)
        enclosed = ndimage.binary_fill_holes(bridged)
        restore = enclosed & near_white_art[y:y + height, x:x + width]
        repaired[y:y + height, x:x + width][restore] = False
    return repaired


def soft_alpha_for_edges(
    arr: np.ndarray,
    outside: np.ndarray,
    light: np.ndarray,
    dark: np.ndarray,
) -> np.ndarray:
    """Return antialiased alpha without whitening the character outline."""
    foreground = ~outside
    adjacent = np.zeros_like(outside)
    adjacent[1:, :] |= outside[:-1, :]
    adjacent[:-1, :] |= outside[1:, :]
    adjacent[:, 1:] |= outside[:, :-1]
    adjacent[:, :-1] |= outside[:, 1:]
    distance = np.minimum(
        np.max(np.abs(arr - light), axis=2),
        np.max(np.abs(arr - dark), axis=2),
    )
    alpha = np.where(foreground, 255, 0).astype(np.uint8)
    edge = foreground & adjacent & (distance < 48)
    alpha[edge] = np.clip((distance[edge] - 2) * 255 / 46, 1, 255).astype(np.uint8)
    return alpha


def detect_checker_palette(arr: np.ndarray) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    """Return the two most common near-neutral bright border colors."""
    height, width, _ = arr.shape
    border = np.zeros((height, width), dtype=bool)
    border[0, :] = True
    border[-1, :] = True
    border[:, 0] = True
    border[:, -1] = True
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    bright = np.maximum(r, np.maximum(g, b)) >= BORDER_BRIGHT_MIN
    neutral = (np.abs(r - g) <= NEUTRAL_EPS) & (np.abs(g - b) <= NEUTRAL_EPS)
    ring = border & bright & neutral
    counts = Counter()
    for row, col in zip(*np.where(ring)):
        counts[tuple(int(v) for v in arr[row, col])] += 1
    if len(counts) < 2:
        raise RuntimeError("could not detect a two-tone checker palette on the image border")
    light, _ = counts.most_common(2)[0]
    dark, _ = counts.most_common(2)[1]
    return tuple(light), tuple(dark)  # type: ignore[return-value]


def background_mask(arr: np.ndarray, light: np.ndarray, dark: np.ndarray, tolerance: int) -> np.ndarray:
    d_light = np.max(np.abs(arr - light), axis=2)
    d_dark = np.max(np.abs(arr - dark), axis=2)
    return (d_light <= tolerance) | (d_dark <= tolerance)


def flood_outside(background: np.ndarray) -> np.ndarray:
    """4-connected flood from every border pixel through background-ish pixels."""
    height, width = background.shape
    outside = np.zeros((height, width), dtype=bool)
    pending: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if background[y, x] and not outside[y, x]:
            outside[y, x] = True
            pending.append((y, x))

    for x in range(width):
        seed(0, x)
        seed(height - 1, x)
    for y in range(height):
        seed(y, 0)
        seed(y, width - 1)

    while pending:
        y, x = pending.popleft()
        if y > 0:
            seed(y - 1, x)
        if y + 1 < height:
            seed(y + 1, x)
        if x > 0:
            seed(y, x - 1)
        if x + 1 < width:
            seed(y, x + 1)
    return outside


def label_components(foreground: np.ndarray) -> tuple[np.ndarray, int]:
    """8-connected component labeling. Returns (labels, count); 0 = background."""
    height, width = foreground.shape
    labels = np.zeros((height, width), dtype=np.int32)
    count = 0
    flat = foreground.reshape(-1)
    order = np.flatnonzero(flat)
    for start in order:
        if labels.reshape(-1)[start]:
            continue
        count += 1
        stack = [int(start)]
        labels.reshape(-1)[start] = count
        while stack:
            index = stack.pop()
            y, x = divmod(index, width)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dy == 0 and dx == 0:
                        continue
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < height and 0 <= nx < width:
                        neighbor = ny * width + nx
                        if flat[neighbor] and labels.reshape(-1)[neighbor] == 0:
                            labels.reshape(-1)[neighbor] = count
                            stack.append(neighbor)
    return labels, count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--outdir", type=Path, default=DEFAULT_OUTDIR)
    parser.add_argument("--tolerance", type=int, default=20, help="per-channel max distance to a checker color")
    parser.add_argument("--min-pixels", type=int, default=DEFAULT_MIN_PART_PIXELS)
    parser.add_argument("--white-min", type=int, default=DEFAULT_WHITE_MIN)
    parser.add_argument("--debug-preview", action="store_true", help="write a contact-sheet preview PNG for eyeballing")
    args = parser.parse_args()

    if not args.source.is_file():
        raise SystemExit(f"source not found: {args.source}")
    rgb = Image.open(args.source).convert("RGB")
    arr = np.asarray(rgb, dtype=np.int16)
    height, width, _ = arr.shape

    light, dark = detect_checker_palette(arr)
    light_a = np.asarray(light, dtype=np.int16)
    dark_a = np.asarray(dark, dtype=np.int16)
    background = background_mask(arr, light_a, dark_a, args.tolerance)
    outside = flood_outside(background)
    outside = restore_authored_white_details(arr, outside)
    foreground = ~outside
    labels, component_count = label_components(foreground)

    # Per-component stats.
    stats: dict[int, dict] = {}
    for index in range(1, component_count + 1):
        ys, xs = np.where(labels == index)
        stats[index] = {
            "y0": int(ys.min()), "x0": int(xs.min()),
            "y1": int(ys.max()), "x1": int(xs.max()),
            "pixels": int(len(ys)),
        }
    parts = {index: s for index, s in stats.items() if s["pixels"] >= args.min_pixels}
    fragments = {index: s for index, s in stats.items() if s["pixels"] < args.min_pixels}

    # Build the RGBA output (opaque everywhere outside the boundary-connected bg).
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    rgba[..., 0:3] = np.clip(arr, 0, 255)
    rgba[..., 3] = soft_alpha_for_edges(arr, outside, light_a, dark_a)

    # ---- verification -------------------------------------------------------
    corners = [(0, 0), (0, width - 1), (height - 1, 0), (height - 1, width - 1)]
    corner_alphas = [int(rgba[y, x, 3]) for y, x in corners]
    corners_pass = all(a == 0 for a in corner_alphas)

    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    near_white = (np.minimum(r, np.minimum(g, b)) >= args.white_min) & (
        np.abs(r - g) <= NEUTRAL_EPS
    ) & (np.abs(g - b) <= NEUTRAL_EPS)
    interior_white = near_white & foreground
    interior_white_visible = bool(np.all(rgba[..., 3][interior_white] > 0)) if interior_white.any() else True
    interior_white_count = int(interior_white.sum())
    golden_opaque_alphas = [int(rgba[y, x, 3]) for x, y in GOLDEN_OPAQUE_POINTS]
    golden_transparent_alphas = [int(rgba[y, x, 3]) for x, y in GOLDEN_TRANSPARENT_POINTS]
    golden_anchors_pass = all(alpha >= 250 for alpha in golden_opaque_alphas) \
        and all(alpha == 0 for alpha in golden_transparent_alphas)

    # Enclosed background-ish pixels (kept opaque so lace/skin survives).
    holes = background & ~outside
    neutral_holes = holes & near_white
    neutral_hole_count = int(neutral_holes.sum())

    part_entries: dict[str, dict] = {}
    layout_parts: dict[str, list[int]] = {}
    all_parts_pass = True
    for reading_order, index in enumerate(sorted(parts, key=lambda i: (stats[i]["y0"], stats[i]["x0"]))):
        s = stats[index]
        x0, y0, x1, y1 = s["x0"], s["y0"], s["x1"], s["y1"]
        bbox_mask = labels == index
        part_alpha = rgba[..., 3][bbox_mask]
        opaque = int((part_alpha == 255).sum())
        semi = int(((part_alpha > 0) & (part_alpha < 255)).sum())
        positive = int((part_alpha > 0).sum())
        width_px = x1 - x0 + 1
        height_px = y1 - y0 + 1
        bbox_in_image = x0 >= 0 and y0 >= 0 and x1 < width and y1 < height
        part_pass = (
            s["pixels"] >= args.min_pixels
            and bbox_in_image
            and positive == s["pixels"]
        )
        all_parts_pass = all_parts_pass and part_pass
        part_id = f"part-{reading_order:02d}"
        layout_parts[part_id] = [x0, y0, width_px, height_px]
        part_entries[part_id] = {
            "bbox": [x0, y0, width_px, height_px],
            "pixels": s["pixels"],
            "areaPx": width_px * height_px,
            "opaquePixels": opaque,
            "semiTransparentPixels": semi,
            "pass": part_pass,
        }

    overall_pass = corners_pass and interior_white_visible and golden_anchors_pass and all_parts_pass
    report = {
        "schemaVersion": 1,
        "source": str(args.source.relative_to(REPO_ROOT)) if args.source.is_relative_to(REPO_ROOT) else str(args.source),
        "imageSize": [width, height],
        "inputFormat": "RGB (checker baked, no alpha)",
        "checkerPalette": {"light": list(light), "dark": list(dark)},
        "tolerance": args.tolerance,
        "backgroundRemovedPixels": int(outside.sum()),
        "foregroundPixels": int(foreground.sum()),
        "holes": {
            "enclosedBackgroundLikePixelsKeptOpaque": int(holes.sum()),
            "ofWhichNeutralCheckerLike": neutral_hole_count,
            "note": "enclosed near-checker pixels inside a part stay opaque to preserve apron/lace/skin",
        },
        "components": {"total": component_count, "keptParts": len(parts), "droppedFragments": len(fragments)},
        "parts": part_entries,
        "fragments": [
            {"bbox": [s["x0"], s["y0"], s["x1"] - s["x0"] + 1, s["y1"] - s["y0"] + 1], "pixels": s["pixels"]}
            for s in sorted(fragments.values(), key=lambda s: -s["pixels"])
        ],
        "verification": {
            "cornersTransparent": {"pass": corners_pass, "cornerAlphas": corner_alphas},
            "interiorWhiteVisible": {"pass": interior_white_visible, "count": interior_white_count},
            "goldenAnchors": {
                "pass": golden_anchors_pass,
                "opaquePoints": [list(point) for point in GOLDEN_OPAQUE_POINTS],
                "opaqueAlphas": golden_opaque_alphas,
                "transparentPoints": [list(point) for point in GOLDEN_TRANSPARENT_POINTS],
                "transparentAlphas": golden_transparent_alphas,
            },
            "allPartsPass": all_parts_pass,
        },
        "overall": "PASS" if overall_pass else "FAIL",
    }

    layout = {
        "schemaVersion": 1,
        "source": report["source"],
        "imageSize": [width, height],
        "checkerPalette": report["checkerPalette"],
        "parts": layout_parts,
        "partPixels": {part_id: entry["pixels"] for part_id, entry in part_entries.items()},
        "keptCount": len(parts),
        "droppedFragmentCount": len(fragments),
        "note": "probe material from side-rig-parts-v5.png; not approved final art",
    }

    args.outdir.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(args.outdir / "parts-transparent.png")
    (args.outdir / "parts-layout.json").write_text(
        json.dumps(layout, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (args.outdir / "matting-report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    if args.debug_preview:
        # Contact sheet: each kept part composited on a dark checker for eyeballing.
        preview = Image.new("RGB", (width, height), (24, 24, 28))
        preview.paste(Image.fromarray(rgba, "RGBA"), (0, 0), Image.fromarray(rgba, "RGBA"))
        preview.save(args.outdir / "debug-preview.png")

    print(f"source={report['source']}")
    print(f"checker={report['checkerPalette']} tolerance={args.tolerance}")
    print(f"components={component_count} keptParts={len(parts)} fragments={len(fragments)}")
    print(f"backgroundRemoved={report['backgroundRemovedPixels']} foreground={report['foregroundPixels']}")
    print(f"interiorWhiteVisible={interior_white_visible} (count={interior_white_count})")
    print(f"goldenAnchors={golden_anchors_pass} opaque={golden_opaque_alphas} transparent={golden_transparent_alphas}")
    print(f"corners={corner_alphas} allPartsPass={all_parts_pass}")
    print(f"overall={report['overall']}")
    print(f"wrote {args.outdir}/parts-transparent.png, parts-layout.json, matting-report.json")

    if not overall_pass:
        raise SystemExit("matting verification FAILED -- see matting-report.json")


if __name__ == "__main__":
    main()
