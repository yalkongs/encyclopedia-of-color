// Minimal chemistry sketch helpers for Phase 5 modules.
// Canvas2D, no SVG library, no SMILES parser. Educational scene-setting only.
// All depth/positions are illustrative — for *accurate* structures bring an external tool.

import { theme } from './theme';

export type Ctx = CanvasRenderingContext2D;

const BOND = '#1a1a1a';

// Single aromatic six-membered ring with alternating double bonds.
// R = radius (vertex distance from centre). Returns the 6 vertex coords.
export function drawHexRing(g: Ctx, cx: number, cy: number, R: number, dashedCircle = true): [number, number][] {
  const verts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    verts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  g.strokeStyle = BOND; g.lineWidth = 1.6;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const [x0, y0] = verts[i];
    const [x1, y1] = verts[(i + 1) % 6];
    g.moveTo(x0, y0); g.lineTo(x1, y1);
  }
  g.stroke();
  // Inner dashed circle = aromatic delocalisation symbol
  if (dashedCircle) {
    g.strokeStyle = BOND; g.lineWidth = 1.2;
    g.setLineDash([3, 3]);
    g.beginPath(); g.arc(cx, cy, R * 0.55, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
  }
  return verts;
}

// Linearly fused aromatic rings (benzene → naphthalene → anthracene → tetracene...)
// n = number of fused rings, R = ring radius. Origin at left edge centre.
export function drawFusedRings(g: Ctx, x0: number, y0: number, n: number, R: number) {
  // Adjacent rings share a side; horizontal centre-to-centre = R * sqrt(3)
  const dx = R * Math.sqrt(3);
  for (let i = 0; i < n; i++) {
    drawHexRing(g, x0 + R + i * dx, y0, R, true);
  }
}

// Conjugated polyene (zig-zag chain with N double-bond markers as parallel short lines)
// Returns the chain length in pixels.
export function drawPolyene(g: Ctx, x0: number, y0: number, n: number, step = 18): number {
  // n = number of double bonds in the chain (each "bond" = 2 segments to form zigzag)
  const segments = n * 2;
  g.strokeStyle = BOND; g.lineWidth = 1.6;
  g.beginPath();
  let x = x0, y = y0;
  g.moveTo(x, y);
  for (let i = 0; i < segments; i++) {
    const up = i % 2 === 0;
    x += step; y += up ? -step * 0.5 : step * 0.5;
    g.lineTo(x, y);
  }
  g.stroke();
  // Double-bond hash marks on every second segment
  g.beginPath();
  let xa = x0, ya = y0;
  for (let i = 0; i < segments; i++) {
    const up = i % 2 === 0;
    const xb = xa + step, yb = ya + (up ? -step * 0.5 : step * 0.5);
    if (i % 2 === 0) {
      // Parallel offset line for double bond
      const mx = (xa + xb) / 2, my = (ya + yb) / 2;
      const nx = -(yb - ya), ny = (xb - xa);
      const len = Math.hypot(nx, ny);
      const ox = nx / len * 4, oy = ny / len * 4;
      g.moveTo(mx + ox - (xb - xa) * 0.25, my + oy - (yb - ya) * 0.25);
      g.lineTo(mx + ox + (xb - xa) * 0.25, my + oy + (yb - ya) * 0.25);
    }
    xa = xb; ya = yb;
  }
  g.stroke();
  return x - x0;
}

// Schematic octahedron — central metal M, 6 ligands L equispaced on three axes.
// Drawn as a 2D projection (4 in-plane + 2 axial dashed).
export function drawOctahedron(g: Ctx, cx: number, cy: number, R: number, metal: string, ligand: string) {
  const positions: { x: number; y: number; dashed: boolean }[] = [
    { x: cx + R, y: cy, dashed: false },
    { x: cx - R, y: cy, dashed: false },
    { x: cx + R * 0.55, y: cy - R * 0.55, dashed: true }, // back
    { x: cx - R * 0.55, y: cy + R * 0.55, dashed: false }, // front
    { x: cx, y: cy - R, dashed: false },
    { x: cx, y: cy + R, dashed: false },
  ];
  g.strokeStyle = BOND; g.lineWidth = 1.4;
  for (const p of positions) {
    g.setLineDash(p.dashed ? [4, 3] : []);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(p.x, p.y); g.stroke();
  }
  g.setLineDash([]);
  // Ligand circles
  for (const p of positions) {
    g.fillStyle = '#dbe7ee'; g.beginPath(); g.arc(p.x, p.y, 12, 0, Math.PI * 2); g.fill();
    g.strokeStyle = BOND; g.lineWidth = 1; g.stroke();
    g.fillStyle = BOND; g.font = '11px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ligand, p.x, p.y);
  }
  // Metal centre
  g.fillStyle = theme.crimson; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill();
  g.strokeStyle = BOND; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#fff'; g.font = '12px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(metal, cx, cy);
  g.textBaseline = 'alphabetic';
}

export interface EnergyLevel {
  label: string;       // e.g. 't2g' or 'eg'
  yEnergy: number;     // energy value in eV (or arbitrary units)
  nBoxes: number;      // number of orbitals (boxes) at this level
  electrons: number;   // total electrons distributed across boxes
}

// Energy-level diagram: each level is a horizontal row of N boxes; electrons distributed by Hund's rule.
// xCentre = where to center the diagram horizontally. Returns total height.
export function drawEnergyLevels(g: Ctx, levels: EnergyLevel[], xCentre: number, yBase: number, height: number, eMin: number, eMax: number): number {
  const Y = (e: number) => yBase + (1 - (e - eMin) / (eMax - eMin)) * height;
  const boxW = 26, boxH = 12;
  // Axis
  g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
  g.beginPath(); g.moveTo(xCentre - 200, yBase); g.lineTo(xCentre - 200, yBase + height); g.stroke();
  g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'right';
  g.fillText('E', xCentre - 206, yBase + 8);
  for (const lvl of levels) {
    const y = Y(lvl.yEnergy);
    const totalW = lvl.nBoxes * (boxW + 4) - 4;
    const xStart = xCentre - totalW / 2;
    // Label
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'right';
    g.fillText(lvl.label, xStart - 8, y + 9);
    // Boxes
    for (let i = 0; i < lvl.nBoxes; i++) {
      const bx = xStart + i * (boxW + 4);
      g.strokeStyle = BOND; g.lineWidth = 1; g.strokeRect(bx, y, boxW, boxH);
    }
    // Distribute electrons by Hund's rule (one per box, then pair up)
    let remaining = lvl.electrons;
    // First pass: one electron up
    for (let i = 0; i < lvl.nBoxes && remaining > 0; i++) {
      drawElectron(g, xStart + i * (boxW + 4) + boxW / 2 - 4, y + boxH / 2, 'up');
      remaining--;
    }
    // Second pass: pair down
    for (let i = 0; i < lvl.nBoxes && remaining > 0; i++) {
      drawElectron(g, xStart + i * (boxW + 4) + boxW / 2 + 4, y + boxH / 2, 'down');
      remaining--;
    }
  }
  return height;
}

function drawElectron(g: Ctx, x: number, y: number, dir: 'up' | 'down') {
  g.strokeStyle = BOND; g.lineWidth = 1.2;
  g.beginPath();
  if (dir === 'up') {
    g.moveTo(x, y + 4); g.lineTo(x, y - 4);
    g.moveTo(x, y - 4); g.lineTo(x - 2, y - 2);
    g.moveTo(x, y - 4); g.lineTo(x + 2, y - 2);
  } else {
    g.moveTo(x, y - 4); g.lineTo(x, y + 4);
    g.moveTo(x, y + 4); g.lineTo(x - 2, y + 2);
    g.moveTo(x, y + 4); g.lineTo(x + 2, y + 2);
  }
  g.stroke();
}

// Semiconductor band diagram with valence band, conduction band, optional Fermi line.
// Eg in eV. Returns axis-y of the Fermi level (mid-gap).
export function drawBandDiagram(g: Ctx, x: number, y: number, w: number, h: number, Eg: number, EgMax = 4): number {
  // Map E: 0 (bottom of VB) at y+h*0.85, conduction band CB starts at y + h*0.55 - Eg/EgMax * (h*0.3)
  const vbTop = y + h * 0.70;
  const cbBottom = vbTop - (Eg / EgMax) * (h * 0.55);
  // Valence band (filled)
  g.fillStyle = '#5a78a8';
  g.fillRect(x, vbTop, w, y + h - vbTop);
  // Conduction band (empty)
  g.strokeStyle = '#5a78a8'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, cbBottom); g.lineTo(x + w, cbBottom); g.stroke();
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
  // Hatch the conduction band lightly to show its empty state
  for (let i = 0; i < w; i += 8) {
    g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i + 8, cbBottom);
    g.stroke();
  }
  // Labels
  g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
  g.fillText('CB (empty)', x + 6, cbBottom - 6);
  g.fillText('VB (filled)', x + 6, vbTop + 14);
  // Gap label
  g.strokeStyle = theme.crimson; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x + w * 0.5, vbTop); g.lineTo(x + w * 0.5, cbBottom); g.stroke();
  g.fillStyle = theme.crimson; g.font = '12px serif'; g.textAlign = 'left';
  g.fillText(`Eg = ${Eg.toFixed(2)} eV`, x + w * 0.5 + 8, (vbTop + cbBottom) / 2 + 4);
  return (vbTop + cbBottom) / 2;
}

// Convert wavelength (nm) → approximate sRGB css string for visualisation
export function wavelengthCss(lambda: number): string {
  let r = 0, g = 0, b = 0;
  if (lambda < 380) { r = 0.3; g = 0; b = 0.3; }
  else if (lambda < 440) { r = (440 - lambda) / 60; g = 0; b = 1; }
  else if (lambda < 490) { r = 0; g = (lambda - 440) / 50; b = 1; }
  else if (lambda < 510) { r = 0; g = 1; b = (510 - lambda) / 20; }
  else if (lambda < 580) { r = (lambda - 510) / 70; g = 1; b = 0; }
  else if (lambda < 645) { r = 1; g = (645 - lambda) / 65; b = 0; }
  else if (lambda < 780) { r = 1; g = 0; b = 0; }
  else { r = 0.25; g = 0; b = 0; }
  // Attenuate at the spectrum ends
  let factor = 1;
  if (lambda < 420) factor = 0.3 + 0.7 * (lambda - 380) / 40;
  if (lambda > 700) factor = 0.3 + 0.7 * (780 - lambda) / 80;
  return `rgb(${Math.round(r * factor * 255)},${Math.round(g * factor * 255)},${Math.round(b * factor * 255)})`;
}

// Photon energy (eV) ↔ wavelength (nm) conversion
export const eVtoNm = (E: number) => 1240 / E;
export const nmToEV = (l: number) => 1240 / l;
