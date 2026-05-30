import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// J1 series approximation for small x; polynomial for moderate x.
function besselJ1(x: number): number {
  if (x === 0) return 0;
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const num = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.48260 + y * -30.16036606)))));
    const den = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
    return num / den;
  }
  const z = 8 / ax;
  const y = z * z;
  const p = 1.0 + y * (0.00183105 + y * (-0.3516396e-4 + y * (0.2457520e-5 + y * -0.240337e-6)));
  const q = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(ax - 2.356194491) * p - z * Math.sin(ax - 2.356194491) * q);
  return x < 0 ? -ans : ans;
}

function airyIntensity(r: number): number {
  if (r === 0) return 1;
  const x = Math.PI * r;
  return Math.pow(2 * besselJ1(x) / x, 2);
}

class Airy {
  private stage: CanvasStage;
  private d = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 100);
    const s = document.getElementById('d') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 100; s.value = 100; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Airy disk radius in pixels: ∝ 1/(D/λ)
    const ringPx = 5000 / this.d;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`D/λ = ${this.d} · first zero radius ∝ 1/(D/λ) ≈ ${ringPx.toFixed(1)} px (sin θ = 1.22 λ/D)`, M, M);

    // 2D Airy image (left)
    const imX = M, imY = M + 30, imS = 280;
    const img = g.createImageData(imS, imS);
    const cx = imS / 2, cy = imS / 2;
    for (let py = 0; py < imS; py++) for (let px = 0; px < imS; px++) {
      const r = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      const u = r / ringPx;
      const I = airyIntensity(u);
      // Gamma + log to bring out rings
      const v = Math.min(1, Math.pow(I, 0.35));
      const ch = Math.round(v * 255);
      const off = (py * imS + px) * 4;
      img.data[off] = ch; img.data[off + 1] = ch; img.data[off + 2] = ch; img.data[off + 3] = 255;
    }
    g.putImageData(img, imX, imY);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(imX, imY, imS, imS);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Airy pattern (log-stretched for ring visibility)', imX + imS / 2, imY + imS + 18);

    // 1D radial profile (right)
    const px2 = imX + imS + 30, py2 = imY, pw2 = w - px2 - M, ph2 = imS;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px2, py2, pw2, ph2);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('radial intensity profile I(r)', px2 + pw2 / 2, py2 - 4);
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const r = (i / 200) * 5; // radii in units of (1.22 λ/D)
      const I = airyIntensity(r);
      const x = px2 + (i / 200) * pw2;
      const y = py2 + (1 - I) * ph2;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    // Mark zeros at r=1.22, 2.23, 3.24
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([3, 3]);
    for (const zero of [1.22, 2.23, 3.24]) {
      const x = px2 + (zero / 5) * pw2;
      g.beginPath(); g.moveTo(x, py2); g.lineTo(x, py2 + ph2); g.stroke();
    }
    g.setLineDash([]);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('1.22', px2 + (1.22 / 5) * pw2, py2 + ph2 + 12);
    g.fillText('2.23', px2 + (2.23 / 5) * pw2, py2 + ph2 + 12);
    g.fillText('3.24', px2 + (3.24 / 5) * pw2, py2 + ph2 + 12);
    g.textAlign = 'left'; g.fillText('r / (1.22 λ/D)', px2, py2 + ph2 + 26);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Hubble has D = 2.4 m; at 550 nm Airy zero ≈ 0.06″. Largest ground telescopes (~10 m) reach ~0.014″ before atmosphere.', M, h - M);
  }
}

new Airy();
