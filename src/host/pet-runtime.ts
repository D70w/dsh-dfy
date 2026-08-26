import type { Context } from '@deepseek-ai/cordis'
import type { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { registerPetApiRoutes } from './pet-api.ts'
import { openPetStore } from './pet-storage.ts'
import { WorkRewardTracker } from './work-rewards.ts'

/** One Storage Domain handle shared by Browser commands and trusted work rewards. */
export function registerPetRuntime(ctx: Context): void {
  ctx.inject(['storageDomain'], (storageCtx) => {
    const source = openPetStore(storageCtx, storageCtx.storageDomain as DomainFacility)
    const tracker = new WorkRewardTracker(source, (error) => {
      storageCtx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    })

    storageCtx.on('session/event', (session, event: SessionEvent) => {
      tracker.observe(session, event)
    }, { global: true })

    storageCtx.inject(['webServer'], (apiCtx) => {
      registerPetApiRoutes(apiCtx, source)
    })

    storageCtx.effect(() => async () => {
      await tracker.drain()
      await (await source).close()
    }, 'dsh-dfy: shared durable state')
  })
}
