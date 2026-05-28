import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { BLIND_SPOT_DEG } from '@core/render/eye';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const ECC_MAX = 110; // deg shown

class VisualFieldTest {
  private stage: CanvasStage;
  private dir = 0;   // 0 = temporal (right eye, toward temple)
  private ecc = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dir = hydrateNumber('dir', 0);
    this.ecc = hydrateNumber('ecc', 50);
    (document.getElementById('dir') as EncSlider).value = this.dir;
    (document.getElementById('ecc') as EncSlider).value = this.ecc;
    registerStateParam('dir', () => this.dir);
    registerStateParam('ecc', () => this.ecc);
    for (const id of ['dir', 'ecc']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'dir') this.dir = v; else this.ecc = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.dir = 0; this.ecc = 50;
      (document.getElementById('dir') as EncSlider).value = 0;
      (document.getElementById('ecc') as EncSlider).value = 50;
      this.draw(); notifyStateChange();
    });
  }

  // Field boundary (deg) vs direction: temporal 100, up 60, nasal 60, down 75.
  private boundary(dirDeg: number): number {
    const a = dirDeg * DEG;
    const rx = Math.cos(a) >= 0 ? 100 : 60;  // temporal (right) vs nasal (left)
    const ry = Math.sin(a) >= 0 ? 60 : 75;   // superior vs inferior
    const cx = Math.cos(a) / rx, sy = Math.sin(a) / ry;
    return 1 / Math.sqrt(cx * cx + sy * sy);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.46, cy = h * 0.52;
    const R = Math.min(w * 0.40, h * 0.42);
    const toPx = (ecc: number) => (ecc / ECC_MAX) * R;
    const pos = (dirDeg: number, ecc: number) => ({
      x: cx + toPx(ecc) * Math.cos(dirDeg * DEG),
      y: cy - toPx(ecc) * Math.sin(dirDeg * DEG),
    });

    // Eccentricity grid circles + cross-hairs.
    ctx.strokeStyle = theme.inkAlpha(0.15); ctx.lineWidth = 1;
    for (const e of [30, 60, 90]) {
      ctx.beginPath(); ctx.arc(cx, cy, toPx(e), 0, 2 * Math.PI); ctx.stroke();
      ctx.fillStyle = theme.inkMute; ctx.font = '9px Inter, sans-serif';
      ctx.fillText(`${e}°`, cx + toPx(e) - 12, cy - 3);
    }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();

    // Field boundary curve.
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 2;
    ctx.fillStyle = theme.goldAlpha(0.07);
    ctx.beginPath();
    for (let d = 0; d <= 360; d += 2) {
      const p = pos(d, this.boundary(d));
      if (d === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Direction labels.
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('temporal →', cx + R * 0.6, cy - 6);
    ctx.fillText('← nasal', cx - R * 0.85, cy - 6);
    ctx.fillText('superior', cx - 18, cy - R * 0.7);
    ctx.fillText('inferior', cx - 16, cy + R * 0.75);

    // Blind spot patch (temporal, ~15.5°, slightly below horizon).
    const bs = pos(-4, BLIND_SPOT_DEG);
    ctx.fillStyle = theme.crimsonAlpha(0.25);
    ctx.beginPath(); ctx.ellipse(bs.x, bs.y, toPx(4), toPx(3), 0, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.crimson; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(bs.x, bs.y, toPx(4), toPx(3), 0, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);

    // Fixation centre.
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();

    // Test stimulus.
    const sp = pos(this.dir, this.ecc);
    const inField = this.ecc <= this.boundary(this.dir);
    const inBlind = Math.hypot(sp.x - bs.x, sp.y - bs.y) <= toPx(3.5);
    const seen = inField && !inBlind;
    ctx.fillStyle = seen ? theme.slate : 'rgba(74,90,107,0.2)';
    ctx.beginPath(); ctx.arc(sp.x, sp.y, 7, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.stroke();

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`direction ${this.dir}°   eccentricity ${this.ecc}°   (boundary ${this.boundary(this.dir).toFixed(0)}°)`, 16, 28);
    let status = seen ? 'stimulus SEEN' : inBlind ? 'on the BLIND SPOT — not seen' : 'OUTSIDE the visual field';
    ctx.fillStyle = seen ? theme.slate : theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(status, 16, 50);
  }
}
window.addEventListener('DOMContentLoaded', () => new VisualFieldTest());
