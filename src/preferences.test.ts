import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, clampWhaleScale } from './preferences.ts'

describe('whale preference defaults', () => {
  it('starts visible at the compact default scale', () => {
    expect(DEFAULT_PREFERENCES['general.enabled']).toBe(true)
    expect(DEFAULT_PREFERENCES['general.visible']).toBe(true)
    expect(DEFAULT_PREFERENCES['general.positionLocked']).toBe(false)
    expect(DEFAULT_PREFERENCES['animation.scale']).toBe(1)
    expect(Object.isFrozen(DEFAULT_PREFERENCES)).toBe(true)
  })

  it('follows system motion preferences by default', () => {
    expect(DEFAULT_PREFERENCES['animation.reducedMotion']).toBe('system')
    expect(DEFAULT_PREFERENCES['animation.quality']).toBe('auto')
    expect(DEFAULT_PREFERENCES['animation.secondaryMotion']).toBe(true)
  })

  it('keeps the pet scale inside the supported range', () => {
    expect(clampWhaleScale(.2)).toBe(.75)
    expect(clampWhaleScale(1.15)).toBe(1.15)
    expect(clampWhaleScale(3)).toBe(1.4)
    expect(clampWhaleScale(Number.NaN)).toBe(1)
  })
})
