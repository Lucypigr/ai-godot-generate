import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const thirdParty = fileURLToPath(new URL('../third_party', import.meta.url));

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@pixelbolt': `${thirdParty}/Pixelbolt/src`,
      '@ppae': `${thirdParty}/ppae-engine/src`,
      '@autotiler': `${thirdParty}/autotiler/src/core`,
      '@third': thirdParty,
    },
    // third_party sources import these packages; resolve them from this app's node_modules.
    dedupe: ['fast-png', 'fflate', 'shadermate'],
  },
  server: { fs: { allow: ['..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
});
