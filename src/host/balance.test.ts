import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBalanceHandler } from './balance.ts'

const servers: Server[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error === undefined ? resolve() : reject(error))
  })))
})

async function serve(handler: ReturnType<typeof createBalanceHandler>): Promise<string> {
  const server = createServer(handler)
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('missing test address')
  return `http://127.0.0.1:${address.port}`
}

describe('official balance Host proxy', () => {
  it('resolves the DSH credential on Host and returns only normalized balance data', async () => {
    const resolve = vi.fn(async () => ({ value: 'secret-key', source: 'test' }))
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret-key')
      return new Response(JSON.stringify({
        is_available: true,
        balance_infos: [{
          currency: 'CNY', total_balance: '11.05',
          granted_balance: '1.05', topped_up_balance: '10.00',
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    const origin = await serve(createBalanceHandler({ resolve } as never, request))
    const response = await fetch(origin)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({
      status: 'ready', currency: 'CNY', totalBalance: 11.05,
      grantedBalance: 1.05, toppedUpBalance: 10,
    })
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it('reports an unconfigured key without contacting DeepSeek', async () => {
    const request = vi.fn() as typeof fetch
    const origin = await serve(createBalanceHandler({ resolve: vi.fn(async () => undefined) } as never, request))
    const response = await fetch(origin)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'unconfigured' })
    expect(request).not.toHaveBeenCalled()
  })
})
