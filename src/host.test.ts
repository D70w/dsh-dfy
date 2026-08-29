import { Context } from '@deepseek-ai/cordis'
import SessionStore from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import { describe, expect, it } from 'vitest'
import { WHALE_ASSET_ROUTE, WHALE_IDLE_MANIFEST_FILE } from './asset-paths.ts'
import * as whalePet from './index.ts'

describe('whale-pet Host half', () => {
  it('loads and disposes without claiming a Host service', async () => {
    const ctx = new Context()
    const fiber = ctx.plugin(whalePet)
    await fiber.await()
    expect(fiber).toBeDefined()
    await fiber.dispose()
  })

  it('registers and removes the activity projection with its plugin fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    const fiber = ctx.plugin(whalePet)
    await fiber.await()
    const session = ctx.sessions.create()

    expect(ctx.sessionProjections.snapshot(session).values['whalePet.activity']).toEqual({
      mode: 'idle', toolKind: 'none', reaction: 'none', reactionSeq: -1,
    })
    session.append('turn/start', { turn: 1 })
    expect(ctx.sessionProjections.snapshot(session).values['whalePet.activity']?.mode).toBe('thinking')

    await fiber.dispose()
    expect(ctx.sessionProjections.snapshot(session).values['whalePet.activity']).toBeUndefined()
  })

  it('serves only whitelisted production assets and removes the route on unload', async () => {
    const ctx = new Context()
    const serverFiber = ctx.plugin(WebServer, { host: '127.0.0.1', port: 0 })
    await serverFiber
    const fiber = ctx.plugin(whalePet)
    await fiber.await()
    const base = `http://127.0.0.1:${ctx.webServer.port}${WHALE_ASSET_ROUTE}`

    const asset = await fetch(`${base}/${WHALE_IDLE_MANIFEST_FILE}`)
    expect(asset.status).toBe(200)
    expect(asset.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(asset.headers.get('cache-control')).toContain('max-age=86400')
    expect(asset.headers.get('x-content-type-options')).toBe('nosniff')
    const etag = asset.headers.get('etag')
    expect(etag).toMatch(/^"sha256-[0-9a-f]{64}"$/)
    expect((await asset.json() as { version: number }).version).toBe(2)

    expect((await fetch(`${base}/../source/atlas.svg`)).status).toBe(404)
    expect((await fetch(`${base}/%2e%2e/source/atlas.svg`)).status).toBe(404)
    expect((await fetch(`${base}/missing.json`)).status).toBe(404)
    expect((await fetch(`${base}/${WHALE_IDLE_MANIFEST_FILE}`, { method: 'POST' })).status).toBe(405)
    expect((await fetch(`${base}/${WHALE_IDLE_MANIFEST_FILE}`, {
      headers: { 'if-none-match': etag! },
    })).status).toBe(304)

    await fiber.dispose()
    expect((await fetch(`${base}/${WHALE_IDLE_MANIFEST_FILE}`)).status).toBe(404)
    await serverFiber.dispose()
  })
})
