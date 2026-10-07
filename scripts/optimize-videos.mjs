import { spawnSync } from 'node:child_process'
import { mkdirSync, statSync, copyFileSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { WHALE_RUNTIME_FILES } from '../src/asset-paths.ts'

// Explicit opt-in: originals remain in the ignored development archive.
const ffmpeg = process.env.WHALE_FFMPEG ?? 'ffmpeg'
const root = resolve('character-packs/default-whale/runtime')
const output = resolve('artifacts/media-optimized')
const archive = resolve('artifacts/media-originals')
const existing = process.argv.includes('--apply-existing')
const apply = process.argv.includes('--apply') || existing
const previous = existing ? JSON.parse(readFileSync(resolve(output, 'report.json'), 'utf8')).files : undefined
const report = []
function run(args, binary = false) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { maxBuffer: 32 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(result.stderr.toString())
  return binary ? result.stdout : undefined
}
function alpha(path) {
  const bytes = run(['-c:v', 'libvpx-vp9', '-i', path, '-vf', 'alphaextract', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], true)
  let transparent = 0, opaque = 0
  for (const byte of bytes) { if (byte < 10) transparent++; if (byte > 245) opaque++ }
  if (!transparent || !opaque) throw new Error(`Invalid transparency: ${path}`)
  return { transparent: transparent / bytes.length, opaque: opaque / bytes.length }
}
for (const file of WHALE_RUNTIME_FILES.filter(file => file.endsWith('.webm'))) {
  const source = resolve(root, file), target = resolve(output, file)
  mkdirSync(dirname(target), { recursive: true })
  if (existing) {
    const record = previous.find(record => record.file === file)
    if (!record || statSync(source).size !== record.originalBytes || statSync(target).size !== record.optimizedBytes) throw new Error(`Candidate/source changed; regenerate and review: ${file}`)
  } else run(['-y', '-c:v', 'libvpx-vp9', '-i', source, '-vf', 'scale=640:-2', '-c:v', 'libvpx-vp9', '-crf', '28', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-auto-alt-ref', '0', '-pix_fmt', 'yuva420p', '-an', target])
  const before = alpha(source), after = alpha(target)
  if (Math.abs(before.transparent - after.transparent) > .025 || Math.abs(before.opaque - after.opaque) > .025) throw new Error(`Alpha coverage changed: ${file}`)
  const originalBytes = statSync(source).size, optimizedBytes = statSync(target).size
  const adopted = optimizedBytes < originalBytes
  if (apply && adopted) {
    const backup = resolve(archive, file)
    mkdirSync(dirname(backup), { recursive: true })
    if (!existsSync(backup)) copyFileSync(source, backup)
    copyFileSync(target, source)
  }
  report.push({ file, originalBytes, optimizedBytes, adopted, alpha: after })
  console.log(`${file}: ${(originalBytes/1048576).toFixed(2)} → ${(optimizedBytes/1048576).toFixed(2)} MiB`)
}
writeFileSync(resolve(output, 'report.json'), JSON.stringify({ applied: apply, files: report }, null, 2))
