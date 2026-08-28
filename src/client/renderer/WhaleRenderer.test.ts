import { describe, expect, it } from 'vitest'
import { resolveActionVideo, resolveAnimationProfile, resolveGrabMotionInput, shouldPauseLive2d } from './WhaleRenderer.tsx'

describe('approved desktop runtime quality policy', () => {
  it('keeps capable desktop devices on the high-quality realtime renderer', () => {
    expect(resolveAnimationProfile('auto', { hardwareConcurrency: 12, deviceMemory: 16 })).toEqual({
      quality: 'high', outputSize: 640, activeFps: 60, idleFps: 30,
    })
  })

  it('uses a lower mesh density for constrained or data-saving devices', () => {
    expect(resolveAnimationProfile('auto', { hardwareConcurrency: 4 })).toMatchObject({ quality: 'economy' })
    expect(resolveAnimationProfile('auto', { hardwareConcurrency: 12, saveData: true })).toMatchObject({ quality: 'economy' })
  })

  it('respects an explicit quality choice', () => {
    expect(resolveAnimationProfile('high', { hardwareConcurrency: 2 })).toMatchObject({ quality: 'high' })
    expect(resolveAnimationProfile('economy', { hardwareConcurrency: 16 })).toMatchObject({ quality: 'economy' })
  })
})

describe('manual classic action playback', () => {
  it('keeps an explicitly selected video available with reduced motion enabled', () => {
    expect(resolveActionVideo(true, 'idle', { id: 1, action: 'curtsy', file: 'curtsy.webm' }))
      .toContain('/production-v1/actions/curtsy.webm')
  })

  it('still suppresses ambient video actions when reduced motion is enabled', () => {
    expect(resolveActionVideo(true, 'idle')).toBeUndefined()
  })

  it('keeps Live2D moving while video loads, then pauses only for active playback', () => {
    expect(shouldPauseLive2d('/actions/curtsy.webm', false, false, false)).toBe(false)
    expect(shouldPauseLive2d('/actions/curtsy.webm', true, false, false)).toBe(true)
    expect(shouldPauseLive2d('/actions/curtsy.webm', true, false, true)).toBe(false)
    expect(shouldPauseLive2d('/actions/curtsy.webm', true, true, false)).toBe(false)
    expect(shouldPauseLive2d(undefined, true, false, false)).toBe(false)
  })
})

describe('grab acceleration input', () => {
  it('creates a strong opposite impulse when the pointer reverses direction', () => {
    const right = resolveGrabMotionInput(18, 0, 16, 0.8, 0, 0, 0)
    const reverse = resolveGrabMotionInput(-18, 0, 16, right.velocityX, 0, 0, 0)
    expect(right.x).toBeGreaterThan(0)
    expect(reverse.accelerationX).toBeLessThan(-1)
    expect(reverse.x).toBe(-1)
  })

  it('keeps every acceleration-driven input inside the stable spring range', () => {
    const impulse = resolveGrabMotionInput(400, -400, 8, -20, 20, 0.8, -0.8)
    expect(impulse.x).toBe(1)
    expect(impulse.y).toBe(-1)
  })

  it('retains grab displacement while velocity is zero', () => {
    expect(resolveGrabMotionInput(0, 0, 16, 0, 0, 0.35, -0.2)).toMatchObject({ x: 0.35, y: -0.2 })
  })
})
