"""Compare the actual renderer with/without transparent-cell culling at identical poses."""
import functools
import json
import statistics
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'artifacts' / 'idle-perf' / 'check'
subprocess.run(['node', 'node_modules/tsdown/dist/run.mjs',
                'src/client/renderer/see-through-rig/approved-idle-runtime.js',
                '--no-config', '--format', 'esm', '--platform', 'browser',
                '--out-dir', str(OUTPUT), '--no-clean'], cwd=ROOT, check=True)
bundle = (OUTPUT / 'approved-idle-runtime.js').read_text(encoding='utf-8')
marker = 'const coverage = imageAlphaCoverage(image);'
assert bundle.count(marker) == 1


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path in ('/baseline.js', '/optimized.js'):
            source = bundle.replace(marker, 'const coverage = null;') if self.path == '/baseline.js' else bundle
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript')
            self.end_headers()
            self.wfile.write(source.encode())
        elif self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<style>body{margin:0;background:white}canvas{width:640px;height:640px}</style><canvas></canvas>')
        else:
            super().do_GET()


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
results = {}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for variant in ('baseline', 'optimized'):
            page = browser.new_page(viewport={'width': 640, 'height': 640})
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            page.evaluate('''() => {
                window.clock = 0; window.draws = 0;
                window.realNow = performance.now.bind(performance);
                performance.now = () => window.clock;
                window.requestAnimationFrame = fn => { window.nextFrame = fn; return 1; };
                const draw = CanvasRenderingContext2D.prototype.drawImage;
                CanvasRenderingContext2D.prototype.drawImage = function(...args) {
                    window.draws++; return draw.apply(this, args);
                };
                window.advance = count => {
                    const costs = []; window.draws = 0;
                    for (let i = 0; i < count; i++) {
                        window.clock += 1000 / 60;
                        const before = window.realNow(); window.nextFrame(window.clock);
                        costs.push(window.realNow() - before);
                    }
                    return { costs, draws: window.draws / count };
                };
            }''')
            page.evaluate('''async variant => {
                const module = await import('/' + variant + '.js');
                window.rig = await module.createSeeThroughIdleRig(document.querySelector('canvas'), {
                    assetBaseUrl: '/character-packs/default-whale/runtime/production-v1/idle/see-through-idle-rig-v2',
                    outputSize: 640, transparentBackground: true
                });
            }''', variant)
            page.evaluate('advance(12)')  # includes one-time alpha indexing
            metrics = page.evaluate('advance(150)')
            results[variant] = {'medianFrameMs': statistics.median(metrics['costs']), 'drawsPerFrame': metrics['draws']}
            phases = [('rest', ''), ('pet', 'rig.triggerPetReaction(.2)'),
                      ('happy', "rig.playEmotion('happy', 2500)"),
                      ('grab', 'rig.setGrabbed(true); rig.setExternalMotion(1,-1)'),
                      ('release', 'rig.setGrabbed(false); rig.setExternalMotion(0,0)'),
                      ('settled', "rig.setReducedMotion(true); rig.playEmotion('neutral', 300)")]
            for name, action in phases:
                if action:
                    page.evaluate(action)
                page.evaluate('advance(40)')
                page.locator('canvas').screenshot(path=str(OUTPUT / f'{variant}-{name}.png'))
            page.evaluate('rig.dispose()')
            page.close()
        browser.close()
    for name, _ in phases:
        difference = ImageChops.difference(Image.open(OUTPUT / f'baseline-{name}.png').convert('RGB'),
                                           Image.open(OUTPUT / f'optimized-{name}.png').convert('RGB'))
        assert difference.getbbox() is None, f'Visible pixels changed in {name}'
    assert results['optimized']['drawsPerFrame'] < results['baseline']['drawsPerFrame']
    print(json.dumps({'result': 'PASS', 'pixelIdenticalPoses': [name for name, _ in phases], 'measurements': results}, indent=2))
finally:
    server.shutdown()
    server.server_close()
