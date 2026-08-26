/**
 * WhaleRig 2.0 phase 1A — world-space foot contact constraint.
 *
 * During the contact window the foot (end-effector) is locked to the world
 * position it occupied on the first in-window sample. The constraint only
 * returns a world target for the two-bone IK to reach; it never writes story
 * displacement into the bone animation (poses stay untouched by this module).
 *
 * The contact window is clip-relative and may wrap across the loop seam:
 * `contactWindowMs` longer than the clip means "always in contact".
 */

import type { FootContactConstraintDef, FootContactResult, FootContactState } from './types.ts'

function wrappedTime(timeMs: number, durationMs: number): number {
  return ((timeMs % durationMs) + durationMs) % durationMs
}

/** True when `t` (wrapped) falls inside `[start, start + window)` mod `duration`. */
export function inContactWindow(
  timeMs: number,
  startMs: number,
  windowMs: number,
  durationMs: number,
): boolean {
  if (durationMs <= 0) throw new Error('whale-rig2: contact needs a positive clip duration')
  const window = Math.min(windowMs, durationMs)
  if (window >= durationMs) return true
  const at = wrappedTime(timeMs, durationMs)
  const start = ((startMs % durationMs) + durationMs) % durationMs
  const end = start + window
  if (end <= durationMs) return at >= start && at < end
  return at >= start || at < end - durationMs
}

/**
 * Evaluate a foot contact constraint at one time sample.
 *
 * On the first in-window sample the constraint latches the current end-effector
 * world position (optionally snapped to `groundY`) into `state`. While locked
 * it returns that fixed target; outside the window it releases the lock and
 * reports `inContact: false` (the caller then animates the foot freely).
 */
export function evaluateFootContact(
  def: FootContactConstraintDef,
  timeMs: number,
  durationMs: number,
  endWorldX: number,
  endWorldY: number,
  state: FootContactState,
): FootContactResult {
  const inContact = inContactWindow(timeMs, def.contactStartMs, def.contactWindowMs, durationMs)
  const lastTime = state.lastTimeMs
  const elapsed = lastTime === undefined ? 0 : timeMs - lastTime
  const discontinuity = lastTime !== undefined
    && (elapsed < 0 || elapsed >= durationMs || elapsed > Math.min(125, Math.max(50, def.contactWindowMs / 2)))
  if (discontinuity) state.locked = false

  if (inContact) {
    if (!state.locked || state.lastInContact !== true) {
      state.locked = true
      state.lockedX = endWorldX
      state.lockedY = def.groundY === undefined ? endWorldY : def.groundY
      state.episode = (state.episode ?? 0) + 1
    }
    state.lastTimeMs = timeMs
    state.lastInContact = true
    // Disabled axes keep tracking the animation instead of the locked value.
    return {
      inContact: true,
      targetX: def.lockX === false ? endWorldX : state.lockedX,
      targetY: def.lockY === false ? endWorldY : state.lockedY,
    }
  }
  state.locked = false
  state.lastTimeMs = timeMs
  state.lastInContact = false
  return { inContact: false, targetX: endWorldX, targetY: endWorldY }
}
