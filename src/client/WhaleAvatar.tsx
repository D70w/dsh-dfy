import { WHALE_FALLBACK_URL } from '../asset-paths.ts'
import type { WhaleFallbackState } from '../behavior.ts'

/** Props for the four-state image fallback. */
export interface WhaleAvatarProps {
  state: WhaleFallbackState
}

/** Approved character image shown while WhaleRig loads or WebGL is unavailable. */
export function WhaleAvatar({ state }: WhaleAvatarProps): React.JSX.Element {
  return (
    <span data-whale-pet-avatar data-state={state} role="presentation" aria-hidden="true">
      <img data-whale-pet-avatar-image src={WHALE_FALLBACK_URL} alt="" draggable={false} />
    </span>
  )
}
