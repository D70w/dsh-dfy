// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyPointerInfluence, planCursorVisit } from './use-autonomy.ts'

describe('autonomy pointer sampling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
  })
  afterEach(() => vi.useRealTimers())

  it('distinguishes gentle help, startling motion, stale samples, and distant pointers', () => {
    const anchor = { left: 500, top: 300, width: 112, height: 112 }
    expect(classifyPointerInfluence({ x: 482, y: 342, at: 9_900, speed: 200 }, anchor)).toBe('assist')
    expect(classifyPointerInfluence({ x: 482, y: 342, at: 9_900, speed: 1200 }, anchor)).toBe('startle')
    expect(classifyPointerInfluence({ x: 482, y: 342, at: 8_000, speed: 100 }, anchor)).toBe('none')
    expect(classifyPointerInfluence({ x: 100, y: 100, at: 9_900, speed: 100 }, anchor)).toBe('none')
  })

  it('plans a bounded visit only inside a shared safe edge band', () => {
    const anchor = { left: 888, top: 636, width: 112, height: 112 }
    const viewport = { width: 1_024, height: 768 }
    const target = planCursorVisit(
      { x: 720, y: 700, at: 7_000, speed: 0 },
      anchor,
      viewport,
      () => false,
    )
    expect(target).toBeDefined()
    expect(Math.hypot(target!.x, target!.y)).toBeGreaterThanOrEqual(28)
    expect(Math.hypot(target!.x, target!.y)).toBeLessThanOrEqual(180)

    expect(planCursorVisit(
      { x: 720, y: 400, at: 7_000, speed: 0 }, anchor, viewport, () => false,
    )).toBeUndefined()
    expect(planCursorVisit(
      { x: 720, y: 700, at: 9_900, speed: 0 }, anchor, viewport, () => false,
    )).toBeUndefined()
    expect(planCursorVisit(
      { x: 720, y: 700, at: 7_000, speed: 0 }, anchor, viewport, () => true,
    )).toBeUndefined()
  })

  it('uses relationship clearance without crossing the 40px character-edge safety floor', () => {
    const anchor = { left: 888, top: 636, width: 112, height: 112 }
    const viewport = { width: 1_024, height: 768 }
    const sample = { x: 720, y: 700, at: 7_000, speed: 0 }
    const familiar = planCursorVisit(sample, anchor, viewport, () => false, 10_000, 2_000, 120)
    const oldFriend = planCursorVisit(sample, anchor, viewport, () => false, 10_000, 2_000, 96)
    expect(familiar).toBeDefined()
    expect(oldFriend).toBeDefined()
    expect(Math.hypot(oldFriend!.x, oldFriend!.y)).toBeGreaterThan(Math.hypot(familiar!.x, familiar!.y))
    const oldFriendCentreDistance = Math.hypot(
      sample.x - (anchor.left + anchor.width / 2 + oldFriend!.x),
      sample.y - (anchor.top + anchor.height / 2 + oldFriend!.y),
    )
    expect(oldFriendCentreDistance).toBeGreaterThanOrEqual(95)
  })
})
