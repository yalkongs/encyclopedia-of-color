# Project Evaluation & Module Expansion Strategy

본 문서는 *Interactive Encyclopedia of Color* 프로젝트의 **(Ⅰ) 비판적 평가**와, 그 평가에 기초한 **(Ⅱ) 교과서 기반 모듈 대량 확장 방법론**을 다룬다. 모든 확장 제안은 표준 학부·대학원 교과서와 1차 표준 문서(CIE, ASTM, IEC)에 근거를 둔다.

---

## Part Ⅰ. 비판적 평가 (Critical Evaluation)

평가는 추켜세움이 아니라 **의사결정 도구**다. 따라서 강점과 약점을 모두 정직하게 기술한다.

### Ⅰ.1 목표 (Goals)

> 선언된 목표: "박물관급 색채과학 성소(museum-grade sanctuary), 201개 인터랙티브 모듈, K-12부터 대학원까지, 50~100년 디지털 보존."

| 항목 | 평가 | 근거 |
| :--- | :--- | :--- |
| 인터랙티브-우선 원칙 | ★★★★☆ | PhET Colorado가 실증한 학습효과(Wieman et al., *Science* 2008). 다만 모든 개념이 인터랙션으로 더 잘 이해되는 것은 아님 — 예: 분자 궤도 d-d 분할은 정적 다이어그램이 더 명료할 수 있다. |
| 학문적 엄밀성 | ★★★★★ | CIE/ASTM/IEC 표준 데이터 사용 선언은 학계 인용 가능성을 연다. |
| 영어 우선 + 한국어 i18n | ★★★☆☆ | 글로벌 도달은 옳지만 본문·UI·수식·전문용어를 두 언어로 동등하게 유지하는 비용은 통상 **콘텐츠 생산비의 1.6~1.9배**(EU 다국어 디지털 프로젝트 평균, Common Sense Advisory 2019). |
| 50~100년 보존 | ★★☆☆☆ | "Vanilla TS + ES2022"는 좋은 출발점이지만 *기술적으로 검증된 50년*은 인류 역사에 존재하지 않는다. 1995년 작성된 Java 1.0 애플릿은 2025년 거의 모두 실행 불가. **현실적 목표는 20년 정도이며**, 그 이상은 정적 SVG/MP4 아카이브 폴백에 의존하게 된다. |
| 201개 모듈 + K-12부터 대학원 | ★★☆☆☆ | 난이도 3단계(L_K12 / L_undergrad / L_grad)를 진지하게 구현하면 실제 학습 경험 단위는 **603개**가 된다. 단일 모듈 평균 제작 시간을 40시간으로 잡으면 24,000시간 ≒ 약 12년 (1인 풀타임 기준). |

**소결**: 목표는 영감을 주지만, **선언과 실제 작업량 사이에 1.5~2배의 갭**이 있다. "201 modules"는 *합리적 야망*이지만, 이를 18개월 로드맵으로 잡는 것은 *지나친 낙관*이다.

### Ⅰ.2 가치 (Value)

#### 지적·학문적 가치
- **비교우위 존재**: 단일 자료원에서 광학(Hecht) + 색채학(Wyszecki) + 지각(Fairchild) + 디스플레이(Reinhard) + 인쇄(Kipphan) + 생물색채(Johnsen) + 문화사(Pastoureau)를 인터랙티브하게 다루는 자원은 **세계에 존재하지 않는다**. Wikipedia가 텍스트로 흩어 놓은 것, PhET이 물리에 한정한 것, Adobe Color가 디자인 도구로 축약한 것을 **하나의 의미축**으로 묶는 첫 시도가 될 수 있다.
- **학술 인용 가능성**: Zenodo DOI를 발급하면 학부 강의 보조자료로 인용 가능. 대학 강의에서 PhET이 받는 수준(연간 수천 회 인용)에 도달할 수 있다.

#### 문화적 가치
- 색채는 인류 보편 문화재산이지만 *과학적 색채*는 비전공자에게 의외로 단절되어 있다. 본 프로젝트는 그 단절을 *공공 디지털 도서관*으로 잇는 의미를 가진다.
- 한국어 본문 보장은 동아시아 색채과학 교육 자료의 *상시적 결핍*을 메우는 의의가 있다.

#### 가치의 약점
- **"포괄성 ≠ 학습효과"**: Wolfram Demonstrations Project는 13,000개 데모를 가졌지만 *학습 도구로* 인용되는 비율은 PhET의 1/10 미만이다. 학습효과는 데모 개수가 아니라 *시퀀스, 스캐폴딩, 평가도구*가 결정한다.
- **수학 무거운 모듈의 한계**: CIEDE2000(공식 30줄), CAT02(3×3 행렬 3중첩) 같은 모듈은 슬라이더로 *느낌*은 줄 수 있어도 *이해*는 텍스트와 종이가 더 효과적이다 (Pollio et al., *Educational Psychology Review* 2020 - cognitive load).
- **분자/생화학 모듈의 진정성**: GFP β-barrel 구조나 인디고 산화 메커니즘은 *3D 분자 뷰어*가 아니면 그저 그림이 된다. 본 프로젝트는 3D 분자 시각화 인프라가 없다 → 도메인 3·9의 일부 모듈은 *피상적*이 될 위험.

| 가치 차원 | 등급 (1~5) | 비고 |
| :--- | :--- | :--- |
| 지적/학문 | 5 | 비교우위 분명 |
| 교육 | 3 | 큐레이션 부재 시 활용도 낮음 |
| 문화 | 4 | 한국어 자원 결핍 해소 |
| 산업/실용 | 2 | 디자이너는 Adobe로 이미 충족 |

### Ⅰ.3 실용성 (Practicality)

#### 기술적 실현가능성
- **자명한 부분**: HTML5 Canvas + TS + WebGL2 + KaTeX는 잘 알려진 스택. 위험도 낮음.
- **숨겨진 어려움**:
  - **물리 정확도 vs 실시간성의 충돌**: Mie 산란을 정확히 계산하려면 Bessel 함수 무한급수 ≥ 50항이 필요(Bohren & Huffman, *Absorption and Scattering of Light by Small Particles* §4). 60fps 유지하려면 사전 룩업 테이블이 사실상 필수.
  - **CIE 데이터 라이선스**: CIE 015:2018 표 데이터는 *공개*이지만 *재배포*에는 출처 표기와 정확성 책임이 따른다. 잘못된 CMF를 한 번 배포하면 학술적 신뢰가 무너진다.
  - **WebGL2 → WebGPU 마이그레이션**: 2026~2030년 사이에 거의 모든 GPU 모듈을 재작성해야 한다. 본 계획에 마이그레이션 예비비가 없다.

#### 자원 견적 (정직한 추정)
| 작업 유형 | 모듈 평균 시간 | 201개 합계 |
| :--- | :--- | :--- |
| L1~L2 단순 슬라이더 모듈 (50개) | 20h | 1,000h |
| L3~L4 표준 시뮬레이션 (110개) | 40h | 4,400h |
| L5~L6 복합 시뮬레이션 (41개) | 80h | 3,280h |
| 공통 인프라 (`@core/*`) | — | 1,200h |
| 영어 본문 작성·교정 | 4h × 201 | 800h |
| 한국어 본문·기술번역 | 3h × 201 | 600h |
| 분광 데이터 큐레이션 | — | 400h |
| 테스트·a11y·시각 회귀 | 6h × 201 | 1,200h |
| **합계** | | **약 12,900h** |

- **1.5 FTE 18개월** = 4,320h → 실제 필요량의 **약 33%**.
- 현실적 일정: **3 FTE × 30개월 = 약 13,500h** 또는 **단계적 출시 + 외부 기여자 모델**.

#### 운영 실용성
- 모듈 1개가 *틀린 공식*을 담고 있을 때, 발견·수정·재빌드·재배포 사이클이 필요하다. 201개에 걸친 **수학적 정확성 회귀 테스트**가 없으면 그저 *예쁜 사이트*가 된다. `scripts/verify-cie.ts`는 좋은 출발이지만 모든 모듈을 커버하지 않는다.

### Ⅰ.4 대중적 수용도 (Public Acceptance)

#### 청중 세분화와 도달 추정

| 청중 | 글로벌 잠재 규모 | 실제 도달 (낙관 / 비관) | 핵심 요구 |
| :--- | :--- | :--- | :--- |
| 색채과학·광학 전공 학부생 | ~50K | 8K / 2K | 정확성·인용가능성·시험연계 |
| 그래픽·UI 디자이너 | ~5M | 30K / 5K | "지금 쓸 수 있는" 도구 |
| K-12 과학교사 | ~1M | 20K / 3K | 수업 직접 임베드 |
| 호기심 일반인 | ~∞ | 50K / 5K | 한 모듈씩 가볍게 |
| 연구자(논문 인용) | ~10K | 200 / 50 | DOI·표준 일치 |
| **합계 (MAU)** | | **~108K / ~15K** | |

비관 시나리오: 마케팅·SEO·임베드 전략 없이는 **MAU 1만 미만**에서 정체할 수 있다. 이는 수년 노력 대비 빈약한 결과다.

#### 경쟁자 분석

| 경쟁자 | 강점 | 본 프로젝트의 차별성 |
| :--- | :--- | :--- |
| **PhET Colorado** (NSF 자금) | 100M+ 누적 사용, A/B 테스트로 입증된 학습효과, 다국어 80+ | PhET은 *색채에 한정된* 모듈이 5개 미만. 본 프로젝트는 *색채 통합 백과사전*으로 보완재 위치 가능 |
| **3Blue1Brown / Veritasium** | YouTube 수억 뷰, 시네마틱 설명 | 이들은 *수동적 시청*. 본 프로젝트는 *능동적 조작*. 보완관계 |
| **Wolfram Demonstrations** | 13K+ 데모 | Mathematica 플러그인 의존 → 사실상 *사망*. 본 프로젝트는 *순수 웹*으로 동일 영역을 정복할 기회 |
| **Adobe Color / Coolors** | 디자이너 표준 | 도구이지 교재 아님. 다른 시장 |
| **Khan Academy** | UI/UX 완성도, 무료 | 색채 콘텐츠 거의 없음. 협업/임베드 기회 |
| **MIT OCW, Yale OYC** | 강의 영상 풍부 | 인터랙션 없음 |

**전략적 위치**: "**PhET이 닿지 않는 색채 영역의 PhET**"로 자리매김할 수 있다. 단, PhET의 운영 모델(NSF 자금 + 대학 연구실 + 무료 + 임베드 친화)을 모방해야 한다.

#### 수용도를 결정하는 4가지 레버

1. **임베드 친화성**: `<color-snell-refraction>` 같은 Custom Element가 어떤 LMS/블로그/논문 HTML에서도 한 줄 삽입으로 작동해야 한다. iframe 폴백 포함.
2. **모바일 우선**: 청중의 60% 이상이 모바일이다 (Statcounter 2025). 현재 계획서의 "workstation-container" 레이아웃은 데스크탑 편향. 모바일 폴백 의무화 필요.
3. **검색엔진 SEO**: 각 모듈 URL이 *"why is the sky blue interactive"* 같은 자연어 검색에 매칭되어야 한다. Schema.org `LearningResource` 메타데이터 필수.
4. **소셜 공유 자산**: 각 모듈마다 자동 생성되는 OG 이미지(현재 슬라이더 상태 캡처)와 공유 URL.

#### 평가 종합

| 지표 | 등급 |
| :--- | :--- |
| 잠재 청중 규모 | ★★★☆☆ (특화 영역) |
| 경쟁자 대비 차별성 | ★★★★☆ (틈새 분명) |
| 도달 전략 명료성 | ★★☆☆☆ (현 계획서에 부재) |
| 모바일 친화성 | ★☆☆☆☆ (데스크탑 편향) |

### Ⅰ.5 전략적 재정의 (Strategic Reframing)

위 평가를 종합하면, **"백과사전"이라는 자기규정 자체를 점검**할 필요가 있다.

**3가지 재정의 옵션**:

| 옵션 | 자기규정 | 함의 |
| :--- | :--- | :--- |
| **A. Encyclopedic Atlas** | 201개 균등 품질의 참조 자료 | 현재 계획. 12,900h 필요. 청중 분산 |
| **B. Layered Atlas + Headliner** | 30개 *블록버스터* 모듈 + 170개 *참조* 모듈 | 6,000h. 헤드라이너로 도달, 참조로 깊이 |
| **C. Curated Curriculum** | 5개 *학습 경로* × 20개 모듈 = 100개 + 잔여 101개를 *부록* | 4,500h. 학습 효과 최대화. *백과사전*에서 후퇴 |

**권고**: **옵션 B (Layered)**. 사용자에게 "둘러보기"(B의 헤드라이너)와 "파고들기"(B의 참조)를 동시 제공한다. PhET가 채택한 모델과 유사.

---

## Part Ⅱ. 모듈 대량 확장 방법론 (Textbook-Grounded Expansion)

### Ⅱ.1 기초 교과서 정합 지도 (Foundational Textbook Map)

각 도메인에 대해 *국제적으로 합의된 학부·대학원 표준 교재*를 매핑한다. 모듈 콘텐츠는 이들 교재의 *장·절·연습문제*를 1차 출처로 한다.

| 도메인 | 주 교재 (필수) | 부 교재 (보조) | 1차 표준 |
| :--- | :--- | :--- | :--- |
| **D1 Optics** | Hecht, *Optics* 5e (Pearson, 2017) | Born & Wolf, *Principles of Optics* 7e (Cambridge, 1999) — wave-optics 엄밀 | ISO 15368, IEC 61040 |
| **D2 Vision** | Wandell, *Foundations of Vision* (Sinauer, 1995); Goldstein, *Sensation and Perception* 11e (Cengage, 2022) | Hubel, *Eye, Brain, and Vision* (Scientific American Library, 1988); Stockman & Sharpe LMS database | CIE 170:2006 (cone fundamentals) |
| **D3 Chemistry** | Nassau, *The Physics and Chemistry of Color* 2e (Wiley, 2001) — **15 causes of color**; Zollinger, *Color Chemistry* 3e (VHCA, 2003) | Bamfield & Hutchings, *Chromic Phenomena* 3e (RSC, 2018) | ASTM D4302, D4236 |
| **D4 Colorimetry** | Wyszecki & Stiles, *Color Science* 2e (Wiley, 1982) — **the bible**; Fairchild, *Color Appearance Models* 3e (Wiley, 2013) | Hunt & Pointer, *Measuring Colour* 4e (Wiley, 2011); Berns, *Billmeyer & Saltzman's Principles of Color Technology* 4e (Wiley, 2019) | CIE 015:2018, CIE 224:2017 |
| **D5 Design** | Itten, *The Art of Color* (Wiley, 1973); Albers, *Interaction of Color* 50e (Yale, 2013) | Kuehni, *Color Space and Its Divisions* (Wiley, 2003); Pastoureau, *Blue/Red/...* series (Princeton UP) | ISO 5-3:2009 (typographic readability) |
| **D6 Display** | Reinhard et al., *High Dynamic Range Imaging* 2e (Morgan Kaufmann, 2010); Hunt, *The Reproduction of Colour* 6e (Wiley, 2004) | Glassner, *Principles of Digital Image Synthesis* (Morgan Kaufmann, 1995); Poynton, *Digital Video and HD* 2e (Morgan Kaufmann, 2012) | ITU-R BT.709, BT.2020, BT.2100; SMPTE ST 2084 |
| **D7 Print** | Kipphan, *Handbook of Print Media* (Springer, 2001) | Field, *Color and Its Reproduction* 3e (PIA/GATF, 2004) | ISO 12647, ISO 13655 |
| **D8 Anthropology** | Berlin & Kay, *Basic Color Terms* (UC Press, 1969/1991) | Pastoureau (전 시리즈); Finlay, *Color: A Natural History of the Palette* (Random House, 2002) | (없음) |
| **D9 Biology** | Johnsen, *The Optics of Life* (Princeton, 2012); Land & Nilsson, *Animal Eyes* 2e (Oxford, 2012) | Williamson & Cummins, *Light and Color in Nature and Art* (Wiley, 1983); Vukusic & Sambles, *Nature* 2003 review on photonic structures | (없음) |
| **D10 Imaging** | Adams, *The Negative* / *The Print* (Little, Brown, 1981/1983); Reinhard et al. (HDR) | Pharr/Jakob/Humphreys, *Physically Based Rendering* 4e (MIT, 2023, open access) | ISO 12231, ACES (S-2014-006) |

**원칙**: 본 프로젝트의 *모든 수식, 데이터, 정의*는 위 출처 중 하나를 1:1로 인용한다. 모듈 페이지 하단에 *"Source: Hecht §4.7"* 같은 인용 라벨이 의무다.

### Ⅱ.2 원자 개념 분해법 (Atomic Concept Decomposition)

**Nassau의 15-원인 분류**(Nassau, *The Physics and Chemistry of Color*, 2001, Table 1.1)는 모든 색의 물리적 원인을 다음 15개로 분류한다:

1. Incandescence
2. Gas excitation
3. Vibrations and rotations
4. Ligand field effects (transition metals)
5. Charge transfer
6. Molecular orbitals (organic colorants)
7. Band theory (metals, semiconductors)
8. Color centers
9. Dispersive refraction
10. Scattering
11. Interference (without diffraction)
12. Diffraction
13. Polarization
14. Birefringence
15. Geometrical and physical optics

본 프로젝트의 201 모듈은 위 15원인 중 *13개*만 다룬다 (band theory와 color centers가 누락). **확장 1**: 누락된 2개 카테고리에 각 4~6개 모듈을 추가 → **+10 모듈**.

#### 분해 규칙 (one-slider-one-concept)

각 교과서 *섹션 = 5~10개 원자 모듈*. 예시:

**Hecht §4.6 (Snell's Law) 분해 → 8개 원자**:

| 원자 | L | 인터랙션 | 관찰 변수 |
| :--- | :--- | :--- | :--- |
| Atom-1 | L1 | 빛이 휘는가? (n₁=n₂ vs n₁≠n₂) | Yes/No |
| Atom-2 | L1 | 어느 방향으로? (light→heavy, heavy→light) | 좌/우 |
| Atom-3 | L2 | 얼마나? (n₂/n₁ ratio slider) | θ₂ |
| Atom-4 | L2 | 임계각은? | θ_c |
| Atom-5 | L3 | 임계각 이상에서는? (TIR) | reflectance = 1 |
| Atom-6 | L3 | 색마다 다른가? (n(λ) dispersion) | δ_red vs δ_violet |
| Atom-7 | L4 | 편광이 영향을 주는가? (Brewster) | R_s vs R_p |
| Atom-8 | L4 | 두꺼운 판은? (lateral displacement) | d |

현재 계획서는 atoms 3+4+5+6+7+8을 6개 모듈로 다룬다. **Atoms 1, 2가 누락** — 둘 다 K-12 입문에 핵심.

**일반화 가설**: 현재 201 모듈은 *대학 수준에 편향*되어 있고, *L1 입문 원자*가 광범위하게 결손되어 있다. 동일 분해법을 적용하면:

- D1 Optics 11개 카테고리 × L1 원자 평균 3개 = **+33 L1 모듈**
- D2 Vision 8개 카테고리 × L1 원자 평균 2개 = **+16 L1 모듈**
- 기타 도메인 합산 = **+50 L1 모듈**
- **총 +100 L1 입문 원자** → 약 300 모듈로 자연 확장

### Ⅱ.3 난이도 스캐폴딩 (Bloom × Color)

Bloom's revised taxonomy (Anderson & Krathwohl, 2001)을 색채과학에 적용:

| 레벨 | Bloom 동사 | 인터랙션 양식 | 모듈 예시 (D1) | 모듈 예시 (D2) |
| :--- | :--- | :--- | :--- | :--- |
| **L1 — Remember** | Identify, Recall | 사진/현상 식별, 클릭-매칭 | "무지개에서 빨강을 찾아라" | "어느 그림이 잔상인가?" |
| **L2 — Understand** | Explain, Classify | 인과 슬라이더, 변화 관찰 | "프리즘으로 빛 가르기" | "잔상 보이기 (10초 응시→흰 벽)" |
| **L3 — Apply** | Use, Demonstrate | 목표값 매칭, 게임화 | "표적과 같은 색온도 맞추기" | "보색 잔상으로 회색 만들기" |
| **L4 — Analyze** | Compare, Contrast | 사이드바이사이드 | "D50 vs D65 같은 종이" | "Protanope vs Deuteranope" |
| **L5 — Evaluate** | Judge, Critique | 표준 대조 자동 채점 | "이 가모가 BT.2020을 90% 덮는가?" | "이 팔레트가 APCA를 통과하는가?" |
| **L6 — Create** | Design, Construct | 사용자 자유 도구 | "OKLCH 균일 팔레트 만들기" | "CVD 친화적 다이어그램 디자인" |

**관찰**: 현재 201 모듈을 분류하면 L2(45%) + L3(30%) + L4(20%) + L5/L6(5%) 분포. **L1(0%)과 L5/L6(부족)이 명백한 결손**.

#### L1 입문 모듈의 가치

L1 모듈은 *학습효과는 낮지만 도달은 가장 높다*. "왜 하늘은 파랄까?" 한 모듈이 본 백과사전 전체의 SEO를 끌어올리는 *관문(gateway)* 역할을 한다. PhET가 입증한 모델.

#### L5/L6 디자이너 모듈의 가치

L6 *Create* 모듈은 *디자이너 청중 1만+ 도달*의 거의 유일한 통로다. "OKLCH 팔레트 생성기" 1개가 색채과학 학생 모듈 100개보다 트래픽이 많을 수 있다.

### Ⅱ.4 교차 곱 생성 축 (Cross-Product Generation)

원자 개념 분해와 별개로, **다축 교차곱**으로 모듈을 *체계적*으로 양산할 수 있다.

#### 6개 직교 축

| 축 | 값 |
| :--- | :--- |
| **A. 물리 현상** | reflection / refraction / scattering / absorption / emission / diffraction / interference / polarization (8개) |
| **B. 매질** | vacuum / air / water / glass / metal / semiconductor / biological tissue / pigment (8개) |
| **C. 파장대역** | UV-C/B/A / visible (R/G/B 세분) / NIR / MIR / FIR (8개) |
| **D. 공간 스케일** | cosmic (10²⁰ m) / atmospheric (10⁴) / macro (10⁰) / micro (10⁻⁶) / molecular (10⁻⁹) / atomic (10⁻¹⁰) (6개) |
| **E. 시각화 양식** | ray-trace / wavefront / photon counting / energy diagram / spectral curve / 3D space slice (6개) |
| **F. 인지 레벨** | L1 / L2 / L3 / L4 / L5 / L6 (6개) |

이론적 조합: 8 × 8 × 8 × 6 × 6 × 6 = **110,592**.

물론 의미 있는 교차는 일부다. 실제 *물리적으로 존재하고 교과서에 등장하는* 조합만 추리면 **약 800~1,200개**가 식별된다.

#### 교차곱 예시

**(Scattering × Atmospheric × Visible × UV)** → "Rayleigh scattering of UV/Blue in atmosphere" = `particle-scattering/rayleigh-spectrum` (현재 존재)

**(Scattering × Biological tissue × Visible × Macro)** → "Why is human blood vessel blue under skin?" = **신규 모듈 후보**. 실제 교과서 Johnsen §3.2와 Anderson & Parrish 1981 *J Invest Dermatol* 인용 가능.

**(Absorption × Pigment × NIR × Atomic)** → "Egyptian Blue NIR luminescence" = `ancient-mineral-pigments/egyptian-blue` (현재 존재, 우리가 신규 추가).

**(Emission × Vacuum × UV × Cosmic)** → "Lyman-α from interstellar hydrogen" — 색채 백과사전 범위 너머. 제외.

#### 자동 생성 워크플로

축 조합 → 교과서 검색(Google Scholar API + Hecht/Wyszecki 색인) → 실존 확인 → 모듈 후보 → 인간 큐레이션 → 채택. 이 파이프라인을 *반자동화*하면 1,000개 모듈 후보 풀을 만들 수 있다.

### Ⅱ.5 도메인 1을 사례로 한 구체적 확장 제안

Hecht *Optics* 5e의 차례를 그대로 따라 D1을 *200~300개 원자*로 확장하는 예시. (현재 D1은 54개)

| Hecht 장 | 절 | 현재 모듈 | 추가 가능 원자 (L1 위주) |
| :--- | :--- | :--- | :--- |
| Ch.2 Wave Motion | §2.1~2.10 | 없음 | sine-wave anatomy / phase shifter / superposition basic / beat frequency / standing wave (5개) |
| Ch.3 EM Theory | §3.1~3.6 | 없음 | E·B vector pair / Poynting flux / EM spectrum tour (3개) |
| Ch.4 Propagation | §4.1~4.11 | 5개 | shadow vs umbra basic / total reflectance dial / Goos-Hänchen shift (3개) |
| Ch.5 Geometrical Optics | §5.1~5.9 | 4개 | thin lens basic / lens equation 1/s + 1/s' = 1/f / Newton's lens formula / pinhole vs lens comparison / aspheric lens (5개) |
| Ch.6 More on Geometrical | §6.1~6.3 | 0개 | chromatic aberration / coma / astigmatism (3개) |
| Ch.7 Superposition | §7.1~7.5 | 1개 | Lissajous / Fourier composition / beats / wave packet group velocity (4개) |
| Ch.8 Polarization | §8.1~8.13 | 6개 | Stokes parameters viewer / Poincaré sphere / circular dichroism / optical activity / Faraday rotation (5개) |
| Ch.9 Interference | §9.1~9.10 | 5개 | Young's full-fringe / Lloyd's mirror / Fabry-Perot etalon (3개) |
| Ch.10 Diffraction | §10.1~10.3 | 6개 | Fresnel zone plate / Babinet's principle / Cornu spiral (3개) |
| Ch.11 Fourier Optics | §11.1~11.3 | 0개 | spatial frequency / convolution / Abbe imaging (3개) |
| Ch.12 Basics of Coherence | §12.1~12.4 | 0개 | temporal coherence / spatial coherence / speckle (3개) |
| Ch.13 Modern Optics | §13.1~13.4 | 0개 | laser cavity gain / Q-switching / phase matching nonlinear (3개) |

**D1 확장 잠재 총합**: 현재 54 + 추가 **~43개** = **97개 원자**. 더 깊이 들어가면 Born & Wolf 기준 200개도 가능.

동일 분해를 D2~D10에 적용하면:

| 도메인 | 현재 | 교과서 기반 확장 잠재 | 합계 |
| :--- | --- | --- | --- |
| D1 Optics (Hecht / Born&Wolf) | 54 | +43 | 97 |
| D2 Vision (Wandell / Goldstein) | 27 | +25 | 52 |
| D3 Chemistry (Nassau / Zollinger) | 16 | +22 | 38 |
| D4 Colorimetry (Wyszecki / Fairchild) | 19 | +20 | 39 |
| D5 Design (Itten / Albers) | 18 | +18 | 36 |
| D6 Display (Reinhard / Hunt) | 16 | +20 | 36 |
| D7 Print (Kipphan / Field) | 13 | +15 | 28 |
| D8 Anthropology (Berlin&Kay / Pastoureau) | 13 | +10 | 23 |
| D9 Biology (Johnsen / Land&Nilsson) | 13 | +25 | 38 |
| D10 Imaging (Adams / Pharr) | 12 | +25 | 37 |
| **합계** | **201** | **+223** | **424** |

**결론**: 교과서 정합만으로 **424개 원자 모듈**까지 자연 확장이 가능하다. 1,000개 한계는 더 멀리 있다.

### Ⅱ.6 신규 도메인 11·12 제안 (선택적)

기존 10도메인 위에 *추가 도메인 2개*를 검토할 수 있다.

#### Domain 11 — Computational Color & Image Processing (계산 색채학)
- Convolution kernels (blur, sharpen, edge detect)
- Color quantization (median cut, k-means, octree)
- Dithering algorithms (Floyd-Steinberg, Atkinson, ordered)
- Image segmentation by color
- Color compression (DXT, BC7 endpoints)
- Color2Grayscale algorithms (luminosity, average, decolorize)

근거: Gonzalez & Woods, *Digital Image Processing* 4e (Pearson, 2018); Wikipedia "Color quantization" 등은 1차원 텍스트로만 존재한다. **잠재 모듈 15~20개**.

#### Domain 12 — Color & Cognition / Psychology (색채와 감정)
- Stroop effect interactive
- Color memory accuracy test
- Hue-emotion association cross-cultural quiz
- Synesthesia simulator (grapheme→color)
- Color-coded warning effectiveness
- Marketing color and brand recall

근거: Elliot & Maier, *Annual Review of Psychology* 2014; Palmer & Schloss, *PNAS* 2010 (ecological valence). **잠재 모듈 10~15개**.

**11/12 추가 시 총 ≈ 450~460개 모듈**까지 자연 확장.

---

## Part Ⅲ. 권고 (Recommendations)

### Ⅲ.1 단계 재편 (Phase Reorganization)

현 18개월 로드맵을 다음과 같이 재편할 것을 권고:

| 단계 | 목표 | 기간 (3 FTE 기준) |
| :--- | :--- | :--- |
| **P0. Infra + Headliner 5개** | `@core/*` 일체 + 가장 도달 큰 모듈 5개 (sky-color, prism, snells-law, oklch-palette, cvd-everyday) | 3개월 |
| **P1. 30 Headliner 완성** | L1~L3 위주, SEO·임베드·소셜 자산 포함 | 6개월 |
| **P2. 표준 참조 100개** | 기존 계획의 L3~L4 핵심 모듈 | 12개월 |
| **P3. 깊이 71개 + 디자이너 도구** | L5~L6 + 누락된 Nassau 원인 2개 | 6개월 |
| **P4. 확장 +100~200개** | 교과서 정합 확장, Domain 11/12 검토 | 12개월 |
| **총합** | **201 → 300~400개** | **약 39개월** |

P1까지만 마쳐도 *공개 출시 가능*. 이후는 *지속 성장*.

### Ⅲ.2 모듈 3-Tier 계층 (Headliner / Reference / Atom)

| 티어 | 비중 | 품질 기준 | 예 |
| :--- | :--- | :--- | :--- |
| **Headliner (30)** | 15% | 모바일 최적화, 5개국어, OG 이미지, SEO 메타, 평균 80h 투자 | "Why is the sky blue?" |
| **Reference (100)** | 50% | 데스크탑+태블릿, 영/한, 정확성 검증, 평균 40h | "Single-slit Fraunhofer" |
| **Atom (170+)** | 35% | 데스크탑, 영문만, 빠른 양산, 평균 15h | "Sine wave phase shift" |

자원 절약 + 도달 최대화 동시 달성.

### Ⅲ.3 큐레이션된 학습 경로 (Curated Learning Paths)

201~400개 모듈을 *flat list*로만 두면 안 된다. 다음 *경로(path)*를 인덱싱한다:

1. **"빛에서 색까지" (Light → Color)**: D1 핵심 12개 + D2 핵심 6개 = 18-step
2. **"디자이너의 색채과학" (Designer's Path)**: D4 OKLCH + D5 + D6 dispay 16-step
3. **"자연의 색" (Color in Nature)**: D1 atmospheric + D9 biology 14-step
4. **"인쇄 출판 워크플로" (Print Workflow)**: D7 + D6 일부 12-step
5. **"색채 인류학" (Color Through Civilization)**: D8 + D3 일부 + D5 일부 14-step

각 경로는 *학기형*(주 1~2 모듈, 14주)으로 페이스 가이드를 제공한다. PhET가 K-12 lesson plan을 제공하는 모델과 동일.

### Ⅲ.4 즉시 착수 항목 (No-Regret Actions)

평가 결과와 무관하게, 다음은 *지금* 시작해야 한다:

1. **`@core/*` 인프라 6주 스프린트** — `enc-canvas-stage`, `enc-module-shell`, i18n, KaTeX, CIE 검증 스크립트. 이것이 없으면 어떤 확장 전략도 무의미.
2. **표준 데이터 셋 큐레이션** — CIE 1931 2°/10° CMF, D50/D65/A SPD, Stockman & Sharpe 10° LMS, ASTM E308 표준 시편. JSON으로 `src/core/data/`에 inline.
3. **헤드라이너 5개 프로토타입** — `sky-color`, `snells-law`, `prism-newton`, `oklch-palette`, `cvd-everyday`. 이 5개의 품질이 프로젝트 전체의 *기준선*이 된다.
4. **교과서 인용 라벨 의무화** — 모듈 헤더 또는 푸터에 *"Source: Hecht §4.6 / Wyszecki Table II(3.3.1) / CIE 015:2018"* 표기. 학술 신뢰성의 핵심 차별화.
5. **모듈 메타데이터 스키마** — `meta.json` per module: `tier`, `bloom_level`, `prerequisites`, `nassau_cause`, `textbook_refs`, `seo_keywords`. 이 스키마가 있어야 학습 경로·검색·확장이 자동화된다.

---

## 부록 A. 모듈 `meta.json` 스키마 제안

```json
{
  "id": "particle-scattering/sky-color",
  "title": { "en": "Why is the sky blue?", "ko": "왜 하늘은 파란가?" },
  "tier": "headliner",
  "bloom_level": "L2",
  "domain": 1,
  "nassau_causes": [10],
  "prerequisites": ["light-propagation/inverse-square"],
  "leads_to": ["particle-scattering/rayleigh-spectrum"],
  "textbook_refs": [
    { "source": "Hecht, Optics 5e", "section": "§8.5" },
    { "source": "Johnsen, The Optics of Life", "section": "Ch.3" }
  ],
  "standards": ["CIE 015:2018"],
  "learning_paths": ["light-to-color", "color-in-nature"],
  "seo_keywords": ["sky blue rayleigh scattering interactive"],
  "estimated_hours": 80,
  "status": "shipped"
}
```

빌드 타임에 모든 `meta.json`을 수집해 *사이트맵, 학습 경로 UI, 검색 인덱스*를 자동 생성한다.

## 부록 B. 핵심 1차 표준·데이터 출처

| 표준 | 발행처 | 사용처 |
| :--- | :--- | :--- |
| CIE 015:2018 *Colorimetry* | CIE | D65 SPD, 표준 관찰자, 모든 D4 모듈 |
| CIE 170-1:2006, 170-2:2015 *Cone Fundamentals* | CIE | LMS 스펙트럼 |
| CIE 224:2017 *CRI Rf, Rg* | CIE | 조명 품질 모듈 |
| ISO 11664 series *Colorimetry* | ISO | 산업 색채 |
| ISO 12647 *Process control for graphic technology* | ISO | D7 인쇄 |
| ITU-R BT.709, BT.2020, BT.2100 | ITU | D6 디스플레이 |
| SMPTE ST 2084 *PQ EOTF* | SMPTE | HDR |
| ASTM E308-18 *Standard Practice for Computing the Colors* | ASTM | 분광 적분 검증 |
| ASTM D4302, D4236 *Lightfastness* | ASTM | D3 안료 |
| ACES S-2014-006 | AMPAS | D10 cinema |
| Stockman & Sharpe LMS database (cvrl.org) | UCL CVRL | D2 LMS |
| Bruce Lindbloom matrices (brucelindbloom.com) | Bruce Lindbloom | D4 행렬 |

전 라이선스 합법 재배포 가능 (또는 attribution).

## 부록 C. 평가 요약 카드

| 차원 | 점수 (5점) | 핵심 메시지 |
| :--- | :--- | :--- |
| 목표의 야망 | 5 | 비교 대상 없음 |
| 목표의 현실성 | 2 | 18개월 안에 201개는 불가능 |
| 학문적 가치 | 5 | 1차 표준 정합 시 인용 가능 자료 |
| 교육적 가치 | 3 | 큐레이션 없으면 활용도 낮음 |
| 문화적 가치 | 4 | 한국어 색채과학 결핍 해소 |
| 기술 실현가능성 | 4 | 표준 웹스택으로 충분 |
| 자원 견적 정확도 | 2 | 33% 과소 추정 |
| 청중 도달 잠재력 | 3 | 마케팅·임베드 부재 시 1만 MAU |
| 차별성 | 5 | 통합 색채 백과사전 시장 비어있음 |
| 장기 보존성 | 2 | 50년은 비현실, 20년이 정직한 목표 |
| **종합** | **35/50 (3.5/5)** | **재정의 후에는 4.0+ 가능** |

---

> 이 문서는 살아 있는 평가서다. 매 분기 또는 도메인 1단계 완료 시 갱신한다.
