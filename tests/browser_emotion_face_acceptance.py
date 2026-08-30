import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = ImageDraw = ImageFont = None


BASE_URL = os.environ.get("WHALE_E2E_BASE_URL", "http://127.0.0.1:3107")
ARTIFACT_DIR = Path(os.environ.get("TEMP", ".")) / "dsh-dfy-emotion-faces"
EMOTIONS = (
    ("love", "喜欢"),
    ("shy", "害羞"),
    ("angry", "生气"),
    ("surprise", "惊讶"),
    ("sad", "难过"),
    ("happy", "开心"),
    ("confused", "困惑"),
    ("pout", "委屈"),
    ("sleepy", "困倦"),
    ("proud", "得意"),
    ("excited", "期待"),
    ("mischievous", "坏笑"),
    ("relieved", "安心"),
    ("determined", "认真"),
    ("nervous", "紧张"),
    ("hungry", "馋嘴"),
)


def build_contact_sheet(captures: list[tuple[str, Path]]) -> Path | None:
    if Image is None or ImageDraw is None or ImageFont is None:
        return None
    cell_width, cell_height = 260, 248
    sheet = Image.new("RGB", (cell_width * 4, cell_height * 4), "#e9f2ff")
    draw = ImageDraw.Draw(sheet)
    font_path = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "msyh.ttc"
    font = ImageFont.truetype(str(font_path), 15) if font_path.exists() else ImageFont.load_default()
    for index, (label, path) in enumerate(captures):
        source = Image.open(path).convert("RGB")
        # The face occupies the upper-middle area of the square Live2D canvas.
        width, height = source.size
        crop = source.crop((int(width * .20), int(height * .06), int(width * .80), int(height * .50)))
        crop.thumbnail((cell_width - 18, cell_height - 34), Image.Resampling.LANCZOS)
        x = index % 4 * cell_width + (cell_width - crop.width) // 2
        y = index // 4 * cell_height + 24
        sheet.paste(crop, (x, y))
        draw.text((index % 4 * cell_width + 10, index // 4 * cell_height + 6), label, fill="#23345c", font=font)
    output = ARTIFACT_DIR / "emotion-face-contact-sheet.png"
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
    page.goto(f"{BASE_URL}/?whale-plugin=emotion-eye-audit-local&whaleDebug=1", wait_until="networkidle")
    toggle = page.locator("[data-whale-menu-toggle]")
    stage = page.locator("[data-whale-pet-stage]")
    fx = page.locator("[data-whale-emotion-fx]")
    toggle.wait_for(state="visible")

    captures: list[tuple[str, Path]] = []
    for name, label in EMOTIONS:
        toggle.click()
        panel = page.locator("[data-whale-menu-panel]")
        page.wait_for_function("element => element.dataset.open === 'true'", arg=panel.element_handle())
        panel.get_by_role("tab", name="演出", exact=True).click()
        panel.get_by_role("tab", name="单独表情", exact=True).click()
        panel.locator("[data-whale-emotion-grid]").get_by_role("button", name=label, exact=True).click()
        page.wait_for_function(
            "name => document.querySelector('[data-whale-emotion-fx]')?.dataset.emotion === name",
            arg=name,
        )
        page.wait_for_timeout(620)
        assert fx.get_attribute("data-emotion") == name
        output = ARTIFACT_DIR / f"{name}.png"
        stage.screenshot(path=str(output))
        captures.append((label, output))

    contact_sheet = build_contact_sheet(captures)
    print(json.dumps({
        "captured": [name for name, _ in EMOTIONS],
        "contactSheet": str(contact_sheet) if contact_sheet else None,
        "pageErrors": page_errors,
    }, ensure_ascii=False, indent=2))
    assert not page_errors
    browser.close()
