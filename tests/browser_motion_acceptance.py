import os
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("WHALE_E2E_BASE_URL", "http://127.0.0.1:3088")
ARTIFACT = Path(__file__).resolve().parent.parent / "artifacts" / "whale-approved-runtime-browser-acceptance.png"


def click_visible(page: Page, role: str, name: str) -> bool:
    matches = page.get_by_role(role, name=name, exact=True)
    for index in range(matches.count()):
        candidate = matches.nth(index)
        if candidate.is_visible() and candidate.is_enabled():
            candidate.click()
            return True
    return False


def dismiss_host_onboarding(page: Page) -> None:
    page.wait_for_timeout(250)
    if click_visible(page, "button", "继续"):
        page.wait_for_timeout(350)
    if click_visible(page, "button", "稍后配置"):
        page.wait_for_timeout(350)


def sample_video_progress(page: Page, duration_ms: int) -> dict[str, object]:
    return page.evaluate(
        """
        ({ durationMs }) => new Promise(resolve => {
          const samples = new Set();
          const startedAt = performance.now();
          const tick = now => {
            const video = document.querySelector('[data-whale-action-video]');
            if (!(video instanceof HTMLVideoElement)) {
              resolve({ distinct: samples.size, readyState: 0, paused: true, performance: '' });
              return;
            }
            samples.add(video.currentTime.toFixed(3));
            if (now - startedAt >= durationMs) {
              resolve({
                distinct: samples.size,
                readyState: video.readyState,
                paused: video.paused,
                performance: video.dataset.whaleVideoPerformance || '',
              });
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        })
        """,
        {"durationMs": duration_ms},
    )


def start_butterfly(page: Page) -> None:
    whale = page.locator("[data-whale-pet-hotspot]")
    whale.focus()
    whale.press("Enter")
    page.get_by_role("menuitem", name="追赶蝴蝶", exact=True).press("Enter")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    console_errors: list[str] = []
    page_errors: list[str] = []
    expected_balance_failures = 0
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on(
        "response",
        lambda response: globals().__setitem__("expected_balance_failures", expected_balance_failures + 1)
        if response.status == 503 and "/api/dsh-dfy/v1/balance" in response.url
        else None,
    )

    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    dismiss_host_onboarding(page)
    whale = page.locator("[data-whale-pet-hotspot]")
    canvas = page.locator("[data-whale-rig-canvas]")
    whale.wait_for(state="visible")
    page.wait_for_function(
        "element => element.closest('[data-whale-renderer]').getAttribute('data-whale-renderer') === 'ready'",
        arg=canvas.element_handle(),
    )
    box = canvas.bounding_box()
    assert box is not None and box["width"] == 350 and box["height"] == 350, box

    start_butterfly(page)
    page.wait_for_function(
        "() => { const video = document.querySelector('[data-whale-action-video]'); return video && video.readyState >= 2 && video.dataset.whaleVideoPerformance.endsWith('-cycle'); }",
        timeout=5_000,
    )
    page.wait_for_timeout(150)
    outbound_stats = sample_video_progress(page, 650)
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(ARTIFACT), full_page=True)

    page.wait_for_function(
        "element => element.getAttribute('data-whale-autonomy') === 'none'",
        arg=page.locator("[data-whale-pet-entry]").element_handle(),
        timeout=10_000,
    )
    start_butterfly(page)
    page.wait_for_function(
        "() => { const video = document.querySelector('[data-whale-action-video]'); return video && video.readyState >= 2 && video.dataset.whaleVideoPerformance.endsWith('-cycle'); }",
        timeout=7_000,
    )
    page.wait_for_timeout(120)
    return_stats = sample_video_progress(page, 350)

    assert outbound_stats["distinct"] >= 10, outbound_stats
    assert return_stats["distinct"] >= 5, return_stats
    for stats in (outbound_stats, return_stats):
        assert stats["readyState"] >= 2, stats
        assert not stats["paused"], stats
        assert stats["performance"] in ("run-cycle", "run-left-cycle"), stats

    # Without a configured provider key the balance endpoint intentionally
    # responds with 503; Chromium reports that as a generic resource error.
    # Allow exactly those expected failures while still rejecting any other
    # browser console error.
    assert len(console_errors) == expected_balance_failures, console_errors
    assert all(
        error == "Failed to load resource: the server responded with a status of 503 (Service Unavailable)"
        for error in console_errors
    ), console_errors
    assert not page_errors, page_errors
    print(
        "PASS: 350px stage,",
        outbound_stats["distinct"],
        "distinct outbound video timestamps,",
        return_stats["distinct"],
        "distinct return video timestamps, no browser errors",
    )
    print("SCREENSHOT:", ARTIFACT)
    browser.close()
