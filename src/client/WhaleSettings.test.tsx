// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFERENCES } from '../preferences.ts'
import { WhaleSettings, type WhaleSettingsProps } from './WhaleSettings.tsx'

const container = document.createElement('div')
let root: Root

describe('WhaleSettings accessibility', () => {
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

  it('gives every form control a readable label', async () => {
    const state = { preferences: { ...DEFAULT_PREFERENCES } }
    const props = {
      actions: { setPreference: vi.fn() },
      close: vi.fn(),
      t: (key: string) => key,
      useStore: (selector: (value: typeof state) => unknown) => selector(state),
    } as unknown as WhaleSettingsProps
    await act(async () => {
      root.render(<WhaleSettings {...props} />)
    })

    const controls = [...container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')]
    expect(controls).toHaveLength(15)
    expect(controls.map(control => control.labels?.[0]?.querySelector('span')?.textContent)).toEqual([
      'settings.visible',
      'settings.quiet',
      'settings.positionLocked',
      'settings.bubbles',
      'settings.diary',
      'settings.billing.enabled',
      'settings.billing.profile',
      'settings.balance.refresh',
      'settings.autonomy',
      'settings.cursor',
      'settings.roaming',
      'settings.motion',
      'settings.quality',
      'settings.secondaryMotion',
      'settings.scale · 100%',
    ])
  })
})
