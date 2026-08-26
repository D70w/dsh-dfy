import { z } from 'zod'
import type { WhaleAction } from '../../../behavior.ts'

const identifier = z.string().regex(/^[a-z][a-z0-9-]{0,47}$/)
const parameterId = z.string().regex(/^[a-z][A-Za-z0-9]{0,47}$/)
const runtimePath = z.string().regex(/^(?:motions\/)?[a-z0-9-]+\.[0-9a-f]{12}\.(?:json|png)$/)
const dimension = z.number().int().positive().max(2048)
const finite = z.number().finite()

const parameterSchema = z.object({
  id: parameterId,
  default: finite,
  min: finite,
  max: finite,
}).strict().refine(value => value.min <= value.default && value.default <= value.max, 'default must be inside limits')

const meshDeformerSchema = z.object({
  parameter: parameterId,
  center: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  radius: z.tuple([z.number().positive().max(2), z.number().positive().max(2)]),
  direction: z.tuple([finite, finite]).refine(value => Math.hypot(value[0], value[1]) <= 2, 'direction is too large'),
  falloff: z.number().min(0.5).max(4).optional(),
}).strict()

const meshSchema = z.object({
  columns: z.number().int().min(2).max(24),
  rows: z.number().int().min(2).max(24),
  deformers: z.array(meshDeformerSchema).min(1).max(12),
}).strict()

const uvSchema = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
  dimension.max(512),
  dimension.max(512),
])

const partSchema = z.object({
  id: identifier,
  parent: identifier.nullable(),
  z: z.number().int().min(-64).max(64),
  position: z.tuple([finite, finite]),
  size: z.tuple([dimension.max(512), dimension.max(512)]),
  pivot: z.tuple([finite, finite]),
  uv: uvSchema,
  frames: z.array(uvSchema).min(2).max(32).optional(),
  frameParameter: parameterId.optional(),
  opacityParameter: parameterId.optional(),
  rotationParameter: parameterId.optional(),
  translateXParameter: parameterId.optional(),
  translateYParameter: parameterId.optional(),
  scaleXParameter: parameterId.optional(),
  scaleYParameter: parameterId.optional(),
  bendParameter: parameterId.optional(),
  segments: z.number().int().min(2).max(8).optional(),
  mesh: meshSchema.optional(),
}).strict()

const valuesSchema = z.record(parameterId, finite)

export const whaleRigSchema = z.object({
  schemaVersion: z.literal(2),
  canvas: z.object({ width: dimension.max(512), height: dimension.max(512) }).strict(),
  atlasSize: z.object({ width: dimension, height: dimension }).strict(),
  parameters: z.array(parameterSchema).min(1).max(32),
  parts: z.array(partSchema).min(1).max(64),
  poses: z.record(identifier, valuesSchema).refine(value => Object.keys(value).length <= 16),
}).strict().superRefine((rig, ctx) => {
  const parameters = new Set(rig.parameters.map(parameter => parameter.id))
  const parts = new Map(rig.parts.map(part => [part.id, part]))
  if (parameters.size !== rig.parameters.length) ctx.addIssue({ code: 'custom', message: 'duplicate parameter id' })
  if (parts.size !== rig.parts.length) ctx.addIssue({ code: 'custom', message: 'duplicate part id' })
  for (const part of rig.parts) {
    if (part.parent !== null && !parts.has(part.parent)) ctx.addIssue({ code: 'custom', message: `unknown parent ${part.parent}` })
    for (const id of [
      part.opacityParameter,
      part.rotationParameter,
      part.translateXParameter,
      part.translateYParameter,
      part.scaleXParameter,
      part.scaleYParameter,
      part.bendParameter,
      part.frameParameter,
    ]) {
      if (id !== undefined && !parameters.has(id)) ctx.addIssue({ code: 'custom', message: `unknown parameter ${id}` })
    }
    if (part.segments !== undefined && part.bendParameter === undefined) {
      ctx.addIssue({ code: 'custom', message: `part ${part.id} has segments without bend parameter` })
    }
    if ((part.frames === undefined) !== (part.frameParameter === undefined)) {
      ctx.addIssue({ code: 'custom', message: `part ${part.id} must declare frames and frameParameter together` })
    }
    for (const deformer of part.mesh?.deformers ?? []) {
      if (!parameters.has(deformer.parameter)) ctx.addIssue({ code: 'custom', message: `unknown parameter ${deformer.parameter}` })
    }
    for (const [x, y, width, height] of [part.uv, ...(part.frames ?? [])]) {
      if (x + width > rig.atlasSize.width || y + height > rig.atlasSize.height) {
        ctx.addIssue({ code: 'custom', message: `part ${part.id} exceeds atlas bounds` })
      }
    }
    const seen = new Set<string>([part.id])
    let parent = part.parent
    while (parent !== null) {
      if (seen.has(parent)) {
        ctx.addIssue({ code: 'custom', message: `part cycle at ${part.id}` })
        break
      }
      seen.add(parent)
      parent = parts.get(parent)?.parent ?? null
    }
  }
  for (const [pose, values] of Object.entries(rig.poses)) {
    for (const id of Object.keys(values)) {
      if (!parameters.has(id)) ctx.addIssue({ code: 'custom', message: `pose ${pose} uses unknown parameter ${id}` })
    }
  }
})

export const whaleExpressionsSchema = z.object({
  schemaVersion: z.literal(2),
  expressions: z.record(identifier, valuesSchema).refine(value => Object.keys(value).length <= 16),
}).strict()

const springSchema = z.object({
  id: identifier,
  input: parameterId,
  output: parameterId,
  stiffness: z.number().positive().max(400),
  damping: z.number().nonnegative().max(100),
  maxOffset: z.number().positive().max(180),
}).strict()

export const whalePhysicsSchema = z.object({
  schemaVersion: z.literal(2),
  springs: z.array(springSchema).max(8),
}).strict()

const keyframeSchema = z.tuple([z.number().nonnegative().max(30_000), finite])
const curveSchema = z.object({
  parameter: parameterId,
  keyframes: z.array(keyframeSchema).min(1).max(64),
  interpolation: z.enum(['linear', 'cubic', 'step']).optional(),
}).strict()

export const whaleMotionSchema = z.object({
  schemaVersion: z.literal(2),
  id: identifier,
  durationMs: z.number().int().positive().max(30_000),
  loop: z.boolean(),
  curves: z.array(curveSchema).max(32),
  cues: z.array(z.object({ name: identifier, atMs: z.number().int().nonnegative().max(30_000) }).strict()).max(16),
}).strict().superRefine((motion, ctx) => {
  for (const curve of motion.curves) {
    let previous = -1
    for (const [at] of curve.keyframes) {
      if (at < previous || at > motion.durationMs) ctx.addIssue({ code: 'custom', message: `invalid keyframe order for ${curve.parameter}` })
      previous = at
    }
  }
  for (const cue of motion.cues) {
    if (cue.atMs > motion.durationMs) ctx.addIssue({ code: 'custom', message: `cue ${cue.name} exceeds duration` })
  }
})

const actionSchema = z.object({
  motion: runtimePath,
  pose: identifier,
  expression: identifier,
  loop: z.boolean(),
  mirrorable: z.boolean(),
}).strict()

const performanceSchema = z.object({
  motion: runtimePath,
  pose: identifier,
  loop: z.boolean(),
  mirrorable: z.boolean(),
  stridePx: z.number().positive().max(128).optional(),
}).strict()

const actionKeys = ['idle', 'working', 'tool', 'smug', 'denying', 'dragging', 'petting', 'feeding'] as const satisfies readonly WhaleAction[]
export const whalePerformanceKeys = ['ready', 'run'] as const
export type WhalePerformance = typeof whalePerformanceKeys[number]

export const whaleManifestSchema = z.object({
  schemaVersion: z.literal(2),
  id: identifier,
  displayName: z.string().min(1).max(64),
  canvas: z.object({ width: dimension.max(512), height: dimension.max(512) }).strict(),
  files: z.object({
    atlas: runtimePath,
    fallback: runtimePath,
    rig: runtimePath,
    expressions: runtimePath,
    physics: runtimePath,
  }).strict(),
  actions: z.object(Object.fromEntries(actionKeys.map(key => [key, actionSchema])) as Record<WhaleAction, typeof actionSchema>).strict(),
  performances: z.object(Object.fromEntries(whalePerformanceKeys.map(key => [key, performanceSchema])) as Record<WhalePerformance, typeof performanceSchema>).strict(),
  capabilities: z.array(z.enum(['drag', 'pet', 'feed', 'expressions'])).max(8),
}).strict()

export type WhaleRigDefinition = z.infer<typeof whaleRigSchema>
export type WhaleExpressions = z.infer<typeof whaleExpressionsSchema>
export type WhalePhysics = z.infer<typeof whalePhysicsSchema>
export type WhaleMotion = z.infer<typeof whaleMotionSchema>
export type WhaleManifest = z.infer<typeof whaleManifestSchema>

export interface ResolvedWhalePack {
  manifest: WhaleManifest
  rig: WhaleRigDefinition
  expressions: WhaleExpressions
  physics: WhalePhysics
  motions: ReadonlyMap<string, WhaleMotion>
  atlasUrl: string
}

/** Validate cross-file references after each file has passed its own strict schema. */
export function validateResolvedPack(pack: ResolvedWhalePack): ResolvedWhalePack {
  if (pack.manifest.canvas.width !== pack.rig.canvas.width || pack.manifest.canvas.height !== pack.rig.canvas.height) {
    throw new Error('whale pack: manifest and rig canvas differ')
  }
  const parameters = new Set(pack.rig.parameters.map(parameter => parameter.id))
  for (const spring of pack.physics.springs) {
    if (!parameters.has(spring.input) || !parameters.has(spring.output)) throw new Error(`whale pack: invalid spring ${spring.id}`)
  }
  for (const [name, expression] of Object.entries(pack.expressions.expressions)) {
    for (const parameter of Object.keys(expression)) {
      if (!parameters.has(parameter)) throw new Error(`whale pack: expression ${name} uses unknown parameter ${parameter}`)
    }
  }
  for (const [action, config] of Object.entries(pack.manifest.actions)) {
    if (!(config.pose in pack.rig.poses)) throw new Error(`whale pack: action ${action} uses unknown pose`)
    if (!(config.expression in pack.expressions.expressions)) throw new Error(`whale pack: action ${action} uses unknown expression`)
    const motion = pack.motions.get(config.motion)
    if (motion === undefined) throw new Error(`whale pack: action ${action} has no motion`)
    for (const curve of motion.curves) {
      if (!parameters.has(curve.parameter)) throw new Error(`whale pack: motion ${motion.id} uses unknown parameter ${curve.parameter}`)
    }
  }
  for (const [performance, config] of Object.entries(pack.manifest.performances)) {
    if (!(config.pose in pack.rig.poses)) throw new Error(`whale pack: performance ${performance} uses unknown pose`)
    const motion = pack.motions.get(config.motion)
    if (motion === undefined) throw new Error(`whale pack: performance ${performance} has no motion`)
    for (const curve of motion.curves) {
      if (!parameters.has(curve.parameter)) throw new Error(`whale pack: motion ${motion.id} uses unknown parameter ${curve.parameter}`)
    }
  }
  return pack
}
