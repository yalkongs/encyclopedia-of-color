/*
 * scripts/build-landing.ts — Auto-generate the landing page module grid.
 *
 * Reads every module's meta.json, groups by category, and rewrites the
 * AUTO-LANDING block in src/index.html with a card per shipped module.
 *
 * Run automatically before dev / build (npm scripts wire predev / prebuild).
 * Authors only ever edit meta.json; this script keeps the landing in sync.
 */

import { readdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMeta, type MetaV2 } from './lib/meta-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_ROOT = resolve(ROOT, 'src/modules');
const LANDING_PATH = resolve(ROOT, 'src/index.html');

const SENTINEL_START = '<!-- AUTO-LANDING START · do not edit, run `npm run build:landing` -->';
const SENTINEL_END   = '<!-- AUTO-LANDING END -->';

/** Category → (human title, subtitle). Categories not listed fall back to humanised id. */
const CATEGORY_META: Record<string, { title: string; sub: string }> = {
  'light-basics':                 { title: 'Light Basics',          sub: 'Domain 1 · the building blocks of light' },
  'light-propagation':            { title: 'Light Propagation',     sub: 'Domain 1 · shadows, pinholes, ray geometry' },
  'em-fundamentals':              { title: 'Electromagnetic Waves', sub: 'Domain 1 · E, B, Poynting, spectrum' },
  'wave-fundamentals':            { title: 'Wave Fundamentals',     sub: 'Domain 1 · sine, phase, beats, packets' },
  'reflection-lab':               { title: 'Reflection',            sub: 'Domain 1 · specular, mirrors, Fresnel' },
  'refraction-snell':             { title: 'Refraction',            sub: "Domain 1 · Snell's law, dispersion at interfaces" },
  'total-internal-reflection':    { title: 'Total Internal Reflection', sub: 'Domain 1 · critical angle, fibres, evanescence' },
  'prism-dispersion':             { title: 'Prism & Dispersion',    sub: 'Domain 1 · wavelength-dependent refraction' },
  'atmospheric-optics':           { title: 'Atmospheric Optics',    sub: 'Domain 1 · rainbows, mirages, halos' },
  'wave-interference':            { title: 'Interference',          sub: 'Domain 1 · superposition, thin films, gratings' },
  'light-diffraction':            { title: 'Diffraction',           sub: 'Domain 1 · slits, Airy, Rayleigh limit' },
  'wave-polarization':            { title: 'Polarization',          sub: 'Domain 1 · Malus, Brewster, birefringence' },
  'particle-scattering':          { title: 'Scattering',            sub: 'Domain 1 · Rayleigh, Mie, Tyndall, sky/sunset' },
  'planckian-radiation':          { title: 'Planckian Radiation',   sub: 'Domain 1 · blackbody, colour temperature, photometry' },
  // Domain 2
  'vision-anatomy-basics':        { title: 'Vision Anatomy',        sub: 'Domain 2 · the perceiving eye' },
  'rods-adaptation':              { title: 'Rod Cells & Adaptation', sub: 'Domain 2 · scotopic vision and dark adaptation' },
  'cones-sensitivity':            { title: 'Cone Sensitivity',      sub: 'Domain 2 · LMS, trichromacy, ipRGC' },
  'receptive-fields':             { title: 'Receptive Fields',      sub: 'Domain 2 · Mach bands, lateral inhibition' },
  'opponent-process':             { title: 'Opponent Process',      sub: 'Domain 2 · Hering channels, afterimages' },
  'color-constancy':              { title: 'Color Constancy',       sub: 'Domain 2 · Von Kries, the Dress, retinex' },
  'color-vision-deficiency':      { title: 'Color Vision Deficiency', sub: 'Domain 2 · dichromacy and anomalous trichromacy' },
};

interface ModuleEntry { meta: MetaV2; href: string }

function findModuleMetas(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name === 'meta.json') found.push(full);
    }
  };
  walk(MODULES_ROOT);
  return found.sort();
}

function escHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

function humanise(slug: string): string {
  return slug.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

function tierLabel(t: MetaV2['tier']): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function renderCard(m: MetaV2): string {
  return `      <a class="module-card" href="./modules/${m.id}/">
        <div class="card-meta">${m.bloom_level} · ${tierLabel(m.tier)} · ${escHtml(humanise(m.category))}</div>
        <div class="card-title">${escHtml(m.title.en)}</div>
        <div class="card-sub">${escHtml(m.subtitle.en)}</div>
      </a>`;
}

function renderCluster(category: string, modules: MetaV2[]): string {
  const info = CATEGORY_META[category] ?? { title: humanise(category), sub: '' };
  const cards = modules
    .sort((a, b) => {
      // Sort by bloom level (L1 first), then by id
      const bloomDiff = a.bloom_level.localeCompare(b.bloom_level);
      return bloomDiff !== 0 ? bloomDiff : a.id.localeCompare(b.id);
    })
    .map(renderCard)
    .join('\n');
  return `    <div class="domain-cluster">
      <h2 class="section-title">${escHtml(info.title)}</h2>
      <div class="sub">${escHtml(info.sub)}</div>
      <div class="module-grid">
${cards}
      </div>
    </div>`;
}

async function main() {
  const metaPaths = findModuleMetas();
  const modules: ModuleEntry[] = [];
  for (const mp of metaPaths) {
    const meta = await loadMeta(mp);
    const rel = relative(MODULES_ROOT, dirname(mp)).split(/[/\\]/).join('/');
    modules.push({ meta, href: `./modules/${rel}/` });
  }

  // Group by category, in domain order (D1 first, D2 next, then alphabetical)
  const byCategory = new Map<string, MetaV2[]>();
  for (const { meta } of modules) {
    const arr = byCategory.get(meta.category) ?? [];
    arr.push(meta);
    byCategory.set(meta.category, arr);
  }

  // Custom ordering: domain 1 categories in the production_plan order, then 2, then others
  const D1_ORDER = [
    'light-basics', 'light-propagation', 'em-fundamentals', 'wave-fundamentals',
    'reflection-lab', 'refraction-snell', 'total-internal-reflection',
    'prism-dispersion', 'atmospheric-optics',
    'wave-interference', 'light-diffraction', 'wave-polarization',
    'particle-scattering', 'planckian-radiation',
  ];
  const D2_ORDER = [
    'vision-anatomy-basics', 'rods-adaptation', 'cones-sensitivity',
    'receptive-fields', 'opponent-process', 'color-constancy',
    'nonlinear-visual-shifts', 'macadam-jnd', 'color-vision-deficiency',
  ];
  const sortedCats = [
    ...D1_ORDER.filter((c) => byCategory.has(c)),
    ...D2_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !D1_ORDER.includes(c) && !D2_ORDER.includes(c)).sort(),
  ];

  const sections = sortedCats
    .map((c) => renderCluster(c, byCategory.get(c)!))
    .join('\n');

  const intro = `    <p class="intro">
      The encyclopedia will eventually hold 518 interactive modules across 12 domains. As of this build, <strong>${modules.length} modules</strong> are published across ${sortedCats.length} categories — every one an independent, embeddable simulation.
    </p>`;

  const block = [
    SENTINEL_START,
    `    <!-- ${modules.length} modules across ${sortedCats.length} categories -->`,
    intro,
    sections,
    `    ${SENTINEL_END}`,
  ].join('\n');

  const html = await readFile(LANDING_PATH, 'utf-8');
  const startIdx = html.indexOf(SENTINEL_START);
  const endIdx   = html.indexOf(SENTINEL_END);
  let next: string;
  if (startIdx >= 0 && endIdx > startIdx) {
    next = html.slice(0, startIdx) + block + html.slice(endIdx + SENTINEL_END.length);
  } else {
    // No sentinel yet — append before </main>
    const mainEnd = html.indexOf('</main>');
    if (mainEnd < 0) {
      console.error('[build-landing] src/index.html has no </main> tag — aborting');
      process.exit(1);
    }
    next = html.slice(0, mainEnd) + block + '\n  ' + html.slice(mainEnd);
  }

  if (next === html) {
    console.log(`[build-landing] no change · ${modules.length} modules · ${sortedCats.length} categories`);
    return;
  }
  await writeFile(LANDING_PATH, next);
  console.log(`[build-landing] wrote ${modules.length} module cards across ${sortedCats.length} categories`);
  for (const c of sortedCats) {
    console.log(`  · ${c}: ${byCategory.get(c)!.length}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
