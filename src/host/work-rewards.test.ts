import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { describe, expect, it, vi } from 'vitest'
import type { WorkTurnSettlement } from '../domain/commands.ts'
import { WorkRewardTracker, workReceiptId } from './work-rewards.ts'

function event<T extends SessionEvent['type']>(
  seq: number,
  time: number,
  type: T,
  data: Extract<SessionEvent, { type: T }>['data'],
): Extract<SessionEvent, { type: T }> {
  return { seq, time, type, data } as Extract<SessionEvent, { type: T }>
}

describe('WorkRewardTracker', () => {
  it('uses committed session receipts and counts overlapping turns as one union interval', async () => {
    const settlements: WorkTurnSettlement[] = []
    const store = {
      settleWorkTurn: vi.fn((settlement: WorkTurnSettlement) => {
        settlements.push(settlement)
        return Promise.resolve({ applied: true })
      }),
    }
    const tracker = new WorkRewardTracker(store as never)
    const first = { id: 'session-a' as never }
    const second = { id: 'session-b' as never }

    tracker.observe(first, event(1, 0, 'turn/start', { turn: 1 }))
    tracker.observe(second, event(2, 30_000, 'turn/start', { turn: 1 }))
    tracker.observe(first, event(3, 60_000, 'turn/end', { turn: 1, reason: { kind: 'completed' } }))
    tracker.observe(second, event(4, 120_000, 'turn/end', {
      turn: 1,
      reason: { kind: 'blocked' },
    }))
    await tracker.drain()

    expect(settlements).toHaveLength(2)
    expect(settlements[0]).toMatchObject({ reason: 'completed', workMinutes: 0 })
    expect(settlements[1]).toMatchObject({ reason: 'blocked', workMinutes: 2 })
    expect(settlements[1]?.receiptId).toBe(workReceiptId('session-b', 4))
  })

  it('records a committed end even when the plugin attached after its start', async () => {
    const settlements: WorkTurnSettlement[] = []
    const tracker = new WorkRewardTracker({
      settleWorkTurn: (settlement: WorkTurnSettlement) => {
        settlements.push(settlement)
        return Promise.resolve({ applied: true })
      },
    } as never)
    tracker.observe({ id: 'late-session' as never }, event(8, 9_000, 'turn/end', {
      turn: 2,
      reason: { kind: 'interrupted' },
    }))
    await tracker.drain()
    expect(settlements).toEqual([{
      receiptId: 'session:late-session:8',
      reason: 'interrupted',
      endedAt: 9_000,
      workMinutes: 0,
    }])
  })
})
