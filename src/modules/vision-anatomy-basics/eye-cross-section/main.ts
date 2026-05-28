import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { drawEyeCrossSection } from '@core/render/eye';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const PARTS = [
  { id: null, name: 'Overview', desc: 'A living camera that focuses light onto the retina.' },
  { id: 'cornea', name: 'Cornea', desc: 'The clear front dome — does most of the eye’s focusing.' },
  { id: 'iris', name: 'Iris & pupil', desc: 'Coloured ring that opens and closes the aperture.' },
  { id: 'lens', name: 'Crystalline lens', desc: 'Fine-tunes focus by changing shape (accommodation).' },
  { id: 'retina', name: 'Retina', desc: 'Light-sensitive lining of rods and cones.' },
  { id: 'fovea', name: 'Fovea', desc: 'Tiny central pit of densest cones — sharpest vision.' },
  { id: 'optic-nerve', name: 'Optic nerve', desc: 'Carries signals to the brain; its disc is the blind spot.' },
];

class EyeCrossSection {
  private stage: CanvasStage;
  private part = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.part = hydrateNumber('part', 0);
    (document.getElementById('part') as EncSlider).value = this.part;
    registerStateParam('part', () => this.part);
    (document.getElementById('part') as EncSlider).addEventListener('input', (e) => {
      this.part = Math.round((e.target as EncSlider).value);
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.part = 0;
      (document.getElementById('part') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.50, cy = h * 0.48;
    const R = Math.min(w * 0.26, h * 0.32);
    const sel = PARTS[this.part];

    // Incoming light ray bundle from the left, focusing to the fovea.
    ctx.strokeStyle = theme.goldAlpha(0.55); ctx.lineWidth = 1.2;
    const fovea = { x: cx + R * 0.9, y: cy };
    for (const dy of [-R * 0.5, 0, R * 0.5]) {
      ctx.beginPath();
      ctx.moveTo(8, cy + dy * 0.6);
      ctx.lineTo(cx - R * 0.72, cy + dy);   // to the lens plane
      ctx.lineTo(fovea.x, fovea.y);          // converge at fovea
      ctx.stroke();
    }

    drawEyeCrossSection(ctx, cx, cy, R, sel.id);

    // Label of the highlighted structure.
    if (sel.id) {
      ctx.fillStyle = theme.crimson; ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText(sel.name, 16, 30);
    } else {
      ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
      ctx.fillText('The Human Eye', 16, 30);
    }
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif';
    ctx.fillText(sel.desc, 16, 52);

    // Light-path note.
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('light enters from the left →', 16, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new EyeCrossSection());
