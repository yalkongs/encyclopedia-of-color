import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type Cam = 'alexa' | 'red' | 'sony';
const CAMS: Cam[] = ['alexa', 'red', 'sony'];

// Inverse of each camera's IDT: matrix that takes ACES 2065-1 → camera native RGB
// We compute camera native from a scene ACES value as INV_IDT * aces
// (Real IDTs go camera→ACES; we use their inverse here so we can simulate "the camera's raw view".)
// These values are reasonable approximations sourced from public IDT tables (AMPAS GitHub `aces-dev`).
const INV_IDT: Record<Cam, number[][]> = {
  alexa: [
    [ 1.6184, -0.5384, -0.0800],
    [-0.0853,  1.5651, -0.4798],
    [ 0.0061, -0.2628,  1.2567],
  ],
  red: [
    [ 1.3895, -0.3270, -0.0625],
    [-0.1338,  1.4863, -0.3525],
    [ 0.0146, -0.3160,  1.3014],
  ],
  sony: [
    [ 1.4514, -0.3568, -0.0946],
    [-0.0986,  1.4593, -0.3607],
    [ 0.0119, -0.2474,  1.2355],
  ],
};

// IDT (camera → ACES 2065-1) — inverse of INV_IDT — computed at runtime
function inv3(m: number[][]): number[][] {
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) throw new Error('singular');
  return [
    [(e * i - f * h) / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [-(d * i - f * g) / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [(d * h - e * g) / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}
function mul3(M: number[][], v: [number, number, number]): [number, number, number] {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}

// AP0 (ACES 2065-1) → AP1 (ACEScg) — fixed matrix from SMPTE ST 2065-1 / ACES specification
const AP0_TO_AP1 = [
  [ 1.4514393161, -0.2365107469, -0.2149285693],
  [-0.0765537734,  1.1762296998, -0.0996759264],
  [ 0.0083161484, -0.0060324498,  0.9977163014],
];

// ACEScg → linear sRGB (approximate — for display only)
const ACESCG_TO_SRGB = [
  [ 1.7050, -0.6217, -0.0833],
  [-0.1306,  1.1409, -0.0103],
  [-0.0240, -0.1289,  1.1529],
];

function srgbEncode(c: number): number {
  c = Math.max(0, Math.min(1, c));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

class RawToAces {
  private stage: CanvasStage;
  private cam: Cam = 'alexa';
  private scene = 18;

  // Three scene patches in ACES 2065-1 (skin, foliage, sky-ish), arbitrary fixed values
  private patches: [number, number, number][] = [
    [0.45, 0.28, 0.20], // skin
    [0.25, 0.40, 0.15], // foliage
    [0.30, 0.45, 0.65], // sky
  ];

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    const raw = hydrateFromUrl('cam');
    if (raw && (CAMS as string[]).includes(raw)) this.cam = raw as Cam;
    this.scene = hydrateNumber('scene', 18);

    const tCam = document.getElementById('cam') as EncToggle;
    tCam.value = this.cam;
    tCam.addEventListener('change', (e) => { this.cam = (e as CustomEvent).detail.value as Cam; this.draw(); notifyStateChange(); });

    const sScene = document.getElementById('scene') as EncSlider;
    sScene.value = this.scene;
    sScene.addEventListener('input', (e) => { this.scene = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    registerStateParam('cam', () => this.cam);
    registerStateParam('scene', () => Math.round(this.scene));

    document.addEventListener('reset-params', () => {
      this.cam = 'alexa'; this.scene = 18; tCam.value = 'alexa'; sScene.value = 18;
      this.draw(); notifyStateChange();
    });
  }

  private aces2065FromSceneScale(p: [number, number, number]): [number, number, number] {
    const k = this.scene / 18; // scale relative to default 18%
    return [p[0] * k, p[1] * k, p[2] * k];
  }

  private cameraNative(aces: [number, number, number]): [number, number, number] {
    return mul3(INV_IDT[this.cam], aces);
  }

  private acesFromCam(cam: [number, number, number]): [number, number, number] {
    const M = inv3(INV_IDT[this.cam]);
    return mul3(M, cam);
  }

  private acescg(aces: [number, number, number]): [number, number, number] {
    return mul3(AP0_TO_AP1, aces);
  }

  // For display only: convert ACEScg → linear sRGB → encoded sRGB
  private toCssFromAcescg(acescg: [number, number, number]): string {
    const lin = mul3(ACESCG_TO_SRGB, acescg);
    const r = srgbEncode(lin[0]), g = srgbEncode(lin[1]), b = srgbEncode(lin[2]);
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  }

  // For camera native display: pretend native is sRGB-like for visualisation only
  private toCssFromCam(cam: [number, number, number]): string {
    return `rgb(${Math.round(Math.max(0, Math.min(1, cam[0])) * 255)},${Math.round(Math.max(0, Math.min(1, cam[1])) * 255)},${Math.round(Math.max(0, Math.min(1, cam[2])) * 255)})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 36;
    // Pipeline columns: scene → camera-native → ACES2065 → ACEScg
    const stageNames = ['scene XYZ (proxy)', `${this.cam.toUpperCase()} native RGB`, 'ACES 2065-1 (AP0)', 'ACEScg (AP1, working)'];
    const colW = (w - 2 * M) / 4;
    const colY = M + 30;
    const rowH = 56;

    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'center';
    for (let i = 0; i < 4; i++) {
      g.fillText(stageNames[i], M + (i + 0.5) * colW, M + 14);
    }

    // Patches across all stages
    for (let p = 0; p < 3; p++) {
      const sceneAces = this.aces2065FromSceneScale(this.patches[p]);
      const camNative = this.cameraNative(sceneAces);
      const acesBack = this.acesFromCam(camNative); // round-trip — should equal sceneAces
      const acescg = this.acescg(acesBack);

      const stages: { value: [number, number, number]; css: string; label: string }[] = [
        { value: sceneAces, css: this.toCssFromAcescg(this.acescg(sceneAces)), label: `${(sceneAces[0]).toFixed(2)} ${(sceneAces[1]).toFixed(2)} ${(sceneAces[2]).toFixed(2)}` },
        { value: camNative, css: this.toCssFromCam(camNative), label: `${camNative[0].toFixed(2)} ${camNative[1].toFixed(2)} ${camNative[2].toFixed(2)}` },
        { value: acesBack, css: this.toCssFromAcescg(this.acescg(acesBack)), label: `${acesBack[0].toFixed(2)} ${acesBack[1].toFixed(2)} ${acesBack[2].toFixed(2)}` },
        { value: acescg, css: this.toCssFromAcescg(acescg), label: `${acescg[0].toFixed(2)} ${acescg[1].toFixed(2)} ${acescg[2].toFixed(2)}` },
      ];

      for (let s = 0; s < 4; s++) {
        const x = M + s * colW + 10;
        const y = colY + p * (rowH + 12);
        const swW = colW - 80;
        g.fillStyle = stages[s].css;
        g.fillRect(x, y, swW * 0.55, rowH);
        g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1;
        g.strokeRect(x, y, swW * 0.55, rowH);
        g.fillStyle = theme.inkAlpha(0.85); g.font = '10px monospace'; g.textAlign = 'left';
        g.fillText(stages[s].label, x + swW * 0.55 + 8, y + 14);
      }
    }

    // Arrow + matrix label between columns
    const annY = colY + 3 * (rowH + 12) + 16;
    const arrows = [
      { from: 0, label: 'capture' },
      { from: 1, label: `IDT_${this.cam}` },
      { from: 2, label: 'AP0 → AP1' },
    ];
    for (const a of arrows) {
      const cx = M + (a.from + 1) * colW;
      g.strokeStyle = theme.crimson; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - 20, annY - 90); g.lineTo(cx + 20, annY - 90); g.stroke();
      g.beginPath(); g.moveTo(cx + 14, annY - 95); g.lineTo(cx + 20, annY - 90); g.lineTo(cx + 14, annY - 85); g.stroke();
      g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(a.label, cx, annY - 100);
    }

    // Annotation
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    const ny = annY + 4;
    g.fillText(`Cycle the camera. The "${this.cam.toUpperCase()} native RGB" column changes — the IDT compensates so columns 3 and 4 stay the same.`, M, ny);
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('IDT is camera-specific. ACES 2065-1 and ACEScg are camera-agnostic working spaces — the whole point of ACES.', M, ny + 18);
  }
}

new RawToAces();
