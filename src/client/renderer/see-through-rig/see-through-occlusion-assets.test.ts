import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../../../')
const assetDirectory = resolve(root, 'character-packs/default-whale/source/see-through-idle-rig-v1')

describe('see-through foreground occlusion assets', () => {
  it('keeps the derived collar layer aligned to the torso source rectangle', () => {
    const manifest = JSON.parse(readFileSync(resolve(assetDirectory, 'manifest.json'), 'utf8')) as {
      parts: Record<string, { file: string; x: number; y: number; width: number; height: number }>
    }
    expect(manifest.parts['collar-front']).toEqual({ file: 'collar-front.png', x: 506, y: 504, width: 242, height: 440 })

    const png = readFileSync(resolve(assetDirectory, manifest.parts['collar-front'].file))
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(242)
    expect(png.readUInt32BE(20)).toBe(440)
    expect(png[25]).toBe(6)
  })
})
