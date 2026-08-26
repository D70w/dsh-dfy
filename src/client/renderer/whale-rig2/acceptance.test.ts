import { describe, expect, it } from 'vitest'
import { BoneHierarchy } from './bones.ts'
import { evaluateRunRigAcceptance } from './acceptance.ts'
import { buildRunClip, RUN_BONES, RUN_CLIP, RUN_DURATION_MS, RUN_POSES, RUN_PART_BINDINGS } from './run-rig.ts'
import { sampleCurve } from './motion.ts'

describe('whale-rig2 run rig data integrity', () => {
  it('has a valid hierarchy and a closed, continuous clip', () => {
    const hierarchy = new BoneHierarchy(RUN_BONES)
    expect(hierarchy.bones.length).toBeGreaterThanOrEqual(14)
    expect(RUN_CLIP.channels.length).toBeGreaterThanOrEqual(15)
    expect(RUN_CLIP.durationMs).toBe(RUN_DURATION_MS)
    expect(RUN_CLIP.loop).toBe(true)

    // Strict closure on every channel.
    for (const channel of RUN_CLIP.channels) {
      const start = sampleCurve(channel.curve, 0, true, RUN_CLIP.durationMs)
      const end = sampleCurve(channel.curve, RUN_CLIP.durationMs, true, RUN_CLIP.durationMs)
      expect(end).toBeCloseTo(start, 6)
    }
    // Every channel targets a real bone.
    const ids = new Set(RUN_BONES.map(bone => bone.id))
    for (const channel of RUN_CLIP.channels) expect(ids.has(channel.bone)).toBe(true)
  })

  it('keeps every knee-bending channel inside the no-backfold range', () => {
    for (const pose of RUN_POSES) {
      expect(pose.nearLowerLeg).toBeLessThanOrEqual(-45)
      expect(pose.nearLowerLeg).toBeGreaterThanOrEqual(-120)
      expect(pose.farLowerLeg).toBeLessThanOrEqual(-45)
      expect(pose.farLowerLeg).toBeGreaterThanOrEqual(-120)
    }
  })

  it('binds every part to exactly one bone with a unique source rect', () => {
    const rects = new Set(RUN_PART_BINDINGS.map(binding => binding.rect.join(',')))
    const ids = new Set(RUN_PART_BINDINGS.map(binding => binding.id))
    expect(ids.size).toBe(RUN_PART_BINDINGS.length)
    expect(rects.size).toBe(RUN_PART_BINDINGS.length)
    const hierarchy = new BoneHierarchy(RUN_BONES)
    expect(RUN_PART_BINDINGS.every(binding => hierarchy.boneIndex(binding.bone) >= 0)).toBe(true)
  })
})

describe('whale-rig2 run rig headless acceptance', () => {
  it('passes every measurable phase-1 hard acceptance at 60 fps', () => {
    const metrics = evaluateRunRigAcceptance(60)
    expect(metrics.frames).toBe(82) // t = 0 .. 1350 ms inclusive

    // Loop continuity: every bone joint closes within float precision.
    expect(metrics.loopMaxJointDeltaPx).toBeLessThanOrEqual(0.25)
    expect(metrics.loopClosed).toBe(true)

    // Face anchor travel remains bounded; exact end-to-start closure alone is
    // not a useful stability check for a moving run cycle.
    expect(metrics.faceAnchorMaxDriftPx).toBeLessThanOrEqual(5)
    expect(metrics.faceAnchorClosed).toBe(true)

    // Contact foot held within 1 px across the stance window.
    expect(metrics.contactFrames).toBeGreaterThan(20)
    expect(metrics.contactMaxDriftPx).toBeLessThanOrEqual(1)
    expect(metrics.contactLocked).toBe(true)

    // Knee never backfolds: flex in [25°, 165°], constant bend sign.
    expect(metrics.nearKneeFlexMinDeg).toBeGreaterThanOrEqual(25)
    expect(metrics.nearKneeFlexMaxDeg).toBeLessThanOrEqual(165)
    expect(metrics.farKneeFlexMinDeg).toBeGreaterThanOrEqual(25)
    expect(metrics.farKneeFlexMaxDeg).toBeLessThanOrEqual(165)
    expect(metrics.kneeBendConsistent).toBe(true)

    // No whole-image double-image plumbing.
    expect(metrics.partsOneBonePerPart).toBe(true)
    expect(metrics.partsUniqueRects).toBe(true)

    expect(metrics.allPass).toBe(true)
  })
})
