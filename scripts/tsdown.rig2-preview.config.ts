/**
 * WhaleRig 2.0 phase 1B — standalone browser bundle for the Canvas-2D preview.
 *
 * Builds src/client/renderer/whale-rig2/preview.ts (kernel + rig data +
 * acceptance, all pure TS) into a single browser ESM file under
 * artifacts/whale-rig2-poc/. This does NOT touch the plugin host bundle or the
 * production pet renderer; `--no-clean` keeps the existing probe artifacts.
 */
import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-rig2-preview',
  entry: {
    'preview-bundle': '../src/client/renderer/whale-rig2/preview.ts',
  },
  outDir: '../artifacts/whale-rig2-poc',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
} satisfies UserConfig
