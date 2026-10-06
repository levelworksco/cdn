import { LitElement, css, html, nothing, svg } from "lit";
import type { SVGTemplateResult } from "lit";

export interface LwSourceItem {
  /** Key into the built-in icon set. Unknown/omitted keys fall back to "document". */
  icon?: string;
  label: string;
  value: string | number;
}

export interface LwSourceFooter {
  /** Big highlighted number, e.g. 40. */
  value: string | number;
  /** Caption under the number, e.g. "docs in use". */
  valueLabel: string;
  /** Bold heading to the right of the divider, e.g. "Content Coverage". */
  label: string;
  /** Gray description under that heading. */
  description: string;
}

// Each shape spells out fill/stroke literally rather than interpolating a
// shared constant: lit-html bindings only work as `attr="${value}"` or as
// node content, splicing a raw multi-attribute string into a bare `${...}`
// inside a tag isn't a supported position (bit LWStatCard's icons once).
const ICONS: Record<string, SVGTemplateResult> = {
  document: svg`<path d="M4.5 2h4l3 3v8a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 2v3h3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  link: svg`<path d="M6.5 9.5 9.5 6.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M7.8 4.3 9 3.1a2.2 2.2 0 0 1 3.1 3.1l-1.2 1.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.2 11.7 7 12.9a2.2 2.2 0 0 1-3.1-3.1l1.2-1.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  video: svg`<rect x="1.5" y="3.5" width="9" height="9" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="m10.5 6.5 3-2v7l-3-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/**
 * `<lw-source-list>` — a list of icon/label/value rows (e.g. "Top AI
 * Sources") with an optional two-part footer summary stat underneath.
 *
 * Framework-agnostic: set `items`/`footer` as properties from JS, or pass
 * JSON via attributes in plain HTML.
 *
 * ```html
 * <lw-source-list
 *   title="Top AI Sources"
 *   subtitle="Most frequently referenced content to answer visitor questions"
 *   items='[{"label":"Getting Started Guide","value":2341},
 *           {"label":"Pricing & Plans","value":1872}]'
 *   footer='{"value":40,"valueLabel":"docs in use",
 *            "label":"Content Coverage","description":"Different docs used today"}'
 * ></lw-source-list>
 * ```
 *
 * Built-in icon keys: `document` (default), `link`, `video`.
 *
 * Styling hooks: `part="card"`, `part="row"`, `part="footer"`, and the
 * custom property `--lw-source-list-accent` (default orange, drives the icon
 * badges and the footer number).
 */
export class LwSourceList extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    items: { type: Array },
    footer: { type: Object },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare title: string;
  declare subtitle: string;
  declare items: LwSourceItem[];
  declare footer: LwSourceFooter | null;

  constructor() {
    super();
    this.title = "";
    this.subtitle = "";
    this.items = [];
    this.footer = null;
  }

  static styles = css`
    :host {
      display: block;
      --lw-source-list-accent: #f2984f;
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
      line-height: 1.5;
      color: #667085;
    }

    .list {
      list-style: none;
      margin: 20px 0 0;
      padding: 0;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #eef0f2;
    }

    /*
     * The divider belongs to .footer's own border-top (below) so a list with
     * no footer doesn't end in a dangling border under its last row.
     */
    .row:last-child {
      border-bottom: none;
    }

    .row-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: 8px;
      background: #fdf1e6;
      color: var(--lw-source-list-accent);
    }

    .icon-badge svg {
      width: 15px;
      height: 15px;
    }

    .label {
      font-size: 14px;
      font-weight: 500;
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

    .footer {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 6px;
      padding-top: 20px;
      border-top: 1px solid #eef0f2;
    }

    .footer-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .footer-value {
      font-size: 26px;
      font-weight: 700;
      line-height: 1.1;
      color: var(--lw-source-list-accent);
    }

    .footer-value-label {
      margin-top: 2px;
      font-size: 11px;
      color: #98a2b3;
      white-space: nowrap;
    }

    .footer-divider {
      align-self: stretch;
      width: 1px;
      background: #eef0f2;
    }

    .footer-label {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
    }

    .footer-description {
      margin: 2px 0 0;
      font-size: 12px;
      color: #667085;
    }
  `;

  // A named icon is a fragment (paths/circles, no root <svg>) so it can be
  // dropped into a correctly-namespaced <svg viewBox> wrapper here.
  private renderIcon(name?: string) {
    return svg`<svg viewBox="0 0 16 16">${ICONS[name ?? ""] ?? ICONS.document}</svg>`;
  }

  render() {
    return html`
      <div class="card" part="card">
        <h3 class="title">${this.title}</h3>
        <p class="subtitle">${this.subtitle}</p>
        <ul class="list">
          ${this.items.map(
            (item) => html`
              <li class="row" part="row">
                <span class="row-left">
                  <span class="icon-badge">${this.renderIcon(item.icon)}</span>
                  <span class="label">${item.label}</span>
                </span>
                <span class="value">${item.value}</span>
              </li>
            `,
          )}
        </ul>
        ${this.footer
          ? html`
              <div class="footer" part="footer">
                <div class="footer-stat">
                  <span class="footer-value">${this.footer.value}</span>
                  <span class="footer-value-label"
                    >${this.footer.valueLabel}</span
                  >
                </div>
                <div class="footer-divider"></div>
                <div>
                  <p class="footer-label">${this.footer.label}</p>
                  <p class="footer-description">
                    ${this.footer.description}
                  </p>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-source-list")) {
  customElements.define("lw-source-list", LwSourceList);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-source-list": LwSourceList;
  }
}
