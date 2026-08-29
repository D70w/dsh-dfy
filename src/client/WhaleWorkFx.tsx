import type React from 'react'
import type { WhaleToolKind } from '../activity/types.ts'

/**
 * Small, language-independent props for work-state cues.  The face still
 * carries the emotion; these objects make the action immediately legible even
 * when the character is viewed at a small size.
 */
export function WhaleWorkFx({ kind }: { kind: WhaleToolKind | undefined }): React.JSX.Element | null {
  if (kind === undefined || kind === 'none' || kind === 'other') return null

  return (
    <span key={kind} data-whale-work-fx data-tool-kind={kind} aria-hidden="true">
      <span className="whale-work-object" data-work-object={kind}>
        {kind === 'search' ? <SearchIcon /> : null}
        {kind === 'read' ? <ReadIcon /> : null}
        {kind === 'command' ? <CommandIcon /> : null}
        {kind === 'write' ? <WriteIcon /> : null}
      </span>
    </span>
  )
}

function SearchIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon" viewBox="0 0 64 64" fill="none">
      <circle className="work-icon-shell" cx="27" cy="27" r="17" />
      <path className="work-icon-accent" d="m39 39 14 14" />
      <path className="work-icon-glint" d="M22 17c-4 1-7 4-8 8" />
    </svg>
  )
}

function ReadIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon" viewBox="0 0 64 64" fill="none">
      <path className="work-icon-page-back" d="M16 10h25l9 9v35H16z" />
      <path className="work-icon-shell" d="M12 7h25l9 9v35H12z" />
      <path className="work-icon-fold" d="M37 7v10h9" />
      <path className="work-icon-line" d="M20 29h19M20 37h19M20 45h13" />
    </svg>
  )
}

function CommandIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon" viewBox="0 0 64 64" fill="none">
      <rect className="work-icon-shell" x="7" y="12" width="50" height="39" rx="7" />
      <path className="work-icon-bar" d="M8 23h48" />
      <path className="work-icon-accent" d="m19 34 6 6-6 6M31 46h13" />
      <circle className="work-icon-status" cx="15" cy="18" r="2" />
    </svg>
  )
}

function WriteIcon(): React.JSX.Element {
  return (
    <svg className="whale-work-icon" viewBox="0 0 64 64" fill="none">
      <path className="work-icon-line" d="M12 52h39" />
      <path className="work-icon-pencil" d="m18 43 4-14L44 7l10 10-22 22-14 4Z" />
      <path className="work-icon-pencil-edge" d="m39 12 10 10M22 29l10 10" />
      <path className="work-icon-tip" d="m18 43 4-14 10 10-14 4Z" />
    </svg>
  )
}
