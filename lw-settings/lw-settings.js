import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';
import '../lw-slider/lw-slider.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-settings>
//
// PROPERTIES:
//   open        (Boolean) — drawer open state, default false
//   width       (String)  — drawer width,      default "300px"
//   defaults    (Object)  — per-site default settings (from settings.json)
//   storage-key (String)  — localStorage scope; defaults to location.pathname
//
// PERSISTENCE:
//   All settings are saved to localStorage under `lw-settings:<key>` on every
//   change, and restored on load, so each demo site remembers its own last
//   used settings. Priority on load: stored > site defaults > built-ins.
// ─────────────────────────────────────────────────────────────

// Built-in fallback defaults (used when a site provides none).
const SETTINGS_DEFAULTS = {
  sideBySide: false,
  modelProvider: 'groq',
  llm: 'allam-2-7b',
  aiAnswer: true,
  answerLength: '100',
  citations: 'chip',
  semanticRatio: 0.5,
  totalItems: '5',
  articlesSent: '5',
  summaryVsBody: '200',
};
const SETTINGS_FIELDS = Object.keys(SETTINGS_DEFAULTS);

export class LwSettings extends LitElement {

  static properties = {
    open: { type: Boolean },
    width: { type: String },
    top: { type: String },
    // Per-site persistence: `defaults` seeds the initial values (from a
    // site's settings.json), `storageKey` scopes the localStorage record so
    // each demo remembers its own last-used settings.
    defaults: { type: Object },
    storageKey: { type: String, attribute: 'storage-key' },
    // Individual settings (all persisted together).
    sideBySide: { type: Boolean },
    modelProvider: { type: String },
    llm: { type: String },
    aiAnswer: { type: Boolean },
    answerLength: { type: String },
    citations: { type: String },
    semanticRatio: { type: Number },
    totalItems: { type: String },
    articlesSent: { type: String },
    summaryVsBody: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .drawer {
      position: fixed;
      top: var(--lw-drawer-top, 32px);
      right: 0;
      height: calc(100dvh - var(--lw-drawer-top, 32px));
      width: var(--lw-drawer-width, 300px);
      background: #fff;
      border-left: 1px solid #e8e8e8;
      box-shadow: -8px 0 32px rgba(0,0,0,0.08);
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
      z-index: 500;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .drawer.is-open {
      transform: translateX(0);
    }

    /* Desktop: the settings gear lives on the far left of the bar, so the
       drawer opens from the left to match. */
    @media (min-width: 1025px) {
      .drawer {
        right: auto;
        left: 0;
        border-left: none;
        border-right: 1px solid #e8e8e8;
        box-shadow: 8px 0 32px rgba(0,0,0,0.08);
        transform: translateX(-100%);
      }
      .drawer.is-open {
        transform: translateX(0);
      }
    }

    /* ── Header ── */
    .drawer-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0 1.25rem;
      height: 60px;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }

    .drawer-title {
      flex: 1;
      font-size: 18px;
      font-weight: 700;
      color: #111;
      letter-spacing: -0.01em;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      cursor: pointer;
      color: #aaa;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .close-btn:hover { background: #f5f5f5; color: #333; }

    /* ── Body ── */
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      scrollbar-width: thin;
      scrollbar-color: #c1c1c1 transparent;
    }
    .drawer-body::-webkit-scrollbar       { width: 6px; }
    .drawer-body::-webkit-scrollbar-track { background: transparent; }
    .drawer-body::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 99px; }
    .drawer-body::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

    /* ── Section ── */
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #bbb;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.6rem;
    }

    /* ── Setting row ── */
    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .setting-row:last-child { border-bottom: none; }

    .slider-row {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    .slider-row lw-slider {
      width: 100%;
    }

    .setting-label {
      font-size: 13px;
      color: #333;
      font-weight: 500;
      line-height: 1.4;
    }
    .setting-label.disabled {
      color: #aaa;
    }
    .setting-desc {
      font-size: 11px;
      color: #aaa;
      margin-top: 1px;
    }

    /* ── Toggle switch ── */
    .toggle {
      position: relative;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }
    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .toggle-track {
      position: absolute;
      inset: 0;
      background: #e0e0e0;
      border-radius: 999px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .toggle-track::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.18);
      transition: transform 0.2s;
    }
    .toggle input:checked + .toggle-track { background: #f97316; }
    .toggle input:checked + .toggle-track::after { transform: translateX(16px); }

    /* ── Select ── */
    .setting-select {
      font-size: 0.78rem;
      font-family: inherit;
      color: #333;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 4px 8px;
      background: #fafafa;
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .setting-select:focus { border-color: #f97316; }

    /* ── Responsive overlay (≤1024px): full-height, top to bottom ── */
    @media (max-width: 1024px) {
      .drawer {
        width: 100% !important;
        top: 0;
        height: 100dvh;
        z-index: 900;              /* cover the floating insights dock (z 700) */
        box-shadow: none;
        border-left: none;
      }
      /* Larger, easier-to-tap close target on touch devices. */
      .close-btn { width: 32px; height: 32px; }
      .close-btn svg { width: 32px; height: 32px; }
    }

    /* ── Footer ── */
    .drawer-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
    }

    .version-tag {
      font-size: 0.7rem;
      color: #ccc;
      text-align: center;
    }
  `;

  constructor() {
    super();
    this.open = false;
    this.width = '300px';
    this.top = '32px';
    this.defaults = null;
    this.storageKey = '';
    // Seed with built-ins; _loadSettings() applies site defaults + stored.
    Object.assign(this, SETTINGS_DEFAULTS);
  }

  connectedCallback() {
    super.connectedCallback();
    // Restore this site's saved settings (or fall back to its defaults).
    this._loadSettings();
    // Global command channel — works no matter where the trigger lives
    // (light DOM or nested inside another component's shadow DOM).
    this._onToggleCmd = (e) => {
      const next = e.detail && typeof e.detail.open === 'boolean'
        ? e.detail.open
        : !this.open;
      this._setOpen(next);
    };
    window.addEventListener('lw-settings-toggle', this._onToggleCmd);

    // Opening Insights while Settings is open should close Settings — the
    // two large-device panels are mutually exclusive.
    this._onInsightsChanged = (e) => {
      const insightsOpen = !!(e.detail && e.detail.open);
      if (insightsOpen && this.open) this._setOpen(false);
    };
    window.addEventListener('lw-insights-changed', this._onInsightsChanged);

    this._onResize = () => {
      if (this._isMobile()) this._applyPush(false);
      // Recompute on desktop too — resizing can cross the point where the
      // centered page's margin no longer has room for the drawer.
      else if (this.open) this._applyPush(true);
      if (this.open) this._updateTop();   // keep drawer below the (taller, responsive) bar
    };
    window.addEventListener('resize', this._onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('lw-settings-toggle', this._onToggleCmd);
    window.removeEventListener('lw-insights-changed', this._onInsightsChanged);
    window.removeEventListener('resize', this._onResize);
    this._applyPush(false);
  }

  // Once mounted, tell the page which settings are in effect (restored value
  // or site default) so the overview/search adopt them on load.
  firstUpdated() {
    this._broadcast();
  }

  // The `defaults` object is a property binding that can arrive after
  // connectedCallback — re-apply it (stored values still win) when it lands.
  updated(changed) {
    if (changed.has('defaults') && this.defaults) {
      this._loadSettings();
      this._broadcast();
    }
  }

  // ── Per-site persistence ─────────────────────────────────────
  get _storageKey() {
    return `lw-settings:${this.storageKey || location.pathname}`;
  }

  _loadSettings() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(this._storageKey)) || {}; }
    catch { stored = {}; }
    // Priority: stored (last used) > site defaults > built-ins.
    const merged = { ...SETTINGS_DEFAULTS, ...(this.defaults || {}), ...stored };
    for (const key of SETTINGS_FIELDS) this[key] = merged[key];
    // Guard: the saved LLM might not be valid for the current provider.
    if (!this._llmOptions.includes(this.llm)) this.llm = this._llmOptions[0];
  }

  _saveSettings() {
    const data = {};
    for (const key of SETTINGS_FIELDS) data[key] = this[key];
    try { localStorage.setItem(this._storageKey, JSON.stringify(data)); }
    catch { /* storage full / disabled — settings just won't persist */ }
  }

  // Update one field, persist, and notify listeners.
  _set(field, value) {
    this[field] = value;
    this._saveSettings();
    this._broadcast();
    // Toggling compare while the drawer is open changes whether the page
    // should be pushed — recompute so it doesn't keep a stale push (which
    // would shove the new Searches sidebar out ahead of the drawer).
    if (field === 'sideBySide' && this.open) this._applyPush(true);
  }

  // Snapshot of every setting (used by the comprehensive change event).
  _currentSettings() {
    const data = {};
    for (const key of SETTINGS_FIELDS) data[key] = this[key];
    return data;
  }

  // Notify listeners. Keep the granular events (already consumed) and add a
  // single comprehensive event carrying the full settings object so the page
  // can react to any field (answer length, total items, …).
  _broadcast() {
    window.dispatchEvent(new CustomEvent('lw-settings-model-change', {
      detail: { modelProvider: this.modelProvider, llm: this.llm },
    }));
    window.dispatchEvent(new CustomEvent('lw-settings-semantic-ratio-change', {
      detail: { semanticRatio: this.semanticRatio },
    }));
    window.dispatchEvent(new CustomEvent('lw-settings-citations-change', {
      detail: { citations: this.citations },
    }));
    window.dispatchEvent(new CustomEvent('lw-settings-change', {
      detail: this._currentSettings(),
    }));
  }

  _isMobile() {
    return window.innerWidth <= 1024;
  }

  // Push only the .page content area — bar and header are never touched.
  // Handles both light DOM (blog.html) and lw-blog shadow DOM cases.
  _applyPush(value) {
    if (this._isMobile()) { this._setPush(''); return; }
    this._setPush(value ? this.width : '');
  }

  _setPush(width) {
    // Desktop drawer opens from the left now (matches the settings gear),
    // so push content away from the left instead of the right.
    const ease = 'padding-left 0.28s cubic-bezier(0.4,0,0.2,1)';

    // Page wrappers whose shadow roots hold the .page / lw-header (both the
    // v2 <lw-blog> and the summary <lw-summary-page>).
    const wrappers = [...document.querySelectorAll('lw-blog, lw-summary-page')];

    // Collect lw-header elements (light DOM + wrapper shadow roots)
    const headers = [
      ...document.querySelectorAll('lw-header'),
      ...wrappers.map(el => el.shadowRoot?.querySelector('lw-header')).filter(Boolean),
    ];

    // Collect .page elements (light DOM + wrapper shadow roots)
    const pages = [
      ...document.querySelectorAll('.page'),
      ...wrappers.map(el => el.shadowRoot?.querySelector('.page')).filter(Boolean),
    ];

    // In the compare (side-by-side) view the drawer just overlays the left
    // "Searches" sidebar, so nothing should move — pushing the page would
    // slide its content out from under the drawer and leave a gap. Read our
    // own sideBySide (the source of truth) rather than the .page class, which
    // lags a render behind a live toggle.
    //
    // Otherwise, the centered .page already leaves margin on either side once
    // the viewport is wide enough — if that margin alone fits the drawer, let
    // it overlay the empty space instead of shifting the content.
    const push = (this.sideBySide || this._hasRoomFor(pages[0], width)) ? '' : width;

    // Push the inner .header div (shadow root) so the centered content shifts correctly
    headers.forEach(host => {
      const inner = host.shadowRoot?.querySelector('.header');
      const target = inner ?? host;
      target.style.transition = ease;
      target.style.paddingLeft = push;
    });

    pages.forEach(el => {
      el.style.transition = ease;
      el.style.paddingLeft = push;
    });
  }

  // True when the centered .page column's own side margin is already wide
  // enough for a `widthStr`-wide drawer to sit over it without covering any
  // content. False (no room to spare) whenever the page has no capped
  // max-width to measure — e.g. compare mode's full-width layout.
  _hasRoomFor(page, widthStr) {
    if (!page) return false;
    const maxWidth = parseFloat(getComputedStyle(page).maxWidth);
    if (!Number.isFinite(maxWidth)) return false;
    const margin = (window.innerWidth - maxWidth) / 2;
    return margin >= parseFloat(widthStr);
  }

  // Locate the insights bar whether it lives in light DOM or nested
  // inside a page wrapper's shadow DOM (lw-summary-page / lw-blog).
  _findInsightsBar() {
    const direct = document.querySelector('lw-insights-bar');
    if (direct) return direct;
    for (const host of document.querySelectorAll('lw-summary-page, lw-blog')) {
      const nested = host.shadowRoot?.querySelector('lw-insights-bar');
      if (nested) return nested;
    }
    return null;
  }

  // Sit the drawer flush below the top bar so it tucks behind it.
  _updateTop() {
    const bar = this._findInsightsBar();
    this.top = bar ? `${Math.round(bar.getBoundingClientRect().bottom)}px` : '32px';
  }

  _setOpen(value) {
    this.open = value;
    if (value) this._updateTop();
    this._applyPush(value);
    window.dispatchEvent(new CustomEvent('lw-settings-changed', {
      detail: { open: value },
    }));
  }

  _onModelProviderChange(e) {
    this.modelProvider = e.target.value;
    // Switching provider changes the available LLMs — keep a valid selection.
    if (!this._llmOptions.includes(this.llm)) this.llm = this._llmOptions[0];
    this._saveSettings();
    this._broadcast();
  }

  toggle() { this._setOpen(!this.open); }

  close = () => { this._setOpen(false); }

  // Available LLMs depend on the chosen provider.
  get _llmOptions() {
    return this.modelProvider === 'local'
      ? ['qwen3:4b-instruct', 'qwen3:0.6b', 'qwen3:1.7b']
      : ['allam-2-7b', 'llama-3.1', 'llama-3.3', 'mixtral-8x7b', 'gemma2-9b'];
  }

  _onSideBySideChange(e) { this._set('sideBySide', e.target.checked); }
  _onLlmChange(e) { this._set('llm', e.target.value); }
  _onAiAnswerChange(e) { this._set('aiAnswer', e.target.checked); }
  _onAnswerLengthChange(e) { this._set('answerLength', e.target.value); }
  _onCitationsChange(e) { this._set('citations', e.target.value); }
  _onTotalItemsChange(e) { this._set('totalItems', e.target.value); }
  _onArticlesSentChange(e) { this._set('articlesSent', e.target.value); }
  _onSummaryVsBodyChange(e) { this._set('summaryVsBody', e.target.value); }

  _onSemanticRatioChange(e) { this._set('semanticRatio', e.detail.value); }

  render() {
    return html`
      <div class="drawer ${this.open ? 'is-open' : ''}"
           style="--lw-drawer-width: ${this.width}; --lw-drawer-top: ${this.top}">

        <div class="drawer-header">
          <span class="drawer-title">Settings</span>
          <button class="close-btn" @click=${this.close} aria-label="Close settings">
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/>
              <line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </button>
        </div>

        <div class="drawer-body">

          <div>
            <div class="section-title">Compare</div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Side-by-Side View</div>
                <div class="setting-desc">Keyword search Vs AI search</div>
              </div>
              <label class="toggle">
                <input type="checkbox" .checked=${this.sideBySide} @change=${this._onSideBySideChange} />
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>

          <div>
            <div class="section-title">Model</div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Model Provider</div>
                <div class="setting-desc">Source from where Model is accessed</div>
              </div>
              <select class="setting-select" .value=${this.modelProvider} @change=${this._onModelProviderChange}>
                <option value="groq">Groq</option>
                <option value="local">Local LLM</option>
              </select>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label disabled">LLM</div>
                <div class="setting-desc">Model to generate AI answer</div>
              </div>
              <select class="setting-select" .value=${this.llm} @change=${this._onLlmChange}>
                ${this._llmOptions.map(m => html`<option value=${m}>${m}</option>`)}
              </select>
            </div>
          </div>

          <div>
            <div class="section-title">Overview</div>
            <div class="setting-row">
              <div>
                <div class="setting-label disabled">AI Answer</div>
                <div class="setting-desc">Should an AI answer be displayed</div>
              </div>
              <label class="toggle">
                <input type="checkbox" .checked=${this.aiAnswer} @change=${this._onAiAnswerChange} />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label disabled">Answer Length</div>
                <div class="setting-desc">Choose the length of the AI answer</div>
              </div>
              <select class="setting-select" .value=${this.answerLength} @change=${this._onAnswerLengthChange}>
                <option value="50">50 words</option>
                <option value="100">100 words</option>
                <option value="150">150 words</option>
                <option value="200">200 words</option>
              </select>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Citations</div>
                <div class="setting-desc">Should citations be shown &amp; in what style</div>
              </div>
              <select class="setting-select" .value=${this.citations} @change=${this._onCitationsChange}>
                <option value="none">None</option>
                <option value="number">Numbers</option>
                <option value="chip">Chips</option>
                <option value="link">Links</option>
              </select>
            </div>
          </div>

          <div>
            <div class="section-title">Search Result</div>
            <div class="setting-row slider-row">
              <div class="setting-label">Semantic ratio</div>
              <lw-slider min="0" max="1" step="0.1" .value=${this.semanticRatio}
                @slider-change=${this._onSemanticRatioChange}></lw-slider>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Total Items Returned</div>
                <div class="setting-desc">Number of items returned per search</div>
              </div>
              <select class="setting-select" .value=${this.totalItems} @change=${this._onTotalItemsChange}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          <div>
            <div class="section-title">Dev Settings</div>
            <div class="setting-row">
              <div>
                <div class="setting-label"># Articles Sent</div>
                <div class="setting-desc">As input to the LLM to generate an answer</div>
              </div>
              <select class="setting-select" .value=${this.articlesSent} @change=${this._onArticlesSentChange}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
              </select>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label disabled">Summary Vs Body</div>
                <div class="setting-desc">Fed to LLM per article, to generate AI answer</div>
              </div>
              <select class="setting-select" .value=${this.summaryVsBody} @change=${this._onSummaryVsBodyChange}>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="500">500</option>
              </select>
            </div>
          </div>

        </div>

        <div class="drawer-footer">
          <div class="version-tag">lw-settings v1.0</div>
        </div>

      </div>
    `;
  }
}

customElements.define('lw-settings', LwSettings);
