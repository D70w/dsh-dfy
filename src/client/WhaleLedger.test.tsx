// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPetSave } from '../domain/pet-save.ts'
import { toPetView } from '../domain/commands.ts'
import { WhaleLedger } from './WhaleLedger.tsx'
import type { WhaleLocaleKey } from './locales.ts'
import { createLocalBillingState } from './billing.ts'

const container = document.createElement('div')
let root: Root

function stateWithHistory() {
  const save = createPetSave(1)
  save.daily['2026-08-21'] = {
    interactions: 1, feeds: 1, completedTurns: 2, storyOutcomes: 1, workMinutes: 15,
  }
  save.memories.storyMemory.nap = {
    stage: 'seen', count: 1, updatedAt: 2, updatedOnActiveDayOrdinal: 1,
  }
  return toPetView(save)
}

const t = ((key: WhaleLocaleKey) => key) as (key: WhaleLocaleKey) => string

describe('WhaleLedger privacy control', () => {
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  })

  it('requires explicit confirmation, lets Escape cancel safely, and announces success', async () => {
    const onClearHistory = vi.fn(async () => {})
    await act(async () => {
      root.render(<WhaleLedger
        state={stateWithHistory()}
        persistence="durable"
        today="2026-08-21"
        t={t}
        onClose={vi.fn()}
        onClearHistory={onClearHistory}
      />)
    })
    const clear = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent === 'ledger.clear.action')!
    expect(clear.disabled).toBe(false)

    await act(async () => clear.click())
    const confirmation = container.querySelector<HTMLElement>('[data-whale-ledger-clear-confirmation]')!
    expect(confirmation.getAttribute('aria-describedby')).toBe('whale-ledger-clear-description')
    expect(document.activeElement?.textContent).toBe('ledger.clear.cancel')

    await act(async () => {
      confirmation.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })
    expect(container.querySelector('[data-whale-ledger-clear-confirmation]')).toBeNull()
    const restoredClear = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent === 'ledger.clear.action')!
    expect(document.activeElement).toBe(restoredClear)

    await act(async () => restoredClear.click())
    const confirm = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent === 'ledger.clear.confirm')!
    await act(async () => {
      confirm.click()
      await Promise.resolve()
    })
    expect(onClearHistory).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[role=status]')?.textContent).toBe('ledger.clear.success')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('ledger.close')
  })

  it('keeps the confirmation recoverable when the Host write fails', async () => {
    const onClearHistory = vi.fn(async () => { throw new Error('offline') })
    await act(async () => {
      root.render(<WhaleLedger
        state={stateWithHistory()}
        persistence="durable"
        today="2026-08-21"
        t={t}
        onClose={vi.fn()}
        onClearHistory={onClearHistory}
      />)
    })
    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>('button')]
        .find(button => button.textContent === 'ledger.clear.action')!.click()
    })
    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>('button')]
        .find(button => button.textContent === 'ledger.clear.confirm')!.click()
      await Promise.resolve()
    })
    expect(container.querySelector('[role=alert]')?.textContent).toBe('ledger.clear.error')
    expect(document.activeElement?.textContent).toBe('ledger.clear.confirm')
  })

  it('shows locally estimated balance, token buckets, and hourly spend', async () => {
    const billing = createLocalBillingState()
    billing.hourly['2026-08-21T14'] = {
      hour: '2026-08-21T14', requests: 1, cacheReadTokens: 100_000,
      uncachedInputTokens: 200_000, cacheWriteTokens: 0, outputTokens: 50_000,
      costCny: 0.302,
    }
    await act(async () => {
      root.render(<WhaleLedger
        state={stateWithHistory()}
        persistence="durable"
        today="2026-08-21"
        t={t}
        onClose={vi.fn()}
        onClearHistory={vi.fn(async () => {})}
        billing={billing}
        officialBalance={{
          status: 'ready', currency: 'CNY', totalBalance: 11.05,
          grantedBalance: 1.05, toppedUpBalance: 10, fetchedAt: 123,
        }}
      />)
    })
    expect(container.querySelector('[data-whale-billing-balance]')?.textContent).toContain('¥11.05')
    expect(container.querySelector('[data-whale-billing-hours]')?.textContent).toContain('14:00')
    expect(container.querySelector('[data-whale-billing-hours]')?.textContent).toContain('¥0.3020')
  })
})
