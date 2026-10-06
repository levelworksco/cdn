import { LitElement, css, html, nothing } from "lit";

export interface LwStatRankedItem {
  label: string;
  value: number;
}

/**
 * `<lw-stat-ranked-list>` -- a headline stat with a percentage badge, over a
 * ranked bar-list, e.g. "Zero Result Searches: 1,248 (8.4% of all
 * searches), Top Zero-Result Queries: best running shoes 42, ...".
 *
 * Framework-agnostic: set properties from JS, or attributes/JSON in plain
 * HTML.
 *
 * ```html
 * <lw-stat-ranked-list
 *   title="Zero Result Searches"
 *   subtitle="Identify searches that returned no results"
 *   value="1248"
 *   value-description="Count of searches with no results found"
 *   badge-percent="8.4"
 *   badge-label="of all searches"
 *   list-title="Top Zero-Result Queries"
 *   list-link-label="View all"
 *   list-link-href="/zero-result-queries"
 *   items='[{"label":"best running shoes","value":42}]'
 * ></lw-stat-ranked-list>
 * ```
 *
 * Rank numbers come from array position, and each bar's width *and* opacity
 * are scaled against the largest value in `items` -- none of that is a
 * separate prop, so it can't drift out of sync with the data.
 *
 * Styling hooks: `part="card"`, `part="badge"`, `part="row"`, `part="bar"`,
 * and the custom property `--lw-stat-ranked-color` (default orange, must
 * stay a 6-digit hex -- alpha is appended to it for the bar/badge tints).
 */
export class LwStatRankedList extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    value: { type: Number },
    valueDescription: { type: String, attribute: "value-description" },
    badgePercent: { type: Number, attribute: "badge-percent" },
    badgeLabel: { type: String, attribute: "badge-label" },
    listTitle: { type: String, attribute: "list-title" },
    listLinkLabel: { type: String, attribute: "list-link-label" },
    listLinkHref: { type: String, attribute: "list-link-href" },
    items: { type: Array },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare title: string;
  declare subtitle: string;
  declare value: number;
  declare valueDescription: string;
  declare badgePercent: number;
  declare badgeLabel: string;
  declare listTitle: string;
  declare listLinkLabel: string;
  declare listLinkHref: string;
  declare items: LwStatRankedItem[];

  constructor() {
    super();
    this.title = "";
    this.subtitle = "";
    this.value = 0;
    this.valueDescription = "";
    this.badgePercent = 0;
    this.badgeLabel = "";
    this.listTitle = "";
    this.listLinkLabel = "";
    this.listLinkHref = "#";
    this.items = [];
  }

  static styles = css`
    :host {
      display: block;
      --lw-stat-ranked-color: #f2984f;
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

    .stat-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-top: 20px;
    }

    .stat-value {
      margin: 0;
      font-size: 34px;
      font-weight: 800;
      line-height: 1;
      color: #101828;
    }

    .stat-description {
      margin: 6px 0 0;
      font-size: 13px;
      color: #667085;
    }

    .badge {
      flex-shrink: 0;
      text-align: right;
      border-radius: 12px;
      padding: 10px 16px;
      background: color-mix(in srgb, var(--lw-stat-ranked-color) 14%, #fff);
    }

    .badge-value {
      font-size: 20px;
      font-weight: 800;
      color: var(--lw-stat-ranked-color);
      white-space: nowrap;
    }

    .badge-label {
      margin-top: 2px;
      font-size: 11px;
      color: var(--lw-stat-ranked-color);
      opacity: 0.85;
      white-space: nowrap;
    }

    .list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 26px;
    }

    .list-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #98a2b3;
    }

    .list-link {
      font-size: 13px;
      font-weight: 600;
      color: var(--lw-stat-ranked-color);
      text-decoration: none;
      white-space: nowrap;
    }

    .list-link:hover {
      text-decoration: underline;
    }

    .list {
      list-style: none;
      margin: 14px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    li {
      padding: 10px 0;
    }

    li + li {
      border-top: 1px solid #f4f5f7;
    }

    .row-text {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }

    .row-left {
      display: flex;
      align-items: baseline;
      gap: 10px;
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

    .bar {
      margin-top: 8px;
      border-radius: 999px;
      background: var(--lw-stat-ranked-color);
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
        ${this.subtitle ? html`<p class="subtitle">${this.subtitle}</p>` : ""}

        <div class="stat-row">
          <div>
            <p class="stat-value">${this.value.toLocaleString()}</p>
            ${this.valueDescription
              ? html`<p class="stat-description">${this.valueDescription}</p>`
              : ""}
          </div>
          ${this.badgeLabel || this.badgePercent
            ? html`
                <div class="badge" part="badge">
                  <div class="badge-value">
                    ${this.badgePercent.toFixed(1)}%
                  </div>
                  ${this.badgeLabel
                    ? html`<div class="badge-label">${this.badgeLabel}</div>`
                    : ""}
                </div>
              `
            : nothing}
        </div>

        ${this.listTitle || this.items.length
          ? html`
              <div class="list-header">
                <span class="list-title">${this.listTitle}</span>
                ${this.listLinkLabel
                  ? html`
                      <a class="list-link" href="${this.listLinkHref}">
                        ${this.listLinkLabel} →
                      </a>
                    `
                  : nothing}
              </div>
              <ul class="list">
                ${this.items.map((item, index) => {
                  const ratio = item.value / max;
                  return html`
                    <li part="row">
                      <div class="row-text">
                        <span class="row-left">
                          <span class="rank">${index + 1}</span>
                          <span class="label">${item.label}</span>
                        </span>
                        <span class="value">
                          ${item.value.toLocaleString()}
                        </span>
                      </div>
                      <div
                        class="bar"
                        part="bar"
                        style="width:${ratio * 100}%;height:${2 + ratio * 2}px;opacity:${(0.3 + ratio * 0.7).toFixed(2)}"
                      ></div>
                    </li>
                  `;
                })}
              </ul>
            `
          : nothing}
      </div>
    `;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-stat-ranked-list")) {
  customElements.define("lw-stat-ranked-list", LwStatRankedList);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-stat-ranked-list": LwStatRankedList;
  }
}
