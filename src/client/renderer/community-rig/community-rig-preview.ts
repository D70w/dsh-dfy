import { createCommunityIdleRig, type CommunityExpression } from './community-idle-rig.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#rig-canvas')!
const structuralAtlasUrl = '../../character-packs/default-whale/source/community-idle-rig-v1/structural-atlas.png'
const facialAtlasUrl = '../../character-packs/default-whale/source/community-idle-rig-v1/facial-atlas.png'

const controller = await createCommunityIdleRig(canvas, { structuralAtlasUrl, facialAtlasUrl, outputSize: 720 })
const status = document.querySelector<HTMLElement>('#status')!
const blinkValue = document.querySelector<HTMLElement>('#blink-value')!
const gazeValue = document.querySelector<HTMLElement>('#gaze-value')!

function pointer(event: PointerEvent): void {
  const bounds = canvas.getBoundingClientRect()
  controller.setPointer((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1)
}
canvas.addEventListener('pointermove', pointer)
canvas.addEventListener('pointerleave', () => controller.setPointer(0, 0))

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-expression]')) button.addEventListener('click', () => {
  const expression = button.dataset.expression as CommunityExpression
  controller.setExpression(expression)
  for (const current of document.querySelectorAll<HTMLButtonElement>('[data-expression]')) current.dataset.active = String(current === button)
})

document.querySelector<HTMLButtonElement>('#blink-now')!.addEventListener('click', () => controller.triggerBlink())
for (const [id, setter] of [
  ['breathing', (value: boolean) => controller.setBreathing(value)],
  ['blinking', (value: boolean) => controller.setBlinking(value)],
  ['secondary', (value: boolean) => controller.setSecondaryMotion(value)],
  ['reduced', (value: boolean) => controller.setReducedMotion(value)],
  ['debug', (value: boolean) => controller.setDebug(value)],
] as const) document.querySelector<HTMLInputElement>(`#${id}`)!.addEventListener('change', event => setter((event.currentTarget as HTMLInputElement).checked))

function updateReadout(): void {
  const state = controller.getState()
  status.textContent = state.expression === 'neutral' ? '待机' : state.expression === 'smug' ? '得意' : '开心'
  blinkValue.textContent = state.blink.toFixed(2)
  gazeValue.textContent = `${state.gazeX.toFixed(2)}, ${state.gazeY.toFixed(2)}`
  requestAnimationFrame(updateReadout)
}
updateReadout()
