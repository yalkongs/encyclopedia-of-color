import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Tree-shaped object → pinhole at midplane → inverted image on screen.
 * Blur radius on screen ≈ pinhole radius × magnification + diffraction
 *   d_blur = d_pinhole × (s_screen / s_object) + 1.22 × λ × s_screen / d_pinhole
 */
class PinholeCamera {
  private stage: CanvasStage;
  private pinholeD = 8;   // pinhole diameter in px

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.pinholeD = hydrateNumber('d', 8);
    (document.getElementById('d') as EncSlider).value = this.pinholeD;
    registerStateParam('d', () => this.pinholeD);

    (document.getElementById('d') as EncSlider).addEventListener('input', (e) => {
      this.pinholeD = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.pinholeD = 8;
      (document.getElementById('d') as EncSlider).value = 8;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const objX = 70;
    const pinX = w * 0.5;
    const screenX = w - 60;
    const cy = h / 2;

    // Tree object — simple ASCII-style icon: triangle + trunk
    const treeH = 110;
    const treeBase = cy + treeH / 2;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.moveTo(objX, treeBase - treeH);
    ctx.lineTo(objX - 30, treeBase);
    ctx.lineTo(objX + 30, treeBase);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(objX - 5, treeBase, 10, 20);

    // Pinhole wall
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pinX, 30); ctx.lineTo(pinX, cy - this.pinholeD / 2);
    ctx.moveTo(pinX, cy + this.pinholeD / 2); ctx.lineTo(pinX, h - 30);
    ctx.stroke();

    // Screen
    ctx.fillStyle = theme.paperRecess;
    ctx.fillRect(screenX, 30, 8, h - 60);
    ctx.fillStyle = theme.inkAlpha(0.6);
    ctx.fillRect(screenX, 30, 1, h - 60);

    // Rays from a small set of points on tree through pinhole top/bottom
    const samplePoints = [
      { x: objX, y: treeBase - treeH },
      { x: objX - 20, y: treeBase - 30 },
      { x: objX + 20, y: treeBase - 30 },
      { x: objX, y: treeBase + 10 },
    ];

    ctx.strokeStyle = theme.goldAlpha(0.3);
    ctx.lineWidth = 0.8;
    const dPin = this.pinholeD;
    const dObj = pinX - objX;
    const dScreen = screenX - pinX;
    const mag = dScreen / dObj;

    for (const pt of samplePoints) {
      // Two rays: through top edge of pinhole and bottom edge
      const yPinTop = cy - dPin / 2;
      const yPinBot = cy + dPin / 2;
      // From pt through (pinX, yPinTop) → screen
      const yScreenA = pt.y + (yPinTop - pt.y) * ((screenX - pt.x) / (pinX - pt.x));
      const yScreenB = pt.y + (yPinBot - pt.y) * ((screenX - pt.x) / (pinX - pt.x));
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y); ctx.lineTo(pinX, yPinTop); ctx.lineTo(screenX, yScreenA);
      ctx.moveTo(pt.x, pt.y); ctx.lineTo(pinX, yPinBot); ctx.lineTo(screenX, yScreenB);
      ctx.stroke();
    }

    // Image on screen — inverted tree, scaled by magnification, blurred by pinhole D
    const blurGeom = dPin * (dScreen / dObj);
    const lambda = 0.000555; // ~550 nm in mm at our visual scale — fudge for visualization
    const blurDiff = 1.22 * lambda * dScreen / Math.max(dPin, 0.1) * 1000;  // fudged
    const blurTotal = blurGeom + blurDiff;

    // Render inverted tree on screen via off-screen approach
    // We just draw a flipped tree at screen position, with a blur via shadowBlur
    ctx.save();
    ctx.translate(screenX, cy);
    ctx.scale(-mag * 0.8, -mag * 0.8);     // inversion + scale (and a slight cap)
    ctx.shadowColor = theme.inkAlpha(0.5);
    ctx.shadowBlur = blurTotal;
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.moveTo(0, -treeH / 2);
    ctx.lineTo(-30, treeH / 2);
    ctx.lineTo(30, treeH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-5, treeH / 2, 10, 20);
    ctx.restore();

    // Labels
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('object', objX - 20, h - 28);
    ctx.fillText('pinhole', pinX - 18, 24);
    ctx.fillText('image', screenX - 16, h - 28);

    // Readout
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`pinhole d = ${dPin.toFixed(1)} px`, 16, 28);
    ctx.fillText(`magnification = ${mag.toFixed(2)}×`, 16, 50);
    ctx.fillText(`geometric blur ≈ ${blurGeom.toFixed(1)} px`, 16, 72);
    ctx.fillText(`diffraction blur ≈ ${blurDiff.toFixed(1)} px`, 16, 94);
    ctx.fillStyle = dPin < 3 ? theme.crimson : theme.inkMute;
    ctx.fillText(dPin < 3 ? 'DIFFRACTION dominates — image softens' :
                 dPin > 20 ? 'GEOMETRIC blur dominates — image softens' :
                 'SWEET SPOT — both blurs minimised', 16, 116);
    void axisStyle;
  }
}

window.addEventListener('DOMContentLoaded', () => new PinholeCamera());
