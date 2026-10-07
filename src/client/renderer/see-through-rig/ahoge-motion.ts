/** Independent acting for the original ahoge texture; angles remain bounded. */
export function sampleAhogeActing(name: string, elapsedMs: number, weight: number) {
  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) / 1000 : 0
  const w = Math.max(0, Math.min(1, weight))
  let root = 0, tip = 0
  switch (name) {
    case 'happy': case 'excited': case 'workSuccess':
      root = -4 + Math.sin(t * 8) * 5 * Math.exp(-t * .7)
      tip = -8 + Math.sin(t * 8 - .7) * 12 * Math.exp(-t * .55)
      break
    case 'confused': root = 9; tip = 18 + Math.sin(t * 2.8) * 3; break
    case 'sad': case 'pout': case 'workError': root = 10; tip = 28; break
    case 'sleepy': root = 8; tip = 22 + Math.sin(t * 1.8) * 3; break
    case 'angry': root = -8; tip = -16 + Math.sin(t * 9) * 3 * Math.exp(-t); break
    case 'surprise': root = -5; tip = -22 * Math.exp(-t * .45); break
    case 'shy': case 'love': root = 5; tip = 10 + Math.sin(t * 3.4) * 4; break
    case 'nervous': root = 4; tip = Math.sin(t * 6) * 7; break
    case 'determined': root = -5; tip = -9; break
  }
  return { root: root * w, tip: tip * w }
}

/** Continuous bend, pinned to the crown; the loop keeps its authored texture. */
export function deformAhoge(x: number, y: number, bendDegrees: number) {
  const length = Math.max(0, 151 - y)
  if (length === 0) return { x: 0, y: 0 }
  const progress = Math.min(1, length / 142)
  const angle = Math.max(-38, Math.min(38, bendDegrees)) * Math.PI / 180 * progress
  return {
    x: Math.sin(angle) * length * .8,
    y: (1 - Math.cos(angle)) * length + Math.abs(bendDegrees) * .2 * progress * progress,
  }
}
