import { describe, expect, it } from 'vitest'
import { applyEasing, sampleClip, sampleCurve } from './motion.ts'
import type { BoneDef, Clip } from './types.ts'

const key = (t: number, value: number): { t: number; value: number } => ({ t, value })

const bones: readonly BoneDef[] = [
  { id: 'root', parent: null, length: 10 },
  { id: 'child', parent: 'root', length: 5, restAngle: 15 },
]

const linearClip = (): Clip => ({
  id: 'swing',
  durationMs: 1000,
  loop: true,
  channels: [
    { bone: 'root', property: 'angle', curve: { interpolation: 'linear', keyframes: [key(0, 0), key(500, 30), key(1000, 0)] } },
    { bone: 'child', property: 'angle', curve: { interpolation: 'linear', keyframes: [key(0, -10), key(1000, -10)] } },
  ],
})

describe('whale-rig2 curve sampling', () => {
  it('supports realtime easing modes', () => {
    expect(applyEasing('linear', 0.25)).toBe(0.25)
    expect(applyEasing('easeIn', 0.5)).toBe(0.25)
    expect(applyEasing('easeOut', 0.5)).toBe(0.75)
    expect(applyEasing('easeInOut', 0.25)).toBe(0.125)
    expect(applyEasing('easeInOut', 0.75)).toBe(0.875)
  })

  it('interpolates linear and cubic curves', () => {
    const linear = { interpolation: 'linear' as const, keyframes: [key(0, 0), key(100, 10)] }
    expect(sampleCurve(linear, 25, false, 100)).toBeCloseTo(2.5)

    const cubic = { interpolation: 'cubic' as const, keyframes: [key(0, 0), key(50, 10), key(100, 20)] }
    // Cubic with clamped tangents still passes exactly through the keyframes.
    expect(sampleCurve(cubic, 0, false, 100)).toBeCloseTo(0)
    expect(sampleCurve(cubic, 100, false, 100)).toBeCloseTo(20)
  })

  it('throws on empty curves', () => {
    expect(() => sampleCurve({ interpolation: 'linear', keyframes: [] }, 0, false, 100)).toThrow(/at least one/)
  })

  it('uses time-parameterized cubic tangents at uneven key times', () => {
    const cubic = {
      interpolation: 'cubic' as const,
      keyframes: [key(0, 0), key(100, 20), key(900, 40), key(1000, 0)],
    }
    const epsilon = 0.01
    const slopeBefore = (sampleCurve(cubic, 100, false, 1000) - sampleCurve(cubic, 100 - epsilon, false, 1000)) / epsilon
    const slopeAfter = (sampleCurve(cubic, 100 + epsilon, false, 1000) - sampleCurve(cubic, 100, false, 1000)) / epsilon
    expect(Math.abs(slopeBefore - slopeAfter)).toBeLessThan(0.001)
  })
})

describe('whale-rig2 loop clip sampling', () => {
  it('closes the loop: sample(0) equals sample(durationMs)', () => {
    const clip = linearClip()
    const atStart = sampleClip(clip, 0, bones)
    const atEnd = sampleClip(clip, clip.durationMs, bones)
    expect(atStart.root!.angle).toBeCloseTo(atEnd.root!.angle)
    expect(atStart.root!.angle).toBeCloseTo(0)
    expect(atEnd.child!.angle).toBeCloseTo(atStart.child!.angle)
  })

  it('wraps time past the duration and stays continuous at the seam', () => {
    const clip = linearClip()
    const before = sampleClip(clip, clip.durationMs - 0.001, bones)
    const after = sampleClip(clip, 0.001, bones)
    // Root angle just before the seam (≈0) and just after (≈0) must be near each other.
    expect(Math.abs(before.root!.angle - after.root!.angle)).toBeLessThan(0.01)
    // Sampling far past the loop boundary behaves like the wrapped time.
    const wrapped = sampleClip(clip, clip.durationMs + 250, bones)
    expect(wrapped.root!.angle).toBeCloseTo(sampleClip(clip, 250, bones).root!.angle)
  })

  it('interpolates the final-to-first seam when no closing key is authored', () => {
    const curve = { interpolation: 'linear' as const, keyframes: [key(0, 0), key(400, 10), key(800, -5)] }
    expect(sampleCurve(curve, 900, true, 1000)).toBeCloseTo(-2.5)
    expect(sampleCurve(curve, 999.999, true, 1000)).toBeCloseTo(0, 3)
    expect(Math.abs(sampleCurve(curve, 999.999, true, 1000) - sampleCurve(curve, 0.001, true, 1000))).toBeLessThan(0.001)
  })

  it('clamps non-looping clips instead of wrapping', () => {
    const clip: Clip = {
      id: 'one-shot',
      durationMs: 1000,
      loop: false,
      channels: [
        { bone: 'root', property: 'angle', curve: { interpolation: 'linear', keyframes: [key(0, 0), key(500, 30)] } },
      ],
    }
    expect(sampleClip(clip, 0, bones).root!.angle).toBeCloseTo(0)
    expect(sampleClip(clip, 9999, bones).root!.angle).toBeCloseTo(30)
    expect(sampleClip(clip, 250, bones).root!.angle).toBeCloseTo(15)
  })

  it('produces continuous bone-local transforms with rest fallback', () => {
    const clip = linearClip()
    const a = sampleClip(clip, 250, bones)
    const b = sampleClip(clip, 251, bones)
    expect(Math.abs(b.root!.angle - a.root!.angle)).toBeLessThan(1)
    // child channel is constant, and bones all resolve even when only some are animated.
    expect(a.child!.angle).toBeCloseTo(-10)
  })

  it('rejects channels that target unknown bones', () => {
    const clip: Clip = {
      id: 'bad',
      durationMs: 100,
      loop: true,
      channels: [{ bone: 'nope', property: 'angle', curve: { interpolation: 'linear', keyframes: [key(0, 0)] } }],
    }
    expect(() => sampleClip(clip, 0, bones)).toThrow(/unknown bone/)
  })
})
