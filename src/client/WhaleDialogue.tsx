import { useRef, useState } from 'react'
import type { DialogueLine } from './emotions.ts'

export type DialogueVariant = 'speech' | 'metric' | 'feedback'
export type DialoguePlacement = 'above' | 'side-left' | 'side-right'

export interface WhaleDialogueState extends DialogueLine {
  id: number
  variant: DialogueVariant
  context?: 'ordinary' | 'account-balance' | 'deepseek-peak' | 'reply'
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
}

export function WhaleDialogue({
  dialogue, visible, composerOpen, busy = false, placement,
  onBubbleClick, onHide, onComposerClose, onSubmit,
}: WhaleDialogueProps): React.JSX.Element {
  const [message, setMessage] = useState('')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number }>()
  return (
    <>
      <section
        key={dialogue.id}
        data-whale-dialogue
        data-visible={visible ? 'true' : 'false'}
        data-variant={dialogue.variant}
        data-context={dialogue.context ?? 'ordinary'}
        data-placement={placement}
        role="group"
        aria-label="鲸鱼娘对话框"
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
          <strong data-whale-dialogue-message>{dialogue.text}</strong>
          <span data-whale-dialogue-subtext>{dialogue.subtext}</span>
        </button>
        <button data-whale-dialogue-hide type="button" aria-label="隐藏对话框" onClick={onHide}>×</button>
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
            if (event.button !== 0) return
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
          <span data-whale-chat-grip aria-hidden="true">≡</span>
          <strong>和鲸鱼娘说话</strong>
          <button type="button" aria-label="收起输入框" onClick={onComposerClose}>×</button>
        </div>
        <div data-whale-chat-entry>
          <input
            value={message}
            maxLength={80}
            placeholder="想和她说点什么……"
            aria-label="对话内容"
            disabled={busy}
            onChange={(event) => setMessage(event.currentTarget.value)}
          />
          <button type="submit" disabled={busy}>{busy ? '思考中' : '发送'}</button>
        </div>
      </form>
    </>
  )
}
