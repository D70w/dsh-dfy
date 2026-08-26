import type { PetView } from './domain/commands.ts'

export const RELATIONSHIP_STAGES = [
  'newcomer', 'familiar', 'close', 'trusted', 'old-friend',
] as const

export type RelationshipStage = typeof RELATIONSHIP_STAGES[number]

export interface RelationshipProfile {
  stage: RelationshipStage
  minimum: number
  nextAt?: number
  /** Pointer-to-character-centre clearance; 56px is the 112px character radius. */
  cursorClearancePx: number
  automaticCursorVisit: boolean
}

const PROFILES: readonly RelationshipProfile[] = Object.freeze([
  { stage: 'newcomer', minimum: 0, nextAt: 20, cursorClearancePx: 120, automaticCursorVisit: false },
  { stage: 'familiar', minimum: 20, nextAt: 40, cursorClearancePx: 120, automaticCursorVisit: true },
  { stage: 'close', minimum: 40, nextAt: 60, cursorClearancePx: 112, automaticCursorVisit: true },
  { stage: 'trusted', minimum: 60, nextAt: 80, cursorClearancePx: 104, automaticCursorVisit: true },
  { stage: 'old-friend', minimum: 80, cursorClearancePx: 96, automaticCursorVisit: true },
])

/** Resolve the stable relationship contract from affection without mutating save data. */
export function relationshipProfile(affection: number): RelationshipProfile {
  const bounded = Math.max(0, Math.min(100, Math.trunc(affection)))
  return PROFILES.findLast(profile => bounded >= profile.minimum) ?? PROFILES[0]!
}

export type RelationshipReaction = 'pet' | 'feed' | 'completed' | 'error'

/**
 * Pick only from authored, bounded copy variants. Persisted weights change tone,
 * never facts or the character's core personality.
 */
export function relationshipReactionVariant(
  reaction: RelationshipReaction,
  state: PetView | undefined,
): 'default' | 'warm' {
  if (state === undefined) return 'default'
  const profile = relationshipProfile(state.pet.stats.affection)
  const weights = state.pet.expressionWeights
  switch (reaction) {
    case 'pet':
      return profile.minimum >= 40 || weights.interactionWarmth >= 8 ? 'warm' : 'default'
    case 'feed':
      return profile.minimum >= 40 || weights.foodMemory >= 5 ? 'warm' : 'default'
    case 'completed':
    case 'error':
      return profile.minimum >= 60 || weights.workBond >= 12 ? 'warm' : 'default'
  }
}
