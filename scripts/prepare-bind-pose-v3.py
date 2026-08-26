#!/usr/bin/env python3
"""Prepare and validate the canonical Whale Maid bind-pose master.

This script never invents character pixels. It normalizes an already reviewed
RGBA source, keeps a high-resolution master, builds a 1024-square canonical
asset, and writes objective alpha/debug artifacts before part separation.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def normalize_alpha(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[:, :, 3]
    alpha[alpha <= 4] = 0
    alpha[alpha >= 248] = 255
    rgba[alpha == 0, :3] = 0
    return Image.fromarray(rgba, "RGBA")


def premultiplied_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = rgba[:, :, 3:4] / 255.0
    premultiplied = np.concatenate((rgba[:, :, :3] * alpha, rgba[:, :, 3:4]), axis=2)
    resized = np.asarray(
        Image.fromarray(np.clip(premultiplied, 0, 255).astype(np.uint8), "RGBA").resize(
            size,
            Image.Resampling.LANCZOS,
        ),
        dtype=np.float32,
    )
    resized_alpha = resized[:, :, 3:4]
    rgb = np.divide(
        resized[:, :, :3] * 255.0,
        resized_alpha,
        out=np.zeros_like(resized[:, :, :3]),
        where=resized_alpha > 0,
    )
    result = np.concatenate((rgb, resized_alpha), axis=2)
    return normalize_alpha(Image.fromarray(np.clip(result, 0, 255).astype(np.uint8), "RGBA"))


def alpha_metrics(image: Image.Image) -> dict[str, object]:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    total = int(alpha.size)
    transparent = int(np.count_nonzero(alpha == 0))
    opaque = int(np.count_nonzero(alpha == 255))
    partial = total - transparent - opaque
    effective_solid = int(np.count_nonzero(alpha >= 224))
    return {
        "totalPixels": total,
        "transparentPixels": transparent,
        "opaquePixels": opaque,
        "partialAlphaPixels": partial,
        "effectiveSolidPixels": effective_solid,
        "transparentRatio": transparent / total,
        "opaqueRatio": opaque / total,
        "partialAlphaRatio": partial / total,
        "effectiveSolidRatio": effective_solid / total,
        "alphaExtrema": list(image.getchannel("A").getextrema()),
        "contentBounds": list(image.getchannel("A").getbbox() or (0, 0, 0, 0)),
    }


def composite(image: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    return Image.alpha_composite(Image.new("RGBA", image.size, color), image).convert("RGB")


def write_report(
    output: Path,
    input_path: Path,
    master_path: Path,
    canonical_path: Path,
    metrics: dict[str, object],
    visual_status: str,
) -> None:
    automated_pass = (
        metrics["alphaExtrema"] == [0, 255]
        and float(metrics["transparentRatio"]) >= 0.20
        and float(metrics["effectiveSolidRatio"]) >= 0.15
    )
    final_pass = automated_pass and visual_status == "PASS"
    report = {
        "schemaVersion": 1,
        "kind": "bind-pose-transparency-validation",
        "input": input_path.as_posix(),
        "highResolutionMaster": master_path.as_posix(),
        "canonicalMaster": canonical_path.as_posix(),
        "format": "PNG",
        "mode": "RGBA",
        "size": list(Image.open(canonical_path).size),
        "metrics": metrics,
        "automatedStatus": "PASS" if automated_pass else "FAIL",
        "darkBackgroundCheck": visual_status,
        "lightBackgroundCheck": visual_status,
        "checkerboardResidue": "NO" if visual_status == "PASS" else "REVIEW",
        "obviousHalo": "NO" if visual_status == "PASS" else "REVIEW",
        "status": "PASS" if final_pass else "FAIL",
    }
    (output / "reports" / "transparency-validation.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    percent = lambda value: f"{float(value) * 100:.3f}%"
    markdown = f"""# 透明主图验收报告

- 输入图片：`{input_path.as_posix()}`
- 高分辨率主图：`{master_path.as_posix()}`
- 统一坐标主图：`{canonical_path.as_posix()}`
- 尺寸：{report['size'][0]} × {report['size'][1]}
- 格式：PNG
- 模式：RGBA
- Alpha 范围：{metrics['alphaExtrema']}
- 完全透明像素：{metrics['transparentPixels']}（{percent(metrics['transparentRatio'])}）
- 完全不透明像素：{metrics['opaquePixels']}（{percent(metrics['opaqueRatio'])}）
- 部分透明像素：{metrics['partialAlphaPixels']}（{percent(metrics['partialAlphaRatio'])}）
- 有效实体像素（Alpha ≥ 224）：{metrics['effectiveSolidPixels']}（{percent(metrics['effectiveSolidRatio'])}）
- 深色背景检查：{report['darkBackgroundCheck']}
- 浅色背景检查：{report['lightBackgroundCheck']}
- 棋盘格残留：{report['checkerboardResidue']}
- 明显边缘光晕：{report['obviousHalo']}
- 自动检查：{report['automatedStatus']}
- 最终结论：{report['status']}

## 说明

源图中接近实体的 Alpha 253 已规范为 255；极低 Alpha 背景噪声已清零，边缘抗锯齿仍保留。
此结论只表示透明主图可以进入分层准备，不表示零件、绑定或动画已经通过。
"""
    (output / "reports" / "TRANSPARENCY_VALIDATION.md").write_text(markdown, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare the Whale Maid bind-pose v3 source package.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--visual-status", choices=("PASS", "FAIL"), default="FAIL")
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    for child in ("source", "textures", "debug", "rig", "reports"):
        (args.output / child).mkdir(exist_ok=True)

    high_resolution = normalize_alpha(Image.open(args.input))
    master_path = args.output / "source" / "whale-maid-master-1254.png"
    canonical_path = args.output / "source" / "whale-maid-master-1024.png"
    high_resolution.save(master_path, optimize=True)
    canonical = premultiplied_resize(high_resolution, (1024, 1024))
    canonical.save(canonical_path, optimize=True)

    composite(canonical, (25, 25, 30, 255)).save(args.output / "debug" / "master-on-dark.png", optimize=True)
    composite(canonical, (240, 240, 240, 255)).save(args.output / "debug" / "master-on-light.png", optimize=True)
    alpha = canonical.getchannel("A")
    Image.merge("RGB", (alpha, alpha, alpha)).save(args.output / "debug" / "master-alpha.png", optimize=True)

    metrics = alpha_metrics(canonical)
    write_report(args.output, args.input, master_path, canonical_path, metrics, args.visual_status)
    transform = {
        "schemaVersion": 1,
        "id": "whale-maid-bind-v3",
        "sourceSize": list(high_resolution.size),
        "canonicalSize": list(canonical.size),
        "sourceToCanonicalScale": [canonical.width / high_resolution.width, canonical.height / high_resolution.height],
        "sourceToCanonicalOffset": [0, 0],
        "coordinateSystem": "canvas-y-down",
        "partCanvasPolicy": "all-parts-share-1024-square-canvas",
    }
    (args.output / "manifest.json").write_text(
        json.dumps(transform, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"status": "PASS" if args.visual_status == "PASS" else "FAIL", "metrics": metrics}))


if __name__ == "__main__":
    main()
