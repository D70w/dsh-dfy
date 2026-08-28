import { SpringValue } from '../whale-rig2/secondary-motion.ts'
import { blinkOpenness, clampPointer, sampleIdleMotion } from '../community-rig/motion.ts'

const DESIGN_SIZE = 1280

export type SeeThroughExpression = 'neutral' | 'smug' | 'happy'
export type SeeThroughGesture = 'none' | 'wave' | 'nod' | 'tilt'
export type SeeThroughBoneId =
  | 'root' | 'pelvis' | 'waist' | 'chest' | 'neck' | 'head'
  | 'armLeftUpper' | 'armLeftForearm' | 'handLeft'
  | 'armRightUpper' | 'armRightForearm' | 'handRight'
  | 'legLeft' | 'legLeftLower' | 'legRight' | 'legRightLower'
  | 'hairBackRoot' | 'hairBackLeft' | 'hairBackRight'
  | 'hairFrontLeft' | 'hairFrontRight'
  | 'ahogeRoot' | 'ahogeTip'
  | 'tailRoot' | 'tail1' | 'tail2' | 'tailTip'

interface ManifestPart {
  file: string
  x: number
  y: number
  width: number
  height: number
}

interface AssetManifest {
  designSize: [number, number]
  parts: Record<string, ManifestPart>
}

interface LoadedPart extends ManifestPart {
  image: HTMLImageElement
}

interface BonePose {
  id: SeeThroughBoneId
  parent: SeeThroughBoneId | null
  pivotX: number
  pivotY: number
  x?: number
  y?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
}

interface BonePivotOffset {
  x: number
  y: number
}

interface MeshPoint {
  x: number
  y: number
}

type VertexWeights = ReadonlyArray<readonly [SeeThroughBoneId, number]>
type MeshDeformer = (x: number, y: number) => MeshPoint

export interface GesturePose {
  pelvisX: number
  pelvisY: number
  pelvisRotation: number
  waistRotation: number
  chestRotation: number
  headX: number
  headY: number
  headRotation: number
  headScaleX: number
  headScaleY: number
  headPitch: number
  shoulderLeftX: number
  shoulderLeftY: number
  shoulderRightX: number
  shoulderRightY: number
  armLeftUpper: number
  armLeftForearm: number
  handLeft: number
  armRightUpper: number
  armRightForearm: number
  handRight: number
  legLeftUpper: number
  legRightUpper: number
  skirtSway: number
  wavePalm: number
  gazeX: number
  gazeY: number
  blinkOpenness: number
  smile: number
  mouthOpen: number
  blush: number
  browLeftRotation: number
  browRightRotation: number
  browY: number
  shoulderMorph: number
  shoulderShrug: number
  elbowMorph: number
  cuffMorph: number
}

interface ExpressionStyle {
  mouthScaleX: number
  mouthScaleY: number
  blushOpacity: number
  headLift: number
}

export type ScalarCurve = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'hermite'

export interface ScalarKeyframe {
  time: number
  value: number
  curve?: ScalarCurve
  inTangent?: number
  outTangent?: number
}

export interface SpriteStateKeyframe<T extends string> {
  time: number
  state: T
  transition?: number
}

type HandSpriteState = 'rest-side' | 'wave-front'

export interface SeeThroughIdleRigOptions {
  assetBaseUrl: string
  outputSize?: number
  transparentBackground?: boolean
  reducedMotion?: boolean
}

export type SeeThroughLayerId =
  | 'tail' | 'hair-back' | 'whale-fins' | 'ears' | 'lower-body' | 'torso'
  | 'arms-back' | 'shoes' | 'head' | 'collar-ruffles' | 'hands' | 'arms-front'

export interface SeeThroughLayerOption {
  id: SeeThroughLayerId
  label: string
}

export const seeThroughLayerOptions: ReadonlyArray<SeeThroughLayerOption> = [
  { id: 'tail', label: '鲸尾' },
  { id: 'hair-back', label: '后发' },
  { id: 'whale-fins', label: '鲸鱼耳鳍' },
  { id: 'ears', label: '人耳' },
  { id: 'lower-body', label: '腿／裙摆' },
  { id: 'torso', label: '身体／衣领底层' },
  { id: 'arms-back', label: '手臂后层' },
  { id: 'shoes', label: '鞋子' },
  { id: 'head', label: '脸／前发／发箍' },
  { id: 'collar-ruffles', label: '胸口白边' },
  { id: 'hands', label: '手掌' },
  { id: 'arms-front', label: '袖口前层' },
]

export const defaultSeeThroughLayerOrder: ReadonlyArray<SeeThroughLayerId> = seeThroughLayerOptions.map(option => option.id)

export interface SeeThroughIdleRigController {
  setPointer(x: number, y: number): void
  /** Feed bounded grab velocity to the rig's shared secondary-motion system. */
  setExternalMotion(x: number, y: number): void
  setGrabPoint(x: number, y: number): void
  setGrabbed(value: boolean): void
  setExpression(expression: SeeThroughExpression): void
  playGesture(gesture: Exclude<SeeThroughGesture, 'none'>): void
  stopGesture(): void
  setGestureSpeed(speed: number): void
  setBreathing(enabled: boolean): void
  setBlinking(enabled: boolean): void
  triggerBlink(): void
  setSecondaryMotion(enabled: boolean): void
  setReducedMotion(enabled: boolean): void
  setDebug(enabled: boolean): void
  setLayerOrder(order: ReadonlyArray<SeeThroughLayerId>): void
  setLayerVisible(id: SeeThroughLayerId, visible: boolean): void
  resetLayerOrder(): void
  setManualBoneRotation(id: SeeThroughBoneId, degrees: number): void
  setManualBonePivotOffset(id: SeeThroughBoneId, x: number, y: number): void
  resetManualPose(): void
  getState(): Readonly<{ expression: SeeThroughExpression; gesture: SeeThroughGesture; gestureSpeed: number; blink: number; gazeX: number; gazeY: number }>
  dispose(): void
}

const partNames = [
  'hair-back', 'tail', 'face', 'mouth', 'neck', 'torso', 'collar-front', 'human-ears',
  'arm-left-sleeve', 'hand-left-rest-side', 'hand-left-wave-front',
  'arm-right', 'leg-left', 'leg-right', 'shoe-left', 'shoe-right',
  'eye-white-left', 'eye-white-right', 'iris-left', 'iris-right',
  'lash-left', 'lash-right', 'brow-left', 'brow-right', 'hair-front', 'ahoge',
  'maid-headband', 'skirt', 'whale-fins', 'side-bow',
] as const

type PartName = typeof partNames[number]

const boneLabels: Record<SeeThroughBoneId, string> = {
  root: '总控制', pelvis: '骨盆', waist: '腰部', chest: '胸腔', neck: '颈部', head: '头部',
  armLeftUpper: '左上臂', armLeftForearm: '左前臂／肘关节', handLeft: '左手掌',
  armRightUpper: '右上臂', armRightForearm: '右前臂／肘关节', handRight: '右手掌',
  legLeft: '左大腿／髋关节', legLeftLower: '左小腿／膝关节',
  legRight: '右大腿／髋关节', legRightLower: '右小腿／膝关节',
  hairBackRoot: '后发根部', hairBackLeft: '左后发梢', hairBackRight: '右后发梢',
  hairFrontLeft: '左前发梢', hairFrontRight: '右前发梢',
  ahogeRoot: '呆毛根部', ahogeTip: '呆毛尖端',
  tailRoot: '鲸尾根部', tail1: '鲸尾第一段', tail2: '鲸尾第二段', tailTip: '鲸尾尖端',
}

// Committed from the visual calibration panel. Keep these as the authored
// baseline so the UI returns to zero after a correction is accepted.
const committedArmPivots = {
  leftForearm: { x: 483, y: 682 },
  rightForearm: { x: 770, y: 681 },
} as const

// The generated front palm has its source wrist at (422, 754). Its target is
// intentionally inset past the visible cuff edge, then rotated so the palm's
// centre axis continues the forearm instead of leaning away from it.
const waveFrontPalmPlacement = {
  targetX: 440,
  targetY: 760,
  rotationOffset: -66.5,
  mirrorAxis: 105,
  sourceWristX: 422,
  sourceWristY: 754,
} as const

const gestureDurations: Record<Exclude<SeeThroughGesture, 'none'>, number> = {
  wave: 1600,
  nod: 1800,
  tilt: 2100,
}

const expressionStyles: Record<SeeThroughExpression, ExpressionStyle> = {
  neutral: { mouthScaleX: 1, mouthScaleY: 1, blushOpacity: 0, headLift: 0 },
  smug: { mouthScaleX: 1.18, mouthScaleY: 0.92, blushOpacity: 0.68, headLift: -0.8 },
  happy: { mouthScaleX: 1.08, mouthScaleY: 1.75, blushOpacity: 1, headLift: -1.7 },
}

const waveTracks = {
  anticipation: [
    { time: 0, value: 0, curve: 'easeOut' },
    { time: 0.085, value: 1, curve: 'easeInOut' },
    { time: 0.16, value: 0, curve: 'linear' },
    { time: 1, value: 0 },
  ],
  raised: [
    { time: 0, value: 0, curve: 'linear' },
    { time: 0.06, value: 0, curve: 'easeInOut' },
    { time: 0.23, value: 1, curve: 'linear' },
    { time: 0.67, value: 1, curve: 'easeInOut' },
    { time: 0.87, value: 0, curve: 'linear' },
    { time: 1, value: 0 },
  ],
  arrival: [
    { time: 0, value: 0, curve: 'linear' },
    { time: 0.17, value: 0, curve: 'easeOut' },
    { time: 0.24, value: 1, curve: 'easeInOut' },
    { time: 0.32, value: 0, curve: 'linear' },
    { time: 1, value: 0 },
  ],
  waveEnergy: [
    { time: 0, value: 0, curve: 'linear' },
    { time: 0.2, value: 0, curve: 'easeOut' },
    { time: 0.28, value: 1, curve: 'linear' },
    { time: 0.64, value: 1, curve: 'easeInOut' },
    { time: 0.73, value: 0, curve: 'linear' },
    { time: 1, value: 0 },
  ],
  returnOvershoot: [
    { time: 0, value: 0, curve: 'linear' },
    { time: 0.78, value: 0, curve: 'easeOut' },
    { time: 0.9, value: 1, curve: 'easeInOut' },
    { time: 1, value: 0 },
  ],
} as const satisfies Record<string, ReadonlyArray<ScalarKeyframe>>

const waveExpressionTracks = {
  smile: [
    { time: 0, value: 0, curve: 'linear' },
    { time: 0.05, value: 0, curve: 'easeOut' },
    { time: 0.18, value: 1, curve: 'easeInOut' },
    { time: 0.72, value: 0.95, curve: 'easeInOut' },
    { time: 0.84, value: 0.42, curve: 'easeInOut' },
    { time: 1, value: 0 },
  ],
  mouthOpen: [
    { time: 0, value: 0, curve: 'linear' },
    { time: 0.06, value: 0, curve: 'easeOut' },
    { time: 0.18, value: 1, curve: 'easeInOut' },
    { time: 0.68, value: 0.9, curve: 'easeOut' },
    { time: 0.78, value: 0.38, curve: 'easeInOut' },
    { time: 0.9, value: 0, curve: 'linear' },
    { time: 1, value: 0 },
  ],
  blush: [
    { time: 0, value: 0, curve: 'linear' },
    { time: 0.08, value: 0.1, curve: 'easeOut' },
    { time: 0.2, value: 0.88, curve: 'easeInOut' },
    { time: 0.72, value: 0.8, curve: 'easeInOut' },
    { time: 1, value: 0 },
  ],
  browLift: [
    { time: 0, value: 0, curve: 'linear' },
    { time: 0.08, value: 0, curve: 'easeOut' },
    { time: 0.2, value: 1, curve: 'easeInOut' },
    { time: 0.68, value: 0.76, curve: 'easeInOut' },
    { time: 0.82, value: 0, curve: 'linear' },
    { time: 1, value: 0 },
  ],
} as const satisfies Record<string, ReadonlyArray<ScalarKeyframe>>

const waveHandSpriteTrack: ReadonlyArray<SpriteStateKeyframe<HandSpriteState>> = [
  { time: 0, state: 'rest-side' },
  { time: 0.08, state: 'wave-front', transition: 0.12 },
  { time: 0.74, state: 'rest-side', transition: 0.12 },
]

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`see-through rig: failed to load ${url}`))
    image.src = url
  })
}

async function loadParts(baseUrl: string): Promise<Record<PartName, LoadedPart>> {
  const normalized = baseUrl.replace(/\/$/, '')
  const manifest = await fetch(`${normalized}/manifest.json`).then(async response => {
    if (!response.ok) throw new Error(`see-through rig: manifest ${response.status}`)
    return response.json() as Promise<AssetManifest>
  })
  if (manifest.designSize[0] !== DESIGN_SIZE || manifest.designSize[1] !== DESIGN_SIZE) throw new Error('see-through rig: unexpected design size')
  const entries = await Promise.all(partNames.map(async name => {
    const part = manifest.parts[name]
    if (!part) throw new Error(`see-through rig: missing ${name}`)
    return [name, { ...part, image: await loadImage(`${normalized}/${part.file}`) }] as const
  }))
  return Object.fromEntries(entries) as Record<PartName, LoadedPart>
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function applyScalarCurve(curve: ScalarCurve, value: number): number {
  const t = clamp01(value)
  if (curve === 'easeIn') return t * t * t
  if (curve === 'easeOut') return 1 - Math.pow(1 - t, 3)
  if (curve === 'easeInOut') return easeInOutCubic(t)
  return t
}

export function sampleScalarTrack(track: ReadonlyArray<ScalarKeyframe>, time: number): number {
  if (track.length === 0) return 0
  const t = clamp01(time)
  if (t <= track[0].time) return track[0].value
  const last = track[track.length - 1]
  if (t >= last.time) return last.value
  for (let index = 0; index < track.length - 1; index += 1) {
    const current = track[index]
    const next = track[index + 1]
    if (t > next.time) continue
    const duration = Math.max(0.0001, next.time - current.time)
    const progress = clamp01((t - current.time) / duration)
    if (current.curve === 'hermite') {
      const p2 = progress * progress
      const p3 = p2 * progress
      const m0 = (current.outTangent ?? 0) * duration
      const m1 = (next.inTangent ?? 0) * duration
      return (2 * p3 - 3 * p2 + 1) * current.value
        + (p3 - 2 * p2 + progress) * m0
        + (-2 * p3 + 3 * p2) * next.value
        + (p3 - p2) * m1
    }
    const curved = applyScalarCurve(current.curve ?? 'linear', progress)
    return current.value + (next.value - current.value) * curved
  }
  return last.value
}

export function sampleSpriteStateWeight<T extends string>(
  track: ReadonlyArray<SpriteStateKeyframe<T>>,
  time: number,
  targetState: T,
): number {
  if (track.length === 0) return 0
  const t = clamp01(time)
  let previous = track[0]
  let current = track[0]
  for (let index = 1; index < track.length; index += 1) {
    const candidate = track[index]
    if (candidate.time > t) break
    previous = current
    current = candidate
  }
  if (current === track[0] || !current.transition || current.transition <= 0) return current.state === targetState ? 1 : 0
  const mix = easeInOutCubic((t - current.time) / current.transition)
  const from = previous.state === targetState ? 1 : 0
  const to = current.state === targetState ? 1 : 0
  return from + (to - from) * mix
}

function interpolateExpression(from: ExpressionStyle, to: ExpressionStyle, progress: number): ExpressionStyle {
  const t = easeInOutCubic(progress)
  const mix = (a: number, b: number): number => a + (b - a) * t
  return {
    mouthScaleX: mix(from.mouthScaleX, to.mouthScaleX),
    mouthScaleY: mix(from.mouthScaleY, to.mouthScaleY),
    blushOpacity: mix(from.blushOpacity, to.blushOpacity),
    headLift: mix(from.headLift, to.headLift),
  }
}

function phase(progress: number, start: number, end: number): number {
  return easeInOutCubic((progress - start) / Math.max(0.0001, end - start))
}

function pulse(progress: number, start: number, peak: number, end: number): number {
  if (progress <= start || progress >= end) return 0
  return progress < peak ? phase(progress, start, peak) : 1 - phase(progress, peak, end)
}

function emptyGesturePose(): GesturePose {
  return {
    pelvisX: 0,
    pelvisY: 0,
    pelvisRotation: 0,
    waistRotation: 0,
    chestRotation: 0,
    headX: 0,
    headY: 0,
    headRotation: 0,
    headScaleX: 1,
    headScaleY: 1,
    headPitch: 0,
    shoulderLeftX: 0,
    shoulderLeftY: 0,
    shoulderRightX: 0,
    shoulderRightY: 0,
    armLeftUpper: 0,
    armLeftForearm: 0,
    handLeft: 0,
    armRightUpper: 0,
    armRightForearm: 0,
    handRight: 0,
    legLeftUpper: 0,
    legRightUpper: 0,
    skirtSway: 0,
    wavePalm: 0,
    gazeX: 0,
    gazeY: 0,
    blinkOpenness: 1,
    smile: 0,
    mouthOpen: 0,
    blush: 0,
    browLeftRotation: 0,
    browRightRotation: 0,
    browY: 0,
    shoulderMorph: 0,
    shoulderShrug: 0,
    elbowMorph: 0,
    cuffMorph: 0,
  }
}

export function sampleGesture(gesture: SeeThroughGesture, progress: number, amplitude: number): GesturePose {
  const pose = emptyGesturePose()
  if (gesture === 'none') return pose
  const t = clamp01(progress)
  if (gesture === 'wave') {
    const anticipation = sampleScalarTrack(waveTracks.anticipation, t)
    const raised = sampleScalarTrack(waveTracks.raised, t)
    const arrival = sampleScalarTrack(waveTracks.arrival, t)
    const waveWindow = sampleScalarTrack(waveTracks.waveEnergy, t)
    const forearmWave = Math.sin((t - 0.28) * Math.PI * 5.2) * waveWindow
    const palmFollowWave = Math.sin((t - 0.31) * Math.PI * 5.2) * waveWindow
    const returnOvershoot = sampleScalarTrack(waveTracks.returnOvershoot, t)

    // One continuous greeting phrase: the shoulder only opens enough to clear
    // the torso, the elbow places the palm beside the face, and the wrist does
    // the actual waving. This avoids the previous rigid side-reach poses.
    pose.pelvisX = (raised * 2.2 - returnOvershoot * 0.75) * amplitude
    pose.pelvisY = (-raised * 1.4 + arrival * 0.7) * amplitude
    pose.pelvisRotation = (raised * 0.7 - returnOvershoot * 0.25) * amplitude
    pose.waistRotation = (raised * 1.25 - returnOvershoot * 0.5) * amplitude
    pose.chestRotation = (raised * 2.15 - anticipation * 0.75 - returnOvershoot * 0.8) * amplitude
    pose.headX = (-raised * 3.5 + returnOvershoot * 1.2) * amplitude
    pose.headY = (-raised * 1.2 + arrival * 0.75) * amplitude
    pose.headRotation = (raised * 6.5 + forearmWave * 0.12 - anticipation * 0.7 - returnOvershoot * 1.8) * amplitude
    pose.headScaleY = 1 - arrival * 0.0045 * amplitude

    pose.shoulderLeftX = (-raised * 1.5 - arrival * 0.45) * amplitude
    pose.shoulderLeftY = (-raised * 1.35 - arrival * 0.5) * amplitude
    // Share more of the lift with the shoulder and keep the elbow below 90°.
    // Bending the original straight sleeve by ~100° at one joint stretched the
    // forearm texture into a rubber arc even though the wrist landed correctly.
    pose.armLeftUpper = (-anticipation * 2.8 + raised * 24 - forearmWave * 0.35 + arrival * 1.5) * amplitude
    // The forearm authors the greeting arc. The palm is already its child and
    // inherits that motion, so it only adds a small delayed local wrist follow.
    pose.armLeftForearm = (-anticipation * 3.5 + raised * 88 + forearmWave * 7 + arrival * 2.5) * amplitude
    pose.handLeft = (raised * 1.5 + palmFollowWave * 3 + arrival * 2.5 - returnOvershoot * 2.2) * amplitude
    pose.wavePalm = sampleSpriteStateWeight(waveHandSpriteTrack, t, 'wave-front')
    pose.shoulderMorph = raised * amplitude
    pose.elbowMorph = clamp01((raised * 0.86 + arrival * 0.14) * amplitude)
    pose.cuffMorph = clamp01((raised * 0.78 + Math.abs(forearmWave) * 0.22) * amplitude)

    pose.shoulderRightX = raised * 0.55 * amplitude
    pose.shoulderRightY = raised * 0.7 * amplitude
    pose.armRightUpper = (-raised * 2.6 + returnOvershoot * 0.7) * amplitude
    pose.armRightForearm = raised * 1.4 * amplitude
    pose.handRight = -raised * 1.2 * amplitude

    // The raised arm shifts weight toward the opposite foot. The movement is
    // intentionally small in front view: knees absorb the transfer while the
    // shoes stay planted instead of both legs swinging like rigid pendulums.
    pose.legLeftUpper = (raised * 1.65 - returnOvershoot * 0.55) * amplitude
    pose.legRightUpper = (-raised * 0.72 + returnOvershoot * 0.24) * amplitude
    pose.skirtSway = (-raised * 3.2 + forearmWave * 0.25 + returnOvershoot * 1.15) * amplitude

    pose.gazeX = -raised * 0.2 * amplitude
    pose.gazeY = -raised * 0.06 * amplitude
    // Let the anticipation blink read as a deliberate greeting beat instead of
    // a single-frame twitch. It closes before the palm reaches the face, then
    // opens into the smile so the eyes lead the body as in the motion reference.
    const greetingBlink = pulse(t, 0.06, 0.12, 0.19)
    const happySquint = pulse(t, 0.42, 0.5, 0.58) * 0.16 * amplitude
    pose.blinkOpenness = 1 - greetingBlink * amplitude - happySquint
    pose.smile = sampleScalarTrack(waveExpressionTracks.smile, t) * amplitude
    pose.mouthOpen = sampleScalarTrack(waveExpressionTracks.mouthOpen, t) * amplitude
    pose.blush = sampleScalarTrack(waveExpressionTracks.blush, t) * amplitude
    const browLift = sampleScalarTrack(waveExpressionTracks.browLift, t) * amplitude
    pose.browLeftRotation = -3.6 * browLift
    pose.browRightRotation = 3.6 * browLift
    pose.browY = -2.2 * browLift
  } else if (gesture === 'nod') {
    // A readable downward nod is a layered look-down pose, not a repeated
    // vertical bounce. The eyes lead, the chin and face follow, the shoulders
    // arrive later, then secondary hair motion is allowed to finish the return.
    const prepare = pulse(t, 0, 0.07, 0.14)
    const gazeDown = phase(t, 0.025, 0.14) * (1 - phase(t, 0.76, 0.93))
    const chinDown = phase(t, 0.1, 0.28) * (1 - phase(t, 0.65, 0.88))
    // The shoulder response in the reference starts after the face has already
    // committed to looking down. It holds through the chin pause, then releases
    // a little later so the upper body has visible mass instead of staying idle.
    const chestFollow = phase(t, 0.2, 0.36) * (1 - phase(t, 0.7, 0.92))
    const returnOvershoot = pulse(t, 0.84, 0.93, 1)

    pose.pelvisY = (chestFollow * 0.35 - prepare * 0.15) * amplitude
    pose.waistRotation = (-prepare * 0.12 + returnOvershoot * 0.1) * amplitude
    pose.chestRotation = (-prepare * 0.22 + returnOvershoot * 0.16) * amplitude
    // HeadPitch owns the face-plane perspective. The rigid skull only travels
    // a little toward the collar; it is never vertically squashed for a nod.
    pose.headY = (-prepare * 1.2 + chinDown * 5.8 - returnOvershoot * 1.4) * amplitude
    pose.headRotation = (-prepare * 0.3 + returnOvershoot * 0.25) * amplitude
    pose.headPitch = (chinDown * 0.96 - returnOvershoot * 0.06) * amplitude
    pose.headScaleX = 1
    pose.headScaleY = 1
    pose.shoulderLeftX = chestFollow * 3.2 * amplitude
    pose.shoulderRightX = -chestFollow * 3.2 * amplitude
    pose.shoulderLeftY = -chestFollow * 4.6 * amplitude
    pose.shoulderRightY = -chestFollow * 4.6 * amplitude
    pose.shoulderShrug = chestFollow * amplitude
    pose.armLeftUpper = (-chestFollow * 1.7 + returnOvershoot * 0.2) * amplitude
    pose.armRightUpper = (chestFollow * 1.7 - returnOvershoot * 0.2) * amplitude
    pose.legLeftUpper = chinDown * 0.22 * amplitude
    pose.legRightUpper = -chinDown * 0.22 * amplitude
    pose.skirtSway = (-chestFollow * 0.18 + returnOvershoot * 0.28) * amplitude
    pose.gazeY = (gazeDown * 0.78 - returnOvershoot * 0.08) * amplitude
    // The reference does not snap through a full blink during the main nod.
    // The upper lids gradually lower with the face, while a very small early
    // squeeze disguises the change in gaze direction.
    const lookDownBlink = pulse(t, 0.055, 0.105, 0.16)
    pose.blinkOpenness = 1 - lookDownBlink * 0.1 * amplitude - chinDown * 0.31 * amplitude
    pose.smile = phase(t, 0.15, 0.34) * (1 - phase(t, 0.74, 0.95)) * 0.36 * amplitude
    pose.mouthOpen = 0
    pose.blush = chinDown * 0.24 * amplitude
    pose.browLeftRotation = chinDown * 1.1 * amplitude
    pose.browRightRotation = -chinDown * 1.1 * amplitude
    pose.browY = chinDown * 1.65 * amplitude
  } else {
    // Curiosity starts in the eyes and head. The torso and shoulders arrive a
    // little later, then the head crosses centre by a few degrees on the return.
    const prepare = pulse(t, 0, 0.095, 0.19)
    const headTilt = phase(t, 0.105, 0.33) * (1 - phase(t, 0.73, 0.91))
    const torsoFollow = phase(t, 0.19, 0.43) * (1 - phase(t, 0.77, 0.95))
    const curiousHold = phase(t, 0.3, 0.43) * (1 - phase(t, 0.7, 0.82))
    const returnOvershoot = pulse(t, 0.82, 0.925, 1)

    pose.pelvisX = (-torsoFollow * 1.8 + returnOvershoot * 0.6) * amplitude
    pose.pelvisRotation = (-torsoFollow * 0.45 + returnOvershoot * 0.18) * amplitude
    pose.waistRotation = (-torsoFollow * 0.9 + returnOvershoot * 0.35) * amplitude
    pose.chestRotation = (-torsoFollow * 2.25 + returnOvershoot * 0.85 + prepare * 0.35) * amplitude
    pose.headX = (prepare * 1.8 - headTilt * 8.2 + returnOvershoot * 2.2) * amplitude
    pose.headY = (-prepare * 0.8 + headTilt * 2.5 - returnOvershoot * 0.7) * amplitude
    pose.headRotation = (prepare * 2.2 - headTilt * 12.5 + returnOvershoot * 2.8) * amplitude
    pose.headScaleY = 1 - curiousHold * 0.0025 * amplitude
    pose.shoulderLeftX = -torsoFollow * 0.8 * amplitude
    pose.shoulderLeftY = torsoFollow * 0.75 * amplitude
    pose.shoulderRightX = torsoFollow * 0.55 * amplitude
    pose.shoulderRightY = -torsoFollow * 0.35 * amplitude
    pose.armLeftUpper = (torsoFollow * 3.2 - returnOvershoot * 0.8) * amplitude
    pose.armLeftForearm = torsoFollow * 1.1 * amplitude
    pose.armRightUpper = (-torsoFollow * 2.2 + returnOvershoot * 0.65) * amplitude
    pose.armRightForearm = -torsoFollow * 0.7 * amplitude
    pose.legLeftUpper = (torsoFollow * 0.72 - returnOvershoot * 0.26) * amplitude
    pose.legRightUpper = (torsoFollow * 1.35 - returnOvershoot * 0.48) * amplitude
    pose.skirtSway = (torsoFollow * 3.8 - returnOvershoot * 1.7) * amplitude
    pose.gazeX = (-phase(t, 0.06, 0.25) * (1 - phase(t, 0.76, 0.94)) * 0.3 + returnOvershoot * 0.06) * amplitude
    pose.gazeY = curiousHold * 0.06 * amplitude
    const curiousBlink = pulse(t, 0.285, 0.345, 0.41)
    pose.blinkOpenness = 1 - curiousBlink * 0.72 * amplitude
    pose.smile = phase(t, 0.23, 0.4) * (1 - phase(t, 0.76, 0.96)) * 0.42 * amplitude
    pose.mouthOpen = pose.smile * 0.5
    pose.blush = pose.smile * 0.72
    pose.browLeftRotation = -1.8 * curiousHold * amplitude
    pose.browRightRotation = 2.8 * curiousHold * amplitude
    pose.browY = -0.8 * curiousHold * amplitude
  }
  return pose
}

function localBoneMatrix(pose: BonePose): DOMMatrix {
  const matrix = new DOMMatrix()
  matrix.translateSelf(pose.pivotX, pose.pivotY)
  matrix.translateSelf(pose.x ?? 0, pose.y ?? 0)
  matrix.rotateSelf(pose.rotation ?? 0)
  matrix.scaleSelf(pose.scaleX ?? 1, pose.scaleY ?? 1)
  matrix.translateSelf(-pose.pivotX, -pose.pivotY)
  return matrix
}

function solveBones(poses: readonly BonePose[]): Map<SeeThroughBoneId, DOMMatrix> {
  const byId = new Map(poses.map(pose => [pose.id, pose]))
  const solved = new Map<SeeThroughBoneId, DOMMatrix>()
  const solve = (id: SeeThroughBoneId, visiting = new Set<SeeThroughBoneId>()): DOMMatrix => {
    const existing = solved.get(id)
    if (existing) return existing
    const pose = byId.get(id)
    if (!pose || visiting.has(id)) return new DOMMatrix()
    visiting.add(id)
    const parent = pose.parent ? solve(pose.parent, visiting) : new DOMMatrix()
    const result = parent.multiply(localBoneMatrix(pose))
    solved.set(id, result)
    return result
  }
  for (const pose of poses) solve(pose.id)
  return solved
}

function applyMatrix(context: CanvasRenderingContext2D, matrix: DOMMatrix): void {
  context.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
}

function drawPart(context: CanvasRenderingContext2D, part: LoadedPart, matrix: DOMMatrix): void {
  context.save()
  applyMatrix(context, matrix)
  context.drawImage(part.image, part.x, part.y, part.width, part.height)
  context.restore()
}

interface HeadPitchSurface {
  centerX: number
  rotationY: number
  pitchDegrees: number
  cameraDistance: number
  radiusX: number
  radiusY: number
  depthCenterY: number
  baseDepth: number
  bulgeDepth: number
  influenceStartY: number
  correctiveDrop: number
}

const facePitchSurface: HeadPitchSurface = {
  centerX: 631.5,
  rotationY: 315,
  pitchDegrees: 15,
  cameraDistance: 920,
  radiusX: 165,
  radiusY: 215,
  depthCenterY: 360,
  baseDepth: 5,
  bulgeDepth: 17,
  influenceStartY: 218,
  correctiveDrop: 3.4,
}

const frontHairPitchSurface: HeadPitchSurface = {
  centerX: 623,
  rotationY: 250,
  pitchDegrees: 12,
  cameraDistance: 980,
  radiusX: 205,
  radiusY: 245,
  depthCenterY: 330,
  baseDepth: 7,
  bulgeDepth: 13,
  influenceStartY: 145,
  correctiveDrop: 2.2,
}

/**
 * Projects one authored 2.5D surface around a horizontal pitch axis. Depth is
 * estimated from an elliptical face/hair volume, then perspective projection
 * naturally foreshortens the lower plane and narrows regions that rotate away
 * from the camera. This is intentionally not a screen-space vertical warp.
 */
function projectHeadPitchSurface(x: number, y: number, pitch: number, surface: HeadPitchSurface): MeshPoint {
  const amount = Math.max(-1, Math.min(1, pitch))
  if (Math.abs(amount) < 0.00001) return { x: 0, y: 0 }

  const theta = amount * surface.pitchDegrees * Math.PI / 180
  const localX = x - surface.centerX
  const localY = y - surface.rotationY
  const radialX = localX / surface.radiusX
  const radialY = (y - surface.depthCenterY) / surface.radiusY
  const radial = clamp01(1 - Math.sqrt(radialX * radialX + radialY * radialY))
  // The chin and long side locks sit closer to the skull than the cheeks and
  // bangs. Reducing their depth prevents them from being pushed down like a
  // rubber sheet while the perspective term still shortens the silhouette.
  const lowerDepthFalloff = 1 - smoothstep(420, 520, y) * 0.5
  const depth = (surface.baseDepth + surface.bulgeDepth * radial * radial) * lowerDepthFalloff
  const rotatedY = localY * Math.cos(theta) + depth * Math.sin(theta)
  const rotatedDepth = depth * Math.cos(theta) - localY * Math.sin(theta)
  const perspective = surface.cameraDistance / (surface.cameraDistance - rotatedDepth)
  const projectedX = surface.centerX + localX * perspective
  const projectedY = surface.rotationY + rotatedY * perspective
  const influence = smoothstep(surface.influenceStartY, surface.rotationY + 45, y)
  const authoredDrop = surface.correctiveDrop * influence * amount

  return {
    x: (projectedX - x) * influence,
    y: (projectedY - y) * influence + authoredDrop,
  }
}

/**
 * Downward head-pitch keyform for the face plane. The rigid skull preserves
 * its 1:1 scale; the face itself rotates in depth, so the eyes settle slightly
 * lower while the chin foreshortens upward and the jaw narrows in perspective.
 */
export function sampleHeadPitchDeformation(x: number, y: number, pitch: number): MeshPoint {
  return projectHeadPitchSurface(x, y, pitch, facePitchSurface)
}

function sampleFrontHairPitchDeformation(x: number, y: number, pitch: number, bend: number): MeshPoint {
  const verticalProgress = clamp01((y - 140) / 500)
  const bangFocus = Math.exp(-Math.pow((x - 623) / 142, 2))
  const bangBand = smoothstep(150, 315, y) * (1 - smoothstep(455, 625, y))
  const sideLock = smoothstep(330, 620, y)
  const projected = projectHeadPitchSurface(x, y, pitch, frontHairPitchSurface)
  // Bangs occupy a shallower depth layer than the face. Side locks remain
  // mostly attached to the rigid skull and receive only a restrained pitch
  // response, while the spring bend continues to supply delayed follow-through.
  const pitchWeight = Math.max(bangBand * 0.82, sideLock * 0.22)
  return {
    x: bend * verticalProgress * verticalProgress + projected.x * pitchWeight,
    y: projected.y * pitchWeight + (1.1 + 1.5 * bangFocus) * bangBand * pitch + 0.7 * sideLock * pitch,
  }
}

function drawDeformedPart(
  context: CanvasRenderingContext2D,
  part: LoadedPart,
  matrix: DOMMatrix,
  deformAt: MeshDeformer,
  columns: number,
  rows: number,
): void {
  const vertices: Array<{ source: MeshPoint; target: MeshPoint }> = []
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      const x = part.x + part.width * u
      const y = part.y + part.height * v
      const deformation = deformAt(x, y)
      const target = matrix.transformPoint(new DOMPoint(x + deformation.x, y + deformation.y))
      vertices.push({
        source: { x: part.image.naturalWidth * u, y: part.image.naturalHeight * v },
        target: { x: target.x, y: target.y },
      })
    }
  }
  const vertex = (column: number, row: number) => vertices[row * (columns + 1) + column]
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = vertex(column, row)
      const b = vertex(column + 1, row)
      const c = vertex(column, row + 1)
      const d = vertex(column + 1, row + 1)
      drawTexturedTriangle(context, part.image, a.source, b.source, c.source, a.target, b.target, c.target)
      drawTexturedTriangle(context, part.image, b.source, d.source, c.source, b.target, d.target, c.target)
    }
  }
}

function drawPartClippedToDesignRect(
  context: CanvasRenderingContext2D,
  part: LoadedPart,
  matrix: DOMMatrix,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.save()
  applyMatrix(context, matrix)
  context.beginPath()
  context.rect(x, y, width, height)
  context.clip()
  context.drawImage(part.image, part.x, part.y, part.width, part.height)
  context.restore()
}

function drawNeckVisiblePatch(context: CanvasRenderingContext2D, part: LoadedPart, matrix: DOMMatrix): void {
  context.save()
  applyMatrix(context, matrix)
  // Keep the visible skin broad enough to read as a neck, then taper it into
  // the neckline. The collar is redrawn above this patch, so any excess at the
  // sides is occluded by the actual collar alpha instead of covering its trim.
  context.beginPath()
  context.moveTo(597, 486)
  context.lineTo(659, 486)
  context.lineTo(650, 538)
  context.quadraticCurveTo(628, 545, 606, 538)
  context.closePath()
  context.clip()
  context.drawImage(part.image, part.x, part.y, part.width, part.height)
  context.restore()
}

function drawCollarSideRuffles(context: CanvasRenderingContext2D, part: LoadedPart, matrix: DOMMatrix): void {
  // The side ruffles belong to the front collar, but the full collar asset is
  // drawn before the face and bangs so its centre cannot cover the neck window.
  // Restore only the two measured white side strips after the front hair. This
  // gives the ruffles the intended sandwich position: over hair, under sleeves.
  drawPartClippedToDesignRect(context, part, matrix, 520, 520, 50, 104)
  drawPartClippedToDesignRect(context, part, matrix, 688, 520, 50, 104)
}

function drawPartScaledAtPivot(
  context: CanvasRenderingContext2D,
  part: LoadedPart,
  matrix: DOMMatrix,
  pivotX: number,
  pivotY: number,
  scaleX: number,
  rotation = 0,
  mirrorAxis?: number,
  sourcePivotX = pivotX,
  sourcePivotY = pivotY,
): void {
  if (Math.abs(scaleX) <= 0.001) return
  context.save()
  applyMatrix(context, matrix)
  context.translate(pivotX, pivotY)
  context.rotate(rotation * Math.PI / 180)
  if (mirrorAxis !== undefined) {
    context.rotate(mirrorAxis * Math.PI / 180)
    context.scale(1, -1)
    context.rotate(-mirrorAxis * Math.PI / 180)
  }
  context.scale(scaleX, 1)
  context.translate(-sourcePivotX, -sourcePivotY)
  context.drawImage(part.image, part.x, part.y, part.width, part.height)
  context.restore()
}

function drawPartRotatedAtPivot(
  context: CanvasRenderingContext2D,
  part: LoadedPart,
  matrix: DOMMatrix,
  pivotX: number,
  pivotY: number,
  rotation: number,
): void {
  context.save()
  applyMatrix(context, matrix)
  context.translate(pivotX, pivotY)
  context.rotate(rotation * Math.PI / 180)
  context.translate(-pivotX, -pivotY)
  context.drawImage(part.image, part.x, part.y, part.width, part.height)
  context.restore()
}

function sampleSkirtMeshDeformation(x: number, y: number, part: LoadedPart, bend: number): { x: number; y: number } {
  const u = clamp01((x - part.x) / Math.max(1, part.width))
  const v = clamp01((y - part.y) / Math.max(1, part.height))
  const rootFree = smoothstep(0.08, 0.3, v)
  const hemFree = 0.72 + smoothstep(0.52, 1, v) * 0.28
  const free = rootFree * hemFree
  const panelWave = Math.sin((u - 0.5) * Math.PI * 4 + bend * 0.035)
  const edgeGain = 0.78 + Math.abs(u - 0.5) * 0.42
  return {
    x: bend * free * edgeGain * (0.9 + panelWave * 0.13),
    y: -Math.abs(bend) * free * (0.045 + Math.abs(panelWave) * 0.035),
  }
}

function sampleLegMeshDeformation(x: number, y: number, part: LoadedPart, bend: number, side: number): { x: number; y: number } {
  const v = clamp01((y - part.y) / Math.max(1, part.height))
  const knee = Math.sin(clamp01((v - 0.1) / 0.8) * Math.PI)
  const rootPin = smoothstep(0.08, 0.25, v)
  const anklePin = 1 - smoothstep(0.76, 0.95, v)
  const soft = knee * rootPin * anklePin
  return {
    x: bend * side * soft * (0.72 + knee * 0.28),
    y: -Math.abs(bend) * soft * 0.055,
  }
}

function drawBentPart(context: CanvasRenderingContext2D, part: LoadedPart, matrix: DOMMatrix, bend: number, slices = 18, reverse = false): void {
  context.save()
  applyMatrix(context, matrix)
  const sourceSlice = part.image.naturalHeight / slices
  const destinationSlice = part.height / slices
  for (let row = 0; row < slices; row += 1) {
    const progress = row / Math.max(1, slices - 1)
    const influence = reverse ? 1 - progress : progress
    const offsetX = bend * influence * influence
    context.drawImage(
      part.image,
      0,
      Math.max(0, row * sourceSlice - 1),
      part.image.naturalWidth,
      Math.min(part.image.naturalHeight - row * sourceSlice + 1, sourceSlice + 2),
      part.x + offsetX,
      part.y + row * destinationSlice - 1,
      part.width,
      destinationSlice + 2,
    )
  }
  context.restore()
}

function weightedPoint(bones: ReadonlyMap<SeeThroughBoneId, DOMMatrix>, x: number, y: number, weights: VertexWeights): MeshPoint {
  let total = 0
  let resultX = 0
  let resultY = 0
  for (const [id, rawWeight] of weights) {
    const weight = Math.max(0, rawWeight)
    if (weight <= 0) continue
    const point = (bones.get(id) ?? new DOMMatrix()).transformPoint(new DOMPoint(x, y))
    resultX += point.x * weight
    resultY += point.y * weight
    total += weight
  }
  return total > 0 ? { x: resultX / total, y: resultY / total } : { x, y }
}

function wrapRadians(value: number): number {
  let angle = value
  while (angle > Math.PI) angle -= Math.PI * 2
  while (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

function weightedRigidPoint(bones: ReadonlyMap<SeeThroughBoneId, DOMMatrix>, x: number, y: number, weights: VertexWeights): MeshPoint {
  const active = weights
    .map(([id, rawWeight]) => ({ matrix: bones.get(id) ?? new DOMMatrix(), weight: Math.max(0, rawWeight) }))
    .filter(item => item.weight > 0)
  if (active.length === 0) return { x, y }

  const total = active.reduce((sum, item) => sum + item.weight, 0)
  const referenceAngle = Math.atan2(active[0].matrix.b, active[0].matrix.a)
  let angleOffset = 0
  let scaleX = 0
  let scaleY = 0
  let translateX = 0
  let translateY = 0
  for (const { matrix, weight } of active) {
    const normalizedWeight = weight / total
    const angle = Math.atan2(matrix.b, matrix.a)
    angleOffset += wrapRadians(angle - referenceAngle) * normalizedWeight
    scaleX += Math.hypot(matrix.a, matrix.b) * normalizedWeight
    scaleY += Math.hypot(matrix.c, matrix.d) * normalizedWeight
    translateX += matrix.e * normalizedWeight
    translateY += matrix.f * normalizedWeight
  }
  const angle = referenceAngle + angleOffset
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return {
    x: cosine * scaleX * x - sine * scaleY * y + translateX,
    y: sine * scaleX * x + cosine * scaleY * y + translateY,
  }
}

function drawTexturedTriangle(context: CanvasRenderingContext2D, image: HTMLImageElement, sourceA: MeshPoint, sourceB: MeshPoint, sourceC: MeshPoint, targetA: MeshPoint, targetB: MeshPoint, targetC: MeshPoint): void {
  const denominator = sourceA.x * (sourceB.y - sourceC.y) + sourceB.x * (sourceC.y - sourceA.y) + sourceC.x * (sourceA.y - sourceB.y)
  if (Math.abs(denominator) < 0.00001) return
  const a = (targetA.x * (sourceB.y - sourceC.y) + targetB.x * (sourceC.y - sourceA.y) + targetC.x * (sourceA.y - sourceB.y)) / denominator
  const b = (targetA.y * (sourceB.y - sourceC.y) + targetB.y * (sourceC.y - sourceA.y) + targetC.y * (sourceA.y - sourceB.y)) / denominator
  const c = (targetA.x * (sourceC.x - sourceB.x) + targetB.x * (sourceA.x - sourceC.x) + targetC.x * (sourceB.x - sourceA.x)) / denominator
  const d = (targetA.y * (sourceC.x - sourceB.x) + targetB.y * (sourceA.x - sourceC.x) + targetC.y * (sourceB.x - sourceA.x)) / denominator
  const e = (targetA.x * (sourceB.x * sourceC.y - sourceC.x * sourceB.y) + targetB.x * (sourceC.x * sourceA.y - sourceA.x * sourceC.y) + targetC.x * (sourceA.x * sourceB.y - sourceB.x * sourceA.y)) / denominator
  const f = (targetA.y * (sourceB.x * sourceC.y - sourceC.x * sourceB.y) + targetB.y * (sourceC.x * sourceA.y - sourceA.x * sourceC.y) + targetC.y * (sourceA.x * sourceB.y - sourceB.x * sourceA.y)) / denominator
  const centerX = (targetA.x + targetB.x + targetC.x) / 3
  const centerY = (targetA.y + targetB.y + targetC.y) / 3
  const expand = (point: MeshPoint): MeshPoint => {
    const offsetX = point.x - centerX
    const offsetY = point.y - centerY
    const length = Math.max(0.001, Math.hypot(offsetX, offsetY))
    const overlap = 1.35
    return { x: point.x + offsetX / length * overlap, y: point.y + offsetY / length * overlap }
  }
  const clipA = expand(targetA)
  const clipB = expand(targetB)
  const clipC = expand(targetC)
  context.save()
  context.beginPath()
  context.moveTo(clipA.x, clipA.y)
  context.lineTo(clipB.x, clipB.y)
  context.lineTo(clipC.x, clipC.y)
  context.closePath()
  context.clip()
  context.transform(a, b, c, d, e, f)
  context.drawImage(image, 0, 0)
  context.restore()
}

function drawSkinnedPart(
  context: CanvasRenderingContext2D,
  part: LoadedPart,
  bones: ReadonlyMap<SeeThroughBoneId, DOMMatrix>,
  weightsAt: (x: number, y: number) => VertexWeights,
  columns: number,
  rows: number,
  firstRow = 0,
  lastRow = rows,
  deformAt?: MeshDeformer,
  preserveRigidity = false,
): void {
  const vertices: Array<{ source: MeshPoint; target: MeshPoint }> = []
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      const x = part.x + part.width * u
      const y = part.y + part.height * v
      const deformation = deformAt?.(x, y) ?? { x: 0, y: 0 }
      const pointAt = preserveRigidity ? weightedRigidPoint : weightedPoint
      vertices.push({
        source: { x: part.image.naturalWidth * u, y: part.image.naturalHeight * v },
        target: pointAt(bones, x + deformation.x, y + deformation.y, weightsAt(x, y)),
      })
    }
  }
  const vertex = (column: number, row: number) => vertices[row * (columns + 1) + column]
  for (let row = Math.max(0, firstRow); row < Math.min(rows, lastRow); row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = vertex(column, row)
      const b = vertex(column + 1, row)
      const c = vertex(column, row + 1)
      const d = vertex(column + 1, row + 1)
      drawTexturedTriangle(context, part.image, a.source, b.source, c.source, a.target, b.target, c.target)
      drawTexturedTriangle(context, part.image, b.source, d.source, c.source, b.target, d.target, c.target)
    }
  }
}

const armLeftAxisX = -124 / Math.hypot(-124, 227)
const armLeftAxisY = 227 / Math.hypot(-124, 227)
const armLeftNormalX = -armLeftAxisY
const armLeftNormalY = armLeftAxisX
const armRightAxisX = 124 / Math.hypot(124, 227)
const armRightAxisY = 227 / Math.hypot(124, 227)
const armRightNormalX = -armRightAxisY
const armRightNormalY = armRightAxisX

function armLeftCoordinates(x: number, y: number): { along: number; across: number } {
  const offsetX = x - 550
  const offsetY = y - 548
  return {
    along: offsetX * armLeftAxisX + offsetY * armLeftAxisY,
    across: offsetX * armLeftNormalX + offsetY * armLeftNormalY,
  }
}

function armRightCoordinates(x: number, y: number): { along: number; across: number } {
  const offsetX = x - 706
  const offsetY = y - 548
  return {
    along: offsetX * armRightAxisX + offsetY * armRightAxisY,
    across: offsetX * armRightNormalX + offsetY * armRightNormalY,
  }
}

function createArmLeftCorrectiveDeformer(pose: GesturePose): MeshDeformer {
  return (x, y) => {
    const { along, across } = armLeftCoordinates(x, y)
    // The committed elbow pivot lies at along≈150. A bell-shaped correction
    // centred on that real joint rounds the bend without creating a flat band.
    const elbowProgress = clamp01((along - 130) / 42)
    const elbowBand = Math.sin(elbowProgress * Math.PI) * pose.elbowMorph
    // Fade continuously through the sleeve centre. The previous sign-only
    // expansion jumped at across=0 and made the texture look pinched or pasted.
    const elbowExpansion = Math.tanh(across / 14) * elbowBand * 7.25
    const shoulderBand = (1 - smoothstep(0, 105, along)) * pose.shoulderShrug
    return {
      x: armLeftNormalX * elbowExpansion + shoulderBand * 3.2,
      y: armLeftNormalY * elbowExpansion - shoulderBand * 4.8,
    }
  }
}

function createArmRightCorrectiveDeformer(pose: GesturePose): MeshDeformer {
  return (x, y) => {
    const { along, across } = armRightCoordinates(x, y)
    const elbowProgress = clamp01((along - 130) / 42)
    const elbowBand = Math.sin(elbowProgress * Math.PI) * pose.elbowMorph
    const elbowExpansion = Math.tanh(across / 14) * elbowBand * 7.25
    const shoulderBand = (1 - smoothstep(0, 105, along)) * pose.shoulderShrug
    return {
      x: armRightNormalX * elbowExpansion - shoulderBand * 3.2,
      y: armRightNormalY * elbowExpansion - shoulderBand * 4.8,
    }
  }
}

function armLeftWeights(x: number, y: number): VertexWeights {
  // Weight along the diagonal arm axis, not by horizontal image rows. This
  // makes every cross-section switch bones together and prevents the sleeve
  // from being cut into skewed wedges at large elbow angles.
  const { along } = armLeftCoordinates(x, y)
  // Match the blend to the committed forearm pivot instead of the superseded
  // pre-calibration elbow. Every cross-section changes bones together.
  // Begin the blend slightly before the pivot so the visual forearm keeps
  // most of its authored length. It remains about 8px shorter than the
  // original bind pose, instead of the excessive ~14px shortening in V22.
  const upperToForearm = smoothstep(132, 152, along)
  const limbWeights: VertexWeights = [
    ['armLeftUpper', 1 - upperToForearm],
    ['armLeftForearm', upperToForearm],
  ]
  const rootInfluence = 1 - smoothstep(14, 102, along)
  const innerShoulder = smoothstep(470, 555, x)
  const chestPin = rootInfluence * innerShoulder * 0.94
  return [['chest', chestPin], ...limbWeights.map(([id, weight]) => [id, weight * (1 - chestPin)] as const)]
}

function torsoGarmentWeights(_x: number, y: number): VertexWeights {
  const pelvisWeight = smoothstep(665, 735, y)
  return [['chest', 1 - pelvisWeight], ['pelvis', pelvisWeight]]
}

function armRightWeights(x: number, y: number): VertexWeights {
  const { along } = armRightCoordinates(x, y)
  const upperToForearm = smoothstep(132, 152, along)
  const limbWeights: VertexWeights = [
    ['armRightUpper', 1 - upperToForearm],
    ['armRightForearm', upperToForearm],
  ]
  const rootInfluence = 1 - smoothstep(14, 102, along)
  const innerShoulder = 1 - smoothstep(701, 786, x)
  const chestPin = rootInfluence * innerShoulder * 0.94
  return [['chest', chestPin], ...limbWeights.map(([id, weight]) => [id, weight * (1 - chestPin)] as const)]
}

function legLeftWeights(_x: number, y: number): VertexWeights {
  const lowerWeight = smoothstep(1014, 1054, y)
  return [['legLeft', 1 - lowerWeight], ['legLeftLower', lowerWeight]]
}

function legRightWeights(_x: number, y: number): VertexWeights {
  const lowerWeight = smoothstep(1014, 1054, y)
  return [['legRight', 1 - lowerWeight], ['legRightLower', lowerWeight]]
}

function drawEye(context: CanvasRenderingContext2D, white: LoadedPart, iris: LoadedPart, lash: LoadedPart, matrix: DOMMatrix, centerX: number, centerY: number, openness: number, gazeX: number, gazeY: number): void {
  context.save()
  applyMatrix(context, matrix)
  context.translate(centerX, centerY)
  context.scale(1, Math.max(0.035, openness))
  context.translate(-centerX, -centerY)
  context.drawImage(white.image, white.x, white.y, white.width, white.height)
  // Vertical iris travel needs a little more range than horizontal pointer
  // follow. Otherwise a large chibi eye still reads as staring straight ahead
  // during a downward nod even when the parameter has already reached 0.8.
  if (openness > 0.1) context.drawImage(iris.image, iris.x + gazeX * 6, iris.y + gazeY * 5.2, iris.width, iris.height)
  context.drawImage(lash.image, lash.x, lash.y, lash.width, lash.height)
  context.restore()
}

function transformedPoint(matrix: DOMMatrix, x: number, y: number): DOMPoint {
  return matrix.transformPoint(new DOMPoint(x, y))
}

export async function createSeeThroughIdleRig(canvas: HTMLCanvasElement, options: SeeThroughIdleRigOptions): Promise<SeeThroughIdleRigController> {
  const parts = await loadParts(options.assetBaseUrl)
  const outputSize = options.outputSize ?? 760
  canvas.width = outputSize
  canvas.height = outputSize
  const context = canvas.getContext('2d')!
  let pointerX = 0
  let pointerY = 0
  let externalMotionX = 0
  let externalMotionY = 0
  let grabPointX = 0.5
  let grabPointY = 0.18
  let grabbed = false
  let expression: SeeThroughExpression = 'neutral'
  let expressionFrom = expressionStyles.neutral
  let expressionTo = expressionStyles.neutral
  let expressionChangedAt = performance.now()
  let gesture: SeeThroughGesture = 'none'
  let gestureElapsed = 0
  let gestureSpeed = 1
  let breathing = true
  let blinking = true
  let secondaryMotion = true
  let reducedMotion = options.reducedMotion ?? false
  let debug = false
  let disposed = false
  let frame = 0
  let previousTime = performance.now()
  let performanceWindowStarted = previousTime
  let performanceFrameCount = 0
  let performanceRenderTime = 0
  let nextBlinkAt = previousTime + 1700
  let blinkStartedAt = Number.NEGATIVE_INFINITY
  let blink = 1
  const manualRotations = new Map<SeeThroughBoneId, number>()
  const manualPivotOffsets = new Map<SeeThroughBoneId, BonePivotOffset>()
  let layerOrder: SeeThroughLayerId[] = [...defaultSeeThroughLayerOrder]
  const layerVisibility = new Map<SeeThroughLayerId, boolean>(defaultSeeThroughLayerOrder.map(id => [id, true]))
  const gazeSpringX = new SpringValue({ stiffness: 90, damping: 18, maxOffset: 1 })
  const gazeSpringY = new SpringValue({ stiffness: 90, damping: 18, maxOffset: 1 })
  const backHairLeftSpring = new SpringValue({ stiffness: 36, damping: 8.4, maxOffset: 12 })
  const backHairRightSpring = new SpringValue({ stiffness: 39, damping: 8.8, maxOffset: 12 })
  const frontHairLeftSpring = new SpringValue({ stiffness: 56, damping: 10, maxOffset: 7 })
  const frontHairRightSpring = new SpringValue({ stiffness: 60, damping: 10.4, maxOffset: 7 })
  const ahogeRootSpring = new SpringValue({ stiffness: 48, damping: 8.4, maxOffset: 14 })
  const ahogeTipSpring = new SpringValue({ stiffness: 38, damping: 7.7, maxOffset: 18 })
  const tailRootSpring = new SpringValue({ stiffness: 38, damping: 8.2, maxOffset: 8 })
  const tail1Spring = new SpringValue({ stiffness: 34, damping: 7.6, maxOffset: 9 })
  const tail2Spring = new SpringValue({ stiffness: 30, damping: 7, maxOffset: 11 })
  const tailTipSpring = new SpringValue({ stiffness: 27, damping: 6.5, maxOffset: 13 })
  const skirtSwaySpring = new SpringValue({ stiffness: 52, damping: 10.2, maxOffset: 9 })
  const armLeftUpperFollowSpring = new SpringValue({ stiffness: 52, damping: 10.4, maxOffset: 6 })
  const armLeftForearmFollowSpring = new SpringValue({ stiffness: 16, damping: 5.6, maxOffset: 13 })
  const armRightUpperFollowSpring = new SpringValue({ stiffness: 55, damping: 10.8, maxOffset: 6 })
  const armRightForearmFollowSpring = new SpringValue({ stiffness: 17, damping: 5.8, maxOffset: 13 })
  const legLeftUpperFollowSpring = new SpringValue({ stiffness: 44, damping: 9.4, maxOffset: 5.5 })
  const legLeftLowerFollowSpring = new SpringValue({ stiffness: 15, damping: 5.4, maxOffset: 10 })
  const legRightUpperFollowSpring = new SpringValue({ stiffness: 36, damping: 8.2, maxOffset: 5 })
  const legRightLowerFollowSpring = new SpringValue({ stiffness: 21, damping: 6.5, maxOffset: 9 })
  // Grab motion is deliberately a separate input from the gaze pointer.  The
  // body receives the first, smaller response and the existing hair/tail
  // springs receive the same input later, creating a stable root-to-tip lag.
  const externalMotionXSpring = new SpringValue({ stiffness: 72, damping: 16, maxOffset: 1 })
  const externalMotionYSpring = new SpringValue({ stiffness: 72, damping: 16, maxOffset: 1 })
  const grabBodySwaySpring = new SpringValue({ stiffness: 34, damping: 8.2, maxOffset: 12 })
  const grabBodyLiftSpring = new SpringValue({ stiffness: 30, damping: 8.5, maxOffset: 5 })

  const manual = (id: SeeThroughBoneId): number => manualRotations.get(id) ?? 0
  const scheduleBlink = (now: number): void => { nextBlinkAt = now + 2300 + (Math.sin(now * 0.00131) * 0.5 + 0.5) * 1900 }
  const expressionStyleAt = (now: number): ExpressionStyle => interpolateExpression(expressionFrom, expressionTo, (now - expressionChangedAt) / 250)

  const render = (now: number): void => {
    const delta = Math.min(50, Math.max(0, now - previousTime))
    previousTime = now
    const grabInputX = externalMotionXSpring.step(secondaryMotion && !reducedMotion ? externalMotionX : 0, delta)
    const grabInputY = externalMotionYSpring.step(secondaryMotion && !reducedMotion ? externalMotionY : 0, delta)
    // A leftward grab makes the body lean a little to the right (the delayed
    // side), while vertical grab input only gives a restrained lift/drop.
    const heldGrabSway = grabbed ? (grabPointX - 0.5) * 2.8 : 0
    const heldGrabLift = grabbed ? (grabPointY - 0.5) * 0.8 : 0
    const directGrabX = secondaryMotion && !reducedMotion ? externalMotionX : 0
    const directGrabY = secondaryMotion && !reducedMotion ? externalMotionY : 0
    const grabBodySway = grabBodySwaySpring.step(-grabInputX * 15 + directGrabX * 7 + heldGrabSway, delta)
    const grabBodyLift = grabBodyLiftSpring.step(-grabInputY * 6 + directGrabY * 3 + heldGrabLift, delta)
    const grabSecondaryScale = secondaryMotion && !reducedMotion ? 1 : 0
    const armLeftInput = (-grabBodySway * 0.48 - directGrabX * 3.1 + directGrabY * 0.34) * grabSecondaryScale
    const armRightInput = (-grabBodySway * 0.39 - directGrabX * 2.35 - directGrabY * 0.22) * grabSecondaryScale
    const armLeftUpperFollow = armLeftUpperFollowSpring.step(armLeftInput * 0.92, delta)
    const armRightUpperFollow = armRightUpperFollowSpring.step(armRightInput * 0.72, delta)
    // A softer second spring gives the forearm its own delayed local angle at
    // the elbow instead of multiplying the same value used by the upper arm.
    const armLeftForearmFollow = armLeftForearmFollowSpring.step(armLeftInput * 3.05 - armLeftUpperFollow * 0.15, delta)
    const armRightForearmFollow = armRightForearmFollowSpring.step(armRightInput * 2.45 - armRightUpperFollow * 0.22, delta)
    const legLeftInput = (-grabBodySway * 0.3 - directGrabX * 1.55 + directGrabY * 0.28) * grabSecondaryScale
    const legRightInput = (-grabBodySway * 0.23 - directGrabX * 1.12 - directGrabY * 0.18) * grabSecondaryScale
    const legLeftUpperFollow = legLeftUpperFollowSpring.step(legLeftInput * 0.68, delta)
    const legRightUpperFollow = legRightUpperFollowSpring.step(legRightInput * 0.54, delta)
    const legLeftLowerFollow = legLeftLowerFollowSpring.step(legLeftInput * 2.15 - legLeftUpperFollow * 0.18, delta)
    const legRightLowerFollow = legRightLowerFollowSpring.step(legRightInput * 1.72 - legRightUpperFollow * 0.25, delta)
    const gazeX = gazeSpringX.step(reducedMotion ? 0 : pointerX, delta)
    const gazeY = gazeSpringY.step(reducedMotion ? 0 : pointerY, delta)
    if (blinking && !reducedMotion && now >= nextBlinkAt && blinkStartedAt < nextBlinkAt) blinkStartedAt = now
    blink = blinking && !reducedMotion ? blinkOpenness(now - blinkStartedAt) : 1
    if (now - blinkStartedAt >= 150 && blinkStartedAt >= nextBlinkAt) scheduleBlink(now)
    const idle = sampleIdleMotion(now, gazeX, gazeY, breathing && !reducedMotion)
    if (gesture !== 'none') {
      gestureElapsed += delta * gestureSpeed
      if (gestureElapsed >= gestureDurations[gesture]) gesture = 'none'
    }
    const gestureProgress = gesture === 'none' ? 1 : gestureElapsed / gestureDurations[gesture]
    const gesturePose = sampleGesture(gesture, gestureProgress, reducedMotion ? 0.35 : 1)
    const expressionStyle = expressionStyleAt(now)
    const renderedGazeX = clampPointer(gazeX + gesturePose.gazeX)
    const renderedGazeY = clampPointer(gazeY + gesturePose.gazeY)
    const renderedBlink = Math.min(blink, gesturePose.blinkOpenness)
    const totalHeadRotation = idle.headRotationDeg + gesturePose.headRotation
    const secondaryScale = secondaryMotion && !reducedMotion ? 1 : 0
    const nodInertia = Math.max(0, gesturePose.headY)
    const backHairLeft = backHairLeftSpring.step((-totalHeadRotation * 1.15 - nodInertia * 0.11 + grabBodySway * 0.78 + grabInputX * -1.4 + Math.sin(now / 1450) * 1.05) * secondaryScale, delta)
    const backHairRight = backHairRightSpring.step((-totalHeadRotation * 1.05 + nodInertia * 0.11 + grabBodySway * 0.82 + grabInputX * -1.2 - Math.sin(now / 1510) * 0.95) * secondaryScale, delta)
    const frontHairLeft = frontHairLeftSpring.step((-totalHeadRotation * 0.42 - nodInertia * 0.045 + grabBodySway * 0.48 + grabInputX * -0.75 + Math.sin(now / 1730) * 0.38) * secondaryScale, delta)
    const frontHairRight = frontHairRightSpring.step((-totalHeadRotation * 0.38 + nodInertia * 0.045 + grabBodySway * 0.5 + grabInputX * -0.68 - Math.sin(now / 1810) * 0.34) * secondaryScale, delta)
    const ahogeRoot = ahogeRootSpring.step((-backHairLeft * 0.74 + grabBodySway * 0.34 + nodInertia * 0.12 + Math.sin(now / 800) * 1.25) * secondaryScale, delta)
    const ahogeTip = ahogeTipSpring.step((-ahogeRoot * 0.72 + Math.sin(now / 740) * 1.55) * secondaryScale, delta)
    const tailRoot = tailRootSpring.step((Math.sin(now / 980) * 2.3 + grabBodySway * 0.48 - grabInputX * 1.4 - gesturePose.chestRotation * 0.35) * secondaryScale, delta)
    const tail1 = tail1Spring.step((Math.sin(now / 980 - 0.32) * 2.7 - tailRoot * 0.28) * secondaryScale, delta)
    const tail2 = tail2Spring.step((Math.sin(now / 980 - 0.68) * 3.1 - tail1 * 0.22) * secondaryScale, delta)
    const tailTip = tailTipSpring.step((Math.sin(now / 980 - 1.02) * 3.5 - tail2 * 0.18) * secondaryScale, delta)
    const skirtSway = skirtSwaySpring.step((
      gesturePose.skirtSway * 0.82
      - gesturePose.pelvisRotation * 1.6
      - gesturePose.chestRotation * 0.34
      + grabBodySway * 1.08
      - grabInputX * 1.8
      + Math.sin(now / 1380) * 0.45
    ) * secondaryScale, delta)
    const stanceLeft = secondaryMotion && !reducedMotion ? Math.sin(now / 1900 + 0.9) * 0.2 : 0
    const stanceRight = secondaryMotion && !reducedMotion ? Math.sin(now / 2240 + 2.05) * 0.15 : 0
    const breathScale = breathing && !reducedMotion ? 1 + idle.breath * 0.009 : 1

    const poses: BonePose[] = [
      { id: 'root', parent: null, pivotX: 640, pivotY: 1000, y: grabBodyLift * 0.25, rotation: grabBodySway * 0.42 + manual('root') },
      { id: 'pelvis', parent: 'root', pivotX: 640, pivotY: 870, x: gesturePose.pelvisX, y: -idle.breath * 1.4 + gesturePose.pelvisY + grabBodyLift * 0.45, rotation: gesturePose.pelvisRotation + grabBodySway * 0.42 + manual('pelvis') },
      { id: 'waist', parent: 'pelvis', pivotX: 640, pivotY: 750, rotation: gesturePose.waistRotation + grabBodySway * 0.5 + manual('waist') },
      { id: 'chest', parent: 'waist', pivotX: 640, pivotY: 645, scaleX: 1 + (breathScale - 1) * 0.55, scaleY: breathScale, rotation: gesturePose.chestRotation + grabBodySway * 0.72 + manual('chest') },
      { id: 'neck', parent: 'chest', pivotX: 640, pivotY: 525, rotation: manual('neck') },
      { id: 'head', parent: 'neck', pivotX: 640, pivotY: 500, x: idle.headX + gesturePose.headX, y: idle.headY + gesturePose.headY + expressionStyle.headLift + grabBodyLift * 0.22, rotation: totalHeadRotation + grabBodySway * 0.2 + manual('head'), scaleX: gesturePose.headScaleX, scaleY: gesturePose.headScaleY },
      { id: 'armLeftUpper', parent: 'chest', pivotX: 550, pivotY: 548, x: gesturePose.shoulderLeftX, y: gesturePose.shoulderLeftY, rotation: -idle.breath * 0.65 + gesturePose.armLeftUpper + armLeftUpperFollow * 1.15 + manual('armLeftUpper') },
      { id: 'armLeftForearm', parent: 'armLeftUpper', pivotX: committedArmPivots.leftForearm.x, pivotY: committedArmPivots.leftForearm.y, rotation: gesturePose.armLeftForearm + armLeftForearmFollow * 1.65 + manual('armLeftForearm') },
      { id: 'handLeft', parent: 'armLeftForearm', pivotX: 426, pivotY: 775, rotation: gesturePose.handLeft + manual('handLeft') },
      { id: 'armRightUpper', parent: 'chest', pivotX: 706, pivotY: 548, x: gesturePose.shoulderRightX, y: gesturePose.shoulderRightY, rotation: idle.breath * 0.65 + gesturePose.armRightUpper + armRightUpperFollow * 1.08 + manual('armRightUpper') },
      { id: 'armRightForearm', parent: 'armRightUpper', pivotX: committedArmPivots.rightForearm.x, pivotY: committedArmPivots.rightForearm.y, rotation: gesturePose.armRightForearm + armRightForearmFollow * 1.48 + manual('armRightForearm') },
      { id: 'handRight', parent: 'armRightForearm', pivotX: 831, pivotY: 775, rotation: gesturePose.handRight + manual('handRight') },
      { id: 'legLeft', parent: 'pelvis', pivotX: 575, pivotY: 900, rotation: gesturePose.legLeftUpper + stanceLeft + legLeftUpperFollow + manual('legLeft') },
      { id: 'legLeftLower', parent: 'legLeft', pivotX: 570, pivotY: 1038, rotation: legLeftLowerFollow - stanceLeft * 0.18 + manual('legLeftLower') },
      { id: 'legRight', parent: 'pelvis', pivotX: 705, pivotY: 900, rotation: gesturePose.legRightUpper + stanceRight + legRightUpperFollow + manual('legRight') },
      { id: 'legRightLower', parent: 'legRight', pivotX: 704, pivotY: 1038, rotation: legRightLowerFollow - stanceRight * 0.14 + manual('legRightLower') },
      { id: 'hairBackRoot', parent: 'head', pivotX: 640, pivotY: 235, rotation: manual('hairBackRoot') },
      { id: 'hairBackLeft', parent: 'hairBackRoot', pivotX: 475, pivotY: 500, rotation: backHairLeft + manual('hairBackLeft') },
      { id: 'hairBackRight', parent: 'hairBackRoot', pivotX: 805, pivotY: 500, rotation: backHairRight + manual('hairBackRight') },
      { id: 'hairFrontLeft', parent: 'head', pivotX: 535, pivotY: 310, rotation: frontHairLeft + manual('hairFrontLeft') },
      { id: 'hairFrontRight', parent: 'head', pivotX: 745, pivotY: 310, rotation: frontHairRight + manual('hairFrontRight') },
      { id: 'ahogeRoot', parent: 'head', pivotX: 638, pivotY: 151, rotation: ahogeRoot + manual('ahogeRoot') },
      { id: 'ahogeTip', parent: 'ahogeRoot', pivotX: 623, pivotY: 72, rotation: ahogeTip + manual('ahogeTip') },
      { id: 'tailRoot', parent: 'pelvis', pivotX: 805, pivotY: 856, rotation: tailRoot + manual('tailRoot') },
      { id: 'tail1', parent: 'tailRoot', pivotX: 865, pivotY: 892, rotation: tail1 + manual('tail1') },
      { id: 'tail2', parent: 'tail1', pivotX: 935, pivotY: 838, rotation: tail2 + manual('tail2') },
      { id: 'tailTip', parent: 'tail2', pivotX: 980, pivotY: 740, rotation: tailTip + manual('tailTip') },
    ]
    const correctedPoses = poses.map(pose => {
      const offset = manualPivotOffsets.get(pose.id)
      if (!offset) return pose
      return { ...pose, pivotX: pose.pivotX + offset.x, pivotY: pose.pivotY + offset.y }
    })
    const bones = solveBones(correctedPoses)
    const bone = (id: SeeThroughBoneId): DOMMatrix => bones.get(id) ?? new DOMMatrix()
    const armLeftDeformer = createArmLeftCorrectiveDeformer({
      ...gesturePose,
      elbowMorph: Math.max(gesturePose.elbowMorph, clamp01(Math.abs(armLeftForearmFollow) / 3.5)),
    })
    const armRightDeformer = createArmRightCorrectiveDeformer({
      ...gesturePose,
      elbowMorph: Math.max(gesturePose.elbowMorph, clamp01(Math.abs(armRightForearmFollow) / 3.5)),
    })
    const apronDeformer = (x: number, y: number): { x: number; y: number } => sampleSkirtMeshDeformation(x, y, parts.skirt, skirtSway * 0.82)
    const headMatrix = bone('head')
    const headPitchAt = (x: number, y: number): MeshPoint => sampleHeadPitchDeformation(x, y, gesturePose.headPitch)
    const featureMatrixAt = (x: number, y: number): DOMMatrix => {
      const offset = headPitchAt(x, y)
      return headMatrix.translate(offset.x, offset.y)
    }

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, outputSize, outputSize)
    if (options.transparentBackground !== true) {
      const gradient = context.createLinearGradient(0, 0, 0, outputSize)
      gradient.addColorStop(0, '#edf3f5'); gradient.addColorStop(1, '#dce8ec')
      context.fillStyle = gradient; context.fillRect(0, 0, outputSize, outputSize)
    }
    context.save()
    context.scale(outputSize / DESIGN_SIZE, outputSize / DESIGN_SIZE)

    const drawLayers: Record<SeeThroughLayerId, () => void> = {
      tail: () => drawBentPart(context, parts.tail, bone('tailRoot'), (tail1 + tail2 + tailTip) * 1.35, 18, true),
      'hair-back': () => drawBentPart(context, parts['hair-back'], bone('hairBackRoot'), (backHairLeft - backHairRight) * 1.25, 24),
      'whale-fins': () => drawPart(context, parts['whale-fins'], headMatrix),
      ears: () => drawPart(context, parts['human-ears'], headMatrix),
      'lower-body': () => {
        drawSkinnedPart(context, parts['leg-left'], bones, legLeftWeights, 7, 18, 0, 18, (x, y) => sampleLegMeshDeformation(x, y, parts['leg-left'], legLeftLowerFollow * 0.72, -1))
        drawSkinnedPart(context, parts['leg-right'], bones, legRightWeights, 7, 18, 0, 18, (x, y) => sampleLegMeshDeformation(x, y, parts['leg-right'], legRightLowerFollow * 0.68, 1))
        drawDeformedPart(context, parts.skirt, bone('pelvis'), (x, y) => sampleSkirtMeshDeformation(x, y, parts.skirt, skirtSway), 8, 12)
      },
      torso: () => {
        // Structural neck stays behind the torso; the small visible patch is
        // then reopened inside the collar window.
        drawPartClippedToDesignRect(context, parts.neck, bone('neck'), 586, 430, 84, 103)
        drawSkinnedPart(context, parts.torso, bones, torsoGarmentWeights, 8, 18, 0, 18, apronDeformer)
        drawSkinnedPart(context, parts['collar-front'], bones, torsoGarmentWeights, 8, 18, 0, 18, apronDeformer)
        drawNeckVisiblePatch(context, parts.neck, bone('neck'))
        drawPartClippedToDesignRect(context, parts['collar-front'], bone('chest'), 506, 528, 242, 95)
      },
      'arms-back': () => {
        drawSkinnedPart(context, parts['arm-left-sleeve'], bones, armLeftWeights, 12, 32, 0, 22, armLeftDeformer)
        drawSkinnedPart(context, parts['arm-right'], bones, armRightWeights, 10, 28, 0, 12, armRightDeformer)
      },
      shoes: () => {
        // Keep the soles visually grounded while the two lower-leg links
        // catch up independently. A small ankle counter-rotation prevents
        // the shoes from looking glued to a swinging shin, without locking
        // them rigidly to the viewport.
        const leftAnkleTilt = -(legLeftLowerFollow - stanceLeft * 0.18) * 0.34
        const rightAnkleTilt = -(legRightLowerFollow - stanceRight * 0.14) * 0.34
        drawPartRotatedAtPivot(context, parts['shoe-left'], bone('legLeftLower'), 560, 1144, leftAnkleTilt)
        drawPartRotatedAtPivot(context, parts['shoe-right'], bone('legRightLower'), 716, 1144, rightAnkleTilt)
      },
      head: () => {
        drawDeformedPart(context, parts.face, headMatrix, headPitchAt, 8, 10)
        const browLeftMatrix = featureMatrixAt(555, 311).translate(0, gesturePose.browY)
        const browRightMatrix = featureMatrixAt(696, 310).translate(0, gesturePose.browY)
        drawPartRotatedAtPivot(context, parts['brow-left'], browLeftMatrix, 555, 311, gesturePose.browLeftRotation)
        drawPartRotatedAtPivot(context, parts['brow-right'], browRightMatrix, 696, 310, gesturePose.browRightRotation)
        drawEye(context, parts['eye-white-left'], parts['iris-left'], parts['lash-left'], featureMatrixAt(552, 386), 552, 386, renderedBlink, renderedGazeX, renderedGazeY)
        drawEye(context, parts['eye-white-right'], parts['iris-right'], parts['lash-right'], featureMatrixAt(698, 386), 698, 386, renderedBlink, renderedGazeX, renderedGazeY)
        context.save()
        applyMatrix(context, featureMatrixAt(624.5, 440.5))
        const gestureMouthScaleX = 1 + gesturePose.smile * 0.1
        const gestureMouthScaleY = 1 + gesturePose.smile * 0.72
        context.translate(624.5, 440.5)
        context.scale(expressionStyle.mouthScaleX * gestureMouthScaleX, expressionStyle.mouthScaleY * gestureMouthScaleY)
        context.translate(-624.5, -440.5)
        context.globalAlpha = 1 - gesturePose.mouthOpen
        context.drawImage(parts.mouth.image, parts.mouth.x, parts.mouth.y, parts.mouth.width, parts.mouth.height)
        context.globalAlpha = 1
        if (gesturePose.mouthOpen > 0) {
          context.save()
          context.globalAlpha = gesturePose.mouthOpen
          context.translate(624.5, 445)
          context.scale(0.92 + gesturePose.smile * 0.12, 0.82 + gesturePose.mouthOpen * 0.18)
          context.translate(-624.5, -445)
          context.fillStyle = '#532f48'
          context.beginPath()
          context.moveTo(604, 438)
          context.quadraticCurveTo(624, 449, 645, 438)
          context.quadraticCurveTo(640, 466, 624.5, 468)
          context.quadraticCurveTo(609, 466, 604, 438)
          context.fill()
          context.fillStyle = '#ef8fa4'
          context.beginPath()
          context.ellipse(624.5, 458, 11, 5.5, 0, 0, Math.PI * 2)
          context.fill()
          context.restore()
        }
        context.restore()
        if (expressionStyle.blushOpacity > 0.001 || gesturePose.blush > 0) {
          const blushAlpha = Math.max(expressionStyle.blushOpacity, gesturePose.blush)
          context.fillStyle = 'rgba(239,132,140,.16)'
          context.globalAlpha = blushAlpha
          context.save(); applyMatrix(context, featureMatrixAt(501, 451)); context.beginPath(); context.ellipse(501, 451, 25, 9, 0, 0, Math.PI * 2); context.fill(); context.restore()
          context.save(); applyMatrix(context, featureMatrixAt(751, 451)); context.beginPath(); context.ellipse(751, 451, 25, 9, 0, 0, Math.PI * 2); context.fill(); context.restore()
          context.globalAlpha = 1
        }
        drawPart(context, parts['maid-headband'], headMatrix)
        const frontHairBend = (frontHairLeft - frontHairRight) * 0.9
        drawDeformedPart(context, parts['hair-front'], headMatrix, (x, y) => sampleFrontHairPitchDeformation(x, y, gesturePose.headPitch, frontHairBend), 12, 16)
        drawPart(context, parts['side-bow'], headMatrix)
        drawBentPart(context, parts.ahoge, bone('ahogeRoot'), ahogeTip * 0.7, 10, true)
      },
      'collar-ruffles': () => drawCollarSideRuffles(context, parts['collar-front'], bone('chest')),
      hands: () => {
        const palmFlip = Math.cos(gesturePose.wavePalm * Math.PI)
        const clockwiseTurn = 90 * gesturePose.wavePalm
        const edgeOnScale = 0.075
        // The sleeve PNG ends at the cuff; the rest-side PNG's alpha contains
        // only the hand. Attach it to the forearm so this remains a true
        // upper-arm/forearm two-link chain without losing the palm.
        if (gesturePose.wavePalm <= 0.5) drawPart(context, parts['hand-left-rest-side'], bone('armLeftForearm'))
        else drawPartScaledAtPivot(context, parts['hand-left-wave-front'], bone('armLeftForearm'), waveFrontPalmPlacement.targetX, waveFrontPalmPlacement.targetY, Math.max(edgeOnScale, -palmFlip), clockwiseTurn + gesturePose.handLeft + waveFrontPalmPlacement.rotationOffset, waveFrontPalmPlacement.mirrorAxis, waveFrontPalmPlacement.sourceWristX, waveFrontPalmPlacement.sourceWristY)
      },
      'arms-front': () => {
        drawSkinnedPart(context, parts['arm-left-sleeve'], bones, armLeftWeights, 12, 32, 22, 32, armLeftDeformer)
        drawSkinnedPart(context, parts['arm-right'], bones, armRightWeights, 10, 28, 12, 28, armRightDeformer)
      },
    }
    for (const id of layerOrder) {
      if (layerVisibility.get(id) !== false) drawLayers[id]()
    }

    if (debug) {
      context.save()
      context.lineWidth = 3
      context.font = '16px "Microsoft YaHei UI", sans-serif'
      for (const pose of correctedPoses) {
        const matrix = bone(pose.id)
        const point = transformedPoint(matrix, pose.pivotX, pose.pivotY)
        if (pose.parent) {
          const parentPose = correctedPoses.find(item => item.id === pose.parent)!
          const parentPoint = transformedPoint(bone(pose.parent), parentPose.pivotX, parentPose.pivotY)
          context.strokeStyle = 'rgba(14,134,156,.65)'; context.beginPath(); context.moveTo(parentPoint.x, parentPoint.y); context.lineTo(point.x, point.y); context.stroke()
        }
        context.fillStyle = manualRotations.has(pose.id) || manualPivotOffsets.has(pose.id) ? '#ffb84d' : '#16b8c8'
        context.beginPath(); context.arc(point.x, point.y, 6, 0, Math.PI * 2); context.fill()
        context.fillStyle = '#143542'; context.fillText(boneLabels[pose.id], point.x + 9, point.y - 8)
      }
      context.restore()
    }
    context.restore()
  }

  const animate = (now: number): void => {
    if (disposed) return
    const renderActive = canvas.dataset.renderActive !== 'false' && document.visibilityState !== 'hidden'
    if (renderActive) {
      const renderStarted = performance.now()
      render(now)
      performanceRenderTime += performance.now() - renderStarted
      performanceFrameCount += 1
    } else {
      // Do not let a hidden interval become one giant spring step when this
      // rig becomes visible again.
      previousTime = now
    }
    const performanceWindow = now - performanceWindowStarted
    if (performanceWindow >= 1000) {
      canvas.dataset.renderFps = renderActive ? (performanceFrameCount * 1000 / performanceWindow).toFixed(1) : '0.0'
      canvas.dataset.renderCostMs = performanceFrameCount > 0 ? (performanceRenderTime / performanceFrameCount).toFixed(2) : '0.00'
      canvas.dataset.renderRunning = String(renderActive)
      performanceWindowStarted = now
      performanceFrameCount = 0
      performanceRenderTime = 0
    }
    frame = requestAnimationFrame(animate)
  }
  frame = requestAnimationFrame(animate)

  return {
    setPointer(x, y): void { pointerX = clampPointer(x); pointerY = clampPointer(y) },
    setExternalMotion(x, y): void {
      externalMotionX = Math.max(-1, Math.min(1, Number(x) || 0))
      externalMotionY = Math.max(-1, Math.min(1, Number(y) || 0))
    },
    setGrabPoint(x: number, y: number): void {
      grabPointX = clamp01(Number.isFinite(Number(x)) ? Number(x) : 0.5)
      grabPointY = clamp01(Number.isFinite(Number(y)) ? Number(y) : 0.18)
    },
    setGrabbed(value: boolean): void { grabbed = value === true },
    setExpression(value): void {
      if (value === expression) return
      const now = performance.now()
      expressionFrom = expressionStyleAt(now)
      expression = value
      expressionTo = expressionStyles[value]
      expressionChangedAt = now
    },
    playGesture(value): void { gesture = value; gestureElapsed = 0 },
    stopGesture(): void { gesture = 'none'; gestureElapsed = 0 },
    setGestureSpeed(value): void { gestureSpeed = Math.max(0.25, Math.min(2, value)) },
    setBreathing(value): void { breathing = value },
    setBlinking(value): void { blinking = value },
    triggerBlink(): void { blinkStartedAt = performance.now(); nextBlinkAt = blinkStartedAt },
    setSecondaryMotion(value): void { secondaryMotion = value },
    setReducedMotion(value): void { reducedMotion = value },
    setDebug(value): void { debug = value },
    setLayerOrder(order): void {
      const valid = order.filter((id, index) => defaultSeeThroughLayerOrder.includes(id) && order.indexOf(id) === index)
      layerOrder = [...valid, ...defaultSeeThroughLayerOrder.filter(id => !valid.includes(id))]
    },
    setLayerVisible(id, visible): void { layerVisibility.set(id, visible) },
    resetLayerOrder(): void {
      layerOrder = [...defaultSeeThroughLayerOrder]
      for (const id of defaultSeeThroughLayerOrder) layerVisibility.set(id, true)
    },
    setManualBoneRotation(id, degrees): void {
      const value = Math.max(-45, Math.min(45, degrees))
      if (Math.abs(value) < 0.001) manualRotations.delete(id)
      else manualRotations.set(id, value)
    },
    setManualBonePivotOffset(id, x, y): void {
      const offset = { x: Math.max(-80, Math.min(80, x)), y: Math.max(-80, Math.min(80, y)) }
      if (Math.abs(offset.x) < 0.001 && Math.abs(offset.y) < 0.001) manualPivotOffsets.delete(id)
      else manualPivotOffsets.set(id, offset)
    },
    resetManualPose(): void { manualRotations.clear(); manualPivotOffsets.clear() },
    getState: () => ({ expression, gesture, gestureSpeed, blink, gazeX: gazeSpringX.value, gazeY: gazeSpringY.value }),
    dispose(): void { disposed = true; cancelAnimationFrame(frame) },
  }
}

export const seeThroughBoneOptions: ReadonlyArray<{ id: SeeThroughBoneId; label: string }> = Object.entries(boneLabels).map(([id, label]) => ({ id: id as SeeThroughBoneId, label }))
