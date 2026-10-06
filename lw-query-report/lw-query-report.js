import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-query-report>
// Admin-style table of search queries and their AI/keyword results,
// reusing the DiscoverAI Admin visual language (see admin.html) minus
// the pagination footer and the "# Blogs / # Words" stats strip.
// `results` is an array of:
//   { query, groq_overview, semantic_results[], local_overview, keyword_results[] }
// ─────────────────────────────────────────────────────────────
export class LwQueryReport extends LitElement {

  static properties = {
    heading: { type: String },
    results: { type: Array, attribute: 'query-results' },
  };

  static styles = css`
    :host {
      --orange:     #F58635;
      --ink:        #000000;
      --border:     #ebebeb;
      --thead-bg:   #FAFAF9;
      --thead-text: #9A9A9A;

      display: block;
      color: var(--ink);
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
    }
    * { box-sizing: border-box; }

    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 64px;
      padding: 0 24px;
      border-bottom: 1px solid var(--border);
    }
    .logo { flex: none; display: block; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .header h1 span { font-weight: 500; }

    .table-wrap {
      overflow-x: auto;
      padding: 16px 24px 24px;
    }
    .table-wrap::-webkit-scrollbar { height: 8px; }
    .table-wrap::-webkit-scrollbar-track { background: transparent; }
    .table-wrap::-webkit-scrollbar-thumb { background: #cfcfcf; border-radius: 999px; }
    .table-wrap { scrollbar-width: thin; scrollbar-color: #cfcfcf transparent; }

    table {
      width: 100%;
      min-width: 1100px;
      border-collapse: collapse;
      table-layout: fixed;
    }

    thead th {
      background: var(--thead-bg);
      color: var(--thead-text);
      font-size: 13px;
      font-weight: 500;
      text-align: left;
      vertical-align: top;
      padding: 12px;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      border-right: 1px solid var(--border);
    }
    thead th:last-child { border-right: 0; }

    tbody td {
      padding: 16px 20px;
      font-size: 13px;
      line-height: 1.55;
      vertical-align: top;
      border-bottom: 1px solid var(--border);
      border-right: 1px solid var(--border);
    }
    tbody td:last-child { border-right: 0; }
    tbody tr:hover td { background: #FAFAFA; }

    .cell-query    { font-weight: 700; }
    .cell-overview { color: #333; white-space: pre-line; }

    .result-list { margin: 0; padding-left: 18px; }
    .result-list li { margin-bottom: 4px; }
    .result-empty { color: #9a9a9a; font-style: italic; }

    th.col-query    { width: 16%; }
    th.col-overview { width: 24%; }
    th.col-results  { width: 18%; }

    @media (max-width: 640px) {
      .header { height: 56px; padding: 0 16px; }
      .header h1 { font-size: 18px; }
      .table-wrap { padding: 12px 16px 20px; }
    }
  `;

  constructor() {
    super();
    this.heading = 'Admin';
    this.results = [];
  }

  _resultList(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return html`<span class="result-empty">&mdash;</span>`;
    }
    return html`<ul class="result-list">${items.map(item => html`<li>${item}</li>`)}</ul>`;
  }

  render() {
    const rows = Array.isArray(this.results) ? this.results : [];

    return html`
      <div class="header">
        <svg class="logo" width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
          <rect x="2" y="4" width="5" height="22" fill="#1a1a1a" />
          <rect x="12" y="19" width="6" height="7" fill="#ee7f3e" />
          <rect x="23" y="4" width="5" height="22" fill="#1a1a1a" />
        </svg>
        <h1>DiscoverAI <span>${this.heading}</span></h1>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="col-query">Query</th>
              <th class="col-results">Keyword Results</th>
              <th class="col-results">Semantic Results</th>
              <th class="col-overview">Groq Overview</th>
              <th class="col-overview">Local Overview</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => html`
              <tr>
                <td class="cell-query">${row.query}</td>
                <td>${this._resultList(row.keyword_results)}</td>
                <td>${this._resultList(row.semantic_results)}</td>
                <td class="cell-overview">${row.groq_overview}</td>
                <td class="cell-overview">${row.local_overview}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define('lw-query-report', LwQueryReport);
