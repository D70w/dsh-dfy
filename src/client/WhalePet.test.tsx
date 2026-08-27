// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFERENCES } from '../preferences.ts'
import type { WhaleActivityProjection } from '../activity/types.ts'
import { toPetView } from '../domain/commands.ts'
import { createPetSave } from '../domain/pet-save.ts'
import { WhalePet, type WhalePetProps } from './WhalePet.tsx'

const container = document.createElement('div')
let root: Root

function props(activity: WhaleActivityProjection | undefined): WhalePetProps {
  const sessionId = 'session-1' as never
  const state = {
    preferences: { ...DEFAULT_PREFERENCES },
    position: { right: 24, bottom: 20 },
  }
  return {
    actions: {
      setPreference: vi.fn(),
      setPosition: vi.fn(),
      ingestUsage: vi.fn(),
      clearBilling: vi.fn(),
    },
    t: ((key: string) => key) as never,
    useStore: ((selector: (value: typeof state) => unknown) => selector(state)) as never,
    useSessions: ((selector: (value: unknown) => unknown) => selector({
      ids: [sessionId],
      byId: {
        [sessionId]: {
          running: activity?.mode !== 'idle',
          updatedAt: 1,
          projectionValues: activity === undefined ? {} : { 'whalePet.activity': activity },
        },
      },
      current: sessionId,
      phase: 'ready',
      subagentsByParent: {},
      jobsBySession: {},
      currentAddress: undefined,
    })) as never,
    useWorkspaces: vi.fn() as never,
  } as unknown as WhalePetProps
}

describe('WhalePet activity presentation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    document.body.appendChild(container)
    root = createRoot(container)
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    })
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [document.body],
    })
  })

  afterEach(async () => {
    await act(async () => { root.unmount() })
    container.remove()
    vi.useRealTimers()
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  })

  it('does not replay a completed baseline, then plays one newer result once', async () => {
    await act(async () => {
      root.render(<WhalePet {...props({ mode: 'idle', reaction: 'completed', reactionSeq: 7 })} />)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('idle')

    await act(async () => {
      root.render(<WhalePet {...props({ mode: 'idle', reaction: 'error', reactionSeq: 8 })} />)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('denying')
    expect(container.querySelector('[data-whale-pet-bubble]')?.textContent).toBe('reaction.error')

    await act(async () => { vi.advanceTimersByTime(2800) })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('idle')
  })

  it('shows working and tool activity as distinct intents on the same fallback pose', async () => {
    await act(async () => {
      root.render(<WhalePet {...props({ mode: 'thinking', reaction: 'none', reactionSeq: -1 })} />)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('working')
    expect(container.querySelector('[data-whale-pet-avatar]')?.getAttribute('data-state')).toBe('working')

    await act(async () => {
      root.render(<WhalePet {...props({ mode: 'tool', reaction: 'none', reactionSeq: -1 })} />)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('tool')
    expect(container.querySelector('[data-whale-pet-avatar]')?.getAttribute('data-state')).toBe('working')
  })

  it('plays a non-blocking facial and body performance after a short idle wait', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-idle-performance')).toBe('waiting')

    await act(async () => { vi.advanceTimersByTime(9_050) })

    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-idle-performance')).toBe('quiet-smile')
    expect(container.querySelector('[data-whale-emotion-fx]')?.getAttribute('data-emotion')).toBe('happy')
    vi.restoreAllMocks()
  })

  it('does not start idle acting while Harness work is active', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await act(async () => {
      root.render(<WhalePet {...props({ mode: 'thinking', reaction: 'none', reactionSeq: -1 })} />)
      vi.advanceTimersByTime(20_000)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-idle-performance')).toBe('waiting')
    vi.restoreAllMocks()
  })

  it('opens the menu from keyboard activation and returns focus on Escape', async () => {
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')
    expect(trigger).not.toBeNull()
    trigger?.focus()
    await act(async () => { trigger?.click() })
    const menu = container.querySelector('[role=menu]')
    expect(menu).not.toBeNull()
    expect(menu?.id).toBe('whale-pet-action-menu')
    expect(trigger?.getAttribute('aria-controls')).toBe('whale-pet-action-menu')
    expect(container.querySelector('[role=status]')?.getAttribute('aria-live')).toBe('polite')

    await act(async () => {
      container.querySelector('[role=menu]')?.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true,
      }))
      await Promise.resolve()
    })
    expect(container.querySelector('[role=menu]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('exposes focusable come-over and return-home commands', async () => {
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!
    await act(async () => { trigger.click() })
    let items = [...container.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
    expect(items.map(item => item.textContent)).toEqual([
      'pet.pet', 'pet.feed', 'pet.chaseButterfly', 'pet.come', 'pet.home',
      'pet.lockPosition', 'pet.resetPosition', 'pet.ledger', 'pet.quiet', 'pet.hide',
    ])

    await act(async () => {
      items[4]!.click()
      await Promise.resolve()
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-staying-home')).toBe('true')
    expect(container.querySelector('[data-whale-pet-bubble]')?.textContent).toBe('reaction.home')
    expect(document.activeElement).toBe(trigger)

    await act(async () => { trigger.click() })
    items = [...container.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
    await act(async () => {
      items[3]!.click()
      await Promise.resolve()
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-manual-request')).toBe('waiting')
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-staying-home')).toBe('false')
    expect(container.querySelector('[data-whale-pet-bubble]')?.textContent).toBe('reaction.come')
  })

  it('opens the workstation diary as a keyboard dialog and restores the stable hotspot', async () => {
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!
    trigger.focus()
    await act(async () => { trigger.click() })
    const ledgerItem = [...container.querySelectorAll<HTMLButtonElement>('[role=menuitem]')][7]!
    await act(async () => {
      ledgerItem.click()
      await Promise.resolve()
    })
    const dialog = container.querySelector<HTMLElement>('[data-whale-ledger]')
    expect(dialog?.getAttribute('aria-labelledby')).toBe('whale-ledger-title')
    expect(container.querySelector('#whale-ledger-title')?.textContent).toBe('ledger.title')
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-ledger-open')).toBe('true')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('ledger.close')

    await act(async () => {
      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })
    expect(container.querySelector('[data-whale-ledger]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('supports precise keyboard positioning and menu position controls', async () => {
    const currentProps = props(undefined)
    await act(async () => { root.render(<WhalePet {...currentProps} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!

    await act(async () => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(currentProps.actions.setPosition).toHaveBeenLastCalledWith({ right: 32, bottom: 20 })

    await act(async () => { trigger.click() })
    let items = [...container.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
    await act(async () => {
      items[5]!.click()
      await Promise.resolve()
    })
    expect(currentProps.actions.setPreference).toHaveBeenCalledWith('general.positionLocked', true)
    expect(container.querySelector('[data-whale-pet-bubble]')?.textContent).toBe('reaction.positionLocked')

    await act(async () => { trigger.click() })
    items = [...container.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
    await act(async () => {
      items[6]!.click()
      await Promise.resolve()
    })
    expect(currentProps.actions.setPosition).toHaveBeenLastCalledWith({ right: 24, bottom: 20 })
    expect(container.querySelector('[data-whale-pet-bubble]')?.textContent).toBe('reaction.positionReset')
  })

  it('keeps the drag pose active until the pointer is released', async () => {
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!
    trigger.setPointerCapture = vi.fn()
    trigger.releasePointerCapture = vi.fn()
    const pointerEvent = (type: string, clientX: number, clientY: number): MouseEvent => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY })
      Object.defineProperty(event, 'pointerId', { value: 1 })
      return event
    }

    await act(async () => {
      trigger.dispatchEvent(pointerEvent('pointerdown', 100, 100))
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('dragging')

    await act(async () => { trigger.dispatchEvent(pointerEvent('pointermove', 140, 100)) })

    await act(async () => { vi.advanceTimersByTime(2_000) })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('dragging')

    await act(async () => { trigger.dispatchEvent(pointerEvent('pointerup', 140, 100)) })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('idle')
  })

  it('starts an unpersisted manual cursor visit after the summon target settles', async () => {
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!
    trigger.getBoundingClientRect = () => ({
      left: 888, top: 636, right: 1_000, bottom: 748, width: 112, height: 112,
      x: 888, y: 636, toJSON: () => ({}),
    })
    await act(async () => { trigger.click() })
    const come = [...container.querySelectorAll<HTMLButtonElement>('[role=menuitem]')][3]!
    await act(async () => {
      come.click()
      await Promise.resolve()
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 720, clientY: 700, bubbles: true }))
      vi.advanceTimersByTime(500)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy')).toBe('cursor_visit')
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy-origin')).toBe('manual')
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-manual-request')).toBe('idle')
  })

  it('starts a manual butterfly performance from the keyboard menu', async () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 0
      return array
    })
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!
    await act(async () => { trigger.click() })
    const chase = [...container.querySelectorAll<HTMLButtonElement>('[role=menuitem]')][2]!
    expect(chase.disabled).toBe(false)

    await act(async () => {
      chase.click()
      await Promise.resolve()
    })
    const entry = container.querySelector('[data-whale-pet-entry]')
    expect(entry?.getAttribute('data-whale-autonomy')).toBe('butterfly')
    expect(entry?.getAttribute('data-whale-autonomy-origin')).toBe('manual')
    expect(entry?.getAttribute('data-whale-autonomy-phase')).toBe('notice')
    random.mockRestore()
  })

  it('starts one idle butterfly episode and cancels it immediately when Harness work begins', async () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 0
      return array
    })
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    await act(async () => { vi.advanceTimersByTime(90_000) })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy')).toBe('butterfly')
    expect(container.querySelector('[data-whale-autonomy-prop=butterfly]')).not.toBeNull()

    await act(async () => {
      root.render(<WhalePet {...props({ mode: 'thinking', reaction: 'none', reactionSeq: -1 })} />)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy')).toBe('none')
    expect(container.querySelector('[data-whale-autonomy-prop=butterfly]')).toBeNull()
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('working')
    random.mockRestore()
  })

  it('visits a stable pointer in the same edge band and retreats on pointer down', async () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 1
      return array
    })
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!
    trigger.getBoundingClientRect = () => ({
      left: 888, top: 636, right: 1_000, bottom: 748, width: 112, height: 112,
      x: 888, y: 636, toJSON: () => ({}),
    })
    await act(async () => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 720, clientY: 700, bubbles: true }))
      vi.advanceTimersByTime(90_001)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy')).toBe('cursor_visit')
    expect(container.querySelector('[data-whale-autonomy-prop=butterfly]')).toBeNull()

    await act(async () => {
      window.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy-phase')).toBe('return-home')
    random.mockRestore()
  })

  it('cancels a pointer visit immediately when the viewport changes', async () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 1
      return array
    })
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!
    trigger.getBoundingClientRect = () => ({
      left: 888, top: 636, right: 1_000, bottom: 748, width: 112, height: 112,
      x: 888, y: 636, toJSON: () => ({}),
    })
    await act(async () => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 720, clientY: 700, bubbles: true }))
      vi.advanceTimersByTime(90_001)
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy')).toBe('cursor_visit')

    await act(async () => { window.dispatchEvent(new Event('resize')) })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy')).toBe('none')
    random.mockRestore()
  })

  it('shows a pillow nap and wakes into denial when the user catches it', async () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 2
      return array
    })
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    await act(async () => { vi.advanceTimersByTime(90_002) })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy')).toBe('nap')
    expect(container.querySelector('[data-whale-autonomy-prop=pillow]')).not.toBeNull()
    await act(async () => { vi.advanceTimersByTime(700) })
    await act(async () => { vi.advanceTimersByTime(650) })
    await act(async () => { vi.advanceTimersByTime(900) })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy-phase')).toBe('result')

    await act(async () => { container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!.click() })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy-phase')).toBe('recover')
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-action')).toBe('denying')
    expect(container.querySelector('[data-whale-pet-bubble]')?.textContent).toBe('reaction.napCaught')
    expect(container.querySelector('[role=menu]')).toBeNull()
    random.mockRestore()
  })

  it('wakes a nap when the latest pointer sample approaches the sleeping whale', async () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 2
      return array
    })
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    const trigger = container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!
    trigger.getBoundingClientRect = () => ({
      left: 888, top: 636, right: 1_000, bottom: 748, width: 112, height: 112,
      x: 888, y: 636, toJSON: () => ({}),
    })
    await act(async () => { vi.advanceTimersByTime(90_002) })
    await act(async () => { vi.advanceTimersByTime(700) })
    await act(async () => { vi.advanceTimersByTime(650) })
    await act(async () => { vi.advanceTimersByTime(900) })
    await act(async () => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 944, clientY: 692, bubbles: true }))
    })
    expect(container.querySelector('[data-whale-pet-entry]')?.getAttribute('data-whale-autonomy-phase')).toBe('recover')
    expect(container.querySelector('[data-whale-autonomy-prop=pillow]')?.getAttribute('data-outcome')).toBe('seen')
    random.mockRestore()
  })

  it('approaches an independent rice bowl and denies it when caught', async () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 3
      return array
    })
    await act(async () => { root.render(<WhalePet {...props(undefined)} />) })
    await act(async () => { vi.advanceTimersByTime(90_003) })
    const entry = container.querySelector('[data-whale-pet-entry]')
    expect(entry?.getAttribute('data-whale-autonomy')).toBe('rice_caught')
    expect(container.querySelector('[data-whale-autonomy-prop=rice-bowl]')).not.toBeNull()

    await act(async () => { vi.advanceTimersByTime(620) })
    await act(async () => { vi.advanceTimersByTime(620) })
    expect(container.querySelector('[data-whale-pet-stage]')?.getAttribute('data-whale-motion-clip')).toBe('run')
    await act(async () => { vi.advanceTimersByTime(820) })
    expect(entry?.getAttribute('data-whale-autonomy-phase')).toBe('result')
    expect(entry?.getAttribute('data-whale-action')).toBe('feeding')

    await act(async () => { container.querySelector<HTMLButtonElement>('[data-whale-pet-hotspot]')!.click() })
    expect(entry?.getAttribute('data-whale-autonomy-phase')).toBe('recover')
    expect(entry?.getAttribute('data-whale-action')).toBe('denying')
    expect(container.querySelector('[data-whale-pet-bubble]')?.textContent).toBe('reaction.riceCaught')
    expect(container.querySelector('[role=menu]')).toBeNull()
    random.mockRestore()
  })

  it('prioritizes an eligible next-active-day bowl callback and presents its independent prop', async () => {
    vi.setSystemTime(new Date(2026, 7, 21, 12).getTime())
    const save = createPetSave(1)
    save.memories.activeDays = ['2026-08-20']
    save.memories.storyMemory.rice_caught = {
      stage: 'caught_by_user',
      count: 1,
      updatedAt: new Date(2026, 7, 20, 12).getTime(),
      updatedOnActiveDayOrdinal: 1,
      expiresOnActiveDayOrdinal: 8,
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ persistence: 'durable', state: toPetView(save) }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 4
      return array
    })

    await act(async () => {
      root.render(<WhalePet {...props(undefined)} />)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { vi.advanceTimersByTime(90_005) })
    const entry = container.querySelector('[data-whale-pet-entry]')
    expect(entry?.getAttribute('data-whale-autonomy')).toBe('bowl_accident')
    expect(container.querySelector('[data-whale-autonomy-prop=rice-bowl]')?.getAttribute('data-story')).toBe('bowl_accident')

    await act(async () => { vi.advanceTimersByTime(560) })
    await act(async () => { vi.advanceTimersByTime(620) })
    await act(async () => { vi.advanceTimersByTime(900) })
    expect(entry?.getAttribute('data-whale-autonomy-phase')).toBe('result')
    expect(entry?.getAttribute('data-whale-action')).toBe('denying')
    expect(container.querySelector('[data-whale-pet-bubble]')?.textContent).toBe('reaction.bowlAccident')

    random.mockRestore()
    vi.unstubAllGlobals()
  })
})
