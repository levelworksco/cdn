import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';
import '../lw-slider/lw-slider.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-blog-search>
//
// PROPERTIES:
//   open             (Boolean) — show the component; hidden by default, default false
//   placeholder      (String)  — input placeholder,      default "Search"
//   value            (String)  — current search query,   default ""
//   sliderValue      (Number)  — range slider value,     default 0.5
//   sliderMin        (Number)  — range slider minimum,   default 0
//   sliderMax        (Number)  — range slider maximum,   default 10
//   sliderStep       (Number)  — range slider step,      default 0.1
//   sliderLabel      (String)  — label shown left of slider, default ""
//   searchTime       (Number)  — ms taken; shown in sidebar col aligned with Blog Categories
//   suggestions      (Array)   — "Try searching for…" chips; JSON attribute or property.
//                                Falls back to a built-in list when empty.
//   suggestionsTitle (String)  — heading for the suggestions panel, default "Try searching for…"
//   promoText        (String)  — orange promo card text; empty hides the card.
//   promoHref        (String)  — link the promo card opens, default "#"
//
// EVENTS:
//   search-change  — detail: { value: String }
//   slider-change  — detail: { value: Number }
// ─────────────────────────────────────────────────────────────

// Exported so other views (e.g. the compare view's no-results state) can show
// the same chips as the search bar when a site provides no suggestions.
export const DEFAULT_SUGGESTIONS = [
  'Why are my plant leaves?',
  'Why does the soil in my pots?',
  'What are the best low-maintenance?',
  'What should I plant during the rainy season?',
];

export class LwBlogSearch extends LitElement {

  static properties = {
    open:             { type: Boolean, reflect: true },
    placeholder:      { type: String },
    value:            { type: String },
    sliderValue:      { type: Number, attribute: 'slider-value' },
    sliderMin:        { type: Number, attribute: 'slider-min'   },
    sliderMax:        { type: Number, attribute: 'slider-max'   },
    sliderStep:       { type: Number, attribute: 'slider-step'  },
    sliderLabel:      { type: String, attribute: 'slider-label' },
    searchTime:       { type: Number, attribute: 'search-time'  },
    suggestions:      { type: Array },
    suggestionsTitle: { type: String, attribute: 'suggestions-title' },
    promoText:        { type: String, attribute: 'promo-text' },
    promoHref:        { type: String, attribute: 'promo-href' },
    // Compare view: on mobile the Examples carousel replaces these chips, so
    // the suggestions row is hidden there (see the media query in styles).
    compare:          { type: Boolean, reflect: true },
    // Suppress the internal suggestions/promo row entirely. The host uses this
    // when the search bar is made sticky (so the chips can be rendered below it
    // in normal flow, and don't float with the pinned search input).
    hideSuggestions:  { type: Boolean, attribute: 'hide-suggestions' },
    _dismissed:       { state: true },
  };

  static styles = css`
    :host {
      display: none;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #3c3c3c;
      -webkit-font-smoothing: antialiased;
    }
    :host([open]) {
      display: block;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* mirrors lw-blog-list .pl-outer: flex row, same gap + sidebar width */
    .wrapper {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .cols {
      display: flex;
      align-items: flex-start;
      gap: 2rem;
    }

    /* left: stretches to fill space left by sidebar — same as .pl-container flex:1 */
    .main-col {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* right: same width + padding as .pl-sidebar (180px wide, 2rem left pad, border) */
    .sidebar-col {
      width: 205px;
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      padding-top: 0.4rem;
    }

    /* ── Search input ── */
    .search-row {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e5e5e5;
      border-radius: 999px;
      padding: 0 16px;
      height: 42px;
      gap: 10px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .search-row:focus-within {
      border-color: #c8c8c8;
      box-shadow: 0 0 0 3px rgba(0,0,0,.05);
      background: #fff;
    }

    .search-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      color: #999;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 14px;
      color: #1a1a1a;
      line-height: 1;
    }
    .search-input::placeholder { color: #aaa; }

    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      border: none;
      background: #d0d0d0;
      border-radius: 50%;
      cursor: pointer;
      color: #fff;
      padding: 0;
      line-height: 1;
      transition: background 0.15s;
    }
    .clear-btn:hover { background: #aaa; }

    .search-time {
      display: flex;
      flex-direction: column;
      gap: 2px;
      white-space: nowrap;
    }
    .search-time-label {
      font-size: 11px;
      font-weight: 600;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      line-height: 1.2;
    }
    .search-time-value {
      font-size: 13px;
      font-weight: 500;
      color: #8B94A2;
      line-height: 1.15;
      letter-spacing: -0.5px;
    }

    .divider {
      height: 1px;
      background: #e5e5e5;
      margin-top: 12px;
    }

    /* ── Suggestions panel + promo card ── */
    .suggestions-row {
      display: flex;
      align-items: stretch;
      gap: 1rem;
      margin-top: 14px;
      margin-bottom: 14px;
    }

    .suggestions {
      flex: 1;
      min-width: 0;
      border-radius: 14px;
      padding: 0;
    }

    .promo-card {
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      width: 200px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.5rem;
      background: linear-gradient(105deg, #ee6f2b 0%, #f68e2d 55%, #fbb63c 100%);
      border-radius: 18px;
      padding: 0.7rem 1.25rem;
      color: #fff;
      text-decoration: none;
      box-shadow: 0 12px 26px -10px rgba(239, 125, 52, 0.55);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .promo-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 30px -10px rgba(239, 125, 52, 0.6);
    }
    
    .promo-arrow {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }
    .promo-arrow svg { width: 20px; height: 20px; }

    .promo-text {
      position: relative;
      z-index: 1;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.3;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.4);
    }

    /* Horizontal, scrollable row of sparkle pills (scrollbar hidden). */
    .suggestions-grid {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      scroll-snap-type: x proximity;
      scrollbar-width: none;              /* Firefox */
      -ms-overflow-style: none;           /* old Edge/IE */
      -webkit-overflow-scrolling: touch;
    }
    .suggestions-grid::-webkit-scrollbar { display: none; }  /* Chrome/Safari */

    .suggestion-chip {
      flex: 0 0 auto;
      max-width: 230px;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      scroll-snap-align: start;
      /* Gradient border (padding-box fill + border-box gradient) so the pill
         keeps its rounded corners. */
      border: 1px solid transparent;
      border-radius: 999px;
      background:
        linear-gradient(#fff, #fff) padding-box,
        linear-gradient(90deg, #FFD45D 0%, #FAAF45 40%, #F58B2C 100%) border-box;
      padding: 0.55rem 1rem;
      font-family: inherit;
      font-size: 0.85rem;
      color: #444;
      line-height: 1.3;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .suggestion-chip:hover {
      background:
        linear-gradient(#fff8f1, #fff8f1) padding-box,
        linear-gradient(90deg, #FFD45D 0%, #FAAF45 40%, #F58B2C 100%) border-box;
      color: #d9691f;
    }

    .chip-spark {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      color: #ef7d34;
    }

    /* Large screens: card-style suggestions — rounded rectangles with the
       sparkle stacked above left-aligned text, 4 across. When there are
       >4, each is a quarter wide so exactly 4 show and the rest scroll.
       (Declared AFTER the base .suggestion-chip so these win at ≥1024px.) */
    @media (min-width: 1024px) {
      .suggestions-grid { gap: 0.75rem; }
      .suggestion-chip {
        flex: 1 1 0;
        max-width: none;
        /* Column: sparkle on its own row above the text (the base pill layout
           puts them side by side). */
        flex-direction: column;
        align-items: flex-start;
        gap: 0.7rem;
        border-radius: 14px;
        padding: 1rem 1.1rem;
        min-height: 96px;
        line-height: 1.45;
        text-align: left;
      }
      .suggestion-chip .chip-spark { width: 18px; height: 18px; }
      /* Full width under the sparkle (not a flex sibling of it any more). */
      .suggestion-chip > span { width: 100%; min-width: 0; }
      .suggestions-grid.is-scroll .suggestion-chip {
        flex: 0 0 auto;
        width: calc((100% - 3 * 0.75rem) / 4);
      }
      .suggestions-grid.is-scroll {
        padding-bottom: 6px;
        scrollbar-width: thin;
        scrollbar-color: #c1c1c1 transparent;
      }
      .suggestions-grid.is-scroll::-webkit-scrollbar { display: block; height: 7px; }
      .suggestions-grid.is-scroll::-webkit-scrollbar-track { background: transparent; }
      .suggestions-grid.is-scroll::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 999px;
      }
    }

    @media (max-width: 768px) {
      /* Mobile: pills only — drop the panel chrome and the CTA card so the
         sparkle pills sit directly under the search (matches the design). */
      .suggestions {
        background: transparent;
        border: none;
        padding: 0;
      }
      .promo-card       { display: none; }
      .suggestion-chip { padding: 0.2rem 1rem; font-size: 11px; }
      .search-time-label { font-size: 10px; }
      
    }

    @media (max-width: 420px) {
      .suggestion-chip { max-width: 200px; }
    }

    /* Compare view: the examples live in the Searches panel (desktop) or the
       Examples carousel (mobile), so the suggestion chips are redundant here
       and the row is hidden at every width. */
    :host([compare]) .suggestions-row,
    :host([compare]) .divider { display: none; }

    /* ≤640px: stack the "Search took" time beneath the input, left-aligned,
       with label + value inline on one row. */
    @media (max-width: 640px) {
      .cols        { flex-direction: column; align-items: stretch; gap: 12px; }
      .sidebar-col {
        width: 100%;
        justify-content: flex-start;
        padding-left: 0;
        padding-top: 0;
        border-left: none;
      }
      .search-time {
        flex-direction: row;
        align-items: baseline;
        text-align: left;
        gap: 0.4rem;
      }
      .search-time-value { font-size: 12px; line-height: 1; }
    }

    @media (max-width: 480px) {
      .search-row   { height: 38px; padding: 0 14px; }
      .search-input { font-size: 13.5px; }
    }

    /* iOS Safari zooms the page when a focused form field is smaller than
       16px. Keep the compact desktop/mobile typography elsewhere, but use
       the native threshold on iOS so tapping search never changes the zoom. */
    @supports (-webkit-touch-callout: none) {
      .search-input { font-size: 16px; }
    }
  `;

  constructor() {
    super();
    this.open        = false;
    this.placeholder = 'Search';
    this.value       = '';
    this.sliderValue = 0.5;
    this.sliderMin   = 0;
    this.sliderMax   = 10;
    this.sliderStep  = 0.1;
    this.sliderLabel = '';
    this.searchTime  = null;
    this.suggestions      = null;
    this.suggestionsTitle = 'Try searching for…';
    this.promoText        = 'Transform the way your team searches with AI';
    this.promoHref        = '#';
    this._dismissed       = false;
  }

  // Falls back to the built-in list when no suggestions were provided.
  get _suggestions() {
    return (Array.isArray(this.suggestions) && this.suggestions.length)
      ? this.suggestions
      : DEFAULT_SUGGESTIONS;
  }

  // Only show the panel before a search is active and until dismissed. The
  // host can also suppress it entirely (hideSuggestions) to render the chips
  // itself, below a sticky search bar.
  get _showSuggestions() {
    return !this.hideSuggestions && !this.value && !this._dismissed && this._suggestions.length > 0;
  }

  _pickSuggestion(text) {
    this.value = text;
    // immediate: true — clicking a chip is an explicit submit (like pressing
    // Enter), so the host runs the search right away instead of waiting for
    // Enter the way plain typing does.
    this.dispatchEvent(new CustomEvent('search-change', {
      detail: { value: text, immediate: true },
      bubbles: true, composed: true,
    }));
  }

  _onInput(e) {
    this.value = e.target.value;
    this.dispatchEvent(new CustomEvent('search-change', {
      detail: { value: this.value },
      bubbles: true, composed: true,
    }));
  }

  _clear() {
    this.value = '';
    this.dispatchEvent(new CustomEvent('search-change', {
      detail: { value: '' },
      bubbles: true, composed: true,
    }));
    this.shadowRoot.querySelector('.search-input')?.focus();
  }

  // ms → mm:ss:fff  (fff = milliseconds)
  _fmtTime(ms) {
    const t   = Math.max(0, ms ?? 0);
    const mm  = String(Math.floor(t / 60000)).padStart(2, '0');
    const ss  = String(Math.floor((t % 60000) / 1000)).padStart(2, '0');
    const fff = String(Math.floor(t % 1000)).padStart(3, '0');
    return `${mm}:${ss}:${fff}`;
  }

  _onSliderChange(e) {
    this.sliderValue = e.detail.value;
    this.dispatchEvent(new CustomEvent('slider-change', {
      detail: { value: this.sliderValue },
      bubbles: true, composed: true,
    }));
  }

  render() {
    return html`
      <div class="wrapper">

        <div class="cols">
          <div class="main-col">
            <div class="search-row">
              <svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8.5" cy="8.5" r="5.5"/>
                <line x1="13.5" y1="13.5" x2="18" y2="18"/>
              </svg>
              <input
                class="search-input"
                type="text"
                .value=${this.value}
                placeholder=${this.placeholder}
                @input=${this._onInput}
              />
              ${this.value ? html`
                <button class="clear-btn" @click=${this._clear} aria-label="Clear search">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round">
                    <line x1="1" y1="1" x2="7" y2="7"/>
                    <line x1="7" y1="1" x2="1" y2="7"/>
                  </svg>
                </button>` : ''}
            </div>

            <lw-slider
              style="display:none"
              .value=${this.sliderValue}
              .min=${this.sliderMin}
              .max=${this.sliderMax}
              .step=${this.sliderStep}
              .label=${this.sliderLabel}
              @slider-change=${this._onSliderChange}
            ></lw-slider>
          </div>

          <div class="sidebar-col">
            ${this.searchTime != null ? html`
              <div class="search-time">
                <div class="search-time-label">Search took</div>
                <div class="search-time-value">${this._fmtTime(this.searchTime)}</div>
              </div>` : ''}
          </div>
        </div>

        ${this._showSuggestions ? html`<div class="divider"></div>` : ''}

        ${this._showSuggestions ? html`
          <div class="suggestions-row">
            <div class="suggestions">
              <div class="suggestions-grid ${this._suggestions.length > 4 ? 'is-scroll' : ''}">
                ${this._suggestions.map(text => html`
                  <button class="suggestion-chip" @click=${() => this._pickSuggestion(text)}>
                    <!-- Outlined sparkle: a large 4-point star with a small
                         one at the top right. -->
                    <svg class="chip-spark" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="1.6"
                         stroke-linejoin="round" aria-hidden="true">
                      <path d="M10 5C10 9.5 14.5 14 19 14C14.5 14 10 18.5 10 23C10 18.5 5.5 14 1 14C5.5 14 10 9.5 10 5Z"/>
                      <path d="M19 1.5C19 3.25 20.75 5 22.5 5C20.75 5 19 6.75 19 8.5C19 6.75 17.25 5 15.5 5C17.25 5 19 3.25 19 1.5Z"/>
                    </svg>
                    <span>${text}</span>
                  </button>
                `)}
              </div>
            </div>

            ${this.promoText ? html`
              <a class="promo-card" href=${this.promoHref || '#'}>
                <span class="promo-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="12" x2="20" y2="12"/>
                    <polyline points="14 6 20 12 14 18"/>
                  </svg>
                </span>
                <span class="promo-text">${this.promoText}</span>
              </a>
            ` : ''}
          </div>
        ` : ''}

      </div>
    `;
  }
}

customElements.define('lw-blog-search', LwBlogSearch);
