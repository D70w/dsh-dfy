import type { Session, SessionEvent, TurnEndReason } from '@deepseek-ai/dsh-session'
import type { WorkTurnSettlement } from '../domain/commands.ts'
import type { PetStore } from './pet-storage.ts'

type StoreSource = PetStore | Promise<PetStore>

function turnKey(sessionId: string, turn: number): string {
  return `${sessionId}\u0000${turn}`
}

export function workReceiptId(sessionId: string, seq: number): string {
  return `session:${encodeURIComponent(sessionId)}:${seq}`
}

export function supportedTurnReason(reason: TurnEndReason): WorkTurnSettlement['reason'] | undefined {
  switch (reason.kind) {
    case 'completed':
    case 'error':
    case 'blocked':
    case 'max-tokens':
    case 'aborted':
    case 'interrupted':
      return reason.kind
    default:
      return undefined
  }
}

/**
 * Host-side observer for committed turn boundaries. Concurrent turns share
 * one global work interval so overlapping sessions are never double-counted.
 */
export class WorkRewardTracker {
  private readonly activeTurns = new Map<string, number>()
  private intervalStartedAt: number | undefined
  private tail: Promise<void> = Promise.resolve()

  constructor(
    private readonly source: StoreSource,
    private readonly onError: (error: unknown) => void = () => {},
  ) {}

  observe(session: Pick<Session, 'id'>, event: SessionEvent): void {
    if (event.type === 'turn/start') {
      const key = turnKey(session.id, event.data.turn)
      if (this.activeTurns.has(key)) return
      if (this.activeTurns.size === 0) this.intervalStartedAt = event.time
      this.activeTurns.set(key, event.time)
      return
    }
    if (event.type !== 'turn/end') return

    const key = turnKey(session.id, event.data.turn)
    const wasActive = this.activeTurns.delete(key)
    let workMinutes = 0
    if (wasActive && this.activeTurns.size === 0 && this.intervalStartedAt !== undefined) {
      const elapsed = Math.max(0, event.time - this.intervalStartedAt)
      workMinutes = Math.min(120, Math.floor(elapsed / 60_000))
      this.intervalStartedAt = undefined
    }
    const reason = supportedTurnReason(event.data.reason)
    if (reason === undefined) return
    const settlement: WorkTurnSettlement = {
      receiptId: workReceiptId(session.id, event.seq),
      reason,
      endedAt: event.time,
      workMinutes,
    }
    this.tail = this.tail
      .then(async () => { await (await this.source).settleWorkTurn(settlement) })
      .catch((error: unknown) => { this.onError(error) })
  }

  async drain(): Promise<void> {
    await this.tail
  }
}
