import { describe, expect, it } from 'vitest'
import { resolveEmotionActingWeights, resolveEmotionFaceLayerPlan, sampleAuthoredLashDeformation } from './approved-idle-runtime.js'

describe('resolveEmotionFaceLayerPlan', () => {
  it('keeps work result eyes authored and gives the emotion exclusive mouth ownership', () => {
    expect(resolveEmotionFaceLayerPlan('workSuccess', { active: true, weight: 1 })).toEqual({
      eye: 'authored',
      mouth: 'emotion',
    })
    expect(resolveEmotionFaceLayerPlan('workError', { active: true, weight: 0.2 })).toEqual({
      eye: 'authored',
      mouth: 'emotion',
    })
  })

  it('uses an authored rounded closed-eye drawing for happy, relieved, and sleepy', () => {
    expect(resolveEmotionFaceLayerPlan('happy', { active: true, weight: 0.5 })).toEqual({
      eye: 'squint',
      mouth: 'emotion',
    })
    expect(resolveEmotionFaceLayerPlan('sleepy', { active: true, weight: 1 }).eye).toBe('squint')
    expect(resolveEmotionFaceLayerPlan('relieved', { active: true, weight: 1 }).eye).toBe('squint')
  })

  it('keeps every other user-facing emotion on the original authored eye assets', () => {
    const openEyeEmotions = [
      'love', 'shy', 'angry', 'surprise', 'sad', 'confused', 'pout', 'proud',
      'excited', 'mischievous', 'determined', 'nervous', 'hungry',
    ]

    for (const emotion of openEyeEmotions) {
      expect(resolveEmotionFaceLayerPlan(emotion, { active: true, weight: 1 })).toEqual({
        eye: 'authored',
        mouth: 'emotion',
      })
    }
  })

  it('returns both neutral layers outside an active expression', () => {
    expect(resolveEmotionFaceLayerPlan('workSuccess', { active: false, weight: 0 })).toEqual({
      eye: 'neutral',
      mouth: 'neutral',
    })
  })
})

describe('sampleAuthoredLashDeformation', () => {
  it('keeps localized eyelid changes bounded to three design pixels', () => {
    const emotions = ['angry', 'sad', 'shy', 'proud', 'mischievous', 'determined']
    for (const emotion of emotions) {
      for (const side of ['left', 'right'] as const) {
        for (let row = 0; row <= 10; row += 1) {
          for (let column = 0; column <= 10; column += 1) {
            const deformation = sampleAuthoredLashDeformation(column / 10, row / 10, side, emotion, 1)
            expect(deformation.x).toBe(0)
            expect(Math.abs(deformation.y)).toBeLessThanOrEqual(3)
          }
        }
      }
    }
  })

  it('moves the angry inner eyelids symmetrically without moving the lower lash edge', () => {
    expect(sampleAuthoredLashDeformation(1, 0, 'left', 'angry', 1).y).toBeGreaterThan(2)
    expect(sampleAuthoredLashDeformation(0, 0, 'right', 'angry', 1).y).toBeGreaterThan(2)
    expect(sampleAuthoredLashDeformation(1, 1, 'left', 'angry', 1).y).toBe(0)
  })

  it('uses subtle asymmetry only for the proud expression', () => {
    const left = sampleAuthoredLashDeformation(.5, 0, 'left', 'proud', 1).y
    const right = sampleAuthoredLashDeformation(.5, 0, 'right', 'proud', 1).y
    expect(left).toBeGreaterThan(right)
    expect(left).toBeLessThanOrEqual(2.2)
  })

  it('keeps the mischievous wink asymmetric and the determined inner lids symmetric', () => {
    const mischievousLeft = sampleAuthoredLashDeformation(.5, 0, 'left', 'mischievous', 1).y
    const mischievousRight = sampleAuthoredLashDeformation(.5, 0, 'right', 'mischievous', 1).y
    expect(mischievousLeft).toBeGreaterThan(mischievousRight)
    expect(sampleAuthoredLashDeformation(1, 0, 'left', 'determined', 1).y).toBeGreaterThan(2)
    expect(sampleAuthoredLashDeformation(0, 0, 'right', 'determined', 1).y).toBeGreaterThan(2)
  })
})

describe('resolveEmotionActingWeights', () => {
  it('leads with gaze, then brows and eyelids, then the mouth', () => {
    const early = resolveEmotionActingWeights('angry', 90, 2_800)
    expect(early.gaze).toBe(1)
    expect(early.gaze).toBeGreaterThan(early.brow)
    expect(early.lash).toBe(0)
    expect(early.mouth).toBe(0)

    const hold = resolveEmotionActingWeights('angry', 420, 2_800)
    expect(hold.gaze).toBe(1)
    expect(hold.brow).toBe(1)
    expect(hold.lash).toBe(1)
    expect(hold.mouth).toBe(1)
  })

  it('returns every face layer to neutral during recovery', () => {
    expect(resolveEmotionActingWeights('sad', 3_660, 3_200)).toEqual({
      gaze: 0,
      brow: 0,
      lash: 0,
      mouth: 0,
      blush: 0,
    })
  })

  it('gives the second expression group distinct entry timing', () => {
    const confused = resolveEmotionActingWeights('confused', 100, 2_800)
    const determined = resolveEmotionActingWeights('determined', 100, 3_200)
    const nervous = resolveEmotionActingWeights('nervous', 100, 3_000)
    expect(confused.gaze).toBe(1)
    expect(confused.brow).toBeLessThan(determined.brow)
    expect(determined.lash).toBeGreaterThan(nervous.lash)
  })
})
