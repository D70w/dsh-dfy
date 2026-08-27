// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WhaleDialogue } from './WhaleDialogue.tsx'

const container = document.createElement('div')

describe('WhaleDialogue dismissal', () => {
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.replaceChildren()
    container.remove()
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  })

  it('closes both the bubble and the detached composer from the visible close control', async () => {
    const onHide = vi.fn()
    const onComposerClose = vi.fn()
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <WhaleDialogue
          dialogue={{ id: 1, text: '测试', subtext: '', variant: 'speech' }}
          visible
          composerOpen
          placement="above"
          onBubbleClick={vi.fn()}
          onHide={onHide}
          onComposerClose={onComposerClose}
          onSubmit={vi.fn()}
        />,
      )
    })
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="关闭对话框"]')?.click()
    })
    expect(onHide).toHaveBeenCalledOnce()
    expect(onComposerClose).toHaveBeenCalledOnce()
    await act(async () => { root.unmount() })
  })

  it('keeps long speech readable by capping the bubble copy', async () => {
    const root = createRoot(container)
    const longText = '这是一段很长很长的台词，用来确认气泡会增长但不会无限变宽，超过上限的内容会被安全省略。'.repeat(3)
    await act(async () => {
      root.render(
        <WhaleDialogue
          dialogue={{ id: 2, text: longText, subtext: '补充说明', variant: 'speech' }}
          visible
          composerOpen={false}
          placement="above"
          onBubbleClick={vi.fn()}
          onHide={vi.fn()}
          onComposerClose={vi.fn()}
          onSubmit={vi.fn()}
        />,
      )
    })
    const message = container.querySelector('[data-whale-dialogue-message]')
    expect(message?.textContent?.endsWith('…')).toBe(true)
    expect(message?.textContent?.length).toBeLessThanOrEqual(96)
    expect(container.querySelector('[data-whale-dialogue]')?.getAttribute('data-text-length')).toBe('long')
    await act(async () => { root.unmount() })
  })

  it('keeps model selection secondary and only reveals it in online mode', async () => {
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <WhaleDialogue
          dialogue={{ id: 3, text: '要聊什么？', subtext: '', variant: 'speech' }}
          visible
          composerOpen
          placement="above"
          onBubbleClick={vi.fn()}
          onHide={vi.fn()}
          onComposerClose={vi.fn()}
          onSubmit={vi.fn()}
          llmEnabled={false}
        />,
      )
    })
    expect(container.querySelector('[data-whale-chat-model]')).toBeNull()
    expect(container.querySelector('[data-whale-chat-avatar] img')).not.toBeNull()
    expect(container.querySelector('[aria-label="发送消息"]')).not.toBeNull()
    await act(async () => { root.unmount() })
  })
})
