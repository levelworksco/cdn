import { GaugeChart } from "echarts/charts";
import type { GaugeSeriesOption } from "echarts/charts";
import * as echarts from "echarts/core";
import type { ComposeOption, ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LitElement, css, html, nothing, svg } from "lit";
import type { SVGTemplateResult } from "lit";

echarts.use([GaugeChart, CanvasRenderer]);

type GaugeOption = ComposeOption<GaugeSeriesOption>;

export type LwGaugeTrendDirection = "up" | "down";

// Same trend-arrow glyphs as LwMetricCard, spelled out literally per shape --
// lit-html bindings only work as `attr="${value}"` or as node content, not
// spliced as a bare multi-attribute string inside a tag.
const TREND_ARROWS: Record<LwGaugeTrendDirection, SVGTemplateResult> = {
  up: svg`<path d="M2 8 6 4l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 2h3v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  down: svg`<path d="M2 4 6 8l2-2 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 10h3V7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/**
 * `<lw-gauge-card>` — a circular progress-ring card: percentage value drawn
 * as a rounded-cap ECharts gauge, with a title, subtitle, and a trend pill
 * underneath, e.g. "Searches Unblocked: 87%, up 4% vs previous."
 *
 * Framework-agnostic: set properties from JS, or attributes in plain HTML.
 *
 * ```html
 * <lw-gauge-card
 *   title="Searches Unblocked"
 *   subtitle="Answered without a dead-end"
 *   value="87"
 *   trend-direction="up"
 *   trend-percent="4%"
 *   comparison-label="vs previous"
 * ></lw-gauge-card>
 * ```
 *
 * The center label (e.g. "87%") is computed from `value`, not passed
 * separately, so it can never drift out of sync with the ring's fill.
 *
 * Styling hooks: `part="card"`, `part="ring"`, `part="value"`, and the custom
 * properties `--lw-gauge-color` (default indigo, the filled arc) and
 * `--lw-gauge-track-color` (default light gray, the unfilled track).
 */
export class LwGaugeCard extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    value: { type: Number },
    trendDirection: { type: String, attribute: "trend-direction" },
    trendPercent: { type: String, attribute: "trend-percent" },
    comparisonLabel: { type: String, attribute: "comparison-label" },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare title: string;
  declare subtitle: string;
  declare value: number;
  declare trendDirection: LwGaugeTrendDirection;
  declare trendPercent: string;
  declare comparisonLabel: string;

  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    super();
    this.title = "";
    this.subtitle = "";
    this.value = 0;
    this.trendDirection = "up";
    this.trendPercent = "";
    this.comparisonLabel = "vs previous";
  }

  static styles = css`
    :host {
      display: block;
      --lw-gauge-color: #6366f1;
      --lw-gauge-track-color: #eef0f2;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
      color: #101828;
    }

    .card {
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: #ffffff;
      border: 1px solid #eef0f2;
      border-radius: 16px;
      padding: 24px 20px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .ring-wrap {
      position: relative;
      width: 140px;
      height: 140px;
      flex-shrink: 0;
    }

    .ring {
      width: 100%;
      height: 100%;
    }

    .ring-value {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 700;
      color: #101828;
      pointer-events: none;
    }

    .title {
      margin: 16px 0 0;
      font-size: 16px;
      font-weight: 700;
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #667085;
      max-width: 220px;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 14px;
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

    .comparison {
      font-size: 12px;
      color: #98a2b3;
    }
  `;

  private get ringEl(): HTMLElement | null {
    return this.renderRoot.querySelector(".ring");
  }

  private get percentLabel(): string {
    return `${Math.round(this.value)}%`;
  }

  private buildOption(): GaugeOption {
    const style = getComputedStyle(this);
    const color = style.getPropertyValue("--lw-gauge-color").trim() || "#6366f1";
    const trackColor =
      style.getPropertyValue("--lw-gauge-track-color").trim() || "#eef0f2";

    return {
      series: [
        {
          type: "gauge",
          startAngle: 90,
          endAngle: -270,
          min: 0,
          max: 100,
          radius: "100%",
          pointer: { show: false },
          progress: {
            show: true,
            width: 14,
            roundCap: true,
            itemStyle: { color },
          },
          axisLine: {
            roundCap: true,
            lineStyle: { width: 14, color: [[1, trackColor]] },
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: { show: false },
          data: [{ value: this.value }],
        },
      ],
    };
  }

  private syncChart() {
    const el = this.ringEl;
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
        <div class="ring-wrap">
          <div class="ring" part="ring"></div>
          <div class="ring-value" part="value">${this.percentLabel}</div>
        </div>
        <h3 class="title">${this.title}</h3>
        ${this.subtitle ? html`<p class="subtitle">${this.subtitle}</p>` : ""}
        ${this.trendPercent
          ? html`
              <div class="footer">
                <span class="trend ${this.trendDirection}">
                  <svg viewBox="0 0 16 12">
                    ${TREND_ARROWS[this.trendDirection]}
                  </svg>
                  ${this.trendPercent}
                </span>
                ${this.comparisonLabel
                  ? html`<span class="comparison">${this.comparisonLabel}</span>`
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  firstUpdated() {
    this.syncChart();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("value")) this.syncChart();
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
if (!customElements.get("lw-gauge-card")) {
  customElements.define("lw-gauge-card", LwGaugeCard);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-gauge-card": LwGaugeCard;
  }
}
