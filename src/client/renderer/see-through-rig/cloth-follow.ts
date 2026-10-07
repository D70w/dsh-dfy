const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v))
  return t * t * (3 - 2 * t)
}

/** Four continuous columns, not four cut images. Shared by skirt and apron. */
export function clothOffset(u: number, v: number, middle: readonly number[], hem: readonly number[], pressure?: readonly number[]) {
  const column = Math.max(0, Math.min(3, u * 3))
  const index = Math.min(2, Math.floor(column))
  const blend = smooth(column - index)
  const sample = (values: readonly number[]) => values[index]! * (1 - blend) + values[index + 1]! * blend
  const root = smooth((v - .08) / .3)
  const lower = smooth((v - .4) / .6)
  const mid = sample(middle)
  const tip = sample(hem)
  const wind = pressure ? sample(pressure) : 0
  const depth = Math.max(0, Math.min(1, v))
  // Bow the belly before the hem follows; lift the windward edge, not the whole skirt.
  const belly = Math.sin(depth * Math.PI) ** 2
  const edge = .45 + .55 * (wind >= 0 ? 1 - u : u)
  return {
    x: root * (mid * (1 - lower) * .65 + tip * lower * 1.35 + wind * belly * .75),
    y: -root * (lower * Math.abs(tip - mid) * .16 + Math.abs(wind) * (belly * .35 + lower * edge * .7)),
  }
}

/** Sleeve fabric only: zero at elbow and cuff so attachment edges cannot drift. */
export function sleeveFollow(along: number, lag: number) {
  const t = Math.max(0, Math.min(1, (along - 170) / 65))
  return Math.sin(t * Math.PI) ** 2 * Math.max(-2, Math.min(2, lag * .22))
}
