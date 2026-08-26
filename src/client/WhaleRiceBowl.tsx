import { useEffect, useRef } from 'react'
import { phaseDuration, type RiceStoryEpisode } from '../autonomy.ts'
import { characterMotionPose } from './character-motion.ts'

export interface WhaleRiceBowlProps {
  episode: RiceStoryEpisode
}

export interface RiceBowlPose {
  x: number
  y: number
  rotation: number
  opacity: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Keep the bowl at a world-space spot while the character runs inside the
 * translated stage. This proves the prop is not baked into character art.
 */
export function riceBowlPose(episode: RiceStoryEpisode, now: number): RiceBowlPose {
  const progress = clamp01((now - episode.phaseStartedAt) / phaseDuration(episode.phase, episode.story))
  const character = characterMotionPose(episode, now)
  const worldX = -76
  const localX = worldX - character.offset.x
  if (episode.story === 'bowl_accident') {
    switch (episode.phase) {
      case 'notice': return { x: localX, y: 20, rotation: -3, opacity: progress * 0.35 }
      case 'intend': return { x: localX, y: 20, rotation: -3 + progress * 7, opacity: 0.35 + progress * 0.65 }
      case 'attempt': return { x: localX, y: 18 + progress * 2, rotation: 4 + progress * 18, opacity: 1 }
      case 'result': return { x: localX + progress * 7, y: 20 + progress * 9, rotation: 22 + progress * 48, opacity: 1 }
      case 'recover': return { x: localX + 7, y: 29, rotation: 70 - progress * 10, opacity: 1 - progress * 0.18 }
      case 'return-home': return { x: localX + 7, y: 29, rotation: 60, opacity: 0 }
    }
  }
  if (episode.story === 'recovery_meal') {
    switch (episode.phase) {
      case 'notice': return { x: localX + 7, y: 29, rotation: 60, opacity: progress * 0.55 }
      case 'intend': return { x: localX + 7 - progress * 7, y: 29 - progress * 11, rotation: 60 * (1 - progress), opacity: 0.55 + progress * 0.45 }
      case 'attempt': return { x: localX, y: 18, rotation: Math.sin(progress * Math.PI) * -3, opacity: 1 }
      case 'result': return { x: localX, y: 18, rotation: Math.sin(progress * Math.PI * 4) * 1.1, opacity: 1 }
      case 'recover': return { x: localX, y: 18 + progress * 5, rotation: -progress * 4, opacity: 1 - progress * 0.8 }
      case 'return-home': return { x: localX, y: 23, rotation: -4, opacity: 0 }
    }
  }
  switch (episode.phase) {
    case 'notice': return { x: localX, y: 20, rotation: 0, opacity: progress * 0.2 }
    case 'intend': return { x: localX, y: 20 - progress * 2, rotation: 0, opacity: 0.2 + progress * 0.8 }
    case 'attempt': return { x: localX, y: 18, rotation: 0, opacity: 1 }
    case 'result': return { x: localX, y: 18, rotation: Math.sin(progress * Math.PI * 4) * 1.2, opacity: 1 }
    case 'recover': {
      const caught = episode.outcome === 'caught_by_user'
      return {
        x: localX + (caught ? progress * 5 : 0),
        y: 18 + progress * (caught ? 7 : 3),
        rotation: progress * (caught ? 18 : -4),
        opacity: 1 - progress * 0.82,
      }
    }
    case 'return-home': return { x: localX, y: 22, rotation: 0, opacity: 0 }
  }
}

/** Independent rice-bowl actor assembled from SVG shapes, outside WhaleRig textures. */
export function WhaleRiceBowl({ episode }: WhaleRiceBowlProps): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = ref.current
    if (element === null) return
    let frame: number | undefined
    const draw = (): void => {
      const pose = riceBowlPose(episode, Date.now())
      element.style.transform = `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0) rotate(${pose.rotation.toFixed(2)}deg)`
      element.style.opacity = String(pose.opacity)
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (frame !== undefined) cancelAnimationFrame(frame) }
  }, [episode.id, episode.outcome, episode.phase, episode.phaseStartedAt])

  return (
    <span
      ref={ref}
      data-whale-autonomy-prop="rice-bowl"
      data-phase={episode.phase}
      data-outcome={episode.outcome}
      data-story={episode.story}
      aria-hidden="true"
    >
      <svg viewBox="0 0 52 42" role="presentation" aria-hidden="true">
        <ellipse cx="26" cy="14" rx="20" ry="10" fill="#f8fbff" stroke="#31599c" strokeWidth="1.7" />
        <path d="M8 15c1.7 15 8 22 18 22s16.3-7 18-22c-5 4-31 4-36 0Z" fill="#84bff2" stroke="#31599c" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M11 18c5 3 25 4 30 0" fill="none" stroke="#d5efff" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 36h14" stroke="#31599c" strokeWidth="1.8" strokeLinecap="round" />
        <g data-rice-grains fill="#fffdf7" stroke="#b7c8dc" strokeWidth=".7">
          <ellipse cx="15" cy="10" rx="5.5" ry="3.4" transform="rotate(-16 15 10)" />
          <ellipse cx="23" cy="7" rx="5.8" ry="3.5" transform="rotate(8 23 7)" />
          <ellipse cx="32" cy="8" rx="5.8" ry="3.5" transform="rotate(-8 32 8)" />
          <ellipse cx="38" cy="12" rx="5.2" ry="3.2" transform="rotate(14 38 12)" />
          <ellipse cx="26" cy="13" rx="6.2" ry="3.7" />
        </g>
        {episode.story === 'bowl_accident' ? (
          <g data-rice-spill fill="#fffdf7" stroke="#b7c8dc" strokeWidth=".7">
            <ellipse cx="7" cy="34" rx="4.8" ry="2.8" transform="rotate(-18 7 34)" />
            <ellipse cx="18" cy="39" rx="4.5" ry="2.6" transform="rotate(12 18 39)" />
            <ellipse cx="33" cy="38" rx="4.8" ry="2.8" transform="rotate(-8 33 38)" />
          </g>
        ) : null}
        {episode.story === 'recovery_meal' ? (
          <g data-clean-cloth>
            <path d="M3 31c6-3 14-2 19 2l-3 7H2Z" fill="#d7f3f5" stroke="#4f83a5" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="m5 35 12-1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
          </g>
        ) : null}
        <path d="M18 23c4 2 12 2 16 0" fill="none" stroke="#5d91c7" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
      </svg>
    </span>
  )
}
