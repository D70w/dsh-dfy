import type { ParameterValues } from './motion.ts'
import type { WhalePhysics } from './schema.ts'

interface SpringState {
  value: number
  velocity: number
}

/** Small fixed-step damped spring system; it is not a general physics engine. */
export class BoundedSpringSystem {
  private readonly states = new Map<string, SpringState>()

  constructor(private readonly physics: WhalePhysics) {}

  reset(values: ParameterValues): void {
    this.states.clear()
    for (const spring of this.physics.springs) {
      const target = Math.min(spring.maxOffset, Math.max(-spring.maxOffset, values[spring.input] ?? 0))
      this.states.set(spring.id, { value: target, velocity: 0 })
      values[spring.output] = target
    }
  }

  step(values: ParameterValues, seconds: number): void {
    for (const spring of this.physics.springs) {
      const target = values[spring.input] ?? 0
      const state = this.states.get(spring.id) ?? { value: target, velocity: 0 }
      const acceleration = spring.stiffness * (target - state.value) - spring.damping * state.velocity
      state.velocity += acceleration * seconds
      state.value += state.velocity * seconds
      if (!Number.isFinite(state.value) || !Number.isFinite(state.velocity)) {
        state.value = target
        state.velocity = 0
      }
      state.value = Math.min(spring.maxOffset, Math.max(-spring.maxOffset, state.value))
      this.states.set(spring.id, state)
      values[spring.output] = state.value
    }
  }
}
