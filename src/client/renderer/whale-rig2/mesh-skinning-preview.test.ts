import { describe, expect, it } from 'vitest'
import { BoneHierarchy } from './bones.ts'
import { prepareSkin, skinPrepared } from './mesh.ts'
import { ARM_RIGS, BIND_MATRICES, BIND_POSE, LEG_BONES, LEG_VALIDATION_POSES, makeLegMesh, sampleBodyStepCycle, sampleLegStepCycle } from './mesh-skinning-preview.ts'
import { createInitialPelvisRig } from './pelvis-rig.ts'

describe('whale-maid leg mesh authoring', () => {
  it('uses the character-facing direction for forward and backward presets', () => {
    const kneeDeltaX = (thighDelta: number): number => Math.cos((90 + thighDelta) * Math.PI / 180)
    // The character faces screen-left. Forward must move the near knee left;
    // backward must move it right. This guards the canvas-y-down sign convention.
    expect(kneeDeltaX(LEG_VALIDATION_POSES.nearForward.near[0])).toBeLessThan(0)
    expect(kneeDeltaX(LEG_VALIDATION_POSES.nearBackward.near[0])).toBeGreaterThan(0)
    expect(Math.sign(LEG_VALIDATION_POSES.alternate.near[0])).toBe(-Math.sign(LEG_VALIDATION_POSES.alternate.far[0]))
  })

  it('alternates the leading leg and closes the continuous step cycle', () => {
    const first = sampleLegStepCycle(0)
    const opposite = sampleLegStepCycle(450)
    const closed = sampleLegStepCycle(900)
    expect(first.near[0]).toBeGreaterThan(0)
    expect(first.far[0]).toBeLessThan(0)
    expect(opposite.near[0]).toBeLessThan(0)
    expect(opposite.far[0]).toBeGreaterThan(0)
    expect(closed).toEqual(first)
    expect(sampleLegStepCycle(225).far[1]).toBeLessThan(-50)
    expect(sampleLegStepCycle(675).near[1]).toBeLessThan(-50)
  })

  it('synchronizes two body lifts and opposite arm swings with the leg cycle', () => {
    const nearContact = sampleBodyStepCycle(0)
    const firstPassing = sampleBodyStepCycle(225)
    const farContact = sampleBodyStepCycle(450)
    const secondPassing = sampleBodyStepCycle(675)
    expect(firstPassing.bounceY).toBeLessThan(nearContact.bounceY)
    expect(secondPassing.bounceY).toBeLessThan(farContact.bounceY)
    expect(Math.sign(nearContact.nearUpperArmDeg)).toBe(-Math.sign(nearContact.farUpperArmDeg))
    expect(Math.sign(farContact.nearUpperArmDeg)).toBe(-Math.sign(nearContact.nearUpperArmDeg))
    expect(Math.sign(nearContact.nearForearmDeg)).toBe(-Math.sign(nearContact.nearUpperArmDeg))
    expect(Math.sign(nearContact.nearWristDeg)).toBe(Math.sign(nearContact.nearUpperArmDeg))
    expect(nearContact.headCounterDeg).toBeGreaterThan(0)
    expect(sampleBodyStepCycle(900)).toEqual(nearContact)
  })

  it('defines a true shoulder to elbow to wrist hierarchy for both arms', () => {
    for (const rig of Object.values(ARM_RIGS)) {
      expect(Math.hypot(rig.elbow.x - rig.shoulder.x, rig.elbow.y - rig.shoulder.y)).toBeGreaterThan(45)
      expect(Math.hypot(rig.wrist.x - rig.elbow.x, rig.wrist.y - rig.elbow.y)).toBeGreaterThan(40)
      expect(Math.hypot(rig.handEnd.x - rig.wrist.x, rig.handEnd.y - rig.wrist.y)).toBeGreaterThan(30)
    }
  })

  it('keeps the grid dense at the knee and limits each vertex to two bones', () => {
    const mesh = makeLegMesh('near')
    expect(mesh.positions.length / 2).toBe(130)
    for (const influences of mesh.weights) {
      expect(influences.length).toBeLessThanOrEqual(2)
      expect(influences.reduce((sum, influence) => sum + influence.weight, 0)).toBeCloseTo(1)
    }
  })

  it('reduces mesh density in economy mode without changing the static texture model', () => {
    const mesh = makeLegMesh('near', createInitialPelvisRig(), 'economy')
    expect(mesh.positions.length / 2).toBe(48)
    expect(mesh.uvs).toEqual(mesh.positions)
    expect(mesh.weights).toHaveLength(48)
  })

  it('has an identity bind result (inverse bind is not optional)', () => {
    const mesh = makeLegMesh('near')
    const prepared = prepareSkin(mesh, BIND_MATRICES)
    const output = skinPrepared(prepared, BIND_MATRICES)
    for (let index = 0; index < output.length; index += 1) expect(output[index]).toBeCloseTo(mesh.positions[index], 4)
  })

  it('moves the knee through the hierarchy without changing the texture source', () => {
    const hierarchy = new BoneHierarchy(LEG_BONES)
    const mesh = makeLegMesh('near')
    const prepared = prepareSkin(mesh, BIND_MATRICES)
    const posed = hierarchy.worldMatrices({
      ...BIND_POSE,
      hipNear: { angle: 62, tx: 467, ty: 820 },
      kneeNear: { angle: 38, tx: 0, ty: 0 },
      ankleNear: { angle: 0, tx: 0, ty: 0 },
    })
    const output = skinPrepared(prepared, posed)
    expect(output).not.toEqual(mesh.positions)
    expect(mesh.uvs).toEqual(mesh.positions)
  })
})
