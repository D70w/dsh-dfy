import { describe, expect, it } from 'vitest'

import { sampleGesture } from './see-through-idle-rig-v2.ts'

describe('reference-timed wave motion', () => {
  it('flips the palm while the arm rises, then keeps it open through the wave', () => {
    expect(sampleGesture('wave', 0.08, 1).wavePalm).toBeCloseTo(0, 5)
    expect(sampleGesture('wave', 0.14, 1).wavePalm).toBeCloseTo(0.5, 5)
    expect(sampleGesture('wave', 0.2, 1).wavePalm).toBeCloseTo(1, 5)
    expect(sampleGesture('wave', 0.5, 1).wavePalm).toBeCloseTo(1, 5)
  })

  it('keeps the front palm briefly while lowering, then turns it back', () => {
    expect(sampleGesture('wave', 0.74, 1).wavePalm).toBeCloseTo(1, 5)
    expect(sampleGesture('wave', 0.8, 1).wavePalm).toBeCloseTo(0.5, 5)
    expect(sampleGesture('wave', 0.86, 1).wavePalm).toBeCloseTo(0, 5)
  })

  it('uses one broad forearm phrase with only a small local palm follow', () => {
    const outward = sampleGesture('wave', 0.36, 1)
    const centre = sampleGesture('wave', 0.47, 1)
    const inward = sampleGesture('wave', 0.57, 1)

    expect(outward.armLeftForearm).toBeGreaterThan(93)
    expect(centre.armLeftForearm).toBeGreaterThan(87)
    expect(centre.armLeftForearm).toBeLessThan(90)
    expect(inward.armLeftForearm).toBeLessThan(83)
    expect(Math.max(outward.handLeft, centre.handLeft, inward.handLeft)
      - Math.min(outward.handLeft, centre.handLeft, inward.handLeft)).toBeLessThan(6)
    expect(centre.headRotation).toBeGreaterThan(5)
  })

  it('keeps the established elbow range while returning to the rest pose', () => {
    const samples = Array.from({ length: 101 }, (_, index) => sampleGesture('wave', index / 100, 1))
    expect(Math.max(...samples.map(pose => Math.abs(pose.armLeftForearm)))).toBeLessThan(97)

    const settled = sampleGesture('wave', 1, 1)
    expect(settled.armLeftUpper).toBeCloseTo(0, 5)
    expect(settled.armLeftForearm).toBeCloseTo(0, 5)
    expect(settled.handLeft).toBeCloseTo(0, 5)
  })
})
