import { useEffect, type RefObject } from 'react'
import type { AutonomyEpisode } from '../autonomy.ts'
import { characterMotionPose } from './character-motion.ts'

/** Apply only compositor transforms at 60FPS; no layout reads or React frame state. */
export function useCharacterMotion(
  episode: AutonomyEpisode | undefined,
  reducedMotion: boolean,
  stageRef: RefObject<HTMLElement>,
): void {
  useEffect(() => {
    const stage = stageRef.current
    if (stage === null) return
    let frame: number | undefined
    const draw = (): void => {
      const pose = characterMotionPose(episode, reducedMotion ? episode?.phaseStartedAt ?? 0 : Date.now())
      stage.style.setProperty('--whale-motion-x', `${pose.offset.x.toFixed(2)}px`)
      stage.style.setProperty('--whale-motion-y', `${pose.offset.y.toFixed(2)}px`)
      stage.dataset.whaleMotionClip = pose.clip ?? 'none'
      stage.dataset.whaleMotionFacing = pose.facing
      if (!reducedMotion && episode !== undefined) frame = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
      stage.style.setProperty('--whale-motion-x', '0px')
      stage.style.setProperty('--whale-motion-y', '0px')
      stage.dataset.whaleMotionClip = 'none'
    }
  }, [episode, reducedMotion, stageRef])
}
