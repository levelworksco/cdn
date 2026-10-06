import { LitElement, css, html } from "lit";

/**
 * `<lw-stat-bar>` — a single stat pill: a label plus MIN/MAX/AVG/TOTAL
 * cells, e.g. the "# Blogs" or "# Words" bar above a data table. This
 * element only ever represents *one* group -- render two instances side by
 * side to build a row of them, rather than passing an array of groups to one
 * instance (that merges them into a single connected bar, which doesn't
 * match the two-separate-pills design).
 *
 * Framework-agnostic: set properties from JS, or attributes in plain HTML.
 *
 * ```html
 * <lw-stat-bar label="# Blogs" min="12" max="5000" avg="100" total="xxxx" highlighted></lw-stat-bar>
 * <lw-stat-bar label="# Words" min="12" max="5000" avg="100" total="xxxx"></lw-stat-bar>
 * ```
 *
 * `highlighted` is a plain styling flag, not interactive state -- the label
 * isn't a button and doesn't respond to clicks. Whether a given pill renders
 * with the orange accent is a caller decision (design choice), not something
 * this element toggles itself.
 *
 * Styling hooks: `part="bar"`, `part="label"`, `part="cell"`.
 */
export class LwStatBar extends LitElement {
  static properties = {
    label: { type: String },
    min: { type: String },
    max: { type: String },
    avg: { type: String },
    total: { type: String },
    highlighted: { type: Boolean },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare label: string;
  declare min: string;
  declare max: string;
  declare avg: string;
  declare total: string;
  declare highlighted: boolean;

  constructor() {
    super();
    this.label = "";
    this.min = "";
    this.max = "";
    this.avg = "";
    this.total = "";
    this.highlighted = false;
  }

  static styles = css`
    :host {
      /*
       * A layout container (e.g. LwGrid's "flex: 1" widget stretching) can
       * hand this element more height than its one-row content needs. Center
       * .bar in whatever height :host is given rather than leaving dead
       * space below it -- the bar itself never stretches taller than its
       * content.
       */
      display: flex;
      align-items: center;
      height: 100%;
      /* Lets the cells below respond to this bar's own width rather than the
         viewport -- the same bar can be full width on one page and a narrow
         grid cell on another. */
      container-type: inline-size;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
    }

    .bar {
      width: 100%;
      display: flex;
      align-items: stretch;
      border-radius: 12px;
      background: #fdf1e6;
      /* Scroll rather than hide: with overflow hidden the min-widths below
         meant a narrow container silently dropped MAX/AVG/TOTAL, leaving only
         MIN visible with no indication anything was missing. */
      overflow-x: auto;
      overflow-y: hidden;
    }

    .label {
      display: flex;
      align-items: center;
      color: #92662f;
      font-size: 14px;
      font-weight: 600;
      padding: 0 20px;
      min-width: 100px;
    }

    .label.highlighted {
      background: #f4a950;
      color: #ffffff;
    }

    .cell {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      padding: 10px 20px;
      border-left: 1px solid #ffffff;
      flex: 1;
      min-width: 90px;
    }

    .cell-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #92662f;
      opacity: 0.75;
    }

    .cell-value {
      font-size: 15px;
      font-weight: 600;
      color: #101828;
    }

    /*
     * At full padding the label plus four cells need ~664px. Below that,
     * tighten the spacing so all four stats still fit rather than scrolling
     * three of them out of sight.
     */
    @container (max-width: 660px) {
      .label {
        min-width: 72px;
        padding: 0 12px;
      }

      .cell {
        min-width: 62px;
        padding: 8px 10px;
      }
    }

    /* Tighter still, so a ~400px bar keeps all four stats on one row. */
    @container (max-width: 440px) {
      .label {
        min-width: 60px;
        padding: 0 10px;
        font-size: 13px;
      }

      .cell {
        min-width: 52px;
        padding: 6px 8px;
      }
    }

    /*
     * Small screens: stack the stats instead of squeezing four cells onto one
     * row. The label takes its own row and each stat becomes a full-width
     * name/value line, so nothing needs horizontal scrolling to reach.
     *
     * A viewport media query rather than a container query on purpose -- it
     * has to agree with the page-level breakpoint that stacks the bars and
     * gives the widget its taller mobile height, or the two disagree and the
     * taller column layout gets clipped.
     */
    @media (max-width: 640px) {
      .bar {
        flex-direction: column;
        align-items: stretch;
        overflow-x: hidden;
      }

      .label {
        min-width: 0;
        padding: 10px 14px;
      }

      .cell {
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
        padding: 8px 14px;
        border-left: none;
        border-top: 1px solid #ffffff;
      }

      .cell-value {
        font-size: 14px;
      }
    }
  `;

  render() {
    return html`
      <div class="bar" part="bar">
        <span class="label ${this.highlighted ? "highlighted" : ""}" part="label">
          ${this.label}
        </span>
        <div class="cell" part="cell">
          <span class="cell-label">MIN</span>
          <span class="cell-value">${this.min}</span>
        </div>
        <div class="cell" part="cell">
          <span class="cell-label">MAX</span>
          <span class="cell-value">${this.max}</span>
        </div>
        <div class="cell" part="cell">
          <span class="cell-label">AVG</span>
          <span class="cell-value">${this.avg}</span>
        </div>
        <div class="cell" part="cell">
          <span class="cell-label">TOTAL</span>
          <span class="cell-value">${this.total}</span>
        </div>
      </div>
    `;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-stat-bar")) {
  customElements.define("lw-stat-bar", LwStatBar);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-stat-bar": LwStatBar;
  }
}
