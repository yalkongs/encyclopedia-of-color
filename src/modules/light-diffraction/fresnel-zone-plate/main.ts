import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { fresnelZoneRadius } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ZonePlate {
  private stage: CanvasStage;
  private f = 200;       // mm
  private lambda = 550;  // nm
  private zones = 16;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.f = hydrateNumber('f', 200);
    this.lambda = hydrateNumber('lambda', 550);
    this.zones = hydrateNumber('zones', 16);
    (document.getElementById('f') as EncSlider).value = this.f;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('zones') as EncSlider).value = this.zones;
    registerStateParam('f', () => this.f);
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('zones', () => this.zones);
    for (const id of ['f', 'lambda', 'zones']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'f') this.f = v;
        else if (id === 'lambda') this.lambda = v;
        else this.zones = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.f = 200; this.lambda = 550; this.zones = 16;
      (document.getElementById('f') as EncSlider).value = 200;
      (document.getElementById('lambda') as EncSlider).value = 550;
      (document.getElementById('zones') as EncSlider).value = 16;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.40, cy = h * 0.52;
    const plateR = Math.min(w * 0.34, h * 0.42);

    const fM = this.f * 1e-3;        // m
    const lamM = this.lambda * 1e-9; // m
    const N = this.zones;
    const rOuterPhys = fresnelZoneRadius(N, lamM, fM); // m
    const mPerPx = rOuterPhys / plateR;

    // Draw alternating zones, largest first so inner overwrite.
    for (let k = N; k >= 1; k--) {
      const rPhys = fresnelZoneRadius(k, lamM, fM);
      const rPx = rPhys / mPerPx;
      // Zone k spans (r_{k-1}, r_k]; colour by parity of k.
      const opaque = (k % 2 === 1);
      ctx.fillStyle = opaque ? '#1a1a2e' : '#f3ead5';
      ctx.beginPath(); ctx.arc(cx, cy, rPx, 0, 2 * Math.PI); ctx.fill();
    }
    // Outline.
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, plateR, 0, 2 * Math.PI); ctx.stroke();

    // Mark r1.
    const r1Px = fresnelZoneRadius(1, lamM, fM) / mPerPx;
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r1Px, cy); ctx.stroke();
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('r₁', cx + r1Px * 0.4, cy - 6);

    // Readouts.
    const r1mm = fresnelZoneRadius(1, lamM, fM) * 1000;
    const rNmm = rOuterPhys * 1000;
    const f3 = this.f / 3, f5 = this.f / 5;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`f = ${this.f} mm    λ = ${this.lambda} nm    N = ${N} zones`, 14, 28);
    ctx.fillText(`r₁ = √(λf) = ${r1mm.toFixed(3)} mm    outer r_N = ${rNmm.toFixed(3)} mm`, 14, 50);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`higher-order foci at f/3 = ${f3.toFixed(0)} mm,  f/5 = ${f5.toFixed(0)} mm`, 14, 72);
    ctx.fillText('dark = blocked zone · light = open zone', 14, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new ZonePlate());
