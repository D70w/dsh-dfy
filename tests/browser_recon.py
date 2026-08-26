from pathlib import Path

from playwright.sync_api import sync_playwright


ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "whalerig-recon.png"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    console_messages: list[str] = []
    page_errors: list[str] = []
    plugin_responses: list[str] = []
    page.on("console", lambda message: console_messages.append(f"{message.type}: {message.text}"))
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on(
        "response",
        lambda response: plugin_responses.append(f"{response.status} {response.url}")
        if "/plugins/" in response.url or "/dsh-dfy/" in response.url
        else None,
    )
    page.goto("http://127.0.0.1:3088", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    later_button = page.get_by_role("button", name="稍后配置")
    if later_button.count() > 0 and later_button.is_visible():
        later_button.click()
        page.wait_for_timeout(350)
    settings_button = page.get_by_role("button", name="设置")
    if settings_button.count() > 0:
        settings_button.click()
        page.wait_for_timeout(500)
    whale_nav = page.get_by_role("button", name="大肥鱼", exact=True)
    if whale_nav.count() > 0 and whale_nav.is_visible():
        whale_nav.click()
        page.wait_for_timeout(1_000)
    page.wait_for_timeout(5_000)
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(ARTIFACT), full_page=True)
    print("TITLE:", page.title())
    print("BUTTONS:", page.get_by_role("button").all_inner_texts())
    print("WHALE:", page.locator("[data-whale-pet-hotspot]").count())
    print("RENDERER:", page.locator("[data-whale-renderer]").get_attribute("data-whale-renderer"))
    print("RENDERER FAILURE:", page.locator("[data-whale-renderer]").get_attribute("data-whale-renderer-failure"))
    print("SAVE:", page.locator("[data-whale-pet-entry]").get_attribute("data-whale-save"))
    print("PERSISTENCE:", page.locator("[data-whale-pet-entry]").get_attribute("data-whale-persistence"))
    print("REVISION:", page.locator("[data-whale-pet-entry]").get_attribute("data-whale-save-revision"))
    print("CANVAS:", page.locator("[data-whale-rig-canvas]").count())
    print("WHALE SETTINGS:", page.locator("[data-whale-settings]").count())
    print("SETTINGS UNAVAILABLE:", page.get_by_text("当前连接无法修改设置，将使用组合默认值。", exact=True).count())
    print("SETTINGS LINKS:", page.get_by_text("设置", exact=True).count())
    print("SETTINGS BUTTONS:", page.get_by_role("button").all_inner_texts())
    print("PLUGIN RESPONSES:", plugin_responses)
    print("PAGE ERRORS:", page_errors)
    print("CONSOLE:", console_messages)
    print("BODY:", page.locator("body").inner_text()[:2_000])
    browser.close()
