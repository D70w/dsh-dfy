import type { WhaleActivityProjection, WhaleWorkReaction } from './activity/types.ts'
import type { AutonomyEpisode } from './autonomy.ts'

/** Renderer-independent action vocabulary used by both fallback and WhaleRig renderers. */
export type WhaleAction = 'idle' | 'working' | 'tool' | 'smug' | 'denying' | 'dragging' | 'petting' | 'feeding'

/** Short-lived direct interaction currently owning the character pose. */
export type WhaleInteraction = 'none' | 'drag' | 'pet' | 'feed'

export interface BehaviorContext {
  interaction: WhaleInteraction
  activity: WhaleActivityProjection | undefined
  liveReaction: WhaleWorkReaction
  autonomy?: AutonomyEpisode
}

/**
 * Resolve one action under the product priority: direct interaction, result,
 * active Harness work, then idle.
 * @param context - validated activity and local interaction facts.
 * @returns one renderer-independent action.
 */
export function resolveBehavior(context: BehaviorContext): WhaleAction {
  switch (context.interaction) {
    case 'drag': return 'dragging'
    case 'pet': return 'petting'
    case 'feed': return 'feeding'
    case 'none': break
  }
  if (context.liveReaction === 'completed') return 'smug'
  if (context.liveReaction === 'error') return 'denying'
  if (context.activity?.mode === 'tool') return 'tool'
  if (context.activity?.mode === 'thinking') return 'working'
  if (context.autonomy !== undefined) {
    if (context.autonomy.story === 'nap') {
      return context.autonomy.phase === 'recover' ? 'denying' : 'idle'
    }
    if (context.autonomy.story === 'rice_caught') {
      if (context.autonomy.phase === 'notice' || context.autonomy.phase === 'intend') return 'working'
      if (context.autonomy.phase === 'attempt' || context.autonomy.phase === 'result') return 'feeding'
      if (context.autonomy.phase === 'recover') {
        return context.autonomy.outcome === 'caught_by_user' ? 'denying' : 'smug'
      }
      return 'idle'
    }
    if (context.autonomy.story === 'bowl_accident') {
      if (context.autonomy.phase === 'notice' || context.autonomy.phase === 'intend') return 'working'
      if (context.autonomy.phase === 'attempt' || context.autonomy.phase === 'result') return 'denying'
      if (context.autonomy.phase === 'recover') return 'working'
      return 'idle'
    }
    if (context.autonomy.story === 'recovery_meal') {
      if (context.autonomy.phase === 'notice' || context.autonomy.phase === 'intend') return 'working'
      if (context.autonomy.phase === 'attempt' || context.autonomy.phase === 'result') return 'feeding'
      if (context.autonomy.phase === 'recover') return 'smug'
      return 'idle'
    }
    if (context.autonomy.story === 'cursor_visit') {
      return context.autonomy.phase === 'notice'
        || context.autonomy.phase === 'intend'
        || context.autonomy.phase === 'attempt'
        ? 'working'
        : 'idle'
    }
    if (context.autonomy.phase === 'result' || context.autonomy.phase === 'recover') {
      return context.autonomy.outcome === 'success' ? 'smug' : 'denying'
    }
    if (context.autonomy.phase !== 'return-home') return 'working'
  }
  return 'idle'
}

/** Static fallback states required even when the formal WhaleRig cannot start. */
export type WhaleFallbackState = 'idle' | 'working' | 'smug' | 'denying'

/**
 * Collapse richer actions onto the four guaranteed static fallback poses.
 * @param action - renderer-independent action.
 * @returns a pose supported by the inline fallback.
 */
export function fallbackStateFor(action: WhaleAction): WhaleFallbackState {
  switch (action) {
    case 'working':
    case 'tool':
      return 'working'
    case 'smug':
    case 'feeding':
      return 'smug'
    case 'denying':
    case 'dragging':
    case 'petting':
      return 'denying'
    case 'idle':
      return 'idle'
  }
}
