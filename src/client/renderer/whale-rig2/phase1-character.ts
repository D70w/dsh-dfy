import type { BoneDef, Clip, Curve, Keyframe } from './types.ts'
import type { PartDef } from './part-renderer.ts'

const key = (t: number, value: number): Keyframe => ({ t, value })
const curve = (values: readonly number[], interpolation: Curve['interpolation'] = 'cubic'): Curve => ({
  interpolation,
  keyframes: values.map((value, index) => key(index * 112.5, value)).concat([key(900, values[0]!)]),
})

/** Phase-1 skeleton: torso root, head/hair, two arms, two legs and tail. */
export const PHASE1_BONES: readonly BoneDef[] = [
  { id: 'root', parent: null, length: 1, restAngle: 0 },
  { id: 'head', parent: 'root', length: 10, restAngle: 0 },
  { id: 'hair', parent: 'head', length: 18, restAngle: 0 },
  { id: 'front-lock', parent: 'head', length: 10, restAngle: 0 },
  { id: 'ahoge', parent: 'head', length: 10, restAngle: 0 },
  { id: 'tail', parent: 'root', length: 68, restAngle: 0 },
  { id: 'arm-near-upper', parent: 'root', length: 22, restAngle: 90 },
  { id: 'arm-near-fore', parent: 'arm-near-upper', length: 23, restAngle: 45 },
  { id: 'arm-far-upper', parent: 'root', length: 22, restAngle: 90 },
  { id: 'arm-far-fore', parent: 'arm-far-upper', length: 23, restAngle: 45 },
  { id: 'leg-near-thigh', parent: 'root', length: 28, restAngle: 90 },
  { id: 'leg-near-calf', parent: 'leg-near-thigh', length: 28, restAngle: 20 },
  { id: 'leg-far-thigh', parent: 'root', length: 28, restAngle: 90 },
  { id: 'leg-far-calf', parent: 'leg-far-thigh', length: 28, restAngle: 20 },
]

/** Child-joint offsets are relative to the parent tip and are not baked into art. */
export const PHASE1_LOCAL_OFFSETS: Readonly<Record<string, readonly [number, number]>> = {
  head: [-18, -40],
  hair: [-2, -4],
  'front-lock': [-12, 2],
  ahoge: [-7, -34],
  tail: [20, 25],
  'arm-near-upper': [-20, -11],
  'arm-near-fore': [0, 0],
  'arm-far-upper': [-5, -11],
  'arm-far-fore': [0, 0],
  'leg-near-thigh': [-14, 27],
  'leg-near-calf': [0, 0],
  'leg-far-thigh': [1, 27],
  'leg-far-calf': [0, 0],
}

const channels = [
  { bone: 'root', property: 'ty' as const, curve: curve([0, 3, 0, -3, 0, 3, 0, -3], 'easeInOut') },
  { bone: 'root', property: 'angle' as const, curve: curve([-3, -3, -1, 1, 3, 2, 0, -2], 'easeInOut') },
  { bone: 'head', property: 'angle' as const, curve: curve([2, 2, 1, 0, -2, -2, 0, 1], 'easeInOut') },
  { bone: 'hair', property: 'angle' as const, curve: curve([0, -2, -3, -4, -2, 2, 3, 2], 'easeInOut') },
  { bone: 'front-lock', property: 'angle' as const, curve: curve([0, 1, 2, 3, 1, -1, -2, -1], 'easeInOut') },
  { bone: 'ahoge', property: 'angle' as const, curve: curve([0, 2, 4, 5, 2, -2, -4, -2], 'easeInOut') },
  { bone: 'tail', property: 'angle' as const, curve: curve([0, 4, 8, 10, 4, -3, -7, -4], 'easeInOut') },
  // Arms swing opposite one another and opposite the corresponding leg.
  { bone: 'arm-near-upper', property: 'angle' as const, curve: curve([60, 72, 92, 112, 120, 106, 84, 68]) },
  { bone: 'arm-near-fore', property: 'angle' as const, curve: curve([58, 48, 34, 24, 18, 30, 48, 58]) },
  { bone: 'arm-far-upper', property: 'angle' as const, curve: curve([120, 108, 86, 68, 60, 74, 96, 112]) },
  { bone: 'arm-far-fore', property: 'angle' as const, curve: curve([18, 28, 48, 58, 58, 46, 30, 20]) },
  // Legs use local calf angles; the sign and range stay stable, so no knee flips.
  { bone: 'leg-near-thigh', property: 'angle' as const, curve: curve([125, 110, 90, 65, 55, 70, 90, 110]) },
  { bone: 'leg-near-calf', property: 'angle' as const, curve: curve([10, -10, -30, 45, 80, 55, -25, -10]) },
  { bone: 'leg-far-thigh', property: 'angle' as const, curve: curve([55, 70, 90, 110, 125, 110, 90, 65]) },
  { bone: 'leg-far-calf', property: 'angle' as const, curve: curve([80, 55, -25, -10, 10, -10, -30, 45]) },
]

export const PHASE1_RUN_CLIP: Clip = {
  id: 'whale-phase1-run',
  durationMs: 900,
  loop: true,
  channels,
}

/** Static Part definitions; texture URLs are resolved by the debug page. */
export const PHASE1_PARTS: readonly PartDef[] = [
  { id: 'tail', texture: 'tail.png', parentBone: 'tail', position: { x: 133, y: 150 }, rotation: 0, scale: { x: 0.32, y: 0.32 }, pivot: { x: 18, y: 112 }, zIndex: 0 },
  { id: 'hair-back', texture: 'hair-back.png', parentBone: 'hair', position: { x: 104, y: 122 }, rotation: 0, scale: { x: 0.30, y: 0.30 }, pivot: { x: 188, y: 334 }, zIndex: 1 },
  { id: 'leg-far-thigh', texture: 'thigh-far.png', parentBone: 'leg-far-thigh', position: { x: 112, y: 153 }, rotation: 0, scale: { x: 0.34, y: 0.34 }, pivot: { x: 52, y: 6 }, zIndex: 2 },
  { id: 'leg-far-calf', texture: 'lower-leg-far.png', parentBone: 'leg-far-calf', position: { x: 114, y: 180 }, rotation: 0, scale: { x: 0.34, y: 0.34 }, pivot: { x: 90, y: 8 }, zIndex: 3 },
  { id: 'arm-far-upper', texture: 'upper-arm-far.png', parentBone: 'arm-far-upper', position: { x: 107, y: 114 }, rotation: 0, scale: { x: 0.25, y: 0.25 }, pivot: { x: 52, y: 8 }, zIndex: 4 },
  { id: 'arm-far-fore', texture: 'forearm-far.png', parentBone: 'arm-far-fore', position: { x: 108, y: 136 }, rotation: 0, scale: { x: 0.25, y: 0.25 }, pivot: { x: 137, y: 16 }, zIndex: 5 },
  { id: 'body', texture: 'body.png', parentBone: 'root', position: { x: 112, y: 125 }, rotation: 0, scale: { x: 0.35, y: 0.35 }, pivot: { x: 148, y: 16 }, zIndex: 6 },
  { id: 'leg-near-thigh', texture: 'thigh-near.png', parentBone: 'leg-near-thigh', position: { x: 98, y: 153 }, rotation: 0, scale: { x: 0.34, y: 0.34 }, pivot: { x: 52, y: 6 }, zIndex: 7 },
  { id: 'leg-near-calf', texture: 'lower-leg-near.png', parentBone: 'leg-near-calf', position: { x: 99, y: 180 }, rotation: 0, scale: { x: 0.34, y: 0.34 }, pivot: { x: 90, y: 8 }, zIndex: 8 },
  { id: 'arm-near-upper', texture: 'upper-arm-near.png', parentBone: 'arm-near-upper', position: { x: 92, y: 114 }, rotation: 0, scale: { x: 0.25, y: 0.25 }, pivot: { x: 52, y: 8 }, zIndex: 9 },
  { id: 'arm-near-fore', texture: 'forearm-near.png', parentBone: 'arm-near-fore', position: { x: 93, y: 136 }, rotation: 0, scale: { x: 0.25, y: 0.25 }, pivot: { x: 137, y: 16 }, zIndex: 10 },
  { id: 'head', texture: 'head.png', parentBone: 'head', position: { x: 95, y: 125 }, rotation: 0, scale: { x: 0.31, y: 0.31 }, pivot: { x: 150, y: 288 }, zIndex: 11 },
  { id: 'ahoge', texture: 'ahoge.png', parentBone: 'ahoge', position: { x: 98, y: 91 }, rotation: 0, scale: { x: 0.23, y: 0.23 }, pivot: { x: 56, y: 82 }, zIndex: 13 },
]

export const PHASE1_CANVAS = { width: 256, height: 256 }

export const PHASE1_TEXTURES = PHASE1_PARTS.map(part => part.texture)
