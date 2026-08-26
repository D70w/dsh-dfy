import { describe, expect, it } from 'vitest'
import { BoneHierarchy, solveTwoBoneIK } from './bones.ts'
import { evaluateFootContact, inContactWindow } from './constraints.ts'
import { sampleClip } from './motion.ts'
import type { BoneDef, Clip, FootContactConstraintDef, FootContactState, Pose } from './types.ts'

const key = (t: number, value: number): { t: number; value: number } => ({ t, value })

describe('whale-rig2 contact window', () => {
  it('resolves windows that wrap across the loop seam', () => {
    // Window [1200, 1600) on a 1350 ms clip = [1200, 1350) ∪ [0, 250).
    expect(inContactWindow(50, 1200, 400, 1350)).toBe(true)
    expect(inContactWindow(1200, 1200, 400, 1350)).toBe(true)
    expect(inContactWindow(1349, 1200, 400, 1350)).toBe(true)
    expect(inContactWindow(800, 1200, 400, 1350)).toBe(false)
    expect(inContactWindow(250, 1200, 400, 1350)).toBe(false)
  })

  it('treats a window longer than the clip as always in contact', () => {
    expect(inContactWindow(0, 0, 1350, 1350)).toBe(true)
    expect(inContactWindow(700, 100, 5000, 1350)).toBe(true)
  })
})

describe('whale-rig2 foot contact lock', () => {
  const def: FootContactConstraintDef = {
    id: 'foot',
    chain: { hip: 'hip', knee: 'knee', end: 'ankle' },
    contactStartMs: 100,
    contactWindowMs: 200, // [100, 300)
  }

  it('latches the world target on entry, holds it, then releases', () => {
    const state: FootContactState = { locked: false, lockedX: 0, lockedY: 0 }
    let result = evaluateFootContact(def, 150, 1000, 5, 6, state)
    expect(result.inContact).toBe(true)
    expect(result.targetX).toBe(5)
    expect(result.targetY).toBe(6)

    // Inside the window the end effector drifts but the target stays latched.
    result = evaluateFootContact(def, 250, 1000, 9, 9, state)
    expect(result.targetX).toBe(5)
    expect(result.targetY).toBe(6)

    // Outside the window the lock releases.
    result = evaluateFootContact(def, 400, 1000, 9, 9, state)
    expect(result.inContact).toBe(false)
    expect(state.locked).toBe(false)

    // Re-entering latches the new position.
    result = evaluateFootContact(def, 100, 1000, 12, 13, state)
    expect(result.targetX).toBe(12)
    expect(result.targetY).toBe(13)
  })

  it('snaps to groundY when locking and can leave axes unlocked', () => {
    const grounded: FootContactConstraintDef = { ...def, groundY: 100 }
    const state: FootContactState = { locked: false, lockedX: 0, lockedY: 0 }
    const snapped = evaluateFootContact(grounded, 150, 1000, 5, 6, state)
    expect(snapped.targetY).toBe(100)

    const freeX: FootContactConstraintDef = { ...def, lockX: false }
    const freeState: FootContactState = { locked: false, lockedX: 0, lockedY: 0 }
    evaluateFootContact(freeX, 150, 1000, 5, 6, freeState)
    // Y stays locked; X keeps tracking the animated end effector.
    const tracked = evaluateFootContact(freeX, 200, 1000, 9, 7, freeState)
    expect(tracked.targetX).toBe(9)
    expect(tracked.targetY).toBe(6)
  })

  it('relocks after a seek, long resume gap, or full-cycle jump', () => {
    const state: FootContactState = { locked: false, lockedX: 0, lockedY: 0 }
    evaluateFootContact(def, 150, 1000, 5, 6, state)
    expect(state.episode).toBe(1)
    const resumed = evaluateFootContact(def, 275, 1000, 8, 9, state)
    expect(resumed.targetX).toBe(8)
    expect(state.episode).toBe(2)
    const reversed = evaluateFootContact(def, 160, 1000, 11, 12, state)
    expect(reversed.targetX).toBe(11)
    expect(state.episode).toBe(3)
    const fullCycle = evaluateFootContact(def, 1160, 1000, 14, 15, state)
    expect(fullCycle.targetX).toBe(14)
    expect(state.episode).toBe(4)
  })

  it('holds the foot within 1 px across 60 frames while the body bobs and the leg swings', () => {
    const BONES: readonly BoneDef[] = [
      { id: 'body', parent: null, length: 4 },
      { id: 'hip', parent: 'body', length: 6, bendDirection: 1 },
      { id: 'knee', parent: 'hip', length: 6 },
      { id: 'ankle', parent: 'knee', length: 1 },
    ]
    const CLIP: Clip = {
      id: 'run-test',
      durationMs: 1350,
      loop: true,
      channels: [
        { bone: 'body', property: 'ty', curve: { interpolation: 'linear', keyframes: [key(0, 0), key(675, -1), key(1350, 0)] } },
        { bone: 'hip', property: 'angle', curve: { interpolation: 'linear', keyframes: [key(0, -30), key(675, 30), key(1350, -30)] } },
        { bone: 'knee', property: 'angle', curve: { interpolation: 'linear', keyframes: [key(0, 40), key(675, -20), key(1350, 40)] } },
      ],
    }
    const CONTACT: FootContactConstraintDef = {
      id: 'near-foot',
      chain: { hip: 'hip', knee: 'knee', end: 'ankle' },
      contactStartMs: 300,
      contactWindowMs: 450, // [300, 750)
    }

    const hierarchy = new BoneHierarchy(BONES)
    const state: FootContactState = { locked: false, lockedX: 0, lockedY: 0 }
    let lockedTarget: { x: number; y: number } | null = null
    let maxDrift = 0
    let maxNominalDeviation = 0
    let contactFrames = 0

    const frames = 60
    for (let frame = 0; frame < frames; frame += 1) {
      const timeMs = frame / 60 * 1000
      const pose = sampleClip(CLIP, timeMs, BONES)
      const worlds = hierarchy.fk(pose)
      const ankle = worlds[hierarchy.boneIndex('ankle')]!
      const contact = evaluateFootContact(CONTACT, timeMs, CLIP.durationMs, ankle.x, ankle.y, state)

      if (!contact.inContact) continue
      contactFrames += 1
      if (lockedTarget === null) lockedTarget = { x: contact.targetX, y: contact.targetY }

      // What the foot would do without the constraint must move > 1 px.
      maxNominalDeviation = Math.max(
        maxNominalDeviation,
        Math.hypot(ankle.x - lockedTarget.x, ankle.y - lockedTarget.y),
      )

      // Solve the leg with two-bone IK against the locked target.
      const hip = worlds[hierarchy.boneIndex('hip')]!
      const body = worlds[hierarchy.boneIndex('body')]!
      const ik = solveTwoBoneIK({
        lengthA: 6,
        lengthB: 6,
        rootX: hip.x,
        rootY: hip.y,
        targetX: contact.targetX,
        targetY: contact.targetY,
        bendDirection: 1,
      })
      const solvedPose: Pose = {
        ...pose,
        hip: { angle: ik.rootAngle - body.angle, tx: 0, ty: 0 },
        knee: { angle: ik.midAngle - ik.rootAngle, tx: 0, ty: 0 },
      }
      const solvedAnkle = hierarchy.fk(solvedPose)[hierarchy.boneIndex('ankle')]!
      maxDrift = Math.max(maxDrift, Math.hypot(
        solvedAnkle.x - contact.targetX,
        solvedAnkle.y - contact.targetY,
      ))
    }

    expect(contactFrames).toBeGreaterThan(20) // window [300, 750) at 60fps ≈ 27 frames
    expect(maxNominalDeviation).toBeGreaterThan(1) // the constraint is actually holding it
    expect(maxDrift).toBeLessThanOrEqual(1) // hard acceptance: ≤ 1 px drift
  })
})
