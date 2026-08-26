import { describe, expect, it } from 'vitest'
import { BoneHierarchy, solveTwoBoneIK, validateHierarchy } from './bones.ts'
import type { BoneDef } from './types.ts'

const close = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps

const twoBone = (): readonly BoneDef[] => [
  { id: 'root', parent: null, length: 10 },
  { id: 'child', parent: 'root', length: 5 },
]

describe('whale-rig2 hierarchy', () => {
  it('computes FK world transforms for a two-bone chain', () => {
    const hierarchy = new BoneHierarchy(twoBone())
    const pose = {
      root: { angle: 0, tx: 0, ty: 0 },
      child: { angle: 90, tx: 0, ty: 0 },
    }
    const worlds = hierarchy.fk(pose)
    expect(worlds[0]).toMatchObject({ x: 0, y: 0, angle: 0 })
    expect(close(worlds[0]!.tipX, 10)).toBe(true)
    expect(close(worlds[0]!.tipY, 0)).toBe(true)
    expect(worlds[1]).toMatchObject({ x: 10, y: 0, angle: 90 })
    expect(close(worlds[1]!.tipX, 10)).toBe(true)
    expect(close(worlds[1]!.tipY, 5)).toBe(true)
  })

  it('resolves arbitrary bone order with parents declared after children', () => {
    const bones: readonly BoneDef[] = [
      { id: 'c', parent: 'b', length: 2 },
      { id: 'a', parent: null, length: 3 },
      { id: 'b', parent: 'a', length: 4 },
    ]
    const hierarchy = new BoneHierarchy(bones)
    const worlds = hierarchy.fk(hierarchy.restPose())
    // Array order is [c, a, b]; parents may come after children.
    expect(worlds[1]!.x).toBeCloseTo(0) // a, the root
    expect(worlds[2]!.x).toBeCloseTo(3) // b, child of a
    expect(worlds[0]!.x).toBeCloseTo(7) // c, child of b
  })

  it('defensively copies bones and truncates reused output arrays', () => {
    const mutable = [...twoBone()] as BoneDef[]
    const hierarchy = new BoneHierarchy(mutable)
    mutable[0] = { id: 'changed', parent: null, length: 99 }
    expect(hierarchy.bones[0]!.id).toBe('root')
    const worlds = new Array(8).fill(null).map(() => ({ x: 0, y: 0, angle: 0, tipX: 0, tipY: 0 }))
    const matrices = new Array(8).fill(null).map(() => ({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }))
    expect(hierarchy.fk(hierarchy.restPose(), worlds)).toHaveLength(2)
    expect(hierarchy.worldMatrices(hierarchy.restPose(), matrices)).toHaveLength(2)
  })

  it('applies local translation through the parent rotation', () => {
    const hierarchy = new BoneHierarchy([
      { id: 'root', parent: null, length: 1 },
      { id: 'child', parent: 'root', length: 1 },
    ])
    const worlds = hierarchy.fk({
      root: { angle: 90, tx: 0, ty: 0 },
      child: { angle: 0, tx: 4, ty: 0 },
    })
    // Root rotated 90°: its tip is (0,1); child's local +X (4,0) then points
    // along world +Y, so the child joint lands at (0, 1 + 4).
    expect(close(worlds[1]!.x, 0)).toBe(true)
    expect(close(worlds[1]!.y, 5)).toBe(true)
  })

  it('rejects duplicate ids', () => {
    const bones: readonly BoneDef[] = [
      { id: 'a', parent: null, length: 1 },
      { id: 'a', parent: null, length: 1 },
    ]
    expect(() => validateHierarchy(bones)).toThrow(/duplicate/)
  })

  it('rejects unknown parents', () => {
    const bones: readonly BoneDef[] = [{ id: 'a', parent: 'nope', length: 1 }]
    expect(() => validateHierarchy(bones)).toThrow(/unknown parent/)
  })

  it('rejects self-parenting and cyclic parent chains', () => {
    const selfLoop: readonly BoneDef[] = [{ id: 'a', parent: 'a', length: 1 }]
    expect(() => validateHierarchy(selfLoop)).toThrow(/cyclic/)

    const cycle: readonly BoneDef[] = [
      { id: 'a', parent: 'b', length: 1 },
      { id: 'b', parent: 'a', length: 1 },
    ]
    expect(() => validateHierarchy(cycle)).toThrow(/cyclic/)
  })

  it('rejects non-positive lengths', () => {
    expect(() => validateHierarchy([{ id: 'a', parent: null, length: 0 }])).toThrow(/positive/)
  })
})

describe('whale-rig2 two-bone IK', () => {
  it('reaches an in-reach target exactly', () => {
    const result = solveTwoBoneIK({
      lengthA: 6,
      lengthB: 6,
      rootX: 0,
      rootY: 0,
      targetX: 8,
      targetY: 0,
      bendDirection: 1,
    })
    // End effector must land on (8, 0).
    const endX = 6 * Math.cos(result.rootAngle * Math.PI / 180)
      + 6 * Math.cos(result.midAngle * Math.PI / 180)
    const endY = 6 * Math.sin(result.rootAngle * Math.PI / 180)
      + 6 * Math.sin(result.midAngle * Math.PI / 180)
    expect(close(endX, 8)).toBe(true)
    expect(close(endY, 0)).toBe(true)
  })

  it('clamps unreachable targets stably and straightens the chain', () => {
    const first = solveTwoBoneIK({
      lengthA: 6,
      lengthB: 6,
      rootX: 0,
      rootY: 0,
      targetX: 30,
      targetY: 0,
      bendDirection: 1,
    })
    const second = solveTwoBoneIK({
      lengthA: 6,
      lengthB: 6,
      rootX: 0,
      rootY: 0,
      targetX: 30,
      targetY: 0,
      bendDirection: 1,
    })
    expect(close(first.rootAngle, 0)).toBe(true)
    expect(close(first.midAngle, 0)).toBe(true)
    expect(close(second.rootAngle, first.rootAngle)).toBe(true)
    expect(Number.isFinite(first.rootAngle)).toBe(true)
    expect(Number.isFinite(first.midAngle)).toBe(true)
  })

  it('respects bendDirection by mirroring the mid joint across the ray', () => {
    const plus = solveTwoBoneIK({
      lengthA: 6, lengthB: 6, rootX: 0, rootY: 0, targetX: 8, targetY: 0, bendDirection: 1,
    })
    const minus = solveTwoBoneIK({
      lengthA: 6, lengthB: 6, rootX: 0, rootY: 0, targetX: 8, targetY: 0, bendDirection: -1,
    })
    const midY = (angle: number): number => 6 * Math.sin(angle * Math.PI / 180)
    expect(midY(plus.rootAngle)).toBeGreaterThan(0)
    expect(midY(minus.rootAngle)).toBeLessThan(0)
    expect(close(midY(plus.rootAngle), -midY(minus.rootAngle))).toBe(true)
  })

  it('interprets limits as local angles under a rotated parent', () => {
    const result = solveTwoBoneIK({
      lengthA: 6,
      lengthB: 6,
      rootX: 0,
      rootY: 0,
      targetX: 8,
      targetY: 0,
      bendDirection: 1,
      parentAngle: 30,
      limits: { root: { min: 0, max: 10 }, mid: { min: -20, max: 20 } },
    })
    expect(result.rootAngle - 30).toBeCloseTo(10)
    expect(result.midAngle - result.rootAngle).toBeLessThanOrEqual(20)
    expect(result.midAngle - result.rootAngle).toBeGreaterThanOrEqual(-20)
  })

  it('rejects non-positive lengths', () => {
    expect(() => solveTwoBoneIK({
      lengthA: 0, lengthB: 6, rootX: 0, rootY: 0, targetX: 8, targetY: 0, bendDirection: 1,
    })).toThrow(/positive/)
  })
})
