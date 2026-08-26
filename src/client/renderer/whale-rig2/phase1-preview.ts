import { CharacterRuntime, type RuntimeFrame } from './character-runtime.ts'
import { BoneHierarchy } from './bones.ts'
import { PHASE1_BONES, PHASE1_CANVAS, PHASE1_LOCAL_OFFSETS, PHASE1_PARTS, PHASE1_RUN_CLIP } from './phase1-character.ts'
import type { BoneWorld } from './types.ts'

export { PHASE1_BONES, PHASE1_CANVAS, PHASE1_PARTS, PHASE1_RUN_CLIP } from './phase1-character.ts'

const hierarchy = new BoneHierarchy(PHASE1_BONES)

export interface Phase1PreviewOptions {
  assetBaseUrl: string
  scale?: number
}

export interface Phase1PreviewController {
  start(): void
  stop(): void
  pause(): void
  resume(): void
  setShowBones(value: boolean): void
  setShowPivots(value: boolean): void
  setShowMesh(value: boolean): void
  setSpeed(value: number): void
  setDuration(value: number): void
  setBounce(value: number): void
  setTexture(id: string, image: HTMLImageElement): void
  overrideBone(id: string, angle: number | undefined): void
  readonly runtime: CharacterRuntime
  readonly images: ReadonlyMap<string, HTMLImageElement>
  onFrame?: (frame: RuntimeFrame, fps: number) => void
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`whale-rig2: unable to load ${url}`))
    image.src = url
  })
}

function drawBones(ctx: CanvasRenderingContext2D, worlds: readonly BoneWorld[], scale: number): void {
  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.lineWidth = 1.4 / scale
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#78a9ff'
  for (const world of worlds) {
    ctx.beginPath()
    ctx.moveTo(world.x, world.y)
    ctx.lineTo(world.tipX, world.tipY)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffd166'
  for (const world of worlds) {
    ctx.beginPath()
    ctx.arc(world.x, world.y, 2.2 / scale, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** A self-contained Canvas debug player for the first realtime acceptance gate. */
export async function createPhase1Preview(
  canvas: HTMLCanvasElement,
  options: Phase1PreviewOptions,
): Promise<Phase1PreviewController> {
  const imageEntries = await Promise.all(PHASE1_PARTS.map(async part => [
    part.id,
    await loadImage(`${options.assetBaseUrl}/${part.texture}`),
  ] as const))
  const images = new Map(imageEntries)
  const runtime = new CharacterRuntime(
    PHASE1_RUN_CLIP,
    PHASE1_BONES,
    PHASE1_PARTS,
    { rootPosition: [112, 125], localOffsets: PHASE1_LOCAL_OFFSETS, bounceAmount: 1 },
  )
  const scale = options.scale ?? 2.5
  canvas.width = PHASE1_CANVAS.width * scale
  canvas.height = PHASE1_CANVAS.height * scale
  const ctx = canvas.getContext('2d')!
  let running = false
  let paused = false
  let raf = 0
  let last = performance.now()
  let showBones = true
  let showPivots = true
  let showMesh = false
  let frames = 0
  let fps = 0
  let fpsAt = performance.now()
  let onFrame: ((frame: RuntimeFrame, fps: number) => void) | undefined

  const tick = (now: number): void => {
    if (!running) return
    raf = requestAnimationFrame(tick)
    const delta = Math.min(100, now - last)
    last = now
    if (!paused) runtime.update(delta)
    frames += 1
    if (now - fpsAt >= 500) {
      fps = frames * 1000 / (now - fpsAt)
      frames = 0
      fpsAt = now
    }
    const frame = runtime.update(0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.fillStyle = '#121927'
    ctx.fillRect(0, 0, PHASE1_CANVAS.width, PHASE1_CANVAS.height)
    ctx.restore()
    runtime.partRenderer.draw(ctx, frame.parts, images, scale, showPivots)
    if (showBones) drawBones(ctx, frame.worlds, scale)
    if (showMesh) {
      ctx.save()
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.strokeStyle = 'rgba(150,220,255,.45)'
      ctx.strokeRect(4, 4, PHASE1_CANVAS.width - 8, PHASE1_CANVAS.height - 8)
      ctx.restore()
    }
    onFrame?.(frame, fps)
  }

  const controller: Phase1PreviewController = {
    start(): void {
      if (running) return
      running = true
      last = performance.now()
      fpsAt = last
      raf = requestAnimationFrame(tick)
    },
    stop(): void {
      running = false
      cancelAnimationFrame(raf)
    },
    pause(): void { paused = true },
    resume(): void { paused = false; last = performance.now() },
    setShowBones(value: boolean): void { showBones = value },
    setShowPivots(value: boolean): void { showPivots = value },
    setShowMesh(value: boolean): void { showMesh = value },
    setSpeed(value: number): void { runtime.animator.speed = value },
    setDuration(value: number): void { runtime.animator.durationMs = value },
    setBounce(value: number): void { runtime.bounceAmount = value },
    setTexture(id: string, image: HTMLImageElement): void {
      if (!images.has(id)) throw new Error(`whale-rig2: unknown texture part "${id}"`)
      images.set(id, image)
    },
    overrideBone(id: string, angle: number | undefined): void {
      runtime.setBoneOverride(id, angle === undefined ? undefined : { angle })
    },
    runtime,
    images,
    get onFrame(): ((frame: RuntimeFrame, fps: number) => void) | undefined { return onFrame },
    set onFrame(value: ((frame: RuntimeFrame, fps: number) => void) | undefined) { onFrame = value },
  }
  return controller
}
