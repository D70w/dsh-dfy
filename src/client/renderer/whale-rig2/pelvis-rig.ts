export interface Vec2 { x: number; y: number }

export interface LegRig {
  hip: Vec2
  knee: Vec2
  ankle: Vec2
  foot: Vec2
  upperLength: number
  lowerLength: number
  status: 'estimated' | 'confirmed'
}

export interface PelvisRig {
  center: Vec2
  width: number
  height: number
  rotation: number
  hipNear: Vec2
  hipFar: Vec2
  centerStatus: 'estimated' | 'confirmed'
  hipNearStatus: 'estimated' | 'confirmed'
  hipFarStatus: 'estimated' | 'confirmed'
}

export interface PelvisRigDocument {
  schemaVersion: 1
  id: string
  canvas: { width: number; height: number }
  coordinateSystem: 'canvas-y-down'
  pelvis: PelvisRig
  legs: { near: LegRig; far: LegRig }
  constraints: {
    thigh: { minDeg: number; maxDeg: number }
    calf: { minDeg: number; maxDeg: number }
    foot: { minDeg: number; maxDeg: number }
  }
}

export type ValidationPoseId = 'bind' | 'forward' | 'backward' | 'knee-up'

export interface ValidationPose {
  id: ValidationPoseId
  name: string
  thighDeg: number
  calfDeg: number
  footDeg: number
  description: string
}

export const VALIDATION_POSES: readonly ValidationPose[] = [
  { id: 'bind', name: '绑定姿势', thighDeg: 0, calfDeg: 0, footDeg: 0, description: '骨骼回到母图姿势' },
  { id: 'forward', name: '向前踏', thighDeg: -30, calfDeg: 25, footDeg: -10, description: '检查腿根是否藏在裙子内部' },
  { id: 'backward', name: '向后摆', thighDeg: 30, calfDeg: 45, footDeg: 10, description: '检查裙摆遮挡和骨长' },
  { id: 'knee-up', name: '抬膝', thighDeg: -45, calfDeg: 60, footDeg: 0, description: '检查髋部高度与膝盖弯曲' },
]

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function clonePoint(point: Vec2): Vec2 { return { x: point.x, y: point.y } }

export function createInitialPelvisRig(): PelvisRigDocument {
  // Confirmed by the user's exported pelvis calibration.  This is deliberately
  // the same source of truth used to align the generated full-leg textures.
  const nearHip = { x: 438.72449727670346, y: 731.4360196844331 }
  const nearKnee = { x: 446.47290202993855, y: 833.5965016926829 }
  const nearAnkle = { x: 473, y: 920 }
  const farHip = { x: 318.72449727670346, y: 731.4360196844331 }
  const farKnee = { x: 326.52494131738024, y: 839.1497146325196 }
  const farAnkle = { x: 349, y: 916 }
  return {
    schemaVersion: 1,
    id: 'whale-maid-pelvis-rig-v1',
    canvas: { width: 1024, height: 1024 },
    coordinateSystem: 'canvas-y-down',
    pelvis: {
      center: { x: 378.72449727670346, y: 691.4360196844331 },
      width: 180,
      height: 88,
      rotation: 0,
      hipNear: clonePoint(nearHip),
      hipFar: clonePoint(farHip),
      centerStatus: 'confirmed',
      hipNearStatus: 'confirmed',
      hipFarStatus: 'confirmed',
    },
    legs: {
      near: { hip: clonePoint(nearHip), knee: nearKnee, ankle: nearAnkle, foot: { x: 473, y: 970 }, upperLength: distance(nearHip, nearKnee), lowerLength: distance(nearKnee, nearAnkle), status: 'confirmed' },
      far: { hip: clonePoint(farHip), knee: farKnee, ankle: farAnkle, foot: { x: 349, y: 968 }, upperLength: distance(farHip, farKnee), lowerLength: distance(farKnee, farAnkle), status: 'confirmed' },
    },
    constraints: {
      thigh: { minDeg: -60, maxDeg: 60 },
      calf: { minDeg: -120, maxDeg: 90 },
      foot: { minDeg: -45, maxDeg: 45 },
    },
  }
}

export function clonePelvisRig(document: PelvisRigDocument): PelvisRigDocument {
  return structuredClone(document)
}

export function syncLegHips(document: PelvisRigDocument): void {
  document.legs.near.hip = clonePoint(document.pelvis.hipNear)
  document.legs.far.hip = clonePoint(document.pelvis.hipFar)
  document.legs.near.upperLength = distance(document.legs.near.hip, document.legs.near.knee)
  document.legs.near.lowerLength = distance(document.legs.near.knee, document.legs.near.ankle)
  document.legs.far.upperLength = distance(document.legs.far.hip, document.legs.far.knee)
  document.legs.far.lowerLength = distance(document.legs.far.knee, document.legs.far.ankle)
}

export function validatePelvisRig(document: PelvisRigDocument): void {
  if (document.schemaVersion !== 1 || document.canvas.width !== 1024 || document.canvas.height !== 1024) throw new Error('骨盆 Rig 文档版本或画布尺寸错误')
  const epsilon = 0.001
  for (const leg of [document.legs.near, document.legs.far]) {
    const upper = distance(leg.hip, leg.knee)
    const lower = distance(leg.knee, leg.ankle)
    if (Math.abs(upper - leg.upperLength) > epsilon || Math.abs(lower - leg.lowerLength) > epsilon) throw new Error('骨长被意外改变，禁止通过缩放修复')
  }
  if (document.pelvis.width <= 0 || document.pelvis.height <= 0) throw new Error('骨盆区域尺寸必须为正数')
}

export function rotatePoint(point: Vec2, pivot: Vec2, degrees: number): Vec2 {
  const radians = degrees * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const x = point.x - pivot.x
  const y = point.y - pivot.y
  return { x: pivot.x + x * cos - y * sin, y: pivot.y + x * sin + y * cos }
}

export function poseLeg(leg: LegRig, pose: ValidationPose): { hip: Vec2; knee: Vec2; ankle: Vec2; foot: Vec2 } {
  const knee = rotatePoint(leg.knee, leg.hip, pose.thighDeg)
  const ankleBase = rotatePoint(leg.ankle, leg.hip, pose.thighDeg)
  const ankle = rotatePoint(ankleBase, knee, pose.calfDeg)
  const footBase = rotatePoint(leg.foot, leg.hip, pose.thighDeg)
  const foot = rotatePoint(footBase, knee, pose.calfDeg + pose.footDeg)
  return { hip: clonePoint(leg.hip), knee, ankle, foot }
}
