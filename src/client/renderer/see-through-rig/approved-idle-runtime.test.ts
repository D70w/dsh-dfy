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

  it('uses exactly one deformed eye stack and one emotion mouth for regular expressions', () => {
    expect(resolveEmotionFaceLayerPlan('happy', { active: true, weight: 0.5 })).toEqual({
      eye: 'deformed',
      mouth: 'emotion',
    })
  })

  it('uses rounded lid strokes for sleepy and relieved eyes', () => {
    expect(resolveEmotionFaceLayerPlan('sleepy', { active: true, weight: 1 }).eye).toBe('squint')
    expect(resolveEmotionFaceLayerPlan('relieved', { active: true, weight: 1 }).eye).toBe('squint')
  })

  it('uses a rounded eye mask for shy and angry states', () => {
    expect(resolveEmotionFaceLayerPlan('shy', { active: true, weight: 1 }).eye).toBe('soft')
    expect(resolveEmotionFaceLayerPlan('angry', { active: true, weight: 1 }).eye).toBe('soft')
  })

  it('returns both neutral layers outside an active expression', () => {
    expect(resolveEmotionFaceLayerPlan('workSuccess', { active: false, weight: 0 })).toEqual({
      eye: 'neutral',
      mouth: 'neutral',
    })
  })
})
