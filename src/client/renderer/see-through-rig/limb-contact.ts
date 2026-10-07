type Point = { x: number; y: number }
const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x)
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)
const clamp = (v: number) => Math.max(-1, Math.min(1, v))
const wrap = (v: number) => Math.atan2(Math.sin(v), Math.cos(v))

/** Two rigid links: retain bind lengths and knee bend direction, even at full reach. */
export function solveLegContact(hip: Point, knee: Point, ankle: Point, target: Point, bendDirection?: -1 | 1) {
  const upperLength = distance(hip, knee)
  const lowerLength = distance(knee, ankle)
  const reach = Math.max(Math.abs(upperLength - lowerLength) + .0001,
    Math.min(upperLength + lowerLength, distance(hip, target)))
  const bendSign = bendDirection ?? (Math.sign((knee.x - hip.x) * (ankle.y - knee.y) -
    (knee.y - hip.y) * (ankle.x - knee.x)) || 1)
  const bend = bendSign * Math.acos(clamp((reach * reach - upperLength ** 2 - lowerLength ** 2) / (2 * upperLength * lowerLength)))
  const upperAngle = angle(hip, target) - Math.atan2(lowerLength * Math.sin(bend), upperLength + lowerLength * Math.cos(bend))
  const upper = wrap(upperAngle - angle(hip, knee))
  const lower = wrap(upperAngle + bend - angle(knee, ankle) - upper)
  return { upper: upper * 180 / Math.PI, lower: lower * 180 / Math.PI }
}
