const ease = (value: number): number => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Round the start of a bend without activating the planted side or changing peaks. */
export function softBend(value: number): number {
  if (value <= 0) return 0
  const ramp = .18
  if (value >= ramp) return value
  const t = value / ramp
  return ramp * t * t * (2 - t)
}

/** A short look, a readable hold, then a return to the viewer. */
export function sampleIdleAttention(elapsedMs: number): { x: number; y: number } {
  const cycle = Math.floor(Math.max(0, elapsedMs) / 12_000)
  const phase = Math.max(0, elapsedMs) % 12_000
  const targets = [[0.46, -0.12], [-0.38, 0.16], [0.25, 0.2], [-0.44, -0.1]] as const
  const target = targets[cycle % targets.length]!
  const weight = ease((phase - 2_200) / 520) * (1 - ease((phase - 5_400) / 850))
  return { x: target[0] * weight, y: target[1] * weight }
}

/** Hold eye contact after movement; a parked pointer must not lock the gaze forever. */
export function pointerAttentionWeight(nowMs: number, lastInputMs: number): number {
  return 1 - ease((nowMs - lastInputMs - 2_800) / 1_600)
}

/** Cloth inherits the same weight shift later, rather than fighting a separate cycle. */
export function sampleIdleSway(elapsedMs: number): { body: number; follow: number; cloth: number; accent: number } {
  const accentAt = (time: number): number => {
    const safeTime = Math.max(0, time)
    const cycle = Math.floor(safeTime / 6_500)
    const phase = safeTime % 6_500 / 6_500
    // Cubed sine keeps acceleration continuous when this occasional lean starts/stops.
    return phase > .57 ? (cycle % 2 === 0 ? 1 : -1) * Math.sin((phase - .57) / .43 * Math.PI) ** 3 : 0
  }
  const bodyAt = (time: number): number => Math.sin(time / 1_380) + accentAt(time) * .85
  return {
    body: bodyAt(elapsedMs),
    follow: bodyAt(elapsedMs - 340),
    cloth: bodyAt(elapsedMs - 650),
    accent: accentAt(elapsedMs),
  }
}

/** A broad breeze with quiet tip flutter, instead of several competing fast waves. */
export function sampleIdleWind(elapsedMs: number) {
  const envelope = .78 + Math.sin(elapsedMs / 2050 + .4) * .22
  return {
    wave: (Math.sin(elapsedMs / 560 + .2) * 1.8 + Math.sin(elapsedMs / 940 + 1.15) * .35) * envelope,
    flutter: (Math.sin(elapsedMs / 230 + .65) * .3 + Math.sin(elapsedMs / 157 + 2.1) * .1) * envelope,
  }
}

/** Articulated response to the same weight shift, not independent limb loops. */
export function sampleIdleArticulation(elapsedMs: number, strength: number) {
  const sway = sampleIdleSway(elapsedMs)
  const delayed = sampleIdleSway(elapsedMs - 160)
  const gain = Math.max(0, Math.min(1.5, strength))
  const inertia = (sway.body - sway.follow) * gain
  const trailing = (delayed.body - delayed.follow) * gain
  return {
    armLeft: -inertia * 3.4,
    armRight: -trailing * 2.7,
    // Small local knee angles; no whole-leg scaling or extra gait cycle.
    stanceLeft: -sway.body * gain * .8,
    stanceRight: -sway.body * gain * .68,
    kneeLeft: softBend(sway.body) * gain * 1.4,
    kneeRight: -softBend(-sway.body) * gain * 1.2,
  }
}

/** Relax one elbow as weight moves to that side; the other arm stays quieter. */
export function sampleIdleElbows(elapsedMs: number, strength: number) {
  const gain = Math.max(0, Math.min(1, strength))
  const sway = sampleIdleSway(elapsedMs)
  return {
    left: (5 + 19 * softBend(sway.follow / 1.85)) * gain,
    right: -(4 + 17 * softBend(-sway.cloth / 1.85)) * gain,
  }
}
