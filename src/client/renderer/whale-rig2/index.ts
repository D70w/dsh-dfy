/**
 * WhaleRig 2.0 phase 1A — math kernel public surface.
 *
 * Exports the minimal internal type set and the four kernel modules (math,
 * bones, motion, mesh) plus the foot contact constraint. This is the only
 * import surface phase 1B should rely on; nothing here touches React/WebGL.
 */

export type {
  BoneDef,
  BoneLocal,
  BoneWorld,
  Channel,
  Clip,
  Curve,
  CurveInterpolation,
  FootContactConstraintDef,
  FootContactResult,
  FootContactState,
  Keyframe,
  Mat2D,
  MeshDef,
  Pose,
  Vec2,
  VertexWeight,
} from './types.ts'

export {
  DEG_TO_RAD,
  angleLerp,
  angleNormalize,
  applyAffine,
  distanceSquared,
  matFromTRS,
  matIdentity,
  matInvert,
  matMultiply,
} from './math.ts'

export {
  BoneHierarchy,
  solveTwoBoneIK,
  validateHierarchy,
  type SolveTwoBoneIKArgs,
  type TwoBoneIKLimits,
  type TwoBoneIKResult,
} from './bones.ts'

export { applyEasing, sampleClip, sampleCurve } from './motion.ts'

export {
  MAX_BONE_INFLUENCE,
  normalizeWeights,
  prepareSkin,
  requireNormalizedWeights,
  skinPrepared,
  skinVertices,
  validateMesh,
  type PreparedSkin,
} from './mesh.ts'

export { evaluateFootContact, inContactWindow } from './constraints.ts'
