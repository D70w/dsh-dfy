import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-master-golden-preview',
  entry: { 'preview-bundle': '../src/client/renderer/whale-rig2/master-preview.ts' },
  outDir: '../artifacts/whale-master-cutout-v1',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
} satisfies UserConfig
