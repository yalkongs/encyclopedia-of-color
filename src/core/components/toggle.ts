/*
 * <enc-toggle> — radio-group toggle.
 *
 * Usage:
 *   <enc-toggle id="mode" label="Mode" options="A,B,C" value="A"></enc-toggle>
 *
 * Emits `change` with detail.value.
 */

export class EncToggle extends HTMLElement {
  private _group!: HTMLDivElement;
  private _label!: HTMLDivElement;
  private _buttons: HTMLButtonElement[] = [];

  static get observedAttributes() {
    return ['options', 'value', 'label', 'labels'];
  }

  connectedCallback() {
    if (!this._group) this._render();
    this._sync();
  }

  attributeChangedCallback() {
    if (this._group) this._sync();
  }

  private _render() {
    const wrap = document.createElement('div');
    wrap.className = 'control-group';

    this._label = document.createElement('div');
    this._label.style.fontSize = 'var(--fs-12)';
    this._label.style.color = 'var(--text-2)';
    this._label.style.textTransform = 'uppercase';
    this._label.style.letterSpacing = '0.04em';
    wrap.appendChild(this._label);

    this._group = document.createElement('div');
    this._group.className = 'toggle-group';
    this._group.setAttribute('role', 'radiogroup');
    wrap.appendChild(this._group);

    this.appendChild(wrap);
  }

  private _sync() {
    this._label.textContent = this.getAttribute('label') ?? '';
    const opts = (this.getAttribute('options') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const labels = (this.getAttribute('labels') ?? '').split(',').map((s) => s.trim());
    const value = this.getAttribute('value') ?? opts[0];

    // Rebuild only if option count changed
    if (this._buttons.length !== opts.length) {
      this._group.innerHTML = '';
      this._buttons = opts.map((opt, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.value = opt;
        b.textContent = labels[i] || opt;
        b.setAttribute('role', 'radio');
        b.addEventListener('click', () => this._select(opt));
        b.addEventListener('keydown', (e) => this._handleKey(e, i, opts));
        this._group.appendChild(b);
        return b;
      });
    } else {
      this._buttons.forEach((b, i) => {
        b.dataset.value = opts[i];
        b.textContent = labels[i] || opts[i];
      });
    }

    this._buttons.forEach((b) => {
      const pressed = b.dataset.value === value;
      b.setAttribute('aria-pressed', String(pressed));
      b.setAttribute('aria-checked', String(pressed));
      b.tabIndex = pressed ? 0 : -1;
    });
  }

  private _handleKey(e: KeyboardEvent, i: number, opts: string[]) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = opts[(i + 1) % opts.length];
      this._select(next);
      this._buttons[(i + 1) % opts.length].focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = opts[(i - 1 + opts.length) % opts.length];
      this._select(prev);
      this._buttons[(i - 1 + opts.length) % opts.length].focus();
    }
  }

  private _select(value: string) {
    this.setAttribute('value', value);
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value } }));
  }

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(v: string) {
    this.setAttribute('value', v);
  }
}

if (!customElements.get('enc-toggle')) {
  customElements.define('enc-toggle', EncToggle);
}
