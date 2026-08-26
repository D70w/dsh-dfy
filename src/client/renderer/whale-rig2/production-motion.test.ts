import { describe, expect, it } from 'vitest'
import { ProductionMotionStateMachine, sampleProductionMotion } from './production-motion.ts'

const idlePerformance = { clip: undefined, clipElapsedMs: 0, facing: 'left' as const, offset: { x: 0, y: 0 } }
const runPerformance = { clip: 'run' as const, clipElapsedMs: 0, facing: 'left' as const, offset: { x: 0, y: 0 } }

describe('WhaleRig2 production motion state machine', () => {
  it('uses the realtime run cycle without frame indices', () => {
    const contact = sampleProductionMotion('idle', runPerformance, 0)
    const opposite = sampleProductionMotion('idle', { ...runPerformance, clipElapsedMs: 450 }, 450)
    expect(contact.legs.near[0]).toBeGreaterThan(0)
    expect(opposite.legs.near[0]).toBeLessThan(0)
    expect(contact.body.nearUpperArmDeg).toBeGreaterThan(0)
    expect(opposite.body.nearUpperArmDeg).toBeLessThan(0)
  })

  it('cross-fades named states for 180ms and then samples exactly', () => {
    const machine = new ProductionMotionStateMachine()
    const idle = machine.sample('idle', idlePerformance, 0)
    const entering = machine.sample('working', idlePerformance, 10)
    const settled = machine.sample('working', idlePerformance, 200)
    expect(entering.body.leanDeg).not.toBe(-1.4)
    expect(settled.body.leanDeg).toBe(-1.4)
    expect(idle.legs.near).toEqual([0, 0, 0])
  })
})
