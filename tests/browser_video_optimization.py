"""Check browser decode, duration and real alpha before adopting candidates."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
report = json.loads(Path('artifacts/media-optimized/report.json').read_text(encoding='utf-8'))
output = Path('artifacts/media-optimized')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')
    page = browser.new_page(viewport={'width':1000,'height':650})
    page.goto('http://127.0.0.1:3153/demo/index.html')
    page.set_content('<style>body{background:#e8eef9;display:flex;gap:24px}video{width:450px;height:600px;object-fit:contain}</style>')
    for item in report['files']:
        if not item['adopted']: continue
        original_root = 'artifacts/media-originals/' if report['applied'] else 'character-packs/default-whale/runtime/'
        original = 'http://127.0.0.1:3153/' + original_root + item['file']
        candidate = 'http://127.0.0.1:3153/artifacts/media-optimized/' + item['file']
        stats = page.evaluate('''async ([a,b]) => {
          document.querySelectorAll('video').forEach(v=>v.remove());
          async function check(src) {
            const v=document.createElement('video');v.muted=true;v.preload='auto';v.src=src;document.body.append(v);
            await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject});
            v.currentTime=Math.min(.6,v.duration/2);
            await new Promise(resolve=>v.onseeked=resolve);
            const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
            const ctx=c.getContext('2d');ctx.drawImage(v,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
            let clear=0,opaque=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]<10)clear++;if(pixels[i]>245)opaque++;}
            return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,clear,opaque};
          }
          return [await check(a),await check(b)];
        }''', [original,candidate])
        a,b = stats
        assert abs(a['duration']-b['duration']) < .1, item['file']
        assert abs(a['width']/a['height']-b['width']/b['height']) < .01, item['file']
        assert b['clear'] > 0 and b['opaque'] > 0, item['file']
        if item['file'].endswith(('curtsy.webm','surprise.webm')):
            page.screenshot(path=str(output/('compare-'+Path(item['file']).stem+'.png')))
    browser.close()
print('PASS: browser decoded all adopted candidates, durations/aspect ratios match, alpha preserved.')
