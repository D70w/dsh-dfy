import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { WhaleActivityProjection, WhaleToolKind, WhaleWorkReaction } from './types.ts'

interface WhaleActivityState extends WhaleActivityProjection {
  activeTurn: boolean
  pendingCalls: Record<string, WhaleToolKind>
}

const activitySchema = z.object({
  mode: z.enum(['idle', 'thinking', 'tool']),
  toolKind: z.enum(['none', 'read', 'search', 'command', 'write', 'other']),
  reaction: z.enum(['none', 'completed', 'error']),
  reactionSeq: z.number().int().min(-1),
}).strict()

export function classifyWhaleToolKind(name: string): WhaleToolKind {
  const tokens = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const has = (...values: readonly string[]): boolean => values.some(value => tokens.includes(value))
  if (has('read', 'open', 'view', 'inspect', 'fetch')) return 'read'
  if (has('search', 'grep', 'glob', 'find', 'query', 'rg', 'web', 'browse')) return 'search'
  if (has('write', 'edit', 'patch', 'apply', 'replace', 'create', 'delete', 'move', 'rename')) return 'write'
  if (has('exec', 'command', 'shell', 'bash', 'pwsh', 'powershell', 'terminal', 'run')) return 'command'
  return 'other'
}

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
    toolKind: 'none',
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
          toolKind: 'none',
          reaction: 'none',
          activeTurn: true,
          pendingCalls: {},
        }
      case 'step/start':
        return state.mode === 'thinking' && state.reaction === 'none'
          ? state
          : { ...state, mode: 'thinking', toolKind: 'none', reaction: 'none' }
      case 'tool/call':
        {
          const toolKind = classifyWhaleToolKind(event.data.name)
        return {
          ...state,
          mode: 'tool',
          toolKind,
          reaction: 'none',
          pendingCalls: { ...state.pendingCalls, [event.data.callId]: toolKind },
        }
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
          toolKind: Object.keys(pendingCalls).length === 0
            ? 'none'
            : Object.values(pendingCalls).at(-1) ?? 'other',
          pendingCalls,
        }
      }
      case 'step/end':
        return state.activeTurn
          ? { ...state, mode: 'thinking', toolKind: 'none', pendingCalls: {} }
          : state
      case 'turn/end':
        return {
          ...state,
          mode: 'idle',
          toolKind: 'none',
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
    toolKind: state.toolKind,
    reaction: state.reaction,
    reactionSeq: state.reactionSeq,
  }),
  stateVersion: 2,
}
