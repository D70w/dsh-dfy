import { SpringValue } from '../whale-rig2/secondary-motion.ts'
import { blinkOpenness, clampPointer, sampleIdleMotion } from './motion.ts'

const DESIGN_SIZE = 1024
const STRUCTURAL_COLUMNS = 4
const STRUCTURAL_ROWS = 2

export type CommunityExpression = 'neutral' | 'smug' | 'happy'

export interface CommunityIdleRigOptions {
  structuralAtlasUrl: string
  facialAtlasUrl: string
  outputSize?: number
  transparentBackground?: boolean
  reducedMotion?: boolean
}

export interface CommunityIdleRigController {
  setActive(active: boolean): void
  setPointer(x: number, y: number): void
  setExpression(expression: CommunityExpression): void
  setBreathing(enabled: boolean): void
  setBlinking(enabled: boolean): void
  triggerBlink(): void
  setSecondaryMotion(enabled: boolean): void
  setReducedMotion(enabled: boolean): void
  setDebug(enabled: boolean): void
  getState(): Readonly<{ expression: CommunityExpression; blink: number; gazeX: number; gazeY: number }>
  render(now?: number): void
  dispose(): void
}

interface Sprite {
  readonly canvas: HTMLCanvasElement
  readonly width: number
  readonly height: number
}

type StructuralPart = 'hairBack' | 'tail' | 'body' | 'headBase' | 'hairFront' | 'armFar' | 'armNear' | 'ahoge'
type FacialPart = 'eyeLeft' | 'eyeRight' | 'irisLeft' | 'irisRight' | 'eyesClosed' | 'brows' | 'mouthSmug' | 'mouthHappy'

const structuralOrder: readonly StructuralPart[] = ['hairBack', 'tail', 'body', 'headBase', 'hairFront', 'armFar', 'armNear', 'ahoge']
const facialOrder: readonly FacialPart[] = ['eyeLeft', 'eyeRight', 'irisLeft', 'irisRight', 'eyesClosed', 'brows', 'mouthSmug', 'mouthHappy']

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`community rig: failed to load ${url}`))
    image.src = url
  })
}

function isNeutralBackground(red: number, green: number, blue: number): boolean {
  return Math.max(red, green, blue) - Math.min(red, green, blue) <= 7 && Math.min(red, green, blue) >= 212
}

function removeConnectedBackground(image: ImageData): void {
  const { width, height, data } = image
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const add = (x: number, y: number): void => {
    const index = y * width + x
    if (visited[index] !== 0) return
    const offset = index * 4
    if (!isNeutralBackground(data[offset]!, data[offset + 1]!, data[offset + 2]!)) return
    visited[index] = 1
    queue[tail++] = index
  }
  for (let x = 0; x < width; x += 1) { add(x, 0); add(x, height - 1) }
  for (let y = 0; y < height; y += 1) { add(0, y); add(width - 1, y) }
  while (head < tail) {
    const index = queue[head++]!
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) add(x - 1, y)
    if (x + 1 < width) add(x + 1, y)
    if (y > 0) add(x, y - 1)
    if (y + 1 < height) add(x, y + 1)
  }
  for (let index = 0; index < visited.length; index += 1) if (visited[index] !== 0) image.data[index * 4 + 3] = 0
}

function removeAllNeutralBackground(image: ImageData): void {
  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (isNeutralBackground(image.data[offset]!, image.data[offset + 1]!, image.data[offset + 2]!)) image.data[offset + 3] = 0
  }
}

function removeAllCheckerBackdrop(image: ImageData, startY = 0): void {
  for (let offset = Math.max(0, startY) * image.width * 4; offset < image.data.length; offset += 4) {
    const red = image.data[offset]!
    const green = image.data[offset + 1]!
    const blue = image.data[offset + 2]!
    // Image-generation checkerboards often pick up a faint cool/warm cast near
    // antialiased edges. Structural dark parts contain no intentional pale fill
    // (apart from tiny cuff accents), so a wider low-chroma key is appropriate.
    if (Math.max(red, green, blue) - Math.min(red, green, blue) <= 55 && Math.min(red, green, blue) >= 115) image.data[offset + 3] = 0
  }
}

function keepLargestAlphaComponent(image: ImageData): void {
  const { width, height, data } = image
  const labels = new Int32Array(width * height)
  const queue = new Int32Array(width * height)
  let nextLabel = 1
  let largestLabel = 0
  let largestSize = 0
  for (let seed = 0; seed < labels.length; seed += 1) {
    if (labels[seed] !== 0 || data[seed * 4 + 3]! < 10) continue
    const label = nextLabel++
    let head = 0
    let tail = 0
    let size = 0
    labels[seed] = label
    queue[tail++] = seed
    while (head < tail) {
      const index = queue[head++]!
      size += 1
      const x = index % width
      const y = Math.floor(index / width)
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) continue
        const nextX = x + offsetX
        const nextY = y + offsetY
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
        const next = nextY * width + nextX
        if (labels[next] !== 0 || data[next * 4 + 3]! < 10) continue
        labels[next] = label
        queue[tail++] = next
      }
    }
    if (size > largestSize) { largestLabel = label; largestSize = size }
  }
  for (let index = 0; index < labels.length; index += 1) if (labels[index] !== largestLabel) data[index * 4 + 3] = 0
}

function trimCanvas(source: HTMLCanvasElement): Sprite {
  const context = source.getContext('2d', { willReadFrequently: true })!
  const data = context.getImageData(0, 0, source.width, source.height).data
  let left = source.width
  let top = source.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    if (data[(y * source.width + x) * 4 + 3]! < 10) continue
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y)
  }
  if (right < left || bottom < top) return { canvas: source, width: source.width, height: source.height }
  const trimmed = document.createElement('canvas')
  trimmed.width = right - left + 1
  trimmed.height = bottom - top + 1
  trimmed.getContext('2d')!.drawImage(source, left, top, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height)
  return { canvas: trimmed, width: trimmed.width, height: trimmed.height }
}

function extractAtlas(image: HTMLImageElement, globalNeutralRemoval: boolean): Sprite[] {
  const sprites: Sprite[] = []
  const xEdges = Array.from({ length: STRUCTURAL_COLUMNS + 1 }, (_, index) => Math.round(index * image.naturalWidth / STRUCTURAL_COLUMNS))
  const yEdges = Array.from({ length: STRUCTURAL_ROWS + 1 }, (_, index) => Math.round(index * image.naturalHeight / STRUCTURAL_ROWS))
  for (let row = 0; row < STRUCTURAL_ROWS; row += 1) for (let column = 0; column < STRUCTURAL_COLUMNS; column += 1) {
    const width = xEdges[column + 1]! - xEdges[column]!
    const height = yEdges[row + 1]! - yEdges[row]!
    const cell = document.createElement('canvas')
    cell.width = width
    cell.height = height
    const context = cell.getContext('2d', { willReadFrequently: true })!
    context.drawImage(image, xEdges[column]!, yEdges[row]!, width, height, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height)
    // Hair loops, the tail fork, and bent arms all enclose checkerboard islands
    // that a border flood-fill cannot reach. Those dark-only cells are safe to
    // clean globally. The dress, blank face, and front-hair/headband keep
    // connected-only removal so their pale artwork is preserved.
    const partIndex = row * STRUCTURAL_COLUMNS + column
    if (globalNeutralRemoval) removeAllNeutralBackground(pixels)
    else if ([0, 1, 5, 6, 7].includes(partIndex)) removeAllCheckerBackdrop(pixels)
    else if (partIndex === 4) {
      // Preserve the pale maid headband at the top of the front-hair cell, but
      // clear the checkerboard trapped inside the U-shaped face opening below.
      removeConnectedBackground(pixels)
      removeAllCheckerBackdrop(pixels, Math.round(height * 0.24))
    }
    else removeConnectedBackground(pixels)
    if (!globalNeutralRemoval && [1, 2, 5].includes(partIndex)) keepLargestAlphaComponent(pixels)
    context.putImageData(pixels, 0, 0)
    sprites.push(trimCanvas(cell))
  }
  return sprites
}

function drawSprite(context: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, width: number, height: number): void {
  context.drawImage(sprite.canvas, x, y, width, height)
}

function drawVerticalBend(context: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, width: number, height: number, bend: number, slices = 18): void {
  const sourceSlice = sprite.height / slices
  const destinationSlice = height / slices
  for (let row = 0; row < slices; row += 1) {
    const influence = row / Math.max(1, slices - 1)
    const offsetX = bend * influence * influence
    context.drawImage(
      sprite.canvas,
      0, Math.max(0, row * sourceSlice - 1), sprite.width, Math.min(sprite.height - row * sourceSlice + 1, sourceSlice + 2),
      x + offsetX, y + row * destinationSlice - 1, width, destinationSlice + 2,
    )
  }
}

function drawRotatedSprite(context: CanvasRenderingContext2D, sprite: Sprite, pivotX: number, pivotY: number, width: number, height: number, anchorX: number, anchorY: number, degrees: number): void {
  context.save()
  context.translate(pivotX, pivotY)
  context.rotate(degrees * Math.PI / 180)
  context.drawImage(sprite.canvas, -anchorX * width, -anchorY * height, width, height)
  context.restore()
}

export async function createCommunityIdleRig(canvas: HTMLCanvasElement, options: CommunityIdleRigOptions): Promise<CommunityIdleRigController> {
  const [structuralImage, facialImage] = await Promise.all([loadImage(options.structuralAtlasUrl), loadImage(options.facialAtlasUrl)])
  const structuralSprites = extractAtlas(structuralImage, false)
  const facialSprites = extractAtlas(facialImage, true)
  const structural = Object.fromEntries(structuralOrder.map((id, index) => [id, structuralSprites[index]!])) as Record<StructuralPart, Sprite>
  const facial = Object.fromEntries(facialOrder.map((id, index) => [id, facialSprites[index]!])) as Record<FacialPart, Sprite>
  const outputSize = options.outputSize ?? 512
  const isolatedPart = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('part')
  const showPart = (part: StructuralPart): boolean => isolatedPart === null || isolatedPart === part
  canvas.width = outputSize
  canvas.height = outputSize
  const context = canvas.getContext('2d')!
  let pointerX = 0
  let pointerY = 0
  let expression: CommunityExpression = 'neutral'
  let breathing = true
  let blinking = true
  let secondaryMotion = true
  let reducedMotion = options.reducedMotion ?? false
  let debug = false
  let disposed = false
  let active = true
  let frame = 0
  let nextBlinkAt = performance.now() + 1700
  let blinkStartedAt = Number.NEGATIVE_INFINITY
  let blink = 1
  let previousTime = performance.now()
  const gazeX = new SpringValue({ stiffness: 92, damping: 18, maxOffset: 1 })
  const gazeY = new SpringValue({ stiffness: 92, damping: 18, maxOffset: 1 })
  const hair = new SpringValue({ stiffness: 44, damping: 9.5, maxOffset: 18 })
  const tail = new SpringValue({ stiffness: 36, damping: 8, maxOffset: 15 })
  const ahoge = new SpringValue({ stiffness: 58, damping: 9, maxOffset: 16 })

  const scheduleNextBlink = (now: number): void => {
    nextBlinkAt = now + 2200 + (Math.sin(now * 0.00137) * 0.5 + 0.5) * 2100
  }

  const render = (now = performance.now()): void => {
    const delta = Math.min(50, Math.max(0, now - previousTime))
    previousTime = now
    const targetX = reducedMotion ? 0 : pointerX
    const targetY = reducedMotion ? 0 : pointerY
    const smoothX = gazeX.step(targetX, delta)
    const smoothY = gazeY.step(targetY, delta)
    if (blinking && !reducedMotion && now >= nextBlinkAt && blinkStartedAt < nextBlinkAt) blinkStartedAt = now
    blink = blinking && !reducedMotion ? blinkOpenness(now - blinkStartedAt) : 1
    if (now - blinkStartedAt >= 150 && blinkStartedAt >= nextBlinkAt) scheduleNextBlink(now)
    const motion = sampleIdleMotion(now, smoothX, smoothY, breathing && !reducedMotion)
    const hairTarget = secondaryMotion && !reducedMotion ? -motion.headRotationDeg * 2.2 + Math.sin(now / 1250) * 2 : 0
    const tailTarget = secondaryMotion && !reducedMotion ? Math.sin(now / 930) * 5.2 - motion.headRotationDeg * 0.7 : 0
    const ahogeTarget = secondaryMotion && !reducedMotion ? -hairTarget * 0.72 + Math.sin(now / 710) * 1.4 : 0
    const hairBend = hair.step(hairTarget, delta)
    const tailBend = tail.step(tailTarget, delta)
    const ahogeRotation = ahoge.step(ahogeTarget, delta)

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, outputSize, outputSize)
    if (options.transparentBackground !== true) { context.fillStyle = '#e9edf1'; context.fillRect(0, 0, outputSize, outputSize) }
    context.save()
    context.scale(outputSize / DESIGN_SIZE, outputSize / DESIGN_SIZE)
    context.translate(512, 862)
    context.scale(1, 1 + motion.breath * 0.006)
    context.translate(-512, -862)

    if (showPart('hairBack')) drawVerticalBend(context, structural.hairBack, 347, 194, 330, 484, hairBend)
    if (showPart('tail')) {
      context.save()
      context.translate(620, 622)
      context.rotate((78 + tailBend * 0.55) * Math.PI / 180)
      drawVerticalBend(context, structural.tail, -72, -156, 144, 156, tailBend * 0.55, 14)
      context.restore()
    }
    if (showPart('armFar')) drawRotatedSprite(context, structural.armFar, 408, 535, 134, 184, 0.5, 0.05, -5 + motion.breath * 1.2)
    if (showPart('body')) drawSprite(context, structural.body, 354, 488 - motion.breath * 2.3, 316, 402)
    if (showPart('armNear')) drawRotatedSprite(context, structural.armNear, 615, 534, 118, 212, 0.5, 0.04, 4 - motion.breath * 1.1)

    const headPivotX = 512
    const headPivotY = 500
    context.save()
    context.translate(headPivotX + motion.headX, headPivotY + motion.headY)
    context.rotate(motion.headRotationDeg * Math.PI / 180)
    context.translate(-headPivotX, -headPivotY)
    if (showPart('headBase')) drawSprite(context, structural.headBase, 347, 294, 330, 242)

    const eyeY = 398
    const leftX = 444
    const rightX = 542
    if (isolatedPart === null && blink > 0.12) {
      const openness = 0.18 + blink * 0.82
      const drawEye = (x: number, irisSprite: Sprite, lashSprite: Sprite): void => {
        context.save()
        context.translate(x, eyeY)
        context.scale(1, openness)
        context.beginPath()
        context.ellipse(0, 0, 32, 37, 0, 0, Math.PI * 2)
        context.clip()
        context.fillStyle = '#f7f4ec'
        context.fillRect(-38, -42, 76, 84)
        const irisX = gazeX.value * 5.5
        const irisY = gazeY.value * 3.5
        drawSprite(context, irisSprite, -21 + irisX, -25 + irisY, 42, 50)
        context.fillStyle = 'rgba(255,255,255,.9)'
        context.beginPath(); context.arc(-9 + irisX, -13 + irisY, 5.2, 0, Math.PI * 2); context.fill()
        context.restore()
        context.save()
        context.translate(x, eyeY)
        context.scale(1, openness)
        drawSprite(context, lashSprite, -40, -34, 80, 68)
        context.restore()
      }
      drawEye(leftX, facial.irisLeft, facial.eyeLeft)
      drawEye(rightX, facial.irisRight, facial.eyeRight)
    } else if (isolatedPart === null) {
      drawSprite(context, facial.eyesClosed, 428, 392, 164, 25)
    }
    if (isolatedPart === null) drawSprite(context, facial.brows, 432, 355, 160, 20)
    if (isolatedPart === null && expression === 'happy') drawSprite(context, facial.mouthHappy, 496, 455, 32, 15)
    else if (isolatedPart === null) drawSprite(context, facial.mouthSmug, 491, 457, 42, 8)
    if (isolatedPart === null && expression === 'smug') {
      context.fillStyle = 'rgba(213,116,114,.13)'
      context.beginPath(); context.ellipse(405, 440, 27, 10, 0, 0, Math.PI * 2); context.ellipse(617, 440, 27, 10, 0, 0, Math.PI * 2); context.fill()
    }
    if (showPart('hairFront')) drawVerticalBend(context, structural.hairFront, 347, 198, 330, 440, hairBend * 0.26, 14)
    if (showPart('ahoge')) drawRotatedSprite(context, structural.ahoge, 510, 211, 96, 86, 0.5, 0.96, ahogeRotation)
    context.restore()

    if (debug) {
      context.strokeStyle = 'rgba(74,190,224,.78)'; context.lineWidth = 2
      context.beginPath(); context.arc(512, 500, 5, 0, Math.PI * 2); context.moveTo(512, 500); context.lineTo(512 + motion.headX * 5, 500 + motion.headY * 5); context.stroke()
      context.fillStyle = '#4abee0'; context.font = '18px ui-monospace, monospace'; context.fillText(`blink ${blink.toFixed(2)} gaze ${smoothX.toFixed(2)},${smoothY.toFixed(2)}`, 24, 34)
    }
    context.restore()
  }

  const animate = (now: number): void => {
    if (disposed || !active) { frame = 0; return }
    render(now)
    frame = requestAnimationFrame(animate)
  }
  frame = requestAnimationFrame(animate)
  return {
    setActive(value): void {
      active = value
      if (active && !disposed && frame === 0) {
        previousTime = performance.now()
        frame = requestAnimationFrame(animate)
      }
    },
    setPointer(x, y): void { pointerX = clampPointer(x); pointerY = clampPointer(y) },
    setExpression(value): void { expression = value },
    setBreathing(value): void { breathing = value },
    setBlinking(value): void { blinking = value; if (!value) blink = 1 },
    triggerBlink(): void { blinkStartedAt = performance.now(); nextBlinkAt = blinkStartedAt },
    setSecondaryMotion(value): void { secondaryMotion = value },
    setReducedMotion(value): void { reducedMotion = value },
    setDebug(value): void { debug = value },
    getState() { return { expression, blink, gazeX: gazeX.value, gazeY: gazeY.value } },
    render,
    dispose(): void { disposed = true; if (frame !== 0) cancelAnimationFrame(frame); frame = 0 },
  }
}
