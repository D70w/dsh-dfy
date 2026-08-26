import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { WHALE_BALANCE_PATH } from '../api-paths.ts'
import { normalizeDeepSeekBalance } from '../balance.ts'

const DEEPSEEK_API_KEY = credentialRef('DEEPSEEK_API_KEY')
const DEEPSEEK_BALANCE_URL = 'https://api.deepseek.com/user/balance'

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value))
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-length': String(body.byteLength),
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

export function createBalanceHandler(
  credentials: Pick<CredentialProvider, 'resolve'>,
  request: typeof fetch = fetch,
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== 'GET') {
      res.writeHead(405, { allow: 'GET' })
      res.end()
      return
    }
    const credential = await credentials.resolve(DEEPSEEK_API_KEY)
    if (credential === undefined) {
      sendJson(res, 503, { status: 'unconfigured' })
      return
    }
    try {
      const response = await request(DEEPSEEK_BALANCE_URL, {
        headers: { accept: 'application/json', authorization: `Bearer ${credential.value}` },
        signal: AbortSignal.timeout(8_000),
      })
      if (!response.ok) {
        sendJson(res, response.status === 401 ? 401 : 502, { status: 'unavailable' })
        return
      }
      const value = normalizeDeepSeekBalance(await response.json() as Record<string, unknown>)
      sendJson(res, 200, value)
    } catch {
      sendJson(res, 502, { status: 'unavailable' })
    }
  }
}

/** Resolve the DSH-owned secret only on Host and expose a non-secret same-origin balance view. */
export function registerWhaleBalanceRoute(ctx: Context): void {
  ctx.inject(['webServer', 'credentials'], (balanceCtx) => {
    const webServer = balanceCtx.webServer as WebServer
    const credentials = balanceCtx.credentials as CredentialProvider
    balanceCtx.effect(() => webServer.register({
      kind: 'exact',
      path: WHALE_BALANCE_PATH,
      handler: createBalanceHandler(credentials),
    }), 'dsh-dfy: official DeepSeek balance')
  })
}
