import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  EMOTION_PROFILES, IDLE_PERFORMANCES,
  type IdlePerformance, type WhaleEmotionName,
} from './emotions.ts'
import { WHALE_IDLE_ASSET_URL } from '../asset-paths.ts'
import { STATIONARY_ACTIONS, type StationaryAction } from './stationary-actions.ts'

export interface WhaleLlmConfig {
  enabled: boolean
  baseUrl: string
  model: string
  apiKey: string
  remember?: boolean
  models?: string[]
  connection?: 'idle' | 'checking' | 'ok' | 'error'
}

export interface WhaleMenuAnchor {
  left: number
  top: number
  width: number
  height: number
}

interface PanelOffset {
  x: number
  y: number
}

type MenuTab = 'interact' | 'emotion' | 'dialogue' | 'account' | 'settings'

interface WhaleMenuPanelProps {
  open: boolean
  side: 'left' | 'right'
  anchor: WhaleMenuAnchor
  balanceLabel: string
  balanceSource: string
  todayCost: string
  llm: WhaleLlmConfig
  bubbleEnabled: boolean
  autonomyEnabled: boolean
  positionLocked: boolean
  reducedMotion: boolean
  onToggle(): void
  onClose(): void
  onDialogueOpen(): void
  onEmotion(name: WhaleEmotionName): void
  onIdlePerformance(performance: IdlePerformance): void
  onStationaryAction(action: StationaryAction): void
  onLlmChange(next: WhaleLlmConfig): void
  onSaveLlm(): void
  onTestLlm(): void
  onFetchModels(): void
  onRefreshBalance(): Promise<void>
  onShowBalance(): void
  onOpenLedger(): void
  onPreference(field: 'bubble' | 'autonomy' | 'position' | 'reduced', value: boolean): void
  onPet(): void
  onFeed(): void
  onReset(): void
  onQuiet(): void
  onHide(): void
}

const VIEWPORT_MARGIN = 12

function CloseIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.5 5.5l9 9m0-9-9 9" />
    </svg>
  )
}

export function clampPanelOffset(
  rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  current: PanelOffset,
  viewport: { width: number; height: number },
  margin = VIEWPORT_MARGIN,
): PanelOffset {
  const correctionX = rect.left < margin
    ? margin - rect.left
    : rect.right > viewport.width - margin
      ? viewport.width - margin - rect.right
      : 0
  const correctionY = rect.top < margin
    ? margin - rect.top
    : rect.bottom > viewport.height - margin
      ? viewport.height - margin - rect.bottom
      : 0
  return { x: current.x + correctionX, y: current.y + correctionY }
}

export function WhaleMenuPanel(props: WhaleMenuPanelProps): React.JSX.Element {
  const [tab, setTab] = useState<MenuTab>('interact')
  const [actingView, setActingView] = useState<'video' | 'performance' | 'emotion'>('video')
  const [balanceRefreshState, setBalanceRefreshState] = useState<'idle' | 'refreshing' | 'done'>('idle')
  const [offset, setOffset] = useState<PanelOffset>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const previousSide = useRef(props.side)
  const drag = useRef<{
    pointerId: number
    startX: number
    startY: number
    startOffset: PanelOffset
    rect: DOMRect
  }>()
  const balanceFeedbackTimer = useRef<number>()

  useEffect(() => () => {
    if (balanceFeedbackTimer.current !== undefined) window.clearTimeout(balanceFeedbackTimer.current)
  }, [])

  useLayoutEffect(() => {
    if (previousSide.current !== props.side) {
      previousSide.current = props.side
      setOffset({ x: 0, y: 0 })
    }
    if (!props.open) return undefined
    const keepInsideViewport = (): void => {
      const panel = panelRef.current
      if (panel === null) return
      setOffset(current => clampPanelOffset(panel.getBoundingClientRect(), current, {
        width: window.innerWidth,
        height: window.innerHeight,
      }))
    }
    const frame = window.requestAnimationFrame(keepInsideViewport)
    const settleTimer = window.setTimeout(keepInsideViewport, 260)
    const resizeObserver = new ResizeObserver(keepInsideViewport)
    if (panelRef.current !== null) resizeObserver.observe(panelRef.current)
    window.addEventListener('resize', keepInsideViewport)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', keepInsideViewport)
    }
  }, [props.anchor.height, props.anchor.left, props.anchor.top, props.anchor.width, props.open, props.side])

  const movePanelBy = (dx: number, dy: number): void => {
    const panel = panelRef.current
    if (panel === null) return
    const rect = panel.getBoundingClientRect()
    const boundedX = Math.max(VIEWPORT_MARGIN - rect.left, Math.min(window.innerWidth - VIEWPORT_MARGIN - rect.right, dx))
    const boundedY = Math.max(VIEWPORT_MARGIN - rect.top, Math.min(window.innerHeight - VIEWPORT_MARGIN - rect.bottom, dy))
    setOffset(current => ({ x: current.x + boundedX, y: current.y + boundedY }))
  }

  const anchorStyle = {
    '--menu-anchor-left': `${props.anchor.left}px`,
    '--menu-anchor-top': `${props.anchor.top}px`,
    '--menu-anchor-width': `${props.anchor.width}px`,
    '--menu-anchor-height': `${props.anchor.height}px`,
    '--menu-x': `${offset.x}px`,
    '--menu-y': `${offset.y}px`,
  } as React.CSSProperties

  return (
    <>
      <button
        data-whale-menu-toggle
        data-side={props.side}
        type="button"
        style={anchorStyle}
        aria-expanded={props.open}
        aria-controls="whale-pet-menu-panel"
        aria-label={props.open ? '关闭桌宠菜单' : '打开桌宠菜单'}
        onClick={props.onToggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7.5h12M6 12h12M6 16.5h12" />
        </svg>
      </button>
      <section
        id="whale-pet-menu-panel"
        ref={panelRef}
        data-whale-menu-panel
        data-open={props.open ? 'true' : 'false'}
        data-side={props.side}
        data-dragging={dragging ? 'true' : 'false'}
        style={anchorStyle}
        aria-label="桌宠菜单"
      >
        <button data-whale-menu-close-float type="button" aria-label="关闭菜单" onClick={props.onClose}><CloseIcon /></button>
        <header
          data-whale-menu-head
          tabIndex={0}
          aria-label="拖动桌宠菜单，方向键可以微调位置"
          onKeyDown={(event) => {
            const movement = {
              ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16],
            }[event.key]
            if (movement === undefined) return
            event.preventDefault()
            movePanelBy(movement[0], movement[1])
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 || (event.target as HTMLElement).closest('button') !== null) return
            const panel = panelRef.current
            if (panel === null) return
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              startOffset: offset,
              rect: panel.getBoundingClientRect(),
            }
            setDragging(true)
          }}
          onPointerMove={(event) => {
            const active = drag.current
            if (active === undefined || active.pointerId !== event.pointerId) return
            const rawX = event.clientX - active.startX
            const rawY = event.clientY - active.startY
            const dx = Math.max(VIEWPORT_MARGIN - active.rect.left, Math.min(window.innerWidth - VIEWPORT_MARGIN - active.rect.right, rawX))
            const dy = Math.max(VIEWPORT_MARGIN - active.rect.top, Math.min(window.innerHeight - VIEWPORT_MARGIN - active.rect.bottom, rawY))
            setOffset({ x: active.startOffset.x + dx, y: active.startOffset.y + dy })
          }}
          onPointerUp={(event) => {
            if (drag.current?.pointerId !== event.pointerId) return
            drag.current = undefined
            setDragging(false)
          }}
          onPointerCancel={() => {
            drag.current = undefined
            setDragging(false)
          }}
        >
          <span data-whale-menu-grip aria-hidden="true">
            <svg viewBox="0 0 18 28"><circle cx="6" cy="8" r="1.5" /><circle cx="12" cy="8" r="1.5" /><circle cx="6" cy="14" r="1.5" /><circle cx="12" cy="14" r="1.5" /><circle cx="6" cy="20" r="1.5" /><circle cx="12" cy="20" r="1.5" /></svg>
          </span>
          <span data-whale-menu-avatar>
            <img src={`${WHALE_IDLE_ASSET_URL}/source-master.png`} alt="" draggable={false} />
          </span>
          <span><strong>大肥鱼</strong><small>工位搭子</small></span>
        </header>
        <nav data-whale-menu-tabs role="tablist" aria-label="桌宠功能">
          {(['interact', 'emotion', 'dialogue', 'account', 'settings'] as const).map(name => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} data-active={tab === name ? 'true' : 'false'} onClick={() => setTab(name)}>
              {{ interact: '互动', emotion: '演出', dialogue: '对话', account: '账户', settings: '设置' }[name]}
            </button>
          ))}
        </nav>

        <div data-whale-menu-view data-active={tab === 'interact' ? 'true' : 'false'}>
          <h3>陪她玩一会儿</h3><p>这里只保留当前稳定可用的互动。</p>
          <div data-whale-menu-actions data-compact="true">
            <button type="button" onClick={props.onPet}>摸摸她</button>
            <button type="button" onClick={props.onFeed}>给她白饭</button>
          </div>
        </div>

        <div data-whale-menu-view data-active={tab === 'emotion' ? 'true' : 'false'}>
          <h3>角色演出</h3><p>旧测试版的视频动作已经接回，播放完会平滑回到当前待机状态。</p>
          <div data-whale-acting-switch role="tablist" aria-label="演出类型">
            <button type="button" role="tab" aria-selected={actingView === 'video'} data-active={actingView === 'video' ? 'true' : 'false'} onClick={() => setActingView('video')}>经典动作</button>
            <button type="button" role="tab" aria-selected={actingView === 'performance'} data-active={actingView === 'performance' ? 'true' : 'false'} onClick={() => setActingView('performance')}>待机小剧场</button>
            <button type="button" role="tab" aria-selected={actingView === 'emotion'} data-active={actingView === 'emotion' ? 'true' : 'false'} onClick={() => setActingView('emotion')}>单独表情</button>
          </div>
          <div data-whale-acting-view data-active={actingView === 'video' ? 'true' : 'false'}>
            <div data-whale-performance-list>
              {STATIONARY_ACTIONS.map(action => (
                <button type="button" key={action.id} onClick={() => props.onStationaryAction(action)} aria-label={`播放${action.label}`}>
                  <span><strong>{action.label}</strong><small>{action.description}</small></span>
                  <em>视频</em>
                </button>
              ))}
            </div>
          </div>
          <div data-whale-acting-view data-active={actingView === 'performance' ? 'true' : 'false'}>
            <div data-whale-performance-list>
              {IDLE_PERFORMANCES.map(performance => (
                <button type="button" key={performance.id} onClick={() => props.onIdlePerformance(performance)} aria-label={`播放${performance.label}`}>
                  <span><strong>{performance.label}</strong><small>{performance.description}</small></span>
                  <em>{EMOTION_PROFILES[performance.emotion].label}</em>
                </button>
              ))}
            </div>
          </div>
          <div data-whale-acting-view data-active={actingView === 'emotion' ? 'true' : 'false'}>
            <div data-whale-emotion-grid>
              {(Object.keys(EMOTION_PROFILES) as WhaleEmotionName[]).map(name => (
                <button type="button" key={name} onClick={() => props.onEmotion(name)}>{EMOTION_PROFILES[name].label}</button>
              ))}
            </div>
          </div>
        </div>

        <div data-whale-menu-view data-active={tab === 'dialogue' ? 'true' : 'false'}>
          <h3>和鲸鱼娘说话</h3><p>她的话显示在气泡里，你的输入框独立放在下方。</p>
          <button data-whale-menu-primary type="button" onClick={props.onDialogueOpen}>打开输入框</button>
          <details data-whale-llm-settings open>
            <summary>对话模型</summary>
            <div data-whale-llm-fields>
              <div data-whale-llm-mode role="tablist" aria-label="对话模式">
                <button type="button" role="tab" aria-selected={!props.llm.enabled} data-active={!props.llm.enabled ? 'true' : 'false'} onClick={() => props.onLlmChange({ ...props.llm, enabled: false })}>离线台词</button>
                <button type="button" role="tab" aria-selected={props.llm.enabled} data-active={props.llm.enabled ? 'true' : 'false'} onClick={() => props.onLlmChange({ ...props.llm, enabled: true })}>在线模型</button>
              </div>
              <label data-whale-setting-field>Base URL<input type="url" value={props.llm.baseUrl} onChange={event => props.onLlmChange({ ...props.llm, baseUrl: event.currentTarget.value, connection: 'idle' })} placeholder="https://api.deepseek.com/v1" /></label>
              <div data-whale-model-row>
                <label data-whale-setting-field>模型<select value={props.llm.model} onChange={event => props.onLlmChange({ ...props.llm, model: event.currentTarget.value })}>
                  {!((props.llm.models ?? []).includes(props.llm.model) || props.llm.model === 'deepseek-chat') ? <option value={props.llm.model}>{props.llm.model}</option> : null}
                  <option value="deepseek-chat">deepseek-chat</option>
                  {(props.llm.models ?? []).filter(model => model !== 'deepseek-chat').map(model => <option key={model} value={model}>{model}</option>)}
                </select></label>
                <button type="button" data-whale-fetch-models aria-label="获取全部模型" onClick={props.onFetchModels} disabled={props.llm.connection === 'checking' || !props.llm.apiKey.trim()}>获取全部模型</button>
              </div>
              <label data-whale-setting-field>API Key<input type="password" value={props.llm.apiKey} onChange={event => props.onLlmChange({ ...props.llm, apiKey: event.currentTarget.value, connection: 'idle' })} placeholder="sk-…" autoComplete="new-password" /></label>
              <div data-whale-llm-actions>
                <button type="button" data-whale-llm-test onClick={props.onTestLlm} disabled={props.llm.connection === 'checking' || !props.llm.apiKey.trim()}>{props.llm.connection === 'checking' ? '测试中…' : '测活连接'}</button>
                <button type="button" data-whale-llm-save onClick={props.onSaveLlm} disabled={!props.llm.apiKey.trim()}>保存配置</button>
              </div>
              <small data-whale-llm-status data-state={props.llm.connection ?? 'idle'}>{props.llm.connection === 'ok' ? '连接正常 · 模型列表已可用' : props.llm.connection === 'error' ? '连接失败 · 请检查地址、密钥和跨域设置' : props.llm.remember ? '配置已保存 · API Key 仅写入此浏览器' : '尚未保存 · 关闭页面后将清除'}</small>
            </div>
          </details>
        </div>

        <div data-whale-menu-view data-active={tab === 'account' ? 'true' : 'false'}>
          <h3>Token 小账单</h3><p>可用余额来自官方接口，消费明细按 DSH token 本地统计。</p>
          <div data-whale-account-card>
            <span>DeepSeek 可用余额</span><strong>{props.balanceLabel}</strong><small>{props.todayCost}</small><em>{props.balanceSource}</em>
            <button
              type="button"
              data-state={balanceRefreshState}
              aria-live="polite"
              disabled={balanceRefreshState === 'refreshing'}
              onClick={() => {
                if (balanceFeedbackTimer.current !== undefined) window.clearTimeout(balanceFeedbackTimer.current)
                setBalanceRefreshState('refreshing')
                void props.onRefreshBalance().finally(() => {
                  setBalanceRefreshState('done')
                  balanceFeedbackTimer.current = window.setTimeout(() => setBalanceRefreshState('idle'), 1_600)
                })
              }}
            >{balanceRefreshState === 'refreshing' ? '正在刷新…' : balanceRefreshState === 'done' ? '刷新完成' : '刷新官方余额'}</button>
          </div>
          <div data-whale-account-actions><button type="button" onClick={props.onShowBalance}>显示在气泡</button><button type="button" onClick={props.onOpenLedger}>打开完整账单</button></div>
        </div>

        <div data-whale-menu-view data-active={tab === 'settings' ? 'true' : 'false'}>
          <h3>桌宠设置</h3><p>常用开关在这里，完整配置仍由 DSH 管理。</p>
          <label data-whale-setting-row>显示头顶气泡<input type="checkbox" checked={props.bubbleEnabled} onChange={event => props.onPreference('bubble', event.currentTarget.checked)} /></label>
          <label data-whale-setting-row>自动漫游<input type="checkbox" checked={props.autonomyEnabled} onChange={event => props.onPreference('autonomy', event.currentTarget.checked)} /></label>
          <label data-whale-setting-row>固定当前位置<input type="checkbox" checked={props.positionLocked} onChange={event => props.onPreference('position', event.currentTarget.checked)} /></label>
          <label data-whale-setting-row>减少动态<input type="checkbox" checked={props.reducedMotion} onChange={event => props.onPreference('reduced', event.currentTarget.checked)} /></label>
          <div data-whale-menu-actions>
            <button type="button" onClick={props.onReset}>回到右下角</button><button type="button" onClick={props.onQuiet}>进入安静模式</button><button type="button" onClick={props.onHide}>先藏起来</button>
          </div>
        </div>
      </section>
    </>
  )
}
