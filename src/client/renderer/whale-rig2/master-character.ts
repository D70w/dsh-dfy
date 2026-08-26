import type { BoneDef, Clip, Curve, Keyframe } from './types.ts'
import type { PartDef } from './part-renderer.ts'

/** Bone landmarks fitted to run-master-v3 frame 30 (224px Golden Pose). */
export const MASTER_BONES: readonly BoneDef[] = [
  { id: 'world', parent: null, length: 1, restAngle: 0 },
  { id: 'pelvis', parent: 'world', length: 25, restAngle: -110 },
  { id: 'chest', parent: 'pelvis', length: 25, restAngle: 0 },
  { id: 'head', parent: 'chest', length: 40, restAngle: 2 },
  { id: 'ahoge', parent: 'head', length: 14, restAngle: 18 },
  { id: 'arm-near-upper', parent: 'chest', length: 13.42, restAngle: -130.3 },
  { id: 'arm-near-fore', parent: 'arm-near-upper', length: 10.77, restAngle: 82.1 },
  { id: 'arm-far-upper', parent: 'chest', length: 13.42, restAngle: 173.4 },
  { id: 'arm-far-fore', parent: 'arm-far-upper', length: 6.71, restAngle: 143.2 },
  { id: 'leg-near-thigh', parent: 'world', length: 16.55, restAngle: 115 },
  { id: 'leg-near-calf', parent: 'leg-near-thigh', length: 18.03, restAngle: -5.6 },
  { id: 'foot-near', parent: 'leg-near-calf', length: 18.36, restAngle: 41.2 },
  { id: 'leg-far-thigh', parent: 'world', length: 16.55, restAngle: 65 },
  { id: 'leg-far-calf', parent: 'leg-far-thigh', length: 17.09, restAngle: 4.4 },
  { id: 'foot-far', parent: 'leg-far-calf', length: 14.56, restAngle: -53.5 },
  { id: 'tail-root', parent: 'world', length: 34.13, restAngle: 5.04 },
  { id: 'tail-mid', parent: 'tail-root', length: 37.22, restAngle: 1.13 },
  { id: 'tail-flukes', parent: 'tail-mid', length: 23.19, restAngle: 1.25 },
]

/** Offsets are local to the parent tip and preserve the fitted joint positions. */
export const MASTER_LOCAL_OFFSETS: Readonly<Record<string, readonly [number, number]>> = {
  pelvis: [-1, 0],
  chest: [0, 0],
  head: [0, 0],
  ahoge: [45.2, 16.2],
  'arm-near-upper': [1.43, -6.82],
  'arm-near-fore': [0, 0],
  'arm-far-upper': [-4.04, 8.22],
  'arm-far-fore': [0, 0],
  'leg-near-thigh': [-6, 2],
  'leg-near-calf': [0, 0],
  'foot-near': [0, 0],
  'leg-far-thigh': [11, 2],
  'leg-far-calf': [0, 0],
  'foot-far': [0, 0],
  'tail-root': [7, -1],
  'tail-mid': [0, 0],
  'tail-flukes': [0, 0],
}

const part = (
  id: string,
  parentBone: string,
  position: readonly [number, number],
  pivot: readonly [number, number],
  zIndex: number,
  scale: readonly [number, number] = [1, 1],
): PartDef => ({
  id,
  texture: `${id}.png`,
  parentBone,
  position: { x: position[0], y: position[1] },
  rotation: 0,
  scale: { x: scale[0], y: scale[1] },
  pivot: { x: pivot[0], y: pivot[1] },
  zIndex,
})

/** Exact-pixel semantic layers cut from one approved Golden Frame. */
export const MASTER_PARTS: readonly PartDef[] = [
  part('tail-root', 'tail-root', [104, 156], [1, 21], 0),
  part('tail-mid', 'tail-mid', [138, 159], [-15, 13], 1),
  part('tail-flukes', 'tail-flukes', [175, 163], [6, 17], 2),
  part('body-underlay', 'pelvis', [96, 157], [96, 157], 3),
  part('leg-far-thigh-underlay', 'leg-far-thigh', [108, 159], [170, 90], 3.1, [.10, .10]),
  part('leg-far-calf-underlay', 'leg-far-calf', [115, 174], [82, 4], 3.2, [.085, .085]),
  part('foot-far-underlay', 'foot-far', [121, 190], [145, 15], 3.3, [.09, .09]),
  part('leg-far-thigh', 'leg-far-thigh', [108, 159], [10, -3], 4),
  part('leg-far-calf', 'leg-far-calf', [115, 174], [11, 1], 5),
  part('foot-far', 'foot-far', [121, 190], [13, 9], 6),
  part('arm-far-upper', 'arm-far-upper', [88, 111], [16, 14], 7),
  part('arm-far-fore', 'arm-far-fore', [94, 123], [21, 21], 8),
  part('arm-far-upper-underlay', 'arm-far-upper', [88, 111], [61, 7], 6.1, [.09, .09]),
  part('arm-far-fore-underlay', 'arm-far-fore', [94, 123], [173, 59], 6.2, [.09, .09]),
  part('torso-skirt', 'pelvis', [96, 157], [71, 150], 9),
  part('leg-near-thigh-underlay', 'leg-near-thigh', [91, 159], [170, 90], 8.1, [.10, .10]),
  part('leg-near-calf-underlay', 'leg-near-calf', [84, 174], [82, 4], 8.2, [.085, .085]),
  part('foot-near-underlay', 'foot-near', [78, 191], [145, 15], 8.3, [.09, .09]),
  part('leg-near-thigh', 'leg-near-thigh', [91, 159], [53, -2], 10),
  part('leg-near-calf', 'leg-near-calf', [84, 174], [44, 1], 11),
  part('foot-near', 'foot-near', [78, 191], [44, 6], 12),
  part('arm-near-upper', 'arm-near-upper', [72, 111], [25, 13], 13),
  part('arm-near-fore', 'arm-near-fore', [66, 123], [35, 23], 14),
  part('arm-near-upper-underlay', 'arm-near-upper', [72, 111], [63, 7], 12.1, [.09, .09]),
  part('arm-near-fore-underlay', 'arm-near-fore', [66, 123], [173, 59], 12.2, [.09, .09]),
  part('head-hair', 'head', [79, 110], [69, 106], 15),
  part('ahoge', 'ahoge', [68, 24], [23, 21], 16),
]

const RUN_REJECTED_POSE_BOUND_LEG_PARTS = new Set([
  'leg-far-thigh', 'leg-far-calf', 'foot-far',
  'leg-near-thigh', 'leg-near-calf', 'foot-near',
])

/** Run omits mother-pixel leg fragments whose painted pose cannot bend cleanly. */
export const MASTER_RUN_PARTS: readonly PartDef[] = MASTER_PARTS.filter(
  partDef => !RUN_REJECTED_POSE_BOUND_LEG_PARTS.has(partDef.id),
)

/** Static gate clip. Run channels are added only after Golden Pose approval. */
export const MASTER_STATIC_CLIP: Clip = {
  id: 'whale-master-golden-static',
  durationMs: 667,
  loop: true,
  channels: [],
}

const RUN_DURATION = 667
const RUN_PHASE = RUN_DURATION / 8
const key = (t: number, value: number): Keyframe => ({ t, value })
const runCurve = (values: readonly number[], interpolation: Curve['interpolation'] = 'cubic'): Curve => ({
  interpolation,
  keyframes: values.map((value, index) => key(index * RUN_PHASE, value)).concat([key(RUN_DURATION, values[0]!)]),
})

/**
 * Compact chibi run fitted from the stable 16-frame mother cycle.
 * Textures remain the same single-frame semantic Parts; only these curves move.
 */
export const MASTER_RUN_CLIP: Clip = {
  id: 'whale-master-run-v1',
  durationMs: RUN_DURATION,
  loop: true,
  channels: [
    { bone: 'world', property: 'ty', curve: runCurve([0, 1.4, 0, -1.8, 0, 1.4, 0, -1.8], 'easeInOut') },
    { bone: 'pelvis', property: 'angle', curve: runCurve([-110, -109, -108, -109, -110, -111, -112, -111], 'easeInOut') },
    { bone: 'chest', property: 'angle', curve: runCurve([0, -.5, -1, -.4, 0, .5, 1, .4], 'easeInOut') },
    { bone: 'head', property: 'angle', curve: runCurve([2, 2.4, 2.8, 2.4, 2, 1.6, 1.2, 1.6], 'easeInOut') },
    { bone: 'arm-near-upper', property: 'angle', curve: runCurve([-130.3, -125, -119, -114, -112, -117, -123, -128]) },
    { bone: 'arm-near-fore', property: 'angle', curve: runCurve([82.1, 78, 72, 68, 66, 70, 76, 81]) },
    { bone: 'arm-far-upper', property: 'angle', curve: runCurve([173.4, 168, 162, 157, 155, 160, 166, 171]) },
    { bone: 'arm-far-fore', property: 'angle', curve: runCurve([143.2, 146, 151, 155, 157, 154, 149, 145]) },
    { bone: 'leg-near-thigh', property: 'angle', curve: runCurve([115, 108, 97, 86, 80, 84, 92, 104]) },
    { bone: 'leg-near-calf', property: 'angle', curve: runCurve([-5.6, 4, 14, 20, 8, 0, -8, -10]) },
    { bone: 'foot-near', property: 'angle', curve: runCurve([41.2, 35, 25, 15, -20, -15, 0, 25]) },
    { bone: 'leg-far-thigh', property: 'angle', curve: runCurve([65, 73, 85, 95, 100, 96, 88, 77]) },
    { bone: 'leg-far-calf', property: 'angle', curve: runCurve([4.4, 0, -8, -10, -5.6, 4, 14, 20]) },
    { bone: 'foot-far', property: 'angle', curve: runCurve([-53.5, -35, -15, 10, 25, 20, 10, 0]) },
    { bone: 'tail-root', property: 'angle', curve: runCurve([5.04, 6, 7, 6, 5.04, 4, 3, 4], 'easeInOut') },
    { bone: 'tail-mid', property: 'angle', curve: runCurve([1.13, .4, -.5, -1.3, -1.7, -.7, .2, .9], 'easeInOut') },
    { bone: 'tail-flukes', property: 'angle', curve: runCurve([1.25, .2, -1, -2, -2.7, -1.5, 0, .9], 'easeInOut') },
  ],
}

export const MASTER_CANVAS = { width: 224, height: 224 }
