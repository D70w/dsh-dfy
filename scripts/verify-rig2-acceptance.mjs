/**
 * WhaleRig 2.0 phase 1B — headless acceptance verification (reproducible).
 *
 * Imports the built preview bundle and runs the same `evaluateRunRigAcceptance`
 * that the vitest suite asserts on, writing artifacts/whale-rig2-poc/acceptance.json
 * and exiting non-zero on FAIL. Requires the bundle (build first):
 *
 *   npx tsdown -c scripts/tsdown.rig2-preview.config.ts
 *   node scripts/verify-rig2-acceptance.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const bundle = await import(
  pathToFileURL(path.join(here, '..', 'artifacts', 'whale-rig2-poc', 'preview-bundle.js')).href
)

const metrics = bundle.evaluateRunRigAcceptance(60)
const report = {
  rig: 'whale-side-run-1350',
  fps: 60,
  frames: metrics.frames,
  durationMs: bundle.RUN_DURATION_MS,
  bones: bundle.RUN_BONES.length,
  parts: bundle.RUN_PART_BINDINGS.length,
  metrics,
  generatedAt: new Date().toISOString(),
}

writeFileSync(
  path.join(here, '..', 'artifacts', 'whale-rig2-poc', 'acceptance.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)

console.log(metrics.allPass ? 'PASS' : 'FAIL')
console.log(JSON.stringify({
  loopMaxJointDeltaPx: metrics.loopMaxJointDeltaPx,
  faceAnchorMaxDriftPx: metrics.faceAnchorMaxDriftPx,
  contactMaxDriftPx: metrics.contactMaxDriftPx,
  contactFrames: metrics.contactFrames,
  nearKneeFlexDeg: [metrics.nearKneeFlexMinDeg, metrics.nearKneeFlexMaxDeg],
  farKneeFlexDeg: [metrics.farKneeFlexMinDeg, metrics.farKneeFlexMaxDeg],
  kneeBendConsistent: metrics.kneeBendConsistent,
  partsOneBonePerPart: metrics.partsOneBonePerPart,
  partsUniqueRects: metrics.partsUniqueRects,
}, null, 2))
process.exit(metrics.allPass ? 0 : 1)
