import { describe, expect, it } from 'vitest'
import { createButterflyEpisode, createCursorVisitEpisode, createRiceEpisode, phaseDuration } from '../autonomy.ts'
import { characterMotionPose } from './character-motion.ts'

describe('characterMotionPose', () => {
  it('reuses run for butterfly chase and return-home with opposite facing', () => {
    const base = createButterflyEpisode(0, 1_000, 2, 'manual')
    const chase = characterMotionPose({ ...base, phase: 'intend', phaseStartedAt: 2_000 }, 2_300)
    const home = characterMotionPose({ ...base, phase: 'return-home', phaseStartedAt: 3_000 }, 3_200)

    expect(chase.clip).toBe('run')
    expect(chase.facing).toBe('left')
    expect(home.clip).toBe('run')
    expect(home.facing).toBe('right')
  })

  it('uses only the approved run and ready poses until jump art is accepted', () => {
    const base = { ...createButterflyEpisode(0, 1_000, 2), phase: 'attempt' as const, phaseStartedAt: 2_000 }
    const duration = phaseDuration('attempt', 'butterfly')
    expect(characterMotionPose(base, 2_000 + duration * 0.2).clip).toBe('run')
    expect(characterMotionPose(base, 2_000 + duration * 0.5).clip).toBe('run')
    expect(characterMotionPose(base, 2_000 + duration * 0.8).clip).toBe('run')

    const landing = { ...base, phase: 'result' as const, phaseStartedAt: 3_000 }
    expect(characterMotionPose(landing, 3_050).clip).toBe('ready')
  })

  it('uses the same run clip when a cursor visit returns to its workstation', () => {
    const visit = createCursorVisitEpisode(1, 1_000, { x: -120, y: 20 }, 'manual')
    const pose = characterMotionPose({ ...visit, phase: 'return-home', phaseStartedAt: 2_000 }, 2_350)
    expect(pose.clip).toBe('run')
    expect(pose.facing).toBe('right')
    expect(pose.offset.x).toBeGreaterThan(-120)
    expect(pose.offset.x).toBeLessThan(0)
  })

  it('keeps gait phase continuous across outward story phase boundaries', () => {
    const base = createButterflyEpisode(0, 1_000, 2)
    const intend = { ...base, phase: 'intend' as const, phaseStartedAt: 2_000 }
    const attempt = { ...base, phase: 'attempt' as const, phaseStartedAt: 3_000 }
    const atIntendEnd = characterMotionPose(intend, 2_000 + phaseDuration('intend', 'butterfly'))
    const atAttemptStart = characterMotionPose(attempt, 3_000)
    expect(atAttemptStart.clipElapsedMs).toBeCloseTo(atIntendEnd.clipElapsedMs, 6)
  })

  it('advances exactly one realtime keyframe cycle for one declared stride', () => {
    const visit = createCursorVisitEpisode(1, 1_000, { x: -88, y: 0 }, 'manual')
    const intend = { ...visit, phase: 'intend' as const, phaseStartedAt: 2_000 }
    const pose = characterMotionPose(intend, 2_000 + phaseDuration('intend', 'cursor_visit'))
    expect(pose.offset.x).toBe(-22)
    expect(pose.clipElapsedMs).toBe(900)
  })

  it('holds the stable ready pose when a cursor visit arrives', () => {
    const visit = createCursorVisitEpisode(1, 1_000, { x: -120, y: 20 }, 'manual')
    const pose = characterMotionPose({ ...visit, phase: 'result', phaseStartedAt: 2_000 }, 2_250)
    expect(pose.clip).toBe('ready')
    expect(pose.offset).toEqual({ x: -120, y: 20 })
  })

  it('reuses the run cycle for a rice approach and exposes feeding at the bowl', () => {
    const rice = createRiceEpisode(3, 1_000)
    const attempt = characterMotionPose({ ...rice, phase: 'attempt', phaseStartedAt: 2_000 }, 2_410)
    expect(attempt.clip).toBe('run')
    expect(attempt.facing).toBe('left')
    expect(attempt.offset.x).toBeLessThan(-16)

    const eating = characterMotionPose({ ...rice, phase: 'result', phaseStartedAt: 3_000 }, 3_300)
    expect(eating.clip).toBeUndefined()
    expect(eating.offset).toEqual({ x: -58, y: 0 })

    const returning = characterMotionPose({ ...rice, phase: 'return-home', phaseStartedAt: 4_000 }, 4_360)
    expect(returning.clip).toBe('run')
    expect(returning.facing).toBe('right')
    expect(returning.offset.x).toBeGreaterThan(-58)
  })
})
