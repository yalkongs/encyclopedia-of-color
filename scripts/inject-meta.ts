/*
 * scripts/inject-meta.ts — Automatic <head> meta tag injection.
 *
 * For every module that has a meta.json, this script reads the metadata
 * and rewrites the head of index.html so that the following are always
 * in sync with meta.json:
 *
 *   <title>
 *   <meta name="description">
 *   <link rel="canonical">
 *   <meta property="og:*">         (type, site_name, title, description,
 *                                    url, image, image:width, image:height,
 *                                    image:alt, locale, locale:alternate)
 *   <meta name="twitter:*">        (card, site, title, description,
 *                                    image, image:alt)
 *   <script application/ld+json>   (Schema.org LearningResource)
 *
 * The injected block is delimited by sentinel comments so the script is
 * idempotent — running it again replaces the block, never appends.
 *
 *   <!-- AUTO-META v2 START · do not edit, run `npm run inject-meta` -->
 *   …injected tags…
 *   <!-- AUTO-META v2 END -->
 *
 * Run automatically via npm scripts: predev, prebuild, prebuild:og.
 *
 * Usage:
 *   npm run inject-meta                # all modules
 *   npm run inject-meta -- foo/bar     # single module
 */

import { readdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMeta, ogSlug, moduleUrl, SITE, type MetaV2 } from './lib/meta-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_ROOT = resolve(ROOT, 'src/modules');

const SENTINEL_START = '<!-- AUTO-META v2 START · do not edit, run `npm run inject-meta` -->';
const SENTINEL_END   = '<!-- AUTO-META v2 END -->';

interface ModuleEntry { id: string; dir: string }

function findModules(filter?: string): ModuleEntry[] {
  const found: ModuleEntry[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name === 'meta.json') {
        const moduleDir = dirname(full);
        const id = relative(MODULES_ROOT, moduleDir).split(/[/\\]/).join('/');
        if (!filter || filter === id) found.push({ id, dir: moduleDir });
      }
    }
  };
  walk(MODULES_ROOT);
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

function buildMetaBlock(meta: MetaV2): string {
  const url = moduleUrl(meta.id);
  const slug = ogSlug(meta.id);
  const ogImage = `${SITE.origin}/og/${slug}.png`;
  const desc = escAttr(meta.description.en);
  const titleAttr = escAttr(meta.title.en);
  const ogAlt = `Interactive simulation: ${meta.title.en}.`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: meta.title.en,
    alternateName: meta.id,
    description: meta.description.en,
    educationalLevel: ({
      L1: 'Beginner', L2: 'Beginner', L3: 'Intermediate',
      L4: 'Intermediate', L5: 'Advanced', L6: 'Advanced',
    } as const)[meta.bloom_level],
    learningResourceType: 'Simulation',
    isPartOf: { '@type': 'Collection', name: SITE.name_en },
    inLanguage: ['en', 'ko'],
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    keywords: meta.seo_keywords.join(', '),
    url,
    image: ogImage,
  };

  return [
    SENTINEL_START,
    `  <title>${escHtml(`${meta.title.en} — ${truncate(meta.subtitle.en, 70 - meta.title.en.length - 3)}`)}</title>`,
    `  <meta name="description" content="${desc}">`,
    `  <link rel="canonical" href="${url}">`,
    ``,
    `  <meta property="og:type"           content="website">`,
    `  <meta property="og:site_name"      content="${escAttr(SITE.name_en)}">`,
    `  <meta property="og:title"          content="${titleAttr}">`,
    `  <meta property="og:description"    content="${desc}">`,
    `  <meta property="og:url"            content="${url}">`,
    `  <meta property="og:image"          content="${ogImage}">`,
    `  <meta property="og:image:width"    content="1200">`,
    `  <meta property="og:image:height"   content="630">`,
    `  <meta property="og:image:alt"      content="${escAttr(ogAlt)}">`,
    `  <meta property="og:locale"         content="en_US">`,
    `  <meta property="og:locale:alternate" content="ko_KR">`,
    ``,
    `  <meta name="twitter:card"          content="summary_large_image">`,
    `  <meta name="twitter:site"          content="${SITE.twitter_handle}">`,
    `  <meta name="twitter:title"         content="${titleAttr}">`,
    `  <meta name="twitter:description"   content="${desc}">`,
    `  <meta name="twitter:image"         content="${ogImage}">`,
    `  <meta name="twitter:image:alt"     content="${escAttr(ogAlt)}">`,
    ``,
    `  <script type="application/ld+json">${JSON.stringify(ld)}</script>`,
    `  ${SENTINEL_END}`,
  ].join('\n');
}

function escHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}
function escAttr(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)).trim() + '…';
}

async function processModule({ id, dir }: ModuleEntry): Promise<'injected' | 'updated' | 'missing'> {
  const metaPath  = join(dir, 'meta.json');
  const htmlPath  = join(dir, 'index.html');
  const meta = await loadMeta(metaPath);

  let html: string;
  try { html = await readFile(htmlPath, 'utf-8'); }
  catch { return 'missing'; }

  const block = buildMetaBlock(meta);

  const startIdx = html.indexOf(SENTINEL_START);
  const endIdx   = html.indexOf(SENTINEL_END);

  let next: string;
  if (startIdx >= 0 && endIdx > startIdx) {
    // Replace existing block
    next = html.slice(0, startIdx) + block + html.slice(endIdx + SENTINEL_END.length);
  } else {
    // Insert directly after <head> opening
    const headOpen = html.search(/<head[^>]*>/i);
    if (headOpen < 0) {
      console.warn(`[inject-meta] ${id}: no <head> tag found, skipping`);
      return 'missing';
    }
    const insertAt = html.indexOf('>', headOpen) + 1;
    const meta1Encoding = '\n  <meta charset="UTF-8">';
    const meta2Viewport = '\n  <meta name="viewport" content="width=device-width, initial-scale=1">';
    next = html.slice(0, insertAt) + meta1Encoding + meta2Viewport + '\n  ' + block + html.slice(insertAt);
  }

  if (next === html) return 'updated';

  await writeFile(htmlPath, next);
  return startIdx >= 0 ? 'updated' : 'injected';
}

async function main() {
  const filter = process.argv[2];
  const modules = findModules(filter);
  if (modules.length === 0) {
    console.error(`[inject-meta] no modules found${filter ? ` matching "${filter}"` : ''}`);
    process.exit(1);
  }
  let injected = 0, updated = 0, failed = 0;
  for (const m of modules) {
    try {
      const status = await processModule(m);
      if (status === 'injected') injected++;
      else if (status === 'updated') updated++;
      console.log(`  ${status === 'updated' ? '↻' : '+'} ${m.id}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${m.id}: ${(err as Error).message}`);
    }
  }
  console.log(`\n[inject-meta] ${injected} new · ${updated} refreshed · ${failed} failed (of ${modules.length})`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
