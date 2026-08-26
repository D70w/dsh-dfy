import { describe, expect, it } from 'vitest'
import { createBowlAccidentEpisode, createRecoveryMealEpisode, createRiceEpisode, phaseDuration } from '../autonomy.ts'
import { riceBowlPose } from './WhaleRiceBowl.tsx'

describe('riceBowlPose', () => {
  it('counter-translates the prop so it stays fixed while the whale approaches', () => {
    const rice = createRiceEpisode(3, 1_000)
    const attempt = { ...rice, phase: 'attempt' as const, phaseStartedAt: 2_000 }
    const start = riceBowlPose(attempt, 2_000)
    const end = riceBowlPose(attempt, 2_000 + phaseDuration('attempt', rice.story))
    const startCharacterX = -16
    const endCharacterX = -58
    expect(start.x + startCharacterX).toBeCloseTo(-76, 6)
    expect(end.x + endCharacterX).toBeCloseTo(-76, 6)
    expect(end.opacity).toBe(1)
  })

  it('tilts and fades the independent bowl after being caught', () => {
    const caught = {
      ...createRiceEpisode(3, 1_000),
      phase: 'recover' as const,
      phaseStartedAt: 2_000,
      outcome: 'caught_by_user' as const,
    }
    const pose = riceBowlPose(caught, 2_000 + phaseDuration('recover', caught.story) / 2)
    expect(pose.rotation).toBeGreaterThan(5)
    expect(pose.opacity).toBeLessThan(1)
  })

  it('tips the same independent bowl for the accident and restores it for the recovery meal', () => {
    const accident = { ...createBowlAccidentEpisode(4, 1_000), phase: 'result' as const, phaseStartedAt: 2_000 }
    const tipped = riceBowlPose(accident, 2_000 + phaseDuration('result', accident.story))
    expect(tipped.rotation).toBeGreaterThan(60)
    expect(tipped.y).toBeGreaterThan(25)

    const recovery = { ...createRecoveryMealEpisode(5, 3_000), phase: 'intend' as const, phaseStartedAt: 4_000 }
    const restored = riceBowlPose(recovery, 4_000 + phaseDuration('intend', recovery.story))
    expect(restored.rotation).toBeCloseTo(0, 6)
    expect(restored.y).toBe(18)
  })
})
