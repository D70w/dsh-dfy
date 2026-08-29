import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { classifyWhaleToolKind, whaleActivityProjectionDefinition as unit } from './projection.ts'

function event<T extends SessionEvent['type']>(
  type: T,
  seq: number,
  data: Extract<SessionEvent, { type: T }>['data'],
): Extract<SessionEvent, { type: T }> {
  return { type, seq, time: seq * 10, data } as Extract<SessionEvent, { type: T }>
}

describe('whale activity projection', () => {
  it('folds thinking and paired tool work without exposing event content', () => {
    let state = unit.init()
    state = unit.apply(state, event('turn/start', 0, { turn: 1 }))
    expect(unit.view(state)).toEqual({ mode: 'thinking', toolKind: 'none', reaction: 'none', reactionSeq: -1 })

    state = unit.apply(state, event('tool/call', 1, {
      turn: 1, step: 1, callId: 'call-1' as never, name: 'Read', arguments: '{"private":true}',
    }))
    expect(unit.view(state)).toEqual({ mode: 'tool', toolKind: 'read', reaction: 'none', reactionSeq: -1 })

    state = unit.apply(state, event('tool/result', 2, {
      turn: 1,
      step: 1,
      message: { role: 'tool', content: 'private output', source: { callId: 'call-1' as never } },
    } as never))
    expect(unit.view(state)).toEqual({ mode: 'thinking', toolKind: 'none', reaction: 'none', reactionSeq: -1 })
    expect(JSON.stringify(unit.view(state))).not.toContain('secret')
    expect(JSON.stringify(unit.view(state))).not.toContain('private')
  })

  it('retains only a deduplicatable result kind and causing sequence', () => {
    let state = unit.apply(unit.init(), event('turn/start', 3, { turn: 2 }))
    state = unit.apply(state, event('turn/end', 8, { turn: 2, reason: { kind: 'completed' } }))
    expect(unit.view(state)).toEqual({ mode: 'idle', toolKind: 'none', reaction: 'completed', reactionSeq: 8 })

    state = unit.apply(state, event('turn/start', 9, { turn: 3 }))
    state = unit.apply(state, event('turn/end', 12, {
      turn: 3,
      reason: { kind: 'error', error: { message: 'private failure', code: 'UNKNOWN' } },
    }))
    expect(unit.view(state)).toEqual({ mode: 'idle', toolKind: 'none', reaction: 'error', reactionSeq: 12 })
  })

  it('returns the same state reference for unrelated events', () => {
    const state = unit.init()
    expect(unit.apply(state, event('todo/write', 0, { todos: [] }))).toBe(state)
  })

  it('classifies tool names without exposing names, paths, arguments or output', () => {
    expect(classifyWhaleToolKind('Read')).toBe('read')
    expect(classifyWhaleToolKind('mcp__files__read_file')).toBe('read')
    expect(classifyWhaleToolKind('Grep')).toBe('search')
    expect(classifyWhaleToolKind('web__search_query')).toBe('search')
    expect(classifyWhaleToolKind('Pwsh')).toBe('command')
    expect(classifyWhaleToolKind('functions.exec_command')).toBe('command')
    expect(classifyWhaleToolKind('apply_patch')).toBe('write')
    expect(classifyWhaleToolKind('unknown_private_tool')).toBe('other')
  })
})
