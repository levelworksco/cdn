import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-searches-panel>
//
// Left sidebar shown in the compare (side-by-side) view: a list of example
// queries known to work well with AI search, plus a "History" tab of the
// user's own recent searches on this site.
//
// PROPERTIES:
//   examples    (Array) — example query strings; falls back to a built-in list.
//   history     (Array) — the user's own recent queries, most recent first
//                          ("My Searches"); owner keeps this persisted.
//   allSearches (Array) — the "All Searches" list (popular / across users);
//                          falls back to the examples list when not provided.
//
// EVENTS:
//   search-pick — detail: { value: String } — fired when an example/history
//                 item is clicked, so the host can run that query.
// ─────────────────────────────────────────────────────────────

// Exported so other views (e.g. the mobile compare Examples carousel) can
// resolve the same fallback list when a site provides no examples.
export const DEFAULT_EXAMPLES = [
  'How to take care of my plants in summer?',
  'Which plants can block the view of my house from outsiders?',
  'How can I grow my own ingredients in my garden?',
  'Which plants grow the quickest?',
  'Which plants can I grow in low sunlight?',
  'Why do my indoor plants keep dying?',
  'Which plant should I grow as a good luck charm in my home?',
  "What's the basic setup needed for starting a garden?",
  'How to take care of my plants in cold weather?',
  'How should I trim my plants?',
];

export class LwSearchesPanel extends LitElement {

  static properties = {
    examples:    { type: Array },
    history:     { type: Array },
    allSearches: { type: Array, attribute: 'all-searches' },
    // The query currently running — the matching item renders highlighted.
    selected:    { type: String },
    _tab:        { state: true },
    // History sub-filter: 'all' (everyone) | 'mine' (this user's history).
    _historyScope: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      width: var(--lw-searches-width, 300px);
      flex-shrink: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Surface/border/scroll come from the host context (the fixed drawer in
       the compare view), so the panel itself is just the content column. */
    .panel {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    /* Header with a full-width bottom divider, mirroring the settings panel. */
    .panel-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f0f0f0;
    }
    .panel-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #111;
      margin: 0;
    }

    .panel-body {
      padding: 1.25rem;
    }

    /* ── Tabs ── */
    .tabs {
      display: flex;
      gap: 2.75rem;
      border-bottom: 1px solid #e5e5e5;
    }

    .tab {
      background: none;
      border: none;
      padding: 0 0 0.85rem;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 500;
      color: #8a8a8a;
      cursor: pointer;
      /* The active underline is a 2px bar that overlaps the 1px row divider
         (margin-bottom:-1px) so it sits flush on that line. */
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab:hover        { color: #444; }
    .tab.is-active    { color: #111; font-weight: 700; border-bottom-color: #111; }

    /* ── Examples intro ── */
    .intro {
      font-size: 11px;
      color: #999;
      line-height: 1.5;
      margin: 1rem 0;
      text-align: center;
    }
    .intro em {
      font-style: normal;
      font-weight: 600;
      color: #f58b2c;
    }

    /* ── Item list ── */
    .list {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      max-height: var(--lw-searches-list-max-height, none);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #c1c1c1 transparent;
    }
    .list::-webkit-scrollbar       { width: 6px; }
    .list::-webkit-scrollbar-track { background: transparent; }
    .list::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 99px; }
    .list::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

    .item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.85rem 1rem;
      border: 1px solid #f58b2c;
      border-radius: 12px;
      background: #fff;
      font-family: inherit;
      font-size: 0.85rem;
      line-height: 1.4;
      color: #444;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .item:hover {
      background: #fff8f1;
      box-shadow: 0 4px 12px rgba(245, 139, 44, 0.12);
    }
    /* The example currently being searched. */
    .item.is-active {
      background: #FEF3EB;
      color: #000000;
      font-weight: 600;
    }

    /* ── History: "All Searches" / "My Searches" filter pills ── */
    .scope-row {
      display: flex;
      gap: 0.6rem;
      margin: 1rem 0;
    }
    .scope-pill {
      padding: 0.5rem 1.1rem;
      border: 1px solid #e0e0e0;
      border-radius: 999px;
      background: #fff;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 500;
      color: #555;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color 0.15s, color 0.15s;
    }
    .scope-pill:hover     { border-color: #f0c9a0; }
    .scope-pill.is-active { border-color: #000; color: #111; font-weight: 600; }

    /* ── History: plain rows with dividers (distinct from Examples chips) ── */
    .history-list {
      display: flex;
      flex-direction: column;
    }
    .history-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.9rem 0.25rem;
      border: none;
      border-bottom: 1px solid #eee;
      background: none;
      font-family: inherit;
      font-size: 0.85rem;
      line-height: 1.4;
      color: #333;
      cursor: pointer;
      transition: color 0.15s, background 0.15s;
    }
    .history-item:hover { color: #000; background: #faf9f8; }
    /* The history entry currently being searched. */
    .history-item.is-active {
      background: #FEF3EB;
      color: #00000;
      font-weight: 600;
    }

    /* ── History empty state ── */
    .empty {
      margin-top: 1rem;
      padding: 1.5rem 0.25rem;
      font-size: 0.82rem;
      color: #aaa;
      line-height: 1.5;
      text-align: center;
    }
  `;

  constructor() {
    super();
    this.examples    = null;   // falls back to DEFAULT_EXAMPLES
    this.history     = [];
    this.allSearches = null;   // falls back to the examples list
    this.selected    = '';     // active query — highlights the matching item
    this._tab        = 'examples';
    this._historyScope = 'all';
  }

  get _examples() {
    return (Array.isArray(this.examples) && this.examples.length) ? this.examples : DEFAULT_EXAMPLES;
  }

  // An item is highlighted when it's the query currently being searched.
  _isSelected(text) {
    const active = (this.selected ?? '').trim().toLowerCase();
    return !!active && active === (text ?? '').trim().toLowerCase();
  }

  // The list backing the History tab's active filter.
  get _historyItems() {
    if (this._historyScope === 'mine') return this.history ?? [];
    // "All Searches": the provided all-searches list, or the examples as a
    // stand-in for popular queries when a host doesn't supply one.
    return (Array.isArray(this.allSearches) && this.allSearches.length)
      ? this.allSearches
      : this._examples;
  }

  _setTab(tab) { this._tab = tab; }
  _setScope(scope) { this._historyScope = scope; }

  _pick(text) {
    this.dispatchEvent(new CustomEvent('search-pick', {
      detail: { value: text }, bubbles: true, composed: true,
    }));
  }

  render() {
    const isExamples = this._tab === 'examples';

    return html`
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">Searches</div>
        </div>

        <div class="panel-body">
          <div class="tabs">
            <button class="tab ${isExamples ? 'is-active' : ''}" @click=${() => this._setTab('examples')}>
              Examples
            </button>
            <button class="tab ${!isExamples ? 'is-active' : ''}" @click=${() => this._setTab('history')}>
              History
            </button>
          </div>

          ${isExamples ? this._renderExamples() : this._renderHistory()}
        </div>
      </div>
    `;
  }

  _renderExamples() {
    const items = this._examples;
    return html`
      <p class="intro">
        Check out these examples below of searches that were
        <em>Unblocked Using AI Search</em>
      </p>
      <div class="list">
        ${items.map(text => html`
          <button class="item ${this._isSelected(text) ? 'is-active' : ''}"
                  @click=${() => this._pick(text)}>${text}</button>
        `)}
      </div>
    `;
  }

  _renderHistory() {
    const isMine = this._historyScope === 'mine';
    const items = this._historyItems;

    return html`
      <div class="scope-row">
        <button class="scope-pill ${!isMine ? 'is-active' : ''}" @click=${() => this._setScope('all')}>
          All Searches
        </button>
        <button class="scope-pill ${isMine ? 'is-active' : ''}" @click=${() => this._setScope('mine')}>
          My Searches
        </button>
      </div>

      ${items.length ? html`
        <div class="history-list">
          ${items.map(text => html`
            <button class="history-item ${this._isSelected(text) ? 'is-active' : ''}"
                    @click=${() => this._pick(text)}>${text}</button>
          `)}
        </div>
      ` : html`
        <div class="empty">
          ${isMine
            ? 'Your recent searches will show up here.'
            : 'No searches yet.'}
        </div>
      `}
    `;
  }
}

customElements.define('lw-searches-panel', LwSearchesPanel);
