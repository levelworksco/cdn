import {
  AllCommunityModule,
  ModuleRegistry,
  createGrid,
} from "ag-grid-community";
import type {
  ColDef,
  GridApi,
  GridOptions,
  ICellRendererFunc,
  PaginationChangedEvent,
} from "ag-grid-community";
import { LitElement, css, html } from "lit";

ModuleRegistry.registerModules([AllCommunityModule]);

export interface LwDataTableColumn {
  field: string;
  headerName?: string;
  width?: number;
  flex?: number;
  /**
   * Floor for a `flex` column, below which the grid scrolls horizontally
   * instead of shrinking further. Defaults to `DEFAULT_MIN_COLUMN_WIDTH`.
   */
  minWidth?: number;
  /**
   * `"text"` (default): the raw value.
   * `"link"`: value rendered as a clickable link.
   * `"action"`: an icon-only "open" button, no text.
   */
  type?: "text" | "link" | "action";
  /**
   * Row field holding the URL for `"link"`/`"action"` columns. Defaults to
   * `field` for `"link"`, and to the first `"link"` column's field/hrefField
   * for `"action"` -- an action column usually has no data of its own, it
   * opens whatever the row's link column points to.
   */
  hrefField?: string;
}

/** Narrow enough to keep 6-7 columns visible on a laptop, wide enough to read. */
const DEFAULT_MIN_COLUMN_WIDTH = 120;

const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      (
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }) as Record<
          string,
          string
        >
      )[c],
  );

const normalizeHref = (raw: string): string =>
  /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

const OPEN_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display:block"><path d="M6.667 3.333h6v6M12.667 3.333 3.333 12.667" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 44;

/**
 * `<lw-data-table>` — a paginated data table backed by AG Grid.
 *
 * Framework-agnostic: set `columns`/`rowData` as properties from JS, or pass
 * JSON via attributes in plain HTML.
 *
 * ```html
 * <lw-data-table
 *   page-size="10"
 *   columns='[{"field":"website","headerName":"Website","type":"link","flex":1.4},
 *             {"field":"blogs","headerName":"Blogs"},
 *             {"field":"actions","headerName":"Action","type":"action","width":90}]'
 *   rows-data='[{"website":"example.com","blogs":142}]'
 * ></lw-data-table>
 * ```
 *
 * (Lit's default attribute name for `rowData` would be the unhyphenated
 * `rowdata`, since Lit lowercases property names rather than kebab-casing
 * them. Mapped explicitly to `rows-data` here so the HTML attribute reads
 * sensibly; the JS property is still `rowData`.)
 *
 * Styling hooks: the custom properties `--lw-data-table-height` (default
 * `480px`) and the standard `--ag-*` AG Grid theme variables, which apply
 * normally since AG Grid detects it's rendering inside a shadow root and
 * injects its styles there instead of the document head.
 */
export class LwDataTable extends LitElement {
  static properties = {
    columns: { type: Array },
    rowData: { type: Array, attribute: "rows-data" },
    pageSize: { type: Number, attribute: "page-size" },
  };

  // Declared (not initialised) so class fields don't shadow Lit's accessors
  // under `useDefineForClassFields: true`.
  declare columns: LwDataTableColumn[];
  declare rowData: Record<string, unknown>[];
  declare pageSize: number;

  private api: GridApi | null = null;
  private page = { current: 1, total: 1 };

  constructor() {
    super();
    this.columns = [];
    this.rowData = [];
    this.pageSize = 10;
  }

  static styles = css`
    /*
     * Flex column so the table works in a height-constrained container (a
     * GridStack cell) as well as on its own page. .grid-wrapper carries an
     * inline height sized to pageSize rows; with flex 1 1 auto that height is
     * only its *starting* size, so a shorter container shrinks the grid
     * instead of pushing the pagination bar out of view -- which is what
     * display:block did, clipping the pager entirely at every width.
     */
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
      color: #101828;
    }

    .grid-wrapper {
      flex: 1 1 auto;
      min-height: 0;
      --ag-header-background-color: #f9fafb;
      --ag-header-foreground-color: #667085;
      --ag-border-color: #eef0f2;
      --ag-row-hover-color: #f9fafb;
      --ag-font-size: 14px;
      --ag-cell-horizontal-padding: 20px;
      --ag-wrapper-border-radius: 12px;
      border: 1px solid #eef0f2;
      border-radius: 12px;
      overflow: hidden;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding-top: 24px;
      /* Never give up its height to the grid above it. */
      flex-shrink: 0;
    }

    .page-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid #d0d5dd;
      background: #ffffff;
      color: #344054;
      cursor: pointer;
      padding: 0;
    }

    .page-arrow:hover:not(:disabled) {
      background: #f9fafb;
    }

    .page-arrow:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-text {
      font-size: 14px;
      color: #667085;
    }

    .page-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #d0d5dd;
      color: #101828;
      font-weight: 600;
      margin: 0 4px;
    }
  `;

  render() {
    // Default height fits exactly `pageSize` rows plus the header; an
    // ancestor setting --lw-data-table-height still wins over this fallback,
    // since var() resolves the custom property first regardless of where
    // it's referenced.
    const defaultHeight = this.pageSize * ROW_HEIGHT + HEADER_HEIGHT;

    return html`
      <div
        class="grid-wrapper"
        part="grid"
        style="height:var(--lw-data-table-height, ${defaultHeight}px)"
      ></div>
      <div class="pagination" part="pagination">
        <button
          class="page-arrow"
          aria-label="Previous page"
          ?disabled=${this.page.current <= 1}
          @click=${() => this.api?.paginationGoToPreviousPage()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12 6 8l4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <span class="page-text">
          Page <span class="page-number">${this.page.current}</span> of
          ${this.page.total}
        </span>
        <button
          class="page-arrow"
          aria-label="Next page"
          ?disabled=${this.page.current >= this.page.total}
          @click=${() => this.api?.paginationGoToNextPage()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="m6 4 4 4-4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    `;
  }

  private buildColumnDefs(): ColDef[] {
    const linkColumn = this.columns.find((c) => c.type === "link");
    const defaultActionHrefField = linkColumn?.hrefField ?? linkColumn?.field;

    return this.columns.map((col): ColDef => {
      const base: ColDef = {
        field: col.field,
        headerName: col.headerName ?? col.field,
        sortable: true,
      };
      if (col.width) base.width = col.width;
      else {
        base.flex = col.flex ?? 1;
        // Flex alone divides the container width however narrow it gets, so a
        // narrow viewport squeezes every column into an unreadable stub
        // ("hea...", "142..."). A floor makes the grid scroll horizontally
        // instead once the columns no longer fit.
        base.minWidth = col.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
      }

      if (col.type === "link") {
        const hrefField = col.hrefField ?? col.field;
        const renderer: ICellRendererFunc = (params) => {
          const raw = String(params.data?.[hrefField] ?? params.value ?? "");
          const href = raw ? normalizeHref(raw) : "#";
          return `<a href="${href}" target="_blank" rel="noreferrer" style="color:#e07b39;text-decoration:none;font-weight:500">${escapeHtml(
            params.value,
          )}</a>`;
        };
        base.cellRenderer = renderer;
      } else if (col.type === "action") {
        base.sortable = false;
        base.headerClass = "lw-action-header";
        const hrefField = col.hrefField ?? defaultActionHrefField;
        const renderer: ICellRendererFunc = (params) => {
          const raw = hrefField ? String(params.data?.[hrefField] ?? "") : "";
          const href = raw ? normalizeHref(raw) : "#";
          return `<a href="${href}" target="_blank" rel="noreferrer" aria-label="Open" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;color:#667085">${OPEN_ICON}</a>`;
        };
        base.cellRenderer = renderer;
      }

      return base;
    });
  }

  private get gridEl(): HTMLElement | null {
    return this.renderRoot.querySelector(".grid-wrapper");
  }

  private initGrid() {
    const el = this.gridEl;
    if (!el) return;

    const options: GridOptions = {
      columnDefs: this.buildColumnDefs(),
      rowData: this.rowData,
      defaultColDef: { resizable: false },
      rowHeight: ROW_HEIGHT,
      headerHeight: HEADER_HEIGHT,
      pagination: true,
      paginationPageSize: this.pageSize,
      suppressPaginationPanel: true,
      onPaginationChanged: (event: PaginationChangedEvent) => {
        this.page = {
          current: event.api.paginationGetCurrentPage() + 1,
          total: Math.max(event.api.paginationGetTotalPages(), 1),
        };
        this.requestUpdate();
      },
    };

    this.api = createGrid(el, options, { modules: [AllCommunityModule] });
  }

  firstUpdated() {
    this.initGrid();
  }

  updated(changed: Map<string, unknown>) {
    if (!this.api || this.api.isDestroyed()) return;
    if (
      changed.has("columns") ||
      changed.has("rowData") ||
      changed.has("pageSize")
    ) {
      this.api.updateGridOptions({
        columnDefs: this.buildColumnDefs(),
        rowData: this.rowData,
        paginationPageSize: this.pageSize,
      });
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Re-init if the element was moved in the DOM after being disconnected.
    if (this.hasUpdated && (!this.api || this.api.isDestroyed())) {
      this.initGrid();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.api?.destroy();
    this.api = null;
  }
}

// Guarded so Vite HMR re-executing this module doesn't throw.
if (!customElements.get("lw-data-table")) {
  customElements.define("lw-data-table", LwDataTable);
}

declare global {
  interface HTMLElementTagNameMap {
    "lw-data-table": LwDataTable;
  }
}
