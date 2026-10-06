import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-slider>
//
// PROPERTIES:
//   value  (Number) — current value,        default 0.5
//   min    (Number) — minimum value,        default 0
//   max    (Number) — maximum value,        default 10
//   step   (Number) — step increment,       default 0.1
//   label  (String) — label left of slider, default ""
//
// EVENTS:
//   slider-change  — detail: { value: Number }
// ─────────────────────────────────────────────────────────────

export class LwSlider extends LitElement {

  static properties = {
    value: { type: Number },
    min:   { type: Number },
    max:   { type: Number },
    step:  { type: Number },
    label: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #3c3c3c;
      -webkit-font-smoothing: antialiased;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 4px;
    }

    .slider-label {
      font-size: 12px;
      color: #888;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 3px;
      border-radius: 99px;
      outline: none;
      cursor: pointer;
      background: linear-gradient(
        to right,
        #f97316 0%,
        #f97316 var(--pct, 0%),
        #e0e0e0 var(--pct, 0%),
        #e0e0e0 100%
      );
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #f97316;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,.18);
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
      box-shadow: 0 2px 8px rgba(249,115,22,.35);
    }
    .slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border: none;
      border-radius: 50%;
      background: #f97316;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,.18);
    }

    .value-input {
      width: 48px;
      flex-shrink: 0;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      background: #f5f5f5;
      color: #1a1a1a;
      font-size: 13px;
      font-family: inherit;
      text-align: center;
      padding: 3px 4px;
      outline: none;
      transition: border-color 0.15s, background 0.15s;
      /* hide native number spinners */
      -moz-appearance: textfield;
    }
    .value-input::-webkit-inner-spin-button,
    .value-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .value-input:focus {
      border-color: #f97316;
      background: #fff;
    }

    @media (max-width: 480px) {
      .value-input { width: 40px; font-size: 12px; }
    }
  `;

  constructor() {
    super();
    this.value = 0.5;
    this.min   = 0;
    this.max   = 10;
    this.step  = 0.1;
    this.label = '';
  }

  _pct() {
    const range = this.max - this.min;
    if (range === 0) return 0;
    return ((this.value - this.min) / range) * 100;
  }

  _formatted() {
    return Number.isInteger(this.step) ? String(this.value) : this.value.toFixed(1);
  }

  _emit() {
    this.dispatchEvent(new CustomEvent('slider-change', {
      detail: { value: this.value },
      bubbles: true, composed: true,
    }));
  }

  _onSlider(e) {
    this.value = Number(e.target.value);
    this._emit();
  }

  _onInputChange(e) {
    const raw = Number(e.target.value);
    if (isNaN(raw)) return;
    this.value = Math.min(this.max, Math.max(this.min, raw));
    this._emit();
  }

  render() {
    return html`
      <div class="slider-row">
        ${this.label ? html`<span class="slider-label">${this.label}</span>` : ''}
        <input
          class="slider"
          type="range"
          min=${this.min}
          max=${this.max}
          step=${this.step}
          .value=${String(this.value)}
          style="--pct: ${this._pct()}%"
          @input=${this._onSlider}
        />
        <input
          class="value-input"
          type="number"
          min=${this.min}
          max=${this.max}
          step=${this.step}
          .value=${this._formatted()}
          @change=${this._onInputChange}
        />
      </div>
    `;
  }
}

customElements.define('lw-slider', LwSlider);
