import { describe, expect, it } from 'vitest'
import { DEFAULT_POSITION, clampPosition, nudgePosition } from './position.ts'

describe('clampPosition', () => {
  it('rejects malformed persisted values', () => {
    expect(clampPosition({ right: 'bad', bottom: 1 }, { width: 1200, height: 800 }, { width: 104, height: 116 }))
      .toEqual(DEFAULT_POSITION)
  })

  it('keeps at least a reachable part in the viewport', () => {
    expect(clampPosition({ right: 9000, bottom: -9000 }, { width: 800, height: 600 }, { width: 104, height: 116 }))
      .toEqual({ right: 776, bottom: 0 })
  })

  it('nudges in visual screen directions and clamps at the viewport edge', () => {
    const viewport = { width: 800, height: 600 }
    const pet = { width: 112, height: 112 }
    expect(nudgePosition({ right: 24, bottom: 20 }, 'left', 8, viewport, pet))
      .toEqual({ right: 32, bottom: 20 })
    expect(nudgePosition({ right: 24, bottom: 20 }, 'up', 24, viewport, pet))
      .toEqual({ right: 24, bottom: 44 })
    expect(nudgePosition({ right: -100, bottom: -100 }, 'right', 24, viewport, pet))
      .toEqual({ right: 0, bottom: 0 })
  })
})
