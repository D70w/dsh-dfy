export interface IdleMotionSample {
  breath: number
  headX: number
  headY: number
  headRotationDeg: number
}

export function clampPointer(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

export function blinkOpenness(elapsedMs: number, durationMs = 150): number {
  if (elapsedMs < 0 || elapsedMs >= durationMs) return 1
  const phase = elapsedMs / durationMs
  if (phase < 0.42) return 1 - phase / 0.42
  return (phase - 0.42) / 0.58
}

export function sampleIdleMotion(nowMs: number, pointerX: number, pointerY: number, breathing = true): IdleMotionSample {
  const breath = breathing ? (1 - Math.cos(nowMs / 3800 * Math.PI * 2)) * 0.5 : 0
  const x = clampPointer(pointerX)
  const y = clampPointer(pointerY)
  return {
    breath,
    headX: x * 7,
    headY: y * 3.5 - breath * 1.1,
    headRotationDeg: x * 2.1,
  }
}
