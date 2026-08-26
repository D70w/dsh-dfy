import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WHALE_IDLE_ASSET_URL,
  whaleActionUrl,
  whaleMovementUrl,
} from '../../asset-paths.ts'
import type { AutonomyEpisode } from '../../autonomy.ts'
import { phaseDuration } from '../../autonomy.ts'
import { fallbackStateFor, type WhaleAction } from '../../behavior.ts'
import type { WhaleAnimationQuality } from '../../preferences.ts'
import { WhaleAvatar } from '../WhaleAvatar.tsx'
import {
  createSeeThroughIdleRig,
  type ApprovedEmotion,
  type ApprovedExpression,
  type ApprovedGesture,
  type ApprovedIdleRigController,
} from './see-through-rig/approved-idle-runtime.js'

type RendererStatus = 'loading' | 'ready' | 'fallback'
type FailureCode = 'none' | 'asset' | 'canvas' | 'unknown'
type MovementRoute = 'run' | 'run-left' | 'float' | 'dive'
type MovementPhase = 'prepare' | 'cycle' | 'finish'

interface MovementVisual {
  route: MovementRoute
  phase: MovementPhase
  durationMs: number
}

function failureCode(error: unknown): FailureCode {
  if (!(error instanceof Error)) return 'unknown'
  if (error.message.includes('manifest') || error.message.includes('load')) return 'asset'
  if (error.message.includes('canvas') || error.message.includes('2d')) return 'canvas'
  return 'unknown'
}

export interface WhaleAnimationEnvironment {
  hardwareConcurrency: number
  deviceMemory?: number
  saveData?: boolean
}

export interface WhaleAnimationProfile {
  quality: 'high' | 'economy'
  outputSize: 640 | 480
  activeFps: 60 | 30
  idleFps: 30 | 20
}

export function resolveAnimationProfile(
  preference: WhaleAnimationQuality,
  environment: WhaleAnimationEnvironment,
): WhaleAnimationProfile {
  const economy = preference === 'economy'
    || (preference === 'auto' && (
      environment.saveData === true
      || environment.hardwareConcurrency <= 4
      || (environment.deviceMemory !== undefined && environment.deviceMemory <= 4)
    ))
  return economy
    ? { quality: 'economy', outputSize: 480, activeFps: 30, idleFps: 20 }
    : { quality: 'high', outputSize: 640, activeFps: 60, idleFps: 30 }
}

function browserAnimationEnvironment(): WhaleAnimationEnvironment {
  const extendedNavigator = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }
  return {
    hardwareConcurrency: Math.max(1, navigator.hardwareConcurrency || 4),
    deviceMemory: extendedNavigator.deviceMemory,
    saveData: extendedNavigator.connection?.saveData,
  }
}

function actionExpression(action: WhaleAction): ApprovedExpression {
  if (action === 'feeding') return 'happy'
  if (action === 'smug') return 'smug'
  return 'neutral'
}

function actionGesture(action: WhaleAction): Exclude<ApprovedGesture, 'none'> | undefined {
  if (action === 'feeding') return 'nod'
  if (action === 'denying') return 'tilt'
  return undefined
}

function stationaryVideo(action: WhaleAction): string | undefined {
  if (action === 'feeding') return whaleActionUrl('nod.webm')
  if (action === 'smug') return whaleActionUrl('confident.webm')
  return undefined
}

function episodeDisplacement(episode: AutonomyEpisode): { x: number; y: number } {
  if (episode.story === 'cursor_visit') return episode.targetOffset
  return { x: -68, y: 0 }
}

export function movementVisualFor(episode: AutonomyEpisode | undefined): MovementVisual | undefined {
  if (episode === undefined || episode.story === 'nap' || episode.phase === 'notice') return undefined
  const raw = episodeDisplacement(episode)
  const returning = episode.phase === 'return-home'
  const displacement = returning ? { x: -raw.x, y: -raw.y } : raw
  const vertical = Math.abs(displacement.y) > Math.abs(displacement.x) * 0.85
  const route: MovementRoute = vertical
    ? displacement.y < 0 ? 'float' : 'dive'
    : displacement.x < 0 ? 'run-left' : 'run'
  const phase: MovementPhase = episode.phase === 'intend'
    ? 'prepare'
    : episode.phase === 'attempt' || returning
      ? 'cycle'
      : 'finish'
  return { route, phase, durationMs: phaseDuration(episode.phase, episode.story) }
}

function movementSource(visual: MovementVisual): string {
  if (visual.route === 'run') return whaleMovementUrl(`movement/run/run_${visual.phase}.webm`)
  if (visual.route === 'run-left') return whaleMovementUrl(`movement/run-left/run_left_${visual.phase}.webm`)
  return whaleMovementUrl(`movement/vertical/${visual.route}_${visual.phase}.webm`)
}

export interface WhaleRendererProps {
  action: WhaleAction
  autonomy: AutonomyEpisode | undefined
  reducedMotion: boolean
  quality: WhaleAnimationQuality
  secondaryMotion: boolean
  motionIntensity?: number
  emotion?: Readonly<{ id: number; name: ApprovedEmotion; durationMs: number }>
  petReaction?: Readonly<{
    id: number
    xRatio: number
    blushLevel: number
    blushHoldMs: number
  }>
}

/**
 * The exact character runtime approved in whale-2d-navigation: the same
 * see-through layered idle rig plus the same calibrated transparent videos.
 */
export function WhaleRenderer({
  action, autonomy, reducedMotion, quality, secondaryMotion,
  motionIntensity = 2, emotion, petReaction,
}: WhaleRendererProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<ApprovedIdleRigController>()
  const previousPointer = useRef<{ x: number; y: number; at: number }>()
  const [status, setStatus] = useState<RendererStatus>('loading')
  const [failure, setFailure] = useState<FailureCode>('none')
  const [videoFailed, setVideoFailed] = useState(false)
  const profile = resolveAnimationProfile(quality, browserAnimationEnvironment())
  const movement = useMemo(() => reducedMotion ? undefined : movementVisualFor(autonomy), [autonomy, reducedMotion])
  const actionVideo = reducedMotion ? undefined : stationaryVideo(action)
  const videoSource = movement === undefined ? actionVideo : movementSource(movement)
  const performanceName = movement === undefined
    ? actionVideo === undefined ? 'idle-puppet' : `action-${action}`
    : `${movement.route}-${movement.phase}`

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    let mounted = true
    setStatus('loading')
    void createSeeThroughIdleRig(canvas, {
      assetBaseUrl: WHALE_IDLE_ASSET_URL,
      outputSize: profile.outputSize,
      transparentBackground: true,
      reducedMotion,
    }).then(controller => {
      if (!mounted) { controller.dispose(); return }
      controllerRef.current = controller
      controller.setExpression(actionExpression(action))
      controller.setSecondaryMotion(secondaryMotion && !reducedMotion)
      controller.setMotionIntensity(motionIntensity)
      if (emotion !== undefined) controller.playEmotion(emotion.name, emotion.durationMs)
      if (petReaction !== undefined) {
        controller.triggerPetReaction(petReaction.xRatio)
        controller.setAffectionBlush(petReaction.blushLevel, petReaction.blushHoldMs)
      }
      setFailure('none')
      setStatus('ready')
      canvas.dataset.whaleProductionReady = 'true'
    }).catch(error => {
      if (!mounted) return
      setFailure(failureCode(error))
      setStatus('fallback')
      canvas.dataset.whaleProductionReady = 'false'
    })
    return () => {
      mounted = false
      controllerRef.current?.dispose()
      controllerRef.current = undefined
    }
  }, [profile.outputSize])

  useEffect(() => {
    const controller = controllerRef.current
    if (controller === undefined) return
    controller.setExpression(actionExpression(action))
    controller.stopGesture()
    const gesture = actionGesture(action)
    if (gesture !== undefined && actionVideo === undefined) controller.playGesture(gesture)
  }, [action, actionVideo])

  useEffect(() => { controllerRef.current?.setReducedMotion(reducedMotion) }, [reducedMotion])
  useEffect(() => { controllerRef.current?.setSecondaryMotion(secondaryMotion && !reducedMotion) }, [reducedMotion, secondaryMotion])
  useEffect(() => { controllerRef.current?.setMotionIntensity(motionIntensity) }, [motionIntensity])
  useEffect(() => {
    if (emotion !== undefined) controllerRef.current?.playEmotion(emotion.name, emotion.durationMs)
  }, [emotion?.id])
  useEffect(() => {
    if (petReaction === undefined) return
    controllerRef.current?.triggerPetReaction(petReaction.xRatio)
    controllerRef.current?.setAffectionBlush(petReaction.blushLevel, petReaction.blushHoldMs)
  }, [petReaction?.id])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent): void => {
      const controller = controllerRef.current
      const canvas = canvasRef.current
      if (controller === undefined || canvas === null) return
      const bounds = canvas.getBoundingClientRect()
      const x = (event.clientX - (bounds.left + bounds.width / 2)) / Math.max(1, bounds.width / 2)
      const y = (event.clientY - (bounds.top + bounds.height / 2)) / Math.max(1, bounds.height / 2)
      controller.setPointer(x, y)
      const now = performance.now()
      const previous = previousPointer.current
      if (action === 'dragging' && previous !== undefined) {
        const elapsed = Math.max(8, now - previous.at)
        controller.setExternalMotion(
          Math.max(-1, Math.min(1, (event.clientX - previous.x) / elapsed * 0.22)),
          Math.max(-1, Math.min(1, (event.clientY - previous.y) / elapsed * 0.22)),
        )
      } else {
        controller.setExternalMotion(0, 0)
      }
      previousPointer.current = { x: event.clientX, y: event.clientY, at: now }
    }
    const onPointerDown = (event: PointerEvent): void => {
      const canvas = canvasRef.current
      if (canvas === null || !(event.target instanceof Element)
        || event.target.closest('[data-whale-pet-hotspot]') === null) return
      const bounds = canvas.getBoundingClientRect()
      controllerRef.current?.setGrabPoint(
        Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width))),
        Math.max(0, Math.min(1, (event.clientY - bounds.top) / Math.max(1, bounds.height))),
      )
    }
    const onPointerUp = (): void => {
      controllerRef.current?.setExternalMotion(0, 0)
      controllerRef.current?.setGrabPoint(.5, .18)
    }
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [action])

  useEffect(() => { setVideoFailed(false) }, [videoSource])

  const videoVisible = status === 'ready' && videoSource !== undefined && !videoFailed
  return (
    <span
      data-whale-renderer={status}
      data-whale-renderer-failure={failure}
      data-whale-engine="approved-desktop-runtime"
      data-whale-animation-quality={profile.quality}
      data-whale-performance={performanceName}
    >
      <span data-whale-rig-layer>
        <canvas
          ref={canvasRef}
          data-whale-rig-canvas
          data-whale-production-canvas
          data-whale-engine="see-through-idle-rig-v2"
          data-whale-animation-source="approved-test-runtime-v104"
          data-whale-performance={videoVisible ? 'handoff' : 'idle-puppet'}
          role="presentation"
          aria-hidden="true"
          style={{ opacity: videoVisible ? 0 : 1 }}
        />
        {videoSource === undefined ? null : (
          <video
            key={videoSource}
            data-whale-action-video
            data-whale-video-performance={performanceName}
            src={videoSource}
            autoPlay
            loop={movement?.phase === 'cycle'}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            style={{ opacity: videoVisible ? 1 : 0 }}
            onLoadedMetadata={(event) => {
              if (movement === undefined || movement.phase === 'cycle') return
              const targetSeconds = Math.max(0.2, movement.durationMs / 1000)
              event.currentTarget.playbackRate = Math.max(0.5, Math.min(4, event.currentTarget.duration / targetSeconds))
            }}
            onError={() => setVideoFailed(true)}
          />
        )}
        <WhaleAvatar state={fallbackStateFor(action)} />
      </span>
    </span>
  )
}
