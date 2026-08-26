import { describe, expect, it } from 'vitest'
import { applyPetCommand, applyWorkTurnSettlement, petCommandSchema } from './commands.ts'
import { createPetSave } from './pet-save.ts'

const ids = {
  pet: '00000000-0000-4000-8000-000000000001',
  feed: '00000000-0000-4000-8000-000000000002',
  story: '00000000-0000-4000-8000-000000000003',
  clear: '00000000-0000-4000-8000-000000000006',
}

describe('Pet commands', () => {
  it('strictly rejects unknown command fields and unlisted food/story values', () => {
    expect(() => petCommandSchema.parse({ id: ids.pet, type: 'pet', text: 'prompt' })).toThrow()
    expect(() => petCommandSchema.parse({ id: ids.feed, type: 'feed', foodId: 'token' })).toThrow()
    expect(() => petCommandSchema.parse({ id: ids.clear, type: 'clear-diary-history', scope: 'all' })).toThrow()
    expect(() => petCommandSchema.parse({
      id: ids.story, type: 'record-story-outcome', storyId: 'custom', outcome: 'success',
    })).toThrow()
    expect(() => petCommandSchema.parse({
      id: ids.pet, type: 'settle-work-turn', reason: 'completed', workMinutes: 1,
    })).toThrow()
  })

  it('persists one pet interaction and makes an exact retry idempotent', () => {
    const first = applyPetCommand(createPetSave(1), { id: ids.pet, type: 'pet' }, 1_700_000_000_000)
    expect(first.applied).toBe(true)
    expect(first.state.revision).toBe(1)
    expect(first.state.memories.totalInteractions).toBe(1)
    expect(first.state.pet.stats.affection).toBe(11)
    expect(first.state).not.toHaveProperty('processedCommands')
    expect(first.state).not.toHaveProperty('policy')

    const retry = applyPetCommand(first.save as ReturnType<typeof createPetSave>, { id: ids.pet, type: 'pet' }, 1_700_000_000_001)
    expect(retry.applied).toBe(false)
    expect(retry.reason).toBe('duplicate')
    expect(retry.state.revision).toBe(1)
    expect(retry.state.memories.totalInteractions).toBe(1)
  })

  it('keeps plain rice available and applies a persisted feed cooldown', () => {
    const first = applyPetCommand(createPetSave(1), { id: ids.feed, type: 'feed', foodId: 'plain_rice' }, 1_700_000_000_000)
    expect(first.applied).toBe(true)
    expect(first.state.inventory.plain_rice).toBe(1)
    expect(first.state.memories.totalFeedCount).toBe(1)

    const second = applyPetCommand(first.save as ReturnType<typeof createPetSave>, {
      id: '00000000-0000-4000-8000-000000000004', type: 'feed', foodId: 'plain_rice',
    }, 1_700_000_000_001)
    expect(second.applied).toBe(false)
    expect(second.reason).toBe('cooldown')
    expect(second.state.memories.totalFeedCount).toBe(1)
    expect(second.state.revision).toBe(2)
  })

  it('records only bounded enum story outcomes and enforces the daily Host cap', () => {
    let save = createPetSave(1)
    for (let index = 0; index < 21; index += 1) {
      const id = `10000000-0000-4000-8000-${index.toString().padStart(12, '0')}`
      const result = applyPetCommand(save, {
        id, type: 'record-story-outcome', storyId: 'butterfly', outcome: 'miss',
      }, 1_700_000_000_000 + index)
      if (index < 20) expect(result.applied).toBe(true)
      else expect(result.reason).toBe('rate-limited')
      save = result.save as ReturnType<typeof createPetSave>
    }
    expect(save.memories.totalStoryOutcomes).toBe(20)
    expect(save.memories.storyMemory.butterfly?.count).toBe(20)
    expect(save.memories.storyMemory.butterfly?.consecutiveMisses).toBe(2)
    expect(save.revision).toBe(21)
  })

  it('resets the persisted butterfly miss streak after a success', () => {
    const first = applyPetCommand(createPetSave(1), {
      id: ids.story, type: 'record-story-outcome', storyId: 'butterfly', outcome: 'miss',
    }, 1_700_000_000_000)
    const second = applyPetCommand(first.save as ReturnType<typeof createPetSave>, {
      id: '00000000-0000-4000-8000-000000000005',
      type: 'record-story-outcome', storyId: 'butterfly', outcome: 'success',
    }, 1_700_000_000_001)
    expect(first.state.memories.storyMemory.butterfly?.consecutiveMisses).toBe(1)
    expect(second.state.memories.storyMemory.butterfly?.consecutiveMisses).toBe(0)
  })

  it('records a nap outcome without inventing butterfly-only miss state', () => {
    const result = applyPetCommand(createPetSave(1), {
      id: ids.story, type: 'record-story-outcome', storyId: 'nap', outcome: 'seen',
    }, 1_700_000_000_000)
    expect(result.applied).toBe(true)
    expect(result.state.memories.storyMemory.nap?.stage).toBe('seen')
    expect(result.state.memories.storyMemory.nap).not.toHaveProperty('consecutiveMisses')
  })

  it('persists causal markers and a seven-active-day lifetime for the rice continuation chain', () => {
    const riceAt = new Date(2026, 7, 19, 10).getTime()
    const bowlAt = new Date(2026, 7, 20, 10).getTime()
    const mealAt = new Date(2026, 7, 21, 10).getTime()
    const rice = applyPetCommand(createPetSave(1), {
      id: '20000000-0000-4000-8000-000000000001',
      type: 'record-story-outcome', storyId: 'rice_caught', outcome: 'caught_by_user',
    }, riceAt)
    expect(rice.state.memories.storyMemory.rice_caught).toMatchObject({
      updatedAt: riceAt, updatedOnActiveDayOrdinal: 1, expiresOnActiveDayOrdinal: 8,
    })

    const bowl = applyPetCommand(rice.save as ReturnType<typeof createPetSave>, {
      id: '20000000-0000-4000-8000-000000000002',
      type: 'record-story-outcome', storyId: 'bowl_accident', outcome: 'completed',
    }, bowlAt)
    expect(bowl.state.memories.storyMemory.bowl_accident).toMatchObject({
      updatedOnActiveDayOrdinal: 2,
      triggeredByUpdatedAt: riceAt,
      expiresOnActiveDayOrdinal: 9,
    })

    const meal = applyPetCommand(bowl.save as ReturnType<typeof createPetSave>, {
      id: '20000000-0000-4000-8000-000000000003',
      type: 'record-story-outcome', storyId: 'recovery_meal', outcome: 'completed',
    }, mealAt)
    expect(meal.state.memories.storyMemory.recovery_meal).toMatchObject({
      updatedOnActiveDayOrdinal: 3,
      triggeredByUpdatedAt: bowlAt,
      expiresOnActiveDayOrdinal: 10,
    })
  })

  it('clears dated diary and story history without resetting the relationship or trusted receipts', () => {
    const save = createPetSave(1)
    save.pet.stats.affection = 48
    save.memories.activeDays = ['2026-08-20', '2026-08-21']
    save.memories.totalWorkMinutes = 91
    save.memories.completedTurns = 7
    save.achievements.first_meal = { unlockedAt: 10 }
    save.daily['2026-08-21'] = {
      interactions: 2, feeds: 1, completedTurns: 3, storyOutcomes: 1, workMinutes: 42,
    }
    save.monthly['2026-07'] = {
      activeDays: 5, interactions: 4, feeds: 2, completedTurns: 9, storyOutcomes: 3, workMinutes: 120,
    }
    save.memories.storyMemory.nap = {
      stage: 'seen', count: 1, updatedAt: 20, updatedOnActiveDayOrdinal: 2,
    }
    save.policy.storyOutcomeDay = '2026-08-21'
    save.policy.storyOutcomesToday = 2
    save.processedCommands.push('session:session-a:4')

    const result = applyPetCommand(save, { id: ids.clear, type: 'clear-diary-history' }, 1_777_000_000_000)
    expect(result.applied).toBe(true)
    expect(result.state.daily).toEqual({})
    expect(result.state.monthly).toEqual({})
    expect(result.state.memories.storyMemory).toEqual({})
    expect(result.state.pet.stats.affection).toBe(48)
    expect(result.state.memories.activeDays).toEqual(['2026-08-20', '2026-08-21'])
    expect(result.state.memories.totalWorkMinutes).toBe(91)
    expect(result.state.memories.completedTurns).toBe(7)
    expect(result.state.achievements.first_meal).toEqual({ unlockedAt: 10 })
    const stored = result.save as ReturnType<typeof createPetSave>
    expect(stored.policy.storyOutcomesToday).toBe(2)
    expect(stored.processedCommands).toContain('session:session-a:4')

    const retry = applyPetCommand(stored, { id: ids.clear, type: 'clear-diary-history' }, 1_777_000_000_001)
    expect(retry.applied).toBe(false)
    expect(retry.reason).toBe('duplicate')
    expect(retry.state.revision).toBe(result.state.revision)
  })

  it('settles a trusted completed turn once and keeps Browser commands unable to forge it', () => {
    const settlement = {
      receiptId: 'session:session-a:17',
      reason: 'completed' as const,
      endedAt: 1_700_000_000_000,
      workMinutes: 42,
    }
    const first = applyWorkTurnSettlement(createPetSave(1), settlement)
    expect(first.applied).toBe(true)
    expect(first.state.memories.completedTurns).toBe(1)
    expect(first.state.memories.turnEndCounts.completed).toBe(1)
    expect(first.state.memories.totalWorkMinutes).toBe(42)
    expect(first.state.memories.longestSessionMinutes).toBe(42)
    expect(Object.values(first.state.daily)[0]).toMatchObject({ completedTurns: 1, workMinutes: 42 })
    expect(first.state.pet.expressionWeights.workBond).toBe(2)
    expect(first.state.pet.stats.hunger).toBe(68)
    expect(first.state.pet.stats.energy).toBe(79)

    const retry = applyWorkTurnSettlement(first.save as ReturnType<typeof createPetSave>, settlement)
    expect(retry.applied).toBe(false)
    expect(retry.reason).toBe('duplicate')
    expect(retry.state.revision).toBe(1)
    expect(retry.state.memories.completedTurns).toBe(1)
  })

  it('counts every supported turn reason without treating failure as a completed turn', () => {
    const failed = applyWorkTurnSettlement(createPetSave(1), {
      receiptId: 'session:session-b:9',
      reason: 'max-tokens',
      endedAt: 1_700_000_000_000,
      workMinutes: 0,
    })
    expect(failed.state.memories.completedTurns).toBe(0)
    expect(failed.state.memories.turnEndCounts.maxTokens).toBe(1)
    expect(failed.state.pet.expressionWeights.workBond).toBe(1)
    expect(failed.state.pet.stats.mood).toBe(70)
  })
})
