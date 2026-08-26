import type { Vec2 } from './types.ts'

export interface SpringParameters {
  stiffness: number
  damping: number
  maxOffset: number
}

export interface GridMesh {
  readonly columns: number
  readonly rows: number
  readonly positions: Float32Array
  readonly uvs: Float32Array
  readonly output: Float32Array
}

const MAX_FRAME_SECONDS = 1 / 20
const FIXED_STEP_SECONDS = 1 / 120

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function smoothstep(value: number): number {
  const clamped = clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

/** Small deterministic damped spring used after the primary animation pose. */
export class SpringValue {
  value = 0
  velocity = 0

  constructor(public parameters: SpringParameters) {}

  reset(value = 0): void {
    this.value = value
    this.velocity = 0
  }

  step(target: number, deltaMs: number): number {
    let remaining = clamp(deltaMs / 1000, 0, MAX_FRAME_SECONDS)
    const boundedTarget = clamp(target, -this.parameters.maxOffset, this.parameters.maxOffset)
    while (remaining > 0) {
      const seconds = Math.min(FIXED_STEP_SECONDS, remaining)
      const acceleration = this.parameters.stiffness * (boundedTarget - this.value) - this.parameters.damping * this.velocity
      this.velocity += acceleration * seconds
      this.value += this.velocity * seconds
      this.value = clamp(this.value, -this.parameters.maxOffset, this.parameters.maxOffset)
      remaining -= seconds
    }
    if (!Number.isFinite(this.value) || !Number.isFinite(this.velocity)) this.reset(boundedTarget)
    return this.value
  }
}

export function createGridMesh(bounds: readonly [number, number, number, number], columns: number, rows: number): GridMesh {
  if (columns < 2 || rows < 2) throw new Error('whale-rig2: flexible mesh needs at least 2×2 vertices')
  const [left, top, right, bottom] = bounds
  const positions = new Float32Array(columns * rows * 2)
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const index = (row * columns + column) * 2
    positions[index] = left + (right - left) * column / (columns - 1)
    positions[index + 1] = top + (bottom - top) * row / (rows - 1)
  }
  return { columns, rows, positions, uvs: new Float32Array(positions), output: new Float32Array(positions) }
}

function rotateAround(point: Vec2, pivot: Vec2, degrees: number): Vec2 {
  const radians = degrees * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const x = point.x - pivot.x
  const y = point.y - pivot.y
  return { x: pivot.x + x * cosine - y * sine, y: pivot.y + x * sine + y * cosine }
}

/** Horizontal chain bend: the root stays fixed and curvature grows toward the tip. */
export function deformHorizontalChain(mesh: GridMesh, pivot: Vec2, endX: number, degrees: number): Float32Array {
  const span = Math.max(1, endX - pivot.x)
  for (let vertex = 0; vertex < mesh.positions.length / 2; vertex += 1) {
    const x = mesh.positions[vertex * 2]!
    const y = mesh.positions[vertex * 2 + 1]!
    const influence = smoothstep((x - pivot.x) / span)
    const curved = rotateAround({ x, y }, pivot, degrees * influence)
    mesh.output[vertex * 2] = curved.x
    mesh.output[vertex * 2 + 1] = curved.y
  }
  return mesh.output
}

/** Radial soft bend for a tuft rooted at one point (hair lock or ahoge). */
export function deformRootedTuft(mesh: GridMesh, pivot: Vec2, reach: number, degrees: number): Float32Array {
  const safeReach = Math.max(1, reach)
  for (let vertex = 0; vertex < mesh.positions.length / 2; vertex += 1) {
    const x = mesh.positions[vertex * 2]!
    const y = mesh.positions[vertex * 2 + 1]!
    const influence = smoothstep(Math.hypot(x - pivot.x, y - pivot.y) / safeReach)
    const curved = rotateAround({ x, y }, pivot, degrees * influence)
    mesh.output[vertex * 2] = curved.x
    mesh.output[vertex * 2 + 1] = curved.y
  }
  return mesh.output
}

