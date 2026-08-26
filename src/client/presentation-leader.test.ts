// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { releasePresentationLease, renewPresentationLease } from './presentation-leader.ts'

class MemoryStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('presentation lease fallback', () => {
  it('allows one owner, rejects a live rival, and permits deterministic takeover after expiry', () => {
    const storage = new MemoryStorage()
    expect(renewPresentationLease(storage, 'tab-a', 1000)).toBe(true)
    expect(renewPresentationLease(storage, 'tab-b', 2000)).toBe(false)
    expect(renewPresentationLease(storage, 'tab-b', 7001)).toBe(true)
    expect(renewPresentationLease(storage, 'tab-a', 7002)).toBe(false)
  })

  it('releases only the current owner lease', () => {
    const storage = new MemoryStorage()
    expect(renewPresentationLease(storage, 'tab-a', 1000)).toBe(true)
    releasePresentationLease(storage, 'tab-b')
    expect(renewPresentationLease(storage, 'tab-b', 1001)).toBe(false)
    releasePresentationLease(storage, 'tab-a')
    expect(renewPresentationLease(storage, 'tab-b', 1002)).toBe(true)
  })
})
