import type { WhaleAction } from '../../../behavior.ts'
import type { CharacterMotionPose } from '../../character-motion.ts'
import {
  sampleBodyStepCycle,
  sampleLegStepCycle,
  type BodyMotionPose,
  type LegStepPose,
} from './mesh-skinning-preview.ts'

export interface ProductionMotionFrame {
  legs: LegStepPose
  body: BodyMotionPose
}

const bindLegs = (): LegStepPose => ({ near: [0, 0, 0], far: [0, 0, 0], hipOffsets: [0, 0, 0, 0] })

function body(overrides: Partial<BodyMotionPose>): BodyMotionPose {
  return {
    bounceY: 0, leanDeg: 0, headCounterDeg: 0,
    nearUpperArmDeg: 0, nearForearmDeg: 0, nearWristDeg: 0,
    farUpperArmDeg: 0, farForearmDeg: 0, farWristDeg: 0,
    ...overrides,
  }
}

function idleBody(now: number, alert = false): BodyMotionPose {
  const phase = now / (alert ? 420 : 580)
  const wave = Math.sin(phase)
  return body({
    bounceY: -0.75 - wave * 0.65,
    leanDeg: wave * 0.35,
    headCounterDeg: -wave * 0.42,
    nearUpperArmDeg: wave * 0.8,
    nearForearmDeg: -wave * 0.35,
    farUpperArmDeg: -wave * 0.6,
    farForearmDeg: wave * 0.3,
  })
}

export function sampleProductionMotion(action: WhaleAction, performance: CharacterMotionPose, now: number, runDurationMs = 900): ProductionMotionFrame {
  if (performance.clip === 'run') {
    return {
      legs: sampleLegStepCycle(performance.clipElapsedMs, runDurationMs),
      body: sampleBodyStepCycle(performance.clipElapsedMs, runDurationMs),
    }
  }
  if (performance.clip === 'ready') return { legs: bindLegs(), body: idleBody(now, true) }

  const phase = now / 260
  const wave = Math.sin(phase)
  switch (action) {
    case 'working':
      return { legs: bindLegs(), body: body({ bounceY: -1.2 - Math.sin(now / 430) * 0.5, leanDeg: -1.4, headCounterDeg: 1.2, nearUpperArmDeg: 2.5 + wave, nearForearmDeg: -2, farUpperArmDeg: -1.5 - wave * 0.6, farForearmDeg: 1.2 }) }
    case 'tool':
      return { legs: bindLegs(), body: body({ bounceY: -1.4 - Math.sin(now / 310) * 0.7, leanDeg: -1.8, headCounterDeg: 1.5, nearUpperArmDeg: 4 + wave * 1.4, nearForearmDeg: -3.5, nearWristDeg: wave, farUpperArmDeg: -2.5 - wave, farForearmDeg: 2 }) }
    case 'smug': {
      const hop = Math.max(0, Math.sin(now / 180))
      return { legs: bindLegs(), body: body({ bounceY: -hop * 4.2, leanDeg: -1.2, headCounterDeg: 1.6, nearUpperArmDeg: 4 + hop * 4, nearForearmDeg: -3, farUpperArmDeg: -4 - hop * 3, farForearmDeg: 2.5 }) }
    }
    case 'denying':
      return { legs: bindLegs(), body: body({ bounceY: -0.4, leanDeg: wave * 2.6, headCounterDeg: -wave * 2.2, nearUpperArmDeg: wave * 2, farUpperArmDeg: -wave * 2 }) }
    case 'dragging':
      return { legs: bindLegs(), body: body({ bounceY: -1, leanDeg: 1.2, headCounterDeg: -1, nearUpperArmDeg: 5, nearForearmDeg: -5, farUpperArmDeg: -5, farForearmDeg: 4 }) }
    case 'petting':
    case 'feeding': {
      const happy = Math.max(0, Math.sin(now / 150))
      return { legs: bindLegs(), body: body({ bounceY: -happy * 3, leanDeg: -0.8, headCounterDeg: 1.1, nearUpperArmDeg: 3 + happy * 3, nearForearmDeg: -2, farUpperArmDeg: -3 - happy * 2, farForearmDeg: 2 }) }
    }
    case 'idle':
      return { legs: bindLegs(), body: idleBody(now) }
  }
}

function mix(left: number, right: number, amount: number): number { return left + (right - left) * amount }
function mixTuple(left: readonly number[], right: readonly number[], amount: number): number[] { return left.map((value, index) => mix(value, right[index]!, amount)) }

export function blendProductionFrames(left: ProductionMotionFrame, right: ProductionMotionFrame, amount: number): ProductionMotionFrame {
  const eased = Math.max(0, Math.min(1, amount)) ** 2 * (3 - 2 * Math.max(0, Math.min(1, amount)))
  const bodyKeys = Object.keys(left.body) as Array<keyof BodyMotionPose>
  const mixedBody = Object.fromEntries(bodyKeys.map(key => [key, mix(left.body[key], right.body[key], eased)])) as unknown as BodyMotionPose
  return {
    legs: {
      near: mixTuple(left.legs.near, right.legs.near, eased) as [number, number, number],
      far: mixTuple(left.legs.far, right.legs.far, eased) as [number, number, number],
      hipOffsets: mixTuple(left.legs.hipOffsets, right.legs.hipOffsets, eased) as [number, number, number, number],
    },
    body: mixedBody,
  }
}

/** Cross-fades only when the named state changes; normal run samples stay exact. */
export class ProductionMotionStateMachine {
  private key: string | undefined
  private transitionStartedAt = 0
  private transitionFrom: ProductionMotionFrame | undefined
  private output: ProductionMotionFrame | undefined

  sample(action: WhaleAction, performance: CharacterMotionPose, now: number, runDurationMs = 900): ProductionMotionFrame {
    const nextKey = performance.clip ?? action
    const target = sampleProductionMotion(action, performance, now, runDurationMs)
    if (this.key === undefined) {
      this.key = nextKey
      this.output = target
      return target
    }
    if (nextKey !== this.key) {
      this.key = nextKey
      this.transitionStartedAt = now
      this.transitionFrom = this.output ?? target
    }
    if (this.transitionFrom !== undefined) {
      const progress = (now - this.transitionStartedAt) / 180
      this.output = blendProductionFrames(this.transitionFrom, target, progress)
      if (progress >= 1) this.transitionFrom = undefined
      return this.output
    }
    this.output = target
    return target
  }
}

