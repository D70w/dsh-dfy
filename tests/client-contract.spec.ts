import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string): string =>
  readFileSync(new URL('../' + path, import.meta.url), 'utf8')

describe('DSH browser architecture contract', () => {
  it('leaves observable binding to the slot renderer', () => {
    const components = [
      read('src/client/WhalePet.tsx'),
      read('src/client/WhaleSettings.tsx'),
    ].join('\n')
    expect(components).not.toContain('useSyncExternalStore')
    expect(components).toContain('PropsStore<')
    expect(components).not.toContain('SettingsScope')
  })

  it('uses the framework store seat for device-local position', () => {
    const entry = read('src/client/index.ts')
    expect(entry).toContain('const store = createWhaleStore()')
    expect(entry.match(/\n    store,/gu)).toHaveLength(2)
    expect(entry).not.toContain('createSnapshotStore')
    expect(entry).not.toContain('settingsScope')
  })

  it('reads privacy-safe Host activity through the root session projection', () => {
    const component = read('src/client/WhalePet.tsx')
    expect(component).toContain('useSessions')
    expect(component).toContain("projectionValues?.['whalePet.activity']")
    expect(component).toContain("data-whale-activity={activitySource.value === undefined ? 'absent' : 'ready'}")
    expect(component).not.toContain('tool.arguments')
    expect(component).not.toContain('prompt')
  })

  it('uses Harness semantic theme tokens outside the approved character-owned chrome', () => {
    const styles = read('src/client/styles.ts')
    expect(styles).toContain('--dsw-alias-')
    const hostChrome = styles.split('/* Approved desktop test runtime:')[0] ?? styles
    expect(hostChrome).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/iu)
  })
})
