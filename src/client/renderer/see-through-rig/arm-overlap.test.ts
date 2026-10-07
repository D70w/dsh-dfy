import { expect, it } from 'vitest'
import { forearmInertia, palmInertia } from './arm-overlap.ts'

it('lags either direction of parent movement and stops at rest', () => {
  for (const side of ['left','right'] as const) {
    expect(forearmInertia(10,0,side)).toBeLessThan(0)
    expect(forearmInertia(-10,0,side)).toBeGreaterThan(0)
    expect(forearmInertia(0,0,side)).toBe(0)
    expect(palmInertia(10,10,10,0,side)).toBeLessThan(0)
    expect(palmInertia(-10,-10,-10,0,side)).toBeGreaterThan(0)
    expect(Math.abs(palmInertia(0,0,0,0,side))).toBe(0)
  }
})
it('relaxes a held palm without straightening the elbow or exceeding wrist limits', () => {
  expect(palmInertia(0,0,0,20,'left')).toBeCloseTo(-3.6)
  expect(palmInertia(0,0,0,-20,'right')).toBeCloseTo(3.6)
  expect(Math.abs(palmInertia(1000,1000,1000,20,'left'))).toBe(8)
  expect(forearmInertia(10,0,'left')).not.toBe(forearmInertia(10,0,'right'))
})
