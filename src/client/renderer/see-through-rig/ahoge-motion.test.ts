import { describe, expect, it } from 'vitest'
import { deformAhoge, sampleAhogeActing } from './ahoge-motion.ts'

describe('expressive ahoge', () => {
  it('pins the attachment and gives the tip more movement than the root', () => {
    for (const bend of [-38, -16, 0, 18, 38]) {
      expect(deformAhoge(638, 151, bend)).toEqual({ x: 0, y: 0 })
      expect(Math.abs(deformAhoge(623, 20, bend).x)).toBeGreaterThanOrEqual(Math.abs(deformAhoge(638, 130, bend).x))
      expect(deformAhoge(623, 9, bend).y).toBeGreaterThanOrEqual(0)
    }
  })
  it('distinguishes drooping, curious and startled poses and settles after joy', () => {
    expect(sampleAhogeActing('sad', 1200, 1).tip).toBeGreaterThan(20)
    expect(sampleAhogeActing('confused', 1200, 1).root).toBeGreaterThan(0)
    expect(sampleAhogeActing('surprise', 200, 1).tip).toBeLessThan(-15)
    expect(Math.abs(sampleAhogeActing('happy', 10000, 1).tip + 8)).toBeLessThan(.1)
    expect(sampleAhogeActing('sad', 1200, 0)).toEqual({ root: 0, tip: 0 })
  })
})
