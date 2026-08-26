import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WHALE_RUNTIME_FILES } from '../src/asset-paths.ts'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  dsh: { bundle: { patch: string }; client: { platform: string; inject: string[] } }
  exports: Record<string, unknown>
  files: string[]
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

describe('DSH package contract', () => {
  it('ships sibling bundle and browser roles with all four exports', () => {
    expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(manifest.dsh.client.platform).toBe('web')
    expect(Object.keys(manifest.exports)).toEqual(['.', './invariant', './client', './package.json'])
  })

  it('declares the packages whose services the browser entry waits for', () => {
    expect(manifest.dsh.client.inject).toEqual(expect.arrayContaining([
      '@deepseek-ai/dsh-client-locale',
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-client-ui-layout',
      '@deepseek-ai/dsh-client-ui-settings',
    ]))
  })

  it('contains no workspace or adjacent-checkout dependency', () => {
    const specs = Object.values({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.devDependencies,
    })
    expect(specs.some(spec => spec.startsWith('workspace:') || spec.startsWith('file:') || spec.startsWith('link:'))).toBe(false)
  })

  it('uses Harness peer packages and publishes no source maps', () => {
    expect(manifest.dependencies).toEqual({ zod: '^4.4.3' })
    expect(manifest.peerDependencies).toMatchObject({
      '@deepseek-ai/cordis': '^4.0.1',
      '@deepseek-ai/dsh-client-runtime': '>=0.1.0-rc.5 <0.1.0-rc.8',
      '@deepseek-ai/dsh-session-projection': '>=0.1.0-rc.5 <0.1.0-rc.8',
      '@deepseek-ai/dsh-host-webserver': '>=0.1.0-rc.5 <0.1.0-rc.8',
      '@deepseek-ai/dsh-storage-domain': '>=0.1.0-rc.5 <0.1.0-rc.8',
    })
    expect(manifest.files.some(file => file.endsWith('.map'))).toBe(false)
  })

  it('ships attribution and the non-commercial share-alike license for the bundled character', () => {
    expect(manifest.files).toContain('ASSETS_LICENSE.md')
    const record = readFileSync(new URL('../ASSETS_LICENSE.md', import.meta.url), 'utf8')
    expect(record).toContain('上善无形')
    expect(record).toContain('CC BY-NC-SA 4.0')
    expect(record).toContain('not covered by the repository MIT license')
    expect(record).toContain('runtime/production-v1')
    expect(record).toContain('transparent WebM')
  })

  it('ships only the curated production runtime and bounded media assets', () => {
    const runtime = new URL('../character-packs/default-whale/runtime/', import.meta.url)
    const files = WHALE_RUNTIME_FILES.map(path => new URL(path, runtime))
    expect(files.length).toBeGreaterThan(0)
    expect(WHALE_RUNTIME_FILES.every(path => path.startsWith('production-v1/'))).toBe(true)
    let totalBytes = 0
    for (const file of files) {
      const name = file.pathname.split('/').at(-1)!
      expect(name).toMatch(/\.(json|png|webm)$/)
      const size = statSync(file).size
      expect(size).toBeLessThanOrEqual(8 * 1024 * 1024)
      totalBytes += size
    }
    expect(totalBytes).toBeLessThan(80 * 1024 * 1024)
    const character = files.find(file => file.pathname.endsWith('/source-master.png'))
    expect(character).toBeDefined()
    // PNG IHDR color type 6 is true RGBA; a baked RGB checkerboard is rejected.
    expect(readFileSync(character!)[25]).toBe(6)
    expect(manifest.files).toContain('character-packs/default-whale/runtime/production-v1/**')
    expect(manifest.files).not.toContain('character-packs/default-whale/runtime/rig2/**')
    expect(manifest.files).not.toContain('character-packs/default-whale/runtime/community-rig/**')
    expect(manifest.files).not.toContain('character-packs/default-whale/runtime/**')
    expect(join('character-packs', 'default-whale', 'runtime')).not.toContain('source')
  })
})
