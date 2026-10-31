import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig(({ mode }) => ({
  plugins: [preact()],
  // Relative assets work under a GitHub Pages repository path and on custom domains.
  base: mode === 'demo' ? './' : '/',
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: 'es2021', chunkSizeWarningLimit: 900 },
}));
