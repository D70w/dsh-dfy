import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-realtime-phase1-preview',
  entry: { 'preview-bundle': '../src/client/renderer/whale-rig2/phase1-preview.ts' },
  outDir: '../artifacts/whale-realtime-phase1',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
} satisfies UserConfig
