/** Host half for the dsh-dfy bundle. */
import type { Context } from '@deepseek-ai/cordis'
import { whaleActivityProjectionDefinition } from './activity/projection.ts'
import { registerWhaleAssetRoute } from './host/assets.ts'
import { registerPetRuntime } from './host/pet-runtime.ts'
import { registerWhaleBalanceRoute } from './host/balance.ts'

export {
  DEFAULT_PREFERENCES,
  type WhalePreferences,
} from './preferences.ts'

/** Stable Cordis plugin name matching the bundle patch row. */
export const name = 'dsh-dfy'

/** The Host stays loadable without the optional projection capability. */
export const inject: string[] = []

/**
 * Register the privacy-safe activity fold when Session Projection is present.
 * @param ctx - plugin lifecycle context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register(whaleActivityProjectionDefinition)
  })
  registerWhaleAssetRoute(ctx)
  registerPetRuntime(ctx)
  registerWhaleBalanceRoute(ctx)
}
