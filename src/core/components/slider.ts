/*
 * <enc-slider> — labelled range slider with output and aria-valuetext.
 *
 * Usage:
 *   <enc-slider id="amp" label="Amplitude A" min="0" max="100" step="1" value="40" unit="px"></enc-slider>
 *
 * Emits `input` and `change` events bubbling from the underlying <input>.
 */

export class EncSlider extends HTMLElement {
  private _input!: HTMLInputElement;
  private _output!: HTMLOutputElement;
  private _label!: HTMLLabelElement;

  static get observedAttributes() {
    return ['value', 'min', 'max', 'step', 'label', 'unit', 'disabled'];
  }

  connectedCallback() {
    if (!this._input) this._render();
    this._sync();
  }

  attributeChangedCallback() {
    if (this._input) this._sync();
  }

  private _render() {
    const id = this.getAttribute('id') ?? `slider-${Math.random().toString(36).slice(2)}`;
    this.setAttribute('id', id);

    const wrap = document.createElement('div');
    wrap.className = 'control-group';

    this._label = document.createElement('label');
    this._label.htmlFor = `${id}__input`;
    wrap.appendChild(this._label);

    const row = document.createElement('div');
    row.className = 'control-row';

    this._input = document.createElement('input');
    this._input.type = 'range';
    this._input.id = `${id}__input`;
    this._input.style.flex = '1';
    row.appendChild(this._input);

    this._output = document.createElement('output');
    this._output.htmlFor = `${id}__input`;
    row.appendChild(this._output);

    wrap.appendChild(row);
    this.appendChild(wrap);

    this._input.addEventListener('input', () => {
      this._renderValue();
      this.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { value: this.value } }));
    });
    this._input.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: this.value } }));
    });
  }

  private _sync() {
    if (!this._input) return;
    this._input.min = this.getAttribute('min') ?? '0';
    this._input.max = this.getAttribute('max') ?? '100';
    this._input.step = this.getAttribute('step') ?? '1';
    this._input.value = this.getAttribute('value') ?? (this._input.value || '0');
    this._input.disabled = this.hasAttribute('disabled');
    this._label.textContent = this.getAttribute('label') ?? '';
    this._renderValue();
  }

  private _renderValue() {
    const unit = this.getAttribute('unit') ?? '';
    const val = this._input.value;
    const display = unit ? `${val} ${unit}` : val;
    this._output.value = display;
    this._input.setAttribute(
      'aria-valuetext',
      `${this.getAttribute('label') ?? ''}: ${display}`,
    );
  }

  get value(): number {
    return parseFloat(this._input.value);
  }

  set value(v: number) {
    this._input.value = String(v);
    this._renderValue();
  }
}

if (!customElements.get('enc-slider')) {
  customElements.define('enc-slider', EncSlider);
}
