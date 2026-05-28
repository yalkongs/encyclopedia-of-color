import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class VisualPathway {
  private stage: CanvasStage;
  private field = 0; // 0 left visual field, 1 right

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.field = hydrateNumber('field', 0);
    (document.getElementById('field') as EncSlider).value = this.field;
    registerStateParam('field', () => this.field);
    (document.getElementById('field') as EncSlider).addEventListener('input', (e) => {
      this.field = Math.round((e.target as EncSlider).value);
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.field = 0;
      (document.getElementById('field') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const leftField = this.field === 0;
    // Active hemisphere: left field → right brain; right field → left brain.
    const activeRight = leftField;

    const lx = w * 0.34, rx = w * 0.66;
    const eyeY = h * 0.16, chiasmY = h * 0.42, lgnY = h * 0.58, v1Y = h * 0.82;
    const eyeR = Math.min(w, h) * 0.07;
    const chiasm = { x: w * 0.5, y: chiasmY };

    // --- Stimulus star in the active visual field (top). ---
    const starX = leftField ? w * 0.14 : w * 0.86;
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(leftField ? 'left visual field ✦' : '✦ right visual field', starX - 50, eyeY - eyeR - 14);

    // --- Eyes (circles, retina split nasal/temporal). ---
    const drawEye = (ex: number, label: string) => {
      ctx.fillStyle = 'rgba(150,180,210,0.10)';
      ctx.strokeStyle = theme.inkAlpha(0.55); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText(label, ex - 18, eyeY - eyeR - 4);
    };
    drawEye(lx, 'left eye'); drawEye(rx, 'right eye');

    // Retinal half points (bottom of each eye): nasal = toward midline, temporal = outward.
    const lNasal = { x: lx + eyeR * 0.5, y: eyeY + eyeR };
    const lTemp  = { x: lx - eyeR * 0.5, y: eyeY + eyeR };
    const rNasal = { x: rx - eyeR * 0.5, y: eyeY + eyeR };
    const rTemp  = { x: rx + eyeR * 0.5, y: eyeY + eyeR };

    // LGN + V1 nodes per hemisphere.
    const lgnL = { x: lx, y: lgnY }, lgnR = { x: rx, y: lgnY };
    const v1L = { x: lx, y: v1Y }, v1R = { x: rx, y: v1Y };

    // Fibre bundle: nasal fibres CROSS at chiasm, temporal fibres stay.
    // Active bundles carry the stimulus (left field → left-eye-nasal + right-eye-temporal).
    const bundle = (from: {x:number;y:number}, toHemiRight: boolean, active: boolean) => {
      const lgn = toHemiRight ? lgnR : lgnL;
      const v1 = toHemiRight ? v1R : v1L;
      ctx.strokeStyle = active ? theme.crimson : theme.inkAlpha(0.25);
      ctx.lineWidth = active ? 2.6 : 1.2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(chiasm.x, chiasm.y);
      ctx.lineTo(lgn.x, lgn.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.stroke();
    };
    // left-eye nasal → crosses to RIGHT;  left-eye temporal → stays LEFT
    // right-eye nasal → crosses to LEFT;  right-eye temporal → stays RIGHT
    bundle(lNasal, true,  leftField);     // left field uses left-eye nasal
    bundle(lTemp,  false, !leftField);    // right field uses left-eye temporal
    bundle(rNasal, false, !leftField);    // right field uses right-eye nasal
    bundle(rTemp,  true,  leftField);     // left field uses right-eye temporal

    // Chiasm marker.
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(chiasm.x, chiasm.y, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('optic chiasm', chiasm.x + 8, chiasm.y - 6);

    // LGN + V1 nodes.
    const node = (p: {x:number;y:number}, label: string, active: boolean, box: boolean) => {
      ctx.fillStyle = active ? theme.crimsonAlpha(0.3) : theme.slateAlpha(0.12);
      ctx.strokeStyle = active ? theme.crimson : theme.inkAlpha(0.4); ctx.lineWidth = 1.4;
      if (box) { ctx.fillRect(p.x - 26, p.y - 14, 52, 28); ctx.strokeRect(p.x - 26, p.y - 14, 52, 28); }
      else { ctx.beginPath(); ctx.ellipse(p.x, p.y, 18, 11, 0, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = active ? theme.crimson : theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText(label, p.x - 10, p.y + 4);
    };
    node(lgnL, 'LGN', !activeRight, false); node(lgnR, 'LGN', activeRight, false);
    node(v1L, 'V1', !activeRight, true);   node(v1R, 'V1', activeRight, true);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(leftField ? 'left visual field' : 'right visual field', 16, 28);
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(`→ ${activeRight ? 'RIGHT' : 'LEFT'} hemisphere V1`, 16, 50);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('nasal-retina fibres cross at the chiasm; temporal fibres stay', 16, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new VisualPathway());
