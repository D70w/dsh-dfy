"""First-time user journey against the packaged plugin in an isolated DSH home."""
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from playwright.sync_api import sync_playwright, TimeoutError as BrowserTimeout

OUTPUT = Path('artifacts/first-experience')
OUTPUT.mkdir(parents=True, exist_ok=True)

def dismiss_host_setup(page):
    for label in ['继续', '稍后配置']:
        button = page.get_by_role('button', name=label, exact=True)
        try:
            button.first.wait_for(state='visible', timeout=5000)
            button.first.click()
        except BrowserTimeout:
            pass

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get(
        'WHALE_E2E_BROWSER', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'))
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, locale='zh-CN')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ['WHALE_E2E_BASE_URL'], wait_until='networkidle')
    # DSH's first-run dialog belongs to the host, not the plugin.
    dismiss_host_setup(page)
    canvas = page.locator('[data-whale-rig-canvas]')
    canvas.wait_for(state='visible', timeout=20000)
    page.wait_for_function("document.querySelector('[data-whale-renderer]').dataset.whaleRenderer === 'ready'")
    assert page.locator('[data-whale-debug-panel]').count() == 0
    toggle = page.locator('[data-whale-menu-toggle]')
    toggle.click()
    panel = page.locator('[data-whale-menu-panel]')
    page.wait_for_function("document.querySelector('[data-whale-menu-panel]').dataset.open === 'true'")
    assert panel.locator('[data-whale-interaction-action]').count() == 4
    panel.get_by_role('tab', name='对话', exact=True).click()
    panel.get_by_role('button', name='打开输入框', exact=True).click()
    message = page.get_by_role('textbox', name='对话内容', exact=True)
    message.wait_for(state='visible')
    page.get_by_role('group', name='对话模型', exact=True).get_by_role('button', name='离线', exact=True).click()
    message.fill('你好，今天一起加油吧')
    page.locator('[data-whale-chat-send]').click()
    page.wait_for_function("document.querySelector('[data-whale-dialogue]').dataset.context === 'reply'")
    assert page.locator('[data-whale-dialogue-message]').inner_text().strip()
    page.get_by_role('button', name='收起输入框', exact=True).click()
    assert not message.is_visible()
    # Capture only the empty host and pet; no conversation/history screenshots.
    page.reload(wait_until='networkidle')
    dismiss_host_setup(page)
    toggle.click()
    panel.get_by_role('button', name='关闭菜单', exact=True).click()
    page.wait_for_function("document.querySelector('[data-whale-menu-panel]').dataset.open === 'false'")
    frame_gaps = page.evaluate('''async () => {
      const gaps=[]; let previous=performance.now();
      for(let i=0;i<120;i++) await new Promise(resolve=>requestAnimationFrame(now=>{
        gaps.push(now-previous); previous=now; resolve();
      }));
      return gaps.slice(1).sort((a,b)=>a-b);
    }''')
    page.locator('[data-whale-pet-stage]').screenshot(path=str(OUTPUT / 'default-pet.png'))
    # Exercise a real pointer drag before checking constrained menus.
    hotspot = page.locator('[data-whale-pet-hotspot]').bounding_box()
    assert hotspot
    x, y = hotspot['x'] + hotspot['width']/2, hotspot['y'] + hotspot['height']/2
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x-100, y-80, steps=12)
    page.mouse.move(x-60, y-60, steps=8)
    page.mouse.up()
    for width, height in [(1024,768), (480,640)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(500)
        if toggle.get_attribute('aria-expanded') != 'true':
            button_box = toggle.bounding_box()
            assert button_box
            page.mouse.click(button_box['x'] + button_box['width']/2, button_box['y'] + button_box['height']/2)
        page.wait_for_function("document.querySelector('[data-whale-menu-panel]').dataset.open === 'true'")
        page.wait_for_timeout(350)
        bounds = panel.bounding_box()
        assert bounds and bounds['x'] >= 0 and bounds['y'] >= 0, bounds
        assert bounds['x'] + bounds['width'] <= width + 1, bounds
        assert bounds['y'] + bounds['height'] <= height + 1, bounds
        panel.screenshot(path=str(OUTPUT / f'menu-{width}.png'))
        panel.get_by_role('button', name='关闭菜单', exact=True).click()
        page.wait_for_function("document.querySelector('[data-whale-menu-panel]').dataset.open === 'false'")
    # Synthetic work signals only; do not spend tokens or capture debug screens.
    page.set_viewport_size({'width':1440,'height':900})
    url = urlsplit(os.environ['WHALE_E2E_BASE_URL'])
    query = dict(parse_qsl(url.query))
    # Authentication has already established the browser session. Reusing the
    # one-time token URL makes DSH strip the other query flags during login.
    query.pop('token', None)
    query['whaleDebug'] = '1'
    page.goto(urlunsplit((url.scheme,url.netloc,url.path,urlencode(query),url.fragment)), wait_until='networkidle')
    dismiss_host_setup(page)
    for kind in ['read','search','command','write']:
        page.locator(f'[data-whale-debug-tool-{kind}]').click()
        page.wait_for_function('(kind)=>document.querySelector(`[data-whale-work-fx][data-tool-kind="${kind}"]`) !== null', arg=kind)
    assert not errors, errors
    dsh_version = subprocess.check_output(['node', os.environ['WHALE_DSH_CLI'], '--version'], text=True).strip()
    report = {'dsh_version': dsh_version, 'journey': 'PASS', 'page_errors': errors,
              'work_feedback': 'four simulated tool states passed',
              'menu_viewports': ['1024x768','480x640'],
              'frame_gap_median_ms': round(frame_gaps[len(frame_gaps)//2],2),
              'frame_gap_p95_ms': round(frame_gaps[int(len(frame_gaps)*.95)],2),
              'note': 'Frame gaps reflect this browser and machine, not a cross-device guarantee.'}
    (OUTPUT / 'result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    browser.close()
