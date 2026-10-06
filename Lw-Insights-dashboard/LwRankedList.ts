import { LitElement, css, html } from "lit";

export interface LwRankedItem {
  label: string;
  value: number;
}

/**
 * `<lw-ranked-list>` — a ranked list of labeled values, each with a
 * proportional bar underneath, e.g. "Most Searched Queries."
 *
 * Framework-agnostic: set `items` as a property from JS, or pass JSON via
 * the attribute in plain HTML.
 *
 * ```html
 * <lw-ranked-list
 *   title="Most Searched Queries"
 *   subtitle="Ranked by total volume"
 *   items='[{"label":"how to reset my password","value":3410},
 *           {"label":"pricing and billing","value":2988}]'
 * ></lw-ranked-list>
 * ```
 *
 * Rank numbers (01, 02, ...) come from array position, and each bar's width
 * is scaled against the largest value in `items` -- neither is a separate
 * prop, so they can't drift out of sync with the data.
 *
 * Styling hooks: `part="card"`, `part="row"`, `part="bar"`, and the custom
 * property `--lw-ranked-list-color` (default green, the bar fill).
 */
export class LwRankedList extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    items: { type: Array },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare title: string;
  declare subtitle: string;
  declare items: LwRankedItem[];

  constructor() {
    super();
    this.title = "";
    this.subtitle = "";
    this.items = [];
  }

  static styles = css`
    :host {
      display: block;
      --lw-ranked-list-color: #16a34a;
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
      padding: 24px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
      overflow-y: auto;
    }

    .title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #667085;
    }

    .list {
      list-style: none;
      margin: 20px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .row-text {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .row-left {
      display: flex;
      align-items: baseline;
      gap: 12px;
      min-width: 0;
    }

    .rank {
      flex-shrink: 0;
      font-size: 13px;
      font-weight: 600;
      color: #98a2b3;
    }

    .label {
      font-size: 14px;
      font-weight: 600;
      color: #101828;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .value {
      flex-shrink: 0;
      font-size: 14px;
      color: #667085;
    }

    .track {
      height: 6px;
      border-radius: 999px;
      background: #eef0f2;
      overflow: hidden;
    }

    .bar {
      height: 100%;
      border-radius: 999px;
      background: var(--lw-ranked-list-color);
    }
  `;

  private get maxValue(): number {
    return this.items.reduce((max, item) => Math.max(max, item.value), 1);
  }

  render() {
    const max = this.maxValue;

    return html`
      <div class="card" part="card">
        <h3 class="title">${this.title}</h3>
        <p class="subtitle">${this.subtitle}</p>
        <ul class="list">
          ${this.items.map(
            (item, index) => html`
              <li part="row">
                <div class="row-text">
                  <span class="row-left">
                    <span class="rank"
                      >${String(index + 1).padStart(2, "0")}</span
                    >
                    <span class="label">${item.label}</span>
                  </span>
                  <span class="value">${item.value.toLocaleString()}</span>
                </div>
                <div class="track">
                  <div
                    class="bar"
                    part="bar"
                    style="width:${(item.value / max) * 100}%"
                  ></div>
                </div>
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-ranked-list")) {
  customElements.define("lw-ranked-list", LwRankedList);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-ranked-list": LwRankedList;
  }
}
