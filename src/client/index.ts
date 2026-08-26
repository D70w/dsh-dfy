/** Browser half: root overlay, shared Settings page, and device-local position. */
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { LOCALE_NAMESPACE, en, zh, type WhaleLocaleKey } from './locales.ts'
import { createWhaleStore } from './store.ts'
import { WHALE_STYLE } from './styles.ts'
import { WhalePet } from './WhalePet.tsx'
import { WhaleSettings } from './WhaleSettings.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    whalePet: WhaleLocaleKey
  }
}

/** Browser services required by the two root-scoped UI slots. */
export const inject = ['slots', 'locale']

/** Register both surfaces and ensure every contribution disappears on unload. */
export function apply(ctx: ClientContext): void {
  const store = createWhaleStore()

  ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }), 'dsh-dfy: dictionaries')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-dfy'
    style.dataset.pluginCss = 'dsh-dfy/inline'
    style.textContent = WHALE_STYLE
    document.head.appendChild(style)
    return () => style.remove()
  }, 'dsh-dfy: styles')

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-dfy',
    order: 100,
    locale: LOCALE_NAMESPACE,
    store,
  }, WhalePet))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-dfy',
    order: 120,
    label: () => ctx.locale.bind(LOCALE_NAMESPACE)('settings.title'),
    locale: LOCALE_NAMESPACE,
    store,
  }, WhaleSettings))
}
