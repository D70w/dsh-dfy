from __future__ import annotations

import json
from io import BytesIO
import os
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "whale-rig2-poc" / "visual-inspection"
URL = "http://127.0.0.1:3105/artifacts/whale-rig2-poc/preview.html"
PHASES_MS = (0, 169, 338, 506, 675, 844, 1013, 1181)
FALLBACK_CHROMIUM = Path.home() / "AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe"


def capture_phases(page, *, show_skeleton: bool, show_parts: bool, prefix: str, selector: str = "#stage") -> list[Image.Image]:
    page.locator("#skeleton").set_checked(show_skeleton)
    page.locator("#parts").set_checked(show_parts)
    frames: list[Image.Image] = []
    for phase_ms in PHASES_MS:
        page.locator("#scrub").fill(str(phase_ms))
        page.locator("#scrub").dispatch_event("input")
        page.wait_for_timeout(30)
        png = page.locator(selector).screenshot()
        frame = Image.open(BytesIO(png)).convert("RGBA")
        frames.append(frame)
        frame.save(OUTPUT / f"{prefix}-{phase_ms:04d}.png")
    return frames


def write_contact_sheet(frames: list[Image.Image], target: Path) -> None:
    cell_w, cell_h = frames[0].size
    label_h = 24
    sheet = Image.new("RGB", (cell_w * 4, (cell_h + label_h) * 2), "#111318")
    draw = ImageDraw.Draw(sheet)
    for index, (phase_ms, frame) in enumerate(zip(PHASES_MS, frames, strict=True)):
        x = (index % 4) * cell_w
        y = (index // 4) * (cell_h + label_h)
        sheet.paste(frame.convert("RGB"), (x, y))
        draw.text((x + 8, y + cell_h + 4), f"{phase_ms} ms", fill="#dfe3ea")
    sheet.save(target)


def foreground_mask(frame: Image.Image):
    import numpy as np

    rgb = np.asarray(frame.convert("RGB"), dtype=np.int16)
    background = np.asarray((15, 17, 22), dtype=np.int16)
    return np.max(np.abs(rgb - background), axis=2) > 18


def silhouette_metrics(actual: list[Image.Image], reference: list[Image.Image]) -> list[dict]:
    import numpy as np

    metrics: list[dict] = []
    for phase_ms, actual_frame, reference_frame in zip(PHASES_MS, actual, reference, strict=True):
        actual_mask = foreground_mask(actual_frame)
        reference_mask = foreground_mask(reference_frame)
        intersection = int(np.logical_and(actual_mask, reference_mask).sum())
        union = int(np.logical_or(actual_mask, reference_mask).sum())

        def geometry(mask):
            ys, xs = np.where(mask)
            return {
                "bbox": [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)],
                "centroid": [float(xs.mean()), float(ys.mean())],
            }

        actual_geometry = geometry(actual_mask)
        reference_geometry = geometry(reference_mask)
        centroid_delta = float(np.hypot(
            actual_geometry["centroid"][0] - reference_geometry["centroid"][0],
            actual_geometry["centroid"][1] - reference_geometry["centroid"][1],
        ))
        metrics.append({
            "phaseMs": phase_ms,
            "silhouetteIoU": intersection / union if union else 0,
            "centroidDeltaPx": centroid_delta,
            "actual": actual_geometry,
            "reference": reference_geometry,
        })
    return metrics


def write_silhouette_diff(actual: list[Image.Image], reference: list[Image.Image], target: Path) -> None:
    import numpy as np

    frames: list[Image.Image] = []
    for actual_frame, reference_frame in zip(actual, reference, strict=True):
        actual_mask = foreground_mask(actual_frame)
        reference_mask = foreground_mask(reference_frame)
        canvas = np.zeros((*actual_mask.shape, 3), dtype=np.uint8)
        canvas[np.logical_and(actual_mask, reference_mask)] = (224, 228, 237)
        canvas[np.logical_and(actual_mask, ~reference_mask)] = (255, 93, 108)
        canvas[np.logical_and(~actual_mask, reference_mask)] = (77, 208, 225)
        frames.append(Image.fromarray(canvas, "RGB"))
    write_contact_sheet(frames, target)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    console_errors: list[str] = []
    with sync_playwright() as playwright:
        executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
        if executable is None and FALLBACK_CHROMIUM.is_file():
            executable = str(FALLBACK_CHROMIUM)
        browser = playwright.chromium.launch(headless=True, executable_path=executable)
        page = browser.new_page(viewport={"width": 1100, "height": 720}, device_scale_factor=1)
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.goto(URL, wait_until="load")
        page.locator("#play").click()

        skeleton = capture_phases(page, show_skeleton=True, show_parts=False, prefix="skeleton")
        parts = capture_phases(page, show_skeleton=False, show_parts=True, prefix="parts")
        reference = capture_phases(
            page, show_skeleton=False, show_parts=True, prefix="reference", selector="#reference",
        )
        combined = capture_phases(page, show_skeleton=True, show_parts=True, prefix="combined")

        write_contact_sheet(skeleton, OUTPUT / "skeleton-contact-sheet.png")
        write_contact_sheet(parts, OUTPUT / "parts-contact-sheet.png")
        write_contact_sheet(reference, OUTPUT / "reference-contact-sheet.png")
        write_contact_sheet(combined, OUTPUT / "combined-contact-sheet.png")
        write_silhouette_diff(parts, reference, OUTPUT / "silhouette-diff-contact-sheet.png")

        page.screenshot(path=str(OUTPUT / "preview-page.png"), full_page=True)
        metrics = page.locator("#metrics").inner_text()
        browser.close()

    comparisons = silhouette_metrics(parts, reference)
    report = {
        "url": URL,
        "phasesMs": list(PHASES_MS),
        "consoleErrors": console_errors,
        "metricsText": metrics,
        "silhouette": comparisons,
        "silhouetteMeanIoU": sum(item["silhouetteIoU"] for item in comparisons) / len(comparisons),
        "centroidMaxDeltaPx": max(item["centroidDeltaPx"] for item in comparisons),
    }
    (OUTPUT / "inspection.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
