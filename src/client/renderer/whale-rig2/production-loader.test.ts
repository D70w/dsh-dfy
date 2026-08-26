import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rig2TextureIds } from './production-loader.ts'

describe('WhaleRig2 production manifest', () => {
  const root = resolve(import.meta.dirname, '../../../../')
  const manifest = JSON.parse(readFileSync(resolve(root, 'character-packs/default-whale/source/legacy-plugin-runtime-v1/rig2/manifest.d4cc19463f1e.json'), 'utf8')) as {
    animationFrames: number
    textures: Record<string, string>
    runtimeSourcePolicy: Record<string, boolean>
  }

  it('contains only static semantic textures', () => {
    expect(manifest.animationFrames).toBe(0)
    expect(Object.values(manifest.runtimeSourcePolicy).every(value => value === false)).toBe(true)
    expect(Object.keys(manifest.textures).sort()).toEqual([...rig2TextureIds].sort())
    expect(Object.values(manifest.textures).every(path => !/(?:run|frame|pose)[-_]?\d+/i.test(path))).toBe(true)
  })

  it('references existing content-addressed files', () => {
    for (const path of Object.values(manifest.textures)) {
      expect(path).toMatch(/^rig2\/[a-z0-9-]+\.[0-9a-f]{12}\.png$/)
      expect(readFileSync(resolve(root, 'character-packs/default-whale/source/legacy-plugin-runtime-v1', path)).byteLength).toBeGreaterThan(0)
    }
  })
})
