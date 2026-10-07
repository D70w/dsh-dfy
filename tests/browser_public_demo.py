"""Public, no-key demo: no user profile, real tasks or history is accessed."""
from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path('artifacts/public-demo-review')
output.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')
    page = browser.new_page(viewport={'width':1280,'height':900}, locale='zh-CN')
    errors, requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    page.goto('http://127.0.0.1:3152/', wait_until='networkidle')
    pet = page.get_by_role('button', name='摸摸大肥鱼', exact=True)
    pet.wait_for()
    page.wait_for_function("!document.querySelector('.pet').disabled")
    page.screenshot(path=str(output/'desktop.png'), full_page=True)
    pet.click()
    page.wait_for_selector('[data-whale-emotion-fx][data-emotion=love]')
    for name in ['喜欢','害羞','生气','惊讶','难过','开心','困惑','委屈','困倦','得意','期待','坏笑','安心','认真','紧张','馋嘴']:
        page.get_by_role('button', name=name, exact=True).click()
        page.wait_for_timeout(250)
        assert page.locator('.speech').inner_text().strip()
    for label,kind in [('读文件','read'),('搜索','search'),('执行','command'),('写入','write')]:
        page.get_by_role('button', name=label, exact=True).click()
        page.wait_for_selector(f'[data-whale-work-fx][data-tool-kind={kind}]')
    for label,reaction in [('任务成功','completed'),('任务失败','error')]:
        page.get_by_role('button', name=label, exact=True).click()
        page.wait_for_selector(f'[data-whale-work-fx][data-work-reaction={reaction}]')
    page.get_by_role('checkbox', name='减少动态效果').check()
    page.get_by_role('button', name='开心', exact=True).click()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(400)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(output/'mobile.png'), full_page=True)
    assert not errors, errors
    assert all(url.startswith('http://127.0.0.1:3152/') for url in requests), requests
    assert not any('/api/' in url or url.endswith('.webm') for url in requests)
    assert page.evaluate('localStorage.length') == 0
    browser.close()
    print('PASS: all 16 emotions, 6 work cues, petting, reduced motion, mobile layout; no remote requests, API or history.')
