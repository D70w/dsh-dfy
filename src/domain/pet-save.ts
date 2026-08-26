import { z } from 'zod'

export const STORY_IDS = [
  'butterfly', 'rice_caught', 'nap', 'cursor_visit', 'bowl_accident', 'recovery_meal',
] as const
export const STORY_OUTCOMES = [
  'seen', 'success', 'miss', 'interrupted', 'caught_by_user', 'completed',
] as const
export const FOOD_IDS = ['plain_rice'] as const
export const ACHIEVEMENT_IDS = ['first_meal', 'first_week', 'workmate'] as const

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const timestamp = count
const stat = z.number().int().min(0).max(100)
const weight = z.number().int().min(-100).max(100)
const commandReceipt = z.union([
  z.string().uuid(),
  z.string().max(448).regex(/^session:[A-Za-z0-9_.!~*'()%-]{1,400}:\d+$/),
])

const localDay = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year!, month! - 1, day))
    return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  }, 'invalid local calendar day')
const localMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

const storyMemoryEntrySchema = z.object({
  stage: z.enum(STORY_OUTCOMES),
  count,
  consecutiveMisses: z.number().int().nonnegative().max(2).optional(),
  updatedAt: timestamp,
  updatedOnActiveDayOrdinal: count,
  expiresOnActiveDayOrdinal: count.optional(),
  /** Exact source event consumed by a continuation, so one result cannot replay forever. */
  triggeredByUpdatedAt: timestamp.optional(),
}).strict()

const dailySummarySchema = z.object({
  interactions: count,
  feeds: count,
  completedTurns: count,
  storyOutcomes: count,
  workMinutes: count,
}).strict()

const monthlySummarySchema = dailySummarySchema.extend({ activeDays: count }).strict()

const statsSchema = z.object({
  hunger: stat,
  mood: stat,
  affection: stat,
  energy: stat,
}).strict()

const expressionWeightsSchema = z.object({
  interactionWarmth: weight,
  foodMemory: weight,
  nightAffinity: weight,
  workBond: weight,
  banter: weight,
}).strict()

const turnEndCountsSchema = z.object({
  completed: count,
  error: count,
  blocked: count,
  maxTokens: count,
  aborted: count,
  interrupted: count,
}).strict()

function boundedRecord<K extends string, V>(keys: readonly K[], value: z.ZodType<V>, maximum: number) {
  const key = z.enum(keys as [K, ...K[]])
  return z.partialRecord(key, value).refine(record => Object.keys(record).length <= maximum, `at most ${maximum} entries`)
}

const storyMemorySchema = boundedRecord(STORY_IDS, storyMemoryEntrySchema, 16)
const inventorySchema = boundedRecord(FOOD_IDS, count.max(999), FOOD_IDS.length)
const achievementsSchema = boundedRecord(
  ACHIEVEMENT_IDS,
  z.object({ unlockedAt: timestamp }).strict(),
  ACHIEVEMENT_IDS.length,
)

const dayRecordSchema = z.record(localDay, dailySummarySchema)
  .refine(record => Object.keys(record).length <= 90, 'at most 90 daily summaries')
const monthRecordSchema = z.record(localMonth, monthlySummarySchema)
  .refine(record => Object.keys(record).length <= 24, 'at most 24 monthly summaries')

export const petSaveV1Schema = z.object({
  schemaVersion: z.literal(1),
  revision: count,
  pet: z.object({
    createdAt: timestamp,
    name: z.string().trim().min(1).max(32).optional(),
    stats: statsSchema,
    expressionWeights: expressionWeightsSchema,
  }).strict(),
  inventory: inventorySchema,
  achievements: achievementsSchema,
  memories: z.object({
    activeDays: z.array(localDay).max(730),
    totalInteractions: count,
    totalFeedCount: count,
    completedTurns: count,
    totalWorkMinutes: count,
    totalStoryOutcomes: count,
    turnEndCounts: turnEndCountsSchema,
    longestSessionMinutes: count,
    storyMemory: storyMemorySchema,
  }).strict(),
  daily: dayRecordSchema,
  monthly: monthRecordSchema,
  policy: z.object({
    lastFedAt: timestamp,
    affectionDay: localDay.optional(),
    affectionEarnedToday: z.number().int().nonnegative().max(10),
    storyOutcomeDay: localDay.optional(),
    storyOutcomesToday: z.number().int().nonnegative().max(20),
  }).strict(),
  processedCommands: z.array(commandReceipt).max(256),
}).strict()

/** One pre-release layout retained solely as a deterministic migration fixture. */
export const petSaveV0Schema = z.object({
  schemaVersion: z.literal(0),
  revision: count,
  createdAt: timestamp,
  hunger: stat,
  mood: stat,
  affection: stat,
  energy: stat,
  totalInteractions: count,
  totalFeedCount: count,
  processedCommands: z.array(commandReceipt).max(512),
}).strict()

export const storedPetSaveSchema = z.union([petSaveV1Schema, petSaveV0Schema])

export type PetSaveV1 = z.infer<typeof petSaveV1Schema>
export type PetSaveV0 = z.infer<typeof petSaveV0Schema>
export type StoredPetSave = z.infer<typeof storedPetSaveSchema>
export type StoryId = typeof STORY_IDS[number]
export type StoryOutcome = typeof STORY_OUTCOMES[number]
export type FoodId = typeof FOOD_IDS[number]

/** Create one canonical profile-local save; no file or session content enters it. */
export function createPetSave(createdAt: number): PetSaveV1 {
  return petSaveV1Schema.parse({
    schemaVersion: 1,
    revision: 0,
    pet: {
      createdAt,
      stats: { hunger: 70, mood: 70, affection: 10, energy: 80 },
      expressionWeights: {
        interactionWarmth: 0,
        foodMemory: 0,
        nightAffinity: 0,
        workBond: 0,
        banter: 0,
      },
    },
    inventory: { plain_rice: 1 },
    achievements: {},
    memories: {
      activeDays: [],
      totalInteractions: 0,
      totalFeedCount: 0,
      completedTurns: 0,
      totalWorkMinutes: 0,
      totalStoryOutcomes: 0,
      turnEndCounts: { completed: 0, error: 0, blocked: 0, maxTokens: 0, aborted: 0, interrupted: 0 },
      longestSessionMinutes: 0,
      storyMemory: {},
    },
    daily: {},
    monthly: {},
    policy: {
      lastFedAt: 0,
      affectionEarnedToday: 0,
      storyOutcomesToday: 0,
    },
    processedCommands: [],
  })
}

/** Migrate only explicitly supported historical shapes; unknown versions fail loud. */
export function migratePetSave(stored: StoredPetSave): PetSaveV1 {
  if (stored.schemaVersion === 1) return compactPetSave(stored)
  const next = createPetSave(stored.createdAt)
  next.revision = stored.revision
  next.pet.stats = {
    hunger: stored.hunger,
    mood: stored.mood,
    affection: stored.affection,
    energy: stored.energy,
  }
  next.memories.totalInteractions = stored.totalInteractions
  next.memories.totalFeedCount = stored.totalFeedCount
  next.processedCommands = stored.processedCommands.slice(-256)
  return petSaveV1Schema.parse(next)
}

/** Rebuild all bounded collections before every durable write. */
export function compactPetSave(input: PetSaveV1): PetSaveV1 {
  const save = structuredClone(input)
  save.memories.activeDays = [...new Set(save.memories.activeDays)].toSorted().slice(-730)
  save.processedCommands = [...new Set(save.processedCommands)].slice(-256)

  const activeOrdinal = save.memories.activeDays.length
  save.memories.storyMemory = Object.fromEntries(Object.entries(save.memories.storyMemory)
    .filter(([, entry]) => entry.expiresOnActiveDayOrdinal === undefined || entry.expiresOnActiveDayOrdinal >= activeOrdinal)
    .toSorted(([, left], [, right]) => right.updatedAt - left.updatedAt)
    .slice(0, 16))

  const dailyEntries = Object.entries(save.daily).toSorted(([left], [right]) => left.localeCompare(right))
  const removedDaily = dailyEntries.slice(0, Math.max(0, dailyEntries.length - 90))
  save.daily = Object.fromEntries(dailyEntries.slice(-90))
  for (const [day, summary] of removedDaily) {
    const month = day.slice(0, 7)
    const current = save.monthly[month] ?? {
      activeDays: 0, interactions: 0, feeds: 0, completedTurns: 0, storyOutcomes: 0, workMinutes: 0,
    }
    save.monthly[month] = {
      activeDays: current.activeDays + 1,
      interactions: current.interactions + summary.interactions,
      feeds: current.feeds + summary.feeds,
      completedTurns: current.completedTurns + summary.completedTurns,
      storyOutcomes: current.storyOutcomes + summary.storyOutcomes,
      workMinutes: current.workMinutes + summary.workMinutes,
    }
  }
  save.monthly = Object.fromEntries(Object.entries(save.monthly)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .slice(-24))
  return petSaveV1Schema.parse(save)
}

/** Clone, validate, and deeply freeze the value handed to Storage Domain. */
export function snapshotPetSave(input: PetSaveV1): Readonly<PetSaveV1> {
  const value = petSaveV1Schema.parse(compactPetSave(input))
  const freeze = (candidate: unknown): void => {
    if (candidate === null || typeof candidate !== 'object' || Object.isFrozen(candidate)) return
    for (const child of Object.values(candidate)) freeze(child)
    Object.freeze(candidate)
  }
  freeze(value)
  return value
}
