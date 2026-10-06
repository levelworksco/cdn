import { LitElement, css, html, nothing, svg } from "lit";
import type { SVGTemplateResult } from "lit";

export type LwMetricTrendDirection = "up" | "down";

// Small built-in icon set, keyed by name so `icon` stays a plain string and
// survives JSON-attribute round-tripping. Trusted, static markup only --
// never render a caller-supplied SVG string here, that would be an XSS hole.
// Fill/stroke are spelled out literally on every shape rather than
// interpolated: lit-html bindings only work as `attr="${value}"` or as node
// content, splicing a raw multi-attribute string into a bare `${...}` inside
// a tag isn't a supported position (this bit LWStatCard's icons once already).
const ICONS: Record<string, SVGTemplateResult> = {
  search: svg`<circle cx="6.8" cy="6.8" r="5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m13.5 13.5-3.2-3.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  clock: svg`<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  check: svg`<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m5.5 8 1.8 1.8 3.2-3.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  users: svg`<circle cx="6" cy="6" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="11.5" cy="6.5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.3c1.9.3 3 1.5 3 3.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  cart: svg`<path d="M1.5 2h1.8l1 8.5a1.5 1.5 0 0 0 1.5 1.3h5.6a1.5 1.5 0 0 0 1.48-1.24l.87-4.86H4.1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="14" r="1" fill="currentColor"/><circle cx="11.5" cy="14" r="1" fill="currentColor"/>`,
  dot: svg`<circle cx="8" cy="8" r="3" fill="currentColor"/>`,
  // A list being searched -- distinguishes "unique/distinct queries" from a
  // plain total, which both otherwise land on `search`.
  "list-search": svg`<path d="M2 3.6h9.5M2 7h5.5M2 10.4h3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10.6" cy="10.6" r="3.1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m12.9 12.9 1.7 1.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
};

const TREND_ARROWS: Record<LwMetricTrendDirection, SVGTemplateResult> = {
  up: svg`<path d="M2 8 6 4l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 2h3v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  down: svg`<path d="M2 4 6 8l2-2 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 10h3V7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/**
 * `<lw-metric-card>` — a single KPI: icon badge, trend pill, big value, and a
 * comparison line, e.g. "Total Searches: 48,392, up 18.4% vs 40,872 previous
 * 30 days".
 *
 * Framework-agnostic: set properties from JS, or attributes in plain HTML.
 *
 * ```html
 * <lw-metric-card
 *   icon="search"
 *   label="Total Searches"
 *   value="48,392"
 *   trend-direction="up"
 *   trend-percent="18.4%"
 *   comparison="vs 40,872 previous 30 days"
 * ></lw-metric-card>
 * ```
 *
 * Built-in icon keys: `search`, `clock`, `check`, `users`, `cart`. Anything
 * else (or omitted) falls back to a plain dot, so unknown data never renders
 * blank.
 *
 * Styling hooks: `part="card"`, `part="icon"`, `part="trend"`, `part="value"`.
 */
export class LwMetricCard extends LitElement {
  static properties = {
    icon: { type: String },
    label: { type: String },
    value: { type: String },
    trendDirection: { type: String, attribute: "trend-direction" },
    trendPercent: { type: String, attribute: "trend-percent" },
    comparison: { type: String },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare icon: string;
  declare label: string;
  declare value: string;
  declare trendDirection: LwMetricTrendDirection;
  declare trendPercent: string;
  declare comparison: string;

  constructor() {
    super();
    this.icon = "";
    this.label = "";
    this.value = "";
    this.trendDirection = "up";
    this.trendPercent = "";
    this.comparison = "";
  }

  static styles = css`
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
      color: #101828;
    }

    .card {
      box-sizing: border-box;
      height: 100%;
      background: #ffffff;
      border: 1px solid #eef0f2;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #fdf1e6;
      color: #f58635;
      flex-shrink: 0;
    }

    .icon-badge svg {
      width: 18px;
      height: 18px;
    }

    .trend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .trend.up {
      background: #dcfce7;
      color: #15803d;
    }

    .trend.down {
      background: #fee2e2;
      color: #b91c1c;
    }

    .trend svg {
      width: 11px;
      height: 11px;
    }

    .label {
      margin: 16px 0 0;
      font-size: 13px;
      color: #667085;
    }

    .value {
      margin: 4px 0 0;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
      color: #101828;
    }

    .comparison {
      margin: 6px 0 0;
      font-size: 12px;
      color: #98a2b3;
    }
  `;

  render() {
    return html`
      <div class="card" part="card">
        <div class="top">
          <span class="icon-badge" part="icon">
            <svg viewBox="0 0 16 16">${ICONS[this.icon] ?? ICONS.dot}</svg>
          </span>
          ${this.trendPercent
            ? html`
                <span class="trend ${this.trendDirection}" part="trend">
                  <svg viewBox="0 0 16 12">
                    ${TREND_ARROWS[this.trendDirection]}
                  </svg>
                  ${this.trendPercent}
                </span>
              `
            : nothing}
        </div>
        <p class="label">${this.label}</p>
        <p class="value" part="value">${this.value}</p>
        ${this.comparison
          ? html`<p class="comparison">${this.comparison}</p>`
          : nothing}
      </div>
    `;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-metric-card")) {
  customElements.define("lw-metric-card", LwMetricCard);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-metric-card": LwMetricCard;
  }
}
