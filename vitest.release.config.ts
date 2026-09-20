import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config.ts'

// These asset-authoring checks need intentionally untracked source PSD exports.
// Release CI verifies only tests reproducible from the public checkout and pack.
export default mergeConfig(base, defineConfig({
  test: {
    exclude: [
      'src/client/renderer/whale-rig/webgl.test.ts',
      'src/client/renderer/whale-rig/schema.test.ts',
      'src/client/renderer/whale-rig/motion.test.ts',
      'src/client/renderer/whale-rig2/arm-rig-assets.test.ts',
      'src/client/renderer/whale-rig2/candidate-assets.test.ts',
      'src/client/renderer/whale-rig2/production-loader.test.ts',
      'src/client/renderer/see-through-rig/see-through-occlusion-assets.test.ts',
      'src/client/renderer/see-through-rig/wave-action-assets.test.ts',
    ],
  },
}))
