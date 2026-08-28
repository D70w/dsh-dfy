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
import type { StationaryActionCommand } from '../stationary-actions.ts'
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

export interface GrabMotionInput {
  x: number
  y: number
  velocityX: number
  velocityY: number
  accelerationX: number
  accelerationY: number
}

export function resolveGrabMotionInput(
  deltaX: number,
  deltaY: number,
  elapsedMs: number,
  previousVelocityX: number,
  previousVelocityY: number,
  offsetX: number,
  offsetY: number,
): GrabMotionInput {
  const elapsed = Math.max(8, elapsedMs)
  const velocityX = deltaX / elapsed
  const velocityY = deltaY / elapsed
  const accelerationX = (velocityX - previousVelocityX) * 0.72
  const accelerationY = (velocityY - previousVelocityY) * 0.58
  return {
    x: Math.max(-1, Math.min(1, velocityX * 0.5 + accelerationX + offsetX)),
    y: Math.max(-1, Math.min(1, velocityY * 0.5 + accelerationY + offsetY)),
    velocityX,
    velocityY,
    accelerationX,
    accelerationY,
  }
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

export function resolveActionVideo(
  reducedMotion: boolean,
  action: WhaleAction,
  stationaryAction?: StationaryActionCommand,
): string | undefined {
  return stationaryAction === undefined
    ? reducedMotion ? undefined : stationaryVideo(action)
      : whaleActionUrl(stationaryAction.file)
}

export function shouldPauseLive2d(
  videoSource: string | undefined,
  videoPlaying: boolean,
  videoFailed: boolean,
  videoEnding: boolean,
): boolean {
  return videoSource !== undefined && videoPlaying && !videoFailed && !videoEnding
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
  stationaryAction?: StationaryActionCommand
  onStationaryActionStart?(): void
  onStationaryActionEnd?(): void
}

/**
 * The exact character runtime approved in whale-2d-navigation: the same
 * see-through layered idle rig plus the same calibrated transparent videos.
 */
export function WhaleRenderer({
  action, autonomy, reducedMotion, quality, secondaryMotion,
  motionIntensity = 2, emotion, petReaction, stationaryAction, onStationaryActionStart, onStationaryActionEnd,
}: WhaleRendererProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<ApprovedIdleRigController>()
  const previousPointer = useRef<{ x: number; y: number; at: number; velocityX: number; velocityY: number }>()
  const grabActive = useRef(false)
  const grabOrigin = useRef<{ x: number; y: number; width: number; height: number }>()
  const [status, setStatus] = useState<RendererStatus>('loading')
  const [failure, setFailure] = useState<FailureCode>('none')
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoEnding, setVideoEnding] = useState(false)
  const profile = resolveAnimationProfile(quality, browserAnimationEnvironment())
  const movement = useMemo(() => reducedMotion ? undefined : movementVisualFor(autonomy), [autonomy, reducedMotion])
  // Reduced-motion is a preference for ambient/autonomous motion. A classic
  // action selected explicitly from the menu must still play: otherwise the
  // click appears to do nothing and the selected performance is immediately
  // indistinguishable from idle.
  const actionVideo = resolveActionVideo(reducedMotion, action, stationaryAction)
  const videoSource = movement === undefined ? actionVideo : movementSource(movement)
  const performanceName = movement === undefined
    ? actionVideo === undefined ? 'idle-puppet' : `action-${stationaryAction?.action ?? action}`
    : `${movement.route}-${movement.phase}`
  const videoKey = stationaryAction === undefined ? videoSource : `${stationaryAction.id}:${videoSource}`

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
      controller.setGrabbed(grabActive.current)
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
      // Use an imperative ref instead of the rendered action. React state can
      // lag behind the first pointermove, which otherwise drops the velocity
      // impulse and makes a grab feel like plain window dragging.
      if (grabActive.current && previous !== undefined) {
        const elapsed = Math.max(8, now - previous.at)
        const origin = grabOrigin.current
        const offsetX = origin === undefined ? 0 : (event.clientX - origin.x) / Math.max(1, origin.width) * 1.15
        const offsetY = origin === undefined ? 0 : (event.clientY - origin.y) / Math.max(1, origin.height) * 0.9
        // A rapid direction reversal is felt as acceleration, not merely as
        // high speed. This impulse survives dense pointer events and gives a
        // sharp but capped kick to the secondary springs.
        const motion = resolveGrabMotionInput(
          event.clientX - previous.x,
          event.clientY - previous.y,
          elapsed,
          previous.velocityX,
          previous.velocityY,
          offsetX,
          offsetY,
        )
        controller.setExternalMotion(motion.x, motion.y)
        canvas.dataset.grabVelocityX = motion.velocityX.toFixed(3)
        canvas.dataset.grabAccelerationX = motion.accelerationX.toFixed(3)
        previousPointer.current = {
          x: event.clientX,
          y: event.clientY,
          at: now,
          velocityX: motion.velocityX,
          velocityY: motion.velocityY,
        }
      } else {
        controller.setExternalMotion(0, 0)
        previousPointer.current = {
          x: event.clientX,
          y: event.clientY,
          at: now,
          velocityX: 0,
          velocityY: 0,
        }
      }
    }
    const onPointerDown = (event: PointerEvent): void => {
      const canvas = canvasRef.current
      if (canvas === null || !(event.target instanceof Element)
        || event.target.closest('[data-whale-pet-hotspot]') === null
        || event.target.closest('[data-whale-position-locked=true]') !== null) return
      if (grabActive.current) return
      grabActive.current = true
      previousPointer.current = {
        x: event.clientX,
        y: event.clientY,
        at: performance.now(),
        velocityX: 0,
        velocityY: 0,
      }
      const bounds = canvas.getBoundingClientRect()
      grabOrigin.current = { x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height }
      controllerRef.current?.setGrabPoint(
        Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width))),
        Math.max(0, Math.min(1, (event.clientY - bounds.top) / Math.max(1, bounds.height))),
      )
      controllerRef.current?.setGrabbed(true)
    }
    const onPointerUp = (): void => {
      grabActive.current = false
      grabOrigin.current = undefined
      previousPointer.current = undefined
      controllerRef.current?.setExternalMotion(0, 0)
      controllerRef.current?.setGrabPoint(.5, .18)
      controllerRef.current?.setGrabbed(false)
    }
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    // Listen on the canvas itself as well as the window. The button owns the
    // pointer capture during a drag, and the canvas listener guarantees that
    // the initial grab is recognized even when the event target is a child
    // layer inside the renderer.
    const canvas = canvasRef.current
    canvas?.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      canvas?.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [action])

  useEffect(() => {
    setVideoFailed(false)
    setVideoReady(false)
    setVideoPlaying(false)
    setVideoEnding(false)
  }, [videoKey])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const paused = shouldPauseLive2d(videoSource, videoPlaying, videoFailed, videoEnding)
    // Loading is not a handoff: the idle rig keeps moving until the media
    // element confirms playback. Pausing only at `playing` removes the frozen
    // gap between a menu click and the first decoded performance frame.
    canvas.dataset.renderActive = paused ? 'false' : 'true'
    canvas.dataset.whaleLive2dPaused = String(paused)
    return () => {
      canvas.dataset.renderActive = 'true'
      canvas.dataset.whaleLive2dPaused = 'false'
    }
  }, [videoSource, videoPlaying, videoFailed, videoEnding])

  // Manual videos load in parallel with the idle rig. Waiting for every idle
  // layer before revealing a selected performance made the click feel stuck,
  // especially on a cold cache. The first decoded frame is enough to hand off
  // the visual surface; the rig can finish warming in the background.
  const videoVisible = videoSource !== undefined && videoReady && videoPlaying && !videoEnding && !videoFailed
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
          data-whale-live2d-paused="false"
          data-whale-engine="see-through-idle-rig-v2"
          data-whale-animation-source="approved-test-runtime-v104"
          data-whale-performance={videoVisible ? 'handoff' : 'idle-puppet'}
          role="presentation"
          aria-hidden="true"
          style={{ opacity: videoVisible ? 0 : 1 }}
        />
        {videoSource === undefined ? null : (
          <video
            key={videoKey}
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
            onCanPlay={(event) => {
              void event.currentTarget.play().catch(() => undefined)
            }}
            onLoadedData={(event) => {
              setVideoReady(true)
              void event.currentTarget.play().catch(() => undefined)
            }}
            onPlaying={() => {
              // `playing` is the browser's first reliable handoff boundary:
              // enough data exists for continuous playback and the initial
              // frame is ready. The same state reveals the video and pauses
              // Live2D, so there is no visible stopped interval.
              setVideoPlaying(true)
              if (stationaryAction !== undefined) onStationaryActionStart?.()
            }}
            onLoadedMetadata={(event) => {
              if (movement === undefined || movement.phase === 'cycle') return
              const targetSeconds = Math.max(0.2, movement.durationMs / 1000)
              event.currentTarget.playbackRate = Math.max(0.5, Math.min(4, event.currentTarget.duration / targetSeconds))
            }}
            onEnded={() => {
              setVideoPlaying(false)
              if (stationaryAction === undefined) return
              setVideoEnding(true)
              window.setTimeout(() => onStationaryActionEnd?.(), 140)
            }}
            onError={() => {
              setVideoPlaying(false)
              setVideoFailed(true)
              if (stationaryAction !== undefined) onStationaryActionEnd?.()
            }}
          />
        )}
        <WhaleAvatar state={fallbackStateFor(action)} />
      </span>
    </span>
  )
}
