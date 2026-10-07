import {describe,it,expect} from 'vitest'
import {EMOTION_PROFILES} from '../../emotions'
import {sampleEmotionFollowThrough} from './emotion-follow-through'
describe('whole expression follow-through',()=>{
  for(const [name,profile] of Object.entries(EMOTION_PROFILES)) it(`${name}: bounded, distinct shoulders, settles`,()=>{
    const samples=Array.from({length:240},(_,i)=>sampleEmotionFollowThrough(name,i*16,profile.durationMs))
    expect(samples.some(s=>s.headY!==0)).toBe(true)
    expect(samples.some(s=>s.shoulderLeftY!==s.shoulderRightY)).toBe(true)
    for(const s of samples) for(const v of Object.values(s)){expect(Number.isFinite(v)).toBe(true);expect(Math.abs(v)).toBeLessThanOrEqual(3.2)}
    expect(Object.values(sampleEmotionFollowThrough(name,profile.durationMs,profile.durationMs)).every(v=>v===0)).toBe(true)
  })
})
