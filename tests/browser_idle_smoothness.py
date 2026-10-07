"""Local renderer motion smoke test; no personal DSH conversations are captured."""
from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path(__file__).resolve().parent.parent / 'artifacts/emotion-review'
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1000, 'height': 850})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:3140/artifacts/emotion-review/', wait_until='networkidle')
    page.wait_for_function('!!window.review')
    canvas = page.locator('#stage canvas')
    breeze_samples = []
    for phase, at in [('glance', 3500), ('return', 6600), ('settled', 9000)]:
        page.wait_for_function('(at)=>Number(document.querySelector("#stage canvas").dataset.idleMotionTime)>=at', arg=at)
        canvas.screenshot(path=str(output / f'smooth-{phase}.png'))
        breeze_samples.append(canvas.evaluate('(c)=>[Number(c.dataset.breezeBody),Number(c.dataset.breezeChest),Number(c.dataset.breezeHead)]'))
    assert any(abs(body-head) > .01 for body, chest, head in breeze_samples), breeze_samples
    assert all(abs(value) <= 1.6 for sample in breeze_samples for value in sample), breeze_samples
    canvas.evaluate("c=>c.dataset.renderActive='false'")
    frozen = float(canvas.get_attribute('data-idle-motion-time'))
    page.wait_for_timeout(1100)
    assert float(canvas.get_attribute('data-idle-motion-time')) == frozen
    canvas.evaluate("c=>c.dataset.renderActive='true'")
    page.wait_for_timeout(350)
    resumed = float(canvas.get_attribute('data-idle-motion-time')) - frozen
    assert 0 < resumed < 600, resumed
    assert not errors, errors
    print({'resumeDelta': resumed, 'pageErrors': errors})
    browser.close()
