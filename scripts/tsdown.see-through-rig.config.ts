import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-see-through-idle-rig',
  entry: { 'preview-bundle': '../src/client/renderer/see-through-rig/see-through-rig-preview.ts' },
  outDir: '../artifacts/whale-see-through-idle-rig',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
} satisfies UserConfig
