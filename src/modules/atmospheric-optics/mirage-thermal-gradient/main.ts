import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Mirage {
  private stage: CanvasStage;
  private dt = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dt = hydrateNumber('dt', 40);
    const s = document.getElementById('dt') as EncSlider; s.value = this.dt;
    s.addEventListener('input', (e) => { this.dt = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dt', () => Math.round(this.dt));
    document.addEventListener('reset-params', () => { this.dt = 40; s.value = 40; this.draw(); notifyStateChange(); });
  }

  private nAt(y: number, groundT: number, airT: number): number {
    // y in meters above ground. Profile: hot near ground.
    // n - 1 ∝ density ∝ 1 / T (in K)
    const tK = 273 + (airT + (groundT - airT) * Math.exp(-y * 2));
    return 1 + 79e-6 * 290 / tK;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const airT = 20;
    const groundT = airT + this.dt;
    const nGround = this.nAt(0, groundT, airT);
    const nAir = this.nAt(2, groundT, airT);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`air ${airT}°C, ground ${groundT}°C · n(ground)=${nGround.toFixed(6)} < n(air)=${nAir.toFixed(6)}`, M, M);

    // Scene
    const sx = M, sy = M + 40, sw = w - 2 * M, sh = h - 2 * M - 100;
    // Sky gradient
    const skyG = g.createLinearGradient(0, sy, 0, sy + sh * 0.6);
    skyG.addColorStop(0, '#a8c8ec'); skyG.addColorStop(1, '#e0d0a0');
    g.fillStyle = skyG; g.fillRect(sx, sy, sw, sh * 0.6);
    // Hot ground
    const groundG = g.createLinearGradient(0, sy + sh * 0.6, 0, sy + sh);
    const heatHue = `rgb(${200 + this.dt}, ${130 + this.dt / 2}, 70)`;
    groundG.addColorStop(0, heatHue); groundG.addColorStop(1, '#4a2818');
    g.fillStyle = groundG; g.fillRect(sx, sy + sh * 0.6, sw, sh * 0.4);

    // Distant object (palm tree)
    const objX = sx + sw * 0.7, objY = sy + sh * 0.6;
    g.fillStyle = '#3a2818'; g.fillRect(objX - 2, objY - 60, 4, 60);
    g.fillStyle = '#1a6a3a';
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.ellipse(objX + i * 6, objY - 60, 14, 4, i * Math.PI / 12, 0, Math.PI * 2);
      g.fill();
    }

    // Ray trace from object to viewer (left side)
    // Direct (straight) ray: dashed
    const eyeX = sx + 50, eyeY = sy + sh * 0.5;
    g.strokeStyle = theme.inkAlpha(0.6); g.setLineDash([4, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(objX, objY - 30); g.lineTo(eyeX, eyeY); g.stroke();
    g.setLineDash([]);

    // Curved ray that grazes the ground (mirage ray)
    g.strokeStyle = '#ee4040'; g.lineWidth = 2;
    g.beginPath();
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = objX + (eyeX - objX) * t;
      // Parabolic dip controlled by dt
      const dipAmt = (this.dt / 60) * sh * 0.18;
      const dip = -4 * t * (1 - t) * dipAmt;
      const y = objY + 5 - (objY - eyeY) * Math.pow(t, 1.3) + dip;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();

    // Virtual image (apparent mirage)
    if (this.dt > 5) {
      g.globalAlpha = Math.min(1, this.dt / 30);
      g.fillStyle = '#3a2818'; g.fillRect(objX - 2, objY + 30, 4, 60);
      g.fillStyle = '#1a6a3a';
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.ellipse(objX + i * 6, objY + 90, 14, 4, -i * Math.PI / 12, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#fff'; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText('(inverted mirage)', objX, objY + 105);
    }

    // Eye
    g.fillStyle = '#fff'; g.beginPath(); g.arc(eyeX, eyeY, 10, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(eyeX, eyeY, 4, 0, Math.PI * 2); g.fill();

    g.fillStyle = '#fff'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('— — — direct ray (geometric)', sx + 10, sy + 16);
    g.fillStyle = '#ee4040';
    g.fillText('—— mirage ray (curved by n-gradient)', sx + 10, sy + 30);

    // n profile (small inset)
    const ix = sx + sw - 160, iy = sy + 14, iw = 140, ih = 100;
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(ix, iy, iw, ih);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(ix, iy, iw, ih);
    g.fillStyle = theme.ink; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('n(y) profile', ix + iw / 2, iy + 12);
    g.strokeStyle = theme.crimson; g.lineWidth = 1.5; g.beginPath();
    for (let yy = 0; yy <= 100; yy++) {
      const y0 = yy / 50; // 0..2 m
      const n0 = this.nAt(y0, groundT, airT);
      const px = ix + 10 + ((n0 - 1.00026) / 0.0001) * (iw - 20);
      const py = iy + ih - 6 - (yy / 100) * (ih - 16);
      if (yy === 0) g.beginPath(), g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
    g.fillStyle = theme.inkAlpha(0.6); g.font = '9px serif'; g.textAlign = 'left';
    g.fillText('ground', ix + 4, iy + ih - 2); g.textAlign = 'right'; g.fillText('2 m up', ix + iw - 4, iy + 24);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same effect on cold sea air produces "superior" mirages (Fata Morgana) — ships and coastlines floating above the horizon.', M, h - M);
  }
}

new Mirage();
