import { CharacterRuntime, type RuntimeFrame } from './character-runtime.ts'
import { MASTER_BONES, MASTER_CANVAS, MASTER_LOCAL_OFFSETS, MASTER_PARTS, MASTER_RUN_CLIP, MASTER_RUN_PARTS, MASTER_STATIC_CLIP } from './master-character.ts'
import type { BoneWorld } from './types.ts'

export { MASTER_BONES, MASTER_CANVAS, MASTER_PARTS, MASTER_RUN_CLIP, MASTER_RUN_PARTS, MASTER_STATIC_CLIP } from './master-character.ts'

export interface MasterPreviewOptions {
  assetBaseUrl: string
  referenceUrl?: string
  scale?: number
  mode?: 'static' | 'run'
}

export interface MasterPreviewController {
  start(): void
  stop(): void
  setShowBones(value: boolean): void
  setShowPivots(value: boolean): void
  setReferenceOpacity(value: number): void
  setSpeed(value: number): void
  setDuration(value: number): void
  seek(value: number): void
  pause(): void
  resume(): void
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
  ctx.lineWidth = 1.2 / scale
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#72dcff'
  for (const world of worlds) {
    ctx.beginPath()
    ctx.moveTo(world.x, world.y)
    ctx.lineTo(world.tipX, world.tipY)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffd166'
  for (const world of worlds) {
    ctx.beginPath()
    ctx.arc(world.x, world.y, 2.1 / scale, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export async function createMasterPreview(
  canvas: HTMLCanvasElement,
  options: MasterPreviewOptions,
): Promise<MasterPreviewController> {
  const currentParts = options.mode === 'run' ? MASTER_RUN_PARTS : MASTER_PARTS
  const imageEntries = await Promise.all(currentParts.map(async current => [
    current.id,
    await loadImage(`${options.assetBaseUrl}/${current.texture}`),
  ] as const))
  const images = new Map(imageEntries)
  const reference = options.referenceUrl === undefined ? undefined : await loadImage(options.referenceUrl)
  const runtime = new CharacterRuntime(
    options.mode === 'run' ? MASTER_RUN_CLIP : MASTER_STATIC_CLIP,
    MASTER_BONES,
    currentParts,
    { rootPosition: [96, 157], localOffsets: MASTER_LOCAL_OFFSETS, bounceAmount: 1 },
  )
  const scale = options.scale ?? 2.7
  canvas.width = MASTER_CANVAS.width * scale
  canvas.height = MASTER_CANVAS.height * scale
  const ctx = canvas.getContext('2d')!
  let running = false
  let raf = 0
  let showBones = true
  let showPivots = true
  let referenceOpacity = 0
  let paused = options.mode !== 'run'
  let last = performance.now()
  let frames = 0
  let fps = 0
  let fpsAt = performance.now()
  let onFrame: ((frame: RuntimeFrame, fps: number) => void) | undefined

  const tick = (now: number): void => {
    if (!running) return
    raf = requestAnimationFrame(tick)
    frames += 1
    if (now - fpsAt >= 500) {
      fps = frames * 1000 / (now - fpsAt)
      frames = 0
      fpsAt = now
    }
    const delta = Math.max(0, Math.min(100, now - last))
    last = now
    if (!paused) runtime.update(delta)
    const frame = runtime.update(0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.fillStyle = '#121927'
    ctx.fillRect(0, 0, MASTER_CANVAS.width, MASTER_CANVAS.height)
    ctx.restore()
    runtime.partRenderer.draw(ctx, frame.parts, images, scale, showPivots)
    if (reference !== undefined && referenceOpacity > 0) {
      ctx.save()
      ctx.globalAlpha = referenceOpacity
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.drawImage(reference, 0, 0, MASTER_CANVAS.width, MASTER_CANVAS.height)
      ctx.restore()
    }
    if (showBones) drawBones(ctx, frame.worlds, scale)
    onFrame?.(frame, fps)
  }

  return {
    start(): void {
      if (running) return
      running = true
      fpsAt = performance.now()
      raf = requestAnimationFrame(tick)
    },
    stop(): void { running = false; cancelAnimationFrame(raf) },
    setShowBones(value: boolean): void { showBones = value },
    setShowPivots(value: boolean): void { showPivots = value },
    setReferenceOpacity(value: number): void { referenceOpacity = Math.min(1, Math.max(0, value)) },
    setSpeed(value: number): void { runtime.animator.speed = value },
    setDuration(value: number): void { runtime.animator.durationMs = value },
    seek(value: number): void { runtime.animator.seek(value) },
    pause(): void { paused = true },
    resume(): void { paused = false; last = performance.now() },
    overrideBone(id: string, angle: number | undefined): void {
      runtime.setBoneOverride(id, angle === undefined ? undefined : { angle })
    },
    runtime,
    images,
    get onFrame(): ((frame: RuntimeFrame, fps: number) => void) | undefined { return onFrame },
    set onFrame(value: ((frame: RuntimeFrame, fps: number) => void) | undefined) { onFrame = value },
  }
}
