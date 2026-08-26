import { describe, expect, it } from 'vitest'
import { toPetView } from '../domain/commands.ts'
import { createPetSave } from '../domain/pet-save.ts'
import { buildDiaryFacts, recentLedgerDays } from './ledger.ts'

describe('workstation diary model', () => {
  it('keeps an empty day honest and still reports the shared active-day count', () => {
    const state = toPetView(createPetSave(1))
    expect(buildDiaryFacts(state, '2026-08-21')).toEqual([
      { kind: 'quiet', value: 0 },
      { kind: 'days', value: 0 },
    ])
  })

  it('builds at most five factual lines and bounds recent history', () => {
    const save = createPetSave(1)
    save.memories.activeDays = ['2026-08-20', '2026-08-21']
    save.daily['2026-08-21'] = {
      completedTurns: 3, workMinutes: 42, feeds: 1, interactions: 2, storyOutcomes: 4,
    }
    for (let index = 1; index <= 10; index += 1) {
      save.daily[`2026-08-${String(index).padStart(2, '0')}`] = {
        completedTurns: index, workMinutes: index, feeds: 0, interactions: 0, storyOutcomes: 0,
      }
    }
    const state = toPetView(save)
    expect(buildDiaryFacts(state, '2026-08-21')).toEqual([
      { kind: 'completed', value: 3 },
      { kind: 'work', value: 42 },
      { kind: 'feeds', value: 1 },
      { kind: 'interactions', value: 2 },
      { kind: 'days', value: 2 },
    ])
    const recent = recentLedgerDays(state)
    expect(recent).toHaveLength(7)
    expect(recent.map(day => day.day)).toEqual([...recent.map(day => day.day)].toSorted().reverse())
  })
})
