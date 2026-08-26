import { describe, expect, it } from 'vitest'
import {
  compactPetSave,
  createPetSave,
  migratePetSave,
  petSaveV1Schema,
  snapshotPetSave,
} from './pet-save.ts'

describe('PetSave v1', () => {
  it('creates a strict bounded profile-local save', () => {
    const save = createPetSave(1_700_000_000_000)
    expect(save.schemaVersion).toBe(1)
    expect(save.pet.stats).toEqual({ hunger: 70, mood: 70, affection: 10, energy: 80 })
    expect(save.inventory).toEqual({ plain_rice: 1 })
    expect(() => petSaveV1Schema.parse({ ...save, prompt: 'secret' })).toThrow()
    expect(() => petSaveV1Schema.parse({
      ...save,
      inventory: { ...save.inventory, arbitrary: 1 },
    })).toThrow()
  })

  it('migrates the controlled v0 shape and trims command receipts', () => {
    const processedCommands = Array.from({ length: 300 }, (_, index) =>
      `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`)
    const save = migratePetSave({
      schemaVersion: 0,
      revision: 7,
      createdAt: 123,
      hunger: 42,
      mood: 51,
      affection: 19,
      energy: 80,
      totalInteractions: 12,
      totalFeedCount: 3,
      processedCommands,
    })
    expect(save.schemaVersion).toBe(1)
    expect(save.revision).toBe(7)
    expect(save.pet.stats.hunger).toBe(42)
    expect(save.processedCommands).toHaveLength(256)
    expect(save.processedCommands.at(-1)).toBe(processedCommands.at(-1))
  })

  it('folds daily history, bounds stories and keeps newest unique receipts', () => {
    const save = createPetSave(1)
    for (let index = 1; index <= 100; index += 1) {
      const day = new Date(Date.UTC(2026, 0, index)).toISOString().slice(0, 10)
      save.daily[day] = { interactions: 1, feeds: 1, completedTurns: 1, storyOutcomes: 1, workMinutes: 1 }
      save.memories.activeDays.push(day)
    }
    for (let index = 0; index < 20; index += 1) {
      save.memories.storyMemory.butterfly = {
        stage: 'seen', count: index, updatedAt: index, updatedOnActiveDayOrdinal: index,
      }
    }
    const receipt = '00000000-0000-4000-8000-000000000001'
    save.processedCommands = [receipt, receipt]
    const compact = compactPetSave(save)
    expect(Object.keys(compact.daily)).toHaveLength(90)
    expect(Object.values(compact.monthly).reduce((sum, month) => sum + month.activeDays, 0)).toBe(10)
    expect(compact.memories.activeDays).toHaveLength(100)
    expect(compact.processedCommands).toEqual([receipt])
  })

  it('returns a detached deeply frozen Storage Domain snapshot', () => {
    const source = createPetSave(1)
    const snapshot = snapshotPetSave(source)
    source.pet.stats.hunger = 1
    expect(snapshot.pet.stats.hunger).toBe(70)
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.pet.stats)).toBe(true)
  })
})
