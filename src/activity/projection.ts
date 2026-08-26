import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { WhaleActivityProjection, WhaleWorkReaction } from './types.ts'

interface WhaleActivityState extends WhaleActivityProjection {
  activeTurn: boolean
  pendingCalls: Record<string, true>
}

const activitySchema = z.object({
  mode: z.enum(['idle', 'thinking', 'tool']),
  reaction: z.enum(['none', 'completed', 'error']),
  reactionSeq: z.number().int().min(-1),
}).strict()

function resultReaction(kind: string): WhaleWorkReaction {
  switch (kind) {
    case 'completed':
      return 'completed'
    case 'blocked':
    case 'error':
    case 'max-tokens':
      return 'error'
    default:
      return 'none'
  }
}

/** Pure fold registered by the Host half as `whalePet.activity`. */
export const whaleActivityProjectionDefinition:
ProjectionDefinition<'whalePet.activity', WhaleActivityState> = {
  key: 'whalePet.activity',
  schema: activitySchema,
  init: () => ({
    mode: 'idle',
    reaction: 'none',
    reactionSeq: -1,
    activeTurn: false,
    pendingCalls: {},
  }),
  apply: (state, event) => {
    switch (event.type) {
      case 'turn/start':
        return {
          ...state,
          mode: 'thinking',
          reaction: 'none',
          activeTurn: true,
          pendingCalls: {},
        }
      case 'step/start':
        return state.mode === 'thinking' && state.reaction === 'none'
          ? state
          : { ...state, mode: 'thinking', reaction: 'none' }
      case 'tool/call':
        return {
          ...state,
          mode: 'tool',
          reaction: 'none',
          pendingCalls: { ...state.pendingCalls, [event.data.callId]: true },
        }
      case 'tool/result': {
        const callId = event.data.message.source.callId
        if (!Object.hasOwn(state.pendingCalls, callId)) return state
        const pendingCalls = Object.fromEntries(
          Object.entries(state.pendingCalls).filter(([id]) => id !== callId),
        )
        return {
          ...state,
          mode: Object.keys(pendingCalls).length === 0 ? 'thinking' : 'tool',
          pendingCalls,
        }
      }
      case 'step/end':
        return state.activeTurn
          ? { ...state, mode: 'thinking', pendingCalls: {} }
          : state
      case 'turn/end':
        return {
          ...state,
          mode: 'idle',
          reaction: resultReaction(event.data.reason.kind),
          reactionSeq: event.seq,
          activeTurn: false,
          pendingCalls: {},
        }
      default:
        return state
    }
  },
  view: state => ({
    mode: state.mode,
    reaction: state.reaction,
    reactionSeq: state.reactionSeq,
  }),
  stateVersion: 1,
}

