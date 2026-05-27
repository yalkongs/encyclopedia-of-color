# Module Production Plan — 잔여 505개 모듈 양산 계획서

> 현재 13/518 구현 (2.5%). 남은 **505개 모듈**의 양산 전략, 7단계 로드맵, 인프라 의존성, 자원 추정, 위험 관리.

| 관계 문서 | 역할 |
| :--- | :--- |
| `module_catalog.md` | 권위 출처 — 모듈 ID, 제목, 분류, 교과서 인용 |
| `module_specification.md` | 모듈 양식 규약 |
| `embedding_and_sharing.md` | 임베드/공유 인프라 |
| **`production_plan.md` (본 문서)** | **양산 순서·인프라·일정·위험** |

---

## Ⅰ. 현재 상태 (Baseline)

### 1. 구현 완료 (13/518)

| Domain | 구현 | 잔여 | 비율 |
| :--- | --- | --- | --- |
| **D1 Optics** | 12 | 111 | 9.8% |
| **D2 Vision** | 1 | 59 | 1.7% |
| D3 Chemistry | 0 | 38 | 0% |
| D4 Colorimetry | 0 | 40 | 0% |
| D5 Design | 0 | 38 | 0% |
| D6 Display | 0 | 37 | 0% |
| D7 Print | 0 | 30 | 0% |
| D8 Anthropology | 0 | 27 | 0% |
| D9 Biology | 0 | 43 | 0% |
| D10 Imaging | 0 | 37 | 0% |
| D11 Computational | 0 | 25 | 0% |
| D12 Psychology | 0 | 20 | 0% |
| **합계** | **13** | **505** | **2.5%** |

### 2. 이미 갖춰진 인프라 (재사용 자산)

`@core/*`가 모듈 양산의 *한계 비용*을 결정짓는다. 현재 보유:

- **수학** (`@core/math/`): CMF 1931 2°, 표준 광원 (D65/D50/A/E), Planck 복사 + xy 궤적, 분광→XYZ→sRGB, Snell·Fresnel·Cauchy·Rayleigh·박막간섭, Brettel CVD.
- **컴포넌트** (`@core/components/`): canvas-stage, module-shell, slider, toggle, citation-footer, share-dialog.
- **렌더 헬퍼** (`@core/render/`): KaTeX, old-book 테마 토큰, axis style.
- **상태 관리** (`@core/state/`): deep-state URL, embed 모드 감지.
- **자동화 스크립트** (`scripts/`): new-module, inject-meta, generate-og, verify-og, og-server.
- **배포 인프라**: Vercel + GitHub auto-deploy.

→ **D1·D2·D4의 약 70%는 추가 인프라 없이 즉시 양산 가능**.

---

## Ⅱ. 전략적 원칙

### 1. 양산 가속의 3원칙

| 원칙 | 설명 |
| :--- | :--- |
| **인프라 재사용 우선** | 새 수학 함수를 작성하기 전에, 기존 `@core/math/*`로 표현 가능한 모듈을 먼저 양산. |
| **배치 동일 패턴** | 비슷한 인터랙션 구조의 모듈을 묶어 한 배치에서 양산. 학습효과는 *각 모듈*이 아니라 *경로*에서 발생. |
| **3-Tier 차등 품질** | Headliner는 손으로 다듬고, Atom은 스캐폴드만으로 충분. 평균 시간을 *제곱 비율*로 단축. |

### 2. Tier별 평균 제작 시간 (실측 기반 보정)

골든 5개 + 신규 8개로 검증된 실측치:

| Tier | 평균 시간 | 코드량 | 산출 비율 (목표) |
| :--- | :---: | :---: | :---: |
| **Atom** (L1, 단일 슬라이더) | **3~5 h** | ~120 lines | 65% (330개) |
| **Reference** (L2~L4, 2~4 슬라이더) | **6~10 h** | ~200 lines | 30% (152개) |
| **Headliner** (L1/L2, 마케팅 포인트) | **15~30 h** | ~300 lines + a11y + ko | 5% (23개) |

### 3. 인프라 신규 개발 vs 모듈 양산의 시간 분리

규칙: 각 단계마다 *총 시간의 20%를 인프라 빌드*, 80%를 모듈 양산. 인프라 빌드가 끝나면 그 단계의 모듈은 *지수적으로 빠르게* 양산된다.

---

## Ⅲ. 7단계 양산 로드맵

총 17개월(1.5 FTE 기준) 또는 8개월(3 FTE 기준). 각 단계는 *독립적으로 출시 가능*한 마일스톤이다.

### Phase 1 — D1 Optics 완성 (목표: 3개월, 99개 모듈)

> 인프라가 이미 완비된 영역. *최단 시간으로 가장 많이 양산*.

| Batch | 모듈 수 | 카테고리 | 신규 인프라 |
| :---: | :---: | :--- | :--- |
| 1.1 | 12 | `light-basics`, `light-propagation` 잔여 | 없음 |
| 1.2 | 8 | `wave-fundamentals` 잔여 | 없음 |
| 1.3 | 5 | `em-fundamentals` 신규 카테고리 | EM 벡터 시각화 헬퍼 |
| 1.4 | 11 | `reflection-lab`, `refraction-snell` 잔여 | 없음 |
| 1.5 | 4 | `total-internal-reflection` 잔여 | 에바네센트 감쇄 함수 |
| 1.6 | 4 | `prism-dispersion`, `atmospheric-optics` 잔여 | Sellmeier 함수, RK4 ODE 솔버 |
| 1.7 | 5 | `wave-interference` 잔여 | Fabry-Perot finesse, Lloyd 거울 |
| 1.8 | 8 | `light-diffraction` 잔여 | Bessel J₁ 함수, Fresnel zone |
| 1.9 | 9 | `wave-polarization` 잔여 | Stokes/Poincaré 3D, Jones 행렬 |
| 1.10 | 6 | `particle-scattering` 잔여 | Mie 산란 (룩업 테이블) |
| 1.11 | 5 | `planckian-radiation` 잔여 | V(λ)/V'(λ) 데이터, 광도 단위 변환 |
| 1.12 | 9 | `geometric-optics`, `aberrations`, `coherence`, `fourier-optics`, `modern-optics` 신규 카테고리 | 렌즈 광선 추적, 광간섭계 |

**산출**: D1 100% (123개 완료) + 신규 인프라 8개 (`em-fundamentals`, Sellmeier, RK4, Bessel, Mie, V(λ), 렌즈 추적, 광간섭).

### Phase 2 — D2 Vision + D4 Colorimetry 동시 완성 (목표: 2.5개월, 99개 모듈)

> 두 도메인이 *시각 생리학 ↔ 측색학*으로 강결합. 공유 인프라 한 번에 빌드.

| Batch | 모듈 수 | 도메인 | 신규 인프라 |
| :---: | :---: | :--- | :--- |
| 2.1 | 5 | D2 `vision-anatomy-basics` | SVG 안구 단면도 |
| 2.2 | 8 | D2 `rods-adaptation`, `cones-sensitivity` 잔여 | LMS 데이터, 시감도 곡선 |
| 2.3 | 6 | D2 `receptive-fields` 잔여 | DoG 필터, Hermann grid |
| 2.4 | 8 | D2 `cortical-vision`, `motion-and-color` | V1 컬럼 시각화, 운동·색 분리 |
| 2.5 | 8 | D2 `opponent-process`, `color-constancy` 잔여 | Von Kries CAT, Retinex |
| 2.6 | 6 | D2 `visual-illusions-library` | Bach 착시 카탈로그 |
| 2.7 | 6 | D2 `nonlinear-visual-shifts`, `macadam-jnd` 잔여 | CIEDE2000, MacAdam 타원 데이터 |
| 2.8 | 4 | D2 `color-vision-deficiency` 잔여 | Brettel pipeline 확장 |
| 2.9 | 6 | D4 `cie-1931-matching`, `xyz-transformation` | rgb→XYZ 등색 실험 재현 |
| 2.10 | 9 | D4 `color-space-slicer` 잔여 (xyY/Lab/Luv/u'v'/HSV/Munsell/NCS/Ostwald) | 3D 색공간 슬라이서 (WebGL) |
| 2.11 | 6 | D4 `oklch-harmony-explorer`, `delta-e` 잔여 | OKLCH 균일 팔레트, CIEDE2000 |
| 2.12 | 8 | D4 `gamut-mapping-3d`, `hdr-color-spaces`, `icc-color-management`, `color-appearance-models` | 색역 3D CSG, ITP/Jzazbz, ICC 사슬, CAM02 |
| 2.13 | 19 | D4 잔여 | (위 카테고리 추가 모듈) |

**산출**: D2 100% (60개) + D4 100% (40개) + 신규 인프라 10개 (3D 색공간 슬라이서가 가장 큰 작업).

### Phase 3 — D5 Design + D6 Display (목표: 3개월, 75개 모듈)

> 디자이너·개발자 청중의 핵심. *바이럴 가능성 가장 높은 영역*.

| Batch | 모듈 수 | 도메인 | 신규 인프라 |
| :---: | :---: | :--- | :--- |
| 3.1 | 8 | D5 `historical-color-systems` | 역사 색상환 SVG 라이브러리 |
| 3.2 | 7 | D5 `ittens-contrasts` | 7대비 그리드 컴포넌트 |
| 3.3 | 6 | D5 `spatial-balance-ui`, `apca-contrast-matcher` | **APCA Lc 계산기** (큰 작업) |
| 3.4 | 4 | D5 `color-harmony-generator` | Tailwind/ASE 내보내기 |
| 3.5 | 7 | D5 `data-viz-palettes` | ColorBrewer/Viridis/Cinema LUT |
| 3.6 | 6 | D5 `typography-color-interaction` | 폰트 두께·배경 매트릭스 |
| 3.7 | 8 | D6 `display-panel-physics`, `subpixel-rendering` | 서브픽셀 확대경, OLED SPD |
| 3.8 | 3 | D6 `gamma-eotf-calibration` | EOTF 곡선 라이브러리 |
| 3.9 | 5 | D6 `hdr-pq-tone-mapping`, `blue-light-circadian` | PQ ST 2084, HLG, Reinhard/ACES/Hable |
| 3.10 | 6 | D6 `emerging-display-tech` | E-Ink, Mini-LED, microLED, DLP 시각화 |
| 3.11 | 8 | D6 `os-color-management`, `display-measurement` | OS 컬러 파이프라인, ColorChecker |
| 3.12 | 7 | D5 잔여 (Bauhaus, 점묘 광학 혼합 등) | — |

**산출**: D5 100% (38개) + D6 100% (37개) + 인프라 7개 (APCA, ColorBrewer, EOTF, PQ, ColorChecker).

### Phase 4 — D7 Print + D10 Imaging (목표: 3개월, 67개 모듈)

> 인쇄·촬영 워크플로우 청중. 인프라가 *알고리즘 무거움*.

| Batch | 모듈 수 | 도메인 | 신규 인프라 |
| :---: | :---: | :--- | :--- |
| 4.1 | 7 | D7 `halftoning-am-fm`, `moire-screen-angles` | 망점 렌더러, 모아레 패턴 |
| 4.2 | 6 | D7 `four-color-separation`, `dot-gain-absorbance` | RGB→CMYK 분판, Murray-Davies |
| 4.3 | 4 | D7 `security-ink-tilter`, `extended-gamut-print` | Bragg 다층, CMYKOGV |
| 4.4 | 7 | D7 `specialty-print`, `print-3d-color` | 메탈릭/홀로/UV 잉크, 멀티젯 색상 |
| 4.5 | 6 | D7 `print-color-management` | G7, ISO 12647, ICC 프루핑 |
| 4.6 | 5 | D10 `imaging-basics`, `camera-optics` | 핀홀↔렌즈 비교, 보케 |
| 4.7 | 6 | D10 `sensor-physics` | **Bayer 디모자이크** (큰 작업) |
| 4.8 | 4 | D10 `white-balance-algorithms` | Gray World, Retinex, MaxRGB |
| 4.9 | 4 | D10 `camera-color-pipeline` | RAW→IDT→ACEScg, DNG ColorMatrix |
| 4.10 | 3 | D10 `film-emulation` | 흑백/컬러 필름 톤커브 |
| 4.11 | 4 | D10 `color-grading` | Lift/Gamma/Gain 휠, 3D LUT |
| 4.12 | 4 | D10 `exposure-photometry`, `computational-photography` | Zone System, HDR bracket |
| 4.13 | 7 | D7+D10 잔여 | — |

**산출**: D7 100% (30개) + D10 100% (37개) + 인프라 8개 (Bayer 디모자이크가 가장 큰 작업).

### Phase 5 — D3 Chemistry + D9 Biology (목표: 3개월, 81개 모듈)

> *가장 어려운* 영역. 분자 시각화 인프라 필요.

| Batch | 모듈 수 | 도메인 | 신규 인프라 |
| :---: | :---: | :--- | :--- |
| 5.1 | 7 | D3 `molecular-orbitals` | **분자 구조 SVG 라이브러리** (큰 작업) |
| 5.2 | 7 | D3 `dyes-chemistry` | 매염제 킬레이트 구조, pH 적정 |
| 5.3 | 3 | D3 `wetting-effect` | BRDF 시각화 |
| 5.4 | 2 | D3 `kubelka-munk-mixer` | K-M 계수 데이터 (20개 안료) |
| 5.5 | 4 | D3 `pigment-degradation` | UV 광분해 동역학 |
| 5.6 | 6 | D3 `luminescence-chemistry`, `color-centers`, `band-gap-materials` | 형광/인광 Jablonski, 반도체 밴드갭 |
| 5.7 | 9 | D3 `causes-of-color-intro`, 잔여 | Nassau 15원인 투어 |
| 5.8 | 7 | D9 `photosynthesis-pigments` | 엽록소 흡수, 카로테노이드, 피코에리트린 |
| 5.9 | 6 | D9 `bioluminescence`, `fluorescent-proteins` | GFP β-barrel, 발광 메커니즘 |
| 5.10 | 7 | D9 `non-human-vision`, `chromatophores` | 갯가재 12채널, 카멜레온 결정 |
| 5.11 | 7 | D9 `structural-color-bio` | Morpho 다층, 공작 광결정, 오팔 격자 |
| 5.12 | 6 | D9 `human-skin-melanin`, `plant-colors` | 멜라닌 흡수, 안토시아닌 pH |
| 5.13 | 10 | D3+D9 잔여 | — |

**산출**: D3 100% (38개) + D9 100% (43개) + 인프라 6개 (분자 시각화가 가장 큰 작업).

### Phase 6 — D8 + D11 + D12 (목표: 2.5개월, 72개 모듈)

> *비물리* 도메인. 데이터·UI 중심.

| Batch | 모듈 수 | 도메인 | 신규 인프라 |
| :---: | :---: | :--- | :--- |
| 6.1 | 4 | D8 `language-color-evolution` | Berlin-Kay 11단계 지도, 반응시간 측정 |
| 6.2 | 6 | D8 `ancient-pigment-chemistry` | 교역로 지도, 분자 구조 재사용 |
| 6.3 | 2 | D8 `indigo-oxidation` | 산화 동역학 시각화 |
| 6.4 | 3 | D8 `synthetic-dye-history` | Perkin/Prussian 합성 경로 |
| 6.5 | 7 | D8 `ancient-mineral-pigments`, `color-in-religion-and-politics` | 광물 박물관 UI, 역사 인포그래픽 |
| 6.6 | 5 | D8 잔여 | — |
| 6.7 | 6 | D11 `convolutions-and-filters` | **2D 컨볼루션 엔진** (큰 작업) |
| 6.8 | 4 | D11 `color-quantization` | k-means in Lab, Median Cut, Octree |
| 6.9 | 4 | D11 `dithering` | Floyd-Steinberg, Atkinson, Bayer, Blue-noise |
| 6.10 | 3 | D11 `color-segmentation-and-cv` | GrabCut, SLIC, 크로마키 |
| 6.11 | 4 | D11 `color-compression` | JPEG YCbCr 4:2:0, DXT/BC, AVIF 비교 |
| 6.12 | 4 | D11 `color-and-ml` | CNN 컬러라이제이션 데모 |
| 6.13 | 4 | D12 `attention-and-perception` | **반응시간 측정 인프라**, Stroop |
| 6.14 | 4 | D12 `color-and-emotion` | 시각 자극 + 설문 |
| 6.15 | 4 | D12 `marketing-and-branding` | A/B 비교 인프라 |
| 6.16 | 4 | D12 `synesthesia-and-cross-modal`, `color-and-memory-cognition` | 공감각·기억 색 실험 |

**산출**: D8 100% (27개) + D11 100% (25개) + D12 100% (20개) + 인프라 5개 (컨볼루션 엔진, RT 측정이 큰 작업).

### Phase 7 — Polish + Archive + Validate (목표: 1개월)

이미 모듈 양산은 완료. 마지막 단계:

| 작업 | 산출 |
| :--- | :--- |
| 518개 모듈 시각 회귀 테스트 (Playwright 자동 캡처) | `dist/visual-snapshots/` |
| `verify-cie.ts` 모든 모듈 통과 게이트 | CI fail-fast |
| 한국어 번역 완성 (Headliner 23개 + Reference 152개 일부) | `ko.json` 확장 |
| Zenodo DOI 발급 | 518개 영구 DOI |
| Internet Archive 미러링 | 분기별 자동 푸시 |
| 인쇄용 PDF 도록 생성 | 박물관 출판물 후보 |
| 학습 경로 5개 큐레이션 (light-to-color, designers-path, color-in-nature, print-workflow, civilization-of-color) | `/paths/*` 페이지 |
| README/CHANGELOG/CONTRIBUTING 작성 | 외부 기여자 영입 준비 |

---

## Ⅳ. 신규 인프라 의존성 그래프

각 Phase에서 빌드해야 할 인프라를 *의존성 순서*로 정렬:

```
Phase 1
├── em-vector-3d.ts              (E·B 직교 진동)
├── ray-tracer-2d.ts             (렌즈 광선 추적)
├── runge-kutta-4.ts             (대기 굴절 ODE)
├── bessel-j1.ts                 (Airy 디스크)
├── mie-scattering-lut.ts        (사전 계산 룩업)
└── sellmeier.ts                 (정밀 분산)

Phase 2
├── lms-data.ts                  (Stockman-Sharpe)
├── von-kries-cat.ts             (색채 적응)
├── retinex.ts                   (Land 이론)
├── ciede2000.ts                 (가중 색차)
├── macadam-ellipses.ts          (25개 타원 데이터)
├── brettel-pipeline.ts          (확장 CVD)
├── color-space-3d.ts            (WebGL2 슬라이서)  ★ 큰 작업
├── icc-profile-chain.ts         (PCS 변환)
└── ciecam02.ts + ciecam16.ts    (외관 모델)

Phase 3
├── apca-lc.ts                   (APCA Lc 계산)  ★ 큰 작업
├── colorbrewer-data.ts          (35개 팔레트)
├── eotf-curves.ts               (Gamma 2.2/PQ/HLG)
├── tone-mapping.ts              (Reinhard/ACES/Hable)
├── subpixel-geometry.ts         (Stripe/PenTile/Delta)
└── color-checker-24.ts          (X-Rite 데이터)

Phase 4
├── halftone-renderer.ts         (AM/FM 디더링)
├── moire-pattern.ts             (벡터 주파수)
├── cmyk-separation.ts           (RGB→CMYK 분판)
├── murray-davies.ts             (도트 게인)
├── bayer-cfa.ts                 (디모자이크)  ★ 큰 작업
├── lut-3d.ts                    (3D LUT 보간)
└── zone-system.ts               (Adams Zone)

Phase 5
├── molecule-svg.ts              (분자 구조 라이브러리)  ★ 큰 작업
├── jablonski-diagram.ts         (형광/인광)
├── km-coefficients.ts           (20개 안료 K, S)
├── photonic-crystal.ts          (광결정 격자)
├── cone-sensitivities-animals.ts (조류·갯가재 LMS)
└── melanin-absorption.ts        (eu/pheo)

Phase 6
├── timeline-map.ts              (역사 지도)
├── conv-engine-2d.ts            (이미지 컨볼루션)  ★ 큰 작업
├── k-means-lab.ts               (양자화)
├── dithering-algorithms.ts      (Floyd-S/Atkinson/Bayer/blue-noise)
├── grabcut-slic.ts              (CV 알고리즘)
├── reaction-time.ts             (정확한 RT 측정)  ★ 큰 작업
└── quiz-framework.ts            (Stroop 등)
```

**총 신규 인프라 모듈: 44개**. 모듈 양산 시간의 약 18%가 인프라 빌드에 투입된다.

---

## Ⅴ. 자원 추정 (Workload Estimate)

### 1. 시간 추정 (낙관 / 현실 / 비관)

| 항목 | 계산 | 낙관 | 현실 | 비관 |
| :--- | :--- | ---: | ---: | ---: |
| **Atom × 330개** | 평균 시간 × 개수 | 990h (3h) | 1,320h (4h) | 1,650h (5h) |
| **Reference × 152개** | | 912h (6h) | 1,216h (8h) | 1,520h (10h) |
| **Headliner × 23개** | | 345h (15h) | 460h (20h) | 690h (30h) |
| **신규 인프라 × 44개** | | 660h (15h) | 1,100h (25h) | 1,760h (40h) |
| **번역 (en→ko) Reference+ 의무** | 175개 × 1.5h | 260h | 340h | 440h |
| **시각 회귀·a11y·verify 회복** | 모듈당 0.5h × 518 | 260h | 380h | 520h |
| **데이터 큐레이션 (CIE/ASTM)** | | 80h | 120h | 200h |
| **문서·CHANGELOG·DOI** | | 60h | 100h | 160h |
| **합계** | | **3,567h** | **5,036h** | **6,940h** |

### 2. 일정 추정 (FTE 기준)

| 인력 | 주당 가용 시간 | 현실 시간 (5,036h) ÷ 인력 | 일정 |
| :--- | ---: | ---: | ---: |
| 1 FTE | 40h | 126주 | **약 29개월** |
| 1.5 FTE (현 가정) | 60h | 84주 | **약 19개월** |
| 3 FTE | 120h | 42주 | **약 10개월** |
| 5 FTE | 200h | 25주 | **약 6개월** |

> 핸드오프·리뷰·테스트 오버헤드를 고려하면 3 FTE 이상에서 **인력 추가의 한계 효용이 급감**한다 (Brooks's Law). 3 FTE가 현실적 최적.

### 3. 단계별 예산 (FTE 기준 시간)

| Phase | 모듈 | 신규 인프라 | 모듈 시간 | 인프라 시간 | 총 시간 | 1.5 FTE 기간 |
| :---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 99 | 8 | 470h | 200h | 670h | 3.0개월 |
| 2 | 99 | 10 | 510h | 250h | 760h | 3.3개월 |
| 3 | 75 | 7 | 540h | 175h | 715h | 3.1개월 |
| 4 | 67 | 8 | 480h | 200h | 680h | 3.0개월 |
| 5 | 81 | 6 | 630h | 150h | 780h | 3.4개월 |
| 6 | 72 | 5 | 500h | 125h | 625h | 2.7개월 |
| 7 | 폴리시 | — | — | — | 280h | 1.2개월 |
| **합계** | **505** | **44** | **3,130h** | **1,100h** | **4,510h** + 526h(번역·테스트·문서) ≒ **5,036h** | **19.7개월** |

---

## Ⅵ. 위험 등록부 (Risk Register)

| ID | 위험 | 확률 | 영향 | 완화책 |
| :--- | :--- | :---: | :---: | :--- |
| R1 | 분자 시각화(Phase 5) 인프라 비용 폭증 | 높음 | 큼 | 외부 SVG 라이브러리 평가 (RDKit-JS, ChemDoodle). 자체 빌드 시 최소 셋(15분자) 우선 |
| R2 | 색역 3D 슬라이서(Phase 2) WebGL2 호환성 | 중간 | 큼 | Canvas2D 폴백 + WebGPU 준비 |
| R3 | 한국어 번역 백로그 | 높음 | 중간 | Tier별 차등 (Atom은 en-only 허용, 외부 기여자 PR) |
| R4 | 시각 일관성 표류 | 높음 | 중간 | Playwright 시각 스냅샷 회귀 (Phase 7) |
| R5 | 단일 작업자 burnout | 중간 | 큼 | 3 FTE 또는 PhET 모델(외부 기여자 + GitHub PR) |
| R6 | CIE/ASTM 데이터 라이선스 분쟁 | 낮음 | 큼 | 모든 데이터는 인용·재배포 가능 형태로 저장, 헤더에 출처 명시 |
| R7 | Vercel 빌드 시간 한계 (45분) | 중간 | 중간 | OG 생성을 별도 워크플로로 분리 (이미 적용) |
| R8 | 모듈 중복·redundancy | 중간 | 작음 | 분기마다 카탈로그 리뷰, *see_also*로 통합 |
| R9 | 학술 정확성 회귀 | 낮음 | 큼 | `verify-cie.ts` 모든 PR 게이트 |
| R10 | 5,036h 추정의 30% 초과 | 중간 | 큼 | 분기별 burndown 차트, Phase 1 끝나면 평균 시간 재측정 |

---

## Ⅶ. 양산 가속 프로세스 (Process Improvements)

매 Phase마다 *프로세스 자체*를 개선해 평균 시간을 단축.

### Phase 1 종료 직후

- **시뮬레이션 템플릿 라이브러리** — 빈도 높은 패턴 5종을 `@core/sims/` 클래스로 추상화
  - `SliderDrivenPlot` (1축 함수 시각화)
  - `RayTraceScene` (광선 추적 + 좌표계)
  - `WaveSuperposition` (2~N 파동 합성)
  - `SpectralIntegration` (분광 → XYZ → sRGB)
  - `ParameterCompare2x2` (2×2 비교 그리드)

### Phase 2 종료 직후

- **자동 i18n 추출** — `data-i18n` 키를 모든 모듈에서 수집해 ko.json 빈 슬롯 자동 생성
- **모듈 메타 schema v3 검토** — meta.json에서 부족한 필드 보강

### Phase 3 종료 직후

- **임베드 분석 대시보드** — Vercel Analytics + 모듈별 임베드 호출 추적

### Phase 5 종료 직후

- **외부 기여자 영입** — PR 템플릿, CONTRIBUTING.md, 새 모듈 부트캠프 가이드

---

## Ⅷ. 성공 기준 (Definition of Done) — Phase별

각 Phase는 다음을 **모두** 통과해야 다음 Phase로 진행:

1. **품질 게이트**
   - [ ] `npx tsc --noEmit` 통과
   - [ ] `npm run verify:og` 모든 Phase 모듈 통과
   - [ ] `npm run build` 깔끔 (경고 0)
   - [ ] axe-core critical/serious 0건

2. **콘텐츠 게이트**
   - [ ] 모듈 100% scaffolded → implemented (status="shipped")
   - [ ] OG 카드 1200×630 + 1080×1080 둘 다 생성
   - [ ] 본문에 textbook 1차 인용 명시
   - [ ] verify-cie.ts 4자리 정합

3. **배포 게이트**
   - [ ] Vercel 자동 배포 성공
   - [ ] 5개 SNS 플랫폼(X·FB·LinkedIn·Slack·KakaoTalk) OG 카드 정상 unfurl

4. **사용자 검증**
   - [ ] 외부 사용자 5명 휴리스틱 테스트
   - [ ] 모바일 임베드 1건 이상 (가능하면 실제 블로그·LMS)

5. **회고**
   - [ ] Phase별 평균 시간 실측 vs 추정
   - [ ] burndown 그래프 업데이트
   - [ ] 다음 Phase 자원 재추정

---

## Ⅸ. 즉시 시작 가능한 다음 배치 (Batch 1.1)

본 계획서 작성 직후, 인프라 추가 없이 즉시 양산할 수 있는 12개 D1 모듈:

| 모듈 ID | Tier | Bloom | 기존 인프라 |
| :--- | :--- | :---: | :--- |
| `light-basics/what-is-light` | atom | L1 | (텍스트+SVG만) |
| `light-basics/additive-rgb-mixing` | atom | L1 | spectralToXYZ |
| `light-basics/subtractive-cmy-mixing` | atom | L1 | spectralToXYZ |
| `light-basics/light-speed-finite` | atom | L1 | (애니메이션) |
| `light-propagation/umbra-penumbra` | reference | L2 | shadow-size 확장 |
| `light-propagation/pinhole-camera` | reference | L3 | 핀홀 광선 추적 |
| `light-propagation/fermats-principle` | reference | L4 | 최소 시간 경로 |
| `light-propagation/huygens-fresnel` | reference | L3 | 파면 합성 |
| `wave-fundamentals/sine-anatomy` | (구현됨) | — | — |
| `wave-fundamentals/beat-frequency` | atom | L3 | 두 파 합성 |
| `wave-fundamentals/standing-wave` | atom | L3 | 반사 합성 |
| `wave-fundamentals/wave-packet` | reference | L4 | 군속도 시각화 |
| `wave-fundamentals/doppler-effect` | reference | L3 | 광원 운동 |

**이 12개의 예상 시간: 약 50h** (1주일 1 FTE 또는 3일 3 FTE).

---

## Ⅹ. 한 줄 요약

> **현재 13/518 (2.5%) → 잔여 505개를 7단계로 양산. 1.5 FTE × 20개월 또는 3 FTE × 10개월. 신규 인프라 44종 빌드가 핵심 병목. Phase 1은 인프라 재사용 100%로 가장 빠르게 진행 가능.**

이 계획서는 *살아 있는 문서*다. 매 Phase 종료 시 실측 데이터로 갱신한다.
