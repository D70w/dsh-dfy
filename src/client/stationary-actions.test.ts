import { describe, expect, it } from 'vitest'
import {
  STATIONARY_ACTIONS, pickStationaryAction, stationaryActionLine,
} from './stationary-actions.ts'

describe('classic performance selection', () => {
  it('avoids immediately repeating the previous action', () => {
    const previous = STATIONARY_ACTIONS[0]
    expect(pickStationaryAction(previous.id, 0).id).not.toBe(previous.id)
    expect(pickStationaryAction(previous.id, .999_999).id).not.toBe(previous.id)
  })

  it('gives every classic action several matching dialogue lines', () => {
    for (const action of STATIONARY_ACTIONS) {
      expect(action.lines.length).toBeGreaterThanOrEqual(3)
      const first = stationaryActionLine(action, 0)
      const last = stationaryActionLine(action, .999_999)
      expect(first.speaker).toContain(action.label)
      expect(first.text).not.toBe(last.text)
      expect(first.subtext.length).toBeGreaterThan(0)
    }
  })
})
