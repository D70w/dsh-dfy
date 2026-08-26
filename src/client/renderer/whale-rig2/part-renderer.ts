import { applyAffine, matFromTRS, matInvert, matMultiply } from './math.ts'
import type { BoneHierarchy } from './bones.ts'
import type { BoneWorld, Mat2D, Pose, Vec2 } from './types.ts'

export interface PartDef {
  id: string
  texture: string
  parentBone?: string
  position: Vec2
  rotation: number
  scale: Vec2
  pivot: Vec2
  zIndex: number
}

export interface LoadedPart extends PartDef {
  image: HTMLImageElement
}

export interface PartFrame {
  id: string
  matrix: Mat2D
  pivot: Vec2
}

/** Texture-independent part composition using the bone delta from bind pose. */
export class PartRenderer {
  readonly bindMatrices: readonly Mat2D[]
  private readonly inverseBind: readonly Mat2D[]
  private readonly ordered: readonly PartDef[]

  constructor(
    private readonly hierarchy: BoneHierarchy,
    bindPose: Pose,
    parts: readonly PartDef[],
  ) {
    this.bindMatrices = hierarchy.worldMatrices(bindPose)
    this.inverseBind = this.bindMatrices.map(matrix => matInvert(
      { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, matrix,
    ))
    this.ordered = [...parts].sort((left, right) => left.zIndex - right.zIndex)
  }

  frames(worldMatrices: readonly Mat2D[]): PartFrame[] {
    return this.ordered.map(part => {
      const boneIndex = part.parentBone === undefined ? -1 : this.hierarchy.boneIndex(part.parentBone)
      const delta = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
      if (boneIndex >= 0) matMultiply(delta, worldMatrices[boneIndex]!, this.inverseBind[boneIndex]!)
      const base = matFromTRS(
        { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
        part.position.x,
        part.position.y,
        part.rotation,
        part.scale.x,
        part.scale.y,
      )
      base.tx -= base.a * part.pivot.x + base.c * part.pivot.y
      base.ty -= base.b * part.pivot.x + base.d * part.pivot.y
      return { id: part.id, matrix: matMultiply(
        { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, delta, base,
      ), pivot: part.pivot }
    })
  }

  draw(
    ctx: CanvasRenderingContext2D,
    frames: readonly PartFrame[],
    images: ReadonlyMap<string, HTMLImageElement>,
    displayScale: number,
    showPivots: boolean,
  ): void {
    for (const frame of frames) {
      const image = images.get(frame.id)
      if (image === undefined) continue
      const matrix = frame.matrix
      ctx.save()
      ctx.setTransform(
        displayScale * matrix.a,
        displayScale * matrix.b,
        displayScale * matrix.c,
        displayScale * matrix.d,
        displayScale * matrix.tx,
        displayScale * matrix.ty,
      )
      ctx.drawImage(image, 0, 0)
      ctx.restore()
      if (showPivots) {
        const pivot = applyAffine({ x: 0, y: 0 }, frame.matrix, frame.pivot.x, frame.pivot.y)
        ctx.save()
        ctx.setTransform(displayScale, 0, 0, displayScale, 0, 0)
        ctx.fillStyle = '#ffcf5c'
        ctx.beginPath()
        ctx.arc(pivot.x, pivot.y, 2.2 / displayScale, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  }
}
