import { LitElement, html, css, nothing }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';
import '../lw-insights-bar/lw-insights-bar.js';
import '../lw-header/lw-header.js';
import '../lw-settings/lw-settings.js';
import '../lw-blog-search/lw-blog-search.js';
import { DEFAULT_SUGGESTIONS } from '../lw-blog-search/lw-blog-search.js';
import '../lw-blog-list-static/lw-blog-list-static.js';
import '../lw-summary/lw-summary.js';
import '../lw-searches-panel/lw-searches-panel.js';
import { DEFAULT_EXAMPLES } from '../lw-searches-panel/lw-searches-panel.js';
import suggestionIcon from '../../assets/img/suggestion-icon.svg';

const SEARCH_HISTORY_LIMIT = 15;

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-summary-page>
//
// Full-page wrapper that composes:
//   <lw-insights-bar> + <lw-header> + <lw-blog-search>
//   + <lw-blog-overview> (AI summary, shown when a query is active)
//   + <lw-blog-list-static> (fed from the summary API hits)
//
// When the user types a query the component:
//   1. Calls the summary endpoint (summary-url).
//   2. Feeds the returned summary text to <lw-blog-overview>.
//   3. Feeds the returned hits array to <lw-blog-list-static>.
//
// ATTRIBUTES — insights bar:
//   demo-note           (String)
//   blogs               (String)
//   updated             (String)
//   searches            (String)
//   unblocked           (String)
//
// ATTRIBUTES — header:
//   logo-src            (String)
//   bar-logo-src        (String)
//   logo-href           (String)
//
// ATTRIBUTES — API / navigation:
//   base-url            (String)  fallback for deriving summary-url (/summary appended)
//   summary-url         (String)  summary API endpoint
//   api-key             (String)  X-API-KEY header value
//   detail-url          (String)  page opened on post click
//
// ATTRIBUTES — search bar:
//   search-placeholder  (String)
//   slider-max          (Number)
//   slider-step         (Number)
//   slider-label        (String)
//
// ATTRIBUTES — list:
//   default-view        (String)  'list' | 'grid'
//   default-sort        (String)
//
// ATTRIBUTES — summary block:
//   summary-heading     (String)  heading text (default "AI Overview")
//   display-citations   (String)  'none'|'number'|'chip'|'link' (default 'chip')
// ─────────────────────────────────────────────────────────────

const SUMMARY_DEBOUNCE_MS = 800;
const DEFAULT_PAGE_LIMIT  = 20;   // page size for the lazy-loaded landing list

export class LwSummaryPage extends LitElement {

  static properties = {
    // lw-insights-bar
    demoNote:  { attribute: 'demo-note'   },
    blogs:     {},
    updatedAt: { attribute: 'updated' },
    searches:  {},
    unblocked: {},

    // lw-header
    logoSrc:    { attribute: 'logo-src'    },
    barLogoSrc: { attribute: 'bar-logo-src' },
    logoHref:   { attribute: 'logo-href'   },

    // API / navigation
    baseUrl:    { attribute: 'base-url'    },
    summaryUrl: { attribute: 'summary-url' },
    apiKey:     { attribute: 'api-key'     },
    detailUrl:  { attribute: 'detail-url'  },

    // search bar
    searchPlaceholder: { attribute: 'search-placeholder' },
    sliderMax:         { type: Number, attribute: 'slider-max'  },
    sliderStep:        { type: Number, attribute: 'slider-step' },
    sliderLabel:       { attribute: 'slider-label' },
    // Per-site "Try searching for…" suggestion chips (JSON array attribute).
    suggestions:       { type: Array, attribute: 'suggestions' },
    suggestionsTitle:  { attribute: 'suggestions-title' },
    // Orange promo card (also shown beside the AI Overview generating
    // skeleton — see the loading state below). Empty text hides it.
    promoText:         { attribute: 'promo-text' },
    promoHref:         { attribute: 'promo-href' },
    // Per-site Examples list for the compare view's "Searches" panel
    // (JSON array attribute). Falls back to a built-in list when absent.
    examples:          { type: Array, attribute: 'examples' },

    // list
    defaultView: { attribute: 'default-view' },
    defaultSort: { attribute: 'default-sort' },

    // summary
    summaryHeading:   { attribute: 'summary-heading'   },
    displayCitations: { attribute: 'display-citations' },

    // settings — per-site default values (from the site's settings.json)
    settingsDefaults: { type: Object, attribute: 'settings-defaults' },

    // internal
    _searchQuery:       { state: true },
    _semanticRatio:     { state: true },
    _modelProvider:    { state: true },
    _llm:               { state: true },
    _searchTime:        { state: true },
    _summaryParagraphs: { state: true },
    _summaryHits:       { state: true },
    _summaryLoading:    { state: true },
    _listLoading:       { state: true },
    _elapsedMs:         { state: true },
    // True only once real search results are applied — drives the numbered
    // list / hidden header / "Further Reading" heading. Stays false during the
    // debounce + fetch window so the default landing list isn't decorated.
    _isSearchResult:    { state: true },
    // Side-by-side compare mode (Settings → Compare).
    _sideBySide:        { state: true },
    // Recent searches, shown in the compare view's "Searches" sidebar.
    _searchHistory:      { state: true },
    // View/sort are shared across both compare columns.
    _compareView:       { state: true },
    _compareSort:       { state: true },
    // Which compare column is shown on narrow screens (tabbed): 'ai'|'keyword'.
    _compareTab:        { state: true },
    // Index of the example shown in the mobile compare carousel.
    _exampleIndex:      { state: true },
    // Keyword column results (compare view) — same API, forced semanticRatio 0.
    _keywordHits:       { state: true },
    // Lazy loading of the default (landing) list.
    _defaultHasMore:    { state: true },
    _defaultLoadingMore:{ state: true },
    _defaultTotal:      { state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    lw-insights-bar {
      position: sticky;
      top: 0;
      z-index: 600;
    }

    .page {
      max-width: var(--blog-page-max-width, 960px);
      margin: 0 auto;
      padding: var(--blog-page-padding, 0 2rem 4rem);
    }

    /* Align the header's logo (left) and "Powered by" (right) with the page
       content edges — same max-width and horizontal padding as .page above. */
    lw-header {
      --lw-header-max-width: var(--blog-page-max-width, 960px);
      --lw-header-padding: 0 2rem;
    }

    /* The search bar is pinned while scrolling (containing block = .page, which
       is tall). Its own suggestion chips are suppressed (hide-suggestions) and
       rendered below in normal flow (.landing-suggestions) so they scroll away
       instead of floating with the pinned bar. */
    lw-blog-search {
      display: block;
      position: sticky;
      top: var(--blog-search-top, 32px);
      z-index: 100;
      background: #fff;
      padding: 32px 0;
      /* box-shadow: 0 6px 12px -2px rgba(255,255,255,1),*/
      /*              0 10px 16px -4px rgba(255,255,255,0.9);*/
    }

    lw-blog-list-static {
      position: relative;
      z-index: 0;
    }

    /* ── Landing suggestions (chips + promo) — below the sticky search bar ── */
    /* Card-style chips (spark above left-aligned text), 4 across, + promo card,
       mirroring lw-blog-search's own suggestions but in the page's normal flow
       so they scroll away rather than pinning with the search bar. */
    .landing-suggestions {
      display: flex;
      align-items: stretch;
      gap: 1rem;
      margin: 0 0 27px 0;
      padding-top:5px;
    }
    .ls-chips {
      flex: 1;
      min-width: 0;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .ls-chip {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.7rem;
      min-height: 96px;
      padding: 1rem 1.1rem;
      border: 2px solid transparent;
      border-radius: 14px;
      background:
        linear-gradient(#fff, #fff) padding-box,
        linear-gradient(90deg, #FFD45D 0%, #FAAF45 40%, #F58B2C 100%) border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 0.85rem;
      line-height: 1.45;
      color: #444;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .ls-chip:hover {
      background:
        linear-gradient(#fff8f1, #fff8f1) padding-box,
        linear-gradient(90deg, #FFD45D 0%, #FAAF45 40%, #F58B2C 100%) border-box;
      color: #d9691f;
    }
    .ls-chip-spark { width: 18px; height: 18px; flex-shrink: 0; }
    .ls-chip > span { width: 100%; min-width: 0; }

    .ls-promo {
      position: relative;
      flex-shrink: 0;
      width: 181px;
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
    .ls-promo:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 30px -10px rgba(239, 125, 52, 0.6);
    }
    .ls-promo-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }
    .ls-promo-arrow svg { width: 20px; height: 20px; }
    .ls-promo-text {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.3;
      padding-top: 1rem;
    }

    /* Mobile: rounded pills in a single horizontal-scroll row (~2 visible),
       sparkle pinned left with the text centered; the promo card is dropped. */
    @media (max-width: 768px) {
      .ls-chips {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .ls-chips::-webkit-scrollbar { display: none; }
      /* Each pill shows exactly 2 chip-widths of the row, so the next one
         peeks in half-cut — a visible cue that the row scrolls. */
      .ls-chip {
        flex: 0 0 auto;
        width: calc((130% - 0.75rem) / 2);
        scroll-snap-align: start;
        flex-direction: row;
        align-items: center;
        min-height: 0;
        gap: 0.5rem;
        padding: 0.3rem 1rem;
        border-radius: 999px;
        font-size: 12px;
        line-height: 1.35;
        text-align: center;
        white-space: normal;
      }
      .ls-chip-spark { width: 15px; height: 15px; flex-shrink: 0; }
      /* Wrap to 2 lines, then ellipsize — matches the pill's fixed height. */
      .ls-chip > span {
        flex: 1;
        min-width: 0;
        text-align: center;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .ls-promo { display: none; }
    }

    .summary-wrapper {
      margin: 0 0 0;
      padding-top:5px;
    }

    /* ── Side-by-side compare mode ── */
    /* Full width (not the centered reading column) so the fixed Searches
       panel on the left and the two result columns all fit. Its left padding
       reserves the panel's width so content never underlaps it. */
    .page.is-compare {
      max-width: none;
      margin: 0;
      padding-left: calc(var(--lw-searches-width, 300px) + 2rem);
      padding-right: 2rem;
    }

    /* Searches panel — a fixed left drawer, its own overlay like the settings
       drawer: flush left, tucked below the bar, full height. Sits below the
       settings drawer's z-index so Settings covers it when opened. */
    /* In compare mode the header goes full width and left-aligns, its left
       padding matching .page.is-compare, so the logo lines up with the content
       column and clears the fixed Searches panel — same offset the page uses,
       for a consistent position and a single (transitioned) animation. */
    lw-header.is-compare {
      --lw-header-max-width: none;
      --lw-header-margin: 0;
      --lw-header-padding: 0 2rem 0 calc(var(--lw-searches-width, 300px) + 2rem);
    }

    lw-searches-panel.searches-drawer {
      position: fixed;
      top: var(--blog-search-top, 32px);
      left: 0;
      bottom: 0;
      width: var(--lw-searches-width, 300px);
      box-sizing: border-box;
      z-index: 400;
      background: #fff;
      border-right: 1px solid #e8e8e8;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #c1c1c1 transparent;
      /* No padding here — the panel's header/body sections own their padding
         so the header divider can span the full panel width (like settings). */
    }
    lw-searches-panel.searches-drawer::-webkit-scrollbar       { width: 8px; }
    lw-searches-panel.searches-drawer::-webkit-scrollbar-track { background: transparent; }
    lw-searches-panel.searches-drawer::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 99px; }
    lw-searches-panel.searches-drawer::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

    /* Mobile-only column switcher (hidden on desktop, both columns show). */
    .compare-tabs { display: none; }

    /* Mobile-only Examples carousel (compare view). Hidden on desktop, where
       the Searches panel shows the full Examples list instead. */
    .example-carousel { display: none; }

    .compare-grid {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1.75rem;
      align-items: start;
    }

    /* Divider between the two columns. A pseudo-element (rather than a border
       on the cells) so it runs the full height of the grid regardless of how
       the rows line up. */
    .compare-grid::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 1px;
      background: #e8e8e8;
    }

    .compare-col-title {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: #000000;
      margin: 0.5rem 0 0.35rem;
    }

    /* Keeps the keyword column's list aligned with the AI column's, whose
       overview/skeleton pushes it down. The grid row does the sizing. */
    .compare-summary-spacer { min-height: 0; }

    /* Keyword column's "Overview → No overview is available!" cell. */
    .compare-overview {
      padding: 1.25rem 0 0.5rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }
    .compare-overview-heading {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 1.1rem;
    }

    .compare-note {
      font-size: 13px;
      color: #98a2b3;
      line-height: 1.6;
    }
    .compare-note-list { padding: 1.5rem 0; }

    /* ── AI column, no results: apology + "Try searching for:" chips ── */
    .compare-empty-title {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 1rem 0 0.85rem;
    }

    /* Two across, wrapping — a single row of chips would be unreadable in a
       half-width column. */
    .compare-suggestions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .compare-chip {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem 0.9rem;
      border: 1px solid #f58b2c;
      border-radius: 10px;
      background: #fff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: #6b7280;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, box-shadow 0.15s;
    }
    .compare-chip:hover {
      background: #fff8f1;
      color: #374151;
      box-shadow: 0 4px 12px rgba(245, 139, 44, 0.12);
    }
    .compare-chip-spark {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      margin-top: 2px;
      color: #f58b2c;
    }

    @media (max-width: 480px) {
      .compare-suggestions { grid-template-columns: minmax(0, 1fr); }
    }

    /* "Search Results (6)" / "Further Reading (6)" strip above each list. */
    .compare-label {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: #000000;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e0e0e0;
      align-self: end;
    }

    /* Narrower columns — show only 2 skeleton lines so the block stays compact. */
    .compare-grid .summary-skeleton .skeleton-line:nth-child(n+3) { display: none; }

    /* Too narrow for two columns — switch to a tabbed single column. */
    @media (max-width: 900px) {
      .compare-grid { grid-template-columns: minmax(0, 1fr); gap: 1.25rem; }

      /* ── Examples carousel: one chip + prev/next pagination ── */
      .example-carousel {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0.75rem 0 20px;
      }
      .example-chip {
        flex: 1;
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.7rem 1rem;
        border: 1px solid #f58b2c;
        border-radius: 999px;
        background: #fff;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 11px;
        line-height: 1.35;
        color: #444;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s, box-shadow 0.15s;
      }
      .example-chip:hover { background: #fff8f1; box-shadow: 0 4px 12px rgba(245,139,44,0.12); }
      .example-chip-spark { width: 15px; height: 15px; flex-shrink: 0; color: #f58b2c; }
      /* Wrap across as many lines as the prompt needs — never clip or
         ellipsize; the chip grows in height to fit the full text. */
      .example-chip > span {
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .example-nav {
        display: flex;
        align-items: center;
        gap: 0.1rem;
        flex-shrink: 0;
      }
      .example-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 38px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 8px;
        /* The chevron is stroked with an SVG gradient (see #lw-arrow-gradient),
           which the CSS color property can't drive — so hover darkens it with
           a filter instead of a colour swap. */
        transition: filter 0.15s, background 0.15s;
      }
      .example-arrow:hover { background: #fff3e8; filter: brightness(0.92) saturate(1.1); }
      /* Zero-size holder for the gradient <defs> — shared by both arrows. */
      .example-arrow-defs { position: absolute; width: 0; height: 0; }
      .example-count {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        color: #98a2b3;
        white-space: nowrap;
        min-width: 34px;
        text-align: center;
      }
      /* Single column: no divider, no spacer, and the column titles are
         replaced by the tab labels above. */
      .compare-grid::before   { display: none; }
      .compare-summary-spacer { display: none; }
      .compare-col-title      { display: none; }

      /* Show only the tab-selected column. */
      .compare-grid.show-ai      .col-kw { display: none; }
      .compare-grid.show-keyword .col-ai { display: none; }

      /* ── Tab switcher (underline style) ── */
      /* The two tabs split the width evenly, each centered in its half, so the
         active tab's underline spans that whole half. */
      .compare-tabs {
        display: flex;
        gap: 0;
        margin: 0.25rem 0 1.25rem;
        border-bottom: 1px solid #e5e5e5;
      }
      .compare-tab {
        flex: 1;
        text-align: center;
        padding: 0 0 0.9rem;
        border: none;
        background: none;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        font-weight: 500;
        color: #8a8a8a;
        cursor: pointer;
        /* 2px active underline overlaps the 1px row divider so it sits flush. */
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: color 0.15s, border-color 0.15s;
      }
      .compare-tab.is-active { color: #111; font-weight: 700; border-bottom-color: #111; }

      /* No room for a side panel — hide it entirely and reclaim the space the
         fixed panel had reserved. */
      lw-searches-panel.searches-drawer { display: none; }
      .page.is-compare {
        padding-left: 1.25rem;
        padding-right: 1.25rem;
      }
      /* Panel is in normal flow here, so the header keeps its normal layout. */
      lw-header.is-compare {
        --lw-header-max-width: 960px;
        --lw-header-margin: 0 auto;
        --lw-header-padding: 0 1.25rem;
      }
    }

    /* "Further Reading" heading above the search-result articles.
       Matches the AI Overview <h1> style (15px / 700 / #1a1a1a). */
    .further-reading {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 8px 0 16px;
    }

    /* ── AI Overview (generating or finished) + promo card ── */
    /* Overview content (flexible) beside the promo card (fixed width) — the
       same layout the search bar uses for its suggestion chips + promo card. */
    .summary-loading-row {
      display: flex;
      /* flex-start (not stretch) — the promo card keeps its own natural
         height instead of growing to match a long overview. */
      align-items: flex-start;
      gap: 1rem;
    }
    .summary-loading-row > lw-blog-overview {
      flex: 1;
      min-width: 0;
    }
    .summary-loading {
      flex: 1;
      min-width: 0;
      padding: 1.25rem 0 0.5rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }

    /* Same card as lw-blog-search's .promo-card, duplicated here (shadow DOM
       boundary) since the skeleton lives in this component, not the search bar. */
    .summary-promo-card {
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      width: 181px;
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .summary-promo-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 30px -10px rgba(239, 125, 52, 0.6);
    }
    .summary-promo-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }
    .summary-promo-arrow svg { width: 20px; height: 20px; }
    .summary-promo-text {
      font-size: 14px;
      font-weight: 400;
      line-height: 1.3;
      padding-top: 1rem;
    }
    /* Matches the search bar's own promo card, which also hides here. */
    @media (max-width: 768px) {
      .summary-promo-card { display: none; }
    }

    .summary-loading-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .summary-loading-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #ef7d34;
    }
    .summary-loading-spark {
      width: 20px;
      height: 20px;
      color: #ef7d34;
      animation: lw-spark 1.3s ease-in-out infinite;
    }
    .summary-loading-time {
      margin-left: auto;
      font-size: 0.85rem;
      font-weight: 500;
      color: #c7c7c7;
    }

    .summary-loading-heading {
      font-size: 1.35rem;
      font-weight: 700;
      color: #dcdcdc;
      margin-bottom: 1.1rem;
      display:none;
    }

    .summary-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .skeleton-line {
      height: 18px;
      border-radius: 6px;
      background: linear-gradient(90deg, #ededed 25%, #f6f6f6 37%, #ededed 63%);
      background-size: 400% 100%;
      animation: lw-shimmer 1.4s ease infinite;
    }

    @keyframes lw-shimmer {
      0%   { background-position: 100% 0; }
      100% { background-position: 0 0; }
    }
    @keyframes lw-spark {
      0%, 100% { opacity: 1;   transform: scale(1); }
      50%      { opacity: 0.5; transform: scale(0.82); }
    }

    .list-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.85rem;
      padding: 3.5rem 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 0.9rem;
      color: #999;
    }

    .list-loading .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #eee;
      border-top-color: #e07630;
      border-radius: 50%;
      animation: lw-spin 0.7s linear infinite;
    }

    @keyframes lw-spin {
      to { transform: rotate(360deg); }
    }

    /* Lazy-load sentinel + "loading more" spinner for the landing list. */
    .list-sentinel { height: 1px; }
    .list-more {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;
    }
    .list-more .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #eee;
      border-top-color: #e07630;
      border-radius: 50%;
      animation: lw-spin 0.7s linear infinite;
    }

    @media (max-width: 1023px) {
      /* On mobile, only the header (logo/title/branding) floats — the
         demo-note / settings strip and the search bar scroll with the page. */
      lw-insights-bar { position: static; }
      lw-blog-search  { position: static; }
      lw-header {
        position: sticky;
        top: 0;
        z-index: 600;
      }
    }

    @media (max-width: 768px) {
      .page { padding: var(--blog-page-padding, 0 1.25rem 3rem); }
      /* Show only 2 skeleton lines while generating on mobile. */
      .summary-skeleton .skeleton-line:nth-child(n+3) { display: none; }
    }

    @media (max-width: 640px){
    lw-blog-search { padding-bottom:16px;}
    }

    @media (max-width: 480px) {
      .page          { padding: var(--blog-page-padding, 0 1rem 2.5rem); }
      lw-blog-search { padding: 12px 0 16px; }
    }
  `;

  constructor() {
    super();
    // bar
    this.demoNote  = '';
    this.blogs     = '';
    this.updatedAt = '';
    this.searches  = '';
    this.unblocked = '';
    // header
    this.logoSrc    = '';
    this.barLogoSrc = '';
    this.logoHref   = '';
    // API
    this.baseUrl    = '';
    this.summaryUrl = '';
    this.apiKey     = '';
    this.detailUrl  = '';
    // search
    this.searchPlaceholder = 'Search';
    this.sliderMax         = 1;
    this.sliderStep        = 0.1;
    this.sliderLabel       = '';
    this.suggestions       = null;   // falls back to lw-blog-search defaults
    this.suggestionsTitle  = 'Try searching for…';
    this.examples          = null;   // falls back to lw-searches-panel defaults
    // Same default as lw-blog-search's own promo card, so the loading state's
    // card (rendered here, since it sits outside the search bar) matches it.
    this.promoText          = 'Transform the way your team searches with AI';
    this.promoHref          = '#';
    // list
    this.defaultView = 'list';
    this.defaultSort = 'newest';
    // summary
    this.summaryHeading   = 'AI Overview';
    this.displayCitations = 'chip';
    this.settingsDefaults = null;
    // internal
    this._searchQuery       = '';
    this._semanticRatio     = 0.5;
    this._modelProvider    = 'groq';
    this._llm               = 'qwen3:4b-instruct';
    // Settings-driven search params (set from <lw-settings> on load/change).
    this._totalItems        = 5;     // number of search results returned
    this._searchTime        = null;
    this._summaryParagraphs = [];
    this._summaryHits       = null;
    this._summaryLoading    = false;
    this._summaryAbortCtrl  = null;
    this._resultsAbortCtrl  = null;
    this._summaryDebounce   = null;
    this._elapsedMs         = 0;
    this._elapsedTimer      = null;
    this._isSearchResult    = false;
    this._sideBySide        = false;
    this._searchHistory     = [];
    this._compareTab        = 'ai';   // mobile compare view defaults to AI
    this._exampleIndex      = 0;      // mobile Examples carousel position
    this._compareView       = this.defaultView;
    this._compareSort       = this.defaultSort;
    this._keywordHits       = null;   // compare view's keyword column results
    this._keywordAbortCtrl  = null;
    // Default blog list shown on open (before any search) and restored
    // whenever the search box is cleared.
    this._defaultHits       = null;
    this._defaultAbortCtrl  = null;
    this._listLoading       = false;
    this._defaultPage       = 1;
    this._defaultHasMore    = false;
    this._defaultLoadingMore= false;
    this._defaultObserver   = null;
    this._defaultTotal      = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._onModelChange = (e) => {
      this._modelProvider = e.detail?.modelProvider ?? this._modelProvider;
      this._llm            = e.detail?.llm ?? this._llm;
    };
    window.addEventListener('lw-settings-model-change', this._onModelChange);

    this._onSemanticRatioChange = (e) => {
      const next = e.detail?.semanticRatio ?? this._semanticRatio;
      if (next === this._semanticRatio) return;
      this._semanticRatio = next;
      // Re-run the AI search at the new ratio (debounce absorbs a slider drag).
      // Keyword is pinned to ratio 0, so its results can't change — skip it.
      if (this._searchQuery) this._scheduleSummary({ refetchKeyword: false });
    };
    window.addEventListener('lw-settings-semantic-ratio-change', this._onSemanticRatioChange);

    this._onCitationsChange = (e) => {
      this.displayCitations = e.detail?.citations ?? this.displayCitations;
    };
    window.addEventListener('lw-settings-citations-change', this._onCitationsChange);

    // Total Items Returned (comprehensive settings event).
    this._onSettingsChange = (e) => {
      const d = e.detail || {};
      let changed = false;
      const items = Number(d.totalItems);
      if (items && items !== this._totalItems) { this._totalItems = items; changed = true; }
      // Compare toggle.
      const wasCompare = this._sideBySide;
      this._sideBySide = !!d.sideBySide;
      // Turning compare on mid-search: the keyword column has no data yet
      // (it's only fetched in compare mode), so fetch it now.
      if (this._sideBySide && !wasCompare && this._searchQuery && !this._keywordHits) {
        this._fetchKeywordResults(this._searchQuery);
      }
      // Re-run the active search so the new result count applies.
      if (changed && this._searchQuery) this._scheduleSummary();
    };
    window.addEventListener('lw-settings-change', this._onSettingsChange);
  }

  // Per-site default settings handed to <lw-settings>. The site's
  // settings.json (settingsDefaults) wins; otherwise fall back to the page's
  // own display-citations attribute so a site's citation choice is preserved.
  // Memoised so the object reference stays stable across re-renders — a fresh
  // object each render would make <lw-settings> reload + rebroadcast on every
  // keystroke.
  get _settingsDefaults() {
    if (!this.__settingsDefaults) {
      this.__settingsDefaults = { citations: this.displayCitations, ...(this.settingsDefaults || {}) };
    }
    return this.__settingsDefaults;
  }

  // Load a default blog list on open so the landing page isn't blank.
  firstUpdated() {
    // Seed the shared view/sort now that the host's attributes have landed.
    this._compareView = this.defaultView;
    this._compareSort = this.defaultSort;
    this._loadHistory();
    // Restore the previous search (e.g. after returning from a blog detail
    // page) before the default list loads, so the last results reappear.
    this._restoreState();
    this._fetchDefaultList();
    this._fetchMeta();
  }

  // ── Persisted search state (survives a full-page detail navigation) ──
  // Scoped to the current path so different demo brands don't collide.
  get _stateKey() {
    return `lw-summary-state:${location.pathname}`;
  }

  _saveState() {
    try {
      if (!this._searchQuery) { sessionStorage.removeItem(this._stateKey); return; }
      sessionStorage.setItem(this._stateKey, JSON.stringify({
        query:      this._searchQuery,
        ratio:      this._semanticRatio,
        paragraphs: this._summaryParagraphs,
        hits:       this._summaryHits,
        time:       this._searchTime,
      }));
    } catch (_) { /* quota / serialization failure — non-fatal */ }
  }

  _restoreState() {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(this._stateKey) || 'null'); }
    catch (_) { saved = null; }
    if (!saved || !saved.query) return;

    this._searchQuery       = saved.query;
    this._semanticRatio     = saved.ratio ?? 0.5;
    this._summaryParagraphs = Array.isArray(saved.paragraphs) ? saved.paragraphs : [];
    this._summaryHits       = saved.hits ?? null;
    this._searchTime        = saved.time ?? null;
    this._summaryLoading    = false;
    this._isSearchResult    = true;
  }

  // ── Search history (compare view's "History" tab) ──
  // Persisted across sessions (unlike _stateKey above, which is per-tab
  // sessionStorage) — a user's search history should survive a reload.
  get _historyKey() {
    return `lw-search-history:${location.pathname}`;
  }

  _loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(this._historyKey) || 'null');
      this._searchHistory = Array.isArray(saved) ? saved : [];
    } catch (_) { this._searchHistory = []; }
  }

  // Most-recent-first, deduped case-insensitively, capped so the list stays
  // scannable and localStorage doesn't grow unbounded.
  _recordHistory(query) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const deduped = this._searchHistory.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
    this._searchHistory = [trimmed, ...deduped].slice(0, SEARCH_HISTORY_LIMIT);
    try { localStorage.setItem(this._historyKey, JSON.stringify(this._searchHistory)); }
    catch (_) { /* storage full / disabled — history just won't persist */ }
  }

  // Derives the plain search endpoint from the summary URL (strips /summary),
  // falling back to base-url.
  get _searchUrl() {
    if (this.summaryUrl) return this.summaryUrl.replace(/\/summary\/?$/, '');
    return this.baseUrl || '';
  }

  // /search/{index_name}/meta-data — sibling of the summary endpoint.
  get _metaUrl() {
    const url = this._searchUrl;
    return url ? `${url.replace(/\/$/, '')}/meta-data` : '';
  }

  // POST /search/{index}/summary/stream — the SSE streaming endpoint.
  get _summaryStreamUrl() {
    const base = this.summaryUrl || (this.baseUrl ? `${this.baseUrl}/summary` : '');
    return base ? `${base.replace(/\/$/, '')}/stream` : '';
  }

  async _fetchDefaultList(page = 1) {
    const url = this._searchUrl;
    if (!url) return;

    // A fresh (page 1) load cancels any outstanding request; pagination appends.
    if (page === 1 && this._defaultAbortCtrl) this._defaultAbortCtrl.abort();
    const ctrl = new AbortController();
    this._defaultAbortCtrl = ctrl;

    if (page === 1) this._listLoading = true;
    else            this._defaultLoadingMore = true;

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': this.apiKey },
        body:    JSON.stringify({ query: '', filter: {}, page, limit: DEFAULT_PAGE_LIMIT, semanticRatio: 0 }),
        signal:  ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hits = Array.isArray(data.hits) ? data.hits : [];

      this._defaultHits    = page === 1 ? hits : [...(this._defaultHits ?? []), ...hits];
      this._defaultPage    = page;
      this._defaultHasMore = hits.length === DEFAULT_PAGE_LIMIT;
      this._defaultTotal   = data.estimatedTotalHits ?? this._defaultHits.length;
      // Only apply to the visible list if the user hasn't started searching.
      if (!this._searchQuery) this._summaryHits = this._defaultHits;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Default list fetch error:', err);
    } finally {
      if (!ctrl.signal.aborted) {
        this._listLoading        = false;
        this._defaultLoadingMore = false;
      }
    }
  }

  // Lazy-load the next page of the landing list when the sentinel scrolls in.
  _setupDefaultObserver() {
    if (this._defaultObserver) this._defaultObserver.disconnect();
    const sentinel = this.renderRoot?.querySelector('.list-sentinel');
    if (!sentinel) return;
    this._defaultObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting
          && this._defaultHasMore
          && !this._defaultLoadingMore
          && !this._searchQuery) {
        this._fetchDefaultList(this._defaultPage + 1);
      }
    }, { rootMargin: '300px 0px' });
    this._defaultObserver.observe(sentinel);
  }

  updated(changed) {
    // (Re)attach the lazy-load observer whenever the landing list appears or
    // its "has more" state changes.
    if (changed.has('_summaryHits') || changed.has('_searchQuery') ||
        changed.has('_isSearchResult') || changed.has('_defaultHasMore') ||
        changed.has('_sideBySide')) {
      this._setupDefaultObserver();
    }
  }

  // ── Elapsed-time ticker (shown while the overview is generating) ──
  _startElapsed() {
    this._stopElapsed();
    this._elapsedStart = Date.now();
    this._elapsedMs = 0;
    this._elapsedTimer = setInterval(() => {
      this._elapsedMs = Date.now() - this._elapsedStart;
    }, 50);   // fast tick so the hundredths (ff) animate smoothly
  }

  _stopElapsed() {
    clearInterval(this._elapsedTimer);
    this._elapsedTimer = null;
  }

  // ms → mm:ss:fff  (fff = milliseconds)
  _fmtElapsed(ms) {
    const t   = Math.max(0, ms ?? 0);
    const mm  = String(Math.floor(t / 60000)).padStart(2, '0');
    const ss  = String(Math.floor((t % 60000) / 1000)).padStart(2, '0');
    const fff = String(Math.floor(t % 1000)).padStart(3, '0');
    return `${mm}:${ss}:${fff}`;
  }

  // ── Event handlers ───────────────────────────────────────────

  // Typing only updates the bound query — the search itself runs on Enter
  // (see _onSearchKeydown). Two exceptions run it immediately instead:
  // clearing the box (still goes through _scheduleSummary, whose empty-query
  // branch cancels in-flight requests and restores the default list without a
  // debounce), and picking one of the search bar's own suggestion chips
  // (detail.immediate — an explicit submit, same as pressing Enter).
  _onSearchChange(e) {
    this._searchQuery = e.detail.value;
    if (!this._searchQuery) { this._scheduleSummary(); return; }
    if (e.detail.immediate) this._runSummary();

    // ── Search-as-you-type (disabled — kept for reference) ──
    // this._scheduleSummary();
  }

  // Enter runs the search immediately, skipping the typing debounce.
  _onSearchKeydown(e) {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    this._runSummary();
  }

  _onSliderChange(e) { this._semanticRatio = e.detail.value; }

  // A chip in the no-results state runs that query (the search input is bound
  // to _searchQuery, so it updates to match).
  // Picking a chip is an explicit submit, like pressing Enter — run it now
  // rather than waiting out a debounce.
  _pickSuggestion(text) {
    this._searchQuery = text;
    this._runSummary();
  }

  // In compare mode the two lists share one view/sort: whichever column the
  // user changes, both follow. Re-binding default-view / default-sort feeds the
  // new value back into both lists.
  _onCompareViewChange(e) { this._compareView = e.detail.view; }
  _onCompareSortChange(e) { this._compareSort = e.detail.sort; }
  _setCompareTab(tab)     { this._compareTab = tab; }

  // Examples backing the mobile compare carousel — the site's list, or the
  // built-in fallback (same source the desktop Searches panel uses).
  get _exampleList() {
    return (Array.isArray(this.examples) && this.examples.length) ? this.examples : DEFAULT_EXAMPLES;
  }
  // Prev/next wrap around so both arrows always work.
  _prevExample() {
    const n = this._exampleList.length;
    this._exampleIndex = (this._exampleIndex - 1 + n) % n;
  }
  _nextExample() {
    const n = this._exampleList.length;
    this._exampleIndex = (this._exampleIndex + 1) % n;
  }

  // ── Summary fetching ─────────────────────────────────────────

  // refetchKeyword=false skips the keyword column's request — used when only
  // the semantic ratio changed, since keyword is fixed at ratio 0 and can't be
  // affected by it.
  _scheduleSummary({ refetchKeyword = true } = {}) {
    clearTimeout(this._summaryDebounce);
    if (!this._searchQuery) {
      // Cancel any in-flight summary/results so a late response can't
      // repopulate the overview or the timer after the search is cleared.
      if (this._summaryAbortCtrl) this._summaryAbortCtrl.abort();
      if (this._resultsAbortCtrl) this._resultsAbortCtrl.abort();
      if (this._keywordAbortCtrl) this._keywordAbortCtrl.abort();
      this._summaryParagraphs = [];
      // Restore the default blog list instead of leaving the page blank.
      this._summaryHits       = this._defaultHits;
      // Clearing the query drops the keyword results too — the column falls
      // back to the default list (see _keywordItems).
      this._keywordHits       = null;
      this._summaryLoading    = false;
      this._searchTime        = null;
      this._isSearchResult    = false;
      this._stopElapsed();
      // Drop the persisted search so Back doesn't restore a cleared query.
      this._saveState();
      return;
    }
    // Wait until the user pauses typing before showing the loader or firing
    // the request — avoids searching on every keystroke.
    this._summaryDebounce = setTimeout(() => this._runSummary({ refetchKeyword }), SUMMARY_DEBOUNCE_MS);
  }

  // Fires the search right now. This is the Enter-key path; _scheduleSummary
  // above wraps it in a debounce for the callers that still want one (the
  // semantic-ratio slider, which drags through many values).
  _runSummary({ refetchKeyword = true } = {}) {
    clearTimeout(this._summaryDebounce);
    if (!this._searchQuery) { this._scheduleSummary(); return; }

    this._summaryLoading = true;
    this._startElapsed();
    this._recordHistory(this._searchQuery);
    // Single SSE call to /summary/stream: a "hits" event (fast, renders the
    // list immediately) followed by streamed "token" events (the LLM
    // overview) over one connection. This is the only request the AI column
    // needs — it supplies both the list and the overview text.
    this._fetchSummaryStream(this._searchQuery);
    // Compare mode also runs a keyword search (semanticRatio 0) for the left
    // column. Skipped when compare is off (unused) or when only the ratio
    // changed (refetchKeyword=false — keyword is ratio-independent).
    if (this._sideBySide && refetchKeyword) this._fetchKeywordResults(this._searchQuery);
  }

  // POST /search/{index}/summary/stream — streams Server-Sent Events, one
  // frame per message:
  //   event: hits\ndata: {"hits":[…]}\n\n   (fast — renders the list)
  //   event: token\ndata: {"text":"…"}\n\n  (streamed — the LLM overview)
  //   event: done  / event: error
  // The event NAME lives on its own `event:` line (not inside the JSON), so we
  // parse each frame line-by-line — see _handleSseFrame.
  async _fetchSummaryStream(query) {
    const url = this._summaryStreamUrl;
    if (!url || !query) return;

    if (this._summaryAbortCtrl) this._summaryAbortCtrl.abort();
    const ctrl = new AbortController();
    this._summaryAbortCtrl = ctrl;

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'text/event-stream',
          'X-API-KEY':    this.apiKey,
        },
        // limit = "Total Items Returned" setting, applied to the stream's own
        // "hits" event — this one call supplies both the AI list and the
        // overview text, so no second (plain search) request is needed.
        body:    JSON.stringify({ query, filter: {}, limit: this._totalItems || DEFAULT_PAGE_LIMIT, semanticRatio: this._semanticRatio, modelProvider: this._modelProvider, llmUsed: this._llm }),
        signal:  ctrl.signal,
      });
      // A failed stream returns JSON ({ error, message }) rather than SSE.
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Frames are separated by a blank line. Process every complete frame
        // and keep any trailing partial in the buffer for the next read.
        let sep;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          this._handleSseFrame(frame);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Transient failure (the summary endpoint occasionally 500s / times out
      // on rapid re-queries). Keep the last good results on screen instead of
      // wiping them to "No posts found".
      console.error('Summary stream fetch error:', err);
    } finally {
      // Guard against THIS request's own controller — not the shared one. A
      // superseded request (whose controller we aborted when the next search
      // started) must not finalise the timer over the new in-progress search.
      if (!ctrl.signal.aborted) {
        this._summaryLoading = false;
        this._searchTime     = Date.now() - this._elapsedStart;
        this._stopElapsed();
        this._saveState();
        this._fetchMeta();
      }
    }
  }

  // Parses one SSE frame (the text between two blank lines) into its `event:`
  // and `data:` fields, then dispatches on the event name. Per the SSE spec a
  // frame may carry several `data:` lines (joined with newlines) and a single
  // leading space after each colon is stripped.
  _handleSseFrame(frame) {
    let event = 'message';
    const dataLines = [];
    for (const line of frame.split('\n')) {
      if (!line || line.startsWith(':')) continue;   // blank / keep-alive comment
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (!dataLines.length) return;

    let data;
    try { data = JSON.parse(dataLines.join('\n')); }
    catch (_) { return; }   // non-JSON payload — ignore

    if (event === 'hits') {
      // Sole source for the AI list — apply even when empty, a genuine
      // "no results" answer.
      this._summaryHits       = Array.isArray(data.hits) ? data.hits : [];
      this._summaryText       = '';     // reset the accumulator for this stream
      this._summaryParagraphs = [];
      this._isSearchResult    = true;   // decorate: "Further Reading" + numbers
      this._saveState();
    } else if (event === 'token') {
      // One chunk at a time — APPEND, never replace. Citations are attached at
      // render time by _paragraphsWithCitation (hits already arrived above).
      this._summaryText = (this._summaryText ?? '') + (data.text ?? '');
      const paras = this._mapToParagraphs({ summary: this._summaryText });
      if (paras.length) this._summaryParagraphs = paras;
    } else if (event === 'done') {
      this._saveState();
    } else if (event === 'error') {
      // In-band failure AFTER hits were sent (e.g. LLM timeout). res.ok can't
      // catch this — the HTTP status was already 200.
      console.error('Summary stream error:', data.message);
    }
  }

  // Fetches insights-bar stats (blog count, last updated, search counts).
  // Called once on load (before any search) and again after every search so
  // the strip stays current.
  async _fetchMeta() {
    const url = this._metaUrl;
    if (!url) return;

    try {
      const res = await fetch(url, {
        method:  'GET',
        headers: { 'X-API-KEY': this.apiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this.blogs     = data.numberOfDocuments  ?? this.blogs;
      // Pass the raw date through — <lw-insights-bar> formats it (desktop
      // shows date + time, mobile shows date only).
      this.updatedAt = data.updatedAt          ?? this.updatedAt;
      this.searches  = data.searches           ?? this.searches;
      this.unblocked = data.unblockedSearches  ?? this.unblocked;
    } catch (err) {
      console.error('Meta fetch error:', err);
    }
  }

  // Maps the summary API response → lw-blog-overview paragraphs format
  // (text only — citations are attached reactively at render time, see
  // _paragraphsWithCitation, since hits can arrive after the summary does).
  _mapToParagraphs(data) {
    const { summary = '' } = data;
    if (!summary) return [];

    // Try to split on double-newline first, fall back to sentence boundaries
    const rawParas = summary.split(/\n{2,}/).filter(s => s.trim());
    const paras = rawParas.length > 1
      ? rawParas
      : summary.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim());

    return paras.map(text => ({ text: text.trim() }));
  }

  // Attaches the citation (built from the current _summaryHits) to the last
  // paragraph on every render, so it appears whether the hits arrived before
  // or after the summary text finished generating.
  get _paragraphsWithCitation() {
    const paras = this._summaryParagraphs;
    if (!paras.length) return paras;

    const articles = (this._summaryHits ?? []).slice(0, 10).map(h => ({
      title:   h.title   ?? '',
      excerpt: h.summary ?? h.body ?? '',
      image:   (h.imageUrl ?? '').replace(/^\/\//, 'https://'),
      url:     h.url ?? '#',
    }));
    if (!articles.length) return paras;

    return paras.map((p, i) => i === paras.length - 1
      ? { ...p, citation: { label: `Sources (${articles.length})`, articles } }
      : p);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('lw-settings-model-change', this._onModelChange);
    window.removeEventListener('lw-settings-semantic-ratio-change', this._onSemanticRatioChange);
    window.removeEventListener('lw-settings-citations-change', this._onCitationsChange);
    window.removeEventListener('lw-settings-change', this._onSettingsChange);
    if (this._summaryAbortCtrl) this._summaryAbortCtrl.abort();
    if (this._resultsAbortCtrl) this._resultsAbortCtrl.abort();
    if (this._keywordAbortCtrl) this._keywordAbortCtrl.abort();
    if (this._defaultAbortCtrl) this._defaultAbortCtrl.abort();
    if (this._defaultObserver)  this._defaultObserver.disconnect();
    clearTimeout(this._summaryDebounce);
    this._stopElapsed();
  }

  // Keyword search — same endpoint as the AI column, but semanticRatio is
  // pinned to 0 (pure keyword) regardless of the settings slider, which only
  // drives the AI column. Fires alongside the AI stream in compare mode.
  async _fetchKeywordResults(query) {
    const url = this._searchUrl;
    if (!url || !query) return;

    if (this._keywordAbortCtrl) this._keywordAbortCtrl.abort();
    const ctrl = new AbortController();
    this._keywordAbortCtrl = ctrl;

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': this.apiKey },
        // semanticRatio: 0 — fixed for keyword search (never the slider value).
        body:    JSON.stringify({ query, filter: {}, page: 1, limit: this._totalItems || DEFAULT_PAGE_LIMIT, semanticRatio: 0 }),
        signal:  ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Apply even when empty — a genuine "no results" answer for the column.
      this._keywordHits = Array.isArray(data.hits) ? data.hits : [];
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Keyword results fetch error:', err);
    }
  }

  // ── Render ───────────────────────────────────────────────────

  // The keyword column's hits: its own search results once a query runs, or
  // the default landing list before then (so the column isn't blank on open).
  get _keywordItems() {
    return this._keywordHits ?? this._defaultHits ?? [];
  }

  render() {
    const showSummary = this._searchQuery &&
      (this._summaryLoading || this._summaryParagraphs.length > 0);
    const showList = this._summaryHits !== null;

    // AI Overview — the generating skeleton, then the finished overview.
    // Full-width normally; inside the AI column in compare mode.
    const loadingSkeleton = html`
      <div class="summary-loading">
        <div class="summary-loading-head">
          <svg class="summary-loading-spark" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.6 5.2a4 4 0 0 0 2.6 2.6L21.5 12l-5.3 2.2a4 4 0 0 0-2.6 2.6L12 22l-1.6-5.2a4 4 0 0 0-2.6-2.6L2.5 12l5.3-2.2a4 4 0 0 0 2.6-2.6L12 2z"/>
            <path d="M19 3l.5 1.7a1.6 1.6 0 0 0 1 1L22 6l-1.5.3a1.6 1.6 0 0 0-1 1L19 9l-.5-1.7a1.6 1.6 0 0 0-1-1L16 6l1.5-.3a1.6 1.6 0 0 0 1-1L19 3z"/>
          </svg>
          <span class="summary-loading-label">Generating Overview…</span>
          <span class="summary-loading-time">${this._fmtElapsed(this._elapsedMs)}</span>
        </div>
        <div class="summary-loading-heading">Overview</div>
        <div class="summary-skeleton">
          <div class="skeleton-line" style="width:100%"></div>
          <div class="skeleton-line" style="width:55%"></div>
        </div>
      </div>
    `;

    // The promo card that normally sits beside the search bar's suggestion
    // chips (hidden once a query is active) reappears here beside the AI
    // Overview — generating or finished — so that area isn't left one-sided.
    // Compare mode's AI column is too narrow for it, so it's skipped there.
    const summaryPromoCard = (!this._sideBySide && this.promoText) ? html`
      <a class="summary-promo-card" href=${this.promoHref || '#'}>
        <span class="summary-promo-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="12" x2="20" y2="12"/>
            <polyline points="14 6 20 12 14 18"/>
          </svg>
        </span>
        <span class="summary-promo-text">${this.promoText}</span>
      </a>
    ` : nothing;

    const summaryTpl = html`
      <div class="summary-wrapper">
        <div class="summary-loading-row">
          ${this._summaryLoading
            ? loadingSkeleton
            : html`
                <lw-blog-overview
                  heading=${this.summaryHeading}
                  display-citations=${this.displayCitations}
                  .paragraphs=${this._paragraphsWithCitation}
                  style=${this._sideBySide ? '--lw-overview-pad-top: 1.25rem' : ''}
                ></lw-blog-overview>
              `
          }
          ${summaryPromoCard}
        </div>
      </div>
    `;

    // The AI-side list. `hideHeader` differs by context: the compare grid
    // already shows its own "Further Reading (n)" label above the list, so it
    // stays hidden there; the single-column view shows the count/toggle/sort
    // strip below "Further Reading" (see listSection), matching the design.
    const renderAiList = (hideHeader, hideCategory = false) => html`
      <lw-blog-list-static
        .hits=${this._summaryHits}
        detail-url=${this.detailUrl}
        default-view=${this._compareView}
        default-sort=${this._compareSort}
        ?hide-header=${hideHeader}
        ?hide-category=${hideCategory}
        ?numbered=${this._isSearchResult}
        .totalCount=${this._isSearchResult ? null : this._defaultTotal}
      ></lw-blog-list-static>
    `;
    // Used only inside the compare grid, whose narrow columns have no room
    // for the category pill.
    const aiList = renderAiList(this._isSearchResult, true);

    // Compare mode: keyword results on the left, AI results on the right, both
    // from the same search endpoint (keyword pins semanticRatio to 0).
    //
    // One grid owns both columns so their rows line up: the AI column's
    // overview (or generating skeleton) sets the height of the row, and the
    // keyword column's matching cell stays blank, which keeps the two result
    // lists starting on exactly the same line.
    const hitCount        = this._summaryHits?.length ?? 0;
    // The responsive AI tab represents the blog collection, so it uses the
    // same full blog total shown in the insights bar—not the subset returned
    // by the current search (for example, 41 rather than 13).
    const aiListCount     = this._defaultTotal ?? this.blogs ?? hitCount;
    const keywordHits     = this._keywordItems;
    const keywordCount    = keywordHits.length;
    // Labels show for any search — including one that returned nothing, where
    // "Search Results (0)" sitting above the empty note is the point.
    const showCompareLabels = this._isSearchResult;

    // "Overview / No overview is available!" — used by the keyword column
    // always (it has no LLM behind it), and by the AI column when the search
    // produced no overview to show.
    const noOverviewTpl = html`
      <div class="compare-overview">
        <div class="compare-overview-heading">Overview</div>
        <div class="compare-note">No overview is available!</div>
      </div>
    `;

    // While the AI overview generates, the keyword cell stays blank so the two
    // columns settle together rather than the left one resolving early.
    const keywordOverviewTpl = this._summaryLoading
      ? html`<div class="compare-summary-spacer" aria-hidden="true"></div>`
      : noOverviewTpl;

    const aiOverviewTpl = (this._summaryLoading || this._summaryParagraphs.length)
      ? html`<div>${summaryTpl}</div>`
      : noOverviewTpl;

    // AI column with no hits: apologise, then offer the same suggestion chips
    // the search bar shows, so the user has a way forward.
    const suggestions = (Array.isArray(this.suggestions) && this.suggestions.length)
      ? this.suggestions
      : DEFAULT_SUGGESTIONS;

    const aiEmptyTpl = html`
      <div class="compare-empty">
        <div class="compare-note compare-note-list">
          Sorry, at the moment we couldn’t find any information to directly answer your query.
        </div>
        <div class="compare-empty-title">Try searching for:</div>
        <div class="compare-suggestions">
          ${suggestions.map(text => html`
            <button class="compare-chip" @click=${() => this._pickSuggestion(text)}>
              <svg class="compare-chip-spark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l1.6 5.2a4 4 0 0 0 2.6 2.6L21.5 12l-5.3 2.2a4 4 0 0 0-2.6 2.6L12 22l-1.6-5.2a4 4 0 0 0-2.6-2.6L2.5 12l5.3-2.2a4 4 0 0 0 2.6-2.6L12 2z"/>
              </svg>
              <span>${text}</span>
            </button>
          `)}
        </div>
      </div>
    `;

    // Empty results read as a quiet inline note in the column — the list's own
    // full-page empty state (big message + suggestion chips) is far too loud
    // for one half of a comparison.
    const keywordListTpl = keywordCount === 0
      ? html`<div class="compare-note compare-note-list">No results found!</div>`
      : html`
          <lw-blog-list-static
            .hits=${keywordHits}
            detail-url=${this.detailUrl}
            default-view=${this._compareView}
            default-sort=${this._compareSort}
            ?hide-header=${this._isSearchResult}
            hide-category
            ?numbered=${this._isSearchResult}
          ></lw-blog-list-static>
        `;

    // Narrow screens can't fit two columns, so they switch between them with
    // these tabs (AI first). On desktop the tabs are hidden and both columns
    // show; the `show-ai`/`show-keyword` class only takes effect via the mobile
    // media query, so the same single copy of the content serves both layouts.
    const isAiTab = this._compareTab === 'ai';
    const compareSection = html`
      <div class="compare-tabs" role="tablist">
        <button class="compare-tab ${isAiTab ? 'is-active' : ''}"
                role="tab" aria-selected=${isAiTab}
                @click=${() => this._setCompareTab('ai')}>
          AI Search (${aiListCount})
        </button>
        <button class="compare-tab ${!isAiTab ? 'is-active' : ''}"
                role="tab" aria-selected=${!isAiTab}
                @click=${() => this._setCompareTab('keyword')}>
          Keyword Search (${keywordCount})
        </button>
      </div>

      <div class="compare-grid ${isAiTab ? 'show-ai' : 'show-keyword'}">
        <div class="compare-col-title col-kw">Keyword Search</div>
        <div class="compare-col-title col-ai">AI Search</div>

        ${this._searchQuery ? html`
          <div class="col-kw">${keywordOverviewTpl}</div>
          <div class="col-ai">${aiOverviewTpl}</div>
        ` : nothing}

        ${showCompareLabels ? html`
          <div class="compare-label col-kw">Search Results (${keywordCount})</div>
          <div class="compare-label col-ai">Further Reading (${hitCount})</div>
        ` : nothing}

        <div class="col-kw">${keywordListTpl}</div>
        <div class="col-ai">${this._isSearchResult && hitCount === 0 ? aiEmptyTpl : aiList}</div>
      </div>
    `;

    const listSection = html`
      ${this._isSearchResult && hitCount
        ? html`<div class="further-reading">Further Reading</div>`
        : ''}
      ${renderAiList(false)}

      ${!this._isSearchResult && this._defaultHasMore
        ? html`<div class="list-sentinel" aria-hidden="true"></div>` : ''}
      ${!this._isSearchResult && this._defaultLoadingMore
        ? html`<div class="list-more"><div class="spinner"></div></div>` : ''}
    `;

    // Search bar + overview/results — the page's whole main column. Reused
    // as-is whether or not the compare sidebar is showing beside it.
    // Mobile-only Examples carousel for compare mode — replaces the search
    // bar's suggestion chips (hidden via lw-blog-search[compare]) and stands in
    // for the Searches panel, which is hidden on narrow screens. Hidden on
    // desktop via CSS.
    const example = this._exampleList[this._exampleIndex] ?? '';
    const exampleCarousel = (this._sideBySide && this._exampleList.length) ? html`
      <div class="example-carousel">
        <button class="example-chip" @click=${() => this._pickSuggestion(example)}>
          <svg class="example-chip-spark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.6 5.2a4 4 0 0 0 2.6 2.6L21.5 12l-5.3 2.2a4 4 0 0 0-2.6 2.6L12 22l-1.6-5.2a4 4 0 0 0-2.6-2.6L2.5 12l5.3-2.2a4 4 0 0 0 2.6-2.6L12 2z"/>
            <path d="M19 3l.5 1.7a1.6 1.6 0 0 0 1 1L22 6l-1.5.3a1.6 1.6 0 0 0-1 1L19 9l-.5-1.7a1.6 1.6 0 0 0-1-1L16 6l1.5-.3a1.6 1.6 0 0 0 1-1L19 3z"/>
          </svg>
          <span>${example}</span>
        </button>
        <!-- Brand gradient for the chevrons, defined once and referenced by
             both arrows. Same stops as the promo card's 105deg gradient, run
             bottom-left → top-right so the gold lands on the upper arm. -->
        <svg class="example-arrow-defs" aria-hidden="true">
          <defs>
            <linearGradient id="lw-arrow-gradient" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%"   stop-color="#ee6f2b"/>
              <stop offset="55%"  stop-color="#f68e2d"/>
              <stop offset="100%" stop-color="#fbb63c"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="example-nav">
          <button class="example-arrow" @click=${this._prevExample} aria-label="Previous example">
            <svg width="26" height="26" viewBox="6 4 12 16" fill="none" stroke="url(#lw-arrow-gradient)"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="example-count">${this._exampleIndex + 1}/${this._exampleList.length}</span>
          <button class="example-arrow" @click=${this._nextExample} aria-label="Next example">
            <svg width="26" height="26" viewBox="6 4 12 16" fill="none" stroke="url(#lw-arrow-gradient)"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    ` : nothing;

    // Landing suggestions — the same chips lw-blog-search would render, but
    // pulled out and placed below the sticky search bar (in normal flow) so
    // they scroll away instead of floating with the pinned bar. Shown only
    // before a search, and not in compare mode (which uses its own panel).
    const landingSuggestions = (!this._sideBySide && !this._searchQuery) ? html`
      <div class="landing-suggestions">
        <div class="ls-chips">
          ${suggestions.map(text => html`
            <button class="ls-chip" @click=${() => this._pickSuggestion(text)}>
              <img class="ls-chip-spark" src=${suggestionIcon} alt="" aria-hidden="true">
              <span>${text}</span>
            </button>
          `)}
        </div>
        ${this.promoText ? html`
          <a class="ls-promo" href=${this.promoHref || '#'}>
            <span class="ls-promo-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/>
              </svg>
            </span>
            <span class="ls-promo-text">${this.promoText}</span>
          </a>
        ` : nothing}
      </div>
    ` : nothing;

    const mainContent = html`
      <lw-blog-search
        placeholder=${this.searchPlaceholder}
        slider-max=${this.sliderMax}
        slider-step=${this.sliderStep}
        slider-label=${this.sliderLabel}
        .value=${this._searchQuery}
        .searchTime=${this._summaryLoading ? null : this._searchTime}
        .suggestions=${this.suggestions}
        suggestions-title=${this.suggestionsTitle}
        promo-text=${this.promoText}
        promo-href=${this.promoHref}
        ?compare=${this._sideBySide}
        hide-suggestions
        @search-change=${this._onSearchChange}
        @keydown=${this._onSearchKeydown}
        @slider-change=${this._onSliderChange}
      ></lw-blog-search>

      ${landingSuggestions}

      ${exampleCarousel}

      ${!this._sideBySide && showSummary ? summaryTpl : nothing}

      ${this._sideBySide
        ? compareSection
        : showList ? listSection : this._listLoading ? html`
        <div class="list-loading">
          <div class="spinner"></div>
          <span>Loading blogs…</span>
        </div>
      ` : nothing}
    `;

    return html`
      <lw-insights-bar
        demo-note=${this.demoNote}
        logo-src=${this.barLogoSrc}
        blogs=${this._defaultTotal ?? this.blogs}
        updated=${this.updatedAt}
        searches=${this.searches}
        unblocked=${this.unblocked}
      ></lw-insights-bar>

      <lw-header
        class=${this._sideBySide ? 'is-compare' : ''}
        logo-src=${this.logoSrc}
        logo-href=${this.logoHref}
      ></lw-header>

      <!-- Compare view's "Searches" sidebar — a fixed left panel, its own
           overlay like <lw-settings>, so it's decoupled from .page flow.
           Settings (higher z-index) slides over the top of it when opened. -->
      ${this._sideBySide ? html`
        <lw-searches-panel
          class="searches-drawer"
          .examples=${this.examples}
          .history=${this._searchHistory}
          .selected=${this._searchQuery}
          @search-pick=${(e) => this._pickSuggestion(e.detail.value)}
        ></lw-searches-panel>
      ` : nothing}

      <div class="page ${this._sideBySide ? 'is-compare' : ''}"
           @view-change=${this._onCompareViewChange}
           @sort-change=${this._onCompareSortChange}>
        ${mainContent}
      </div>

      <lw-settings
        .defaults=${this._settingsDefaults}
      ></lw-settings>
    `;
  }
}

customElements.define('lw-summary-page', LwSummaryPage);
