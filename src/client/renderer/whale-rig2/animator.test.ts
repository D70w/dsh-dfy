import { describe, expect, it } from 'vitest'
import type { BoneDef, Clip } from './types.ts'
import { Animator } from './animator.ts'

const bones: BoneDef[] = [{ id: 'root', parent: null, length: 1 }]
const clip: Clip = {
  id: 'clock-test',
  durationMs: 900,
  loop: true,
  channels: [{
    bone: 'root',
    property: 'angle',
    curve: { interpolation: 'linear', keyframes: [{ t: 0, value: 0 }, { t: 900, value: 90 }] },
  }],
}

describe('Animator', () => {
  it('changes speed without changing animation data', () => {
    const animator = new Animator(clip, bones)
    animator.speed = 0.5
    animator.update(300)
    expect(animator.timeMs).toBe(150)
    animator.speed = 1.7
    animator.update(100)
    expect(animator.timeMs).toBe(320)
  })

  it('retimes a clip while preserving phase', () => {
    const animator = new Animator(clip, bones)
    animator.seek(450)
    animator.durationMs = 1_600
    expect(animator.timeMs).toBe(800)
    expect(animator.sample().root?.angle).toBeCloseTo(45)
  })

  it('speed zero freezes the primary clock', () => {
    const animator = new Animator(clip, bones)
    animator.seek(200)
    animator.speed = 0
    animator.update(1_000)
    expect(animator.timeMs).toBe(200)
  })
})
