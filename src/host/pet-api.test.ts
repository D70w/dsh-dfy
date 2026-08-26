import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import Storage from '@deepseek-ai/dsh-storage'
import SessionStore from '@deepseek-ai/dsh-session'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as whalePet from '../index.ts'
import {
  PET_API_COMMANDS_PATH,
  PET_API_REQUEST_HEADER,
  PET_API_STATE_PATH,
} from './pet-api.ts'

const roots: string[] = []
const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function harness() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-dfy-state-'))
  roots.push(root)
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Storage)
  await ctx.plugin(StorageJson, { root })
  await ctx.plugin(StorageDomain, { backend: 'json' })
  await ctx.plugin(SessionStore)
  await ctx.plugin(WebServer, { host: '127.0.0.1', port: 0 })
  const fiber = ctx.plugin(whalePet)
  await fiber.await()
  const origin = `http://127.0.0.1:${ctx.webServer.port}`
  return { ctx, fiber, origin }
}

function command(origin: string, value: unknown, extraHeaders: Record<string, string> = {}) {
  return fetch(`${origin}${PET_API_COMMANDS_PATH}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [PET_API_REQUEST_HEADER]: '1',
      origin,
      ...extraHeaders,
    },
    body: JSON.stringify(value),
  })
}

describe('durable whale pet HTTP boundary', () => {
  it('persists serial idempotent commands without exposing internal receipts', async () => {
    const { fiber, origin } = await harness()
    const initial = await (await fetch(`${origin}${PET_API_STATE_PATH}`)).json() as any
    expect(initial.persistence).toBe('durable')
    expect(initial.state.revision).toBe(0)
    expect(initial.state).not.toHaveProperty('processedCommands')
    expect(initial.state).not.toHaveProperty('policy')

    const firstId = '00000000-0000-4000-8000-000000000001'
    const first = await (await command(origin, { id: firstId, type: 'pet' })).json() as any
    expect(first.applied).toBe(true)
    expect(first.state.revision).toBe(1)
    expect(first.state.memories.totalInteractions).toBe(1)

    const duplicate = await (await command(origin, { id: firstId, type: 'pet' })).json() as any
    expect(duplicate.reason).toBe('duplicate')
    expect(duplicate.state.revision).toBe(1)

    const concurrent = await Promise.all([2, 3].map(async index => {
      const response = await command(origin, {
        id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
        type: 'pet',
      })
      return await response.json() as any
    }))
    expect(concurrent.map(result => result.state.revision).toSorted()).toEqual([2, 3])
    expect((await (await fetch(`${origin}${PET_API_STATE_PATH}`)).json() as any)
      .state.memories.totalInteractions).toBe(3)

    await fiber.dispose()
    expect((await fetch(`${origin}${PET_API_STATE_PATH}`)).status).toBe(404)
  })

  it('rejects CSRF-shaped, malformed, unknown, and oversized writes', async () => {
    const { origin } = await harness()
    const noHeader = await fetch(`${origin}${PET_API_COMMANDS_PATH}`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin }, body: '{}',
    })
    expect(noHeader.status).toBe(403)

    expect((await command(origin, { id: 'nope', type: 'pet' })).status).toBe(400)
    expect((await command(origin, {
      id: '00000000-0000-4000-8000-000000000001', type: 'pet', prompt: 'secret',
    })).status).toBe(400)
    expect((await command(origin, {
      id: '00000000-0000-4000-8000-000000000001', type: 'pet',
    }, { origin: 'https://evil.example' })).status).toBe(403)
    expect((await fetch(`${origin}${PET_API_COMMANDS_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', [PET_API_REQUEST_HEADER]: '1' },
      body: '{}',
    })).status).toBe(415)
    expect((await fetch(`${origin}${PET_API_COMMANDS_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [PET_API_REQUEST_HEADER]: '1' },
      body: JSON.stringify({ padding: 'x'.repeat(5_000) }),
    })).status).toBe(413)
  })

  it('reopens the same durable revision after the plugin fiber is remounted', async () => {
    const { ctx, fiber, origin } = await harness()
    await command(origin, { id: '00000000-0000-4000-8000-000000000001', type: 'pet' })
    await fiber.dispose()

    const replacement = ctx.plugin(whalePet)
    await replacement.await()
    const reopened = await (await fetch(`${origin}${PET_API_STATE_PATH}`)).json() as any
    expect(reopened.persistence).toBe('durable')
    expect(reopened.state.revision).toBe(1)
    expect(reopened.state.memories.totalInteractions).toBe(1)
  })

  it('durably clears only dated diary and story history through the same-origin command boundary', async () => {
    const { ctx, fiber, origin } = await harness()
    await command(origin, {
      id: '00000000-0000-4000-8000-000000000011', type: 'pet',
    })
    await command(origin, {
      id: '00000000-0000-4000-8000-000000000012',
      type: 'record-story-outcome', storyId: 'nap', outcome: 'seen',
    })
    const before = (await (await fetch(`${origin}${PET_API_STATE_PATH}`)).json() as any).state
    expect(Object.keys(before.daily)).toHaveLength(1)
    expect(before.memories.storyMemory.nap.stage).toBe('seen')
    const affection = before.pet.stats.affection
    const activeDays = before.memories.activeDays

    const clearId = '00000000-0000-4000-8000-000000000013'
    const cleared = await (await command(origin, {
      id: clearId, type: 'clear-diary-history',
    })).json() as any
    expect(cleared.applied).toBe(true)
    expect(cleared.state.daily).toEqual({})
    expect(cleared.state.monthly).toEqual({})
    expect(cleared.state.memories.storyMemory).toEqual({})
    expect(cleared.state.pet.stats.affection).toBe(affection)
    expect(cleared.state.memories.activeDays).toEqual(activeDays)

    const retry = await (await command(origin, {
      id: clearId, type: 'clear-diary-history',
    })).json() as any
    expect(retry.reason).toBe('duplicate')
    expect(retry.state.revision).toBe(cleared.state.revision)

    await fiber.dispose()
    const replacement = ctx.plugin(whalePet)
    await replacement.await()
    const reopened = (await (await fetch(`${origin}${PET_API_STATE_PATH}`)).json() as any).state
    expect(reopened.daily).toEqual({})
    expect(reopened.memories.storyMemory).toEqual({})
    expect(reopened.pet.stats.affection).toBe(affection)
  })

  it('settles committed session events inside Host without a Browser command', async () => {
    const { ctx, origin } = await harness()
    const session = ctx.sessions.create()
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1_700_000_000_000)
    session.append('turn/start', { turn: 1 })
    now.mockReturnValue(1_700_000_065_000)
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
    now.mockRestore()

    let state: any
    for (let attempt = 0; attempt < 50; attempt += 1) {
      state = (await (await fetch(`${origin}${PET_API_STATE_PATH}`)).json() as any).state
      if (state.memories.completedTurns === 1) break
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    expect(state.memories.completedTurns).toBe(1)
    expect(state.memories.turnEndCounts.completed).toBe(1)
    expect(state.memories.totalWorkMinutes).toBe(1)
    expect(state.revision).toBe(1)
  })
})
