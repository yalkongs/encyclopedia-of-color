/*
 * <enc-canvas-stage> — DPR-safe canvas with absolute transform reset.
 *
 * Why: ctx.scale(dpr, dpr) accumulates across resize calls. setTransform replaces
 * the matrix wholesale, so repeated resizes never compound. See module_specification.md §Ⅳ.4.
 *
 * Consumers listen for the `stageresize` CustomEvent {detail: {w, h, dpr}} and call .context to draw.
 */

export interface StageResizeDetail {
  w: number;
  h: number;
  dpr: number;
}

export class CanvasStage extends HTMLElement {
  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _ro!: ResizeObserver;

  static get observedAttributes() {
    return [] as string[];
  }

  connectedCallback() {
    if (!this._canvas) {
      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      this.style.display = 'block';
      this.style.position = 'relative';
      this.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d')!;
    }
    this._ro = new ResizeObserver(() => this._applyDpr());
    this._ro.observe(this);
    // Apply once now in case ResizeObserver fires asynchronously.
    queueMicrotask(() => this._applyDpr());
  }

  disconnectedCallback() {
    this._ro?.disconnect();
  }

  private _applyDpr() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    this._canvas.width = Math.round(w * dpr);
    this._canvas.height = Math.round(h * dpr);
    // Absolute transform — never accumulates.
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dispatchEvent(
      new CustomEvent<StageResizeDetail>('stageresize', { detail: { w, h, dpr } }),
    );
  }

  get context(): CanvasRenderingContext2D {
    return this._ctx;
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  get logicalSize(): { w: number; h: number } {
    const rect = this.getBoundingClientRect();
    return { w: Math.floor(rect.width), h: Math.floor(rect.height) };
  }
}

if (!customElements.get('enc-canvas-stage')) {
  customElements.define('enc-canvas-stage', CanvasStage);
}
