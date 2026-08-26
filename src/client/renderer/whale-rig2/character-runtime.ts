import { Animator } from './animator.ts'
import { BoneHierarchy } from './bones.ts'
import { matFromTRS } from './math.ts'
import { PartRenderer, type PartDef, type PartFrame } from './part-renderer.ts'
import type { BoneLocal, BoneWorld, Mat2D, Pose } from './types.ts'

export interface BoneOverride {
  angle?: number
  tx?: number
  ty?: number
}

export interface CharacterRuntimeOptions {
  rootPosition: readonly [number, number]
  localOffsets: Readonly<Record<string, readonly [number, number]>>
  bounceAmount?: number
}

export interface RuntimeFrame {
  pose: Record<string, BoneLocal>
  worlds: BoneWorld[]
  matrices: Mat2D[]
  parts: PartFrame[]
  timeMs: number
}

/**
 * Small character pipeline: Animator → primary pose → overrides → FK → Parts.
 * Secondary motion is intentionally absent in phase 1; this boundary makes it
 * possible to add springs later without coupling them to the clip.
 */
export class CharacterRuntime {
  readonly animator: Animator
  readonly hierarchy: BoneHierarchy
  readonly partRenderer: PartRenderer
  bounceAmount: number
  private readonly pose: Record<string, BoneLocal> = {}
  private readonly worlds: BoneWorld[] = []
  private readonly matrices: Mat2D[] = []
  private readonly overrides = new Map<string, BoneOverride>()

  constructor(
    clip: ConstructorParameters<typeof Animator>[0],
    bones: ConstructorParameters<typeof Animator>[1],
    parts: readonly PartDef[],
    private readonly options: CharacterRuntimeOptions,
  ) {
    this.animator = new Animator(clip, bones)
    this.hierarchy = new BoneHierarchy(bones)
    this.bounceAmount = options.bounceAmount ?? 1
    const bindPose = this.primaryPose()
    this.partRenderer = new PartRenderer(this.hierarchy, bindPose, parts)
  }

  setBoneOverride(id: string, override: BoneOverride | undefined): void {
    if (this.hierarchy.boneIndex(id) < 0) throw new Error(`whale-rig2: unknown bone override "${id}"`)
    if (override === undefined) this.overrides.delete(id)
    else this.overrides.set(id, { ...override })
  }

  clearBoneOverrides(): void {
    this.overrides.clear()
  }

  update(deltaMs: number): RuntimeFrame {
    this.animator.update(deltaMs)
    const pose = this.primaryPose(this.pose)
    for (const [id, override] of this.overrides) {
      const local = pose[id]!
      if (override.angle !== undefined) local.angle = override.angle
      if (override.tx !== undefined) local.tx = override.tx
      if (override.ty !== undefined) local.ty = override.ty
    }
    const worlds = this.hierarchy.fk(pose, this.worlds)
    const matrices = this.hierarchy.worldMatrices(pose, this.matrices, worlds)
    return {
      pose,
      worlds,
      matrices,
      parts: this.partRenderer.frames(matrices),
      timeMs: this.animator.timeMs,
    }
  }

  private primaryPose(out?: Record<string, BoneLocal>): Record<string, BoneLocal> {
    const pose = this.animator.sample(out)
    for (const [id, [tx, ty]] of Object.entries(this.options.localOffsets)) {
      const local = pose[id]
      if (local === undefined) throw new Error(`whale-rig2: missing local offset bone "${id}"`)
      local.tx += tx
      local.ty += ty
    }
    const root = pose[this.hierarchy.bones[0]!.id]
    if (root !== undefined) {
      root.tx += this.options.rootPosition[0]
      root.ty = this.options.rootPosition[1] + root.ty * this.bounceAmount
    }
    return pose
  }
}
