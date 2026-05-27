/*
 * Generate OG cards for every module that has an og-state.json.
 *
 * For each module, we open a headless Chromium at viewport 1200×630 and
 * 1080×1080, navigate to the module URL with ?og=1 plus the hero state,
 * wait for the shell's data-ready sentinel, then save a PNG to /og/.
 *
 * Usage:
 *   npm run dev              # in one terminal
 *   npm run build:og         # in another
 *
 * Or with auto-spawned preview:
 *   npm run build:og -- --serve
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Browser } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_ROOT = resolve(ROOT, 'src/modules');
const OUT_DIR = resolve(ROOT, 'public/og');

const BASE_URL = process.env.OG_BASE_URL ?? 'http://127.0.0.1:5173';
const SHOULD_SERVE = process.argv.includes('--serve');

interface OgState {
  hero?: Record<string, string | number>;
  comment?: string;
}

function findModules(): { id: string; ogStatePath: string }[] {
  const found: { id: string; ogStatePath: string }[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (name === 'og-state.json') {
        const moduleDir = dirname(full);
        const id = relative(MODULES_ROOT, moduleDir).split(/[/\\]/).join('/');
        found.push({ id, ogStatePath: full });
      }
    }
  };
  walk(MODULES_ROOT);
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

function buildUrl(id: string, state: Record<string, string | number>): string {
  const params = new URLSearchParams();
  params.set('og', '1');
  for (const [k, v] of Object.entries(state)) {
    params.set(k, String(v));
  }
  return `${BASE_URL}/modules/${id}/?${params.toString()}`;
}

async function maybeStartPreview(): Promise<ChildProcess | null> {
  if (!SHOULD_SERVE) return null;
  console.log('[og] starting vite preview server...');
  const proc = spawn('npx', ['vite', '--port', '5173'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  // Wait for the "ready" line on stdout
  await new Promise<void>((res, rej) => {
    const timeout = setTimeout(() => rej(new Error('vite never reported ready')), 30_000);
    proc.stdout?.on('data', (chunk: Buffer) => {
      const s = chunk.toString();
      if (s.includes('ready in')) {
        clearTimeout(timeout);
        res();
      }
    });
    proc.on('error', rej);
  });
  console.log('[og] vite ready');
  return proc;
}

async function capture(
  browser: Browser,
  id: string,
  state: Record<string, string | number>,
  width: number,
  height: number,
  outFile: string,
) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,    // retina-grade PNG
  });
  const page = await ctx.newPage();
  const url = buildUrl(id, state);
  console.log(`[og]  → ${width}×${height}  ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });

  // Wait for shell sentinel
  await page.waitForSelector('enc-module-shell[data-ready="1"]', { timeout: 10_000 });
  // Extra time for canvas drawing + font swap
  await page.waitForTimeout(800);

  await page.screenshot({ path: outFile, fullPage: false });
  await ctx.close();
}

async function main() {
  const previewProc = await maybeStartPreview();

  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  const modules = findModules();
  if (modules.length === 0) {
    console.error('[og] No og-state.json found anywhere under src/modules');
    process.exit(1);
  }
  console.log(`[og] found ${modules.length} module(s) with og-state.json`);

  const browser = await chromium.launch();

  let failed = 0;
  for (const { id, ogStatePath } of modules) {
    try {
      const og = JSON.parse(await readFile(ogStatePath, 'utf-8')) as OgState;
      const state = og.hero ?? {};
      const slug = id.replace(/\//g, '--');

      await capture(browser, id, state, 1200, 630, join(OUT_DIR, `${slug}.png`));
      await capture(browser, id, state, 1080, 1080, join(OUT_DIR, `${slug}.sq.png`));
    } catch (err) {
      console.error(`[og] FAILED ${id}:`, (err as Error).message);
      failed++;
    }
  }

  await browser.close();
  previewProc?.kill();

  console.log(`[og] done. ${modules.length - failed}/${modules.length} succeeded.`);
  if (failed > 0) process.exitCode = 1;

  // Index summary
  const summary = modules.map((m) => ({
    id: m.id,
    og: `og/${m.id.replace(/\//g, '--')}.png`,
    square: `og/${m.id.replace(/\//g, '--')}.sq.png`,
  }));
  await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
