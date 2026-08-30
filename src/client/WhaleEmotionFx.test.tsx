// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { WhaleEmotionFx } from './WhaleEmotionFx.tsx'

describe('hungry emotion effect', () => {
  it('renders an authored rice bowl with rice grains and steam', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(<WhaleEmotionFx command={{ id: 7, name: 'hungry', durationMs: 3000 }} />)
    })

    expect(container.querySelector('[data-whale-rice-bowl]')).not.toBeNull()
    expect(container.querySelectorAll('.rice-grains ellipse')).toHaveLength(5)
    expect(container.querySelectorAll('.rice-steam path')).toHaveLength(3)
    expect(container.querySelectorAll('.rice-thought')).toHaveLength(2)
    const cluster = container.querySelector<HTMLElement>('.rice-dream-cluster')
    expect(cluster?.style.getPropertyValue('--fx-x')).toBe('72%')
    expect(cluster?.style.getPropertyValue('--fx-y')).toBe('15%')
    expect(cluster?.querySelector('.rice-thought-small')).not.toBeNull()
    expect(cluster?.querySelector('.rice-thought-medium')).not.toBeNull()
    expect(cluster?.querySelector('.rice-dream')).not.toBeNull()

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
      ['sad', '[data-whale-sad-cloud]'],
      ['happy', '[data-whale-happy-sun]'],
      ['proud', '[data-whale-proud-crown]'],
      ['determined', '[data-whale-determined-target]'],
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
})
