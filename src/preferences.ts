/** Device-local preferences shared by the overlay and its Settings section. */
export type WhaleAnimationQuality = 'auto' | 'high' | 'economy'
export type WhaleBillingPriceProfile = 'deepseek-v4-flash' | 'deepseek-v4-pro'

export const WHALE_SCALE = Object.freeze({ min: .75, max: 1.4, step: .05 })

export function clampWhaleScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(WHALE_SCALE.max, Math.max(WHALE_SCALE.min, value))
}

export interface WhalePreferences {
  'general.enabled': boolean
  'general.visible': boolean
  'general.quietMode': boolean
  'general.positionLocked': boolean
  'animation.reducedMotion': 'system' | 'reduce' | 'allow'
  'animation.quality': WhaleAnimationQuality
  'animation.secondaryMotion': boolean
  'animation.scale': number
  'bubble.enabled': boolean
  'diary.enabled': boolean
  'autonomy.enabled': boolean
  'autonomy.cursorApproach': boolean
  'autonomy.roamingMode': boolean
  'billing.enabled': boolean
  'billing.priceProfile': WhaleBillingPriceProfile
  'balance.refreshMinutes': number
}

/** Initial values for a new browser-local whale store. */
export const DEFAULT_PREFERENCES: Readonly<WhalePreferences> = Object.freeze({
  'general.enabled': true,
  'general.visible': true,
  'general.quietMode': false,
  'general.positionLocked': false,
  'animation.reducedMotion': 'system',
  'animation.quality': 'auto',
  'animation.secondaryMotion': true,
  'animation.scale': 1,
  'bubble.enabled': true,
  'diary.enabled': true,
  'autonomy.enabled': true,
  'autonomy.cursorApproach': true,
  'autonomy.roamingMode': false,
  'billing.enabled': true,
  'billing.priceProfile': 'deepseek-v4-flash',
  'balance.refreshMinutes': 10,
})
