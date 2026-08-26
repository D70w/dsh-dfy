import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../../../')
const assetDirectory = resolve(root, 'character-packs/default-whale/source/see-through-idle-rig-v1')

describe('wave action attachment pack', () => {
  it('keeps both normalized attachments aligned in design space', () => {
    const manifest = JSON.parse(readFileSync(resolve(assetDirectory, 'manifest.json'), 'utf8')) as {
      parts: Record<string, { file: string; x: number; y: number; width: number; height: number }>
    }
    expect(manifest.parts['wave-arm-sleeve']).toEqual({ file: 'wave-action-v1/wave-sleeve.png', x: 364, y: 379, width: 171, height: 184 })
    expect(manifest.parts['hand-left-wave-three-quarter']).toEqual({ file: 'wave-action-v1/wave-palm-three-quarter.png', x: 324, y: 332, width: 91, height: 84 })
  })

  it('stores real RGBA PNG outputs instead of simulated transparency', () => {
    for (const file of ['wave-action-v1/wave-sleeve.png', 'wave-action-v1/wave-palm-three-quarter.png']) {
      const png = readFileSync(resolve(assetDirectory, file))
      expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
      expect(png[25]).toBe(6)
    }
  })
})
