import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const candidate = resolve(root, 'character-packs/default-whale/source/bind-pose-v3/textures/animation-v1-gpt-update-candidate')
const output = resolve(root, 'character-packs/default-whale/runtime/rig2')

const sources = {
  'hair-back-complete': resolve(candidate, 'hair-back-complete.png'),
  'tail-complete': resolve(candidate, 'tail-complete.png'),
  'leg-near-complete': resolve(candidate, 'leg-near-complete.png'),
  'leg-far-complete': resolve(candidate, 'leg-far-complete.png'),
  'dress-complete': resolve(candidate, 'dress-complete.png'),
  'head-front-complete-v3': resolve(candidate, 'head-front-complete-v3.png'),
  'ahoge-complete': resolve(candidate, 'ahoge-complete.png'),
  'arm-far-upper': resolve(candidate, 'arm-rig-v1/arm-far-upper.png'),
  'arm-far-forearm': resolve(candidate, 'arm-rig-v1/arm-far-forearm.png'),
  'arm-far-hand': resolve(candidate, 'arm-rig-v1/arm-far-hand.png'),
  'arm-far-elbow-upper-underlay': resolve(candidate, 'arm-rig-v1/arm-far-elbow-upper-underlay.png'),
  'arm-far-elbow-forearm-underlay': resolve(candidate, 'arm-rig-v1/arm-far-elbow-forearm-underlay.png'),
  'arm-far-wrist-underlay': resolve(candidate, 'arm-rig-v1/arm-far-wrist-underlay.png'),
  'arm-near-upper': resolve(candidate, 'arm-rig-v1/arm-near-upper.png'),
  'arm-near-forearm': resolve(candidate, 'arm-rig-v1/arm-near-forearm.png'),
  'arm-near-hand': resolve(candidate, 'arm-rig-v1/arm-near-hand.png'),
  'arm-near-elbow-upper-underlay': resolve(candidate, 'arm-rig-v1/arm-near-elbow-upper-underlay.png'),
  'arm-near-elbow-forearm-underlay': resolve(candidate, 'arm-rig-v1/arm-near-elbow-forearm-underlay.png'),
  'arm-near-wrist-underlay': resolve(candidate, 'arm-rig-v1/arm-near-wrist-underlay.png'),
}

const digest = bytes => createHash('sha256').update(bytes).digest('hex')

await mkdir(output, { recursive: true })
const textures = {}
for (const [id, source] of Object.entries(sources)) {
  const bytes = await readFile(source)
  const hash = digest(bytes)
  const stem = basename(source, '.png').replace(/[^a-z0-9-]/g, '-')
  const file = `${stem}.${hash.slice(0, 12)}.png`
  await copyFile(source, resolve(output, file))
  textures[id] = `rig2/${file}`
}

const manifest = {
  schemaVersion: 1,
  id: 'whale-maid-realtime-v1',
  canvas: { width: 1024, height: 1024 },
  animationFrames: 0,
  runtimeSourcePolicy: {
    gif: false,
    video: false,
    spriteSheet: false,
    actionPngSequence: false,
  },
  textures,
  springDefaults: {
    tail: { stiffness: 48, damping: 9, maxOffset: 16 },
    hair: { stiffness: 62, damping: 11, maxOffset: 10 },
    ahoge: { stiffness: 78, damping: 11, maxOffset: 12 },
  },
  run: { durationMs: 900, phases: 4 },
}
const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)
const manifestFile = `manifest.${digest(bytes).slice(0, 12)}.json`
await writeFile(resolve(output, manifestFile), bytes)
process.stdout.write(`${JSON.stringify({ manifest: `rig2/${manifestFile}`, textures }, null, 2)}\n`)
