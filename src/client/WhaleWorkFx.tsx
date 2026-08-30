import type React from 'react'
import type { WhaleToolKind } from '../activity/types.ts'
import type { WhaleWorkReaction } from '../activity/types.ts'

/**
 * Small, language-independent props for work-state cues.  The face still
 * carries the emotion; these objects make the action immediately legible even
 * when the character is viewed at a small size.
 */
export function WhaleWorkFx({ kind, reaction = 'none' }: { kind: WhaleToolKind | undefined; reaction?: WhaleWorkReaction }): React.JSX.Element | null {
  const hasTool = kind !== undefined && kind !== 'none' && kind !== 'other'
  const hasResult = reaction === 'completed' || reaction === 'error'
  if (!hasTool && !hasResult) return null

  return (
    <span key={`${kind ?? 'none'}-${reaction}`} data-whale-work-fx data-tool-kind={kind ?? 'none'} data-work-reaction={reaction} aria-hidden="true">
      {hasTool ? (
        <span className="whale-work-object" data-work-object={kind}>
          {kind === 'search' ? <SearchIcon /> : null}
          {kind === 'read' ? <ReadIcon /> : null}
          {kind === 'command' ? <CommandIcon /> : null}
          {kind === 'write' ? <WriteIcon /> : null}
        </span>
      ) : null}
      {hasResult ? <span className={`whale-result-object whale-result-object-${reaction}`} data-work-result={reaction}>{reaction === 'completed' ? <SuccessSealIcon /> : <ErrorRepairKitIcon />}</span> : null}
    </span>
  )
}

function SuccessSealIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon whale-result-icon" data-work-detail="success" viewBox="0 0 96 96" fill="none">
      <path className="result-success-ribbon" d="m28 63-7 24 19-9 10 15 7-27M68 63l7 24-19-9-10 15-7-27" />
      <circle className="result-success-seal" cx="48" cy="43" r="29" />
      <path className="result-success-check" d="m32 43 10 10 22-23" />
      <path className="result-success-glint" d="m78 14 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z" />
    </svg>
  )
}

function ErrorRepairKitIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon whale-result-icon" data-work-detail="error" viewBox="0 0 96 96" fill="none">
      <path className="result-error-handle" d="M35 39V29c0-7 6-11 13-11h0c7 0 13 4 13 11v10" />
      <rect className="result-error-toolbox" x="16" y="36" width="64" height="43" rx="8" />
      <path className="result-error-latch" d="M16 51h64M43 43h10v8H43z" />
      <path className="result-error-wrench" d="M68 43c-5-4-12-1-13 5l5 5-18 18c-2 2-2 5 0 7 2 2 5 2 7 0l18-18 5 5c6-2 9-9 5-14l-5 4-6-6Z" />
      <path className="result-error-spark" d="m78 12 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z" />
      <path className="result-error-glint" d="M26 45c1-6 5-11 10-14" />
    </svg>
  )
}

function SearchIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon" data-work-detail="search" viewBox="0 0 64 64" fill="none">
      <circle className="work-icon-shell" cx="27" cy="27" r="19" />
      <circle className="work-icon-lens" cx="27" cy="27" r="14" />
      <path className="work-icon-scan" d="M15 28c1-7 6-12 13-13" />
      <path className="work-icon-ray" d="M10 18h6M14 10l4 5M10 35h6" />
      <path className="work-icon-accent" d="m39 39 14 14" />
      <path className="work-icon-glint" d="M22 17c-4 1-7 4-8 8" />
      <circle className="work-icon-scan-dot" cx="31" cy="24" r="2" />
      <path className="work-icon-scan-line" d="M18 31h15" />
    </svg>
  )
}

function ReadIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon" data-work-detail="read" viewBox="0 0 64 64" fill="none">
      <path className="work-icon-page-back" d="M16 10h25l9 9v35H16z" />
      <path className="work-icon-shell" d="M12 7h25l9 9v35H12z" />
      <path className="work-icon-fold" d="M37 7v10h9" />
      <path className="work-icon-spine" d="M17 10v37" />
      <path className="work-icon-line" d="M22 27h17M22 35h20M22 43h14" />
      <path className="work-icon-bookmark" d="M37 20v12l4-3 4 3V20" />
      <path className="work-icon-page-glint" d="M22 18h8" />
      <path className="work-icon-page-turn" d="M27 48c4 3 9 3 14 0" />
    </svg>
  )
}

function CommandIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon" data-work-detail="command" viewBox="0 0 64 64" fill="none">
      <rect className="work-icon-shell" x="7" y="12" width="50" height="39" rx="7" />
      <path className="work-icon-bar" d="M8 23h48" />
      <circle className="work-icon-status" cx="15" cy="18" r="2" />
      <circle className="work-icon-status work-icon-status-alt" cx="22" cy="18" r="2" />
      <path className="work-icon-accent" d="m18 34 6 6-6 6M30 46h14" />
      <path className="work-icon-output" d="M31 32h14M31 38h9" />
      <path className="work-icon-cursor" d="M44 44v4" />
      <circle className="work-icon-network" cx="48" cy="32" r="1.6" />
      <circle className="work-icon-network" cx="48" cy="38" r="1.6" />
    </svg>
  )
}

function WriteIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon" data-work-detail="write" viewBox="0 0 64 64" fill="none">
      <path className="work-icon-paper" d="M11 17h27l7 7v28H11z" />
      <path className="work-icon-paper-fold" d="M38 17v8h7" />
      <path className="work-icon-line" d="M17 34h15M17 41h11M12 52h39" />
      <path className="work-icon-pencil" d="m18 43 4-14L44 7l10 10-22 22-14 4Z" />
      <path className="work-icon-pencil-edge" d="m39 12 10 10M22 29l10 10" />
      <path className="work-icon-tip" d="m18 43 4-14 10 10-14 4Z" />
      <path className="work-icon-ink" d="M16 47h9" />
      <path className="work-icon-stroke" d="M17 24h11M17 27h7" />
    </svg>
  )
}
