import json
from pathlib import Path

from playwright.sync_api import sync_playwright


URL = "http://127.0.0.1:3107/artifacts/whale-2d-navigation/preview.html?v=sweat-rice-fx-v102b"
SCREENSHOT = Path(__file__).resolve().parents[1] / "artifacts/whale-2d-navigation/billing-preview-v102b.png"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1100, "height": 760}, device_scale_factor=1)
    console_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.add_init_script("sessionStorage.setItem('whale-pet.llm.secret.v1', 'test-key')")
    page.route("https://api.deepseek.com/user/balance", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "is_available": True,
            "balance_infos": [{
                "currency": "CNY", "total_balance": "11.05",
                "granted_balance": "1.05", "topped_up_balance": "10.00",
            }],
        }),
    ))
    page.goto(URL, wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_timeout(1_000)
    page.wait_for_function("window.whaleAccount.get().source === 'api'")
    page.evaluate("window.whaleBilling.clear()")

    empty = page.evaluate("window.whaleBilling.get()")
    assert empty["today"]["costCny"] == 0

    page.evaluate("""
      window.whaleBilling.record({
        prompt_cache_hit_tokens: 100000,
        prompt_cache_miss_tokens: 200000,
        completion_tokens: 50000
      }, 'preview-verification')
    """)
    page.locator("#pet-menu-toggle").click()
    page.locator('[data-pet-menu-tab="account"]').click()

    values = {
        "balance": page.locator("#pet-account-balance").inner_text(),
        "today": page.locator("#pet-account-today").inner_text(),
        "cacheHit": page.locator("#pet-account-token-hit").inner_text(),
        "cacheMiss": page.locator("#pet-account-token-miss").inner_text(),
        "output": page.locator("#pet-account-token-output").inner_text(),
        "hourlyRows": page.locator("#pet-account-hourly li").count(),
    }
    assert values == {
        "balance": "¥11.05",
        "today": "今日估算 ¥0.3020",
        "cacheHit": "100k",
        "cacheMiss": "200k",
        "output": "50k",
        "hourlyRows": 1,
    }
    page.screenshot(path=str(SCREENSHOT), full_page=True)
    page.evaluate("window.whaleBilling.clear()")
    assert page.locator("#pet-account-balance").inner_text() == "¥11.05"
    assert page.locator("#pet-account-hourly li").inner_text() == "还没有新增 token 用量"

    emotion_labels = {
        "angry": "生气",
        "love": "喜欢",
        "shy": "害羞",
        "mischievous": "坏笑",
        "relieved": "安心",
        "determined": "认真",
        "nervous": "紧张",
        "hungry": "馋嘴",
        "sleepy": "困倦",
        "confused": "困惑",
    }
    page.locator("#pet-menu-close").click()
    for name, label in emotion_labels.items():
        page.locator(f'[data-emotion="{name}"]').click()
        assert page.locator("#emotion-state").inner_text() == label
        page.wait_for_timeout(420)
        expected_effect_text = {"angry": "💢", "sleepy": "ZZZ"}.get(name, "")
        assert page.locator("#emotion-fx").inner_text().replace("\n", "") == expected_effect_text
        if name == "angry":
            anger = page.locator("#emotion-fx .emotion-particle.anger")
            assert anger.count() == 1
            assert page.locator("#emotion-fx .emotion-particle.anger-steam").count() == 3
            assert anger.inner_text() == "💢"
            page.evaluate("document.querySelectorAll('#emotion-fx .emotion-particle').forEach(node => node.style.animationPlayState = 'paused')")
        if name == "love":
            assert page.locator("#emotion-fx .emotion-particle.heart").count() == 7
            page.evaluate("document.querySelectorAll('#emotion-fx .emotion-particle').forEach(node => node.style.animationPlayState = 'paused')")
        if name == "shy":
            assert page.locator("#emotion-fx .emotion-particle.shy-heart").count() == 4
        if name == "mischievous":
            assert page.locator("#emotion-fx .emotion-particle.mischief").count() == 3
        if name == "hungry":
            assert page.locator("#emotion-fx .emotion-particle.rice-thought").count() == 2
            assert page.locator("#emotion-fx .emotion-particle.rice-dream").count() == 1
        if name == "nervous":
            assert page.locator("#emotion-fx .emotion-particle.sweat").count() == 3
        if name == "sleepy":
            sleep_marks = page.locator("#emotion-fx .emotion-particle.sleep")
            assert sleep_marks.count() == 3
            assert sleep_marks.all_inner_texts() == ["Z", "Z", "Z"]
        if name == "confused":
            question_marks = page.locator("#emotion-fx .emotion-particle.question")
            assert question_marks.count() == 3
            assert all("svg" in value for value in question_marks.evaluate_all("nodes => nodes.map(node => getComputedStyle(node).backgroundImage)"))
        page.locator("#stage").screenshot(path=str(
            SCREENSHOT.with_name(f"emotion-{name}-v102b.png")
        ), animations="allow")
        if name == "nervous":
            for frame_index in range(1, 4):
                page.wait_for_timeout(260)
                page.locator("#stage").screenshot(path=str(
                    SCREENSHOT.with_name(f"emotion-nervous-v102b-{frame_index}.png")
                ), animations="allow")
    print(json.dumps({"values": values, "consoleErrors": console_errors, "screenshot": str(SCREENSHOT)}))
    browser.close()
