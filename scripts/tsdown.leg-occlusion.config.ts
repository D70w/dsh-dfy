import type { UserConfig } from 'tsdown'

export default { name: 'dsh-dfy-leg-occlusion', entry: { 'preview-bundle': '../src/client/renderer/whale-rig2/leg-occlusion-preview.ts' }, outDir: '../artifacts/whale-leg-occlusion', format: 'esm', platform: 'browser', target: 'es2024', dts: false, clean: false, minify: false, sourcemap: false } satisfies UserConfig
