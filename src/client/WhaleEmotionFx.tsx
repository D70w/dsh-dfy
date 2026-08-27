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
  } else if (name === 'hungry') {
    x = 62 + index * 7
    y = 23 - index * 5
    size = [12, 18, 57][index] ?? 18
    className = index === count - 1 ? 'rice-dream' : 'rice-thought'
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
        return <i key={`${command.id}-${index}`} className={`emotion-particle ${item.className}`} style={style}>{item.symbol}</i>
      })}
    </span>
  )
}
