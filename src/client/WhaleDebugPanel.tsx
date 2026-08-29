import type { AutonomyEpisode, AutonomyPhase } from '../autonomy.ts'
import type { WhaleToolKind } from '../activity/types.ts'

export interface WhaleDebugPanelProps {
  story: AutonomyEpisode['story'] | undefined
  phase: AutonomyPhase | undefined
  workState: WhaleDebugWorkState
  start(story: AutonomyEpisode['story']): void
  stop(): void
  runWorkDemo(result: 'completed' | 'error'): void
  previewWorkTool(kind: Exclude<WhaleToolKind, 'none'>): void
  stopWorkDemo(): void
}

export type WhaleDebugWorkState = 'live' | 'thinking' | 'tool' | 'read' | 'search' | 'command' | 'write' | 'completed' | 'error'

const PREVIEWS: ReadonlyArray<{ story: AutonomyEpisode['story']; label: string }> = [
  { story: 'butterfly', label: '追蝴蝶' },
  { story: 'cursor_visit', label: '跑到光标' },
  { story: 'nap', label: '打盹' },
  { story: 'rice_caught', label: '偷吃白饭' },
  { story: 'bowl_accident', label: '打翻饭碗' },
  { story: 'recovery_meal', label: '收拾并补饭' },
]

export function whaleDebugEnabled(search: string): boolean {
  return new URLSearchParams(search).get('whaleDebug') === '1'
}

/** Query-gated visual acceptance surface; previews never persist story outcomes. */
const WORK_STATE_LABELS: Readonly<Record<WhaleDebugWorkState, string>> = {
  live: '跟随真实任务',
  thinking: '接单 · 思考',
  tool: '调用工具',
  read: '读取文件',
  search: '搜索线索',
  command: '执行命令',
  write: '写入修改',
  completed: '任务成功',
  error: '任务失败',
}

export function WhaleDebugPanel({
  story, phase, workState, start, stop, runWorkDemo, previewWorkTool, stopWorkDemo,
}: WhaleDebugPanelProps): React.JSX.Element {
  return (
    <section data-whale-debug-panel aria-label="大肥鱼动画验收台">
      <div data-whale-debug-heading>
        <strong>动画验收台</strong>
        <span aria-live="polite">{story === undefined ? '待机' : `${story} · ${phase}`}</span>
      </div>
      <div data-whale-debug-actions>
        {PREVIEWS.map(item => (
          <button
            key={item.story}
            type="button"
            data-active={story === item.story ? 'true' : 'false'}
            onClick={() => start(item.story)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" data-stop onClick={stop}>停止并归位</button>
      </div>
      <div data-whale-debug-section>
        <div data-whale-debug-section-heading>
          <strong>工作状态</strong>
          <span data-whale-debug-work-state aria-live="polite">{WORK_STATE_LABELS[workState]}</span>
        </div>
        <div data-whale-debug-actions>
          <button type="button" data-whale-debug-tool-read onClick={() => previewWorkTool('read')}>模拟读文件</button>
          <button type="button" data-whale-debug-tool-search onClick={() => previewWorkTool('search')}>模拟搜索</button>
          <button type="button" data-whale-debug-tool-command onClick={() => previewWorkTool('command')}>模拟命令</button>
          <button type="button" data-whale-debug-tool-write onClick={() => previewWorkTool('write')}>模拟写入</button>
          <button type="button" data-whale-debug-work-success onClick={() => runWorkDemo('completed')}>模拟成功流程</button>
          <button type="button" data-whale-debug-work-error onClick={() => runWorkDemo('error')}>模拟失败流程</button>
          <button type="button" data-stop onClick={stopWorkDemo}>跟随真实任务</button>
        </div>
      </div>
      <small>仅测试播放，不写入小账本，也不会发送真实任务</small>
    </section>
  )
}
