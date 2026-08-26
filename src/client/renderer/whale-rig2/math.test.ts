import { describe, expect, it } from 'vitest'
import {
  angleLerp,
  angleNormalize,
  applyAffine,
  matFromTRS,
  matInvert,
  matMultiply,
} from './math.ts'
import type { Mat2D } from './types.ts'

const identity = (): Mat2D => ({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 })
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9

describe('whale-rig2 math', () => {
  it('normalizes angles into (-180, 180]', () => {
    expect(angleNormalize(190)).toBeCloseTo(-170)
    expect(angleNormalize(-190)).toBeCloseTo(170)
    expect(angleNormalize(360)).toBeCloseTo(0)
    expect(angleNormalize(540)).toBeCloseTo(180)
    expect(angleNormalize(-540)).toBeCloseTo(180)
    expect(angleNormalize(0)).toBeCloseTo(0)
    expect(angleNormalize(180)).toBeCloseTo(180)
  })

  it('interpolates angles along the shortest arc', () => {
    // 170 -> -170 travels through 180, not 0.
    expect(angleLerp(170, -170, 0.5)).toBeCloseTo(180)
    // 10 -> 350 travels through 0, not 340.
    expect(angleLerp(10, 350, 0.5)).toBeCloseTo(0)
    expect(angleLerp(0, 90, 0.5)).toBeCloseTo(45)
    expect(angleLerp(0, 90, 0)).toBeCloseTo(0)
    expect(angleLerp(0, 90, 1)).toBeCloseTo(90)
  })

  it('composes affine transforms in the whale-rig convention', () => {
    const translate = matFromTRS(identity(), 5, 3, 0)
    const rotate = matFromTRS(identity(), 0, 0, 90)
    const composed = matMultiply(identity(), translate, rotate)
    const point = { x: 0, y: 0 }
    // rotate (1,0) by 90° -> (0,1), then translate by (5,3) -> (5,4).
    applyAffine(point, composed, 1, 0)
    expect(close(point.x, 5)).toBe(true)
    expect(close(point.y, 4)).toBe(true)
  })

  it('keeps non-uniform scale on the correct rotated axes', () => {
    const transform = matFromTRS(identity(), 0, 0, 90, 2, 3)
    const xAxis = { x: 0, y: 0 }
    const yAxis = { x: 0, y: 0 }
    applyAffine(xAxis, transform, 1, 0)
    applyAffine(yAxis, transform, 0, 1)
    expect(xAxis.x).toBeCloseTo(0)
    expect(xAxis.y).toBeCloseTo(2)
    expect(yAxis.x).toBeCloseTo(-3)
    expect(yAxis.y).toBeCloseTo(0)
  })

  it('inverts a transform so composition returns to the origin', () => {
    const forward = matFromTRS(identity(), 3, 4, 30, 1, 1)
    const inverse = matInvert(identity(), forward)
    const roundTrip = matMultiply(identity(), forward, inverse)
    expect(close(roundTrip.a, 1)).toBe(true)
    expect(close(roundTrip.b, 0)).toBe(true)
    expect(close(roundTrip.c, 0)).toBe(true)
    expect(close(roundTrip.d, 1)).toBe(true)
    expect(close(roundTrip.tx, 0)).toBe(true)
    expect(close(roundTrip.ty, 0)).toBe(true)
  })

  it('rejects a singular matrix', () => {
    expect(() => matInvert(identity(), { a: 1, b: 0, c: 0, d: 0, tx: 0, ty: 0 })).toThrow(/singular/)
  })
})
