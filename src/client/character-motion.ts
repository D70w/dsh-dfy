import { phaseDuration, type AutonomyEpisode } from '../autonomy.ts'

export type ReusableMotionClip = 'ready' | 'run'
export type MotionFacing = 'left' | 'right'

export interface CharacterMotionPose {
  clip: ReusableMotionClip | undefined
  clipElapsedMs: number
  facing: MotionFacing
  offset: { x: number; y: number }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function ease(value: number): number {
  const amount = clamp01(value)
  return 1 - (1 - amount) ** 3
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function facingFor(value: number, fallback: MotionFacing = 'left'): MotionFacing {
  return value === 0 ? fallback : value < 0 ? 'left' : 'right'
}

const RUN_CYCLE_MS = 900
const RUN_STRIDE_PX = 22

/** Tie gait phase to distance, so planted feet do not speed up or slip when a story changes pace. */
function gaitTime(distancePx: number): number {
  return Math.max(0, distancePx) / RUN_STRIDE_PX * RUN_CYCLE_MS
}

/** Pure 60FPS movement/clip plan shared by every story that moves the character. */
export function characterMotionPose(episode: AutonomyEpisode | undefined, now: number): CharacterMotionPose {
  if (episode === undefined || episode.story === 'nap') {
    return { clip: undefined, clipElapsedMs: 0, facing: 'left', offset: { x: 0, y: 0 } }
  }
  const elapsed = Math.max(0, now - episode.phaseStartedAt)
  const progress = clamp01(elapsed / phaseDuration(episode.phase, episode.story))

  if (episode.story === 'cursor_visit') {
    const target = episode.targetOffset
    const facing = facingFor(target.x || target.y)
    switch (episode.phase) {
      case 'notice':
        return { clip: 'ready', clipElapsedMs: elapsed, facing, offset: { x: 0, y: 0 } }
      case 'intend': {
        const amount = ease(progress) * 0.25
        return {
          clip: 'run',
          clipElapsedMs: gaitTime(Math.hypot(target.x, target.y) * amount),
          facing,
          offset: { x: target.x * amount, y: target.y * amount },
        }
      }
      case 'attempt': {
        const amount = 0.25 + ease(progress) * 0.75
        return {
          clip: 'run',
          clipElapsedMs: gaitTime(Math.hypot(target.x, target.y) * amount),
          facing,
          offset: { x: target.x * amount, y: target.y * amount },
        }
      }
      case 'result':
        return { clip: 'ready', clipElapsedMs: elapsed, facing, offset: target }
      case 'recover':
        return { clip: 'ready', clipElapsedMs: elapsed, facing, offset: target }
      case 'return-home': {
        const amount = 1 - ease(progress)
        return {
          clip: 'run',
          clipElapsedMs: gaitTime(Math.hypot(target.x, target.y) * (1 - amount)),
          facing: facingFor(-target.x || -target.y, facing === 'left' ? 'right' : 'left'),
          offset: { x: target.x * amount, y: target.y * amount },
        }
      }
    }
  }

  if (episode.story === 'rice_caught' || episode.story === 'bowl_accident' || episode.story === 'recovery_meal') {
    const targetX = -58
    switch (episode.phase) {
      case 'notice':
        return { clip: 'ready', clipElapsedMs: elapsed, facing: 'left', offset: { x: 0, y: 0 } }
      case 'intend': {
        const x = mix(0, -16, ease(progress))
        return { clip: 'run', clipElapsedMs: gaitTime(Math.abs(x)), facing: 'left', offset: { x, y: 0 } }
      }
      case 'attempt': {
        const x = mix(-16, targetX, ease(progress))
        return { clip: 'run', clipElapsedMs: gaitTime(Math.abs(x)), facing: 'left', offset: { x, y: 0 } }
      }
      case 'result':
      case 'recover':
        return { clip: undefined, clipElapsedMs: 0, facing: 'left', offset: { x: targetX, y: 0 } }
      case 'return-home': {
        const x = mix(targetX, 0, ease(progress))
        return {
          clip: 'run',
          clipElapsedMs: gaitTime(Math.abs(x - targetX)),
          facing: 'right',
          offset: { x, y: 0 },
        }
      }
    }
  }

  switch (episode.phase) {
    case 'notice':
      return { clip: 'ready', clipElapsedMs: elapsed, facing: 'left', offset: { x: 0, y: 0 } }
    case 'intend':
      return {
        clip: 'run',
        clipElapsedMs: gaitTime(Math.abs(mix(0, -18, ease(progress)))),
        facing: 'left',
        offset: { x: mix(0, -18, ease(progress)), y: 0 },
      }
    case 'attempt':
      return {
        clip: 'run',
        clipElapsedMs: gaitTime(Math.abs(mix(-18, -68, ease(progress)))),
        facing: 'left',
        offset: { x: mix(-18, -68, ease(progress)), y: 0 },
      }
    case 'result':
      return { clip: 'ready', clipElapsedMs: elapsed, facing: 'left', offset: { x: -68, y: 0 } }
    case 'recover':
      return { clip: 'ready', clipElapsedMs: elapsed, facing: 'left', offset: { x: -68, y: 0 } }
    case 'return-home':
      return {
        clip: 'run',
        clipElapsedMs: gaitTime(Math.abs(mix(0, 68, ease(progress)))),
        facing: 'right',
        offset: { x: mix(-68, 0, ease(progress)), y: 0 },
      }
  }
}
