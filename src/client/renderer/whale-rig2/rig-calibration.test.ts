import { describe, expect, it } from 'vitest'
import { validateCalibrationDocument, type CalibrationDocument } from './rig-calibration.ts'

const fixture = (): CalibrationDocument => ({
  schemaVersion: 1,
  id: 'test',
  status: 'draft',
  coordinateSystem: 'canvas-y-down',
  sourceSize: [224, 224],
  bindPose: 'frame.png',
  joints: [
    { id: 'pelvis', parent: null, x: 100, y: 150, role: 'core', confidence: 'inferred', minRotation: -10, maxRotation: 10 },
    { id: 'knee', parent: 'pelvis', x: 95, y: 180, role: 'near', confidence: 'visible', minRotation: -8, maxRotation: 80 },
  ],
  partPivots: [{ id: 'thigh', joint: 'pelvis', x: 100, y: 150 }],
})

describe('rig calibration document', () => {
  it('accepts a parent-linked joint tree and part pivots', () => {
    expect(() => validateCalibrationDocument(fixture())).not.toThrow()
  })

  it('rejects missing parents, cycles and inverted limits', () => {
    const missing = fixture()
    missing.joints[1]!.parent = 'missing'
    expect(() => validateCalibrationDocument(missing)).toThrow(/missing parent/)

    const cycle = fixture()
    cycle.joints[0]!.parent = 'knee'
    expect(() => validateCalibrationDocument(cycle)).toThrow(/cyclic/)

    const limits = fixture()
    limits.joints[1]!.minRotation = 90
    expect(() => validateCalibrationDocument(limits)).toThrow(/constraint/)
  })
})

