import { useRef, useState } from 'react'
import { WHALE_IDLE_ASSET_URL } from '../asset-paths.ts'
import type { DialogueLine } from './emotions.ts'

export type DialogueVariant = 'speech' | 'metric' | 'feedback'
export type DialoguePlacement = 'above' | 'side-left' | 'side-right'

export interface WhaleDialogueState extends DialogueLine {
  id: number
  variant: DialogueVariant
  context?: 'ordinary' | 'idle-performance' | 'classic-performance' | 'account-balance' | 'deepseek-peak' | 'reply'
}

export interface DialogueHistoryEntry {
  id: number
  role: 'user' | 'assistant'
  text: string
  at: number
  emotion?: string
}

export interface DialogueMemoryEntry {
  id: string
  title: string
  detail: string
  at?: number
  kind?: 'personality' | 'conversation'
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.5 5.5l9 9m0-9-9 9" />
    </svg>
  )
}

function SendIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 15.5v-11m-4 4 4-4 4 4" />
    </svg>
  )
}

interface WhaleDialogueProps {
  dialogue: WhaleDialogueState
  visible: boolean
  composerOpen: boolean
  busy?: boolean
  placement: DialoguePlacement
  onBubbleClick(): void
  onHide(): void
  onComposerClose(): void
  onSubmit(message: string): void
  llmEnabled?: boolean
  llmModel?: string
  llmModels?: readonly string[]
  onLlmModeChange?(enabled: boolean): void
  onLlmModelChange?(model: string): void
  history?: readonly DialogueHistoryEntry[]
  memories?: readonly DialogueMemoryEntry[]
  onClearHistory?(): void
}

const MAX_BUBBLE_CHARS = 96

export function WhaleDialogue({
  dialogue, visible, composerOpen, busy = false, placement,
  onBubbleClick, onHide, onComposerClose, onSubmit,
  llmEnabled = false, llmModel = 'deepseek-chat', llmModels = [],
  onLlmModeChange, onLlmModelChange, history = [], memories = [], onClearHistory,
}: WhaleDialogueProps): React.JSX.Element {
  const [message, setMessage] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTab, setHistoryTab] = useState<'chat' | 'memory'>('chat')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number }>()
  const visibleText = dialogue.text.length > MAX_BUBBLE_CHARS
    ? `${dialogue.text.slice(0, MAX_BUBBLE_CHARS - 1).trimEnd()}…`
    : dialogue.text
  const bubbleWidth = Math.min(360, Math.max(267, 216 + visibleText.length * 2.4))
  const bubbleHeight = Math.min(190, Math.max(150, 142 + Math.ceil(visibleText.length / 24) * 13))
  const formatTime = (at: number): string => {
    if (at <= 0) return '角色设定'
    const elapsed = Math.max(0, Date.now() - at)
    if (elapsed < 60_000) return '刚刚'
    if (elapsed < 3_600_000) return `${Math.max(1, Math.floor(elapsed / 60_000))}分钟前`
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
  }
  return (
    <>
      <section
        key={dialogue.id}
        data-whale-dialogue
        data-visible={visible ? 'true' : 'false'}
        data-variant={dialogue.variant}
        data-context={dialogue.context ?? 'ordinary'}
        data-placement={placement}
        data-text-length={visibleText.length > 62 ? 'long' : visibleText.length > 34 ? 'medium' : 'short'}
        style={{ '--speech-width': `${bubbleWidth}px`, '--speech-height': `${bubbleHeight}px` } as React.CSSProperties}
        role="group"
        aria-label="鲸鱼娘对话框"
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          onHide()
          onComposerClose()
        }}
      >
        <svg data-whale-dialogue-cloud viewBox="0 0 260 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M43 128C25 124 18 111 22 94C8 82 11 61 28 51C25 33 43 18 62 22C74 7 98 9 112 23C127 8 151 10 164 25C181 15 202 24 205 43C223 45 234 61 228 77C241 89 237 109 219 117C212 134 189 140 171 129C157 143 132 141 118 128C101 141 78 138 68 126C58 131 50 131 43 128Z" fill="#fff" stroke="#28458e" strokeWidth="4" strokeLinejoin="round" />
          <g fill="none" stroke="#28458e" strokeWidth="4" strokeLinecap="round">
            <line x1="13" y1="49" x2="4" y2="42" /><line x1="17" y1="36" x2="14" y2="25" />
            <line x1="239" y1="48" x2="250" y2="39" /><line x1="236" y1="34" x2="239" y2="23" />
          </g>
        </svg>
        <span data-whale-dialogue-fin aria-hidden="true" />
        <button data-whale-dialogue-toggle type="button" onClick={onBubbleClick} aria-expanded={composerOpen}>
          {dialogue.speaker === undefined ? null : <span data-whale-dialogue-speaker>{dialogue.speaker}</span>}
          <strong data-whale-dialogue-message>{visibleText}</strong>
          <span data-whale-dialogue-subtext>{dialogue.subtext}</span>
        </button>
        <button
          data-whale-dialogue-hide
          type="button"
          aria-label="关闭对话框"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            onHide()
            onComposerClose()
          }}
        ><CloseIcon /></button>
      </section>
      <form
        data-whale-chat-composer
        data-open={composerOpen ? 'true' : 'false'}
        data-busy={busy ? 'true' : 'false'}
        aria-hidden={composerOpen ? 'false' : 'true'}
        aria-label="和鲸鱼娘对话"
        autoComplete="off"
        style={{ '--composer-x': `${offset.x}px`, '--composer-y': `${offset.y}px` } as React.CSSProperties}
        onSubmit={(event) => {
          event.preventDefault()
          const value = message.trim()
          if (value.length === 0 || busy) return
          setMessage('')
          onSubmit(value)
        }}
      >
        <div
          data-whale-chat-head
          onPointerDown={(event) => {
            if (event.button !== 0 || (event.target as HTMLElement).closest('button, select, input') !== null) return
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: offset.x, startY: offset.y }
          }}
          onPointerMove={(event) => {
            const active = drag.current
            if (active === undefined || active.pointerId !== event.pointerId) return
            setOffset({
              x: Math.max(-260, Math.min(260, active.startX + event.clientX - active.x)),
              y: Math.max(-220, Math.min(120, active.startY + event.clientY - active.y)),
            })
          }}
          onPointerUp={(event) => {
            if (drag.current?.pointerId === event.pointerId) drag.current = undefined
          }}
        >
          <span data-whale-chat-grip aria-hidden="true">
            <svg viewBox="0 0 18 24"><circle cx="6" cy="8" r="1.2" /><circle cx="12" cy="8" r="1.2" /><circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="6" cy="16" r="1.2" /><circle cx="12" cy="16" r="1.2" /></svg>
          </span>
          <span data-whale-chat-avatar aria-hidden="true">
            <img src={`${WHALE_IDLE_ASSET_URL}/source-master.png`} alt="" draggable={false} />
          </span>
          <span data-whale-chat-identity>
            <strong>鲸鱼娘</strong>
            <small>{llmEnabled ? '在线陪聊' : '离线陪聊'}</small>
          </span>
          <div data-whale-chat-options role="group" aria-label="对话模型">
            <button type="button" onClick={() => onLlmModeChange?.(false)} aria-pressed={!llmEnabled}>离线</button>
            <button type="button" onClick={() => onLlmModeChange?.(true)} aria-pressed={llmEnabled}>在线</button>
          </div>
          <div data-whale-chat-tools>
            <button data-whale-chat-history-toggle type="button" aria-label="查看对话记录和记忆" aria-expanded={historyOpen} onClick={() => setHistoryOpen(open => !open)}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5.5h10M5 9.5h10M5 13.5h6" /></svg>
            </button>
            <button data-whale-chat-close type="button" aria-label="收起输入框" title="收起" onClick={onComposerClose}><CloseIcon /></button>
          </div>
        </div>
        {historyOpen ? (
          <section data-whale-chat-history-panel aria-label="对话历史与记忆">
            <div data-whale-chat-history-tabs role="tablist" aria-label="记录类型">
              <button type="button" role="tab" aria-selected={historyTab === 'chat'} data-active={historyTab === 'chat' ? 'true' : 'false'} onClick={() => setHistoryTab('chat')}>对话记录 <small>{history.length}</small></button>
              <button type="button" role="tab" aria-selected={historyTab === 'memory'} data-active={historyTab === 'memory' ? 'true' : 'false'} onClick={() => setHistoryTab('memory')}>记忆时间线 <small>{memories.length}</small></button>
              {historyTab === 'chat' && history.length > 0 ? <button data-whale-chat-history-clear type="button" onClick={onClearHistory}>清空</button> : null}
            </div>
            {historyTab === 'chat' ? (
              history.length === 0
                ? <p data-whale-chat-history-empty>还没有聊天记录，从下面说第一句话吧。</p>
                : <div data-whale-chat-history-list>
                  {history.slice(-24).map(entry => (
                    <div data-whale-chat-history-item data-role={entry.role} key={entry.id}>
                      <span>{entry.role === 'user' ? '你' : '鲸鱼娘'}</span>
                      <p>{entry.text}</p>
                      <time>{formatTime(entry.at)}</time>
                    </div>
                  ))}
                </div>
            ) : (
              <div data-whale-chat-memory-list>
                <p data-whale-chat-memory-note>只保留轻量对话线索，不读取工作区内容。</p>
                {memories.length === 0
                  ? <p data-whale-chat-history-empty>暂时没有可记住的对话线索。</p>
                  : memories.map(memory => (
                    <div data-whale-chat-memory-item key={memory.id}>
                      <span data-kind={memory.kind ?? 'conversation'} aria-hidden="true" />
                      <div><strong>{memory.title}</strong><small>{memory.detail}</small></div>
                      <time>{formatTime(memory.at ?? 0)}</time>
                    </div>
                  ))}
              </div>
            )}
          </section>
        ) : null}
        {llmEnabled ? (
          <label data-whale-chat-model>
            <span>当前模型</span>
            <select aria-label="对话模型" value={llmModel} disabled={busy} onChange={(event) => onLlmModelChange?.(event.currentTarget.value)}>
              {!llmModels.includes(llmModel) && llmModel !== 'deepseek-chat' ? <option value={llmModel}>{llmModel}</option> : null}
              <option value="deepseek-chat">deepseek-chat</option>
              {llmModels.filter(model => model !== 'deepseek-chat').map(model => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
        ) : null}
        <div data-whale-chat-entry>
          <input
            value={message}
            maxLength={80}
            placeholder="想和她说点什么……"
            aria-label="对话内容"
            disabled={busy}
            onChange={(event) => setMessage(event.currentTarget.value)}
          />
          <button data-whale-chat-send type="submit" disabled={busy} aria-label={busy ? '正在思考' : '发送消息'} title={busy ? '正在思考' : '发送消息'}>
            {busy ? <span data-whale-chat-thinking aria-hidden="true">···</span> : <SendIcon />}
          </button>
        </div>
      </form>
    </>
  )
}
