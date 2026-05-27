# Interactive Encyclopedia of Color — Implementation & Design Blueprint (v2)

이 문서는 **"Interactive Encyclopedia of Color"** 프로젝트의 마스터 구현 계획, 시스템 아키텍처, 디자인 가이드라인이다.

목표: 색채의 물리·화학·생리·수학·문화적 실체를, 누구나 만져볼 수 있는 **201개의 독립 인터랙티브 시뮬레이션 모듈**로 재구성한다.

> 변경 이력 (v2): 모듈 총량 201개(10개 도메인)로 통일, Domain 9/10 신설, 폴더명 정합화, 보일러플레이트 결함 3건 수정, 구현 설계 섹션(Ⅴ) 신설. v1의 모듈 수 표기(168 vs 149)와 실제 카운트(150) 간 불일치를 제거했다.

---

## Ⅰ. Project Mission & Core Philosophy (취지 및 목표)

### 1. Vision
**"An online, museum-grade sanctuary of color science — from the physical origin of photons to the neural mechanics of human consciousness."**

The Interactive Encyclopedia of Color is not a passive reading archive. It is a living laboratory where every concept is experienced through interactive simulation, bridging the gap between mathematical abstraction and visual intuition.

### 2. Core Philosophy
1. **Interactive-First (Zero Static-Text Principle):** 정적 다이어그램과 수동적 텍스트 설명은 금지된다. 모든 원자 개념은 사용자가 물리 변수를 조작하며 즉각적인 광학/지각 피드백을 받는 실시간 시뮬레이션으로 시각화된다.
2. **Absolute Academic Integrity:** 비과학적 RYB 색상환 같은 단순화된 예술적 도그마는 배제한다. 모든 시뮬레이션은 엄밀한 국제 표준 방정식, 분광 데이터베이스(CIE), 생리학적 모델에 기반한다.
3. **Digital Longevity (Low Framework Dependency):** 50~100년 후에도 실행 가능한 모듈을 만들기 위해, 외부 프레임워크 런타임을 거부한다. 네이티브 웹 표준만 사용한다 — Vanilla TypeScript(ES2022+), HTML5 Canvas 2D / WebGL2, SVG, Shadow DOM Web Components.
4. **Bilingual & Global Accessibility:** 글로벌 과학·교육 커뮤니티를 위해 영어를 기본 언어로 설계하고, 한국어를 포함한 다국어 i18n 아키텍처를 모듈식으로 분리한다.
5. **A11y as a First-Class Citizen:** 색약/저시력 사용자도 동등하게 접근할 수 있어야 한다. 모든 시뮬레이션은 키보드 조작, 스크린리더 라벨, 모션 감소 옵션, 비색 채널 동등 표현을 의무적으로 갖춘다.

---

## Ⅱ. Design System & Copywriting Guidelines (시각적·구조적 일관성 및 톤앤매너)

### 1. Visual & Structural Consistency
- **"Museum Neutral" Aesthetic:**
  - UI는 완전 무채색(순수 그레이스케일). **채도 있는 색은 활성 시뮬레이션 영역과 데이터 플롯 내부에서만 허용**된다.
  - Background: Deep Charcoal/Black (`#0A0A0A` for primary app container, `#121212` for cards/panels).
  - Borders & Dividers: Thin sharp lines (`#222222` / `#2A2A2A`) with `0px` or `4px` max border radius.
- **Typography Hierarchy:**
  - *Body / Academic Copy (Latin):* `Spectral`, `Noto Serif`, `Georgia` fallback.
  - *Body / Academic Copy (Korean):* `Noto Serif KR`, `Pretendard Serif` fallback — 한국어 본문은 별도 폰트 스택으로 폴백 방지.
  - *UI Controls & Labels:* `Inter`, `Outfit`, `Helvetica Neue` fallback. Korean: `Pretendard`, `Noto Sans KR`.
  - *Math & Numeric Readouts:* `JetBrains Mono`, `Fira Code` fallback.
- **Math Rendering:**
  - LaTeX 수식은 **KaTeX 0.16+ (≈70 KB gzipped)** 로 빌드 타임 사전 렌더링(SSR)된다. 런타임 의존성을 배제하기 위해 KaTeX는 모듈 빌드 단계에서 HTML 문자열로 변환되고, CSS만 클라이언트에 로드된다.
  - 인라인 수식: `<span class="math" data-tex="...">`, 블록 수식: `<div class="math-block" data-tex="...">`.
- **Unified Interactive Controls:**
  - 모든 슬라이더, 노브, 버튼은 `@core/components/`의 커스텀 컴포넌트를 사용한다.
  - Canvas 위 직접 드래그 가능한 모든 핸들은 흰색 외곽선의 빈 원(anchor node)을 표시한다.

### 2. Copywriting Tone & Manner
- **Academic Yet Accessible:** 일상 구어체를 피하고, 객관적이고 정밀하며 우아한 문체.
- **Strict Terminology:** *Luminance* (밝기 아님), *Chroma/Saturation* (순도 아님), *Reflectance Spectrum* (물체색 아님).
- **Concise Definitions:** 모든 모듈은 ① 1-문장 현상 정의 → ② 강조된 수식 → ③ 2~3문장의 조작 가이드 순으로 시작한다.
- **Bilingual Translation Structure:**
  - Primary text: English.
  - All strings live in `src/core/locales/{lang}.json`. 소스코드 하드코딩 금지.

---

## Ⅲ. Architecture & Build Configuration (아키텍처 및 빌드)

### 1. Project Structure (Vite MPA + Shadow DOM Web Components)

```
color-encyclopedia/
├── package.json
├── vite.config.ts             # Dynamic entry scanning, KaTeX SSR plugin, Rollup splitting
├── tsconfig.json              # path aliases (@core/*, @modules/*)
├── scripts/
│   ├── scan-entries.ts        # /modules/**/index.html → rollupOptions.input map
│   ├── prerender-katex.ts     # data-tex → SSR된 KaTeX HTML 변환
│   ├── verify-locales.ts      # en.json / ko.json 키 정합성 검사
│   └── verify-cie.ts          # CMF/Planck 등 수학 정확도 회귀 테스트
├── src/
│   ├── core/                  # 공통 단일 진실 공급원 (Single Source of Truth)
│   │   ├── math/
│   │   │   ├── color-science.ts   # spectralToXYZ, XYZToOklch, XYZToLab 통합 진입점 (re-exports)
│   │   │   ├── oklch.ts           # OKLCH ↔ XYZ ↔ sRGB 변환
│   │   │   ├── spectral.ts        # 분광 적분 (ASTM E308-18)
│   │   │   ├── cmf.ts             # CIE 1931 2°/10° Color Matching Functions 데이터
│   │   │   ├── illuminants.ts     # D50/D65/A/E/F11 SPD 데이터
│   │   │   ├── physics.ts         # Snell, Fresnel, Cauchy, Bragg, Beer-Lambert
│   │   │   └── cat.ts             # Bradford / CAT02 / Von Kries 행렬
│   │   ├── styles/
│   │   │   ├── variables.css      # 색·간격·타이포 토큰
│   │   │   ├── base.css           # reset + 그리드
│   │   │   ├── controls.css       # 슬라이더/버튼 등
│   │   │   └── katex.min.css      # KaTeX 렌더 CSS만 (런타임 JS 미포함)
│   │   ├── components/
│   │   │   ├── slider.ts          # <enc-slider>
│   │   │   ├── color-readout.ts   # <enc-color-readout>
│   │   │   ├── canvas-stage.ts    # <enc-canvas-stage> — DPR/리사이즈 자동
│   │   │   └── module-shell.ts    # <enc-module-shell> — i18n / a11y / 레이아웃
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   ├── ko.json
│   │   │   └── i18n-engine.ts     # data-i18n 스캔 + 언어 전환
│   │   └── a11y/
│   │       ├── prefers-reduced-motion.ts
│   │       └── focus-trap.ts
│   └── modules/                   # 200개 독립 인터랙티브 페이지
│       └── reflection-lab/specular-vs-diffuse/{index.html, main.ts, style.css}
```

### 2. Vite Build Configuration (`vite.config.ts` 예시)

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { globSync } from 'glob';
import { katexPrerenderPlugin } from './scripts/prerender-katex';

const moduleEntries = Object.fromEntries(
  globSync('src/modules/**/index.html').map((file) => {
    const key = file.replace(/^src\//, '').replace(/\/index\.html$/, '');
    return [key, resolve(__dirname, file)];
  })
);

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@modules': resolve(__dirname, 'src/modules'),
    },
  },
  plugins: [katexPrerenderPlugin()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'),
        ...moduleEntries,
      },
      output: {
        manualChunks(id) {
          if (id.includes('/src/core/math/')) return 'core-math';
          if (id.includes('/src/core/components/')) return 'core-components';
          if (id.includes('/src/core/locales/')) return 'core-locales';
        },
      },
    },
  },
});
```

200개의 엔트리는 빌드 시 자동 스캔되며, 공통 `@core/*` 코드는 3개의 청크로 분리되어 모든 모듈이 공유 캐시한다.

---

## Ⅳ. 10-Domain · 201-Module Taxonomy Map (10대 도메인 201대 모듈)

각 카테고리 폴더는 여러 모듈 엔트리를 가진다. 카테고리·엔트리 폴더명은 **섹션 Ⅷ의 마스터 리스트가 권위 출처**(canonical source)이며, 본 섹션은 그 카테고리별 요약이다.

| Category Folder | Interactive Concepts (Difficulty: K-12 → University) |
| :--- | :--- |
| **Domain 1. Optics & Light Physics (광물리학 및 기하·파동 광학)** | |
| `light-propagation` | Shadow dynamics · Umbra/Penumbra · Pinhole · Inverse Square · Fermat. |
| `reflection-lab` | Specular vs Diffuse (GGX) · Plane Mirror · Spherical Mirrors · Aberration · Retroreflection. |
| `refraction-snell` | Apparent Depth · Snell's Law · Wavefront Velocity · Lateral Displacement · Calcite Birefringence. |
| `total-internal-reflection` | Snell's Window · Critical Angle · Optical Fiber NA · Evanescent Wave · FTIR Tunneling. |
| `prism-dispersion` | Newton's Prism · Minimum Deviation · Cauchy Formula. |
| `atmospheric-optics` | Primary Rainbow (42°) · Secondary (51°) · Mirage RK4 · Green Flash. |
| `wave-interference` | Superposition · Soap Bubble · Newton's Rings · AR Coating · Michelson. |
| `light-diffraction` | Sound vs Light · Huygens · Single/Double Slit · Grating · Airy Disc · Rayleigh. |
| `wave-polarization` | Sunglasses · States 3D · Malus · Brewster · Photoelasticity · LCD TN. |
| `particle-scattering` | Sky/Sunset · Rayleigh 1/λ⁴ · Mie · Tyndall. |
| `planckian-radiation` | Filament · Planck Curves · Wien · Stefan-Boltzmann · V(λ)/V'(λ) · Photometry Units. |
| **Domain 2. Visual Physiology & Neuro-Cognitive Science (시각 생리학 및 신경 인지)** | |
| `rods-adaptation` | Pupil Reflex · Rhodopsin Kinetics · Dark Adaptation Curve. |
| `cones-sensitivity` | Three Channels · LMS Spectra · Firing Rate · ipRGC Circadian. |
| `receptive-fields` | Mach Bands · RGC On/Off-Center DoG · Lateral Inhibition. |
| `opponent-process` | Afterimages · Hering Cancellation · Successive Contrast · Albers Relativity. |
| `color-constancy` | Orange Constancy · Von Kries CAT · Dress Illusion. |
| `nonlinear-visual-shifts` | Abney · Bezold-Brücke · Helmholtz-Kohlrausch. (Purkinje는 `planckian-radiation/photopic-scotopic`에서 다룸 — 중복 제거) |
| `macadam-jnd` | JND Tensors · MacAdam Ellipses · CIEDE2000 Weights. |
| `color-vision-deficiency` | Everyday CVD · Dichromacy · Anomalous Trichromacy. |
| **Domain 3. Colourant Chemistry & Material Science (안료 화학 및 소재 과학)** | |
| `molecular-orbitals` | Transition Metals d-d · Conjugated Organic. |
| `dyes-chemistry` | Natural Dyeing · Mordant Ligands · pH Indicators. |
| `wetting-effect` | Vehicle Hiding Power · Wet Denim BRDF · Binder Aging. |
| `kubelka-munk-mixer` | K-M Coefficients · Paint Mixer. |
| `pigment-degradation` | UV Photodegradation · Lightfastness Labels. |
| `luminescence-chemistry` | **(신규)** Fluorescence vs Phosphorescence · Solvatochromism · Photochromism · Thermochromism. |
| **Domain 4. Colorimetry & Color Spaces (계량 색채학 및 수학)** | |
| `cie-1931-matching` | Colorimetry Matching · Observer Integral. |
| `xyz-transformation` | Matrix 3D Rotation · xy Projective Locus. |
| `color-space-slicer` | xyY · CIELAB · CIELUV · CIE 1976 u'v'. |
| `oklch-harmony-explorer` | OKLab Linearity · OKLCH Uniform Palette. |
| `color-difference-delta-e` | ΔE76 · CIEDE2000. |
| `gamut-mapping-3d` | Gamut Overlap 3D · Clipping vs Compression. |
| `hdr-color-spaces` | **(신규)** ITP / ICtCp · Jzazbz · BT.2020 vs Rec.709 overlay. |
| `icc-color-management` | **(신규)** ICC Profile Chain · CAT comparison (Bradford / CAT02 / Sharp). |
| **Domain 5. Color Design & Art Theory (디자인·예술 조형 이론)** | |
| `historical-color-systems` | Aristotle · Newton Harmony · Goethe/Runge · Munsell. |
| `ittens-contrasts` | Contrast Sandbox · Tension Score. |
| `spatial-balance-ui` | Goethe Area · 60-30-10 UI. |
| `apca-contrast-matcher` | APCA Lc · WCAG vs APCA Matrix. |
| `color-harmony-generator` | Harmony Wheel · Code Exporter. |
| `data-viz-palettes` | **(신규)** ColorBrewer Sequential/Diverging/Qualitative · Viridis vs Jet · Cinema LUT Apply · Pantone PMS Reference. |
| **Domain 6. Digital Display Engineering (디지털 디스플레이)** | |
| `display-panel-physics` | CRT/LCD · OLED SPD · Quantum Dot. |
| `subpixel-rendering` | Layout Zoom · ClearType. |
| `gamma-eotf-calibration` | EOTF Curve · CAT02 White Point. |
| `hdr-pq-tone-mapping` | PQ Curve · ACES/Reinhard/Hable. |
| `blue-light-circadian` | Night Shift · Filter SPD · ipRGC Melatonin. |
| `emerging-display-tech` | **(신규)** E-Ink Electrophoretic · Mini-LED Local Dimming · microLED · DLP/LCoS Projector. |
| **Domain 7. Print Technology & Graphic Reproduction (인쇄 재현 공학)** | |
| `halftoning-am-fm` | Newspaper Intro · AM vs FM · LPI Resolution. |
| `moire-screen-angles` | Angle Set · Frequency Vectors. |
| `four-color-separation` | 4-Color Plates · Pressure Registration. |
| `dot-gain-absorbance` | Capillary Absorption · Murray-Davies. |
| `security-ink-tilter` | OVI Tilt · Bragg Law. |
| `extended-gamut-print` | **(신규)** Inkjet Piezo vs Thermal · CMYKOGV Extended Gamut. |
| **Domain 8. Anthropology, Linguistics & History (인류학 및 역사)** | |
| `language-color-evolution` | Berlin-Kay · Sapir-Whorf Quiz. |
| `ancient-pigment-chemistry` | Tyrian Intro · Trade Routes · Cochineal pH. |
| `indigo-oxidation` | Leuco Beaker · Oxidation Timeline. |
| `synthetic-dye-history` | Mauveine · Prussian Blue. |
| `ancient-mineral-pigments` | **(신규)** Egyptian Blue CaCuSi₄O₁₀ · Lapis/Ultramarine · Vermillion HgS · Maya Blue. |
| **Domain 9. Color in Nature & Biology (자연과 생물의 색) [신규]** | |
| `photosynthesis-pigments` | Chlorophyll a/b · Carotenoid Antenna · Phycoerythrin. |
| `bioluminescence` | Firefly Luciferin · Bacterial Lux · Deep-Sea Dinoflagellate. |
| `fluorescent-proteins` | GFP Chromophore · Coral Pocilloporin · Reef Fluorescence Field. |
| `non-human-vision` | Bird Tetrachromacy · Mantis Shrimp 12-Channel · Bee UV Nectar Guides. |
| `chromatophores` | Cuttlefish Expansion · Octopus Iridophore. |
| `structural-color-bio` | Morpho Butterfly Multilayer · Peacock Barbule Photonic · Beetle Cholesteric Helicoid · Opal Lattice. |
| `human-skin-melanin` | Eumelanin vs Pheomelanin · Fitzpatrick Scale. |
| **Domain 10. Imaging & Photography (이미징과 사진) [신규]** | |
| `camera-optics` | Aperture & DoF · Pinhole vs Lens Imaging Comparison. |
| `sensor-physics` | Bayer Demosaicing · Quantum Efficiency · Photon Shot Noise · Spectral Sensitivity Mismatch. |
| `white-balance-algorithms` | Gray World · Retinex · MaxRGB · Manual Kelvin. |
| `camera-color-pipeline` | RAW → IDT → ACES · Camera Color Matrix · Debayer→Gamma→JPEG. |
| `film-emulation` | Orthochromatic vs Panchromatic · Color Negative Curves · Tri-X Grain. |
| `color-grading` | Lift/Gamma/Gain Wheel · LUT Rec.709→DCI-P3 · HDR Tone Map (Mantiuk). |
| `exposure-photometry` | Exposure Triangle (ISO/Aperture/Shutter) · Zone System. |

---

## Ⅴ. Implementation Design Spec (구현 설계 명세) [신규]

201개 모듈을 일관되게 양산하기 위한 핵심 인프라 6종.

### 1. i18n Engine (`src/core/locales/i18n-engine.ts`)

```typescript
type LocaleKey = string;
type LocaleDict = Record<LocaleKey, string>;

let currentDict: LocaleDict = {};

export async function loadLocale(lang: 'en' | 'ko'): Promise<void> {
  const dict = await import(`./${lang}.json`);
  currentDict = dict.default;
  document.documentElement.lang = lang;
  translatePage();
}

export function t(key: LocaleKey, fallback?: string): string {
  return currentDict[key] ?? fallback ?? key;
}

export function translatePage(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n!;
    el.textContent = t(key, el.textContent ?? undefined);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria!));
  });
}
```

언어 전환은 `<html lang>` 속성과 동기화되어 폰트 스택(Latin / Korean)이 CSS `:lang()` 룰로 자동 교체된다. `verify-locales.ts`가 빌드 타임에 `en.json`과 `ko.json`의 키 집합이 완전히 일치하는지 검사한다.

### 2. Canvas Stage Web Component (`@core/components/canvas-stage.ts`)

기존 보일러플레이트의 **`resizeCanvas` 스케일 누적 버그를 영구히 차단**하는 표준 컴포넌트.

```typescript
export class CanvasStage extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private ro!: ResizeObserver;
  private rafId = 0;

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    this.canvas = document.createElement('canvas');
    shadow.append(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.applyDpr());
    this.ro.observe(this);
    this.applyDpr();
  }

  disconnectedCallback() {
    this.ro?.disconnect();
    cancelAnimationFrame(this.rafId);
  }

  private applyDpr() {
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth: w, clientHeight: h } = this;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    // setTransform은 절대 변환으로 누적되지 않음 — scale()의 누적 버그 회피
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dispatchEvent(new CustomEvent('stageresize', { detail: { w, h, dpr } }));
  }

  get context(): CanvasRenderingContext2D { return this.ctx; }
  get logicalSize(): { w: number; h: number } {
    return { w: this.canvas.clientWidth, h: this.canvas.clientHeight };
  }
}

customElements.define('enc-canvas-stage', CanvasStage);
```

모든 모듈은 `<enc-canvas-stage>`를 사용해야 한다 — 직접 `ctx.scale(dpr, dpr)` 호출 금지.

### 3. Module Shell (`@core/components/module-shell.ts`)

200개 모듈의 공통 레이아웃·a11y·i18n·KaTeX 부트스트랩을 묶는다.

```typescript
export class ModuleShell extends HTMLElement {
  async connectedCallback() {
    const lang = this.getAttribute('lang') ?? navigator.language.slice(0, 2);
    const { loadLocale } = await import('@core/locales/i18n-engine');
    await loadLocale(lang === 'ko' ? 'ko' : 'en');
    this.applyReducedMotion();
    this.bindKeyboardShortcuts();
  }

  private applyReducedMotion() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.toggleAttribute('data-reduced-motion', reduce);
  }

  private bindKeyboardShortcuts() {
    this.addEventListener('keydown', (e) => {
      if (e.key === '?') this.dispatchEvent(new CustomEvent('shortcut-help'));
      if (e.key === 'r') this.dispatchEvent(new CustomEvent('reset-params'));
    });
  }
}

customElements.define('enc-module-shell', ModuleShell);
```

### 4. Accessibility Standards (필수 의무사항)

| 요건 | 적용 방법 |
| :--- | :--- |
| 키보드 조작 | 모든 슬라이더는 `<input type="range">` 기반, 화살표 키 ±1 step / Shift+화살표 ±10 step. Canvas 핸들은 Tab으로 포커스 가능, 화살표 키 드래그 대체. |
| 스크린리더 | 슬라이더 값 변경 시 `aria-valuetext`로 의미 있는 단위(예: "Refractive index 1.52")를 읽도록 갱신. |
| 모션 감소 | `prefers-reduced-motion: reduce` 시 애니메이션 루프를 정적 한 프레임 + 변수 변경시에만 재렌더로 전환. |
| 색 대비 | UI 텍스트는 APCA Lc ≥ 75. 시뮬레이션 결과를 색뿐 아니라 **수치 readout + 등고선/패턴**으로 동시 표현. |
| CVD 모드 | 모든 모듈 우상단에 protanopia / deuteranopia / tritanopia 토글 — 시뮬레이션 결과를 Brettel 알고리즘으로 변환해 미리보기. |

### 5. WebGL/Canvas Fallback Strategy

- **Tier A (WebGL2):** 입자 시스템(`particle-scattering`), 3D 색공간 뷰어(`color-space-slicer`, `gamut-mapping-3d`), GGX 마이크로파셋 다운증가 등은 WebGL2를 우선 사용.
- **Tier B (Canvas2D):** WebGL2 미지원 시 동등한 시각 결과를 보장하는 Canvas2D 대체 경로 의무 구현 — 단, 입자 수 등 파라미터의 상한이 낮아짐을 사용자에게 고지.
- **Tier C (SVG static):** JS 비활성 또는 50년 후 브라우저 호환성 깨짐을 대비한 정적 SVG 폴백을 빌드 타임에 한 프레임씩 사전 렌더 → `<noscript>` 안에 inline.

### 6. Long-term Archive Strategy (디지털 장기 보존)

- 빌드 산출물은 **순수 정적 파일**(HTML + CSS + JS + JSON + WASM 미사용). CDN/오리진 서버 없이 ZIP 1개로 완결.
- 매 분기 빌드 결과를 **Internet Archive · Zenodo · Software Heritage** 3곳에 미러링. 각 모듈에 영구 DOI 부여.
- 외부 폰트·CDN 의존 금지. 모든 폰트는 SIL OFL 또는 동등 라이선스로 self-host.
- 핵심 데이터(CIE CMF, Planck SPD, K-M 계수)는 `core/data/*.json`에 inline 저장. 데이터 출처와 라이선스를 같은 파일 헤더에 명시.

---

## Ⅵ. Verification & Quality Control Plan (검증 및 품질 관리 계획)

### 1. Locale Integrity (i18n)
- `scripts/verify-locales.ts`: `en.json`과 `ko.json`의 키 집합이 완전 일치해야 한다 (set equality). 불일치 시 빌드 실패.
- 텍스트 레이아웃 회귀: Playwright로 각 모듈을 en/ko로 캡처해 `data-i18n` 영역의 텍스트 잘림(`overflow: ellipsis` 트리거)을 감지.

### 2. Physical Calibration (`scripts/verify-cie.ts`)
- CIE 1931 2° 표준 관찰자: 본 프로젝트의 `spectralToXYZ(D65)` 결과가 (95.047, 100.000, 108.883)에 소수점 **4자리 이내**로 일치해야 한다.
- Planck Locus: 1000K~25000K 범위에서 `planckianXY(T)`가 공식 색온도 좌표와 ΔE < 0.5.
- Kubelka-Munk: ASTM E308 기반 표준 분광 반사율 시편 10종에 대해 K/S 계수로 재합성한 XYZ가 원본과 ΔE76 < 1.0.

### 3. Accessibility Audit
- 모듈마다 axe-core 검사 — Critical/Serious violation 0건이어야 PR 머지.
- 키보드 전용 조작으로 모든 상호작용 도달 가능한지 자동 스모크 테스트.

### 4. Performance Budget (모듈별)
- First Contentful Paint < 1.5s (3G Fast).
- 초기 JS bundle (모듈 chunk + 공유 청크 합산) < 80 KB gzipped.
- 시뮬레이션 idle CPU < 5% (저전력 노트북 기준), animating frame budget ≤ 8ms.

---

## Ⅶ. Boilerplate Code Template

### 1. HTML Entry (`src/modules/reflection-lab/specular-vs-diffuse/index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Specular vs Diffuse Reflection</title>
  <link rel="stylesheet" href="../../../core/styles/base.css">
  <link rel="stylesheet" href="../../../core/styles/katex.min.css">
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <enc-module-shell>
    <div class="workstation-container type-a">
      <aside class="control-panel">
        <h2 data-i18n="specular_vs_diffuse_title">Specular vs Diffuse</h2>

        <!-- 빌드 타임 KaTeX SSR 대상 -->
        <div class="math-block" data-tex="R = I - 2(I \cdot N)\,N"></div>

        <p class="description" data-i18n="specular_vs_diffuse_desc">
          Adjust the surface roughness and observe the reflected light ray scattering.
        </p>

        <div class="control-group">
          <label for="roughnessSlider" data-i18n="roughness_label">Surface Roughness (α)</label>
          <input type="range" id="roughnessSlider"
                 min="0" max="1" step="0.01" value="0.1"
                 aria-valuetext="0.10">
          <output id="roughnessVal" for="roughnessSlider">0.10</output>
        </div>

        <div class="control-group">
          <label for="rayCount" data-i18n="ray_count_label">Ray Count</label>
          <input type="range" id="rayCount" min="1" max="50" step="1" value="15">
          <output id="rayCountVal" for="rayCount">15</output>
        </div>
      </aside>

      <main class="canvas-viewport">
        <enc-canvas-stage id="stage" tabindex="0"
                          aria-label="Reflection simulation viewport"></enc-canvas-stage>
      </main>
    </div>
  </enc-module-shell>

  <script type="module" src="./main.ts"></script>
</body>
</html>
```

### 2. Module Logic (`src/modules/reflection-lab/specular-vs-diffuse/main.ts`)

```typescript
import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/styles/variables.css';

class SpecularVsDiffuseSimulation {
  private stage: HTMLElement & { context: CanvasRenderingContext2D; logicalSize: { w: number; h: number } };
  private roughness = 0.1;
  private rayCount = 15;

  constructor() {
    this.stage = document.getElementById('stage') as never;
    this.bindControls();
    this.stage.addEventListener('stageresize', () => this.draw());
    requestAnimationFrame(() => this.loop());
  }

  private bindControls() {
    const roughEl = document.getElementById('roughnessSlider') as HTMLInputElement;
    const roughOut = document.getElementById('roughnessVal') as HTMLOutputElement;
    roughEl.addEventListener('input', () => {
      this.roughness = parseFloat(roughEl.value);
      roughOut.value = this.roughness.toFixed(2);
      roughEl.setAttribute('aria-valuetext', `Roughness ${this.roughness.toFixed(2)}`);
    });

    const countEl = document.getElementById('rayCount') as HTMLInputElement;
    const countOut = document.getElementById('rayCountVal') as HTMLOutputElement;
    countEl.addEventListener('input', () => {
      this.rayCount = parseInt(countEl.value, 10);
      countOut.value = String(this.rayCount);
    });
  }

  // GGX microfacet normal sample (isotropic)
  private sampleGgxNormal(alpha: number) {
    const u1 = Math.random();
    const u2 = Math.random();
    const theta = Math.atan(alpha * Math.sqrt(u1 / (1.0 - u1)));
    const phi = 2 * Math.PI * u2;
    return { x: Math.sin(theta) * Math.cos(phi), y: Math.cos(theta) };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    const amp = this.roughness * 15;
    for (let x = 0; x < w; x++) {
      const y = h * 0.7 + Math.sin(x * 0.05) * amp * Math.cos(x * 0.1);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    const ox = w * 0.2, oy = h * 0.2, tx = w * 0.5, ty = h * 0.7;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';

    for (let i = 0; i < this.rayCount; i++) {
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.stroke();

      const n = this.sampleGgxNormal(this.roughness);
      const ix = tx - ox, iy = ty - oy;
      const len = Math.hypot(ix, iy);
      const dirX = ix / len, dirY = iy / len;
      const dot = dirX * n.x + dirY * n.y;
      const rx = dirX - 2 * dot * n.x;
      const ry = dirY - 2 * dot * n.y;

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + rx * 200, ty + ry * 200);
      ctx.stroke();
    }
  }

  private loop() {
    if (!this.stage.hasAttribute('data-reduced-motion')) {
      this.draw();
      requestAnimationFrame(() => this.loop());
    }
  }
}

window.addEventListener('DOMContentLoaded', () => new SpecularVsDiffuseSimulation());
```

수정 사항 (v1 대비):
1. **존재하지 않던 `color-science.ts` import 제거** — 본 모듈은 컬러 사이언스 함수가 필요 없음. 필요한 모듈만 명시적으로 `@core/math/color-science`에서 import.
2. **`ctx.scale(dpr, dpr)` 누적 버그 제거** — `<enc-canvas-stage>` 컴포넌트가 `setTransform(dpr, 0, 0, dpr, 0, 0)`으로 절대 변환을 적용.
3. **KaTeX SSR 대응** — `<p class="formula">$$...$$</p>` 대신 `<div class="math-block" data-tex="...">`로 표기 후 빌드 타임에 HTML로 변환.
4. **`prefers-reduced-motion` 대응** — 모션 감소 모드에서는 RAF 루프 중단.
5. **a11y 강화** — `aria-valuetext`, `<output for>`, `tabindex` 추가.

---

## Ⅷ. Master Sequential List — 201 Interactive Entries (10도메인 201개 마스터 리스트)

각 엔트리는 `/modules/[category]/[entry]/index.html` 으로 빌드되며 Shadow DOM Custom Element(예: `<color-snell-refraction>`)로 외부 임베드 가능하다. **이 리스트가 폴더명의 권위 출처**이다.

### Domain 1 — Optics & Light Physics (54)

1. `light-propagation/shadow-size` — Shadow size vs light distance [거리별 그림자 크기]
2. `light-propagation/umbra-penumbra` — Umbra and penumbra [본/반그림자]
3. `light-propagation/pinhole-camera` — Pinhole diameter vs sharpness [바늘구멍 사진기]
4. `light-propagation/inverse-square` — Inverse square law E = I/r² [역제곱 법칙]
5. `light-propagation/fermats-principle` — Fermat's principle of least time [페르마의 최소 시간 원리]
6. `reflection-lab/specular-vs-diffuse` — GGX microfacet roughness [정·난반사 GGX]
7. `reflection-lab/plane-mirror` — Virtual image symmetry [평면 거울 상]
8. `reflection-lab/spherical-mirrors` — Concave/convex principal rays [구면 거울 작도]
9. `reflection-lab/spherical-aberration` — Aberration vs parabolic [구면 수차]
10. `reflection-lab/retroreflection` — Beads & corner cube [재귀반사]
11. `refraction-snell/apparent-depth` — Bending chopstick in water [물속 굴절]
12. `refraction-snell/snells-law` — Real-time laser refractometer [스넬의 법칙]
13. `refraction-snell/wavefront-velocity` — v = c/n, λ shortening [파동 속도]
14. `refraction-snell/lateral-displacement` — Glass plate shift [횡적 편위]
15. `refraction-snell/calcite-birefringence` — o/e-ray separation [방해석 복굴절]
16. `total-internal-reflection/snells-window` — Underwater hemispherical view [수중 스넬창]
17. `total-internal-reflection/critical-angle` — TIR threshold [임계각]
18. `total-internal-reflection/optical-fiber` — Numerical Aperture [광섬유 NA]
19. `total-internal-reflection/evanescent-wave` — Exponential decay [에바네센트 파]
20. `total-internal-reflection/ftir-tunneling` — Frustrated TIR gap [좌절전반사 터널링]
21. `prism-dispersion/newtons-prism` — White light split [뉴턴 프리즘]
22. `prism-dispersion/minimum-deviation` — Apex angle vs δ_min [최소 편향각]
23. `prism-dispersion/cauchy-formula` — n(λ) = B + C/λ² [코시 분산]
24. `atmospheric-optics/primary-rainbow` — Descartes 42° concentration [1차 무지개]
25. `atmospheric-optics/secondary-rainbow` — Alexander's dark band 51° [2차 무지개·암대]
26. `atmospheric-optics/mirage-bending` — RK4 temperature gradient ray bending [신기루 곡선]
27. `atmospheric-optics/green-flash` — Sunset refraction & green flash [그린 플래시]
28. `wave-interference/superposition` — Phase φ constructive/destructive [중첩 원리]
29. `wave-interference/soap-bubble` — Thin-film structural color [비누방울 박막]
30. `wave-interference/newtons-rings` — Convex lens air gap ring radius [뉴턴 링]
31. `wave-interference/anti-reflective` — λ/4 AR coating [무반사 코팅]
32. `wave-interference/michelson-interferometer` — nm mirror displacement fringes [마이켈슨]
33. `light-diffraction/sound-vs-light` — Bending intuition compared [회절 직관 비교]
34. `light-diffraction/huygens-principle` — Secondary wavelets envelope [호이겐스]
35. `light-diffraction/single-double-slit` — Fraunhofer fringe I(θ) [단·이중 슬릿]
36. `light-diffraction/diffraction-grating` — Lines/mm vs spectral lines [회절 격자]
37. `light-diffraction/airy-disc` — Bessel J₁ circular aperture [에어리 디스크]
38. `light-diffraction/rayleigh-criterion` — Two overlapping discs [레일리 기준]
39. `wave-polarization/sunglasses` — Polarized glare blocking [편광 선글라스]
40. `wave-polarization/polarization-states` — Linear/circular/elliptical 3D [편광 상태 3D]
41. `wave-polarization/malus-law` — I = I₀ cos²θ [말루스 법칙]
42. `wave-polarization/brewsters-angle` — P-wave suppression θ_B [브루스터 각]
43. `wave-polarization/photoelasticity` — Stress fringes isochromatic [광탄성]
44. `wave-polarization/lcd-shutter` — Twisted nematic voltage [LCD TN 셔터]
45. `particle-scattering/sky-color` — Solar angle vs sky/sunset [하늘 색]
46. `particle-scattering/rayleigh-spectrum` — 1/λ⁴ intensity curve [레일리 산란]
47. `particle-scattering/mie-clouds` — Droplet radius vs forward white [미 산란]
48. `particle-scattering/tyndall-laser` — Beer-Lambert colloidal beam [틴들 효과]
49. `planckian-radiation/filament-heating` — Tungsten temp vs color [백열 발열]
50. `planckian-radiation/planck-curves` — 1000K~25000K chromaticity locus [흑체 곡선]
51. `planckian-radiation/wiens-displacement` — λ_peak vs T [빈의 변위]
52. `planckian-radiation/stefan-boltzmann` — T⁴ total energy integration [스테판-볼츠만]
53. `planckian-radiation/photopic-scotopic` — V(λ), V'(λ), Purkinje shift [주·야간 시감도·푸르킨예]
54. `planckian-radiation/photometry-geometry` — Lumen/Candela/Lux/Nit conversions [광도 단위]

### Domain 2 — Visual Physiology & Neuro-Cognitive Science (27)

55. `rods-adaptation/pupil-reflex` — Iris dilation [동공 반사]
56. `rods-adaptation/rhodopsin-kinetics` — Bleaching/regeneration [로돕신 동역학]
57. `rods-adaptation/dark-adaptation-curve` — Rod-cone break point [암순응 곡선]
58. `cones-sensitivity/three-channels` — RGB ↔ LMS matching [삼색 채널]
59. `cones-sensitivity/lms-spectra` — LMS absorption curves [LMS 분광]
60. `cones-sensitivity/firing-rate` — Photon → optic nerve pulse [발화율]
61. `cones-sensitivity/iprgc-circadian` — ipRGC vs melatonin [ipRGC 청색광]
62. `receptive-fields/ganglion-cells-mach` — Mach Bands edge enhancement [마하 밴드]
63. `receptive-fields/ganglion-cells-dog` — On/Off-Center DoG filter [RGC 수용장]
64. `receptive-fields/lateral-inhibition` — Hermann Grid illusion [측방 억제]
65. `opponent-process/opponent-afterimages` — Chromatic adaptation traces [잔상]
66. `opponent-process/opponent-cancellation` — Hering RG/YB/WBk [헤링 대립색]
67. `opponent-process/successive-contrast` — Recovery decay curve [계차 대비]
68. `opponent-process/albers-relativity` — Simultaneous contrast & Bezold assimilation [알베르스]
69. `color-constancy/orange-constancy` — Illumination chamber [색채 항상성]
70. `color-constancy/constancy-vries` — Von Kries CAT matrix [Von Kries 적응]
71. `color-constancy/constancy-dress` — The Dress V4 parsing 3D slicer [드레스 착시]
72. `nonlinear-visual-shifts/shift-abney` — Purity dilution hue curvature [압니 효과]
73. `nonlinear-visual-shifts/shift-bezold` — Luminance vs hue shift [베졸트-브뤼케]
74. `nonlinear-visual-shifts/shift-hk` — Helmholtz-Kohlrausch lightness [헬름홀츠-콜라우슈]
75. `macadam-jnd/jnd-tensors` — Personal xy JND test [개인 JND]
76. `macadam-jnd/macadam-ellipses` — 25 ellipses vs uniform circles [맥애덤 타원]
77. `macadam-jnd/jnd-ciede2000` — Weighted ΔE2000 visual distance [CIEDE2000 가중치]
78. `color-vision-deficiency/cvd-everyday` — Children's book CVD simulator [일상 색 혼동]
79. `color-vision-deficiency/cvd-dichromacy` — Prot/Deut/Tritanopia LMS [이색각자]
80. `color-vision-deficiency/cvd-anomaly` — Anomalous trichromacy Daltonization [색약 보정]
81. `color-vision-deficiency/cvd-brettel-pipeline` — Brettel et al. 1997 sim algorithm [Brettel 시뮬레이션 알고리즘]

### Domain 3 — Colourant Chemistry & Material Science (16)

82. `molecular-orbitals/transition-metals` — Co/Cd d-d splitting [전이금속 궤도]
83. `molecular-orbitals/conjugated-organic` — Carbon double-bond chain absorption [공액 유기 안료]
84. `dyes-chemistry/natural-dyeing` — Plant extract physical absorption [천연 염색]
85. `dyes-chemistry/mordant-ligands` — Al/Fe chelation crosslinking [매염제]
86. `dyes-chemistry/ph-color-change` — Indicator proton transfer [pH 지시약]
87. `wetting-effect/vehicle-hiding` — Pigment/medium n mismatch [은폐력]
88. `wetting-effect/wetting-denim` — BRDF index matching [습윤 BRDF]
89. `wetting-effect/binder-aging` — UV oxidation yellowing [바인더 황변]
90. `kubelka-munk-mixer/km-coefficients` — K & S spectral plotter [K-M 계수]
91. `kubelka-munk-mixer/km-paint-mixer` — Spectral paint mixing [K-M 안료 배합]
92. `pigment-degradation/uv-photodegradation` — Bond cleavage kinetics [광분해 동역학]
93. `pigment-degradation/lightfastness-labels` — ASTM D4302/D4236 [내광성 표준]
94. `luminescence-chemistry/fluorescence-vs-phosphorescence` — Singlet vs triplet decay lifetimes [형광·인광 수명] [신규]
95. `luminescence-chemistry/solvatochromism` — Solvent polarity vs absorption shift [솔바토크로미즘] [신규]
96. `luminescence-chemistry/photochromism-spiropyran` — UV-induced ring-opening color [포토크로미즘] [신규]
97. `luminescence-chemistry/thermochromism-leuco` — Leuco dye + developer temperature [써모크로미즘] [신규]

### Domain 4 — Colorimetry & Color Spaces (19)

98. `cie-1931-matching/colorimetry-matching` — 2° RGB matching dial [등색 실험]
99. `cie-1931-matching/observer-integral` — rgb → XYZ derivation [관찰자 적분]
100. `xyz-transformation/matrix-3d-rotation` — 3×3 linear rotation [XYZ 회전]
101. `xyz-transformation/xyz-projective-locus` — Horse-shoe xy projection [말발굽 사영]
102. `color-space-slicer/xyy-slicing` — Y luminance slice volume [xyY 슬라이서]
103. `color-space-slicer/lab-slicing` — CIELAB 3D slicing [CIELAB]
104. `color-space-slicer/luv-slicing` — CIELUV slicing & anisotropy [CIELUV]
105. `color-space-slicer/ucs-1976-uv` — CIE 1976 u'v' uniform chart [u'v' 도표]
106. `oklch-harmony-explorer/oklab-linearity` — Linearity validation [OKLab 선형성]
107. `oklch-harmony-explorer/oklch-uniform-palette` — L/C/H palette generator [OKLCH 팔레트]
108. `color-difference-delta-e/delta-e-76` — Euclidean ΔE [유클리디안 ΔE]
109. `color-difference-delta-e/delta-e-00` — Parametric weights ΔE2000 [CIEDE2000]
110. `gamut-mapping-3d/gamut-overlapping-3d` — sRGB/Adobe/P3/CMYK CSG [색역 3D 비교]
111. `gamut-mapping-3d/gamut-clipping-vs-compression` — Relative vs Perceptual [클리핑·압축]
112. `hdr-color-spaces/ictcp-itp` — ITP perceptual HDR space [ITP HDR 색공간] [신규]
113. `hdr-color-spaces/jzazbz` — Jzazbz HDR uniform perceptual [Jzazbz] [신규]
114. `hdr-color-spaces/bt2020-vs-rec709` — Coverage overlay slicer [BT.2020 vs Rec.709] [신규]
115. `icc-color-management/icc-profile-chain` — Source → PCS → Destination 변환 사슬 [ICC 프로파일] [신규]
116. `icc-color-management/cat-comparison` — Bradford / CAT02 / Sharp / Von Kries 비교 [CAT 비교] [신규]

### Domain 5 — Color Design & Art Theory (18)

117. `historical-color-systems/aristotles-scale` — Light-dark 1D [아리스토텔레스]
118. `historical-color-systems/newton-harmony` — 7-pitch musical wheel [뉴턴 음계 색환]
119. `historical-color-systems/goethe-psychological` — Goethe/Runge opponent [괴테·룽게]
120. `historical-color-systems/munsell-tree` — Munsell/NCS/Ostwald [먼셀 트리]
121. `ittens-contrasts/contrast-sandbox` — 7 contrast templates [이텐 7대비]
122. `ittens-contrasts/contrast-tension-score` — Real-time tension metric [긴장 점수]
123. `spatial-balance-ui/area-equilibrium` — Goethe Yellow/Violet balance [면적 저울]
124. `spatial-balance-ui/ui-60-30-10` — UI proportion tuning [60-30-10 비율]
125. `apca-contrast-matcher/apca-lc-contrast` — APCA Lc calc [APCA 가독성]
126. `apca-contrast-matcher/apca-font-matrix` — WCAG vs APCA matrix [APCA 행렬]
127. `color-harmony-generator/harmony-wheel` — OKLCH polygon harmonies [조화 회전환]
128. `color-harmony-generator/harmony-code-exporter` — Tailwind/CSS/ASE export [코드 내보내기]
129. `data-viz-palettes/colorbrewer-sequential` — Sequential / Diverging / Qualitative pickers [ColorBrewer] [신규]
130. `data-viz-palettes/viridis-vs-jet` — Perceptually uniform vs misleading [Viridis 대 Jet] [신규]
131. `data-viz-palettes/cinema-lut-apply` — Rec.709 → DCI-P3 LUT 적용 [영화 LUT] [신규]
132. `data-viz-palettes/pantone-pms-reference` — Pantone PMS 스폿 컬러 매처 [Pantone PMS] [신규]
133. `historical-color-systems/bauhaus-geometry` — Itten/Klee/Kandinsky 색-형태 매칭 [바우하우스] [신규]
134. `historical-color-systems/optical-mixing-pointillism` — Seurat 점묘 격자 거리 광학 혼합 [점묘 광학 혼합] [신규]

### Domain 6 — Digital Display Engineering (16)

135. `display-panel-physics/panel-crt-lcd` — Subpixel zoom, CRT decay, LCD TN [패널 물리]
136. `display-panel-physics/panel-oled` — Organic SPD FWHM [OLED 분광]
137. `display-panel-physics/panel-quantum-dot` — Bohr radius energy band [퀀텀닷]
138. `subpixel-rendering/subpixel-layout-zoom` — Stripe/PenTile/Delta [서브픽셀 레이아웃]
139. `subpixel-rendering/subpixel-cleartype` — Subpixel anti-aliasing [ClearType]
140. `gamma-eotf-calibration/gamma-eotf-curve` — EOTF 2.2 calibration [감마 곡선]
141. `gamma-eotf-calibration/cat02-whitepoint` — D50 ↔ D65 CAT02 [백색점 적응]
142. `hdr-pq-tone-mapping/hdr-pq-curve` — PQ (ST 2084) curves [PQ 곡선]
143. `hdr-pq-tone-mapping/tonemapping-aces` — Reinhard/ACES/Hable [톤 매핑]
144. `blue-light-circadian/night-shift-intro` — Warm display shift [야간 모드]
145. `blue-light-circadian/bl-filter-spd` — 460-480nm SPD reduction [블루라이트 필터]
146. `blue-light-circadian/bl-iprgc-melatonin` — ipRGC suppression curve [멜라토닌 억제]
147. `emerging-display-tech/eink-electrophoretic` — 마이크로캡슐 흑백 입자 전기영동 [E-Ink] [신규]
148. `emerging-display-tech/miniled-local-dimming` — 백라이트 존 디밍과 블루밍 [Mini-LED] [신규]
149. `emerging-display-tech/microled-self-emissive` — 픽셀 단위 자체 발광 무전사 [microLED] [신규]
150. `emerging-display-tech/dlp-lcos-projector` — DMD/LCoS 마이크로미러·반사 액정 [프로젝터 엔진] [신규]

### Domain 7 — Print Technology & Graphic Reproduction (13)

151. `halftoning-am-fm/newspaper-dots-intro` — Magnified newsprint dots [망점 확대]
152. `halftoning-am-fm/halftoning-am-fm-rendering` — AM size vs FM density [AM·FM 디더링]
153. `halftoning-am-fm/halftoning-lpi-resolution` — LPI threshold matrix [LPI 해상도]
154. `moire-screen-angles/moire-screen-angles` — C:15/M:75/Y:90/K:45 [스크린 각도]
155. `moire-screen-angles/moire-frequency-vectors` — Vector frequency subtraction [모아레 벡터]
156. `four-color-separation/separation-4color` — CMYK plate overlay [4도 분판]
157. `four-color-separation/separation-pressures` — RGB → CMYK pressure registration [핀트 정합]
158. `dot-gain-absorbance/dot-gain-absorption` — Capillary bleeding [모세관 흡수]
159. `dot-gain-absorbance/dot-gain-murray` — Murray-Davies correction [머레이-데이비스]
160. `security-ink-tilter/security-bragg-law` — OVI banknote tilt [지폐 OVI]
161. `security-ink-tilter/security-goniochromic` — Multilayer Bragg blueshift [고니오크로믹]
162. `extended-gamut-print/inkjet-droplet-physics` — Piezo vs thermal droplet formation [잉크젯 액적 물리] [신규]
163. `extended-gamut-print/cmykogv-extended-gamut` — Orange/Green/Violet 추가로 색역 확장 [CMYKOGV] [신규]

### Domain 8 — Anthropology, Linguistics & History (13)

164. `language-color-evolution/berlin-kay-split` — 11-step name evolution map [베를린-케이]
165. `language-color-evolution/sapir-whorf-quiz` — Goluboy/Siniy reaction time [사피어-워프]
166. `ancient-pigment-chemistry/tyrian-purple-intro` — Murex shellfish history [티리안 퍼플]
167. `ancient-pigment-chemistry/trade-routes-map` — Roman trade routes [교역로 지도]
168. `ancient-pigment-chemistry/cochineal-carminic-acid` — Carminic acid pH chemistry [코치닐]
169. `indigo-oxidation/leuco-indigo-beaker` — Leuco dip oxidation [인디고 비커]
170. `indigo-oxidation/oxidation-timeline` — Oxygen crystallization timeline [산화 타임라인]
171. `synthetic-dye-history/mauveine-distillation` — Perkin 1856 aniline [퍼킨 모브]
172. `synthetic-dye-history/prussian-blue-synthesis` — Fe-CN lattice charge transfer [프러시안 블루]
173. `ancient-mineral-pigments/egyptian-blue` — CaCuSi₄O₁₀ NIR luminescence [이집트 블루] [신규]
174. `ancient-mineral-pigments/lapis-ultramarine` — Sodalite S₃⁻ chromophore [라피스·울트라마린] [신규]
175. `ancient-mineral-pigments/vermillion-cinnabar` — HgS mercury sulfide [버밀리언·진사] [신규]
176. `ancient-mineral-pigments/maya-blue` — Indigo-palygorskite hybrid [마야 블루] [신규]

### Domain 9 — Color in Nature & Biology (13) [신규 도메인]

177. `photosynthesis-pigments/chlorophyll-a-b` — Chlorophyll a/b 흡수 윈도우와 녹색 반사 [엽록소 a/b] [신규]
178. `photosynthesis-pigments/carotenoid-antenna` — 카로테노이드 보조 색소·LH2 단지 [카로테노이드] [신규]
179. `photosynthesis-pigments/phycoerythrin-red-algae` — 홍조류 피코에리트린의 적색 흡수 [피코에리트린] [신규]
180. `bioluminescence/firefly-luciferin` — Luciferin–luciferase ATP 발광 화학 [반딧불 루시페린] [신규]
181. `bioluminescence/dinoflagellate-deep-sea` — 심해 와편모조류 청색 자극 발광 [심해 발광] [신규]
182. `fluorescent-proteins/gfp-chromophore` — GFP 11β-barrel & p-HBDI chromophore 형성 [GFP 발색단] [신규]
183. `fluorescent-proteins/reef-fluorescence-field` — 산호초 청색광 자극 형광 필드 [산호 형광] [신규]
184. `non-human-vision/bird-tetrachromacy` — 4번째 UV cone과 새의 깃털 시야 [조류 4색각] [신규]
185. `non-human-vision/mantis-shrimp-12-channel` — 갯가재 12-채널 광수용기 [갯가재 시각] [신규]
186. `non-human-vision/bee-uv-nectar-guides` — 벌의 UV 시야와 꿀안내 무늬 [벌 UV 시각] [신규]
187. `chromatophores/cuttlefish-expansion` — 갑오징어 색소포 신경 제어 확장 [갑오징어 색소포] [신규]
188. `structural-color-bio/morpho-multilayer` — Morpho 나비 날개 다층 박막 [모르포 나비] [신규]
189. `structural-color-bio/peacock-photonic-barbule` — 공작 깃털 광결정 바뷸 [공작 광결정] [신규]

### Domain 10 — Imaging & Photography (12) [신규 도메인]

190. `camera-optics/aperture-depth-of-field` — 조리개 f-stop 과 피사계 심도 [조리개·심도] [신규]
191. `camera-optics/pinhole-vs-lens-imaging` — 핀홀 카메라 vs 렌즈 결상 비교 [핀홀 vs 렌즈] [신규]
192. `sensor-physics/bayer-demosaicing` — Bayer CFA → 컬러 보간 알고리즘 [Bayer 디모자이크] [신규]
193. `sensor-physics/quantum-efficiency` — Si 센서 파장별 QE 곡선 [센서 QE] [신규]
194. `sensor-physics/spectral-sensitivity-mismatch` — 센서 분광 감도 vs CMF 메타메릭 오차 [분광 감도 불일치] [신규]
195. `white-balance-algorithms/gray-world-vs-retinex` — Gray World / Retinex / MaxRGB / Manual Kelvin [WB 알고리즘] [신규]
196. `camera-color-pipeline/raw-to-aces-idt` — RAW → IDT(ACES 입력) → 작업공간 [ACES IDT] [신규]
197. `camera-color-pipeline/debayer-gamma-jpeg` — Debayer → Gamma → JPEG 양자화 사슬 [JPEG 파이프라인] [신규]
198. `film-emulation/orthochromatic-panchromatic` — 흑백 필름 분광 감도 변천 [흑백 필름] [신규]
199. `film-emulation/color-negative-curves` — Color negative 톤·D-Log 곡선 [컬러 네거티브] [신규]
200. `color-grading/lift-gamma-gain-wheel` — Lift/Gamma/Gain 컬러 휠 그레이딩 [컬러 그레이딩] [신규]
201. `exposure-photometry/exposure-triangle` — ISO / Aperture / Shutter 광자 계수 [노출 삼각형] [신규]

> **공식 모듈 수: 201** (도메인 합산 검증: 54+27+16+19+18+16+13+13+13+12 = 201). 일련 번호 1~201은 모듈 카운트와 1:1 일치한다. `scripts/verify-locales.ts`는 빌드 타임에 마스터 리스트의 엔트리 수와 실제 `src/modules/**/index.html`의 파일 수가 같음을 단언(assert)한다.

---

## Ⅸ. Roadmap (단계적 도메인 확장 로드맵)

201개 모듈을 한 번에 만들지 않는다. 도메인 단위 4분기 사이클로 확장한다.

| Phase | 기간 (예시) | 산출물 | 검증 게이트 |
| :--- | :--- | :--- | :--- |
| **P0 — Infra** | 1개월 | `@core/*` 일체, `enc-canvas-stage`/`enc-module-shell`, vite 빌드, i18n 엔진, KaTeX SSR, CIE 검증 스크립트 | 골든 모듈 1건 (`specular-vs-diffuse`) E2E 통과 |
| **P1 — Domain 1** | 3개월 | Optics & Light Physics 54 모듈 | CIE/Planck 4자리 정합 + a11y axe 0 critical |
| **P2 — Domain 2** | 2개월 | Visual Physiology 27 모듈 | LMS/CAT 행렬 데이터 회귀 + CVD 시뮬레이션 정확도 |
| **P3 — Domain 4** | 2개월 | Colorimetry 18 모듈 | ICC 변환 사슬 round-trip ΔE < 0.5 |
| **P4 — Domain 6 + Domain 10** | 3개월 | Display 16 + Imaging 12 = 28 모듈 | EOTF/ToneMap reference 이미지 픽셀 비교 |
| **P5 — Domain 3 + Domain 9** | 3개월 | Chemistry 16 + Biology 13 = 29 모듈 | K-M reflectance 표준 시편 정합 |
| **P6 — Domain 5 + Domain 7** | 2개월 | Design 18 + Print 13 = 31 모듈 | APCA Lc 자동검사 + 핀트 정합 시뮬레이션 |
| **P7 — Domain 8** | 1개월 | History 13 모듈 | 다국어 본문 비교 검수 |
| **P8 — Polish & Archive** | 1개월 | Zenodo DOI 발급, Internet Archive 미러, 인쇄 도록 PDF | 정적 빌드 ZIP 무결성 + 1년 후 재빌드 가능성 점검 |

총 18개월. Phase는 도메인이 서로 독립적이므로 P3·P4·P5·P6는 인력 여건에 따라 병렬화 가능.
