// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { WhaleEmotionFx } from './WhaleEmotionFx.tsx'

describe('hungry emotion effect', () => {
  it('renders an authored rice tray with rice grains, steam and chopsticks', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(<WhaleEmotionFx command={{ id: 7, name: 'hungry', durationMs: 3000 }} />)
    })

    expect(container.querySelector('[data-whale-hungry-tray]')).not.toBeNull()
    expect(container.querySelector('[data-whale-rice-bowl]')).not.toBeNull()
    expect(container.querySelectorAll('.rice-grains ellipse')).toHaveLength(5)
    expect(container.querySelectorAll('.rice-steam path')).toHaveLength(3)
    expect(container.querySelector('.hungry-tray-chopsticks')).not.toBeNull()

    act(() => root.unmount())
  })

  it('does not add the rice bowl to unrelated emotions', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(<WhaleEmotionFx command={{ id: 8, name: 'happy', durationMs: 2400 }} />)
    })
    expect(container.querySelector('[data-whale-rice-bowl]')).toBeNull()
    act(() => root.unmount())
  })
})

describe('emotion-specific visual language', () => {
  it('uses a drawn anger mark instead of a platform emoji', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(<WhaleEmotionFx command={{ id: 9, name: 'angry', durationMs: 2800 }} />)
    })
    expect(container.querySelector('.anger-mark')).not.toBeNull()
    expect(container.querySelector('[data-whale-anger-mark]')).not.toBeNull()
    expect(container.querySelector('.anger')).toBeNull()
    expect(container.textContent).not.toContain('💢')
    act(() => root.unmount())
  })

  it('gives confused and relieved states distinct secondary marks', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(<WhaleEmotionFx command={{ id: 10, name: 'confused', durationMs: 2800 }} />)
    })
    expect(container.querySelectorAll('.question')).toHaveLength(1)
    expect(container.querySelectorAll('.thought-dot')).toHaveLength(2)
    act(() => {
      root.render(<WhaleEmotionFx command={{ id: 11, name: 'relieved', durationMs: 3600 }} />)
    })
    expect(container.querySelector('.relief')).not.toBeNull()
    expect(container.querySelector('[data-whale-relieved-tea]')).not.toBeNull()
    act(() => root.unmount())
  })

  it('uses scene props for emotions that need more than floating marks', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    const cases = [
      ['love', '[data-whale-love-envelope]'],
      ['shy', '[data-whale-shy-fan]'],
      ['angry', '[data-whale-angry-burst]'],
      ['confused', '[data-whale-confused-card]'],
      ['sleepy', '[data-whale-sleepy-moon]'],
      ['nervous', '[data-whale-nervous-checklist]'],
      ['hungry', '[data-whale-hungry-tray]'],
      ['sad', '[data-whale-sad-cloud]'],
      ['happy', '[data-whale-happy-sun]'],
      ['proud', '[data-whale-proud-crown]'],
      ['determined', '[data-whale-determined-target]'],
      ['pout', '[data-whale-pout-tissue]'],
      ['surprise', '[data-whale-surprise-bell]'],
      ['mischievous', '[data-whale-mischief-box]'],
      ['excited', '[data-whale-excited-gift]'],
    ] as const
    for (const [name, selector] of cases) {
      act(() => {
        root.render(<WhaleEmotionFx command={{ id: 20, name, durationMs: 2800 }} />)
      })
      expect(container.querySelector(selector)).not.toBeNull()
      expect(container.querySelector('.emotion-scene-prop')).not.toBeNull()
    }
    act(() => root.unmount())
  })

  it('keeps the sad rain attached to one cloud actor', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(<WhaleEmotionFx command={{ id: 21, name: 'sad', durationMs: 3200 }} />)
    })
    const cloud = container.querySelector('[data-whale-sad-cloud]')
    expect(cloud?.querySelectorAll('.sad-rain-drops path')).toHaveLength(3)
    expect(container.querySelectorAll('.emotion-particle.tear')).toHaveLength(0)
    act(() => root.unmount())
  })

  it('builds the second prop group from semantic moving parts', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    const cases = [
      ['pout', '.pout-tissue-sheet'],
      ['surprise', '.surprise-bell-clapper'],
      ['mischievous', '.mischief-spring'],
      ['excited', '.excited-gift-bow'],
    ] as const
    for (const [name, selector] of cases) {
      act(() => {
        root.render(<WhaleEmotionFx command={{ id: 22, name, durationMs: 2800 }} />)
      })
      expect(container.querySelector(selector)).not.toBeNull()
    }
    act(() => root.unmount())
  })

  it('builds the third prop group without changing the authored face', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    const cases = [
      ['love', '.love-envelope-seal'],
      ['shy', '.shy-fan-heart'],
      ['angry', '.angry-burst-shards'],
      ['confused', '.confused-card-question'],
      ['sleepy', '.sleepy-moon-zzz'],
      ['nervous', '.nervous-checklist-sweat'],
      ['hungry', '.hungry-tray-chopsticks'],
    ] as const
    for (const [name, selector] of cases) {
      act(() => {
        root.render(<WhaleEmotionFx command={{ id: 23, name, durationMs: 2800 }} />)
      })
      expect(container.querySelector(selector)).not.toBeNull()
      expect(container.querySelector('[data-whale-emotion-fx]')).not.toBeNull()
    }
    act(() => root.unmount())
  })
})
