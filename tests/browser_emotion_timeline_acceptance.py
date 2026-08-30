import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("WHALE_E2E_BASE_URL", "http://127.0.0.1:3107")
ARTIFACT_DIR = Path(os.environ.get("TEMP", ".")) / "dsh-dfy-emotion-timeline"
EMOTION_GROUP = os.environ.get("WHALE_E2E_EMOTION_GROUP", "1")
EMOTION_GROUPS = {
    "1": (
        ("angry", "生气", 2_800),
        ("sad", "难过", 3_200),
        ("shy", "害羞", 2_800),
        ("proud", "得意", 2_600),
    ),
    "2": (
        ("nervous", "紧张", 3_000),
        ("confused", "困惑", 2_800),
        ("mischievous", "坏笑", 2_700),
        ("determined", "认真", 3_200),
    ),
    "3": (
        ("love", "喜欢", 2_400),
        ("excited", "期待", 2_400),
        ("surprise", "惊讶", 1_500),
        ("hungry", "馋嘴", 3_000),
    ),
    "4": (
        ("happy", "开心", 2_400),
        ("pout", "委屈", 3_000),
        ("sleepy", "困倦", 3_400),
        ("relieved", "安心", 3_600),
    ),
}
EMOTIONS = EMOTION_GROUPS.get(EMOTION_GROUP, EMOTION_GROUPS["1"])
PHASES = ("视线预备", "眉眼进入", "完整保持", "恢复默认")


def build_contact_sheet(captures: dict[tuple[str, str], Path]) -> Path:
    cell_width, cell_height = 250, 220
    sheet = Image.new("RGB", (cell_width * len(EMOTIONS), cell_height * len(PHASES)), "#e9f2ff")
    draw = ImageDraw.Draw(sheet)
    font_path = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "msyh.ttc"
    font = ImageFont.truetype(str(font_path), 14) if font_path.exists() else ImageFont.load_default()
    for column, (name, label, _) in enumerate(EMOTIONS):
        for row, phase_label in enumerate(PHASES):
            source = Image.open(captures[(name, phase_label)]).convert("RGB")
            width, height = source.size
            crop = source.crop((int(width * .20), int(height * .06), int(width * .80), int(height * .50)))
            crop.thumbnail((cell_width - 16, cell_height - 30), Image.Resampling.LANCZOS)
            x = column * cell_width + (cell_width - crop.width) // 2
            y = row * cell_height + 24
            sheet.paste(crop, (x, y))
            draw.text((column * cell_width + 8, row * cell_height + 5), f"{label} · {phase_label}", fill="#23345c", font=font)
    output = ARTIFACT_DIR / f"group-{EMOTION_GROUP}-expression-timeline.png"
    sheet.save(output)
    return output


with sync_playwright() as playwright:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    chrome_path = os.environ.get("WHALE_E2E_CHROME_PATH")
    windows_chrome = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    if not chrome_path and os.name == "nt" and windows_chrome.exists():
        chrome_path = str(windows_chrome)
    browser = playwright.chromium.launch(headless=True, executable_path=chrome_path)
    page = browser.new_page(viewport={"width": 1180, "height": 820})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(f"{BASE_URL}/?whale-plugin=face-acting-group{EMOTION_GROUP}&whaleDebug=1", wait_until="networkidle")
    toggle = page.locator("[data-whale-menu-toggle]")
    stage = page.locator("[data-whale-pet-stage]")
    fx = page.locator("[data-whale-emotion-fx]")
    captures: dict[tuple[str, str], Path] = {}

    for name, label, duration in EMOTIONS:
        toggle.click()
        panel = page.locator("[data-whale-menu-panel]")
        page.wait_for_function("element => element.dataset.open === 'true'", arg=panel.element_handle())
        panel.get_by_role("tab", name="演出", exact=True).click()
        panel.get_by_role("tab", name="单独表情", exact=True).click()
        panel.locator("[data-whale-emotion-grid]").get_by_role("button", name=label, exact=True).click()
        page.wait_for_function(
            "emotion => document.querySelector('[data-whale-emotion-fx]')?.dataset.emotion === emotion",
            arg=name,
        )

        for phase_label, target_ms in zip(PHASES[:3], (90, 270, 670)):
            elapsed = 0 if phase_label == PHASES[0] else (90 if phase_label == PHASES[1] else 270)
            page.wait_for_timeout(target_ms - elapsed)
            output = ARTIFACT_DIR / f"{name}-{target_ms}.png"
            stage.screenshot(path=str(output))
            captures[(name, phase_label)] = output

        page.wait_for_timeout(max(0, duration + 520 - 670))
        page.wait_for_function(
            "element => element.dataset.emotion === 'neutral'",
            arg=page.locator("[data-whale-rig-canvas]").element_handle(),
        )
        output = ARTIFACT_DIR / f"{name}-settled.png"
        stage.screenshot(path=str(output))
        captures[(name, PHASES[3])] = output

    contact_sheet = build_contact_sheet(captures)
    print(json.dumps({
        "contactSheet": str(contact_sheet),
        "phases": list(PHASES),
        "pageErrors": page_errors,
    }, ensure_ascii=False, indent=2))
    assert not page_errors
    browser.close()
