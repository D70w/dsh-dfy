/**
 * WhaleRig 2.0 phase 1B — side-run rig data (PoC).
 *
 * One 17-bone skeleton, 8 keyframe poses on a 1350 ms looping run clip, and a
 * near-leg foot contact window. This is DATA, not engine: the math kernel
 * (types/math/bones/motion/mesh/constraints) stays untouched.
 *
 * Conventions
 *  - Canvas y points DOWN; positive local angles rotate clockwise (x→y).
 *  - The character faces LEFT (travel direction is −x).
 *  - Children attach at their parent's tip plus a local translation.
 *  - Legs bend BACK (heel toward the tail): lower-leg local angles are
 *    negative, so knee flex = |lower-leg local| stays in [25°, 165°] and its
 *    sign never flips (that is the "no backfold" guard).
 *
 * The `RUN_PART_BINDINGS` map the probe sheet's 14 connected components onto
 * bones. This mapping is PROVISIONAL (component identity was inferred from
 * position/size/color heuristics, not visual review) and is the part a human
 * must correct before the sheet is treated as final art.
 */

import type { BoneDef, BoneLocal, Clip, FootContactConstraintDef, FootContactState, Keyframe, Pose } from './types.ts'
import { sampleClip } from './motion.ts'
import { BoneHierarchy, solveTwoBoneIK } from './bones.ts'
import { evaluateFootContact, inContactWindow } from './constraints.ts'

export interface RunPoseValues {
  bodyTy: number
  bodyRot: number
  head: number
  rearHair: number
  frontHair: number
  tailBody: number
  tailFlukes: number
  farUpperArm: number
  farForearm: number
  nearUpperArm: number
  nearForearm: number
  farThigh: number
  farLowerLeg: number
  farShoe: number
  nearThigh: number
  nearLowerLeg: number
  nearShoe: number
}

/** 17 bones: torso root, head(+face anchor), hair, tail, arms and legs. */
export const RUN_BONES: readonly BoneDef[] = [
  { id: 'torso', parent: null, length: 2, restAngle: 0 },
  { id: 'head', parent: 'torso', length: 8, restAngle: 0 },
  { id: 'face', parent: 'head', length: 1, restAngle: 0 },
  { id: 'rear-hair', parent: 'head', length: 13, restAngle: 0 },
  { id: 'front-hair', parent: 'head', length: 10, restAngle: 0 },
  { id: 'tail-body', parent: 'torso', length: 33, restAngle: 0 },
  { id: 'tail-flukes', parent: 'tail-body', length: 10, restAngle: 0 },
  { id: 'far-upper-arm', parent: 'torso', length: 11, restAngle: 0 },
  { id: 'far-forearm', parent: 'far-upper-arm', length: 10, restAngle: 0 },
  { id: 'near-upper-arm', parent: 'torso', length: 11, restAngle: 0 },
  { id: 'near-forearm', parent: 'near-upper-arm', length: 10, restAngle: 0 },
  { id: 'far-thigh', parent: 'torso', length: 13, restAngle: 0, bendDirection: 1 },
  { id: 'far-lower-leg', parent: 'far-thigh', length: 14, restAngle: 0 },
  { id: 'far-shoe', parent: 'far-lower-leg', length: 4, restAngle: 0 },
  { id: 'near-thigh', parent: 'torso', length: 13, restAngle: 0, bendDirection: 1 },
  { id: 'near-lower-leg', parent: 'near-thigh', length: 14, restAngle: 0 },
  { id: 'near-shoe', parent: 'near-lower-leg', length: 4, restAngle: 0 },
]

/** Local (parent-relative) placement of each limb attachment on the torso. */
export const RUN_BONE_LOCALS: Readonly<Record<string, { tx: number; ty: number }>> = {
  head: { tx: -4, ty: -17 },
  face: { tx: -8, ty: 1 },
  'rear-hair': { tx: 2, ty: -12 },
  'front-hair': { tx: 5, ty: -8 },
  'tail-body': { tx: 9, ty: 8 },
  'tail-flukes': { tx: 0, ty: 0 },
  'far-upper-arm': { tx: -2, ty: -10 },
  'far-forearm': { tx: 0, ty: 0 },
  'near-upper-arm': { tx: -7, ty: -9 },
  'near-forearm': { tx: 0, ty: 0 },
  'far-thigh': { tx: 3, ty: 7 },
  'far-lower-leg': { tx: 0, ty: 0 },
  'far-shoe': { tx: 0, ty: 0 },
  'near-thigh': { tx: -2, ty: 8 },
  'near-lower-leg': { tx: 0, ty: 0 },
  'near-shoe': { tx: 0, ty: 0 },
}

const pose = (values: RunPoseValues): RunPoseValues => values

/**
 * 8-pose run cycle (left-facing). P0 is the near-leg contact; the near leg is
 * re-solved by the foot contact IK during [0, 340) ms, everything else runs FK.
 * Lower-leg locals stay negative and within [−120°, −45°] → knee flex stays in
 * [45°, 120°], constant bend direction, no backfold by construction.
 */
export const RUN_POSES: readonly RunPoseValues[] = [
  pose({ bodyTy: 0, bodyRot: -3, head: 3, rearHair: 0, frontHair: 0, tailBody: 0, tailFlukes: -5,
    farUpperArm: 55, farForearm: -55, nearUpperArm: 105, nearForearm: -35,
    farThigh: 70, farLowerLeg: -90, farShoe: 10, nearThigh: 120, nearLowerLeg: -60, nearShoe: -6 }),
  pose({ bodyTy: 1.2, bodyRot: -2, head: 1, rearHair: -2, frontHair: 2, tailBody: 4, tailFlukes: -8,
    farUpperArm: 65, farForearm: -62, nearUpperArm: 96, nearForearm: -42,
    farThigh: 80, farLowerLeg: -100, farShoe: 12, nearThigh: 105, nearLowerLeg: -70, nearShoe: -4 }),
  pose({ bodyTy: -0.8, bodyRot: 0, head: 0, rearHair: -5, frontHair: 4, tailBody: 7, tailFlukes: -12,
    farUpperArm: 80, farForearm: -68, nearUpperArm: 80, nearForearm: -55,
    farThigh: 90, farLowerLeg: -85, farShoe: 6, nearThigh: 90, nearLowerLeg: -85, nearShoe: 6 }),
  pose({ bodyTy: -2, bodyRot: 2, head: -2, rearHair: -8, frontHair: 5, tailBody: 10, tailFlukes: -6,
    farUpperArm: 96, farForearm: -42, nearUpperArm: 64, nearForearm: -68,
    farThigh: 105, farLowerLeg: -70, farShoe: -4, nearThigh: 75, nearLowerLeg: -100, nearShoe: 12 }),
  pose({ bodyTy: 0, bodyRot: 3, head: -3, rearHair: -4, frontHair: 2, tailBody: 4, tailFlukes: 2,
    farUpperArm: 105, farForearm: -35, nearUpperArm: 55, nearForearm: -55,
    farThigh: 120, farLowerLeg: -60, farShoe: -6, nearThigh: 70, nearLowerLeg: -90, nearShoe: 10 }),
  pose({ bodyTy: 1.2, bodyRot: 2, head: -1, rearHair: 2, frontHair: -2, tailBody: -3, tailFlukes: 10,
    farUpperArm: 96, farForearm: -42, nearUpperArm: 65, nearForearm: -62,
    farThigh: 105, farLowerLeg: -70, farShoe: -4, nearThigh: 80, nearLowerLeg: -100, nearShoe: 12 }),
  pose({ bodyTy: -0.8, bodyRot: 0, head: 0, rearHair: 7, frontHair: -5, tailBody: -7, tailFlukes: 8,
    farUpperArm: 80, farForearm: -55, nearUpperArm: 80, nearForearm: -68,
    farThigh: 90, farLowerLeg: -85, farShoe: 6, nearThigh: 90, nearLowerLeg: -85, nearShoe: 6 }),
  pose({ bodyTy: -2, bodyRot: -2, head: 2, rearHair: 5, frontHair: -3, tailBody: -4, tailFlukes: 2,
    farUpperArm: 64, farForearm: -68, nearUpperArm: 96, nearForearm: -42,
    farThigh: 75, farLowerLeg: -100, farShoe: 12, nearThigh: 105, nearLowerLeg: -70, nearShoe: -4 }),
]

const CHANNELS: ReadonlyArray<{ key: keyof RunPoseValues; bone: string; property: 'angle' | 'ty' | 'tx' }> = [
  { key: 'bodyTy', bone: 'torso', property: 'ty' },
  { key: 'bodyRot', bone: 'torso', property: 'angle' },
  { key: 'head', bone: 'head', property: 'angle' },
  { key: 'rearHair', bone: 'rear-hair', property: 'angle' },
  { key: 'frontHair', bone: 'front-hair', property: 'angle' },
  { key: 'tailBody', bone: 'tail-body', property: 'angle' },
  { key: 'tailFlukes', bone: 'tail-flukes', property: 'angle' },
  { key: 'farUpperArm', bone: 'far-upper-arm', property: 'angle' },
  { key: 'farForearm', bone: 'far-forearm', property: 'angle' },
  { key: 'nearUpperArm', bone: 'near-upper-arm', property: 'angle' },
  { key: 'nearForearm', bone: 'near-forearm', property: 'angle' },
  { key: 'farThigh', bone: 'far-thigh', property: 'angle' },
  { key: 'farLowerLeg', bone: 'far-lower-leg', property: 'angle' },
  { key: 'farShoe', bone: 'far-shoe', property: 'angle' },
  { key: 'nearThigh', bone: 'near-thigh', property: 'angle' },
  { key: 'nearLowerLeg', bone: 'near-lower-leg', property: 'angle' },
  { key: 'nearShoe', bone: 'near-shoe', property: 'angle' },
]

export const RUN_DURATION_MS = 1350

/**
 * Build the looping clip. Keyframes sit at 0,1350/8,… ,1350 with the final
 * keyframe repeating P0, so the wrap segment interpolates P7→P0 and the loop
 * is continuous at the seam (linear keeps every value inside the pose bounds,
 * which is what keeps the knee-bend guarantees).
 */
export function buildRunClip(poses: readonly RunPoseValues[], durationMs = RUN_DURATION_MS): Clip {
  const step = durationMs / poses.length
  const keyframes = (boneKey: keyof RunPoseValues): Keyframe[] => {
    const frames: Keyframe[] = poses.map((pose, index) => ({
      t: Math.round(index * step * 1000) / 1000,
      value: pose[boneKey],
    }))
    frames.push({ t: durationMs, value: poses[0]![boneKey] })
    return frames
  }
  return {
    id: 'whale-side-run-1350',
    durationMs,
    loop: true,
    channels: CHANNELS.map(channel => ({
      bone: channel.bone,
      property: channel.property,
      curve: { interpolation: 'cubic' as const, keyframes: keyframes(channel.key) },
    })),
  }
}

export const RUN_CLIP: Clip = buildRunClip(RUN_POSES)

/**
 * Build the full run pose at `timeMs`: the clip drives angles (and torso body
 * bob), then static local placements (`RUN_BONE_LOCALS`) attach the limbs, and
 * the root is placed at `RUN_ROOT_POSITION` with the animated body bob added.
 */
export function buildRunPose(timeMs: number, out?: Record<string, BoneLocal>): Pose {
  const pose = sampleClip(RUN_CLIP, timeMs, RUN_BONES, out) as Record<string, BoneLocal>
  for (const bone of RUN_BONES) {
    const local = pose[bone.id]!
    const placement = RUN_BONE_LOCALS[bone.id]
    if (bone.parent === null) {
      local.tx = RUN_ROOT_POSITION[0]
      local.ty = RUN_ROOT_POSITION[1] + local.ty
    } else {
      local.tx = placement?.tx ?? 0
      local.ty = placement?.ty ?? 0
    }
  }
  return pose
}

export interface RunFrameSolution {
  /** Final pose: clip angles + placements + (during contact) the IK-solved near leg. */
  pose: Pose
  inContact: boolean
  /** Foot-contact IK target (the locked world point). */
  contactTargetX: number
  contactTargetY: number
  contactBone: string | null
}

/**
 * Solve one run frame through the whole pipeline: sample the clip, build the
 * pose, run FK, then — while the near leg is in its contact window — solve it
 * with two-bone IK against the locked world target. This is the single source
 * of truth both the acceptance harness and the visual preview consume.
 */
export function solveRunFrame(timeMs: number, state: FootContactState, out?: Record<string, BoneLocal>): RunFrameSolution {
  const pose = buildRunPose(timeMs, out) as Record<string, BoneLocal>
  const base = RUN_HIERARCHY.fk(pose)
  const active = RUN_CONTACTS.find(def => inContactWindow(
    timeMs, def.contactStartMs, def.contactWindowMs, RUN_CLIP.durationMs,
  ))
  if (active === undefined) {
    state.locked = false
    state.lastTimeMs = timeMs
    state.lastInContact = false
    const end = base[RUN_HIERARCHY.boneIndex(RUN_NEAR_LEG.end)]!
    return { pose, inContact: false, contactTargetX: end.x, contactTargetY: end.y, contactBone: null }
  }
  const endIndex = RUN_HIERARCHY.boneIndex(active.chain.end)
  const end = base[endIndex]!
  const contact = evaluateFootContact(active, timeMs, RUN_CLIP.durationMs, end.x, end.y, state)
  const thighIndex = RUN_HIERARCHY.boneIndex(active.chain.hip)
  const lowerIndex = RUN_HIERARCHY.boneIndex(active.chain.knee)
  const thigh = RUN_BONES[thighIndex]!
  const hip = base[thighIndex]!
  const parentIndex = thigh.parent === null ? -1 : RUN_HIERARCHY.boneIndex(thigh.parent)
  const parentAngle = parentIndex < 0 ? 0 : base[parentIndex]!.angle
  const ik = solveTwoBoneIK({
    lengthA: thigh.length,
    lengthB: RUN_BONES[lowerIndex]!.length,
    rootX: hip.x,
    rootY: hip.y,
    targetX: contact.targetX,
    targetY: contact.targetY,
    bendDirection: thigh.bendDirection ?? 1,
  })
  pose[active.chain.hip] = {
    angle: ik.rootAngle - parentAngle,
    tx: pose[active.chain.hip]!.tx,
    ty: pose[active.chain.hip]!.ty,
  }
  pose[active.chain.knee] = { angle: ik.midAngle - ik.rootAngle, tx: 0, ty: 0 }
  return {
    pose,
    inContact: true,
    contactTargetX: contact.targetX,
    contactTargetY: contact.targetY,
    contactBone: active.chain.end,
  }
}

/** Near leg is the planted/contact leg during the stance phase of the cycle. */
export const RUN_NEAR_LEG: { hip: string; knee: string; end: string } = {
  hip: 'near-thigh',
  knee: 'near-lower-leg',
  end: 'near-shoe',
}

export const RUN_CONTACTS: readonly FootContactConstraintDef[] = [
  {
    id: 'near-foot-contact',
    chain: RUN_NEAR_LEG,
    contactStartMs: 0,
    contactWindowMs: 285,
  },
  {
    id: 'far-foot-contact',
    chain: { hip: 'far-thigh', knee: 'far-lower-leg', end: 'far-shoe' },
    contactStartMs: RUN_DURATION_MS / 2,
    contactWindowMs: 285,
  },
]

/** The bone whose joint is the face anchor (head tip marker). */
export const RUN_FACE_ANCHOR = 'face'

/** Canvas size the preview rig is authored against. */
export const RUN_CANVAS_SIZE: readonly [number, number] = [112, 112]

/** Torso root placement on the canvas. */
export const RUN_ROOT_POSITION: readonly [number, number] = [43, 62]

/** Calibrates the complete parts silhouette to the normalized 224→112 template stage. */
export const RUN_PART_STAGE_TRANSFORM = {
  pivot: [56, 60] as const,
  offset: [-2, 9] as const,
  scaleX: 1,
  scaleY: 1.09,
}

/**
 * Provisional mapping from probe-sheet components (parts-layout.json ids) to
 * bones. `rect` is the source rect in the 1254×1254 sheet; `anchor` is the
 * part-local fraction (0..1 each) pinned to the bone's joint; `z` is the draw
 * order. PROVISIONAL: identities inferred from position/size/color heuristics,
 * not visual review — correct this before final art.
 */
export interface Rig2PartBinding {
  id: string
  bone: string
  rect: readonly [number, number, number, number]
  /** Source-space point that sits at `bindPosition` in the reference pose. */
  anchor: readonly [number, number]
  /** World-space anchor position in the reference pose. */
  bindPosition: readonly [number, number]
  bindAngle: number
  scale: number
  deform?: 'hair' | 'skirt' | 'tail'
  z: number
}

export const RUN_PART_BINDINGS: readonly Rig2PartBinding[] = [
  { id: 'tail-flukes', bone: 'tail-flukes', rect: [28, 885, 217, 208], anchor: [0, 0], bindPosition: [87, 70], bindAngle: 0, scale: 0.08, z: -9 },
  { id: 'tail-body', bone: 'tail-body', rect: [1086, 684, 226, 137], anchor: [0, 0], bindPosition: [58, 70], bindAngle: 0, scale: 0.145, deform: 'tail', z: -8 },
  { id: 'skirt-back', bone: 'torso', rect: [928, 447, 352, 159], anchor: [0, 0], bindPosition: [23, 66], bindAngle: 0, scale: 0.13, deform: 'skirt', z: -7 },
  { id: 'back-hair', bone: 'rear-hair', rect: [481, 28, 346, 391], anchor: [0, 0], bindPosition: [37, 17], bindAngle: 0, scale: 0.12, deform: 'hair', z: -6 },
  { id: 'side-lock-far', bone: 'rear-hair', rect: [966, 28, 91, 205], anchor: [0, 0], bindPosition: [44, 32], bindAngle: 0, scale: 0.14, z: -5 },
  { id: 'lower-leg-far', bone: 'far-lower-leg', rect: [731, 684, 159, 166], anchor: [0, 0], bindPosition: [51, 81], bindAngle: 0, scale: 0.075, z: -4 },
  { id: 'thigh-far', bone: 'far-thigh', rect: [464, 684, 105, 164], anchor: [0, 0], bindPosition: [48, 73], bindAngle: 0, scale: 0.075, z: -3 },
  { id: 'upper-arm-far', bone: 'far-upper-arm', rect: [1308, 447, 116, 131], anchor: [0, 0], bindPosition: [38, 49], bindAngle: 0, scale: 0.085, z: -2 },
  { id: 'forearm-far', bone: 'far-forearm', rect: [28, 684, 123, 114], anchor: [0, 0], bindPosition: [29, 53], bindAngle: 0, scale: 0.085, z: -1 },
  { id: 'torso', bone: 'torso', rect: [366, 447, 170, 180], anchor: [0, 0], bindPosition: [30, 46], bindAngle: 0, scale: 0.16, z: 0 },
  { id: 'skirt-front', bone: 'torso', rect: [564, 447, 336, 170], anchor: [0, 0], bindPosition: [23, 65], bindAngle: 0, scale: 0.13, deform: 'skirt', z: 1 },
  { id: 'head-base', bone: 'head', rect: [28, 28, 189, 222], anchor: [0, 0], bindPosition: [12, 16], bindAngle: 0, scale: 0.18, z: 2 },
  { id: 'bangs', bone: 'front-hair', rect: [245, 28, 208, 214], anchor: [0, 0], bindPosition: [10, 11], bindAngle: 0, scale: 0.18, z: 3 },
  { id: 'headdress', bone: 'head', rect: [28, 447, 310, 209], anchor: [0, 0], bindPosition: [15, 4], bindAngle: 0, scale: 0.13, z: 4 },
  { id: 'ahoge', bone: 'head', rect: [1085, 28, 98, 74], anchor: [0, 0], bindPosition: [20, 3], bindAngle: 0, scale: 0.13, z: 5 },
  { id: 'upper-arm-near', bone: 'near-upper-arm', rect: [179, 684, 103, 111], anchor: [0, 0], bindPosition: [32, 50], bindAngle: 0, scale: 0.085, z: 6 },
  { id: 'forearm-near', bone: 'near-forearm', rect: [310, 684, 126, 116], anchor: [0, 0], bindPosition: [25, 54], bindAngle: 0, scale: 0.085, z: 7 },
  { id: 'lower-leg-near', bone: 'near-lower-leg', rect: [918, 684, 140, 163], anchor: [0, 0], bindPosition: [25, 81], bindAngle: 0, scale: 0.075, z: 8 },
  { id: 'thigh-near', bone: 'near-thigh', rect: [597, 684, 106, 173], anchor: [0, 0], bindPosition: [36, 72], bindAngle: 0, scale: 0.075, z: 9 },
  { id: 'side-lock-near', bone: 'front-hair', rect: [855, 28, 83, 220], anchor: [0, 0], bindPosition: [49, 31], bindAngle: 0, scale: 0.14, z: 10 },
]

const RUN_HIERARCHY = new BoneHierarchy(RUN_BONES)
