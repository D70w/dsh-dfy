import type React from 'react'
import { EMOTION_PROFILES, type WhaleEmotionName } from './emotions.ts'

export interface WhaleEmotionCommand {
  id: number
  name: WhaleEmotionName
  durationMs: number
  originX?: number
}

interface ParticlePlacement {
  x: number
  y: number
  size: number
  drift: number
  className: string
  symbol: string
}

function RiceBowlIcon({ id }: { id: number }): React.JSX.Element {
  const bowlGradientId = `whale-rice-bowl-${id}`
  return (
    <svg data-whale-rice-bowl viewBox="0 0 96 88" aria-hidden="true">
      <defs>
        <linearGradient id={bowlGradientId} x1="18" y1="45" x2="75" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b8d2ff" />
          <stop offset=".46" stopColor="#6f94db" />
          <stop offset="1" stopColor="#3d62ae" />
        </linearGradient>
      </defs>
      <ellipse className="rice-bowl-shadow" cx="48" cy="79" rx="28" ry="5" />
      <g className="rice-steam" fill="none" strokeLinecap="round">
        <path d="M32 26c-5-6 5-8 1-15" />
        <path d="M48 23c-5-7 6-9 1-18" />
        <path d="M63 27c-4-6 5-8 2-14" />
      </g>
      <ellipse className="rice-bowl-rim-back" cx="48" cy="50" rx="35" ry="11" />
      <path
        className="rice-mound"
        d="M17 49c1-7 7-11 14-10 0-7 6-12 13-9 4-8 15-8 19 0 8-2 15 4 15 12 5 1 8 4 8 8-17 7-51 8-69-1Z"
      />
      <g className="rice-grains">
        <ellipse cx="34" cy="41" rx="4.2" ry="1.7" transform="rotate(-19 34 41)" />
        <ellipse cx="45" cy="34" rx="4.1" ry="1.6" transform="rotate(13 45 34)" />
        <ellipse cx="57" cy="38" rx="4.3" ry="1.7" transform="rotate(-8 57 38)" />
        <ellipse cx="68" cy="44" rx="3.8" ry="1.5" transform="rotate(22 68 44)" />
        <ellipse cx="47" cy="46" rx="4" ry="1.6" transform="rotate(-16 47 46)" />
      </g>
      <path className="rice-bowl-body" fill={`url(#${bowlGradientId})`} d="M14 49c2 19 13 28 34 29 21-1 32-10 34-29-17 7-51 7-68 0Z" />
      <path className="rice-bowl-rim-front" d="M14 49c8 7 58 8 68 0l-2 8c-17 8-47 8-64 0l-2-8Z" />
      <path className="rice-bowl-highlight" d="M23 58c4 8 10 12 18 14" />
      <path className="rice-bowl-wave" d="M34 64c4-4 8-4 12 0 4 4 8 4 13 0" />
      <path className="rice-bowl-foot" d="M35 77h26c0 4-4 6-13 6s-13-2-13-6Z" />
    </svg>
  )
}

function placement(name: WhaleEmotionName, index: number, count: number, originX: number): ParticlePlacement {
  const side = index % 2 === 0 ? -1 : 1
  const tier = Math.floor(index / 2)
  let x = originX * 100 + side * (9 + tier * 5)
  let y = 25 + index % 3 * 5
  let size = 24 + index % 2 * 5
  let className = EMOTION_PROFILES[name].className
  let symbol = EMOTION_PROFILES[name].symbol ?? ''
  if (name === 'angry') {
    x = 67 + index * 2
    y = 16 + index % 2 * 5
    className = index === 0 ? 'anger' : 'anger-steam'
  } else if (name === 'surprise') {
    x = 64 - index * 4
    y = 17 + index * 7
  } else if (name === 'confused') {
    x = 64 + index * 7
    y = 21 - index * 6
  } else if (name === 'sleepy') {
    x = 64 + index * 7
    y = 22 - index * 6
    size = [31, 24, 18][index] ?? 18
  } else if (name === 'nervous') {
    // Sweat starts at the temple, then follows the cheek as smaller delayed
    // beads. Keeping the cluster close to the face reads as tension instead
    // of a generic cyan particle burst.
    x = 69 + index * 2.8
    y = 24 + index * 6
    size = [17, 12, 8][index] ?? 8
    className = index === 0 ? 'sweat-bead' : 'sweat-trail'
  } else if (name === 'shy') {
    x = 50 + side * (9 + tier * 5)
    y = 31 + tier * 4
    size = 21 + index % 2 * 3
  } else if (name === 'relieved') {
    x = 50 + side * 11
    y = 31 + index * 4
  } else if (name === 'determined') {
    x = 62 + index * 5
    y = 22 + index % 2 * 5
  }
  return {
    x: Math.max(8, Math.min(92, x)), y, size,
    drift: side * (13 + index * 2), className, symbol,
  }
}

export function WhaleEmotionFx({ command }: { command: WhaleEmotionCommand | undefined }): React.JSX.Element | null {
  if (command === undefined) return null
  const profile = EMOTION_PROFILES[command.name]
  const originX = Math.max(.18, Math.min(.82, command.originX ?? .5))
  if (command.name === 'hungry') {
    const style = {
      '--fx-x': '72%',
      '--fx-y': '15%',
      '--fx-duration': `${Math.max(900, command.durationMs)}ms`,
    } as React.CSSProperties
    return (
      <span key={command.id} data-whale-emotion-fx data-emotion={command.name} aria-hidden="true">
        <i className="emotion-particle rice-dream-cluster" style={style}>
          <span className="rice-thought rice-thought-small" />
          <span className="rice-thought rice-thought-medium" />
          <span className="rice-dream"><RiceBowlIcon id={command.id} /></span>
        </i>
      </span>
    )
  }
  return (
    <span key={command.id} data-whale-emotion-fx data-emotion={command.name} aria-hidden="true">
      {Array.from({ length: profile.count }, (_, index) => {
        const item = placement(command.name, index, profile.count, originX)
        const style = {
          '--fx-x': `${item.x}%`,
          '--fx-y': `${item.y}%`,
          '--fx-size': `${item.size}px`,
          '--fx-drift': `${item.drift}px`,
          '--fx-rotate': `${(index - profile.count / 2) * 6}deg`,
          '--fx-duration': `${Math.max(900, command.durationMs - index * 45)}ms`,
          animationDelay: `${index * 95}ms`,
        } as React.CSSProperties
        return (
          <i key={`${command.id}-${index}`} className={`emotion-particle ${item.className}`} style={style}>
            {item.className === 'rice-dream' ? <RiceBowlIcon id={command.id} /> : item.symbol}
          </i>
        )
      })}
    </span>
  )
}
