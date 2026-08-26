import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-rig-calibration',
  entry: { 'calibration-bundle': '../src/client/renderer/whale-rig2/rig-calibration.ts' },
  outDir: '../artifacts/whale-rig-calibration',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
} satisfies UserConfig

