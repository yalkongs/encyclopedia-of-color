import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Extended light source of radius S at lampX, disc occluder of radius rObj at objX,
 * wall at wallX. Tangent rays from top of source through object bottom (and
 * vice-versa) bound the umbra; cross-tangents bound the penumbra outer edge.
 */
class UmbraPenumbra {
  private stage: CanvasStage;
  private srcR = 14;      // source radius
  private rObj = 24;      // occluder radius

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.srcR = hydrateNumber('s', 14);
    this.rObj = hydrateNumber('r', 24);
    (document.getElementById('s') as EncSlider).value = this.srcR;
    (document.getElementById('r') as EncSlider).value = this.rObj;

    registerStateParam('s', () => this.srcR);
    registerStateParam('r', () => this.rObj);

    (document.getElementById('s') as EncSlider).addEventListener('input', (e) => {
      this.srcR = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('r') as EncSlider).addEventListener('input', (e) => {
      this.rObj = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.srcR = 14; this.rObj = 24;
      (document.getElementById('s') as EncSlider).value = 14;
      (document.getElementById('r') as EncSlider).value = 24;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const lampX = 70;
    const objX = w * 0.45;
    const wallX = w - 60;
    const cy = h / 2;

    // Light "shine" rays from source top/bottom through object top/bottom (4 rays)
    // For tangent rays we use object as disc; use top/bot of source and top/bot of object.
    const sTop = { x: lampX, y: cy - this.srcR };
    const sBot = { x: lampX, y: cy + this.srcR };
    const oTop = { x: objX, y: cy - this.rObj };
    const oBot = { x: objX, y: cy + this.rObj };

    // Umbra edges: tangent rays that *just touch* the object on opposite sides
    //  - From sBot through oBot extended to wall = upper umbra boundary
    //  - From sTop through oTop extended to wall = lower umbra boundary
    // Penumbra outer edges:
    //  - From sTop through oBot
    //  - From sBot through oTop
    const yAtX = (a: {x:number;y:number}, b: {x:number;y:number}, x: number) =>
      a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);

    const umbraTopY = yAtX(sBot, oTop, wallX);
    const umbraBotY = yAtX(sTop, oBot, wallX);
    const penumbraTopY = yAtX(sBot, oBot, wallX);
    const penumbraBotY = yAtX(sTop, oTop, wallX);

    // Wall
    ctx.fillStyle = theme.paperRecess;
    ctx.fillRect(wallX, 30, 8, h - 60);
    ctx.fillStyle = theme.inkAlpha(0.6);
    ctx.fillRect(wallX, 30, 1, h - 60);

    // Penumbra (gradient)
    if (penumbraTopY < umbraTopY) {
      const g = ctx.createLinearGradient(0, penumbraTopY, 0, umbraTopY);
      g.addColorStop(0, theme.inkAlpha(0));
      g.addColorStop(1, theme.inkAlpha(0.8));
      ctx.fillStyle = g;
      ctx.fillRect(wallX, penumbraTopY, 6, umbraTopY - penumbraTopY);
    }
    // Umbra (solid)
    if (umbraTopY < umbraBotY) {
      ctx.fillStyle = theme.inkAlpha(0.9);
      ctx.fillRect(wallX, umbraTopY, 6, umbraBotY - umbraTopY);
    }
    // Lower penumbra
    if (umbraBotY < penumbraBotY) {
      const g = ctx.createLinearGradient(0, umbraBotY, 0, penumbraBotY);
      g.addColorStop(0, theme.inkAlpha(0.8));
      g.addColorStop(1, theme.inkAlpha(0));
      ctx.fillStyle = g;
      ctx.fillRect(wallX, umbraBotY, 6, penumbraBotY - umbraBotY);
    }

    // Penumbra-bounding rays (outer)
    ctx.strokeStyle = theme.goldAlpha(0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sBot.x, sBot.y); ctx.lineTo(wallX, penumbraTopY);
    ctx.moveTo(sTop.x, sTop.y); ctx.lineTo(wallX, penumbraBotY);
    ctx.stroke();
    // Umbra-bounding rays (inner — cross-tangents)
    ctx.strokeStyle = theme.goldAlpha(0.8);
    ctx.beginPath();
    ctx.moveTo(sBot.x, sBot.y); ctx.lineTo(wallX, umbraTopY);
    ctx.moveTo(sTop.x, sTop.y); ctx.lineTo(wallX, umbraBotY);
    ctx.stroke();

    // Source (extended)
    const lampGrad = ctx.createRadialGradient(lampX, cy, this.srcR * 0.2, lampX, cy, this.srcR * 1.5);
    lampGrad.addColorStop(0, theme.goldAlpha(0.9));
    lampGrad.addColorStop(1, theme.goldAlpha(0));
    ctx.fillStyle = lampGrad;
    ctx.beginPath(); ctx.arc(lampX, cy, this.srcR * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(lampX, cy, this.srcR, 0, Math.PI * 2); ctx.fill();

    // Object
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(objX, cy, this.rObj, 0, Math.PI * 2); ctx.fill();

    // Labels
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.inkMute;
    ctx.fillText('extended source', lampX - 36, cy + this.srcR + 22);
    ctx.fillText('disc occluder', objX - 30, cy + this.rObj + 18);
    ctx.fillText('wall', wallX + 14, cy - 18);

    // Readout
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    const umbraH = Math.max(0, umbraBotY - umbraTopY);
    const fullH = penumbraBotY - penumbraTopY;
    ctx.fillText(`source S = ${this.srcR} px`, 16, 28);
    ctx.fillText(`object R = ${this.rObj} px`, 16, 50);
    ctx.fillText(`umbra = ${umbraH.toFixed(0)} px`, 16, 72);
    ctx.fillText(`penumbra outer = ${fullH.toFixed(0)} px`, 16, 94);
    if (umbraH === 0) {
      ctx.fillStyle = theme.crimson;
      ctx.fillText('SOURCE TOO LARGE — umbra collapses', 16, 116);
    }
    void axisStyle;
  }
}

window.addEventListener('DOMContentLoaded', () => new UmbraPenumbra());
