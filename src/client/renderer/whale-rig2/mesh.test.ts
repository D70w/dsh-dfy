import { describe, expect, it } from 'vitest'
import { BoneHierarchy } from './bones.ts'
import {
  MAX_BONE_INFLUENCE,
  normalizeWeights,
  prepareSkin,
  requireNormalizedWeights,
  skinPrepared,
  skinVertices,
  validateMesh,
} from './mesh.ts'
import type { MeshDef } from './types.ts'

const weights = (...entries: [number, number][]): MeshDef['weights'][number] =>
  entries.map(([bone, weight]) => ({ bone, weight }))

describe('whale-rig2 mesh validation', () => {
  it('rejects vertices with too many bone influences', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0]),
      weights: [weights([0, 1], [1, 0.5], [2, 0.5], [3, 0.5], [4, 0.5])],
    }
    expect(() => validateMesh(def, 5)).toThrow(/max/)
    expect(MAX_BONE_INFLUENCE).toBe(4)
  })

  it('rejects out-of-range bone indices', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0]),
      weights: [weights([9, 1])],
    }
    expect(() => validateMesh(def, 4)).toThrow(/out-of-range/)
  })

  it('rejects position/weight count mismatches', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0, 1, 1]),
      weights: [weights([0, 1])],
    }
    expect(() => validateMesh(def, 1)).toThrow(/vertices in positions/)
  })

  it('rejects non-normalized weight sums', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0]),
      weights: [weights([0, 0.5], [1, 0.25])],
    }
    expect(() => requireNormalizedWeights(def)).toThrow(/sum to 0.75/)
    const def2: MeshDef = {
      positions: new Float32Array([0, 0]),
      weights: [weights([0, 2])],
    }
    expect(() => requireNormalizedWeights(def2)).toThrow(/sum to 2/)
  })

  it('normalizes weights in place and rejects a zero total', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0]),
      weights: [weights([0, 1], [1, 2])],
    }
    normalizeWeights(def)
    expect(def.weights[0]![0]!.weight).toBeCloseTo(1 / 3)
    expect(def.weights[0]![1]!.weight).toBeCloseTo(2 / 3)
    expect(() => normalizeWeights({
      positions: new Float32Array([0, 0]),
      weights: [weights([0, 0])],
    })).toThrow(/non-positive/)
  })
})

describe('whale-rig2 CPU skinning', () => {
  const identity = (tx: number, ty: number) => ({ a: 1, b: 0, c: 0, d: 1, tx, ty })

  it('skins a single bone by its pose matrix', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0, 10, 0]),
      weights: [weights([0, 1]), weights([0, 1])],
    }
    const out = skinVertices(def, [identity(0, 0)], [identity(10, 0)])
    expect(out[0]).toBeCloseTo(10)
    expect(out[1]).toBeCloseTo(0)
    expect(out[2]).toBeCloseTo(20)
  })

  it('blends a 50/50 vertex across two bones', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0]),
      weights: [weights([0, 0.5], [1, 0.5])],
    }
    // bone0 pushes +X, bone1 pushes +Y; the blended result is the average.
    const out = skinVertices(def, [identity(0, 0), identity(0, 0)], [identity(10, 0), identity(0, 10)])
    expect(out[0]).toBeCloseTo(5)
    expect(out[1]).toBeCloseTo(5)
  })

  it('skins an end-to-end hierarchy pose (bind → rotated pose)', () => {
    const hierarchy = new BoneHierarchy([
      { id: 'root', parent: null, length: 10 },
      { id: 'child', parent: 'root', length: 5 },
    ])
    const bind = hierarchy.worldMatrices(hierarchy.restPose())
    const posed = hierarchy.worldMatrices({
      root: { angle: 90, tx: 0, ty: 0 },
      child: { angle: 0, tx: 0, ty: 0 },
    })
    // Vertex at the child bind joint (10, 0), fully weighted to the child.
    const def: MeshDef = {
      positions: new Float32Array([10, 0]),
      weights: [weights([1, 1])],
    }
    const out = skinVertices(def, bind, posed)
    expect(out[0]).toBeCloseTo(0)
    expect(out[1]).toBeCloseTo(10)
  })

  it('reuses the caller-provided output buffer', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0, 1, 1]),
      weights: [weights([0, 1]), weights([0, 1])],
    }
    const scratch = new Float32Array(4)
    scratch.fill(-99)
    const out = skinVertices(def, [identity(0, 0)], [identity(3, 4)], scratch)
    expect(out).toBe(scratch)
    expect(scratch[0]).toBeCloseTo(3)
    expect(scratch[1]).toBeCloseTo(4)
    expect(scratch[2]).toBeCloseTo(4)
    expect(scratch[3]).toBeCloseTo(5)
  })

  it('reuses a prepared skin context across poses', () => {
    const def: MeshDef = {
      positions: new Float32Array([0, 0, 2, 0]),
      weights: [weights([0, 1]), weights([0, 1])],
    }
    const prepared = prepareSkin(def, [identity(0, 0)])
    const scratch = new Float32Array(4)
    expect(skinPrepared(prepared, [identity(3, 4)], scratch)).toBe(scratch)
    expect(Array.from(scratch)).toEqual([3, 4, 5, 4])
    skinPrepared(prepared, [identity(8, 1)], scratch)
    expect(Array.from(scratch)).toEqual([8, 1, 10, 1])
  })
})
