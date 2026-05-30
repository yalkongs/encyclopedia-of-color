import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Vermilion {
  private stage: CanvasStage;
  private d = 8;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 8);
    const s = document.getElementById('d') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 8; s.value = 8; this.draw(); notifyStateChange(); });
  }

  private swatchColor(d: number): string {
    // small grain: deeper crimson, larger grain: more scattering of red, brighter orange-red
    const fineFactor = Math.max(0, Math.min(1, (d - 2) / 38));
    const r = Math.round(0xb0 + 0x40 * fineFactor);
    const gC = Math.round(0x10 + 0x50 * fineFactor);
    const b = Math.round(0x10 + 0x20 * fineFactor);
    return `rgb(${r},${gC},${b})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const col = this.swatchColor(this.d);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`grain ${this.d.toFixed(0)} μm · swatch ${col}`, M, M);

    // Swatch
    const cx = M, cy = M + 30, cw = 300, ch = 280;
    g.fillStyle = col; g.fillRect(cx, cy, cw, ch);
    // Sprinkle visible particles whose size scales with d
    const N = 400, pix = Math.max(1, this.d / 4);
    for (let i = 0; i < N; i++) {
      const x = cx + Math.random() * cw, y = cy + Math.random() * ch;
      g.fillStyle = `rgba(180,30,30,${0.18 + 0.4 * Math.random()})`;
      g.beginPath(); g.arc(x, y, pix, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(cx, cy, cw, ch);

    // Band diagram (right)
    const bx = cx + cw + 40, by = cy + 20, bw = 220, bh = 230;
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('α-HgS band diagram', bx + bw / 2, by - 6);
    // VB
    g.fillStyle = '#4a5a78'; g.fillRect(bx + 30, by + bh - 80, bw - 60, 30);
    g.fillStyle = '#fff'; g.font = '11px serif';
    g.fillText('valence band', bx + bw / 2, by + bh - 60);
    // CB
    g.fillStyle = '#5a7878'; g.fillRect(bx + 30, by + 60, bw - 60, 30);
    g.fillStyle = '#fff';
    g.fillText('conduction band', bx + bw / 2, by + 80);
    // Bandgap arrow
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath(); g.moveTo(bx + bw / 2, by + 90); g.lineTo(bx + bw / 2, by + bh - 80);
    g.lineTo(bx + bw / 2 - 4, by + bh - 84); g.moveTo(bx + bw / 2, by + bh - 80); g.lineTo(bx + bw / 2 + 4, by + bh - 84); g.stroke();
    g.fillStyle = theme.crimson; g.font = 'bold 11px serif';
    g.fillText('Eg ≈ 2.0 eV', bx + bw / 2, by + bh / 2);
    g.fillText('(λ ≈ 620 nm)', bx + bw / 2, by + bh / 2 + 14);

    // Wavelengths absorbed (blue-green): coloured fading bar at top
    const wbx = bx, wby = by + bh + 14;
    for (let k = 0; k < bw; k++) {
      const lam = 380 + (k / bw) * (700 - 380);
      g.fillStyle = `hsl(${300 - (lam - 380) * (300 / 320)} 80% 50%)`;
      g.fillRect(wbx + k, wby, 1, 14);
    }
    // Hatch over absorbed range (<620 nm)
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(wbx, wby, ((620 - 380) / 320) * bw, 14);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('absorbed', wbx + ((620 - 380) / 320) * bw / 2, wby + 28);
    g.fillText('reflected', wbx + ((620 - 380) / 320) * bw + ((700 - 620) / 320) * bw / 2, wby + 28);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Almadén\'s Roman cinnabar mine ran on slave labour with mortality measured in months. Modern art uses cadmium red (CdSe) — also toxic, slowly being phased out.', M, h - M);
  }
}

new Vermilion();
