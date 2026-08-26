/** Versioned, package-owned route. User input is never appended to this prefix. */
export const WHALE_ASSET_ROUTE = '/dsh-dfy/assets/v2'

export const WHALE_PRODUCTION_ROOT = 'production-v1'
export const WHALE_IDLE_ROOT = `${WHALE_PRODUCTION_ROOT}/idle/see-through-idle-rig-v2`
export const WHALE_IDLE_MANIFEST_FILE = `${WHALE_IDLE_ROOT}/manifest.json`
export const WHALE_CHARACTER_FILE = `${WHALE_IDLE_ROOT}/source-master.png`

const idleFiles = [
  'manifest.json',
  'source-master.png',
  'hair-back.png',
  'hair-back-center.png',
  'hair-back-inner-left.png',
  'hair-back-inner-right.png',
  'hair-back-outer-left.png',
  'hair-back-outer-right.png',
  'tail.png',
  'face.png',
  'mouth.png',
  'neck.png',
  'torso.png',
  'torso-bow.png',
  'collar-front.png',
  'human-ears.png',
  'arm-left-sleeve.png',
  'hand-left-rest-side.png',
  'hand-left-wave-front.png',
  'arm-right.png',
  'leg-left.png',
  'leg-right.png',
  'shoe-left.png',
  'shoe-right.png',
  'eye-white-left.png',
  'eye-white-right.png',
  'iris-left.png',
  'iris-right.png',
  'lash-left.png',
  'lash-right.png',
  'brow-left.png',
  'brow-right.png',
  'hair-front.png',
  'ahoge.png',
  'maid-headband.png',
  'skirt.png',
  'whale-fins.png',
  'side-bow.png',
  'wave-action-v1/wave-palm-three-quarter.png',
  'wave-action-v1/wave-sleeve.png',
] as const

const actionFiles = [
  'clap.webm',
  'clean.webm',
  'confident.webm',
  'curtsy.webm',
  'cute.webm',
  'nod.webm',
  'point.webm',
  'stretch.webm',
  'surprise.webm',
  'wave.webm',
] as const

const movementFiles = [
  'movement/run/run_prepare.webm',
  'movement/run/run_cycle.webm',
  'movement/run/run_finish.webm',
  'movement/run-left/run_left_prepare.webm',
  'movement/run-left/run_left_cycle.webm',
  'movement/run-left/run_left_finish.webm',
  'movement/vertical/float_prepare.webm',
  'movement/vertical/float_cycle.webm',
  'movement/vertical/float_finish.webm',
  'movement/vertical/dive_prepare.webm',
  'movement/vertical/dive_cycle.webm',
  'movement/vertical/dive_finish.webm',
] as const

/** Exact public whitelist for the visually approved desktop-pet runtime. */
export const WHALE_RUNTIME_FILES = [
  ...idleFiles.map(file => `${WHALE_IDLE_ROOT}/${file}` as const),
  ...actionFiles.map(file => `${WHALE_PRODUCTION_ROOT}/actions/${file}` as const),
  ...movementFiles.map(file => `${WHALE_PRODUCTION_ROOT}/${file}` as const),
] as const

export type WhaleRuntimeFile = typeof WHALE_RUNTIME_FILES[number]

export const WHALE_IDLE_ASSET_URL = `${WHALE_ASSET_ROUTE}/${WHALE_IDLE_ROOT}`
export const WHALE_FALLBACK_URL = `${WHALE_ASSET_ROUTE}/${WHALE_CHARACTER_FILE}`

// Authoring-only compatibility exports. They keep the experimental renderer
// sources buildable, but none of these paths is present in the production
// whitelist or package manifest.
export const WHALE_MANIFEST_FILE = 'manifest.f36ba28fd154.json'
export const WHALE_MANIFEST_URL = `${WHALE_ASSET_ROUTE}/${WHALE_MANIFEST_FILE}`
export const WHALE_RIG2_MANIFEST_FILE = 'rig2/manifest.d4cc19463f1e.json'
export const WHALE_RIG2_MANIFEST_URL = `${WHALE_ASSET_ROUTE}/${WHALE_RIG2_MANIFEST_FILE}`
export const WHALE_COMMUNITY_STRUCTURAL_ATLAS_URL = `${WHALE_ASSET_ROUTE}/community-rig/structural-atlas.a6df514da0d8.png`
export const WHALE_COMMUNITY_FACIAL_ATLAS_URL = `${WHALE_ASSET_ROUTE}/community-rig/facial-atlas.af69e1f2b942.png`

export function whaleActionUrl(name: typeof actionFiles[number]): string {
  return `${WHALE_ASSET_ROUTE}/${WHALE_PRODUCTION_ROOT}/actions/${name}`
}

export function whaleMovementUrl(path: typeof movementFiles[number]): string {
  return `${WHALE_ASSET_ROUTE}/${WHALE_PRODUCTION_ROOT}/${path}`
}
