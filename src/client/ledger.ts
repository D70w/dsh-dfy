import type { PetView } from '../domain/commands.ts'

export type DiaryFactKind = 'quiet' | 'completed' | 'work' | 'feeds' | 'interactions' | 'stories' | 'days'

export interface DiaryFact {
  kind: DiaryFactKind
  value: number
}

export interface LedgerDay {
  day: string
  completedTurns: number
  workMinutes: number
  feeds: number
  interactions: number
  storyOutcomes: number
}

/** Create a bounded factual diary model; character copy is added only in the UI locale layer. */
export function buildDiaryFacts(state: PetView, today: string): DiaryFact[] {
  const summary = state.daily[today]
  if (summary === undefined || Object.values(summary).every(value => value === 0)) {
    return [
      { kind: 'quiet', value: 0 },
      { kind: 'days', value: state.memories.activeDays.length },
    ]
  }
  const facts: DiaryFact[] = []
  if (summary.completedTurns > 0) facts.push({ kind: 'completed', value: summary.completedTurns })
  if (summary.workMinutes > 0) facts.push({ kind: 'work', value: summary.workMinutes })
  if (summary.feeds > 0) facts.push({ kind: 'feeds', value: summary.feeds })
  if (summary.interactions > 0) facts.push({ kind: 'interactions', value: summary.interactions })
  if (summary.storyOutcomes > 0) facts.push({ kind: 'stories', value: summary.storyOutcomes })
  facts.splice(4)
  facts.push({ kind: 'days', value: state.memories.activeDays.length })
  return facts
}

export function recentLedgerDays(state: PetView, limit = 7): LedgerDay[] {
  return Object.entries(state.daily)
    .toSorted(([left], [right]) => right.localeCompare(left))
    .slice(0, Math.max(0, limit))
    .map(([day, value]) => ({ day, ...value }))
}
