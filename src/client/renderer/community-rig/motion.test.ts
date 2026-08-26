import { describe, expect, it } from 'vitest'
import { blinkOpenness, clampPointer, sampleIdleMotion } from './motion.ts'

describe('community idle rig motion', () => {
  it('clamps cursor input', () => {
    expect(clampPointer(-2)).toBe(-1)
    expect(clampPointer(0.4)).toBe(0.4)
    expect(clampPointer(3)).toBe(1)
  })

  it('closes and reopens during one blink', () => {
    expect(blinkOpenness(-1)).toBe(1)
    expect(blinkOpenness(63)).toBeCloseTo(0)
    expect(blinkOpenness(149)).toBeGreaterThan(0.95)
    expect(blinkOpenness(150)).toBe(1)
  })

  it('keeps reduced breathing static while gaze remains available', () => {
    const sample = sampleIdleMotion(1900, 0.5, -0.5, false)
    expect(sample.breath).toBe(0)
    expect(sample.headX).toBeGreaterThan(0)
    expect(sample.headY).toBeLessThan(0)
  })
})
