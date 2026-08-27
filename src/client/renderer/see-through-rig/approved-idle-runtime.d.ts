export type ApprovedExpression = 'neutral' | 'smug' | 'happy'
export type ApprovedGesture = 'none' | 'wave' | 'nod' | 'tilt'
export type ApprovedEmotion =
  | 'neutral' | 'love' | 'shy' | 'angry' | 'surprise' | 'sad' | 'happy'
  | 'confused' | 'pout' | 'sleepy' | 'proud' | 'excited' | 'mischievous'
  | 'relieved' | 'determined' | 'nervous' | 'hungry'

export interface ApprovedIdleRigOptions {
  assetBaseUrl: string
  outputSize?: number
  transparentBackground?: boolean
  reducedMotion?: boolean
}

export interface ApprovedIdleRigController {
  setPointer(x: number, y: number): void
  setExternalMotion(x: number, y: number): void
  setGrabPoint(x: number, y: number): void
  setGrabbed(value: boolean): void
  setExpression(value: ApprovedExpression): void
  playGesture(value: Exclude<ApprovedGesture, 'none'>): void
  stopGesture(): void
  setGestureSpeed(value: number): void
  setBreathing(value: boolean): void
  setBlinking(value: boolean): void
  triggerBlink(): void
  triggerPetReaction(xRatio?: number): void
  setAffectionBlush(level: number, holdMs?: number): void
  playEmotion(name: ApprovedEmotion, durationMs?: number): void
  setSecondaryMotion(value: boolean): void
  setReducedMotion(value: boolean): void
  setMotionIntensity(value: number): void
  setDebug(value: boolean): void
  getState(): Readonly<{
    expression: ApprovedExpression
    gesture: ApprovedGesture
    gestureSpeed: number
    blink: number
    gazeX: number
    gazeY: number
    grabPointX: number
    grabPointY: number
  }>
  dispose(): void
}

export function createSeeThroughIdleRig(
  canvas: HTMLCanvasElement,
  options: ApprovedIdleRigOptions,
): Promise<ApprovedIdleRigController>

export const seeThroughBoneOptions: ReadonlyArray<Readonly<{ id: string; label: string }>>
