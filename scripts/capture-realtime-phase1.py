from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "whale-realtime-phase1"
URL = "http://127.0.0.1:3105/artifacts/whale-realtime-phase1/preview.html"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 940}, device_scale_factor=1)
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(100)
    facts = page.evaluate("""() => {
      const p = window.__phase1
      const frame = p.runtime.update(0)
      return {
        parts: frame.parts.length,
        images: p.images.size,
        finite: frame.parts.every(part => Object.values(part.matrix).every(Number.isFinite)),
        bones: frame.worlds.length,
      }
    }""")
    if facts != {"parts": 13, "images": 13, "finite": True, "bones": 14}:
        raise AssertionError(f"unexpected runtime facts: {facts}")
    page.evaluate("window.__phase1.runtime.animator.speed = 0; window.__phase1.runtime.animator.seek(300)")
    before = page.evaluate("window.__phase1.runtime.animator.timeMs")
    page.wait_for_timeout(150)
    after = page.evaluate("window.__phase1.runtime.animator.timeMs")
    if before != after:
        raise AssertionError(f"speed zero advanced primary clock: {before} -> {after}")
    page.evaluate("window.__phase1.runtime.animator.speed = 1; window.__phase1.runtime.animator.durationMs = 1600; window.__phase1.runtime.setBoneOverride('leg-near-thigh', {angle:45})")
    if page.evaluate("window.__phase1.runtime.animator.durationMs") != 1600:
        raise AssertionError("duration retime did not apply")
    if page.evaluate("window.__phase1.runtime.update(0).pose['leg-near-thigh'].angle") != 45:
        raise AssertionError("bone override did not apply")
    print({"runtimeFacts": facts, "speedZero": True, "durationRetime": True, "boneOverride": True})
    page.screenshot(path=str(OUT / "visual-static.png"), full_page=True)
    page.locator("#pause").click()
    page.evaluate("window.__phase1.runtime.animator.seek(0)")
    page.locator("#bones").uncheck()
    page.locator("#pivots").uncheck()
    page.wait_for_timeout(100)
    page.screenshot(path=str(OUT / "visual-clean-static.png"), full_page=True)
    page.locator("#bones").check()
    page.locator("#pivots").check()
    page.locator("#resume").click()
    page.wait_for_timeout(1_200)
    page.screenshot(path=str(OUT / "visual-running.png"), full_page=True)
    page.locator("#legOverride").click()
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / "visual-leg-override.png"), full_page=True)
    page.locator("#speed").fill("0")
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / "visual-speed-zero.png"), full_page=True)

    phase_dir = OUT / "phase-captures"
    phase_dir.mkdir(exist_ok=True)
    page.locator("#clearOverride").click()
    page.locator("#bones").uncheck()
    page.locator("#pivots").uncheck()
    page.locator("#pause").click()
    page.evaluate("window.__phase1.runtime.animator.durationMs = 900")
    for index in range(8):
        page.evaluate(f"window.__phase1.runtime.animator.seek({index * 112.5})")
        page.wait_for_timeout(20)
        page.locator("#stage").screenshot(path=str(phase_dir / f"phase-{index:02d}.png"))
    tiles = [Image.open(phase_dir / f"phase-{index:02d}.png").convert("RGB") for index in range(8)]
    sheet = Image.new("RGB", (640 * 4, 640 * 2), "#121927")
    draw = ImageDraw.Draw(sheet)
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % 4) * 640, (index // 4) * 640))
        draw.text(((index % 4) * 640 + 16, (index // 4) * 640 + 16), f"phase {index}", fill="#ffd166")
    sheet.save(OUT / "phase-contact-sheet.png")
    print({"status": page.locator("#status").inner_text(), "errors": errors})
    browser.close()
