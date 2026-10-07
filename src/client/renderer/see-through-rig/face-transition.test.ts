import {describe,it,expect} from 'vitest'
import {sampleLidBlink,sampleEmotionBlink,followBrow} from './face-transition'
describe('closed lids and interrupted brows',()=>{
  it('authored blinks actually close, with one-sided closure only for the wink',()=>{
    for(const name of ['shy','sad','proud','confused','nervous','love','excited','surprise','hungry','pout','mischievous']){
      const frames=Array.from({length:100},(_,i)=>sampleEmotionBlink(name,i*16,'left'))
      expect(frames).toContain(0)
      expect(sampleEmotionBlink(name,4000,'left')).toBe(1)
    }
    expect(sampleEmotionBlink('mischievous',540,'left')).toBe(0)
    expect(sampleEmotionBlink('mischievous',540,'right')).toBe(1)
  })
  it('holds fully closed even with 10 fps sampling',()=>{
    for(let offset=0;offset<100;offset++){
      const frames=Array.from({length:5},(_,i)=>sampleLidBlink(i*100+offset))
      expect(frames).toContain(0)
    }
    expect(sampleLidBlink(320)).toBe(1)
    expect(sampleLidBlink(Infinity)).toBe(1)
  })
  it('closes monotonically, holds, and reopens monotonically',()=>{
    for(let i=1;i<80;i++)expect(sampleLidBlink(i)).toBeLessThanOrEqual(sampleLidBlink(i-1))
    for(let i=80;i<190;i++)expect(sampleLidBlink(i)).toBe(0)
    for(let i=191;i<=320;i++)expect(sampleLidBlink(i)).toBeGreaterThanOrEqual(sampleLidBlink(i-1))
  })
  it('does not snap a brow across its range on interruption or resume',()=>{
    expect(followBrow(18,-18,16)).toBeGreaterThan(10)
    expect(followBrow(18,-18,5000)).toBeGreaterThan(-1)
    let value=18
    for(let i=0;i<100;i++)value=followBrow(value,0,16)
    expect(value).toBe(0)
  })
})
