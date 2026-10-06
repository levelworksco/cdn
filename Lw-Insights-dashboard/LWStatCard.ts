import { LitElement, css, html, nothing, svg } from "lit";
import type { SVGTemplateResult } from "lit";

export interface LWStatItem {
  /** Key into the built-in icon set. Unknown/omitted keys fall back to a dot. */
  icon?: string;
  label: string;
  value: string | number;
}

// Each shape spells out fill/stroke literally rather than interpolating a
// shared constant: lit-html bindings only work as `attr="${value}"` or as
// node content, and splicing a raw multi-attribute string into a bare
// `${...}` inside a tag (as this used to do) isn't a supported position --
// it silently failed to apply, so every shape fell back to default SVG fill
// (solid black) instead of the intended stroke-only outline.

// Small built-in icon set, keyed by name so `icon` stays a plain string and
// survives JSON-attribute round-tripping (`stats='[{"icon":"clock",...}]'`).
// Trusted, static markup only -- never render a caller-supplied SVG string
// here, that would be an XSS hole.
const ICONS: Record<string, SVGTemplateResult> = {
  clock: svg`<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  trend: svg`<path d="M2 11 6 7l2.5 2.5L14 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 4h4v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  eye: svg`<path d="M1 8s2.8-5 7-5 7 5 7 5-2.8 5-7 5-7-5-7-5Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  play: svg`<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.7 5.6v4.8l4-2.4-4-2.4Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  website: svg`<rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.5 5.5h13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="3.5" cy="4" r="0.4" fill="currentColor"/>`,
  stage: svg`<path d="M2 13V8M7 13V3M12 13V6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  check: svg`<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="m5.5 8 1.8 1.8 3.2-3.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  dot: svg`<circle cx="8" cy="8" r="3" fill="currentColor"/>`,
};

/**
 * `<lw-stat-card>` — a card of icon/label/value rows.
 *
 * Framework-agnostic: set `stats` as a property from JS, or pass JSON via the
 * attribute in plain HTML.
 *
 * ```html
 * <lw-stat-card
 *   heading="Demo Site Engagement"
 *   stats='[{"icon":"clock","label":"Avg Time on Site","value":"03:18"},
 *           {"icon":"trend","label":"Bounce Rate","value":"4%"},
 *           {"icon":"eye","label":"Total Video Views","value":"18.4K"},
 *           {"icon":"play","label":"Avg Video Watch Time","value":"04:32"}]'
 * ></lw-stat-card>
 * ```
 *
 * Built-in icon keys: `clock`, `trend`, `eye`, `play`, `website`, `stage`,
 * `check`. Anything else (or omitted) falls back to a plain dot, so unknown
 * data never renders blank.
 *
 * Styling hooks: `part="card"`, `part="heading"`, `part="row"`, and the
 * custom property `--lw-stat-card-bg`.
 */
export class LWStatCard extends LitElement {
  static properties = {
    heading: { type: String },
    stats: { type: Array },
    bare: { type: Boolean },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare heading: string;
  declare stats: LWStatItem[];
  /** Render without the card chrome, for embedding in an existing card. */
  declare bare: boolean;

  constructor() {
    super();
    this.heading = "";
    this.stats = [];
    this.bare = false;
  }

  static styles = css`
    :host {
      display: block;
      --lw-stat-card-bg: #fdf1e6;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
      color: #101828;
    }

    .card {
      box-sizing: border-box;
      height: 100%;
      background: var(--lw-stat-card-bg);
      border-radius: 16px;
      padding: 20px;
    }

    .card.bare {
      background: transparent;
      border-radius: 0;
      padding: 0;
    }

    .heading {
      margin: 0 0 16px;
      font-size: 15px;
      font-weight: 700;
      color: #101828;
    }

    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      color: #475467;
      font-size: 13px;
    }

    .icon {
      display: inline-flex;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      color: #475467;
      opacity: 0.7;
    }

    .icon svg {
      width: 100%;
      height: 100%;
    }

    .label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .value {
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 700;
      color: #101828;
    }
  `;

  // A named icon is a fragment (paths/circles, no root <svg>) so it can be
  // dropped into a correctly-namespaced <svg viewBox> wrapper here.
  private renderIcon(name?: string) {
    return svg`<svg viewBox="0 0 16 16">${ICONS[name ?? ""] ?? ICONS.dot}</svg>`;
  }

  render() {
    return html`
      <div class="card ${this.bare ? "bare" : ""}" part="card">
        ${this.heading
          ? html`<h3 class="heading" part="heading">${this.heading}</h3>`
          : nothing}
        <ul class="list" part="list">
          ${this.stats.map(
            (stat) => html`
              <li class="row" part="row">
                <span class="left">
                  <span class="icon">${this.renderIcon(stat.icon)}</span>
                  <span class="label">${stat.label}</span>
                </span>
                <span class="value">${stat.value}</span>
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-stat-card")) {
  customElements.define("lw-stat-card", LWStatCard);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-stat-card": LWStatCard;
  }
}
