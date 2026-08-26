import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES } from './preferences.ts'

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
})
