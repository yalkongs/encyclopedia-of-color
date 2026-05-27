/*
 * scripts/og-server.ts — Dynamic OG image server.
 *
 * Routes:
 *   GET /og/<slug>.png?<state>      → 1200×630 PNG generated with the given state
 *   GET /og/<slug>.sq.png?<state>   → 1080×1080 PNG generated with the given state
 *   GET /og/index.json              → catalogue of cached entries
 *   GET /healthz                    → liveness probe
 *
 * `<slug>` is the URL-safe form of a module id (e.g. "refraction-snell--snells-law").
 * Query string is the same deep-state used by modules (theta1=42&n2=1.5 etc.).
 *
 * Caching:
 *   - 2-tier: in-memory LRU (256 entries) + disk cache (public/og-cache/).
 *   - Cache key: slug + sorted querystring.
 *   - Disk cache survives restarts.
 *   - Cache headers: Cache-Control: public, max-age=86400, immutable
 *
 * Deployment patterns:
 *   - Standalone Node service behind a CDN
 *   - Vercel serverless function (export default handler)
 *   - Cloudflare Workers + Browser Rendering API (swap Playwright import)
 *
 * Usage:
 *   PUBLIC_BASE=http://127.0.0.1:5173 PORT=4173 npm run og:server
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DISK_CACHE = resolve(ROOT, 'public/og-cache');

const PORT = Number(process.env.PORT ?? 4173);
const PUBLIC_BASE = process.env.PUBLIC_BASE ?? 'http://127.0.0.1:5173';
const MAX_LRU = Number(process.env.OG_LRU_MAX ?? 256);
const RENDER_TIMEOUT_MS = Number(process.env.OG_TIMEOUT_MS ?? 15_000);

const ALLOWED_DIMENSIONS = new Map<string, { w: number; h: number }>([
  ['', { w: 1200, h: 630 }],        // default (no .sq suffix)
  ['sq', { w: 1080, h: 1080 }],     // square variant for Instagram/KakaoTalk
]);

interface CacheEntry { buf: Buffer; mtime: number }
const lru = new Map<string, CacheEntry>();   // insertion-ordered = LRU

function lruTouch(key: string, value: CacheEntry) {
  lru.delete(key);
  lru.set(key, value);
  while (lru.size > MAX_LRU) {
    const oldest = lru.keys().next().value;
    if (oldest !== undefined) lru.delete(oldest);
  }
}

function cacheKey(slug: string, state: URLSearchParams, variant: string): string {
  // Sort params for canonical key
  const sorted = [...state.entries()].sort(([a], [b]) => a.localeCompare(b));
  const stateStr = sorted.map(([k, v]) => `${k}=${v}`).join('&');
  const hash = createHash('sha1').update(`${slug}|${variant}|${stateStr}`).digest('hex').slice(0, 12);
  return `${slug}${variant ? `.${variant}` : ''}.${hash}.png`;
}

let _browser: Browser | null = null;
async function browser(): Promise<Browser> {
  if (!_browser) _browser = await chromium.launch();
  return _browser;
}

async function renderToBuffer(
  moduleId: string,
  state: URLSearchParams,
  w: number,
  h: number,
): Promise<Buffer> {
  const params = new URLSearchParams(state);
  params.set('og', '1');
  const url = `${PUBLIC_BASE}/modules/${moduleId}/?${params.toString()}`;

  const ctx = await (await browser()).newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
  });
  try {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: RENDER_TIMEOUT_MS });
    await page.waitForSelector('enc-module-shell[data-ready="1"]', { timeout: RENDER_TIMEOUT_MS });
    await page.waitForTimeout(600);
    const buf = await page.screenshot({ fullPage: false });
    return buf as Buffer;
  } finally {
    await ctx.close();
  }
}

async function getOrRender(
  slug: string,
  state: URLSearchParams,
  variant: string,
  w: number, h: number,
): Promise<Buffer> {
  const key = cacheKey(slug, state, variant);
  // L1 — memory
  const hit = lru.get(key);
  if (hit) {
    lruTouch(key, hit);
    return hit.buf;
  }
  // L2 — disk
  const diskPath = resolve(DISK_CACHE, key);
  if (existsSync(diskPath)) {
    const buf = await readFile(diskPath);
    const entry = { buf, mtime: Date.now() };
    lruTouch(key, entry);
    return buf;
  }
  // Miss — render
  if (!existsSync(DISK_CACHE)) await mkdir(DISK_CACHE, { recursive: true });
  const moduleId = slug.replace(/--/g, '/');
  const buf = await renderToBuffer(moduleId, state, w, h);
  await writeFile(diskPath, buf);
  lruTouch(key, { buf, mtime: Date.now() });
  return buf;
}

function send(
  res: ServerResponse,
  status: number,
  body: Buffer | string,
  headers: Record<string, string> = {},
) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  if (!req.url) return send(res, 400, 'No URL');
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/healthz') return send(res, 200, 'ok', { 'Content-Type': 'text/plain' });

  if (url.pathname === '/og/index.json') {
    const items = [...lru.entries()].map(([key, v]) => ({ key, size: v.buf.length, mtime: v.mtime }));
    return send(res, 200, JSON.stringify({ count: items.length, items }, null, 2), {
      'Content-Type': 'application/json',
    });
  }

  // /og/<slug>.png  or  /og/<slug>.sq.png
  const m = /^\/og\/([a-z0-9-]+(?:--[a-z0-9-]+)+)(\.(sq))?\.png$/i.exec(url.pathname);
  if (!m) return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain' });
  const slug = m[1];
  const variant = m[3] ?? '';
  const dim = ALLOWED_DIMENSIONS.get(variant);
  if (!dim) return send(res, 404, 'Unknown variant', { 'Content-Type': 'text/plain' });

  try {
    const buf = await getOrRender(slug, url.searchParams, variant, dim.w, dim.h);
    return send(res, 200, buf, {
      'Content-Type': 'image/png',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-OG-Cache-Status': lru.has(cacheKey(slug, url.searchParams, variant)) ? 'HIT' : 'MISS',
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[og] error rendering ${slug}:`, msg);
    return send(res, 500, msg, { 'Content-Type': 'text/plain' });
  }
}

async function main() {
  await mkdir(DISK_CACHE, { recursive: true });
  // Pre-warm: count existing disk-cached files
  try {
    const st = await stat(DISK_CACHE);
    if (st.isDirectory()) {
      console.log(`[og] disk cache ready at ${DISK_CACHE}`);
    }
  } catch { /* ignore */ }

  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[og] handler error:', err);
      if (!res.headersSent) send(res, 500, 'internal error');
    });
  });
  server.listen(PORT, () => {
    console.log(`[og] dynamic OG server listening on http://127.0.0.1:${PORT}`);
    console.log(`[og] rendering against PUBLIC_BASE = ${PUBLIC_BASE}`);
    console.log(`[og] try: http://127.0.0.1:${PORT}/og/refraction-snell--snells-law.png?theta1=45&n2=1.5`);
  });

  const shutdown = async () => {
    console.log('\n[og] shutting down…');
    await _browser?.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
