import { useEffect, useRef } from 'react'
import {
  WHALE_COMMUNITY_FACIAL_ATLAS_URL,
  WHALE_COMMUNITY_STRUCTURAL_ATLAS_URL,
} from '../../../asset-paths.ts'
import type { WhaleAction } from '../../../behavior.ts'
import { createCommunityIdleRig, type CommunityExpression, type CommunityIdleRigController } from './community-idle-rig.ts'

export interface CommunityIdleLayerProps {
  action: WhaleAction
  outputSize: number
  reducedMotion: boolean
  secondaryMotion: boolean
  visible: boolean
}

function expressionFor(action: WhaleAction): CommunityExpression {
  if (action === 'petting') return 'happy'
  if (action === 'smug' || action === 'feeding') return 'smug'
  return 'neutral'
}

/** The community whale-girl idle puppet: layered textures, gaze, blink and springs. */
export function CommunityIdleLayer({ action, outputSize, reducedMotion, secondaryMotion, visible }: CommunityIdleLayerProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<CommunityIdleRigController>()
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    let mounted = true
    let controller: CommunityIdleRigController | undefined
    const onPointerMove = (event: PointerEvent): void => {
      if (!visibleRef.current || controller === undefined) return
      const bounds = canvas.getBoundingClientRect()
      const centerX = bounds.left + bounds.width / 2
      const centerY = bounds.top + bounds.height / 2
      controller.setPointer((event.clientX - centerX) / 220, (event.clientY - centerY) / 180)
    }
    const onVisibility = (): void => controller?.setActive(visibleRef.current && document.visibilityState !== 'hidden')
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    void createCommunityIdleRig(canvas, {
      structuralAtlasUrl: WHALE_COMMUNITY_STRUCTURAL_ATLAS_URL,
      facialAtlasUrl: WHALE_COMMUNITY_FACIAL_ATLAS_URL,
      outputSize,
      transparentBackground: true,
      reducedMotion,
    }).then(value => {
      if (!mounted) { value.dispose(); return }
      controller = value
      controllerRef.current = value
      value.setExpression(expressionFor(action))
      value.setSecondaryMotion(secondaryMotion)
      value.setReducedMotion(reducedMotion)
      value.setActive(visibleRef.current && document.visibilityState !== 'hidden')
      canvas.dataset.whaleCommunityReady = 'true'
    }).catch(() => { canvas.dataset.whaleCommunityReady = 'false' })
    return () => {
      mounted = false
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibility)
      controller?.dispose()
      controllerRef.current = undefined
    }
  }, [outputSize])

  useEffect(() => { controllerRef.current?.setExpression(expressionFor(action)) }, [action])
  useEffect(() => { controllerRef.current?.setReducedMotion(reducedMotion) }, [reducedMotion])
  useEffect(() => { controllerRef.current?.setSecondaryMotion(secondaryMotion && !reducedMotion) }, [reducedMotion, secondaryMotion])
  useEffect(() => { controllerRef.current?.setActive(visible && document.visibilityState !== 'hidden') }, [visible])

  return (
    <canvas
      ref={canvasRef}
      data-whale-community-rig
      data-whale-community-canvas
      data-whale-engine="community-layered-runtime"
      data-whale-animation-source="runtime"
      data-whale-performance={visible ? 'idle-puppet' : 'paused'}
      role="presentation"
      aria-hidden="true"
      style={{ opacity: visible ? 1 : 0 }}
    />
  )
}
