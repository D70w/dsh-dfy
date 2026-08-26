import { useCallback, useEffect, useRef, useState } from 'react'
import { WHALE_BALANCE_PATH } from '../api-paths.ts'
import type { OfficialBalanceState } from '../balance.ts'

const MIN_REFRESH_MS = 60_000

function parseBalance(value: unknown): OfficialBalanceState {
  if (value === null || typeof value !== 'object') return { status: 'unavailable' }
  const row = value as Record<string, unknown>
  if (row.status === 'unconfigured') return { status: 'unconfigured' }
  if (row.status !== 'ready') return { status: 'unavailable' }
  const totalBalance = Number(row.totalBalance)
  const grantedBalance = Number(row.grantedBalance)
  const toppedUpBalance = Number(row.toppedUpBalance)
  const fetchedAt = Number(row.fetchedAt)
  if (![totalBalance, grantedBalance, toppedUpBalance, fetchedAt].every(Number.isFinite)) {
    return { status: 'unavailable' }
  }
  return {
    status: 'ready',
    isAvailable: row.isAvailable === true,
    currency: row.currency === 'USD' ? 'USD' : 'CNY',
    totalBalance,
    grantedBalance,
    toppedUpBalance,
    fetchedAt,
  }
}

/** Periodically refresh the Host-proxied official balance without exposing the DSH credential. */
export function useOfficialBalance(refreshMinutes = 10): OfficialBalanceState & { refresh(): Promise<void> } {
  const [state, setState] = useState<OfficialBalanceState>({ status: 'loading' })
  const mounted = useRef(true)
  const inFlight = useRef<Promise<void>>()
  const lastAttemptAt = useRef(0)

  const refresh = useCallback(async (force = false): Promise<void> => {
    if (!force && Date.now() - lastAttemptAt.current < MIN_REFRESH_MS) return
    if (inFlight.current !== undefined) return inFlight.current
    lastAttemptAt.current = Date.now()
    const operation = (async () => {
      try {
        const response = await fetch(WHALE_BALANCE_PATH, {
          credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10_000),
        })
        const next = parseBalance(await response.json().catch(() => undefined))
        if (!mounted.current) return
        if (response.ok || next.status === 'unconfigured') {
          setState(next)
        } else {
          setState(previous => previous.status === 'ready'
            ? { ...previous, stale: true }
            : { status: 'unavailable' })
        }
      } catch {
        if (!mounted.current) return
        setState(previous => previous.status === 'ready'
          ? { ...previous, stale: true }
          : { status: 'unavailable' })
      }
    })().finally(() => { inFlight.current = undefined })
    inFlight.current = operation
    return operation
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh(true)
    const interval = window.setInterval(
      () => { void refresh(true) },
      Math.max(1, refreshMinutes) * 60_000,
    )
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mounted.current = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh, refreshMinutes])

  return { ...state, refresh: () => refresh(true) }
}
