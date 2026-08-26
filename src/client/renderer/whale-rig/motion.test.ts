import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WHALE_MANIFEST_FILE } from '../../../asset-paths.ts'
import { MotionMixer, sampleCurve } from './motion.ts'
import {
  validateResolvedPack,
  whaleExpressionsSchema,
  whaleManifestSchema,
  whaleMotionSchema,
  whalePhysicsSchema,
  whaleRigSchema,
} from './schema.ts'

const runtime = new URL('../../../../character-packs/default-whale/source/legacy-plugin-runtime-v1/', import.meta.url)
const json = (path: string): unknown => JSON.parse(readFileSync(new URL(path, runtime), 'utf8')) as unknown

function pack() {
  const manifest = whaleManifestSchema.parse(json(WHALE_MANIFEST_FILE))
  const paths = [...new Set([
    ...Object.values(manifest.actions).map(action => action.motion),
    ...Object.values(manifest.performances).map(performance => performance.motion),
  ])]
  return validateResolvedPack({
    manifest,
    rig: whaleRigSchema.parse(json(manifest.files.rig)),
    expressions: whaleExpressionsSchema.parse(json(manifest.files.expressions)),
    physics: whalePhysicsSchema.parse(json(manifest.files.physics)),
    motions: new Map(paths.map(path => [path, whaleMotionSchema.parse(json(path))])),
    atlasUrl: '',
  })
}

describe('WhaleRig motion mixer', () => {
  it('interpolates bounded keyframes', () => {
    expect(sampleCurve([[0, 0], [100, 10]], 25)).toBe(2.5)
    expect(sampleCurve([[0, 0], [100, 10]], 99, 'step')).toBe(0)
    expect(sampleCurve([[0, 0], [100, 10]], 100, 'step')).toBe(10)
    expect(sampleCurve([[0, 0], [100, 10]], 200)).toBe(10)
  })

  it('crossfades a newly preempting action and provides a static reduced-motion pose', () => {
    const mixer = new MotionMixer(pack(), 'idle', 0)
    mixer.setAction('smug', 1000)
    expect(mixer.sample(1000, false).bodyTilt).toBe(0)
    expect(mixer.sample(1100, false).bodyTilt).not.toBe(0)
    expect(mixer.sample(1300, false).bodyY).toBeLessThan(-1)
    const reduced = mixer.sample(1300, true)
    expect(reduced.bodyTilt).toBe(-1.5)
    expect(reduced.bodyY).toBe(-1)
  })

  it('samples the reusable run performance from distance-synchronised gait time', () => {
    const mixer = new MotionMixer(pack(), 'idle', 0)
    mixer.setPerformance('run', 1_000)
    const contact = mixer.sample(1_200, false, 0)
    const airborne = mixer.sample(1_400, false, 180)
    const oppositeAirborne = mixer.sample(1_600, false, 540)
    expect(contact).toMatchObject({ runFrame: 0, frontOpacity: 0, runOpacity: 1 })
    expect(airborne).toMatchObject({ runFrame: 6, frontOpacity: 0, runOpacity: 1 })
    expect(oppositeAirborne).toMatchObject({ runFrame: 18, frontOpacity: 0, runOpacity: 1 })
  })

  it('hands whole-character actors over without cross-image double exposure', () => {
    const mixer = new MotionMixer(pack(), 'idle', 0)
    mixer.setPerformance('run', 1_000)
    const enteringSource = mixer.sample(1_030, false, 30)
    expect(enteringSource.frontOpacity).toBe(1)
    expect(enteringSource.runOpacity).toBe(0)
    expect(enteringSource.runFrame).toBe(1)
    expect(enteringSource.bodyScaleX).toBeCloseTo(0.96)

    const midpoint = mixer.sample(1_060, false, 60)
    expect(midpoint.frontOpacity).toBe(0)
    expect(midpoint.runOpacity).toBe(1)
    expect(midpoint.runFrame).toBe(2)
    expect(midpoint.bodyScaleX).toBeCloseTo(0.92)

    const enteringTarget = mixer.sample(1_090, false, 90)
    expect(enteringTarget.frontOpacity).toBe(0)
    expect(enteringTarget.runOpacity).toBe(1)
    expect(enteringTarget.runFrame).toBe(3)
    expect(enteringTarget.bodyScaleX).toBeCloseTo(0.96)

    for (let elapsed = 0; elapsed < 120; elapsed += 5) {
      const values = new MotionMixer(pack(), 'idle', 0)
      values.setPerformance('run', 1_000)
      const sample = values.sample(1_000 + elapsed, false, elapsed)
      expect(sample.frontOpacity * sample.runOpacity).toBe(0)
    }

    mixer.sample(1_120, false, 60)
    mixer.setPerformance(undefined, 2_000)
    const leaving = mixer.sample(2_060, false, 0)
    expect(leaving.frontOpacity).toBe(1)
    expect(leaving.runOpacity).toBe(0)
    expect(leaving.runFrame).toBe(2)
    expect(leaving.bodyScaleX).toBeCloseTo(0.92)

    const reduced = mixer.sample(2_060, true, 0)
    expect(reduced).toMatchObject({ frontOpacity: 1, runOpacity: 0, runFrame: -1 })
  })
})
