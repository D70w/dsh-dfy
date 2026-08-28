import type {
  PropsLocale, PropsRuntime, PropsStore,
} from '@deepseek-ai/dsh-client-ui-slots'
import { WHALE_SCALE, type WhalePreferences } from '../preferences.ts'
import type { createWhaleStore } from './store.ts'

export type WhaleSettingsProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'whalePet'>
  & PropsStore<ReturnType<typeof createWhaleStore>>

/** Harness settings page backed by the shared device-local whale store. */
export function WhaleSettings({
  actions, t, useStore,
}: WhaleSettingsProps): React.JSX.Element {
  const value = useStore(snapshot => snapshot.preferences)

  const toggle = (field: keyof WhalePreferences) => (event: React.ChangeEvent<HTMLInputElement>): void => {
    actions.setPreference(field, event.currentTarget.checked)
  }

  return (
    <section data-whale-settings aria-labelledby="whale-settings-title">
      <h2 id="whale-settings-title">{t('settings.title')}</h2>
      <p>{t('settings.description')}</p>
      <div data-whale-settings-grid>
        <Setting label={t('settings.visible')}>
          <input type="checkbox" checked={value['general.visible']} onChange={toggle('general.visible')} />
        </Setting>
        <Setting label={t('settings.quiet')}>
          <input type="checkbox" checked={value['general.quietMode']} onChange={toggle('general.quietMode')} />
        </Setting>
        <Setting label={t('settings.positionLocked')}>
          <input type="checkbox" checked={value['general.positionLocked'] ?? false} onChange={toggle('general.positionLocked')} />
        </Setting>
        <Setting label={t('settings.bubbles')}>
          <input type="checkbox" checked={value['bubble.enabled']} onChange={toggle('bubble.enabled')} />
        </Setting>
        <Setting label={t('settings.diary')}>
          <input type="checkbox" checked={value['diary.enabled'] ?? true} onChange={toggle('diary.enabled')} />
        </Setting>
        <Setting label={t('settings.billing.enabled')}>
          <input type="checkbox" checked={value['billing.enabled'] ?? true} onChange={toggle('billing.enabled')} />
        </Setting>
        <Setting label={t('settings.billing.profile')}>
          <select
            value={value['billing.priceProfile'] ?? 'deepseek-v4-flash'}
            disabled={!(value['billing.enabled'] ?? true)}
            onChange={(event) => actions.setPreference(
              'billing.priceProfile',
              event.currentTarget.value as WhalePreferences['billing.priceProfile'],
            )}
          >
            <option value="deepseek-v4-flash">{t('settings.billing.profile.flash')}</option>
            <option value="deepseek-v4-pro">{t('settings.billing.profile.pro')}</option>
          </select>
        </Setting>
        <Setting label={t('settings.balance.refresh')}>
          <select
            value={value['balance.refreshMinutes'] ?? 10}
            onChange={(event) => actions.setPreference(
              'balance.refreshMinutes', Number(event.currentTarget.value),
            )}
          >
            <option value="5">{t('settings.balance.refresh.5')}</option>
            <option value="10">{t('settings.balance.refresh.10')}</option>
            <option value="30">{t('settings.balance.refresh.30')}</option>
          </select>
        </Setting>
        <Setting label={t('settings.autonomy')}>
          <input type="checkbox" checked={value['autonomy.enabled']} onChange={toggle('autonomy.enabled')} />
        </Setting>
        <Setting label={t('settings.cursor')}>
          <input type="checkbox" checked={value['autonomy.cursorApproach']} disabled={!value['autonomy.enabled']} onChange={toggle('autonomy.cursorApproach')} />
        </Setting>
        <Setting label={t('settings.roaming')}>
          <input type="checkbox" checked={value['autonomy.roamingMode']} disabled={!value['autonomy.enabled']} onChange={toggle('autonomy.roamingMode')} />
        </Setting>
        <Setting label={t('settings.motion')}>
          <select
            value={value['animation.reducedMotion']}
            onChange={(event) => {
              actions.setPreference(
                'animation.reducedMotion',
                event.currentTarget.value as WhalePreferences['animation.reducedMotion'],
              )
            }}
          >
            <option value="system">{t('settings.motion.system')}</option>
            <option value="reduce">{t('settings.motion.reduce')}</option>
            <option value="allow">{t('settings.motion.allow')}</option>
          </select>
        </Setting>
        <Setting label={t('settings.quality')}>
          <select
            value={value['animation.quality'] ?? 'auto'}
            onChange={(event) => {
              actions.setPreference(
                'animation.quality',
                event.currentTarget.value as WhalePreferences['animation.quality'],
              )
            }}
          >
            <option value="auto">{t('settings.quality.auto')}</option>
            <option value="high">{t('settings.quality.high')}</option>
            <option value="economy">{t('settings.quality.economy')}</option>
          </select>
        </Setting>
        <Setting label={t('settings.secondaryMotion')}>
          <input
            type="checkbox"
            checked={value['animation.secondaryMotion'] ?? true}
            disabled={value['animation.reducedMotion'] === 'reduce'}
            onChange={toggle('animation.secondaryMotion')}
          />
        </Setting>
        <Setting label={`${t('settings.scale')} · ${Math.round(value['animation.scale'] * 100)}%`}>
          <input
            type="range"
            min={WHALE_SCALE.min}
            max={WHALE_SCALE.max}
            step={WHALE_SCALE.step}
            value={value['animation.scale']}
            onChange={(event) => {
              actions.setPreference('animation.scale', Number(event.currentTarget.value))
            }}
          />
        </Setting>
      </div>
    </section>
  )
}

function Setting({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div data-whale-setting>
      <label>
        <span>{label}</span>
        {children}
      </label>
    </div>
  )
}
