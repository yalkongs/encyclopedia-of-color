/*
 * scripts/new-module.ts — Scaffold a new module from the catalog.
 *
 * Usage:
 *   npm run new-module -- light-propagation/inverse-square
 *
 * Reads module_catalog.md (or a flag override) to discover catalog metadata,
 * then writes the 6 standard files to src/modules/<id>/:
 *   index.html        — Pretext-native HTML with AUTO-META block
 *   main.ts           — minimal Web Component wiring (author fills in)
 *   style.css         — empty placeholder
 *   meta.json         — pre-filled with id, title, tier, etc.
 *   refs.bib          — empty citation file (author adds)
 *   og-state.json     — default OG hero state
 *
 * If the destination already exists, the script aborts unless --force is set.
 */

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_ROOT = resolve(ROOT, 'src/modules');
const CATALOG_PATH = resolve(ROOT, 'module_catalog.md');

interface ScaffoldOptions {
  id: string;
  titleEn?: string;
  subtitleEn?: string;
  force: boolean;
  tier?: 'headliner' | 'reference' | 'atom';
  bloom?: string;
  layout?: 'A' | 'B' | 'C';
}

function parseArgs(): ScaffoldOptions {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npm run new-module -- <category>/<entry> [--title="…"] [--subtitle="…"] [--force]');
    process.exit(1);
  }
  const id = args[0];
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) {
    console.error(`Invalid id "${id}". Expected lowercase kebab-case "<category>/<entry>".`);
    process.exit(1);
  }
  const get = (flag: string) => {
    const m = args.find((a) => a.startsWith(`--${flag}=`));
    return m ? m.slice(flag.length + 3) : undefined;
  };
  return {
    id,
    titleEn:    get('title'),
    subtitleEn: get('subtitle'),
    tier:       get('tier') as ScaffoldOptions['tier'],
    bloom:      get('bloom'),
    layout:     (get('layout') as 'A' | 'B' | 'C') ?? 'A',
    force:      args.includes('--force'),
  };
}

async function readCatalogEntry(id: string): Promise<{ title: string; subtitle: string; bloomGuess: string } | null> {
  try {
    const md = await readFile(CATALOG_PATH, 'utf-8');
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^\\d+\\.\\s+\`${escaped}\`\\s+—\\s+(.+?)$`, 'm');
    const m = re.exec(md);
    if (!m) return null;
    const body = m[1].trim();
    const bracket = /\[([^\]]+)\]/.exec(body)?.[1] ?? '';
    const llevel = /·\s+(L[1-6])/.exec(body)?.[1] ?? 'L2';
    const titleBeforeBracket = body.split('[')[0].split('·')[0].trim();
    return { title: titleBeforeBracket, subtitle: bracket, bloomGuess: llevel };
  } catch {
    return null;
  }
}

function htmlTemplate(meta: ScaffoldOptions): string {
  const layout = meta.layout ?? 'A';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- AUTO-META v2 START · do not edit, run \`npm run inject-meta\` -->
  <!-- AUTO-META v2 END -->
  <link rel="stylesheet" href="../../../core/styles/base.css">
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <enc-module-shell layout="${layout}" module-id="${meta.id}">

    <header class="module-header">
      <div class="chip-row">
        <span class="chip" data-i18n="domain.1">D1 Optics</span>
        <span class="chip" data-i18n="bloom.${meta.bloom ?? 'L2'}">${meta.bloom ?? 'L2'}</span>
        <span class="chip chip-tier" data-tier="${meta.tier ?? 'atom'}" data-i18n="tier.${meta.tier ?? 'atom'}">${(meta.tier ?? 'atom').replace(/^./, (c) => c.toUpperCase())}</span>
      </div>
      <h1 class="module-title" data-i18n="${slugifyKey(meta.id)}.title">${escHtml(meta.titleEn ?? meta.id)}</h1>
      <p class="module-subtitle" data-i18n="${slugifyKey(meta.id)}.subtitle">${escHtml(meta.subtitleEn ?? '— TODO: write subtitle')}</p>
    </header>

    <div class="workstation-${layout}">
      <aside class="control-panel">
        <p class="zone-definition" data-i18n="${slugifyKey(meta.id)}.definition">
          TODO: one-sentence physical definition (≤25 words).
        </p>
        <div class="math-block" data-tex="\\\\text{TODO: KaTeX expression here}"></div>
        <p class="zone-guide" data-i18n="${slugifyKey(meta.id)}.guide">
          TODO: 2-3 sentences telling the user what to drag and what to observe.
        </p>

        <!-- TODO: enc-slider / enc-toggle controls -->
      </aside>

      <main class="canvas-viewport">
        <enc-canvas-stage id="stage" tabindex="0" aria-label="${escAttr(meta.titleEn ?? meta.id)}"></enc-canvas-stage>
      </main>
    </div>

    <enc-citation-footer data-refs="TODO: textbook §section">
    </enc-citation-footer>

  </enc-module-shell>

  <script type="module" src="./main.ts"></script>
</body>
</html>
`;
}

function mainTsTemplate(meta: ScaffoldOptions): string {
  return `import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
// import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
// import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Module {
  private stage: CanvasStage;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    // TODO: bind sliders, hydrate from URL, register state params

    document.addEventListener('reset-params', () => this.reset());
  }

  private reset() {
    // TODO: restore defaults
    this.draw();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // TODO: render simulation
    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('${meta.id} — implementation pending', 16, 24);
    void axisStyle;
  }
}

window.addEventListener('DOMContentLoaded', () => new Module());
`;
}

function metaJsonTemplate(meta: ScaffoldOptions, catalog: { title: string; subtitle: string; bloomGuess: string } | null): string {
  const titleEn = meta.titleEn ?? catalog?.title ?? humanize(meta.id.split('/')[1]);
  const subtitleEn = meta.subtitleEn ?? catalog?.subtitle ?? 'TODO subtitle (10-25 words, with action verb)';
  const bloom = meta.bloom ?? catalog?.bloomGuess ?? 'L2';
  const category = meta.id.split('/')[0];

  const meta2 = {
    schema_version: 'v2' as const,
    id: meta.id,
    title: { en: titleEn, ko: titleEn },
    subtitle: { en: subtitleEn, ko: subtitleEn },
    description: { en: `${titleEn}. ${subtitleEn}`, ko: `${titleEn}. ${subtitleEn}` },
    tier: meta.tier ?? 'atom',
    bloom_level: bloom,
    domain: 1,
    category,
    layout: meta.layout ?? 'A',
    prerequisites: [],
    leads_to: [],
    see_also: [],
    textbook_refs: [{ source: 'TODO: textbook', section: '§TODO' }],
    standards: [],
    interaction_count: 1,
    learning_paths: [],
    seo_keywords: [],
    estimated_hours: 12,
    status: 'draft' as const,
  };
  return JSON.stringify(meta2, null, 2) + '\n';
}

function refsBibTemplate(meta: ScaffoldOptions): string {
  const key = meta.id.replace(/\//g, '-');
  return `@misc{${key},
  title = {${meta.titleEn ?? meta.id}},
  author = {Interactive Encyclopedia of Color},
  note = {TODO: cite primary textbook source for this module}
}
`;
}

function ogStateTemplate(): string {
  return `{
  "hero": {},
  "comment": "TODO: pick slider values that make the most visually striking thumbnail."
}
`;
}

function styleCssTemplate(): string {
  return `/* module-specific styles only — base + controls come from @core/styles */
`;
}

function slugifyKey(id: string): string {
  return id.split('/').pop()!.replace(/-/g, '');
}

function escHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}
function escAttr(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function humanize(slug: string): string {
  return slug.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  const opts = parseArgs();
  const dir = join(MODULES_ROOT, opts.id);
  if (existsSync(dir) && !opts.force) {
    console.error(`[new-module] directory already exists: ${dir}`);
    console.error('             pass --force to overwrite.');
    process.exit(1);
  }
  await mkdir(dir, { recursive: true });

  const catalog = await readCatalogEntry(opts.id);
  if (catalog) {
    console.log(`[new-module] found catalog entry: "${catalog.title}" · ${catalog.bloomGuess}`);
  } else {
    console.log('[new-module] no catalog entry found — using defaults');
  }
  // Mix in catalog title/subtitle if author didn't override
  if (catalog) {
    opts.titleEn ??= catalog.title;
    opts.subtitleEn ??= catalog.subtitle;
    opts.bloom ??= catalog.bloomGuess;
  }

  const files: Array<[string, string]> = [
    ['index.html',     htmlTemplate(opts)],
    ['main.ts',        mainTsTemplate(opts)],
    ['style.css',      styleCssTemplate()],
    ['meta.json',      metaJsonTemplate(opts, catalog)],
    ['refs.bib',       refsBibTemplate(opts)],
    ['og-state.json',  ogStateTemplate()],
  ];

  for (const [name, content] of files) {
    const fp = join(dir, name);
    if (!opts.force && (await exists(fp))) {
      console.log(`  · skip   ${name} (exists)`);
      continue;
    }
    await writeFile(fp, content);
    console.log(`  + ${name}`);
  }

  console.log(`\n[new-module] scaffolded ${opts.id} → src/modules/${opts.id}/`);
  console.log('             next: implement main.ts, then run `npm run inject-meta`.');
}

main().catch((err) => { console.error(err); process.exit(1); });
