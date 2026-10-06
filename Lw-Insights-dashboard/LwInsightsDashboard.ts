import {
  GridStack,
  type GridItemHTMLElement,
  type GridStackNode,
  type Responsive,
} from "gridstack";
import "gridstack/dist/gridstack.min.css";
import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";

import {
  buildResponsiveLayout,
  RESPONSIVE_BREAKPOINTS,
  type DesktopSlot,
} from "./gridResponsiveLayout";
import {
  defaultInsightsData,
  fetchSearchAnalyticsDaily,
  fetchSearchAnalyticsDailyRaw,
  mapSearchAnalyticsToWidgets,
  RANGE_LABEL_TO_API_PARAM,
  type InsightsData,
} from "./insightsAnalytics";

// Side-effect imports: register every inner element this dashboard renders.
import "./LwBreakdownBar";
import "./LwGaugeCard";
import "./LwMetricCard";
import "./LwRankedList";
import "./LwResponsePerformance";
import "./LwSegmentedControl";
import "./LwSourceList";
import "./LwStatRankedList";
import "./LwTrendChart";
import type { LwSegmentedChangeDetail } from "./LwSegmentedControl";

type WidgetId = keyof InsightsData["widgets"];

/** A widget's grid geometry -- layout, deliberately kept out of the data. */
interface WidgetSlot extends DesktopSlot {
  id: WidgetId;
  minW: number;
  minH: number;
}

const TRAFFIC_COLUMNS = 10;
const ENGAGEMENT_COLUMNS = 12;
const TRAFFIC_CELL_HEIGHT = 68;
const ENGAGEMENT_CELL_HEIGHT = 58;

// Module-level so the arrays are referentially stable: the render template
// maps over them, and a stable list keeps lit-html patching bindings in place
// rather than recreating the item elements GridStack has taken ownership of.
const TRAFFIC_SLOTS: WidgetSlot[] = [
  { id: "total-searches", x: 0, y: 0, w: 2, h: 3, minW: 1, minH: 3 },
  { id: "unique-searches", x: 2, y: 0, w: 2, h: 3, minW: 1, minH: 3 },
  { id: "peak-usage", x: 0, y: 3, w: 4, h: 4, mobileH: 5, minW: 2, minH: 2 },
  { id: "most-searched-queries", x: 4, y: 0, w: 6, h: 7, minW: 2, minH: 6 },
];

const ENGAGEMENT_SLOTS: WidgetSlot[] = [
  { id: "most-used-sources", x: 0, y: 0, w: 4, h: 8, mobileH: 9, minW: 2, minH: 6 },
  { id: "searches-unblocked", x: 4, y: 0, w: 3, h: 8, minW: 2, minH: 6 },
  { id: "response-performance", x: 8, y: 0, w: 5, h: 8, mobileH: 11, minW: 2, minH: 6 },
  { id: "result-quality", x: 0, y: 8, w: 6, h: 8, mobileH: 11, minW: 2, minH: 5 },
  { id: "zero-result-searches", x: 6, y: 8, w: 6, h: 8, mobileH: 10, minW: 2, minH: 5 },
];

const columnOptsFor = (
  desktopColumns: number,
  slots: WidgetSlot[],
): Responsive => ({
  breakpointForWindow: true,
  columnMax: desktopColumns,
  breakpoints: RESPONSIVE_BREAKPOINTS,
  layout: buildResponsiveLayout(
    desktopColumns,
    new Map(slots.map((s) => [s.id as string, s])),
  ) as (
    column: number,
    prevColumn: number,
    newNodes: GridStackNode[],
    nodes: GridStackNode[],
  ) => void,
});

/**
 * `<lw-insights-dashboard>` -- the whole DiscoverAI Insights dashboard as one
 * custom element: page header, section headers, and two GridStack grids of
 * analytics widgets.
 *
 * Two ways to feed it, which compose:
 *
 * 1. **Static** -- assign `data` (an `InsightsData`). Renders exactly that.
 * 2. **Live** -- set `index-logical-name`; the element then calls the
 *    search-analytics API itself and overlays the response onto `data`
 *    (or the bundled sample dataset) via the same `mapSearchAnalyticsToWidgets`
 *    the React page uses, so both stay in sync by construction.
 *
 * ```html
 * <lw-insights-dashboard index-logical-name="all"></lw-insights-dashboard>
 * ```
 *
 * Renders into **light DOM**, not a shadow root: GridStack queries and moves
 * `.grid-stack-item` nodes and relies on its own global stylesheet, both of
 * which a shadow boundary breaks. The inner widgets keep their own shadow
 * roots, so their styles stay encapsulated regardless.
 */
export class LwInsightsDashboard extends LitElement {
  static properties = {
    data: { type: Object },
    indexLogicalName: { type: String, attribute: "index-logical-name" },
    editable: { type: Boolean },
    range: { type: String },
    widgets: { state: true },
    error: { state: true },
  };

  declare data: InsightsData;
  declare indexLogicalName: string;
  declare editable: boolean;
  declare range: string;
  /** Widgets actually rendered -- `data.widgets` with any API response overlaid. */
  declare widgets: InsightsData["widgets"];
  declare error: string | null;

  private grids: GridStack[] = [];
  private abortController: AbortController | null = null;
  private resizeTimer: number | undefined;

  constructor() {
    super();
    this.data = defaultInsightsData;
    this.indexLogicalName = "";
    this.editable = false;
    this.range = defaultInsightsData.range.initial;
    this.widgets = defaultInsightsData.widgets;
    this.error = null;
  }

  // Light DOM -- see the class docs.
  createRenderRoot() {
    return this;
  }

  private get baseWidgets(): InsightsData["widgets"] {
    return this.data?.widgets ?? defaultInsightsData.widgets;
  }

  private async loadAnalytics() {
    const apiRange = RANGE_LABEL_TO_API_PARAM[this.range];
    // No index to query, or a range the API has no equivalent for ("Custom"):
    // fall back to whatever `data` already holds rather than erroring.
    if (!this.indexLogicalName || !apiRange) {
      this.widgets = this.baseWidgets;
      return;
    }

    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;

    try {
      const [daily, dailyRaw] = await Promise.all([
        fetchSearchAnalyticsDaily(this.indexLogicalName, apiRange, controller.signal),
        fetchSearchAnalyticsDailyRaw(this.indexLogicalName, apiRange, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      this.widgets = mapSearchAnalyticsToWidgets(this.baseWidgets, daily, dailyRaw);
      this.error = null;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      this.error =
        error instanceof Error ? error.message : "Failed to load search analytics";
      // Keep the last good widgets on screen rather than blanking the page.
      this.widgets = this.baseWidgets;
    }
  }

  private onRangeChange(event: Event) {
    const detail = (event as CustomEvent<LwSegmentedChangeDetail>).detail;
    if (!detail || detail.value === this.range) return;
    this.range = detail.value;
    this.dispatchEvent(
      new CustomEvent("lw-range-change", {
        detail: { value: detail.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderWidget(id: WidgetId): TemplateResult {
    const w = this.widgets;
    switch (id) {
      case "total-searches":
      case "unique-searches": {
        const m = w[id];
        return html`<lw-metric-card
          .icon=${m.icon ?? ""}
          .label=${m.label}
          .value=${m.value}
          .trendDirection=${m.trendDirection ?? "up"}
          .trendPercent=${m.trendPercent ?? ""}
          .comparison=${m.comparison ?? ""}
        ></lw-metric-card>`;
      }
      case "peak-usage": {
        const t = w[id];
        return html`<lw-trend-chart
          .title=${t.title}
          .subtitle=${t.subtitle ?? ""}
          .yAxisLabel=${t.yAxisLabel ?? ""}
          .data=${t.data}
        ></lw-trend-chart>`;
      }
      case "most-searched-queries": {
        const r = w[id];
        return html`<lw-ranked-list
          .title=${r.title}
          .subtitle=${r.subtitle ?? ""}
          .items=${r.items}
        ></lw-ranked-list>`;
      }
      case "most-used-sources": {
        const s = w[id];
        return html`<lw-source-list
          .title=${s.title}
          .subtitle=${s.subtitle ?? ""}
          .items=${s.items}
          .footer=${s.footer ?? null}
        ></lw-source-list>`;
      }
      case "searches-unblocked": {
        const g = w[id];
        return html`<lw-gauge-card
          .title=${g.title}
          .subtitle=${g.subtitle ?? ""}
          .value=${g.value}
          .trendDirection=${g.trendDirection ?? "up"}
          .trendPercent=${g.trendPercent ?? ""}
          .comparisonLabel=${g.comparisonLabel ?? "vs previous"}
        ></lw-gauge-card>`;
      }
      case "response-performance": {
        const p = w[id];
        // Every field is optional; fall back to the element's own defaults
        // rather than forcing zeros onto an unmapped widget.
        const d = defaultInsightsData.widgets["response-performance"];
        return html`<lw-response-performance
          .title=${p.title ?? d.title ?? "Response Performance"}
          .subtitle=${p.subtitle ?? d.subtitle ?? "How fast the AI Overview is generated"}
          .responseTime=${p.responseTime ?? 1.24}
          .maxResponseTime=${p.maxResponseTime ?? 4}
          .fastestResponse=${p.fastestResponse ?? 0.41}
          .slowestResponse=${p.slowestResponse ?? 3.08}
          .abandonmentRate=${p.abandonmentRate ?? 6.4}
          .abandonmentLabel=${p.abandonmentLabel ?? "Abandonment Rate"}
          .abandonmentDescription=${p.abandonmentDescription ??
          "Visitors who left before their search response was ready."}
          .severity=${p.severity ?? "Low"}
        ></lw-response-performance>`;
      }
      case "result-quality": {
        const b = w[id];
        return html`<lw-breakdown-bar
          .title=${b.title}
          .subtitle=${b.subtitle ?? ""}
          .countUnit=${b.countUnit ?? ""}
          .segments=${b.segments}
        ></lw-breakdown-bar>`;
      }
      case "zero-result-searches": {
        const z = w[id];
        return html`<lw-stat-ranked-list
          .title=${z.title}
          .subtitle=${z.subtitle ?? ""}
          .value=${z.value}
          .valueDescription=${z.valueDescription ?? ""}
          .badgePercent=${z.badgePercent ?? 0}
          .badgeLabel=${z.badgeLabel ?? ""}
          .listTitle=${z.listTitle ?? ""}
          .listLinkLabel=${z.listLinkLabel ?? ""}
          .items=${z.items}
        ></lw-stat-ranked-list>`;
      }
    }
  }

  private renderGrid(slots: WidgetSlot[], gridClass: string) {
    return html`
      <div class="lw-insights-grid-section">
        <div class="grid-stack ${gridClass}">
          ${slots.map(
            (slot) => html`
              <div
                class="grid-stack-item"
                gs-id=${slot.id}
                gs-x=${slot.x}
                gs-y=${slot.y}
                gs-w=${slot.w}
                gs-h=${slot.h}
                gs-min-w=${slot.minW}
                gs-min-h=${slot.minH}
              >
                <div class="grid-stack-item-content lw-insights-item">
                  ${this.renderWidget(slot.id)}
                </div>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  private renderSectionHeader(title: string, subtitle: string) {
    return html`
      <div class="lw-insights-section-header">
        <span class="lw-insights-section-bar"></span>
        <div>
          <h2 class="lw-insights-section-title">${title}</h2>
          <p class="lw-insights-section-subtitle">${subtitle}</p>
        </div>
      </div>
    `;
  }

  render() {
    const { page, range: rangeConfig, sections } = this.data ?? defaultInsightsData;

    return html`
      <style>
        ${DASHBOARD_STYLES}
      </style>
      <div class="lw-insights-wrapper">
        <header class="lw-insights-header">
          <div>
            <h1 class="lw-insights-title">${page.title}</h1>
            <p class="lw-insights-subtitle">${page.subtitle}</p>
          </div>
          <div class="lw-insights-controls">
            <label class="lw-insights-edit-toggle">
              <input
                type="checkbox"
                .checked=${this.editable}
                @change=${(e: Event) => {
                  this.editable = (e.target as HTMLInputElement).checked;
                }}
              />
              Edit layout
            </label>
            <div class="lw-insights-range">
              <lw-segmented-control
                .options=${rangeConfig.options}
                .value=${this.range}
                @lw-change=${this.onRangeChange}
              ></lw-segmented-control>
            </div>
          </div>
        </header>

        ${this.error
          ? html`<div class="lw-insights-error" role="status">
              Couldn't refresh analytics: ${this.error}
            </div>`
          : nothing}

        ${this.renderSectionHeader(sections.traffic.title, sections.traffic.subtitle)}
        ${this.renderGrid(TRAFFIC_SLOTS, "lw-insights-traffic")}
        ${this.renderSectionHeader(
          sections.engagement.title,
          sections.engagement.subtitle,
        )}
        ${this.renderGrid(ENGAGEMENT_SLOTS, "lw-insights-engagement")}
      </div>
    `;
  }

  /** Re-applies each widget's height for the column count now in effect. */
  private syncBreakpointHeights = () => {
    const apply = (selector: string, slots: WidgetSlot[]) => {
      const gridEl = this.querySelector<HTMLElement>(selector);
      const grid = this.grids.find((g) => g.el === gridEl);
      if (!gridEl || !grid) return;
      const reflowed = grid.getColumn() !== (gridEl.classList.contains("lw-insights-traffic") ? TRAFFIC_COLUMNS : ENGAGEMENT_COLUMNS);
      slots.forEach((slot) => {
        const target = reflowed ? (slot.mobileH ?? slot.h) : slot.h;
        const el = gridEl.querySelector<GridItemHTMLElement>(
          `[gs-id="${CSS.escape(slot.id)}"]`,
        );
        const node = el?.gridstackNode;
        if (el && node && node.h !== target) grid.update(el, { h: target });
      });
    };
    apply(".lw-insights-traffic", TRAFFIC_SLOTS);
    apply(".lw-insights-engagement", ENGAGEMENT_SLOTS);
  };

  private onWindowResize = () => {
    window.clearTimeout(this.resizeTimer);
    // After GridStack's own resize handling, not racing it.
    this.resizeTimer = window.setTimeout(this.syncBreakpointHeights, 120);
  };

  firstUpdated() {
    const init = (
      selector: string,
      column: number,
      cellHeight: number,
      slots: WidgetSlot[],
    ) => {
      const el = this.querySelector<HTMLElement>(selector);
      if (!el) return null;
      const columnOpts = columnOptsFor(column, slots);
      const grid: GridStack | null = GridStack.init(
        { column, cellHeight, margin: 8, columnOpts, float: false, animate: true },
        el,
      );
      if (!grid) return null;
      // `GridStack.init()` resolves the column count for the current width
      // before any widgets are read from the DOM, so the custom `layout`
      // reflow never runs for a page loaded straight into a narrow viewport.
      // Force a real column transition to make that first pass happen.
      const current = grid.getColumn();
      if (current !== column) {
        grid.column(column, "list");
        grid.column(current, columnOpts.layout ?? "list");
      }
      grid.setStatic(!this.editable);
      return grid;
    };

    this.grids = [
      init(".lw-insights-traffic", TRAFFIC_COLUMNS, TRAFFIC_CELL_HEIGHT, TRAFFIC_SLOTS),
      init(
        ".lw-insights-engagement",
        ENGAGEMENT_COLUMNS,
        ENGAGEMENT_CELL_HEIGHT,
        ENGAGEMENT_SLOTS,
      ),
    ].filter((g): g is GridStack => g !== null);

    // GridStack's per-column layout cache stores only x/y/w, because it
    // assumes height doesn't vary by column. `mobileH` breaks that: sizing
    // back up restores position from the cache and skips `columnOpts.layout`
    // for cached nodes, so a mobile height would stick at wider breakpoints.
    // Re-apply the height for the current column once the grid has settled.
    this.syncBreakpointHeights();
    window.addEventListener("resize", this.onWindowResize);

    // Deliberately no `loadAnalytics()` here: `updated()` runs straight after
    // this in the same cycle and already sees the constructor-set properties
    // in its changed-map, so loading here too would fire every request twice
    // on mount -- and `/daily-raw` is a live scan, not a cheap table read.
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("editable")) {
      this.grids.forEach((grid) => grid.setStatic(!this.editable));
    }
    // `data` changing swaps the base dataset, so the overlay must be redone.
    if (
      changed.has("indexLogicalName") ||
      changed.has("range") ||
      changed.has("data")
    ) {
      void this.loadAnalytics();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this.onWindowResize);
    window.clearTimeout(this.resizeTimer);
    this.abortController?.abort();
    this.abortController = null;
    // false = leave the DOM alone; lit-html owns those nodes.
    this.grids.forEach((grid) => grid.destroy(false));
    this.grids = [];
  }
}

/**
 * Plain string rather than Lit's `css` tagged template: `static styles` only
 * applies to a shadow root, and this element renders into light DOM.
 */
const DASHBOARD_STYLES = `
  lw-insights-dashboard {
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
  }

  .lw-insights-wrapper {
    min-height: 100vh;
    background: #f7f8fa;
    color: #101828;
  }

  .lw-insights-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    background: #ffffff;
    border-bottom: 1px solid #eef0f2;
    padding: 28px 32px;
  }

  .lw-insights-title {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .lw-insights-subtitle {
    margin: 6px 0 0;
    font-size: 14px;
    color: #667085;
  }

  .lw-insights-controls {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    max-width: 100%;
    min-width: 0;
    margin-left: auto;
  }

  .lw-insights-edit-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #98a2b3;
    cursor: pointer;
    user-select: none;
  }

  .lw-insights-range {
    max-width: 100%;
    overflow-x: auto;
  }

  .lw-insights-error {
    background: #fef3f2;
    border-bottom: 1px solid #fee4e2;
    color: #b42318;
    font-size: 13px;
    padding: 10px 32px;
  }

  .lw-insights-section-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 28px 32px 16px;
  }

  .lw-insights-section-bar {
    width: 3px;
    height: 18px;
    margin-top: 2px;
    background: #f2984f;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .lw-insights-section-title {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #f2984f;
  }

  .lw-insights-section-subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    color: #667085;
  }

  .lw-insights-grid-section {
    padding: 0 32px 32px;
  }

  .lw-insights-grid-section .grid-stack {
    background: transparent;
  }

  .lw-insights-item {
    display: flex;
    flex-direction: column;
    overflow: auto;
    border-radius: 14px;
    background: transparent;
  }

  .lw-insights-item > * {
    flex: 1;
    min-height: 0;
  }

  /* The gauge card's row-mates need more height than it does, so centre its
     content instead of leaving it top-aligned against a tall row. */
  .lw-insights-wrapper lw-gauge-card::part(card) {
    justify-content: center;
  }

  /* Unlike its row-mates this card is a fixed max-width/min-height block,
     designed for its own standalone page rather than a stretched grid cell. */
  .lw-insights-wrapper lw-response-performance::part(card) {
    max-width: none;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .lw-insights-wrapper lw-response-performance::part(alert) {
    margin-top: auto;
  }

  @media (max-width: 640px) {
    .lw-insights-header,
    .lw-insights-section-header,
    .lw-insights-grid-section {
      padding-left: 16px;
      padding-right: 16px;
    }

    .lw-insights-error {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
`;

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-insights-dashboard")) {
  customElements.define("lw-insights-dashboard", LwInsightsDashboard);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-insights-dashboard": LwInsightsDashboard;
  }
}
