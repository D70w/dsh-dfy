import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WHALE_MANIFEST_FILE } from '../../../asset-paths.ts'
import { whaleManifestSchema, whaleRigSchema } from './schema.ts'
import { buildPartVertices, resolveCanvasRenderScale } from './webgl.ts'

const runtime = new URL('../../../../character-packs/default-whale/source/legacy-plugin-runtime-v1/', import.meta.url)
const json = (path: string): unknown => JSON.parse(readFileSync(new URL(path, runtime), 'utf8')) as unknown

describe('WhaleRig local mesh', () => {
  it('uses the 2x runtime artwork for crisp scaled desktop rendering', () => {
    const manifest = whaleManifestSchema.parse(json(WHALE_MANIFEST_FILE))
    const rig = whaleRigSchema.parse(json(manifest.files.rig))

    expect(resolveCanvasRenderScale(rig, 1)).toBe(2)
    expect(resolveCanvasRenderScale(rig, 1.5)).toBe(2)
    expect(resolveCanvasRenderScale(rig, 3)).toBe(2)
  })

  it('builds a bounded triangle mesh and only deforms weighted regions', () => {
    const manifest = whaleManifestSchema.parse(json(WHALE_MANIFEST_FILE))
    const rig = whaleRigSchema.parse(json(manifest.files.rig))
    const part = rig.parts[0]!
    const defaults = Object.fromEntries(rig.parameters.map(parameter => [parameter.id, parameter.default]))
    const identity = [1, 0, 0, 1, 0, 0] as const
    const still = buildPartVertices(part, identity, defaults, rig.atlasSize)
    const moving = buildPartVertices(part, identity, { ...defaults, ahogeSway: 3 }, rig.atlasSize)

    expect(still).toHaveLength(18 * 18 * 6 * 4)
    expect([...moving]).not.toEqual([...still])
    expect([...moving.slice(0, 4)]).toEqual([...still.slice(0, 4)])
    expect(Math.max(...moving.filter(Number.isFinite))).toBeLessThan(113)
  })

  it('selects a different atlas cell without changing the stable stage geometry', () => {
    const manifest = whaleManifestSchema.parse(json(WHALE_MANIFEST_FILE))
    const rig = whaleRigSchema.parse(json(manifest.files.rig))
    const part = rig.parts.find(candidate => candidate.id === 'run')!
    const defaults = Object.fromEntries(rig.parameters.map(parameter => [parameter.id, parameter.default]))
    const identity = [1, 0, 0, 1, 0, 0] as const
    const first = buildPartVertices(part, identity, defaults, rig.atlasSize, part.frames![0])
    const second = buildPartVertices(part, identity, defaults, rig.atlasSize, part.frames![1])

    expect([...second.filter((_, index) => index % 4 < 2)]).toEqual([...first.filter((_, index) => index % 4 < 2)])
    expect([...second.filter((_, index) => index % 4 >= 2)]).not.toEqual([...first.filter((_, index) => index % 4 >= 2)])
  })
})
