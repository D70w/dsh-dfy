import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-bind-pose-v3-preview',
  entry: { 'preview-bundle': '../src/client/renderer/whale-rig2/bind-pose-v3-preview.ts' },
  outDir: '../artifacts/whale-bind-pose-v3',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
} satisfies UserConfig
