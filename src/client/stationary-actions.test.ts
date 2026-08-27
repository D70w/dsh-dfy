import { describe, expect, it } from 'vitest'
import { WHALE_RUNTIME_FILES } from '../asset-paths.ts'
import { STATIONARY_ACTIONS } from './stationary-actions.ts'

describe('classic stationary video actions', () => {
  it('keeps the complete approved test-site action set', () => {
    expect(STATIONARY_ACTIONS.map(action => action.id)).toEqual([
      'nod', 'wave', 'cute', 'point', 'confident',
      'clap', 'curtsy', 'surprise', 'stretch', 'clean',
    ])
    expect(STATIONARY_ACTIONS.find(action => action.id === 'curtsy')?.label).toBe('女仆屈膝礼')
  })

  it('only references videos shipped by the production asset route', () => {
    const runtimeFiles = new Set<string>(WHALE_RUNTIME_FILES)
    for (const action of STATIONARY_ACTIONS) {
      expect(runtimeFiles.has(`production-v1/actions/${action.file}`)).toBe(true)
    }
  })

  it('uses unique ids and files so actions can be retriggered safely', () => {
    expect(new Set(STATIONARY_ACTIONS.map(action => action.id)).size).toBe(STATIONARY_ACTIONS.length)
    expect(new Set(STATIONARY_ACTIONS.map(action => action.file)).size).toBe(STATIONARY_ACTIONS.length)
  })
})
