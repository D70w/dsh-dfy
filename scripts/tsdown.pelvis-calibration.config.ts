import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-pelvis-calibration',
  entry: { 'preview-bundle': '../src/client/renderer/whale-rig2/pelvis-calibration-preview.ts' },
  outDir: '../artifacts/whale-pelvis-calibration', format: 'esm', platform: 'browser', target: 'es2024', dts: false, clean: false, minify: false, sourcemap: false,
} satisfies UserConfig
