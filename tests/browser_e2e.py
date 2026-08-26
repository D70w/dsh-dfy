import os
from pathlib import Path

from PIL import Image
from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("WHALE_E2E_BASE_URL", "http://127.0.0.1:3088")
ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase1-whalerig-e2e.png"
PET_ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase1-whalerig-pet.png"
AUTONOMY_ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase2-butterfly-e2e.png"
CURSOR_ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase2-cursor-visit-e2e.png"
NAP_ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase2-nap-e2e.png"
RICE_ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase2-rice-caught-e2e.png"
LEDGER_ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase3-workstation-diary-e2e.png"
LEDGER_CLEAR_ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase3-diary-clear-confirmation-e2e.png"
DEBUG_PANEL_ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "phase3-animation-acceptance-panel.png"


def click_visible(page: Page, role: str, name: str) -> bool:
    """Click the first visible exact role match, if one exists."""
    matches = page.get_by_role(role, name=name, exact=True)
    for index in range(matches.count()):
        candidate = matches.nth(index)
        if candidate.is_visible() and candidate.is_enabled():
            candidate.click()
            return True
    return False


def dismiss_host_onboarding(page: Page) -> None:
    """Follow DSH's own supported onboarding exits before testing the plugin."""
    page.wait_for_timeout(250)
    if click_visible(page, "button", "继续"):
        page.wait_for_timeout(350)
    if click_visible(page, "button", "稍后配置"):
        page.wait_for_timeout(350)


def load_workspace(page: Page) -> None:
    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    dismiss_host_onboarding(page)
    page.locator("[data-whale-pet-entry]").wait_for(state="attached")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    console_errors: list[str] = []
    page_errors: list[str] = []
    plugin_responses: list[str] = []
    asset_responses: list[str] = []
    api_responses: list[str] = []
    expected_balance_failures = 0
    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on(
        "response",
        lambda response: plugin_responses.append(f"{response.status} {response.url}")
        if "/plugins/dsh-dfy/" in response.url
        else None,
    )
    page.on(
        "response",
        lambda response: asset_responses.append(f"{response.status} {response.url}")
        if "/dsh-dfy/assets/v1/" in response.url
        else None,
    )
    page.on(
        "response",
        lambda response: api_responses.append(f"{response.status} {response.url}")
        if "/api/dsh-dfy/v1/" in response.url
        else None,
    )
    page.on(
        "response",
        lambda response: globals().__setitem__("expected_balance_failures", expected_balance_failures + 1)
        if response.status == 503 and "/api/dsh-dfy/v1/balance" in response.url
        else None,
    )

    load_workspace(page)
    assert page.locator("[data-whale-debug-panel]").count() == 0
    whale = page.locator("[data-whale-pet-hotspot]")
    whale.wait_for(state="visible")
    initial_box = whale.bounding_box()
    assert initial_box is not None
    assert 90 <= initial_box["width"] <= 120
    assert 100 <= initial_box["height"] <= 130
    assert page.locator("[data-whale-pet-entry]").get_attribute("data-whale-action") == "idle"
    # A newly-created empty session has emitted no projection frame yet; the
    # overlay deliberately holds the safe idle fallback until the first event.
    assert page.locator("[data-whale-pet-entry]").get_attribute("data-whale-activity") == "absent"
    assert page.locator("[data-whale-pet-avatar]").get_attribute("data-state") == "idle"
    page.wait_for_function(
        "element => element.getAttribute('data-whale-save') === 'ready'",
        arg=page.locator("[data-whale-pet-entry]").element_handle(),
    )
    assert page.locator("[data-whale-pet-entry]").get_attribute("data-whale-persistence") == "durable"
    renderer = page.locator("[data-whale-renderer]")
    renderer.wait_for(state="attached")
    page.wait_for_function(
        "element => element.getAttribute('data-whale-renderer') === 'ready'",
        arg=renderer.element_handle(),
    )
    canvas = page.locator("[data-whale-rig-canvas]")
    assert canvas.evaluate("element => [element.width, element.height]") == [640, 640]
    assert canvas.evaluate("element => element.getContext('2d') !== null")
    assert canvas.get_attribute("data-whale-production-ready") == "true"
    assert canvas.evaluate("element => getComputedStyle(element).opacity") == "1"
    assert page.locator("[data-whale-pet-avatar]").evaluate(
        "element => getComputedStyle(element).opacity"
    ) == "0"
    PET_ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    whale.screenshot(path=str(PET_ARTIFACT), omit_background=True)
    with Image.open(PET_ARTIFACT).convert("RGB") as pet_image:
        background = pet_image.getpixel((0, pet_image.height - 1))
        visible_pixels = sum(
            1 for pixel in pet_image.getdata()
            if sum(abs(channel - background[index]) for index, channel in enumerate(pixel)) > 45
        )
    assert visible_pixels > 1_000

    assert renderer.get_attribute("data-whale-engine") == "approved-desktop-runtime"
    assert canvas.get_attribute("data-whale-animation-source") == "approved-test-runtime"
    assert canvas.get_attribute("data-whale-engine") == "see-through-idle-rig-v2"

    # Native button activation opens the menu without a pointer, and Escape
    # returns focus to the stable companion control.
    whale.focus()
    page.keyboard.press("Enter")
    menu = page.get_by_role("menu")
    menu.wait_for(state="visible")
    page.keyboard.press("Escape")
    menu.wait_for(state="detached")
    assert whale.evaluate("element => element === document.activeElement")

    initial_revision = int(page.locator("[data-whale-pet-entry]").get_attribute("data-whale-save-revision"))
    whale.focus()
    whale.press("Enter")
    menu.wait_for(state="visible")
    # The position-lock/reset controls are part of the current public menu;
    # keep this gate forward-compatible with additive menu items.
    assert page.get_by_role("menuitem").count() >= 10
    assert page.get_by_role("menuitem", name="追赶蝴蝶", exact=True).is_visible()
    assert page.get_by_role("menuitem", name="叫她过来", exact=True).is_visible()
    assert page.get_by_role("menuitem", name="回工位休息", exact=True).is_visible()
    assert page.get_by_role("menuitem", name="固定当前位置", exact=True).is_visible()
    assert page.get_by_role("menuitem", name="回到右下角", exact=True).is_visible()
    page.get_by_role("menuitem").nth(0).click()
    page.wait_for_function(
        "([element, revision]) => Number(element.getAttribute('data-whale-save-revision')) > revision",
        arg=[page.locator("[data-whale-pet-entry]").element_handle(), initial_revision],
    )
    assert page.locator("[data-whale-pet-entry]").get_attribute("data-whale-action") == "petting"

    whale.focus()
    whale.press("Enter")
    menu.wait_for(state="visible")
    page.get_by_role("menuitem", name="先藏起来", exact=True).click()
    summon = page.locator("[data-whale-pet-summon]")
    summon.wait_for(state="visible")

    # Device-local visibility survives a full page reload.
    load_workspace(page)
    summon.wait_for(state="visible")
    summon.click()
    whale.wait_for(state="visible")

    # Device-local position survives a full page reload without entering Host settings.
    before_drag = whale.bounding_box()
    assert before_drag is not None
    center_x = before_drag["x"] + before_drag["width"] / 2
    center_y = before_drag["y"] + before_drag["height"] / 2
    page.mouse.move(center_x, center_y)
    page.mouse.down()
    page.mouse.move(center_x - 180, center_y - 130, steps=12)
    page.mouse.up()
    page.wait_for_timeout(250)
    after_drag = whale.bounding_box()
    assert after_drag is not None
    assert after_drag["x"] < before_drag["x"] - 120
    assert after_drag["y"] < before_drag["y"] - 80

    load_workspace(page)
    whale.wait_for(state="visible")
    after_reload = whale.bounding_box()
    assert after_reload is not None
    assert abs(after_reload["x"] - after_drag["x"]) <= 3
    assert abs(after_reload["y"] - after_drag["y"]) <= 3

    assert click_visible(page, "button", "设置")
    page.wait_for_timeout(350)
    assert click_visible(page, "button", "大肥鱼")
    settings = page.locator("[data-whale-settings]")
    settings.wait_for(state="visible")
    assert settings.get_by_text("显示桌宠", exact=True).is_visible()
    assert settings.get_by_text("允许她自己玩", exact=True).is_visible()
    assert settings.locator("input[type=checkbox]").count() >= 10
    assert settings.locator("input[type=range]").count() == 1
    assert settings.locator("select").count() >= 4

    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(ARTIFACT), full_page=True)
    page.keyboard.press("Escape")
    settings.wait_for(state="hidden")

    # Opening the diary explicitly refreshes the Host-owned snapshot, exposes
    # four labelled stats, and returns focus to the stable whale control.
    whale.focus()
    whale.press("Enter")
    menu.wait_for(state="visible")
    page.get_by_role("menuitem", name="工位小账本", exact=True).press("Enter")
    ledger = page.get_by_role("dialog", name="大肥鱼的工位小账本", exact=True)
    ledger.wait_for(state="visible")
    assert ledger.get_by_text("已记进本地长期存档", exact=True).is_visible()
    assert ledger.locator("meter").count() == 4
    assert ledger.get_by_text("今天这页", exact=True).is_visible()
    relationship_card = ledger.locator("[data-whale-relationship-card]")
    assert relationship_card.count() == 1
    assert relationship_card.get_attribute("data-stage") in {
        "newcomer", "familiar", "close", "trusted", "old-friend",
    }
    assert ledger.get_by_text("现在的关系", exact=True).is_visible()
    page.screenshot(path=str(LEDGER_ARTIFACT), full_page=True)
    # The ledger is intentionally scrollable; its close control can sit just
    # outside the viewport at the compact test height.
    ledger.get_by_role("button", name="收起小账本", exact=True).evaluate("element => element.click()")
    ledger.wait_for(state="detached")
    assert whale.evaluate("element => element === document.activeElement")

    # The explicit chase command plays the complete reusable rig story immediately,
    # remains keyboard reachable, and never writes an autonomous story result.
    entry = page.locator("[data-whale-pet-entry]")
    manual_revision = int(entry.get_attribute("data-whale-save-revision"))
    whale.focus()
    whale.press("Enter")
    menu.wait_for(state="visible")
    chase_item = page.get_by_role("menuitem", name="追赶蝴蝶", exact=True)
    chase_item.focus()
    chase_item.press("Enter")
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy') === 'butterfly'",
        arg=entry.element_handle(),
    )
    assert entry.get_attribute("data-whale-autonomy-origin") == "manual"
    story_renderer = page.locator("[data-whale-rig-canvas]")
    assert story_renderer.evaluate("element => [element.width, element.height]") == [640, 640]
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy-phase') === 'attempt'",
        arg=entry.element_handle(),
        timeout=3_000,
    )
    action_video = page.locator("[data-whale-action-video]")
    page.wait_for_function(
        "element => element.readyState >= 2 && element.getAttribute('data-whale-video-performance').endsWith('-cycle')",
        arg=action_video.element_handle(),
        timeout=5_000,
    )
    assert story_renderer.evaluate("element => getComputedStyle(element).opacity") == "0"
    assert action_video.evaluate("element => getComputedStyle(element).opacity") == "1"
    assert action_video.get_attribute("data-whale-video-performance") in ("run-cycle", "run-left-cycle")
    assert page.locator("[data-whale-pet-stage]").get_attribute("data-whale-motion-clip") == "run"
    assert page.locator("[data-whale-autonomy-prop=butterfly]").is_visible()
    assert whale.evaluate("element => getComputedStyle(element).pointerEvents") == "none"
    page.screenshot(path=str(AUTONOMY_ARTIFACT), full_page=True)
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy') === 'none'",
        arg=entry.element_handle(),
        timeout=6_000,
    )
    assert int(entry.get_attribute("data-whale-save-revision")) == manual_revision

    # Both explicit movement controls are focusable menu commands. Returning
    # home holds automatic stories for this page; calling her over clears that
    # hold and enters a bounded target-wait state without writing story data.
    whale.focus()
    whale.press("Enter")
    menu.wait_for(state="visible")
    home_item = page.get_by_role("menuitem", name="回工位休息", exact=True)
    home_item.focus()
    home_item.press("Enter")
    assert page.locator("[data-whale-pet-entry]").get_attribute("data-whale-staying-home") == "true"
    whale.focus()
    whale.press("Enter")
    menu.wait_for(state="visible")
    come_item = page.get_by_role("menuitem", name="叫她过来", exact=True)
    come_item.focus()
    come_item.press("Enter")
    page.wait_for_function(
        "element => element.getAttribute('data-whale-manual-request') === 'waiting'",
        arg=page.locator("[data-whale-pet-entry]").element_handle(),
    )
    assert page.locator("[data-whale-pet-entry]").get_attribute("data-whale-staying-home") == "false"

    # Bring a clean profile to the documented "familiar" threshold through
    # the public idempotent command API. The next reload must then permit the
    # automatic, relationship-gated pointer visit.
    affection = page.evaluate(
        """
        async () => {
          let snapshot = await fetch('/api/dsh-dfy/v1/state').then(response => response.json());
          for (let index = 0; index < 12 && snapshot.state.pet.stats.affection < 20; index += 1) {
            snapshot = await fetch('/api/dsh-dfy/v1/commands', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-dsh-dfy-request': '1',
              },
              body: JSON.stringify({ id: crypto.randomUUID(), type: 'pet' }),
            }).then(response => response.json());
          }
          return snapshot.state.pet.stats.affection;
        }
        """
    )
    assert affection >= 20, affection

    # Speed up only the 90–150s autonomy scheduling window on the next reload;
    # named story phases retain their production durations. A stable odd seed
    # makes cursor visits deterministic when a safe target exists.
    page.add_init_script(
        """
        const whaleOriginalSetTimeout = window.setTimeout;
        const whaleOriginalDateNow = Date.now;
        const whaleOriginalGetRandomValues = crypto.getRandomValues.bind(crypto);
        Date.now = () => whaleOriginalDateNow() + 86400000;
        crypto.getRandomValues = function(array) {
          if (array instanceof Uint32Array && array.length === 1) {
            array[0] = 1;
            return array;
          }
          return whaleOriginalGetRandomValues(array);
        };
        window.setTimeout = function(callback, delay, ...args) {
          const adjusted = typeof delay === 'number' && delay >= 90000 && delay <= 150001 ? 3500 : delay;
          return whaleOriginalSetTimeout.call(window, callback, adjusted, ...args);
        };
        """
    )
    load_workspace(page)
    whale.wait_for(state="visible")
    entry = page.locator("[data-whale-pet-entry]")
    page.wait_for_function(
        "element => element.getAttribute('data-whale-presentation-leader') === 'true'",
        arg=entry.element_handle(),
        timeout=5_000,
    )
    assert entry.get_attribute("data-whale-relationship") in {
        "familiar", "close", "trusted", "old-friend",
    }

    # Put the home anchor in a clear corner, then choose a nearby point whose
    # whole route contains no generic interactive element. After two seconds
    # of stillness, the next odd-seeded episode must be a cursor visit.
    box = whale.bounding_box()
    assert box is not None
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.mouse.down()
    page.mouse.move(1360, 820, steps=8)
    page.mouse.up()
    whale.evaluate("element => element.blur()")
    page.wait_for_timeout(150)
    box = whale.bounding_box()
    assert box is not None
    cursor_target = page.evaluate(
        """
        box => {
          const selector = 'button,a[href],input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="textbox"],[tabindex]:not([tabindex="-1"])';
          const home = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          const candidates = [[-220, 0], [0, -220], [-156, -156], [-180, -80], [-80, -180]];
          const blocked = rect => {
            for (const xa of [0.15, 0.5, 0.85]) for (const ya of [0.15, 0.5, 0.85]) {
              for (const element of document.elementsFromPoint(rect.left + rect.width * xa, rect.top + rect.height * ya)) {
                if (element.closest('[data-whale-pet-entry]')) continue;
                if (element.closest(selector)) return true;
              }
            }
            return false;
          };
          for (const [dx, dy] of candidates) {
            const pointer = { x: home.x + dx, y: home.y + dy };
            if (pointer.x < 0 || pointer.y < 0 || pointer.x > innerWidth || pointer.y > innerHeight) continue;
            const distance = Math.hypot(dx, dy);
            const stage = document.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-relationship');
            const clearance = stage === 'old-friend' ? 96 : stage === 'trusted' ? 104 : stage === 'close' ? 112 : 120;
            const move = distance - clearance;
            if (move < 28 || move > 180) continue;
            const offset = { x: dx / distance * move, y: dy / distance * move };
            const targetCenter = { x: home.x + offset.x, y: home.y + offset.y };
            if (targetCenter.x - box.width / 2 < 8 || targetCenter.x + box.width / 2 > innerWidth - 8
                || targetCenter.y - box.height / 2 < 8 || targetCenter.y + box.height / 2 > innerHeight - 8) continue;
            let safe = true;
            for (const progress of [0.25, 0.5, 0.75, 1]) {
              const rect = {
                left: home.x + offset.x * progress - box.width / 2,
                top: home.y + offset.y * progress - box.height / 2,
                width: box.width,
                height: box.height,
              };
              if (blocked(rect)) { safe = false; break; }
            }
            if (safe) return pointer;
          }
          return null;
        }
        """,
        box,
    )
    assert cursor_target is not None
    page.mouse.move(cursor_target["x"], cursor_target["y"], steps=6)
    page.wait_for_timeout(120)
    page.mouse.move(cursor_target["x"] + 1, cursor_target["y"])
    page.wait_for_timeout(120)
    page.mouse.move(cursor_target["x"], cursor_target["y"])
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy') !== 'none'",
        arg=entry.element_handle(),
        timeout=5_000,
    )
    assert entry.get_attribute("data-whale-autonomy") == "cursor_visit", {
        "story": entry.get_attribute("data-whale-autonomy"),
        "phase": entry.get_attribute("data-whale-autonomy-phase"),
        "box": box,
        "cursor_target": cursor_target,
    }
    assert page.locator("[data-whale-autonomy-prop=butterfly]").count() == 0
    assert whale.evaluate("element => getComputedStyle(element).pointerEvents") == "none"
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy-phase') === 'result'",
        arg=entry.element_handle(),
        timeout=3_000,
    )
    assert page.locator("[data-whale-pet-stage]").get_attribute("data-whale-motion-clip") == "ready"
    cursor_video = page.locator("[data-whale-action-video]")
    page.wait_for_function(
        "element => element.getAttribute('data-whale-video-performance').endsWith('-finish')",
        arg=cursor_video.element_handle(),
        timeout=2_000,
    )
    assert cursor_video.get_attribute("data-whale-video-performance") in (
        "run-finish", "run-left-finish", "float-finish", "dive-finish"
    )
    assert page.locator("[data-whale-rig-layer]").evaluate(
        "element => getComputedStyle(element).opacity"
    ) == "1"
    page.screenshot(path=str(CURSOR_ARTIFACT), full_page=True)
    with page.expect_response(lambda response: "/api/dsh-dfy/v1/commands" in response.url, timeout=5_000) as cursor_response:
        page.mouse.down()
        page.mouse.up()
        page.wait_for_function(
            "element => element.getAttribute('data-whale-motion-clip') === 'run'",
            arg=page.locator("[data-whale-pet-stage]").element_handle(),
            timeout=1_000,
        )
        page.wait_for_function(
            "element => element.getAttribute('data-whale-autonomy') === 'none'",
            arg=entry.element_handle(),
            timeout=3_000,
        )
    assert cursor_response.value.status == 200

    # A new page with the deterministic nap roll must show the independent
    # cushion layer, restore the hotspot only while safely asleep at home, and
    # persist the seen recovery after a direct activation.
    page.add_init_script(
        """
        const napOriginalGetRandomValues = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = function(array) {
          if (array instanceof Uint32Array && array.length === 1) {
            array[0] = 2;
            return array;
          }
          return napOriginalGetRandomValues(array);
        };
        """
    )
    load_workspace(page)
    whale.wait_for(state="visible")
    entry = page.locator("[data-whale-pet-entry]")
    whale.evaluate("element => element.blur()")
    page.wait_for_function(
        "element => element.getAttribute('data-whale-presentation-leader') === 'true'",
        arg=entry.element_handle(),
        timeout=5_000,
    )
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy') === 'nap'",
        arg=entry.element_handle(),
        timeout=5_000,
    )
    assert page.locator("[data-whale-autonomy-prop=pillow]").count() == 1
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy-phase') === 'result'",
        arg=entry.element_handle(),
        timeout=4_000,
    )
    assert whale.evaluate("element => getComputedStyle(element).pointerEvents") == "auto"
    page.screenshot(path=str(NAP_ARTIFACT), full_page=True)
    with page.expect_response(lambda response: "/api/dsh-dfy/v1/commands" in response.url, timeout=5_000) as nap_response:
        whale.evaluate("element => element.click()")
        page.wait_for_function(
            "element => element.getAttribute('data-whale-autonomy') === 'none'",
            arg=entry.element_handle(),
            timeout=3_000,
        )
    assert nap_response.value.status == 200

    # Advance the local calendar so the two-story daily budget opens again,
    # then force the fourth story roll. The bowl must remain world-stable while
    # the realtime rig approaches it and branch into denial when activated.
    page.add_init_script(
        """
        const riceOriginalDateNow = Date.now;
        const riceOriginalGetRandomValues = crypto.getRandomValues.bind(crypto);
        Date.now = () => riceOriginalDateNow() + 86400000;
        crypto.getRandomValues = function(array) {
          if (array instanceof Uint32Array && array.length === 1) {
            array[0] = 3;
            return array;
          }
          return riceOriginalGetRandomValues(array);
        };
        """
    )
    load_workspace(page)
    whale.wait_for(state="visible")
    entry = page.locator("[data-whale-pet-entry]")
    whale.evaluate("element => element.blur()")
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy') === 'rice_caught'",
        arg=entry.element_handle(),
        timeout=5_000,
    )
    bowl = page.locator("[data-whale-autonomy-prop=rice-bowl]")
    assert bowl.count() == 1
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy-phase') === 'attempt'",
        arg=entry.element_handle(),
        timeout=3_000,
    )
    page.wait_for_timeout(80)
    bowl_start = bowl.bounding_box()
    page.wait_for_timeout(350)
    bowl_middle = bowl.bounding_box()
    assert bowl_start is not None and bowl_middle is not None
    assert abs(bowl_start["x"] - bowl_middle["x"]) <= 2.5, {
        "start": bowl_start,
        "middle": bowl_middle,
    }
    assert page.locator("[data-whale-pet-stage]").get_attribute("data-whale-motion-clip") == "run"
    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy-phase') === 'result'",
        arg=entry.element_handle(),
        timeout=3_000,
    )
    assert entry.get_attribute("data-whale-action") == "feeding"
    assert whale.evaluate("element => getComputedStyle(element).pointerEvents") == "auto"
    page.screenshot(path=str(RICE_ARTIFACT), full_page=True)
    with page.expect_response(lambda response: "/api/dsh-dfy/v1/commands" in response.url, timeout=5_000) as rice_response:
        whale.evaluate("element => element.click()")
        page.wait_for_function(
            "element => element.getAttribute('data-whale-autonomy-phase') === 'recover'",
            arg=entry.element_handle(),
            timeout=1_000,
        )
        assert entry.get_attribute("data-whale-action") == "denying"
        assert page.get_by_role("status").inner_text() == "这碗饭是自己跑过来的，本鱼只是在保管。"
        page.wait_for_function(
            "element => element.getAttribute('data-whale-autonomy') === 'none'",
            arg=entry.element_handle(),
            timeout=3_000,
        )
    assert rice_response.value.status == 200

    # Privacy deletion is an explicit, reversible-before-submit flow. It
    # removes only dated pages/story branches and preserves the relationship,
    # milestones, lifetime work totals, active days, and trusted receipts.
    before_clear = page.evaluate(
        "async () => (await fetch('/api/dsh-dfy/v1/state')).json().then(value => value.state)"
    )
    whale.focus()
    whale.press("Enter")
    menu.wait_for(state="visible")
    menu.get_by_role("menuitem", name="工位小账本", exact=True).click()
    ledger = page.get_by_role("dialog", name="大肥鱼的工位小账本", exact=True)
    ledger.wait_for(state="visible")
    clear_button = ledger.get_by_role("button", name="清除日期账页", exact=True)
    assert clear_button.is_enabled()
    clear_button.click()
    confirmation = ledger.locator("[data-whale-ledger-clear-confirmation]")
    confirmation.wait_for(state="visible")
    assert page.get_by_role("button", name="先不清除", exact=True).evaluate(
        "element => element === document.activeElement"
    )
    assert "默契、四项状态、共同记号、累计工作回合与活跃天数不会改变" in confirmation.inner_text()
    page.screenshot(path=str(LEDGER_CLEAR_ARTIFACT), full_page=True)

    page.keyboard.press("Escape")
    confirmation.wait_for(state="detached")
    clear_button = ledger.get_by_role("button", name="清除日期账页", exact=True)
    assert clear_button.evaluate("element => element === document.activeElement")
    clear_button.click()
    with page.expect_response(
        lambda response: "/api/dsh-dfy/v1/commands" in response.url,
        timeout=5_000,
    ) as clear_response:
        ledger.get_by_role("button", name="确认清除账页", exact=True).click()
    assert clear_response.value.status == 200
    ledger.get_by_role("status").wait_for(state="visible")
    assert "其余共同记忆保持不变" in ledger.get_by_role("status").inner_text()
    assert ledger.get_by_role("button", name="清除日期账页", exact=True).is_disabled()
    after_clear = page.evaluate(
        "async () => (await fetch('/api/dsh-dfy/v1/state')).json().then(value => value.state)"
    )
    assert after_clear["daily"] == {}
    assert after_clear["monthly"] == {}
    assert after_clear["memories"]["storyMemory"] == {}
    assert after_clear["pet"]["stats"] == before_clear["pet"]["stats"]
    assert after_clear["achievements"] == before_clear["achievements"]
    assert after_clear["memories"]["activeDays"] == before_clear["memories"]["activeDays"]
    assert after_clear["memories"]["completedTurns"] == before_clear["memories"]["completedTurns"]
    assert after_clear["memories"]["totalWorkMinutes"] == before_clear["memories"]["totalWorkMinutes"]
    assert page.get_by_role("status").filter(has_text="旧账页收起来了").count() >= 1

    # The query-gated acceptance panel starts every realtime story immediately
    # without waiting for the low-interruption autonomy delay. It is absent
    # from normal URLs and preview episodes never use action frame assets.
    page.goto(f"{BASE_URL}/?whaleDebug=1", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    dismiss_host_onboarding(page)
    panel = page.locator("[data-whale-debug-panel]")
    panel.wait_for(state="visible")
    expected_previews = {
        "追蝴蝶": "butterfly",
        "跑到光标": "cursor_visit",
        "打盹": "nap",
        "偷吃白饭": "rice_caught",
        "打翻饭碗": "bowl_accident",
        "收拾并补饭": "recovery_meal",
    }
    debug_entry = page.locator("[data-whale-pet-entry]")
    for label, story in expected_previews.items():
        panel.get_by_role("button", name=label, exact=True).click()
        assert debug_entry.get_attribute("data-whale-autonomy") == story
        assert debug_entry.get_attribute("data-whale-autonomy-phase") == "notice"
    panel.get_by_role("button", name="停止并归位", exact=True).click()
    assert debug_entry.get_attribute("data-whale-autonomy") == "none"
    page.screenshot(path=str(DEBUG_PANEL_ARTIFACT), full_page=True)

    assert plugin_responses
    assert all(response.startswith("200 ") for response in plugin_responses)
    assert len(asset_responses) >= 10
    assert all(response.startswith("200 ") for response in asset_responses)
    assert any("/commands" in response for response in api_responses)
    # Mutating Host commands may legitimately return 204 when there is no
    # response body; accept the complete successful HTTP range.
    # Balance is intentionally unavailable without a configured provider key;
    # the Host reports that as 503 while state/command routes remain 2xx.
    assert all(
        (response.split(" ", 1)[0].isdigit() and 200 <= int(response.split(" ", 1)[0]) < 300)
        or (response.startswith("503 ") and "/balance" in response)
        for response in api_responses
    )
    assert page_errors == []
    # Browsers log a generic resource error for the expected no-key balance
    # response; no other console errors are allowed.
    assert len(console_errors) == expected_balance_failures
    assert all(error == "Failed to load resource: the server responded with a status of 503 (Service Unavailable)" for error in console_errors)
    print("PASS: WhaleRig2 Canvas runtime/visible pixels, durable PetSave command, workstation diary with confirmed scoped clearing, manual/automatic and direct-preview autonomy including the rice continuation chain, keyboard menu, empty-session fallback, local UI persistence, Settings slot")
    print("PLUGIN RESPONSES:", plugin_responses)
    print("ASSET RESPONSES:", asset_responses)
    print("STATE API RESPONSES:", api_responses)
    print("SCREENSHOT:", ARTIFACT)
    print("PET SCREENSHOT:", PET_ARTIFACT)
    print("AUTONOMY SCREENSHOT:", AUTONOMY_ARTIFACT)
    print("CURSOR SCREENSHOT:", CURSOR_ARTIFACT)
    print("NAP SCREENSHOT:", NAP_ARTIFACT)
    print("RICE SCREENSHOT:", RICE_ARTIFACT)
    print("LEDGER SCREENSHOT:", LEDGER_ARTIFACT)
    print("LEDGER CLEAR SCREENSHOT:", LEDGER_CLEAR_ARTIFACT)
    print("ANIMATION ACCEPTANCE PANEL:", DEBUG_PANEL_ARTIFACT)
    browser.close()
