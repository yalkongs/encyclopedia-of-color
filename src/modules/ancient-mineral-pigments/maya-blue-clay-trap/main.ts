import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class MayaBlue {
  private stage: CanvasStage;
  private yr = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.yr = hydrateNumber('yr', 100);
    const s = document.getElementById('yr') as EncSlider; s.value = this.yr;
    s.addEventListener('input', (e) => { this.yr = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('yr', () => Math.round(this.yr));
    document.addEventListener('reset-params', () => { this.yr = 100; s.value = 100; this.draw(); notifyStateChange(); });
  }

  private indigoFade(yr: number): number {
    return Math.exp(-yr / 100);
  }
  private mayaFade(yr: number): number {
    return Math.exp(-yr / 5000);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const fInd = this.indigoFade(this.yr);
    const fMaya = this.mayaFade(this.yr);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`After ${Math.round(this.yr)} yr: pure indigo retains ${(fInd * 100).toFixed(0)} %  ·  Maya blue retains ${(fMaya * 100).toFixed(0)} %`, M, M);

    // Two swatches
    const sxL = M, sxR = M + (w - 2 * M) / 2 + 15;
    const sy = M + 30, sw = (w - 2 * M) / 2 - 15, sh = (h - 2 * M - 200);
    // Indigo (left)
    const indR = Math.round(0xf0 + (0x1f - 0xf0) * fInd);
    const indG = Math.round(0xea + (0x3a - 0xea) * fInd);
    const indB = Math.round(0xc0 + (0x8a - 0xc0) * fInd);
    g.fillStyle = `rgb(${indR},${indG},${indB})`; g.fillRect(sxL, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sxL, sy, sw, sh);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('pure indigo (control)', sxL + sw / 2, sy + sh + 18);

    // Maya (right)
    const mR = Math.round(0xc0 + (0x20 - 0xc0) * fMaya);
    const mG = Math.round(0xe0 + (0x8a - 0xe0) * fMaya);
    const mB = Math.round(0xd5 + (0xa8 - 0xd5) * fMaya);
    g.fillStyle = `rgb(${mR},${mG},${mB})`; g.fillRect(sxR, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sxR, sy, sw, sh);
    g.fillStyle = theme.ink;
    g.fillText('Maya blue (indigo + palygorskite)', sxR + sw / 2, sy + sh + 18);

    // Schematic: palygorskite channels with indigo molecules trapped
    const sx = M, syy = sy + sh + 50;
    const sww = w - 2 * M, shh = 90;
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.strokeRect(sx, syy, sww, shh);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'left';
    g.fillText('palygorskite nano-channels (0.7 × 0.4 nm)', sx + 8, syy + 14);
    // Channels (horizontal stripes)
    const channelH = 14;
    const nChannels = 4;
    for (let i = 0; i < nChannels; i++) {
      const yyy = syy + 24 + i * channelH;
      g.strokeStyle = theme.inkAlpha(0.5); g.setLineDash([2, 2]);
      g.beginPath(); g.moveTo(sx + 10, yyy); g.lineTo(sx + sww - 10, yyy); g.stroke();
      g.beginPath(); g.moveTo(sx + 10, yyy + 10); g.lineTo(sx + sww - 10, yyy + 10); g.stroke();
      g.setLineDash([]);
      // Indigo molecules in the channel
      for (let j = 0; j < 22; j++) {
        const mx = sx + 20 + j * ((sww - 40) / 22);
        g.fillStyle = '#1f3a8a';
        g.fillRect(mx, yyy + 2, 12, 6);
      }
    }

    // Fade curves at bottom (compact)
    const fy = syy + shh + 24, fh = 30;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, fy, sww, fh);
    const X = (yr: number) => sx + (yr / 1000) * sww;
    const Y = (v: number) => fy + (1 - v) * fh;
    // Indigo curve
    g.strokeStyle = '#1f3a8a'; g.lineWidth = 2;
    g.beginPath();
    for (let yr = 0; yr <= 1000; yr += 10) {
      if (yr === 0) g.moveTo(X(yr), Y(this.indigoFade(yr))); else g.lineTo(X(yr), Y(this.indigoFade(yr)));
    }
    g.stroke();
    // Maya curve
    g.strokeStyle = '#20a890'; g.lineWidth = 2;
    g.beginPath();
    for (let yr = 0; yr <= 1000; yr += 10) {
      if (yr === 0) g.moveTo(X(yr), Y(this.mayaFade(yr))); else g.lineTo(X(yr), Y(this.mayaFade(yr)));
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.yr), Y(fInd), 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(X(this.yr), Y(fMaya), 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.65); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('0 yr', sx, fy + fh + 12); g.textAlign = 'right'; g.fillText('1000 yr', sx + sww, fy + fh + 12);
  }
}

new MayaBlue();
