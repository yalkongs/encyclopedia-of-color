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
const REFERENCE_PATH = resolve(ROOT, 'src/reference/index.html');

const SENTINEL_START = '<!-- AUTO-LANDING START · do not edit, run `npm run build:landing` -->';
const SENTINEL_END   = '<!-- AUTO-LANDING END -->';
const REF_START = '<!-- AUTO-REFERENCE START · do not edit, run `npm run build:landing` -->';
const REF_END   = '<!-- AUTO-REFERENCE END -->';

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
  'geometric-optics':             { title: 'Geometric Optics',      sub: 'Domain 1 · lenses, imaging, instruments' },
  'aberrations':                  { title: 'Aberrations',           sub: 'Domain 1 · chromatic, coma, distortion' },
  'fourier-optics':               { title: 'Fourier Optics',        sub: 'Domain 1 · spatial frequency, 4f, filtering' },
  'coherence':                    { title: 'Coherence',             sub: 'Domain 1 · temporal, spatial, speckle' },
  'modern-optics':                { title: 'Modern Optics',         sub: 'Domain 1 · lasers, nonlinear, metamaterials' },
  // Domain 2
  'vision-anatomy-basics':        { title: 'Vision Anatomy',        sub: 'Domain 2 · the perceiving eye' },
  'rods-adaptation':              { title: 'Rod Cells & Adaptation', sub: 'Domain 2 · scotopic vision and dark adaptation' },
  'cones-sensitivity':            { title: 'Cone Sensitivity',      sub: 'Domain 2 · LMS, trichromacy, ipRGC' },
  'receptive-fields':             { title: 'Receptive Fields',      sub: 'Domain 2 · Mach bands, lateral inhibition' },
  'opponent-process':             { title: 'Opponent Process',      sub: 'Domain 2 · Hering channels, afterimages' },
  'color-constancy':              { title: 'Color Constancy',       sub: 'Domain 2 · Von Kries, the Dress, retinex' },
  'color-vision-deficiency':      { title: 'Color Vision Deficiency', sub: 'Domain 2 · dichromacy and anomalous trichromacy' },
  // Domain 4
  'cie-1931-matching':            { title: 'CIE 1931 Matching',       sub: 'Domain 4 · colour-matching functions and the standard observer' },
  'xyz-transformation':           { title: 'XYZ Transformation',      sub: 'Domain 4 · linear maps, projection, and sRGB encoding' },
  'color-space-slicer':           { title: 'Colour-Space Slicer',     sub: 'Domain 4 · slicing the colour solids — Lab, Luv, HSV, Munsell, NCS, Ostwald' },
};

const D4_ORDER = ['cie-1931-matching', 'xyz-transformation', 'color-space-slicer'];

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

/** One module's consolidated source line for the central reference page. */
function renderRefModule(m: MetaV2): string {
  const src = m.textbook_refs.length
    ? m.textbook_refs
        .map((r) => `${escHtml(r.source)}${r.section ? ` <span class="sec">${escHtml(r.section)}</span>` : ''}`)
        .join(' · ')
    : '<span class="sec">source pending</span>';
  return `      <div class="ref-module">
        <div class="rm-title"><a href="../modules/${m.id}/">${escHtml(m.title.en)}</a></div>
        <div class="rm-src">${src}</div>
      </div>`;
}

function renderRefCluster(category: string, modules: MetaV2[]): string {
  const info = CATEGORY_META[category] ?? { title: humanise(category), sub: '' };
  const items = modules
    .slice()
    .sort((a, b) => {
      const d = a.bloom_level.localeCompare(b.bloom_level);
      return d !== 0 ? d : a.id.localeCompare(b.id);
    })
    .map(renderRefModule)
    .join('\n');
  return `      <h2 class="ref-section">${escHtml(info.title)}</h2>\n${items}`;
}

/** Replace a sentinel-delimited block in a file; skip gracefully if missing. */
async function replaceBlock(
  path: string, start: string, end: string, block: string, label: string,
): Promise<void> {
  let html: string;
  try { html = await readFile(path, 'utf-8'); }
  catch { console.warn(`[build-landing] ${label}: ${path} not found — skipping`); return; }
  const s = html.indexOf(start), e = html.indexOf(end);
  if (s < 0 || e <= s) { console.warn(`[build-landing] ${label}: sentinels missing — skipping`); return; }
  const next = html.slice(0, s) + block + html.slice(e + end.length);
  if (next === html) { console.log(`[build-landing] ${label}: no change`); return; }
  await writeFile(path, next);
  console.log(`[build-landing] wrote ${label}`);
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
    'geometric-optics', 'aberrations', 'fourier-optics', 'coherence', 'modern-optics',
  ];
  const D2_ORDER = [
    'vision-anatomy-basics', 'rods-adaptation', 'cones-sensitivity',
    'receptive-fields', 'opponent-process', 'color-constancy',
    'nonlinear-visual-shifts', 'macadam-jnd', 'color-vision-deficiency',
  ];
  const known = [...D1_ORDER, ...D2_ORDER, ...D4_ORDER];
  const sortedCats = [
    ...D1_ORDER.filter((c) => byCategory.has(c)),
    ...D2_ORDER.filter((c) => byCategory.has(c)),
    ...D4_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !known.includes(c)).sort(),
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
  await replaceBlock(LANDING_PATH, SENTINEL_START, SENTINEL_END, block, 'landing');

  // Central reference page: every module's cited sources, gathered by category.
  const refSections = sortedCats.map((c) => renderRefCluster(c, byCategory.get(c)!)).join('\n');
  const refBlock = [REF_START, refSections, `    ${REF_END}`].join('\n');
  await replaceBlock(REFERENCE_PATH, REF_START, REF_END, refBlock, 'reference');

  console.log(`[build-landing] ${modules.length} modules across ${sortedCats.length} categories`);
  for (const c of sortedCats) {
    console.log(`  · ${c}: ${byCategory.get(c)!.length}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
