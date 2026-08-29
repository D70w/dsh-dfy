// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { WhaleDebugPanel, whaleDebugEnabled } from './WhaleDebugPanel.tsx'

describe('WhaleDebugPanel', () => {
  it('is gated by an explicit query and starts each realtime story directly', async () => {
    expect(whaleDebugEnabled('?whaleDebug=1')).toBe(true)
    expect(whaleDebugEnabled('?whaleDebug=0')).toBe(false)
    expect(whaleDebugEnabled('')).toBe(false)

    const container = document.createElement('div')
    const root = createRoot(container)
    const start = vi.fn()
    const runWorkDemo = vi.fn()
    const previewWorkTool = vi.fn()
    await act(async () => {
      root.render(<WhaleDebugPanel
        story={undefined}
        phase={undefined}
        workState="live"
        start={start}
        stop={vi.fn()}
        runWorkDemo={runWorkDemo}
        previewWorkTool={previewWorkTool}
        stopWorkDemo={vi.fn()}
      />)
    })
    expect([...container.querySelectorAll('button')].map(button => button.textContent)).toEqual([
      '追蝴蝶', '跑到光标', '打盹', '偷吃白饭', '打翻饭碗', '收拾并补饭', '停止并归位',
      '模拟读文件', '模拟搜索', '模拟命令', '模拟写入',
      '模拟成功流程', '模拟失败流程', '跟随真实任务',
    ])
    await act(async () => {
      ;[...container.querySelectorAll('button')].find(button => button.textContent === '打翻饭碗')?.click()
    })
    expect(start).toHaveBeenCalledWith('bowl_accident')
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-whale-debug-work-success]')?.click()
    })
    expect(runWorkDemo).toHaveBeenCalledWith('completed')
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-whale-debug-tool-search]')?.click()
    })
    expect(previewWorkTool).toHaveBeenCalledWith('search')
    await act(async () => root.unmount())
  })
})
