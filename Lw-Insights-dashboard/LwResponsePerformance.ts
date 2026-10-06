import { GaugeChart } from "echarts/charts";
import type { GaugeSeriesOption } from "echarts/charts";
import * as echarts from "echarts/core";
import type { ComposeOption, ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LitElement, css, html } from "lit";

echarts.use([GaugeChart, CanvasRenderer]);

type ResponsePerformanceOption = ComposeOption<GaugeSeriesOption>;

const formatSeconds = (value: number): string => `${value.toFixed(2)}s`;

/**
 * `<lw-response-performance>` - response speed card with a semicircle ECharts
 * gauge and supporting fastest/slowest/abandonment metrics.
 *
 * ```html
 * <lw-response-performance
 *   response-time="1.24"
 *   fastest-response="0.41"
 *   slowest-response="3.08"
 *   abandonment-rate="6.4"
 * ></lw-response-performance>
 * ```
 *
 * Styling hooks: `part="card"`, `part="chart"`, `part="stat"`,
 * `part="alert"`, and custom properties `--lw-response-color` and
 * `--lw-response-alert-color`.
 */
export class LwResponsePerformance extends LitElement {
  static properties = {
    title: { type: String },
    subtitle: { type: String },
    responseTime: { type: Number, attribute: "response-time" },
    maxResponseTime: { type: Number, attribute: "max-response-time" },
    fastestResponse: { type: Number, attribute: "fastest-response" },
    slowestResponse: { type: Number, attribute: "slowest-response" },
    abandonmentRate: { type: Number, attribute: "abandonment-rate" },
    abandonmentLabel: { type: String, attribute: "abandonment-label" },
    abandonmentDescription: {
      type: String,
      attribute: "abandonment-description",
    },
    severity: { type: String },
  };

  declare title: string;
  declare subtitle: string;
  declare responseTime: number;
  declare maxResponseTime: number;
  declare fastestResponse: number;
  declare slowestResponse: number;
  declare abandonmentRate: number;
  declare abandonmentLabel: string;
  declare abandonmentDescription: string;
  declare severity: string;

  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    super();
    this.title = "Response Performance";
    this.subtitle = "How fast the AI Overview is generated";
    this.responseTime = 1.24;
    this.maxResponseTime = 4;
    this.fastestResponse = 0.41;
    this.slowestResponse = 3.08;
    this.abandonmentRate = 6.4;
    this.abandonmentLabel = "Abandonment Rate";
    this.abandonmentDescription =
      "Visitors who left before their search response was ready.";
    this.severity = "Low";
  }

  static styles = css`
    :host {
      display: block;
      --lw-response-color: #ff8128;
      --lw-response-alert-color: #ff3746;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
      color: #101828;
    }

    .card {
      box-sizing: border-box;
      width: 100%;
      max-width: 510px;
      min-height: 414px;
      background: #ffffff;
      border: 1px solid #eef0f2;
      border-radius: 16px;
      padding: 28px 26px 18px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .title {
      margin: 0;
      color: #1d2433;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .subtitle {
      margin: 6px 0 0;
      color: #727d8f;
      font-size: 14px;
      line-height: 1.35;
    }

    .gauge-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: min(216px, 56vw);
      margin: 22px auto 4px;
    }

    .chart {
      width: 100%;
      height: 120px;
    }

    .center {
      margin-top: -50px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .time {
      color: #111827;
      font-size: 32px;
      font-weight: 800;
      line-height: 1;
    }

    .time-label {
      margin-top: 4px;
      color: #7a8494;
      font-size: 12px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 26px;
    }

    .stat {
      border: 1px solid #eef0f2;
      border-radius: 14px;
      background: #f7f8fa;
      padding: 16px;
    }

    .stat-label {
      margin: 0;
      color: #737f90;
      font-size: 12px;
      line-height: 1.3;
    }

    .stat-value {
      display: block;
      margin-top: 8px;
      color: #111827;
      font-size: 20px;
      font-weight: 800;
      line-height: 1;
    }

    .alert {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      border: 1px solid var(--lw-response-alert-color);
      border-radius: 14px;
      padding: 16px 18px;
    }

    .alert-label {
      margin: 0;
      color: var(--lw-response-alert-color);
      font-size: 14px;
      font-weight: 700;
      line-height: 1.25;
    }

    .alert-copy {
      margin: 8px 0 0;
      color: #737f90;
      font-size: 12px;
      line-height: 1.35;
    }

    .rate {
      color: var(--lw-response-alert-color);
      font-size: 20px;
      font-weight: 800;
      text-align: right;
      white-space: nowrap;
    }

    .severity {
      display: inline-flex;
      justify-content: center;
      min-width: 42px;
      margin-top: 9px;
      border-radius: 999px;
      background: #ffe9ea;
      color: #ef3340;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      text-align: center;
    }

    @media screen and (max-width: 520px) {
      .card {
        padding: 22px 18px 16px;
      }

      .stats,
      .alert {
        grid-template-columns: 1fr;
      }

      .rate {
        text-align: left;
      }
    }
  `;

  private get chartEl(): HTMLElement | null {
    return this.renderRoot.querySelector(".chart");
  }

  private buildOption(): ResponsePerformanceOption {
    const style = getComputedStyle(this);
    const color =
      style.getPropertyValue("--lw-response-color").trim() || "#ff8128";

    // Radius as an explicit pixel number (not a percentage) tied to the
    // container's actual rendered width: ECharts' percentage radius for a
    // gauge is relative to min(width, height)/2, which -- given this
    // container is much wider than it is tall (a semicircle's natural
    // bounding box) -- resolves against the *short* side and renders a tiny
    // arc. A pixel radius of half the container width always spans the full
    // width regardless of that.
    const width = this.chartEl?.clientWidth ?? 216;
    const radius = width / 2;

    return {
      series: [
        {
          type: "gauge",
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: this.maxResponseTime,
          radius,
          center: ["50%", "100%"],
          pointer: { show: false },
          // The reference design is one solid, fully-colored arch -- not a
          // value-proportional fill -- so the visible ring is the axisLine
          // itself; `progress` (which would only fill responseTime/max of
          // the arc) stays hidden.
          progress: { show: false },
          axisLine: {
            roundCap: true,
            lineStyle: { width: 13, color: [[1, color]] },
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: { show: false },
          data: [{ value: this.responseTime }],
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
      // Rebuilds the option (not just chart.resize()) so the pixel radius
      // in buildOption() is recomputed against the container's new width.
      this.observer = new ResizeObserver(() => {
        this.chart?.resize();
        if (this.chart) this.chart.setOption(this.buildOption(), true);
      });
      this.observer.observe(el);
    }

    this.chart.setOption(this.buildOption(), true);
  }

  render() {
    return html`
      <article class="card" part="card">
        <h3 class="title">${this.title}</h3>
        <p class="subtitle">${this.subtitle}</p>

        <div class="gauge-wrap">
          <div class="chart" part="chart"></div>
          <div class="center">
            <span class="time">${formatSeconds(this.responseTime)}</span>
            <span class="time-label">Average response time</span>
          </div>
        </div>

        <div class="stats">
          <section class="stat" part="stat">
            <p class="stat-label">Fastest response</p>
            <strong class="stat-value"
              >${formatSeconds(this.fastestResponse)}</strong
            >
          </section>
          <section class="stat" part="stat">
            <p class="stat-label">Slowest response</p>
            <strong class="stat-value"
              >${formatSeconds(this.slowestResponse)}</strong
            >
          </section>
        </div>

        <section class="alert" part="alert">
          <div>
            <p class="alert-label">${this.abandonmentLabel}</p>
            <p class="alert-copy">${this.abandonmentDescription}</p>
          </div>
          <div>
            <div class="rate">${this.abandonmentRate.toFixed(1)}%</div>
            <span class="severity">${this.severity}</span>
          </div>
        </section>
      </article>
    `;
  }

  firstUpdated() {
    this.syncChart();
  }

  updated(changed: Map<string, unknown>) {
    if (
      changed.has("responseTime") ||
      changed.has("maxResponseTime") ||
      changed.has("fastestResponse") ||
      changed.has("slowestResponse") ||
      changed.has("abandonmentRate")
    ) {
      this.syncChart();
    }
  }

  connectedCallback() {
    super.connectedCallback();
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

if (!customElements.get("lw-response-performance")) {
  customElements.define("lw-response-performance", LwResponsePerformance);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-response-performance": LwResponsePerformance;
  }
}
