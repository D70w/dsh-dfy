import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DurablePetStore,
  openPetStore,
  whalePetDomainSpec,
} from './pet-storage.ts'

const contexts: Context[] = []
const roots: string[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function facility() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-dfy-migration-'))
  roots.push(root)
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Storage)
  await ctx.plugin(StorageJson, { root })
  await ctx.plugin(StorageDomain, { backend: 'json' })
  return ctx
}

describe('Whale Pet Storage Domain owner', () => {
  it('backs up and migrates the controlled v0 record before serving v1', async () => {
    const ctx = await facility()
    const seed = await ctx.storageDomain.open(whalePetDomainSpec)
    await seed.global.set({
      schemaVersion: 0,
      revision: 7,
      createdAt: 123,
      hunger: 42,
      mood: 51,
      affection: 19,
      energy: 80,
      totalInteractions: 12,
      totalFeedCount: 3,
      processedCommands: [],
    })
    await seed.close()

    const store = await DurablePetStore.open(ctx.storageDomain, 1_700_000_000_000)
    expect(store.view().schemaVersion).toBe(1)
    expect(store.view().revision).toBe(8)
    expect(store.view().pet.stats.hunger).toBe(42)
    await store.close()

    const inspect = await ctx.storageDomain.open(whalePetDomainSpec)
    expect(inspect.table('backups').size).toBe(1)
    expect(inspect.global.get().schemaVersion).toBe(1)
    await inspect.close()
  })

  it('contains an unavailable durable backend in an explicit temporary store', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    const warn = vi.spyOn(ctx.logger, 'warn')
    const store = await openPetStore(ctx, {
      open: () => Promise.reject(new Error('medium malformed')),
    } as unknown as StorageDomain.DomainFacility)
    expect(store.persistence).toBe('temporary')
    expect(store.view().revision).toBe(0)
    expect(warn).toHaveBeenCalledOnce()
    await store.close()
  })
})
