import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("WHALE_E2E_BASE_URL", "http://127.0.0.1:3107")
ARTIFACT_DIR = Path(os.environ.get("TEMP", "."))


def inside_viewport(box: dict[str, float], width: int, height: int) -> bool:
    return (
        box["x"] >= 10
        and box["y"] >= 10
        and box["x"] + box["width"] <= width - 10
        and box["y"] + box["height"] <= height - 10
    )


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(f"{BASE_URL}/?whale-plugin=0.1.3-menu-adaptive", wait_until="networkidle")
    page.locator("[data-whale-pet-entry]").wait_for(state="attached")

    toggle = page.locator("[data-whale-menu-toggle]")
    toggle.wait_for(state="visible")
    toggle.click()
    panel = page.locator("[data-whale-menu-panel]")
    page.wait_for_function("element => element.dataset.open === 'true'", arg=panel.element_handle())
    page.wait_for_timeout(300)
    initial = panel.bounding_box()
    assert initial is not None and inside_viewport(initial, 1440, 900)

    menu_text = panel.inner_text()
    assert "追赶蝴蝶" not in menu_text
    assert "到光标附近" not in menu_text
    assert "回到当前位置" not in menu_text
    assert "摸摸她" in menu_text and "给她白饭" in menu_text
    assert panel.locator("[data-whale-interaction-empty]").count() == 1
    assert panel.locator("[data-whale-interaction-action]").count() == 4
    panel.locator("[data-whale-interaction-action]").nth(3).click()
    page.wait_for_function("element => element.dataset.open === 'false'", arg=panel.element_handle())
    entry = page.locator("[data-whale-pet-entry]")
    page.wait_for_function("element => element.dataset.whaleVideoAction !== 'none'", arg=entry.element_handle())
    random_video = page.locator("[data-whale-action-video]")
    page.wait_for_function("element => !element.paused && element.currentTime > 0", arg=random_video.element_handle())
    assert page.locator("[data-whale-dialogue]").get_attribute("data-context") == "classic-performance"
    random_video.evaluate("element => { element.playbackRate = 8 }")
    page.wait_for_function("element => element.dataset.whaleVideoAction === 'none'", arg=entry.element_handle(), timeout=15_000)
    toggle.click()
    panel.get_by_role("tab", name="互动", exact=True).click()
    panel.locator("[data-whale-interaction-action]").first.click()
    page.wait_for_function("element => element.dataset.open === 'false'", arg=panel.element_handle())
    toggle.click()
    panel.get_by_role("tab", name="互动", exact=True).click()
    assert panel.locator("[data-whale-interaction-record]").count() == 2
    interaction_text = panel.locator("[data-whale-interaction-history]").inner_text()
    assert "随机演出" in interaction_text and "摸摸她" in interaction_text

    header = panel.locator("[data-whale-menu-head]")
    header_box = header.bounding_box()
    assert header_box is not None
    page.mouse.move(header_box["x"] + 80, header_box["y"] + 25)
    page.mouse.down()
    page.mouse.move(header_box["x"] + 220, header_box["y"] - 80, steps=10)
    page.mouse.up()
    page.wait_for_timeout(100)
    dragged = panel.bounding_box()
    assert dragged is not None and inside_viewport(dragged, 1440, 900)
    assert abs(dragged["x"] - initial["x"]) > 40 or abs(dragged["y"] - initial["y"]) > 40
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-menu-desktop.png"), full_page=True)

    panel.get_by_role("button", name="关闭菜单").click()
    page.wait_for_function("element => element.dataset.open === 'false'", arg=panel.element_handle())
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-menu-toggle.png"), full_page=True)

    toggle.click()
    panel.get_by_role("tab", name="演出", exact=True).click()
    classic_actions = panel.locator("[data-whale-acting-view][data-active=true] [data-whale-performance-list] > button")
    assert classic_actions.count() == 10
    assert panel.get_by_role("tab", name="经典动作", exact=True).get_attribute("aria-selected") == "true"
    page.wait_for_timeout(220)
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-menu-performances.png"), full_page=True)
    panel.get_by_role("button", name="播放女仆屈膝礼", exact=True).click()
    page.wait_for_function("element => element.dataset.whaleVideoAction === 'curtsy'", arg=page.locator("[data-whale-pet-entry]").element_handle())
    video = page.locator("[data-whale-action-video]")
    video.wait_for(state="attached")
    page.wait_for_timeout(500)
    assert "curtsy.webm" in (video.get_attribute("src") or "")
    assert video.evaluate("element => element.currentTime") > 0
    assert video.evaluate("element => !element.paused")
    assert page.locator("[data-whale-rig-canvas]").get_attribute("data-whale-live2d-paused") == "true"
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-curtsy-departure.png"), full_page=True)
    video.evaluate("element => { element.playbackRate = 4 }")
    page.wait_for_function("element => element.dataset.whaleVideoAction === 'none'", arg=page.locator("[data-whale-pet-entry]").element_handle(), timeout=15_000)
    assert page.locator("[data-whale-rig-canvas]").get_attribute("data-whale-live2d-paused") == "false"
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-curtsy-settled.png"), full_page=True)

    toggle.click()
    panel.get_by_role("tab", name="演出", exact=True).click()
    panel.get_by_role("tab", name="待机小剧场", exact=True).click()
    panel.get_by_role("button", name="播放开心待机", exact=True).click()
    page.wait_for_function("element => element.dataset.open === 'false'", arg=panel.element_handle())
    entry = page.locator("[data-whale-pet-entry]")
    assert entry.get_attribute("data-whale-idle-performance") == "quiet-smile"
    assert page.locator("[data-whale-emotion-fx]").get_attribute("data-emotion") == "happy"

    dialogue = page.locator("[data-whale-dialogue]")
    dialogue.wait_for(state="attached")
    toggle.click()
    panel.get_by_role("tab", name="对话", exact=True).click()
    panel.get_by_role("button", name="打开输入框", exact=True).click()
    composer = page.locator("[data-whale-chat-composer]")
    page.wait_for_function("element => element.dataset.open === 'true'", arg=composer.element_handle())
    composer.locator("input[aria-label='对话内容']").fill("今天想吃白饭")
    composer.locator("input[aria-label='对话内容']").press("Enter")
    page.wait_for_function("element => element.dataset.busy === 'false'", arg=composer.element_handle())
    composer.locator("[data-whale-chat-history-toggle]").click()
    page.wait_for_timeout(120)
    assert composer.locator("[data-whale-chat-history-item]").count() >= 2
    assert "今天想吃白饭" in composer.locator("[data-whale-chat-history-list]").inner_text()
    composer.locator("[data-whale-chat-history-tabs] button").nth(1).click()
    assert composer.locator("[data-whale-chat-memory-item]").count() >= 2
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-dialogue-memory-timeline.png"), full_page=True)
    page.locator("[data-whale-dialogue-hide]").click(force=True)
    assert dialogue.get_attribute("data-visible") == "false"
    assert page.locator("[data-whale-chat-composer]").get_attribute("data-open") == "false"
    dialogue_closed = True

    page.set_viewport_size({"width": 620, "height": 700})
    page.reload(wait_until="networkidle")
    toggle = page.locator("[data-whale-menu-toggle]")
    toggle.wait_for(state="visible")
    toggle.click()
    panel = page.locator("[data-whale-menu-panel]")
    page.wait_for_timeout(350)
    narrow = panel.bounding_box()
    assert narrow is not None and inside_viewport(narrow, 620, 700)
    page.screenshot(path=str(ARTIFACT_DIR / "dsh-dfy-menu-narrow.png"), full_page=True)
    panel.get_by_role("button", name="关闭菜单").click()

    click_emotions: list[str] = []
    hotspot = page.locator("[data-whale-pet-hotspot]")
    for _ in range(6):
        hotspot.click(position={"x": 175, "y": 170}, force=True)
        page.wait_for_timeout(80)
        click_emotions.append(page.locator("[data-whale-emotion-fx]").get_attribute("data-emotion") or "none")
    assert "none" not in click_emotions
    assert all(left != right for left, right in zip(click_emotions, click_emotions[1:]))

    print(json.dumps({
        "desktop": initial,
        "dragged": dragged,
        "narrow": narrow,
        "dialogueClosed": dialogue_closed,
        "clickEmotions": click_emotions,
        "pageErrors": page_errors,
    }, ensure_ascii=False, indent=2))
    assert not page_errors
    browser.close()
