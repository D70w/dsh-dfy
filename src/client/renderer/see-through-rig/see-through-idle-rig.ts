import { SpringValue } from '../whale-rig2/secondary-motion.ts'
import { blinkOpenness, clampPointer, sampleIdleMotion } from '../community-rig/motion.ts'

const DESIGN_SIZE = 1280

export type SeeThroughExpression = 'neutral' | 'smug' | 'happy'
export type SeeThroughBoneId =
  | 'root' | 'pelvis' | 'chest' | 'neck' | 'head'
  | 'armLeft' | 'armRight' | 'legLeft' | 'legRight'
  | 'hairBack' | 'hairFront' | 'ahoge' | 'tail'

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

export interface SeeThroughIdleRigOptions {
  assetBaseUrl: string
  outputSize?: number
  transparentBackground?: boolean
  reducedMotion?: boolean
}

export interface SeeThroughIdleRigController {
  setPointer(x: number, y: number): void
  setExpression(expression: SeeThroughExpression): void
  setBreathing(enabled: boolean): void
  setBlinking(enabled: boolean): void
  triggerBlink(): void
  setSecondaryMotion(enabled: boolean): void
  setReducedMotion(enabled: boolean): void
  setDebug(enabled: boolean): void
  setManualBoneRotation(id: SeeThroughBoneId, degrees: number): void
  resetManualPose(): void
  getState(): Readonly<{ expression: SeeThroughExpression; blink: number; gazeX: number; gazeY: number }>
  dispose(): void
}

const partNames = [
  'hair-back', 'tail', 'face', 'mouth', 'neck', 'torso', 'human-ears',
  'arm-left', 'arm-right', 'leg-left', 'leg-right', 'shoe-left', 'shoe-right',
  'eye-white-left', 'eye-white-right', 'iris-left', 'iris-right',
  'lash-left', 'lash-right', 'brow-left', 'brow-right', 'hair-front', 'ahoge',
  'maid-headband', 'skirt', 'whale-fins', 'side-bow',
] as const

type PartName = typeof partNames[number]

const boneLabels: Record<SeeThroughBoneId, string> = {
  root: '总控制', pelvis: '骨盆', chest: '胸腔', neck: '颈部', head: '头部',
  armLeft: '左臂', armRight: '右臂', legLeft: '左腿', legRight: '右腿',
  hairBack: '后发', hairFront: '前发', ahoge: '呆毛', tail: '鲸尾',
}

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

function drawBentPart(context: CanvasRenderingContext2D, part: LoadedPart, matrix: DOMMatrix, bend: number, slices = 20): void {
  context.save()
  applyMatrix(context, matrix)
  const sourceSlice = part.image.naturalHeight / slices
  const destinationSlice = part.height / slices
  for (let row = 0; row < slices; row += 1) {
    const influence = row / Math.max(1, slices - 1)
    const offsetX = bend * influence * influence
    context.drawImage(
      part.image,
      0, Math.max(0, row * sourceSlice - 1), part.image.naturalWidth, Math.min(part.image.naturalHeight - row * sourceSlice + 1, sourceSlice + 2),
      part.x + offsetX, part.y + row * destinationSlice - 1, part.width, destinationSlice + 2,
    )
  }
  context.restore()
}

function drawEye(
  context: CanvasRenderingContext2D,
  white: LoadedPart,
  iris: LoadedPart,
  lash: LoadedPart,
  matrix: DOMMatrix,
  centerX: number,
  centerY: number,
  openness: number,
  gazeX: number,
  gazeY: number,
): void {
  context.save()
  applyMatrix(context, matrix)
  context.translate(centerX, centerY)
  context.scale(1, Math.max(0.035, openness))
  context.translate(-centerX, -centerY)
  context.drawImage(white.image, white.x, white.y, white.width, white.height)
  if (openness > 0.1) context.drawImage(iris.image, iris.x + gazeX * 6, iris.y + gazeY * 3.6, iris.width, iris.height)
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
  let expression: SeeThroughExpression = 'neutral'
  let breathing = true
  let blinking = true
  let secondaryMotion = true
  let reducedMotion = options.reducedMotion ?? false
  let debug = true
  let disposed = false
  let frame = 0
  let previousTime = performance.now()
  let nextBlinkAt = previousTime + 1700
  let blinkStartedAt = Number.NEGATIVE_INFINITY
  let blink = 1
  const manualRotations = new Map<SeeThroughBoneId, number>()
  const gazeSpringX = new SpringValue({ stiffness: 90, damping: 18, maxOffset: 1 })
  const gazeSpringY = new SpringValue({ stiffness: 90, damping: 18, maxOffset: 1 })
  const backHairSpring = new SpringValue({ stiffness: 38, damping: 8.5, maxOffset: 12 })
  const frontHairSpring = new SpringValue({ stiffness: 58, damping: 10, maxOffset: 7 })
  const ahogeSpring = new SpringValue({ stiffness: 50, damping: 8.5, maxOffset: 15 })
  const tailSpring = new SpringValue({ stiffness: 34, damping: 7.5, maxOffset: 13 })

  const manual = (id: SeeThroughBoneId): number => manualRotations.get(id) ?? 0
  const scheduleBlink = (now: number): void => { nextBlinkAt = now + 2300 + (Math.sin(now * 0.00131) * 0.5 + 0.5) * 1900 }

  const render = (now: number): void => {
    const delta = Math.min(50, Math.max(0, now - previousTime))
    previousTime = now
    const gazeX = gazeSpringX.step(reducedMotion ? 0 : pointerX, delta)
    const gazeY = gazeSpringY.step(reducedMotion ? 0 : pointerY, delta)
    if (blinking && !reducedMotion && now >= nextBlinkAt && blinkStartedAt < nextBlinkAt) blinkStartedAt = now
    blink = blinking && !reducedMotion ? blinkOpenness(now - blinkStartedAt) : 1
    if (now - blinkStartedAt >= 150 && blinkStartedAt >= nextBlinkAt) scheduleBlink(now)
    const idle = sampleIdleMotion(now, gazeX, gazeY, breathing && !reducedMotion)
    const backHair = backHairSpring.step(secondaryMotion && !reducedMotion ? -idle.headRotationDeg * 1.7 + Math.sin(now / 1450) * 1.2 : 0, delta)
    const frontHair = frontHairSpring.step(secondaryMotion && !reducedMotion ? -idle.headRotationDeg * 0.55 + Math.sin(now / 1700) * 0.45 : 0, delta)
    const ahoge = ahogeSpring.step(secondaryMotion && !reducedMotion ? -backHair * 1.25 + Math.sin(now / 780) * 1.6 : 0, delta)
    const tail = tailSpring.step(secondaryMotion && !reducedMotion ? Math.sin(now / 980) * 4.2 - idle.headRotationDeg * 0.55 : 0, delta)
    const breathScale = breathing && !reducedMotion ? 1 + idle.breath * 0.009 : 1

    const poses: BonePose[] = [
      { id: 'root', parent: null, pivotX: 640, pivotY: 1000, rotation: manual('root') },
      { id: 'pelvis', parent: 'root', pivotX: 640, pivotY: 870, y: -idle.breath * 1.4, rotation: manual('pelvis') },
      { id: 'chest', parent: 'pelvis', pivotX: 640, pivotY: 690, scaleX: 1 + (breathScale - 1) * 0.55, scaleY: breathScale, rotation: manual('chest') },
      { id: 'neck', parent: 'chest', pivotX: 640, pivotY: 525, rotation: manual('neck') },
      { id: 'head', parent: 'neck', pivotX: 640, pivotY: 500, x: idle.headX, y: idle.headY, rotation: idle.headRotationDeg + manual('head') },
      { id: 'armLeft', parent: 'chest', pivotX: 505, pivotY: 575, rotation: -idle.breath * 0.65 + manual('armLeft') },
      { id: 'armRight', parent: 'chest', pivotX: 775, pivotY: 575, rotation: idle.breath * 0.65 + manual('armRight') },
      { id: 'legLeft', parent: 'pelvis', pivotX: 575, pivotY: 900, rotation: manual('legLeft') },
      { id: 'legRight', parent: 'pelvis', pivotX: 705, pivotY: 900, rotation: manual('legRight') },
      { id: 'hairBack', parent: 'head', pivotX: 640, pivotY: 230, rotation: backHair + manual('hairBack') },
      { id: 'hairFront', parent: 'head', pivotX: 640, pivotY: 225, rotation: frontHair + manual('hairFront') },
      { id: 'ahoge', parent: 'head', pivotX: 638, pivotY: 151, rotation: ahoge + manual('ahoge') },
      { id: 'tail', parent: 'pelvis', pivotX: 815, pivotY: 840, rotation: tail + manual('tail') },
    ]
    const bones = solveBones(poses)
    const bone = (id: SeeThroughBoneId): DOMMatrix => bones.get(id) ?? new DOMMatrix()

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, outputSize, outputSize)
    if (options.transparentBackground !== true) {
      const gradient = context.createLinearGradient(0, 0, 0, outputSize)
      gradient.addColorStop(0, '#edf3f5'); gradient.addColorStop(1, '#dce8ec')
      context.fillStyle = gradient; context.fillRect(0, 0, outputSize, outputSize)
    }
    context.save()
    context.scale(outputSize / DESIGN_SIZE, outputSize / DESIGN_SIZE)

    drawPart(context, parts['whale-fins'], bone('head'))
    drawBentPart(context, parts['hair-back'], bone('hairBack'), backHair * 0.72, 24)
    drawBentPart(context, parts.tail, bone('tail'), tail * 0.55, 18)
    drawPart(context, parts['human-ears'], bone('head'))
    drawPart(context, parts['leg-left'], bone('legLeft'))
    drawPart(context, parts['leg-right'], bone('legRight'))
    drawPart(context, parts.neck, bone('neck'))
    drawPart(context, parts.skirt, bone('pelvis'))
    drawPart(context, parts.torso, bone('chest'))
    drawPart(context, parts['arm-left'], bone('armLeft'))
    drawPart(context, parts['arm-right'], bone('armRight'))
    drawPart(context, parts['shoe-left'], bone('legLeft'))
    drawPart(context, parts['shoe-right'], bone('legRight'))

    drawPart(context, parts.face, bone('head'))
    drawPart(context, parts['brow-left'], bone('head'))
    drawPart(context, parts['brow-right'], bone('head'))
    drawEye(context, parts['eye-white-left'], parts['iris-left'], parts['lash-left'], bone('head'), 552, 386, blink, gazeX, gazeY)
    drawEye(context, parts['eye-white-right'], parts['iris-right'], parts['lash-right'], bone('head'), 698, 386, blink, gazeX, gazeY)

    context.save()
    applyMatrix(context, bone('head'))
    const mouthScaleX = expression === 'smug' ? 1.18 : expression === 'happy' ? 1.08 : 1
    const mouthScaleY = expression === 'happy' ? 1.75 : 1
    context.translate(624.5, 440.5); context.scale(mouthScaleX, mouthScaleY); context.translate(-624.5, -440.5)
    context.drawImage(parts.mouth.image, parts.mouth.x, parts.mouth.y, parts.mouth.width, parts.mouth.height)
    if (expression !== 'neutral') {
      context.fillStyle = expression === 'happy' ? 'rgba(239,132,140,.16)' : 'rgba(222,126,132,.11)'
      context.beginPath(); context.ellipse(501, 451, 25, 9, 0, 0, Math.PI * 2); context.ellipse(751, 451, 25, 9, 0, 0, Math.PI * 2); context.fill()
    }
    context.restore()

    drawPart(context, parts['maid-headband'], bone('head'))
    drawBentPart(context, parts['hair-front'], bone('hairFront'), frontHair * 0.42, 20)
    drawPart(context, parts['side-bow'], bone('head'))
    drawPart(context, parts.ahoge, bone('ahoge'))

    if (debug) {
      context.save()
      context.lineWidth = 3
      context.font = '18px "Microsoft YaHei UI", sans-serif'
      for (const pose of poses) {
        const matrix = bone(pose.id)
        const point = transformedPoint(matrix, pose.pivotX, pose.pivotY)
        if (pose.parent) {
          const parentPose = poses.find(item => item.id === pose.parent)!
          const parentPoint = transformedPoint(bone(pose.parent), parentPose.pivotX, parentPose.pivotY)
          context.strokeStyle = 'rgba(14,134,156,.72)'; context.beginPath(); context.moveTo(parentPoint.x, parentPoint.y); context.lineTo(point.x, point.y); context.stroke()
        }
        context.fillStyle = manualRotations.has(pose.id) ? '#ffb84d' : '#16b8c8'
        context.beginPath(); context.arc(point.x, point.y, 7, 0, Math.PI * 2); context.fill()
        context.fillStyle = '#143542'; context.fillText(boneLabels[pose.id], point.x + 10, point.y - 9)
      }
      context.restore()
    }
    context.restore()
  }

  const animate = (now: number): void => {
    if (disposed) return
    render(now)
    frame = requestAnimationFrame(animate)
  }
  frame = requestAnimationFrame(animate)

  return {
    setPointer(x, y): void { pointerX = clampPointer(x); pointerY = clampPointer(y) },
    setExpression(value): void { expression = value },
    setBreathing(value): void { breathing = value },
    setBlinking(value): void { blinking = value },
    triggerBlink(): void { blinkStartedAt = performance.now(); nextBlinkAt = blinkStartedAt },
    setSecondaryMotion(value): void { secondaryMotion = value },
    setReducedMotion(value): void { reducedMotion = value },
    setDebug(value): void { debug = value },
    setManualBoneRotation(id, degrees): void { manualRotations.set(id, Math.max(-45, Math.min(45, degrees))) },
    resetManualPose(): void { manualRotations.clear() },
    getState: () => ({ expression, blink, gazeX: gazeSpringX.value, gazeY: gazeSpringY.value }),
    dispose(): void { disposed = true; cancelAnimationFrame(frame) },
  }
}

export const seeThroughBoneOptions: ReadonlyArray<{ id: SeeThroughBoneId; label: string }> = Object.entries(boneLabels).map(([id, label]) => ({ id: id as SeeThroughBoneId, label }))
