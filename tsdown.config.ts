import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: 'esm',
  target: 'node22',
  platform: 'node',
  dts: true,
  clean: true,
})
