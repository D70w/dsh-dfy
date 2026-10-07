const bounded = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v))

/** Child rotations are local: parent travel is inherited already, not added twice. */
export function forearmInertia(upperVelocity: number, force: number, side: 'left' | 'right') {
  const lag = side === 'left' ? .19 : .15
  return bounded(-upperVelocity * lag + force * .25, 9)
}

/** Palm trails angular travel, then relaxes slightly relative to a held elbow bend. */
export function palmInertia(upperVelocity: number, forearmVelocity: number, elbowVelocity: number, elbowAngle: number, side: 'left' | 'right') {
  const lag = side === 'left' ? .16 : .13
  return bounded(-(upperVelocity + forearmVelocity + elbowVelocity) * lag - elbowAngle * .18, 8)
}
