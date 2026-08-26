import { BoneHierarchy } from './bones.ts'
import { prepareSkin, skinPrepared } from './mesh.ts'
import { clonePelvisRig, createInitialPelvisRig, syncLegHips, validatePelvisRig, type PelvisRigDocument } from './pelvis-rig.ts'
import { createGridMesh, deformHorizontalChain, deformRootedTuft, SpringValue, type GridMesh, type SpringParameters } from './secondary-motion.ts'
import type { BoneDef, Mat2D, MeshDef, Pose, Vec2, BoneWorld } from './types.ts'

const SIZE = 1024
const STATIC_BEFORE_LEGS = ['body-base-underlay', 'hair-back', 'tail', 'upper-arm-far', 'forearm-far']
const STATIC_AFTER_LEGS = ['body-base', 'upper-arm-near', 'forearm-near-clean', 'head', 'ahoge']
const CANDIDATE_CHARACTER_TEXTURES = [
  'hair-back-complete',
  'tail-complete',
  'leg-near-complete',
  'leg-far-complete',
  'dress-complete',
  'head-front-complete-v3',
  'ahoge-complete',
] as const
const CANDIDATE_ARM_RIG_TEXTURES = [
  'arm-far-upper',
  'arm-far-forearm',
  'arm-far-hand',
  'arm-far-elbow-upper-underlay',
  'arm-far-elbow-forearm-underlay',
  'arm-far-wrist-underlay',
  'arm-near-upper',
  'arm-near-forearm',
  'arm-near-hand',
  'arm-near-elbow-upper-underlay',
  'arm-near-elbow-forearm-underlay',
  'arm-near-wrist-underlay',
] as const

interface LegMesh {
  readonly id: 'near' | 'far'
  readonly def: MeshDef
  readonly prepared: ReturnType<typeof prepareSkin>
  readonly bindPositions: Float32Array
  readonly output: Float32Array
  readonly boneIds: readonly [string, string, string]
  readonly columns: number
  readonly rows: number
}

export type MeshQuality = 'high' | 'economy'

export interface MeshSkinningPreviewController {
  setFacing(value: 'left' | 'right'): void
  setNearPose(thigh: number, calf: number, foot: number): void
  setFarPose(thigh: number, calf: number, foot: number): void
  setNearArmPose(shoulder: number, elbow: number, wrist: number): void
  setFarArmPose(shoulder: number, elbow: number, wrist: number): void
  setHipPoseOffsets(nearX: number, nearY: number, farX: number, farY: number): void
  setBodyMotion(pose: BodyMotionPose): void
  setMotionFrame(legs: LegStepPose, body: BodyMotionPose): void
  setPrimaryMotionActive(value: boolean): void
  setSecondaryMotionEnabled(value: boolean): void
  setSpringParameters(id: SecondaryMotionId, parameters: SpringParameters): void
  getSecondaryMotion(): Readonly<Record<SecondaryMotionId, number>>
  setShowBones(value: boolean): void
  setShowMesh(value: boolean): void
  setShowVertices(value: boolean): void
  setShowOcclusion(value: boolean): void
  setCalibrationMode(value: boolean): void
  getCalibration(): PelvisRigDocument
  updateCalibration(id: CalibrationHandle, point: Vec2): void
  resetCalibration(): void
  onCalibrationChange?: (document: PelvisRigDocument) => void
  render(): void
  dispose(): void
}

export type SecondaryMotionId = 'tail' | 'hair' | 'ahoge'

export type CalibrationHandle =
  | 'pelvis' | 'hipNear' | 'hipFar'
  | 'kneeNear' | 'kneeFar'
  | 'ankleNear' | 'ankleFar'
  | 'footNear' | 'footFar'

export const LEG_VALIDATION_POSES = {
  bind: { near: [0, 0, 0], far: [0, 0, 0], hipOffsets: [0, 0, 0, 0] },
  /** Character faces screen-left. The airborne leg folds heel-first toward the tail. */
  nearForward: { near: [38, -6, 6], far: [-18, -45, -5], hipOffsets: [-35, 0, 35, 0] },
  nearBackward: { near: [-18, -45, -5], far: [38, -6, 6], hipOffsets: [-35, 0, 35, 0] },
  alternate: { near: [45, -12, 8], far: [-18, -45, -5], hipOffsets: [-38, 0, 38, 0] },
} as const

export interface LegStepPose {
  near: [number, number, number]
  far: [number, number, number]
  hipOffsets: [number, number, number, number]
}

export interface BodyMotionPose {
  bounceY: number
  leanDeg: number
  headCounterDeg: number
  nearUpperArmDeg: number
  nearForearmDeg: number
  nearWristDeg: number
  farUpperArmDeg: number
  farForearmDeg: number
  farWristDeg: number
}

export interface ArmRigDefinition {
  readonly shoulder: Vec2
  readonly elbow: Vec2
  readonly wrist: Vec2
  readonly handEnd: Vec2
}

export const ARM_RIGS: Readonly<Record<'near' | 'far', ArmRigDefinition>> = {
  near: { shoulder: { x: 470, y: 535 }, elbow: { x: 517, y: 590 }, wrist: { x: 563, y: 642 }, handEnd: { x: 620, y: 676 } },
  far: { shoulder: { x: 286, y: 550 }, elbow: { x: 259, y: 592 }, wrist: { x: 229, y: 638 }, handEnd: { x: 202, y: 667 } },
}

export const LEG_STEP_CYCLE: readonly LegStepPose[] = [
  { near: [38, -6, 6], far: [-18, -45, -5], hipOffsets: [-35, 0, 35, 0] },
  { near: [5, -28, 2], far: [12, -60, -10], hipOffsets: [-35, 2, 35, 2] },
  { near: [-18, -45, -5], far: [38, -6, 6], hipOffsets: [-35, 0, 35, 0] },
  { near: [12, -60, -10], far: [5, -28, 2], hipOffsets: [-35, 2, 35, 2] },
]

/** Primary torso/arm motion aligned to the same four phases as the legs. */
export const BODY_STEP_CYCLE: readonly BodyMotionPose[] = [
  { bounceY: 0, leanDeg: -2.4, headCounterDeg: 1.9, nearUpperArmDeg: 12, nearForearmDeg: -7, nearWristDeg: 2, farUpperArmDeg: -10, farForearmDeg: 6, farWristDeg: -2 },
  { bounceY: -5, leanDeg: -3.2, headCounterDeg: 2.6, nearUpperArmDeg: 2, nearForearmDeg: -4, nearWristDeg: 1, farUpperArmDeg: -2, farForearmDeg: 4, farWristDeg: -1 },
  { bounceY: 0, leanDeg: -2.4, headCounterDeg: 1.9, nearUpperArmDeg: -12, nearForearmDeg: 7, nearWristDeg: -2, farUpperArmDeg: 10, farForearmDeg: -6, farWristDeg: 2 },
  { bounceY: -5, leanDeg: -3.2, headCounterDeg: 2.6, nearUpperArmDeg: -2, nearForearmDeg: 4, nearWristDeg: -1, farUpperArmDeg: 2, farForearmDeg: -4, farWristDeg: 1 },
]

function interpolateTuple<const T extends readonly number[]>(left: T, right: T, amount: number): number[] {
  return left.map((value, index) => value + (right[index]! - value) * amount)
}

/** Four-pose runtime interpolation used only for validating left/right stepping. */
export function sampleLegStepCycle(timeMs: number, durationMs = 900): LegStepPose {
  const wrapped = ((timeMs % durationMs) + durationMs) % durationMs
  const phase = wrapped / durationMs * LEG_STEP_CYCLE.length
  const leftIndex = Math.floor(phase)
  const rightIndex = (leftIndex + 1) % LEG_STEP_CYCLE.length
  const raw = phase - leftIndex
  const eased = raw * raw * (3 - 2 * raw)
  const left = LEG_STEP_CYCLE[leftIndex]!
  const right = LEG_STEP_CYCLE[rightIndex]!
  return {
    near: interpolateTuple(left.near, right.near, eased) as [number, number, number],
    far: interpolateTuple(left.far, right.far, eased) as [number, number, number],
    hipOffsets: interpolateTuple(left.hipOffsets, right.hipOffsets, eased) as [number, number, number, number],
  }
}

export function sampleBodyStepCycle(timeMs: number, durationMs = 900): BodyMotionPose {
  const wrapped = ((timeMs % durationMs) + durationMs) % durationMs
  const phase = wrapped / durationMs * BODY_STEP_CYCLE.length
  const leftIndex = Math.floor(phase)
  const rightIndex = (leftIndex + 1) % BODY_STEP_CYCLE.length
  const raw = phase - leftIndex
  const eased = raw * raw * (3 - 2 * raw)
  const left = BODY_STEP_CYCLE[leftIndex]!
  const right = BODY_STEP_CYCLE[rightIndex]!
  const value = (key: keyof BodyMotionPose): number => left[key] + (right[key] - left[key]) * eased
  return {
    bounceY: value('bounceY'),
    leanDeg: value('leanDeg'),
    headCounterDeg: value('headCounterDeg'),
    nearUpperArmDeg: value('nearUpperArmDeg'),
    nearForearmDeg: value('nearForearmDeg'),
    nearWristDeg: value('nearWristDeg'),
    farUpperArmDeg: value('farUpperArmDeg'),
    farForearmDeg: value('farForearmDeg'),
    farWristDeg: value('farWristDeg'),
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`无法加载蒙皮预览资产：${url}`))
    image.src = url
  })
}

interface SkeletonState {
  readonly hierarchy: BoneHierarchy
  readonly bones: readonly BoneDef[]
  readonly bindPose: Pose
  readonly bindMatrices: readonly Mat2D[]
}

function angle(from: Vec2, to: Vec2): number { return Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI }
function distance(from: Vec2, to: Vec2): number { return Math.hypot(to.x - from.x, to.y - from.y) }

/** Rebuilds the bind skeleton after every calibration edit. */
function createSkeleton(document: PelvisRigDocument): SkeletonState {
  const nearHipWorld = angle(document.legs.near.hip, document.legs.near.knee)
  const nearKneeWorld = angle(document.legs.near.knee, document.legs.near.ankle)
  const nearAnkleWorld = angle(document.legs.near.ankle, document.legs.near.foot)
  const farHipWorld = angle(document.legs.far.hip, document.legs.far.knee)
  const farKneeWorld = angle(document.legs.far.knee, document.legs.far.ankle)
  const farAnkleWorld = angle(document.legs.far.ankle, document.legs.far.foot)
  const bones: readonly BoneDef[] = [
    { id: 'root', parent: null, length: 1, restAngle: 0 },
    { id: 'hipNear', parent: 'root', length: document.legs.near.upperLength, restAngle: nearHipWorld },
    { id: 'kneeNear', parent: 'hipNear', length: document.legs.near.lowerLength, restAngle: nearKneeWorld - nearHipWorld },
    { id: 'ankleNear', parent: 'kneeNear', length: distance(document.legs.near.ankle, document.legs.near.foot), restAngle: nearAnkleWorld - nearKneeWorld },
    { id: 'hipFar', parent: 'root', length: document.legs.far.upperLength, restAngle: farHipWorld },
    { id: 'kneeFar', parent: 'hipFar', length: document.legs.far.lowerLength, restAngle: farKneeWorld - farHipWorld },
    { id: 'ankleFar', parent: 'kneeFar', length: distance(document.legs.far.ankle, document.legs.far.foot), restAngle: farAnkleWorld - farKneeWorld },
  ]
  const hierarchy = new BoneHierarchy(bones)
  const rootTip = { x: document.pelvis.center.x + 1, y: document.pelvis.center.y }
  const bindPose: Pose = {
    root: { angle: 0, tx: document.pelvis.center.x, ty: document.pelvis.center.y },
    hipNear: { angle: nearHipWorld, tx: document.legs.near.hip.x - rootTip.x, ty: document.legs.near.hip.y - rootTip.y },
    kneeNear: { angle: nearKneeWorld - nearHipWorld, tx: 0, ty: 0 },
    ankleNear: { angle: nearAnkleWorld - nearKneeWorld, tx: 0, ty: 0 },
    hipFar: { angle: farHipWorld, tx: document.legs.far.hip.x - rootTip.x, ty: document.legs.far.hip.y - rootTip.y },
    kneeFar: { angle: farKneeWorld - farHipWorld, tx: 0, ty: 0 },
    ankleFar: { angle: farAnkleWorld - farKneeWorld, tx: 0, ty: 0 },
  }
  return { hierarchy, bones, bindPose, bindMatrices: hierarchy.worldMatrices(bindPose) }
}

const DEFAULT_SKELETON = createSkeleton(createInitialPelvisRig())
const LEG_BONES = DEFAULT_SKELETON.bones
const BIND_POSE = DEFAULT_SKELETON.bindPose
const BIND_MATRICES = DEFAULT_SKELETON.bindMatrices

function makeWeights(y: number, hip: number, knee: number, ankle: number, bands: readonly [number, number, number, number]): MeshDef['weights'][number] {
  const [hipBlendStart, hipBlendEnd, ankleBlendStart, ankleBlendEnd] = bands
  if (y <= hipBlendStart) return [{ bone: hip, weight: 1 }]
  if (y < hipBlendEnd) {
    const t = (y - hipBlendStart) / (hipBlendEnd - hipBlendStart)
    return [{ bone: hip, weight: 1 - t }, { bone: knee, weight: t }]
  }
  if (y <= ankleBlendStart) return [{ bone: knee, weight: 1 }]
  if (y < ankleBlendEnd) {
    const t = (y - ankleBlendStart) / (ankleBlendEnd - ankleBlendStart)
    return [{ bone: knee, weight: 1 - t }, { bone: ankle, weight: t }]
  }
  return [{ bone: ankle, weight: 1 }]
}

/** Dense enough around the knee to avoid a hard diagonal seam, still tiny for CPU rendering. */
function makeLegMesh(
  id: 'near' | 'far',
  document: PelvisRigDocument = createInitialPelvisRig(),
  quality: MeshQuality = 'high',
): MeshDef {
  // The grid covers both the calibrated V1 legs and the user-updated V1 legs.
  // The latter have a completed hidden thigh (starting around y=640) and a
  // slightly wider shoe. Keeping those pixels inside the mesh prevents the
  // replacement texture from being clipped while it follows the existing rig.
  const denseXs = id === 'near'
    ? [377, 398, 419, 440, 461, 482, 503, 524, 545, 566]
    : [254, 273, 292, 311, 330, 349, 368, 387, 406, 426]
  const denseYs = [630, 662, 694, 726, 758, 790, 822, 854, 886, 918, 950, 982, 1014]
  const xs = quality === 'high' ? denseXs : denseXs.filter((_, index) => [0, 2, 4, 5, 7, 9].includes(index))
  const ys = quality === 'high' ? denseYs : denseYs.filter((_, index) => [0, 2, 4, 6, 7, 9, 10, 12].includes(index))
  const hierarchy = DEFAULT_SKELETON.hierarchy
  const hip = hierarchy.boneIndex(id === 'near' ? 'hipNear' : 'hipFar')
  const knee = hierarchy.boneIndex(id === 'near' ? 'kneeNear' : 'kneeFar')
  const ankle = hierarchy.boneIndex(id === 'near' ? 'ankleNear' : 'ankleFar')
  const leg = document.legs[id]
  const hipSpan = Math.max(20, leg.knee.y - leg.hip.y)
  const ankleSpan = Math.max(20, leg.ankle.y - leg.knee.y)
  const footSpan = Math.max(20, leg.foot.y - leg.ankle.y)
  const bands: [number, number, number, number] = [leg.hip.y + hipSpan * 0.2, leg.knee.y - hipSpan * 0.2, leg.knee.y + ankleSpan * 0.45, leg.ankle.y + footSpan * 0.35]
  const positions: number[] = []
  const weights: MeshDef['weights'][number][] = []
  for (const y of ys) for (const x of xs) {
    positions.push(x, y)
    weights.push(makeWeights(y, hip, knee, ankle, bands))
  }
  const uvs = new Float32Array(positions)
  return { positions: new Float32Array(positions), uvs, weights }
}

function makeLeg(id: 'near' | 'far', document: PelvisRigDocument, bindMatrices: readonly Mat2D[], quality: MeshQuality): LegMesh {
  const def = makeLegMesh(id, document, quality)
  const columns = quality === 'high' ? 10 : 6
  const rows = quality === 'high' ? 13 : 8
  return { id, def, prepared: prepareSkin(def, bindMatrices), bindPositions: def.positions, output: new Float32Array(def.positions.length), boneIds: id === 'near' ? ['hipNear', 'kneeNear', 'ankleNear'] : ['hipFar', 'kneeFar', 'ankleFar'], columns, rows }
}

function poseFor(skeleton: SkeletonState, near: [number, number, number], far: [number, number, number], hipOffsets: [number, number, number, number]): Pose {
  const bind = skeleton.bindPose
  return {
    root: { ...bind.root! },
    hipNear: { ...bind.hipNear!, angle: bind.hipNear!.angle + near[0], tx: bind.hipNear!.tx + hipOffsets[0], ty: bind.hipNear!.ty + hipOffsets[1] },
    kneeNear: { ...bind.kneeNear!, angle: bind.kneeNear!.angle + near[1] },
    ankleNear: { ...bind.ankleNear!, angle: bind.ankleNear!.angle + near[2] },
    hipFar: { ...bind.hipFar!, angle: bind.hipFar!.angle + far[0], tx: bind.hipFar!.tx + hipOffsets[2], ty: bind.hipFar!.ty + hipOffsets[3] },
    kneeFar: { ...bind.kneeFar!, angle: bind.kneeFar!.angle + far[1] },
    ankleFar: { ...bind.ankleFar!, angle: bind.ankleFar!.angle + far[2] },
  }
}

function affineFromTriangles(source: readonly Vec2[], target: readonly Vec2[]): Mat2D | undefined {
  const sx1 = source[1]!.x - source[0]!.x
  const sy1 = source[1]!.y - source[0]!.y
  const sx2 = source[2]!.x - source[0]!.x
  const sy2 = source[2]!.y - source[0]!.y
  const det = sx1 * sy2 - sx2 * sy1
  if (Math.abs(det) < 1e-6) return undefined
  const inv00 = sy2 / det
  const inv01 = -sx2 / det
  const inv10 = -sy1 / det
  const inv11 = sx1 / det
  const dx1 = target[1]!.x - target[0]!.x
  const dy1 = target[1]!.y - target[0]!.y
  const dx2 = target[2]!.x - target[0]!.x
  const dy2 = target[2]!.y - target[0]!.y
  const a = dx1 * inv00 + dx2 * inv10
  const c = dx1 * inv01 + dx2 * inv11
  const b = dy1 * inv00 + dy2 * inv10
  const d = dy1 * inv01 + dy2 * inv11
  return { a, b, c, d, tx: target[0]!.x - a * source[0]!.x - c * source[0]!.y, ty: target[0]!.y - b * source[0]!.x - d * source[0]!.y }
}

interface TexturedGrid {
  readonly positions: Float32Array
  readonly uvs?: Float32Array
}

function drawTexturedMesh(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  mesh: TexturedGrid,
  positions: Float32Array,
  columns = 10,
  rows = 13,
): void {
  const expandForSeamlessClip = (triangle: readonly Vec2[], pixels = 1.15): Vec2[] => {
    const center = {
      x: triangle.reduce((sum, point) => sum + point.x, 0) / triangle.length,
      y: triangle.reduce((sum, point) => sum + point.y, 0) / triangle.length,
    }
    return triangle.map(point => {
      const dx = point.x - center.x
      const dy = point.y - center.y
      const length = Math.hypot(dx, dy)
      const scale = length < 0.001 ? 1 : (length + pixels) / length
      return { x: center.x + dx * scale, y: center.y + dy * scale }
    })
  }
  const drawTriangle = (aIndex: number, bIndex: number, cIndex: number): void => {
    const source: Vec2[] = []
    const target: Vec2[] = []
    for (const vertex of [aIndex, bIndex, cIndex]) {
      source.push({ x: mesh.positions[vertex * 2]!, y: mesh.positions[vertex * 2 + 1]! })
      target.push({ x: positions[vertex * 2]!, y: positions[vertex * 2 + 1]! })
    }
    const matrix = affineFromTriangles(source, target)
    if (matrix === undefined) return
    const clipTarget = expandForSeamlessClip(target)
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.beginPath(); ctx.moveTo(clipTarget[0]!.x, clipTarget[0]!.y); ctx.lineTo(clipTarget[1]!.x, clipTarget[1]!.y); ctx.lineTo(clipTarget[2]!.x, clipTarget[2]!.y); ctx.closePath(); ctx.clip()
    ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty)
    ctx.drawImage(image, 0, 0)
    ctx.restore()
  }
  for (let row = 0; row < rows - 1; row += 1) for (let col = 0; col < columns - 1; col += 1) {
    const topLeft = row * columns + col
    const topRight = topLeft + 1
    const bottomLeft = topLeft + columns
    const bottomRight = bottomLeft + 1
    drawTriangle(topLeft, bottomLeft, topRight)
    drawTriangle(topRight, bottomLeft, bottomRight)
  }
}

function drawFlexibleMesh(ctx: CanvasRenderingContext2D, image: HTMLImageElement, mesh: GridMesh): void {
  drawTexturedMesh(ctx, image, mesh, mesh.output, mesh.columns, mesh.rows)
}

function drawSkeleton(ctx: CanvasRenderingContext2D, worlds: readonly BoneWorld[], color: string): void {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round'
  for (const world of worlds.slice(1)) { ctx.beginPath(); ctx.moveTo(world.x, world.y); ctx.lineTo(world.tipX, world.tipY); ctx.stroke(); ctx.beginPath(); ctx.arc(world.x, world.y, 7, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

function drawCalibrationOverlay(ctx: CanvasRenderingContext2D, document: PelvisRigDocument, selected: CalibrationHandle | undefined): void {
  const handles: Array<[CalibrationHandle, Vec2, string, string]> = [
    ['pelvis', document.pelvis.center, '#ffd166', '骨盆中心'],
    ['hipFar', document.pelvis.hipFar, '#a8aaff', '隐藏髋（远）'],
    ['hipNear', document.pelvis.hipNear, '#78e6ff', '隐藏髋（近）'],
    ['kneeFar', document.legs.far.knee, '#a8aaff', '远膝'],
    ['ankleFar', document.legs.far.ankle, '#a8aaff', '远踝'],
    ['footFar', document.legs.far.foot, '#a8aaff', '远脚端'],
    ['kneeNear', document.legs.near.knee, '#78e6ff', '近膝'],
    ['ankleNear', document.legs.near.ankle, '#78e6ff', '近踝'],
    ['footNear', document.legs.near.foot, '#78e6ff', '近脚端'],
  ]
  ctx.save(); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.translate(document.pelvis.center.x, document.pelvis.center.y); ctx.rotate(document.pelvis.rotation * Math.PI / 180); ctx.strokeRect(-document.pelvis.width / 2, -document.pelvis.height / 2, document.pelvis.width, document.pelvis.height); ctx.restore()
  ctx.save(); ctx.strokeStyle = '#9aabc4'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); for (const point of [document.pelvis.hipFar, document.pelvis.hipNear]) { ctx.beginPath(); ctx.moveTo(document.pelvis.center.x, document.pelvis.center.y); ctx.lineTo(point.x, point.y); ctx.stroke() } ctx.restore()
  for (const [id, point, color, label] of handles) {
    const major = id === 'pelvis' || id === 'hipNear' || id === 'hipFar'
    ctx.save(); ctx.fillStyle = id === 'pelvis' || !major ? color : '#121927'; ctx.strokeStyle = selected === id ? '#ff7f9d' : color; ctx.lineWidth = selected === id ? 6 : 4; ctx.beginPath(); ctx.arc(point.x, point.y, selected === id ? 13 : major ? 10 : 8, 0, Math.PI * 2); id === 'pelvis' || !major ? ctx.fill() : ctx.stroke()
    if (major || selected === id) { ctx.font = 'bold 18px "Microsoft YaHei", sans-serif'; ctx.fillStyle = color; ctx.strokeStyle = '#0c1422'; ctx.lineWidth = 6; const offsetX = id === 'hipFar' ? -126 : 16; const offsetY = id === 'pelvis' ? -18 : 34; ctx.strokeText(label, point.x + offsetX, point.y + offsetY); ctx.fillText(label, point.x + offsetX, point.y + offsetY) }
    ctx.restore()
  }
}

function drawMeshDebug(ctx: CanvasRenderingContext2D, mesh: MeshDef, positions: Float32Array, color: string, vertices: boolean): void {
  const columns = 10; const rows = 13
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5
  for (let row = 0; row < rows; row += 1) { ctx.beginPath(); for (let col = 0; col < columns; col += 1) { const i = row * columns + col; const x = positions[i * 2]!; const y = positions[i * 2 + 1]!; col === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) } ctx.stroke() }
  for (let col = 0; col < columns; col += 1) { ctx.beginPath(); for (let row = 0; row < rows; row += 1) { const i = row * columns + col; const x = positions[i * 2]!; const y = positions[i * 2 + 1]!; row === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) } ctx.stroke() }
  if (vertices) for (let i = 0; i < positions.length / 2; i += 1) { ctx.beginPath(); ctx.arc(positions[i * 2]!, positions[i * 2 + 1]!, 3.5, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

function drawFlexibleMeshDebug(ctx: CanvasRenderingContext2D, mesh: GridMesh, color: string, vertices: boolean): void {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5
  for (let row = 0; row < mesh.rows; row += 1) { ctx.beginPath(); for (let column = 0; column < mesh.columns; column += 1) { const index = row * mesh.columns + column; const x = mesh.output[index * 2]!; const y = mesh.output[index * 2 + 1]!; column === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) } ctx.stroke() }
  for (let column = 0; column < mesh.columns; column += 1) { ctx.beginPath(); for (let row = 0; row < mesh.rows; row += 1) { const index = row * mesh.columns + column; const x = mesh.output[index * 2]!; const y = mesh.output[index * 2 + 1]!; row === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) } ctx.stroke() }
  if (vertices) for (let index = 0; index < mesh.output.length / 2; index += 1) { ctx.beginPath(); ctx.arc(mesh.output[index * 2]!, mesh.output[index * 2 + 1]!, 3.5, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

const ZERO_BODY_MOTION: BodyMotionPose = {
  bounceY: 0,
  leanDeg: 0,
  headCounterDeg: 0,
  nearUpperArmDeg: 0,
  nearForearmDeg: 0,
  nearWristDeg: 0,
  farUpperArmDeg: 0,
  farForearmDeg: 0,
  farWristDeg: 0,
}

function rotateAt(ctx: CanvasRenderingContext2D, pivot: Vec2, degrees: number): void {
  ctx.translate(pivot.x, pivot.y)
  ctx.rotate(degrees * Math.PI / 180)
  ctx.translate(-pivot.x, -pivot.y)
}

function drawRotatedLayer(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rotations: readonly { pivot: Vec2; degrees: number }[],
): void {
  ctx.save()
  for (const rotation of rotations) rotateAt(ctx, rotation.pivot, rotation.degrees)
  ctx.drawImage(image, 0, 0)
  ctx.restore()
}

function drawRiggedArm(
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  side: 'near' | 'far',
  shoulderDeg: number,
  elbowDeg: number,
  wristDeg: number,
): void {
  const rig = ARM_RIGS[side]
  const shoulder = [{ pivot: rig.shoulder, degrees: shoulderDeg }]
  const forearm = [...shoulder, { pivot: rig.elbow, degrees: elbowDeg }]
  const hand = [...forearm, { pivot: rig.wrist, degrees: wristDeg }]
  // Overlaps are drawn first. At bind they are fully covered by the visible
  // neighbouring part; during motion they bridge only the newly exposed seam.
  drawRotatedLayer(ctx, images.get(`arm-${side}-elbow-upper-underlay`)!, shoulder)
  drawRotatedLayer(ctx, images.get(`arm-${side}-elbow-forearm-underlay`)!, forearm)
  drawRotatedLayer(ctx, images.get(`arm-${side}-wrist-underlay`)!, forearm)
  drawRotatedLayer(ctx, images.get(`arm-${side}-upper`)!, shoulder)
  drawRotatedLayer(ctx, images.get(`arm-${side}-forearm`)!, forearm)
  drawRotatedLayer(ctx, images.get(`arm-${side}-hand`)!, hand)
}

function rotatePoint(point: Vec2, pivot: Vec2, degrees: number): Vec2 {
  const radians = degrees * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const x = point.x - pivot.x
  const y = point.y - pivot.y
  return { x: pivot.x + x * cosine - y * sine, y: pivot.y + x * sine + y * cosine }
}

function transformPoint(point: Vec2, rotations: readonly { pivot: Vec2; degrees: number }[]): Vec2 {
  let transformed = { ...point }
  for (let index = rotations.length - 1; index >= 0; index -= 1) {
    const rotation = rotations[index]!
    transformed = rotatePoint(transformed, rotation.pivot, rotation.degrees)
  }
  return transformed
}

function drawArmSkeleton(
  ctx: CanvasRenderingContext2D,
  side: 'near' | 'far',
  shoulderDeg: number,
  elbowDeg: number,
  wristDeg: number,
  color: string,
): void {
  const rig = ARM_RIGS[side]
  const shoulderRotations = [{ pivot: rig.shoulder, degrees: shoulderDeg }]
  const elbowRotations = [...shoulderRotations, { pivot: rig.elbow, degrees: elbowDeg }]
  const wristRotations = [...elbowRotations, { pivot: rig.wrist, degrees: wristDeg }]
  const points = [
    rig.shoulder,
    transformPoint(rig.elbow, shoulderRotations),
    transformPoint(rig.wrist, elbowRotations),
    transformPoint(rig.handEnd, wristRotations),
  ]
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(points[0]!.x, points[0]!.y); for (const point of points.slice(1)) ctx.lineTo(point.x, point.y); ctx.stroke()
  for (const point of points.slice(0, -1)) { ctx.beginPath(); ctx.arc(point.x, point.y, 7, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

export interface MeshSkinningPreviewOptions {
  assetBaseUrl: string
  /** Uses the complete user-updated V1 layer set instead of legacy cutouts. */
  candidateCharacterBaseUrl?: string
  legTextureUrls?: {
    near: string
    far: string
  }
  textureUrls?: Readonly<Record<string, string>>
  transparentBackground?: boolean
  interactiveCalibration?: boolean
  loadDebugAssets?: boolean
  outputSize?: number
  meshQuality?: MeshQuality
}

export async function createMeshSkinningPreview(canvas: HTMLCanvasElement, options: MeshSkinningPreviewOptions): Promise<MeshSkinningPreviewController> {
  const usesCandidateCharacter = options.candidateCharacterBaseUrl !== undefined
  const debugIds = options.loadDebugAssets === false ? [] : ['skirt-occlusion']
  const ids = usesCandidateCharacter
    ? [...CANDIDATE_CHARACTER_TEXTURES, ...CANDIDATE_ARM_RIG_TEXTURES, ...debugIds]
    : [...STATIC_BEFORE_LEGS, ...STATIC_AFTER_LEGS, 'leg-near-full', 'leg-far-full', ...debugIds, 'near-arm-body-completion']
  const textureUrl = (id: string): string => {
    const explicit = options.textureUrls?.[id]
    if (explicit !== undefined) return explicit
    if (usesCandidateCharacter && CANDIDATE_CHARACTER_TEXTURES.includes(id as typeof CANDIDATE_CHARACTER_TEXTURES[number])) {
      return `${options.candidateCharacterBaseUrl}/${id}.png`
    }
    if (usesCandidateCharacter && CANDIDATE_ARM_RIG_TEXTURES.includes(id as typeof CANDIDATE_ARM_RIG_TEXTURES[number])) {
      return `${options.candidateCharacterBaseUrl}/arm-rig-v1/${id}.png`
    }
    if (id === 'leg-near-full' && options.legTextureUrls !== undefined) return options.legTextureUrls.near
    if (id === 'leg-far-full' && options.legTextureUrls !== undefined) return options.legTextureUrls.far
    return `${options.assetBaseUrl}/textures/${id}.png`
  }
  const entries = await Promise.all(ids.map(async id => [id, await loadImage(textureUrl(id))] as const))
  const images = new Map(entries)
  const ctx = canvas.getContext('2d')!
  const outputSize = options.outputSize ?? SIZE
  const meshQuality = options.meshQuality ?? 'high'
  canvas.width = outputSize; canvas.height = outputSize
  let document = createInitialPelvisRig()
  let skeleton = createSkeleton(document)
  let legs = { near: makeLeg('near', document, skeleton.bindMatrices, meshQuality), far: makeLeg('far', document, skeleton.bindMatrices, meshQuality) }
  const flexibleMeshes = {
    hair: createGridMesh([500, 515, 820, 670], meshQuality === 'high' ? 13 : 9, meshQuality === 'high' ? 8 : 6),
    tail: createGridMesh([545, 540, 960, 845], meshQuality === 'high' ? 15 : 11, meshQuality === 'high' ? 9 : 7),
    ahoge: createGridMesh([286, 4, 422, 106], meshQuality === 'high' ? 9 : 7, meshQuality === 'high' ? 7 : 5),
  }
  const springs: Record<SecondaryMotionId, SpringValue> = {
    tail: new SpringValue({ stiffness: 48, damping: 9, maxOffset: 16 }),
    hair: new SpringValue({ stiffness: 62, damping: 11, maxOffset: 10 }),
    ahoge: new SpringValue({ stiffness: 78, damping: 11, maxOffset: 12 }),
  }
  let near: [number, number, number] = [0, 0, 0]
  let far: [number, number, number] = [0, 0, 0]
  let hipOffsets: [number, number, number, number] = [0, 0, 0, 0]
  let bodyMotion: BodyMotionPose = { ...ZERO_BODY_MOTION }
  let facing: 'left' | 'right' = 'left'
  let primaryMotionActive = false
  let secondaryMotionEnabled = true
  let showBones = true; let showMesh = false; let showVertices = false; let showOcclusion = false
  let calibrationMode = true
  let selectedHandle: CalibrationHandle | undefined
  let dragging: CalibrationHandle | undefined
  let onCalibrationChange: ((current: PelvisRigDocument) => void) | undefined
  const rebuildSkin = (): void => {
    skeleton = createSkeleton(document)
    legs = { near: makeLeg('near', document, skeleton.bindMatrices, meshQuality), far: makeLeg('far', document, skeleton.bindMatrices, meshQuality) }
  }
  const render = (): void => {
    const pose = poseFor(skeleton, near, far, hipOffsets)
    const worlds = skeleton.hierarchy.fk(pose)
    const world = skeleton.hierarchy.worldMatrices(pose, undefined, worlds)
    skinPrepared(legs.near.prepared, world, legs.near.output)
    skinPrepared(legs.far.prepared, world, legs.far.output)
    deformRootedTuft(flexibleMeshes.hair, { x: 580, y: 525 }, 285, springs.hair.value)
    deformHorizontalChain(flexibleMeshes.tail, { x: 565, y: 720 }, 952, springs.tail.value)
    deformRootedTuft(flexibleMeshes.ahoge, { x: 372, y: 96 }, 122, springs.ahoge.value)
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, outputSize, outputSize)
    if (options.transparentBackground !== true) { ctx.fillStyle = '#121927'; ctx.fillRect(0, 0, outputSize, outputSize) }
    ctx.save()
    ctx.scale(outputSize / SIZE, outputSize / SIZE)
    if (facing === 'right') {
      ctx.translate(SIZE, 0)
      ctx.scale(-1, 1)
    }
    ctx.translate(document.pelvis.center.x, document.pelvis.center.y + bodyMotion.bounceY)
    ctx.rotate(bodyMotion.leanDeg * Math.PI / 180)
    ctx.translate(-document.pelvis.center.x, -document.pelvis.center.y)
    if (usesCandidateCharacter) {
      // Back-to-front order matches the user-updated V1 asset manifest. Arms
      // use exact-visible split layers plus hidden overlap pixels. No hair or
      // dress pixels are owned by an arm bone.
      ctx.save(); rotateAt(ctx, { x: 371, y: 500 }, bodyMotion.headCounterDeg); drawFlexibleMesh(ctx, images.get('hair-back-complete')!, flexibleMeshes.hair); ctx.restore()
      drawFlexibleMesh(ctx, images.get('tail-complete')!, flexibleMeshes.tail)
      drawTexturedMesh(ctx, images.get('leg-far-complete')!, legs.far.def, legs.far.output, legs.far.columns, legs.far.rows)
      drawTexturedMesh(ctx, images.get('leg-near-complete')!, legs.near.def, legs.near.output, legs.near.columns, legs.near.rows)
      drawRiggedArm(ctx, images, 'far', bodyMotion.farUpperArmDeg, bodyMotion.farForearmDeg, bodyMotion.farWristDeg)
      ctx.drawImage(images.get('dress-complete')!, 0, 0)
      drawRiggedArm(ctx, images, 'near', bodyMotion.nearUpperArmDeg, bodyMotion.nearForearmDeg, bodyMotion.nearWristDeg)
      drawRotatedLayer(ctx, images.get('head-front-complete-v3')!, [{ pivot: { x: 371, y: 500 }, degrees: bodyMotion.headCounterDeg }])
      ctx.save(); rotateAt(ctx, { x: 371, y: 500 }, bodyMotion.headCounterDeg); drawFlexibleMesh(ctx, images.get('ahoge-complete')!, flexibleMeshes.ahoge); ctx.restore()
    }
    else {
      ctx.drawImage(images.get('body-base-underlay')!, 0, 0)
      drawRotatedLayer(ctx, images.get('hair-back')!, [{ pivot: { x: 371, y: 500 }, degrees: bodyMotion.headCounterDeg }])
      ctx.drawImage(images.get('tail')!, 0, 0)
      drawRotatedLayer(ctx, images.get('upper-arm-far')!, [{ pivot: { x: 286, y: 550 }, degrees: bodyMotion.farUpperArmDeg }])
      drawRotatedLayer(ctx, images.get('forearm-far')!, [
        { pivot: { x: 286, y: 550 }, degrees: bodyMotion.farUpperArmDeg },
        { pivot: { x: 238, y: 637 }, degrees: bodyMotion.farForearmDeg },
      ])
      drawTexturedMesh(ctx, images.get('leg-far-full')!, legs.far.def, legs.far.output, legs.far.columns, legs.far.rows)
      drawTexturedMesh(ctx, images.get('leg-near-full')!, legs.near.def, legs.near.output, legs.near.columns, legs.near.rows)
      ctx.drawImage(images.get('near-arm-body-completion')!, 0, 0)
      ctx.drawImage(images.get('body-base')!, 0, 0)
      drawRotatedLayer(ctx, images.get('upper-arm-near')!, [{ pivot: { x: 470, y: 535 }, degrees: bodyMotion.nearUpperArmDeg }])
      drawRotatedLayer(ctx, images.get('forearm-near-clean')!, [
        { pivot: { x: 470, y: 535 }, degrees: bodyMotion.nearUpperArmDeg },
        { pivot: { x: 563, y: 643 }, degrees: bodyMotion.nearForearmDeg },
      ])
      drawRotatedLayer(ctx, images.get('head')!, [{ pivot: { x: 371, y: 500 }, degrees: bodyMotion.headCounterDeg }])
      drawRotatedLayer(ctx, images.get('ahoge')!, [{ pivot: { x: 371, y: 500 }, degrees: bodyMotion.headCounterDeg }])
    }
    if (showOcclusion && images.has('skirt-occlusion')) { ctx.save(); ctx.globalAlpha = 0.55; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(images.get('skirt-occlusion')!, 0, 0); ctx.restore() }
    if (showMesh) {
      drawMeshDebug(ctx, legs.far.def, legs.far.output, '#a8aaff', showVertices)
      drawMeshDebug(ctx, legs.near.def, legs.near.output, '#78e6ff', showVertices)
      if (usesCandidateCharacter) {
        drawFlexibleMeshDebug(ctx, flexibleMeshes.hair, '#ff9dc2', showVertices)
        drawFlexibleMeshDebug(ctx, flexibleMeshes.tail, '#65a8ff', showVertices)
        drawFlexibleMeshDebug(ctx, flexibleMeshes.ahoge, '#ffd166', showVertices)
      }
    }
    if (showBones) {
      drawSkeleton(ctx, worlds, '#78e6ff')
      drawArmSkeleton(ctx, 'far', bodyMotion.farUpperArmDeg, bodyMotion.farForearmDeg, bodyMotion.farWristDeg, '#a8aaff')
      drawArmSkeleton(ctx, 'near', bodyMotion.nearUpperArmDeg, bodyMotion.nearForearmDeg, bodyMotion.nearWristDeg, '#ff9dc2')
    }
    if (calibrationMode) drawCalibrationOverlay(ctx, document, selectedHandle)
    ctx.restore()
  }
  const canvasPoint = (event: PointerEvent): Vec2 => {
    const bounds = canvas.getBoundingClientRect()
    return { x: Math.max(0, Math.min(SIZE, (event.clientX - bounds.left) * SIZE / bounds.width)), y: Math.max(0, Math.min(SIZE, (event.clientY - bounds.top) * SIZE / bounds.height)) }
  }
  const nearestHandle = (point: Vec2): CalibrationHandle | undefined => {
    const candidates: Array<[CalibrationHandle, Vec2]> = [
      ['pelvis', document.pelvis.center], ['hipNear', document.pelvis.hipNear], ['hipFar', document.pelvis.hipFar],
      ['kneeNear', document.legs.near.knee], ['ankleNear', document.legs.near.ankle], ['footNear', document.legs.near.foot],
      ['kneeFar', document.legs.far.knee], ['ankleFar', document.legs.far.ankle], ['footFar', document.legs.far.foot],
    ]
    let nearest: CalibrationHandle | undefined; let best = 32
    for (const [id, candidate] of candidates) { const current = distance(point, candidate); if (current < best) { nearest = id; best = current } }
    return nearest
  }
  const updateCalibration = (id: CalibrationHandle, point: Vec2): void => {
    const neighbors: Partial<Record<CalibrationHandle, readonly Vec2[]>> = {
      hipNear: [document.legs.near.knee], kneeNear: [document.legs.near.hip, document.legs.near.ankle], ankleNear: [document.legs.near.knee, document.legs.near.foot], footNear: [document.legs.near.ankle],
      hipFar: [document.legs.far.knee], kneeFar: [document.legs.far.hip, document.legs.far.ankle], ankleFar: [document.legs.far.knee, document.legs.far.foot], footFar: [document.legs.far.ankle],
    }
    if (neighbors[id]?.some(neighbor => distance(point, neighbor) < 2)) return
    if (id === 'pelvis') {
      const dx = point.x - document.pelvis.center.x
      const dy = point.y - document.pelvis.center.y
      document.pelvis.center = { ...point }
      document.pelvis.hipNear = { x: Math.max(0, Math.min(SIZE, document.pelvis.hipNear.x + dx)), y: Math.max(0, Math.min(SIZE, document.pelvis.hipNear.y + dy)) }
      document.pelvis.hipFar = { x: Math.max(0, Math.min(SIZE, document.pelvis.hipFar.x + dx)), y: Math.max(0, Math.min(SIZE, document.pelvis.hipFar.y + dy)) }
    }
    else if (id === 'hipNear') document.pelvis.hipNear = { ...point }
    else if (id === 'hipFar') document.pelvis.hipFar = { ...point }
    else if (id === 'kneeNear') document.legs.near.knee = { ...point }
    else if (id === 'kneeFar') document.legs.far.knee = { ...point }
    else if (id === 'ankleNear') document.legs.near.ankle = { ...point }
    else if (id === 'ankleFar') document.legs.far.ankle = { ...point }
    else if (id === 'footNear') document.legs.near.foot = { ...point }
    else document.legs.far.foot = { ...point }
    syncLegHips(document); validatePelvisRig(document); rebuildSkin(); render(); onCalibrationChange?.(clonePelvisRig(document))
  }
  const onPointerDown = (event: PointerEvent): void => {
    if (!calibrationMode) return
    dragging = nearestHandle(canvasPoint(event)); selectedHandle = dragging
    if (dragging !== undefined) { canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing'; render() }
  }
  const onPointerMove = (event: PointerEvent): void => {
    if (!calibrationMode) return
    if (dragging !== undefined) updateCalibration(dragging, canvasPoint(event))
    else canvas.style.cursor = nearestHandle(canvasPoint(event)) === undefined ? 'default' : 'grab'
  }
  const onPointerUp = (event: PointerEvent): void => { if (dragging !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); dragging = undefined; canvas.style.cursor = 'default' }
  const onPointerCancel = (): void => { dragging = undefined; canvas.style.cursor = 'default' }
  if (options.interactiveCalibration !== false) {
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
  }
  render()
  const controller: MeshSkinningPreviewController = {
    setFacing(value): void {
      if (facing === value) return
      facing = value
      render()
    },
    setNearPose(thigh, calf, foot): void { near = [thigh, calf, foot]; render() },
    setFarPose(thigh, calf, foot): void { far = [thigh, calf, foot]; render() },
    setNearArmPose(shoulder, elbow, wrist): void { bodyMotion.nearUpperArmDeg = shoulder; bodyMotion.nearForearmDeg = elbow; bodyMotion.nearWristDeg = wrist; render() },
    setFarArmPose(shoulder, elbow, wrist): void { bodyMotion.farUpperArmDeg = shoulder; bodyMotion.farForearmDeg = elbow; bodyMotion.farWristDeg = wrist; render() },
    setHipPoseOffsets(nearX, nearY, farX, farY): void { hipOffsets = [nearX, nearY, farX, farY]; render() },
    setBodyMotion(pose): void { bodyMotion = { ...pose }; render() },
    setMotionFrame(legPose, bodyPose): void {
      near = [...legPose.near]
      far = [...legPose.far]
      hipOffsets = [...legPose.hipOffsets]
      bodyMotion = { ...bodyPose }
      render()
    },
    setPrimaryMotionActive(value): void { primaryMotionActive = value },
    setSecondaryMotionEnabled(value): void {
      secondaryMotionEnabled = value
      if (!value) for (const spring of Object.values(springs)) spring.reset()
      render()
    },
    setSpringParameters(id, parameters): void {
      springs[id].parameters = { ...parameters }
    },
    getSecondaryMotion(): Readonly<Record<SecondaryMotionId, number>> {
      return { tail: springs.tail.value, hair: springs.hair.value, ahoge: springs.ahoge.value }
    },
    setShowBones(value): void { showBones = value; render() }, setShowMesh(value): void { showMesh = value; render() }, setShowVertices(value): void { showVertices = value; render() }, setShowOcclusion(value): void { showOcclusion = value; render() },
    setCalibrationMode(value): void { calibrationMode = value; selectedHandle = undefined; canvas.style.cursor = 'default'; render() },
    getCalibration(): PelvisRigDocument { return clonePelvisRig(document) },
    updateCalibration,
    resetCalibration(): void { document = createInitialPelvisRig(); rebuildSkin(); render(); onCalibrationChange?.(clonePelvisRig(document)) },
    get onCalibrationChange(): ((current: PelvisRigDocument) => void) | undefined { return onCalibrationChange },
    set onCalibrationChange(value: ((current: PelvisRigDocument) => void) | undefined) { onCalibrationChange = value },
    render,
    dispose(): void {
      disposed = true
      cancelAnimationFrame(physicsFrame)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
    },
  }
  let previousPhysicsTime = performance.now()
  let physicsFrame = 0
  let disposed = false
  const updatePhysics = (now: number): void => {
    if (disposed) return
    const deltaMs = now - previousPhysicsTime
    previousPhysicsTime = now
    const stride = bodyMotion.nearUpperArmDeg - bodyMotion.farUpperArmDeg
    const targets: Record<SecondaryMotionId, number> = primaryMotionActive
      ? {
          tail: stride * 0.42 - bodyMotion.bounceY * 0.35,
          hair: -stride * 0.22 + bodyMotion.bounceY * 0.28,
          ahoge: stride * 0.18 - bodyMotion.bounceY * 0.22,
        }
      : { tail: 0, hair: 0, ahoge: 0 }
    let moving = false
    for (const id of ['tail', 'hair', 'ahoge'] as const) {
      if (secondaryMotionEnabled) springs[id].step(targets[id], deltaMs)
      moving ||= Math.abs(springs[id].value) > 0.0005 || Math.abs(springs[id].velocity) > 0.0005
    }
    // Primary motion owns visible frame pacing. The physics loop renders only
    // the independent after-motion tail so it cannot silently turn economy
    // mode back into a full-rate double-render loop.
    if (!primaryMotionActive && moving) render()
    physicsFrame = requestAnimationFrame(updatePhysics)
  }
  physicsFrame = requestAnimationFrame(updatePhysics)
  return controller
}

export { LEG_BONES, BIND_POSE, BIND_MATRICES, makeLegMesh }
