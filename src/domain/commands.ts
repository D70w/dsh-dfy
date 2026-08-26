import { z } from 'zod'
import {
  FOOD_IDS,
  STORY_IDS,
  STORY_OUTCOMES,
  compactPetSave,
  petSaveV1Schema,
  snapshotPetSave,
  type PetSaveV1,
} from './pet-save.ts'

const commandBase = { id: z.string().uuid() }

export const petCommandSchema = z.discriminatedUnion('type', [
  z.object({ ...commandBase, type: z.literal('pet') }).strict(),
  z.object({ ...commandBase, type: z.literal('feed'), foodId: z.enum(FOOD_IDS) }).strict(),
  z.object({ ...commandBase, type: z.literal('clear-diary-history') }).strict(),
  z.object({
    ...commandBase,
    type: z.literal('record-story-outcome'),
    storyId: z.enum(STORY_IDS),
    outcome: z.enum(STORY_OUTCOMES),
  }).strict(),
])

export type PetCommand = z.infer<typeof petCommandSchema>
export type PetCommandReason = 'duplicate' | 'cooldown' | 'rate-limited'

export const petViewSchema = petSaveV1Schema.omit({ policy: true, processedCommands: true })
export type PetView = z.infer<typeof petViewSchema>

export interface PetCommandResult {
  applied: boolean
  reason?: PetCommandReason
  state: PetView
}

export const petStateResponseSchema = z.object({
  persistence: z.enum(['durable', 'temporary']),
  state: petViewSchema,
}).strict()

export const petCommandResponseSchema = z.object({
  persistence: z.enum(['durable', 'temporary']),
  applied: z.boolean(),
  reason: z.enum(['duplicate', 'cooldown', 'rate-limited']).optional(),
  state: petViewSchema,
}).strict()

export type PetStateResponse = z.infer<typeof petStateResponseSchema>
export type PetCommandResponse = z.infer<typeof petCommandResponseSchema>

export const WORK_TURN_REASONS = [
  'completed', 'error', 'blocked', 'max-tokens', 'aborted', 'interrupted',
] as const

export const workTurnSettlementSchema = z.object({
  receiptId: z.string().max(448).regex(/^session:[A-Za-z0-9_.!~*'()%-]{1,400}:\d+$/),
  reason: z.enum(WORK_TURN_REASONS),
  endedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  workMinutes: z.number().int().nonnegative().max(120),
}).strict()

export type WorkTurnSettlement = z.infer<typeof workTurnSettlementSchema>

const FEED_COOLDOWN_MS = 15 * 60 * 1000
const DAILY_AFFECTION_CAP = 10
const DAILY_STORY_CAP = 20

function add(value: number, delta: number, maximum = Number.MAX_SAFE_INTEGER): number {
  return Math.min(maximum, value + delta)
}

export function localDayKey(now: number): string {
  const date = new Date(now)
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daily(save: PetSaveV1, day: string): PetSaveV1['daily'][string] {
  return save.daily[day] ??= {
    interactions: 0,
    feeds: 0,
    completedTurns: 0,
    storyOutcomes: 0,
    workMinutes: 0,
  }
}

function markActive(save: PetSaveV1, day: string): void {
  if (!save.memories.activeDays.includes(day)) save.memories.activeDays.push(day)
}

function resetDailyPolicy(save: PetSaveV1, day: string): void {
  if (save.policy.affectionDay !== day) {
    save.policy.affectionDay = day
    save.policy.affectionEarnedToday = 0
  }
  if (save.policy.storyOutcomeDay !== day) {
    save.policy.storyOutcomeDay = day
    save.policy.storyOutcomesToday = 0
  }
}

export function toPetView(save: PetSaveV1): PetView {
  const { policy: _policy, processedCommands: _processedCommands, ...view } = save
  return petViewSchema.parse(structuredClone(view))
}

/** Pure, bounded command reduction; the Host persists the returned snapshot before replying. */
export function applyPetCommand(current: PetSaveV1, command: PetCommand, now: number): PetCommandResult & { save: Readonly<PetSaveV1> } {
  if (current.processedCommands.includes(command.id)) {
    return { applied: false, reason: 'duplicate', state: toPetView(current), save: snapshotPetSave(current) }
  }
  const save = structuredClone(current)
  if (command.type === 'clear-diary-history') {
    // Privacy deletion is deliberately narrow: dated diary pages and bounded
    // story threads disappear, while relationship, achievements, lifetime
    // counters, cooldowns, and idempotency receipts remain authoritative.
    save.daily = {}
    save.monthly = {}
    save.memories.storyMemory = {}
    save.processedCommands.push(command.id)
    save.revision = add(save.revision, 1)
    const frozen = snapshotPetSave(compactPetSave(save))
    return { applied: true, state: toPetView(frozen as PetSaveV1), save: frozen }
  }
  const day = localDayKey(now)
  resetDailyPolicy(save, day)
  markActive(save, day)
  let applied = true
  let reason: PetCommandReason | undefined

  if (command.type === 'pet') {
    save.memories.totalInteractions = add(save.memories.totalInteractions, 1)
    daily(save, day).interactions = add(daily(save, day).interactions, 1)
    save.pet.stats.mood = add(save.pet.stats.mood, 2, 100)
    save.pet.expressionWeights.interactionWarmth = add(save.pet.expressionWeights.interactionWarmth, 1, 100)
    if (save.policy.affectionEarnedToday < DAILY_AFFECTION_CAP) {
      save.pet.stats.affection = add(save.pet.stats.affection, 1, 100)
      save.policy.affectionEarnedToday += 1
    }
  } else if (command.type === 'feed') {
    if (now - save.policy.lastFedAt < FEED_COOLDOWN_MS) {
      applied = false
      reason = 'cooldown'
    } else {
      save.policy.lastFedAt = now
      save.pet.stats.hunger = add(save.pet.stats.hunger, 20, 100)
      save.pet.stats.mood = add(save.pet.stats.mood, 2, 100)
      save.pet.stats.energy = add(save.pet.stats.energy, 5, 100)
      save.pet.expressionWeights.foodMemory = add(save.pet.expressionWeights.foodMemory, 1, 100)
      save.memories.totalFeedCount = add(save.memories.totalFeedCount, 1)
      daily(save, day).feeds = add(daily(save, day).feeds, 1)
      save.achievements.first_meal ??= { unlockedAt: now }
      // Plain rice is the always-available baseline interaction, not a scarce item.
      save.inventory.plain_rice = Math.max(1, save.inventory.plain_rice ?? 0)
    }
  } else if (save.policy.storyOutcomesToday >= DAILY_STORY_CAP) {
    applied = false
    reason = 'rate-limited'
  } else {
    save.policy.storyOutcomesToday += 1
    save.memories.totalStoryOutcomes = add(save.memories.totalStoryOutcomes, 1)
    daily(save, day).storyOutcomes = add(daily(save, day).storyOutcomes, 1)
    const previous = save.memories.storyMemory[command.storyId]
    const consecutiveMisses = command.storyId === 'butterfly'
      ? command.outcome === 'miss' ? Math.min(2, (previous?.consecutiveMisses ?? 0) + 1) : 0
      : undefined
    const continuationSource = command.storyId === 'bowl_accident'
      ? save.memories.storyMemory.rice_caught
      : command.storyId === 'recovery_meal'
        ? save.memories.storyMemory.bowl_accident
        : undefined
    const isBoundedContinuation = command.storyId === 'rice_caught'
      || command.storyId === 'bowl_accident'
      || command.storyId === 'recovery_meal'
    save.memories.storyMemory[command.storyId] = {
      stage: command.outcome,
      count: add(previous?.count ?? 0, 1),
      ...(consecutiveMisses === undefined ? {} : { consecutiveMisses }),
      ...(continuationSource === undefined ? {} : { triggeredByUpdatedAt: continuationSource.updatedAt }),
      updatedAt: now,
      updatedOnActiveDayOrdinal: save.memories.activeDays.length,
      expiresOnActiveDayOrdinal: save.memories.activeDays.length + (isBoundedContinuation ? 7 : 30),
    }
  }

  if (save.pet.stats.affection >= 50) save.achievements.workmate ??= { unlockedAt: now }
  save.processedCommands.push(command.id)
  save.revision = add(save.revision, 1)
  const frozen = snapshotPetSave(compactPetSave(save))
  return {
    applied,
    ...(reason === undefined ? {} : { reason }),
    state: toPetView(frozen as PetSaveV1),
    save: frozen,
  }
}

const TURN_REASON_KEY: Readonly<Record<WorkTurnSettlement['reason'], keyof PetSaveV1['memories']['turnEndCounts']>> = {
  completed: 'completed',
  error: 'error',
  blocked: 'blocked',
  'max-tokens': 'maxTokens',
  aborted: 'aborted',
  interrupted: 'interrupted',
}

/**
 * Host-only reduction for one committed turn/end event. It is deliberately
 * separate from PetCommand so no Browser request can forge work rewards.
 */
export function applyWorkTurnSettlement(
  current: PetSaveV1,
  input: WorkTurnSettlement,
): PetCommandResult & { save: Readonly<PetSaveV1> } {
  const settlement = workTurnSettlementSchema.parse(input)
  if (current.processedCommands.includes(settlement.receiptId)) {
    return { applied: false, reason: 'duplicate', state: toPetView(current), save: snapshotPetSave(current) }
  }

  const save = structuredClone(current)
  const day = localDayKey(settlement.endedAt)
  resetDailyPolicy(save, day)
  markActive(save, day)
  const summary = daily(save, day)
  const reasonKey = TURN_REASON_KEY[settlement.reason]
  save.memories.turnEndCounts[reasonKey] = add(save.memories.turnEndCounts[reasonKey], 1)
  save.memories.totalWorkMinutes = add(save.memories.totalWorkMinutes, settlement.workMinutes)
  summary.workMinutes = add(summary.workMinutes, settlement.workMinutes)
  save.memories.longestSessionMinutes = Math.max(save.memories.longestSessionMinutes, settlement.workMinutes)
  save.pet.expressionWeights.workBond = add(
    save.pet.expressionWeights.workBond,
    settlement.reason === 'completed' ? 2 : 1,
    100,
  )

  if (settlement.workMinutes > 0) {
    save.pet.stats.hunger = Math.max(0, save.pet.stats.hunger - Math.ceil(settlement.workMinutes / 30))
    save.pet.stats.energy = Math.max(0, save.pet.stats.energy - Math.ceil(settlement.workMinutes / 60))
  }
  if (settlement.reason === 'completed') {
    save.memories.completedTurns = add(save.memories.completedTurns, 1)
    summary.completedTurns = add(summary.completedTurns, 1)
    save.pet.stats.mood = add(save.pet.stats.mood, 1, 100)
    if (save.policy.affectionEarnedToday < DAILY_AFFECTION_CAP) {
      save.pet.stats.affection = add(save.pet.stats.affection, 1, 100)
      save.policy.affectionEarnedToday += 1
    }
  }

  if (save.memories.activeDays.length >= 7) save.achievements.first_week ??= { unlockedAt: settlement.endedAt }
  if (save.pet.stats.affection >= 50) save.achievements.workmate ??= { unlockedAt: settlement.endedAt }
  save.processedCommands.push(settlement.receiptId)
  save.revision = add(save.revision, 1)
  const frozen = snapshotPetSave(compactPetSave(save))
  return { applied: true, state: toPetView(frozen as PetSaveV1), save: frozen }
}
