import { expect, it } from 'vitest'
import { clothOffset, sleeveFollow } from './cloth-follow.ts'

it('keeps the windy waist pinned and the surface unfolded at extreme pressure', () => {
  for (const direction of [-1, 1]) {
    const mid=[9,8,7,6].map(x=>x*direction)
    const hem=[10,9,8,7].map(x=>x*direction)
    const wind=[12,8,-4,-12].map(x=>x*direction)
    const point=(u:number,v:number)=>{
      const d=clothOffset(u,v,mid,hem,wind)
      return {x:u*400+d.x,y:v*260+d.y}
    }
    for(let u=0;u<=1;u+=.05){
      const root=clothOffset(u,.08,mid,hem,wind)
      expect(Math.abs(root.x)+Math.abs(root.y)).toBe(0)
      for(let v=0;v<1;v+=.05){
        const a=point(u,v),b=point(u+.001,v),c=point(u,v+.001)
        expect((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)).toBeGreaterThan(0)
      }
    }
    expect(clothOffset(.5,.6,mid,hem,wind)).not.toEqual(clothOffset(.5,.6,mid,hem))
  }
})

it('pins waistband and reconstructs neutral throughout the garment', () => {
  for (let u = 0; u <= 1; u += .05) {
    const root=clothOffset(u, .08, [9,-9,9,-9], [-10,10,-10,10])
    expect(Math.abs(root.x)+Math.abs(root.y)).toBe(0)
    for (let v=0;v<=1;v+=.05) {
      const p=clothOffset(u,v,[0,0,0,0],[0,0,0,0])
      expect(Math.abs(p.x)+Math.abs(p.y)).toBe(0)
    }
  }
})
it('keeps column boundaries continuous and hem displacement bounded', () => {
  for (const u of [1/3,2/3]) {
    const a=clothOffset(u-1e-6,1,[9,-9,9,-9],[-10,10,-10,10])
    const b=clothOffset(u+1e-6,1,[9,-9,9,-9],[-10,10,-10,10])
    expect(Math.abs(a.x-b.x)).toBeLessThan(.001)
    expect(Math.abs(a.x)).toBeLessThanOrEqual(13.5)
  }
})
it('preserves sleeve attachment edges for either direction', () => {
  for (const lag of [-100,0,100]) {
    expect(Math.abs(sleeveFollow(170,lag))).toBeLessThan(1e-10)
    expect(Math.abs(sleeveFollow(235,lag))).toBeLessThan(1e-10)
    expect(Math.abs(sleeveFollow(200,lag))).toBeLessThanOrEqual(2)
  }
})
