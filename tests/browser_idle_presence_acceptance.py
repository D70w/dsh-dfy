"""Exercise the installed DSH renderer, with character-only visual evidence."""
import json
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT = Path(__file__).resolve().parent.parent / 'artifacts' / 'idle-presence'
OUTPUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, locale='zh-CN')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ.get('WHALE_E2E_BASE_URL', 'http://127.0.0.1:3139/'), wait_until='networkidle')
    later = page.get_by_role('button', name='稍后配置', exact=True)
    if later.is_visible():
        later.click()
    canvas = page.locator('[data-whale-rig-canvas]')
    canvas.wait_for(state='visible')
    page.wait_for_function("document.querySelector('[data-whale-rig-canvas]')?.dataset.idleMotionTime !== undefined")
    # Capture a natural held glance, then release. No debugging controls appear.
    page.wait_for_function("Number(document.querySelector('canvas[data-whale-rig-canvas]').dataset.idleMotionTime) >= 3200")
    canvas.screenshot(path=str(OUTPUT / '01-glance.png'))
    box = canvas.bounding_box()
    assert box
    page.mouse.move(box['x'] + box['width'] * .85, box['y'] + box['height'] * .3)
    page.wait_for_timeout(120)
    onset = canvas.evaluate('(e)=>({...e.dataset})')
    assert float(onset['idlePointerWeight']) > .9
    page.wait_for_timeout(600)
    canvas.screenshot(path=str(OUTPUT / '02-eye-contact.png'))
    page.wait_for_timeout(4400)
    released = canvas.evaluate('(e)=>({...e.dataset})')
    assert float(released['idlePointerWeight']) == 0
    canvas.screenshot(path=str(OUTPUT / '03-release.png'))
    # Suspension must freeze the animation phase, not jump forward on resume.
    canvas.evaluate("e => e.dataset.renderActive = 'false'")
    frozen = float(canvas.get_attribute('data-idle-motion-time'))
    page.wait_for_timeout(1100)
    assert float(canvas.get_attribute('data-idle-motion-time')) == frozen
    canvas.evaluate("e => e.dataset.renderActive = 'true'")
    page.wait_for_function('(previous)=>Number(document.querySelector("[data-whale-rig-canvas]").dataset.idleMotionTime)>previous', arg=frozen)
    resumed = float(canvas.get_attribute('data-idle-motion-time'))
    assert 0 < resumed - frozen < 350, (frozen, resumed)
    canvas.screenshot(path=str(OUTPUT / '04-recovery.png'))
    # Exercise the local sprite action through the same public menu as users.
    page.locator('[data-whale-menu-toggle]').click()
    panel = page.locator('[data-whale-menu-panel]')
    panel.get_by_role('tab', name='演出', exact=True).click()
    panel.get_by_role('button', name='立即叉腰', exact=True).click()
    page.wait_for_function("document.querySelector('[data-whale-rig-canvas]').dataset.hipAttachment === 'active'")
    page.wait_for_timeout(650)
    (OUTPUT / '07-hands-on-hips.png').write_bytes(base64.b64decode(canvas.evaluate('e=>e.toDataURL()').split(',', 1)[1]))
    page.wait_for_function("document.querySelector('[data-whale-rig-canvas]').dataset.hipAttachment === 'rest'")
    # The original submenu must also work, including a second playback.
    page.locator('[data-whale-menu-toggle]').click()
    panel.get_by_role('tab', name='演出', exact=True).click()
    panel.get_by_role('tab', name='待机小剧场', exact=True).click()
    panel.get_by_role('button', name='播放叉腰', exact=True).click()
    page.wait_for_function("document.querySelector('[data-whale-rig-canvas]').dataset.hipAttachment === 'active'")
    page.wait_for_timeout(800)
    assert canvas.get_attribute('data-hip-attachment') == 'active'
    page.wait_for_function("document.querySelector('[data-whale-rig-canvas]').dataset.hipAttachment === 'rest'")
    # Exercise the public expression controls as a face regression check.
    for emotion, label in [('happy', '开心'), ('sad', '难过'), ('love', '喜欢'), ('angry', '生气'), ('shy', '害羞')]:
        page.locator('[data-whale-menu-toggle]').click()
        panel = page.locator('[data-whale-menu-panel]')
        panel.get_by_role('tab', name='演出', exact=True).click()
        panel.get_by_role('tab', name='单独表情', exact=True).click()
        panel.locator('[data-whale-emotion-grid]').get_by_role('button', name=label, exact=True).click()
        page.wait_for_function('(name)=>document.querySelector("[data-whale-rig-canvas]").dataset.emotion === name', arg=emotion)
        page.wait_for_timeout(700)
        def capture_face(filename):
            snapshot = canvas.evaluate('(e)=>({emotion:e.dataset.emotion, weight:Number(e.dataset.emotionWeight), image:e.toDataURL()})')
            assert snapshot['emotion'] == emotion and snapshot['weight'] > .1, snapshot['emotion']
            (OUTPUT / filename).write_bytes(base64.b64decode(snapshot['image'].split(',', 1)[1]))
        capture_face(f'05-{emotion}.png')
        if emotion in ('angry', 'sad', 'shy'):
            page.wait_for_timeout(850)
            capture_face(f'06-{emotion}-hold.png')
    assert not errors, errors
    print(json.dumps({'result': 'PASS', 'pauseAdvanceMs': resumed - frozen, 'onsetGaze': onset['idleGazeX'], 'onsetHead': onset['idleHeadGazeX'], 'renderCostMs': released['renderCostMs'], 'renderFps': released['renderFps'], 'pageErrors': errors, 'evidence': str(OUTPUT)}, ensure_ascii=False))
    browser.close()
