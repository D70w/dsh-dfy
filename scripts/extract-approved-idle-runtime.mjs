import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(root, 'artifacts/whale-see-through-idle-rig/preview-bundle.js')
const targetPath = resolve(root, 'src/client/renderer/see-through-rig/approved-idle-runtime.js')
const previewMarker = '//#region ../src/client/renderer/see-through-rig/see-through-rig-preview.ts'

const source = await readFile(sourcePath, 'utf8')
const previewIndex = source.indexOf(previewMarker)
if (previewIndex < 0) throw new Error('approved runtime preview marker is missing')

const runtime = source.slice(0, previewIndex).trimEnd()
const output = `${runtime}\n\nexport { createSeeThroughIdleRig, seeThroughBoneOptions }\n`
await writeFile(targetPath, output, 'utf8')

