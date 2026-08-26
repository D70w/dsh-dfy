import type { UserConfig } from 'tsdown'

export default {
  name: 'dsh-dfy-production-run-preview',
  entry: {
    'preview-bundle': './whale-production-preview-entry.ts',
  },
  outDir: '../artifacts/whale-run-production',
  format: 'esm',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  minify: false,
  sourcemap: false,
  deps: {
    alwaysBundle: [/^zod(?:\/|$)/],
    onlyBundle: false,
  },
} satisfies UserConfig
