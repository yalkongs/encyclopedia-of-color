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

type Skin = 'light' | 'medium' | 'olive' | 'dark';
const SKINS: Skin[] = ['light', 'medium', 'olive', 'dark'];
const SKIN_RGB: Record<Skin, [number, number, number]> = {
  light:  [231, 201, 175],
  medium: [194, 150, 130],
  olive:  [156, 121, 90],
  dark:   [99, 67, 55],
};

// Convert sRGB → YCbCr Rec.601 (which the vectorscope is based on)
function rgbToYCbCr(r: number, g: number, b: number): [number, number, number] {
  const Y = 0.299 * r + 0.587 * g + 0.114 * b;
  const Cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
  const Cr = 0.500 * r - 0.419 * g - 0.081 * b + 128;
  return [Y, Cb, Cr];
}

class SkinLine {
  private stage: CanvasStage;
  private skin: Skin = 'medium';
  private cast = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('skin');
    if (raw && (SKINS as string[]).includes(raw)) this.skin = raw as Skin;
    this.cast = hydrateNumber('cast', 0);

    const t = document.getElementById('skin') as EncToggle; t.value = this.skin;
    t.addEventListener('change', (e) => { this.skin = (e as CustomEvent).detail.value as Skin; this.draw(); notifyStateChange(); });

    const s = document.getElementById('cast') as EncSlider; s.value = this.cast;
    s.addEventListener('input', (e) => { this.cast = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    registerStateParam('skin', () => this.skin);
    registerStateParam('cast', () => Math.round(this.cast));

    document.addEventListener('reset-params', () => {
      this.skin = 'medium'; this.cast = 0; t.value = 'medium'; s.value = 0;
      this.draw(); notifyStateChange();
    });
  }

  // Apply a global cast as a B-R bias (negative = warm/red, positive = cool/blue)
  private withCast(rgb: [number, number, number]): [number, number, number] {
    const k = this.cast;
    return [
      Math.max(0, Math.min(255, rgb[0] - k)),
      Math.max(0, Math.min(255, rgb[1] - k * 0.3)),
      Math.max(0, Math.min(255, rgb[2] + k)),
    ];
  }

  private draw() {
    const { w: W, h: H } = this.stage.logicalSize;
    if (W === 0 || H === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, W, H);

    const M = 30;
    // Vectorscope: Cb (x) Cr (y), centred at (128, 128)
    const size = Math.min(W - 200, H - 80);
    const cx = M + size / 2;
    const cy = M + size / 2;
    const radius = size / 2 - 10;

    // Outer circle
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, radius, 0, Math.PI * 2); g.stroke();
    // Centre marker
    g.fillStyle = theme.inkAlpha(0.4); g.beginPath(); g.arc(cx, cy, 2, 0, Math.PI * 2); g.fill();

    // Skin-tone line at 123° (measured CCW from +Cb axis, equivalent to the I axis)
    const angle = (123 * Math.PI) / 180;
    g.strokeStyle = theme.gold; g.lineWidth = 2; g.setLineDash([4, 4]);
    g.beginPath();
    g.moveTo(cx - Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    g.lineTo(cx + Math.cos(angle) * radius, cy - Math.sin(angle) * radius);
    g.stroke();
    g.setLineDash([]);

    // Standard target boxes (R, Yl, G, Cy, B, Mg) — vectorscope graticule
    const targets: [string, number, number, string][] = [
      ['R',  90, 75,  '#a3132d'],
      ['Yl', 80, 5,   '#c9a13a'],
      ['G',  50, 4,   '#3a9555'],
      ['Cy', 60, 50,  '#3a9595'],
      ['B',  90, 80,  '#2d4ca3'],
      ['Mg', 80, 80,  '#a32d80'],
    ];
    // Project standard at (Cb,Cr) offsets — use canonical 75% bar offsets in normalized form
    // (simplified placement around the perimeter)
    const targetAngles: [string, number, string][] = [
      ['R', 103, '#a3132d'],   // ~104°
      ['Yl', 167, '#c9a13a'],
      ['G', 241, '#3a9555'],
      ['Cy', 283, '#3a9595'],
      ['B', 347, '#2d4ca3'],
      ['Mg', 61, '#a32d80'],
    ];
    void targets;
    for (const [lbl, deg, col] of targetAngles) {
      const a = (deg * Math.PI) / 180;
      const px = cx + Math.cos(a) * radius * 0.7;
      const py = cy - Math.sin(a) * radius * 0.7;
      g.strokeStyle = col; g.lineWidth = 1.5;
      g.strokeRect(px - 8, py - 8, 16, 16);
      g.fillStyle = col; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(lbl, px, py - 12);
    }

    // Skin tone line label
    g.fillStyle = theme.gold; g.font = '11px serif'; g.textAlign = 'left';
    const lblX = cx + Math.cos(angle) * (radius + 8);
    const lblY = cy - Math.sin(angle) * (radius + 8);
    g.fillText('skin-tone line', lblX, lblY - 4);

    // Plot 4 skin samples (small, faint) + active sample (bold)
    for (const sk of SKINS) {
      const rgb = sk === this.skin ? this.withCast(SKIN_RGB[sk]) : SKIN_RGB[sk];
      const [, Cb, Cr] = rgbToYCbCr(rgb[0], rgb[1], rgb[2]);
      // Map Cb,Cr to vectorscope: x = (Cb-128)/128 * radius, y = -(Cr-128)/128 * radius
      const x = cx + ((Cb - 128) / 128) * radius;
      const y = cy - ((Cr - 128) / 128) * radius;
      g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const sz = sk === this.skin ? 11 : 6;
      g.beginPath(); g.arc(x, y, sz, 0, Math.PI * 2); g.fill();
      g.strokeStyle = sk === this.skin ? theme.crimson : theme.inkAlpha(0.5); g.lineWidth = sk === this.skin ? 2 : 1;
      g.stroke();
      g.fillStyle = theme.ink; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(sk, x, y + sz + 12);
    }

    // Right-side readout
    const rx = M + size + 20;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('vectorscope', rx, M + 14);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('Cb (horizontal) · Cr (vertical)', rx, M + 32);
    g.fillText('skin line ≈ 123° (I axis, NTSC 1953)', rx, M + 52);

    // Current skin info
    const rgb = this.withCast(SKIN_RGB[this.skin]);
    const [Y, Cb, Cr] = rgbToYCbCr(rgb[0], rgb[1], rgb[2]);
    g.fillStyle = theme.crimson; g.font = '12px serif';
    g.fillText(`active: ${this.skin}`, rx, M + 88);
    g.fillStyle = theme.inkAlpha(0.85); g.font = '11px monospace';
    g.fillText(`Y ${Y.toFixed(0)}   Cb ${Cb.toFixed(0)}   Cr ${Cr.toFixed(0)}`, rx, M + 104);

    // Distance from line
    const dx = (Cb - 128) / 128;
    const dy = -(Cr - 128) / 128;
    // line direction unit vector
    const ux = Math.cos(angle);
    const uy = -Math.sin(angle);
    // perpendicular distance
    const perp = Math.abs(dx * uy - dy * ux);
    g.fillStyle = perp > 0.05 ? theme.crimson : theme.inkAlpha(0.65);
    g.font = '11px serif';
    g.fillText(`perpendicular distance from line: ${perp.toFixed(3)}`, rx, M + 130);
    if (perp > 0.05) {
      g.fillStyle = theme.crimson;
      g.fillText('off the line — skin grading is drifting', rx, M + 148);
    } else {
      g.fillStyle = theme.inkAlpha(0.65);
      g.fillText('on the line — skin grading is healthy', rx, M + 148);
    }

    g.fillStyle = theme.inkAlpha(0.55); g.font = '10px serif';
    g.fillText('All four skin samples cluster on the line.', rx, M + 180);
    g.fillText('Cast pushes the active sample off-line; the others', rx, M + 194);
    g.fillText('stay put because no cast was applied to them.', rx, M + 208);
  }
}

new SkinLine();
