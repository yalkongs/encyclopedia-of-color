import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Three subjects at three depths; depths 0..1 along the focus axis
const SUBJECTS = [
  { name: 'bottle (foreground)', depth: 0.15, x: 0.18, y: 0.55, w: 0.16, h: 0.30, color: [180, 120, 60] as [number, number, number] },
  { name: 'book (middle)',       depth: 0.50, x: 0.42, y: 0.45, w: 0.20, h: 0.35, color: [80, 130, 180] as [number, number, number] },
  { name: 'lamp (background)',   depth: 0.85, x: 0.70, y: 0.30, w: 0.22, h: 0.50, color: [200, 180, 100] as [number, number, number] },
];

// Focus distances of 5 frames
const FOCUS_DEPTHS = [0.10, 0.30, 0.50, 0.70, 0.90];

// Blur radius per subject given a focus distance (CoC ∝ |depth - focusDepth|)
function blurRadius(subjectDepth: number, focusDepth: number): number {
  return Math.abs(subjectDepth - focusDepth) * 30; // tuned
}

class FocusStack {
  private stage: CanvasStage;
  private frame = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.frame = hydrateNumber('frame', 3);
    const s = document.getElementById('frame') as EncSlider; s.value = this.frame;
    s.addEventListener('input', (e) => { this.frame = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('frame', () => Math.round(this.frame));
    document.addEventListener('reset-params', () => { this.frame = 3; s.value = 3; this.draw(); notifyStateChange(); });
  }

  // Render one frame focused at depth d
  private renderFrame(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, focusDepth: number) {
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.fillStyle = '#1a1a1a'; g.fillRect(x0, y0, w, h);
    // Render back-to-front
    const ordered = [...SUBJECTS].sort((a, b) => b.depth - a.depth);
    for (const s of ordered) {
      const r = blurRadius(s.depth, focusDepth);
      g.filter = r > 0.1 ? `blur(${r.toFixed(1)}px)` : 'none';
      g.fillStyle = `rgb(${s.color[0]},${s.color[1]},${s.color[2]})`;
      // The bounding box
      g.fillRect(x0 + s.x * w, y0 + s.y * h, s.w * w, s.h * h);
      // Add some texture (text rectangles) to make sharpness visible
      g.fillStyle = `rgba(20,20,20,0.5)`;
      for (let i = 0; i < 6; i++) {
        const ty = y0 + s.y * h + (i + 1) * (s.h * h) / 8;
        g.fillRect(x0 + s.x * w + 4, ty, s.w * w - 8, 2);
      }
      g.filter = 'none';
    }
    g.restore();
    g.strokeStyle = theme.inkAlpha(0.5);
    g.strokeRect(x0, y0, w, h);
  }

  // Stacked result: render every subject with its closest-focus frame (i.e., no blur)
  private renderStacked(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.fillStyle = '#1a1a1a'; g.fillRect(x0, y0, w, h);
    const ordered = [...SUBJECTS].sort((a, b) => b.depth - a.depth);
    for (const s of ordered) {
      g.filter = 'none';
      g.fillStyle = `rgb(${s.color[0]},${s.color[1]},${s.color[2]})`;
      g.fillRect(x0 + s.x * w, y0 + s.y * h, s.w * w, s.h * h);
      g.fillStyle = `rgba(20,20,20,0.5)`;
      for (let i = 0; i < 6; i++) {
        const ty = y0 + s.y * h + (i + 1) * (s.h * h) / 8;
        g.fillRect(x0 + s.x * w + 4, ty, s.w * w - 8, 2);
      }
    }
    g.restore();
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.strokeRect(x0, y0, w, h);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 24;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`5 focus frames + assembled stack — active frame ${this.frame}`, M, M);

    // Left: 5 small frames stacked vertically (or in a row)
    const cellW = (w - 6 * M) / 4;
    const cellH = cellW * 0.62;

    const sy = M + 18;
    // Show only the active frame as the large preview on the left (1 col)
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText(`frame ${this.frame} (focus depth ${FOCUS_DEPTHS[this.frame - 1].toFixed(2)})`, M + cellW * 1.2 / 2, sy + 12);
    this.renderFrame(g, M, sy + 20, cellW * 1.2, cellH * 1.2, FOCUS_DEPTHS[this.frame - 1]);

    // Middle: tiny thumbnails of all 5 frames
    const tx = M + cellW * 1.2 + M;
    const thW = (w - tx - M - cellW * 1.2 - 2 * M) / 5;
    const thH = thW * 0.62;
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('all 5 frames', tx, sy + 12);
    for (let i = 0; i < 5; i++) {
      this.renderFrame(g, tx + i * thW, sy + 20, thW - 4, thH, FOCUS_DEPTHS[i]);
      g.fillStyle = i + 1 === this.frame ? theme.crimson : theme.inkAlpha(0.6);
      g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(`${i + 1}`, tx + i * thW + thW / 2 - 2, sy + 20 + thH + 14);
    }

    // Right: stacked result (large)
    const stX = w - M - cellW * 1.2;
    g.fillStyle = theme.crimson; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('stacked output (all subjects sharp)', stX + cellW * 1.2 / 2, sy + 12);
    this.renderStacked(g, stX, sy + 20, cellW * 1.2, cellH * 1.2);

    // Subject sharpness table per frame
    const ty = sy + cellH * 1.2 + 60;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('local sharpness per subject per frame (1/(1+blur) — higher is sharper)', M, ty);

    // Header
    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif';
    g.fillText('subject \\ frame', M, ty + 22);
    for (let i = 0; i < 5; i++) {
      g.fillText(`${i + 1}`, M + 160 + i * 90, ty + 22);
    }
    g.fillText('chosen', M + 160 + 5 * 90, ty + 22);

    for (let s = 0; s < SUBJECTS.length; s++) {
      const row = ty + 38 + s * 18;
      g.fillStyle = theme.ink; g.font = '11px serif';
      g.fillText(SUBJECTS[s].name, M, row);
      let best = 0, bestI = 0;
      for (let i = 0; i < 5; i++) {
        const r = blurRadius(SUBJECTS[s].depth, FOCUS_DEPTHS[i]);
        const sharpness = 1 / (1 + r);
        if (sharpness > best) { best = sharpness; bestI = i; }
        g.fillStyle = sharpness > 0.5 ? theme.crimson : theme.inkAlpha(0.7);
        g.font = '11px monospace';
        g.fillText(sharpness.toFixed(2), M + 160 + i * 90, row);
      }
      g.fillStyle = theme.crimson; g.font = '11px serif';
      g.fillText(`frame ${bestI + 1}`, M + 160 + 5 * 90, row);
    }
  }
}

new FocusStack();
