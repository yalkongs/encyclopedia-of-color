import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const COLS = 14, ROWS = 16;
function voxelColor(c: number, r: number): string {
  // simple radial gradient on the part: hue around centre, lightness down with height
  const u = c / (COLS - 1), v = r / (ROWS - 1);
  const hue = u * 320;
  const sat = 0.7, l = 0.55 - 0.3 * v;
  const cc = (1 - Math.abs(2 * l - 1)) * sat, hp = hue / 60, x = cc * (1 - Math.abs((hp % 2) - 1));
  let rr = 0, gg = 0, bb = 0;
  if (hp < 1) [rr, gg, bb] = [cc, x, 0]; else if (hp < 2) [rr, gg, bb] = [x, cc, 0];
  else if (hp < 3) [rr, gg, bb] = [0, cc, x]; else if (hp < 4) [rr, gg, bb] = [0, x, cc];
  else if (hp < 5) [rr, gg, bb] = [x, 0, cc]; else [rr, gg, bb] = [cc, 0, x];
  const m = l - cc / 2;
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(rr)}${to(gg)}${to(bb)}`;
}
// part footprint within the build volume — irregular blob
function inPart(c: number, r: number): boolean {
  const u = (c - COLS / 2) / (COLS * 0.5), v = (r - ROWS / 2) / (ROWS * 0.5);
  return u * u * 1.1 + v * v * 0.9 < 0.85 && r >= 1 && r <= ROWS - 2;
}

class MultiJetFusion {
  private stage: CanvasStage;
  private progress = 55;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.progress = hydrateNumber('progress', 55);
    const s = document.getElementById('progress') as EncSlider;
    s.value = this.progress;
    s.addEventListener('input', (e) => { this.progress = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('progress', () => Math.round(this.progress));
    document.addEventListener('reset-params', () => { this.progress = 55; s.value = 55; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#1d1c19'; ctx.fillRect(0, 0, w, h);
    const layersDone = Math.round((this.progress / 100) * ROWS);
    const isMidPass = (this.progress % 6) < 4; // visual flag (always true-ish for demo)
    void isMidPass;

    // LEFT: process diagram — carriage over the powder bed, with the current top layer half-deposited
    const lx0 = 30, ly0 = 60, lw = Math.min(w * 0.46, 460), lh = h - 130;
    ctx.fillStyle = '#2a2823'; ctx.fillRect(lx0, ly0 + lh - 24, lw, 24);  // build platform
    ctx.fillStyle = '#d6c084'; ctx.fillRect(lx0, ly0 + lh - 24 - 8, lw, 8); // powder bed (warm yellow)
    // built layers stack inside the bed
    const layerH = 10;
    for (let r = 0; r < layersDone; r++) {
      const ry = ly0 + lh - 24 - 8 - (r + 1) * layerH;
      for (let c = 0; c < COLS; c++) {
        if (!inPart(c, ROWS - 1 - r)) continue;
        const cw = (lw - 30) / COLS, cx = lx0 + 15 + c * cw;
        ctx.fillStyle = voxelColor(c, ROWS - 1 - r);
        ctx.fillRect(cx, ry, cw - 1, layerH - 1);
      }
    }
    // carriage above
    const carY = ly0 + 10;
    ctx.fillStyle = '#3a3530'; ctx.fillRect(lx0 + 10, carY, lw - 20, 38);
    ctx.fillStyle = '#e6e3da'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('carriage: spreader · fusing agent · CMYK colour · IR lamp', lx0 + 14, carY + 22);
    // sub-elements
    const slots = ['#9d9890', '#1a1714', '#00aeef', '#ff9800'];
    const slotLabels = ['spread', 'fuse·BK', 'CMY', 'IR'];
    const sw = (lw - 40) / 4;
    slots.forEach((col, i) => {
      const sx = lx0 + 16 + i * sw + 4; ctx.fillStyle = col; ctx.fillRect(sx, carY + 28, sw - 8, 6);
      ctx.fillStyle = '#cbc8be'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(slotLabels[i], sx + (sw - 8) / 2, carY + 50);
    });
    // IR glow + droplet streak
    const carX = lx0 + 18 + (lw - 36) * ((this.progress * 2) % 100) / 100;
    ctx.fillStyle = 'rgba(255,140,40,0.4)'; ctx.fillRect(carX + sw * 3, carY + 36, sw - 8, ly0 + lh - 32 - (carY + 36));
    ctx.strokeStyle = '#1a1714'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(carX + sw * 1.5, carY + 34); ctx.lineTo(carX + sw * 1.5, ly0 + lh - 32); ctx.stroke();

    // RIGHT: voxel build object (isometric-ish front view)
    const rx0 = lx0 + lw + 36, ry0 = ly0, rw = w - rx0 - 30, rh = lh;
    ctx.fillStyle = '#2a2823'; ctx.fillRect(rx0, ry0 + rh - 16, rw, 16);
    const cellW = (rw - 20) / COLS, cellH = (rh - 30) / ROWS;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!inPart(c, r)) continue;
      const rowFromTop = r;
      if (rowFromTop >= layersDone && (ROWS - 1 - r) >= layersDone) continue; // not yet printed
      ctx.fillStyle = voxelColor(c, r);
      ctx.fillRect(rx0 + 10 + c * cellW, ry0 + 14 + r * cellH, cellW - 1, cellH - 1);
    }
    // bury unbuilt area in powder
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (inPart(c, r)) continue;
      if ((ROWS - 1 - r) >= layersDone) continue; // above current top → leave dark
      ctx.fillStyle = 'rgba(214,192,132,0.45)'; ctx.fillRect(rx0 + 10 + c * cellW, ry0 + 14 + r * cellH, cellW - 1, cellH - 1);
    }
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(rx0, ry0, rw, rh);
    ctx.fillStyle = '#e6e3da'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('build volume', rx0 + 10, ry0 - 6);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${layersDone} of ${ROWS} layers fused — powder + fusing agent + CMYK + IR, per layer`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new MultiJetFusion());
