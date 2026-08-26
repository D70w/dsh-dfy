import { describe, expect, it } from 'vitest'
import {
  AUTONOMY_DELAY_RANGE_MS,
  AUTONOMY_PHASES,
  advanceAutonomyEpisode,
  advanceButterflyEpisode,
  autonomyOffset,
  catchRiceEpisode,
  createBowlAccidentEpisode,
  createButterflyEpisode,
  createCursorVisitEpisode,
  createNapEpisode,
  createRiceEpisode,
  createRecoveryMealEpisode,
  influenceButterfly,
  nextAutonomyDelay,
  phaseDuration,
  returnCursorVisitHome,
  selectContinuationStory,
  shouldPersistAutonomyOutcome,
  wakeNapEpisode,
  type ButterflyEpisode,
} from './autonomy.ts'

describe('butterfly autonomy episode', () => {
  it('uses bounded deterministic scheduling and a complete cancellable phase chain', () => {
    const delay = nextAutonomyDelay(42)
    expect(delay).toBeGreaterThanOrEqual(AUTONOMY_DELAY_RANGE_MS.minimum)
    expect(delay).toBeLessThan(AUTONOMY_DELAY_RANGE_MS.minimum + AUTONOMY_DELAY_RANGE_MS.span)

    let now = 1000
    let episode: ButterflyEpisode | undefined = createButterflyEpisode(42, now, 0)
    const visited = [episode.phase]
    while (episode !== undefined) {
      now += phaseDuration(episode.phase)
      episode = advanceButterflyEpisode(episode, now)
      if (episode !== undefined) visited.push(episode.phase)
    }
    expect(visited).toEqual(AUTONOMY_PHASES)
  })

  it('lets one sampled pointer influence change the result without overriding failure protection', () => {
    const attempt = {
      ...createButterflyEpisode(2, 0, 0),
      phase: 'attempt' as const,
    }
    expect(influenceButterfly(attempt, 'assist').outcome).toBe('success')
    expect(influenceButterfly(attempt, 'startle').outcome).toBe('miss')

    const protectedAttempt = {
      ...createButterflyEpisode(2, 0, 2),
      phase: 'attempt' as const,
    }
    expect(protectedAttempt.guaranteedSuccess).toBe(true)
    expect(influenceButterfly(protectedAttempt, 'startle').outcome).toBe('success')
  })

  it('returns to the home anchor and keeps every offset inside a tiny local stage', () => {
    const base = createButterflyEpisode(7, 0, 0)
    for (const phase of AUTONOMY_PHASES) {
      const offset = autonomyOffset({ ...base, phase })
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(20)
      expect(Math.abs(offset.y)).toBeLessThanOrEqual(7)
    }
    expect(autonomyOffset(undefined)).toEqual({ x: 0, y: 0 })
    expect(autonomyOffset({ ...base, phase: 'return-home' })).toEqual({ x: 0, y: 0 })
  })

  it('moves a cursor visit through the shared cancellable phases and returns home', () => {
    const visit = createCursorVisitEpisode(9, 1_000, { x: -144, y: 24 })
    expect(autonomyOffset(visit)).toEqual({ x: 0, y: 0 })
    expect(autonomyOffset({ ...visit, phase: 'attempt' })).toEqual({ x: -101, y: 17 })
    expect(autonomyOffset({ ...visit, phase: 'result' })).toEqual({ x: -144, y: 24 })

    const returning = returnCursorVisitHome({ ...visit, phase: 'result' }, 2_000)
    expect(returning.phase).toBe('return-home')
    expect(returning.outcome).toBe('interrupted')
    expect(autonomyOffset(returning)).toEqual({ x: 0, y: 0 })
    expect(advanceAutonomyEpisode(returning, 2_000 + phaseDuration('return-home', 'cursor_visit'))).toBeUndefined()
  })

  it('does not turn an explicit summon into an autonomous daily story', () => {
    const automatic = createCursorVisitEpisode(1, 0, { x: -80, y: 0 })
    const manual = createCursorVisitEpisode(1, 0, { x: -80, y: 0 }, 'manual')
    expect(automatic.origin).toBe('automatic')
    expect(shouldPersistAutonomyOutcome(automatic)).toBe(true)
    expect(manual.origin).toBe('manual')
    expect(shouldPersistAutonomyOutcome(manual)).toBe(false)
  })

  it('does not persist a user-requested butterfly performance', () => {
    const automatic = createButterflyEpisode(0, 0, 0)
    const manual = createButterflyEpisode(0, 0, 2, 'manual')
    expect(automatic.origin).toBe('automatic')
    expect(shouldPersistAutonomyOutcome(automatic)).toBe(true)
    expect(manual.origin).toBe('manual')
    expect(manual.outcome).toBe('success')
    expect(shouldPersistAutonomyOutcome(manual)).toBe(false)
  })

  it('runs a quiet nap through the shared phases and supports an early seen recovery', () => {
    let now = 1_000
    let episode = createNapEpisode(2, now)
    const visited = [episode.phase]
    while (episode.phase !== 'result') {
      now += phaseDuration(episode.phase, episode.story)
      episode = advanceAutonomyEpisode(episode, now)!
      visited.push(episode.phase)
    }
    expect(visited).toEqual(['notice', 'intend', 'attempt', 'result'])
    expect(autonomyOffset(episode)).toEqual({ x: 0, y: 0 })

    const awake = wakeNapEpisode(episode, now + 100, 'seen')
    expect(awake.phase).toBe('recover')
    expect(awake.outcome).toBe('seen')
    expect(autonomyOffset(awake)).toEqual({ x: 0, y: 0 })
    expect(shouldPersistAutonomyOutcome(awake)).toBe(true)
  })

  it('runs a rice break from approach to return and branches when the user catches it', () => {
    const rice = createRiceEpisode(3, 1_000)
    expect(rice.origin).toBe('automatic')
    expect(rice.outcome).toBe('completed')
    expect(shouldPersistAutonomyOutcome(rice)).toBe(true)
    expect(autonomyOffset({ ...rice, phase: 'attempt' })).toEqual({ x: -58, y: 0 })

    const tooEarly = catchRiceEpisode(rice, 1_100)
    expect(tooEarly).toBe(rice)
    const caught = catchRiceEpisode({ ...rice, phase: 'result' }, 2_000)
    expect(caught.phase).toBe('recover')
    expect(caught.phaseStartedAt).toBe(2_000)
    expect(caught.outcome).toBe('caught_by_user')
  })

  it('turns one rice result into two ordered cross-active-day callbacks without replaying it', () => {
    const memory = {
      rice_caught: {
        updatedAt: 1_000,
        updatedOnActiveDayOrdinal: 3,
        expiresOnActiveDayOrdinal: 10,
      },
    }
    expect(selectContinuationStory(memory, 3)).toBeUndefined()
    expect(selectContinuationStory(memory, 4)).toBe('bowl_accident')

    const afterBowl = {
      ...memory,
      bowl_accident: {
        updatedAt: 2_000,
        updatedOnActiveDayOrdinal: 4,
        expiresOnActiveDayOrdinal: 11,
        triggeredByUpdatedAt: 1_000,
      },
    }
    expect(selectContinuationStory(afterBowl, 4)).toBeUndefined()
    expect(selectContinuationStory(afterBowl, 5)).toBe('recovery_meal')

    const complete = {
      ...afterBowl,
      recovery_meal: {
        updatedAt: 3_000,
        updatedOnActiveDayOrdinal: 5,
        expiresOnActiveDayOrdinal: 12,
        triggeredByUpdatedAt: 2_000,
      },
    }
    expect(selectContinuationStory(complete, 6)).toBeUndefined()
    expect(createBowlAccidentEpisode(4, 4_000).story).toBe('bowl_accident')
    expect(createRecoveryMealEpisode(5, 5_000).story).toBe('recovery_meal')
  })

  it('drops a continuation source after its seven-active-day window', () => {
    expect(selectContinuationStory({
      rice_caught: {
        updatedAt: 1_000,
        updatedOnActiveDayOrdinal: 2,
        expiresOnActiveDayOrdinal: 9,
      },
    }, 10)).toBeUndefined()
  })
})
