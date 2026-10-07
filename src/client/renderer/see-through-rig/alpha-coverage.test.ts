import { describe, expect, it } from 'vitest'
import { buildAlphaCoverage } from './alpha-coverage.ts'

describe('conservative mesh alpha coverage', () => {
  it('skips empty areas but preserves even a one-alpha edge pixel', () => {
    const pixels = new Uint8ClampedArray(35 * 33 * 4)
    pixels[(32 * 35 + 34) * 4 + 3] = 1
    const covered = buildAlphaCoverage(pixels, 35, 33)
    expect(covered(0, 0, 32, 32)).toBe(false)
    expect(covered(32, 32, 35, 33)).toBe(true)
    expect(covered(-20, -20, 100, 100)).toBe(true)
    expect(covered(50, 50, 100, 100)).toBe(false)
    expect(covered(NaN, 0, 10, 10)).toBe(true)
  })
  it('never rejects a rectangle containing visible pixels, including tile borders', () => {
    const width = 49, height = 37
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) if (i % 61 === 0) pixels[i * 4 + 3] = 255
    const covered = buildAlphaCoverage(pixels, width, height)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3]) expect(covered(x - .5, y - .5, x + 1.5, y + 1.5)).toBe(true)
    }
  })
})
