/**
 * WhaleRig 2.0 phase 1A — 2D affine math with no per-frame allocation bias.
 *
 * Every operation writes into a caller-provided `out` and returns it, so a
 * hot loop can reuse a small set of scratch Mat2D/Vec2 instances. Angles are
 * degrees throughout.
 */

import type { Mat2D, Vec2 } from './types.ts'

export const DEG_TO_RAD = Math.PI / 180

/** Write the identity matrix into `out`. */
export function matIdentity(out: Mat2D): Mat2D {
  out.a = 1
  out.b = 0
  out.c = 0
  out.d = 1
  out.tx = 0
  out.ty = 0
  return out
}

/**
 * Compose `left` then `right` (i.e. apply `right` first, then `left`),
 * matching the existing whale-rig multiply convention.
 */
export function matMultiply(out: Mat2D, left: Readonly<Mat2D>, right: Readonly<Mat2D>): Mat2D {
  const a = left.a * right.a + left.c * right.b
  const b = left.b * right.a + left.d * right.b
  const c = left.a * right.c + left.c * right.d
  const d = left.b * right.c + left.d * right.d
  const tx = left.a * right.tx + left.c * right.ty + left.tx
  const ty = left.b * right.tx + left.d * right.ty + left.ty
  out.a = a
  out.b = b
  out.c = c
  out.d = d
  out.tx = tx
  out.ty = ty
  return out
}

/**
 * Build translate · rotate · (optionally scale) into `out`. Rotation is in
 * degrees. This is the standard joint local matrix: pivot about the joint at
 * (tx, ty), rotate `angleDeg`, then scale.
 */
export function matFromTRS(
  out: Mat2D,
  tx: number,
  ty: number,
  angleDeg: number,
  scaleX = 1,
  scaleY = 1,
): Mat2D {
  const radians = angleDeg * DEG_TO_RAD
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  out.a = cosine * scaleX
  out.b = sine * scaleX
  out.c = -sine * scaleY
  out.d = cosine * scaleY
  out.tx = tx
  out.ty = ty
  return out
}

/** Apply matrix `m` to point (x, y), writing into `out`. */
export function applyAffine(out: Vec2, m: Readonly<Mat2D>, x: number, y: number): Vec2 {
  out.x = m.a * x + m.c * y + m.tx
  out.y = m.b * x + m.d * y + m.ty
  return out
}

/** Invert `m` into `out`. Determinant must be non-zero. */
export function matInvert(out: Mat2D, m: Readonly<Mat2D>): Mat2D {
  const determinant = m.a * m.d - m.b * m.c
  if (determinant === 0 || !Number.isFinite(determinant)) {
    throw new Error('whale-rig2: cannot invert a singular matrix')
  }
  const inverse = 1 / determinant
  const a = m.d * inverse
  const b = -m.b * inverse
  const c = -m.c * inverse
  const d = m.a * inverse
  out.a = a
  out.b = b
  out.c = c
  out.d = d
  out.tx = -(m.tx * a + m.ty * c)
  out.ty = -(m.tx * b + m.ty * d)
  return out
}

/**
 * Normalize an angle in degrees into (-180, 180].
 *
 *   -179 → -179, 180 → -180, 190 → -170, -190 → 170, 540 → 180.
 */
export function angleNormalize(angleDeg: number): number {
  const wrapped = ((angleDeg + 180) % 360 + 360) % 360 - 180
  return wrapped === -180 ? 180 : wrapped
}

/**
 * Shortest-arc linear interpolation between two angles in degrees.
 * At t=0 returns `from`, at t=1 returns `to`, and it always travels the
 * shorter way around the circle (e.g. 170 → -170 passes through 180, not 0).
 */
export function angleLerp(fromDeg: number, toDeg: number, t: number): number {
  const delta = angleNormalize(toDeg - fromDeg)
  return fromDeg + delta * t
}

/** Squared Euclidean distance between two points. */
export function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  return dx * dx + dy * dy
}
