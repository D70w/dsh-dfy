import { describe, expect, it } from 'vitest'
import { normalizeDeepSeekBalance } from './balance.ts'

describe('DeepSeek balance projection', () => {
  it('prefers CNY and keeps the official balance components', () => {
    expect(normalizeDeepSeekBalance({
      is_available: true,
      balance_infos: [
        { currency: 'USD', total_balance: '1.50', granted_balance: '0.50', topped_up_balance: '1.00' },
        { currency: 'CNY', total_balance: '11.05', granted_balance: '1.05', topped_up_balance: '10.00' },
      ],
    }, 123)).toEqual({
      status: 'ready', isAvailable: true, currency: 'CNY', totalBalance: 11.05,
      grantedBalance: 1.05, toppedUpBalance: 10, fetchedAt: 123,
    })
  })

  it('rejects malformed amounts instead of displaying invented values', () => {
    expect(() => normalizeDeepSeekBalance({
      is_available: true,
      balance_infos: [{ currency: 'CNY', total_balance: 'nope', granted_balance: '0', topped_up_balance: '0' }],
    })).toThrow('balance amount is invalid')
  })
})
