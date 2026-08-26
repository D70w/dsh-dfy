import { useEffect, useRef } from 'react'
import { phaseDuration, type ButterflyEpisode } from '../autonomy.ts'

export interface WhaleButterflyProps {
  episode: ButterflyEpisode
}

export interface ButterflyPose {
  x: number
  y: number
  opacity: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Deterministic, prop-owned flight path independent from character cels. */
export function butterflyPose(episode: ButterflyEpisode, now: number): ButterflyPose {
  const progress = clamp01((now - episode.phaseStartedAt) / phaseDuration(episode.phase, 'butterfly'))
  const flutter = Math.sin(progress * Math.PI * 6 + episode.seed * 0.17)
  switch (episode.phase) {
    case 'notice': return { x: -52 - progress * 8, y: -34 + flutter * 4, opacity: 1 }
    case 'intend': return { x: -60 - progress * 28, y: -34 - progress * 12 + flutter * 5, opacity: 1 }
    case 'attempt': return { x: -88 - progress * 18 + Math.sin(progress * Math.PI * 2) * 16, y: -46 + flutter * 9, opacity: 1 }
    case 'result':
      return episode.outcome === 'success'
        ? { x: -26 + flutter * 2, y: -18 + flutter * 2, opacity: 1 - progress * 0.72 }
        : { x: -106 - progress * 52, y: -52 - progress * 46 + flutter * 7, opacity: 1 - progress }
    case 'recover':
    case 'return-home': return { x: -26, y: -18, opacity: 0 }
  }
}

/** Independent decorative actor; its route and wingbeat do not live in character art. */
export function WhaleButterfly({ episode }: WhaleButterflyProps): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const element = ref.current
    if (element === null) return
    let frame: number | undefined
    const draw = (): void => {
      const pose = butterflyPose(episode, Date.now())
      element.style.transform = `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0)`
      element.style.opacity = String(pose.opacity)
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (frame !== undefined) cancelAnimationFrame(frame) }
  }, [episode.id, episode.phase, episode.outcome])

  return (
    <span
      ref={ref}
      data-whale-autonomy-prop="butterfly"
      data-phase={episode.phase}
      data-outcome={episode.outcome}
      data-influence={episode.influence}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 20" role="presentation" aria-hidden="true">
        <path d="M11.5 10C7 2 1 2.5 2 7.5c.7 3.4 4.8 4 9.5 2.5Z" fill="#7fc8ff" stroke="#31599c" strokeWidth="1.2" />
        <path d="M12.5 10C17 2 23 2.5 22 7.5c-.7 3.4-4.8 4-9.5 2.5Z" fill="#a7ddff" stroke="#31599c" strokeWidth="1.2" />
        <path d="M12 8v8" stroke="#263d78" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 8c-1-2-2-3-3-3M12 8c1-2 2-3 3-3" fill="none" stroke="#263d78" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </span>
  )
}
