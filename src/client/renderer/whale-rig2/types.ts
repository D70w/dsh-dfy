/**
 * WhaleRig 2.0 phase 1A — minimal internal kernel types.
 *
 * This is deliberately NOT a general animation engine. It is the smallest set
 * of shapes the WhaleRig-2 side-run skeleton needs: a 2D affine matrix, a bone
 * hierarchy, a sampled pose, mesh skinning weights, loop clips, and a foot
 * contact constraint. Everything lives in rig/screen space (CSS pixels), with
 * angles in degrees throughout.
 */

/** 2D point. Passed around as a plain object so callers can reuse instances. */
export interface Vec2 {
  x: number
  y: number
}

/**
 * 2D affine matrix in column-vector layout, matching the existing whale-rig
 * WebGL convention `[a, b, c, d, tx, ty]`:
 *
 *   | a  c  tx |   |x|     x' = a*x + c*y + tx
 *   | b  d  ty | * |y|     y' = b*x + d*y + ty
 *   | 0  0  1  |   |1|
 */
export interface Mat2D {
  a: number
  b: number
  c: number
  d: number
  tx: number
  ty: number
}

/** A single bone in the skeleton. Length is the rest length to its child end. */
export interface BoneDef {
  id: string
  /** Parent bone id, or null for a root. */
  parent: string | null
  /** Rest length from this bone's joint to its tip, in rig pixels. Must be > 0. */
  length: number
  /** Local rotation (degrees) this bone takes in the rest/bind pose. Default 0. */
  restAngle?: number
  /** Optional absolute local-rotation limits (degrees) applied by FK consumers. */
  minAngle?: number
  maxAngle?: number
  /**
   * IK bend preference: +1 bends the mid joint toward +Y of the root→target
   * ray (counter-clockwise in math coords), -1 toward -Y. Default +1.
   */
  bendDirection?: 1 | -1
}

/** Local (parent-relative) transform of one bone at a given time. */
export interface BoneLocal {
  /** Local rotation in degrees, relative to the parent's world rotation. */
  angle: number
  /** Optional local translation along X (usually 0 for a joint chain). */
  tx: number
  /** Optional local translation along Y. */
  ty: number
}

/** A pose: bone id → local transform. Sampling fills exactly one entry per bone. */
export type Pose = Readonly<Record<string, BoneLocal>>

/** World-space result of forward kinematics for one bone. */
export interface BoneWorld {
  /** Joint (bone origin) world position. */
  x: number
  y: number
  /** Bone world rotation in degrees. */
  angle: number
  /** Child end (tip) world position. */
  tipX: number
  tipY: number
}

/** One weighted influence of a single bone on a vertex. */
export interface VertexWeight {
  /** Index into the rig's bone list. */
  bone: number
  weight: number
}

/**
 * CPU-skinnable mesh. Positions/UVs are rig-space floats (x0,y0,x1,y1,…);
 * `weights[i]` holds the influences of vertex `i` (at most 4, already or to be
 * normalized to sum 1).
 */
export interface MeshDef {
  /** Rig-space vertex positions, [x0, y0, x1, y1, …]. Length must be 2×`weights.length`. */
  positions: Float32Array
  /** Optional UVs, [u0, v0, u1, v1, …]. If present, length must equal positions length. */
  uvs?: Float32Array
  /** Per-vertex influences; every entry is `{bone: index, weight: number}`. */
  weights: readonly (readonly VertexWeight[])[]
}

export type CurveInterpolation = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'cubic'

/** One keyframe: time in ms + scalar value (degrees or pixels). */
export interface Keyframe {
  t: number
  value: number
}

/**
 * A scalar curve over time. Keyframes must be sorted by `t`; for a looping clip
 * the caller treats the curve as wrapping, so the first and last values close
 * the loop (phase 1A enforces strict 0↔duration closure).
 */
export interface Curve {
  keyframes: readonly Keyframe[]
  interpolation: CurveInterpolation
}

/** One animated property of one bone. */
export interface Channel {
  /** Bone id this channel drives. */
  bone: string
  /** Which local property it drives. */
  property: 'angle' | 'tx' | 'ty'
  curve: Curve
}

/** A loopable motion clip that drives a whole pose. */
export interface Clip {
  id: string
  /** Nominal duration in ms. Loop clips wrap at this boundary. */
  durationMs: number
  channels: readonly Channel[]
  /** Whether the clip loops (wraps) or clamps at `durationMs`. */
  loop: boolean
}

/**
 * World-space foot contact constraint for the run cycle.
 *
 * During the contact window the end-effector (foot) is locked to the world
 * position it occupied on the first in-window frame. The solver hands that
 * locked target to the two-bone IK; it never writes story displacement into the
 * bone animation (pose channels stay untouched by the constraint).
 *
 * The contact window is expressed relative to the clip and may wrap across the
 * loop seam (e.g. contact 0–180 ms and 1260–1350 ms of a 1350 ms cycle).
 */
export interface FootContactConstraintDef {
  id: string
  /** Two-bone chain: hip (root) → knee (mid) → end. `end` is the contact bone. */
  chain: {
    hip: string
    knee: string
    end: string
  }
  /** Window start in clip-relative ms (wrapped into [0, durationMs)). */
  contactStartMs: number
  /** Window length in ms. Longer than the clip means "always in contact". */
  contactWindowMs: number
  /** Lock the X axis of the contact point. Default true. */
  lockX?: boolean
  /** Lock the Y axis of the contact point. Default true. */
  lockY?: boolean
  /** Optional ground Y: when locking, snap the locked Y to this value. */
  groundY?: number
}

/** Mutable state tracking whether the constraint is currently holding a lock. */
export interface FootContactState {
  locked: boolean
  lockedX: number
  lockedY: number
  /** Last unwrapped clip time sampled; used to detect seeks/resumes. */
  lastTimeMs?: number
  /** Whether the previous sample was inside this contact episode. */
  lastInContact?: boolean
  /** Incremented whenever a fresh contact target is latched. */
  episode?: number
}

/** Result of evaluating a foot contact constraint at one time sample. */
export interface FootContactResult {
  /** True while the sample falls inside the contact window. */
  inContact: boolean
  /** World target the IK should reach while locked (meaningful when inContact). */
  targetX: number
  targetY: number
}
