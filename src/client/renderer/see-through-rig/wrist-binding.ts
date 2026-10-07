/** A narrow forearm-to-palm transition; never rotate the sleeve with the wrist. */
export function wristWeight(x: number, y: number, side: 'left' | 'right'): number {
  const wristX = side === 'left' ? 426 : 831
  const axisX = side === 'left' ? -124 : 124
  const along = ((x - wristX) * axisX + (y - 775) * 227) / Math.hypot(124, 227)
  const t = Math.max(0, Math.min(1, along / 22))
  return t * t * (3 - 2 * t)
}
