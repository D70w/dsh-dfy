import { build } from 'tsdown'
import { mkdir, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { WHALE_RUNTIME_FILES, WHALE_IDLE_ROOT } from '../src/asset-paths.ts'

const out = resolve('artifacts/public-demo')
await mkdir(out, { recursive: true })
await build({ config: false, entry: { main: 'demo/main.tsx' }, outDir: out, format: 'esm', platform: 'browser', target: 'es2022', clean: false, dts: false, minify: true, sourcemap: false, deps: { alwaysBundle: [/.*/] }, define: { 'process.env.NODE_ENV': '"production"' } })
for (const file of ['index.html','style.css']) await copyFile(`demo/${file}`, `${out}/${file}`)
for (const file of WHALE_RUNTIME_FILES.filter(file => file.startsWith(`${WHALE_IDLE_ROOT}/`))) {
  const target = resolve(out, 'assets/idle', file.slice(WHALE_IDLE_ROOT.length + 1))
  await mkdir(dirname(target), { recursive: true })
  await copyFile(resolve('character-packs/default-whale/runtime', file), target)
}
console.log('Demo built: artifacts/public-demo/index.html (no videos, API keys or user history)')
