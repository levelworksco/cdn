import { LitElement, css, html } from "lit";

export interface LwSegmentedChangeDetail {
  value: string;
}

/**
 * `<lw-segmented-control>` -- a rounded pill segmented control / tab
 * switcher, e.g. a date-range picker: "24 Hours / 7 Days / 30 Days / 90
 * Days / Custom".
 *
 * Framework-agnostic: set `options` and `value` as properties from JS, or
 * pass JSON/plain attributes in plain HTML. Selection is controlled by the
 * caller -- clicking an option dispatches `lw-change` with the new value
 * rather than updating `value` itself, so the caller stays the single
 * source of truth and the element never has selection state of its own.
 *
 * ```html
 * <lw-segmented-control
 *   options='["24 Hours","7 Days","30 Days","90 Days","Custom"]'
 *   value="30 Days"
 * ></lw-segmented-control>
 * <script>
 *   el.addEventListener("lw-change", (e) => { el.value = e.detail.value; });
 * </script>
 * ```
 *
 * Styling hooks: `part="control"`, `part="option"`.
 */
export class LwSegmentedControl extends LitElement {
  static properties = {
    options: { type: Array },
    value: { type: String },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare options: string[];
  declare value: string;

  constructor() {
    super();
    this.options = [];
    this.value = "";
  }

  static styles = css`
    :host {
      display: inline-block;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
    }

    .control {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 4px;
      background: #f8f9fb;
      border: 1px solid #e4e7ec;
      border-radius: 999px;
    }

    .option {
      appearance: none;
      border: none;
      background: transparent;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      color: #667085;
      padding: 7px 16px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .option:hover:not(.active) {
      color: #344054;
    }

    .option.active {
      background: #ffffff;
      color: #101828;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.1);
    }

    /*
     * At full padding this control's natural width (e.g. 5 options like
     * "24 Hours"..."Custom") exceeds a typical phone's viewport entirely --
     * it would need a horizontal scroll with zero visual hint that it's
     * scrollable, reading as content cut off rather than a control that can
     * be scrolled. Tightening padding/font here first means most narrow
     * layouts never need scrolling at all.
     */
    @media (max-width: 480px) {
      .option {
        padding: 6px 10px;
        font-size: 12px;
      }
    }

    @media (max-width: 400px) {
      .control {
        gap: 1px;
        padding: 3px;
      }

      .option {
        padding: 6px 7px;
        font-size: 11.5px;
      }
    }
  `;

  private select(option: string) {
    if (option === this.value) return;
    this.dispatchEvent(
      new CustomEvent<LwSegmentedChangeDetail>("lw-change", {
        detail: { value: option },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div class="control" part="control">
        ${this.options.map(
          (option) => html`
            <button
              part="option"
              class="option ${option === this.value ? "active" : ""}"
              type="button"
              @click="${() => this.select(option)}"
            >
              ${option}
            </button>
          `,
        )}
      </div>
    `;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-segmented-control")) {
  customElements.define("lw-segmented-control", LwSegmentedControl);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-segmented-control": LwSegmentedControl;
  }
  interface HTMLElementEventMap {
    "lw-change": CustomEvent<LwSegmentedChangeDetail>;
  }
}
