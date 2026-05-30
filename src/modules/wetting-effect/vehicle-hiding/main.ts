import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const N_VEHICLE = 1.50;

class VehicleHiding {
  private stage: CanvasStage;
  private np = 270;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.np = hydrateNumber('np', 270);
    const s = document.getElementById('np') as EncSlider; s.value = this.np;
    s.addEventListener('input', (e) => { this.np = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('np', () => Math.round(this.np));
    document.addEventListener('reset-params', () => { this.np = 270; s.value = 270; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const nP = this.np / 100;
    const dn = nP - N_VEHICLE;
    const scattering = dn * dn; // proportional to (Δn)²
    const opacity = Math.min(1, scattering / 1.5);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`pigment n = ${nP.toFixed(2)} · vehicle n = ${N_VEHICLE} · Δn = ${dn.toFixed(2)} · opacity ≈ ${(opacity * 100).toFixed(0)}%`, M, M);

    // Two panels: black substrate + film over it
    const panY = M + 40;
    const panH = 200;
    const panW = (w - 3 * M) / 2;
    // Left: pure black substrate
    g.fillStyle = '#1a1a1a'; g.fillRect(M, panY, panW, panH);
    g.fillStyle = theme.inkAlpha(0.85); g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('black substrate (no paint)', M + panW / 2, panY + panH + 16);

    // Right: same substrate but with paint film of given opacity
    g.fillStyle = '#1a1a1a'; g.fillRect(M + panW + M, panY, panW, panH);
    g.fillStyle = `rgba(245,245,242,${opacity})`;
    g.fillRect(M + panW + M, panY, panW, panH);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + panW + M, panY, panW, panH);
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText('with paint film (white pigment in vehicle)', M + panW + M + panW / 2, panY + panH + 16);

    // Scattering bar
    const by = panY + panH + 50;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('scattering ∝ (Δn)²', M, by);
    const barW = w - 2 * M;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, by + 10, barW, 16);
    g.fillStyle = theme.crimson; g.fillRect(M, by + 10, Math.min(1, scattering / 1.5) * barW, 16);

    // Anchor markers
    const anchors: [string, number][] = [['CaCO₃ 1.6', 1.6], ['glass-bead 1.55', 1.55], ['ZnO 2.0', 2.0], ['TiO₂ rutile 2.7', 2.7]];
    for (const [lbl, nVal] of anchors) {
      const X = M + Math.min(1, ((nVal - N_VEHICLE) ** 2) / 1.5) * barW;
      g.strokeStyle = theme.gold; g.lineWidth = 1;
      g.beginPath(); g.moveTo(X, by + 10); g.lineTo(X, by + 26); g.stroke();
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(lbl, X, by + 40);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('At Δn = 0 (e.g. glass bead in glycerol) the pigment disappears — same physics as why your foot disappears in water at oblique angles.', M, h - M);
  }
}

new VehicleHiding();
