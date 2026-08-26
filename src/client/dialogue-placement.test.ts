import { describe, expect, it } from 'vitest'
import { dialoguePlacement } from './WhalePet.tsx'

describe('approved dialogue placement', () => {
  it('keeps the bubble above the character whenever the full cloud fits', () => {
    expect(dialoguePlacement(24, 20, 1440, 900, 1)).toBe('above')
    expect(dialoguePlacement(520, 80, 1000, 700, 1)).toBe('above')
  })

  it('uses a side only when the cloud would be clipped above the viewport', () => {
    expect(dialoguePlacement(24, 520, 1440, 900, 1)).toBe('side-left')
    expect(dialoguePlacement(1000, 520, 1440, 900, 1)).toBe('side-right')
  })
})
