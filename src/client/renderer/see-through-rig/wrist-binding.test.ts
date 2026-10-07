import { expect, it } from 'vitest'
import { wristWeight } from './wrist-binding'

it('keeps the cuff fixed, gives the palm wrist influence, and normalizes the blend', () => {
  for (const side of ['left','right'] as const) {
    const x = side === 'left' ? 426 : 831
    const sign = side === 'left' ? -1 : 1
    expect(wristWeight(x,775,side)).toBe(0)
    expect(wristWeight(x,750,side)).toBe(0)
    expect(wristWeight(x+sign*20,815,side)).toBe(1)
    let previous = 0
    for (let t=0;t<=40;t++) {
      const weight = wristWeight(x+sign*t*.48,775+t*.88,side)
      expect(weight).toBeGreaterThanOrEqual(previous)
      expect(weight).toBeLessThanOrEqual(1)
      expect(weight + (1-weight)).toBe(1)
      previous=weight
    }
  }
})
