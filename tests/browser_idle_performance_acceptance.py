import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("WHALE_E2E_BASE_URL", "http://127.0.0.1:3107")
ARTIFACT_DIR = Path(os.environ.get("TEMP", "."))


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(f"{BASE_URL}/?whale-plugin=0.1.3-idle-acting", wait_until="networkidle")

    entry = page.locator("[data-whale-pet-entry]")
    entry.wait_for(state="attached")
    page.wait_for_function(
        "element => Number(element.dataset.whaleIdlePerformanceCycle) >= 1",
        arg=entry.element_handle(),
        timeout=20_000,
    )
    performance_id = entry.get_attribute("data-whale-idle-performance")
    cycle = entry.get_attribute("data-whale-idle-performance-cycle")
    emotion = page.locator("[data-whale-emotion-fx]").get_attribute("data-emotion")
    dialogue_visible = page.locator("[data-whale-dialogue]").get_attribute("data-visible")
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-idle-performance-hold.png"), full_page=True)

    assert cycle == "1"
    assert performance_id not in (None, "waiting")
    assert emotion is not None

    page.wait_for_timeout(5_000)
    canvas = page.locator("[data-whale-rig-canvas]")
    settled_emotion = canvas.get_attribute("data-emotion")
    settled_dialogue = page.locator("[data-whale-dialogue]").get_attribute("data-visible")
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-idle-performance-settled.png"), full_page=True)
    assert settled_emotion == "neutral"
    assert settled_dialogue == "false"
    assert not page_errors

    print(json.dumps({
        "performance": performance_id,
        "cycle": cycle,
        "emotionAtHold": emotion,
        "dialogueVisible": dialogue_visible,
        "settledEmotion": settled_emotion,
        "settledDialogue": settled_dialogue,
        "pageErrors": page_errors,
    }, ensure_ascii=False, indent=2))
    browser.close()
