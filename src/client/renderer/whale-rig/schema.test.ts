import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WHALE_MANIFEST_FILE } from '../../../asset-paths.ts'
import {
  validateResolvedPack,
  whaleExpressionsSchema,
  whaleManifestSchema,
  whaleMotionSchema,
  whalePhysicsSchema,
  whaleRigSchema,
  type ResolvedWhalePack,
} from './schema.ts'

const runtime = new URL('../../../../character-packs/default-whale/source/legacy-plugin-runtime-v1/', import.meta.url)
const json = (path: string): unknown => JSON.parse(readFileSync(new URL(path, runtime), 'utf8')) as unknown

function builtInPack(): ResolvedWhalePack {
  const manifest = whaleManifestSchema.parse(json(WHALE_MANIFEST_FILE))
  const motionPaths = [...new Set([
    ...Object.values(manifest.actions).map(action => action.motion),
    ...Object.values(manifest.performances).map(performance => performance.motion),
  ])]
  return validateResolvedPack({
    manifest,
    rig: whaleRigSchema.parse(json(manifest.files.rig)),
    expressions: whaleExpressionsSchema.parse(json(manifest.files.expressions)),
    physics: whalePhysicsSchema.parse(json(manifest.files.physics)),
    motions: new Map(motionPaths.map(path => [path, whaleMotionSchema.parse(json(path))])),
    atlasUrl: `/dsh-dfy/assets/v1/${manifest.files.atlas}`,
  })
}

describe('WhaleRig strict pack protocol', () => {
  it('accepts the complete built-in pack and resolves every action', () => {
    const pack = builtInPack()
    expect(Object.keys(pack.manifest.actions)).toHaveLength(8)
    expect(pack.rig.parts).toHaveLength(2)
    expect(pack.rig.parts[0]?.mesh).toMatchObject({ columns: 18, rows: 18 })
    expect(pack.rig.parts[1]).toMatchObject({ id: 'run', frameParameter: 'runFrame' })
    expect(pack.rig.parts[1]?.frames).toHaveLength(24)
    expect(pack.motions.size).toBe(6)
    expect(pack.manifest.performances.run.stridePx).toBe(22)
  })

  it('rejects unknown fields and non-whitelisted paths', () => {
    const manifest = json(WHALE_MANIFEST_FILE) as Record<string, unknown>
    expect(() => whaleManifestSchema.parse({ ...manifest, script: 'run.js' })).toThrow()
    expect(() => whaleManifestSchema.parse({
      ...manifest,
      files: { ...(manifest.files as object), atlas: '../source/atlas.svg' },
    })).toThrow()
  })

  it('rejects hierarchy cycles and unknown cross-file parameters', () => {
    const pack = builtInPack()
    const rig = structuredClone(pack.rig)
    rig.parts.find(part => part.id === 'front')!.parent = 'front'
    expect(() => whaleRigSchema.parse(rig)).toThrow(/cycle/)

    const expressions = structuredClone(pack.expressions)
    expressions.expressions.neutral!['notAParameter'] = 1
    expect(() => validateResolvedPack({ ...pack, expressions })).toThrow(/unknown parameter/)
  })

  it('rejects unbounded or unresolved local mesh deformers', () => {
    const pack = builtInPack()
    const rig = structuredClone(pack.rig)
    rig.parts[0]!.mesh!.deformers[0]!.parameter = 'notAParameter'
    expect(() => whaleRigSchema.parse(rig)).toThrow(/unknown parameter/)

    const tooWide = structuredClone(pack.rig)
    tooWide.parts[0]!.mesh!.deformers[0]!.direction = [3, 0]
    expect(() => whaleRigSchema.parse(tooWide)).toThrow(/direction is too large/)
  })

  it('requires bounded frame atlases and their selector parameter together', () => {
    const pack = builtInPack()
    const missingSelector = structuredClone(pack.rig)
    delete missingSelector.parts[1]!.frameParameter
    expect(() => whaleRigSchema.parse(missingSelector)).toThrow(/frames and frameParameter together/)

    const missingFrames = structuredClone(pack.rig)
    delete missingFrames.parts[1]!.frames
    expect(() => whaleRigSchema.parse(missingFrames)).toThrow(/frames and frameParameter together/)

    const outOfBounds = structuredClone(pack.rig)
    outOfBounds.parts[1]!.frames![0] = [1_100, 0, 224, 224]
    expect(() => whaleRigSchema.parse(outOfBounds)).toThrow(/exceeds atlas bounds/)
  })
})
