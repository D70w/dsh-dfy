import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import {
  PET_API_COMMANDS_PATH,
  PET_API_REQUEST_HEADER,
  PET_API_STATE_PATH,
} from '../api-paths.ts'
import { petCommandSchema } from '../domain/commands.ts'
import type { PetStore } from './pet-storage.ts'

export {
  PET_API_BASE,
  PET_API_COMMANDS_PATH,
  PET_API_REQUEST_HEADER,
  PET_API_STATE_PATH,
} from '../api-paths.ts'
const MAX_COMMAND_BYTES = 4 * 1024

class RequestError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

function writeJson(res: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-length': String(body.byteLength),
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function sameOriginRequest(req: IncomingMessage): boolean {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const raw = req.headers.origin
  if (raw === undefined) return true
  if (Array.isArray(raw) || req.headers.host === undefined) return false
  try {
    const origin = new URL(raw)
    return (origin.protocol === 'http:' || origin.protocol === 'https:') && origin.host === req.headers.host
  } catch {
    return false
  }
}

async function readCommand(req: IncomingMessage): Promise<unknown> {
  if (req.headers[PET_API_REQUEST_HEADER] !== '1') throw new RequestError(403, 'missing-request-header')
  if (!sameOriginRequest(req)) throw new RequestError(403, 'cross-origin-request')
  const mediaType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') throw new RequestError(415, 'content-type-must-be-json')
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > MAX_COMMAND_BYTES) throw new RequestError(413, 'body-too-large')
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += bytes.byteLength
    if (total > MAX_COMMAND_BYTES) throw new RequestError(413, 'body-too-large')
    chunks.push(bytes)
  }
  try {
    return JSON.parse(Buffer.concat(chunks, total).toString('utf8')) as unknown
  } catch {
    throw new RequestError(400, 'invalid-json')
  }
}

export type PetStoreSource = PetStore | Promise<PetStore>

export function createPetStateHandler(source: PetStoreSource) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET')
      writeJson(res, 405, { error: 'method-not-allowed' })
      return
    }
    const store = await source
    writeJson(res, 200, { persistence: store.persistence, state: store.view() })
  }
}

export function createPetCommandHandler(source: PetStoreSource) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST')
      writeJson(res, 405, { error: 'method-not-allowed' })
      return
    }
    try {
      const command = petCommandSchema.parse(await readCommand(req))
      const store = await source
      const result = await store.dispatch(command)
      writeJson(res, 200, { persistence: store.persistence, ...result })
    } catch (error) {
      if (error instanceof RequestError) {
        writeJson(res, error.status, { error: error.code })
        return
      }
      if (error instanceof SyntaxError || (error instanceof Error && error.name === 'ZodError')) {
        writeJson(res, 400, { error: 'invalid-command' })
        return
      }
      writeJson(res, 500, { error: 'pet-state-unavailable' })
    }
  }
}

/** Mount the HTTP view over the shared Storage Domain owner. */
export function registerPetApiRoutes(ctx: Context, source: PetStoreSource): void {
  ctx.effect(() => {
    const webServer = ctx.webServer as WebServer
    const disposers: (() => void)[] = []
    try {
      disposers.push(webServer.register({
        kind: 'exact', path: PET_API_STATE_PATH, handler: createPetStateHandler(source),
      }))
      disposers.push(webServer.register({
        kind: 'exact', path: PET_API_COMMANDS_PATH, handler: createPetCommandHandler(source),
      }))
    } catch (error) {
      for (const dispose of disposers.reverse()) dispose()
      throw error
    }
    return () => {
      for (const dispose of disposers.reverse()) dispose()
    }
  }, 'dsh-dfy: durable state API')
}
