// @vitest-environment jsdom
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from './index.ts'

vi.mock('@deepseek-ai/dsh-client-runtime/client', () => ({
  defineStore: (spec: unknown) => ({ spec, create: vi.fn() }),
}))

describe('whale-pet Browser half', () => {
  afterEach(() => {
    document.head.replaceChildren()
    document.body.replaceChildren()
    localStorage.clear()
  })

  it('adds only two slots, shares one store, and disposes every contribution', () => {
    const registrations = new Set<string>()
    const stores: unknown[] = []
    const lifecycle: Array<() => void> = []
    const ctx = {
      locale: {
        register: () => () => {},
        bind: () => ((key: string) => key),
      },
      effect: (factory: () => void | (() => void)) => {
        const dispose = factory()
        if (typeof dispose === 'function') lifecycle.push(dispose)
        return dispose
      },
      slots: {
        inject: (_name: string, register: () => void | (() => void)) => {
          const dispose = register()
          if (typeof dispose === 'function') lifecycle.push(dispose)
        },
        register: (options: { name: string; id?: string; store?: unknown }) => {
          const key = `${options.name}:${options.id ?? ''}`
          registrations.add(key)
          stores.push(options.store)
          return () => { registrations.delete(key) }
        },
      },
    } as unknown as ClientContext

    apply(ctx)

    expect(registrations).toEqual(new Set([
      'shell.overlay:dsh-dfy',
      'settings.section:dsh-dfy',
    ]))
    expect(stores).toHaveLength(2)
    expect(stores[0]).toBe(stores[1])
    expect(document.head.querySelector('style[data-plugin="dsh-dfy"]')).not.toBeNull()
    expect(document.body.childElementCount).toBe(0)

    for (const dispose of lifecycle.reverse()) dispose()
    expect(registrations.size).toBe(0)
    expect(document.head.querySelector('style[data-plugin="dsh-dfy"]')).toBeNull()
  })
})
