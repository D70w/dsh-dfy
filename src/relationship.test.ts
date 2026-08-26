import { describe, expect, it } from 'vitest'
import { createPetSave } from './domain/pet-save.ts'
import { toPetView } from './domain/commands.ts'
import { relationshipProfile, relationshipReactionVariant } from './relationship.ts'

describe('relationship progression', () => {
  it.each([
    [0, 'newcomer', false, 120],
    [19, 'newcomer', false, 120],
    [20, 'familiar', true, 120],
    [40, 'close', true, 112],
    [60, 'trusted', true, 104],
    [80, 'old-friend', true, 96],
    [100, 'old-friend', true, 96],
  ] as const)('maps affection %i to %s', (affection, stage, automatic, clearance) => {
    expect(relationshipProfile(affection)).toMatchObject({
      stage, automaticCursorVisit: automatic, cursorClearancePx: clearance,
    })
  })

  it('uses persisted expression weights only to unlock authored warm variants', () => {
    const save = createPetSave(1)
    let view = toPetView(save)
    expect(relationshipReactionVariant('pet', view)).toBe('default')
    save.pet.expressionWeights.interactionWarmth = 8
    view = toPetView(save)
    expect(relationshipReactionVariant('pet', view)).toBe('warm')
    expect(relationshipReactionVariant('completed', view)).toBe('default')
    save.pet.expressionWeights.workBond = 12
    expect(relationshipReactionVariant('completed', toPetView(save))).toBe('warm')
  })
})
