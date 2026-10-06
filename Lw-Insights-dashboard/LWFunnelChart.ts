import { FunnelChart } from "echarts/charts";
import type { FunnelSeriesOption } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import type { TooltipComponentOption } from "echarts/components";
import * as echarts from "echarts/core";
import type { ComposeOption, ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LitElement, css, html, nothing } from "lit";

echarts.use([FunnelChart, TooltipComponent, CanvasRenderer]);

type FunnelOption = ComposeOption<FunnelSeriesOption | TooltipComponentOption>;

export interface LWFunnelStage {
  /** Caption shown under the value, inside the band. */
  label: string;
  /** Drives both the displayed number and the band width. */
  value: number;
  /**
   * Optional callout rendered to the right, at the boundary *below* this
   * stage. Free text, not derived from `value` — conversion rates are usually
   * measured separately from raw stage counts.
   */
  percent?: string;
}

const DEFAULT_COLORS = ["#f8c095", "#f3a163", "#ef8034"];

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

const toHex = (rgb: number[]) =>
  `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/**
 * Sample `palette` at `count` evenly spaced points, interpolating between
 * stops. Cycling the palette instead would make a 4th band reuse the lightest
 * colour and break the light-to-dark ramp, so stage counts and palette length
 * are decoupled here.
 */
export const rampColors = (palette: string[], count: number): string[] => {
  if (count <= 0) return [];
  if (palette.length === 0) return rampColors(DEFAULT_COLORS, count);
  if (palette.length === 1 || count === 1) return Array(count).fill(palette[0]);

  const stops = palette.map(parseHex);
  return Array.from({ length: count }, (_, i) => {
    const t = (i / (count - 1)) * (stops.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, stops.length - 1);
    const f = t - lo;
    return toHex(stops[lo].map((c, k) => c + (stops[hi][k] - c) * f));
  });
};

/**
 * `<lw-funnel-chart>` — a self-contained funnel chart card.
 *
 * Framework-agnostic: set `stages` as a property from JS, or pass JSON via the
 * attribute in plain HTML.
 *
 * ```html
 * <lw-funnel-chart
 *   heading="Email Engagement"
 *   stages='[{"label":"Sent","value":3000,"percent":"74%"},
 *            {"label":"Opened","value":2438,"percent":"30%"},
 *            {"label":"Clicked","value":1534}]'
 * ></lw-funnel-chart>
 * ```
 *
 * Styling hooks: `part="card"`, `part="heading"`, `part="chart"`, and the
 * custom properties `--lw-funnel-height`, `--lw-funnel-gutter`.
 */
export class LWFunnelChart extends LitElement {
  static properties = {
    heading: { type: String },
    stages: { type: Array },
    colors: { type: Array },
    dotColor: { type: String, attribute: "dot-color" },
    bare: { type: Boolean },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare heading: string;
  declare stages: LWFunnelStage[];
  declare colors: string[];
  declare dotColor: string;
  /** Render without the card chrome, for embedding in an existing card. */
  declare bare: boolean;

  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    super();
    this.heading = "";
    this.stages = [];
    this.colors = DEFAULT_COLORS;
    this.dotColor = "#f58635";
    this.bare = false;
  }

  static styles = css`
    :host {
      display: block;
      --lw-funnel-height: 200px;
      --lw-funnel-gutter: 56px;
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

    .card.bare {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
    }

    .heading {
      margin: 0 0 12px;
      font-size: 15px;
      font-weight: 700;
      color: #101828;
    }

    .body {
      display: flex;
      align-items: stretch;
    }

    .chart {
      flex: 1;
      min-width: 0;
      height: var(--lw-funnel-height);
    }

    .gutter {
      position: relative;
      flex: 0 0 var(--lw-funnel-gutter);
      height: var(--lw-funnel-height);
    }

    .callout {
      position: absolute;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      transform: translateY(-50%);
    }

    .leader {
      width: 12px;
      height: 1px;
      background: #d0d5dd;
      flex-shrink: 0;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .value {
      font-size: 13px;
      font-weight: 600;
      color: #475467;
      white-space: nowrap;
    }
  `;

  render() {
    const count = this.stages.length;

    return html`
      <div class="card ${this.bare ? "bare" : ""}" part="card">
        ${this.heading
          ? html`<h3 class="heading" part="heading">${this.heading}</h3>`
          : nothing}
        <div class="body">
          <div class="chart" part="chart"></div>
          <div class="gutter">
            ${this.stages.map((stage, index) =>
              stage.percent && index < count - 1
                ? html`
                    <div
                      class="callout"
                      style="top:${((index + 1) / count) * 100}%"
                    >
                      <span class="leader"></span>
                      <span
                        class="dot"
                        style="background:${this.dotColor}"
                      ></span>
                      <span class="value">${stage.percent}</span>
                    </div>
                  `
                : nothing,
            )}
          </div>
        </div>
      </div>
    `;
  }

  private get chartEl(): HTMLElement | null {
    return this.renderRoot.querySelector(".chart");
  }

  private buildOption(): FunnelOption {
    const colors = rampColors(
      this.colors?.length ? this.colors : DEFAULT_COLORS,
      this.stages.length,
    );

    const count = this.stages.length;

    return {
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const { dataIndex } = params as { dataIndex: number };
          const stage = this.stages[dataIndex];
          return stage ? `${stage.label}: <b>${stage.value}</b>` : "";
        },
      },
      series: [
        {
          type: "funnel",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          // The silhouette is fixed by design: every instance tapers from
          // 100% at the top to 70% at the base regardless of the numbers, so
          // cards line up across a dashboard. Band width therefore carries no
          // magnitude -- the series is fed a synthetic descending ramp and the
          // real figures are drawn by the label formatter below.
          min: 0,
          max: count,
          minSize: "70%",
          maxSize: "100%",
          sort: "none",
          gap: 0,
          label: {
            show: true,
            position: "inside",
            formatter: ({ dataIndex }) => {
              const stage = this.stages[dataIndex];
              return stage ? `{v|${stage.value}}\n{n|${stage.label}}` : "";
            },
            rich: {
              v: {
                fontSize: 17,
                fontWeight: "bold",
                color: "#ffffff",
                lineHeight: 22,
                textBorderColor: "rgba(0, 0, 0, 0.35)",
                textBorderWidth: 2,
              },
              n: {
                fontSize: 12,
                color: "#ffffff",
                lineHeight: 16,
                textBorderColor: "rgba(0, 0, 0, 0.35)",
                textBorderWidth: 2,
              },
            },
          },
          labelLine: { show: false },
          itemStyle: { borderWidth: 0 },
          data: this.stages.map((stage, index) => ({
            name: stage.label,
            // Synthetic descending ramp -> fixed silhouette (see note above).
            value: count - index,
            itemStyle: { color: colors[index] },
          })),
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

  firstUpdated() {
    this.syncChart();
  }

  updated(changed: Map<string, unknown>) {
    if (
      changed.has("stages") ||
      changed.has("colors") ||
      changed.has("bare") ||
      changed.has("heading")
    ) {
      this.syncChart();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Re-init if the element was moved in the DOM after being disconnected.
    if (this.hasUpdated) this.syncChart();
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
if (!customElements.get("lw-funnel-chart")) {
  customElements.define("lw-funnel-chart", LWFunnelChart);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-funnel-chart": LWFunnelChart;
  }
}
