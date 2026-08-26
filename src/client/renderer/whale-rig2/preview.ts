/**
 * WhaleRig 2.0 phase 1B — Canvas-2D visual preview (zero new dependencies).
 *
 * Two drawing layers:
 *  1. SKELETON (authoritative): bones, joints, face anchor, the locked contact
 *     foot, and a ground line. Every phase-1 hard acceptance is visible here
 *     (loop continuity, foot lock, knee bend direction, face anchor).
 *  2. PARTS (provisional overlay): composites the probe-sheet components onto
 *     their bones via CPU world matrices — one drawImage per part, exactly one
 *     source rect per part, z-ordered single pass (no whole-frame sprites, so
 *     no cross-fade double imaging by construction).
 *
 * All coordinates are authored against RUN_CANVAS_SIZE (112×112) and scaled up
 * for display. The animation controller drives `requestAnimationFrame`.
 */

import { BoneHierarchy } from './bones.ts'
import { matFromTRS, matInvert, matMultiply } from './math.ts'
import type { BoneLocal, BoneWorld, FootContactState, Mat2D, Pose } from './types.ts'
import {
  RUN_BONES,
  RUN_CANVAS_SIZE,
  RUN_CLIP,
  RUN_FACE_ANCHOR,
  RUN_PART_BINDINGS,
  RUN_PART_STAGE_TRANSFORM,
  solveRunFrame,
  type Rig2PartBinding,
} from './run-rig.ts'

export { evaluateRunRigAcceptance, type Rig2AcceptanceMetrics } from './acceptance.ts'
export {
  RUN_BONES,
  RUN_CLIP,
  RUN_CONTACTS,
  RUN_PART_BINDINGS,
  RUN_CANVAS_SIZE,
  RUN_DURATION_MS,
} from './run-rig.ts'

/** Everything needed to draw one frame (pure data; no canvas coupling). */
export interface Rig2FrameState {
  timeMs: number
  pose: Pose
  inContact: boolean
  contactTargetX: number
  contactTargetY: number
  worlds: ReturnType<BoneHierarchy['fk']>
  matrices: Mat2D[]
}

export interface Rig2FrameBuffers {
  pose: Record<string, BoneLocal>
  worlds: BoneWorld[]
  matrices: Mat2D[]
  frame: Rig2FrameState
}

const hierarchy = new BoneHierarchy(RUN_BONES)
const bindPose = solveRunFrame(0, { locked: false, lockedX: 0, lockedY: 0 }).pose
const bindMatrices = hierarchy.worldMatrices(bindPose)
const inverseBindMatrices = bindMatrices.map(matrix => matInvert(
  { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, matrix,
))
const deltaScratch: Mat2D = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
const partScratch: Mat2D = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
const finalScratch: Mat2D = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
const deformScratch: Mat2D = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
const deformedFinalScratch: Mat2D = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
const stagedFinalScratch: Mat2D = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
const [stagePivotX, stagePivotY] = RUN_PART_STAGE_TRANSFORM.pivot
const [stageOffsetX, stageOffsetY] = RUN_PART_STAGE_TRANSFORM.offset
const stageTransform: Mat2D = {
  a: RUN_PART_STAGE_TRANSFORM.scaleX,
  b: 0,
  c: 0,
  d: RUN_PART_STAGE_TRANSFORM.scaleY,
  tx: stagePivotX * (1 - RUN_PART_STAGE_TRANSFORM.scaleX) + stageOffsetX,
  ty: stagePivotY * (1 - RUN_PART_STAGE_TRANSFORM.scaleY) + stageOffsetY,
}

/** Compute the full frame state (pose → FK → contact IK → world matrices). */
export function computeRig2Frame(
  timeMs: number,
  state?: FootContactState,
  buffers?: Rig2FrameBuffers,
): Rig2FrameState {
  const contactState = state ?? { locked: false, lockedX: 0, lockedY: 0 }
  const solution = solveRunFrame(timeMs, contactState, buffers?.pose)
  const worlds = hierarchy.fk(solution.pose, buffers?.worlds)
  const matrices = hierarchy.worldMatrices(solution.pose, buffers?.matrices, worlds)
  const frame = buffers?.frame ?? {
    timeMs,
    pose: solution.pose,
    inContact: solution.inContact,
    contactTargetX: solution.contactTargetX,
    contactTargetY: solution.contactTargetY,
    worlds,
    matrices,
  }
  frame.timeMs = timeMs
  frame.pose = solution.pose
  frame.inContact = solution.inContact
  frame.contactTargetX = solution.contactTargetX
  frame.contactTargetY = solution.contactTargetY
  frame.worlds = worlds
  frame.matrices = matrices
  return frame
}

export interface DrawRig2Options {
  /** Probe sheet image (parts-transparent.png). Omit to skip the parts layer. */
  sheet?: HTMLImageElement | HTMLCanvasElement
  showParts?: boolean
  showSkeleton?: boolean
  /** Display scale relative to the 112×112 authored canvas. */
  scale?: number
  /** Multiplier applied to each part's authored scale. */
  partScale?: number
}

const BONE_COLOR = '#8ab4ff'
const JOINT_COLOR = '#ffd166'
const FACE_COLOR = '#ff5d8f'
const CONTACT_COLOR = '#52e08a'

function setScaledTransform(ctx: CanvasRenderingContext2D, matrix: Mat2D, scale: number): void {
  ctx.setTransform(
    scale * matrix.a,
    scale * matrix.b,
    scale * matrix.c,
    scale * matrix.d,
    scale * matrix.tx,
    scale * matrix.ty,
  )
}

function drawPart(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement | HTMLCanvasElement,
  binding: Rig2PartBinding,
  matrix: Mat2D,
  displayScale: number,
  partScale: number,
  timeMs: number,
): void {
  const [sx, sy, sw, sh] = binding.rect
  const anchorX = binding.anchor[0] * sw
  const anchorY = binding.anchor[1] * sh
  const boneIndex = hierarchy.boneIndex(binding.bone)
  matMultiply(deltaScratch, matrix, inverseBindMatrices[boneIndex]!)
  matFromTRS(
    partScratch,
    binding.bindPosition[0],
    binding.bindPosition[1],
    binding.bindAngle,
    binding.scale * partScale,
    binding.scale * partScale,
  )
  partScratch.tx -= partScratch.a * anchorX + partScratch.c * anchorY
  partScratch.ty -= partScratch.b * anchorX + partScratch.d * anchorY
  matMultiply(finalScratch, deltaScratch, partScratch)
  matMultiply(stagedFinalScratch, stageTransform, finalScratch)
  if (binding.deform === undefined) {
    setScaledTransform(ctx, stagedFinalScratch, displayScale)
    ctx.drawImage(sheet, sx, sy, sw, sh, 0, 0, sw, sh)
    return
  }

  const phase = timeMs / RUN_CLIP.durationMs * Math.PI * 2
  matFromTRS(deformScratch, 0, 0, 0)
  if (binding.deform === 'tail') {
    const rootX = sw * 0.04
    deformScratch.b = 0.035 * Math.sin(phase * 2 + 1.2)
    deformScratch.ty = -deformScratch.b * rootX
    matMultiply(deformedFinalScratch, stagedFinalScratch, deformScratch)
    setScaledTransform(ctx, deformedFinalScratch, displayScale)
    ctx.drawImage(sheet, sx, sy, sw, sh, 0, 0, sw, sh)
    return
  }

  const split = Math.round(sh * (binding.deform === 'skirt' ? 0.43 : 0.28))
  setScaledTransform(ctx, stagedFinalScratch, displayScale)
  ctx.drawImage(sheet, sx, sy, sw, split, 0, 0, sw, split)

  const shear = binding.deform === 'skirt'
    ? 0.055 * Math.sin(phase * 2 + 0.35)
    : 0.028 * Math.sin(phase * 2 - 0.8) + 0.012 * Math.sin(phase - 0.3)
  const stretchY = binding.deform === 'skirt' ? 1 + 0.012 * Math.cos(phase * 2) : 1
  deformScratch.c = shear
  deformScratch.d = stretchY
  deformScratch.tx = -shear * split
  deformScratch.ty = split * (1 - stretchY)
  matMultiply(deformedFinalScratch, stagedFinalScratch, deformScratch)
  setScaledTransform(ctx, deformedFinalScratch, displayScale)
  ctx.drawImage(sheet, sx, sy + split, sw, sh - split, 0, split, sw, sh - split)
}

function drawSkeleton(ctx: CanvasRenderingContext2D, state: Rig2FrameState, scale: number): void {
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.lineWidth = 1.4 / scale
  // Bones
  ctx.strokeStyle = BONE_COLOR
  ctx.lineCap = 'round'
  for (let index = 0; index < RUN_BONES.length; index += 1) {
    const world = state.worlds[index]!
    ctx.beginPath()
    ctx.moveTo(world.x, world.y)
    ctx.lineTo(world.tipX, world.tipY)
    ctx.stroke()
  }
  // Joints
  ctx.fillStyle = JOINT_COLOR
  for (let index = 0; index < RUN_BONES.length; index += 1) {
    const world = state.worlds[index]!
    ctx.beginPath()
    ctx.arc(world.x, world.y, 1.6 / scale, 0, Math.PI * 2)
    ctx.fill()
  }
  // Face anchor (diamond)
  const face = state.worlds[hierarchy.boneIndex(RUN_FACE_ANCHOR)]!
  ctx.fillStyle = FACE_COLOR
  ctx.beginPath()
  ctx.moveTo(face.x, face.y - 3 / scale)
  ctx.lineTo(face.x + 3 / scale, face.y)
  ctx.lineTo(face.x, face.y + 3 / scale)
  ctx.lineTo(face.x - 3 / scale, face.y)
  ctx.closePath()
  ctx.fill()

  // Contact foot: locked target cross + ground line.
  ctx.strokeStyle = CONTACT_COLOR
  ctx.lineWidth = 1.2 / scale
  ctx.beginPath()
  ctx.moveTo(state.contactTargetX - 3 / scale, state.contactTargetY - 3 / scale)
  ctx.lineTo(state.contactTargetX + 3 / scale, state.contactTargetY + 3 / scale)
  ctx.moveTo(state.contactTargetX + 3 / scale, state.contactTargetY - 3 / scale)
  ctx.lineTo(state.contactTargetX - 3 / scale, state.contactTargetY + 3 / scale)
  ctx.stroke()
  ctx.setLineDash([3 / scale, 3 / scale])
  ctx.beginPath()
  ctx.moveTo(0, state.contactTargetY)
  ctx.lineTo(RUN_CANVAS_SIZE[0], state.contactTargetY)
  ctx.stroke()
  ctx.setLineDash([])
}

/** Draw one frame onto a canvas context. */
export function drawRig2Frame(ctx: CanvasRenderingContext2D, state: Rig2FrameState, options: DrawRig2Options = {}): void {
  const scale = options.scale ?? 1
  const partScale = options.partScale ?? 1
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, RUN_CANVAS_SIZE[0] * scale, RUN_CANVAS_SIZE[1] * scale)

  if (options.sheet !== undefined && options.showParts !== false) {
    const sorted = [...RUN_PART_BINDINGS].sort((a, b) => a.z - b.z)
    for (const binding of sorted) {
      const matrix = state.matrices[hierarchy.boneIndex(binding.bone)]!
      drawPart(ctx, options.sheet, binding, matrix, scale, partScale, state.timeMs)
    }
  }
  if (options.showSkeleton !== false) drawSkeleton(ctx, state, scale)
  ctx.restore()
}

export interface Rig2AnimationOptions extends DrawRig2Options {
  fps?: number
}

/** requestAnimationFrame driver for the viewer. */
export function createRig2Animation(
  canvas: HTMLCanvasElement,
  options: Rig2AnimationOptions = {},
): {
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
  setTimeMs: (timeMs: number) => void
  setShowParts: (value: boolean) => void
  setShowSkeleton: (value: boolean) => void
  setPartScale: (value: number) => void
  setSheet: (sheet: HTMLImageElement | undefined) => void
  isPaused: () => boolean
  onFrame: ((state: Rig2FrameState) => void) | undefined
} {
  const ctx = canvas.getContext('2d')!
  const scale = options.scale ?? 3
  const fps = options.fps ?? 60
  canvas.width = RUN_CANVAS_SIZE[0] * scale
  canvas.height = RUN_CANVAS_SIZE[1] * scale

  let running = false
  let paused = false
  let elapsed = 0
  let last = 0
  let lastDraw = -Infinity
  let rafId = 0
  let dirty = true
  let showParts = options.showParts ?? false
  let showSkeleton = options.showSkeleton ?? true
  let partScale = options.partScale ?? 1
  let sheet = options.sheet
  let onFrame: ((state: Rig2FrameState) => void) | undefined
  const state: FootContactState = { locked: false, lockedX: 0, lockedY: 0 }
  const frameBuffers: Rig2FrameBuffers = {
    pose: {},
    worlds: [],
    matrices: [],
    frame: {
      timeMs: 0,
      pose: {},
      inContact: false,
      contactTargetX: 0,
      contactTargetY: 0,
      worlds: [],
      matrices: [],
    },
  }

  const tick = (now: number): void => {
    if (!running) return
    rafId = requestAnimationFrame(tick)
    if (!paused) {
      const delta = Math.min(now - last, 200)
      last = now
      elapsed += delta
    } else {
      last = now
    }
    const frameInterval = 1000 / Math.max(1, fps)
    if (!dirty && now - lastDraw < frameInterval) return
    lastDraw = now
    dirty = false
    const timeMs = ((elapsed % RUN_CLIP.durationMs) + RUN_CLIP.durationMs) % RUN_CLIP.durationMs
    const frame = computeRig2Frame(timeMs, state, frameBuffers)
    drawRig2Frame(ctx, frame, { sheet, showParts, showSkeleton, scale, partScale })
    onFrame?.(frame)
  }

  return {
    start(): void {
      if (running) return
      running = true
      last = performance.now()
      rafId = requestAnimationFrame(tick)
    },
    stop(): void {
      running = false
      cancelAnimationFrame(rafId)
    },
    pause(): void {
      paused = true
      dirty = true
    },
    resume(): void {
      paused = false
      last = performance.now()
      dirty = true
    },
    setTimeMs(timeMs: number): void {
      elapsed = timeMs
      state.locked = false
      state.lastTimeMs = undefined
      state.lastInContact = undefined
      dirty = true
    },
    setShowParts(value: boolean): void {
      showParts = value
      dirty = true
    },
    setShowSkeleton(value: boolean): void {
      showSkeleton = value
      dirty = true
    },
    setPartScale(value: number): void {
      partScale = value
      dirty = true
    },
    setSheet(next: HTMLImageElement | undefined): void {
      sheet = next
      dirty = true
    },
    isPaused(): boolean {
      return paused
    },
    get onFrame(): ((state: Rig2FrameState) => void) | undefined {
      return onFrame
    },
    set onFrame(fn: ((state: Rig2FrameState) => void) | undefined) {
      onFrame = fn
    },
  }
}
