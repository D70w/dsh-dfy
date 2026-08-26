import { describe, expect, it } from 'vitest'
import { BoundedSpringSystem } from './spring.ts'

describe('bounded WhaleRig springs', () => {
  it('remains finite, deterministic, and clamped under extreme input', () => {
    const physics = {
      schemaVersion: 2 as const,
      springs: [{ id: 'tail', input: 'target', output: 'angle', stiffness: 95, damping: 18, maxOffset: 22 }],
    }
    const first = new BoundedSpringSystem(physics)
    const second = new BoundedSpringSystem(physics)
    const left = { target: 10_000, angle: 0 }
    const right = { target: 10_000, angle: 0 }
    first.reset(left)
    second.reset(right)
    for (let index = 0; index < 180; index += 1) {
      first.step(left, 1 / 60)
      second.step(right, 1 / 60)
    }
    expect(left.angle).toBe(right.angle)
    expect(Number.isFinite(left.angle)).toBe(true)
    expect(Math.abs(left.angle)).toBeLessThanOrEqual(22)
  })
})
