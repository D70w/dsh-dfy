/**
 * WhaleRig 2.0 phase 1A — loop clip sampling.
 *
 * `sampleCurve` interpolates one scalar curve (linear or Catmull-Rom cubic).
 * `sampleClip` drives a full pose from the channels of a `Clip`, producing
 * continuous local transforms for every bone.
 *
 * Loop guarantees:
 *  - A looping clip wraps time into [0, durationMs), so sampling at `durationMs`
 *    is identical to sampling at `0` (strict closure).
 *  - Catmull-Rom segments wrap their neighbour keyframes across the loop seam,
 *    so the velocity/curvature is continuous at t=0.
 */

import type { BoneDef, BoneLocal, Clip, Curve, Pose } from './types.ts'

/** Public easing sampler used by both animation curves and debug controls. */
export function applyEasing(interpolation: Curve['interpolation'], amount: number): number {
  const value = Math.min(1, Math.max(0, amount))
  if (interpolation === 'easeIn') return value * value
  if (interpolation === 'easeOut') return 1 - (1 - value) * (1 - value)
  if (interpolation === 'easeInOut') {
    return value < 0.5 ? 2 * value * value : 1 - ((-2 * value + 2) ** 2) / 2
  }
  return value
}

function hermite(
  leftValue: number,
  rightValue: number,
  leftTangent: number,
  rightTangent: number,
  amount: number,
  span: number,
): number {
  const squared = amount * amount
  const cubed = squared * amount
  const h00 = 2 * cubed - 3 * squared + 1
  const h10 = cubed - 2 * squared + amount
  const h01 = -2 * cubed + 3 * squared
  const h11 = cubed - squared
  return h00 * leftValue + h10 * span * leftTangent
    + h01 * rightValue + h11 * span * rightTangent
}

function assertKeyframes(curve: Curve): void {
  for (let index = 0; index < curve.keyframes.length; index += 1) {
    const current = curve.keyframes[index]!
    if (!Number.isFinite(current.t) || !Number.isFinite(current.value)) {
      throw new Error('whale-rig2: curve keyframes must be finite')
    }
    if (index > 0 && current.t <= curve.keyframes[index - 1]!.t) {
      throw new Error('whale-rig2: curve keyframes must be strictly increasing')
    }
  }
}

function sampleNonLoopingCubic(curve: Curve, leftIndex: number, at: number): number {
  const keys = curve.keyframes
  const left = keys[leftIndex]!
  const right = keys[leftIndex + 1]!
  const previous = keys[leftIndex - 1]
  const next = keys[leftIndex + 2]
  const leftTangent = previous === undefined
    ? (right.value - left.value) / (right.t - left.t)
    : (right.value - previous.value) / (right.t - previous.t)
  const rightTangent = next === undefined
    ? (right.value - left.value) / (right.t - left.t)
    : (next.value - left.value) / (next.t - left.t)
  const span = right.t - left.t
  return hermite(left.value, right.value, leftTangent, rightTangent, (at - left.t) / span, span)
}

function sampleLoopingCurve(curve: Curve, at: number, durationMs: number): number {
  const source = curve.keyframes
  const last = source[source.length - 1]!
  const first = source[0]!
  const hasClosingDuplicate = last.t === durationMs && last.value === first.value
  const keys = hasClosingDuplicate ? source.slice(0, -1) : source
  if (keys.length === 1) return keys[0]!.value

  let leftIndex = keys.length - 1
  let rightIndex = 0
  let sampleAt = at
  let leftTime = keys[leftIndex]!.t
  let rightTime = keys[0]!.t + durationMs

  for (let index = 0; index < keys.length - 1; index += 1) {
    const left = keys[index]!
    const right = keys[index + 1]!
    if (at >= left.t && at <= right.t) {
      leftIndex = index
      rightIndex = index + 1
      leftTime = left.t
      rightTime = right.t
      break
    }
  }
  if (at < keys[0]!.t) sampleAt += durationMs

  const left = keys[leftIndex]!
  const right = keys[rightIndex]!
  const span = rightTime - leftTime
  const amount = (sampleAt - leftTime) / span
  if (curve.interpolation !== 'cubic') {
    const eased = applyEasing(curve.interpolation, amount)
    return left.value + (right.value - left.value) * eased
  }

  const previousIndex = (leftIndex - 1 + keys.length) % keys.length
  const nextIndex = (rightIndex + 1) % keys.length
  let previousTime = keys[previousIndex]!.t
  let nextTime = keys[nextIndex]!.t
  if (previousIndex >= leftIndex) previousTime -= durationMs
  if (nextIndex <= rightIndex) nextTime += durationMs
  if (rightIndex === 0) nextTime = keys[nextIndex]!.t + durationMs
  const leftTangent = (right.value - keys[previousIndex]!.value) / (rightTime - previousTime)
  const rightTangent = (keys[nextIndex]!.value - left.value) / (nextTime - leftTime)
  return hermite(left.value, right.value, leftTangent, rightTangent, amount, span)
}

/**
 * Sample a scalar curve at `timeMs`.
 *
 * `durationMs` is the loop period (used only when `loop`). For a looping curve
 * the time is wrapped into [0, durationMs) and the Catmull-Rom tangents wrap
 * around the loop. For a non-looping curve the value clamps at both ends.
 */
export function sampleCurve(
  curve: Curve,
  timeMs: number,
  loop: boolean,
  durationMs: number,
): number {
  const keyframes = curve.keyframes
  if (keyframes.length === 0) throw new Error('whale-rig2: curve must have at least one keyframe')
  if (keyframes.length === 1) return keyframes[0]!.value
  assertKeyframes(curve)

  let at = timeMs
  if (loop) {
    if (durationMs <= 0) throw new Error('whale-rig2: looping curve needs a positive duration')
    at = ((at % durationMs) + durationMs) % durationMs
    return sampleLoopingCurve(curve, at, durationMs)
  }

  if (at <= keyframes[0]!.t) return keyframes[0]!.value
  for (let index = 1; index < keyframes.length; index += 1) {
    const right = keyframes[index]!
    if (at > right.t) continue
    const left = keyframes[index - 1]!
    const span = right.t - left.t
    if (span <= 0) return right.value
    const ratio = (at - left.t) / span
    if (curve.interpolation === 'cubic') return sampleNonLoopingCubic(curve, index - 1, at)
    return left.value + (right.value - left.value) * applyEasing(curve.interpolation, ratio)
  }
  return keyframes[keyframes.length - 1]!.value
}

/**
 * Sample a full clip into a pose. `bones` supplies the bone id list so the
 * result has exactly one entry per bone. When `out` is provided its entries are
 * reused (matching entries are overwritten); otherwise a fresh pose is built.
 * Missing channels leave a bone at its rest transform.
 */
export function sampleClip(
  clip: Clip,
  timeMs: number,
  bones: readonly BoneDef[],
  out?: Record<string, BoneLocal>,
): Pose {
  const pose = out ?? {} as Record<string, BoneLocal>
  for (const bone of bones) {
    if (pose[bone.id] === undefined) pose[bone.id] = { angle: bone.restAngle ?? 0, tx: 0, ty: 0 }
  }
  // Reset every bone to its rest transform, then apply only the animated ones.
  for (const bone of bones) {
    const local = pose[bone.id]!
    local.angle = bone.restAngle ?? 0
    local.tx = 0
    local.ty = 0
  }
  for (const channel of clip.channels) {
    const local = pose[channel.bone]
    if (local === undefined) {
      throw new Error(`whale-rig2: channel targets unknown bone "${channel.bone}" in clip "${clip.id}"`)
    }
    const value = sampleCurve(channel.curve, timeMs, clip.loop, clip.durationMs)
    if (channel.property === 'angle') local.angle = value
    else if (channel.property === 'tx') local.tx = value
    else local.ty = value
  }
  return pose
}
