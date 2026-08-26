import { describe, expect, it } from 'vitest'
import {
  BILLING_RATES,
  billingSummaryForDay,
  createLocalBillingState,
  estimatedBalanceCny,
  ingestSessionUsage,
  recentBillingHours,
  usageCostCny,
} from './billing.ts'

describe('local token billing', () => {
  it('prices cache hits, misses, writes and output independently', () => {
    expect(usageCostCny({
      cacheReadTokens: 1_000_000,
      uncachedInputTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
      outputTokens: 1_000_000,
    }, BILLING_RATES['deepseek-v4-flash'])).toBeCloseTo(4.02)
  })

  it('baselines an existing session and records only later positive deltas', () => {
    const state = createLocalBillingState()
    const at = new Date(2026, 7, 25, 14, 30)
    ingestSessionUsage(state, [{
      sessionId: 'session-1', cacheReadTokens: 400, uncachedInputTokens: 600,
      cacheWriteTokens: 0, outputTokens: 100,
    }], BILLING_RATES['deepseek-v4-flash'], at)
    expect(state.hourly).toEqual({})

    ingestSessionUsage(state, [{
      sessionId: 'session-1', cacheReadTokens: 1_400, uncachedInputTokens: 2_600,
      cacheWriteTokens: 0, outputTokens: 600,
    }], BILLING_RATES['deepseek-v4-flash'], at)
    const summary = billingSummaryForDay(state, '2026-08-25')
    expect(summary).toMatchObject({
      cacheReadTokens: 1_000,
      uncachedInputTokens: 2_000,
      outputTokens: 500,
      requests: 1,
    })
    expect(summary.costCny).toBeCloseTo((1_000 * 0.02 + 2_000 * 1 + 500 * 2) / 1_000_000)
  })

  it('does not double count an unchanged stream usage sample', () => {
    const state = createLocalBillingState()
    const at = new Date(2026, 7, 25, 9)
    const baseline = { sessionId: 'session-1', cacheReadTokens: 0, uncachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0 }
    const completed = { ...baseline, cacheReadTokens: 800, uncachedInputTokens: 200, outputTokens: 300 }
    ingestSessionUsage(state, [baseline], BILLING_RATES['deepseek-v4-flash'], at)
    ingestSessionUsage(state, [completed], BILLING_RATES['deepseek-v4-flash'], at)
    ingestSessionUsage(state, [completed], BILLING_RATES['deepseek-v4-flash'], at)
    expect(billingSummaryForDay(state, '2026-08-25').requests).toBe(1)
  })

  it('keeps hourly rows and derives an estimated remaining balance', () => {
    const state = createLocalBillingState()
    const zero = { sessionId: 'session-1', cacheReadTokens: 0, uncachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0 }
    ingestSessionUsage(state, [zero], BILLING_RATES['deepseek-v4-pro'], new Date(2026, 7, 25, 10))
    ingestSessionUsage(state, [{ ...zero, uncachedInputTokens: 1_000_000 }], BILLING_RATES['deepseek-v4-pro'], new Date(2026, 7, 25, 10))
    ingestSessionUsage(state, [{ ...zero, uncachedInputTokens: 2_000_000 }], BILLING_RATES['deepseek-v4-pro'], new Date(2026, 7, 25, 11))
    expect(recentBillingHours(state).map(row => row.hour)).toEqual(['2026-08-25T11', '2026-08-25T10'])
    expect(estimatedBalanceCny(11.05, state)).toBeCloseTo(5.05)
  })
})
