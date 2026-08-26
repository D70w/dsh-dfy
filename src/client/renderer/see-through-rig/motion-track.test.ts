import { describe, expect, it } from 'vitest'
import { sampleGesture, sampleHeadPitchDeformation, sampleScalarTrack, sampleSpriteStateWeight, type ScalarKeyframe, type SpriteStateKeyframe } from './see-through-idle-rig-v2.ts'

describe('see-through hybrid motion tracks', () => {
  it('samples editable scalar curves without baking frames', () => {
    const track: ScalarKeyframe[] = [
      { time: 0, value: 0, curve: 'easeInOut' },
      { time: 0.5, value: 1, curve: 'easeInOut' },
      { time: 1, value: 0 },
    ]
    expect(sampleScalarTrack(track, 0)).toBe(0)
    expect(sampleScalarTrack(track, 0.25)).toBeCloseTo(0.5, 6)
    expect(sampleScalarTrack(track, 0.5)).toBe(1)
    expect(sampleScalarTrack(track, 0.75)).toBeCloseTo(0.5, 6)
    expect(sampleScalarTrack(track, 1)).toBe(0)
  })

  it('supports Hermite tangents for authored arrivals', () => {
    const track: ScalarKeyframe[] = [
      { time: 0, value: 0, curve: 'hermite', outTangent: 0 },
      { time: 1, value: 1, inTangent: 0 },
    ]
    expect(sampleScalarTrack(track, 0.5)).toBeCloseTo(0.5, 6)
    expect(sampleScalarTrack(track, 0.1)).toBeLessThan(0.1)
    expect(sampleScalarTrack(track, 0.9)).toBeGreaterThan(0.9)
  })

  it('cross-turns between reusable sprite states', () => {
    const track: Array<SpriteStateKeyframe<'side' | 'front'>> = [
      { time: 0, state: 'side' },
      { time: 0.2, state: 'front', transition: 0.1 },
      { time: 0.7, state: 'side', transition: 0.1 },
    ]
    expect(sampleSpriteStateWeight(track, 0.1, 'front')).toBe(0)
    expect(sampleSpriteStateWeight(track, 0.25, 'front')).toBeCloseTo(0.5, 6)
    expect(sampleSpriteStateWeight(track, 0.5, 'front')).toBe(1)
    expect(sampleSpriteStateWeight(track, 0.75, 'front')).toBeCloseTo(0.5, 6)
    expect(sampleSpriteStateWeight(track, 0.9, 'front')).toBe(0)
  })

  it('coordinates wave pose, face and expression instead of holding one smile', () => {
    const anticipation = sampleGesture('wave', 0.105, 1)
    const greeting = sampleGesture('wave', 0.5, 1)
    const settle = sampleGesture('wave', 0.92, 1)

    expect(anticipation.blinkOpenness).toBeLessThan(0.1)
    expect(anticipation.mouthOpen).toBeGreaterThan(0.5)
    expect(anticipation.smile).toBeGreaterThan(0.4)
    expect(greeting.mouthOpen).toBeGreaterThan(0.7)
    expect(greeting.smile).toBeGreaterThan(0.8)
    expect(greeting.blush).toBeGreaterThan(0.7)
    expect(Math.abs(greeting.browLeftRotation)).toBeGreaterThan(2)
    expect(greeting.armLeftUpper).toBeGreaterThan(20)
    expect(greeting.armLeftForearm).toBeLessThan(95)
    expect(settle.mouthOpen).toBe(0)
    expect(settle.smile).toBeGreaterThan(0)
  })

  it('transfers gesture weight through stable whole-leg pivots and skirt follow', () => {
    const wave = sampleGesture('wave', 0.5, 1)
    const nod = sampleGesture('nod', 0.285, 1)
    const tilt = sampleGesture('tilt', 0.5, 1)

    expect(Math.abs(wave.legLeftUpper)).toBeGreaterThan(1)
    expect(Math.abs(wave.legRightUpper)).toBeGreaterThan(0.4)
    expect(Math.abs(wave.skirtSway)).toBeGreaterThan(2)
    expect(nod.legLeftUpper).toBeGreaterThan(0)
    expect(nod.legRightUpper).toBeLessThan(0)
    expect(tilt.legRightUpper).not.toBeCloseTo(tilt.legLeftUpper, 2)
    expect(Math.abs(tilt.skirtSway)).toBeGreaterThan(2)
  })

  it('makes the nod read as a sustained downward look instead of a head bounce', () => {
    const lookDown = sampleGesture('nod', 0.4, 1)

    expect(lookDown.headY).toBeGreaterThan(4.5)
    expect(lookDown.headY).toBeLessThan(7)
    expect(lookDown.headPitch).toBeGreaterThan(0.95)
    expect(lookDown.headScaleX).toBe(1)
    expect(lookDown.headScaleY).toBe(1)
    expect(lookDown.gazeY).toBeGreaterThan(0.75)
    expect(lookDown.blinkOpenness).toBeGreaterThan(0.68)
    expect(lookDown.blinkOpenness).toBeLessThan(0.75)
    expect(lookDown.shoulderLeftX).toBeGreaterThan(1)
    expect(lookDown.shoulderRightX).toBeLessThan(-1)
    expect(lookDown.shoulderLeftY).toBeLessThan(-4)
    expect(lookDown.shoulderRightY).toBeLessThan(-4)
    expect(lookDown.shoulderShrug).toBeGreaterThan(0.95)
    expect(lookDown.smile).toBeGreaterThan(0.3)
    expect(lookDown.mouthOpen).toBe(0)
    expect(Math.abs(lookDown.headRotation)).toBeLessThan(0.5)
  })

  it('lets the downward gaze lead before the delayed shoulder response', () => {
    const faceLead = sampleGesture('nod', 0.18, 1)
    const shoulderHold = sampleGesture('nod', 0.4, 1)
    const settled = sampleGesture('nod', 1, 1)

    expect(faceLead.headPitch).toBeGreaterThan(0.25)
    expect(faceLead.gazeY).toBeGreaterThan(0.6)
    expect(faceLead.shoulderShrug).toBe(0)
    expect(shoulderHold.shoulderShrug).toBeGreaterThan(0.95)
    expect(settled.headPitch).toBeCloseTo(0, 5)
    expect(settled.shoulderShrug).toBeCloseTo(0, 5)
    expect(settled.smile).toBeCloseTo(0, 5)
  })

  it('authors head pitch as a depth projection with a stable forehead and foreshortened jaw', () => {
    const forehead = sampleHeadPitchDeformation(631.5, 176, 1)
    const brow = sampleHeadPitchDeformation(631.5, 310, 1)
    const eyes = sampleHeadPitchDeformation(631.5, 386, 1)
    const chin = sampleHeadPitchDeformation(631.5, 506, 1)
    const leftJaw = sampleHeadPitchDeformation(490, 500, 1)
    const rightJaw = sampleHeadPitchDeformation(773, 500, 1)
    const neutral = sampleHeadPitchDeformation(490, 500, 0)

    expect(forehead.y).toBeCloseTo(0, 5)
    expect(Math.abs(brow.y - eyes.y)).toBeLessThan(1.5)
    expect(eyes.y).toBeGreaterThan(4)
    expect(chin.y).toBeLessThan(0)
    expect(eyes.y - chin.y).toBeGreaterThan(5)
    expect(leftJaw.x).toBeGreaterThan(4)
    expect(rightJaw.x).toBeLessThan(-4)
    expect(neutral).toEqual({ x: 0, y: 0 })
  })

  it('keeps the face pitch mesh ordered without inverted cells at both extremes', () => {
    for (const pitch of [-1, 1]) {
      const points = Array.from({ length: 11 }, (_, row) => (
        Array.from({ length: 9 }, (_, column) => {
          const x = 483 + 297 * column / 8
          const y = 146 + 363 * row / 10
          const deformation = sampleHeadPitchDeformation(x, y, pitch)
          return { x: x + deformation.x, y: y + deformation.y }
        })
      ))

      for (let row = 0; row < 10; row += 1) {
        for (let column = 0; column < 8; column += 1) {
          const a = points[row][column]
          const b = points[row][column + 1]
          const c = points[row + 1][column]
          const signedAreaTwice = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
          expect(Number.isFinite(signedAreaTwice)).toBe(true)
          expect(signedAreaTwice).toBeGreaterThan(800)
        }
      }
    }
  })
})
