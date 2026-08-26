import { z } from 'zod'
import { WHALE_ASSET_ROUTE, WHALE_RIG2_MANIFEST_URL } from '../../../asset-paths.ts'
import type { SecondaryMotionId } from './mesh-skinning-preview.ts'
import type { SpringParameters } from './secondary-motion.ts'

const hashedTexturePath = z.string().regex(/^rig2\/[a-z0-9-]+\.[0-9a-f]{12}\.png$/)
const springParametersSchema = z.object({
  stiffness: z.number().min(1).max(400),
  damping: z.number().min(0).max(100),
  maxOffset: z.number().min(1).max(45),
}).strict()

export const rig2TextureIds = [
  'hair-back-complete', 'tail-complete', 'leg-near-complete', 'leg-far-complete',
  'dress-complete', 'head-front-complete-v3', 'ahoge-complete',
  'arm-far-upper', 'arm-far-forearm', 'arm-far-hand',
  'arm-far-elbow-upper-underlay', 'arm-far-elbow-forearm-underlay', 'arm-far-wrist-underlay',
  'arm-near-upper', 'arm-near-forearm', 'arm-near-hand',
  'arm-near-elbow-upper-underlay', 'arm-near-elbow-forearm-underlay', 'arm-near-wrist-underlay',
] as const

const textureSchema = z.object(Object.fromEntries(rig2TextureIds.map(id => [id, hashedTexturePath])) as {
  [K in typeof rig2TextureIds[number]]: typeof hashedTexturePath
}).strict()

const rig2ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal('whale-maid-realtime-v1'),
  canvas: z.object({ width: z.literal(1024), height: z.literal(1024) }).strict(),
  animationFrames: z.literal(0),
  runtimeSourcePolicy: z.object({
    gif: z.literal(false),
    video: z.literal(false),
    spriteSheet: z.literal(false),
    actionPngSequence: z.literal(false),
  }).strict(),
  textures: textureSchema,
  springDefaults: z.object({
    tail: springParametersSchema,
    hair: springParametersSchema,
    ahoge: springParametersSchema,
  }).strict(),
  run: z.object({ durationMs: z.number().int().min(400).max(2000), phases: z.literal(4) }).strict(),
}).strict()

export type Rig2ProductionManifest = z.infer<typeof rig2ManifestSchema>

const MAX_MANIFEST_BYTES = 64 * 1024

export async function loadRig2ProductionManifest(signal: AbortSignal): Promise<Rig2ProductionManifest> {
  const response = await fetch(WHALE_RIG2_MANIFEST_URL, { signal, credentials: 'same-origin' })
  if (!response.ok) throw new Error(`whale rig2: manifest returned ${response.status}`)
  if (!response.headers.get('content-type')?.startsWith('application/json')) throw new Error('whale rig2: manifest has wrong content type')
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_MANIFEST_BYTES) throw new Error('whale rig2: manifest is too large')
  return rig2ManifestSchema.parse(JSON.parse(new TextDecoder().decode(bytes)) as unknown)
}

export function resolveRig2TextureUrls(manifest: Rig2ProductionManifest): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(manifest.textures).map(([id, path]) => [id, `${WHALE_ASSET_ROUTE}/${path}`]))
}

export function rig2SpringDefaults(manifest: Rig2ProductionManifest): Readonly<Record<SecondaryMotionId, SpringParameters>> {
  return manifest.springDefaults
}

