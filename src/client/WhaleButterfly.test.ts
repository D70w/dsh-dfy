import { describe, expect, it } from 'vitest'
import { createButterflyEpisode, phaseDuration } from '../autonomy.ts'
import { butterflyPose } from './WhaleButterfly.tsx'

describe('butterflyPose', () => {
  it('flies independently across a wider path than the character chase', () => {
    const episode = { ...createButterflyEpisode(7, 1_000, 0), phase: 'attempt' as const, phaseStartedAt: 2_000 }
    const start = butterflyPose(episode, 2_000)
    const middle = butterflyPose(episode, 2_000 + phaseDuration('attempt') / 2)
    expect(start.x).toBeLessThan(-70)
    expect(Math.abs(middle.y - start.y)).toBeGreaterThan(2)
  })

  it('separates caught and escaped result paths', () => {
    const success = { ...createButterflyEpisode(0, 1_000, 2), phase: 'result' as const, phaseStartedAt: 2_000 }
    const miss = { ...success, outcome: 'miss' as const }
    const now = 2_000 + phaseDuration('result') / 2
    expect(butterflyPose(success, now).x).toBeGreaterThan(-40)
    expect(butterflyPose(miss, now).x).toBeLessThan(-120)
  })
})
