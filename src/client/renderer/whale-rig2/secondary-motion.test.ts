import { describe, expect, it } from 'vitest'
import { createGridMesh, deformHorizontalChain, deformRootedTuft, SpringValue } from './secondary-motion.ts'

describe('WhaleRig2 secondary motion', () => {
  it('continues after the target stops and then settles', () => {
    const spring = new SpringValue({ stiffness: 90, damping: 14, maxOffset: 18 })
    for (let frame = 0; frame < 20; frame += 1) spring.step(12, 1000 / 60)
    const movingValue = spring.value
    spring.step(0, 1000 / 60)
    expect(spring.value).not.toBe(0)
    expect(spring.value).not.toBe(movingValue)
    for (let frame = 0; frame < 300; frame += 1) spring.step(0, 1000 / 60)
    expect(Math.abs(spring.value)).toBeLessThan(0.001)
    expect(Math.abs(spring.velocity)).toBeLessThan(0.001)
  })

  it('is stable for large frame gaps and runtime parameter changes', () => {
    const spring = new SpringValue({ stiffness: 80, damping: 12, maxOffset: 15 })
    spring.step(1000, 1000)
    expect(Number.isFinite(spring.value)).toBe(true)
    expect(Math.abs(spring.value)).toBeLessThanOrEqual(15)
    spring.parameters = { stiffness: 160, damping: 24, maxOffset: 8 }
    spring.step(-1000, 1000)
    expect(Math.abs(spring.value)).toBeLessThanOrEqual(8)
  })

  it('keeps mesh roots fixed while moving flexible tips', () => {
    const tail = createGridMesh([560, 548, 952, 836], 9, 5)
    const tailOutput = deformHorizontalChain(tail, { x: 560, y: 720 }, 952, 12)
    expect(tailOutput[0]).toBeCloseTo(tail.positions[0]!, 4)
    expect(tailOutput[1]).toBeCloseTo(tail.positions[1]!, 4)
    expect(tailOutput.at(-1)).not.toBeCloseTo(tail.positions.at(-1)!, 2)

    const ahoge = createGridMesh([293, 10, 415, 99], 7, 6)
    const tuftOutput = deformRootedTuft(ahoge, { x: 372, y: 96 }, 120, -8)
    expect(tuftOutput).not.toEqual(ahoge.positions)
  })
})
