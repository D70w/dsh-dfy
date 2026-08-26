import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-community-rig-preview',
  entry: { 'preview-bundle': '../src/client/renderer/community-rig/community-rig-preview.ts' },
  outDir: '../artifacts/whale-community-idle-rig',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
} satisfies UserConfig
