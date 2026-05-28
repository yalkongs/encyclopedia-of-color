import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface V3 { x: number; y: number; z: number }

class PoincareSphere {
  private stage: CanvasStage;
  private psi = 30;
  private chi = 20;
  private az = 35;
  private readonly elev = -22 * DEG; // fixed camera tilt

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.psi = hydrateNumber('psi', 30);
    this.chi = hydrateNumber('chi', 20);
    this.az = hydrateNumber('az', 35);
    (document.getElementById('psi') as EncSlider).value = this.psi;
    (document.getElementById('chi') as EncSlider).value = this.chi;
    (document.getElementById('az') as EncSlider).value = this.az;
    registerStateParam('psi', () => this.psi);
    registerStateParam('chi', () => this.chi);
    registerStateParam('az', () => this.az);
    for (const id of ['psi', 'chi', 'az']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'psi') this.psi = v;
        else if (id === 'chi') this.chi = v;
        else this.az = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.psi = 30; this.chi = 20; this.az = 35;
      (document.getElementById('psi') as EncSlider).value = 30;
      (document.getElementById('chi') as EncSlider).value = 20;
      (document.getElementById('az') as EncSlider).value = 35;
      this.draw(); notifyStateChange();
    });
  }

  // Rotate world point into camera frame; returns {sx, sy, depth}.
  private cam(v: V3) {
    const a = this.az * DEG;
    const ca = Math.cos(a), sa = Math.sin(a);
    // rotate about z (vertical Stokes-S3 axis)
    const x1 = v.x * ca - v.y * sa;
    const y1 = v.x * sa + v.y * ca;
    const z1 = v.z;
    // tilt about screen-x axis
    const ce = Math.cos(this.elev), se = Math.sin(this.elev);
    const y2 = y1 * ce - z1 * se;
    const z2 = y1 * se + z1 * ce;
    return { sx: x1, sy: -z2, depth: y2 };  // depth: larger = nearer viewer
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.46, cy = h * 0.52;
    const R = Math.min(w, h) * 0.34;

    // Sphere silhouette.
    ctx.fillStyle = theme.slateAlpha(0.06);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    const toScreen = (v: V3) => {
      const c = this.cam(v);
      return { x: cx + c.sx * R, y: cy + c.sy * R, depth: c.depth };
    };

    // Draw a great/parallel circle with depth-cued alpha.
    const drawCircle = (pts: V3[], frontStyle: string, width: number) => {
      for (let i = 0; i < pts.length; i++) {
        const a = toScreen(pts[i]);
        const b = toScreen(pts[(i + 1) % pts.length]);
        const front = (a.depth + b.depth) / 2 > 0;
        ctx.strokeStyle = frontStyle;
        ctx.globalAlpha = front ? 1 : 0.22;
        ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    // Parallels (latitude) and meridians (longitude).
    const circlePts = (lat: number) => {
      const pts: V3[] = [];
      for (let i = 0; i < 72; i++) {
        const lon = (2 * Math.PI * i) / 72;
        pts.push({ x: Math.cos(lat) * Math.cos(lon), y: Math.cos(lat) * Math.sin(lon), z: Math.sin(lat) });
      }
      return pts;
    };
    const meridianPts = (lon: number) => {
      const pts: V3[] = [];
      for (let i = 0; i < 72; i++) {
        const lat = -Math.PI / 2 + (Math.PI * i) / 71;
        pts.push({ x: Math.cos(lat) * Math.cos(lon), y: Math.cos(lat) * Math.sin(lon), z: Math.sin(lat) });
      }
      return pts;
    };
    for (let lat = -60; lat <= 60; lat += 30) if (lat !== 0) drawCircle(circlePts(lat * DEG), theme.inkAlpha(0.25), 0.8);
    for (let lon = 0; lon < 180; lon += 30) drawCircle(meridianPts(lon * DEG), theme.inkAlpha(0.2), 0.8);

    // Equator (linear states) — highlighted gold.
    drawCircle(circlePts(0), theme.goldDeep, 1.8);

    // Poles.
    const np = toScreen({ x: 0, y: 0, z: 1 });
    const sp = toScreen({ x: 0, y: 0, z: -1 });
    ctx.fillStyle = theme.crimson; ctx.font = '500 12px Inter, sans-serif';
    ctx.beginPath(); ctx.arc(np.x, np.y, 3, 0, 2 * Math.PI); ctx.fill();
    ctx.fillText('R circular', np.x + 6, np.y - 4);
    ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, 2 * Math.PI); ctx.fill();
    ctx.fillText('L circular', sp.x + 6, sp.y + 12);

    // State point: longitude = 2ψ, latitude = 2χ.
    const lon = 2 * this.psi * DEG;
    const lat = 2 * this.chi * DEG;
    const state: V3 = { x: Math.cos(lat) * Math.cos(lon), y: Math.cos(lat) * Math.sin(lon), z: Math.sin(lat) };
    const sp2 = toScreen(state);
    // Radius line from centre.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.globalAlpha = sp2.depth > 0 ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sp2.x, sp2.y); ctx.stroke();
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(sp2.x, sp2.y, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.globalAlpha = 1;

    // Readouts.
    let kind = 'elliptical';
    if (Math.abs(this.chi) < 1) kind = 'linear';
    else if (Math.abs(Math.abs(this.chi) - 45) < 1) kind = this.chi > 0 ? 'right circular' : 'left circular';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`ψ = ${this.psi}°   χ = ${this.chi}°   →   ${kind}`, 16, 30);
    ctx.fillText(`S = (${(Math.cos(lat) * Math.cos(lon)).toFixed(2)}, ${(Math.cos(lat) * Math.sin(lon)).toFixed(2)}, ${Math.sin(lat).toFixed(2)})`, 16, 52);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('equator = linear · poles = circular · longitude = 2ψ · latitude = 2χ', 16, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new PoincareSphere());
