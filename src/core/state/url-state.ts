/*
 * Deep-state URL synchronization.
 *
 * Modules register parameters that should be reflected into the URL query
 * string. Changes are debounced (200ms) and applied via history.replaceState
 * so the back button is not polluted.
 *
 * On page load, registered params can be hydrated from the URL.
 */

const DEBOUNCE_MS = 200;

const registry = new Map<string, () => string | number | undefined>();
let scheduled = 0;

export function registerStateParam(key: string, read: () => string | number | undefined): void {
  registry.set(key, read);
}

export function notifyStateChange(): void {
  if (scheduled) return;
  scheduled = window.setTimeout(() => {
    scheduled = 0;
    flush();
  }, DEBOUNCE_MS);
}

function flush(): void {
  const url = new URL(window.location.href);
  for (const [key, read] of registry) {
    const value = read();
    if (value === undefined || value === null || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  // Preserve embed=1 and other reserved flags
  history.replaceState(null, '', url.toString());
}

export function hydrateFromUrl(key: string): string | null {
  return new URL(window.location.href).searchParams.get(key);
}

export function hydrateNumber(key: string, fallback: number): number {
  const raw = hydrateFromUrl(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function isEmbedMode(): boolean {
  return hydrateFromUrl('embed') === '1' || isOgMode();
}

export function isOgMode(): boolean {
  return hydrateFromUrl('og') === '1';
}
