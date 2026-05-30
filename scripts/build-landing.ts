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
  'colorimetry-intro':            { title: 'Colorimetry Intro',       sub: 'Domain 4 · trichromacy, metamerism, and the spectral locus' },
  'cie-1931-matching':            { title: 'CIE 1931 Matching',       sub: 'Domain 4 · colour-matching functions and the standard observer' },
  'xyz-transformation':           { title: 'XYZ Transformation',      sub: 'Domain 4 · linear maps, projection, and sRGB encoding' },
  'color-space-slicer':           { title: 'Colour-Space Slicer',     sub: 'Domain 4 · slicing the colour solids — Lab, Luv, HSV, Munsell, NCS, Ostwald' },
  'oklch-harmony-explorer':       { title: 'OKLCH Harmony Explorer',  sub: 'Domain 4 · OKLab hue linearity and perceptually uniform palettes' },
  'color-difference-delta-e':     { title: 'Colour Difference ΔE',    sub: 'Domain 4 · ΔE76, CIEDE2000, CIE94, and the CMC tolerance ellipse' },
  'gamut-mapping-3d':             { title: 'Gamut Mapping',           sub: 'Domain 4 · overlapping device gamuts, clipping versus compression' },
  'hdr-color-spaces':             { title: 'HDR Colour Spaces',       sub: 'Domain 4 · BT.2020, ICtCp/ITP, and Jzazbz for high dynamic range' },
  'icc-color-management':         { title: 'ICC Colour Management',   sub: 'Domain 4 · the profile connection space and rendering intents' },
  'color-appearance-models':      { title: 'Colour Appearance Models', sub: 'Domain 4 · CIECAM02 — predicting colour under viewing conditions' },
  // Domain 5
  'historical-color-systems':     { title: 'Historical Colour Systems', sub: 'Domain 5 · Aristotle to Chevreul — how colour order was imagined' },
  'ittens-contrasts':             { title: "Itten's Contrasts",       sub: 'Domain 5 · the seven contrasts of colour design' },
  'spatial-balance-ui':           { title: 'Spatial Balance',         sub: 'Domain 5 · area equilibrium, 60-30-10, figure-ground' },
  'apca-contrast-matcher':        { title: 'APCA Contrast',           sub: 'Domain 5 · perceptual contrast and WCAG accessibility' },
  'color-harmony-generator':      { title: 'Harmony Generator',       sub: 'Domain 5 · OKLCH harmonies, Material 3, Radix, code export' },
  'data-viz-palettes':            { title: 'Data-Viz Palettes',       sub: 'Domain 5 · ColorBrewer, Viridis, Turbo, CVD-safe scales' },
  'typography-color-interaction': { title: 'Type & Colour',           sub: 'Domain 5 · contrast, fringing, dark mode, readability' },
  // Domain 6
  'display-physics-intro':        { title: 'Display Physics Intro',   sub: 'Domain 6 · subpixels, pixel density, refresh rate' },
  'display-panel-physics':        { title: 'Display Panel Physics',   sub: 'Domain 6 · CRT, LCD, OLED, quantum dot, backlights' },
  'subpixel-rendering':           { title: 'Subpixel Rendering',      sub: 'Domain 6 · stripe/PenTile layouts, ClearType' },
  'gamma-eotf-calibration':       { title: 'Gamma & EOTF',            sub: 'Domain 6 · gamma curves, white-point, calibration' },
  'hdr-pq-tone-mapping':          { title: 'HDR & Tone Mapping',      sub: 'Domain 6 · PQ, HLG, Reinhard/ACES/Hable operators' },
  'blue-light-circadian':         { title: 'Blue Light & Circadian',  sub: 'Domain 6 · night shift, ipRGC, melatonin, the myth' },
  'emerging-display-tech':        { title: 'Emerging Displays',       sub: 'Domain 6 · E-Ink, Mini-LED, microLED, projection, VR' },
  'os-color-management':          { title: 'OS Colour Management',    sub: 'Domain 6 · ColorSync, ICM, browser and web colour' },
  'display-measurement':          { title: 'Display Measurement',     sub: 'Domain 6 · ColorChecker, greyscale tracking, coverage' },
  // Domain 7
  'print-basics':                 { title: 'Print Basics',            sub: 'Domain 7 · reflective vs emissive, why K, paper substrates' },
  'halftoning-am-fm':             { title: 'Halftoning AM / FM',      sub: 'Domain 7 · newsprint dots, AM size vs FM density, LPI, stochastic' },
  'moire-screen-angles':          { title: 'Moiré & Screen Angles',   sub: 'Domain 7 · C15/M75/Y90/K45 rosette and frequency-vector moiré' },
  'four-color-separation':        { title: 'Four-Colour Separation',  sub: 'Domain 7 · CMYK plate overlay and registration' },
  'dot-gain-absorbance':          { title: 'Dot Gain & Absorbance',   sub: 'Domain 7 · capillary bleeding, Murray-Davies, Yule-Nielsen' },
  'security-ink-tilter':          { title: 'Security Inks',           sub: 'Domain 7 · OVI banknote tilt, goniochromic Bragg stacks' },
  'extended-gamut-print':         { title: 'Extended-Gamut Print',    sub: 'Domain 7 · inkjet droplets and CMYKOGV wide gamut' },
  'specialty-print':              { title: 'Specialty Print',         sub: 'Domain 7 · Hexachrome, metallic, foil, UV-curing inks' },
  'print-3d-color':               { title: '3D-Print Colour',         sub: 'Domain 7 · MultiJet Fusion, full-colour resin, FDM blends' },
  'print-color-management':       { title: 'Print Colour Management', sub: 'Domain 7 · G7, ISO 12647 / Fogra, proofing, spectrophotometry' },
  // Domain 10
  'imaging-basics':               { title: 'Imaging Basics',          sub: 'Domain 10 · how a camera makes an image, exposure, shutter' },
  'camera-optics':                { title: 'Camera Optics',           sub: 'Domain 10 · pinhole vs lens, aperture, bokeh, MTF' },
  'sensor-physics':               { title: 'Sensor Physics',          sub: 'Domain 10 · Bayer CFA, quantum efficiency, shot noise' },
  'white-balance-algorithms':     { title: 'White Balance',           sub: 'Domain 10 · Gray World, MaxRGB, Retinex' },
  'camera-color-pipeline':        { title: 'Camera Colour Pipeline',  sub: 'Domain 10 · RAW → IDT → ACEScg, DNG matrices' },
  'film-emulation':               { title: 'Film Emulation',          sub: 'Domain 10 · B&W and colour film tone curves' },
  'color-grading':                { title: 'Colour Grading',          sub: 'Domain 10 · Lift / Gamma / Gain wheels, 3D LUTs' },
  'exposure-photometry':          { title: 'Exposure & Photometry',   sub: 'Domain 10 · Zone System, sunny-16, metering' },
  'computational-photography':    { title: 'Computational Photography', sub: 'Domain 10 · HDR bracket, panorama, stack focus' },
  // Domain 3
  'causes-of-color-intro':        { title: 'Causes of Colour',        sub: 'Domain 3 · Nassau 15 causes overview' },
  'molecular-orbitals':           { title: 'Molecular Orbitals',      sub: 'Domain 3 · d-d, π-conjugation, ligand field, band theory' },
  'dyes-chemistry':               { title: 'Dyes Chemistry',          sub: 'Domain 3 · natural, mordant, azo, reactive, vat, disperse' },
  'wetting-effect':               { title: 'Wetting Effect',          sub: 'Domain 3 · hiding power, denim BRDF, binder yellowing' },
  'kubelka-munk-mixer':           { title: 'Kubelka-Munk',            sub: 'Domain 3 · K & S spectral mixing of pigments' },
  'pigment-degradation':          { title: 'Pigment Degradation',     sub: 'Domain 3 · UV photolysis, lightfastness, incompatibility' },
  'luminescence-chemistry':       { title: 'Luminescence Chemistry',  sub: 'Domain 3 · fluorescence, photo/thermo/solvato-chromism' },
  'color-centers':                { title: 'Color Centers',           sub: 'Domain 3 · F-centers, smoky quartz, amethyst, NV diamond' },
  'band-gap-materials':           { title: 'Band-gap Materials',      sub: 'Domain 3 · CdS yellow, CdSe red, gold nanoparticle plasmon' },
};

const D4_ORDER = ['colorimetry-intro', 'cie-1931-matching', 'xyz-transformation', 'color-space-slicer', 'oklch-harmony-explorer', 'color-difference-delta-e', 'gamut-mapping-3d', 'hdr-color-spaces', 'icc-color-management', 'color-appearance-models'];

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
  const D5_ORDER = [
    'historical-color-systems', 'ittens-contrasts', 'spatial-balance-ui',
    'apca-contrast-matcher', 'color-harmony-generator', 'data-viz-palettes',
    'typography-color-interaction',
  ];
  const D6_ORDER = [
    'display-physics-intro', 'display-panel-physics', 'subpixel-rendering',
    'gamma-eotf-calibration', 'hdr-pq-tone-mapping', 'blue-light-circadian',
    'emerging-display-tech', 'os-color-management', 'display-measurement',
  ];
  const D7_ORDER = [
    'print-basics', 'halftoning-am-fm', 'moire-screen-angles',
    'four-color-separation', 'dot-gain-absorbance', 'security-ink-tilter',
    'extended-gamut-print', 'specialty-print', 'print-3d-color', 'print-color-management',
  ];
  const D10_ORDER = [
    'imaging-basics', 'camera-optics', 'sensor-physics', 'white-balance-algorithms',
    'camera-color-pipeline', 'film-emulation', 'color-grading',
    'exposure-photometry', 'computational-photography',
  ];
  const D3_ORDER = [
    'causes-of-color-intro', 'molecular-orbitals', 'dyes-chemistry',
    'wetting-effect', 'kubelka-munk-mixer', 'pigment-degradation',
    'luminescence-chemistry', 'color-centers', 'band-gap-materials',
  ];
  const known = [...D1_ORDER, ...D2_ORDER, ...D3_ORDER, ...D4_ORDER, ...D5_ORDER, ...D6_ORDER, ...D7_ORDER, ...D10_ORDER];
  const sortedCats = [
    ...D1_ORDER.filter((c) => byCategory.has(c)),
    ...D2_ORDER.filter((c) => byCategory.has(c)),
    ...D3_ORDER.filter((c) => byCategory.has(c)),
    ...D4_ORDER.filter((c) => byCategory.has(c)),
    ...D5_ORDER.filter((c) => byCategory.has(c)),
    ...D6_ORDER.filter((c) => byCategory.has(c)),
    ...D7_ORDER.filter((c) => byCategory.has(c)),
    ...D10_ORDER.filter((c) => byCategory.has(c)),
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
