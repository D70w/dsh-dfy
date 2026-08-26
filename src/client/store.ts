import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import { DEFAULT_PREFERENCES, type WhalePreferences } from '../preferences.ts'
import { DEFAULT_POSITION, type WhalePosition } from './position.ts'
import {
  BILLING_RATES, createLocalBillingState, ingestSessionUsage,
  type LocalBillingState, type SessionUsageSample,
} from './billing.ts'

export interface WhaleClientState {
  preferences: WhalePreferences
  position: WhalePosition
  billing: LocalBillingState
}

type WhaleClientActions = {
  setPreference: (
    draft: WhaleClientState,
    field: keyof WhalePreferences,
    value: WhalePreferences[keyof WhalePreferences],
  ) => void
  setPosition: (draft: WhaleClientState, position: WhalePosition) => void
  ingestUsage: (draft: WhaleClientState, samples: SessionUsageSample[], atIso?: string) => void
  clearBilling: (draft: WhaleClientState) => void
}

/**
 * Declare the shared device-local preferences and viewport position.
 * @returns the root-scoped, locally persisted store handle.
 */
export function createWhaleStore(): EngineStoreHandle<WhaleClientState, WhaleClientActions> {
  return defineStore({
    init: (): WhaleClientState => ({
      preferences: { ...DEFAULT_PREFERENCES },
      position: { ...DEFAULT_POSITION },
      billing: createLocalBillingState(),
    }),
    persist: 'dsh-dfy.client.v1',
    actions: {
      setPreference: (draft, field, value) => {
        const preferences = draft.preferences as Record<keyof WhalePreferences, WhalePreferences[keyof WhalePreferences]>
        preferences[field] = value
      },
      setPosition: (draft, position: WhalePosition) => {
        draft.position.right = position.right
        draft.position.bottom = position.bottom
      },
      ingestUsage: (draft, samples, atIso) => {
        draft.billing ??= createLocalBillingState()
        const profile = draft.preferences['billing.priceProfile'] ?? 'deepseek-v4-flash'
        ingestSessionUsage(
          draft.billing,
          samples,
          BILLING_RATES[profile],
          atIso === undefined ? new Date() : new Date(atIso),
        )
      },
      clearBilling: (draft) => {
        draft.billing = createLocalBillingState()
      },
    },
  })
}
