import { expect, it } from 'vitest'
import { breezePose } from './breeze-pose.ts'

it('preserves bidirectional wind rather than masking attachment defects', () => {
  for(let v=-1.6;v<=1.6;v+=.01){
    const pose=breezePose(v,v,-v)
    expect(pose.armLeft).toBeCloseTo(v * 1.3)
    expect(pose.armRight).toBeCloseTo(-v * 1.1)
  }
})
it('keeps a readable chest response when the spring chain catches up', () => {
  expect(breezePose(1,1,1).chest).toBe(1.4)
  expect(breezePose(-1,-1,-1).chest).toBe(-1.4)
  for(const value of Object.values(breezePose(0,0,0))) expect(Math.abs(value)).toBe(0)
})
