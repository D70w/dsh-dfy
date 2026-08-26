import type { WhaleAction } from '../../../behavior.ts'
import type { ResolvedWhalePack, WhaleMotion, WhalePerformance } from './schema.ts'

export type ParameterValues = Record<string, number>

const CROSSFADE_MS = 120

function catmullRom(p0: number, p1: number, p2: number, p3: number, amount: number): number {
  const squared = amount * amount
  const cubed = squared * amount
  return 0.5 * (
    2 * p1
    + (-p0 + p2) * amount
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * squared
    + (-p0 + 3 * p1 - 3 * p2 + p3) * cubed
  )
}

export function sampleCurve(
  keyframes: readonly (readonly [number, number])[],
  atMs: number,
  interpolation: 'linear' | 'cubic' | 'step' = 'linear',
  loop = false,
): number {
  if (atMs <= keyframes[0]![0]) return keyframes[0]![1]
  for (let index = 1; index < keyframes.length; index += 1) {
    const right = keyframes[index]!
    if (atMs > right[0]) continue
    const left = keyframes[index - 1]!
    const span = right[0] - left[0]
    if (span <= 0) return right[1]
    if (interpolation === 'step') return atMs === right[0] ? right[1] : left[1]
    const ratio = (atMs - left[0]) / span
    if (interpolation === 'cubic' && keyframes.length >= 4) {
      const previous = index > 1
        ? keyframes[index - 2]![1]
        : loop ? keyframes.at(-2)![1] : left[1]
      const next = index + 1 < keyframes.length
        ? keyframes[index + 1]![1]
        : loop ? keyframes[1]![1] : right[1]
      return catmullRom(previous, left[1], right[1], next, ratio)
    }
    return left[1] + (right[1] - left[1]) * ratio
  }
  return keyframes.at(-1)![1]
}

function motionTime(motion: WhaleMotion, elapsedMs: number, loop: boolean): number {
  if (loop) return elapsedMs % motion.durationMs
  return Math.min(elapsedMs, motion.durationMs)
}

/** Renderer-independent pose and motion sampler with bounded action crossfades. */
export class MotionMixer {
  private action: WhaleAction
  private performance: WhalePerformance | undefined
  private startedAt: number
  private previous: ParameterValues | undefined
  private lastPerformanceAtMs = 0
  private readonly frameParameters: ReadonlySet<string>
  private readonly actorOpacityParameters: ReadonlySet<string>
  private readonly actorScaleXParameters: ReadonlySet<string>

  constructor(private readonly pack: ResolvedWhalePack, initial: WhaleAction, now: number) {
    this.action = initial
    this.startedAt = now
    this.frameParameters = new Set(pack.rig.parts.flatMap(part => part.frameParameter === undefined ? [] : [part.frameParameter]))
    this.actorOpacityParameters = new Set(pack.rig.parts.flatMap(part => part.opacityParameter === undefined ? [] : [part.opacityParameter]))
    this.actorScaleXParameters = new Set(pack.rig.parts.flatMap(part => (
      part.opacityParameter === undefined || part.scaleXParameter === undefined ? [] : [part.scaleXParameter]
    )))
  }

  setAction(action: WhaleAction, now: number): void {
    if (action === this.action) return
    if (this.performance === undefined) {
      this.previous = this.sample(now, false)
      this.startedAt = now
    }
    this.action = action
  }

  setPerformance(performance: WhalePerformance | undefined, now: number): void {
    if (performance === this.performance) return
    // Performances now share one stable full-character anchor. A bounded
    // parameter crossfade hides the ready/run sprite hand-off without changing
    // the distance-synchronised gait clock.
    this.previous = this.sample(now, false, this.lastPerformanceAtMs)
    this.performance = performance
    this.startedAt = now
    this.lastPerformanceAtMs = 0
  }

  reset(action: WhaleAction, now: number): void {
    this.action = action
    this.performance = undefined
    this.startedAt = now
    this.previous = undefined
  }

  sample(now: number, reducedMotion: boolean, performanceAtMs?: number): ParameterValues {
    const actionConfig = this.pack.manifest.actions[this.action]
    const performanceConfig = this.performance === undefined
      ? undefined
      : this.pack.manifest.performances[this.performance]
    const config = performanceConfig ?? actionConfig
    const motion = this.pack.motions.get(config.motion)!
    const values: ParameterValues = Object.fromEntries(this.pack.rig.parameters.map(parameter => [parameter.id, parameter.default]))
    Object.assign(values, this.pack.rig.poses[config.pose])
    if (performanceConfig === undefined) Object.assign(values, this.pack.expressions.expressions[actionConfig.expression])
    const elapsed = Math.max(0, now - this.startedAt)
    if (!reducedMotion) {
      const sourceTime = performanceConfig === undefined ? elapsed : performanceAtMs ?? elapsed
      const at = motionTime(motion, sourceTime, config.loop && motion.loop)
      for (const curve of motion.curves) {
        values[curve.parameter] = sampleCurve(curve.keyframes, at, curve.interpolation, config.loop && motion.loop)
      }
      if (performanceConfig !== undefined) this.lastPerformanceAtMs = sourceTime
    }
    if (this.previous !== undefined && elapsed < CROSSFADE_MS && !reducedMotion) {
      const ratio = elapsed / CROSSFADE_MS
      let actorHandoff = false
      for (const [id, target] of Object.entries(values)) {
        const source = this.previous[id] ?? target
        if (this.frameParameters.has(id)) {
          // Frame selectors are categorical, not geometric values. On entry use
          // the distance-synchronised target immediately; on exit hold the last
          // visible cel until its opacity reaches zero.
          values[id] = target < 0 && source >= 0 ? source : target
          continue
        }
        if (this.actorOpacityParameters.has(id) && source !== target) {
          // Whole-character cels may use different viewpoints. Drawing both
          // creates a double image; fading through zero creates a blank frame.
          // Switch once at the compressed midpoint instead.
          actorHandoff = true
          values[id] = ratio < 0.5 ? source : target
          continue
        }
        values[id] = source + (target - source) * ratio
      }
      if (actorHandoff) {
        const turnScale = 0.92 + 0.08 * Math.abs(ratio * 2 - 1)
        for (const id of this.actorScaleXParameters) values[id] = (values[id] ?? 1) * turnScale
      }
    } else {
      this.previous = undefined
    }
    for (const parameter of this.pack.rig.parameters) {
      values[parameter.id] = Math.min(parameter.max, Math.max(parameter.min, values[parameter.id] ?? parameter.default))
    }
    return values
  }
}
