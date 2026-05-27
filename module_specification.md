# Module Specification — Unified Standards

본 문서는 `module_catalog.md`에 등록된 **518개 모든 모듈이 예외 없이 준수해야 할 단일 규격(canonical specification)** 이다. 한 모듈이 이 규격을 어기면 `scripts/verify-module.ts`가 빌드를 실패시킨다.

| 관계 문서 | 역할 |
| :--- | :--- |
| `implementation_plan.md` | 시스템 아키텍처·빌드·인프라 |
| `evaluation_and_expansion.md` | 평가·확장 전략·교과서 정합 방법론 |
| `module_catalog.md` | 518개 모듈 마스터 리스트 |
| **`module_specification.md` (본 문서)** | **각 모듈 내부의 구조·문체·시각·인용 표준** |

---

## Ⅰ. 전체 모듈 간 구조 (Inter-Module Architecture)

### 1. 디렉터리·식별자 규칙

모든 모듈은 다음 경로 패턴으로만 존재한다:

```
src/modules/<category-folder>/<entry-folder>/
  ├── index.html          # SSR 진입점 (KaTeX 사전 렌더 포함)
  ├── main.ts             # 모듈 로직 + Web Component
  ├── style.css           # 모듈 고유 스타일 (≤ 80 lines)
  ├── meta.json           # 모듈 메타데이터 (필수)
  └── refs.bib            # 인용 출처 BibTeX (필수)
```

- `<category-folder>`와 `<entry-folder>`는 모두 *kebab-case 영문*. 한국어·대문자·공백 금지.
- `category-folder` 명은 `module_catalog.md`와 1:1 일치 — 카탈로그가 권위 출처.
- 모듈 식별자(`id`)는 `<category>/<entry>` 형식. 예: `reflection-lab/specular-vs-diffuse`.

### 2. 모듈 그래프 (Prerequisites · Leads-to · See-also)

각 모듈은 자신을 가리키는 3종의 그래프 엣지를 `meta.json`에 선언한다:

| 엣지 | 의미 | UI 표시 |
| :--- | :--- | :--- |
| `prerequisites` | 이 모듈을 이해하기 전에 추천 | 모듈 좌상단 *"필요 배경"* 칩 |
| `leads_to` | 이 모듈 다음에 권장 | 모듈 우하단 *"다음 단계"* 카드 |
| `see_also` | 같은 현상의 다른 관점 | 푸터 *"관련 모듈"* 리스트 |

빌드 타임에 모든 `meta.json`을 수집해 *전체 모듈 그래프*(JSON)를 생성, 사이트 전체 검색·학습경로 UI의 단일 원천이 된다.

### 3. 학습 경로 (Curated Learning Paths)

각 모듈은 0개 이상의 *경로*에 등록될 수 있다. 초기 5개 경로:

| 경로 ID | 제목 | 모듈 수 | 청중 |
| :--- | :--- | :--- | :--- |
| `light-to-color` | Light to Color — 빛에서 색까지 | 18 | 일반·K-12 |
| `designers-path` | Designer's Color Science — 디자이너의 색채과학 | 16 | UI/UX 디자이너 |
| `color-in-nature` | Color in Nature — 자연의 색 | 14 | 호기심 일반인 |
| `print-workflow` | Print Workflow — 인쇄 출판 워크플로 | 12 | 인쇄 실무자 |
| `civilization-of-color` | Color Through Civilization — 색채 인류학 | 14 | 인문 독자 |

경로 내 순서는 명시적 시퀀스로 유지하며, "다음/이전" 네비게이션을 모듈 셸이 자동 렌더링한다.

### 4. 3-Tier 품질 계층

`meta.json`의 `tier` 필드:

| Tier | 비중 | 품질 의무 |
| :--- | :--- | :--- |
| **headliner** | ~30 (5.8%) | en+ko 본문 동등, 모바일 최적화, OG 이미지, 80h 평균 투자, A/B 검증 |
| **reference** | ~150 (29%) | en 본문 + ko UI/요약, 태블릿+데스크탑, 40h 평균 |
| **atom** | ~338 (65.2%) | en 본문, 데스크탑, 15h 평균 |

Tier는 *품질 의무*만 달리할 뿐, 본 규격서의 *구조·시각·인용*은 모두 동일 적용된다.

---

## Ⅱ. 모듈 제목 이원화 (Title — Subtitle Bipartition)

### 1. 규칙

모든 모듈 제목은 **"제목 — 부제"** 의 이원 구조다.

- **제목 (Title)**: *체언구(noun phrase)*, 3~5 단어 이내. 현상·법칙·기법의 *고유명*.
- **부제 (Subtitle)**: *완결된 설명문*, 10~25 단어. 무엇을 *어떻게* 시연하는지를 한 문장으로.
- 두 요소 사이 구분자는 **em-dash `—` (U+2014)** 만 사용. 하이픈·콜론·괄호 불가.

### 2. 이원화 양식

```
<제목> — <부제>
```

| 양식 | 영문 | 한국어 |
| :--- | :--- | :--- |
| **제목** | Title Case, 명사구 | 명사구 또는 명사절 (조사 생략 허용) |
| **부제** | Sentence case, 종지부 없음 | 종지부 없음, 평서문 |
| **수식** | 부제에 인라인 수식 허용 (`$...$` 또는 KaTeX SSR) | 동일 |

### 3. 도메인별 정착 예시

| 모듈 ID | 제목 (en) | 부제 (en) |
| :--- | :--- | :--- |
| `light-propagation/inverse-square` | **Inverse Square Law** | how illuminance falls as $1/r^2$ when you slide a lamp away from a sensor |
| `refraction-snell/snells-law` | **Snell's Law Refractometer** | drag the incident ray and watch $n_1 \sin\theta_1 = n_2 \sin\theta_2$ rebalance in real time |
| `particle-scattering/sky-color` | **Why the Sky Is Blue** | move the sun across the sky and watch Rayleigh scattering paint the daytime blue and the sunset red |
| `oklch-harmony-explorer/oklch-uniform-palette` | **OKLCH Uniform Palette Generator** | spin three sliders — lightness, chroma, hue — to build a perceptually uniform palette and export it as CSS |
| `color-vision-deficiency/cvd-everyday` | **Everyday Color Confusion** | swap a child's storybook between trichromat and dichromat views to see which color pairs collapse |

| 모듈 ID | 제목 (ko) | 부제 (ko) |
| :--- | :--- | :--- |
| `light-propagation/inverse-square` | **빛의 역제곱 법칙** | 광원과 센서의 거리를 늘릴수록 조도가 $1/r^2$로 줄어드는 관계를 슬라이더로 확인한다 |
| `refraction-snell/snells-law` | **스넬의 법칙 굴절계** | 입사 광선을 끌어 움직이면 $n_1 \sin\theta_1 = n_2 \sin\theta_2$ 관계가 실시간으로 재균형을 이룬다 |
| `particle-scattering/sky-color` | **하늘은 왜 파란가** | 태양을 하늘 위로 움직이며 레일리 산란이 낮의 푸름과 노을의 붉음을 어떻게 만드는지 본다 |

### 4. 제목·부제 작성 체크리스트

빌드 게이트에서 `verify-titles.ts`가 다음을 검사한다:

- [ ] 제목과 부제가 정확히 ` — ` (공백+em-dash+공백)으로 구분되는가
- [ ] 제목이 5단어 이하인가 (관사·전치사 제외 기준)
- [ ] 부제가 25단어 이하인가
- [ ] 부제가 종지부 없이 끝나는가
- [ ] en/ko 모두 동일 *구조*(이원화)를 지키는가
- [ ] *명령문 어휘*("click", "drag", "여기를 눌러")가 부제에 1개 이상 등장하는가 — 인터랙티브 의무 강제

---

## Ⅲ. 모듈 레이아웃 구조 (Layout Structure)

### 1. 표준 레이아웃 3종

거의 모든 모듈은 다음 3개 레이아웃 중 하나에 속한다.

#### Type A — Side Panel (60% 모듈)
```
┌──────────────────────────────────────┐
│  Header: Title — Subtitle            │ 64px
├──────────┬───────────────────────────┤
│ Control  │                           │
│  Panel   │     Canvas Viewport       │
│  (left)  │      (right, primary)     │
│  320px   │                           │
├──────────┴───────────────────────────┤
│  Citation Footer · Prev/Next Path    │ 48px
└──────────────────────────────────────┘
```
대다수 단일-인터랙션 모듈에 적합. 슬라이더 1~6개 + 캔버스 1개.

#### Type B — Stacked Comparison (25% 모듈)
```
┌──────────────────────────────────────┐
│  Header                              │
├──────────────────────────────────────┤
│ Controls (full width)                │ 96px
├──────────────────┬───────────────────┤
│  Canvas A        │  Canvas B         │
│  (e.g., Before)  │  (e.g., After)    │
├──────────────────┴───────────────────┤
│  Footer                              │
└──────────────────────────────────────┘
```
대조·비교 모듈(예: WCAG vs APCA, sRGB vs P3, Specular vs Diffuse).

#### Type C — Data Plot + Stage (15% 모듈)
```
┌──────────────────────────────────────┐
│  Header                              │
├──────────┬───────────────────────────┤
│ Control  │  Spectrum Plot (top 40%)  │
│  Panel   ├───────────────────────────┤
│          │  Canvas Stage (bot 60%)   │
├──────────┴───────────────────────────┤
│  Footer                              │
└──────────────────────────────────────┘
```
분광 곡선과 시각 출력을 동시에 보여주는 모듈(예: Planckian, CMF, K-M Mixer).

레이아웃은 `meta.json`의 `layout: "A" | "B" | "C"`로 선언하며, 셸 컴포넌트(`<enc-module-shell layout="A">`)가 자동 렌더링한다.

### 2. 그리드·간격 토큰

| 토큰 | 값 | 용도 |
| :--- | :--- | :--- |
| `--space-0` | 0 | 리셋 |
| `--space-1` | 4px | 인접 라벨·값 |
| `--space-2` | 8px | 컨트롤 내부 |
| `--space-3` | 16px | 컨트롤 간 |
| `--space-4` | 24px | 섹션 간 |
| `--space-5` | 40px | 패널 간 |
| `--space-6` | 64px | 헤더·푸터 |
| `--radius-0` | 0 | 박물관 직각 기본 |
| `--radius-1` | 4px | 카드 미세 둥글기 (최대값) |

### 3. 반응형 브레이크포인트

```css
/* Tier-aware: headliner는 모바일 의무, atom은 데스크탑 only */
@media (max-width: 768px)  { /* Mobile: Tier headliner 의무 */ }
@media (max-width: 1024px) { /* Tablet: Tier headliner+reference 의무 */ }
@media (min-width: 1025px) { /* Desktop: all tiers */ }
```

모바일에서 Type A는 *상단 컨트롤 + 하단 캔버스* 세로 스택으로 자동 재구성. Type B는 *상하 비교*로 회전.

### 4. 헤더·푸터 의무 영역

#### Header (모든 모듈 공통)
```
[Domain chip] · [Bloom level chip] · [Tier chip]
Title — Subtitle
```
- Domain chip 예: `D1 Optics`, `D4 Colorimetry`
- Bloom chip 예: `L2 Understand`, `L5 Evaluate`
- Tier chip 예: `Headliner` (gold), `Reference` (silver), `Atom` (gray)

#### Footer (모든 모듈 공통)
```
Source: <textbook §section> · CIE/ASTM/ISO standard
Prev: <module> · Path: <learning-path> · Next: <module>
DOI: 10.xxxx/optics-encyclopedia.<id>
```

### 5. 캔버스 뷰포트 표준

- 최소 크기: 480×360 (Type A), 600×400 (Type C 캔버스 부분)
- 종횡비 보존, devicePixelRatio 자동 적용 (`<enc-canvas-stage>`가 처리)
- 모든 캔버스 배경: `#0E0E0E` (디자인 토큰 `--canvas-bg`)
- 캔버스 위 좌표축이 있을 경우: 1px `#2A2A2A` 격자, `Inter 10px` 축 라벨

---

## Ⅳ. 시각적 통일성 전략 (Visual Uniformity)

### 1. 색 사용 규칙 (Museum Neutral + Simulation Chroma)

**원칙**: UI는 무채색만, 채색은 *시뮬레이션 활성 영역* 안쪽에만.

| 영역 | 색 사용 |
| :--- | :--- |
| 페이지 배경, 패널, 텍스트, 아이콘, 슬라이더 트랙, 보더 | **순수 그레이스케일만** |
| 캔버스 뷰포트 내부 (광선, 분광 곡선, 색 샘플) | 채색 허용·권장 |
| 데이터 플롯 (스펙트럼, 색역, ΔE 등) | 채색 허용 |
| 인용 푸터, 학습 경로 카드 | 무채색 |

이 규칙이 깨지면 "박물관 같은 차분함" 정체성이 즉시 무너진다.

### 2. 디자인 토큰 (`@core/styles/variables.css`)

```css
:root {
  /* Grayscale palette (museum neutral) */
  --bg-0: #0A0A0A;       /* app shell background */
  --bg-1: #121212;       /* card / panel */
  --bg-2: #1A1A1A;       /* nested element */
  --canvas-bg: #0E0E0E;  /* canvas viewport */

  /* Borders / dividers */
  --border-1: #222222;
  --border-2: #2A2A2A;
  --border-focus: #FFFFFF;

  /* Text */
  --text-0: #F5F5F5;     /* headline */
  --text-1: #C8C8C8;     /* body */
  --text-2: #888888;     /* secondary / labels */
  --text-3: #555555;     /* disabled */

  /* Tier accents (used in chips only — still desaturated) */
  --tier-headliner: #E8D9A0;  /* muted gold */
  --tier-reference: #C8C8C8;  /* silver */
  --tier-atom:      #888888;  /* neutral */

  /* Spacing */
  --space-0: 0;
  --space-1: 4px; --space-2: 8px; --space-3: 16px;
  --space-4: 24px; --space-5: 40px; --space-6: 64px;

  /* Radius */
  --radius-0: 0; --radius-1: 4px;

  /* Typography */
  --font-serif:   'Spectral', 'Noto Serif KR', Georgia, serif;
  --font-sans:    'Inter', 'Pretendard', 'Helvetica Neue', sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

  /* Type scale (modular 1.25) */
  --fs-12: 12px; --fs-14: 14px; --fs-16: 16px;
  --fs-20: 20px; --fs-25: 25px; --fs-31: 31px;
  --lh-tight: 1.25; --lh-body: 1.6;

  /* Motion (prefers-reduced-motion overrides → 0ms) */
  --motion-fast:   120ms;
  --motion-mid:    240ms;
  --motion-slow:   400ms;
  --ease-standard: cubic-bezier(0.2, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 0ms; --motion-mid: 0ms; --motion-slow: 0ms;
  }
}

/* Korean font stack auto-switches via :lang() */
:lang(ko) {
  --font-serif: 'Noto Serif KR', 'Spectral', serif;
  --font-sans:  'Pretendard', 'Inter', sans-serif;
}
```

### 3. 컴포넌트 라이브러리 (필수 재사용)

| Web Component | 역할 |
| :--- | :--- |
| `<enc-module-shell>` | 페이지 셸 (i18n, a11y, layout) |
| `<enc-canvas-stage>` | DPR 안전 캔버스 |
| `<enc-slider>` | 통일 슬라이더 (라벨·output·aria-valuetext 자동) |
| `<enc-toggle>` | 2~4 옵션 토글 |
| `<enc-color-readout>` | LMS/XYZ/Lab/OKLCH 표시 |
| `<enc-spectrum-plot>` | 380-780nm 스펙트럼 플롯 |
| `<enc-cie-diagram>` | 1931 xy / 1976 u'v' 차트 |
| `<enc-cvd-toggle>` | 색약 시뮬레이션 토글 |
| `<enc-citation-footer>` | 인용 푸터 (자동) |
| `<enc-path-nav>` | 이전/다음 경로 네비 (자동) |

각 모듈의 `main.ts`는 *최대한 위 컴포넌트만 조합*해야 한다 — 자체 슬라이더·차트 구현은 금지.

### 4. 캔버스 내부 시각 표준

| 요소 | 규칙 |
| :--- | :--- |
| 핸들 (드래그 가능) | 흰색 1px 외곽 + 투명 채움, 반경 6px |
| 보조 광선 (광학 모듈) | `rgba(255,255,255,0.4)` 1px |
| 주 광선 | `rgba(255,255,255,0.85)` 1.5px |
| 좌표축 격자 | `#2A2A2A` 1px, 5단위 강조 `#3A3A3A` |
| 축 라벨 | `--font-sans` 10px `--text-2` |
| 수치 readout | `--font-mono` 11px `--text-1` |
| 측정 캘리퍼 | `#FFFFFF` 1px dashed, 양 끝 작은 직각 마커 |

### 5. 아이콘 시스템

- **Phosphor Icons (Regular weight)** 단일 패밀리만 사용. SVG inline (네트워크 요청 0).
- 크기: 16px / 20px / 24px 3단계.
- 색: 항상 `currentColor` — 별도 색 지정 금지.

---

## Ⅴ. 텍스트·문체 통일성 (Text & Style)

### 1. 모듈 본문 3-Zone 구조

모든 모듈은 정확히 3개의 텍스트 영역을 가진다.

| Zone | 위치 | 내용 | 분량 |
| :--- | :--- | :--- | :--- |
| **Definition** | 컨트롤 패널 상단 | 한 문장 현상 정의 | 1 문장, 25 단어 이하 |
| **Formula** | 정의 바로 아래 | 강조된 핵심 수식 (KaTeX SSR) | 1~2 줄 |
| **Interaction Guide** | 수식 아래 | "무엇을 조작하고 무엇을 관찰하라" | 2~3 문장, 60 단어 이하 |

부가 텍스트(긴 해설, 역사적 배경 등)는 *접힌 디스클로저* 영역으로만 허용한다.

### 2. 톤 앤 매너 규약

| 규약 | Do | Don't |
| :--- | :--- | :--- |
| **격조** | 객관·정밀·우아 | 캐주얼 구어체 |
| **인칭** | 비인칭 또는 명령형 ("Drag the source") | "Let's see what happens..." |
| **시제** | 현재형 ("Photons scatter...") | 과거·미래 시제 |
| **수사** | 사실·인과 진술 | 비유·은유 (특히 비과학적 비유) |
| **느낌표·이모지** | 금지 | — |

### 3. 용어 통일 (Strict Terminology)

| 사용 | 금지 |
| :--- | :--- |
| Luminance | "brightness of light" |
| Chroma / Saturation | "purity", "vividness" |
| Reflectance spectrum | "object color" |
| Spectral power distribution (SPD) | "light color" |
| Color matching function (CMF) | "eye sensitivity curve" |
| Refractive index $n$ | "denseness" |
| Photon | "light particle" (Domain 1 본문에서) |

`scripts/verify-terminology.ts`가 금칙어 사용 시 빌드 실패.

### 4. 수식·기호 표기 (Math Notation)

- **KaTeX 표기**: 인라인 `$\theta$`, 블록 `$$E = mc^2$$`.
- **단위는 수치와 thin space로 분리**: `780\,\mathrm{nm}`, `1.5\,\mathrm{eV}` (KaTeX `\,\mathrm{}`).
- **벡터**: 굵은 글씨 `\mathbf{E}`, 단위 벡터 `\hat{\mathbf{n}}`.
- **표준 기호**: 굴절률 $n$, 파장 $\lambda$, 주파수 $\nu$ (절대 $f$ 아님 — `f`는 초점거리 전용).
- **수식 줄 번호**: 부여하지 않음 (혼란 방지).

### 5. 이중 언어 (Bilingual) 구조

| 자산 | en | ko |
| :--- | :--- | :--- |
| Title | 필수 | 필수 (이원화 동일 유지) |
| Subtitle | 필수 | 필수 |
| Definition | 필수 | tier ≥ reference 의무 |
| Formula | 동일 (수식은 언어 중립) | — |
| Interaction Guide | 필수 | tier ≥ reference 의무 |
| Slider Labels | 필수 | UI 토큰 (전 tier 의무) |
| Aria-valuetext | 필수 | tier ≥ reference 의무 |

`tier: "atom"` 모듈은 영문 본문만 가능하지만, **UI 라벨(슬라이더 등)은 항상 양어 의무**.

### 6. 명령형 동사 사용 가이드 (Interaction Guide 작성)

부제와 Interaction Guide에는 다음 중 하나 이상의 명령형 동사가 의무다:

| EN | KO |
| :--- | :--- |
| **Drag** / Pull | 끌어 옮긴다 / 당긴다 |
| **Slide** | 슬라이더를 움직인다 |
| **Toggle** | 전환한다 |
| **Click** | 누른다 / 클릭한다 |
| **Hover** | 위에 올린다 |
| **Observe** / Watch | 관찰한다 / 본다 |
| **Compare** | 비교한다 |
| **Sweep** | 휩쓴다 / 훑는다 |

수동 표현("the slider can be moved...")은 *금지*.

---

## Ⅵ. 핵심 인터랙션 포인트 (Core Interaction Points)

### 1. One-Slider-One-Concept 원칙

모듈 1개당 *핵심 변수*는 1~3개. 4개 이상은 인지 부담이 급증한다 (Sweller, *Cognitive Load Theory* 2010).

- **Tier headliner**: 핵심 변수 1~2개 + 보조 토글 1개.
- **Tier reference**: 핵심 변수 1~4개.
- **Tier atom**: 핵심 변수 1~2개 (이름 그대로 *원자*).

`meta.json`의 `interaction_count`가 위 제한을 초과하면 빌드 경고.

### 2. 인터랙션 프리미티브 5종

모든 인터랙션은 다음 5개로 환원된다:

| 프리미티브 | 입력 | 시각적 어포던스 | a11y |
| :--- | :--- | :--- | :--- |
| **Continuous slider** | range 슬라이더 | 가로 트랙 + 핸들 | `<input type="range">`, 화살표 ±1, Shift+화살표 ±10 |
| **Discrete toggle** | 2~4 선택지 | 인접 버튼 그룹 | `role="radiogroup"`, 화살표 키 |
| **Canvas drag** | 캔버스 위 핸들 | 흰 외곽선 빈 원 | Tab으로 포커스, 화살표 키 대체 |
| **Click trigger** | 단발 액션 (Reset 등) | 보더 라이트 버튼 | `<button>`, Space/Enter |
| **Hover inspect** | 데이터 점 위 마우스 | 툴팁 + 점선 캘리퍼 | 키보드 탭으로 동등 |

이 5개 외의 *새 인터랙션 발명 금지*.

### 3. 피드백 응답 예산

- 입력 → 시각 반영: **≤ 16ms** (60fps 1프레임 내).
- 입력 → 수치 readout: **≤ 32ms**.
- 입력 → 보조 분광 곡선 등 무거운 계산: **≤ 100ms** + 로딩 인디케이터.
- *입력 직후 0ms 즉시 응답*은 의도된 디자인 — 학습효과의 핵심.

### 4. Anchor Node (캔버스 드래그 핸들)

| 상태 | 시각 |
| :--- | :--- |
| Idle | 흰색 1px 외곽 + 투명 채움, r=6 |
| Hover | r=7, 외곽 1.5px |
| Active (dragging) | 외곽 2px, 십자 가이드선 표시 |
| Focused (keyboard) | 외곽 2px + 외부 점선 ring r=10 |

### 5. Reset · Help · Share 단축키

모든 모듈은 다음 키보드 단축키를 지원:

| 키 | 동작 |
| :--- | :--- |
| `R` | 모든 파라미터를 기본값으로 리셋 |
| `?` | 단축키 도움말 토글 |
| `S` | 현재 상태 URL 복사 (deep-link, deep-state) |
| `C` | CVD 시뮬레이션 사이클 (Off → Prot → Deut → Trit → Off) |
| `M` | 모션 감소 토글 |

단축키는 `<enc-module-shell>`이 처리하며, *모듈별 커스텀 단축키 추가 금지*.

### 6. Deep-State URL

슬라이더·토글의 현재 상태를 query string으로 영구화:

```
/modules/refraction-snell/snells-law/?n1=1.00&n2=1.52&theta=30
```

`S` 키 또는 공유 버튼으로 복사 → 학술 인용·SNS 공유·교사 수업 자료에 직접 활용.

---

## Ⅶ. 과학적 정합성 (Scientific Consistency)

### 1. 데이터 권위 출처 (Authoritative Sources)

| 데이터 영역 | 권위 출처 | 본 프로젝트 사본 |
| :--- | :--- | :--- |
| CIE 1931 2°/10° CMF | CIE 015:2018 | `src/core/data/cmf-1931-2deg.json` |
| Stockman & Sharpe LMS | UCL CVRL (cvrl.org) | `src/core/data/lms-stockman-sharpe.json` |
| D50/D65/A/F11 SPD | CIE 015:2018 | `src/core/data/illuminants.json` |
| ASTM E308 표준 시편 | ASTM E308-18 | `src/core/data/astm-e308-test-patches.json` |
| Bruce Lindbloom 행렬 | brucelindbloom.com | `src/core/data/lindbloom-matrices.json` |
| ICC 표준 프로파일 | color.org | `src/core/data/icc-srgb-d65.icc` |
| Macbeth/ColorChecker 24 | X-Rite | `src/core/data/colorchecker24.json` |

데이터 파일은 모두 *원본 인용·라이선스·갱신일*을 헤더 주석에 명시.

### 2. 정확도 회귀 테스트

`scripts/verify-cie.ts`는 매 빌드마다 다음을 검사:

| 검증 | 허용 오차 | 출처 |
| :--- | :--- | :--- |
| D65 → XYZ | $\|\Delta XYZ\| \le 0.0001$ vs $(95.047, 100.000, 108.883)$ | CIE015 |
| Planck $T \to xy$ | $\Delta E_{ab} \le 0.5$ | CIE015 |
| sRGB → XYZ → sRGB round-trip | 모든 채널 $\le 1 \text{LSB}_{8\text{-bit}}$ | IEC 61966-2-1 |
| CIEDE2000 reference pairs | $\Delta E_{00}$ 일치 (Sharma 2005 데이터) | Sharma et al. 2005 |
| K-M 시편 재합성 | $\Delta E_{76} \le 1.0$ | ASTM E308 |

테스트 실패 시 PR 머지 차단.

### 3. 경계 조건·예외 처리

각 모듈은 *물리적으로 의미 없는 영역*을 명시적으로 차단해야 한다:

| 경우 | 처리 |
| :--- | :--- |
| 굴절률 $n < 1$ (단, 메타물질 모듈 제외) | 슬라이더 최소값 1.0으로 고정 |
| 임계각 계산 시 $n_2 > n_1$ | 임계각 정의 불가 표시, "No TIR" 라벨 |
| Planck $T < 100$K | 가시광선 외, 적외선 표시로 전환 |
| 스펙트럼 외삽 (380nm 미만 / 780nm 초과) | 회색 점선 + "Outside visible" 주석 |
| 음 휘도·음 채도 | 슬라이더 0으로 클램프 |

*"옳지 않은 답을 보여주지 않는다"* 가 본 백과사전의 학술 신뢰의 핵심.

### 4. 동료 검토 체크리스트 (PR 머지 전 의무)

```
[ ] meta.json의 textbook_refs가 실제 인용된 절을 가리킨다
[ ] 본문 수식과 코드 수식이 동일한 변수 명명·부호 규약을 쓴다
[ ] 슬라이더 단위가 SI/CIE 표준 (예: 파장 nm, 각도 °)
[ ] 한 슬라이더가 한 물리량만 조작한다 (혼합 변수 금지)
[ ] 경계 조건이 명시적으로 처리된다
[ ] verify-cie.ts / verify-terminology.ts / verify-titles.ts 통과
[ ] 도메인 전문가 1인 이상 리뷰 승인
```

---

## Ⅷ. 이론적 근거 명시 (Theoretical Basis · Citation)

### 1. 인용 푸터 의무 양식

모든 모듈은 푸터에 다음을 *반드시 표시*한다:

```
Source · 출처
  Hecht, Optics 5e §4.6
  CIE 015:2018, Table 3.5
DOI · 10.xxxx/optics-encyclopedia.refraction-snell.snells-law
License · CC BY-SA 4.0 · Code MIT
```

푸터는 `<enc-citation-footer>` 컴포넌트가 `meta.json` + `refs.bib`로부터 자동 렌더링한다.

### 2. `refs.bib` (모듈별 BibTeX)

```bibtex
@book{hecht2017,
  author = {Eugene Hecht},
  title = {Optics},
  edition = {5},
  publisher = {Pearson},
  year = {2017},
  cited_section = {§4.6}
}

@standard{cie015,
  organization = {CIE},
  title = {Colorimetry, 4th Edition},
  number = {CIE 015:2018},
  year = {2018},
  cited_section = {Table 3.5}
}
```

### 3. 인용 작성 규칙

| 규칙 | 예 |
| :--- | :--- |
| 교재명 *italic* | *Optics* |
| 절·표 번호 명시 | §4.6 / Table 3.5 |
| 원저자 + 연도 + 페이지 (논문) | Brettel et al. 1997, p.2647 |
| CIE/ASTM/ISO 표준은 번호로 | CIE 015:2018 |
| 1차 출처 우선 (2차 출처 인용 금지) | — |
| Wikipedia 인용 금지 | — |

### 4. 사이트 전역 참고 문헌 페이지

`/references/` 라우트에서 *전 모듈의 인용을 통합한 마스터 참고문헌*을 BibTeX·BibLaTeX·RIS·CSL-JSON 형식으로 다운로드 제공. 학술 인용 친화성의 핵심.

### 5. DOI 발급

매 분기 빌드 산출물은 Zenodo로 푸시되며, **각 모듈마다 영구 DOI** 발급. 학술 인용 시 다음 형식 권장:

> Cho, Y. et al. (2026). *Snell's Law Refractometer — drag the incident ray ...*. Interactive Encyclopedia of Color. https://doi.org/10.5281/zenodo.xxxxxxx

---

## Ⅸ. 종합: 모듈 HTML 골격 템플릿 (Synthesis Template)

위 모든 규격을 단일 HTML 파일로 통합한 표준 골격. 모든 모듈은 이 골격에서 시작한다.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Snell's Law Refractometer — drag the incident ray</title>
  <meta name="description"
        content="drag the incident ray and watch n₁ sin θ₁ = n₂ sin θ₂ rebalance in real time">
  <link rel="stylesheet" href="../../../core/styles/base.css">
  <link rel="stylesheet" href="../../../core/styles/katex.min.css">
  <link rel="stylesheet" href="./style.css">
  <script type="application/ld+json">
    { "@context": "https://schema.org",
      "@type": "LearningResource",
      "name": "Snell's Law Refractometer",
      "description": "drag the incident ray ...",
      "educationalLevel": "L3",
      "isPartOf": { "@type": "Collection", "name": "Interactive Encyclopedia of Color" }
    }
  </script>
</head>
<body>
  <enc-module-shell layout="A" module-id="refraction-snell/snells-law">

    <!-- Ⅲ. Header -->
    <header class="module-header">
      <div class="chip-row">
        <span class="chip chip-domain">D1 Optics</span>
        <span class="chip chip-bloom">L3 Apply</span>
        <span class="chip chip-tier">Reference</span>
      </div>
      <h1 class="module-title" data-i18n="title">
        Snell's Law Refractometer
      </h1>
      <p class="module-subtitle" data-i18n="subtitle">
        drag the incident ray and watch
        <span class="math" data-tex="n_1 \sin\theta_1 = n_2 \sin\theta_2"></span>
        rebalance in real time
      </p>
    </header>

    <!-- Type A — Side panel + Canvas -->
    <div class="workstation-A">
      <aside class="control-panel">
        <!-- Ⅴ. 3-Zone Text -->
        <p class="zone-definition" data-i18n="definition">
          Light bends at an interface because its phase velocity changes
          between media of different refractive index.
        </p>
        <div class="zone-formula math-block"
             data-tex="n_1 \sin\theta_1 = n_2 \sin\theta_2"></div>
        <p class="zone-guide" data-i18n="guide">
          Drag the laser source to change the incident angle.
          Slide the lower-medium index to see how the refracted ray bends.
          Observe the critical angle where total internal reflection begins.
        </p>

        <!-- Ⅵ. Interaction primitives -->
        <enc-slider id="theta1" label="Incident angle θ₁"
                    min="0" max="89" step="0.1" value="30" unit="°"></enc-slider>
        <enc-slider id="n2" label="Lower medium index n₂"
                    min="1.0" max="2.5" step="0.01" value="1.52"></enc-slider>
        <enc-toggle id="wavelength" label="Wavelength"
                    options="450,550,650" unit="nm"></enc-toggle>

        <enc-color-readout id="readout"
                           channels="theta2,critical-angle"></enc-color-readout>
      </aside>

      <main class="canvas-viewport">
        <enc-canvas-stage id="stage" tabindex="0"
                          aria-label="Snell's law ray-trace viewport"></enc-canvas-stage>
      </main>
    </div>

    <!-- Ⅷ. Citation footer -->
    <enc-citation-footer module-id="refraction-snell/snells-law">
      <!-- Auto-rendered from refs.bib + meta.json -->
    </enc-citation-footer>

    <!-- Ⅰ. Path navigation -->
    <enc-path-nav path-id="light-to-color"></enc-path-nav>
  </enc-module-shell>

  <script type="module" src="./main.ts"></script>
</body>
</html>
```

이 골격을 따르지 않는 모듈은 빌드 단계에서 거부된다.

---

## Ⅹ. 빌드 시점 검증 스크립트 (Build-time Verifiers)

본 규격의 자동 강제를 위해 `scripts/` 디렉터리에 다음 스크립트가 존재한다.

| 스크립트 | 검사 항목 | 실패 시 |
| :--- | :--- | :--- |
| `verify-catalog.ts` | `module_catalog.md` ↔ 실제 폴더 1:1 일치 | 빌드 실패 |
| `verify-meta.ts` | 모든 `meta.json` 스키마 유효성 | 빌드 실패 |
| `verify-titles.ts` | 제목-부제 이원화·길이·종지부 규칙 | 빌드 실패 |
| `verify-terminology.ts` | 금칙 용어 사용 검출 | 빌드 실패 |
| `verify-cie.ts` | CIE/ASTM/Planck 수치 정확도 | 빌드 실패 |
| `verify-locales.ts` | en/ko 키 집합 일치 (tier별 의무량) | 빌드 실패 |
| `verify-citations.ts` | refs.bib 존재 + 본문 인용 매칭 | 빌드 실패 |
| `verify-a11y.ts` | axe-core critical/serious 0건 | 빌드 실패 |
| `verify-layout.ts` | layout A/B/C 외 사용 금지, 토큰 사용 검증 | 빌드 실패 |
| `verify-interactions.ts` | 핵심 변수 수 제한, 단축키 매핑 | 경고 또는 실패 |

위 10개 검증을 모두 통과해야 PR이 머지 가능하다.

---

## 부록 A. 빠른 참조 카드 (Quick Reference for Module Authors)

새 모듈을 작성할 때 다음 5가지만 기억하면 90%는 자동으로 규격을 따른다.

1. **`module_catalog.md`의 등록된 경로**로 폴더를 만든다.
2. **`Ⅸ. 종합 템플릿`을 복사**해 시작한다.
3. **제목·부제는 ` — ` (em-dash)** 로 구분한다. 영문·한국어 모두.
4. **`<enc-slider>`, `<enc-canvas-stage>` 등 표준 컴포넌트만** 쓴다.
5. **`refs.bib`에 1차 출처를 명시**한다 — Hecht/Wyszecki/CIE 등.

이 5가지만 지키면 나머지(시각 토큰, a11y, i18n, 인용 푸터, 학습 경로)는 셸·컴포넌트가 자동으로 처리한다.

---

## 부록 B. 참조 모듈 (Reference Implementations)

다음 5개 모듈을 *골든 모듈*로 지정한다. 모든 후속 모듈은 이들을 모범으로 삼는다.

| Tier | 모듈 ID | 모범 보여주는 점 |
| :--- | :--- | :--- |
| Headliner | `particle-scattering/sky-color` | L2 입문, 모바일 최적화, 1 슬라이더, OG 이미지 |
| Reference | `refraction-snell/snells-law` | L3 적용, Type A 표준, 인용 푸터 |
| Reference | `wave-interference/soap-bubble` | L3 적용, 박막 간섭 수식·시각 정합 |
| Atom | `wave-fundamentals/sine-anatomy` | L1 원자, 1 슬라이더, 짧은 본문 |
| Headliner | `color-vision-deficiency/cvd-everyday` | L1 입문, CVD 토글의 모범, a11y 모범 |

이 5개의 *시각·문체·인용*이 본 백과사전 전체의 *기준선*이다.
