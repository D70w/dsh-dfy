import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("WHALE_E2E_BASE_URL", "http://127.0.0.1:3107")
ARTIFACT_DIR = Path(os.environ.get("TEMP", "."))


def read_motion(canvas):
    return canvas.evaluate(
        """element => ({
            reaction: element.dataset.petReaction,
            hair: Number(element.dataset.petHairKick),
            cloth: Number(element.dataset.petClothKick),
            tail: Number(element.dataset.petTailKick),
            ear: Number(element.dataset.petEarKick),
            armLeftUpper: Number(element.dataset.armLeftUpperFollow),
            armLeftForearm: Number(element.dataset.armLeftForearmFollow),
            armRightUpper: Number(element.dataset.armRightUpperFollow),
            armRightForearm: Number(element.dataset.armRightForearmFollow),
            legLeftUpper: Number(element.dataset.legLeftUpperFollow),
            legLeftLower: Number(element.dataset.legLeftLowerFollow),
            legRightUpper: Number(element.dataset.legRightUpperFollow),
            legRightLower: Number(element.dataset.legRightLowerFollow),
        })"""
    )


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(f"{BASE_URL}/?whale-plugin=0.1.3-click-full-body", wait_until="networkidle")

    whale = page.locator("[data-whale-pet-hotspot]")
    whale.wait_for(state="visible")
    canvas = page.locator('canvas[data-pet-reaction-mode="full-body-secondary-impulse"]')
    canvas.wait_for(state="attached")
    page.wait_for_timeout(500)
    baseline = read_motion(canvas)

    box = whale.bounding_box()
    assert box is not None
    x = box["x"] + box["width"] * 0.72
    y = box["y"] + box["height"] * 0.42
    page.mouse.move(x, y)
    page.mouse.down()
    page.wait_for_timeout(35)
    page.mouse.up()

    samples = []
    for index in range(96):
        page.wait_for_timeout(16)
        sample = read_motion(canvas)
        samples.append(sample)
        if index in (5, 16, 34):
            whale.screenshot(
                path=str(ARTIFACT_DIR / f"dsh-dfy-click-full-body-{index}.png"),
                omit_background=True,
            )

    max_arm = max(
        abs(sample[key] - baseline[key])
        for sample in samples
        for key in ("armLeftUpper", "armLeftForearm", "armRightUpper", "armRightForearm")
    )
    max_leg = max(
        abs(sample[key] - baseline[key])
        for sample in samples
        for key in ("legLeftUpper", "legLeftLower", "legRightUpper", "legRightLower")
    )
    arm_asymmetry = max(
        abs(sample["armLeftForearm"] + sample["armRightForearm"])
        for sample in samples
    )
    leg_asymmetry = max(
        abs(sample["legLeftLower"] + sample["legRightLower"])
        for sample in samples
    )
    max_secondary = {
        key: max(abs(sample[key]) for sample in samples)
        for key in ("hair", "cloth", "tail", "ear")
    }

    page.wait_for_timeout(3500)
    final = read_motion(canvas)
    result = {
        "activeFrames": sum(sample["reaction"] != "idle" for sample in samples),
        "maxArmResponse": round(max_arm, 3),
        "maxLegResponse": round(max_leg, 3),
        "armAsymmetry": round(arm_asymmetry, 3),
        "legAsymmetry": round(leg_asymmetry, 3),
        "maxSecondary": max_secondary,
        "final": final,
        "pageErrors": page_errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # Capturing the three acceptance frames deliberately stalls this sampling
    # loop, so require several distinct active samples rather than an FPS-based
    # duration. The motion envelope itself is covered by the response peaks.
    assert result["activeFrames"] >= 5
    assert max_arm >= 0.35
    assert max_leg >= 0.15
    assert arm_asymmetry >= 0.1
    assert leg_asymmetry >= 0.05
    assert all(value >= 0.25 for value in max_secondary.values())
    assert not page_errors
    browser.close()
