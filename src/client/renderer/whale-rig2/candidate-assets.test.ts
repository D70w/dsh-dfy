import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface CandidateAsset {
  id: string
  file: string
  path: string
  owner: string
  required: boolean
  z: number
  canvasSize: [number, number]
  sha256: string
}

interface CandidateManifest {
  active: boolean
  animationFrames: number
  canvas: { width: number; height: number }
  runtimeSourcePolicy: Record<string, boolean>
  zOrderBackToFront: string[]
  assets: CandidateAsset[]
}

const root = resolve(import.meta.dirname, '../../../../')
const manifestPath = resolve(root, 'character-packs/default-whale/source/bind-pose-v3/candidate-v1.manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as CandidateManifest

describe('user-updated V1 candidate manifest', () => {
  it('remains an inactive static-layer candidate with no action frames', () => {
    expect(manifest.active).toBe(false)
    expect(manifest.animationFrames).toBe(0)
    expect(manifest.canvas).toMatchObject({ width: 1024, height: 1024 })
    expect(Object.values(manifest.runtimeSourcePolicy).every(value => value === false)).toBe(true)
    expect(manifest.assets.every(asset => !/(?:run|frame|pose)[-_]?\d+/i.test(asset.file))).toBe(true)
  })

  it('has unique semantic owners and hashes every whitelisted texture', () => {
    const required = manifest.assets.filter(asset => asset.required)
    expect(new Set(required.map(asset => asset.owner)).size).toBe(required.length)
    expect(manifest.zOrderBackToFront).toEqual([...required].sort((left, right) => left.z - right.z).map(asset => asset.id))
    for (const asset of manifest.assets) {
      expect(asset.canvasSize).toEqual([1024, 1024])
      const bytes = readFileSync(resolve(root, 'character-packs/default-whale/source/bind-pose-v3', asset.path))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256)
    }
  })
})
