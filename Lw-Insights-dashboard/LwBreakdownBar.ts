import { BarChart } from "echarts/charts";
import type { BarSeriesOption } from "echarts/charts";
import { GridComponent } from "echarts/components";
import type { GridComponentOption } from "echarts/components";
import * as echarts from "echarts/core";
import type { ComposeOption, ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LitElement, css, html, unsafeCSS } from "lit";

echarts.use([BarChart, GridComponent, CanvasRenderer]);

type BreakdownOption = ComposeOption<BarSeriesOption | GridComponentOption>;

export interface LwBreakdownSegment {
  label: string;
  count: number;
  description: string;
  /** Overrides the default palette color for this segment. */
  color?: string;
}

// Cycled by index when a segment doesn't set its own `color`.
const DEFAULT_PALETTE = ["#f2984f", "#f7cda0", "#6366f1", "#16a34a"];

const BAR_THICKNESS = 16;
const CORNER_RADIUS = 8;

/**
 * `<lw-breakdown-bar>` -- a proportional breakdown card: a single segmented
 * ECharts bar (rounded outer caps, sharp internal seams) over percent ticks,
 * with a legend row of tinted stat cards below, e.g. "Result Quality: 72%
 * Strong Matches / 24% Broader Matches / 4% No Results."
 *
 * Framework-agnostic: set properties from JS, or attributes in plain HTML.
 *
 * ```html
 * <lw-breakdown-bar
 *   title="Result Quality"
 *   subtitle="Quality of content used in AI overviews"
 *   count-unit="searches"
 *   segments='[{"label":"Strong Matches","count":27662,"description":"AI found a confident answer"}]'
 * ></lw-breakdown-bar>
 * ```
 *
 * Every percentage (the bar segment widths, the tick labels, and each
 * legend card's big number) is computed from `segments[].count`, not passed
 * separately, so they can never drift out of sync with the raw counts.
 *
 * Styling hooks: `part="card"`, `part="bar"`, `part="legend-card"`.
 */
export class LwBreakdownBar extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    countUnit: { type: String, attribute: "count-unit" },
    segments: { type: Array },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare title: string;
  declare subtitle: string;
  declare countUnit: string;
  declare segments: LwBreakdownSegment[];

  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    super();
    this.title = "";
    this.subtitle = "";
    this.countUnit = "items";
    this.segments = [];
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

    .title {
      margin: 0;
      color: #1d2433;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .subtitle {
      margin: 4px 0 0;
      color: #727d8f;
      font-size: 13px;
    }

    .bar-wrap {
      margin-top: 22px;
    }

    .bar {
      width: 100%;
      height: ${unsafeCSS(BAR_THICKNESS)}px;
    }

    .ticks {
      display: flex;
      margin-top: 8px;
    }

    .tick {
      font-size: 12px;
      color: #727d8f;
      text-align: left;
    }

    .legend {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-top: 20px;
    }

    .legend-card {
      border-radius: 14px;
      padding: 16px;
    }

    .legend-head {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #3a4353;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-value {
      display: block;
      margin-top: 10px;
      font-size: 24px;
      font-weight: 800;
      line-height: 1;
      color: #101828;
    }

    .legend-count {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #727d8f;
    }

    .legend-desc {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #727d8f;
    }
  `;

  private get chartEl(): HTMLElement | null {
    return this.renderRoot.querySelector(".bar");
  }

  private get total(): number {
    return this.segments.reduce((sum, s) => sum + s.count, 0) || 1;
  }

  private percentOf(segment: LwBreakdownSegment): number {
    return (segment.count / this.total) * 100;
  }

  private colorOf(segment: LwBreakdownSegment, index: number): string {
    return (
      segment.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]
    );
  }

  // Rounded outer caps, sharp seams between segments: only the first
  // segment's left corners and the last segment's right corners are rounded.
  private cornerRadius(index: number): number[] {
    const last = this.segments.length - 1;
    if (this.segments.length === 1)
      return [CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS];
    if (index === 0) return [CORNER_RADIUS, 0, 0, CORNER_RADIUS];
    if (index === last) return [0, CORNER_RADIUS, CORNER_RADIUS, 0];
    return [0, 0, 0, 0];
  }

  private buildOption(): BreakdownOption {
    return {
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { type: "value", max: this.total, show: false },
      yAxis: { type: "category", data: [""], show: false },
      series: this.segments.map((segment, index) => ({
        type: "bar",
        stack: "total",
        barWidth: BAR_THICKNESS,
        silent: true,
        data: [segment.count],
        itemStyle: {
          color: this.colorOf(segment, index),
          borderRadius: this.cornerRadius(index),
        },
      })),
    };
  }

  private syncChart() {
    const el = this.chartEl;
    if (!el) return;

    if (!this.chart || this.chart.isDisposed()) {
      this.chart = echarts.init(el);
      this.observer?.disconnect();
      this.observer = new ResizeObserver(() => this.chart?.resize());
      this.observer.observe(el);
    }
    this.chart.setOption(this.buildOption(), true);
  }

  render() {
    return html`
      <div class="card" part="card">
        <h3 class="title">${this.title}</h3>
        ${this.subtitle ? html`<p class="subtitle">${this.subtitle}</p>` : ""}

        <div class="bar-wrap">
          <div class="bar" part="bar"></div>
          <div class="ticks">
            ${this.segments.map(
              (segment) => html`
                <span
                  class="tick"
                  style="flex:0 0 ${this.percentOf(segment)}%"
                >
                  ${Math.round(this.percentOf(segment))}%
                </span>
              `,
            )}
          </div>
        </div>

        <div class="legend">
          ${this.segments.map((segment, index) => {
            const color = this.colorOf(segment, index);
            return html`
              <div
                class="legend-card"
                part="legend-card"
                style="background:${color}1F"
              >
                <div class="legend-head">
                  <span class="dot" style="background:${color}"></span>
                  ${segment.label}
                </div>
                <strong class="legend-value">
                  ${Math.round(this.percentOf(segment))}%
                </strong>
                <span class="legend-count">
                  ${segment.count.toLocaleString()} ${this.countUnit}
                </span>
                <span class="legend-desc">${segment.description}</span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  firstUpdated() {
    this.syncChart();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("segments")) this.syncChart();
  }

  connectedCallback() {
    super.connectedCallback();
    // Re-init if the element was moved in the DOM after being disconnected.
    if (this.hasUpdated && (!this.chart || this.chart.isDisposed())) {
      this.syncChart();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.observer = null;
    this.chart?.dispose();
    this.chart = null;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-breakdown-bar")) {
  customElements.define("lw-breakdown-bar", LwBreakdownBar);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-breakdown-bar": LwBreakdownBar;
  }
}
