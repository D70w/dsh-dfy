import { useState } from 'react'
import { EMOTION_PROFILES, type DialogueLine, type WhaleEmotionName } from './emotions.ts'

export interface WhaleLlmConfig {
  enabled: boolean
  baseUrl: string
  model: string
  apiKey: string
}

type MenuTab = 'dialogue' | 'emotion' | 'llm' | 'account' | 'settings'

interface WhaleMenuPanelProps {
  open: boolean
  balanceLabel: string
  balanceSource: string
  todayCost: string
  llm: WhaleLlmConfig
  bubbleEnabled: boolean
  autonomyEnabled: boolean
  positionLocked: boolean
  reducedMotion: boolean
  chaseDisabled: boolean
  onToggle(): void
  onClose(): void
  onDialogueOpen(): void
  onQuickLine(line: DialogueLine): void
  onEmotion(name: WhaleEmotionName): void
  onLlmChange(next: WhaleLlmConfig): void
  onRefreshBalance(): void
  onShowBalance(): void
  onOpenLedger(): void
  onPreference(field: 'bubble' | 'autonomy' | 'position' | 'reduced', value: boolean): void
  onPet(): void
  onFeed(): void
  onChase(): void
  onCome(): void
  onHome(): void
  onReset(): void
  onQuiet(): void
  onHide(): void
}

const quickLines: readonly DialogueLine[] = [
  { text: '饭可以晚点吃，你得先歇一下。', subtext: '她难得把白饭放在了后面', emotion: 'relieved' },
  { text: '看吧，做得不错……也有我一点功劳吧？', subtext: '她已经开始理直气壮地邀功', emotion: 'proud' },
  { text: '你忙你的。我只是刚好待在这里。', subtext: '尾巴倒是很诚实地摇了一下', emotion: 'shy' },
]

export function WhaleMenuPanel(props: WhaleMenuPanelProps): React.JSX.Element {
  const [tab, setTab] = useState<MenuTab>('dialogue')
  return (
    <>
      <button
        data-whale-menu-toggle
        type="button"
        aria-expanded={props.open}
        aria-controls="whale-pet-menu-panel"
        aria-label={props.open ? '关闭桌宠菜单' : '打开桌宠菜单'}
        onClick={props.onToggle}
      ><i /><i /><i /></button>
      <section id="whale-pet-menu-panel" data-whale-menu-panel data-open={props.open ? 'true' : 'false'} aria-label="桌宠菜单">
        <header data-whale-menu-head>
          <span data-whale-menu-avatar>鲸</span>
          <span><strong>鲸鱼娘助手</strong><small>对话 · 表情 · 模型 · 账户 · 设置</small></span>
          <button type="button" aria-label="关闭菜单" onClick={props.onClose}>×</button>
        </header>
        <nav data-whale-menu-tabs role="tablist" aria-label="桌宠功能">
          {(['dialogue', 'emotion', 'llm', 'account', 'settings'] as const).map(name => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} data-active={tab === name ? 'true' : 'false'} onClick={() => setTab(name)}>
              {{ dialogue: '对话', emotion: '表情', llm: '模型', account: '账户', settings: '设置' }[name]}
            </button>
          ))}
        </nav>

        <div data-whale-menu-view data-active={tab === 'dialogue' ? 'true' : 'false'}>
          <h3>和鲸鱼娘说话</h3><p>气泡只负责她说的话，输入条独立显示在角色下方。</p>
          <button data-whale-menu-primary type="button" onClick={props.onDialogueOpen}>打开输入条</button>
          <div data-whale-quick-lines>
            {quickLines.map(line => <button type="button" key={line.text} onClick={() => props.onQuickLine(line)}>{line.text}</button>)}
          </div>
          <div data-whale-menu-actions>
            <button type="button" onClick={props.onPet}>摸摸她</button>
            <button type="button" onClick={props.onFeed}>给她白饭</button>
            <button type="button" disabled={props.chaseDisabled} onClick={props.onChase}>追赶蝴蝶</button>
            <button type="button" onClick={props.onCome}>到光标附近</button>
            <button type="button" onClick={props.onHome}>回到当前位置</button>
          </div>
        </div>

        <div data-whale-menu-view data-active={tab === 'emotion' ? 'true' : 'false'}>
          <h3>情绪表现</h3><p>每种情绪都有独立眼眉嘴网格、身体表演和粒子特效。</p>
          <div data-whale-emotion-grid>
            {(Object.keys(EMOTION_PROFILES) as WhaleEmotionName[]).map(name => (
              <button type="button" key={name} onClick={() => props.onEmotion(name)}>{EMOTION_PROFILES[name].label}</button>
            ))}
          </div>
        </div>

        <form data-whale-menu-view data-active={tab === 'llm' ? 'true' : 'false'} onSubmit={(event) => event.preventDefault()}>
          <h3>在线对话模型</h3><p>支持 OpenAI 兼容接口；失败时自动使用离线人设台词。</p>
          <label data-whale-setting-row>启用在线对话<input type="checkbox" checked={props.llm.enabled} onChange={event => props.onLlmChange({ ...props.llm, enabled: event.currentTarget.checked })} /></label>
          <label data-whale-setting-field>Base URL<input type="url" value={props.llm.baseUrl} onChange={event => props.onLlmChange({ ...props.llm, baseUrl: event.currentTarget.value })} placeholder="https://api.deepseek.com/v1" /></label>
          <label data-whale-setting-field>模型名称<input value={props.llm.model} onChange={event => props.onLlmChange({ ...props.llm, model: event.currentTarget.value })} placeholder="deepseek-chat" /></label>
          <label data-whale-setting-field>API Key（仅当前页面）<input type="password" value={props.llm.apiKey} onChange={event => props.onLlmChange({ ...props.llm, apiKey: event.currentTarget.value })} placeholder="sk-…" autoComplete="new-password" /></label>
          <small data-whale-menu-note>密钥只保存在当前页面内存；关闭页面即清除。</small>
        </form>

        <div data-whale-menu-view data-active={tab === 'account' ? 'true' : 'false'}>
          <h3>Token 小账单</h3><p>可用余额来自官方接口，消费明细按 DSH token 本地统计。</p>
          <div data-whale-account-card>
            <span>DeepSeek 可用余额</span><strong>{props.balanceLabel}</strong><small>{props.todayCost}</small><em>{props.balanceSource}</em>
            <button type="button" onClick={props.onRefreshBalance}>刷新官方余额</button>
          </div>
          <div data-whale-account-actions><button type="button" onClick={props.onShowBalance}>显示在气泡</button><button type="button" onClick={props.onOpenLedger}>打开完整账单</button></div>
        </div>

        <div data-whale-menu-view data-active={tab === 'settings' ? 'true' : 'false'}>
          <h3>桌宠设置</h3><p>保留 DSH 插件设置，同时提供最常用的现场开关。</p>
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
