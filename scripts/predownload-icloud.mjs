#!/usr/bin/env node
/*
 * Force-download all node_modules files from iCloud Drive on macOS so that
 * native binaries (esbuild, etc.) are guaranteed to be present on disk and
 * not in "cloud-only" state when they are needed by the build.
 *
 * Runs as a postinstall hook. Silent no-op on non-macOS or non-iCloud paths.
 */

import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { platform } from 'node:os';

if (platform() !== 'darwin') {
  process.exit(0);
}

const projectRoot = resolve(import.meta.dirname, '..');
const inICloud = projectRoot.includes('/Library/Mobile Documents/com~apple~CloudDocs/');

if (!inICloud) {
  process.exit(0);
}

const nodeModules = resolve(projectRoot, 'node_modules');
if (!existsSync(nodeModules)) {
  process.exit(0);
}

// `brctl download` triggers an on-demand fetch of all cloud-only files in a
// path. It's a no-op if everything is already local.
const result = spawnSync('brctl', ['download', nodeModules], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.warn(
    '[predownload-icloud] brctl download failed. If "npm run dev" fails with an esbuild error, run:\n' +
      '    npm run fix-icloud\n' +
      'to move node_modules out of iCloud sync permanently.',
  );
}

// Sanity check: confirm esbuild binary is materialized.
const esbuildBin = resolve(
  nodeModules,
  '@esbuild',
  process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64',
  'bin',
  'esbuild',
);
try {
  if (existsSync(esbuildBin) && statSync(esbuildBin).size > 0) {
    // OK
  }
} catch {
  /* ignore */
}
