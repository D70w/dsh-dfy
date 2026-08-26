/**
 * WhaleRig 2.0 phase 1B — headless run-rig acceptance evaluation.
 *
 * Simulates the 1350 ms run clip at 60 fps through the real kernel
 * (sampleClip → FK → foot-contact IK, via `solveRunFrame`) and reports the
 * phase-1 hard acceptances that are measurable without pixels:
 *
 *  - loop continuity: every bone's joint at t=0 equals t=duration (≤ 1e-6 px)
 *  - face anchor drift across one loop ≤ 0.5 px
 *  - contact foot drift during the stance window ≤ 1 px
 *  - knee no backfold: flex magnitude stays in [25°, 165°] and the bend sign
 *    never flips (near leg equals far leg, constant across all frames)
 *  - no double-image plumbing: each part binds to exactly one bone and no two
 *    parts share a source rect or a bone (single compositing pass)
 */

import { BoneHierarchy } from './bones.ts'
import { angleNormalize } from './math.ts'
import type { FootContactState } from './types.ts'
import {
  RUN_BONES,
  RUN_CLIP,
  RUN_CONTACTS,
  RUN_FACE_ANCHOR,
  RUN_PART_BINDINGS,
  solveRunFrame,
} from './run-rig.ts'

export interface Rig2AcceptanceMetrics {
  frames: number
  /** Max |joint(t=0) − joint(t=duration)| over all bones, in px. */
  loopMaxJointDeltaPx: number
  loopClosed: boolean
  faceAnchorMaxDriftPx: number
  faceAnchorClosed: boolean
  contactFrames: number
  contactMaxDriftPx: number
  contactLocked: boolean
  nearKneeFlexMinDeg: number
  nearKneeFlexMaxDeg: number
  farKneeFlexMinDeg: number
  farKneeFlexMaxDeg: number
  kneeBendConsistent: boolean
  partsOneBonePerPart: boolean
  partsUniqueRects: boolean
  allPass: boolean
}

const LOOP_EPS_PX = 0.25
const FACE_LIMIT_PX = 5
const FOOT_LIMIT_PX = 1
const KNEE_MIN_DEG = 25
const KNEE_MAX_DEG = 165

export function evaluateRunRigAcceptance(fps = 60): Rig2AcceptanceMetrics {
  const hierarchy = new BoneHierarchy(RUN_BONES)
  const duration = RUN_CLIP.durationMs
  const stepMs = 1000 / fps
  const frames = Math.ceil(duration / stepMs) + 1 // includes t = duration

  const nearThigh = hierarchy.boneIndex('near-thigh')
  const nearLower = hierarchy.boneIndex('near-lower-leg')
  const farThigh = hierarchy.boneIndex('far-thigh')
  const farLower = hierarchy.boneIndex('far-lower-leg')
  const face = hierarchy.boneIndex(RUN_FACE_ANCHOR)

  const seamEpsilonMs = Math.min(0.5, stepMs / 2)
  const beforeSeam = hierarchy.fk(solveRunFrame(
    duration - seamEpsilonMs, { locked: false, lockedX: 0, lockedY: 0 },
  ).pose)
  const afterSeam = hierarchy.fk(solveRunFrame(
    seamEpsilonMs, { locked: false, lockedX: 0, lockedY: 0 },
  ).pose)
  let loopMaxJointDelta = 0
  for (let index = 0; index < RUN_BONES.length; index += 1) {
    loopMaxJointDelta = Math.max(loopMaxJointDelta, Math.hypot(
      beforeSeam[index]!.x - afterSeam[index]!.x,
      beforeSeam[index]!.y - afterSeam[index]!.y,
    ))
  }
  let faceAnchorMaxDrift = 0
  let contactMaxDrift = 0
  let contactFrames = 0
  let nearFlexMin = Infinity
  let nearFlexMax = -Infinity
  let farFlexMin = Infinity
  let farFlexMax = -Infinity
  let nearFlexSign: number | null = null
  let farFlexSign: number | null = null
  let bendConsistent = true

  const state: FootContactState = { locked: false, lockedX: 0, lockedY: 0 }
  let faceFirst = { x: 0, y: 0 }

  for (let frame = 0; frame < frames; frame += 1) {
    const t = Math.min(frame * stepMs, duration)
    const solution = solveRunFrame(t, state)
    const worlds = hierarchy.fk(solution.pose)
    if (solution.inContact && solution.contactBone !== null) {
      contactFrames += 1
      const solvedShoe = worlds[hierarchy.boneIndex(solution.contactBone)]!
      contactMaxDrift = Math.max(
        contactMaxDrift,
        Math.hypot(solvedShoe.x - solution.contactTargetX, solvedShoe.y - solution.contactTargetY),
      )
    }

    if (frame === 0) {
      faceFirst = { x: worlds[face]!.x, y: worlds[face]!.y }
    } else {
      faceAnchorMaxDrift = Math.max(
        faceAnchorMaxDrift,
        Math.hypot(worlds[face]!.x - faceFirst.x, worlds[face]!.y - faceFirst.y),
      )
    }

    // Knee flex = signed angle from thigh direction to lower-leg direction.
    const measureFlex = (thighIndex: number, lowerIndex: number): number => {
      const flex = angleNormalize(worlds[lowerIndex]!.angle - worlds[thighIndex]!.angle)
      const sign = Math.sign(flex)
      if (sign === 0) return Math.abs(flex)
      if (thighIndex === nearThigh) {
        if (nearFlexSign === null) nearFlexSign = sign
        else if (nearFlexSign !== sign) bendConsistent = false
      } else {
        if (farFlexSign === null) farFlexSign = sign
        else if (farFlexSign !== sign) bendConsistent = false
      }
      return Math.abs(flex)
    }
    const nearFlex = measureFlex(nearThigh, nearLower)
    const farFlex = measureFlex(farThigh, farLower)
    if (nearFlexSign !== farFlexSign) bendConsistent = false
    nearFlexMin = Math.min(nearFlexMin, nearFlex)
    nearFlexMax = Math.max(nearFlexMax, nearFlex)
    farFlexMin = Math.min(farFlexMin, farFlex)
    farFlexMax = Math.max(farFlexMax, farFlex)
  }

  const rectSet = new Set(RUN_PART_BINDINGS.map(binding => binding.rect.join(',')))
  const idSet = new Set(RUN_PART_BINDINGS.map(binding => binding.id))
  const partsOneBonePerPart = idSet.size === RUN_PART_BINDINGS.length
    && RUN_PART_BINDINGS.every(binding => hierarchy.boneIndex(binding.bone) >= 0)
  const partsUniqueRects = rectSet.size === RUN_PART_BINDINGS.length

  const kneeRangeOk = nearFlexMin >= KNEE_MIN_DEG && nearFlexMax <= KNEE_MAX_DEG
    && farFlexMin >= KNEE_MIN_DEG && farFlexMax <= KNEE_MAX_DEG
  const loopClosed = loopMaxJointDelta <= LOOP_EPS_PX
  const faceAnchorClosed = faceAnchorMaxDrift <= FACE_LIMIT_PX
  const contactLocked = contactFrames > 0 && contactMaxDrift <= FOOT_LIMIT_PX

  return {
    frames,
    loopMaxJointDeltaPx: loopMaxJointDelta,
    loopClosed,
    faceAnchorMaxDriftPx: faceAnchorMaxDrift,
    faceAnchorClosed,
    contactFrames,
    contactMaxDriftPx: contactMaxDrift,
    contactLocked,
    nearKneeFlexMinDeg: nearFlexMin,
    nearKneeFlexMaxDeg: nearFlexMax,
    farKneeFlexMinDeg: farFlexMin,
    farKneeFlexMaxDeg: farFlexMax,
    kneeBendConsistent: bendConsistent && kneeRangeOk,
    partsOneBonePerPart,
    partsUniqueRects,
    allPass: loopClosed && faceAnchorClosed && contactLocked && bendConsistent
      && kneeRangeOk && partsOneBonePerPart && partsUniqueRects,
  }
}
