import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-mesh-skinning',
  entry: { 'preview-bundle': '../src/client/renderer/whale-rig2/mesh-skinning-preview.ts' },
  outDir: '../artifacts/whale-mesh-skinning',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
} satisfies UserConfig
