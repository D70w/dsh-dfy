/** Browser-local viewport anchor persisted through the DSH Client Store engine. */
export interface WhalePosition {
  right: number
  bottom: number
}

export const DEFAULT_POSITION: Readonly<WhalePosition> = Object.freeze({ right: 24, bottom: 20 })

export type WhalePositionDirection = 'left' | 'right' | 'up' | 'down'

/** Move the viewport anchor in visual screen directions, then keep it reachable. */
export function nudgePosition(
  current: WhalePosition,
  direction: WhalePositionDirection,
  distance: number,
  viewport: { width: number; height: number },
  pet: { width: number; height: number },
): WhalePosition {
  const step = Math.max(1, Math.round(Math.abs(distance)))
  const candidate = { ...current }
  if (direction === 'left') candidate.right += step
  if (direction === 'right') candidate.right -= step
  if (direction === 'up') candidate.bottom += step
  if (direction === 'down') candidate.bottom -= step
  return clampPosition(candidate, viewport, pet)
}

/** Clamp one anchor so a draggable part of the whale remains reachable. */
export function clampPosition(
  candidate: unknown,
  viewport: { width: number; height: number },
  pet: { width: number; height: number },
): WhalePosition {
  const value = isPosition(candidate) ? candidate : DEFAULT_POSITION
  const reachable = 24
  const maxRight = Math.max(0, viewport.width - reachable)
  const maxBottom = Math.max(0, viewport.height - reachable)
  const minRight = Math.min(0, viewport.width - pet.width)
  const minBottom = Math.min(0, viewport.height - pet.height)
  return {
    right: clamp(value.right, minRight, maxRight),
    bottom: clamp(value.bottom, minBottom, maxBottom),
  }
}

function isPosition(value: unknown): value is WhalePosition {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const position = value as Partial<WhalePosition>
  return Number.isFinite(position.right) && Number.isFinite(position.bottom)
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)))
}
