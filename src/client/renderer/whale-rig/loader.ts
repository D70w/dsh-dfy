import { WHALE_ASSET_ROUTE, WHALE_MANIFEST_URL } from '../../../asset-paths.ts'
import {
  type ResolvedWhalePack,
  validateResolvedPack,
  whaleExpressionsSchema,
  whaleManifestSchema,
  whaleMotionSchema,
  whalePhysicsSchema,
  whaleRigSchema,
} from './schema.ts'

const MAX_JSON_BYTES = 256 * 1024

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, credentials: 'same-origin' })
  if (!response.ok) throw new Error(`whale pack: ${url} returned ${response.status}`)
  if (!response.headers.get('content-type')?.startsWith('application/json')) {
    throw new Error(`whale pack: ${url} returned a non-JSON asset`)
  }
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) throw new Error(`whale pack: ${url} is too large`)
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_JSON_BYTES) throw new Error(`whale pack: ${url} is too large`)
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

function assetUrl(path: string): string {
  return `${WHALE_ASSET_ROUTE}/${path}`
}

export async function loadWhalePack(signal: AbortSignal): Promise<ResolvedWhalePack> {
  const manifest = whaleManifestSchema.parse(await fetchJson(WHALE_MANIFEST_URL, signal))
  const [rig, expressions, physics] = await Promise.all([
    fetchJson(assetUrl(manifest.files.rig), signal).then(value => whaleRigSchema.parse(value)),
    fetchJson(assetUrl(manifest.files.expressions), signal).then(value => whaleExpressionsSchema.parse(value)),
    fetchJson(assetUrl(manifest.files.physics), signal).then(value => whalePhysicsSchema.parse(value)),
  ])
  const motionPaths = [...new Set([
    ...Object.values(manifest.actions).map(action => action.motion),
    ...Object.values(manifest.performances).map(performance => performance.motion),
  ])]
  const motions = new Map(await Promise.all(motionPaths.map(async path => [
    path,
    whaleMotionSchema.parse(await fetchJson(assetUrl(path), signal)),
  ] as const)))
  return validateResolvedPack({
    manifest,
    rig,
    expressions,
    physics,
    motions,
    atlasUrl: assetUrl(manifest.files.atlas),
  })
}

export function loadAtlas(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const cleanup = (): void => {
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', onAbort)
    }
    const onAbort = (): void => {
      cleanup()
      image.src = ''
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }
    image.onload = () => { cleanup(); resolve(image) }
    image.onerror = () => { cleanup(); reject(new Error('whale pack: atlas failed to load')) }
    signal.addEventListener('abort', onAbort, { once: true })
    image.decoding = 'async'
    image.src = url
  })
}
