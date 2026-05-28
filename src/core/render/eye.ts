/*
 * Schematic human-eye rendering + visual-anatomy constants.
 * Sources: Goldstein, Sensation & Perception 10e §2; Wandell, Foundations of Vision §3.
 */

import { theme } from './theme';

/** Blind-spot (optic-disc) centre, ~15.5° temporal from the fovea. */
export const BLIND_SPOT_DEG = 15.5;
/** Optic-disc angular diameter (~5° tall, ~7° wide on the retina). */
export const BLIND_SPOT_WIDTH_DEG = 6;

/**
 * Relative visual acuity vs retinal eccentricity (deg), normalised to 1 at the
 * fovea. Weymouth/E2 model: acuity = E2 / (E2 + E), with E2 ≈ 2.5°.
 */
export function visualAcuity(eccDeg: number): number {
  const E2 = 2.5;
  return E2 / (E2 + Math.abs(eccDeg));
}

/**
 * Draw a labelled right-eye horizontal cross-section centred at (cx, cy) with
 * eyeball radius R. The cornea/lens face left (incoming light from the left).
 * `highlight` optionally names one structure to emphasise.
 */
export function drawEyeCrossSection(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  highlight: string | null = null,
): void {
  const hot = (id: string) => (highlight === id ? theme.crimson : theme.inkAlpha(0.6));
  const hotFill = (id: string, base: string) => (highlight === id ? theme.crimsonAlpha(0.25) : base);

  // Vitreous body (main sphere).
  ctx.fillStyle = hotFill('vitreous', 'rgba(150,180,210,0.10)');
  ctx.strokeStyle = theme.inkAlpha(0.55); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

  // Cornea bulge (front, left side).
  ctx.strokeStyle = hot('cornea'); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(cx - R * 1.06, cy, R * 0.42, -Math.PI / 3, Math.PI / 3); ctx.stroke();

  // Iris / pupil aperture (two flaps just behind cornea).
  ctx.strokeStyle = hot('iris'); ctx.lineWidth = 3;
  const irisX = cx - R * 0.72;
  ctx.beginPath(); ctx.moveTo(irisX, cy - R * 0.62); ctx.lineTo(irisX, cy - R * 0.22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(irisX, cy + R * 0.22); ctx.lineTo(irisX, cy + R * 0.62); ctx.stroke();

  // Crystalline lens (biconvex ellipse).
  ctx.fillStyle = hotFill('lens', 'rgba(184,146,76,0.18)');
  ctx.strokeStyle = highlight === 'lens' ? theme.crimson : theme.goldDeep; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(cx - R * 0.62, cy, R * 0.10, R * 0.30, 0, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

  // Retina (inner back lining).
  ctx.strokeStyle = hot('retina'); ctx.lineWidth = highlight === 'retina' ? 4 : 2.4;
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, -Math.PI / 1.7, Math.PI / 1.7); ctx.stroke();

  // Fovea (slight dip on the optical axis at the back).
  ctx.fillStyle = highlight === 'fovea' ? theme.crimson : theme.goldDeep;
  ctx.beginPath(); ctx.arc(cx + R * 0.9, cy, 3.5, 0, 2 * Math.PI); ctx.fill();

  // Optic disc / blind spot (nasal side, below axis) + optic nerve.
  const discY = cy + R * 0.34;
  ctx.fillStyle = highlight === 'optic-nerve' ? theme.crimson : theme.inkMute;
  ctx.beginPath(); ctx.arc(cx + R * 0.84, discY, 4, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = hot('optic-nerve'); ctx.lineWidth = highlight === 'optic-nerve' ? 5 : 4;
  ctx.beginPath(); ctx.moveTo(cx + R * 0.84, discY); ctx.lineTo(cx + R * 1.5, discY + R * 0.4); ctx.stroke();
}
