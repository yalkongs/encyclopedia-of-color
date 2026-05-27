#!/bin/bash
# Move node_modules out of iCloud sync by using a .nosync sibling + symlink.
# macOS treats any folder ending in .nosync as excluded from iCloud Drive sync.
#
# Run once after `npm install` to prevent transient esbuild/binary failures
# caused by iCloud evicting binaries to "cloud-only" state.
#
# Usage:
#   npm install
#   bash scripts/setup-nosync.sh

set -e
cd "$(dirname "$0")/.."

if [ -L node_modules ]; then
  echo "node_modules is already a symlink — skipping."
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "node_modules not found. Run 'npm install' first."
  exit 1
fi

if [ -d node_modules.nosync ]; then
  echo "Removing previous node_modules.nosync..."
  rm -rf node_modules.nosync
fi

mv node_modules node_modules.nosync
ln -s node_modules.nosync node_modules
echo "✓ node_modules → node_modules.nosync (excluded from iCloud sync)"
echo "Now run 'npm run dev' freely."
