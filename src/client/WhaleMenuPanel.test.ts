import { describe, expect, it } from 'vitest'
import { clampPanelOffset } from './WhaleMenuPanel.tsx'

describe('WhaleMenuPanel viewport fitting', () => {
  it('moves an overflowing panel back inside every viewport edge', () => {
    expect(clampPanelOffset(
      { left: -18, right: 300, top: -7, bottom: 540 },
      { x: 0, y: 0 },
      { width: 900, height: 700 },
    )).toEqual({ x: 30, y: 19 })
    expect(clampPanelOffset(
      { left: 610, right: 928, top: 180, bottom: 724 },
      { x: 14, y: -8 },
      { width: 900, height: 700 },
    )).toEqual({ x: -26, y: -44 })
  })
})
