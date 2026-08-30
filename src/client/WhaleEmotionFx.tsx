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

function AngerMarkIcon(): React.JSX.Element {
  return (
    <svg className="anger-mark-icon" data-whale-anger-mark viewBox="0 0 100 100" aria-hidden="true">
      <g fill="#e52338" stroke="#211a27" strokeWidth="7" strokeLinejoin="round">
        <path d="M17 30 30 17l22 22-11 11-10-10-6 6Z" />
        <path d="m70 17 13 13-22 22-11-11 10-10-6-6Z" />
        <path d="m17 70 13-13 22 22-11 11-10-10-6 6Z" />
        <path d="m70 83-13-13 22-22 11 11-10 10 6 6Z" />
      </g>
      <path d="M45 45 55 55M55 45 45 55" stroke="#fff0e9" strokeWidth="3.5" strokeLinecap="round" opacity=".9" />
    </svg>
  )
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

function SadRainCloudIcon({ id }: { id: number }): React.JSX.Element {
  const gradientId = `whale-sad-cloud-${id}`
  return (
    <svg className="emotion-scene-icon sad-rain-icon" data-whale-sad-cloud viewBox="0 0 128 106" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="32" y1="21" x2="91" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#aebbd2" /><stop offset=".55" stopColor="#7183a4" /><stop offset="1" stopColor="#526580" />
        </linearGradient>
      </defs>
      <ellipse className="sad-cloud-shadow" cx="64" cy="72" rx="43" ry="8" />
      <g className="sad-cloud-body" fill={`url(#${gradientId})`} stroke="#40516f" strokeWidth="3.2" strokeLinejoin="round">
        <path d="M24 66c-10-2-16-10-14-20 2-9 10-14 20-13 3-14 15-23 29-20 8-10 24-11 34-2 7 6 10 14 9 23 11 0 19 8 18 18-1 9-8 15-18 15H29l-5-1Z" />
      </g>
      <path className="sad-cloud-highlight" d="M28 39c7-8 16-9 25-5 7-12 20-15 31-8" />
      <g className="sad-rain-drops">
        <path d="M37 74c-7 9-8 14-3 17 5 3 10-1 9-6-1-4-3-7-6-11Z" />
        <path d="M63 76c-7 10-8 15-3 18 5 3 11-1 10-7-1-4-4-8-7-11Z" />
        <path d="M89 73c-7 9-8 14-3 17 5 3 10-1 9-6-1-4-3-7-6-11Z" />
      </g>
    </svg>
  )
}

function HappySunIcon({ id }: { id: number }): React.JSX.Element {
  const gradientId = `whale-happy-sun-${id}`
  return (
    <svg className="emotion-scene-icon happy-sun-icon" data-whale-happy-sun viewBox="0 0 96 96" aria-hidden="true">
      <defs>
        <radialGradient id={gradientId} cx="42%" cy="34%" r="64%">
          <stop offset="0" stopColor="#fff9bf" /><stop offset=".58" stopColor="#ffd86d" /><stop offset="1" stopColor="#f4a947" />
        </radialGradient>
      </defs>
      <g className="happy-sun-rays" fill="#ffd66b" stroke="#e69c3e" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M48 3l6 15H42l6-15ZM48 93l-6-15h12l-6 15ZM3 48l15-6v12L3 48ZM93 48l-15 6V42l15 6ZM16 16l15 6-9 9-6-15ZM80 80l-15-6 9-9 6 15ZM80 16l-6 15-9-9 15-6ZM16 80l6-15 9 9-15 6Z" />
      </g>
      <circle className="happy-sun-core" cx="48" cy="48" r="27" fill={`url(#${gradientId})`} stroke="#d98b37" strokeWidth="3" />
      <path className="happy-sun-glint" d="M34 34c6-7 15-9 23-5" />
    </svg>
  )
}

function ProudCrownIcon({ id }: { id: number }): React.JSX.Element {
  const gradientId = `whale-proud-crown-${id}`
  return (
    <svg className="emotion-scene-icon proud-crown-icon" data-whale-proud-crown viewBox="0 0 112 86" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="28" y1="14" x2="81" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff2a0" /><stop offset=".48" stopColor="#ffd05b" /><stop offset="1" stopColor="#e79a35" />
        </linearGradient>
      </defs>
      <path className="proud-crown-shadow" d="M20 68c16 8 56 8 72 0" />
      <path className="proud-crown-body" fill={`url(#${gradientId})`} d="M18 25 39 42l17-29 17 29 22-17-8 42H26l-8-42Z" />
      <path className="proud-crown-band" d="M27 56h59l-2 14H30l-3-14Z" />
      <g className="proud-crown-jewels"><circle cx="40" cy="62" r="4" /><path d="m56 56 6 6-6 6-6-6 6-6Z" /><circle cx="72" cy="62" r="4" /></g>
      <path className="proud-crown-glint" d="m85 12 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z" />
    </svg>
  )
}

function DeterminedTargetIcon(): React.JSX.Element {
  return (
    <svg className="emotion-scene-icon determined-target-icon" data-whale-determined-target viewBox="0 0 100 100" aria-hidden="true">
      <g className="determined-target-rings"><circle cx="45" cy="55" r="31" /><circle cx="45" cy="55" r="20" /><circle cx="45" cy="55" r="8" /></g>
      <g className="determined-target-arrow"><path d="M79 14 48 52" /><path d="m72 14 14-4-3 14M50 50l-5 5" /></g>
      <path className="determined-target-glint" d="m80 58 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
    </svg>
  )
}

function RelievedTeaIcon({ id }: { id: number }): React.JSX.Element {
  const gradientId = `whale-relieved-tea-${id}`
  return (
    <svg className="emotion-scene-icon relieved-tea-icon" data-whale-relieved-tea viewBox="0 0 112 92" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="25" y1="38" x2="76" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#effcff" /><stop offset=".6" stopColor="#b8e7e1" /><stop offset="1" stopColor="#75c3ba" />
        </linearGradient>
      </defs>
      <g className="relieved-tea-steam" fill="none" strokeLinecap="round"><path d="M39 32c-8-9 8-12 2-24" /><path d="M59 31c-7-10 8-13 2-25" /></g>
      <ellipse className="relieved-tea-saucer" cx="50" cy="78" rx="37" ry="8" />
      <path className="relieved-tea-cup" fill={`url(#${gradientId})`} d="M18 39h65c-1 25-11 37-31 38-21-1-32-13-34-38Z" />
      <path className="relieved-tea-rim" d="M18 39c12 8 52 8 65 0" /><path className="relieved-tea-handle" d="M82 45c21-3 22 22 3 23" />
      <path className="relieved-tea-wave" d="M36 59c5-5 10-5 15 0 5 5 10 5 15 0" />
    </svg>
  )
}

const SCENE_PROP_EMOTIONS = new Set<WhaleEmotionName>(['sad', 'happy', 'proud', 'determined', 'relieved'])

function EmotionSceneProp({ command }: { command: WhaleEmotionCommand }): React.JSX.Element | null {
  if (!SCENE_PROP_EMOTIONS.has(command.name)) return null
  const placementByEmotion = {
    sad: { x: '77%', y: '15%', width: 96, height: 80 },
    happy: { x: '75%', y: '17%', width: 68, height: 68 },
    proud: { x: '74%', y: '14%', width: 80, height: 62 },
    determined: { x: '76%', y: '18%', width: 68, height: 68 },
    relieved: { x: '76%', y: '24%', width: 76, height: 62 },
  } as const
  const layout = placementByEmotion[command.name as keyof typeof placementByEmotion]
  if (!layout) return null
  const style = {
    '--fx-x': layout.x, '--fx-y': layout.y,
    '--fx-duration': `${Math.max(900, command.durationMs)}ms`,
    '--prop-width': `${layout.width}px`, '--prop-height': `${layout.height}px`,
  } as React.CSSProperties
  return (
    <i className={`emotion-scene-prop emotion-scene-prop-${command.name}`} style={style}>
      {command.name === 'sad' ? <SadRainCloudIcon id={command.id} />
        : command.name === 'happy' ? <HappySunIcon id={command.id} />
          : command.name === 'proud' ? <ProudCrownIcon id={command.id} />
            : command.name === 'determined' ? <DeterminedTargetIcon />
              : <RelievedTeaIcon id={command.id} />}
    </i>
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
    className = index === 0 ? 'anger-mark' : 'anger-steam'
  } else if (name === 'surprise') {
    x = 64 - index * 4
    y = 17 + index * 7
  } else if (name === 'confused') {
    x = 64 + index * 7
    y = 21 - index * 6
    className = index === 0 ? 'question' : 'thought-dot'
    size = index === 0 ? 31 : 11 - index
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
    className = index === 0 ? 'relief' : 'relief-spark'
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
      <EmotionSceneProp command={command} />
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
            {item.className === 'rice-dream' ? <RiceBowlIcon id={command.id} /> : item.className === 'anger-mark' ? <AngerMarkIcon /> : item.symbol}
          </i>
        )
      })}
    </span>
  )
}
