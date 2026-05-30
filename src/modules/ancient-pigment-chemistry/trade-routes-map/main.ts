import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface Route { name: string; color: string; pts: [number, number][]; nodes: { x: number; y: number; label: string }[]; }

class TradeMap {
  private stage: CanvasStage;
  private r = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.r = hydrateNumber('r', 1);
    const s = document.getElementById('r') as EncSlider; s.value = this.r;
    s.addEventListener('input', (e) => { this.r = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('r', () => Math.round(this.r));
    document.addEventListener('reset-params', () => { this.r = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const mx = M, my = M + 40, mw = w - 2 * M, mh = h - 2 * M - 80;

    // Schematic map background (parchment hue rect + crude continent silhouettes)
    g.fillStyle = '#efe4d0'; g.fillRect(mx, my, mw, mh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(mx, my, mw, mh);

    // Continent outlines (very simplified)
    const X = (lon: number) => mx + ((lon + 10) / 90) * mw;
    const Y = (lat: number) => my + (1 - (lat - 10) / 60) * mh;

    g.fillStyle = '#d8c5a3';
    // Europe + Mediterranean
    g.beginPath();
    g.moveTo(X(-5), Y(50)); g.lineTo(X(15), Y(55)); g.lineTo(X(30), Y(55)); g.lineTo(X(40), Y(45));
    g.lineTo(X(35), Y(38)); g.lineTo(X(20), Y(40)); g.lineTo(X(5), Y(43)); g.lineTo(X(-5), Y(45)); g.closePath(); g.fill();
    // North Africa
    g.beginPath();
    g.moveTo(X(-5), Y(35)); g.lineTo(X(30), Y(33)); g.lineTo(X(35), Y(30)); g.lineTo(X(10), Y(20)); g.lineTo(X(-5), Y(28)); g.closePath(); g.fill();
    // Middle East + Persia
    g.beginPath();
    g.moveTo(X(35), Y(38)); g.lineTo(X(60), Y(40)); g.lineTo(X(70), Y(30)); g.lineTo(X(45), Y(25)); g.lineTo(X(35), Y(28)); g.closePath(); g.fill();
    // Central Asia / Afghanistan
    g.beginPath();
    g.moveTo(X(60), Y(45)); g.lineTo(X(75), Y(45)); g.lineTo(X(78), Y(35)); g.lineTo(X(70), Y(35)); g.closePath(); g.fill();

    const routes: Route[] = [
      {
        name: 'Lapis Lazuli — Badakhshan → Venice (≈5,500 km)', color: '#1f3a8a',
        pts: [[70, 37], [55, 35], [40, 33], [30, 35], [15, 41], [12, 45]],
        nodes: [{ x: X(70), y: Y(37), label: 'Badakhshan' }, { x: X(40), y: Y(33), label: 'Baghdad' }, { x: X(12), y: Y(45), label: 'Venice' }],
      },
      {
        name: 'Tyrian Purple — Tyre → Rome (≈2,500 km)', color: '#5b2a82',
        pts: [[35, 33], [25, 35], [15, 40], [12, 42]],
        nodes: [{ x: X(35), y: Y(33), label: 'Tyre' }, { x: X(12), y: Y(42), label: 'Rome' }],
      },
      {
        name: 'Cinnabar — Almadén → Constantinople (≈3,500 km)', color: '#b22222',
        pts: [[-4, 39], [10, 41], [20, 40], [29, 41]],
        nodes: [{ x: X(-4), y: Y(39), label: 'Almadén' }, { x: X(29), y: Y(41), label: 'Const.' }],
      },
    ];

    const sel = routes[this.r - 1];

    // Faded background of other routes
    g.lineWidth = 1; g.setLineDash([3, 3]);
    for (const route of routes) {
      if (route === sel) continue;
      g.strokeStyle = theme.inkAlpha(0.18);
      g.beginPath();
      for (let i = 0; i < route.pts.length; i++) {
        const [lon, lat] = route.pts[i];
        if (i === 0) g.moveTo(X(lon), Y(lat)); else g.lineTo(X(lon), Y(lat));
      }
      g.stroke();
    }
    g.setLineDash([]);

    // Selected route
    g.strokeStyle = sel.color; g.lineWidth = 3.5;
    g.beginPath();
    for (let i = 0; i < sel.pts.length; i++) {
      const [lon, lat] = sel.pts[i];
      if (i === 0) g.moveTo(X(lon), Y(lat)); else g.lineTo(X(lon), Y(lat));
    }
    g.stroke();

    // Endpoint markers
    for (const node of sel.nodes) {
      g.fillStyle = sel.color; g.beginPath(); g.arc(node.x, node.y, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(node.label, node.x, node.y - 10);
    }

    // Title + footnote
    g.fillStyle = sel.color; g.font = 'bold 15px serif'; g.textAlign = 'left';
    g.fillText(sel.name, M, M + 24);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Pigment economics shaped trade dominance: routes were defended by navies, taxed by emperors, and inspired centuries of exploration.', M, h - M);
  }
}

new TradeMap();
