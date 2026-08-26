import { createInitialPelvisRig, rotatePoint, type Vec2 } from './pelvis-rig.ts'

const SIZE = 1024
const STATIC_BEFORE_LEGS = ['body-base-underlay', 'hair-back', 'tail', 'upper-arm-far', 'forearm-far']
const STATIC_AFTER_LEGS = ['body-base', 'upper-arm-near', 'forearm-near', 'head', 'ahoge']

function loadImage(url: string): Promise<HTMLImageElement> { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`无法加载腿部遮挡资产：${url}`)); image.src = url }) }

function drawRotated(ctx: CanvasRenderingContext2D, image: HTMLImageElement, pivot: Vec2, degrees: number): void {
  ctx.save(); ctx.translate(pivot.x, pivot.y); ctx.rotate(degrees * Math.PI / 180); ctx.translate(-pivot.x, -pivot.y); ctx.drawImage(image, 0, 0); ctx.restore()
}

function drawLegBones(ctx: CanvasRenderingContext2D, points: readonly Vec2[], color: string): void {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(points[0]!.x, points[0]!.y); for (const point of points.slice(1)) ctx.lineTo(point.x, point.y); ctx.stroke(); for (const point of points) { ctx.beginPath(); ctx.arc(point.x, point.y, 7, 0, Math.PI * 2); ctx.fill() } ctx.restore()
}

export async function createLegOcclusionPreview(canvas: HTMLCanvasElement, options: { assetBaseUrl: string }): Promise<{
  setNearAngle(value: number): void
  setFarAngle(value: number): void
  setShowBones(value: boolean): void
  setShowOcclusion(value: boolean): void
  render(): void
}> {
  const ids = [...STATIC_BEFORE_LEGS, ...STATIC_AFTER_LEGS, 'leg-near-full', 'leg-far-full', 'skirt-occlusion']
  const entries = await Promise.all(ids.map(async id => [id, await loadImage(`${options.assetBaseUrl}/textures/${id}.png`)] as const))
  const images = new Map(entries)
  const rig = createInitialPelvisRig()
  const ctx = canvas.getContext('2d')!
  canvas.width = SIZE; canvas.height = SIZE
  let nearAngle = 0; let farAngle = 0; let showBones = true; let showOcclusion = false

  const render = (): void => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, SIZE, SIZE); ctx.fillStyle = '#121927'; ctx.fillRect(0, 0, SIZE, SIZE)
    for (const id of STATIC_BEFORE_LEGS) ctx.drawImage(images.get(id)!, 0, 0)
    drawRotated(ctx, images.get('leg-far-full')!, rig.legs.far.hip, farAngle)
    drawRotated(ctx, images.get('leg-near-full')!, rig.legs.near.hip, nearAngle)
    for (const id of STATIC_AFTER_LEGS) ctx.drawImage(images.get(id)!, 0, 0)
    if (showOcclusion) { ctx.save(); ctx.globalAlpha = 0.55; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(images.get('skirt-occlusion')!, 0, 0); ctx.restore() }
    if (showBones) {
      const near = [rig.legs.near.hip, rig.legs.near.knee, rig.legs.near.ankle, rig.legs.near.foot].map(point => rotatePoint(point, rig.legs.near.hip, nearAngle))
      const far = [rig.legs.far.hip, rig.legs.far.knee, rig.legs.far.ankle, rig.legs.far.foot].map(point => rotatePoint(point, rig.legs.far.hip, farAngle))
      drawLegBones(ctx, far, '#9c9eff'); drawLegBones(ctx, near, '#78e6ff')
    }
  }
  render()
  return {
    setNearAngle(value): void { nearAngle = value; render() }, setFarAngle(value): void { farAngle = value; render() }, setShowBones(value): void { showBones = value; render() }, setShowOcclusion(value): void { showOcclusion = value; render() }, render,
  }
}
