import { describe, expect, it } from 'vitest'
import { resolveAnimationProfile } from './WhaleRenderer.tsx'

describe('approved desktop runtime quality policy', () => {
  it('keeps capable desktop devices on the high-quality realtime renderer', () => {
    expect(resolveAnimationProfile('auto', { hardwareConcurrency: 12, deviceMemory: 16 })).toEqual({
      quality: 'high', outputSize: 640, activeFps: 60, idleFps: 30,
    })
  })

  it('uses a lower mesh density for constrained or data-saving devices', () => {
    expect(resolveAnimationProfile('auto', { hardwareConcurrency: 4 })).toMatchObject({ quality: 'economy' })
    expect(resolveAnimationProfile('auto', { hardwareConcurrency: 12, saveData: true })).toMatchObject({ quality: 'economy' })
  })

  it('respects an explicit quality choice', () => {
    expect(resolveAnimationProfile('high', { hardwareConcurrency: 2 })).toMatchObject({ quality: 'high' })
    expect(resolveAnimationProfile('economy', { hardwareConcurrency: 16 })).toMatchObject({ quality: 'economy' })
  })
})
