/**
 * WhaleRig 2.0 phase 1A — CPU linear-blend skinning.
 *
 * Supports at most `MAX_BONE_INFLUENCE` (4) bones per vertex. Vertices live in
 * rig space; each bone has a bind (rest) world matrix and a posed world matrix.
 * The per-bone skin matrix pose·bind⁻¹ is combined into one weighted affine
 * transform per vertex, so the cost is one matrix blend + one affine transform
 * per vertex.
 *
 * `skinVertices` requires weights already normalized to sum 1 (a vertex whose
 * weights do not sum to ~1 is rejected) and never allocates the *result* when
 * the caller provides an `out` Float32Array of the right length.
 */

import type { Mat2D, MeshDef } from './types.ts'
import { matInvert } from './math.ts'

export const MAX_BONE_INFLUENCE = 4
const WEIGHT_SUM_TOLERANCE = 0.001

export interface PreparedSkin {
  readonly def: MeshDef
  readonly boneCount: number
  readonly inverseBindMatrices: Float64Array
  readonly skinMatrices: Float64Array
}

/**
 * Structural validation. Throws when:
 *  - a vertex has more than `MAX_BONE_INFLUENCE` influences,
 *  - a weight is negative or non-finite,
 *  - a bone index is out of range or non-integer,
 *  - position/weight counts disagree.
 * Does not require a normalized weight sum (see `requireNormalizedWeights`).
 */
export function validateMesh(def: MeshDef, boneCount: number): void {
  const vertexCount = def.weights.length
  if (def.positions.length !== vertexCount * 2) {
    throw new Error(
      `whale-rig2: mesh has ${def.positions.length / 2} vertices in positions but ${vertexCount} weight entries`,
    )
  }
  if (def.uvs !== undefined && def.uvs.length !== def.positions.length) {
    throw new Error('whale-rig2: mesh uv count does not match position count')
  }
  for (let index = 0; index < vertexCount; index += 1) {
    const influences = def.weights[index]!
    if (influences.length > MAX_BONE_INFLUENCE) {
      throw new Error(
        `whale-rig2: vertex ${index} has ${influences.length} bones (max ${MAX_BONE_INFLUENCE})`,
      )
    }
    if (influences.length === 0) {
      throw new Error(`whale-rig2: vertex ${index} has no bone influences`)
    }
    for (const influence of influences) {
      if (!Number.isFinite(influence.weight) || influence.weight < 0) {
        throw new Error(`whale-rig2: vertex ${index} has an invalid weight`)
      }
      if (!Number.isInteger(influence.bone) || influence.bone < 0 || influence.bone >= boneCount) {
        throw new Error(`whale-rig2: vertex ${index} references out-of-range bone ${influence.bone}`)
      }
    }
  }
}

/**
 * Require every vertex's weights to already sum to ~1 (within
 * `WEIGHT_SUM_TOLERANCE`). Throws otherwise. Callers that feed raw authoring
 * weights should run `normalizeWeights` first.
 */
export function requireNormalizedWeights(def: MeshDef): void {
  for (let index = 0; index < def.weights.length; index += 1) {
    let sum = 0
    for (const influence of def.weights[index]!) sum += influence.weight
    if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
      throw new Error(`whale-rig2: vertex ${index} weights sum to ${sum} (expected 1)`)
    }
  }
}

/**
 * In-place normalize every vertex's weights to sum 1. Throws when a vertex has
 * a non-positive total (cannot be normalized). Mutates `def`.
 */
export function normalizeWeights(def: MeshDef): void {
  for (let index = 0; index < def.weights.length; index += 1) {
    const influences = def.weights[index]!
    let sum = 0
    for (const influence of influences) sum += influence.weight
    if (sum <= WEIGHT_SUM_TOLERANCE || !Number.isFinite(sum)) {
      throw new Error(`whale-rig2: vertex ${index} has a non-positive weight total`)
    }
    const factor = 1 / sum
    for (const influence of influences) influence.weight *= factor
  }
}

/** Validate once and cache inverse bind matrices for allocation-free frames. */
export function prepareSkin(def: MeshDef, bindWorld: readonly Mat2D[]): PreparedSkin {
  const boneCount = bindWorld.length
  validateMesh(def, boneCount)
  requireNormalizedWeights(def)
  const inverseBindMatrices = new Float64Array(boneCount * 6)
  const inverse = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
  for (let bone = 0; bone < boneCount; bone += 1) {
    matInvert(inverse, bindWorld[bone]!)
    const offset = bone * 6
    inverseBindMatrices[offset] = inverse.a
    inverseBindMatrices[offset + 1] = inverse.b
    inverseBindMatrices[offset + 2] = inverse.c
    inverseBindMatrices[offset + 3] = inverse.d
    inverseBindMatrices[offset + 4] = inverse.tx
    inverseBindMatrices[offset + 5] = inverse.ty
  }
  return {
    def,
    boneCount,
    inverseBindMatrices,
    skinMatrices: new Float64Array(boneCount * 6),
  }
}

/** Skin one pose using a context returned by `prepareSkin`. */
export function skinPrepared(
  prepared: PreparedSkin,
  poseWorld: readonly Mat2D[],
  out?: Float32Array,
): Float32Array {
  const { def, boneCount, inverseBindMatrices, skinMatrices } = prepared
  if (poseWorld.length !== boneCount) {
    throw new Error('whale-rig2: bind and pose matrix counts differ')
  }
  const result = out ?? new Float32Array(def.positions.length)
  if (result.length !== def.positions.length) {
    throw new Error('whale-rig2: output buffer length does not match vertex count')
  }

  for (let bone = 0; bone < boneCount; bone += 1) {
    const offset = bone * 6
    const pose = poseWorld[bone]!
    const ia = inverseBindMatrices[offset]!
    const ib = inverseBindMatrices[offset + 1]!
    const ic = inverseBindMatrices[offset + 2]!
    const id = inverseBindMatrices[offset + 3]!
    const itx = inverseBindMatrices[offset + 4]!
    const ity = inverseBindMatrices[offset + 5]!
    skinMatrices[offset] = pose.a * ia + pose.c * ib
    skinMatrices[offset + 1] = pose.b * ia + pose.d * ib
    skinMatrices[offset + 2] = pose.a * ic + pose.c * id
    skinMatrices[offset + 3] = pose.b * ic + pose.d * id
    skinMatrices[offset + 4] = pose.a * itx + pose.c * ity + pose.tx
    skinMatrices[offset + 5] = pose.b * itx + pose.d * ity + pose.ty
  }

  for (let vertex = 0; vertex < def.weights.length; vertex += 1) {
    const x = def.positions[vertex * 2]!
    const y = def.positions[vertex * 2 + 1]!
    const influences = def.weights[vertex]!
    let ma = 0
    let mb = 0
    let mc = 0
    let md = 0
    let mtx = 0
    let mty = 0
    for (const influence of influences) {
      const offset = influence.bone * 6
      const weight = influence.weight
      ma += skinMatrices[offset]! * weight
      mb += skinMatrices[offset + 1]! * weight
      mc += skinMatrices[offset + 2]! * weight
      md += skinMatrices[offset + 3]! * weight
      mtx += skinMatrices[offset + 4]! * weight
      mty += skinMatrices[offset + 5]! * weight
    }
    result[vertex * 2] = ma * x + mc * y + mtx
    result[vertex * 2 + 1] = mb * x + md * y + mty
  }
  return result
}

/**
 * CPU linear-blend skin.
 *
 * @param def mesh with rig-space positions and per-vertex weights.
 * @param bindWorld per-bone bind (rest) world matrices, length = boneCount.
 * @param poseWorld per-bone posed world matrices, same length.
 * @param out optional output Float32Array of length `positions.length`; reused
 *   when provided, allocated otherwise.
 * @returns the skinned positions (same reference as `out` when provided).
 */
export function skinVertices(
  def: MeshDef,
  bindWorld: readonly Mat2D[],
  poseWorld: readonly Mat2D[],
  out?: Float32Array,
): Float32Array {
  return skinPrepared(prepareSkin(def, bindWorld), poseWorld, out)
}
