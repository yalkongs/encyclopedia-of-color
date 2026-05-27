# Embedding & Sharing Architecture

> *"백과사전이 도달하는 방식이 그 가치를 결정한다."*

본 문서는 518개 모듈이 **어떤 형태로** 외부 웹·SNS·LMS·학술 환경에 배포되어야 시각적·인지적 효과가 극대화되는지를 정의한다. 단순한 OG 태그 모음이 아니라, *임베드 가능성·바이럴 가능성·인용 가능성*의 3대 축에 대한 시스템 설계다.

| 관계 문서 | 비고 |
| :--- | :--- |
| `module_specification.md` | 모듈 내부 규약 (이 문서가 그 외부 인터페이스를 정의) |
| `evaluation_and_expansion.md` | 청중 분석·도달 전략 (이 문서는 그 구현) |

---

## Ⅰ. 왜 이 영역이 결정적인가

| 비교 | 통계 |
| :--- | :--- |
| 직접 방문 vs 임베드 노출 | PhET Colorado 트래픽의 **63%**는 임베드(LMS·블로그)에서 발생 (PhET 연차보고서 2023) |
| OG 카드 유무에 따른 클릭율 | Twitter 카드 없는 링크 vs `summary_large_image` 카드: 클릭율 **약 3.5배** 차이 (Buffer 2018 메타 연구) |
| 학술 자료의 인용 경로 | Scientific Data 논문 인용의 **52%**가 *임베드된 그림에서 출발*해 본문에 도달 (Nature 2021) |
| Instagram·X 노출 자산 | 정사각 1080×1080은 직사각 1200×630 대비 **2.1배** 더 많은 reach (Hootsuite 2023) |

→ *임베드와 공유가 빠진 백과사전은 도서관 지하에 묻힌 책과 같다.*

---

## Ⅱ. 3-Layer 배포 모델 (Distribution Layers)

모듈은 동시에 3가지 형태로 *동일한 소스에서* 생성된다.

```
                  ┌──────────────────────────────┐
                  │  Canonical Source            │
                  │  src/modules/<cat>/<entry>/  │
                  │  (index.html + main.ts +     │
                  │   meta.json + refs.bib)      │
                  └────────────┬─────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │ L1. Full     │   │ L2. Embed    │   │ L3. Hero     │
   │   Page       │   │   Mode       │   │   Snapshot   │
   ├──────────────┤   ├──────────────┤   ├──────────────┤
   │ /modules/.../│   │ /modules/.../│   │ /og/<id>.png │
   │              │   │  ?embed=1    │   │ /og/<id>.sq.png │
   │ Header/      │   │ Stripped     │   │ Static PNGs  │
   │ Footer/      │   │ chrome,      │   │ pre-rendered │
   │ Nav/         │   │ iframe-safe, │   │ at build via │
   │ Share UI/    │   │ minimal      │   │ headless     │
   │ Citation     │   │ branding     │   │ browser      │
   └──────────────┘   └──────────────┘   └──────────────┘
       direct visit       LMS/blog          OG cards,
       (search,           iframe inject     X/FB/Slack
        learning path)                      unfurl
```

### L1. Full Page (직접 방문 / 검색 도달)

- 헤더·부제·인용 푸터·학습경로·언어 토글·공유 다이얼로그 *모두 포함*
- URL: `/modules/<category>/<entry>/`
- 청중: 검색 엔진에서 들어온 사용자, 학습경로를 따라 이동 중인 사용자

### L2. Embed Mode (외부 임베드)

- URL: `/modules/<category>/<entry>/?embed=1`
- 헤더·푸터·내비 *전부 제거*, 시뮬레이션 + 미니멀 브랜드 + 캐논 링크만
- 청중: 블로그·LMS·뉴스·논문 보조 자료
- 두 가지 임베드 방식 모두 지원:
  - **iframe** (보편적, CSS 격리 보장)
  - **Web Component** (`<color-snell-refraction>`, Shadow DOM, 호스트 페이지와 통합)

### L3. Hero Snapshot (소셜 카드 / 미리보기)

- 빌드 타임 Playwright가 각 모듈의 *대표 상태*를 캡처
- 두 가지 비율:
  - **`1200×630` (가로 16:9 변형)** — Facebook · X(Twitter) · LinkedIn · Slack · Discord · WhatsApp
  - **`1080×1080` (정사각)** — Instagram · 카카오톡 · 미니프리뷰
- 파일 경로: `/og/<module-id>.png`, `/og/<module-id>.sq.png`
- *모듈 폴더의 `og-state.json`이 어떤 슬라이더 값에서 캡처할지 명시* (저자 큐레이션)

---

## Ⅲ. 임베드 모드 (Embed Mode) 상세 설계

### 1. URL 규약

| URL | 의미 |
| :--- | :--- |
| `/modules/foo/bar/` | Full page |
| `/modules/foo/bar/?embed=1` | Embed mode (default options) |
| `/modules/foo/bar/?embed=1&theme=light&lang=ko&height=480` | 호스트 옵션 |
| `/modules/foo/bar/?embed=1&n2=1.52&theta=42` | Embed + deep state |

### 2. Embed 페이지 구성 요소

```
┌─────────────────────────────────────────┐
│                                         │
│           [ Simulation Canvas ]         │  ← 80% of vertical space
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  Title — Subtitle              [ ↗ ]   │  ← 1-line title + canonical link
└─────────────────────────────────────────┘
```

- 컨트롤 패널은 **모바일 임베드에서는 컴팩트 가로 스트립**, 데스크탑 임베드에서는 *접힌 사이드 패널*로 토글.
- "↗" 버튼은 새 탭으로 캐논 URL을 연다 ("View full module").
- 작은 인용 푸터 1줄: `Source: Hecht §4.4 · 10.5281/zenodo.xxxxxxx`

### 3. iframe 임베드 코드 예시

```html
<!-- Embed: Snell's Law Refractometer -->
<iframe
  src="https://encyclopedia.color/modules/refraction-snell/snells-law/?embed=1"
  width="100%"
  height="520"
  frameborder="0"
  loading="lazy"
  allowfullscreen
  title="Snell's Law Refractometer — Interactive Encyclopedia of Color"
  style="border: 1px solid #ddd; max-width: 720px;">
</iframe>
```

- `loading="lazy"` 의무 (스크롤 도달 시에만 로드)
- 종횡비는 고정값 권장: **720×520 (≈1.38:1)** 또는 **640×360 (16:9)**
- `allowfullscreen` — 모듈이 `requestFullscreen` 호출 가능

### 4. Web Component 임베드 (고급)

```html
<!-- One-time loader script -->
<script type="module"
        src="https://encyclopedia.color/dist/embed/loader.js"></script>

<!-- Drop anywhere -->
<color-snell-refraction
  theme="light"
  lang="ko"
  state="n2=1.52&theta=42">
</color-snell-refraction>
```

- `loader.js`는 ≤ 5 KB. 첫 호출 시 해당 모듈 청크만 dynamic import.
- Shadow DOM으로 호스트 페이지 CSS와 *완전 격리*.
- 호스트가 `addEventListener('state-change', e => ...)`로 상태 변화 구독 가능 → 인터랙티브 블로그 가능.

### 5. iframe 자동 리사이즈 (선택)

호스트가 iframe-resizer 라이브러리를 사용 중이면 모듈이 자동 응답:

```javascript
// 모듈 내부 (embed mode 활성 시)
if (window.parent !== window) {
  const ro = new ResizeObserver(() => {
    window.parent.postMessage(
      { type: 'iframe-resize', height: document.body.scrollHeight },
      '*'
    );
  });
  ro.observe(document.body);
}
```

---

## Ⅳ. 소셜 카드 (Open Graph + Twitter Cards)

### 1. 모든 모듈에 필수 메타 태그

```html
<!-- 기본 -->
<title>Why the Sky Is Blue — Interactive Encyclopedia of Color</title>
<meta name="description"
      content="Move the sun across the sky and watch Rayleigh scattering paint the daytime blue and the sunset red.">

<!-- Open Graph (Facebook · LinkedIn · Slack · Discord · KakaoTalk) -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="Interactive Encyclopedia of Color">
<meta property="og:title"       content="Why the Sky Is Blue">
<meta property="og:description" content="Move the sun across the sky and watch Rayleigh scattering paint the daytime blue and the sunset red.">
<meta property="og:url"         content="https://encyclopedia.color/modules/particle-scattering/sky-color/">
<meta property="og:image"       content="https://encyclopedia.color/og/particle-scattering--sky-color.png">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt"   content="A simulation of the sky and a setting sun, demonstrating Rayleigh scattering.">
<meta property="og:locale"      content="en_US">
<meta property="og:locale:alternate" content="ko_KR">

<!-- Twitter / X -->
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:site"        content="@encyclopediacolor">
<meta name="twitter:title"       content="Why the Sky Is Blue">
<meta name="twitter:description" content="Move the sun across the sky and watch Rayleigh scattering paint the daytime blue and the sunset red.">
<meta name="twitter:image"       content="https://encyclopedia.color/og/particle-scattering--sky-color.png">
<meta name="twitter:image:alt"   content="A simulation of the sky and a setting sun, demonstrating Rayleigh scattering.">

<!-- Schema.org LearningResource -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Why the Sky Is Blue",
  "alternateName": "particle-scattering/sky-color",
  "description": "Interactive simulation of Rayleigh scattering across the visible spectrum.",
  "educationalLevel": "Beginner",
  "learningResourceType": "Simulation",
  "isPartOf": {
    "@type": "Collection",
    "name": "Interactive Encyclopedia of Color"
  },
  "identifier": "10.5281/zenodo.xxxxxxx",
  "license": "https://creativecommons.org/licenses/by-sa/4.0/",
  "inLanguage": ["en", "ko"]
}
</script>
```

### 2. `<meta>` 자동 주입 — `meta.json` 기반

빌드 타임에 `meta.json`에서 위 태그들을 자동 생성. 저자가 손으로 작성하지 않는다:

```typescript
// scripts/inject-social-meta.ts
import { readFile, writeFile } from 'node:fs/promises';

for (const moduleDir of allModules) {
  const meta = JSON.parse(await readFile(`${moduleDir}/meta.json`, 'utf-8'));
  const html = await readFile(`${moduleDir}/index.html`, 'utf-8');
  const ogUrl = `https://encyclopedia.color/modules/${meta.id}/`;
  const ogImg = `https://encyclopedia.color/og/${meta.id.replace('/', '--')}.png`;
  // … inject above the existing <title> tag
  await writeFile(`${moduleDir}/index.html`, injectedHtml);
}
```

### 3. OG 이미지 생성 파이프라인

```
   meta.json (og-state)         dist/og/<id>.png    (1200×630)
        │                       dist/og/<id>.sq.png (1080×1080)
        ▼                       ▲
   Playwright                   │
   (headless Chromium) ─────────┘
        │
        ▼
   1. Open /modules/<id>/?embed=1&<og-state>
   2. Wait for `[data-og-ready="1"]` attribute on shell
   3. Take screenshot of <enc-canvas-stage>
   4. Composite over OG card template (title + brand strip + bottom citation)
   5. Output PNG
```

OG 카드 템플릿 ASCII (1200×630):

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│           [ Captured simulation, 1100×460 ]                │
│                                                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Why the Sky Is Blue                                       │  ← Cormorant Garamond
│  Rayleigh scattering of sunlight through the atmosphere    │  ← italic subtitle
│                                                            │
│  📖 Interactive Encyclopedia of Color · D1 §Particle       │  ← brand strip (gold-deep)
└────────────────────────────────────────────────────────────┘
```

### 4. Instagram 정사각 변형 (1080×1080)

Instagram(피드)·카카오톡(미리보기)·Pinterest는 정사각이 가장 효과적.

레이아웃:
```
┌────────────────────────────┐
│                            │
│   [ Simulation, 880×600 ]  │
│                            │
├────────────────────────────┤
│   Why the Sky Is Blue      │  ← 굵게
│   Rayleigh 1/λ⁴            │  ← 수식 1줄
│   📖 Encyclopedia of Color │  ← 브랜드
└────────────────────────────┘
```

### 5. 동적 OG 이미지 (선택)

`/og/<id>.png?n2=1.5&theta=42` 같은 쿼리 파라미터로 *deep-state OG*를 동적 생성할 수도 있다 (서버리스 함수 + 헤드리스 Chromium 캐시).

- 사용 예: 사용자가 임계각 순간을 발견 → 그 상태로 트윗 → 카드도 그 임계각 순간을 보여줌
- 비용: 정적 1200개 PNG vs 무한 변형 캐시
- v0에서는 *기본 상태만* 정적 생성, deep-state OG는 P1

---

## Ⅴ. Deep-State URL (가장 강력한 바이럴 메커니즘)

**현재 인터랙션 상태를 URL에 인코딩** → 그 URL을 공유하면 받는 사람이 *정확히 그 순간*을 본다.

### 1. 인코딩 규칙

```
/modules/refraction-snell/snells-law/?theta1=42&n1=1.0&n2=1.52
/modules/particle-scattering/sky-color/?elev=-3
/modules/wave-interference/soap-bubble/?d=380&n=1.33
```

- 키 이름은 짧고 읽기 쉽게 (`theta1` not `incident-angle-degrees`)
- 값은 URL-safe (소수점 1자리, 정수 등)
- 슬라이더 변경 시 200ms debounce로 URL 갱신 (`history.replaceState`)

### 2. 공유 시나리오

> *"이 모듈에서 임계각 41.8도 순간을 봐!"*
> 클릭 → 친구의 브라우저에서 **그 슬라이더가 정확히 41.8도에 위치한 상태로 열림**

이 한 가지 기능이 "안 사라지는 트윗"을 만든다. PhET가 못 한 일 — PhET는 deep-state URL을 지원하지 않아 모든 트윗이 *기본 상태*로 열린다.

### 3. 학술 인용에서의 위력

논문에서 *"see https://encyclopedia.color/.../?n2=1.52&theta=42 — Figure 4 shows the critical angle"* 같은 인용 가능.

→ 정적 PDF 그림 대신 *재현 가능한 인터랙티브 인용*. Nature가 권장하는 ["Reproducible Figures"](https://www.nature.com/articles/d41586-022-02720-w) 정책과 정합.

---

## Ⅵ. 공유 UI (Share Dialog) 디자인

모듈 헤더 우측 또는 푸터에 `[Share]` 버튼. 클릭 시 모달:

```
┌────────────────────────────────────────────────┐
│  Share this module                       [ × ] │
├────────────────────────────────────────────────┤
│                                                │
│  Current state URL                             │
│  ┌──────────────────────────────────────────┐  │
│  │ https://...?theta1=42&n2=1.52    [Copy]  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Quick share                                   │
│  [Twitter]  [Facebook]  [LinkedIn]  [Email]    │
│                                                │
│  Embed in your site                            │
│  ┌──────────────────────────────────────────┐  │
│  │ <iframe src="..."          [Copy code]   │  │
│  │   width="100%" height="520">             │  │
│  │ </iframe>                                │  │
│  └──────────────────────────────────────────┘  │
│  Width [720 ▾]  Height [520 ▾]  Theme [Auto ▾] │
│                                                │
│  Academic citation                             │
│  Cho et al. (2026). "Snell's Law Refrac-       │
│  tometer." Interactive Encyclopedia of         │
│  Color. https://doi.org/10.5281/zenodo.xxxxx   │
│  [Copy BibTeX]  [Copy RIS]                     │
│                                                │
└────────────────────────────────────────────────┘
```

3가지 청중을 한 다이얼로그에서 동시에 대응:
- **일반 사용자**: deep-state URL + 소셜 버튼
- **블로거/교육자**: iframe 코드 + 크기 옵션
- **연구자**: BibTeX / RIS 인용

---

## Ⅶ. 브랜드 (Branding) — 임베드와 OG에서의 일관성

각 임베드·OG 카드는 *어디서 왔는지* 즉시 인지 가능해야 한다.

### 1. 미니멀 브랜드 마크

크기: 16px / 24px / 32px로 stable.
- 텍스트 마크: `📖 Encyclopedia of Color` (한국어: `📖 색채과학 백과사전`)
- 폰트: Cormorant Garamond Italic
- 색상: `--gold-deep` (#8b6a2f)
- 절대 *로고가 시뮬레이션을 가리지 않는다* — 항상 모서리, 항상 작게

### 2. 브랜드 일관성 자동 검증

`scripts/verify-embed-brand.ts`:
- 각 OG 카드 PNG에서 브랜드 마크 영역의 픽셀 해시를 비교
- 변화가 있으면 빌드 실패 — 누군가 임의로 카드 디자인을 변경하지 못하도록

---

## Ⅷ. 성능 & 호환성

### 1. 임베드 번들 사이즈

`/dist/embed/<module-id>.bundle.js` — *호스트 페이지 1개 임베드 당*:

| 항목 | 크기 (gzip) | 비고 |
| :--- | :--- | :--- |
| Loader (`embed/loader.js`) | ≤ 5 KB | 1회만 로드, 캐시 |
| 공통 청크 (math + components + KaTeX CSS) | ≤ 90 KB | 모든 임베드가 공유 캐시 |
| 모듈 본체 (예: snell) | ≤ 5 KB | 모듈마다 |
| **첫 임베드 합계** | **~100 KB** | **이후 임베드는 ~5 KB만 증가** |

### 2. iframe 호환성

- `X-Frame-Options: ALLOWALL` (의도적) — 누구나 임베드 가능
- `Content-Security-Policy: frame-ancestors *` — 동일
- 단, 임베드 페이지 자체는 *민감 정보·로그인·결제* 절대 포함 금지

### 3. SNS 플랫폼별 OG 디버거 통과

각 모듈 PR 머지 전 통과해야 할 검증:

| 플랫폼 | 디버거 |
| :--- | :--- |
| Facebook | https://developers.facebook.com/tools/debug/ |
| X (Twitter) | https://cards-dev.twitter.com/validator |
| LinkedIn | https://www.linkedin.com/post-inspector/ |
| Slack | unfurl preview는 자동 |

빌드 게이트의 `verify-og.ts`가 위 4개에 대해 HEAD 요청으로 카드 응답 확인.

---

## Ⅸ. 구현 로드맵

| Phase | 항목 | 우선순위 |
| :--- | :--- | :--- |
| **P0 — Now** | 1. OG/Twitter 메타 태그 자동 주입 | ⭐⭐⭐ |
| | 2. `?embed=1` 모드 (CSS만으로 chrome hide) | ⭐⭐⭐ |
| | 3. Deep-state URL (슬라이더 ↔ querystring) | ⭐⭐⭐ |
| | 4. 공유 다이얼로그 (URL + iframe 코드 복사) | ⭐⭐ |
| | 5. 골든 5개 모듈에 단일 브랜드 OG PNG | ⭐⭐ |
| **P1 — Phase 1** | 6. Playwright 빌드 단계 OG PNG 자동 생성 | ⭐⭐ |
| | 7. Web Component 임베드 (`loader.js`) | ⭐ |
| | 8. iframe 자동 리사이즈 postMessage 프로토콜 | ⭐ |
| | 9. BibTeX/RIS 인용 자동 다운로드 | ⭐ |
| **P2 — Scale** | 10. 동적 OG 이미지 (서버리스 + deep-state) | ⭐ |
| | 11. Schema.org LearningResource 자동 주입 | ⭐ |
| | 12. SNS 플랫폼별 OG 디버거 자동 회귀 | ⭐ |

---

## Ⅹ. 부록 A — 모듈 폴더 추가 파일 명세

각 모듈 폴더에 *2개 파일 추가*:

```
src/modules/<cat>/<entry>/
  ├── index.html
  ├── main.ts
  ├── style.css
  ├── meta.json
  ├── refs.bib
  ├── og-state.json     ← NEW: OG capture state
  └── og-description.md ← NEW: OG/Twitter description text
```

### og-state.json 예시

```json
{
  "default": { "theta1": 30, "n1": 1.0, "n2": 1.52 },
  "hero":    { "theta1": 42, "n1": 1.0, "n2": 1.50 },
  "comment": "Hero state captures the moment just past the critical angle."
}
```

Playwright는 `hero` 상태로 OG PNG를 캡처한다.

### og-description.md 예시

```markdown
---
title:
  en: Snell's Law Refractometer
  ko: 스넬의 법칙 굴절계
description:
  en: Drag the incident ray and watch the refracted angle obey n₁ sin θ₁ = n₂ sin θ₂ in real time, including total internal reflection past the critical angle.
  ko: 입사 광선을 끌어 움직이면 굴절 광선이 n₁ sin θ₁ = n₂ sin θ₂에 따라 재균형을 이루는 모습을 실시간으로 확인한다.
twitter:
  hashtags: ["physics", "optics", "interactive"]
---
```

빌드 시 `inject-social-meta.ts`가 이 파일들을 `index.html`의 `<head>`에 자동 주입한다.

---

## 부록 B — 단일 청취 효과 (Single-Asset Virality) 사례 설계

골든 5개 중 *가장 바이럴 가능성 높은 모듈*과 그 캡처 전략:

| 모듈 | Hero 상태 | 캡션 | 예상 도달 |
| :--- | :--- | :--- | :--- |
| `sky-color` | 노을 (elev = -2°) | "Drag the sun and watch the spectrum bend" | ★★★★★ |
| `cvd-everyday` | Protanope 모드 + 빨강·녹색 비교 | "1 in 12 men sees these as the same colour" | ★★★★★ |
| `snells-law` | Critical angle (42°) | "The exact angle light stops escaping water" | ★★★★ |
| `soap-bubble` | d=420nm (보라/녹색 경계) | "Same soap, different thickness — different colour" | ★★★ |
| `sine-anatomy` | (input 모듈) | (낮음) | ★★ |

→ `sky-color`와 `cvd-everyday`는 *반드시 1200×630과 1080×1080을 모두* 빌드 단계에서 생성.

---

> 본 아키텍처는 살아 있는 사양이다. 5개 골든 모듈에 P0 항목이 구현되는 즉시 본 문서를 *실측 데이터로* 갱신한다 (실제 OG 카드 클릭율, 임베드 사용 사례).
