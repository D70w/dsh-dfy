import { describe, expect, it } from 'vitest'
import { pointerAttentionWeight, sampleIdleAttention, sampleIdleSway, sampleIdleArticulation, sampleIdleElbows, softBend, sampleIdleWind } from './idle-presence.ts'

describe('idle presence', () => {
  it('keeps breeze visible and flutter bounded without sharp per-frame changes', () => {
    let peak = 0
    for (let time = 0; time < 60_000; time += 16) {
      const wind = sampleIdleWind(time)
      const previous = sampleIdleWind(time - 16)
      peak = Math.max(peak, Math.abs(wind.wave))
      expect(Math.abs(wind.wave)).toBeLessThanOrEqual(2.15)
      expect(Math.abs(wind.flutter)).toBeLessThanOrEqual(.4)
      expect(Math.abs(wind.wave - previous.wave)).toBeLessThan(.07)
      expect(Math.abs(wind.flutter - previous.flutter)).toBeLessThan(.04)
    }
    expect(peak).toBeGreaterThan(1.5)
  })
  it('rounds bend onset with a continuous velocity and preserves full amplitude', () => {
    expect(softBend(-1)).toBe(0)
    expect(softBend(0)).toBe(0)
    expect(softBend(1)).toBe(1)
    const h = 1e-6
    expect(softBend(h) / h).toBeLessThan(.001)
    expect((softBend(.18) - softBend(.18 - h)) / h).toBeCloseTo(1, 4)
    for (let x = 0; x < .18; x += .001) {
      expect(softBend(x)).toBeGreaterThanOrEqual(0)
      expect(softBend(x)).toBeLessThanOrEqual(x)
    }
  })
  it('gives elbows visible, non-mirrored flexion and restores the bind when disabled', () => {
    let leftPeak=0, rightPeak=0, different=false
    for(let time=0;time<30000;time+=37) {
      const pose=sampleIdleElbows(time,1)
      expect(pose.left).toBeGreaterThanOrEqual(5)
      expect(pose.left).toBeLessThanOrEqual(24)
      expect(pose.right).toBeLessThanOrEqual(-4)
      expect(pose.right).toBeGreaterThanOrEqual(-21)
      expect(Math.abs(pose.left-sampleIdleElbows(time-1,1).left)).toBeLessThan(.05)
      expect(Math.abs(sampleIdleElbows(time,0).left)).toBe(0)
      expect(Math.abs(sampleIdleElbows(time,0).right)).toBe(0)
      leftPeak=Math.max(leftPeak,pose.left)
      rightPeak=Math.max(rightPeak,-pose.right)
      different ||= Math.abs(pose.left+pose.right)>10
    }
    expect(leftPeak).toBeGreaterThan(15)
    expect(rightPeak).toBeGreaterThan(13)
    expect(different).toBe(true)
  })
  it('drives different arms and alternating knee flexion from the same shift', () => {
    let different = false
    for (let time = 0; time < 30_000; time += 31) {
      const pose = sampleIdleArticulation(time, 1)
      const previous = sampleIdleArticulation(time - 1, 1)
      different ||= Math.abs(pose.armLeft - pose.armRight) > .1
      expect(Math.abs(pose.kneeLeft * pose.kneeRight)).toBe(0)
      for (const key of Object.keys(pose) as (keyof typeof pose)[]) {
        expect(Number.isFinite(pose[key])).toBe(true)
        expect(Math.abs(pose[key])).toBeLessThan(4)
        expect(Math.abs(pose[key] - previous[key])).toBeLessThan(.03)
        expect(Math.abs(sampleIdleArticulation(time, 0)[key])).toBe(0)
      }
    }
    expect(different).toBe(true)
  })
  it('holds a glance and returns to the viewer before changing direction', () => {
    expect(sampleIdleAttention(0)).toEqual({ x: 0, y: -0 })
    expect(sampleIdleAttention(3_000)).toEqual(sampleIdleAttention(5_000))
    expect(sampleIdleAttention(3_000).x).toBeGreaterThan(0)
    expect(sampleIdleAttention(15_000).x).toBeLessThan(0)
    for (const time of [7_000, 11_999, 12_000]) {
      expect(Math.abs(sampleIdleAttention(time).x)).toBe(0)
    }
  })
  it('retains eye contact, then smoothly releases a stationary pointer', () => {
    expect(pointerAttentionWeight(2_000, 0)).toBe(1)
    expect(pointerAttentionWeight(3_600, 0)).toBeCloseTo(.5)
    expect(pointerAttentionWeight(5_000, 0)).toBe(0)
    expect(pointerAttentionWeight(0, -Infinity)).toBe(0)
  })
  it('keeps torso and cloth on delayed samples of the same primary motion', () => {
    for (let time = 1_000; time < 30_000; time += 37) {
      const current = sampleIdleSway(time)
      expect(current.follow).toBeCloseTo(sampleIdleSway(time - 340).body, 8)
      expect(current.cloth).toBeCloseTo(sampleIdleSway(time - 650).body, 8)
      expect(Math.abs(current.body)).toBeLessThanOrEqual(1.85)
      expect(Math.abs(current.body - sampleIdleSway(time - 1).body)).toBeLessThan(.004)
    }
  })
})
