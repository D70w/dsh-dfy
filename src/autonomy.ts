export const AUTONOMY_PHASES = [
  'notice', 'intend', 'attempt', 'result', 'recover', 'return-home',
] as const

export type AutonomyPhase = typeof AUTONOMY_PHASES[number]
export type ButterflyOutcome = 'success' | 'miss'
export type ButterflyInfluence = 'none' | 'assist' | 'startle'

export interface ButterflyEpisode {
  id: string
  story: 'butterfly'
  phase: AutonomyPhase
  phaseStartedAt: number
  seed: number
  outcome: ButterflyOutcome
  guaranteedSuccess: boolean
  influence: ButterflyInfluence
  origin: 'automatic' | 'manual'
}

export interface AutonomyOffset {
  x: number
  y: number
}

export interface CursorVisitEpisode {
  id: string
  story: 'cursor_visit'
  phase: AutonomyPhase
  phaseStartedAt: number
  seed: number
  outcome: 'completed' | 'interrupted'
  origin: 'automatic' | 'manual'
  targetOffset: AutonomyOffset
}

export interface NapEpisode {
  id: string
  story: 'nap'
  phase: AutonomyPhase
  phaseStartedAt: number
  seed: number
  outcome: 'completed' | 'seen' | 'interrupted'
}

export interface RiceEpisode {
  id: string
  story: 'rice_caught'
  phase: AutonomyPhase
  phaseStartedAt: number
  seed: number
  outcome: 'completed' | 'caught_by_user' | 'interrupted'
  origin: 'automatic'
}

export interface BowlAccidentEpisode {
  id: string
  story: 'bowl_accident'
  phase: AutonomyPhase
  phaseStartedAt: number
  seed: number
  outcome: 'completed' | 'interrupted'
  origin: 'automatic'
}

export interface RecoveryMealEpisode {
  id: string
  story: 'recovery_meal'
  phase: AutonomyPhase
  phaseStartedAt: number
  seed: number
  outcome: 'completed' | 'interrupted'
  origin: 'automatic'
}

export type RiceStoryEpisode = RiceEpisode | BowlAccidentEpisode | RecoveryMealEpisode
export type AutonomyEpisode = ButterflyEpisode | CursorVisitEpisode | NapEpisode | RiceStoryEpisode

export interface StoryMemoryFact {
  updatedAt: number
  updatedOnActiveDayOrdinal: number
  expiresOnActiveDayOrdinal?: number
  triggeredByUpdatedAt?: number
}

export type ContinuationStory = 'bowl_accident' | 'recovery_meal'

const PHASE_DURATION_MS: Readonly<Record<AutonomyPhase, number>> = Object.freeze({
  notice: 600,
  intend: 650,
  attempt: 900,
  result: 950,
  recover: 700,
  'return-home': 400,
})

const CURSOR_VISIT_PHASE_DURATION_MS: Readonly<Record<AutonomyPhase, number>> = Object.freeze({
  notice: 450,
  intend: 500,
  attempt: 800,
  result: 1_600,
  recover: 350,
  'return-home': 700,
})

const NAP_PHASE_DURATION_MS: Readonly<Record<AutonomyPhase, number>> = Object.freeze({
  notice: 700,
  intend: 650,
  attempt: 900,
  result: 2_600,
  recover: 750,
  'return-home': 450,
})

const RICE_PHASE_DURATION_MS: Readonly<Record<AutonomyPhase, number>> = Object.freeze({
  notice: 620,
  intend: 620,
  attempt: 820,
  result: 1_850,
  recover: 780,
  'return-home': 720,
})

const BOWL_ACCIDENT_PHASE_DURATION_MS: Readonly<Record<AutonomyPhase, number>> = Object.freeze({
  notice: 560,
  intend: 620,
  attempt: 900,
  result: 1_650,
  recover: 900,
  'return-home': 760,
})

const RECOVERY_MEAL_PHASE_DURATION_MS: Readonly<Record<AutonomyPhase, number>> = Object.freeze({
  notice: 620,
  intend: 650,
  attempt: 900,
  result: 1_900,
  recover: 800,
  'return-home': 760,
})

/** A visible idle page waits before starting any noticeable autonomous story. */
export const AUTONOMY_DELAY_RANGE_MS = Object.freeze({ minimum: 90_000, span: 60_001 })

function normalizeSeed(seed: number): number {
  return Math.abs(Math.trunc(seed)) >>> 0
}

function unitRandom(seed: number): number {
  let value = normalizeSeed(seed) + 0x6d2b79f5
  value = Math.imul(value ^ value >>> 15, value | 1)
  value ^= value + Math.imul(value ^ value >>> 7, value | 61)
  return ((value ^ value >>> 14) >>> 0) / 4_294_967_296
}

export function nextAutonomyDelay(seed: number): number {
  return AUTONOMY_DELAY_RANGE_MS.minimum + normalizeSeed(seed) % AUTONOMY_DELAY_RANGE_MS.span
}

/** Start one deterministic story; two consecutive misses force the next success. */
export function createButterflyEpisode(
  seed: number,
  now: number,
  consecutiveMisses: number,
  origin: ButterflyEpisode['origin'] = 'automatic',
): ButterflyEpisode {
  const normalized = normalizeSeed(seed)
  const guaranteedSuccess = consecutiveMisses >= 2
  return {
    id: `butterfly-${Math.trunc(now)}-${normalized}`,
    story: 'butterfly',
    phase: 'notice',
    phaseStartedAt: now,
    seed: normalized,
    outcome: guaranteedSuccess || unitRandom(normalized) < 0.58 ? 'success' : 'miss',
    guaranteedSuccess,
    influence: 'none',
    origin,
  }
}

/** Create one bounded visit whose target was already vetted by the Browser safety layer. */
export function createCursorVisitEpisode(
  seed: number,
  now: number,
  targetOffset: AutonomyOffset,
  origin: CursorVisitEpisode['origin'] = 'automatic',
): CursorVisitEpisode {
  const normalized = normalizeSeed(seed)
  return {
    id: `cursor-visit-${Math.trunc(now)}-${normalized}`,
    story: 'cursor_visit',
    phase: 'notice',
    phaseStartedAt: now,
    seed: normalized,
    outcome: 'completed',
    origin,
    targetOffset: {
      x: Math.round(targetOffset.x),
      y: Math.round(targetOffset.y),
    },
  }
}

/** Start one quiet nap at the home anchor; the Browser may wake it early. */
export function createNapEpisode(seed: number, now: number): NapEpisode {
  const normalized = normalizeSeed(seed)
  return {
    id: `nap-${Math.trunc(now)}-${normalized}`,
    story: 'nap',
    phase: 'notice',
    phaseStartedAt: now,
    seed: normalized,
    outcome: 'completed',
  }
}

/** Start one private rice break. The Browser may expose it by proximity or activation. */
export function createRiceEpisode(seed: number, now: number): RiceEpisode {
  const normalized = normalizeSeed(seed)
  return {
    id: `rice-${Math.trunc(now)}-${normalized}`,
    story: 'rice_caught',
    phase: 'notice',
    phaseStartedAt: now,
    seed: normalized,
    outcome: 'completed',
    origin: 'automatic',
  }
}

export function createBowlAccidentEpisode(seed: number, now: number): BowlAccidentEpisode {
  const normalized = normalizeSeed(seed)
  return {
    id: `bowl-accident-${Math.trunc(now)}-${normalized}`,
    story: 'bowl_accident',
    phase: 'notice',
    phaseStartedAt: now,
    seed: normalized,
    outcome: 'completed',
    origin: 'automatic',
  }
}

export function createRecoveryMealEpisode(seed: number, now: number): RecoveryMealEpisode {
  const normalized = normalizeSeed(seed)
  return {
    id: `recovery-meal-${Math.trunc(now)}-${normalized}`,
    story: 'recovery_meal',
    phase: 'notice',
    phaseStartedAt: now,
    seed: normalized,
    outcome: 'completed',
    origin: 'automatic',
  }
}

/**
 * Pick at most one causal callback. A source must come from an earlier active
 * day, remain inside its seven-day window, and not have been consumed before.
 */
export function selectContinuationStory(
  storyMemory: Partial<Record<'rice_caught' | 'bowl_accident' | 'recovery_meal', StoryMemoryFact>>,
  activeDayOrdinal: number,
): ContinuationStory | undefined {
  const isPreviousUnexpired = (fact: StoryMemoryFact | undefined): fact is StoryMemoryFact => fact !== undefined
    && fact.updatedOnActiveDayOrdinal < activeDayOrdinal
    && (fact.expiresOnActiveDayOrdinal === undefined || fact.expiresOnActiveDayOrdinal >= activeDayOrdinal)

  const bowl = storyMemory.bowl_accident
  if (isPreviousUnexpired(bowl)) {
    const recovery = storyMemory.recovery_meal
    if (recovery?.triggeredByUpdatedAt !== bowl.updatedAt) return 'recovery_meal'
  }
  const rice = storyMemory.rice_caught
  if (isPreviousUnexpired(rice) && bowl?.triggeredByUpdatedAt !== rice.updatedAt) return 'bowl_accident'
  return undefined
}

/** Pointer influence is sampled once during attempt; it never drives a per-frame chase. */
export function influenceButterfly(
  episode: ButterflyEpisode,
  influence: ButterflyInfluence,
): ButterflyEpisode {
  if (episode.phase !== 'attempt' || influence === 'none' || episode.influence !== 'none') return episode
  return {
    ...episode,
    influence,
    outcome: episode.guaranteedSuccess || influence === 'assist' ? 'success' : 'miss',
  }
}

export function phaseDuration(phase: AutonomyPhase, story: AutonomyEpisode['story'] = 'butterfly'): number {
  if (story === 'cursor_visit') return CURSOR_VISIT_PHASE_DURATION_MS[phase]
  if (story === 'nap') return NAP_PHASE_DURATION_MS[phase]
  if (story === 'rice_caught') return RICE_PHASE_DURATION_MS[phase]
  if (story === 'bowl_accident') return BOWL_ACCIDENT_PHASE_DURATION_MS[phase]
  if (story === 'recovery_meal') return RECOVERY_MEAL_PHASE_DURATION_MS[phase]
  return PHASE_DURATION_MS[phase]
}

/** Advance at most one named phase so every transition remains observable and cancellable. */
export function advanceAutonomyEpisode<T extends AutonomyEpisode>(
  episode: T,
  now: number,
): T | undefined {
  if (now - episode.phaseStartedAt < phaseDuration(episode.phase, episode.story)) return episode
  const index = AUTONOMY_PHASES.indexOf(episode.phase)
  const next = AUTONOMY_PHASES[index + 1]
  if (next === undefined) return undefined
  return { ...episode, phase: next, phaseStartedAt: now } as T
}

/** Backward-compatible named entry retained for consumers focused on the first story. */
export function advanceButterflyEpisode(
  episode: ButterflyEpisode,
  now: number,
): ButterflyEpisode | undefined {
  return advanceAutonomyEpisode(episode, now)
}

/** Begin a graceful retreat when the user starts moving or clicking. */
export function returnCursorVisitHome(episode: CursorVisitEpisode, now: number): CursorVisitEpisode {
  if (episode.phase === 'return-home') return episode
  return { ...episode, phase: 'return-home', phaseStartedAt: now, outcome: 'interrupted' }
}

/** Wake a sleeping whale into the shared recovery/return sequence. */
export function wakeNapEpisode(
  episode: NapEpisode,
  now: number,
  outcome: Extract<NapEpisode['outcome'], 'seen' | 'interrupted'>,
): NapEpisode {
  if (episode.phase === 'recover' || episode.phase === 'return-home') return episode
  return { ...episode, phase: 'recover', phaseStartedAt: now, outcome }
}

/** Catch the whale during the visible rice break and skip directly to her denial. */
export function catchRiceEpisode(episode: RiceEpisode, now: number): RiceEpisode {
  if (episode.phase !== 'attempt' && episode.phase !== 'result') return episode
  return { ...episode, phase: 'recover', phaseStartedAt: now, outcome: 'caught_by_user' }
}

/** Direct user performances are L4 interactions, not daily autonomous-story records. */
export function shouldPersistAutonomyOutcome(episode: AutonomyEpisode): boolean {
  if (episode.story === 'nap') return true
  return episode.origin === 'automatic'
}

function scaledOffset(offset: AutonomyOffset, amount: number): AutonomyOffset {
  return { x: Math.round(offset.x * amount), y: Math.round(offset.y * amount) }
}

export function autonomyOffset(episode: AutonomyEpisode | undefined): AutonomyOffset {
  if (episode?.story === 'cursor_visit') {
    switch (episode.phase) {
      case 'notice': return { x: 0, y: 0 }
      case 'intend': return scaledOffset(episode.targetOffset, 0.2)
      case 'attempt': return scaledOffset(episode.targetOffset, 0.7)
      case 'result':
      case 'recover': return episode.targetOffset
      case 'return-home': return { x: 0, y: 0 }
    }
  }
  if (episode?.story === 'nap') {
    switch (episode.phase) {
      case 'notice':
      case 'intend':
      case 'attempt':
      case 'result':
      case 'recover':
      case 'return-home': return { x: 0, y: 0 }
    }
  }
  if (episode?.story === 'rice_caught' || episode?.story === 'bowl_accident' || episode?.story === 'recovery_meal') {
    switch (episode.phase) {
      case 'notice': return { x: 0, y: 0 }
      case 'intend': return { x: -16, y: 0 }
      case 'attempt': return { x: -58, y: 0 }
      case 'result':
      case 'recover': return { x: -58, y: 0 }
      case 'return-home': return { x: 0, y: 0 }
    }
  }
  switch (episode?.phase) {
    case 'intend': return { x: -5, y: -1 }
    case 'attempt': return { x: -20, y: -7 }
    case 'result': return episode.outcome === 'success' ? { x: -13, y: -4 } : { x: -17, y: 0 }
    case 'recover': return { x: -7, y: 0 }
    case 'notice':
    case 'return-home':
    case undefined:
      return { x: 0, y: 0 }
  }
}
