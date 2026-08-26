import { describe, expect, it } from 'vitest'
import { fallbackStateFor, resolveBehavior } from './behavior.ts'
import {
  createBowlAccidentEpisode,
  createButterflyEpisode,
  createCursorVisitEpisode,
  createNapEpisode,
  createRecoveryMealEpisode,
  createRiceEpisode,
} from './autonomy.ts'

const idleActivity = { mode: 'idle', reaction: 'none', reactionSeq: -1 } as const

describe('whale behavior priority', () => {
  it('lets direct interaction preempt results and work', () => {
    expect(resolveBehavior({
      interaction: 'feed',
      activity: { mode: 'tool', reaction: 'completed', reactionSeq: 9 },
      liveReaction: 'completed',
    })).toBe('feeding')
  })

  it('orders one-shot results before active Harness work', () => {
    expect(resolveBehavior({
      interaction: 'none', activity: { ...idleActivity, mode: 'thinking' }, liveReaction: 'completed',
    })).toBe('smug')
    expect(resolveBehavior({
      interaction: 'none', activity: { ...idleActivity, mode: 'tool' }, liveReaction: 'error',
    })).toBe('denying')
  })

  it('maps every richer action to one of the four guaranteed fallback poses', () => {
    expect(fallbackStateFor('idle')).toBe('idle')
    expect(fallbackStateFor('tool')).toBe('working')
    expect(fallbackStateFor('feeding')).toBe('smug')
    expect(fallbackStateFor('petting')).toBe('denying')
  })

  it('shows autonomy below real work and maps the result to a character reaction', () => {
    const butterfly = { ...createButterflyEpisode(1, 0, 0), phase: 'result' as const, outcome: 'success' as const }
    expect(resolveBehavior({ interaction: 'none', activity: undefined, liveReaction: 'none', autonomy: butterfly })).toBe('smug')
    expect(resolveBehavior({
      interaction: 'none',
      activity: { mode: 'thinking', reaction: 'none', reactionSeq: -1 },
      liveReaction: 'none',
      autonomy: butterfly,
    })).toBe('working')
  })

  it('uses working motion while approaching the pointer and settles quietly beside it', () => {
    const visit = createCursorVisitEpisode(1, 0, { x: -80, y: 10 })
    expect(resolveBehavior({ interaction: 'none', activity: undefined, liveReaction: 'none', autonomy: visit })).toBe('working')
    expect(resolveBehavior({
      interaction: 'none', activity: undefined, liveReaction: 'none', autonomy: { ...visit, phase: 'result' },
    })).toBe('idle')
  })

  it('rests during a nap and uses denial only for the caught recovery', () => {
    const nap = createNapEpisode(2, 0)
    expect(resolveBehavior({ interaction: 'none', activity: undefined, liveReaction: 'none', autonomy: nap })).toBe('idle')
    expect(resolveBehavior({
      interaction: 'none', activity: undefined, liveReaction: 'none', autonomy: { ...nap, phase: 'recover', outcome: 'seen' },
    })).toBe('denying')
  })

  it('reuses feeding for rice and switches to denial only when caught', () => {
    const rice = createRiceEpisode(3, 0)
    expect(resolveBehavior({
      interaction: 'none', activity: undefined, liveReaction: 'none', autonomy: { ...rice, phase: 'result' },
    })).toBe('feeding')
    expect(resolveBehavior({
      interaction: 'none', activity: undefined, liveReaction: 'none',
      autonomy: { ...rice, phase: 'recover', outcome: 'caught_by_user' },
    })).toBe('denying')
    expect(resolveBehavior({
      interaction: 'none', activity: undefined, liveReaction: 'none', autonomy: { ...rice, phase: 'recover' },
    })).toBe('smug')
  })

  it('reuses authored actions for the bowl accident and next-day recovery meal', () => {
    const accident = createBowlAccidentEpisode(4, 0)
    const recovery = createRecoveryMealEpisode(5, 0)
    expect(resolveBehavior({
      interaction: 'none', activity: undefined, liveReaction: 'none',
      autonomy: { ...accident, phase: 'result' },
    })).toBe('denying')
    expect(resolveBehavior({
      interaction: 'none', activity: undefined, liveReaction: 'none',
      autonomy: { ...recovery, phase: 'result' },
    })).toBe('feeding')
    expect(resolveBehavior({
      interaction: 'none', activity: undefined, liveReaction: 'none',
      autonomy: { ...recovery, phase: 'recover' },
    })).toBe('smug')
  })
})
