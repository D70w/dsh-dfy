import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { WHALE_IDLE_ROOT, WHALE_RUNTIME_FILES } from '../../../asset-paths.ts'

it('ships and serves every attachment loaded by the production renderer', () => {
  const directory = resolve(import.meta.dirname, '../../../../character-packs/default-whale/runtime', WHALE_IDLE_ROOT)
  const manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8')) as {
    parts: Record<string, { file: string; width: number; height: number }>
  }
  const runtime = readFileSync(resolve(import.meta.dirname, 'approved-idle-runtime.js'), 'utf8')
  const names = runtime.match(/const partNames = \[([\s\S]*?)\];/)![1]!.match(/"[^"]+"/g)!
  for (const name of names) {
    const part = manifest.parts[JSON.parse(name) as string]!
    expect(WHALE_RUNTIME_FILES).toContain(`${WHALE_IDLE_ROOT}/${part.file}`)
  }
  const hip = manifest.parts['arm-hip']!
  const png = readFileSync(resolve(directory, hip.file))
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
  expect(png[25]).toBe(6)
  expect(hip.width).toBe(hip.height)
})
