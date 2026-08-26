/**
 * WhaleRig 2.0 phase 1A — skeleton hierarchy, forward kinematics and two-bone IK.
 *
 * A `BoneHierarchy` validates the bone list once (duplicate ids, unknown
 * parents, cycles, non-positive lengths) and precomputes a parent-first resolve
 * order, so FK can run without re-checking or re-sorting each frame.
 *
 * The two-bone IK is the analytic closed-form solver with a stable unreachable
 * clamp (fully straightens along the root→target ray instead of flipping), an
 * optional bend-direction preference, and optional local-angle limits.
 */

import type { BoneDef, BoneLocal, BoneWorld, Mat2D, Pose } from './types.ts'
import { DEG_TO_RAD, matFromTRS } from './math.ts'

/** Result of a two-bone IK solve: absolute world rotations in degrees. */
export interface TwoBoneIKResult {
  /** World rotation (degrees) of the root bone. */
  rootAngle: number
  /** World rotation (degrees) of the mid bone. */
  midAngle: number
}

/** Optional local-angle limits (degrees), relative to each bone's parent. */
export interface TwoBoneIKLimits {
  root?: { min: number; max: number }
  mid?: { min: number; max: number }
}

export interface SolveTwoBoneIKArgs {
  /** Rest length of the root (hip→knee) bone, > 0. */
  lengthA: number
  /** Rest length of the mid (knee→end) bone, > 0. */
  lengthB: number
  /** Current world position of the root joint (hip). */
  rootX: number
  rootY: number
  /** World target for the chain end. */
  targetX: number
  targetY: number
  /** Bend preference: +1 = mid joint on +Y side of the root→target ray. */
  bendDirection: 1 | -1
  /** Parent world rotation used to interpret `limits.root` as a local angle. */
  parentAngle?: number
  /** Optional local-angle limits per bone (degrees). */
  limits?: TwoBoneIKLimits
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/**
 * Analytic two-bone IK. Returns absolute world angles so the caller can convert
 * them to local angles using the parent's world rotation. Unreachable targets
 * are clamped to the fully-extended chain (stable, never flips sign); targets
 * inside the inner reach are clamped to the fully-folded chain.
 */
export function solveTwoBoneIK(args: SolveTwoBoneIKArgs): TwoBoneIKResult {
  const a = args.lengthA
  const b = args.lengthB
  if (!(a > 0) || !(b > 0) || !Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error('whale-rig2: IK bone lengths must be positive and finite')
  }

  const dx = args.targetX - args.rootX
  const dy = args.targetY - args.rootY
  let distance = Math.hypot(dx, dy)
  if (distance === 0) distance = 1e-9

  // Stable unreachable clamp: straighten the chain toward the target.
  const reach = a + b
  const clamped = clamp(distance, Math.abs(a - b), reach)

  const baseAngle = Math.atan2(dy, dx) / DEG_TO_RAD
  const cosAlpha = clamp((a * a + clamped * clamped - b * b) / (2 * a * clamped), -1, 1)
  const cosBeta = clamp((a * a + b * b - clamped * clamped) / (2 * a * b), -1, 1)
  const alpha = Math.acos(cosAlpha) / DEG_TO_RAD
  const beta = Math.acos(cosBeta) / DEG_TO_RAD
  // Interior angle at the elbow is beta; the chain turn is its supplement.
  const turn = 180 - beta

  const rootAngle = baseAngle + args.bendDirection * alpha
  const midAngle = rootAngle - args.bendDirection * turn

  const parentAngle = args.parentAngle ?? 0
  let rootLocal = rootAngle - parentAngle
  let midLocal = midAngle - rootAngle
  if (args.limits?.root !== undefined) {
    rootLocal = clamp(rootLocal, args.limits.root.min, args.limits.root.max)
  }
  if (args.limits?.mid !== undefined) {
    midLocal = clamp(midLocal, args.limits.mid.min, args.limits.mid.max)
  }
  const solvedRoot = parentAngle + rootLocal
  const solvedMid = solvedRoot + midLocal
  return { rootAngle: solvedRoot, midAngle: solvedMid }
}

/**
 * Throws on hierarchy errors and returns a parent-first resolve order.
 * Rejects duplicate ids, unknown parents, non-positive/non-finite lengths, and
 * any cycle in the parent chain (including self-parenting).
 */
export function validateHierarchy(bones: readonly BoneDef[]): number[] {
  const indexById = new Map<string, number>()
  for (let index = 0; index < bones.length; index += 1) {
    const bone = bones[index]!
    if (indexById.has(bone.id)) throw new Error(`whale-rig2: duplicate bone id "${bone.id}"`)
    indexById.set(bone.id, index)
    if (!Number.isFinite(bone.length) || bone.length <= 0) {
      throw new Error(`whale-rig2: bone "${bone.id}" must have a positive finite length`)
    }
  }
  for (const bone of bones) {
    if (bone.parent !== null && !indexById.has(bone.parent)) {
      throw new Error(`whale-rig2: bone "${bone.id}" references unknown parent "${bone.parent}"`)
    }
  }

  // DFS topological order with cycle detection.
  const order: number[] = []
  const state = new Uint8Array(bones.length) // 0 = unvisited, 1 = visiting, 2 = done
  const visit = (index: number): void => {
    if (state[index] === 2) return
    if (state[index] === 1) {
      throw new Error(`whale-rig2: cyclic parent chain at bone "${bones[index]!.id}"`)
    }
    state[index] = 1
    const parent = bones[index]!.parent
    if (parent !== null) visit(indexById.get(parent)!)
    state[index] = 2
    order.push(index)
  }
  for (let index = 0; index < bones.length; index += 1) visit(index)
  return order
}

/** An immutable validated bone hierarchy with precomputed resolve order. */
export class BoneHierarchy {
  readonly bones: readonly BoneDef[]
  readonly order: readonly number[]
  private readonly indexById: ReadonlyMap<string, number>
  private readonly worldScratch: BoneWorld[]

  constructor(bones: readonly BoneDef[]) {
    this.order = validateHierarchy(bones)
    this.bones = Object.freeze(bones.map(bone => Object.freeze({ ...bone })))
    this.indexById = new Map(this.bones.map((bone, index) => [bone.id, index]))
    this.worldScratch = []
  }

  /** Index of a bone by id, or -1 when absent. */
  boneIndex(id: string): number {
    return this.indexById.get(id) ?? -1
  }

  /** The rest/bind pose: every bone at its `restAngle`, no local translation. */
  restPose(): Pose {
    const pose: Record<string, BoneLocal> = {}
    for (const bone of this.bones) {
      pose[bone.id] = { angle: bone.restAngle ?? 0, tx: 0, ty: 0 }
    }
    return pose
  }

  /**
   * Forward kinematics. `out` is resized to `bones.length`; missing pose bones
   * fall back to their rest transform. Returns `out`.
   */
  fk(pose: Pose, out?: BoneWorld[]): BoneWorld[] {
    const count = this.bones.length
    const worlds = out ?? new Array<BoneWorld>(count)
    worlds.length = count
    for (let index = 0; index < count; index += 1) {
      if (worlds[index] === undefined) worlds[index] = { x: 0, y: 0, angle: 0, tipX: 0, tipY: 0 }
    }
    for (const index of this.order) {
      const bone = this.bones[index]!
      const local = pose[bone.id]
      const angle = local?.angle ?? bone.restAngle ?? 0
      const tx = local?.tx ?? 0
      const ty = local?.ty ?? 0
      const world = worlds[index]!
      if (bone.parent === null) {
        world.x = tx
        world.y = ty
        world.angle = angle
      } else {
        const parent = worlds[this.indexById.get(bone.parent)!]!
        // A child bone's joint attaches to the parent's tip, plus its own
        // local translation (used for pivot/offset work).
        const radians = parent.angle * DEG_TO_RAD
        const cosine = Math.cos(radians)
        const sine = Math.sin(radians)
        world.x = parent.tipX + cosine * tx - sine * ty
        world.y = parent.tipY + sine * tx + cosine * ty
        world.angle = parent.angle + angle
      }
      const radians = world.angle * DEG_TO_RAD
      world.tipX = world.x + bone.length * Math.cos(radians)
      world.tipY = world.y + bone.length * Math.sin(radians)
    }
    return worlds
  }

  /**
   * World matrices per bone (joint at origin, rotated by world angle). Used as
   * bind/pose matrices for CPU skinning. Returns `out` resized to `bones.length`.
   */
  worldMatrices(pose: Pose, out?: Mat2D[], resolvedWorlds?: readonly BoneWorld[]): Mat2D[] {
    const count = this.bones.length
    const matrices = out ?? new Array<Mat2D>(count)
    matrices.length = count
    for (let index = 0; index < count; index += 1) {
      if (matrices[index] === undefined) matrices[index] = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
    }
    const worlds = resolvedWorlds ?? this.fk(pose, this.worldScratch)
    for (let index = 0; index < count; index += 1) {
      matFromTRS(matrices[index]!, worlds[index]!.x, worlds[index]!.y, worlds[index]!.angle)
    }
    return matrices
  }
}
