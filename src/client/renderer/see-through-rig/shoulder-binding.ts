/** Distance along the arm, not screen X: the entire sewn root follows the chest. */
export function shoulderFreedom(along: number): number {
  const t = Math.max(0, Math.min(1, (along - 28) / 74))
  return t * t * (3 - 2 * t)
}
