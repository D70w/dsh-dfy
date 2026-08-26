export type OfficialBalanceStatus = 'loading' | 'ready' | 'unconfigured' | 'unavailable'

export interface OfficialBalanceState {
  status: OfficialBalanceStatus
  isAvailable?: boolean
  currency?: 'CNY' | 'USD'
  totalBalance?: number
  grantedBalance?: number
  toppedUpBalance?: number
  fetchedAt?: number
  stale?: boolean
}

export interface DeepSeekBalancePayload {
  is_available?: unknown
  balance_infos?: unknown
}

/** Keep only the small non-secret balance projection the desktop pet needs. */
export function normalizeDeepSeekBalance(
  payload: DeepSeekBalancePayload,
  fetchedAt = Date.now(),
): OfficialBalanceState {
  if (!Array.isArray(payload.balance_infos)) throw new Error('balance_infos is missing')
  const rows = payload.balance_infos.filter((row): row is Record<string, unknown> => (
    row !== null && typeof row === 'object'
  ))
  const selected = rows.find(row => row.currency === 'CNY') ?? rows[0]
  if (selected === undefined) throw new Error('balance_infos is empty')
  const currency = selected.currency === 'USD' ? 'USD' : selected.currency === 'CNY' ? 'CNY' : undefined
  if (currency === undefined) throw new Error('balance currency is invalid')
  return {
    status: 'ready',
    isAvailable: payload.is_available === true,
    currency,
    totalBalance: nonNegativeAmount(selected.total_balance),
    grantedBalance: nonNegativeAmount(selected.granted_balance),
    toppedUpBalance: nonNegativeAmount(selected.topped_up_balance),
    fetchedAt,
  }
}

function nonNegativeAmount(value: unknown): number {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('balance amount is invalid')
  return amount
}
