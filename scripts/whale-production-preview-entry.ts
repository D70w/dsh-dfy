import type { WhaleAction } from '../src/behavior.ts'
import { WHALE_MANIFEST_FILE } from '../src/asset-paths.ts'
import { MotionMixer, type ParameterValues } from '../src/client/renderer/whale-rig/motion.ts'
import {
  validateResolvedPack,
  whaleExpressionsSchema,
  whaleManifestSchema,
  whaleMotionSchema,
  whalePhysicsSchema,
  whaleRigSchema,
  type ResolvedWhalePack,
  type WhalePerformance,
} from '../src/client/renderer/whale-rig/schema.ts'
import { WhaleRigRenderer } from '../src/client/renderer/whale-rig/webgl.ts'

const settledAtMs = 200

async function json(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json() as Promise<unknown>
}

function image(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const value = new Image()
    value.onload = () => resolve(value)
    value.onerror = () => reject(new Error(`${url} failed to load`))
    value.src = url
  })
}

async function loadPack(runtimeUrl: string): Promise<{ pack: ResolvedWhalePack; atlas: HTMLImageElement }> {
  const manifest = whaleManifestSchema.parse(await json(`${runtimeUrl}/${WHALE_MANIFEST_FILE}`))
  const [rig, expressions, physics] = await Promise.all([
    json(`${runtimeUrl}/${manifest.files.rig}`).then(value => whaleRigSchema.parse(value)),
    json(`${runtimeUrl}/${manifest.files.expressions}`).then(value => whaleExpressionsSchema.parse(value)),
    json(`${runtimeUrl}/${manifest.files.physics}`).then(value => whalePhysicsSchema.parse(value)),
  ])
  const motionPaths = [...new Set([
    ...Object.values(manifest.actions).map(action => action.motion),
    ...Object.values(manifest.performances).map(performance => performance.motion),
  ])]
  const motions = new Map(await Promise.all(motionPaths.map(async path => [
    path,
    whaleMotionSchema.parse(await json(`${runtimeUrl}/${path}`)),
  ] as const)))
  const pack = validateResolvedPack({ manifest, rig, expressions, physics, motions, atlasUrl: `${runtimeUrl}/${manifest.files.atlas}` })
  return { pack, atlas: await image(pack.atlasUrl) }
}

export interface ProductionRunPreview {
  drawRunFrame(frame: number, mirrored?: boolean): ParameterValues
  drawEnterReady(atMs: number): ParameterValues
  drawReadyToRun(atMs: number, runAtMs?: number): ParameterValues
  drawExitRun(atMs: number, runAtMs?: number): ParameterValues
  dispose(): void
}

function mixer(pack: ResolvedWhalePack, action: WhaleAction = 'idle'): MotionMixer {
  return new MotionMixer(pack, action, 0)
}

/** Create a deterministic viewer backed by the production mixer and WebGL renderer. */
export async function createProductionRunPreview(
  canvas: HTMLCanvasElement,
  runtimeUrl = '../../character-packs/default-whale/runtime',
): Promise<ProductionRunPreview> {
  const loaded = await loadPack(runtimeUrl)
  const renderer = new WhaleRigRenderer(canvas, loaded.pack, loaded.atlas)
  const draw = (values: ParameterValues, mirrored = false): ParameterValues => {
    renderer.draw(values, mirrored)
    return values
  }
  const settledPerformance = (performance: WhalePerformance, atMs: number): MotionMixer => {
    const value = mixer(loaded.pack)
    value.setPerformance(performance, 0)
    value.sample(settledAtMs, false, atMs)
    return value
  }
  return {
    drawRunFrame(frame, mirrored = false) {
      const value = settledPerformance('run', frame * 30)
      return draw(value.sample(settledAtMs, false, frame * 30), mirrored)
    },
    drawEnterReady(atMs) {
      const value = mixer(loaded.pack)
      value.setPerformance('ready', 0)
      return draw(value.sample(atMs, false, 0))
    },
    drawReadyToRun(atMs, runAtMs = 0) {
      const value = settledPerformance('ready', 0)
      value.setPerformance('run', settledAtMs)
      return draw(value.sample(settledAtMs + atMs, false, runAtMs))
    },
    drawExitRun(atMs, runAtMs = 0) {
      const value = settledPerformance('run', runAtMs)
      value.setPerformance(undefined, settledAtMs)
      return draw(value.sample(settledAtMs + atMs, false, runAtMs))
    },
    dispose() {
      renderer.dispose()
    },
  }
}
