import { describe, expect, it } from 'vitest'
import { resolveEmotionFaceLayerPlan } from './approved-idle-runtime.js'

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

  it('keeps every other user-facing emotion open with the same stable rounded eye mask', () => {
    const openEyeEmotions = [
      'love', 'shy', 'angry', 'surprise', 'sad', 'confused', 'pout', 'proud',
      'excited', 'mischievous', 'determined', 'nervous', 'hungry',
    ]

    for (const emotion of openEyeEmotions) {
      expect(resolveEmotionFaceLayerPlan(emotion, { active: true, weight: 1 })).toEqual({
        eye: 'soft',
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
