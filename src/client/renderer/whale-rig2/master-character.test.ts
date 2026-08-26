import { describe, expect, it } from 'vitest'
import { Animator } from './animator.ts'
import { BoneHierarchy } from './bones.ts'
import { applyAffine } from './math.ts'
import { MASTER_BONES, MASTER_LOCAL_OFFSETS, MASTER_PARTS, MASTER_RUN_CLIP, MASTER_RUN_PARTS } from './master-character.ts'
import { PartRenderer } from './part-renderer.ts'

function bindPose() {
  const animator = new Animator(MASTER_RUN_CLIP, MASTER_BONES)
  const pose = animator.sample() as Record<string, { angle: number; tx: number; ty: number }>
  for (const [id, [tx, ty]] of Object.entries(MASTER_LOCAL_OFFSETS)) {
    pose[id]!.tx += tx
    pose[id]!.ty += ty
  }
  pose.world!.tx += 96
  pose.world!.ty += 157
  return pose
}

describe('mother-fitted realtime character', () => {
  it('uses static semantic textures rather than animation frames', () => {
    expect(MASTER_PARTS).toHaveLength(27)
    expect(new Set(MASTER_PARTS.map(part => part.id)).size).toBe(MASTER_PARTS.length)
    for (const part of MASTER_PARTS) {
      expect(part.texture).not.toMatch(/frame[-_]?\d|run[-_]?\d|sprite|atlas/i)
    }
  })

  it('uses clean semantic leg completions for run instead of pose-bound leg fragments', () => {
    expect(MASTER_RUN_PARTS).toHaveLength(21)
    expect(MASTER_RUN_PARTS.some(part => part.id === 'leg-near-thigh-underlay')).toBe(true)
    expect(MASTER_RUN_PARTS.some(part => part.id === 'leg-near-thigh')).toBe(false)
    expect(MASTER_RUN_PARTS.some(part => part.id === 'foot-far')).toBe(false)
  })

  it('has the fitted pelvis/chest/head, limb, foot and three-bone tail topology', () => {
    const byId = new Map(MASTER_BONES.map(bone => [bone.id, bone]))
    expect(byId.get('pelvis')?.parent).toBe('world')
    expect(byId.get('chest')?.parent).toBe('pelvis')
    expect(byId.get('head')?.parent).toBe('chest')
    expect(byId.get('foot-near')?.parent).toBe('leg-near-calf')
    expect(byId.get('foot-far')?.parent).toBe('leg-far-calf')
    expect(byId.get('tail-mid')?.parent).toBe('tail-root')
    expect(byId.get('tail-flukes')?.parent).toBe('tail-mid')
  })

  it('aligns every Part pivot with its declared bind-space joint', () => {
    const hierarchy = new BoneHierarchy(MASTER_BONES)
    const pose = bindPose()
    const matrices = hierarchy.worldMatrices(pose)
    const renderer = new PartRenderer(hierarchy, pose, MASTER_PARTS)
    const frames = renderer.frames(matrices)
    const parts = new Map(MASTER_PARTS.map(part => [part.id, part]))
    for (const frame of frames) {
      const part = parts.get(frame.id)!
      const pivot = applyAffine({ x: 0, y: 0 }, frame.matrix, frame.pivot.x, frame.pivot.y)
      expect(pivot.x).toBeCloseTo(part.position.x, 6)
      expect(pivot.y).toBeCloseTo(part.position.y, 6)
    }
  })

  it('closes every run channel exactly at 667ms', () => {
    expect(MASTER_RUN_CLIP.durationMs).toBe(667)
    for (const channel of MASTER_RUN_CLIP.channels) {
      const keys = channel.curve.keyframes
      expect(keys[0]!.t).toBe(0)
      expect(keys.at(-1)!.t).toBe(667)
      expect(keys.at(-1)!.value).toBe(keys[0]!.value)
    }
  })

  it('retimes continuously without changing textures or keyframe data', () => {
    const animator = new Animator(MASTER_RUN_CLIP, MASTER_BONES)
    animator.durationMs = 1200
    animator.speed = .5
    animator.update(300)
    expect(animator.timeMs).toBe(150)
    const sample = animator.sample()
    expect(Object.keys(sample)).toHaveLength(MASTER_BONES.length)
    expect(MASTER_PARTS.every(part => part.texture.endsWith('.png'))).toBe(true)
  })
})
