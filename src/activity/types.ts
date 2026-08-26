/** Pure, browser-safe activity vocabulary projected from one Harness session. */
export type WhaleWorkMode = 'idle' | 'thinking' | 'tool'

/** A one-shot result retained with its causing sequence for client-side deduplication. */
export type WhaleWorkReaction = 'none' | 'completed' | 'error'

/**
 * The complete privacy-safe value exposed by the Host projection.
 * It deliberately contains no prompts, tool names, arguments, paths, or output.
 */
export interface WhaleActivityProjection {
  mode: WhaleWorkMode
  reaction: WhaleWorkReaction
  reactionSeq: number
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Current work mode and the last discrete result for the whale companion. */
    'whalePet.activity': WhaleActivityProjection
  }
}

