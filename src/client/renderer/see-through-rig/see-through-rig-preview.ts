import {
  createSeeThroughIdleRig,
  seeThroughBoneOptions,
  type SeeThroughBoneId,
  type SeeThroughExpression,
  type SeeThroughGesture,
  defaultSeeThroughLayerOrder,
  seeThroughLayerOptions,
} from './see-through-idle-rig-v2.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#rig-canvas')!
const assetBaseUrl = '../../character-packs/default-whale/source/see-through-idle-rig-v1'
const transparentBackground = canvas.dataset.transparentBackground === 'true'
// The character is displayed at roughly 250–320 CSS pixels in this preview.
// A 640px backing store still provides a crisp 2x image while avoiding the
// unnecessary raster cost of the old 760px surface on every mesh frame.
const controller = await createSeeThroughIdleRig(canvas, { assetBaseUrl, outputSize: 640, transparentBackground })

function pointer(event: PointerEvent): void {
  const bounds = canvas.getBoundingClientRect()
  controller.setPointer((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1)
}
canvas.addEventListener('pointermove', pointer)
canvas.addEventListener('pointerleave', () => controller.setPointer(0, 0))

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-expression]')) button.addEventListener('click', () => {
  controller.setExpression(button.dataset.expression as SeeThroughExpression)
  for (const current of document.querySelectorAll<HTMLButtonElement>('[data-expression]')) current.dataset.active = String(current === button)
})

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-gesture]')) button.addEventListener('click', () => {
  controller.playGesture(button.dataset.gesture as Exclude<SeeThroughGesture, 'none'>)
})
document.querySelector<HTMLButtonElement>('#stop-gesture')!.addEventListener('click', () => controller.stopGesture())

const gestureSpeed = document.querySelector<HTMLInputElement>('#gesture-speed')!
const gestureSpeedValue = document.querySelector<HTMLOutputElement>('#gesture-speed-value')!
gestureSpeed.addEventListener('input', () => {
  const value = Number(gestureSpeed.value)
  controller.setGestureSpeed(value)
  gestureSpeedValue.textContent = `${value.toFixed(2)}×`
})

document.querySelector<HTMLButtonElement>('#blink-now')!.addEventListener('click', () => controller.triggerBlink())
for (const [id, setter] of [
  ['breathing', (value: boolean) => controller.setBreathing(value)],
  ['blinking', (value: boolean) => controller.setBlinking(value)],
  ['secondary', (value: boolean) => controller.setSecondaryMotion(value)],
  ['reduced', (value: boolean) => controller.setReducedMotion(value)],
  ['debug', (value: boolean) => controller.setDebug(value)],
] as const) document.querySelector<HTMLInputElement>(`#${id}`)!.addEventListener('change', event => setter((event.currentTarget as HTMLInputElement).checked))

const boneSelect = document.querySelector<HTMLSelectElement>('#bone-select')!
for (const option of seeThroughBoneOptions) boneSelect.add(new Option(option.label, option.id))
const angle = document.querySelector<HTMLInputElement>('#bone-angle')!
const angleValue = document.querySelector<HTMLOutputElement>('#bone-angle-value')!
const pivotX = document.querySelector<HTMLInputElement>('#bone-pivot-x')!
const pivotXValue = document.querySelector<HTMLOutputElement>('#bone-pivot-x-value')!
const pivotY = document.querySelector<HTMLInputElement>('#bone-pivot-y')!
const pivotYValue = document.querySelector<HTMLOutputElement>('#bone-pivot-y-value')!
interface BoneCorrection { rotation: number; x: number; y: number }
const boneCorrections = new Map<SeeThroughBoneId, BoneCorrection>()
const emptyCorrection = (): BoneCorrection => ({ rotation: 0, x: 0, y: 0 })
function selectedBone(): SeeThroughBoneId {
  return boneSelect.value as SeeThroughBoneId
}
function showCorrection(correction: BoneCorrection): void {
  angle.value = String(correction.rotation)
  pivotX.value = String(correction.x)
  pivotY.value = String(correction.y)
  angleValue.textContent = `${correction.rotation}°`
  pivotXValue.textContent = `${correction.x > 0 ? '+' : ''}${correction.x}px`
  pivotYValue.textContent = `${correction.y > 0 ? '+' : ''}${correction.y}px`
}
function applyCorrection(): void {
  const id = selectedBone()
  const correction = { rotation: Number(angle.value), x: Number(pivotX.value), y: Number(pivotY.value) }
  if (correction.rotation === 0 && correction.x === 0 && correction.y === 0) boneCorrections.delete(id)
  else boneCorrections.set(id, correction)
  showCorrection(correction)
  controller.setManualBoneRotation(id, correction.rotation)
  controller.setManualBonePivotOffset(id, correction.x, correction.y)
}
angle.addEventListener('input', applyCorrection)
pivotX.addEventListener('input', applyCorrection)
pivotY.addEventListener('input', applyCorrection)
boneSelect.addEventListener('change', () => showCorrection(boneCorrections.get(selectedBone()) ?? emptyCorrection()))
document.querySelector<HTMLButtonElement>('#reset-selected-bone')!.addEventListener('click', () => {
  const id = selectedBone()
  boneCorrections.delete(id)
  controller.setManualBoneRotation(id, 0)
  controller.setManualBonePivotOffset(id, 0, 0)
  showCorrection(emptyCorrection())
})
document.querySelector<HTMLButtonElement>('#reset-pose')!.addEventListener('click', () => {
  boneCorrections.clear()
  controller.resetManualPose()
  showCorrection(emptyCorrection())
})

const layerEditor = document.querySelector<HTMLElement>('#layer-editor')
const resetLayers = document.querySelector<HTMLButtonElement>('#reset-layers')
if (layerEditor !== null) {
  let layerOrder = [...defaultSeeThroughLayerOrder]
  const visibility = new Map(defaultSeeThroughLayerOrder.map(id => [id, true]))
  const labelFor = (id: typeof layerOrder[number]): string => seeThroughLayerOptions.find(option => option.id === id)?.label ?? id
  const applyLayers = (): void => {
    controller.setLayerOrder(layerOrder)
    for (const [id, visible] of visibility) controller.setLayerVisible(id, visible)
  }
  const renderLayers = (): void => {
    layerEditor.replaceChildren()
    layerOrder.forEach((id, index) => {
      const row = document.createElement('div')
      row.className = 'layer-row'
      row.dataset.layerId = id
      const title = document.createElement('span')
      title.textContent = `${String(index + 1).padStart(2, '0')} · ${labelFor(id)}`
      const toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.dataset.layerToggle = id
      toggle.textContent = visibility.get(id) === false ? '隐藏' : '显示'
      toggle.addEventListener('click', () => {
        visibility.set(id, visibility.get(id) === false)
        applyLayers(); renderLayers()
      })
      const up = document.createElement('button')
      up.type = 'button'; up.dataset.layerUp = id; up.textContent = '↑'; up.disabled = index === 0
      up.addEventListener('click', () => {
        if (index === 0) return
        ;[layerOrder[index - 1], layerOrder[index]] = [layerOrder[index]!, layerOrder[index - 1]!]
        applyLayers(); renderLayers()
      })
      const down = document.createElement('button')
      down.type = 'button'; down.dataset.layerDown = id; down.textContent = '↓'; down.disabled = index === layerOrder.length - 1
      down.addEventListener('click', () => {
        if (index >= layerOrder.length - 1) return
        ;[layerOrder[index], layerOrder[index + 1]] = [layerOrder[index + 1]!, layerOrder[index]!]
        applyLayers(); renderLayers()
      })
      row.append(title, toggle, up, down)
      layerEditor.append(row)
    })
  }
  resetLayers?.addEventListener('click', () => {
    layerOrder = [...defaultSeeThroughLayerOrder]
    for (const id of defaultSeeThroughLayerOrder) visibility.set(id, true)
    controller.resetLayerOrder(); renderLayers()
  })
  renderLayers()
}

const blinkValue = document.querySelector<HTMLOutputElement>('#blink-value')!
const gazeValue = document.querySelector<HTMLOutputElement>('#gaze-value')!
const gestureValue = document.querySelector<HTMLOutputElement>('#gesture-value')!
const gestureLabels: Record<SeeThroughGesture, string> = { none: '待机', wave: '挥手', nod: '点头', tilt: '歪头' }
function updateReadout(): void {
  const state = controller.getState()
  blinkValue.textContent = state.blink.toFixed(2)
  gazeValue.textContent = `${state.gazeX.toFixed(2)}, ${state.gazeY.toFixed(2)}`
  gestureValue.textContent = gestureLabels[state.gesture]
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-gesture]')) button.dataset.active = String(button.dataset.gesture === state.gesture)
  requestAnimationFrame(updateReadout)
}
updateReadout()
