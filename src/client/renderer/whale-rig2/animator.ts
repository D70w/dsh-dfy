import { sampleClip } from './motion.ts'
import type { BoneDef, BoneLocal, Clip, Pose } from './types.ts'

/** A refresh-rate-independent realtime animation clock and sampler. */
export class Animator {
  speed = 1
  playing = true
  private elapsedMs = 0
  private outputDurationMs: number

  constructor(readonly clip: Clip, readonly bones: readonly BoneDef[]) {
    this.outputDurationMs = clip.durationMs
  }

  get timeMs(): number {
    return this.elapsedMs
  }

  get durationMs(): number {
    return this.outputDurationMs
  }

  set durationMs(value: number) {
    if (!Number.isFinite(value) || value <= 0) throw new Error('whale-rig2: animator duration must be positive')
    const phase = this.outputDurationMs === 0 ? 0 : this.elapsedMs / this.outputDurationMs
    this.outputDurationMs = value
    this.elapsedMs = phase * value
  }

  update(deltaMs: number): void {
    if (!this.playing || this.speed === 0) return
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('whale-rig2: animator delta must be finite and non-negative')
    this.elapsedMs += deltaMs * this.speed
    if (this.clip.loop) this.elapsedMs = ((this.elapsedMs % this.outputDurationMs) + this.outputDurationMs) % this.outputDurationMs
    else this.elapsedMs = Math.min(this.outputDurationMs, Math.max(0, this.elapsedMs))
  }

  seek(timeMs: number): void {
    if (!Number.isFinite(timeMs)) throw new Error('whale-rig2: animator seek must be finite')
    this.elapsedMs = this.clip.loop
      ? ((timeMs % this.outputDurationMs) + this.outputDurationMs) % this.outputDurationMs
      : Math.min(this.outputDurationMs, Math.max(0, timeMs))
  }

  sample(out?: Record<string, BoneLocal>): Pose {
    const clipTime = this.elapsedMs / this.outputDurationMs * this.clip.durationMs
    return sampleClip(this.clip, clipTime, this.bones, out)
  }
}
