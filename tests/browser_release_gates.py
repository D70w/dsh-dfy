import os
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("WHALE_E2E_BASE_URL", "http://127.0.0.1:3088")
ROOT = Path(__file__).resolve().parent.parent
MULTI_TAB_ARTIFACT = ROOT / "artifacts" / "whale-approved-runtime-multi-tab-takeover.png"
A11Y_ARTIFACT = ROOT / "artifacts" / "whale-approved-runtime-a11y-zoom-forced-colors.png"


def click_visible(page: Page, role: str, name: str) -> bool:
    matches = page.get_by_role(role, name=name, exact=True)
    for index in range(matches.count()):
        candidate = matches.nth(index)
        if candidate.is_visible() and candidate.is_enabled():
            candidate.click()
            return True
    return False


def dismiss_onboarding(page: Page) -> None:
    page.wait_for_timeout(200)
    if click_visible(page, "button", "继续"):
        page.wait_for_timeout(250)
    if click_visible(page, "button", "稍后配置"):
        page.wait_for_timeout(250)


def load(page: Page) -> None:
    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    dismiss_onboarding(page)
    page.locator("[data-whale-pet-entry]").wait_for(state="attached")


AUTONOMY_ACCELERATOR = """
(() => {
  const originalSetTimeout = window.setTimeout;
  const originalDateNow = Date.now;
  const originalGetRandomValues = crypto.getRandomValues.bind(crypto);
  Date.now = () => originalDateNow() + 14 * 86400000;
  crypto.getRandomValues = function(array) {
    if (array instanceof Uint32Array && array.length === 1) {
      array[0] = 0;
      return array;
    }
    return originalGetRandomValues(array);
  };
  window.setTimeout = function(callback, delay, ...args) {
    const adjusted = typeof delay === 'number' && delay >= 90000 && delay <= 150001 ? 3500 : delay;
    return originalSetTimeout.call(window, callback, adjusted, ...args);
  };
})();
"""


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    errors: list[str] = []
    expected_balance_failures = 0

    # Two pages share Web Locks and origin storage. Closing the elected page
    # must hand presentation ownership to the already-running follower.
    context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")
    context.add_init_script(AUTONOMY_ACCELERATOR)
    leader_page = context.new_page()
    leader_page.on("pageerror", lambda error: errors.append(f"leader page: {error}"))
    leader_page.on("console", lambda message: errors.append(f"leader console: {message.text}") if message.type == "error" else None)
    leader_page.on(
        "response",
        lambda response: globals().__setitem__("expected_balance_failures", expected_balance_failures + 1)
        if response.status == 503 and "/api/dsh-dfy/v1/balance" in response.url
        else None,
    )
    load(leader_page)
    follower_page = context.new_page()
    follower_page.on("pageerror", lambda error: errors.append(f"follower page: {error}"))
    follower_page.on("console", lambda message: errors.append(f"follower console: {message.text}") if message.type == "error" else None)
    follower_page.on(
        "response",
        lambda response: globals().__setitem__("expected_balance_failures", expected_balance_failures + 1)
        if response.status == 503 and "/api/dsh-dfy/v1/balance" in response.url
        else None,
    )
    load(follower_page)

    leader_entry = leader_page.locator("[data-whale-pet-entry]")
    follower_entry = follower_page.locator("[data-whale-pet-entry]")
    leader_page.wait_for_function(
        "element => element.getAttribute('data-whale-presentation') === 'locks'",
        arg=leader_entry.element_handle(),
    )
    follower_page.wait_for_function(
        "element => element.getAttribute('data-whale-presentation') === 'locks'",
        arg=follower_entry.element_handle(),
    )
    first_states = [
        leader_entry.get_attribute("data-whale-presentation-leader"),
        follower_entry.get_attribute("data-whale-presentation-leader"),
    ]
    assert first_states.count("true") == 1, first_states
    assert first_states.count("false") == 1, first_states

    if first_states[0] == "true":
        leader_page.close()
        takeover_page = follower_page
        takeover_entry = follower_entry
    else:
        follower_page.close()
        takeover_page = leader_page
        takeover_entry = leader_entry
    takeover_page.wait_for_function(
        "element => element.getAttribute('data-whale-presentation-leader') === 'true'",
        arg=takeover_entry.element_handle(),
        timeout=5_000,
    )
    assert takeover_entry.get_attribute("data-whale-presentation") == "locks"
    takeover_page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy') !== 'none'",
        arg=takeover_entry.element_handle(),
        timeout=6_000,
    )
    assert takeover_entry.get_attribute("data-whale-autonomy") == "butterfly"
    MULTI_TAB_ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    takeover_page.screenshot(path=str(MULTI_TAB_ARTIFACT), full_page=True)
    context.close()

    # Real media emulation proves the system reduced-motion preference. A
    # A 360x225 CSS viewport represents a 720x450 window at 200% browser zoom;
    # forced colors separately checks visible focus boundaries.
    a11y_context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        locale="zh-CN",
        reduced_motion="reduce",
        forced_colors="active",
    )
    a11y_context.add_init_script(AUTONOMY_ACCELERATOR)
    page = a11y_context.new_page()
    page.on("pageerror", lambda error: errors.append(f"a11y page: {error}"))
    page.on("console", lambda message: errors.append(f"a11y console: {message.text}") if message.type == "error" else None)
    page.on(
        "response",
        lambda response: globals().__setitem__("expected_balance_failures", expected_balance_failures + 1)
        if response.status == 503 and "/api/dsh-dfy/v1/balance" in response.url
        else None,
    )
    load(page)
    entry = page.locator("[data-whale-pet-entry]")
    whale = page.locator("[data-whale-pet-hotspot]")
    canvas = page.locator("[data-whale-rig-canvas]")
    assert entry.get_attribute("data-reduced") == "true"
    page.wait_for_timeout(4_200)
    assert entry.get_attribute("data-whale-autonomy") == "none"
    assert canvas.get_attribute("data-whale-performance") == "none"

    page.evaluate("document.activeElement instanceof HTMLElement && document.activeElement.blur()")
    reached_whale = False
    for _ in range(40):
        page.keyboard.press("Tab")
        reached_whale = whale.evaluate("element => element === document.activeElement")
        if reached_whale:
            break
    assert reached_whale
    page.keyboard.press("Enter")
    menu = page.get_by_role("menu")
    menu.wait_for(state="visible")
    assert whale.get_attribute("aria-controls") == menu.get_attribute("id")
    assert page.get_by_role("status").get_attribute("aria-live") == "polite"
    focused_menu_item = menu.get_by_role("menuitem").first
    assert focused_menu_item.evaluate("element => element === document.activeElement")
    focused_outline = focused_menu_item.evaluate(
        "element => ({ style: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth })"
    )
    assert focused_outline["style"] != "none", focused_outline
    assert focused_outline["width"] != "0px", focused_outline
    page.keyboard.press("Escape")

    assert click_visible(page, "button", "设置")
    page.wait_for_timeout(250)
    assert click_visible(page, "button", "大肥鱼")
    settings = page.locator("[data-whale-settings]")
    settings.wait_for(state="visible")
    assert settings.get_by_role("combobox", name="动作方式").count() == 1
    quality = settings.get_by_role("combobox", name="动画质量")
    secondary_motion = settings.get_by_role("checkbox", name="头发、鲸尾自然摆动")
    diary = settings.get_by_role("checkbox", name="启用工位小账本")
    assert quality.count() == 1
    assert secondary_motion.count() == 1
    assert diary.count() == 1
    assert settings.get_by_role("slider", name="桌宠大小 · 100%").count() == 1
    quality.select_option("economy")
    page.wait_for_function(
        "element => element.getAttribute('data-whale-animation-quality') === 'economy'",
        arg=page.locator("[data-whale-renderer]").element_handle(),
        timeout=5_000,
    )
    assert canvas.evaluate("element => [element.width, element.height]") == [480, 480]
    secondary_motion.uncheck()
    assert not secondary_motion.is_checked()
    page.get_by_role("button", name="关闭", exact=True).click()

    page.set_viewport_size({"width": 360, "height": 225})
    page.wait_for_timeout(150)
    box = whale.bounding_box()
    assert box is not None
    assert box["x"] >= 0 and box["y"] >= 0, box
    assert box["x"] + box["width"] <= 360, box
    assert box["y"] + box["height"] <= 225, box
    whale.focus()
    page.keyboard.press("Enter")
    menu.wait_for(state="visible")
    menu_box = menu.bounding_box()
    assert menu_box is not None
    assert menu_box["x"] >= 0 and menu_box["y"] >= 0, menu_box
    assert menu_box["x"] + menu_box["width"] <= 360, menu_box
    assert menu_box["y"] + menu_box["height"] <= 225, menu_box
    horizontally_separate = (
        menu_box["x"] + menu_box["width"] <= box["x"]
        or box["x"] + box["width"] <= menu_box["x"]
    )
    assert horizontally_separate, {"menu": menu_box, "whale": box}
    menu.get_by_role("menuitem", name="工位小账本", exact=True).click()
    ledger = page.get_by_role("dialog", name="大肥鱼的工位小账本", exact=True)
    ledger.wait_for(state="visible")
    ledger_box = ledger.bounding_box()
    assert ledger_box is not None
    assert ledger_box["x"] >= 0 and ledger_box["y"] >= 0, ledger_box
    assert ledger_box["x"] + ledger_box["width"] <= 360, ledger_box
    assert ledger_box["y"] + ledger_box["height"] <= 225, ledger_box
    assert ledger.locator("meter").count() == 4
    assert ledger.locator("[data-whale-relationship-card]").count() == 1
    A11Y_ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(A11Y_ARTIFACT), full_page=True)
    a11y_context.close()

    # A provider key is optional in an isolated profile. Chromium reports the
    # expected 503 balance response as a generic resource error; no other
    # browser or page errors are permitted.
    expected_console_error = "Failed to load resource: the server responded with a status of 503 (Service Unavailable)"
    assert len(errors) == expected_balance_failures, errors
    assert all(error.endswith(expected_console_error) for error in errors), errors
    print("PASS: multi-tab Web Locks takeover, single autonomous leader, reduced motion, forced-colors focus, named settings controls, live economy switch and 200% zoom containment")
    print("MULTI-TAB SCREENSHOT:", MULTI_TAB_ARTIFACT)
    print("A11Y SCREENSHOT:", A11Y_ARTIFACT)
    browser.close()
