import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { CMF_1931_2DEG, WAVELENGTH_STEP } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const gauss = (l: number, mu: number, sd: number) => Math.exp(-0.5 * ((l - mu) / sd) ** 2);

// real silicon sensor R/G/B sensitivities (illustrative Gaussian model — close shape, NOT a CMF combination)
const sensorReal = (l: number) => ({
  r: 0.85 * gauss(l, 605, 55) + 0.12 * gauss(l, 460, 35),
  g: 0.90 * gauss(l, 540, 60),
  b: 0.85 * gauss(l, 460, 45),
});
// Luther-ideal sensor: linear combination of CMFs (here identity for simplicity)
const sensorIdeal = (l: number) => {
  const row = CMF_1931_2DEG.find((r) => r.lambda === Math.round(l / 5) * 5) ?? { xBar: 0, yBar: 0, zBar: 0 };
  return { r: row.xBar, g: row.yBar, b: row.zBar };
};

// SPD A: fixed reference (peak at 540 nm)
const spdA = (l: number) => gauss(l, 540, 30);
// SPD B: two-lobe, with secondary peak position controllable; primary kept so XYZ stays near A
const spdB = (peak: number) => (l: number) => 0.65 * gauss(l, 540, 30) + 0.35 * gauss(l, peak, 30);

function integrate(f: (l: number) => number): number { let s = 0; for (const r of CMF_1931_2DEG) s += f(r.lambda) * WAVELENGTH_STEP; return s; }
function spdXYZ(spd: (l: number) => number): [number, number, number] {
  let X = 0, Y = 0, Z = 0; for (const r of CMF_1931_2DEG) { const e = spd(r.lambda) * WAVELENGTH_STEP; X += e * r.xBar; Y += e * r.yBar; Z += e * r.zBar; }
  return [X, Y, Z];
}
function spdSensorRGB(spd: (l: number) => number, sens: (l: number) => { r: number; g: number; b: number }): [number, number, number] {
  let R = 0, G = 0, B = 0; for (const row of CMF_1931_2DEG) { const e = spd(row.lambda) * WAVELENGTH_STEP; const s = sens(row.lambda); R += e * s.r; G += e * s.g; B += e * s.b; }
  return [R, G, B];
}

class SensorMismatch {
  private stage: CanvasStage;
  private peak = 580;
  private sensor = 'real';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.peak = hydrateNumber('peak', 580);
    this.sensor = hydrateFromUrl('sensor') ?? 'real';
    const sp = document.getElementById('peak') as EncSlider;
    sp.value = this.peak;
    sp.addEventListener('input', (e) => { this.peak = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('peak', () => Math.round(this.peak));
    const ts = document.getElementById('sensor') as EncToggle;
    ts.value = this.sensor;
    ts.addEventListener('change', (e) => { this.sensor = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sensor', () => this.sensor);
    document.addEventListener('reset-params', () => { this.peak = 580; this.sensor = 'real'; sp.value = 580; ts.value = 'real'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    // TOP chart: 6 sensitivity curves (sensor R/G/B + CMF x̄ȳz̄)
    const isReal = this.sensor === 'real';
    const sens = isReal ? sensorReal : sensorIdeal;
    const gx = 60, gy = 30, gw = w - 100, gh = (h - 150) * 0.5;
    const X = (l: number) => gx + ((l - 380) / 350) * gw, Y = (v: number) => gy + gh - (v / 1.8) * gh;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let l = 400; l <= 700; l += 50) { ctx.beginPath(); ctx.moveTo(X(l), gy); ctx.lineTo(X(l), gy + gh); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(gx, gy, gw, gh);
    const curve = (f: (l: number) => number, col: string, dash: number[] = []) => {
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath();
      for (let l = 380; l <= 730; l += 2) { const x = X(l), y = Y(f(l)); l === 380 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
    };
    // CMF (dashed)
    const cmfAt = (l: number, ch: 'xBar' | 'yBar' | 'zBar') => { const r = CMF_1931_2DEG.find((rr) => rr.lambda === Math.round(l / 5) * 5); return r ? r[ch] : 0; };
    curve((l) => cmfAt(l, 'xBar'), 'rgba(176,57,47,0.4)', [5, 4]);
    curve((l) => cmfAt(l, 'yBar'), 'rgba(46,125,79,0.4)', [5, 4]);
    curve((l) => cmfAt(l, 'zBar'), 'rgba(80,110,200,0.4)', [5, 4]);
    // sensor (solid)
    curve((l) => sens(l).r, '#b0392f');
    curve((l) => sens(l).g, '#2d9c4d');
    curve((l) => sens(l).b, '#3a5fb0');
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('dashed = CMF · solid = sensor', gx + gw - 8, gy + 14);

    // BOTTOM: SPD pair plot
    const sy = gy + gh + 50, sh = (h - 150) * 0.5 - 10;
    const Y2 = (v: number) => sy + sh - v * sh;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let l = 400; l <= 700; l += 50) { ctx.beginPath(); ctx.moveTo(X(l), sy); ctx.lineTo(X(l), sy + sh); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(gx, sy, gw, sh);
    const B = spdB(this.peak);
    ctx.strokeStyle = theme.gold; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let l = 380; l <= 730; l += 2) { const x = X(l), y = Y2(spdA(l)); l === 380 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.4; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let l = 380; l <= 730; l += 2) { const x = X(l), y = Y2(B(l)); l === 380 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let l = 400; l <= 700; l += 50) ctx.fillText(`${l}`, X(l), sy + sh + 14);
    ctx.fillText('wavelength (nm) — SPD A (solid) vs SPD B (dashed, secondary peak slider)', gx + gw / 2, sy + sh + 28);

    // numeric readouts
    void integrate;
    const XYa = spdXYZ(spdA), XYb = spdXYZ(B);
    const Ya = (XYa[1] / Math.max(XYa[1], 1e-9));
    void Ya;
    const RGBa = spdSensorRGB(spdA, sens), RGBb = spdSensorRGB(B, sens);
    // normalise so XYa scaled = 1 (rough eye-match check)
    const scaleY = XYa[1] / XYb[1];
    const XYbN: [number, number, number] = [XYb[0] * scaleY, XYb[1] * scaleY, XYb[2] * scaleY];
    const RGBbN: [number, number, number] = [RGBb[0] * scaleY, RGBb[1] * scaleY, RGBb[2] * scaleY];
    const dEEye = Math.sqrt((XYa[0] - XYbN[0]) ** 2 + (XYa[1] - XYbN[1]) ** 2 + (XYa[2] - XYbN[2]) ** 2) * 100;
    const dSensor = Math.sqrt((RGBa[0] - RGBbN[0]) ** 2 + (RGBa[1] - RGBbN[1]) ** 2 + (RGBa[2] - RGBbN[2]) ** 2) * 100;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`eye difference ≈ ${dEEye.toFixed(2)} · sensor difference ≈ ${dSensor.toFixed(2)} — ${isReal ? 'real sensor splits them apart' : 'Luther-ideal sensor agrees with the eye'}`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new SensorMismatch());
