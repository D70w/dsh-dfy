import { describe, expect, it } from 'vitest'
import { computeRig2Frame } from './preview.ts'

describe('whale-rig2 preview frame reuse', () => {
  it('computes finite frame data at every authored phase', () => {
    for (const timeMs of [0, 169, 338, 506, 675, 844, 1013, 1181]) {
      const frame = computeRig2Frame(timeMs)
      for (const matrix of frame.matrices) {
        expect(Object.values(matrix).every(Number.isFinite)).toBe(true)
      }
    }
  })
})
