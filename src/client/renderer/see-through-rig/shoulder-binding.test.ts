import { expect, it } from 'vitest'
import { shoulderFreedom } from './shoulder-binding.ts'

it('fully anchors the sewn root regardless of arm rotation direction', () => {
  for(const along of [-40,0,14,28]) expect(shoulderFreedom(along)).toBe(0)
  for(const along of [102,150,250]) expect(shoulderFreedom(along)).toBe(1)
})
it('releases smoothly before the elbow with normalized complementary weights', () => {
  let previous=0
  for(let along=28;along<=102;along+=.1){
    const arm=shoulderFreedom(along),chest=1-arm
    expect(arm).toBeGreaterThanOrEqual(previous)
    expect(arm-previous).toBeLessThan(.003)
    expect(arm+chest).toBe(1)
    previous=arm
  }
})
