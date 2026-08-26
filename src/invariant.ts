/** Package-owned invariant companion for dsh-dfy. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-dfy'

/** Cordis companion plugin name. */
export const name = 'dsh-dfy-invariant'

/** Invariant registry required before package ownership can be reserved. */
export const inject = ['invariants']

/**
 * No independent Host state exists in Phase 0: preferences and viewport state
 * are Browser-owned through one root-scoped DSH store.
 */
const install: InvariantInstaller = () => {}

/** Register this package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
