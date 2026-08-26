import { useEffect, useRef, useState } from 'react'

const LOCK_NAME = 'dsh-dfy:presentation'
const LEASE_KEY = 'dsh-dfy:presentation-lease-v1'
const LEASE_TTL_MS = 6_000
const HEARTBEAT_MS = 2_000

interface PresentationLease {
  tabId: string
  expiresAt: number
}

export interface PresentationLeadership {
  isLeader: boolean
  canPersistStories: boolean
  mode: 'locks' | 'lease' | 'disabled'
}

type LeaseStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function readLease(storage: LeaseStorage): PresentationLease | undefined {
  try {
    const raw = storage.getItem(LEASE_KEY)
    if (raw === null) return undefined
    const value = JSON.parse(raw) as Partial<PresentationLease>
    if (typeof value.tabId !== 'string' || typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt)) return undefined
    return { tabId: value.tabId, expiresAt: value.expiresAt }
  } catch {
    return undefined
  }
}

/** Claim or renew one short lease, then read it back to resolve racing writers. */
export function renewPresentationLease(storage: LeaseStorage, tabId: string, now: number): boolean {
  const current = readLease(storage)
  if (current !== undefined && current.tabId !== tabId && current.expiresAt > now) return false
  try {
    storage.setItem(LEASE_KEY, JSON.stringify({ tabId, expiresAt: now + LEASE_TTL_MS }))
    return readLease(storage)?.tabId === tabId
  } catch {
    return false
  }
}

export function releasePresentationLease(storage: LeaseStorage, tabId: string): void {
  try {
    if (readLease(storage)?.tabId === tabId) storage.removeItem(LEASE_KEY)
  } catch {
    // Storage is an optional browser capability; teardown remains best-effort.
  }
}

function randomTabId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function abortPromise(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
}

/** Select the only visible tab allowed to run noticeable autonomous stories. */
export function usePresentationLeader(enabled: boolean): PresentationLeadership {
  const tabId = useRef(randomTabId())
  const [leadership, setLeadership] = useState<PresentationLeadership>({
    isLeader: false,
    canPersistStories: false,
    mode: 'disabled',
  })
  const commit = (next: PresentationLeadership): void => {
    setLeadership(previous => previous.isLeader === next.isLeader
      && previous.canPersistStories === next.canPersistStories
      && previous.mode === next.mode
      ? previous
      : next)
  }

  useEffect(() => {
    if (!enabled) {
      commit({ isLeader: false, canPersistStories: false, mode: 'disabled' })
      return
    }

    let stopActive: (() => void) | undefined

    const stop = (): void => {
      stopActive?.()
      stopActive = undefined
    }

    const start = (): void => {
      stop()
      if (document.visibilityState === 'hidden') {
        commit({ isLeader: false, canPersistStories: false, mode: 'disabled' })
        return
      }

      if (navigator.locks !== undefined) {
        const controller = new AbortController()
        stopActive = () => controller.abort()
        commit({ isLeader: false, canPersistStories: true, mode: 'locks' })
        void navigator.locks.request(LOCK_NAME, {
          mode: 'exclusive',
          signal: controller.signal,
        }, async () => {
          if (controller.signal.aborted) return
          commit({ isLeader: true, canPersistStories: true, mode: 'locks' })
          await abortPromise(controller.signal)
          commit({ isLeader: false, canPersistStories: true, mode: 'locks' })
        }).catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            commit({ isLeader: false, canPersistStories: false, mode: 'disabled' })
          }
        })
        return
      }

      let storage: Storage
      try {
        storage = window.localStorage
        storage.getItem(LEASE_KEY)
      } catch {
        commit({ isLeader: false, canPersistStories: false, mode: 'disabled' })
        return
      }

      const channel = typeof BroadcastChannel === 'undefined'
        ? undefined
        : new BroadcastChannel('dsh-dfy')
      const canPersistStories = channel !== undefined
      let stopped = false
      const tick = (): void => {
        if (stopped) return
        const isLeader = renewPresentationLease(storage, tabId.current, Date.now())
        commit({ isLeader, canPersistStories, mode: 'lease' })
        if (isLeader) channel?.postMessage({ type: 'presentation-heartbeat' })
      }
      const onStorage = (event: StorageEvent): void => {
        if (event.key === LEASE_KEY) tick()
      }
      channel?.addEventListener('message', tick)
      window.addEventListener('storage', onStorage)
      tick()
      const timer = window.setInterval(tick, HEARTBEAT_MS)
      stopActive = () => {
        stopped = true
        window.clearInterval(timer)
        window.removeEventListener('storage', onStorage)
        channel?.removeEventListener('message', tick)
        channel?.close()
        releasePresentationLease(storage, tabId.current)
        commit({ isLeader: false, canPersistStories, mode: 'lease' })
      }
    }

    start()
    document.addEventListener('visibilitychange', start)
    return () => {
      document.removeEventListener('visibilitychange', start)
      stop()
    }
  }, [enabled])

  return leadership
}
