// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { WhaleWorkFx } from './WhaleWorkFx.tsx'

function renderWorkFx(kind: Parameters<typeof WhaleWorkFx>[0]['kind']): HTMLDivElement {
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => root.render(<WhaleWorkFx kind={kind} />))
  return container
}

describe('work-state object cues', () => {
  it('does not add an object for idle or unknown work states', () => {
    expect(renderWorkFx('none').querySelector('[data-whale-work-fx]')).toBeNull()
    expect(renderWorkFx('other').querySelector('[data-whale-work-fx]')).toBeNull()
  })

  it.each([
    ['read', 'read'],
    ['search', 'search'],
    ['command', 'command'],
    ['write', 'write'],
  ] as const)('renders a distinct %s object cue', (kind, objectKind) => {
    const root = renderWorkFx(kind)
    expect(root.querySelector(`[data-whale-work-fx][data-tool-kind="${kind}"]`)).not.toBeNull()
    expect(root.querySelector(`[data-work-object="${objectKind}"] svg[data-work-detail="${kind}"]`)).not.toBeNull()
  })

  it('renders a visible usage detail for each prop', () => {
    expect(renderWorkFx('search').querySelector('.work-icon-scan-line')).not.toBeNull()
    expect(renderWorkFx('read').querySelector('.work-icon-page-turn')).not.toBeNull()
    expect(renderWorkFx('command').querySelectorAll('.work-icon-network')).toHaveLength(2)
    expect(renderWorkFx('write').querySelector('.work-icon-stroke')).not.toBeNull()
  })
})
