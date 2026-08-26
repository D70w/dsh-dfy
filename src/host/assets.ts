import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import {
  WHALE_ASSET_ROUTE,
  WHALE_RUNTIME_FILES,
  type WhaleRuntimeFile,
} from '../asset-paths.ts'

const MAX_ASSET_BYTES = 8 * 1024 * 1024

interface AssetRecord {
  body: Buffer
  contentType: 'application/json; charset=utf-8' | 'image/png' | 'video/webm'
  etag: string
}

type AssetCatalog = ReadonlyMap<WhaleRuntimeFile, AssetRecord>

function readRuntimeFile(relativePath: WhaleRuntimeFile): Buffer {
  const candidates = [
    // Published bundle: lib/index.js -> package root.
    new URL(`../character-packs/default-whale/runtime/${relativePath}`, import.meta.url),
    // Source tests: src/host/assets.ts -> repository root.
    new URL(`../../character-packs/default-whale/runtime/${relativePath}`, import.meta.url),
  ]
  let missing: unknown
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      missing = error
    }
  }
  throw missing
}

function contentTypeOf(path: WhaleRuntimeFile): AssetRecord['contentType'] {
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webm')) return 'video/webm'
  return 'application/json; charset=utf-8'
}

/** Load only compile-time-whitelisted files from the versioned production pack. */
export function createWhaleAssetCatalog(): AssetCatalog {
  const catalog = new Map<WhaleRuntimeFile, AssetRecord>()
  for (const relativePath of WHALE_RUNTIME_FILES) {
    const body = readRuntimeFile(relativePath)
    if (body.byteLength > MAX_ASSET_BYTES) {
      throw new Error(`whale assets: ${relativePath} exceeds ${MAX_ASSET_BYTES} bytes`)
    }
    const digest = createHash('sha256').update(body).digest('hex')
    catalog.set(relativePath, {
      body,
      contentType: contentTypeOf(relativePath),
      etag: `"sha256-${digest}"`,
    })
  }
  return catalog
}

function requestedRange(header: string | undefined, length: number): { start: number; end: number } | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '')
  if (match === null) return undefined
  const startText = match[1] ?? ''
  const endText = match[2] ?? ''
  if (startText === '' && endText === '') return undefined
  if (startText === '') {
    const suffix = Math.min(length, Number(endText))
    if (!Number.isFinite(suffix) || suffix <= 0) return undefined
    return { start: length - suffix, end: length - 1 }
  }
  const start = Number(startText)
  const end = endText === '' ? length - 1 : Math.min(length - 1, Number(endText))
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= length) return undefined
  return { start, end }
}

export function createWhaleAssetHandler(catalog: AssetCatalog) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
    const prefix = `${WHALE_ASSET_ROUTE}/`
    if (!pathname.startsWith(prefix)) {
      res.writeHead(404)
      res.end()
      return
    }
    const relativePath = pathname.slice(prefix.length) as WhaleRuntimeFile
    const asset = catalog.get(relativePath)
    if (asset === undefined) {
      res.writeHead(404, { 'x-content-type-options': 'nosniff' })
      res.end()
      return
    }
    const headers: Record<string, string> = {
      'accept-ranges': asset.contentType === 'video/webm' ? 'bytes' : 'none',
      'cache-control': 'public, max-age=86400',
      'content-type': asset.contentType,
      'cross-origin-resource-policy': 'same-origin',
      etag: asset.etag,
      'x-content-type-options': 'nosniff',
    }
    if (req.headers['if-none-match'] === asset.etag) {
      res.writeHead(304, headers)
      res.end()
      return
    }
    const range = asset.contentType === 'video/webm'
      ? requestedRange(typeof req.headers.range === 'string' ? req.headers.range : undefined, asset.body.byteLength)
      : undefined
    if (range !== undefined) {
      const body = asset.body.subarray(range.start, range.end + 1)
      res.writeHead(206, {
        ...headers,
        'content-length': String(body.byteLength),
        'content-range': `bytes ${range.start}-${range.end}/${asset.body.byteLength}`,
      })
      res.end(req.method === 'HEAD' ? undefined : body)
      return
    }
    res.writeHead(200, { ...headers, 'content-length': String(asset.body.byteLength) })
    res.end(req.method === 'HEAD' ? undefined : asset.body)
  }
}

/** Register the route only while both this plugin fiber and WebServer are alive. */
export function registerWhaleAssetRoute(ctx: Context): void {
  ctx.inject(['webServer'], (assetCtx) => {
    let catalog: AssetCatalog
    try {
      catalog = createWhaleAssetCatalog()
    } catch (error) {
      assetCtx.logger.warn(error instanceof Error ? error : new Error(String(error)))
      return
    }
    const webServer = assetCtx.webServer as WebServer
    assetCtx.effect(
      () => webServer.register({
        kind: 'prefix',
        path: WHALE_ASSET_ROUTE,
        handler: createWhaleAssetHandler(catalog),
      }),
      'dsh-dfy: built-in character assets',
    )
  })
}
