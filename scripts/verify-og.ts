/*
 * scripts/verify-og.ts — OG / Twitter / Schema.org regression check.
 *
 * For every module under src/modules/, fetches the live HTML from a running
 * dev or preview server, parses the head, and runs a checklist of validations
 * inspired by Facebook's OG debugger, X's card validator, and LinkedIn's
 * post inspector. Avoids those services' rate-limited APIs by doing the
 * structural checks locally.
 *
 * Usage:
 *   npm run dev                 # in one terminal
 *   npm run verify:og           # in another, or as part of CI
 *
 * Optional flags:
 *   --base=http://127.0.0.1:5173   override base URL
 *   --no-image-fetch               skip the og:image HEAD validation
 *   --json                         emit machine-readable JSON to stdout
 */

import { readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_ROOT = resolve(ROOT, 'src/modules');

const args = process.argv.slice(2);
const baseArg = args.find((a) => a.startsWith('--base='))?.slice('--base='.length);
const BASE_URL = baseArg ?? process.env.OG_BASE_URL ?? 'http://127.0.0.1:5173';
const NO_IMAGE_FETCH = args.includes('--no-image-fetch');
const EMIT_JSON = args.includes('--json');

interface ValidationResult {
  id: string;
  url: string;
  pass: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
}

const REQUIRED_META = [
  // [selector, why]
  ['title',                          'Browser tab + Slack fallback title'],
  ['meta[name="description"]',       'Search engine + Slack fallback description'],
  ['meta[property="og:type"]',       'Facebook / LinkedIn card classification'],
  ['meta[property="og:title"]',      'Facebook / LinkedIn card title'],
  ['meta[property="og:description"]', 'Facebook / LinkedIn card description'],
  ['meta[property="og:image"]',      'Facebook / LinkedIn hero image'],
  ['meta[property="og:image:width"]',  'Aspect ratio hint to crawlers'],
  ['meta[property="og:image:height"]', 'Aspect ratio hint to crawlers'],
  ['meta[property="og:url"]',        'Canonical URL — fallback to <link rel=canonical>'],
  ['meta[property="og:site_name"]',  'Site name on Facebook / LinkedIn cards'],
  ['meta[name="twitter:card"]',      'X (Twitter) card style'],
  ['meta[name="twitter:title"]',     'X card title'],
  ['meta[name="twitter:description"]', 'X card description'],
  ['meta[name="twitter:image"]',     'X card hero image'],
] as const;

function findModules(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name === 'index.html') {
        const moduleDir = dirname(full);
        const id = relative(MODULES_ROOT, moduleDir).split(/[/\\]/).join('/');
        found.push(id);
      }
    }
  };
  walk(MODULES_ROOT);
  return found.sort();
}

/**
 * Selector → value extraction.
 *
 * Uses a permissive iterative scan rather than a single regex literal,
 * since template-literal-built regexes have proven brittle here (the
 * `${}` sequence in character classes can be misread).
 */

function tagValue(html: string, selector: string): string | null {
  if (selector === 'title') {
    const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
    return m ? m[1].trim() : null;
  }
  const sel = /^(meta|link)\[(name|property|rel)="([^"]+)"\]$/.exec(selector);
  if (!sel) return null;
  const [, tagName, attrName, attrVal] = sel;

  // Iterate over every <meta …> / <link …> tag in the document
  const tagRe = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[0];
    // Read the looked-up attribute and 'content' inside this tag substring
    const got = readAttr(tag, attrName);
    if (got === attrVal) {
      return readAttr(tag, 'content');
    }
  }
  return null;
}

function readAttr(tag: string, attr: string): string | null {
  // Match  attr="value"  or  attr='value'  with optional whitespace
  const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = re.exec(tag);
  return m ? m[1] : null;
}

async function validateModule(id: string): Promise<ValidationResult> {
  const url = `${BASE_URL}/modules/${id}/`;
  const checks: ValidationResult['checks'] = [];

  let html: string;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      return {
        id, url, pass: false,
        checks: [{ name: 'fetch HTML', ok: false, detail: `HTTP ${r.status}` }],
      };
    }
    html = await r.text();
    checks.push({ name: 'fetch HTML', ok: true, detail: `${html.length}b` });
  } catch (err) {
    return {
      id, url, pass: false,
      checks: [{ name: 'fetch HTML', ok: false, detail: (err as Error).message }],
    };
  }

  // (1) Required meta presence
  for (const [selector, why] of REQUIRED_META) {
    const value = tagValue(html, selector);
    const ok = value !== null && value.trim().length > 0;
    checks.push({
      name: selector,
      ok,
      detail: ok ? value!.slice(0, 64) : `missing (${why})`,
    });
  }

  // (2) og:type whitelist
  const ogType = tagValue(html, 'meta[property="og:type"]');
  if (ogType) {
    const validTypes = ['website', 'article', 'book', 'video.other'];
    checks.push({
      name: 'og:type ∈ valid set',
      ok: validTypes.includes(ogType),
      detail: ogType,
    });
  }

  // (3) twitter:card value
  const twitterCard = tagValue(html, 'meta[name="twitter:card"]');
  if (twitterCard) {
    const validCards = ['summary', 'summary_large_image', 'app', 'player'];
    checks.push({
      name: 'twitter:card ∈ valid set',
      ok: validCards.includes(twitterCard),
      detail: twitterCard,
    });
  }

  // (4) Title length constraints (Google: ≤60, X: ≤70)
  const title = tagValue(html, 'title') ?? '';
  checks.push({
    name: 'title length ≤ 70',
    ok: title.length > 0 && title.length <= 70,
    detail: `${title.length} chars`,
  });

  // (5) Description length constraints (Google: ≤160, FB: ≤200)
  const desc = tagValue(html, 'meta[name="description"]') ?? '';
  checks.push({
    name: 'description 80…200',
    ok: desc.length >= 80 && desc.length <= 200,
    detail: `${desc.length} chars`,
  });

  // (6) og:image: must resolve + correct dimensions
  if (!NO_IMAGE_FETCH) {
    const ogImage = tagValue(html, 'meta[property="og:image"]');
    if (ogImage) {
      const absUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, BASE_URL).toString();
      try {
        const r = await fetch(absUrl, { method: 'HEAD' });
        const ct = r.headers.get('content-type') ?? '';
        checks.push({
          name: 'og:image HEAD 200',
          ok: r.ok,
          detail: `${r.status} ${ct}`,
        });
        checks.push({
          name: 'og:image content-type is image/*',
          ok: ct.startsWith('image/'),
          detail: ct,
        });
        const declaredW = Number(tagValue(html, 'meta[property="og:image:width"]'));
        const declaredH = Number(tagValue(html, 'meta[property="og:image:height"]'));
        const validRatio =
          (declaredW === 1200 && declaredH === 630) ||
          (declaredW === 1080 && declaredH === 1080);
        checks.push({
          name: 'og:image dimensions canonical',
          ok: validRatio,
          detail: `${declaredW}×${declaredH}`,
        });
      } catch (err) {
        checks.push({
          name: 'og:image HEAD 200',
          ok: false,
          detail: (err as Error).message,
        });
      }
    }
  }

  // (7) Schema.org LearningResource present
  const ldMatch = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (ldMatch) {
    try {
      const parsed = JSON.parse(ldMatch[1]);
      const ok =
        (parsed['@context'] === 'https://schema.org' || parsed['@context']?.startsWith('https://schema.org')) &&
        parsed['@type'] === 'LearningResource';
      checks.push({
        name: 'Schema.org LearningResource',
        ok,
        detail: ok ? `name="${parsed.name}"` : 'wrong @type or @context',
      });
    } catch (err) {
      checks.push({
        name: 'Schema.org LearningResource',
        ok: false,
        detail: 'JSON parse failed',
      });
    }
  } else {
    checks.push({
      name: 'Schema.org LearningResource',
      ok: false,
      detail: 'no <script type=application/ld+json> found',
    });
  }

  const pass = checks.every((c) => c.ok);
  return { id, url, pass, checks };
}

async function main() {
  const modules = findModules();
  if (modules.length === 0) {
    console.error('[verify-og] no modules found under src/modules');
    process.exit(1);
  }

  const results: ValidationResult[] = [];
  for (const id of modules) {
    results.push(await validateModule(id));
  }

  if (EMIT_JSON) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    // Pretty print
    const reset = '\x1b[0m';
    const red = '\x1b[31m', green = '\x1b[32m', dim = '\x1b[2m';
    let passCount = 0;
    for (const r of results) {
      const head = `${r.pass ? `${green}✓` : `${red}✗`}${reset} ${r.id}  ${dim}${r.url}${reset}`;
      console.log(head);
      if (!r.pass) {
        for (const c of r.checks) {
          if (!c.ok) {
            console.log(`   ${red}✗${reset} ${c.name}  ${dim}${c.detail ?? ''}${reset}`);
          }
        }
      }
      if (r.pass) passCount++;
    }
    console.log(`\n${passCount}/${results.length} modules passed all OG/Twitter/Schema.org checks.`);
  }

  const allPass = results.every((r) => r.pass);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
