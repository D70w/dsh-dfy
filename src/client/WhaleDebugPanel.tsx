import type { AutonomyEpisode, AutonomyPhase } from '../autonomy.ts'

export interface WhaleDebugPanelProps {
  story: AutonomyEpisode['story'] | undefined
  phase: AutonomyPhase | undefined
  start(story: AutonomyEpisode['story']): void
  stop(): void
}

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
export function WhaleDebugPanel({ story, phase, start, stop }: WhaleDebugPanelProps): React.JSX.Element {
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
      <small>仅测试播放，不写入小账本</small>
    </section>
  )
}
