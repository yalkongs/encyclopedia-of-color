import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Vite serves from src/ — landing page lives at src/index.html, modules at src/modules/*/.
// Each src/modules/<cat>/<entry>/index.html becomes a Rollup input keyed relative to root.
const moduleEntries = Object.fromEntries(
  globSync('src/modules/**/index.html', { cwd: __dirname }).map((file) => {
    const key = file.replace(/^src\//, '').replace(/\/index\.html$/, '');
    return [key, resolve(__dirname, file)];
  }),
);

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@modules': resolve(__dirname, 'src/modules'),
    },
  },
  build: {
    target: 'es2022',
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'),
        'embed/index': resolve(__dirname, 'src/embed/index.html'),
        reference: resolve(__dirname, 'src/reference/index.html'),
        ...moduleEntries,
      },
      output: {
        manualChunks(id) {
          if (id.includes('/src/core/math/')) return 'core-math';
          if (id.includes('/src/core/components/')) return 'core-components';
          if (id.includes('/src/core/locales/')) return 'core-locales';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});
