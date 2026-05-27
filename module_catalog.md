# Module Catalog — Interactive Encyclopedia of Color

이 문서는 본 프로젝트의 **모든 모듈의 권위 출처(canonical source)** 다. `implementation_plan.md`의 Section Ⅷ과 `evaluation_and_expansion.md` Part Ⅱ는 본 카탈로그를 참조한다.

## 카탈로그 규칙

- **총 모듈 수**: **500개** (12 도메인). 교과서 정합 천장의 약 70% 수준에서 의미 있는 모듈만 선별.
- **포맷**: `N. \`category/entry\` — English Title [한국어 요약] · L_difficulty · Source`
- **난이도 (Bloom)**: L1=Identify · L2=Understand · L3=Apply · L4=Analyze · L5=Evaluate · L6=Create
- **Source 약어**:
  - **Hecht**: Hecht, *Optics* 5e (2017) — D1 표준
  - **B&W**: Born & Wolf, *Principles of Optics* 7e (1999) — D1 엄밀
  - **W&S**: Wyszecki & Stiles, *Color Science* 2e (1982) — D2/D4 표준
  - **Fairchild**: Fairchild, *Color Appearance Models* 3e (2013)
  - **Wandell**: Wandell, *Foundations of Vision* (1995)
  - **Goldstein**: Goldstein, *Sensation and Perception* 11e (2022)
  - **Hubel**: Hubel, *Eye, Brain, and Vision* (1988)
  - **Nassau**: Nassau, *The Physics and Chemistry of Color* 2e (2001) — 15 causes
  - **Zollinger**: Zollinger, *Color Chemistry* 3e (2003)
  - **Berns**: Berns, *Billmeyer & Saltzman's Principles of Color Technology* 4e (2019)
  - **Hunt**: Hunt, *The Reproduction of Colour* 6e (2004)
  - **Hunt&Pointer**: Hunt & Pointer, *Measuring Colour* 4e (2011)
  - **Reinhard**: Reinhard et al., *High Dynamic Range Imaging* 2e (2010)
  - **Glassner**: Glassner, *Principles of Digital Image Synthesis* (1995)
  - **Poynton**: Poynton, *Digital Video and HD* 2e (2012)
  - **Kipphan**: Kipphan, *Handbook of Print Media* (2001)
  - **Field**: Field, *Color and Its Reproduction* 3e (2004)
  - **Itten**: Itten, *The Art of Color* (1973)
  - **Albers**: Albers, *Interaction of Color* 50e (2013)
  - **Kuehni**: Kuehni, *Color Space and Its Divisions* (2003)
  - **Pastoureau**: Pastoureau, *Blue/Red/Yellow/Black/Green/White* (2000~2022)
  - **B&K**: Berlin & Kay, *Basic Color Terms* (1969)
  - **Finlay**: Finlay, *Color: A Natural History of the Palette* (2002)
  - **Johnsen**: Johnsen, *The Optics of Life* (2012)
  - **Land&Nilsson**: Land & Nilsson, *Animal Eyes* 2e (2012)
  - **W&C**: Williamson & Cummins, *Light and Color in Nature and Art* (1983)
  - **Adams**: Adams, *The Negative* / *The Print* (1981/1983)
  - **PBR**: Pharr/Jakob/Humphreys, *Physically Based Rendering* 4e (2023)
  - **G&W**: Gonzalez & Woods, *Digital Image Processing* 4e (2018)
  - **Elliot**: Elliot & Maier, *Annual Review of Psychology* (2014)
  - **CIE015**: CIE 015:2018 *Colorimetry*
  - **BT2020**: ITU-R BT.2020-2 (2015)
  - **ST2084**: SMPTE ST 2084:2014 (PQ EOTF)
  - **ASTM E308**: ASTM E308-18 *Computing the Colors of Objects*
- **Nassau cause (해당 시 #표기)**: 1=Incandescence, 2=Gas excitation, 3=Vibration/rotation, 4=Ligand field (transition metals), 5=Charge transfer, 6=Molecular orbitals, 7=Band theory, 8=Color centers, 9=Dispersion, 10=Scattering, 11=Interference, 12=Diffraction, 13=Polarization, 14=Birefringence, 15=Geometric optics.

---

## Domain 1 — Optics & Light Physics (123)

### `light-basics` — Pre-Hecht intuitions (L1 entry)
1. `light-basics/what-is-light` — What is light? Photons vs waves [빛이란 무엇인가] · L1 · Hecht§3
2. `light-basics/light-vs-darkness` — Adding light = brighter, taking away = darker [더하기·빼기로 보는 빛] · L1 · Hecht§3
3. `light-basics/shadow-maker` — Block light → shadow [그림자 만들기] · L1 · Hecht§5
4. `light-basics/additive-rgb-mixing` — Three flashlight color overlap [빨강·녹색·파랑 빛 겹치기] · L1 · W&S§3
5. `light-basics/subtractive-cmy-mixing` — Three filter color subtract [세 필터 색 빼기] · L1 · W&S§3
6. `light-basics/light-speed-finite` — Light needs time to travel [빛도 시간을 들여 간다] · L1 · Hecht§3.1

### `wave-fundamentals` — Hecht Ch.2 Wave Motion
7. `wave-fundamentals/sine-anatomy` — Amplitude, λ, frequency, phase [정현파 해부] · L1 · Hecht§2.1
8. `wave-fundamentals/phase-shifter` — Two waves φ difference [위상차 두 파] · L2 · Hecht§2.2
9. `wave-fundamentals/wavelength-frequency` — c = fλ visualization [파장·주파수 역수 관계] · L2 · Hecht§2.3
10. `wave-fundamentals/superposition-basic` — Two waves adding [두 파의 중첩] · L2 · Hecht§2.5
11. `wave-fundamentals/beat-frequency` — Close-frequency tones beating [맥놀이] · L3 · Hecht§7.1
12. `wave-fundamentals/standing-wave` — Reflection creates nodes [반사로 만드는 정상파] · L3 · Hecht§2.6
13. `wave-fundamentals/wave-packet` — Group vs phase velocity [군속도 vs 위상속도] · L4 · Hecht§7.2
14. `wave-fundamentals/doppler-effect` — Source motion shifts λ [도플러 효과] · L3 · Hecht§2.7
15. `wave-fundamentals/transverse-vs-longitudinal` — String vs sound [횡파 vs 종파] · L1 · Hecht§2.4

### `em-fundamentals` — Hecht Ch.3 EM Theory
16. `em-fundamentals/e-and-b-vectors` — Orthogonal E, B oscillation [전·자기장 직교 진동] · L3 · Hecht§3.2
17. `em-fundamentals/em-wave-propagation` — Right-hand rule, c speed [EM파 전파 방향] · L2 · Hecht§3.2
18. `em-fundamentals/poynting-flux` — S = E × H / μ₀ [포인팅 벡터] · L4 · Hecht§3.3
19. `em-fundamentals/em-spectrum-tour` — Radio → γ-ray frequency tour [전자기 스펙트럼 투어] · L1 · Hecht§3.6
20. `em-fundamentals/radiation-pressure` — Light pushes objects [복사압] · L4 · Hecht§3.3.2

### `light-propagation` (existing 5, +2)
21. `light-propagation/shadow-size` — Shadow size vs light distance [거리별 그림자 크기] · L1 · Hecht§5
22. `light-propagation/umbra-penumbra` — Umbra and penumbra [본/반그림자] · L2 · Hecht§5
23. `light-propagation/pinhole-camera` — Pinhole diameter vs sharpness [바늘구멍 사진기] · L3 · Hecht§5.7
24. `light-propagation/inverse-square` — E = I/r² [역제곱 법칙] · L2 · Hecht§3.5
25. `light-propagation/fermats-principle` — Path of least time [페르마 최소 시간 원리] · L4 · Hecht§4.4
26. `light-propagation/huygens-fresnel` — Wavelet envelope construction [호이겐스-프레넬] · L3 · Hecht§4.4
27. `light-propagation/optical-path-length` — OPL = n·d sum [광경로장] · L3 · Hecht§4.3

### `reflection-lab` (existing 5, +3)
28. `reflection-lab/specular-vs-diffuse` — GGX microfacet roughness [정·난반사 GGX] · L3 · Hecht§4.7 · PBR§9
29. `reflection-lab/plane-mirror` — Virtual image symmetry s' = -s [평면 거울 상] · L2 · Hecht§5.4
30. `reflection-lab/spherical-mirrors` — Concave/convex principal rays [구면 거울 작도] · L3 · Hecht§5.4.3
31. `reflection-lab/spherical-aberration` — Aberration vs parabolic [구면 수차] · L4 · Hecht§6.3
32. `reflection-lab/retroreflection` — Beads & corner cube [재귀반사] · L3 · Hecht§4.7
33. `reflection-lab/fresnel-equations` — Rs, Rp vs angle [프레넬 방정식] · L4 · Hecht§4.6.2
34. `reflection-lab/metal-vs-dielectric` — Complex n vs real n reflection [금속·유전체 반사 비교] · L4 · Hecht§4.8
35. `reflection-lab/grazing-angle-fresnel` — Reflectance approaches 1 at grazing [경사각 반사율] · L3 · Hecht§4.6

### `refraction-snell` (existing 5, +3)
36. `refraction-snell/apparent-depth` — Bending chopstick in water [물속 굴절] · L2 · Hecht§4.5 · #9
37. `refraction-snell/snells-law` — Laser refractometer [스넬의 법칙] · L3 · Hecht§4.4 · #9
38. `refraction-snell/wavefront-velocity` — v = c/n, λ shortening [파동 속도] · L3 · Hecht§4.3
39. `refraction-snell/lateral-displacement` — Glass plate shift [횡적 편위] · L3 · Hecht§5.2
40. `refraction-snell/calcite-birefringence` — o/e-ray separation [방해석 복굴절] · L4 · Hecht§8.4 · #14
41. `refraction-snell/refraction-direction-intro` — Light bends toward / away from normal [수직선 쪽? 반대쪽?] · L1 · Hecht§4.4
42. `refraction-snell/goos-haenchen-shift` — Beam lateral shift at TIR [구스-핸헨 변위] · L5 · B&W§1.5.4
43. `refraction-snell/negative-index-bending` — Metamaterial n<0 reversed refraction [음굴절률] · L5 · B&W extra

### `total-internal-reflection` (existing 5)
44. `total-internal-reflection/snells-window` — Underwater hemispherical view [수중 스넬창] · L2 · Hecht§4.7
45. `total-internal-reflection/critical-angle` — TIR threshold [임계각] · L3 · Hecht§4.7
46. `total-internal-reflection/optical-fiber` — Numerical aperture [광섬유 NA] · L3 · Hecht§5.6
47. `total-internal-reflection/evanescent-wave` — Exponential decay e^(-z/d) [에바네센트 파] · L5 · Hecht§4.7.2
48. `total-internal-reflection/ftir-tunneling` — Frustrated TIR gap [좌절전반사] · L5 · Hecht§4.7.3

### `prism-dispersion` (existing 3, +2)
49. `prism-dispersion/newtons-prism` — White light split [뉴턴 프리즘] · L2 · Hecht§5.5 · #9
50. `prism-dispersion/minimum-deviation` — Apex angle vs δ_min [최소 편향각] · L4 · Hecht§5.5.1
51. `prism-dispersion/cauchy-formula` — n(λ) = B + C/λ² [코시 분산] · L4 · Hecht§3.5.1
52. `prism-dispersion/sellmeier-equation` — Sellmeier B,C coefficients [젤마이어 방정식] · L5 · B&W§2.3
53. `prism-dispersion/abbe-number` — V_d dispersion figure [아베수] · L4 · Hecht§6.3.2

### `geometric-optics` — Hecht Ch.5 (new)
54. `geometric-optics/thin-lens-basic` — 1/s + 1/s' = 1/f [얇은 렌즈 방정식] · L3 · Hecht§5.2
55. `geometric-optics/lensmakers-equation` — 1/f from radii and n [렌즈제작자 방정식] · L4 · Hecht§5.2.3
56. `geometric-optics/newtons-lens-formula` — xx' = f² [뉴턴 렌즈 공식] · L4 · Hecht§5.2.4
57. `geometric-optics/principal-planes` — Thick lens H, H' planes [주평면] · L5 · Hecht§5.7.1
58. `geometric-optics/aspheric-vs-spherical` — Aberration-free aspheres [비구면 vs 구면] · L4 · Hecht§6
59. `geometric-optics/eye-accommodation` — Ciliary muscle lens deformation [수정체 조절] · L3 · Goldstein§2
60. `geometric-optics/magnifier-virtual-image` — Magnifier near point [돋보기 가상상] · L2 · Hecht§5.7
61. `geometric-optics/compound-microscope` — Objective + eyepiece system [복합 현미경] · L4 · Hecht§5.7.4
62. `geometric-optics/telescope-keplerian` — Keplerian astronomical telescope [천체망원경] · L4 · Hecht§5.7.5

### `aberrations` — Hecht Ch.6 (new)
63. `aberrations/chromatic-axial` — Axial chromatic aberration [축상 색수차] · L4 · Hecht§6.3.2
64. `aberrations/chromatic-lateral` — Lateral chromatic aberration [배율 색수차] · L4 · Hecht§6.3.2
65. `aberrations/coma` — Off-axis comatic flare [코마] · L4 · Hecht§6.3.1
66. `aberrations/astigmatism` — Tangential vs sagittal foci [비점수차] · L4 · Hecht§6.3.1
67. `aberrations/field-curvature` — Petzval surface [상면만곡] · L5 · Hecht§6.3.1
68. `aberrations/distortion-barrel-pincushion` — Barrel vs pincushion grid [수차의 왜곡] · L4 · Hecht§6.3.1
69. `aberrations/achromat-doublet` — Crown + flint correction [색지움 더블릿] · L5 · Hecht§6.3.2

### `wave-interference` (existing 5, +3)
70. `wave-interference/superposition` — Constructive/destructive [중첩 원리] · L2 · Hecht§7.1 · #11
71. `wave-interference/soap-bubble` — Thin-film structural color [비누방울 박막] · L3 · Hecht§9.6 · #11
72. `wave-interference/newtons-rings` — Convex lens ring radius [뉴턴 링] · L3 · Hecht§9.6.1
73. `wave-interference/anti-reflective` — λ/4 AR coating [무반사 코팅] · L4 · Hecht§9.7
74. `wave-interference/michelson-interferometer` — nm mirror fringes [마이켈슨] · L5 · Hecht§9.4.2
75. `wave-interference/youngs-double-slit-full` — Full Young's setup with intensity [영의 이중슬릿 전체] · L3 · Hecht§9.3 · #11
76. `wave-interference/lloyds-mirror` — Lloyd's single-mirror interference [로이드 거울] · L4 · Hecht§9.4.1
77. `wave-interference/fabry-perot-etalon` — High-finesse cavity [패브리-페로 에탈론] · L5 · Hecht§9.6.3

### `light-diffraction` (existing 6, +3)
78. `light-diffraction/sound-vs-light` — Bending intuition [회절 직관 비교] · L1 · Hecht§10
79. `light-diffraction/huygens-principle` — Secondary wavelets envelope [호이겐스 원리] · L2 · Hecht§10.1
80. `light-diffraction/single-double-slit` — Fraunhofer I(θ) [단·이중 슬릿] · L3 · Hecht§10.2 · #12
81. `light-diffraction/diffraction-grating` — Lines/mm vs spectral lines [회절 격자] · L4 · Hecht§10.2.7
82. `light-diffraction/airy-disc` — Bessel J₁ circular aperture [에어리 디스크] · L4 · Hecht§10.2.5
83. `light-diffraction/rayleigh-criterion` — Resolution of two discs [레일리 기준] · L4 · Hecht§10.2.5
84. `light-diffraction/fresnel-zone-plate` — Zone plate focusing [프레넬 존 플레이트] · L5 · Hecht§10.3
85. `light-diffraction/babinet-principle` — Complementary aperture [바비넷 원리] · L4 · Hecht§10.3.3
86. `light-diffraction/cornu-spiral` — Fresnel integrals plot [코르뉴 나선] · L5 · Hecht§10.3.5

### `fourier-optics` — Hecht Ch.11 (new)
87. `fourier-optics/spatial-frequency` — 2D Fourier of image [공간 주파수] · L4 · Hecht§11.2.1
88. `fourier-optics/4f-convolution` — Two-lens correlation [4f 광학 시스템] · L5 · Hecht§11.3
89. `fourier-optics/abbe-imaging` — Microscope diffraction limit [아베 이미징 이론] · L5 · Hecht§11.3.5
90. `fourier-optics/phase-contrast` — Zernike phase plate [위상차 현미경] · L5 · Hecht§13.2.4
91. `fourier-optics/spatial-filtering` — Low/high-pass image filter [공간 필터링] · L4 · Hecht§11.3.4

### `coherence` — Hecht Ch.12 (new)
92. `coherence/temporal-coherence` — Linewidth vs coherence length [시간적 결맞음] · L4 · Hecht§12.1
93. `coherence/spatial-coherence` — Source size vs fringe visibility [공간적 결맞음] · L4 · Hecht§12.4
94. `coherence/speckle-pattern` — Random interference grain [스페클 패턴] · L4 · Hecht§12.6
95. `coherence/laser-linewidth` — Sub-MHz laser tone [레이저 선폭] · L5 · Hecht§13.1
96. `coherence/white-light-interferometer` — Broadband zero-OPD fringe [백색광 간섭계] · L5 · Hecht§9.4.3

### `modern-optics` — Hecht Ch.13 (new)
97. `modern-optics/laser-cavity-gain` — Population inversion gain [레이저 공진기 이득] · L5 · Hecht§13.1
98. `modern-optics/q-switching` — Giant pulse Q-switch [Q 스위칭] · L5 · Hecht§13.1
99. `modern-optics/mode-locking` — Femtosecond pulse train [모드 동기화] · L6 · Hecht§13.1
100. `modern-optics/second-harmonic-generation` — Nonlinear χ² SHG [이차 고조파 발생] · L6 · B&W§16 · #6
101. `modern-optics/photonic-crystal` — Periodic dielectric bandgap [광결정 밴드갭] · L6 · Hecht§13.5 · #11
102. `modern-optics/metamaterial-negative-n` — Sub-λ split-ring metamaterial [메타물질 음굴절] · L6 · ref:Pendry

### `wave-polarization` (existing 6, +3)
103. `wave-polarization/sunglasses` — Polarized glare blocking [편광 선글라스] · L2 · Hecht§8.1 · #13
104. `wave-polarization/polarization-states` — Linear/circular/elliptical 3D [편광 상태 3D] · L3 · Hecht§8.1
105. `wave-polarization/malus-law` — I = I₀ cos²θ [말루스 법칙] · L3 · Hecht§8.2.1
106. `wave-polarization/brewsters-angle` — P-wave suppression θ_B [브루스터 각] · L4 · Hecht§8.6.2 · #13
107. `wave-polarization/photoelasticity` — Stress isochromatic fringes [광탄성] · L4 · Hecht§8.10 · #14
108. `wave-polarization/lcd-shutter` — Twisted nematic voltage [LCD TN] · L4 · Hecht§8.11.2
109. `wave-polarization/stokes-parameters` — S₀ S₁ S₂ S₃ Stokes [스토크스 매개변수] · L5 · Hecht§8.13.1
110. `wave-polarization/poincare-sphere` — Poincaré sphere 3D viewer [푸앵카레 구] · L5 · Hecht§8.13.2
111. `wave-polarization/optical-activity` — Sugar rotation [광학 활성] · L4 · Hecht§8.10 · #13
112. `wave-polarization/faraday-rotation` — Magnetic-field rotation [패러데이 회전] · L5 · Hecht§8.11.3
113. `wave-polarization/circular-dichroism` — CD spectroscopy [원편광 이색성] · L5 · ref:CD spectroscopy

### `atmospheric-optics` (existing 4, +3)
114. `atmospheric-optics/primary-rainbow` — Descartes 42° [1차 무지개] · L4 · W&C§4 · #10
115. `atmospheric-optics/secondary-rainbow` — Alexander's dark band 51° [2차 무지개·암대] · L4 · W&C§4
116. `atmospheric-optics/mirage-bending` — RK4 temperature gradient [신기루] · L5 · W&C§3
117. `atmospheric-optics/green-flash` — Sunset refraction green flash [그린 플래시] · L5 · W&C§3
118. `atmospheric-optics/halo-22deg` — Ice crystal 22° halo [22° 무리] · L4 · W&C§5
119. `atmospheric-optics/circumzenithal-arc` — Upside-down rainbow [환천정호] · L4 · W&C§5
120. `atmospheric-optics/aurora-spectrum` — O 557.7nm green / 630 red lines [오로라 스펙트럼] · L4 · ref:atmospheric · #2

### `particle-scattering` (existing 4, +3)
121. `particle-scattering/sky-color` — Solar angle vs sky/sunset [하늘 색] · L2 · Hecht§8.5 · #10
122. `particle-scattering/rayleigh-spectrum` — 1/λ⁴ intensity [레일리 산란] · L3 · Hecht§8.5.2 · #10
123. `particle-scattering/mie-clouds` — Droplet radius vs forward white [미 산란] · L4 · ref:Bohren&Huffman · #10
124. `particle-scattering/tyndall-laser` — Beer-Lambert beam [틴들 효과] · L3 · Hecht§8.5
125. `particle-scattering/brillouin-scattering` — Acoustic phonon scattering [브릴루앙 산란] · L6 · ref:Brillouin
126. `particle-scattering/raman-scattering` — Vibrational mode lines [라만 산란] · L5 · Nassau§3 · #3
127. `particle-scattering/sers-enhancement` — Surface-enhanced Raman [SERS 향상] · L6 · ref:SERS

### `planckian-radiation` (existing 6)
128. `planckian-radiation/filament-heating` — Tungsten T vs color [백열 발열] · L2 · Hecht§3.5.2 · #1
129. `planckian-radiation/planck-curves` — 1000K~25000K locus [흑체 곡선] · L3 · Hunt&Pointer§3
130. `planckian-radiation/wiens-displacement` — λ_peak vs T [빈의 변위] · L3 · Hecht§3.5.2
131. `planckian-radiation/stefan-boltzmann` — T⁴ integration [스테판-볼츠만] · L4 · Hecht§3.5.2
132. `planckian-radiation/photopic-scotopic` — V(λ), V'(λ), Purkinje [주야간 시감도] · L4 · CIE015
133. `planckian-radiation/photometry-geometry` — Lumen/Candela/Lux/Nit [광도 단위] · L4 · CIE015

---

## Domain 2 — Visual Physiology & Neuro-Cognitive Science (52)

### `vision-anatomy-basics` — L1 entry (new)
134. `vision-anatomy-basics/eye-cross-section` — Cornea, lens, retina, optic nerve [눈의 단면] · L1 · Goldstein§2
135. `vision-anatomy-basics/blind-spot-finder` — Personal blind spot map [맹점 찾기] · L1 · Goldstein§2.4
136. `vision-anatomy-basics/fovea-vs-periphery` — Central vs peripheral resolution [중심와 vs 주변시] · L2 · Wandell§3
137. `vision-anatomy-basics/visual-field-test` — Confrontation visual field [시야검사] · L2 · Goldstein§2.5
138. `vision-anatomy-basics/visual-pathway-tour` — Eye → LGN → V1 [시각 경로] · L2 · Hubel§3

### `rods-adaptation` (existing 3, +2)
139. `rods-adaptation/pupil-reflex` — Iris dilation [동공 반사] · L1 · Goldstein§2.3
140. `rods-adaptation/rhodopsin-kinetics` — Bleaching/regeneration [로돕신 동역학] · L5 · Wandell§3.2
141. `rods-adaptation/dark-adaptation-curve` — Rod-cone break point [암순응 곡선] · L4 · Wandell§3.3
142. `rods-adaptation/scotopic-color-loss` — Color fading in dim light [어두울 때 색이 사라진다] · L2 · Goldstein§3
143. `rods-adaptation/light-adaptation-saturation` — Bright-light cone saturation [명순응 포화] · L3 · Wandell§3.4

### `cones-sensitivity` (existing 4, +3)
144. `cones-sensitivity/three-channels` — RGB ↔ LMS matching [삼색 채널] · L2 · W&S§5
145. `cones-sensitivity/lms-spectra` — LMS absorption curves [LMS 분광 감도] · L3 · CIE170
146. `cones-sensitivity/firing-rate` — Photon → pulse [발화율] · L4 · Wandell§5
147. `cones-sensitivity/iprgc-circadian` — ipRGC vs melatonin [ipRGC 청색광] · L5 · ref:Berson 2002
148. `cones-sensitivity/cone-mosaic-roorda` — Roorda & Williams in vivo cone arrangement [망막 원추 모자이크] · L4 · ref:Roorda 1999
149. `cones-sensitivity/macular-pigment` — Lutein/zeaxanthin yellow filter [황반 색소] · L4 · Goldstein§3.3
150. `cones-sensitivity/foveal-vs-peripheral-spectrum` — Different CMF in periphery [중심와 vs 주변 CMF] · L5 · W&S§5.5

### `receptive-fields` (existing 3, +4)
151. `receptive-fields/ganglion-cells-mach` — Mach Bands edge enhancement [마하 밴드] · L3 · Wandell§5.5
152. `receptive-fields/ganglion-cells-dog` — On/Off-Center DoG [RGC 수용장] · L3 · Hubel§5
153. `receptive-fields/lateral-inhibition` — Hermann Grid [측방 억제] · L3 · Goldstein§3.5
154. `receptive-fields/chevreul-illusion` — Adjacent strip boundaries [슈브뢸 착시] · L2 · ref:Chevreul 1839
155. `receptive-fields/craik-cornsweet-illusion` — Cornsweet edge profile [크레이크-콘스위트 착시] · L4 · Wandell§5.6
156. `receptive-fields/center-surround-color` — Red/green vs yellow/blue opponent fields [중심-주변 색대립] · L4 · Hubel§7
157. `receptive-fields/m-vs-p-pathway` — Magnocellular vs Parvocellular [M·P 경로] · L5 · Wandell§6

### `cortical-vision` (new)
158. `cortical-vision/v1-orientation-columns` — Orientation column pinwheel [V1 방위 컬럼] · L5 · Hubel§9
159. `cortical-vision/v4-color-area` — V4 hue selectivity [V4 색 영역] · L5 · Zeki 1980
160. `cortical-vision/blob-stripe-architecture` — Blobs and stripes color modules [블롭·스트라이프] · L6 · Hubel§7
161. `cortical-vision/binocular-rivalry` — Conflicting color images alternating [양안 경쟁] · L4 · Goldstein§4
162. `cortical-vision/synesthesia-grapheme-color` — Letter→color cross-activation [공감각: 글자→색] · L4 · Ramachandran 2001

### `opponent-process` (existing 4, +2)
163. `opponent-process/opponent-afterimages` — Chromatic adaptation traces [잔상] · L2 · Hering 1878
164. `opponent-process/opponent-cancellation` — Hering RG/YB/WBk [헤링 대립색 취소] · L4 · W&S§5.10
165. `opponent-process/successive-contrast` — Recovery decay [계차 대비] · L3 · Goldstein§9
166. `opponent-process/albers-relativity` — Simultaneous contrast [알베르스 동시대비] · L4 · Albers
167. `opponent-process/bezold-assimilation` — Color spread between stripes [베졸트 동화] · L3 · ref:Bezold
168. `opponent-process/watercolor-effect` — Pinna's watercolor illusion [수채화 효과] · L4 · Pinna 2001

### `color-constancy` (existing 3, +3)
169. `color-constancy/orange-constancy` — Illumination chamber [색채 항상성] · L3 · Fairchild§8
170. `color-constancy/constancy-vries` — Von Kries CAT [Von Kries 적응] · L4 · Fairchild§8.3
171. `color-constancy/constancy-dress` — The Dress V4 parsing [드레스 착시] · L4 · ref:Lafer-Sousa 2015
172. `color-constancy/lightness-constancy` — White paper in shadow stays white [명도 항상성] · L3 · Goldstein§9.4
173. `color-constancy/checker-shadow-illusion` — Adelson's checker shadow [아델슨 체커] · L3 · ref:Adelson
174. `color-constancy/retinex-edge-integration` — Land's retinex theory [Land 리티넥스] · L5 · Land 1971

### `nonlinear-visual-shifts` (existing 3)
175. `nonlinear-visual-shifts/shift-abney` — Purity dilution curvature [압니 효과] · L4 · W&S§5.13
176. `nonlinear-visual-shifts/shift-bezold` — Bezold-Brücke luminance shift [베졸트-브뤼케] · L4 · W&S§5.13
177. `nonlinear-visual-shifts/shift-hk` — Helmholtz-Kohlrausch [H-K 효과] · L4 · Fairchild§7

### `macadam-jnd` (existing 3)
178. `macadam-jnd/jnd-tensors` — Personal xy JND [개인 JND] · L4 · MacAdam 1942
179. `macadam-jnd/macadam-ellipses` — 25 ellipses [맥애덤 타원] · L4 · MacAdam 1942
180. `macadam-jnd/jnd-ciede2000` — ΔE2000 weights [CIEDE2000 가중치] · L5 · CIE224

### `color-vision-deficiency` (existing 4)
181. `color-vision-deficiency/cvd-everyday` — Everyday CVD intro [일상 색 혼동] · L1 · Goldstein§9.7
182. `color-vision-deficiency/cvd-dichromacy` — Prot/Deut/Tritanopia LMS [이색각자] · L3 · Brettel 1997
183. `color-vision-deficiency/cvd-anomaly` — Anomalous trichromacy Daltonization [색약 보정] · L4 · ref:Daltonization
184. `color-vision-deficiency/cvd-brettel-pipeline` — Brettel sim algorithm [Brettel 알고리즘] · L5 · Brettel 1997

### `visual-illusions-library` (new — Bach catalog)
185. `visual-illusions-library/penrose-impossible` — Penrose impossible triangle [펜로즈 불가능 삼각형] · L2 · ref:Bach catalog
186. `visual-illusions-library/kanizsa-triangle` — Illusory contour Kanizsa [카니자 삼각형] · L3 · ref:Kanizsa 1955
187. `visual-illusions-library/munker-white` — Munker-White assimilation [뮨커-화이트] · L4 · ref:White 1981
188. `visual-illusions-library/lilac-chaser` — Color afterimage rotating [라일락 체이서] · L3 · ref:Bach catalog
189. `visual-illusions-library/cafe-wall-illusion` — Café wall tilt [카페 벽 착시] · L2 · ref:Gregory 1979
190. `visual-illusions-library/troxler-fading` — Peripheral color fading on fixation [트록슬러 사라짐] · L3 · ref:Troxler 1804

### `motion-and-color` (new)
191. `motion-and-color/benham-disk` — Spinning B&W disk produces color [벤햄 디스크] · L3 · ref:Benham 1894
192. `motion-and-color/fechner-color-illusion` — Flicker-induced color [페히너 색 착시] · L4 · ref:Fechner
193. `motion-and-color/equiluminant-motion` — Motion stops at equiluminance [등휘도 운동 정지] · L5 · Livingstone&Hubel 1987

---

## Domain 3 — Colourant Chemistry & Material Science (38)

### `causes-of-color-intro` — Nassau's 15 causes overview (new, L1)
194. `causes-of-color-intro/nassau-15-causes-tour` — All 15 causes table [Nassau 15원인 투어] · L1 · Nassau§1
195. `causes-of-color-intro/why-things-have-color` — Absorb + reflect + transmit basic [물체가 색을 가지는 이유] · L1 · Nassau§1

### `molecular-orbitals` (existing 2, +5)
196. `molecular-orbitals/transition-metals` — Co/Cd d-d splitting [전이금속 d-d] · L4 · Nassau§5 · #4
197. `molecular-orbitals/conjugated-organic` — π-bond chain absorption [공액 유기 안료] · L4 · Zollinger§2 · #6
198. `molecular-orbitals/cyanine-dye-length` — Cyanine chain length vs λ_max [시아닌 사슬 길이] · L4 · Zollinger§3
199. `molecular-orbitals/benzene-to-anthracene` — Aromatic ring fusion vs λ shift [벤젠→안트라센] · L5 · Zollinger§2
200. `molecular-orbitals/ligand-field-theory` — Crystal field splitting Δ_o [리간드장 이론] · L5 · Nassau§5
201. `molecular-orbitals/charge-transfer` — Metal-ligand electron transfer [전하이동 흡수] · L5 · Nassau§7 · #5
202. `molecular-orbitals/band-theory-semiconductors` — Bandgap → color (CdS yellow) [반도체 밴드갭] · L5 · Nassau§8 · #7

### `dyes-chemistry` (existing 3, +4)
203. `dyes-chemistry/natural-dyeing` — Plant extract physical absorption [천연 염색] · L2 · Zollinger§7
204. `dyes-chemistry/mordant-ligands` — Al/Fe chelation crosslinking [매염제] · L4 · Berns§5
205. `dyes-chemistry/ph-color-change` — Indicator proton transfer [pH 지시약] · L3 · ref:Skoog analytical
206. `dyes-chemistry/azo-dye-coupling` — Diazo + coupler azo formation [아조 염료 커플링] · L4 · Zollinger§5
207. `dyes-chemistry/reactive-dye-bond` — Procion covalent C-O bond [반응성 염료] · L4 · Zollinger§7.3
208. `dyes-chemistry/vat-dye-reduction` — Vat indigo reduction-oxidation [건염 환원] · L4 · Zollinger§7.2
209. `dyes-chemistry/disperse-dye-polyester` — Dispersion in polyester fiber [분산 염료] · L3 · Zollinger§7.4

### `wetting-effect` (existing 3)
210. `wetting-effect/vehicle-hiding` — Pigment/medium n mismatch [은폐력] · L4 · Berns§6
211. `wetting-effect/wetting-denim` — BRDF index matching [습윤 BRDF] · L3 · ref:Lekner&Dorf 1988
212. `wetting-effect/binder-aging` — UV oxidation yellowing [바인더 황변] · L4 · ref:paint aging

### `kubelka-munk-mixer` (existing 2)
213. `kubelka-munk-mixer/km-coefficients` — K & S spectral [K-M 계수] · L4 · Berns§6.6
214. `kubelka-munk-mixer/km-paint-mixer` — Spectral mixing [K-M 안료 배합] · L5 · Berns§6.6

### `pigment-degradation` (existing 2, +2)
215. `pigment-degradation/uv-photodegradation` — Bond cleavage kinetics [광분해 동역학] · L5 · Nassau§9
216. `pigment-degradation/lightfastness-labels` — ASTM D4302/D4236 [내광성 표준] · L3 · ASTM D4302
217. `pigment-degradation/pigment-incompatibility` — Lead + sulfur darkening [안료 상호반응] · L4 · ref:conservation
218. `pigment-degradation/heat-vs-light-aging` — Thermal vs photo aging [열·광 노화] · L4 · ASTM D4303

### `luminescence-chemistry` (existing 4, +2)
219. `luminescence-chemistry/fluorescence-vs-phosphorescence` — Singlet vs triplet [형광·인광] · L4 · ref:Lakowicz
220. `luminescence-chemistry/solvatochromism` — Solvent polarity shift [솔바토크로미즘] · L5 · Reichardt 2003
221. `luminescence-chemistry/photochromism-spiropyran` — Ring-opening color [포토크로미즘] · L5 · Bouas-Laurent 2001
222. `luminescence-chemistry/thermochromism-leuco` — Leuco + developer T [써모크로미즘] · L4 · ref:thermochromic
223. `luminescence-chemistry/upconversion-lanthanide` — Yb/Er anti-Stokes [상향변환 형광] · L6 · ref:Auzel 2004
224. `luminescence-chemistry/electrochemiluminescence` — Ru(bpy)₃ ECL [전기화학 발광] · L6 · Bard 2004

### `color-centers` (new — Nassau cause #8)
225. `color-centers/f-center-alkali-halides` — Electron in vacancy [알칼리할로겐 F-센터] · L5 · Nassau§10 · #8
226. `color-centers/smoky-quartz` — Al³⁺ + radiation [연수정] · L4 · Nassau§10 · #8
227. `color-centers/amethyst-color` — Fe⁴⁺ → Fe³⁺ + hole [자수정 색] · L4 · Nassau§10 · #8
228. `color-centers/diamond-nitrogen-vacancy` — NV center fluorescence [다이아 NV 센터] · L6 · Nassau§10

### `band-gap-materials` (new — Nassau cause #7)
229. `band-gap-materials/cds-yellow` — CdS Eg 2.4eV yellow [황화카드뮴 황색] · L4 · Nassau§8 · #7
230. `band-gap-materials/cdse-red` — CdSe Eg 1.7eV red [셀렌화카드뮴 적색] · L4 · Nassau§8 · #7
231. `band-gap-materials/gold-nanoparticle-plasmon` — Au plasmon red color [금 나노 입자 적색] · L5 · Nassau§7 · #7

---

## Domain 4 — Colorimetry & Color Spaces (40)

### `colorimetry-intro` — L1 (new)
232. `colorimetry-intro/why-rgb-only-3` — Why we need only 3 primaries [왜 삼원색만으로 충분한가] · L1 · W&S§5.1
233. `colorimetry-intro/metamerism-intro` — Two spectra → same color [메타메리즘 입문] · L2 · W&S§5.7
234. `colorimetry-intro/spectral-locus-shape` — Why horseshoe? [말발굽 모양의 이유] · L2 · W&S§5

### `cie-1931-matching` (existing 2, +2)
235. `cie-1931-matching/colorimetry-matching` — 2° RGB matching dial [등색 실험] · L3 · CIE015 · W&S§5.2
236. `cie-1931-matching/observer-integral` — rgb → XYZ derivation [관찰자 적분] · L4 · CIE015
237. `cie-1931-matching/cmf-2-vs-10` — 2° vs 10° standard observer [2° vs 10° 관찰자] · L4 · CIE015
238. `cie-1931-matching/illuminant-spd-comparison` — A/D50/D65/F11 SPD overlay [표준 광원 SPD] · L3 · CIE015

### `xyz-transformation` (existing 2, +2)
239. `xyz-transformation/matrix-3d-rotation` — 3×3 linear rotation [XYZ 회전] · L4 · W&S§3
240. `xyz-transformation/xyz-projective-locus` — Horse-shoe xy projection [말발굽 사영] · L4 · W&S§3
241. `xyz-transformation/lindbloom-matrices` — Bruce Lindbloom RGB↔XYZ [Lindbloom 행렬] · L4 · brucelindbloom.com
242. `xyz-transformation/srgb-gamma-encoding` — sRGB EOTF 2.2~2.4 hybrid [sRGB 감마 인코딩] · L4 · IEC 61966-2-1

### `color-space-slicer` (existing 4, +5)
243. `color-space-slicer/xyy-slicing` — Y luminance slice [xyY 슬라이서] · L4 · Hunt§3
244. `color-space-slicer/lab-slicing` — CIELAB 3D [CIELAB] · L4 · CIE015
245. `color-space-slicer/luv-slicing` — CIELUV 3D [CIELUV] · L4 · CIE015
246. `color-space-slicer/ucs-1976-uv` — CIE 1976 u'v' [u'v' 도표] · L4 · CIE015
247. `color-space-slicer/hsv-cylinder` — HSV cone slicer [HSV 원기둥] · L2 · Smith 1978
248. `color-space-slicer/hsl-double-cone` — HSL double-cone [HSL 이중원뿔] · L2 · ref:Joblove&Greenberg 1978
249. `color-space-slicer/munsell-tree-3d` — Munsell tree 3D [먼셀 트리 3D] · L3 · Munsell 1905
250. `color-space-slicer/ncs-natural-system` — NCS triangle and circle [NCS 자연색 시스템] · L3 · NCS 1979
251. `color-space-slicer/ostwald-color-solid` — Ostwald color solid [오스트발트 색입체] · L3 · Ostwald 1916

### `oklch-harmony-explorer` (existing 2)
252. `oklch-harmony-explorer/oklab-linearity` — Linearity validation [OKLab 선형성] · L5 · Ottosson 2020
253. `oklch-harmony-explorer/oklch-uniform-palette` — L/C/H palette [OKLCH 팔레트] · L6 · Ottosson 2020

### `color-difference-delta-e` (existing 2, +2)
254. `color-difference-delta-e/delta-e-76` — Euclidean ΔE [유클리디안 ΔE] · L4 · CIE015
255. `color-difference-delta-e/delta-e-00` — Parametric ΔE2000 [CIEDE2000] · L5 · CIE224
256. `color-difference-delta-e/delta-e-94` — CIE94 weighted ΔE [CIE94] · L5 · CIE15
257. `color-difference-delta-e/cmc-1c` — CMC(l:c) textile tolerance [CMC 색차] · L5 · ISO 105

### `gamut-mapping-3d` (existing 2, +2)
258. `gamut-mapping-3d/gamut-overlapping-3d` — sRGB/Adobe/P3/CMYK [색역 3D 비교] · L4 · Hunt§7
259. `gamut-mapping-3d/gamut-clipping-vs-compression` — Relative vs Perceptual [클리핑·압축] · L5 · ICC
260. `gamut-mapping-3d/lch-gamut-clip` — Lightness preserving clip [Lab 클립] · L5 · Morovic 2008
261. `gamut-mapping-3d/scaling-vs-clipping` — Gamut scaling vs hard clip [스케일 vs 클립] · L5 · Morovic 2008

### `hdr-color-spaces` (existing 3, +2)
262. `hdr-color-spaces/ictcp-itp` — ITP perceptual HDR [ITP HDR] · L5 · BT.2100
263. `hdr-color-spaces/jzazbz` — Jzazbz uniform HDR [Jzazbz] · L5 · Safdar 2017
264. `hdr-color-spaces/bt2020-vs-rec709` — Coverage overlay [BT.2020 vs Rec.709] · L4 · BT2020
265. `hdr-color-spaces/aces-acescg` — ACEScg working space [ACEScg] · L5 · AMPAS
266. `hdr-color-spaces/rec2100-pq-hlg` — PQ vs HLG variants [Rec.2100 PQ·HLG] · L5 · BT.2100

### `icc-color-management` (existing 2, +1)
267. `icc-color-management/icc-profile-chain` — Source → PCS → Dest [ICC 프로파일 사슬] · L5 · ICC.1:2010
268. `icc-color-management/cat-comparison` — Bradford/CAT02/Sharp/Von Kries [CAT 비교] · L5 · Fairchild§9
269. `icc-color-management/rendering-intents` — Perceptual/Relative/Absolute/Saturation [렌더링 인텐트] · L5 · ICC.1:2010

### `color-appearance-models` (new)
270. `color-appearance-models/ciecam02` — CIECAM02 full transform [CIECAM02] · L6 · Fairchild§16
271. `color-appearance-models/ciecam16` — CIECAM16 update [CIECAM16] · L6 · CIE248:2022

---

## Domain 5 — Color Design & Art Theory (38)

### `historical-color-systems` (existing 4, +4)
272. `historical-color-systems/aristotles-scale` — Light-dark 1D [아리스토텔레스] · L1 · Kuehni§2
273. `historical-color-systems/newton-harmony` — 7-pitch musical wheel [뉴턴 음계] · L2 · Newton 1704
274. `historical-color-systems/goethe-psychological` — Goethe/Runge opponent [괴테·룽게] · L3 · Goethe 1810
275. `historical-color-systems/munsell-tree` — Munsell/NCS/Ostwald [먼셀 트리] · L3 · Munsell 1905
276. `historical-color-systems/bauhaus-geometry` — Itten geometry-color match [바우하우스] · L3 · Itten
277. `historical-color-systems/optical-mixing-pointillism` — Seurat point optical mix [점묘 광학 혼합] · L3 · Albers
278. `historical-color-systems/chevreul-circle-1839` — Chevreul color circle 1839 [슈브뢸 색환] · L3 · Chevreul 1839
279. `historical-color-systems/ryb-vs-rgb-debunk` — Why RYB is non-scientific [RYB 신화 깨기] · L2 · W&S

### `ittens-contrasts` (existing 2, +5)
280. `ittens-contrasts/contrast-sandbox` — 7 contrast templates [이텐 7대비] · L3 · Itten
281. `ittens-contrasts/contrast-tension-score` — Real-time tension [긴장 점수] · L4 · Itten
282. `ittens-contrasts/contrast-hue-pure` — Contrast of pure hue [순색 대비] · L2 · Itten
283. `ittens-contrasts/contrast-light-dark` — Light-dark contrast [명암 대비] · L2 · Itten
284. `ittens-contrasts/contrast-cool-warm` — Warm/cool contrast [한·난색 대비] · L2 · Itten
285. `ittens-contrasts/contrast-complementary` — Complementary contrast [보색 대비] · L3 · Itten
286. `ittens-contrasts/contrast-simultaneous` — Simultaneous contrast [동시 대비] · L4 · Itten

### `spatial-balance-ui` (existing 2, +2)
287. `spatial-balance-ui/area-equilibrium` — Goethe Yellow/Violet [면적 저울] · L3 · Goethe
288. `spatial-balance-ui/ui-60-30-10` — UI proportion tuning [60-30-10 비율] · L3 · ref:UI design
289. `spatial-balance-ui/figure-ground-rubin` — Rubin's vase figure-ground [루빈의 컵] · L2 · Rubin 1915
290. `spatial-balance-ui/visual-weight-isobar` — Isobar of visual weight [시각 무게 등압선] · L4 · Arnheim 1974

### `apca-contrast-matcher` (existing 2, +1)
291. `apca-contrast-matcher/apca-lc-contrast` — APCA Lc calc [APCA 가독성] · L4 · WCAG3 draft
292. `apca-contrast-matcher/apca-font-matrix` — WCAG vs APCA matrix [APCA 행렬] · L5 · WCAG3
293. `apca-contrast-matcher/wcag-21-vs-22` — WCAG 2.1 vs 2.2 changes [WCAG 2.1 vs 2.2] · L4 · WCAG 2.2

### `color-harmony-generator` (existing 2, +2)
294. `color-harmony-generator/harmony-wheel` — OKLCH polygon [조화 회전환] · L5 · Ottosson 2020
295. `color-harmony-generator/harmony-code-exporter` — Tailwind/CSS/ASE export [코드 내보내기] · L6 · —
296. `color-harmony-generator/material-3-tonal-palette` — Material You tonal palette [Material 3 톤 팔레트] · L5 · Material 3 guidelines
297. `color-harmony-generator/radix-color-scale` — Radix accessible palette scale [Radix 색 단계] · L5 · Radix UI

### `data-viz-palettes` (existing 4, +3)
298. `data-viz-palettes/colorbrewer-sequential` — Sequential/Diverging/Qualitative [ColorBrewer] · L4 · Brewer 2003
299. `data-viz-palettes/viridis-vs-jet` — Perceptually uniform vs misleading [Viridis vs Jet] · L4 · Smith&vdW 2015
300. `data-viz-palettes/cinema-lut-apply` — Rec.709 → DCI-P3 LUT [영화 LUT] · L5 · Reinhard
301. `data-viz-palettes/pantone-pms-reference` — Pantone PMS [Pantone] · L3 · Pantone
302. `data-viz-palettes/cubehelix-luminance-monotonic` — Cubehelix B&W safe [큐브헬릭스] · L5 · Green 2011
303. `data-viz-palettes/cividis-cvd-safe` — Cividis CVD-safe palette [시비디스] · L4 · Nuñez 2018
304. `data-viz-palettes/turbo-rainbow-modern` — Turbo improved rainbow [터보 무지개] · L4 · Mikhailov 2019

### `typography-color-interaction` (new)
305. `typography-color-interaction/font-weight-vs-contrast` — Heavy text relaxes contrast req [폰트 두께 vs 대비] · L4 · WCAG3
306. `typography-color-interaction/anti-alias-fringing` — Subpixel rendering color fringes [안티앨리어싱 색번짐] · L4 · Poynton§24
307. `typography-color-interaction/reading-fatigue-luminance` — Background luminance vs reading fatigue [배경 휘도 vs 피로] · L4 · ref:reading research
308. `typography-color-interaction/dark-mode-trade-offs` — Dark mode benefits and costs [다크모드 장단점] · L4 · ref:Buchner 2009
309. `typography-color-interaction/dyslexia-friendly-tints` — Beige tints vs dyslexia [난독증 친화 색] · L3 · BDA guidelines

---

## Domain 6 — Digital Display Engineering (37)

### `display-physics-intro` — L1 (new)
310. `display-physics-intro/subpixel-magnifier` — Loupe on screen [화면 돋보기] · L1 · Poynton§4
311. `display-physics-intro/pixel-density-ppi` — Pixels per inch comparison [PPI 비교] · L1 · Poynton§24
312. `display-physics-intro/refresh-rate-flicker` — 60Hz vs 120Hz vs 240Hz [재생율과 깜빡임] · L2 · Poynton§24

### `display-panel-physics` (existing 3, +3)
313. `display-panel-physics/panel-crt-lcd` — CRT decay + LCD TN [CRT·LCD 물리] · L4 · Poynton§24
314. `display-panel-physics/panel-oled` — Organic SPD FWHM [OLED 분광] · L4 · ref:OLED spectra · #6
315. `display-panel-physics/panel-quantum-dot` — Bohr radius energy [퀀텀닷] · L5 · ref:QD physics · #7
316. `display-panel-physics/panel-ips-vs-tn-vs-va` — IPS/TN/VA viewing angles [IPS·TN·VA] · L3 · Poynton§24
317. `display-panel-physics/panel-backlight-edge-vs-array` — Edge vs direct backlight uniformity [백라이트 방식] · L4 · ref:LCD backlight
318. `display-panel-physics/panel-response-time-overdrive` — Response time + overdrive ghosting [응답시간 오버드라이브] · L4 · ref:Pixel response

### `subpixel-rendering` (existing 2, +1)
319. `subpixel-rendering/subpixel-layout-zoom` — Stripe/PenTile/Delta [서브픽셀 레이아웃] · L4 · Poynton§24
320. `subpixel-rendering/subpixel-cleartype` — Subpixel anti-aliasing [ClearType] · L4 · ref:Microsoft ClearType
321. `subpixel-rendering/pentile-rgbg-sharpening` — PenTile lossy sharpening [PenTile 샤프닝] · L5 · ref:PenTile

### `gamma-eotf-calibration` (existing 2, +1)
322. `gamma-eotf-calibration/gamma-eotf-curve` — Gamma 2.2 EOTF [감마 곡선] · L4 · Poynton§23
323. `gamma-eotf-calibration/cat02-whitepoint` — D50↔D65 CAT02 [백색점 적응] · L5 · Fairchild§9
324. `gamma-eotf-calibration/probe-calibration-workflow` — Spyder/i1 calibration loop [모니터 캘리브레이션] · L4 · ref:display profiling

### `hdr-pq-tone-mapping` (existing 2, +2)
325. `hdr-pq-tone-mapping/hdr-pq-curve` — PQ ST 2084 curves [PQ 곡선] · L5 · ST2084
326. `hdr-pq-tone-mapping/tonemapping-aces` — Reinhard/ACES/Hable [톤 매핑] · L5 · Reinhard§7
327. `hdr-pq-tone-mapping/hlg-broadcast` — HLG hybrid log gamma [HLG] · L5 · BT.2100
328. `hdr-pq-tone-mapping/dolby-vision-metadata` — Per-shot dynamic metadata [Dolby Vision 메타데이터] · L6 · ref:Dolby Vision

### `blue-light-circadian` (existing 3, +1)
329. `blue-light-circadian/night-shift-intro` — Warm display shift [야간 모드] · L1 · ref:Apple Night Shift
330. `blue-light-circadian/bl-filter-spd` — 460-480nm SPD reduction [블루라이트 필터] · L4 · ref:ipRGC physiology
331. `blue-light-circadian/bl-iprgc-melatonin` — Melatonin suppression curve [멜라토닌 억제] · L5 · ref:Brainard 2001
332. `blue-light-circadian/blue-light-myth-debunk` — Limits of blue-light harm claims [블루라이트 과장 검증] · L4 · ref:AAO statement

### `emerging-display-tech` (existing 4, +2)
333. `emerging-display-tech/eink-electrophoretic` — Microcapsule particles [E-Ink] · L4 · ref:E-Ink
334. `emerging-display-tech/miniled-local-dimming` — Backlight zones + blooming [Mini-LED 디밍] · L4 · ref:Mini-LED
335. `emerging-display-tech/microled-self-emissive` — Per-pixel emission [microLED] · L5 · ref:microLED
336. `emerging-display-tech/dlp-lcos-projector` — DMD/LCoS micromirrors [프로젝터 엔진] · L5 · ref:DLP TI
337. `emerging-display-tech/laser-projection-rgb` — RGB laser projector speckle [RGB 레이저 프로젝션] · L5 · ref:laser projection
338. `emerging-display-tech/foveated-rendering-vr` — VR foveated rendering [VR 중심와 렌더링] · L6 · ref:Patney 2016

### `os-color-management` (new)
339. `os-color-management/macos-color-sync` — macOS ColorSync workflow [macOS 컬러싱크] · L5 · Apple ColorSync
340. `os-color-management/windows-icc-pipeline` — Windows ICM pipeline [Windows ICM] · L5 · Microsoft ICM
341. `os-color-management/web-browser-color-handling` — Browser color tagging [브라우저 색 처리] · L4 · Poynton§22
342. `os-color-management/srgb-vs-display-p3-web` — sRGB vs P3 web tagging [sRGB vs P3 웹] · L4 · CSS Color 4
343. `os-color-management/hdr-on-the-web` — CSS color() display-p3, Rec2020 [HDR 웹 컬러] · L5 · CSS Color 4

### `display-measurement` (new)
344. `display-measurement/colorchecker-classic` — X-Rite ColorChecker 24-patch [ColorChecker] · L3 · X-Rite spec
345. `display-measurement/grayscale-tracking` — 21-step grayscale ΔE tracking [그레이스케일 추적] · L4 · ref:Calman
346. `display-measurement/gamut-coverage-percentages` — % sRGB vs % Adobe RGB [색역 커버리지 %] · L4 · ref:display reviews

---

## Domain 7 — Print Technology & Graphic Reproduction (30)

### `print-basics` — L1 (new)
347. `print-basics/print-vs-screen` — Reflective vs emissive intro [인쇄 vs 화면] · L1 · Hunt§1
348. `print-basics/cmyk-why-k` — Why Black plate [왜 K가 필요한가] · L2 · Hunt§19
349. `print-basics/paper-substrate-tour` — Coated/uncoated/newsprint [종이 종류 투어] · L2 · Kipphan§7

### `halftoning-am-fm` (existing 3, +1)
350. `halftoning-am-fm/newspaper-dots-intro` — Magnified newsprint [망점 확대] · L1 · Kipphan§1.3
351. `halftoning-am-fm/halftoning-am-fm-rendering` — AM size vs FM density [AM·FM 디더링] · L4 · Kipphan§1.3
352. `halftoning-am-fm/halftoning-lpi-resolution` — LPI threshold matrix [LPI 해상도] · L4 · Kipphan§1.3
353. `halftoning-am-fm/stochastic-vs-clustered` — Stochastic FM patterns [스토캐스틱 망점] · L5 · ref:Ulichney

### `moire-screen-angles` (existing 2)
354. `moire-screen-angles/moire-screen-angles` — C:15/M:75/Y:90/K:45 [스크린 각도] · L4 · Kipphan§1.3.4
355. `moire-screen-angles/moire-frequency-vectors` — Vector subtraction [모아레 벡터] · L5 · Field§9

### `four-color-separation` (existing 2)
356. `four-color-separation/separation-4color` — CMYK plate overlay [4도 분판] · L3 · Field§5
357. `four-color-separation/separation-pressures` — RGB → CMYK pressure [핀트 정합] · L4 · Kipphan§5

### `dot-gain-absorbance` (existing 2, +1)
358. `dot-gain-absorbance/dot-gain-absorption` — Capillary bleeding [모세관 흡수] · L4 · Kipphan§7.2
359. `dot-gain-absorbance/dot-gain-murray` — Murray-Davies correction [머레이-데이비스] · L5 · Field§6
360. `dot-gain-absorbance/yule-nielsen-n` — Yule-Nielsen n-factor [율-닐슨 n 인자] · L5 · Yule&Nielsen 1951

### `security-ink-tilter` (existing 2)
361. `security-ink-tilter/security-bragg-law` — OVI banknote tilt [지폐 OVI] · L4 · ref:Schmid 2005 · #11
362. `security-ink-tilter/security-goniochromic` — Multilayer Bragg [고니오크로믹] · L5 · ref:Schmid

### `extended-gamut-print` (existing 2)
363. `extended-gamut-print/inkjet-droplet-physics` — Piezo vs thermal droplet [잉크젯 액적] · L5 · Kipphan§4.6
364. `extended-gamut-print/cmykogv-extended-gamut` — Orange/Green/Violet [CMYKOGV] · L5 · ref:HP Indigo

### `specialty-print` (new)
365. `specialty-print/spot-color-pantone-extension` — Pantone Hexachrome legacy [Pantone 헥사크롬] · L4 · ref:Pantone
366. `specialty-print/metallic-ink-flake` — Mica/Al flake metallic ink [메탈릭 잉크] · L4 · ref:Schlenk
367. `specialty-print/foil-stamping` — Hot foil stamping [홀로그래픽 호일] · L4 · Kipphan§6
368. `specialty-print/uv-curing-ink` — UV LED curable acrylates [UV 경화 잉크] · L5 · Kipphan§4.7

### `print-3d-color` (new)
369. `print-3d-color/multijet-fusion-color` — HP MJF voxel color [멀티젯 퓨전 색] · L5 · ref:HP MJF
370. `print-3d-color/full-color-resin-printing` — Mimaki/Stratasys voxel color [풀컬러 수지 3D] · L5 · ref:Mimaki 3DUJ
371. `print-3d-color/color-fdm-blend` — Filament gradient FDM [FDM 그라디언트] · L4 · ref:Prusa MMU

### `print-color-management` (new)
372. `print-color-management/g7-calibration` — G7 gray balance method [G7 캘리브레이션] · L5 · IDEAlliance G7
373. `print-color-management/fogra-iso-12647` — ISO 12647 Fogra standards [Fogra ISO 12647] · L5 · ISO 12647
374. `print-color-management/swop-vs-fogra39` — SWOP vs FOGRA39 ICC [SWOP vs Fogra39] · L4 · ICC profiles
375. `print-color-management/proofing-vs-press` — Inkjet proof vs offset press match [프루핑 vs 인쇄] · L4 · Kipphan§9
376. `print-color-management/spectrophotometer-i1` — Handheld spectrophotometer reading [분광측색기] · L4 · ref:X-Rite i1

---

## Domain 8 — Anthropology, Linguistics & History (27)

### `language-color-evolution` (existing 2, +2)
377. `language-color-evolution/berlin-kay-split` — 11-step name evolution [베를린-케이] · L4 · B&K 1969
378. `language-color-evolution/sapir-whorf-quiz` — Goluboy/Siniy reaction [사피어-워프 퀴즈] · L4 · ref:Winawer 2007
379. `language-color-evolution/grue-languages` — "Grue" languages without blue/green split [그린-블루 미분화 언어] · L3 · B&K 1969
380. `language-color-evolution/wine-dark-sea-homer` — Homeric "wine-dark sea" [호머의 포도주빛 바다] · L3 · ref:Gladstone 1858

### `ancient-pigment-chemistry` (existing 3, +3)
381. `ancient-pigment-chemistry/tyrian-purple-intro` — Murex shellfish [티리안 퍼플] · L2 · Finlay
382. `ancient-pigment-chemistry/trade-routes-map` — Roman routes [교역로 지도] · L3 · Pastoureau Purple
383. `ancient-pigment-chemistry/cochineal-carminic-acid` — Carminic acid pH [코치닐] · L4 · Greenfield 2005
384. `ancient-pigment-chemistry/madder-alizarin-root` — Rubia tinctorum alizarin [꼭두서니 알리자린] · L4 · Berns§5
385. `ancient-pigment-chemistry/sepia-cuttlefish-ink` — Sepia officinalis melanin ink [세피아 먹] · L3 · Finlay
386. `ancient-pigment-chemistry/woad-vs-indigo` — European woad vs Indian indigo [대청 vs 인디고] · L3 · ref:Cardon 2007

### `indigo-oxidation` (existing 2)
387. `indigo-oxidation/leuco-indigo-beaker` — Leuco dip [인디고 비커] · L3 · Zollinger§7.2
388. `indigo-oxidation/oxidation-timeline` — Oxygen crystallization [산화 타임라인] · L4 · Cardon 2007

### `synthetic-dye-history` (existing 2, +1)
389. `synthetic-dye-history/mauveine-distillation` — Perkin 1856 aniline [퍼킨 모브] · L3 · Travis 1993
390. `synthetic-dye-history/prussian-blue-synthesis` — Fe-CN lattice [프러시안 블루] · L4 · Berrie 1997 · #5
391. `synthetic-dye-history/azo-mass-production` — IG Farben azo industrial timeline [아조 산업화] · L4 · Travis 1993

### `ancient-mineral-pigments` (existing 4, +3)
392. `ancient-mineral-pigments/egyptian-blue` — CaCuSi₄O₁₀ NIR luminescence [이집트 블루] · L4 · ref:Accorsi 2009
393. `ancient-mineral-pigments/lapis-ultramarine` — Sodalite S₃⁻ chromophore [라피스·울트라마린] · L4 · ref:Eastaugh
394. `ancient-mineral-pigments/vermillion-cinnabar` — HgS mercury sulfide [버밀리언] · L4 · ref:Eastaugh
395. `ancient-mineral-pigments/maya-blue` — Indigo-palygorskite [마야 블루] · L5 · Sanchez del Rio 2006
396. `ancient-mineral-pigments/ochre-iron-oxides` — Yellow/red/burnt ochre [황·홍·번토] · L3 · ref:Eastaugh
397. `ancient-mineral-pigments/malachite-azurite` — Cu₂CO₃(OH)₂ minerals [말라카이트·아주라이트] · L3 · ref:Eastaugh
398. `ancient-mineral-pigments/lead-white-toxic` — Pb-white toxicity history [연백의 독성사] · L4 · Pastoureau White

### `color-in-religion-and-politics` (new)
399. `color-in-religion-and-politics/purple-imperial-rome` — Roman sumptuary laws [로마 황실 자색] · L3 · Pastoureau Purple
400. `color-in-religion-and-politics/red-cardinals-banks` — Red ecclesiastical and political [붉은색의 권력사] · L3 · Pastoureau Red
401. `color-in-religion-and-politics/blue-virgin-mary` — Blue + Mary medieval shift [성모 마리아의 푸른 옷] · L3 · Pastoureau Blue
402. `color-in-religion-and-politics/yellow-jewish-marker` — Yellow + persecution history [황색 박해 기호사] · L3 · Pastoureau Yellow
403. `color-in-religion-and-politics/white-mourning-east-asia` — White mourning East Asia vs West [동아시아 상복 백색] · L3 · ref:Hanley

---

## Domain 9 — Color in Nature & Biology (43)

### `photosynthesis-pigments` (existing 3, +4)
404. `photosynthesis-pigments/chlorophyll-a-b` — Chlorophyll a/b windows [엽록소 a/b] · L4 · Johnsen§7 · #6
405. `photosynthesis-pigments/carotenoid-antenna` — Carotenoid LH2 [카로테노이드] · L4 · ref:Frank&Cogdell 1996
406. `photosynthesis-pigments/phycoerythrin-red-algae` — Phycoerythrin red absorbing [피코에리트린] · L4 · ref:cyanobacteria pigments
407. `photosynthesis-pigments/why-leaves-are-green` — Green window paradox [잎은 왜 녹색일까] · L2 · Johnsen
408. `photosynthesis-pigments/autumn-color-anthocyanin` — Anthocyanin in fall leaves [단풍 안토시아닌] · L3 · ref:Archetti 2009
409. `photosynthesis-pigments/bacteriorhodopsin-purple` — Halobacterium purple [고세균 보라색] · L5 · ref:bacteriorhodopsin
410. `photosynthesis-pigments/c4-vs-cam-photosynthesis` — C4 / CAM pathway visualization [C4·CAM 광합성] · L5 · ref:plant biology

### `bioluminescence` (existing 2, +4)
411. `bioluminescence/firefly-luciferin` — Luciferin/luciferase ATP [반딧불 루시페린] · L4 · ref:McElroy 1947
412. `bioluminescence/dinoflagellate-deep-sea` — Deep-sea agitation luminescence [심해 자극 발광] · L4 · Johnsen§11
413. `bioluminescence/jellyfish-aequorea-ca2plus` — Aequorea Ca²⁺ luminescence [해파리 칼슘 발광] · L5 · ref:Shimomura
414. `bioluminescence/anglerfish-symbiotic-bacteria` — Anglerfish Photobacterium symbiosis [아귀 발광 공생] · L4 · Johnsen§11
415. `bioluminescence/quorum-sensing-vibrio` — Vibrio fischeri quorum signal [세균 정족수 감지] · L5 · ref:Bassler
416. `bioluminescence/fungal-foxfire` — Mycena chlorophos fungal glow [버섯 발광] · L4 · ref:foxfire chemistry

### `fluorescent-proteins` (existing 2, +3)
417. `fluorescent-proteins/gfp-chromophore` — GFP β-barrel + p-HBDI [GFP 발색단] · L5 · Tsien 1998
418. `fluorescent-proteins/reef-fluorescence-field` — Reef blue-light fluorescence [산호 형광 필드] · L3 · ref:Mazel 2003
419. `fluorescent-proteins/rfp-monomer-evolution` — DsRed → mCherry monomer engineering [RFP 단량체 진화] · L6 · Shaner 2004
420. `fluorescent-proteins/photoswitchable-fp` — PA-GFP/Dronpa switching [광전환 형광단백질] · L6 · ref:Patterson 2002
421. `fluorescent-proteins/biofluorescence-shark` — Catshark blue→green skin fluorescence [상어 형광] · L4 · Park 2019

### `non-human-vision` (existing 3, +4)
422. `non-human-vision/bird-tetrachromacy` — 4th UV cone [조류 4색각] · L4 · Land&Nilsson§8
423. `non-human-vision/mantis-shrimp-12-channel` — 12-channel photoreceptors [갯가재 시각] · L5 · ref:Cronin
424. `non-human-vision/bee-uv-nectar-guides` — Bee UV flower patterns [벌 UV 꿀안내] · L4 · Land&Nilsson
425. `non-human-vision/dog-dichromacy` — Dog yellow-blue dichromacy [개의 이색각] · L3 · ref:Jacobs
426. `non-human-vision/cat-low-light-tapetum` — Cat tapetum lucidum [고양이 휘판] · L3 · Johnsen§4
427. `non-human-vision/snake-thermal-pit` — Snake infrared pit organ [뱀 적외선 감각기] · L4 · ref:Bullock 1956
428. `non-human-vision/octopus-skin-photoreception` — Octopus skin photoreceptors [문어 피부 광수용] · L5 · Ramirez 2015

### `chromatophores` (existing 1, +3)
429. `chromatophores/cuttlefish-expansion` — Neural-controlled expansion [갑오징어 색소포] · L4 · Hanlon&Messenger 1996
430. `chromatophores/octopus-iridophore` — Iridophore + leucophore layers [문어 무지개 세포] · L5 · Mäthger 2009
431. `chromatophores/chameleon-guanine-crystal` — Guanine crystal lattice tuning [카멜레온 결정 격자] · L5 · Teyssier 2015
432. `chromatophores/zebrafish-pattern-formation` — Turing pattern in zebrafish stripes [얼룩말 줄무늬 튜링 패턴] · L5 · Kondo 2010

### `structural-color-bio` (existing 2, +4)
433. `structural-color-bio/morpho-multilayer` — Morpho butterfly multilayer [모르포 나비] · L5 · Vukusic 2003 · #11
434. `structural-color-bio/peacock-photonic-barbule` — Peacock photonic crystal [공작 광결정] · L5 · Zi 2003 · #11
435. `structural-color-bio/beetle-cholesteric` — Beetle cholesteric helicoid [딱정벌레 콜레스테릭] · L6 · Sharma 2009
436. `structural-color-bio/opal-silica-lattice` — Opal Bragg lattice [오팔 격자] · L4 · ref:opal · #11
437. `structural-color-bio/mother-of-pearl-nacre` — Nacre aragonite layers [진주모 아라고나이트] · L4 · Snow 2004
438. `structural-color-bio/hummingbird-iridescence` — Hummingbird platelet stacks [벌새 깃털 무지갯빛] · L4 · Vukusic 2003

### `human-skin-melanin` (existing 1, +2)
439. `human-skin-melanin/eumelanin-vs-pheomelanin` — Eu vs pheo absorption [에우-페오 멜라닌] · L4 · ref:Sturm 2009 · #6
440. `human-skin-melanin/fitzpatrick-scale` — Fitzpatrick I-VI types [피츠패트릭 척도] · L2 · Fitzpatrick 1975
441. `human-skin-melanin/age-related-yellowing` — Age yellowing lipofuscin [노화 황변 리포푸신] · L4 · ref:skin aging

### `plant-colors` (new)
442. `plant-colors/anthocyanin-ph-flower` — Hydrangea pH soil color shift [수국 토양 pH 색 변화] · L3 · ref:plant pigment
443. `plant-colors/betacyanin-beetroot` — Beet betacyanin [비트 베타시아닌] · L3 · ref:Strack 2003
444. `plant-colors/flavonoid-uv-sunscreen` — UV-protective flavonoid [자외선 방어 플라보노이드] · L4 · ref:Cockell 1999
445. `plant-colors/fruit-ripening-color-change` — Chlorophyll loss + lycopene gain [과일 익음 색 변화] · L3 · ref:plant biochemistry
446. `plant-colors/iridescent-marbles-begonia` — Begonia iridescence chloroplast [베고니아 무지개 잎] · L5 · Jacobs 2016

---

## Domain 10 — Imaging & Photography (37)

### `imaging-basics` — L1 (new)
447. `imaging-basics/how-camera-makes-image` — Light → sensor → image [카메라가 그림을 만드는 법] · L1 · Adams Negative
448. `imaging-basics/exposure-intuition` — Bright vs dark exposure [노출 직관] · L1 · Adams Negative
449. `imaging-basics/shutter-speed-motion-freeze` — Fast/slow shutter [셔터 속도 운동] · L1 · Adams Negative

### `camera-optics` (existing 2, +2)
450. `camera-optics/aperture-depth-of-field` — f-stop DoF [조리개·심도] · L3 · Adams Negative
451. `camera-optics/pinhole-vs-lens-imaging` — Pinhole vs lens [핀홀 vs 렌즈] · L2 · Hecht§5
452. `camera-optics/bokeh-shape-aperture-blades` — Aperture blade count vs bokeh [조리개 날개 vs 보케] · L4 · ref:photography optics
453. `camera-optics/lens-distortion-mtf` — MTF curve and distortion [MTF 왜곡] · L5 · Hecht§11

### `sensor-physics` (existing 3, +1)
454. `sensor-physics/bayer-demosaicing` — Bayer CFA interpolation [Bayer 디모자이크] · L4 · ref:Bayer 1976
455. `sensor-physics/quantum-efficiency` — Si sensor QE [센서 QE] · L4 · ref:CMOS sensor
456. `sensor-physics/spectral-sensitivity-mismatch` — Sensor vs CMF [분광 감도 불일치] · L5 · W&S§5.7
457. `sensor-physics/photon-shot-noise` — √N Poisson noise floor [광자 산탄잡음] · L4 · Janesick 2007
458. `sensor-physics/foveon-stacked-sensor` — Foveon stacked photodiodes [Foveon 스택 센서] · L5 · ref:Foveon
459. `sensor-physics/iso-invariance` — ISO invariance modern sensors [ISO 무변성] · L5 · ref:DPReview ISO invariance

### `white-balance-algorithms` (existing 1, +3)
460. `white-balance-algorithms/gray-world-vs-retinex` — Gray World/Retinex/MaxRGB [WB 알고리즘] · L4 · ref:Buchsbaum
461. `white-balance-algorithms/manual-kelvin-tint` — Manual K + tint sliders [수동 K·틴트] · L3 · ref:ACR/LR
462. `white-balance-algorithms/auto-wb-failure-modes` — Mixed light AWB failure [혼합광 AWB 실패] · L4 · ref:photography
463. `white-balance-algorithms/dual-illuminant-dcp` — Dual-illuminant DCP profile [듀얼 일루미넌트 DCP] · L5 · Adobe DNG SDK

### `camera-color-pipeline` (existing 2, +2)
464. `camera-color-pipeline/raw-to-aces-idt` — RAW → IDT → ACEScg [ACES IDT] · L5 · AMPAS
465. `camera-color-pipeline/debayer-gamma-jpeg` — Pipeline chain [JPEG 파이프라인] · L4 · ref:JPEG
466. `camera-color-pipeline/dng-camera-matrices` — DNG ColorMatrix1/2 [DNG 카메라 행렬] · L5 · Adobe DNG
467. `camera-color-pipeline/cinema-log-encoding` — Log curve (S-Log/Log C/V-Log) [시네마 로그] · L5 · Sony/Arri/Panasonic specs

### `film-emulation` (existing 2, +1)
468. `film-emulation/orthochromatic-panchromatic` — B&W film spectral evolution [흑백 필름 분광] · L3 · Adams Negative
469. `film-emulation/color-negative-curves` — Tone + D-Log curves [컬러 네거티브] · L4 · Hunt§6
470. `film-emulation/film-grain-vs-digital-noise` — Grain vs noise distinction [입자 vs 잡음] · L4 · ref:Eastman Kodak

### `color-grading` (existing 1, +3)
471. `color-grading/lift-gamma-gain-wheel` — Color wheel grading [컬러 그레이딩] · L5 · ref:DaVinci Resolve
472. `color-grading/3d-lut-application` — 3D LUT cube apply [3D LUT 적용] · L5 · Reinhard
473. `color-grading/teal-and-orange-cinema` — Teal-orange complementary cinema look [티얼-오렌지] · L4 · ref:cinematography
474. `color-grading/skin-tone-line` — IQ vector skin tone line [살색 라인] · L5 · Poynton§30

### `exposure-photometry` (existing 1, +2)
475. `exposure-photometry/exposure-triangle` — ISO/Aperture/Shutter [노출 삼각형] · L3 · Adams Negative
476. `exposure-photometry/zone-system` — Adams Zone System I-X [존 시스템] · L4 · Adams Negative
477. `exposure-photometry/spot-vs-evaluative-metering` — Spot vs evaluative meter [부분측광 vs 다분할측광] · L3 · ref:camera metering
478. `exposure-photometry/sunny-16-rule` — Sunny 16 mnemonic [써니 16 법칙] · L2 · ref:Sunny 16

### `computational-photography` (new)
479. `computational-photography/hdr-bracket-merge` — Multi-exposure HDR merge [HDR 브래킷 합성] · L5 · Reinhard§4
480. `computational-photography/focus-stacking` — Multi-focus depth fusion [포커스 스태킹] · L5 · ref:Helicon Focus
481. `computational-photography/panorama-stitch-blend` — Panorama color blending [파노라마 합성] · L5 · Brown&Lowe 2007
482. `computational-photography/night-mode-burst` — Pixel/iPhone night mode burst [야간 모드 버스트] · L6 · Hasinoff 2016

---

## Domain 11 — Computational Color & Image Processing (25) [신규]

### `convolutions-and-filters` (new)
483. `convolutions-and-filters/gaussian-blur` — 2D Gaussian convolution [가우시안 블러] · L4 · G&W§3
484. `convolutions-and-filters/box-blur-fast` — Separable box blur [박스 블러] · L4 · G&W§3
485. `convolutions-and-filters/sobel-edge-detect` — Sobel x/y edge gradient [소벨 에지] · L4 · G&W§10
486. `convolutions-and-filters/laplacian-of-gaussian` — LoG blob detect [LoG 블롭] · L5 · G&W§10
487. `convolutions-and-filters/unsharp-masking` — Detail enhancement [언샤프 마스킹] · L4 · G&W§3
488. `convolutions-and-filters/bilateral-filter` — Edge-preserving smooth [양방향 필터] · L5 · Tomasi&Manduchi 1998

### `color-quantization` (new)
489. `color-quantization/median-cut` — Heckbert median cut [메디안 컷] · L5 · Heckbert 1982
490. `color-quantization/k-means-color` — K-means in Lab space [K-평균 색 양자화] · L5 · G&W§10
491. `color-quantization/octree-color` — Octree quantization [옥트리 양자화] · L5 · Gervautz 1988
492. `color-quantization/popularity-vs-uniform` — Popularity vs uniform compare [인기 vs 균일 양자화] · L4 · G&W§6

### `dithering` (new)
493. `dithering/floyd-steinberg` — Floyd-Steinberg error diffusion [Floyd-Steinberg 디더] · L4 · Floyd&Steinberg 1976
494. `dithering/atkinson-classic-mac` — Atkinson dither old Mac [Atkinson 디더] · L4 · ref:Bill Atkinson
495. `dithering/ordered-bayer-matrix` — Bayer ordered dither [Bayer 정렬 디더] · L4 · Bayer 1973
496. `dithering/blue-noise-mask` — Blue-noise dither mask [블루노이즈 디더] · L5 · Ulichney 1993

### `color-segmentation-and-cv` (new)
497. `color-segmentation-and-cv/grabcut` — GrabCut color graph cut [그랩컷] · L6 · Rother 2004
498. `color-segmentation-and-cv/superpixels-slic` — SLIC superpixels [SLIC 슈퍼픽셀] · L5 · Achanta 2012
499. `color-segmentation-and-cv/chroma-key-greenscreen` — Chroma key extraction [크로마키 그린스크린] · L4 · ref:Smith&Blinn 1996

### `color-compression` (new)
500. `color-compression/jpeg-ycbcr-subsample` — JPEG YCbCr 4:2:0 [JPEG 색차 서브샘플링] · L5 · ITU-T T.81
501. `color-compression/dxt1-endpoint` — DXT1/BC1 block endpoints [DXT1 BC1] · L6 · ref:Microsoft BC
502. `color-compression/bc7-mode-explorer` — BC7 mode partitioning [BC7 모드 탐색] · L6 · ref:Microsoft BC7
503. `color-compression/avif-vs-jpeg-comparison` — AVIF vs JPEG visual quality [AVIF vs JPEG] · L5 · ref:AVIF AOM

### `color-and-ml` (new)
504. `color-and-ml/color-from-grayscale-cnn` — CNN colorization [흑백 → 색 CNN] · L6 · Zhang 2016
505. `color-and-ml/style-transfer-color` — Neural style transfer color stats [스타일 전이] · L6 · Gatys 2015
506. `color-and-ml/cnn-color-jitter-augment` — Color jitter data augmentation [색 지터 증강] · L5 · ref:Krizhevsky 2012
507. `color-and-ml/spectral-superresolution-rgb-to-spectrum` — RGB → hyperspectral recovery [RGB → 분광 복원] · L6 · Arad 2018

---

## Domain 12 — Color & Cognition / Psychology (20) [신규]

### `attention-and-perception` (new)
508. `attention-and-perception/stroop-effect-classic` — Stroop word-color interference [스트룹 효과] · L3 · Stroop 1935
509. `attention-and-perception/reverse-stroop` — Color naming faster than word reading [역스트룹] · L4 · ref:MacLeod 1991
510. `attention-and-perception/color-pop-out-search` — Pop-out vs conjunction search [팝아웃 탐색] · L3 · Treisman&Gelade 1980
511. `attention-and-perception/inattentional-blindness-color` — Color changes missed [부주의 맹점] · L3 · Simons&Chabris 1999

### `color-and-emotion` (new)
512. `color-and-emotion/red-arousal-physiological` — Red elevates pulse [붉은색 각성] · L4 · Elliot 2014
513. `color-and-emotion/blue-calming-effect` — Blue relaxation evidence [푸른색 진정] · L4 · Elliot 2014
514. `color-and-emotion/cross-cultural-color-meaning` — Color symbolism cross-culture [문화별 색 상징] · L3 · ref:Madden 2000
515. `color-and-emotion/seasonal-color-preference` — Seasonal preference shift [계절별 색 선호] · L4 · Schloss 2017

### `marketing-and-branding` (new)
516. `marketing-and-branding/brand-color-recall` — Coca-Cola red, Tiffany blue recall [브랜드 색 회상] · L3 · ref:Pantone brand
517. `marketing-and-branding/cta-button-color-ab` — A/B button color CTR [CTA 버튼 A/B] · L4 · ref:HubSpot studies
518. `marketing-and-branding/packaging-color-trust` — Packaging color trust signaling [포장 색 신뢰] · L3 · ref:Singh 2006
519. `marketing-and-branding/menu-pricing-color` — Restaurant menu color price perception [메뉴 색·가격] · L3 · ref:Cornell 2009

### `synesthesia-and-cross-modal` (new)
520. `synesthesia-and-cross-modal/grapheme-color-synesthesia` — Letter → color mapping [글자 → 색 공감각] · L4 · Ramachandran 2001
521. `synesthesia-and-cross-modal/chromesthesia-sound-color` — Sound → color synesthesia [소리 → 색 공감각] · L4 · ref:Cytowic
522. `synesthesia-and-cross-modal/bouba-kiki-color-shape` — Bouba/kiki shape-color [부바·키키] · L3 · Köhler 1929
523. `synesthesia-and-cross-modal/taste-color-cross-modal` — Taste + color expectation [맛·색 교차감] · L4 · Spence 2015

### `color-and-memory-cognition` (new)
524. `color-and-memory-cognition/color-memory-shift` — Memory color desaturation [색 기억 탈색] · L4 · Bartleson 1960
525. `color-and-memory-cognition/landmark-color-recall` — Landmark color recall test [지표 색 회상 실험] · L3 · ref:cognitive psych
526. `color-and-memory-cognition/safety-color-warning-efficacy` — Red warning sign effectiveness [경고색 효능] · L4 · ANSI Z535
527. `color-and-memory-cognition/color-coded-passwords` — Color-coded password memorability [색 부호화 비밀번호] · L3 · ref:usable security

---

## 도메인별 합계 및 검증

| Domain | Modules | 누적 |
| :--- | :--- | :--- |
| D1 Optics | 123 | 123 |
| D2 Vision | 60 | 183 |
| D3 Chemistry | 38 | 221 |
| D4 Colorimetry | 40 | 261 |
| D5 Design | 38 | 299 |
| D6 Display | 37 | 336 |
| D7 Print | 30 | 366 |
| D8 Anthropology | 27 | 393 |
| D9 Biology | 43 | 436 |
| D10 Imaging | 37 | 473 |
| D11 Computational | 25 | 498 |
| D12 Psychology | 20 | 518 |
| **합계** | **518** | |

> 최종 카운트: **518개 모듈**, 일련번호 1~527 (도메인 간 카테고리 분리로 일부 번호 공백 허용). `scripts/verify-catalog.ts`가 빌드 시 master sequential count == folder count 검증.

## 모듈 메타데이터 자동화 (요약)

각 모듈의 `meta.json`은 다음을 포함한다 (자세한 스키마는 `evaluation_and_expansion.md` 부록 A):

- `id`, `title.{en,ko}`, `tier` (headliner/reference/atom), `bloom_level`, `domain`, `nassau_causes`, `prerequisites`, `leads_to`, `textbook_refs`, `standards`, `learning_paths`, `seo_keywords`, `estimated_hours`, `status`

이 카탈로그의 각 줄은 빌드 타임에 `meta.json`으로 자동 변환되어 사이트맵·검색·학습경로 UI의 단일 원천이 된다.

## 향후 확장 여지 (518 → 최대 ~700)

본 카탈로그는 *교과서 정합 천장*의 약 74%에 도달했다. 나머지 ~200 모듈의 자연스러운 확장 후보:

- **D1 Optics**: Born&Wolf 엄밀 영역 (Kramers-Kronig 관계, 비선형 광학 확장, 결정 광학 심화) ~30개
- **D2 Vision**: 발달 시각 (영유아 색 발달, 노화), 임상 시각 (백내장, 망막색소변성) ~15개
- **D4 Colorimetry**: 분광 측광 심화 (사선 조명 측정, 형광 시편 처리), CAM 변형 ~10개
- **D9 Biology**: 해양 생물 발색 (해파리 색, 산호 분광), 곤충 시각 변종 ~15개
- **D11 Computational**: 영상 처리 심화 (시각 인지 모델 기반 압축, GAN 색 보정) ~15개
- **D12 Psychology**: 임상 색채치료, 환경심리학 확장 ~15개

500의 *유의미한 천장*은 약 700이다. 그 이상은 재구성 없이는 중복 누적이 시작된다.
