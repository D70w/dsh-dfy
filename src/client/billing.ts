export interface TokenUsageTotals {
  uncachedInputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    tokenUsage: TokenUsageTotals
  }
}

export interface SessionUsageSample extends TokenUsageTotals {
  sessionId: string
}

export type BillingPriceProfile = 'deepseek-v4-flash' | 'deepseek-v4-pro'

export interface BillingRates {
  cachedInputPerMillion: number
  uncachedInputPerMillion: number
  cacheWritePerMillion: number
  outputPerMillion: number
}

export interface BillingHour extends TokenUsageTotals {
  hour: string
  requests: number
  costCny: number
}

export interface LocalBillingState {
  sessionTotals: Record<string, TokenUsageTotals>
  hourly: Record<string, BillingHour>
}

export interface BillingSummary extends TokenUsageTotals {
  requests: number
  costCny: number
}

export const BILLING_RATES: Readonly<Record<BillingPriceProfile, BillingRates>> = Object.freeze({
  'deepseek-v4-flash': Object.freeze({
    cachedInputPerMillion: 0.02,
    uncachedInputPerMillion: 1,
    cacheWritePerMillion: 1,
    outputPerMillion: 2,
  }),
  'deepseek-v4-pro': Object.freeze({
    cachedInputPerMillion: 0.025,
    uncachedInputPerMillion: 3,
    cacheWritePerMillion: 3,
    outputPerMillion: 6,
  }),
})

const ZERO_USAGE: Readonly<TokenUsageTotals> = Object.freeze({
  uncachedInputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
})

export function createLocalBillingState(): LocalBillingState {
  return { sessionTotals: {}, hourly: {} }
}

export function normalizeUsage(value: Partial<TokenUsageTotals> | undefined): TokenUsageTotals {
  return {
    uncachedInputTokens: nonNegativeInteger(value?.uncachedInputTokens),
    cacheReadTokens: nonNegativeInteger(value?.cacheReadTokens),
    cacheWriteTokens: nonNegativeInteger(value?.cacheWriteTokens),
    outputTokens: nonNegativeInteger(value?.outputTokens),
  }
}

export function usageCostCny(usage: TokenUsageTotals, rates: BillingRates): number {
  return (
    usage.cacheReadTokens * rates.cachedInputPerMillion
    + usage.uncachedInputTokens * rates.uncachedInputPerMillion
    + usage.cacheWriteTokens * rates.cacheWritePerMillion
    + usage.outputTokens * rates.outputPerMillion
  ) / 1_000_000
}

/**
 * Fold cumulative DSH session meters into an hourly local ledger.
 * Existing sessions are baselined on first sight; later calls charge only positive deltas.
 */
export function ingestSessionUsage(
  state: LocalBillingState,
  samples: readonly SessionUsageSample[],
  rates: BillingRates,
  at = new Date(),
): boolean {
  let changed = false
  const hour = localHourKey(at)
  for (const sample of samples) {
    const current = normalizeUsage(sample)
    const previous = state.sessionTotals[sample.sessionId]
    state.sessionTotals[sample.sessionId] = current
    if (previous === undefined) {
      changed = true
      continue
    }
    const delta = usageDelta(previous, current)
    if (usageTokenCount(delta) === 0) continue
    const row = state.hourly[hour] ?? {
      hour,
      requests: 0,
      costCny: 0,
      ...ZERO_USAGE,
    }
    row.uncachedInputTokens += delta.uncachedInputTokens
    row.cacheReadTokens += delta.cacheReadTokens
    row.cacheWriteTokens += delta.cacheWriteTokens
    row.outputTokens += delta.outputTokens
    row.requests += 1
    row.costCny += usageCostCny(delta, rates)
    state.hourly[hour] = row
    changed = true
  }
  pruneSessionTotals(state, new Set(samples.map(sample => sample.sessionId)))
  pruneHours(state)
  return changed
}

export function billingSummaryForDay(state: LocalBillingState, day = localDayKey(new Date())): BillingSummary {
  return Object.values(state.hourly).reduce<BillingSummary>((summary, row) => {
    if (!row.hour.startsWith(`${day}T`)) return summary
    summary.uncachedInputTokens += row.uncachedInputTokens
    summary.cacheReadTokens += row.cacheReadTokens
    summary.cacheWriteTokens += row.cacheWriteTokens
    summary.outputTokens += row.outputTokens
    summary.requests += row.requests
    summary.costCny += row.costCny
    return summary
  }, { ...ZERO_USAGE, requests: 0, costCny: 0 })
}

export function recentBillingHours(state: LocalBillingState, limit = 24): BillingHour[] {
  return Object.values(state.hourly)
    .toSorted((left, right) => right.hour.localeCompare(left.hour))
    .slice(0, Math.max(0, limit))
}

export function estimatedBalanceCny(openingBalance: number, state: LocalBillingState): number {
  const spent = Object.values(state.hourly).reduce((sum, row) => sum + row.costCny, 0)
  return Math.max(0, finiteNonNegative(openingBalance) - spent)
}

export function localDayKey(at: Date): string {
  const year = at.getFullYear()
  const month = String(at.getMonth() + 1).padStart(2, '0')
  const day = String(at.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localHourKey(at: Date): string {
  return `${localDayKey(at)}T${String(at.getHours()).padStart(2, '0')}`
}

function usageDelta(previous: TokenUsageTotals, current: TokenUsageTotals): TokenUsageTotals {
  return {
    uncachedInputTokens: positiveDelta(previous.uncachedInputTokens, current.uncachedInputTokens),
    cacheReadTokens: positiveDelta(previous.cacheReadTokens, current.cacheReadTokens),
    cacheWriteTokens: positiveDelta(previous.cacheWriteTokens, current.cacheWriteTokens),
    outputTokens: positiveDelta(previous.outputTokens, current.outputTokens),
  }
}

function positiveDelta(previous: number, current: number): number {
  return current >= previous ? current - previous : 0
}

function usageTokenCount(usage: TokenUsageTotals): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens
}

function nonNegativeInteger(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0))
}

function finiteNonNegative(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

function pruneSessionTotals(state: LocalBillingState, active: ReadonlySet<string>): void {
  const ids = Object.keys(state.sessionTotals)
  if (ids.length <= 200) return
  for (const id of ids) {
    if (active.has(id)) continue
    delete state.sessionTotals[id]
    if (Object.keys(state.sessionTotals).length <= 160) break
  }
}

function pruneHours(state: LocalBillingState): void {
  const keys = Object.keys(state.hourly).toSorted()
  for (const key of keys.slice(0, Math.max(0, keys.length - 24 * 62))) delete state.hourly[key]
}
