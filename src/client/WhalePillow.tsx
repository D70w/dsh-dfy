import type { NapEpisode } from '../autonomy.ts'

export interface WhalePillowProps {
  episode: NapEpisode
}

/** Decorative cushion for the nap story; it never participates in hit testing. */
export function WhalePillow({ episode }: WhalePillowProps): React.JSX.Element {
  return (
    <>
      <span
        data-whale-autonomy-prop="pillow"
        data-phase={episode.phase}
        data-outcome={episode.outcome}
        aria-hidden="true"
      >
        <svg viewBox="0 0 72 64" role="presentation" aria-hidden="true">
          <path
            d="M7 40c6-6 44-6 50 0 4 4 4 10 0 14-6 6-44 6-50 0-4-4-4-10 0-14Z"
            fill="#d9e9ff"
            stroke="#31599c"
            strokeWidth="2"
          />
          <path d="M12 41c8 4 32 4 40 0M12 53c8-4 32-4 40 0" fill="none" stroke="#8fb9ec" strokeWidth="1.5" />
          <path d="M29 44c2-2 4-2 6 0l-3 5-3-5Z" fill="#31599c" opacity=".8" />
        </svg>
      </span>
      <span data-whale-autonomy-prop="sleep" data-phase={episode.phase} aria-hidden="true">
        <svg viewBox="0 0 38 34" role="presentation" aria-hidden="true">
          <path d="M3 24h10L3 32h10M13 13h9l-9 8h9M25 2h8l-8 7h8" fill="none" stroke="#5a7fc1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </>
  )
}
