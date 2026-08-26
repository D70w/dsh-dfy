import { clonePelvisRig, createInitialPelvisRig, poseLeg, syncLegHips, validatePelvisRig, VALIDATION_POSES, type PelvisRigDocument, type ValidationPoseId, type Vec2 } from './pelvis-rig.ts'

export { VALIDATION_POSES } from './pelvis-rig.ts'

const SIZE = 1024
const COLORS = { near: '#78e6ff', far: '#9c9eff', pelvis: '#ffd166', hidden: '#a7b5cc', selected: '#ff7f9d' }

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`无法加载母图：${url}`)); image.src = url })
}

function distance(a: Vec2, b: Vec2): number { return Math.hypot(b.x - a.x, b.y - a.y) }

function drawPoint(ctx: CanvasRenderingContext2D, point: Vec2, color: string, hollow: boolean, selected: boolean): void {
  ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = selected ? COLORS.selected : color; ctx.fillStyle = hollow ? '#121927' : color
  ctx.beginPath(); ctx.arc(point.x, point.y, selected ? 12 : 9, 0, Math.PI * 2); hollow ? ctx.stroke() : ctx.fill(); if (selected) { ctx.beginPath(); ctx.arc(point.x, point.y, 16, 0, Math.PI * 2); ctx.stroke() } ctx.restore()
}

function drawBone(ctx: CanvasRenderingContext2D, from: Vec2, to: Vec2, hidden: boolean, color: string): void {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; if (hidden) ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.restore()
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, point: Vec2, color: string): void { ctx.save(); ctx.font = 'bold 18px "Microsoft YaHei", sans-serif'; ctx.fillStyle = color; ctx.strokeStyle = '#0c1422'; ctx.lineWidth = 6; ctx.strokeText(text, point.x + 14, point.y - 14); ctx.fillText(text, point.x + 14, point.y - 14); ctx.restore() }

export async function createPelvisCalibrationPreview(canvas: HTMLCanvasElement, options: { referenceUrl: string }): Promise<{
  setPose(id: ValidationPoseId): void
  setShowReference(value: boolean): void
  setShowBones(value: boolean): void
  setShowPelvisZone(value: boolean): void
  setSelectedHandle(id: 'pelvis' | 'hipNear' | 'hipFar' | undefined): void
  getDocument(): PelvisRigDocument
  updateHandle(id: 'pelvis' | 'hipNear' | 'hipFar', point: Vec2): void
  render(): void
}> {
  const reference = await loadImage(options.referenceUrl)
  const ctx = canvas.getContext('2d')!
  canvas.width = SIZE; canvas.height = SIZE
  let document = createInitialPelvisRig()
  let poseId: ValidationPoseId = 'bind'
  let showReference = true
  let showBones = true
  let showPelvisZone = true
  let selectedHandle: 'pelvis' | 'hipNear' | 'hipFar' | undefined

  const render = (): void => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, SIZE, SIZE); ctx.fillStyle = '#121927'; ctx.fillRect(0, 0, SIZE, SIZE)
    if (showReference) { ctx.globalAlpha = 0.72; ctx.drawImage(reference, 0, 0, SIZE, SIZE); ctx.globalAlpha = 1 }
    const pose = VALIDATION_POSES.find(item => item.id === poseId) ?? VALIDATION_POSES[0]!
    const near = poseLeg(document.legs.near, pose); const far = poseLeg(document.legs.far, pose)
    if (showPelvisZone) { ctx.save(); ctx.translate(document.pelvis.center.x, document.pelvis.center.y); ctx.rotate(document.pelvis.rotation * Math.PI / 180); ctx.strokeStyle = COLORS.pelvis; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.strokeRect(-document.pelvis.width / 2, -document.pelvis.height / 2, document.pelvis.width, document.pelvis.height); ctx.restore() }
    if (showBones) {
      drawBone(ctx, document.pelvis.center, document.pelvis.hipFar, true, COLORS.hidden); drawBone(ctx, document.pelvis.center, document.pelvis.hipNear, true, COLORS.hidden)
      drawBone(ctx, far.hip, far.knee, false, COLORS.far); drawBone(ctx, far.knee, far.ankle, false, COLORS.far); drawBone(ctx, far.ankle, far.foot, false, COLORS.far)
      drawBone(ctx, near.hip, near.knee, false, COLORS.near); drawBone(ctx, near.knee, near.ankle, false, COLORS.near); drawBone(ctx, near.ankle, near.foot, false, COLORS.near)
    }
    drawPoint(ctx, document.pelvis.center, COLORS.pelvis, false, selectedHandle === 'pelvis'); drawLabel(ctx, '骨盆中心', { x: document.pelvis.center.x - 42, y: document.pelvis.center.y - 18 }, COLORS.pelvis)
    drawPoint(ctx, document.pelvis.hipFar, COLORS.far, true, selectedHandle === 'hipFar'); drawLabel(ctx, '隐藏髋（远）', { x: document.pelvis.hipFar.x - 112, y: document.pelvis.hipFar.y + 38 }, COLORS.far)
    drawPoint(ctx, document.pelvis.hipNear, COLORS.near, true, selectedHandle === 'hipNear'); drawLabel(ctx, '隐藏髋（近）', { x: document.pelvis.hipNear.x + 8, y: document.pelvis.hipNear.y + 38 }, COLORS.near)
    drawPoint(ctx, near.knee, COLORS.near, false, false); drawPoint(ctx, near.ankle, COLORS.near, false, false); drawPoint(ctx, far.knee, COLORS.far, false, false); drawPoint(ctx, far.ankle, COLORS.far, false, false)
  }
  const canvasPoint = (event: PointerEvent): Vec2 => {
    const bounds = canvas.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) * SIZE / bounds.width, y: (event.clientY - bounds.top) * SIZE / bounds.height }
  }
  const nearestHandle = (point: Vec2): 'pelvis' | 'hipNear' | 'hipFar' | undefined => {
    const candidates: Array<['pelvis' | 'hipNear' | 'hipFar', Vec2]> = [['pelvis', document.pelvis.center], ['hipNear', document.pelvis.hipNear], ['hipFar', document.pelvis.hipFar]]
    let selected: 'pelvis' | 'hipNear' | 'hipFar' | undefined
    let best = 28
    for (const [id, candidate] of candidates) { const current = distance(point, candidate); if (current < best) { best = current; selected = id } }
    return selected
  }
  let dragging: 'pelvis' | 'hipNear' | 'hipFar' | undefined
  canvas.addEventListener('pointerdown', event => { dragging = nearestHandle(canvasPoint(event)); if (dragging !== undefined) { canvas.setPointerCapture(event.pointerId); selectedHandle = dragging; render() } })
  canvas.addEventListener('pointermove', event => { if (dragging !== undefined) { const point = canvasPoint(event); if (dragging === 'pelvis') document.pelvis.center = point; else if (dragging === 'hipNear') document.pelvis.hipNear = point; else document.pelvis.hipFar = point; syncLegHips(document); validatePelvisRig(document); render() } })
  canvas.addEventListener('pointerup', event => { if (dragging !== undefined) canvas.releasePointerCapture(event.pointerId); dragging = undefined })
  canvas.addEventListener('pointercancel', () => { dragging = undefined })
  render()
  return {
    setPose(id): void { poseId = id; render() }, setShowReference(value): void { showReference = value; render() }, setShowBones(value): void { showBones = value; render() }, setShowPelvisZone(value): void { showPelvisZone = value; render() }, setSelectedHandle(id): void { selectedHandle = id; render() },
    getDocument(): PelvisRigDocument { return clonePelvisRig(document) },
    updateHandle(id, point): void { if (id === 'pelvis') document.pelvis.center = { ...point }; else if (id === 'hipNear') document.pelvis.hipNear = { ...point }; else document.pelvis.hipFar = { ...point }; syncLegHips(document); validatePelvisRig(document); render() },
    render,
  }
}
