import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Adams Zone descriptions (canonical from The Negative)
const ZONES: { idx: string; desc: string; sample: string }[] = [
  { idx: '0', desc: 'paper black, total black, no detail',           sample: 'shadow under car' },
  { idx: 'I', desc: 'first hint of tone, no detail',                   sample: 'deep shadow' },
  { idx: 'II', desc: 'first visible texture, minimal detail',          sample: 'dark foliage in shade' },
  { idx: 'III', desc: 'dark with full texture, dark fabric, foliage',  sample: 'navy jeans in light' },
  { idx: 'IV', desc: 'dark skin / dark stone / shadowed grass',        sample: 'dark skin' },
  { idx: 'V', desc: 'middle grey · 18% reflectance · the anchor',      sample: 'standard grey card' },
  { idx: 'VI', desc: 'caucasian skin in sun, light foliage',           sample: 'sunlit caucasian skin' },
  { idx: 'VII', desc: 'light skin in shade, light grey, snow detail',  sample: 'snow in shade' },
  { idx: 'VIII', desc: 'highest light tone with full texture',         sample: 'fresh white snow' },
  { idx: 'IX', desc: 'near white, hint of texture, edge of paper',     sample: 'sunlit snow' },
  { idx: 'X', desc: 'paper white, no texture, specular highlight',     sample: 'sun glint on chrome' },
];

class ZoneSystem {
  private stage: CanvasStage;
  private ev = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ev = hydrateNumber('ev', 0);
    const s = document.getElementById('ev') as EncSlider; s.value = this.ev;
    s.addEventListener('input', (e) => { this.ev = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ev', () => Math.round(this.ev));
    document.addEventListener('reset-params', () => { this.ev = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 28;
    // Zone strip (top)
    const stripY = M + 24;
    const stripH = 70;
    const cellW = (w - 2 * M) / 11;

    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('Adams Zone Scale — each zone is one stop (factor of 2) brighter', M, M + 12);

    for (let i = 0; i < 11; i++) {
      const v = Math.round((i / 10) * 255);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(M + i * cellW, stripY, cellW - 2, stripH);
      g.fillStyle = i < 5 ? `rgb(220,220,220)` : `rgb(50,50,50)`;
      g.font = '14px serif'; g.textAlign = 'center';
      g.fillText(`${ZONES[i].idx}`, M + i * cellW + cellW / 2, stripY + stripH / 2 + 5);
    }

    // Zone V marker (mid-grey, 18%)
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.strokeRect(M + 5 * cellW - 2, stripY - 2, cellW + 2, stripH + 4);
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('mid-grey · 18%', M + 5 * cellW + cellW / 2, stripY + stripH + 14);

    // Scene patches: simulate a real scene with five fixed subjects at known zone placements
    const scene: { label: string; baseZone: number }[] = [
      { label: 'shadow under porch', baseZone: 2 },
      { label: 'dark fence',         baseZone: 3 },
      { label: 'grey card',          baseZone: 5 },
      { label: 'skin in sun',        baseZone: 6 },
      { label: 'snow in sun',        baseZone: 8 },
    ];

    const sy = stripY + stripH + 60;
    const sH = 60;
    const sw = (w - 2 * M - (scene.length - 1) * 12) / scene.length;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`Sample scene with exposure compensation ${this.ev > 0 ? '+' : ''}${this.ev} EV`, M, sy - 8);

    let anyShadowClip = false, anyHiClip = false;
    for (let i = 0; i < scene.length; i++) {
      const placed = scene[i].baseZone + this.ev;
      const clamped = Math.max(0, Math.min(10, placed));
      if (placed < 0.5) anyShadowClip = true;
      if (placed > 9.5) anyHiClip = true;
      const v = Math.round((clamped / 10) * 255);
      const x = M + i * (sw + 12);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, sy, sw, sH);
      g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(x, sy, sw, sH);

      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(scene[i].label, x + sw / 2, sy + sH + 14);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
      const zoneTxt = placed < 0 ? `Zone 0 (clipped from ${placed})` : placed > 10 ? `Zone X (clipped from ${placed})` : `Zone ${Math.round(placed)}`;
      g.fillText(zoneTxt, x + sw / 2, sy + sH + 28);
    }

    // Description of currently-meter Zone V subject (e.g., where would the grey card fall)
    const ry = sy + sH + 60;
    g.fillStyle = theme.crimson; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('clip warnings:', M, ry);
    g.fillStyle = anyShadowClip ? theme.crimson : theme.inkAlpha(0.6); g.font = '12px serif';
    g.fillText(anyShadowClip ? '◉ shadow clip — at least one subject pushed to Zone 0 (texture lost)' : '◯ no shadow clip', M, ry + 20);
    g.fillStyle = anyHiClip ? theme.crimson : theme.inkAlpha(0.6);
    g.fillText(anyHiClip ? '◉ highlight clip — at least one subject pushed to Zone X (paper white, no texture)' : '◯ no highlight clip', M, ry + 38);

    // Zone V description footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Adams: "Place a subject on a zone by metering it; the rest of the scene falls where it falls."', M, ry + 64);
  }
}

new ZoneSystem();
