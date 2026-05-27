import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Separate build for the embed loader.
 *
 * Output: dist/embed/loader.js — a single self-contained IIFE bundle that
 * hosts include with one <script> tag. Does not collide with the main
 * MPA build (vite.config.ts) which writes to dist/assets, dist/modules, …
 */
export default defineConfig({
  build: {
    target: 'es2019',
    outDir: resolve(__dirname, 'dist/embed'),
    emptyOutDir: false,
    minify: 'esbuild',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/embed/loader.ts'),
      name: 'EncyclopediaOfColor',
      formats: ['iife'],
      fileName: () => 'loader.js',
    },
  },
});
