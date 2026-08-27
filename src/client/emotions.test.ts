import { describe, expect, it } from 'vitest'
import { IDLE_PERFORMANCES, idlePerformanceDelay, pickIdlePerformance, touchLine } from './emotions.ts'

describe('idle performance selection', () => {
  it('does not immediately repeat the same performance', () => {
    const previous = IDLE_PERFORMANCES[0]!
    expect(pickIdlePerformance(previous.id, 0).id).not.toBe(previous.id)
  })

  it('starts soon enough to read as alive, then becomes less frequent', () => {
    expect(idlePerformanceDelay(0, 0)).toBe(9_000)
    expect(idlePerformanceDelay(0, .999)).toBeLessThan(14_000)
    expect(idlePerformanceDelay(1, 0)).toBe(18_000)
    expect(idlePerformanceDelay(4, .999)).toBeLessThan(32_000)
  })

  it('mixes silent acting beats with character dialogue', () => {
    expect(IDLE_PERFORMANCES.some(item => item.line === undefined)).toBe(true)
    expect(IDLE_PERFORMANCES.some(item => item.line !== undefined)).toBe(true)
  })
})

describe('touch reaction selection', () => {
  it('can select a broad range of complete expressions', () => {
    const emotions = new Set(Array.from({ length: 20 }, (_, index) => touchLine(1, undefined, index / 20).emotion))
    expect(emotions.size).toBeGreaterThanOrEqual(8)
  })

  it('does not immediately repeat the previous expression', () => {
    for (const seed of [0, .2, .5, .8, .999]) {
      expect(touchLine(4, 'shy', seed).emotion).not.toBe('shy')
    }
  })

  it('adds flustered reactions only after repeated rapid touches', () => {
    const firstTouch = new Set(Array.from({ length: 80 }, (_, index) => touchLine(1, undefined, index / 80).emotion))
    expect(firstTouch.has('angry')).toBe(false)
    const rapidTouches = new Set(Array.from({ length: 80 }, (_, index) => touchLine(5, undefined, index / 80).emotion))
    expect(rapidTouches.has('angry')).toBe(true)
    expect(rapidTouches.has('shy')).toBe(true)
  })
})
