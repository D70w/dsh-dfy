/** Small, finite acting phrases in design pixels/degrees, not perpetual shaking. */
const phrases = {
  love: [-1.8, -1.2, .8, 1.2, 700], shy: [1.2, -1.5, -.6, 1.5, 850],
  angry: [-1, 0, 1.2, -1.5, 390], surprise: [-3.2, -.5, -1.3, -2.2, 280],
  sad: [2.2, .7, -.8, 2, 1100], happy: [-2.8, -1.3, 1.2, -1.8, 460],
  confused: [.4, 2.2, -.7, .8, 740], pout: [1.4, -1.2, -.8, 1.4, 800],
  sleepy: [3, -1.6, -1, 2, 1400], proud: [-1.4, 1.5, 1.1, -1.4, 600],
  excited: [-3, .8, 1.4, -2, 400], mischievous: [-.8, -1.8, .7, -.8, 580],
  relieved: [1.6, -.6, -1.2, 2.3, 1150], determined: [1.2, 0, 1, -1.3, 470],
  nervous: [.7, .8, -.6, -1.4, 720], hungry: [-1.2, -1.3, 1, -.9, 660],
  workSuccess: [-.7, -.5, .4, -.6, 660], workError: [1, .5, -.4, .8, 900],
} as const
export function sampleEmotionFollowThrough(name: string, elapsed: number, duration: number) {
  const zero = {headY:0,headRotation:0,chestRotation:0,shoulderLeftY:0,shoulderRightY:0}
  const p = phrases[name as keyof typeof phrases]
  if (!p || !Number.isFinite(elapsed) || !Number.isFinite(duration) || elapsed <= 0 || duration <= 0 || elapsed >= duration) return zero
  const beat = (delay:number) => {
    const t = (elapsed-delay)/Math.min(p[4],duration*.65)
    return t<=0 || t>=1 ? 0 : Math.sin(Math.PI*t)**2
  }
  // Eyes establish intent first; torso and cuffs settle later. No ringing loop.
  return {headY:p[0]*beat(120),headRotation:p[1]*beat(160),chestRotation:p[2]*beat(230),
    shoulderLeftY:p[3]*beat(270),shoulderRightY:p[3]*beat(330)*.86}
}
