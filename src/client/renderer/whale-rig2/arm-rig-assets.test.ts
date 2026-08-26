import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface ArmAssetReport {
  canvasSize: [number, number]
  generatedDonorPolicy: string
  runtimeAnimationFrames: number
  status: string
  arms: Array<{
    bindChangedPixels: number
    duplicateVisiblePixels: number
    missingVisiblePixels: number
    assets: Record<string, string>
  }>
}

const root = resolve(import.meta.dirname, '../../../../')
const report = JSON.parse(readFileSync(resolve(root, 'character-packs/default-whale/source/bind-pose-v3/reports/arm-rig-v1.json'), 'utf8')) as ArmAssetReport

describe('user V1 shoulder/elbow/wrist arm assets', () => {
  it('partitions approved visible pixels exactly once', () => {
    expect(report.status).toBe('PASS')
    expect(report.runtimeAnimationFrames).toBe(0)
    expect(report.generatedDonorPolicy).toBe('rejected-not-used')
    for (const arm of report.arms) {
      expect(arm.bindChangedPixels).toBe(0)
      expect(arm.duplicateVisiblePixels).toBe(0)
      expect(arm.missingVisiblePixels).toBe(0)
    }
  })

  it('keeps every arm part on a real 1024 RGBA canvas', () => {
    for (const arm of report.arms) for (const relativePath of Object.values(arm.assets)) {
      expect(relativePath).not.toMatch(/(?:frame|run|pose)[-_]?\d+/i)
      const png = readFileSync(resolve(root, relativePath))
      expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
      expect(png.readUInt32BE(16)).toBe(1024)
      expect(png.readUInt32BE(20)).toBe(1024)
      expect(png[25]).toBe(6)
    }
  })
})
