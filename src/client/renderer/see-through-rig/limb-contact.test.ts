import { expect, it } from 'vitest'
import { solveLegContact } from './limb-contact'

it('reconstructs bind pose and preserves two-link lengths at reachable contacts', () => {
  for (const [hip, knee, ankle] of [
    [{x:575,y:900},{x:570,y:1038},{x:560,y:1144}],
    [{x:705,y:900},{x:704,y:1038},{x:716,y:1144}],
  ]) {
    const bind = solveLegContact(hip!, knee!, ankle!, ankle!)
    expect(bind.upper).toBeCloseTo(0, 6)
    expect(bind.lower).toBeCloseTo(0, 6)
    for (const dx of [-8,0,8]) {
      const target = {x:ankle!.x+dx,y:ankle!.y-5}
      const pose = solveLegContact(hip!,knee!,ankle!,target)
      const a = pose.upper*Math.PI/180
      const b = (pose.upper+pose.lower)*Math.PI/180
      const ux=knee!.x-hip!.x, uy=knee!.y-hip!.y
      const lx=ankle!.x-knee!.x, ly=ankle!.y-knee!.y
      expect(hip!.x+ux*Math.cos(a)-uy*Math.sin(a)+lx*Math.cos(b)-ly*Math.sin(b)).toBeCloseTo(target.x,6)
      expect(hip!.y+ux*Math.sin(a)+uy*Math.cos(a)+lx*Math.sin(b)+ly*Math.cos(b)).toBeCloseTo(target.y,6)
    }
    const beyond = solveLegContact(hip!,knee!,ankle!,{x:0,y:5000})
    expect(Number.isFinite(beyond.upper + beyond.lower)).toBe(true)
  }
})
