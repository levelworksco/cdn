import { LineChart } from "echarts/charts";
import type { LineSeriesOption } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import type {
  GridComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import * as echarts from "echarts/core";
import type { ComposeOption, ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LitElement, css, html } from "lit";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

type TrendOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption
>;

export interface LwTrendPoint {
  /** X-axis category label, e.g. "Jul 20". */
  label: string;
  value: number;
}

const formatCompact = (value: number): string =>
  value >= 1000 ? `${+(value / 1000).toFixed(1)}k` : String(value);

/**
 * `<lw-trend-chart>` — a smooth area/line chart card with peak/average
 * summary stats, e.g. "Peak Usage: when visitors search most."
 *
 * Framework-agnostic: set `data` as a property from JS, or pass JSON via the
 * attribute in plain HTML.
 *
 * ```html
 * <lw-trend-chart
 *   title="Peak Usage"
 *   subtitle="When visitors search most"
 *   y-axis-label="Searches"
 *   data='[{"label":"Jul 20","value":4800},{"label":"Jul 21","value":5600}]'
 * ></lw-trend-chart>
 * ```
 *
 * Peak and average are computed from `data`, not passed separately, so the
 * headline numbers can never drift out of sync with the plotted curve.
 *
 * Styling hooks: `part="card"`, `part="chart"`, and the custom property
 * `--lw-trend-color` (default a warm orange, drives the line and its fill).
 */
export class LwTrendChart extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    yAxisLabel: { type: String, attribute: "y-axis-label" },
    peakLabel: { type: String, attribute: "peak-label" },
    averageLabel: { type: String, attribute: "average-label" },
    data: { type: Array },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare title: string;
  declare subtitle: string;
  declare yAxisLabel: string;
  declare peakLabel: string;
  declare averageLabel: string;
  declare data: LwTrendPoint[];

  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    super();
    this.title = "";
    this.subtitle = "";
    this.yAxisLabel = "";
    this.peakLabel = "Peak";
    this.averageLabel = "Average";
    this.data = [];
  }

  static styles = css`
    :host {
      display: block;
      --lw-trend-color: #f2984f;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
      color: #101828;
    }

    .card {
      container-type: inline-size;
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border: 1px solid #eef0f2;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    /*
     * .stats never shrinks (it's two nowrap numbers), so at a narrow card
     * width it squeezes the title/subtitle block down to almost nothing --
     * "Peak Usage" wraps to two lines and a longer subtitle wraps word by
     * word. A container query (not a viewport media query) is the right
     * tool here: what matters is this card's own rendered width, not the
     * page's, since the same component can end up in a narrow column on an
     * otherwise-wide screen.
     */
    @container (max-width: 360px) {
      .top {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
    }

    .title {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 12px;
      color: #667085;
    }

    .stats {
      display: flex;
      gap: 24px;
      flex-shrink: 0;
    }

    .stat {
      display: flex;
      align-items: baseline;
      gap: 6px;
      white-space: nowrap;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #98a2b3;
    }

    .stat-value {
      font-size: 15px;
      font-weight: 700;
      color: #101828;
    }

    .body {
      display: flex;
      flex: 1;
      min-height: 0;
      margin-top: 12px;
    }

    .axis-label {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 11px;
      color: #98a2b3;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-right: 4px;
      flex-shrink: 0;
    }

    .chart {
      flex: 1;
      min-width: 0;
      min-height: 140px;
    }
  `;

  private get chartEl(): HTMLElement | null {
    return this.renderRoot.querySelector(".chart");
  }

  private get peak(): number {
    return this.data.reduce((max, p) => Math.max(max, p.value), 0);
  }

  private get average(): number {
    if (this.data.length === 0) return 0;
    const sum = this.data.reduce((total, p) => total + p.value, 0);
    return Math.round(sum / this.data.length);
  }

  private buildOption(): TrendOption {
    const style = getComputedStyle(this);
    // Must be 6-digit hex: alpha is appended below ("#rrggbb" + "4D"/"00") to
    // fade the area fill, which only produces a valid 8-digit hex color if
    // the base value is hex. A named color or rgb(...) override would break.
    const color =
      style.getPropertyValue("--lw-trend-color").trim() || "#f2984f";

    return {
      grid: { left: 8, right: 12, top: 12, bottom: 24, containLabel: true },
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => Number(value).toLocaleString(),
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: this.data.map((p) => p.label),
        axisLine: { lineStyle: { color: "#eef0f2" } },
        axisTick: { show: false },
        axisLabel: { color: "#98a2b3", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        min: 0,
        splitNumber: 4,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "#f0f1f3", type: "dashed" } },
        axisLabel: {
          color: "#98a2b3",
          fontSize: 11,
          formatter: (value: number) => formatCompact(value),
        },
      },
      series: [
        {
          type: "line",
          data: this.data.map((p) => p.value),
          smooth: true,
          symbol: "none",
          lineStyle: { color, width: 2.5 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}4D` },
                { offset: 1, color: `${color}00` },
              ],
            },
          },
        },
      ],
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
        <div class="top">
          <div>
            <h3 class="title">${this.title}</h3>
            ${this.subtitle
              ? html`<p class="subtitle">${this.subtitle}</p>`
              : ""}
          </div>
          <div class="stats">
            <span class="stat">
              <span class="stat-label">${this.peakLabel}</span>
              <span class="stat-value">${this.peak.toLocaleString()}</span>
            </span>
            <span class="stat">
              <span class="stat-label">${this.averageLabel}</span>
              <span class="stat-value">${this.average.toLocaleString()}</span>
            </span>
          </div>
        </div>
        <div class="body">
          ${this.yAxisLabel
            ? html`<span class="axis-label">${this.yAxisLabel}</span>`
            : ""}
          <div class="chart" part="chart"></div>
        </div>
      </div>
    `;
  }

  firstUpdated() {
    this.syncChart();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("data")) this.syncChart();
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
if (!customElements.get("lw-trend-chart")) {
  customElements.define("lw-trend-chart", LwTrendChart);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-trend-chart": LwTrendChart;
  }
}
