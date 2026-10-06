import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';
import '../lw-blog-list/lw-blog-list.js';
import '../lw-feedback-card/lw-feedback-card.js';

const DEFAULT_AI_THEME = {
  widget: {
    style: 'icon-text',
    // 'floating' pins the launcher to a corner; 'bar' spans the full width
    // of the viewport, anchored to the bottom. See _resolvedPosition and
    // the btn-type="bar" styles below — btn-type set directly on the tag
    // wins over this, same precedence widget.style already follows.
    position: 'floating',
    helperText: 'Ask me anything',
    backgroundColor: '#ffffff',
    iconColor: '#000000',
  },
  button: {
    backgroundColor: '#000000',
    textColor: '#ffffff',
    outlineColor: '#ffffff',
    outlineThickness: 2,
  },
  questions: {
    fontFamily: 'Inter, sans-serif',
    textColor: '#1A1A1A',
    backgroundColor: '#F4F4F6',
  },
  cornerRadius: 12,
  suggestedQuestionsStyle: 'chips',
  // 'fullpage' covers the viewport (the current behaviour); 'panel' slides
  // in from the right and squeezes the page into what is left.
  searchDisplayMode: 'fullpage',
  suggestedQuestions: {
    items: [
      'How does Discover AI work?',
      'What content sources do you support?',
      'Can I customize the search results?',
      'How do I get started?',
      'test question 5',
      'test question 6',
      'test question 7',
      'test question 8',
      'test question 9',
      'test question 10',
      'test question 11',
      'test question 12',
      'test question 13',
      'test question 14',
      'test question 15',
    ],
  },
  page: { backgroundColor: '#ffffff' },
  closeIcon: { color: '#6B6B6E' },
  card: {
    backgroundColor: '#ffffff',
    textColor: '#1A1A1A',
    cornerRadius: '8px',
  },
  logo: { image: '' },
  text: {
    header: {
      text: 'Search Discover AI',
      fontFamily: 'Inter, sans-serif',
      color: '#1A1A1A',
    },
    subtitle: {
      text: 'Find answers instantly',
      fontFamily: 'Inter, sans-serif',
      color: '#6B6B6E',
    },
    search: {
      color: '#1A1A1A',
      placeholder: 'Type to search...',
    },
  },
  results: {
    headings: {
      fontFamily: 'Inter, sans-serif',
      color: '#1A1A1A',
    },
    blogTitle: {
      fontFamily: 'Inter, sans-serif',
      color: '#1A1A1A',
      hoverColor: '#555555',
    },
    // Body copy: the AI Answer paragraphs, the blog excerpts under
    // Further Reading, and the result count beside them.
    bodyText: {
      fontFamily: 'Inter, sans-serif',
      color: '#303037',
    },
    chip: { backgroundColor: '#FEF3EB', color: '#303037' },
    lineColor: '#E5E5E5',
  },
};

function mergeTheme(base, override) {
  const result = { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeTheme(base[key] || {}, value)
      : value;
  });
  return result;
}

// The backend theme DTO is intentionally flat, while the component keeps a
// nested theme object that is easier to consume in its templates and styles.
// Accept both ASP.NET's usual camelCase JSON and the DTO's PascalCase names.
const BACKEND_THEME_MAP = {
  WidgetStyle:                   ['widget', 'style'],
  WidgetPosition:                ['widget', 'position'],
  HelperText:                    ['widget', 'helperText'],
  WidgetBackgroundColor:         ['widget', 'backgroundColor'],
  WidgetIconColor:               ['widget', 'iconColor'],
  ButtonBackgroundColor:         ['button', 'backgroundColor'],
  ButtonTextColor:               ['button', 'textColor'],
  ButtonOutlineColor:            ['button', 'outlineColor'],
  ButtonOutlineThickness:        ['button', 'outlineThickness'],
  ButtonCornerRadius:            ['cornerRadius'],
  SuggestedQuestionsStyle:       ['suggestedQuestionsStyle'],
  SearchDisplayMode:             ['searchDisplayMode'],
  QuestionsFontFamily:           ['questions', 'fontFamily'],
  QuestionsTextColor:            ['questions', 'textColor'],
  QuestionsBackgroundColor:      ['questions', 'backgroundColor'],
  SearchPageBackgroundColor:     ['page', 'backgroundColor'],
  CloseIconColor:                ['closeIcon', 'color'],
  SearchCardBackgroundColor:     ['card', 'backgroundColor'],
  SearchCardTextColor:           ['card', 'textColor'],
  SearchCardCornerRadius:        ['card', 'cornerRadius'],
  LogoImageUrl:                  ['logo', 'image'],
  HeaderText:                    ['text', 'header', 'text'],
  HeaderTextFontFamily:          ['text', 'header', 'fontFamily'],
  HeaderTextColor:               ['text', 'header', 'color'],
  SubtitleText:                  ['text', 'subtitle', 'text'],
  SubtitleTextFontFamily:        ['text', 'subtitle', 'fontFamily'],
  SubtitleTextColor:             ['text', 'subtitle', 'color'],
  SearchText:                    ['text', 'search', 'placeholder'],
  ResultsHeadingFontFamily:      ['results', 'headings', 'fontFamily'],
  ResultsHeadingFontColor:       ['results', 'headings', 'color'],
  ResultsBlogTitleFontFamily:    ['results', 'blogTitle', 'fontFamily'],
  ResultsBlogTitleFontColor:     ['results', 'blogTitle', 'color'],
  ResultsBodyTextFontFamily:     ['results', 'bodyText', 'fontFamily'],
  ResultsBodyTextFontColor:      ['results', 'bodyText', 'color'],
  ResultsChipBackgroundColor:    ['results', 'chip', 'backgroundColor'],
  ResultsChipFontColor:          ['results', 'chip', 'color'],
};

const BACKEND_LENGTH_FIELDS = new Set([
  'ButtonOutlineThickness',
  'ButtonCornerRadius',
  'SearchCardCornerRadius',
]);

/**
 * Widget Style is a closed set rather than a free-form theme value: the
 * admin panel writes exactly "icon" or "icon-text", and a freshly created
 * config row comes back as "". Empty, missing, or unrecognised values must
 * resolve to the labelled launcher instead of reaching the render path.
 */
const WIDGET_STYLES = new Set(['icon', 'icon-text']);
const DEFAULT_WIDGET_STYLE = 'icon-text';

function normalizeWidgetStyle(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return WIDGET_STYLES.has(v) ? v : DEFAULT_WIDGET_STYLE;
}

/**
 * Widget Position is a closed set for the same reason Widget Style is: a
 * freshly created config row (or one saved before this field existed) has
 * no value at all, and anything unrecognised must resolve to the current
 * default rather than reach a CSS attribute selector as garbage.
 */
/**
 * Where the search opens: over the whole viewport, or in a right-hand
 * panel that pushes the page aside. Another closed set, same handling as
 * widget style and position — anything unrecognised is the full page.
 */
const SEARCH_DISPLAY_MODES = new Set(['fullpage', 'panel']);
const DEFAULT_SEARCH_DISPLAY = 'fullpage';

function normalizeSearchDisplay(value) {
  const v = String(value ?? '').trim().toLowerCase().replace(/[s_]+/g, '-');
  if (v === 'right-panel' || v === 'side-panel' || v === 'sidepanel') return 'panel';
  if (v === 'full-page') return 'fullpage';
  return SEARCH_DISPLAY_MODES.has(v) ? v : DEFAULT_SEARCH_DISPLAY;
}

const WIDGET_POSITIONS = new Set(['floating', 'bar']);
const DEFAULT_WIDGET_POSITION = 'floating';

function normalizeWidgetPosition(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return WIDGET_POSITIONS.has(v) ? v : DEFAULT_WIDGET_POSITION;
}

/**
 * Widget Styling Config › citationsStyle, as returned by GET
 * /api/v1/widget-styling-configs/{index} — "none" | "chip" | "number" |
 * "link", the same values <lw-blog-overview>'s display-citations takes.
 * Returns null, not a default, for anything missing/unrecognised, so the
 * caller can tell "no value from the backend" apart from an explicit
 * "none" and fall back to the overview-citations attribute (see
 * _resolvedCitations).
 */
const CITATIONS_STYLES = new Set(['none', 'chip', 'number', 'link']);

function normalizeCitationsStyle(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return CITATIONS_STYLES.has(v) ? v : null;
}

function isUnsetThemeValue(value) {
  return value == null || (typeof value === 'string' && !value.trim());
}

/**
 * A fully transparent card colour means "no card surface configured".
 * The card variables are then left unset so each surface falls back to
 * its own default — coloured chips for the question cards, a flat
 * borderless row for the search results.
 */
function isTransparentColor(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'transparent'
      || /^#[0-9a-f]{6}00$/.test(v)
      || /^#[0-9a-f]{3}0$/.test(v)
      || /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*0*\.?0+\s*\)$/.test(v);
}

function copyConfiguredTheme(value) {
  if (Array.isArray(value)) return [...value];
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value).reduce((result, [key, entry]) => {
    if (isUnsetThemeValue(entry)) return result;
    const copied = copyConfiguredTheme(entry);
    if (copied && typeof copied === 'object' && !Array.isArray(copied) && !Object.keys(copied).length) {
      return result;
    }
    result[key] = copied;
    return result;
  }, {});
}

function normalizeCssLength(value) {
  if (typeof value === 'number') return value === 0 ? '0' : `${value}px`;
  const text = String(value).trim();
  if (!text) return '';
  if (/^-?(?:\d+|\d*\.\d+)$/.test(text)) return Number(text) === 0 ? '0' : `${text}px`;
  return text;
}

function normalizeTheme(source = {}) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};

  // Retain nested frontend-only settings while layering mapped backend values
  // over them. Null and empty values mean "use the frontend/default value".
  const normalized = copyConfiguredTheme(source);

  Object.entries(BACKEND_THEME_MAP).forEach(([pascalName, path]) => {
    const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
    const hasPascal = Object.prototype.hasOwnProperty.call(source, pascalName);
    const hasCamel = Object.prototype.hasOwnProperty.call(source, camelName);
    if (!hasPascal && !hasCamel) return;

    const value = hasPascal ? source[pascalName] : source[camelName];
    if (isUnsetThemeValue(value)) return;

    const normalizedValue = BACKEND_LENGTH_FIELDS.has(pascalName)
      ? normalizeCssLength(value)
      : value;

    let target = normalized;
    path.slice(0, -1).forEach(key => {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      target = target[key];
    });
    target[path[path.length - 1]] = normalizedValue;
  });

  return normalized;
}

const GOOGLE_FONT_LOADS = new Map();
const GENERIC_FONT_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji',
  'math', 'fangsong',
]);

function googleFontName(value) {
  const firstFamily = String(value ?? '').split(',')[0].trim();
  const unquoted = firstFamily.replace(/^(['"])(.*)\1$/, '$2').trim();
  if (!unquoted || GENERIC_FONT_FAMILIES.has(unquoted.toLowerCase())) return '';
  return unquoted.replace(/\s+/g, ' ');
}

function fontFamilyStack(value) {
  const name = googleFontName(value);
  if (!name || name.toLowerCase() === 'inter') return "'Inter', sans-serif";
  const escapedName = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapedName}", 'Inter', sans-serif`;
}

function themeFontFamilies(theme) {
  return [...new Set([
    theme.questions?.fontFamily,
    theme.text?.header?.fontFamily,
    theme.text?.subtitle?.fontFamily,
    theme.results?.headings?.fontFamily,
    theme.results?.blogTitle?.fontFamily,
    theme.results?.bodyText?.fontFamily,
  ].map(googleFontName).filter(Boolean))];
}

function loadGoogleFont(value) {
  const name = googleFontName(value);
  if (!name || typeof document === 'undefined' || !document.head) {
    return Promise.resolve(false);
  }

  const key = name.toLowerCase();
  if (GOOGLE_FONT_LOADS.has(key)) return GOOGLE_FONT_LOADS.get(key);

  const encodedName = encodeURIComponent(name).replace(/%20/g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encodedName}:wght@400&display=swap`;
  const promise = new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.lwGoogleFont = name;

    let settled = false;
    const finish = loaded => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(loaded);
    };
    const timeout = setTimeout(() => finish(false), 10000);

    link.addEventListener('load', async () => {
      try {
        if (document.fonts?.load) {
          const cssName = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          await document.fonts.load(`400 1em "${cssName}"`, 'BESbswy');
        }
        finish(true);
      } catch {
        finish(false);
      }
    }, { once: true });
    link.addEventListener('error', () => finish(false), { once: true });
    document.head.append(link);
  });

  GOOGLE_FONT_LOADS.set(key, promise);
  return promise;
}
import '../lw-blog-overview/lw-blog-overview.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-ai-search>
//
// Floating circular button pinned to the bottom-right of the
// viewport. On hover it expands upward into a stack of suggested
// questions plus a primary "Ask Our Blog" call to action.
//
// The panel is sticky: once hover opens it, it stays open until
// the close button (or Escape) dismisses it. Moving the pointer
// away leaves it on screen.
//
// Clicking the circle navigates to `href`. Where there is no
// hover — touch devices, or trigger="click" — the first press
// opens the panel instead and the next one follows the link.
//
// Nothing navigates away. The button, the CTA and every question open
// the search modal this component carries: a full-screen overlay with
// the search field, feature cards and results. A question runs its
// search on open; the button and CTA open it empty.
//
// The modal is built in — no other element or script is needed. It is
// the same screen as <lw-ai-search>, ported here, so the two are
// independent copies: a change to one does not reach the other.
//
// A search now makes exactly one request: POST {search-base}/api/v1/search/
// {search-index}/summary (non-streaming, for the time being — see
// _fetchSummary). It returns both the per-section AI overview and the hits
// used for Further Reading, so the plain POST /api/v1/search/{index}
// endpoint (_fetchResults / _endpoint below) is disabled — its call sites
// are commented out, not removed, in case per-page results search comes
// back. Search-as-you-type is disabled the same way; Enter is the only
// trigger (see _onModalInput / _commitSearch). The streaming
// /summary/stream endpoint (_fetchSummaryStream) is UNUSED right now but
// DO NOT REMOVE — see its own docs.
//
// ATTRIBUTES — search API (same attribute names as <lw-ai-search>):
//   search-base   (String)  API origin — set it on the tag, no default.
//                           Empty means same-origin (/api/v1/search/…).
//   search-key    (String)  X-API-KEY value
//   search-index  (String)  index to search, default "all"
//   semantic-ratio(Number)  0–1 keyword/semantic blend, default 0.5
//   search-placeholder (String) modal input placeholder
//   overview-heading    (String) overview section title, "AI Answer"
//   overview-citations  (String) 'none' | 'number' | 'chip' | 'link',
//                                default 'none' — overridden by Widget
//                                Styling Config's citationsStyle when the
//                                backend returns one (see _resolvedCitations)
//   overview-paragraphs (Array)  fallback paragraphs for
//                                <lw-blog-overview>, used only when the
//                                summary stream returns nothing
//   modal-top     (String)  gap above the modal, e.g. "80px" — use it
//                           to leave a site header visible. Also
//                           settable as --lw-ask-modal-top.
//
// ATTRIBUTES:
//   href        (String)  optional link target for the button and the
//                         questions — the click opens the modal, so it
//                         only matters for middle-click / new tab
//   target      (String)  link target for href, e.g. "_blank"
//   query-param (String)  query key for the question, default "q"
//   cta-label   (String)  primary button label, default "Ask Our Blog"
//                         — the CTA always renders, questions or not
//   cta-href    (String)  if set, the CTA renders as a link
//   cta-target  (String)  link target when cta-href is set
//   trigger     (String)  "hover" (default) | "click"
//   btn-type    (String)  "float" (default) pins the circular button to
//                         the bottom-right of the viewport and expands
//                         the question panel on hover. "bar" pins the
//                         same button (and the same question panel,
//                         same hover/click/href behaviour — nothing
//                         about *what* it does changes) to a bar
//                         spanning the full width of the viewport
//                         instead of a corner. "normal" renders
//                         a plain labelled button in normal document
//                         flow — no hover, no question panel; pressing
//                         it goes straight to href.
//   btn-label   (String)  label for the normal button,
//                         default "Search with AI"
//   btn-subtext (String)  optional line under the normal button
//   open        (Boolean) panel state — reflected, so CSS can target it
//   label       (String)  aria-label for the floating button
//
// EVENTS (all bubble and cross the shadow boundary):
//   lw-ask-toggle    detail: { open }
//   lw-ask-question  detail: { question, index, href } — cancelable;
//                    preventDefault() to handle the click yourself
//   lw-ask-cta       detail: { label, href } — cancelable; call
//                    preventDefault() to suppress cta-href navigation
//   lw-ask-navigate  detail: { href } — cancelable; fired when the
//                    button is pressed, before the modal opens
//   lw-ask-modal-open  detail: { query } — the modal opened
//   lw-ask-modal-close                   — the modal closed
//   lw-ask-results   detail: { query, page, results, total } — after
//                    each successful search request
//
// PUBLIC METHODS:
//   openSearch(query?)  open the modal, optionally running a query
//   closeSearch()       close it
//
// CSS CUSTOM PROPERTIES:
//   --lw-ask-accent        button / CTA fill      (#1E7A4A)
//   --lw-ask-accent-hover  hover fill             (#17603A)
//   --lw-ask-size          button diameter        (46px)
//   --lw-ask-right         distance from right    (24px)
//   --lw-ask-bottom        distance from bottom   (24px)
//   --lw-ask-z             z-index                (900)
//   --lw-ask-close         close glyph colour     (#ffffff)
//   --lw-ask-backdrop      overlay behind the modal  (transparent)
//   --lw-ask-modal-top     gap above the modal       (0)
//   --lw-ask-modal-bg      modal page background     (#f4f4f4)
//   --lw-ask-modal-title-font  hero heading font     (Inter)
// ─────────────────────────────────────────────────────────────

// Only one modal can be up at a time, and Back must close exactly that
// one. A single shared popstate listener owns this: per-instance
// listeners would race, because the history.back() used to close one
// modal arrives after another may already have opened.
let activeModal   = null;
let pendingSelfPop = 0;
let popBound      = false;

function bindPopstate() {
  if (popBound) return;
  popBound = true;
  window.addEventListener('popstate', () => {
    // Swallow the entry we popped ourselves when closing.
    if (pendingSelfPop > 0) { pendingSelfPop--; return; }
    activeModal?._closeFromHistory();
  });
}

export class LwAiSearch extends LitElement {

  // The panel holds four questions at most — any beyond that are ignored.
  static maxQuestions = 4;

  // The bar lays its questions out in one scrollable row, so it seats
  // more of them than the stacked hover panel.
  static maxBarQuestions = 10;

  // The three bar states, in the order their icons appear.
  static barModes = ['search', 'questions', 'scroll'];

  // The fixed state shows this many; the scrolling one shows them all.
  static barFixedQuestions = 4;

  // Search-page cards are large, so only the first four fit the row. Chips
  // wrap freely, so they take everything the backend sends, up to 40 --
  // anything beyond that stops reading as a cloud and buries the results.
  // Chips on the full page are laid out in scrolling rows: ten to a row,
  // or five when that is all there is, so a short list still makes two
  // rows travelling in opposite directions rather than one lonely one.
  // Seconds a row takes to complete one loop, flat regardless of how
  // many questions are in it (or how long they are) so every row reads
  // at the same pace. Multiply the whole thing with --lw-ask-row-speed:
  // 2 for half speed again, 0.5 to double it.
  static chipRowDurationSeconds = 200;

  static chipsPerRow = 10;
  static chipsPerRowShort = 5;

  static maxCardQuestions = 4;
  static maxChipQuestions = 40;

  static properties = {
    // search API config — same attribute names as <lw-ai-search>
    searchBase:  { type: String, attribute: 'search-base'  },
    searchKey:   { type: String, attribute: 'search-key'   },
    searchIndex: { type: String, attribute: 'search-index' },
    semanticRatio: { type: Number, attribute: 'semantic-ratio' },
    searchPlaceholder: { type: String, attribute: 'search-placeholder' },
    theme:            { type: Object },
    // Overview shown above the results, rendered by <lw-blog-overview>
    overviewHeading:    { type: String, attribute: 'overview-heading'    },
    overviewCitations:  { type: String, attribute: 'overview-citations'  },
    overviewParagraphs: { type: Array,  attribute: 'overview-paragraphs' },
    modalTop:          { type: String, attribute: 'modal-top' },

    href:       { type: String                            },
    target:     { type: String                            },
    queryParam: { type: String,  attribute: 'query-param' },
    ctaLabel:   { type: String,  attribute: 'cta-label'  },
    ctaHref:    { type: String,  attribute: 'cta-href'   },
    ctaTarget:  { type: String,  attribute: 'cta-target' },
    trigger:    { type: String                           },
    btnType:    { type: String,  attribute: 'btn-type', reflect: true },
    btnLabel:   { type: String,  attribute: 'btn-label'   },
    widgetStyle:{ type: String,  attribute: 'widget-style' },
    searchDisplay:{ type: String, attribute: 'search-display' },
    // On by default: the card is how a reader of a site running the
    // widget is offered DiscoverAI, so it belongs wherever the widget
    // runs rather than only where someone remembered an attribute.
    //
    // A plain Boolean would read feedback="false" as true -- any attribute
    // at all means present -- and "false" is exactly what a site turning
    // it off would write, so the word is honoured here.
    feedback: {
      type: Boolean,
      converter: {
        fromAttribute: v => v !== null && v !== 'false' && v !== '0' && v !== 'off',
        toAttribute: v => (v ? '' : 'false'),
      },
    },
    feedbackCta:   { type: String, attribute: 'feedback-cta' },
    feedbackCtaPage: { type: String, attribute: 'feedback-cta-page' },
    feedbackUrl:   { type: String, attribute: 'feedback-url' },
    // A hosted form to show instead of the built-in one -- a Formbricks
    // link survey, say. Passed straight through to the card.
    feedbackEmbed: { type: String, attribute: 'feedback-embed' },
    btnSubtext: { type: String,  attribute: 'btn-subtext' },
    label:      { type: String                           },
    open:       { type: Boolean, reflect: true           },
    _dismissed: { state: true                            },

    // modal state — modalOpen is reflected so the host can lift its
    // z-index above the page while the overlay is up
    modalOpen:     { type: Boolean, reflect: true, attribute: 'modal-open' },
    _showFeatures: { state: true },
    _showResults:  { state: true },
    _resultsReady: { state: true },
    _postCommit:   { state: true },
    _feedbackOpen: { state: true },
    _results:      { state: true },
    _loading:      { state: true },
    _noResults:    { state: true },
    _noResultsMsg: { state: true },
    _metaVisible:  { state: true },
    _metaHits:     { state: true },
    _metaTime:     { state: true },
    _inputValue:   { state: true },
    _summaryText:  { state: true },
    _summaryHits:  { state: true },
    // Per-section overview + citations from the non-streaming /summary
    // endpoint (see _fetchSummary / _mapAnswerToParagraphs).
    _summaryParagraphs: { state: true },
    _backendTheme: { state: true },
    _backendQuestions: { state: true },
    // Widget Styling Config › citationsStyle from the same backend config
    // response — see _resolvedCitations.
    _backendCitationsStyle: { state: true },
    // Widget Styling Config › promptType from the same backend config
    // response — forwarded as-is to /summary and /summary/stream, see
    // _fetchSummary / _fetchSummaryStream.
    promptType: { state: true },
    _barMode:      { state: true },
    _barMinimized: { state: true },
    _chipRowCopies: { state: true },
    _displayOverride: { state: true },
    barMode:       { type: String, attribute: 'bar-mode' },
    barPlaceholder:{ type: String, attribute: 'bar-placeholder' },
  };

  // Page size for each search request.
  static pageLimit = 20;

  static styles = css`
    :host {
      position: fixed;
      /* --lw-ask-panel-inset is set while the right panel is open, so this
         element -- fixed like the site's own bars -- is pushed aside too. */
      right:  calc(var(--lw-ask-right, 24px) + var(--lw-ask-panel-inset, 0px));
      bottom: var(--lw-ask-bottom, 24px);
      z-index: var(--lw-ask-z, 900);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-family: 'Inter', sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .ai-search-launcher { display: contents; }

    /* ── Expanding panel ── */
    .panel {
      position: absolute;
      right: 0;
      bottom: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      /* keeps the pointer inside the host while it travels
         between the button and the pills */
      padding-bottom: 12px;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.18s ease, visibility 0.18s;
    }

    :host([open]) .panel {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    /* ── Close button ── */
    .close {
      appearance: none;
      border: none;
      margin-bottom: 2px;
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.22);
      color: var(--lw-ask-close, #ffffff);
      cursor: pointer;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.2s ease,
                  transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                  background 0.15s;
      transition-delay: var(--d, 0ms);
    }
    .close:hover { background: rgba(0, 0, 0, 0.38); }
    :host([open]) .close { opacity: 1; transform: none; }

    /* ── Suggestion pills ── */
    .pill {
      appearance: none;
      font: inherit;
      /* Widget › Questions styles these chips as well as the modal's
         question cards. The CTA re-declares its own colours below, so it
         keeps following Widget › Button. */
      font-family: var(--lw-ai-question-font, 'Inter', sans-serif);
      font-size: 12.5px;
      font-weight: 500;
      line-height: 1.2;
      color: var(--lw-ai-question-color, #1f2937);
      background: var(--lw-ai-question-bg, #ffffff);
      border: 1px solid rgba(17, 17, 17, 0.06);
      /* Widget › Button › Corner Radius. Falls back to the fully
         rounded chip when nothing is configured. */
      border-radius: var(--lw-ai-corner-radius, 999px);
      padding: 8px 15px;
      max-width: min(340px, calc(100vw - 3rem));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.13);
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.22s ease,
                  transform 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                  box-shadow 0.15s, background 0.15s;
      transition-delay: var(--d, 0ms);
    }

    :host([open]) .pill { opacity: 1; transform: none; }

    .pill:hover {
      /* Darken whatever the themed background is, rather than forcing a
         fixed near-white that would ignore Widget › Questions. */
      background: var(--lw-ai-question-bg, #fbfbfb);
      filter: brightness(0.97);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    }

    .pill:focus-visible {
      outline: 2px solid var(--lw-ask-accent, #1A1A1A);
      outline-offset: 2px;
    }

    /* ── Primary CTA ── */
    .cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-weight: 600;
      color: var(--lw-ai-button-color, #ffffff);
      background: var(--lw-ai-button-bg, var(--lw-ask-accent, #1A1A1A));
      border: var(--lw-ai-button-outline-width, 0px) solid var(--lw-ai-button-outline, transparent);
    }
    .cta:hover { background: var(--lw-ai-button-bg, var(--lw-ask-accent-hover, #1A1A1A)); }
    .cta svg   { flex-shrink: 0; }

    /* ── Floating button ── */
    .fab {
      appearance: none;
      border: none;
      width:  var(--lw-ask-size, 46px);
      height: var(--lw-ask-size, 46px);
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--lw-ai-widget-icon-color, #000000);
      /* The floating widget is themed by the *widget* settings; the
         button settings stay on the CTA / inline button. */
      background: var(--lw-ai-widget-bg, var(--lw-ask-accent, #ffffff));
      cursor: pointer;
      text-decoration: none;
      box-sizing: border-box;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
      transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1),
                  box-shadow 0.18s, background 0.15s;
    }

    .fab:hover,
    :host([open]) .fab {
      transform: translateY(-1px) scale(1.05);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
    }

    .fab:focus-visible {
      outline: 2px solid var(--lw-ai-widget-bg, var(--lw-ask-accent, #1A1A1A));
      outline-offset: 3px;
    }

    /* sized in % so the icon tracks --lw-ask-size */
    .fab-icon {
      width: 90%;
      height: 90%;
    }

    /* Widget Style "icon-text": the launcher grows into a labelled pill.
       "icon" -- the only other allowed value -- keeps the circle above. */
    .fab[data-style="icon-text"] {
      width: auto;
      height: auto;
      min-height: var(--lw-ask-size, 46px);
      border-radius: 999px;
      grid-auto-flow: column;
      gap: 8px;
      padding: 0 18px;
    }

    .fab[data-style="icon-text"] .fab-icon {
      width:  var(--lw-ask-icon-size, 22px);
      height: var(--lw-ask-icon-size, 22px);
    }

    .fab-label {
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      color: inherit;
    }

    /* ── Bar mode: btn-type="bar" ──
       widget.position = "bar" swaps the corner launcher for a strip
       across the bottom of the viewport: the search icon, the suggested
       questions laid out in a row, and the CTA at the far end. Nothing
       needs to be revealed — every question is already on screen — so
       this mode renders its own markup instead of the .fab/.panel pair,
       and neither hover nor the two-tap flow applies to it. */
    :host([btn-type="bar"]) {
      left: 0;
      right: var(--lw-ask-panel-inset, 0px);
      bottom: 0;
      width: auto;
    }

    /* The bar and its minimize tab share a wrapper so the tab can sit
       above the bar's top edge and stay put once the bar is hidden. */
    .bar-wrap {
      position: relative;
      width: 100%;
    }

    .bar-toggle {
      position: absolute;
      right: var(--lw-ask-bar-toggle-right, 28px);
      bottom: 100%;
      appearance: none;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 7px 10px 5px;
      border-radius: 10px 10px 0 0;
      background: var(--lw-ai-widget-bg, #ffffff);
      /* Widget › Icon Colour, the same setting behind the mode icons and
         the floating button's glyph. Slightly recessive at rest, since
         the tab is a secondary control, and full strength on hover. */
      color: var(--lw-ask-bar-toggle-color,
             var(--lw-ai-widget-icon-color, rgba(17, 17, 17, 0.9)));
      opacity: var(--lw-ask-bar-toggle-opacity, 0.6);
      cursor: pointer;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.10);
      transition: color 0.15s, opacity 0.15s;
    }
    .bar-toggle:hover { opacity: var(--lw-ask-bar-toggle-opacity-hover, 1); }
    .bar-toggle svg { width: 20px; height: 20px; display: block; }
    .bar-toggle:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: -2px;
    }

    /* Minimized: the strip itself goes, the tab stays as the way back. */
    .bar-wrap.is-minimized .bar { display: none; }

    .bar {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      min-height: var(--lw-ask-bar-height, 64px);
      padding: 0 16px;
      box-sizing: border-box;
      /* Widget settings paint the strip, the same way they paint the
         floating button; Questions settings paint the chips inside it
         and Button settings the CTA, both by way of .pill / .cta. */
      background: var(--lw-ai-widget-bg, #ffffff);
      color: var(--lw-ai-widget-icon-color, #000000);
      border-radius: var(--lw-ask-bar-radius, 0);
      /* the fab's shadow points down, for a circle floating above the
         page — a bar flush with the bottom edge wants it upward */
      box-shadow: 0 -8px 20px rgba(0, 0, 0, 0.16);
    }

    .bar-icon {
      appearance: none;
      border: none;
      background: none;
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .bar-icon .fab-icon {
      width:  var(--lw-ask-bar-icon-size, 22px);
      height: var(--lw-ask-bar-icon-size, 22px);
    }
    .bar-icon:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
      border-radius: 6px;
    }

    .bar-helper {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .bar-divider {
      flex: none;
      width: 1px;
      align-self: stretch;
      margin: 14px 0;
      background: var(--lw-ask-bar-divider, rgba(17, 17, 17, 0.12));
    }

    /* ── The three bar states ──
       The icon group on the left switches between them: a search field,
       the first four questions, or every question scrolling past. */
    .bar-modes {
      flex: none;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .bar-mode {
      appearance: none;
      border: none;
      background: none;
      display: inline-flex;
      padding: 4px;
      /* Widget › Icon Colour, the same setting that paints the floating
         button's glyph. The resting icons are dimmed rather than given a
         colour of their own, so the active one still reads as selected
         once both come from the theme. */
      color: var(--lw-ask-bar-mode-color,
             var(--lw-ai-widget-icon-color, rgba(17, 17, 17, 0.9)));
      opacity: var(--lw-ask-bar-mode-opacity, 0.5);
      cursor: pointer;
      transition: color 0.15s, opacity 0.15s;
    }
    .bar-mode svg { width: 18px; height: 18px; }
    .bar-mode:hover { opacity: var(--lw-ask-bar-mode-opacity-hover, 0.75); }

    /* Every icon in the bar is Widget › Icon Colour; the lit one is the
       one at full strength, the others a step back. Colour cannot do that
       job here -- the Button colour it used to take is the bar's own
       colour on a site that paints both the same, and the icon vanished. */
    .bar-mode[aria-pressed="true"] {
      color: var(--lw-ask-bar-mode-active,
             var(--lw-ask-bar-mode-color,
             var(--lw-ai-widget-icon-color, rgba(17, 17, 17, 0.9))));
      opacity: 1;
    }
    .bar-mode:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
      border-radius: 5px;
    }

    /* Whatever the active state renders sits here, between the icons and
       the CTA, and is the only part that flexes. */
    .bar-body {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 8px 0;
    }

    /* state 1: search */
    .bar-form {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      max-width: var(--lw-ask-bar-search-width, 420px);
      /* A flex item's automatic minimum is its content width, which for a
         field with a long placeholder is wider than a phone can spare --
         the field would then push out over the CTA instead of shrinking. */
      min-width: 0;
      height: 34px;
      padding: 0 14px;
      border: 1px solid var(--lw-ask-bar-divider, rgba(17, 17, 17, 0.12));
      border-radius: 999px;
      background: var(--lw-ask-bar-search-bg, #ffffff);
    }
    .bar-form:focus-within {
      border-color: var(--lw-ai-button-bg, var(--lw-ask-accent, #1A1A1A));
    }
    .bar-form svg { width: 15px; height: 15px; flex: none; opacity: 0.5; }
    .bar-form input {
      flex: 1;
      min-width: 0;
      /* the placeholder trails off rather than being cut mid-word */
      text-overflow: ellipsis;
      border: none;
      outline: none;
      background: transparent;
      font-family: var(--lw-ai-question-font, 'Inter', sans-serif);
      font-size: 12.5px;
      color: var(--lw-ai-search-color, #1a1a1a);
    }
    .bar-form input::placeholder { color: var(--lw-ai-search-placeholder, #9aa1a8); }

    /* state 2: the first four questions, sitting still */
    .bar-fixed {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-width: 0;
      overflow: hidden;
    }

    /* state 3: every question, scrolling past continuously. The track
       holds the list twice so the reset at -50% is seamless. */
    .bar-marquee {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 40px,
                          #000 calc(100% - 40px), transparent);
              mask-image: linear-gradient(90deg, transparent, #000 40px,
                          #000 calc(100% - 40px), transparent);
    }
    .bar-track {
      display: flex;
      align-items: center;
      gap: 10px;
      width: max-content;
      animation: lw-bar-scroll var(--lw-ask-bar-scroll-duration, 84s) linear infinite;
    }
    .bar-marquee:hover .bar-track { animation-play-state: paused; }
    @keyframes lw-bar-scroll {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }

    /* .pill is written for the floating panel, where it animates in from
       hidden and carries a drop shadow. In the bar it is simply always
       there, sitting on the bar's own surface. */
    .bar .pill {
      flex: none;
      opacity: 1;
      transform: none;
      transition-delay: 0ms;
      box-shadow: none;
      font-size: 12px;
      padding: 7px 14px;
    }

    .bar > .cta { flex: none; }

    @media (prefers-reduced-motion: reduce) {
      .bar-track { animation: none; }
      .bar-marquee { overflow-x: auto; }
    }

    @media (max-width: 640px) {
      .bar { gap: 10px; padding: 0 10px; }
      .bar-helper,
      .bar-divider { display: none; }
    }

    /* ── Phones ──
       There is no room to seat a row of questions beside the CTA, so the
       icons stack into a narrow column, a single question takes the space
       between them and the CTA, and it wraps onto a second line rather
       than being clipped. */
    @media (max-width: 560px) {
      .bar {
        gap: 8px;
        padding: 8px 10px;
        min-height: 0;
        flex-wrap: nowrap;
        border-radius: var(--lw-ask-bar-radius-mobile, 14px 14px 0 0);
      }

      .bar-modes {
        flex-direction: column;
        gap: 3px;
        /* the column is taller than one row of icons, so the bar has to be
           free to grow with it rather than centre-overflow its own box */
        align-self: center;
      }
      .bar-mode { padding: 2px; }
      .bar-mode svg { width: 14px; height: 14px; }

      .bar-body { padding: 0; }

      /* Only the first question fits; the rest stay in the DOM for the
         scrolling state, which still shows them all. */
      .bar-fixed .pill:nth-child(n + 2) { display: none; }

      .bar-fixed .pill,
      .bar-track .pill {
        /* two lines, centred, instead of one clipped line */
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
        max-width: 100%;
        padding: 6px 12px;
        font-size: 11.5px;
        line-height: 1.25;
      }
      .bar-fixed { flex: 1 1 auto; }

      .bar > .cta {
        padding: 8px 12px;
        font-size: 12px;
      }
      .bar > .cta svg { width: 13px; height: 13px; }

      .bar-toggle { right: 14px; padding: 5px 9px 4px; }
      .bar-toggle svg { width: 17px; height: 17px; }
    }

    /* ── Inline mode: btn-type="normal" ──
       A plain labelled button in normal document flow. No hover panel
       and no question pills — pressing it goes straight to href. */
    :host([btn-type="normal"]),
    :host([btn-type="btn-normal"]) {
      position: static;
      right: auto;
      bottom: auto;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      vertical-align: middle;
    }

    .btn {
      appearance: none;
      border: var(--lw-ai-button-outline-width, 0px) solid var(--lw-ai-button-outline, transparent);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--lw-ask-btn-gap, 8px);
      width: var(--lw-ask-btn-width, auto);
      padding: var(--lw-ask-btn-padding, 13px 22px);
      border-radius: var(--lw-ai-corner-radius, var(--lw-ask-btn-radius, 6px));
      background: var(--lw-ai-button-bg, var(--lw-ask-accent, #1A1A1A));
      color: var(--lw-ai-button-color, #ffffff);
      font: inherit;
      font-size: var(--lw-ask-btn-font-size, 16px);
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
      position: relative;
      z-index: 1;
      touch-action: manipulation;
      transition: background 0.15s, transform 0.1s;
    }

    .btn:hover  { background: var(--lw-ai-button-bg, var(--lw-ask-accent-hover, #1A1A1A)); }
    .btn:active { transform: scale(0.97); }

    .btn:focus-visible {
      outline: 2px solid var(--lw-ai-button-outline, var(--lw-ask-accent, #1A1A1A));
      outline-offset: 3px;
    }

    .btn svg {
      width:  var(--lw-ask-btn-icon-size, 18px);
      height: var(--lw-ask-btn-icon-size, 18px);
      flex-shrink: 0;
    }

    .btn-subtext {
      margin: var(--lw-ask-subtext-margin-top, 8px) 0 0;
      font-size: var(--lw-ask-subtext-font-size, 12px);
      color: var(--lw-ask-subtext-color, #777);
      text-align: center;
    }

    /* ══════════════════════════════════════════════════════════
       SEARCH MODAL
       Ported from <lw-ai-search>; this component now owns it.
       ══════════════════════════════════════════════════════════ */

    /* The floating host is a stacking context (fixed + z-index), so it
       would trap the overlay underneath the page. Lift it while open. */
    :host([modal-open]) { z-index: 2147483000; }

    /* While the search is up, the launcher steps out of the way: the bar
       would otherwise sit alongside the right panel competing with it, and
       under the full-page modal it is not visible anyway. The inline
       button (btn-type="normal") is left alone — it lives in the page's
       own flow, and hiding it would collapse the space it occupies.
       Nothing is remembered here, so closing the panel brings the
       launcher straight back, minimized or not, as it was. */
    :host([modal-open]) .bar-wrap,
    :host([modal-open]) .fab,
    :host([modal-open]) .panel { display: none; }

    /* Scoped reset — deliberately not a bare * so the button and pills
       above keep their own box model. :where() keeps the margin reset at
       zero specificity so the rules below can still set their spacing. */
    #ai-search-overlay, #ai-search-overlay * { box-sizing: border-box; }
    :where(#ai-search-overlay) :where(h1, h3, h4, p) { margin: 0; }

    #ai-search-overlay {
      display: none;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      /* Transparent by default so the page shows through the gap left
         by modal-top. Set --lw-ask-backdrop to dim it again, e.g.
         rgba(0, 0, 0, 0.5). */
      background: var(--lw-ask-backdrop, transparent);
      z-index: 99999;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
      text-align: initial;
      /* Do not inherit the host page's text colour: the search icon
         draws with currentColor and would vanish on a dark site. */
      color: #0f1724;
      font-family: 'Inter', sans-serif;
    }

    #ai-search-overlay.open { display: flex; }

    /* ── Right panel ──
       searchDisplayMode = "panel". The overlay stops covering the viewport
       and becomes a column down the right edge; _pushPage squeezes the host
       page into what is left, so the two sit side by side rather than one
       over the other. */
    #ai-search-overlay.as-panel {
      left: auto;
      top: 0;
      right: 0;
      bottom: 0;
      width: var(--lw-ask-panel-width, 400px);
      max-width: 100vw;
      height: 100%;
      background: none;
      overflow: hidden;
    }

    /* The panel itself never scrolls: it is a column with a fixed head
       (logo, title, search field) and one scrolling region below --
       the questions, or the results once a search has run. Scrolling the
       whole panel instead would carry the search field off the top. */
    #ai-search-overlay.as-panel #ai-search-modal,
    #ai-search-overlay.as-panel #ai-search-modal.post-commit {
      width: 100%;
      height: 100%;
      margin-top: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 56px 0 32px;
      border-left: 1px solid rgba(20, 20, 26, 0.10);
      box-shadow: -8px 0 30px rgba(20, 20, 26, 0.10);
      /* slides in from the edge rather than appearing in place */
      transform: translateX(101%);
      transition: transform 0.28s ease;
    }
    #ai-search-overlay.as-panel.open #ai-search-modal { transform: translateX(0); }

    /* Everything inside was laid out for a 960px hero; at panel width it
       needs the space back. */
    #ai-search-overlay.as-panel .hero {
      padding: 18px 16px 8px;
      /* Before a search, this box owns the spare room and hands it to
         .suggested, which scrolls inside it -- so the head above stays
         put however many questions there are. */
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    /* The head stays put; only what follows it moves. */
    #ai-search-overlay.as-panel .hero h1,
    #ai-search-overlay.as-panel .hero > p,
    #ai-search-overlay.as-panel .search-bar { flex: none; }

    /* Once results are up, .suggested is gone and the room belongs to
       them instead. The hero is pinned to its own height here: left able
       to shrink, a tall result list would squeeze it below its head and
       the search field would spill out over the answer. */
    #ai-search-overlay.as-panel #ai-search-modal.post-commit .hero {
      flex: 0 0 auto;
    }

    #ai-search-overlay.as-panel .suggested,
    #ai-search-overlay.as-panel .modal-results {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    #ai-search-overlay.as-panel .hero h1 { font-size: 20px; }
    #ai-search-overlay.as-panel .hero > p { margin-bottom: 18px; font-size: 12.5px; }
    #ai-search-overlay.as-panel .search-input-wrapper { max-width: 100%; --lw-field-pad: 8px; }
    /* The switcher and the close button sit in the same corner at panel
       width as at page width, so the centred logo gets what is left
       between them rather than running underneath. */
    #ai-search-overlay.as-panel .client-logo { top: 16px; width: 110px; height: 30px; }
    #ai-search-overlay.as-panel .client-logo-placeholder { width: 100%; height: 100%; }
    /* At panel width a result row is a narrow column, and three lines of
       excerpt under every title pushed the next result off the screen.
       The titles and their meta stay; the excerpt goes. Custom properties
       cross the shadow boundary, so this reaches <lw-blog-list-item>
       inside <lw-blog-list> without either of them knowing about the
       panel. Full page keeps its excerpts. */
    #ai-search-overlay.as-panel .modal-results {
      max-width: 100%;
      padding: 0 16px;
      --pl-excerpt-display: none;
    }
    #ai-search-overlay.as-panel .suggested { margin-top: 22px; }
    #ai-search-overlay.as-panel .suggested-cards { grid-template-columns: 1fr; gap: 8px; }
    #ai-search-overlay.as-panel .suggested-card { min-height: 0; padding: 12px; }
    #ai-search-overlay.as-panel .suggested-chips { max-width: 100%; }
    #ai-search-overlay.as-panel .further-reading { margin: 18px 0 10px; font-size: 15px; }

    /* The card is fixed to the foot of the panel, the full width of it,
       and rises over the results rather than pushing them aside -- it is
       asked for, and dismissable, so it must not move the reading. It
       covers the button that opened it and the badge beside it: they are
       the way in, and there is no use for either while the form is up. */
    /* ── Full page ──
       A small card of its own in the bottom corner, above the badge,
       rather than a bar across the foot: the full page has no foot to
       put one on, and a strip across a whole screen would read as part
       of the site rather than as an offer from the search. */
    .page-cta {
      position: fixed;
      right: 24px;
      bottom: 74px;
      z-index: 3;
      appearance: none;
      border: none;
      width: 132px;
      padding: 10px 12px 12px;
      border-radius: 10px;
      background: var(--lw-ai-button-bg, var(--lw-ask-accent, #1A1A1A));
      color: var(--lw-ai-button-color, #ffffff);
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.35;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(16, 18, 27, 0.18);
    }
    .page-cta:hover { filter: brightness(0.95); }
    .page-cta:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    .page-cta svg { display: block; width: 14px; height: 14px; margin-bottom: 6px; }

    /* The page behind the sheet steps back while the form is up, and
       takes a click to close -- the same way out as the card's own ×. */
    .feedback-scrim {
      position: fixed;
      inset: 0;
      z-index: 3;
      background: rgba(16, 18, 27, 0.45);
    }

    .feedback-card {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 3;
      /* square where it meets the panel's edges, round where it does not */
      --lw-fb-radius: 16px 16px 0 0;
      --lw-fb-shadow: 0 -10px 30px rgba(16, 18, 27, 0.16);
      --lw-fb-max-height: calc(100% - 40px);
    }

    /* Full page: the same card, across the foot of the viewport, wide
       enough for the form to stand in two columns. */
    #ai-search-overlay:not(.as-panel) .feedback-card {
      position: fixed;
      z-index: 4;
      --lw-fb-radius: 18px 18px 0 0;
      --lw-fb-max-height: calc(100vh - 80px);
    }

    /* the badge is fixed to the viewport in full-page mode, which would
       leave it out on the squeezed page rather than inside the panel */
    /* Anchored to the panel, not to the scrolling results inside it. */
    #ai-search-overlay.as-panel .powered-by {
      position: absolute;
      right: 16px;
      bottom: 12px;
    }

    /* With the call to action there, the panel ends in a footer instead:
       the badge centred on a bar of its own, the button under it. Both
       are pinned to the panel, so they stay put while the results move. */
    #ai-search-overlay.as-panel.has-cta .powered-by {
      left: 0;
      right: 0;
      bottom: var(--lw-ask-cta-height, 46px);
      display: flex;
      justify-content: center;
      padding: 9px 0;
      background: var(--lw-ai-page-bg, var(--lw-ask-modal-bg, #f4f4f4));
      border-top: 1px solid rgba(20, 20, 26, 0.08);
    }

    .panel-cta {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      appearance: none;
      border: none;
      height: var(--lw-ask-cta-height, 46px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--lw-ai-button-bg, var(--lw-ask-accent, #1A1A1A));
      color: var(--lw-ai-button-color, #ffffff);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .panel-cta:hover { filter: brightness(0.95); }
    .panel-cta:focus-visible { outline: 2px solid currentColor; outline-offset: -4px; }
    .panel-cta svg { width: 15px; height: 15px; }

    /* Room for the footer, so the last result is not left under it. */
    #ai-search-overlay.as-panel.has-cta #ai-search-modal,
    #ai-search-overlay.as-panel.has-cta #ai-search-modal.post-commit {
      /* the button, plus the badge row above it */
      padding-bottom: calc(var(--lw-ask-cta-height, 46px) + 56px);
    }
    #ai-search-overlay.as-panel .powered-by svg,
    #ai-search-overlay.as-panel .powered-by img {
      width: var(--lw-ask-powered-width, 120px);
    }

    @media (max-width: 560px) {
      /* no room to squeeze a phone; the panel takes the screen */
      #ai-search-overlay.as-panel { width: 100vw; }
    }

    #ai-search-modal {
      width: 100%;
      max-width: 100%;
      /* Top gap set from the tag (modal-top / --lw-ask-modal-top), for
         leaving a site header visible above the modal. The height is
         reduced by the same amount so the panel still ends at the
         bottom of the viewport instead of overflowing it. */
      margin-top: var(--lw-ask-modal-top, 0px);
      height: calc(100% - var(--lw-ask-modal-top, 0px));
      overflow-x: hidden;
      overflow-y: auto;
      background: var(--lw-ai-page-bg, var(--lw-ask-modal-bg, #f4f4f4));
      position: relative;
      padding: 70px 0 80px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Detail view ── */
    /* Once a search has run the modal scrolls as a normal page. */
    #ai-search-modal.post-commit {
      display: block;
      overflow-y: scroll;
    }

    #ai-search-close {
      position: absolute;
      top: 16px;
      right: 20px;
      background: none;
      border: none;
      font-size: 40px;
      color: var(--lw-ai-close-color, #aaa);
      cursor: pointer;
      line-height: 1;
      padding: 4px 8px;
    }
    #ai-search-close:hover { color: #333; }

    /* Layout switcher: both options are on screen, the active one lit,
       so it reads as a choice rather than a button that does something
       unnamed. Neutral greys, so it sits on a light or a dark panel
       without being told which. Full page on the left, side panel on
       the right, matching where each one puts the search on screen.

       It keeps one size and one place in both layouts -- it is measured
       from the modal, which fills the panel as well as the page -- so
       switching does not move the control the user just pressed. The
       close button beside it is left alone for the same reason. */
    #ai-search-display {
      position: absolute;
      top: 20px;
      right: 66px;
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border-radius: 999px;
      background: var(--lw-ask-switch-track, rgba(128, 128, 128, 0.16));
      line-height: 0;
    }

    .display-option {
      appearance: none;
      border: none;
      background: none;
      display: flex;
      padding: 5px 9px;
      border-radius: 999px;
      color: var(--lw-ai-close-color, #aaa);
      opacity: 0.7;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
    }
    .display-option svg { width: 16px; height: 16px; }
    .display-option:hover { opacity: 1; }

    .display-option[aria-pressed="true"] {
      background: var(--lw-ask-switch-thumb, rgba(128, 128, 128, 0.32));
      opacity: 1;
    }
    .display-option:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: -2px;
    }

    @media (max-width: 560px) {
      #ai-search-display { display: none; }
    }

    /* ── Modal head ──
       The logo, the layout switcher and the close button, held above the
       modal rather than inside it. In full page the modal is the thing
       that scrolls: a head inside it went away with the first screenful,
       leaving a reader halfway down an answer with no visible way out.
       Fixed to the viewport -- offset by modal-top, so it still clears a
       site header left showing above the modal -- it stays put while the
       answer moves under it.

       The box itself is a zero-height rail at the top: the three controls
       keep the absolute offsets they always had, now measured from here.
       It does not take clicks, only its controls do, so the page behind
       is still reachable where the head is empty. */
    .modal-head {
      position: fixed;
      top: var(--lw-ask-modal-top, 0px);
      left: 0;
      right: 0;
      height: 0;
      z-index: 2;
      pointer-events: none;
    }
    .modal-head > * { pointer-events: auto; }

    /* A short fade in the modal's own colour, so text passing underneath
       reaches the controls already faint instead of colliding with them. */
    .modal-head::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      /* Solid as far down as the tallest control reaches (the logo ends
         at 72px), then out by 120px. */
      height: 120px;
      background: linear-gradient(
        to bottom,
        var(--lw-ai-page-bg, var(--lw-ask-modal-bg, #f4f4f4)) 0,
        var(--lw-ai-page-bg, var(--lw-ask-modal-bg, #f4f4f4)) 76px,
        transparent 120px);
      pointer-events: none;
    }

    /* The panel does not scroll -- it has its own fixed head and one
       scrolling region below -- so there is nothing to fade, and nothing
       to stay clear of. It rides in on the panel's own slide instead. */
    #ai-search-overlay.as-panel .modal-head {
      position: absolute;
      transform: translateX(101%);
      transition: transform 0.28s ease;
    }
    #ai-search-overlay.as-panel.open .modal-head { transform: translateX(0); }
    #ai-search-overlay.as-panel .modal-head::before { display: none; }

    /* Brand logo shown at the top of the search modal. */
    .client-logo {
      position: absolute;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      width: 180px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .client-logo img {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .client-logo-placeholder {
      width: 150px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: 1px dashed #c8cdd3;
      border-radius: 5px;
      color: #9aa1a8;
      font-size: 11px;
      letter-spacing: .02em;
    }
    .client-logo-placeholder svg { width: 16px; height: 16px; }

    /* ── Hero ── */
    .hero {
      /* A definite width, so the hero does not shrink-wrap its widest
         child. Without it the search box would narrow whenever there
         are few question cards, or none at all. */
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      padding: 30px 10px 30px;
    }

    .hero h1 {
      font-size: 34px;
      font-weight: 600;
      font-family: var(--lw-ask-modal-title-font, var(--lw-ai-header-font, 'Inter', sans-serif));
      color: var(--lw-ai-header-color, #1a1a1a);
      letter-spacing: -0.01em;
    }

    .hero > p {
      margin-top: 6px;
      margin-bottom: 34px;
      font-size: 14px;
      font-family: var(--lw-ai-subtitle-font, 'Inter', sans-serif);
      color: var(--lw-ai-subtitle-color, #6b7280);
    }

    /* ── Search bar ── */
    .search-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }

    .search-input-wrapper {
      /* One line by default, two when the question needs them -- long
         questions used to run off the end of the field, out of sight of
         the person still typing. The field grows to the second line and
         stops there; a third scrolls inside it, so the questions below
         never get pushed off a phone screen.

         The two numbers the height is built from live here, so the panel
         (a shorter field) only has to change the padding. The padding is
         a pixel short of round because the 1px border below counts into
         the height as well: 22 + 13 + 13 + 2 = the 50px this field has
         always been. */
      --lw-field-line: 22px;
      --lw-field-pad: 13px;
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 520px;
      min-height: calc(var(--lw-field-line) + var(--lw-field-pad) * 2 + 2px);
      margin: 0 auto;
      padding: 0 16px;
      border: 1px solid #e5e5e5;
      border-radius: 999px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .search-input-wrapper:focus-within {
      border-color: var(--lw-ask-accent, #1E7A4A);
    }

    .search-input-wrapper svg {
      width: 18px;
      height: 18px;
      opacity: 0.55;
    }

    .search-input-wrapper textarea {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      font-family: inherit;
      font-size: 15px;
      line-height: var(--lw-field-line);
      padding: var(--lw-field-pad) 7px;
      color: var(--lw-ai-search-color, #0f172a);
      /* A textarea, only because an input cannot wrap. It is still a
         single-line field in every other way: no resize handle, no
         newlines (Enter searches), and its height is set from its
         content by _autoSizeInput. */
      display: block;
      resize: none;
      overflow: hidden;
      max-height: calc(var(--lw-field-line) * 2 + var(--lw-field-pad) * 2);
    }
    .search-input-wrapper textarea::placeholder {
      color: var(--lw-ai-search-placeholder, #9aa1a8);
    }

    .clear-btn {
      border: none;
      background: none;
      display: flex;
      justify-content: center;
      padding: 4px;
      cursor: pointer;
    }
    .clear-btn svg { width: 16px; height: 16px; opacity: 0.55; }
    .clear-btn.is-hidden { visibility: hidden; pointer-events: none; }

    /* ── Suggested queries — chips built from the questions attribute ──
       The row wraps inside the hero's 960px, so however many questions
       the backend returns, the cloud stays inside the modal instead of
       running off both edges. */
    .suggested {
      margin-top: 40px;
    }

    .suggested-cards {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;
      max-width: 900px;
      margin: 0 auto;
    }

    .suggested-card {
      appearance: none;
      min-width: 0;
      min-height: 104px;
      padding: 16px;
      border: none;
      border-radius: var(--lw-ai-card-radius, var(--lw-ai-corner-radius, 8px));
      background: var(--lw-ai-card-bg, #ffffff);
      color: var(--lw-ai-card-color, #1a1a1a);
      font: inherit;
      font-family: var(--lw-ai-question-font, 'Inter', sans-serif);
      font-size: 13.5px;
      line-height: 1.45;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
    }

    .suggested-card:hover {
      background: var(--lw-ai-card-bg, #ffffff);
      filter: brightness(0.97);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.10);
    }
    .suggested-card:active { transform: scale(0.98); }
    .suggested-card:focus-visible {
      outline: 2px solid var(--lw-ai-card-color, #1a1a1a);
      outline-offset: 2px;
    }
    .suggested-card svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .suggested-label {
      margin: 0 0 14px;
      font-family: var(--lw-ai-subtitle-font, 'Inter', sans-serif);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--lw-ai-subtitle-color, #6b7280);
    }

    .suggested-chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      max-width: 820px;
      margin: 0 auto;
    }

    /* ── Travelling chip rows (full page) ──
       Each row carries its questions twice so the reset at -50% lands on
       an identical frame, and alternate rows run in opposite directions.
       Full-bleed out of the hero's 960px, since the travel only reads
       when the row is wider than the text above it. */
    .suggested-rows {
      width: 100vw;
      margin-left: calc(50% - 50vw);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .suggested-marquee {
      overflow: hidden;
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 80px,
                          #000 calc(100% - 80px), transparent);
              mask-image: linear-gradient(90deg, transparent, #000 80px,
                          #000 calc(100% - 80px), transparent);
    }

    .suggested-track {
      display: flex;
      align-items: center;
      gap: 10px;
      width: max-content;
      animation: lw-row-scroll var(--lw-row-duration, 50s) linear infinite;
    }

    /* Travels exactly one copy of the questions, whatever number of copies
       the row needed to cover the screen, so the reset is invisible. */
    @keyframes lw-row-scroll {
      from { transform: translateX(0); }
      to   { transform: translateX(var(--lw-row-shift, -50%)); }
    }

    /* lw-bar-scroll runs 0 -> -50%, which reads right to left; the first
       row and every other one after it plays that backwards. */
    .suggested-marquee.is-ltr .suggested-track { animation-direction: reverse; }

    /* The gap belongs between chips, not after the last one, or it shows
       up as a seam at the join. */
    .suggested-track > .suggested-chip:last-child { margin-right: 0; }

    /* Stop under the pointer so a chip can actually be clicked. */
    .suggested-marquee:hover .suggested-track,
    .suggested-marquee:focus-within .suggested-track {
      animation-play-state: paused;
    }

    .suggested-rows .suggested-chip { flex: none; }

    @media (prefers-reduced-motion: reduce) {
      .suggested-track { animation: none; }
      .suggested-marquee { overflow-x: auto; }
    }

    .suggested-chip {
      appearance: none;
      /* Search Page › Card drives the chips; Widget › Questions styles
         the hover-panel pills instead. Card has no font setting of its
         own, so the Questions font still applies to the text. */
      border: 1px solid var(--lw-ai-card-border, rgba(17, 17, 17, 0.08));
      border-radius: var(--lw-ai-card-radius, var(--lw-ai-corner-radius, 999px));
      /* No accent link here: the chips follow Search Page › Card, so with
         no card surface configured they use this neutral default rather
         than the widget accent. */
      background: var(--lw-ai-card-bg, #ffffff);
      color: var(--lw-ai-card-color, #1f2937);
      /* One line, clipped with an ellipsis rather than wrapping -- a
         wrapped chip would grow taller than its row and break the
         travelling rows' alignment. ch caps it at ~100 characters of
         visible text before the ellipsis takes over. */
      max-width: min(100%, 100ch);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      padding: 9px 16px;
      font: inherit;
      font-family: var(--lw-ai-question-font, 'Inter', sans-serif);
      font-size: 13.5px;
      line-height: 1.4;
      text-align: center;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
    }

    .suggested-chip:hover {
      /* Darken the themed chip colour rather than replacing it. */
      background: var(--lw-ai-card-bg, #ffffff);
      filter: brightness(0.97);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.10);
    }
    .suggested-chip:active { transform: scale(0.98); }
    .suggested-chip:focus-visible {
      outline: 2px solid var(--lw-ai-card-color, #1a1a1a);
      outline-offset: 2px;
    }

    /* ── Powered by ── */
    /* The badge is a single supplied lockup — wordmark and logo are
       inside the SVG, so nothing here sets type. */
    .powered-by {
      position: fixed;
      right: 24px;
      bottom: 18px;
      line-height: 0;
      pointer-events: none;
    }

    .powered-by svg {
      display: block;
      width: var(--lw-ask-powered-width, 162px);
      height: auto;
    }
    .powered-by img {
      display: block;
      width: var(--lw-ask-powered-width, 162px);
      height: auto;
    }

    /* ── Results ── */
    .modal-results {
      margin: 8px auto 0;
      max-width: 900px;
      padding: 0 10px;
    }

    .searchMeta {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      padding: 12px 0;
      border-top: 1px solid var(--lw-ai-results-line-color, rgba(15, 23, 42, .08));
      border-bottom: 1px solid var(--lw-ai-results-line-color, rgba(15, 23, 42, .08));
      font-size: 14px;
    }
    .searchMeta .metaHits {
      margin-left: 10px;
      font-family: var(--lw-ai-results-body-font, 'Inter', sans-serif);
      color: var(--lw-ai-results-body-color, inherit);
    }
    .searchMeta .metaTime {
      margin-right: 10px;
      font-family: var(--lw-ai-results-body-font, 'Inter', sans-serif);
      color: var(--lw-ai-results-body-color, inherit);
    }

    /* lw-blog-list names its own accent --pl-sort-accent and defaults it
       to orange. Feed it this component's accent so the sort control
       follows whatever the tag sets, instead of the list's default. */
    lw-blog-list {
      --pl-sort-accent: var(--lw-ask-accent, #1E7A4A);
    }

    /* The children paint their own white surfaces; the modal already has
       one, so clear them here rather than editing those components.
       A rule targeting the element from this scope overrides its :host. */
    .modal-overview,
    lw-blog-list {
      background: transparent;
      background-color: transparent;
    }

    .modal-overview {
      display: block;
      margin-bottom: 4px;
      /* the list below sets its own via container-background */
      --pl-container-background: transparent;
    }

    .further-reading {
      margin: 26px 0 12px;
      font-size: 24px;
      font-weight: 700;
      font-family: var(--lw-ai-results-heading-font, 'Inter', sans-serif);
      color: var(--lw-ai-results-heading-color, #1a1a1a);
    }

    /* Search results are rendered by <lw-blog-list>; theme variables are
       inherited by that child component. */
    .result-list {
      --pl-card-divider: var(--lw-ai-results-line-color, rgba(15, 23, 42, 0.08));
    }

    .modal-loader,
    .modal-empty {
      text-align: center;
      color: #888;
    }
    .modal-loader { padding: 20px; font-size: 14px; }
    .modal-empty  { padding: 40px 20px; font-size: 15px; }

    .is-hidden { display: none; }

    /* ── Modal responsive ── */
    @media (max-width: 768px) {
      .suggested-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .suggested-chips { max-width: 100%; }
      .modal-results { width: 100%; }
    }

    @media (max-width: 560px) {
      #ai-search-modal { display: block; }
      .suggested { margin-top: 30px; }
      .suggested-card { min-height: 88px; padding: 14px; font-size: 12.5px; }
      .suggested-chips { gap: 8px; }
      .suggested-chip { padding: 8px 13px; font-size: 12.5px; }
      .modal-results { width: 100%; }
    }

    @media screen and (orientation: landscape) and (max-height: 500px) {
      #ai-search-modal {
        align-items: flex-start;
        justify-content: flex-start;
        padding-top: 60px;
        padding-bottom: 40px;
      }
      .hero { padding-top: 0; }
      .hero h1 { font-size: 26px; }
      .hero > p { margin-bottom: 18px; }
      .suggested { margin-top: 18px; }
      .suggested-cards { gap: 8px; }
      .suggested-card { min-height: 78px; padding: 10px 12px; gap: 10px; }
      .suggested-chips { gap: 8px; }
      .suggested-chip { padding: 7px 13px; font-size: 12.5px; }
      .search-input-wrapper { max-width: 700px; }
      .modal-results { max-width: 1000px; }
      #ai-search-close { top: 10px; right: 14px; font-size: 32px; }
    }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      :host {
        right:  var(--lw-ask-right, 16px);
        bottom: var(--lw-ask-bottom, 16px);
      }
      .pill {
        font-size: 12px;
        padding: 7px 13px;
        max-width: calc(100vw - 2.5rem);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel, .pill, .close, .fab {
        transition-duration: 0.01ms;
        transition-delay: 0ms;
      }
    }
  `;

  // "Powered by Levelworks" lockup — the wordmark, logo and white
  // background are all inside the supplied SVG (see powered-by.svg).
  static poweredByBadge = html`
    <svg role="img" aria-label="Powered by Levelworks" width="162" height="47" viewBox="0 0 162 47" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="162" height="47" rx="4" fill="white"/>
    <path d="M21.3419 10.252C23.1659 10.252 24.2939 11.224 24.2939 12.832C24.2939 14.392 23.2019 15.412 21.3179 15.4H18.4379V19H17.3219V10.252H21.3419ZM21.2819 14.428C22.4459 14.428 23.1299 13.912 23.1299 12.82C23.1299 11.8 22.5059 11.26 21.2819 11.248H18.4379V14.428H21.2819ZM25.1142 15.64C25.1142 13.516 26.3862 12.124 28.3302 12.124C30.2742 12.124 31.5222 13.504 31.5222 15.64C31.5222 17.752 30.2742 19.12 28.3302 19.12C26.3742 19.12 25.1142 17.74 25.1142 15.64ZM26.2182 15.628C26.2182 17.248 26.9742 18.184 28.3182 18.172C29.6382 18.172 30.4182 17.236 30.4182 15.616C30.4182 13.996 29.6502 13.072 28.3302 13.072C26.9982 13.072 26.2182 14.032 26.2182 15.628ZM33.9401 19L32.0441 12.244H33.1841L34.6601 17.932L36.0401 12.244H37.3121L38.7041 17.884L40.1561 12.244H41.2601L39.4241 19H38.0441L36.6761 13.54L35.3681 19H33.9401ZM44.9703 19.12C43.0623 19.12 41.7783 17.836 41.7783 15.628C41.7783 13.528 42.9303 12.136 44.8863 12.124C46.9263 12.124 48.0423 13.636 47.9103 15.904H42.8943C42.8823 17.428 43.7343 18.196 44.9943 18.196C46.0263 18.196 46.6623 17.692 46.8783 16.912L47.8743 17.14C47.5623 18.376 46.4823 19.12 44.9703 19.12ZM42.8943 15.064H46.7943C46.7703 13.816 46.0383 13.012 44.8863 13.012C43.7343 13.012 42.9543 13.744 42.8943 15.064ZM49.0289 19V12.244H49.9889L50.0609 13.372C50.4209 12.616 51.0689 12.196 51.8729 12.196C52.0649 12.196 52.2929 12.22 52.3889 12.232V13.264H52.3289C52.1969 13.228 52.0169 13.216 51.8249 13.204C51.0209 13.204 50.3609 13.66 50.1089 14.416V19H49.0289ZM56.021 19.12C54.113 19.12 52.829 17.836 52.829 15.628C52.829 13.528 53.981 12.136 55.937 12.124C57.977 12.124 59.093 13.636 58.961 15.904H53.945C53.933 17.428 54.785 18.196 56.045 18.196C57.077 18.196 57.713 17.692 57.929 16.912L58.925 17.14C58.613 18.376 57.533 19.12 56.021 19.12ZM53.945 15.064H57.845C57.821 13.816 57.089 13.012 55.937 13.012C54.785 13.012 54.005 13.744 53.945 15.064ZM59.7548 15.664C59.7548 13.504 60.8948 12.136 62.7068 12.124C63.7508 12.124 64.5548 12.592 64.9868 13.384V9.52H66.0668V19H65.0588L64.9748 17.812C64.6028 18.616 63.7268 19.12 62.6708 19.12C60.8708 19.12 59.7548 17.776 59.7548 15.664ZM60.8708 15.676C60.8708 17.272 61.6028 18.184 62.8748 18.184C64.1348 18.184 64.9748 17.344 64.9868 16.048V15.256C64.9868 13.936 64.1708 13.084 62.8988 13.072C61.6028 13.072 60.8708 14.008 60.8708 15.676ZM70.6851 19V9.52H71.7651V13.384C72.2091 12.568 73.0251 12.124 74.0571 12.124C75.8451 12.124 76.9851 13.504 76.9971 15.664C76.9971 17.776 75.8811 19.12 74.0811 19.12C73.0131 19.12 72.1491 18.628 71.7651 17.812L71.6811 19H70.6851ZM71.7651 16.144C71.7651 17.344 72.6291 18.184 73.8651 18.184C75.1491 18.184 75.8811 17.272 75.8811 15.676C75.8811 14.008 75.1611 13.084 73.8531 13.072C72.5811 13.072 71.7531 13.936 71.7651 15.256V16.144ZM78.5697 21.124C78.3417 21.124 78.0417 21.064 77.8497 20.992V20.104H77.9097C78.0057 20.164 78.2577 20.212 78.5337 20.212C79.0497 20.212 79.4097 19.972 79.6017 19.48L79.9737 18.556L77.3217 12.244H78.4977L79.7577 15.472C80.0577 16.252 80.2737 16.78 80.5257 17.512C80.7897 16.78 81.0297 16.204 81.3177 15.46L82.5777 12.244H83.6817L80.6337 19.756C80.2377 20.716 79.6257 21.124 78.5697 21.124Z" fill="#595959"/>
    <path d="M16 27.373H18.6039V39.6542H16V27.373Z" fill="black"/>
    <path d="M26.0469 27.373H28.2788V39.6542H26.0469V27.373Z" fill="black"/>
    <path d="M24.9266 37.2335C24.9266 38.5694 23.7608 39.6525 22.3227 39.6525C20.8846 39.6525 19.7188 38.5694 19.7188 37.2335C19.7188 35.8975 20.8846 34.8145 22.3227 34.8145C23.7608 34.8145 24.9266 35.8975 24.9266 37.2335Z" fill="#F58635"/>
    <path d="M118.318 38.5417C117.857 38.5417 117.461 38.5025 117.127 38.4241C116.794 38.3456 116.456 38.2182 116.113 38.0418V36.3949H116.319L116.789 37.2036C117.093 37.7428 117.588 38.0124 118.274 38.0124C118.666 38.0124 118.969 37.9192 119.185 37.733C119.41 37.5467 119.523 37.2919 119.523 36.9684C119.523 36.6841 119.455 36.4635 119.317 36.3067C119.18 36.1499 118.984 36.0126 118.729 35.895C118.484 35.7676 118.191 35.6254 117.848 35.4686C117.348 35.2431 116.961 34.9981 116.686 34.7334C116.422 34.4589 116.29 34.0766 116.29 33.5865C116.29 33.2238 116.393 32.8954 116.598 32.6013C116.804 32.3072 117.064 32.072 117.377 31.8955C117.701 31.7191 118.034 31.6309 118.377 31.6309C118.739 31.6309 119.072 31.675 119.376 31.7632C119.68 31.8514 119.989 31.974 120.302 32.1308V33.7335H120.096L119.611 32.9542C119.445 32.6895 119.263 32.4984 119.067 32.3808C118.872 32.2631 118.661 32.2043 118.435 32.2043C118.102 32.2043 117.833 32.2876 117.627 32.4543C117.431 32.6209 117.333 32.8513 117.333 33.1454C117.333 33.4786 117.451 33.7335 117.686 33.91C117.931 34.0766 118.284 34.2678 118.744 34.4834C119.018 34.6207 119.293 34.7579 119.567 34.8951C119.851 35.0324 120.082 35.2284 120.258 35.4833C120.444 35.7283 120.537 36.0812 120.537 36.542C120.537 36.9733 120.42 37.3409 120.184 37.6448C119.949 37.9388 119.66 38.1643 119.317 38.3211C118.974 38.4682 118.641 38.5417 118.318 38.5417Z" fill="black"/>
    <path d="M106.508 38.3951V38.1598L107.434 37.6893V29.0434L106.552 28.2788V28.1759L108.521 27.3672H108.61V34.6456L110.976 32.6312V32.543L110.256 32.0136V31.7784H113.048V32.0136L112.108 32.5283L109.682 34.3957L112.651 37.6599L113.592 38.1598V38.3951H111.652L111.093 37.6305L108.61 34.8662V37.7334L109.653 38.1598V38.3951H106.508Z" fill="black"/>
    <path d="M99.2578 38.3947V38.1594L100.184 37.6889V33.3071L99.3019 32.5425V32.4396L101.124 31.6309H101.213L101.345 32.8807H101.404C101.629 32.518 101.835 32.2484 102.021 32.072C102.217 31.8857 102.398 31.7681 102.565 31.7191C102.731 31.6603 102.898 31.6309 103.064 31.6309C103.143 31.6309 103.231 31.6456 103.329 31.675C103.437 31.7044 103.525 31.7338 103.594 31.7632C103.701 31.8122 103.799 31.871 103.888 31.9396C103.985 32.0083 104.034 32.0867 104.034 32.1749C104.034 32.2631 104.015 32.3514 103.976 32.4396L103.682 33.1601H103.579L103.02 32.9395C102.913 32.8905 102.805 32.8611 102.697 32.8513C102.599 32.8415 102.501 32.8366 102.403 32.8366C101.992 32.8366 101.644 33.0473 101.36 33.4688V37.6889L102.403 38.1594V38.3947H99.2578Z" fill="black"/>
    <path d="M93.0577 38.5417C92.411 38.5417 91.8427 38.3898 91.3528 38.0859C90.8726 37.782 90.4954 37.3703 90.221 36.8507C89.9565 36.3312 89.8242 35.7431 89.8242 35.0863C89.8242 34.4295 89.9565 33.8413 90.221 33.3218C90.4954 32.8023 90.8726 32.3906 91.3528 32.0867C91.8427 31.7828 92.411 31.6309 93.0577 31.6309C93.7044 31.6309 94.2678 31.7828 94.7479 32.0867C95.2378 32.3906 95.615 32.8023 95.8796 33.3218C96.1539 33.8413 96.2911 34.4295 96.2911 35.0863C96.2911 35.7431 96.1539 36.3312 95.8796 36.8507C95.615 37.3703 95.2378 37.782 94.7479 38.0859C94.2678 38.3898 93.7044 38.5417 93.0577 38.5417ZM93.2634 37.9094C93.6554 37.9094 93.9787 37.7869 94.2335 37.5418C94.4882 37.2968 94.6744 36.9831 94.792 36.6008C94.9095 36.2087 94.9683 35.8019 94.9683 35.3804C94.9683 34.8608 94.8948 34.3609 94.7479 33.8806C94.6107 33.4002 94.3853 33.0081 94.0718 32.7042C93.768 32.4004 93.3712 32.2484 92.8813 32.2484C92.4796 32.2484 92.1513 32.371 91.8966 32.616C91.6418 32.8611 91.4507 33.1748 91.3234 33.5571C91.2058 33.9394 91.147 34.3462 91.147 34.7775C91.147 35.297 91.2205 35.797 91.3675 36.2773C91.5144 36.7576 91.7447 37.1497 92.0582 37.4536C92.3718 37.7575 92.7735 37.9094 93.2634 37.9094Z" fill="black"/>
    <path d="M79.5071 38.3961L77.1996 32.4704L76.2148 32.0146V31.7793H79.7275V32.0146L78.5223 32.4557V32.5439L80.0509 36.6169H80.1097L82.1967 31.7793H82.5054L84.5924 36.5728H84.6512L86.1356 32.6321V32.5439L85.0774 32.0146V31.7793H87.9581V32.0146L86.8705 32.5292L84.416 38.3961H84.1074L81.9909 33.6026L79.8157 38.3961H79.5071Z" fill="black"/>
    <path d="M71.4102 38.3951V38.1598L72.3361 37.6893V29.0434L71.4543 28.2788V28.1759L73.4237 27.3672H73.5119V37.6893L74.4378 38.1598V38.3951H71.4102Z" fill="black"/>
    <path d="M65.978 38.5417C65.0276 38.5417 64.278 38.2525 63.7293 37.6742C63.1806 37.0958 62.9062 36.3312 62.9062 35.3804C62.9062 34.6452 63.0483 33.9982 63.3325 33.4394C63.6264 32.8709 64.0086 32.4298 64.4789 32.1161C64.959 31.7926 65.4783 31.6309 66.0368 31.6309C66.8109 31.6309 67.4184 31.9004 67.8593 32.4396C68.31 32.9787 68.5354 33.7531 68.5354 34.7628L68.4619 34.8363H64.0674C64.0771 35.2872 64.1653 35.7136 64.3319 36.1155C64.4985 36.5077 64.763 36.8262 65.1256 37.0713C65.4979 37.3164 65.9927 37.4389 66.61 37.4389C67.1489 37.4389 67.7809 37.2428 68.506 36.8507H68.5501V36.9978C68.3247 37.4193 67.9867 37.782 67.5359 38.0859C67.095 38.3898 66.5757 38.5417 65.978 38.5417ZM65.8017 32.2778C65.3313 32.2778 64.9443 32.4445 64.6406 32.7778C64.3466 33.1012 64.1653 33.562 64.0967 34.1599H67.4184C67.3106 33.4934 67.1195 33.013 66.8452 32.7189C66.5806 32.4249 66.2328 32.2778 65.8017 32.2778Z" fill="black"/>
    <path d="M56.9791 38.3961L54.2894 32.4704L53.3047 32.0146V31.7793H56.8174V32.0146L55.6122 32.4557V32.5439L57.4935 36.6463H57.5523L59.2131 32.6321V32.5439L58.1548 32.0146V31.7793H61.0356V32.0146L59.9479 32.5292L57.2877 38.3961H56.9791Z" fill="black"/>
    <path d="M48.8608 38.5417C47.9104 38.5417 47.1608 38.2525 46.6121 37.6742C46.0634 37.0958 45.7891 36.3312 45.7891 35.3804C45.7891 34.6452 45.9311 33.9982 46.2153 33.4394C46.5092 32.8709 46.8914 32.4298 47.3617 32.1161C47.8418 31.7926 48.3611 31.6309 48.9196 31.6309C49.6937 31.6309 50.3012 31.9004 50.7421 32.4396C51.1928 32.9787 51.4182 33.7531 51.4182 34.7628L51.3447 34.8363H46.9502C46.96 35.2872 47.0481 35.7136 47.2147 36.1155C47.3813 36.5077 47.6458 36.8262 48.0084 37.0713C48.3807 37.3164 48.8755 37.4389 49.4928 37.4389C50.0317 37.4389 50.6637 37.2428 51.3888 36.8507H51.4329V36.9978C51.2075 37.4193 50.8695 37.782 50.4188 38.0859C49.9778 38.3898 49.4585 38.5417 48.8608 38.5417ZM48.6845 32.2778C48.2141 32.2778 47.8271 32.4445 47.5234 32.7778C47.2294 33.1012 47.0481 33.562 46.9796 34.1599H50.3012C50.1934 33.4934 50.0023 33.013 49.728 32.7189C49.4634 32.4249 49.1156 32.2778 48.6845 32.2778Z" fill="black"/>
    <path d="M35.25 38.396V38.1607L36.4258 37.5726V29.5148L35.25 28.9267V28.6914H39.0713V28.9267L37.7486 29.5148V37.5873H41.3201L42.3195 35.1317H42.5546V38.396H35.25Z" fill="black"/>
    <path d="M115.746 36.0277H116.531L117.107 37.0192L117.109 37.0214L117.11 37.0235C117.34 37.4326 117.703 37.6452 118.274 37.6452V38.0128L118.21 38.0121C117.558 37.9957 117.084 37.7264 116.79 37.2041L116.319 36.3953H116.114V38.0422C116.456 38.2187 116.795 38.3461 117.128 38.4245C117.44 38.498 117.808 38.5371 118.233 38.5417L118.318 38.5422C118.621 38.5422 118.933 38.4775 119.253 38.3483L119.318 38.3216C119.661 38.1648 119.95 37.9393 120.185 37.6452C120.42 37.3413 120.537 36.9737 120.537 36.5424C120.537 36.1104 120.456 35.7733 120.292 35.5309L120.225 35.4366C120.064 35.22 119.863 35.0485 119.62 34.9219L119.567 34.8956C119.293 34.7584 119.019 34.6211 118.744 34.4839C118.284 34.2682 117.931 34.0771 117.686 33.9104C117.466 33.745 117.349 33.5106 117.335 33.2073L117.333 33.1458C117.333 32.8517 117.431 32.6213 117.627 32.4547C117.833 32.288 118.103 32.2048 118.436 32.2048L118.478 32.2054C118.687 32.2123 118.884 32.2709 119.068 32.3812C119.264 32.4988 119.445 32.6899 119.612 32.9546L120.097 33.7339H120.302V32.1312C120.028 31.994 119.757 31.883 119.491 31.7983L119.376 31.7636C119.092 31.6809 118.781 31.637 118.445 31.6319L118.377 31.6313C118.034 31.6313 117.701 31.7195 117.378 31.896C117.064 32.0724 116.804 32.3076 116.599 32.6017C116.393 32.8958 116.29 33.2242 116.29 33.5869C116.29 34.077 116.422 34.4594 116.687 34.7338C116.961 34.9985 117.348 35.2436 117.848 35.469C118.191 35.6259 118.485 35.7679 118.73 35.8954C118.984 36.013 119.18 36.1503 119.318 36.3071C119.455 36.464 119.523 36.6846 119.523 36.9689L119.522 37.0287C119.509 37.3239 119.397 37.5588 119.185 37.7334C118.97 37.9196 118.666 38.0128 118.274 38.0128V37.6452C118.611 37.6452 118.818 37.5652 118.945 37.4552L118.948 37.4525L118.951 37.45C119.083 37.3416 119.156 37.1958 119.156 36.9689C119.156 36.7553 119.108 36.6338 119.052 36.5627L119.041 36.5492C118.959 36.4556 118.835 36.3597 118.656 36.2681L118.576 36.2292L118.568 36.2255L118.56 36.2216C118.322 36.0978 118.034 35.9585 117.695 35.8034C117.173 35.5677 116.746 35.3018 116.432 34.9984L116.427 34.9937L116.422 34.9889C116.074 34.628 115.923 34.1439 115.923 33.5869C115.923 33.1496 116.048 32.7475 116.298 32.391C116.535 32.0517 116.836 31.779 117.197 31.5756L117.199 31.5744L117.202 31.5732C117.575 31.3696 117.968 31.2637 118.377 31.2637C118.745 31.2637 119.091 31.3057 119.414 31.3927L119.479 31.4106C119.806 31.5057 120.135 31.6367 120.467 31.8024L120.67 31.9041V34.1015H119.893L119.301 33.1505C119.163 32.9322 119.029 32.7936 118.904 32.7119L118.879 32.6964C118.739 32.6125 118.594 32.5724 118.436 32.5724C118.167 32.5724 117.987 32.6379 117.862 32.7374C117.763 32.8236 117.701 32.9444 117.701 33.1458L117.702 33.1888C117.711 33.3944 117.783 33.5206 117.9 33.6113C118.094 33.742 118.37 33.8959 118.736 34.0727L118.9 34.151L118.909 34.155L118.923 34.1623L118.94 34.1703L118.955 34.1784L118.976 34.1888L118.997 34.1994L119.02 34.2106L119.043 34.2218L119.069 34.2347L119.096 34.2484L119.126 34.2636L119.157 34.2789L119.19 34.2958L119.225 34.3135L119.263 34.3327L119.302 34.3527L119.343 34.3739L119.387 34.3959L119.433 34.4194L119.481 34.4437L119.532 34.4693L119.585 34.4961L119.641 34.5241C119.947 34.6771 120.198 34.8446 120.397 35.0287L120.556 35.2682C120.806 35.6013 120.905 36.0428 120.905 36.5424C120.905 37.0447 120.766 37.4941 120.475 37.8703L120.472 37.8748C120.201 38.2139 119.865 38.4752 119.47 38.6559L119.466 38.6577L119.462 38.6594C119.081 38.8231 118.698 38.9097 118.318 38.9097C117.868 38.9097 117.465 38.8739 117.113 38.798L117.044 38.7823C116.701 38.7016 116.358 38.5746 116.014 38.4038L115.945 38.3691L115.746 38.2665V36.0277Z" fill="black"/>
    <path d="M108.526 27.3676L106.556 28.1763V28.2793L107.438 29.0438V37.6898L106.512 38.1603V38.3955H109.657V38.1603L108.614 37.7338V34.8666L111.098 37.6309L111.656 38.3955H113.596V38.1603L112.656 37.6603L109.687 34.3961L112.112 32.5287L113.052 32.014V31.7788H110.26V32.014L110.98 32.5434V32.6316L108.614 34.6461V27.3676H108.526ZM108.981 33.8505L110.444 32.6053L109.892 32.2001V31.4112H113.42V32.2319L112.313 32.8375L110.227 34.4438L112.884 37.3656L113.964 37.9393V38.7631H111.469L110.812 37.8624L108.981 35.8254V37.4868L110.025 37.9133V38.7631H106.145V37.9347L107.071 37.4641V29.2117L106.189 28.4471V27.9299L108.453 27H108.981V33.8505Z" fill="black"/>
    <path d="M104.035 32.1754C104.035 32.0871 103.986 32.0087 103.888 31.9401C103.8 31.8715 103.702 31.8126 103.594 31.7636C103.525 31.7342 103.437 31.7048 103.329 31.6754C103.244 31.6497 103.165 31.6352 103.094 31.632L103.065 31.6313C102.898 31.6313 102.732 31.6607 102.565 31.7195L102.534 31.7295C102.376 31.7835 102.205 31.8979 102.021 32.0725L101.986 32.1066C101.809 32.2829 101.615 32.5411 101.404 32.8811H101.345L101.213 31.6313H101.125L99.3021 32.4401V32.543L100.184 33.3076V37.6893L99.2581 38.1598V38.3951H102.403V38.1598L101.36 37.6893V33.4693C101.644 33.0478 101.992 32.837 102.403 32.837C102.501 32.837 102.599 32.8419 102.697 32.8517C102.805 32.8615 102.913 32.891 103.021 32.94L103.579 33.1605H103.682L103.976 32.4401C104.01 32.3629 104.029 32.2856 104.034 32.2084L104.035 32.1754ZM104.402 32.1754C104.402 32.3159 104.371 32.4511 104.316 32.5787L104.316 32.5789L103.929 33.5281H103.509L103.444 33.5024L102.886 33.2819L102.877 33.2784L102.869 33.2746C102.804 33.2452 102.744 33.2281 102.688 33.2205L102.664 33.2178L102.662 33.2176L102.661 33.2175C102.575 33.2089 102.489 33.2046 102.403 33.2046C102.166 33.2046 101.942 33.307 101.727 33.5878V37.4517L102.771 37.9223V38.7627H98.8906V37.9343L99.8165 37.4636V33.4754L98.9346 32.7108V32.201L101.047 31.2637H101.543L101.617 31.9623C101.668 31.9054 101.718 31.853 101.768 31.8055C101.983 31.6013 102.212 31.4417 102.455 31.3687C102.654 31.2997 102.858 31.2637 103.065 31.2637C103.185 31.2637 103.306 31.2856 103.426 31.3207C103.514 31.3447 103.595 31.3701 103.668 31.3976L103.738 31.4258L103.746 31.4289C103.875 31.4878 103.996 31.5595 104.106 31.6442C104.261 31.7552 104.402 31.9309 104.402 32.1754Z" fill="black"/>
    <path d="M96.2913 35.0867C96.2913 34.4299 96.1542 33.8417 95.8799 33.3222C95.6319 32.8351 95.2848 32.4429 94.8387 32.1453L94.7481 32.0871C94.298 31.8022 93.7747 31.6509 93.1782 31.6331L93.058 31.6313C92.4113 31.6313 91.843 31.7832 91.3531 32.0871C90.873 32.3909 90.4957 32.8027 90.2213 33.3222C89.9568 33.8417 89.8245 34.4299 89.8245 35.0867L89.826 35.209C89.8415 35.8167 89.9733 36.3641 90.2213 36.8512C90.4957 37.3707 90.873 37.7825 91.3531 38.0864C91.8124 38.3712 92.3406 38.5226 92.9376 38.5404L93.058 38.5422C93.7046 38.5421 94.268 38.3902 94.7481 38.0864C95.2381 37.7825 95.6153 37.3708 95.8799 36.8512C96.1371 36.3641 96.2737 35.8167 96.2898 35.209L96.2913 35.0867ZM91.1472 34.778C91.1472 34.3467 91.2061 33.9397 91.3236 33.5574C91.451 33.1752 91.6421 32.8615 91.8968 32.6164C92.1516 32.3714 92.4798 32.2488 92.8815 32.2488C93.3714 32.2488 93.7683 32.4008 94.072 32.7046C94.3855 33.0085 94.611 33.4007 94.7481 33.881C94.8951 34.3613 94.9686 34.8613 94.9686 35.3808L94.9679 35.4597C94.961 35.8531 94.9024 36.2337 94.7922 36.6013C94.6746 36.9835 94.4884 37.2972 94.2337 37.5423L94.1851 37.5868C93.9383 37.8022 93.6311 37.9099 93.2637 37.9099V37.5423C93.5719 37.5423 93.8005 37.4491 93.9791 37.2773C94.1832 37.0809 94.3393 36.8237 94.441 36.4931C94.5475 36.137 94.6011 35.7667 94.6011 35.3808C94.6011 34.8965 94.5327 34.4329 94.3967 33.9886L94.3958 33.9852L94.3948 33.982C94.2804 33.5813 94.1014 33.2636 93.8645 33.0171L93.8164 32.9687L93.8142 32.9667L93.8122 32.9646C93.5872 32.7396 93.2889 32.6164 92.8815 32.6164C92.5607 32.6164 92.3283 32.7114 92.1514 32.8815C91.9462 33.079 91.7848 33.3377 91.6736 33.6693C91.5684 34.0129 91.5147 34.3819 91.5147 34.778L91.5155 34.8684C91.523 35.29 91.5827 35.6957 91.6943 36.0866L91.7191 36.1701C91.8506 36.6 92.0515 36.9354 92.3141 37.19C92.5505 37.4191 92.8565 37.5423 93.2637 37.5423V37.9099L93.1729 37.9081C92.7389 37.8909 92.3773 37.7489 92.0882 37.4821L92.0585 37.4541C91.745 37.1502 91.5146 36.758 91.3677 36.2777C91.2299 35.8274 91.1567 35.3599 91.1481 34.8752L91.1472 34.778ZM96.6571 35.2191C96.6396 35.877 96.4911 36.4807 96.2047 37.0229C95.9107 37.5984 95.4892 38.0583 94.9444 38.3969L94.9445 38.397C94.3979 38.743 93.7643 38.9097 93.058 38.9097C92.3735 38.9097 91.7542 38.7532 91.2117 38.4305L91.1594 38.3987L91.1565 38.397C90.6371 38.0682 90.2261 37.6258 89.9252 37.0764L89.8965 37.0229L89.8952 37.0204L89.8938 37.018C89.5998 36.4406 89.457 35.7941 89.457 35.0867C89.457 34.3794 89.5998 33.7328 89.8938 33.1554L89.8952 33.153L89.8965 33.1505C90.1997 32.5762 90.6204 32.1158 91.1565 31.7764L91.1594 31.7747C91.7144 31.4305 92.3514 31.2637 93.058 31.2637C93.7643 31.2637 94.3979 31.4304 94.9445 31.7764H94.9444C95.4892 32.115 95.9107 32.575 96.2047 33.1505C96.5102 33.7289 96.6588 34.3772 96.6588 35.0867L96.6571 35.2191Z" fill="black"/>
    <path d="M80.0952 31.4102V32.2699L78.9676 32.6825L80.102 35.7055L81.9553 31.4102H82.7463L84.5995 35.6665L85.7031 32.7368L84.7101 32.2402V31.4102H88.3258V32.2457L87.1553 32.7995L84.6607 38.7621H83.8682L81.9865 34.5003L80.0526 38.7621H79.2561L76.911 32.7401L75.8477 32.248V31.4102H80.0952ZM76.2151 31.7778V32.013L77.1998 32.4688L79.5073 38.3945H79.8159L81.9912 33.601L84.1076 38.3945H84.4163L86.8708 32.5277L87.9583 32.013V31.7778H85.0776V32.013L86.1359 32.5424V32.6306L84.6514 36.5712H84.5926L82.5055 31.7778H82.1969L80.1099 36.6154H80.051L78.5226 32.5424V32.4541L79.7277 32.013V31.7778H76.2151Z" fill="black"/>
    <path d="M73.4239 27.3676L71.4544 28.1763V28.2793L72.3363 29.0438V37.6898L71.4104 38.1603V38.3955H74.438V38.1603L73.5122 37.6898V27.3676H73.4239ZM73.8796 37.4641L74.8055 37.9347V38.7631H71.043V37.9347L71.9689 37.4641V29.2117L71.087 28.4471V27.9299L73.3514 27H73.8796V37.4641Z" fill="black"/>
    <path d="M62.543 35.3808C62.543 34.5977 62.6946 33.8917 63.0092 33.2731L63.0097 33.2721L63.0103 33.271C63.329 32.6545 63.7506 32.1632 64.2792 31.8106C64.8172 31.4485 65.4071 31.2637 66.0409 31.2637C66.9112 31.2637 67.6287 31.5725 68.1478 32.2072H68.1477C68.6717 32.8359 68.907 33.7059 68.907 34.7633V34.9155L68.6182 35.2043H64.4679C64.5041 35.4716 64.5731 35.7273 64.6743 35.9722C64.8121 36.2966 65.0292 36.5596 65.3338 36.7659C65.6271 36.9582 66.0433 37.0718 66.6142 37.0718V37.4394L66.4998 37.4379C65.9543 37.424 65.5094 37.3095 65.165 37.0944L65.1297 37.0718C64.7672 36.8267 64.5026 36.5081 64.336 36.116C64.1694 35.7141 64.0814 35.2877 64.0716 34.8367H68.4661L68.5395 34.7633C68.5395 33.7852 68.328 33.0278 67.905 32.4913L67.8635 32.4401C67.4226 31.9009 66.815 31.6313 66.0409 31.6313C65.4824 31.6313 64.9631 31.793 64.483 32.1165C64.0127 32.4302 63.6306 32.8713 63.3367 33.4398C63.0525 33.9986 62.9104 34.6456 62.9104 35.3808L62.9112 35.4694C62.9279 36.3792 63.2019 37.1143 63.7334 37.6746C64.265 38.2349 64.9851 38.5238 65.8937 38.5413L65.9822 38.5422C66.5799 38.5421 67.0992 38.3902 67.5401 38.0864C67.9908 37.7825 68.3289 37.4197 68.5542 36.9982V36.8512H68.5101C67.7851 37.2433 67.1531 37.4394 66.6142 37.4394V37.0718C67.0682 37.0718 67.638 36.9049 68.3354 36.5278L68.4172 36.4836H68.9217V37.0903L68.8783 37.1716C68.621 37.6528 68.2389 38.0584 67.7454 38.3911L67.7453 38.391C67.2368 38.7405 66.644 38.9097 65.9822 38.9097C64.9841 38.9097 64.1517 38.6126 63.5267 37.9891L63.4669 37.9277C62.8413 37.2682 62.543 36.4066 62.543 35.3808ZM65.8857 32.2799C66.2801 32.2972 66.6013 32.4437 66.8493 32.7193C67.1237 33.0134 67.3147 33.4938 67.4225 34.1604H64.1009C64.1695 33.5625 64.3508 33.1017 64.6447 32.7782C64.9485 32.4449 65.3355 32.2783 65.8058 32.2783L65.8857 32.2799ZM65.8058 32.6459C65.4337 32.6459 65.147 32.7727 64.9162 33.0259C64.7517 33.2072 64.6215 33.4576 64.5385 33.7928H66.9716C66.8692 33.398 66.7326 33.133 66.5807 32.9702L66.5784 32.9678L66.5762 32.9652C66.388 32.7562 66.1432 32.6459 65.8058 32.6459Z" fill="black"/>
    <path d="M57.1811 31.4102V32.2699L56.0737 32.6752L57.5033 35.7927L58.7692 32.7331L57.7837 32.2402V31.4102H61.3993V32.2457L60.2231 32.8023L57.5208 38.7621H56.7387L54.0076 32.745L52.9336 32.248V31.4102H57.1811ZM53.301 31.7778V32.013L54.2858 32.4688L56.9754 38.3945H57.284L59.9443 32.5277L61.0319 32.013V31.7778H58.1511V32.013L59.2094 32.5424V32.6306L57.5486 36.6447H57.4898L55.6085 32.5424V32.4541L56.8137 32.013V31.7778H53.301Z" fill="black"/>
    <path d="M45.4219 35.3808C45.4219 34.5977 45.5735 33.8917 45.8881 33.2731L45.8886 33.2721L45.8892 33.271C46.2079 32.6545 46.6295 32.1632 47.1581 31.8106C47.6961 31.4485 48.286 31.2637 48.9198 31.2637C49.7901 31.2637 50.5076 31.5725 51.0267 32.2072H51.0266C51.5506 32.8359 51.7859 33.7059 51.7859 34.7633V34.9155L51.4971 35.2043H47.3468C47.383 35.4716 47.452 35.7273 47.5532 35.9722C47.691 36.2966 47.9081 36.5596 48.2127 36.7659C48.506 36.9582 48.9222 37.0718 49.4931 37.0718V37.4394L49.3788 37.4379C48.8332 37.424 48.3883 37.3095 48.0439 37.0944L48.0086 37.0718C47.6461 36.8267 47.3815 36.5081 47.2149 36.116C47.0484 35.7141 46.9603 35.2877 46.9505 34.8367H51.345L51.4184 34.7633C51.4184 33.7852 51.2069 33.0278 50.7839 32.4913L50.7424 32.4401C50.3015 31.9009 49.6939 31.6313 48.9198 31.6313C48.3613 31.6313 47.842 31.793 47.3619 32.1165C46.8916 32.4302 46.5095 32.8713 46.2156 33.4398C45.9314 33.9986 45.7893 34.6456 45.7893 35.3808L45.7901 35.4694C45.8068 36.3792 46.0808 37.1143 46.6123 37.6746C47.1439 38.2349 47.864 38.5238 48.7726 38.5413L48.8611 38.5422C49.4588 38.5421 49.9781 38.3902 50.419 38.0864C50.8697 37.7825 51.2078 37.4197 51.4331 36.9982V36.8512H51.389C50.664 37.2433 50.032 37.4394 49.4931 37.4394V37.0718C49.9471 37.0718 50.5169 36.9049 51.2143 36.5278L51.2961 36.4836H51.8006V37.0903L51.7572 37.1716C51.4999 37.6528 51.1178 38.0584 50.6244 38.3911L50.6242 38.391C50.1157 38.7405 49.5229 38.9097 48.8611 38.9097C47.863 38.9097 47.0307 38.6126 46.4057 37.9891L46.3458 37.9277C45.7202 37.2682 45.4219 36.4066 45.4219 35.3808ZM48.7646 32.2799C49.159 32.2972 49.4802 32.4437 49.7282 32.7193C50.0026 33.0134 50.1936 33.4938 50.3014 34.1604H46.9798C47.0484 33.5625 47.2297 33.1017 47.5236 32.7782C47.8274 32.4449 48.2144 32.2783 48.6847 32.2783L48.7646 32.2799ZM48.6847 32.6459C48.3127 32.6459 48.0259 32.7727 47.7951 33.0259C47.6306 33.2072 47.5004 33.4576 47.4174 33.7928H49.8505C49.7482 33.398 49.6115 33.133 49.4596 32.9702L49.4573 32.9678L49.4551 32.9652C49.2669 32.7562 49.0221 32.6459 48.6847 32.6459Z" fill="black"/>
    <path d="M42.3197 35.1322L41.3204 37.5877H37.7489V29.5152L39.0716 28.9271V28.6918H35.2502V28.9271L36.4261 29.5152V37.573L35.2502 38.1612V38.3964H42.555V35.1322H42.3197ZM42.9224 38.764H34.8828V37.9339L36.0587 37.3457V29.7424L34.8828 29.1543V28.3242H39.439V29.166L38.1163 29.754V37.2201H41.0731L42.0726 34.7646H42.9224V38.764Z" fill="black"/>
    <path d="M97.0931 35.0014C97.0931 37.1595 95.3443 38.909 93.1872 38.909C91.03 38.909 89.2812 37.1595 89.2812 35.0014C89.2812 32.8433 91.03 31.0938 93.1872 31.0938C95.3443 31.0938 97.0931 32.8433 97.0931 35.0014Z" fill="#F58635"/>
    </svg>
  `;

  static searchIcon = html`
    <svg class="fab-icon" width="32" height="32" viewBox="0 0 32 32"
         fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.3359 23.334L29.3359 29.334" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M26.6641 14.666C26.6641 11.4834 25.3998 8.43117 23.1493 6.18073C20.8989 3.9303 17.8467 2.66602 14.6641 2.66602C11.4815 2.66602 8.42922 3.9303 6.17878 6.18073C3.92834 8.43117 2.66406 11.4834 2.66406 14.666C2.66406 17.8486 3.92834 20.9009 6.17878 23.1513C8.42922 25.4017 11.4815 26.666 14.6641 26.666C17.8467 26.666 20.8989 25.4017 23.1493 23.1513C25.3998 20.9009 26.6641 17.8486 26.6641 14.666Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M8.66406 18.666L11.1201 11.298C11.1817 11.1141 11.2996 10.9543 11.457 10.841C11.6144 10.7278 11.8035 10.6668 11.9974 10.6668C12.1913 10.6668 12.3804 10.7278 12.5378 10.841C12.6952 10.9543 12.8131 11.1141 12.8747 11.298L15.3307 18.666M19.3307 10.666V18.666M9.9974 15.9993H13.9974" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  static aiIcon = html`
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M8.26275 2.1105C8.32905 1.75553 8.63889 1.4982 9 1.4982C9.3611 1.4982 9.67094 1.75553 9.73725 2.1105L10.5255 6.279C10.6401 6.88551 11.1145 7.35992 11.721 7.4745L15.8895 8.26275C16.2445 8.32905 16.5018 8.63889 16.5018 9C16.5018 9.3611 16.2445 9.67094 15.8895 9.73725L11.721 10.5255C11.1145 10.6401 10.6401 11.1145 10.5255 11.721L9.73725 15.8895C9.67094 16.2445 9.3611 16.5018 9 16.5018C8.63889 16.5018 8.32905 16.2445 8.26275 15.8895L7.4745 11.721C7.35992 11.1145 6.88551 10.6401 6.279 10.5255L2.1105 9.73725C1.75553 9.67094 1.4982 9.3611 1.4982 9C1.4982 8.63889 1.75553 8.32905 2.1105 8.26275L6.279 7.4745C6.88551 7.35992 7.35992 6.88551 7.4745 6.279L8.26275 2.1105M15 1.5V4.5M16.5 3H13.5"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M1.5 15C1.5 15.8279 2.17213 16.5 3 16.5C3.82787 16.5 4.5 15.8279 4.5 15C4.5 14.1721 3.82787 13.5 3 13.5C2.17213 13.5 1.5 14.1721 1.5 15H1.5"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Bar mode icons: a 2x2 grid for the fixed four, stacked rules for
  // the full scrolling list. The magnifier reuses searchIcon.
  static gridIcon = html`
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="2"  y="3"  width="7" height="6" rx="1.5"/>
      <rect x="11" y="3"  width="7" height="6" rx="1.5"/>
      <rect x="2"  y="11" width="7" height="6" rx="1.5"/>
      <rect x="11" y="11" width="7" height="6" rx="1.5"/>
    </svg>`;

  static listIcon = html`
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor"
         stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
      <line x1="3" y1="7"  x2="17" y2="7"/>
      <line x1="3" y1="13" x2="17" y2="13"/>
    </svg>`;

  // Minimize / restore glyphs for the bar's corner tab.
  static minimizeIcon = html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>`;

  static restoreIcon = html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
    </svg>`;

  // Display-mode toggle: arrows out to take the whole page, a docked
  // column to go back to the side panel.
  static expandIcon = html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5"/>
    </svg>`;

  static panelIcon = html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <line x1="14" y1="5" x2="14" y2="19"/>
    </svg>`;

  static sparkleIcon = html`
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.2l1.55 4.05a1 1 0 0 0 .58.58L14.2 7.4l-4.07 1.57a1 1 0 0 0-.58.58L8 13.6l-1.55-4.05a1 1 0 0 0-.58-.58L1.8 7.4l4.07-1.57a1 1 0 0 0 .58-.58z"/>
    </svg>
  `;

  constructor() {
    super();
    // search API config, mirroring <lw-ai-search>
    this.searchBase    = '';
    this.searchKey     = '';
    this.searchIndex   = 'all';
    this.semanticRatio = 0.5;
    this.searchPlaceholder = 'Ask a question to get instant AI answer';
    this.theme            = {};
    this._backendTheme    = {};
    this._backendQuestions = [];
    this._backendCitationsStyle = null;
    this.promptType = null;
    this.overviewHeading    = 'AI Answer';
    this.overviewCitations  = 'none';
    this.overviewParagraphs = [];
    this.modalTop          = '';
    this.href       = '';
    this.target     = '';
    this.queryParam = 'q';
    this.ctaLabel   = 'Ask Our Blog';
    this.ctaHref    = '';
    this.ctaTarget  = '';
    this.trigger    = 'hover';
    // Snapshot BEFORE this constructor assigns its own default below —
    // attributes present in the parsed HTML already exist on the element at
    // this point (they belong to the DOM node, independent of upgrade
    // timing), so this reliably tells apart "the integrator wrote btn-type on
    // the tag" from "nothing was written and this constructor's own default
    // is about to fill it in". _resolvedPosition (below) uses it to decide
    // whether the backend theme's widget.position is allowed to take over.
    this._btnTypeExplicit = this.hasAttribute('btn-type');
    // 'float' pins the button to the viewport corner; 'normal' lets it
    // sit inline wherever it is placed in the page.
    this.btnType    = 'float';
    this.btnLabel   = 'Search with AI';
    this.widgetStyle = '';
    this.searchDisplay = '';
    this.feedback = true;
    this.feedbackCta = 'Transform with DiscoverAI';
    // The full page has room for a sentence where the panel bar has room
    // for a name.
    this.feedbackCtaPage = 'Transform the way your team searches with AI';
    this.feedbackUrl = '';
    // Levelworks own lead form, the same one for every site that turns
    // the card on. Point feedback-embed elsewhere, or at nothing, to use
    // the built-in steps instead.
    //
    // embed=true is what makes it fit: without it the survey draws its
    // own page background and scrolls inside the frame, so the Next
    // button starts out below the fold.
    this.feedbackEmbed =
      'https://forms.levelworks.co/s/cmu6m906p001201nvpv3pikb9?embed=true';
    this._feedbackOpen = false;
    // Which of the three bar states is showing. bar-mode seeds it from
    // the tag; the icon group then owns it for the rest of the session.
    this.barMode        = '';
    this.barPlaceholder = 'Ask a question to get instant AI answer';
    this._barMode       = '';
    this._barMinimized  = false;
    // One entry per travelling chip row: how many times its questions are
    // repeated so a single copy always spans the viewport. Measured after
    // render, because it depends on how wide the questions turn out to be.
    this._chipRowCopies = [];
    // The visitor's own choice of panel vs full page, once they press the
    // toggle. Empty means "whatever the tag or the config says".
    this._displayOverride = '';
    this.btnSubtext = '';
    this.label      = 'Ask our blog';
    this.open       = false;
    this._dismissed = false;

    // modal state
    this.modalOpen     = false;
    this._showFeatures = true;
    this._showResults  = false;
    this._resultsReady = false;
    this._postCommit   = false;
    this._results      = [];
    this._loading      = false;
    this._noResults    = false;
    this._noResultsMsg = 'No results found';
    this._metaVisible  = false;
    this._metaHits     = '';
    this._metaTime     = '';
    this._inputValue   = '';
    this._summaryText  = '';
    this._summaryHits  = [];
    this._summaryParagraphs = [];
    // non-reactive search state
    this._page            = 1;
    this._hasMore         = true;
    this._currentQuery    = '';
    this._searchCommitted = false;
    this._debounceTimer   = null;
    this._abortController = null;
    this._themeAbortController = null;
    this._didPushState    = false;
    this._totalHits       = 0;
    this._totalTime       = 0;
    // Touch devices never get the hover treatment — the button toggles.
    this._canHover  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  get _resolvedTheme() {
    const backendTheme = normalizeTheme(this._backendTheme);
    const localTheme = normalizeTheme(this.theme);
    return mergeTheme(mergeTheme(DEFAULT_AI_THEME, backendTheme), localTheme);
  }

  /**
   * Widget Styling Config › maxSearchResultsToDisplay — caps how many of
   * the /summary hits the Further Reading list shows. Frontend-only:
   * it slices what's already in `_results`, it never changes what's asked
   * for or received from the backend. Unset/invalid means no cap, and so
   * does a negative value (e.g. -1) — that's the backend's own sentinel
   * for "no limit", not a malformed config.
   */
  get _maxSearchResultsToDisplay() {
    const raw = this._backendTheme?.maxSearchResultsToDisplay
      ?? this._backendTheme?.MaxSearchResultsToDisplay;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }

  /** `_results`, capped to `_maxSearchResultsToDisplay` for display. */
  get _furtherReadingResults() {
    const max = this._maxSearchResultsToDisplay;
    return max ? this._results.slice(0, max) : this._results;
  }

  get _suggestedQuestions() {
    // Backend-managed queries win; the theme items remain the fallback
    // for when none are configured or the request fails.
    if (this._backendQuestions?.length) return this._backendQuestions;
    return this._resolvedTheme.suggestedQuestions.items || [];
  }

  /**
   * Widget Styling Config › citationsStyle wins over the overview-citations
   * attribute/default, same precedence _suggestedQuestions gives the
   * backend-managed queries over the theme fallback.
   */
  get _resolvedCitations() {
    return this._backendCitationsStyle ?? this.overviewCitations;
  }

  get _suggestedQuestionsStyle() {
    return String(this._resolvedTheme.suggestedQuestionsStyle).trim().toLowerCase() === 'chips'
      ? 'chips'
      : 'card';
  }

  get _themeStyle() {
    const t = this._resolvedTheme;
    const questionFont = fontFamilyStack(t.questions.fontFamily);
    const headerFont = fontFamilyStack(t.text.header.fontFamily);
    const subtitleFont = fontFamilyStack(t.text.subtitle.fontFamily);
    const resultsHeadingFont = fontFamilyStack(t.results.headings.fontFamily);
    const resultsTitleFont = fontFamilyStack(t.results.blogTitle.fontFamily);
    const resultsBodyFont = fontFamilyStack(t.results.bodyText.fontFamily);
    // Only publish the card colours once a real surface is configured —
    // see isTransparentColor().
    const hasCardSurface = !isTransparentColor(t.card.backgroundColor);
    return [
      `--lw-ask-accent: ${t.widget.backgroundColor}`,
      `--lw-ask-accent-hover: ${t.widget.backgroundColor}`,
      `--lw-ai-widget-icon-color: ${t.widget.iconColor}`,
      `--lw-ai-widget-bg: ${t.widget.backgroundColor}`,
      `--lw-ai-button-bg: ${t.button.backgroundColor}`,
      `--lw-ai-button-color: ${t.button.textColor}`,
      `--lw-ai-button-outline: ${t.button.outlineColor}`,
      `--lw-ai-button-outline-width: ${typeof t.button.outlineThickness === 'number' ? `${t.button.outlineThickness}px` : t.button.outlineThickness}`,
      `--lw-ai-question-font: ${questionFont}`,
      `--lw-ai-question-bg: ${t.questions.backgroundColor}`,
      `--lw-ai-question-color: ${t.questions.textColor}`,
      `--lw-ai-corner-radius: ${typeof t.cornerRadius === 'number' ? `${t.cornerRadius}px` : t.cornerRadius}`,
      `--lw-ai-page-bg: ${t.page.backgroundColor}`,
      `--lw-ai-close-color: ${t.closeIcon.color}`,
      ...(hasCardSurface
        ? [`--lw-ai-card-bg: ${t.card.backgroundColor}`,
           `--lw-ai-card-color: ${t.card.textColor}`]
        : []),
      `--lw-ai-card-radius: ${t.card.cornerRadius}`,
      `--lw-ask-modal-title-font: ${headerFont}`,
      `--lw-ai-header-font: ${headerFont}`,
      `--lw-ai-header-color: ${t.text.header.color}`,
      `--lw-ai-subtitle-font: ${subtitleFont}`,
      `--lw-ai-subtitle-color: ${t.text.subtitle.color}`,
      `--lw-ai-search-color: ${t.text.search.color}`,
      `--lw-ai-search-placeholder: ${t.text.search.placeholder}`,
      `--lw-ai-results-heading-font: ${resultsHeadingFont}`,
      `--lw-ai-results-heading-color: ${t.results.headings.color}`,
      `--pl-title-font-family: ${resultsTitleFont}`,
      `--pl-title-color: ${t.results.blogTitle.color}`,
      `--pl-excerpt-font-family: ${resultsBodyFont}`,
      `--pl-excerpt-color: ${t.results.bodyText.color}`,
      `--pl-category-bg: ${t.results.chip.backgroundColor}`,
      `--pl-category-color: ${t.results.chip.color}`,
      // Card Background is deliberately NOT forwarded to the result rows:
      // it styles the search-page question cards only. The result cards
      // follow the *page* background instead, so a dark page does not
      // leave white grid cards floating on it. A transparent page colour
      // means "unset", and the child keeps its own default surface.
      ...(isTransparentColor(t.page.backgroundColor)
        ? []
        : [`--pl-card-background: ${t.page.backgroundColor}`]),
      `--pl-card-radius: ${t.card.cornerRadius}`,
      `--lw-ai-results-title-font: ${resultsTitleFont}`,
      `--lw-ai-results-title-color: ${t.results.blogTitle.color}`,
      `--lw-ai-results-title-hover-color: ${t.results.blogTitle.hoverColor}`,
      `--lw-ai-results-body-font: ${resultsBodyFont}`,
      `--lw-ai-results-body-color: ${t.results.bodyText.color}`,
      `--lw-ai-results-chip-bg: ${t.results.chip.backgroundColor}`,
      `--lw-ai-results-chip-color: ${t.results.chip.color}`,
      `--lw-ai-results-line-color: ${t.results.lineColor}`,
      `--pl-card-divider: ${t.results.lineColor}`,
      `--pl-header-border-color: ${t.results.lineColor}`,
    ].join(';');
  }

  connectedCallback() {
    super.connectedCallback();
    Promise.all(themeFontFamilies(this._resolvedTheme).map(loadGoogleFont));
    this.addEventListener('mouseenter', this._onEnter);
    this.addEventListener('mouseleave', this._onLeave);
    this.addEventListener('focusin',    this._onEnter);
    this.addEventListener('keydown',    this._onKeydown);
    // Focus can sit outside the component while the modal is up, so
    // Escape and Back are handled at the document / window level.
    document.addEventListener('keydown', this._onDocKeydown);
    window.addEventListener('resize', this._onWindowResize);
  }

  disconnectedCallback() {
    this.removeEventListener('mouseenter', this._onEnter);
    this.removeEventListener('mouseleave', this._onLeave);
    this.removeEventListener('focusin',    this._onEnter);
    this.removeEventListener('keydown',    this._onKeydown);
    document.removeEventListener('keydown', this._onDocKeydown);
    window.removeEventListener('resize', this._onWindowResize);
    // Never leave the page unscrollable behind a removed modal, nor
    // padded for a bar that is no longer there.
    if (this.modalOpen) this._teardownModal();
    this._barSpaceObserver?.disconnect();
    this._barSpaceObserver = null;
    this._releaseBarSpace();
    clearTimeout(this._debounceTimer);
    this._abortController?.abort();
    this._themeAbortController?.abort();
    super.disconnectedCallback();
  }

  updated(changedProperties) {
    // After every render, so the reserved space tracks the bar's height
    // through mode switches, minimizing, and position changes.
    this._syncBarSpace();
    this._syncChipRows();
    if (this.modalOpen) this._autoSizeInput();
    if (changedProperties.has('theme')) {
      Promise.all(themeFontFamilies(this._resolvedTheme).map(loadGoogleFont));
    }
    // Reflects the backend-configured position onto btn-type, the attribute
    // the styles above actually key off (:host([btn-type="bar"])) — btnType's
    // own reflect:true then syncs it onto the DOM attribute automatically.
    // Only when the tag never had btn-type written on it explicitly; an
    // explicit value, including "normal", is untouched (_resolvedPosition
    // returns it unchanged, so this is then always a no-op).
    // Checks both _backendTheme and theme: either can carry widget.position,
    // same layering _resolvedTheme itself merges them with.
    if (
      !this._btnTypeExplicit &&
      (changedProperties.has('_backendTheme') || changedProperties.has('theme'))
    ) {
      const resolved = this._resolvedPosition;
      if (this.btnType !== resolved) this.btnType = resolved;
    }
    if (changedProperties.has('searchBase') ||
        changedProperties.has('searchKey') ||
        changedProperties.has('searchIndex')) {
      // The suggested queries run after the theme: the tenant-scoped
      // endpoint is not available on the deployed API yet, and the
      // fallback needs the ids the styling config returns.
      this.refreshTheme().finally(() => this.refreshSuggestedQueries());
    }
  }

  get _themeEndpoint() {
    const base = (this.searchBase || '').replace(/\/+$/, '');
    const index = encodeURIComponent(this.searchIndex || 'all');
    return `${base}/api/v1/widget-styling-configs/${index}`;
  }

  get _suggestedQueriesEndpoint() {
    const base  = (this.searchBase || '').replace(/\/+$/, '');
    const index = encodeURIComponent(this.searchIndex || 'all');
    return `${base}/api/v1/indexes/${index}/suggested-queries`;
  }

  get _suggestedQueriesListEndpoint() {
    const base = (this.searchBase || '').replace(/\/+$/, '');
    return `${base}/api/v1/indexes/suggested-queries`;
  }

  /**
   * Suggested question chips for this index.
   *
   * Prefers the tenant-scoped endpoint, which is key-scoped and ordered
   * by displayOrder. That route currently answers 405 on the deployed
   * API, so it falls back to the anonymous all-clients list and picks
   * the entry matching this index — every index is named "all", so the
   * match is on searchIndexId/clientId from the styling config, never
   * on the name.
   */
  async refreshSuggestedQueries() {
    this._questionsAbortController?.abort();
    const controller = new AbortController();
    this._questionsAbortController = controller;

    const finish = (items, source) => {
      if (this._questionsAbortController !== controller) return null;
      this._backendQuestions = items;
      this.dispatchEvent(new CustomEvent('lw-ai-questions-loaded', {
        detail: { index: this.searchIndex, source, questions: items },
        bubbles: true,
        composed: true,
      }));
      return items;
    };

    try {
      // 1. tenant-scoped, keyed
      if (this.searchKey) {
        const res = await fetch(this._suggestedQueriesEndpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'X-API-Key': this.searchKey },
          signal: controller.signal,
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length) {
            const items = [...rows]
              .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
              .map(r => r.queryText)
              .filter(Boolean);
            if (items.length) return finish(items, 'index');
          }
          return finish([], 'index');
        }
      }

      // 2. anonymous list, matched on the ids the theme gave us
      const listRes = await fetch(this._suggestedQueriesListEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      if (!listRes.ok) throw new Error(`Suggested queries failed: ${listRes.status}`);

      const list = await listRes.json();
      const indexId  = this._backendTheme?.searchIndexId ?? this._backendTheme?.SearchIndexId;
      const clientId = this._backendTheme?.clientId ?? this._backendTheme?.ClientId;
      const entry = Array.isArray(list)
        ? list.find(e => indexId && e.searchIndexId === indexId)
          ?? list.find(e => clientId && e.clientId === clientId)
        : null;

      // Without ids there is no way to tell the tenants apart, so leave
      // the configured defaults in place rather than guessing.
      if (!entry) return finish([], 'unmatched');
      return finish((entry.queries || []).filter(Boolean), 'list');
    } catch (error) {
      if (error.name === 'AbortError' || this._questionsAbortController !== controller) return null;
      console.error('<lw-ai-search> suggested queries:', error);
      this._backendQuestions = [];
      this.dispatchEvent(new CustomEvent('lw-ai-questions-error', {
        detail: { index: this.searchIndex, message: error.message },
        bubbles: true,
        composed: true,
      }));
      return null;
    }
  }

  /** Fetch the latest public styling configuration for this search index. */
  async refreshTheme() {
    this._themeAbortController?.abort();

    // The public GET endpoint requires a search access key. Until one is
    // supplied, render the frontend defaults plus any explicit local theme.
    if (!this.searchKey) {
      this._themeAbortController = null;
      this._backendTheme = {};
      this._backendCitationsStyle = null;
      this.promptType = null;
      return null;
    }

    const controller = new AbortController();
    this._themeAbortController = controller;
    this._backendTheme = {};
    this._backendCitationsStyle = null;
    this.promptType = null;

    try {
      const response = await fetch(this._themeEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': this.searchKey,
        },
        signal: controller.signal,
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        // The status-based error below remains useful for an empty/non-JSON
        // response, while successful empty responses simply use defaults.
      }

      if (!response.ok) {
        const error = new Error(payload.message || `Theme request failed with status ${response.status}`);
        error.code = payload.error || 'theme_request_failed';
        error.status = response.status;
        throw error;
      }

      if (this._themeAbortController !== controller) return null;

      const config = payload.widgetStylingConfig ?? payload.WidgetStylingConfig;
      const nextBackendTheme = config && typeof config === 'object' ? config : {};
      const nextCitationsStyle = normalizeCitationsStyle(
        nextBackendTheme.citationsStyle ?? nextBackendTheme.CitationsStyle,
      );
      const nextPromptType = payload.promptType ?? payload.PromptType
        ?? nextBackendTheme.promptType ?? nextBackendTheme.PromptType ?? null;
      const nextResolvedTheme = mergeTheme(
        mergeTheme(DEFAULT_AI_THEME, normalizeTheme(nextBackendTheme)),
        normalizeTheme(this.theme),
      );

      // Keep the current Inter typography until every requested regular
      // font is ready, then apply the backend theme in one update.
      await Promise.all(themeFontFamilies(nextResolvedTheme).map(loadGoogleFont));
      if (this._themeAbortController !== controller) return null;

      this._backendTheme = nextBackendTheme;
      this._backendCitationsStyle = nextCitationsStyle;
      this.promptType = nextPromptType;
      this.dispatchEvent(new CustomEvent('lw-ai-theme-loaded', {
        detail: { index: this.searchIndex, theme: this._backendTheme },
        bubbles: true,
        composed: true,
      }));
      return this._backendTheme;
    } catch (error) {
      if (error.name === 'AbortError' || this._themeAbortController !== controller) return null;

      this._backendTheme = {};
      this._backendCitationsStyle = null;
      this.promptType = null;
      this.dispatchEvent(new CustomEvent('lw-ai-theme-error', {
        detail: {
          index: this.searchIndex,
          code: error.code || 'theme_request_failed',
          message: error.message,
          status: error.status || 0,
        },
        bubbles: true,
        composed: true,
      }));
      return null;
    } finally {
      if (this._themeAbortController === controller) this._themeAbortController = null;
    }
  }

  _onDocKeydown = (e) => {
    if (e.key !== 'Escape' || !this.modalOpen) return;
    // Escape steps back from a post to the results first.
    this.closeSearch();
  };



  /**
   * Collapsed launcher presentation: 'icon' or 'icon-text'.
   *
   * Independent of btn-type, which decides *where* the launcher sits
   * (floating vs inline); this decides whether it carries a label. A
   * widget-style attribute on the tag wins over the backend config, the
   * same precedence every other theme value follows.
   */
  get _launcherStyle() {
    const local = String(this.widgetStyle ?? '').trim();
    return normalizeWidgetStyle(local || this._resolvedTheme.widget.style);
  }

  /**
   * Resolved btn-type: 'float', 'bar', 'normal' or its 'btn-normal' alias.
   *
   * An explicit btn-type attribute on the tag always wins, whatever value it
   * carries — including "normal", which is a deliberate, unrelated choice
   * (see _inline) that a backend-configured position must never override.
   * Only when nothing was written on the tag does the backend theme's
   * widget.position get a say, same precedence widget-style already follows
   * via _launcherStyle.
   */
  get _resolvedPosition() {
    if (this._btnTypeExplicit) return String(this.btnType ?? '').trim();
    // normalizeWidgetPosition answers 'floating' or 'bar'; 'bar' is the
    // only value that changes the layout, so everything else is the
    // corner button, whose btn-type spelling is 'float'.
    return normalizeWidgetPosition(this._resolvedTheme.widget.position) === 'bar'
      ? 'bar'
      : 'float';
  }

  /** True when btn-type asks for an inline (non-fixed) button. */
  get _inline() {
    return /^(btn-)?normal$/i.test(this._resolvedPosition);
  }

  /**
   * Active bar state: 'search', 'questions' (the fixed four) or 'scroll'
   * (every question, moving). The visitor's choice wins once they press
   * an icon; before that the tag's bar-mode seeds it, defaulting to the
   * fixed four.
   */
  get _activeBarMode() {
    const chosen = String(this._barMode || this.barMode || '').trim().toLowerCase();
    return LwAiSearch.barModes.includes(chosen) ? chosen : 'questions';
  }

  _setBarMode(mode) {
    this._barMode = mode;
    this.dispatchEvent(new CustomEvent('lw-ask-bar-mode', {
      detail: { mode }, bubbles: true, composed: true,
    }));
  }

  _toggleBarMinimized = () => {
    this._barMinimized = !this._barMinimized;
    this.dispatchEvent(new CustomEvent('lw-ask-bar-minimize', {
      detail: { minimized: this._barMinimized }, bubbles: true, composed: true,
    }));
  };

  _onBarSubmit = (e) => {
    e.preventDefault();
    const input = this.shadowRoot?.querySelector('.bar-form input');
    this.openSearch(input?.value.trim() || '');
  };

  /**
   * 'fullpage' or 'panel'. A search-display attribute on the tag wins over
   * the backend config, the precedence every other theme value follows.
   */
  get _searchDisplayMode() {
    // Precedence: what the visitor picked, then the tag, then the config.
    const chosen = String(this._displayOverride ?? '').trim();
    if (chosen) return normalizeSearchDisplay(chosen);
    const local = String(this.searchDisplay ?? '').trim();
    return normalizeSearchDisplay(local || this._resolvedTheme.searchDisplayMode);
  }

  /**
   * Swap the open search between the side panel and the full page.
   *
   * The element and its results stay exactly as they are -- only the
   * layout changes -- but the two modes treat the host page differently,
   * so the squeeze and the scroll lock have to be handed over: the panel
   * pushes the page aside and leaves it usable, the full page covers it
   * and holds it still.
   */
  _toggleDisplayMode = () => this._setDisplayMode(this._isPanel ? 'fullpage' : 'panel');

  _setDisplayMode = (next) => {
    if (normalizeSearchDisplay(next) === this._searchDisplayMode) return;
    this._displayOverride = next;

    this.updateComplete.then(() => {
      if (next === 'panel') {
        document.body.style.overflow = '';
        this._pushPage(true);
      } else {
        this._pushPage(false);
        document.body.style.overflow = 'hidden';
      }
    });

    this.dispatchEvent(new CustomEvent('lw-ask-display-change', {
      detail: { mode: next }, bubbles: true, composed: true,
    }));
  };

  get _isPanel() {
    return this._searchDisplayMode === 'panel';
  }

  /** True when widget.position (or btn-type) asks for the bottom bar. */
  get _isBar() {
    return this._resolvedPosition === 'bar';
  }

  get _hoverEnabled() {
    // Touch/coarse-pointer devices and tablet-sized layouts use a deliberate
    // two-tap flow: first tap opens the floating options, second tap opens the
    // search modal. This avoids relying only on the browser's hover report.
    const touchOrTablet = window.matchMedia('(pointer: coarse)').matches
      || window.innerWidth <= 1024;
    return !this._inline && !this._isBar
      && this.trigger === 'hover' && this._canHover && !touchOrTablet;
  }

  _setOpen(value) {
    if (this.open === value) return;
    this.open = value;
    this.dispatchEvent(new CustomEvent('lw-ask-toggle', {
      detail:   { open: value },
      bubbles:  true,
      composed: true,
    }));
  }

  _onEnter = () => {
    if (this._hoverEnabled && !this._dismissed) this._setOpen(true);
  };

  // The panel is sticky — leaving the widget never closes it. Only the
  // close button or Escape does. Leaving does clear a dismiss, so a
  // later hover can open the panel again.
  _onLeave = () => {
    this._dismissed = false;
  };

  _onFab = (e) => {
    // The inline button has no panel, so it always just follows the link.
    // Elsewhere, without hover — touch, or trigger="click" — the first
    // press reveals the options and the press after that follows it.
    if (!this._inline && !this._isBar && !this._hoverEnabled && !this.open) {
      e.preventDefault();
      this._setOpen(true);
      return;
    }

    const ev = new CustomEvent('lw-ask-navigate', {
      detail:     { href: this.href },
      bubbles:    true,
      composed:   true,
      cancelable: true,
    });
    this.dispatchEvent(ev);

    if (ev.defaultPrevented) {
      e.preventDefault();
      return;
    }

    // The button opens the modal on an empty search.
    if (this.openSearch()) { e.preventDefault(); return; }

    // With no modal and no href there is nowhere to go. The floating
    // button falls back to toggling its panel; the inline one does nothing.
    if (!this.href) {
      e.preventDefault();
      if (this._inline) return;
      this._dismissed = this.open;
      this._setOpen(!this.open);
    }
  };

  _onInlineFab = (e) => {
    if (!this._inline) return this._onFab(e);
    e.preventDefault();
    this.openSearch();
  };

  _onClose = (e) => {
    e.stopPropagation();
    this._dismissed = true;
    this._setOpen(false);
  };

  _onKeydown = (e) => {
    // The modal owns Escape while it is up (see _onDocKeydown).
    if (this.modalOpen) return;
    if (e.key !== 'Escape' || !this.open) return;
    this._dismissed = true;
    this._setOpen(false);
    this.renderRoot.querySelector('.fab')?.focus();
  };

  // ── Search modal ───────────────────────────────────────────
  // The modal lives in this component: nothing navigates away and no
  // other element is needed. `href` stays as a plain-link fallback for
  // middle-click / open-in-new-tab.

  /** Open the modal, optionally running `query` straight away. */
  /**
   * The bar is fixed to the bottom of the viewport, so it covers whatever
   * the page ends with -- a footer, a copyright line, the last row of a
   * list. Padding the body by the strip's own height gives that content
   * somewhere to go, and the page can be scrolled clear of the widget.
   *
   * The height is re-read rather than assumed: it changes with the bar's
   * state (a wrapped question on a phone is taller), when it is minimized
   * down to its tab, and on resize.
   */
  _syncBarSpace() {
    const body = document.body;
    if (!body) return;

    const wrap    = this.shadowRoot?.querySelector('.bar-wrap');
    const inBar   = this._isBar && !this._inline && !!wrap;
    const bar     = this.shadowRoot?.querySelector('.bar');
    const tab     = this.shadowRoot?.querySelector('.bar-toggle');
    const visible = el => el && el.getBoundingClientRect().height > 0;

    // Minimized, the strip is display:none and only the tab shows, so the
    // reserved height follows whichever is on screen. While the search is
    // open both are hidden and the height is zero.
    const height = !inBar ? 0 : Math.ceil(
      visible(bar) ? bar.getBoundingClientRect().height
                   : (visible(tab) ? tab.getBoundingClientRect().height : 0));

    if (!height) {
      // Nothing is on screen to clear, so the page gets its own padding
      // back -- otherwise the gap the bar left behind stays at the foot of
      // the page while the search covers it.
      this._releaseBarSpace();
      if (!inBar) {
        this._barSpaceObserver?.disconnect();
        this._barSpaceObserver = null;
      }
      return;
    }

    // Remember what the site had before the first write, never after --
    // value and priority both, so a theme's own !important survives.
    if (this._barSpace == null) {
      this._barSpace = [
        body.style.getPropertyValue('padding-bottom'),
        body.style.getPropertyPriority('padding-bottom'),
      ];
    }
    // Written as !important: an inline style loses to a stylesheet rule
    // that carries !important, and themes do write those on body.
    const next = `${height}px`;
    if (body.style.getPropertyValue('padding-bottom') !== next
        || body.style.getPropertyPriority('padding-bottom') !== 'important') {
      body.style.setProperty('padding-bottom', next, 'important');
    }

    // The padding clears the bar for anything in normal flow, but not for
    // a section that asked for the whole viewport: 100vh is 100vh whatever
    // is fixed over it, so such a section keeps its last strip underneath
    // the bar. Nothing in CSS can shorten it from out here, so the height
    // is published instead and the page can subtract it itself:
    //
    //   .hero { min-height: calc(100vh - var(--lw-ask-bar-space, 0px)); }
    //
    // It is set on <html>, not on this element, so the page can read it
    // from anywhere, and it is removed again with the padding below.
    document.documentElement.style.setProperty('--lw-ask-bar-space', next);

    if (!this._barSpaceObserver && window.ResizeObserver) {
      this._barSpaceObserver = new ResizeObserver(() => this._syncBarSpace());
      this._barSpaceObserver.observe(wrap);
    }
  }

  /**
   * A row loops seamlessly only while one copy of its questions is at
   * least as wide as the row itself -- otherwise the translate runs past
   * the end of the content and a gap travels through. Short rows are
   * repeated until they cover the screen; the shift is always exactly one
   * copy, so the reset lands on an identical frame either way.
   */
  _syncChipRows() {
    const marquees = this.shadowRoot?.querySelectorAll('.suggested-marquee');
    if (!marquees || !marquees.length) {
      if (this._chipRowCopies.length) this._chipRowCopies = [];
      return;
    }

    const next = [];
    let changed = false;
    marquees.forEach((marquee, r) => {
      const track = marquee.querySelector('.suggested-track');
      const have  = Number(track?.dataset.copies) || 2;
      const width = marquee.clientWidth;
      const copy  = track ? track.scrollWidth / have : 0;
      if (!track || !width || copy < 1) { next[r] = have; return; }
      // One spare copy beyond what covers the row, so the trailing edge
      // is never on screen at the moment of the reset.
      const need = Math.max(2, Math.ceil(width / copy) + 1);
      next[r] = need;
      if (need !== have) changed = true;
    });

    if (changed) this._chipRowCopies = next;
  }

  /** Hand the page back the padding it had before the bar reserved any. */
  _releaseBarSpace() {
    document.documentElement.style.removeProperty('--lw-ask-bar-space');
    if (this._barSpace == null) return;
    const body = document.body;
    body.style.removeProperty('padding-bottom');
    if (this._barSpace[0]) {
      body.style.setProperty('padding-bottom', this._barSpace[0], this._barSpace[1]);
    }
    this._barSpace = null;
  }

  _onWindowResize = () => this._syncBarSpace();

  /**
   * Squeeze the host page into the space the panel leaves, and put it back
   * again. Narrowing <html> reflows the whole document rather than only
   * body's children, but the site's own position:fixed elements are laid
   * out against the viewport and would stay full width and slide under the
   * panel, so the wide ones are pulled in too and a resize event is fired
   * for any script that measures on its own.
   *
   * Every property this touches is recorded first and written back on
   * close, including the ones set on the site's elements.
   */
  _pushPage(on) {
    const root = document.documentElement;

    if (!on) {
      const saved = this._pagePush;
      if (!saved) return;
      root.style.width     = saved.width;
      root.style.minWidth  = saved.minWidth;
      root.style.overflowX = saved.overflowX;
      root.style.transition = saved.transition;
      saved.patched.forEach(({ el, props }) => {
        Object.entries(props).forEach(([prop, [value, priority]]) => {
          el.style.removeProperty(prop);
          if (value) el.style.setProperty(prop, value, priority);
        });
      });
      this._pagePush = null;
      this.style.removeProperty('--lw-ask-panel-inset');
      window.dispatchEvent(new Event('resize'));
      return;
    }

    if (this._pagePush) return;

    const overlay = this.shadowRoot?.querySelector('#ai-search-overlay');
    const width = Math.round(overlay?.getBoundingClientRect().width || 0);
    if (!width) return;

    const patched = [];
    const save = (el, prop) =>
      [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)];

    // Only elements wide enough to actually run under the panel are worth
    // touching; narrow fixed things (chat bubbles, back-to-top buttons)
    // are left where the site put them.
    Array.prototype.forEach.call(document.body.getElementsByTagName('*'), el => {
      if (el === this || this.contains(el)) return;
      if (getComputedStyle(el).position !== 'fixed') return;
      const rect = el.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.5 || rect.height < 6) return;
      patched.push({ el, props: {
        width:       save(el, 'width'),
        'max-width': save(el, 'max-width'),
        right:       save(el, 'right'),
      } });
      el.style.setProperty('width', `calc(100% - ${width}px)`, 'important');
      el.style.setProperty('max-width', `calc(100% - ${width}px)`, 'important');
      el.style.setProperty('right', `${width}px`, 'important');
    });

    this._pagePush = {
      width:      root.style.width,
      minWidth:   root.style.minWidth,
      overflowX:  root.style.overflowX,
      transition: root.style.transition,
      patched,
    };

    root.style.transition = 'width .28s ease';
    root.style.width      = `calc(100% - ${width}px)`;
    root.style.minWidth   = '0';
    root.style.overflowX  = 'hidden';

    // This element is fixed too, so it needs the same inset to stay clear
    // of the panel.
    this.style.setProperty('--lw-ask-panel-inset', `${width}px`);

    window.dispatchEvent(new Event('resize'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  }

  openSearch(query = '') {
    // Collapse the question panel so the modal is not layered over it.
    this._setOpen(false);

    // Never leave two modals stacked on one page.
    if (activeModal && activeModal !== this) activeModal.closeSearch();
    activeModal = this;

    this.modalOpen = true;
    // A new opening starts from the bar, not mid-form.
    this._feedbackOpen = false;

    // The full-page modal owns the viewport, so the page behind it is
    // locked. The panel leaves the page usable and pushes it aside.
    if (this._isPanel) {
      this.updateComplete.then(() => this._pushPage(true));
    } else {
      document.body.style.overflow = 'hidden';
    }
    this._resetToHeroView();

    // A pushed history entry lets Back / the Android back button close
    // the modal instead of leaving the page.
    bindPopstate();
    history.pushState({ lwAskOpen: true }, '', location.href);
    this._didPushState = true;

    const q = (query ?? '').trim();
    if (q) {
      this._inputValue = q;
      this.updateComplete.then(() => {
        if (this._input) this._input.value = q;
        this._commitSearch();
      });
    } else {
      this.updateComplete.then(() => this._input?.focus());
    }

    this.dispatchEvent(new CustomEvent('lw-ask-modal-open', {
      detail:   { query: q },
      bubbles:  true,
      composed: true,
    }));
    return true;
  }

  closeSearch = () => {
    if (!this.modalOpen) return;
    this._teardownModal();
    if (this._didPushState) {
      this._didPushState = false;
      // Our own back() must not be mistaken for the user pressing Back.
      pendingSelfPop++;
      history.back();
    }
    this.dispatchEvent(new CustomEvent('lw-ask-modal-close', {
      bubbles: true, composed: true,
    }));
  };

  /** Back button: close without touching history again. */
  _closeFromHistory() {
    if (!this.modalOpen) return;
    this._didPushState = false;
    this._teardownModal();
    this.dispatchEvent(new CustomEvent('lw-ask-modal-close', {
      bubbles: true, composed: true,
    }));
  }

  _teardownModal() {
    this._postCommit = false;
    this.modalOpen   = false;
    this._pushPage(false);
    document.body.style.overflow = '';
    this._abortController?.abort();
    if (activeModal === this) activeModal = null;
  }

  /**
   * The call to action at the foot of the panel, and the card it opens.
   * The panel is the only place either belongs: the full page has room
   * for neither, and a site that has not asked for the card gets no
   * button offering it.
   */
  get _showFeedbackCta() {
    return this.feedback && this._isPanel;
  }

  // The full page's own way in: a corner card instead of a bar, and out
  // of the way once the form it opens is up.
  get _showFeedbackPageCta() {
    return this.feedback && !this._isPanel && !this._feedbackOpen;
  }

  _openFeedback = () => {
    this._feedbackOpen = true;
    // A second opening starts at the question again, not wherever the
    // last one was abandoned.
    this.updateComplete.then(() =>
      this.renderRoot?.querySelector('lw-feedback-card')?.reset());
  };

  /** Passed on under our own name, so the page listens to one element. */
  _relayFeedback(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      detail, bubbles: true, composed: true,
    }));
  }

  _onFeedbackResponse = e => {
    this._relayFeedback('lw-ask-feedback-response', {
      ...e.detail, query: this._currentQuery,
    });
  };

  _onFeedbackSubmit = e => {
    this._relayFeedback('lw-ask-feedback', {
      ...e.detail, query: this._currentQuery, index: this.searchIndex,
    });
  };

  // Both the × and Go back land here: either way the card has had its
  // turn, and the panel goes back to being the panel -- with the button
  // still there, so it can be opened again.
  _onFeedbackDismiss = () => { this._feedbackOpen = false; };

  get _input() { return this.renderRoot?.querySelector('#searchInput'); }
  get _modal() { return this.renderRoot?.querySelector('#ai-search-modal'); }



  _onOverlayClick(e) {
    if (e.target === e.currentTarget) this.closeSearch();
  }

  /**
   * Fit the field to what is in it: one line, two, then a scroll. Called
   * after input and after every render, since the value can also arrive
   * from a suggested question or from the bar.
   */
  _autoSizeInput() {
    const el = this._input;
    if (!el || el.tagName !== 'TEXTAREA') return;
    // Height has to go back to content size before measuring, or
    // scrollHeight only ever reports the height set last time.
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    // max-height caps the growth; past that the text scrolls instead.
    el.style.overflowY = el.scrollHeight > el.clientHeight ? 'auto' : 'hidden';
  }

  _onModalInput(e) {
    // Pasted text can carry newlines, which a one-line field has no way
    // to show; they become spaces rather than hidden lines.
    if (e.target.value.includes('\n')) {
      e.target.value = e.target.value.replace(/\s*\n+\s*/g, ' ');
    }
    const value = e.target.value;
    this._inputValue = value;
    this._autoSizeInput();
    clearTimeout(this._debounceTimer);
    const trimmed = value.trim();
    this._currentQuery = trimmed;
    if (!trimmed) { this._resetSearch(); return; }

    // ── Search-as-you-type (disabled — kept for reference) ──
    // Used to run a debounced re-search on every keystroke once the first
    // search had been committed via Enter, which made typing behave
    // inconsistently before vs. after that first commit. Search now runs
    // only on Enter (see _onModalKeydown / _commitSearch).
    // this._debounceTimer = setTimeout(() => {
    //   if (!this._searchCommitted) return;
    //   this._fetchResults(trimmed, 1);
    // }, 350);
  }

  _onModalKeydown(e) {
    // Enter searches; it never puts a line break in the field.
    if (e.key === 'Enter') { e.preventDefault(); this._commitSearch(); }
  }

  _onModalClear() {
    this._inputValue   = '';
    this._currentQuery = '';
    // Back to the opening screen, so the question cards are reachable again.
    this._searchCommitted = false;
    this._showFeatures    = true;
    this._showResults     = false;
    this._postCommit      = false;
    this._resetSearch();
    this.updateComplete.then(() => this._input?.focus());
  }

  _onModalScroll() {
    const panel = this._modal;
    if (!panel) return;
    // const nearBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 300;
    // Pagination disabled along with /api/v1/search/: /summary returns one
    // batch of hits with no paging, and _hasMore is now always false after
    // a search (see _fetchSummary).
    // if (nearBottom && this._hasMore && !this._loading && this._currentQuery) {
    //   this._page++;
    //   this._fetchResults(this._currentQuery, this._page, { prefetch: true });
    // }
  }

  /** A question card in the modal runs that question straight away. */
  _onCardClick(question, index) {
    this.dispatchEvent(new CustomEvent('lw-ask-question', {
      detail:   { question, index, href: this._questionHref(question) },
      bubbles:  true,
      composed: true,
    }));
    this._inputValue = question;
    this.updateComplete.then(() => {
      if (this._input) this._input.value = question;
      this._searchCommitted = false;
      this._commitSearch();
    });
  }

  _commitSearch() {
    const q = this._input?.value.trim() || '';
    if (!q) return;
    // No "already committed" guard here — every Enter press re-runs the
    // search. Search-as-you-type used to be what carried later searches
    // once _searchCommitted was true (see the disabled block in
    // _onModalInput); now that it's off, this is the only path, so it
    // must not lock up after the first query. _fetchSummary already
    // aborts any in-flight request, so a rapid re-submit is safe.
    this._loading       = true;
    this._noResults      = false;
    this._resultsReady   = false;
    this._fetchSummary(q);
    this._currentQuery    = q;
    this._searchCommitted = true;
    this._showFeatures    = false;
    this._showResults     = true;
    this._postCommit      = true;
    // /api/v1/search/{index} disabled for now — every search runs through
    // /summary only (see _fetchSummary above, which now supplies Further
    // Reading too). /summary/stream is unused — see _fetchSummaryStream.
    // this._fetchResults(q, 1);
  }

  get _endpoint() {
    const base  = (this.searchBase || '').replace(/\/+$/, '');
    const index = encodeURIComponent(this.searchIndex || 'all');
    return `${base}/api/v1/search/${index}`;
  }

  async _fetchResults(query, pageNum = 1, { prefetch = false } = {}) {
    if (query !== (this._input?.value.trim() ?? '')) return;

    if (!prefetch && this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const signal = prefetch ? undefined : this._abortController.signal;

    this._loading   = true;
    this._noResults = false;
    if (!prefetch) this._resultsReady = false;

    try {
      const res = await fetch(this._endpoint, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY':    this.searchKey,
        },
        body: JSON.stringify({
          query,
          limit:         LwAiSearch.pageLimit,
          semanticRatio: Number(this.semanticRatio),
          page:          pageNum,
        }),
        signal,
      });
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();

      if (query !== (this._input?.value.trim() ?? '')) return;

      const items = data?.hits ?? [];
      this._totalHits = data?.estimatedTotalHits ?? 0;
      this._totalTime = data?.processingTimeMs   ?? 0;

      if (pageNum === 1) {
        this._results      = items;
        this._page         = 1;
        this._noResults    = items.length === 0;
        this._noResultsMsg = 'No results found';
        this._resultsReady = true;
      } else {
        this._results = [...this._results, ...items];
      }

      this._hasMore = items.length === LwAiSearch.pageLimit;
      this._renderMeta(query);

      this.dispatchEvent(new CustomEvent('lw-ask-results', {
        detail:   { query, page: pageNum, results: this._results, total: this._totalHits },
        bubbles:  true,
        composed: true,
      }));
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('<lw-ai-search> search error:', err);
      this._noResults    = true;
      this._resultsReady = true;
      this._noResultsMsg = 'Something went wrong. Please try again.';
    } finally {
      if (!signal?.aborted) this._loading = false;
    }
  }

  _resetToHeroView() {
    this._page            = 1;
    this._loading         = false;
    this._hasMore         = true;
    this._currentQuery    = '';
    this._searchCommitted = false;
    this._inputValue      = '';
    this._resultsReady    = false;
    this._postCommit      = false;
    clearTimeout(this._debounceTimer);
    if (this._abortController) { this._abortController.abort(); this._abortController = null; }
    this._results      = [];
    this._summaryText  = '';
    this._summaryHits  = [];
    this._summaryParagraphs = [];
    this._noResults    = false;
    this._metaVisible  = false;
    this._metaHits     = '';
    this._metaTime     = '';
    this._showResults  = false;
    this._showFeatures = true;
  }

  // ── Overview: POST {base}/api/v1/search/{index}/summary ─────────────
  // Non-streaming. Returns both the per-section overview (answer[]) and
  // the article hits used as citations, in one response.
  get _summaryUrl() {
    const base  = (this.searchBase || '').replace(/\/+$/, '');
    const index = encodeURIComponent(this.searchIndex || 'all');
    return `${base}/api/v1/search/${index}/summary`;
  }

  async _fetchSummary(query) {
    // One controller per request: rapid typing must not let a stale
    // response overwrite a newer one.
    this._summaryAbort?.abort();
    const ctrl = new AbortController();
    this._summaryAbort = ctrl;

    try {
      const res = await fetch(this._summaryUrl, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY':    this.searchKey,
        },
        body: JSON.stringify({
          query,
          filter:        {},
          limit:         LwAiSearch.pageLimit,
          semanticRatio: Number(this.semanticRatio),
          modelProvider : "vast",
          // Forwarded as-is from the widget styling config, see refreshTheme.
          ...(this.promptType != null ? { promptType: this.promptType } : {}),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Summary failed: ${res.status}`);
      const data = await res.json();
      if (this._summaryAbort !== ctrl) return;   // superseded

      // Apply even when empty — a genuine "no results" answer.
      this._summaryHits  = Array.isArray(data?.hits) ? data.hits : [];
      this._results       = this._summaryHits;
      this._hasMore        = false;
      this._resultsReady   = true;
      this._noResults      = this._results.length === 0;
      this._noResultsMsg   = 'No results found';
      this._loading        = false;
      // answer can be null (LLM skipped due to quota) — hits still render
      // via the list, just with no overview section.
      this._summaryParagraphs = this._mapAnswerToParagraphs(data?.answer, this._summaryHits);
      this.dispatchEvent(new CustomEvent('lw-ask-results', {
        detail:   { query: this._currentQuery, page: 1, results: this._results, total: this._results.length },
        bubbles:  true,
        composed: true,
      }));
    } catch (err) {
      if (err.name === 'AbortError') return;
      // The summary endpoint fails occasionally; leave whatever is
      // already rendered rather than blanking the section.
      console.error('<lw-ai-search> summary:', err);
      if (!this._resultsReady) {
        this._noResults    = true;
        this._noResultsMsg = 'Something went wrong. Please try again.';
        this._resultsReady = true;
      }
      this._loading = false;
    }
  }

  // Maps the /summary response's per-section `answer` + top-level `hits`
  // into <lw-blog-overview>'s paragraphs shape: [{ text, citation?: {
  // label, articles } }]. `answer: null` (LLM skipped) yields no overview
  // paragraphs. A section with no citations (e.g. a canned "no relevant
  // information" message) yields a paragraph with no `citation` key.
  _mapAnswerToParagraphs(answer, hits) {
    if (!Array.isArray(answer)) return [];

    return answer.map(section => {
      const citations = Array.isArray(section.citations) ? section.citations : [];
      if (!citations.length) return { text: section.text };

      const articles = citations
        .map(i => hits[i])
        .filter(Boolean)
        .map(h => ({
          title:   h.title   ?? '',
          excerpt: h.summary ?? h.bodySummary ?? h.body ?? '',
          image:   (h.imageUrl ?? '').replace(/^\/\//, 'https://'),
          // Same protocol-relative fix the image above gets: a crawled
          // `//host/path` url left raw resolves against the demo host,
          // opening the wrong page. `||` not `??` — hits can also carry
          // an empty url string.
          url: (h.canonicalUrl || h.url || '').replace(/^\/\//, 'https://') || '#',
        }));
      if (!articles.length) return { text: section.text };

      return { text: section.text, citation: { label: this._citationLabel(articles), articles } };
    });
  }

  // Citation pill label: the lead article's full title, plus
  // "+m" for the remaining (m = total - 1) sources, e.g. "Understanding X +2".
  // Falls back to "Source" only when the title itself is null/undefined.
  _citationLabel(articles) {
    const title = articles[0]?.title;
    const displayTitle = title == null ? 'Source' : title;
    const more = articles.length - 1;
    return more > 0 ? `${displayTitle} +${more}` : displayTitle;
  }

  // UNUSED right now but DO NOT REMOVE — the /summary/stream path. /summary
  // (non-streaming, see _fetchSummary above) replaced this as the active
  // call in _commitSearch() because it now returns part-level citations
  // that /summary/stream does not. If streaming is reintroduced later,
  // this is the starting point.
  //
  // ── Overview: POST {base}/api/v1/search/{index}/summary/stream ──────
  // Server-sent events; one call returns both the overview text and the
  // article hits used as citations.
  get _summaryStreamUrl() {
    const base  = (this.searchBase || '').replace(/\/+$/, '');
    const index = encodeURIComponent(this.searchIndex || 'all');
    return `${base}/api/v1/search/${index}/summary/stream`;
  }

  async _fetchSummaryStream(query) {
    // One controller per request: rapid typing must not let a stale
    // stream overwrite a newer one.
    this._summaryAbort?.abort();
    const ctrl = new AbortController();
    this._summaryAbort = ctrl;

    try {
      const res = await fetch(this._summaryStreamUrl, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'text/event-stream',
          'X-API-KEY':    this.searchKey,
        },
        body: JSON.stringify({
          query,
          filter:        {},
          limit:         LwAiSearch.pageLimit,
          semanticRatio: Number(this.semanticRatio),
          modelProvider:"vast",
          // Forwarded as-is from the widget styling config, see refreshTheme.
          ...(this.promptType != null ? { promptType: this.promptType } : {}),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Summary failed: ${res.status}`);
      if (!res.body) throw new Error('Summary stream has no body');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (this._summaryAbort !== ctrl) return;   // superseded mid-stream
        buffer += decoder.decode(value, { stream: true });
        // Frames are separated by a blank line; the tail may be partial.
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';
        for (const frame of frames) this._handleSseFrame(frame);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      // The summary endpoint fails occasionally; leave whatever is
      // already rendered rather than blanking the section.
      console.error('<lw-ai-search> summary stream:', err);
      // Only show the error state if the 'hits' event never even arrived —
      // once results are showing, a later failure (e.g. the token stream
      // dropping) shouldn't blank them out from under the user.
      if (!this._resultsReady) {
        this._noResults    = true;
        this._noResultsMsg = 'Something went wrong. Please try again.';
        this._resultsReady = true;
      }
      this._loading = false;
    }
  }

  /**
   * UNUSED right now but DO NOT REMOVE — see _fetchSummaryStream. Only
   * called from there.
   *
   * One SSE frame. `hits` carries the citation articles and starts a new
   * answer, `token` appends (never replaces), `error` is an in-band
   * failure that arrives after a 200 and so cannot be caught by res.ok.
   *
   * `hits` is also the sole source for the "Further Reading" list now
   * that /api/v1/search/ is disabled — it feeds `_results` directly,
   * the same array <lw-blog-list> was reading from that endpoint.
   */
  _handleSseFrame(frame) {
    const event = (frame.match(/^event:\s*(.*)$/m) || [])[1]?.trim();
    const raw   = (frame.match(/^data:\s*(.*)$/m) || [])[1];
    if (!event || raw === undefined) return;

    let data = null;
    try { data = JSON.parse(raw); } catch { data = null; }

    switch (event) {
      case 'hits':
        this._summaryHits  = data?.hits ?? [];
        this._results      = this._summaryHits;
        // One batch, no paging — see _onModalScroll.
        this._hasMore       = false;
        this._resultsReady  = true;
        this._noResults     = this._results.length === 0;
        this._noResultsMsg  = 'No results found';
        this._loading       = false;
        this._summaryText   = '';
        this.dispatchEvent(new CustomEvent('lw-ask-results', {
          detail:   { query: this._currentQuery, page: 1, results: this._results, total: this._results.length },
          bubbles:  true,
          composed: true,
        }));
        break;
      case 'token':
        this._summaryText += data?.text ?? '';
        break;
      case 'error':
        throw new Error(data?.message || 'summary stream error');
      case 'done':
      default:
        break;
    }
  }

  /**
   * Paragraphs for <lw-blog-overview>. `_summaryParagraphs` — the
   * per-section answer + citations from /summary (see _fetchSummary /
   * _mapAnswerToParagraphs) — wins; the overview-paragraphs attribute is
   * the fallback for when the summary endpoint returns nothing.
   */
  get _overview() {
    if (this._summaryParagraphs.length) return this._summaryParagraphs;
    return this._toParagraphs(this.overviewParagraphs);
  }

  /**
   * UNUSED right now but DO NOT REMOVE — see _fetchSummaryStream. Only
   * called from _handleSseFrame's `token` event handling.
   *
   * Split the answer into paragraphs: blank lines when the model used
   * them, sentence boundaries otherwise — this API usually returns one
   * unbroken block.
   */
  _mapToParagraphs(summary) {
    const rawParas = summary.split(/\n{2,}/).filter(s => s.trim());
    const paras = rawParas.length > 1
      ? rawParas
      : summary.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim());
    return paras.map(text => ({ text: text.trim() }));
  }

  /**
   * Accepts a plain string (blank lines split it into paragraphs), an
   * array of strings, or the {text, citation} objects <lw-blog-overview>
   * takes, and always returns that object array.
   */
  _toParagraphs(src) {
    if (!src) return [];
    if (typeof src === 'string') {
      return src.split(/\n{2,}/).map(t => t.trim()).filter(Boolean).map(text => ({ text }));
    }
    if (Array.isArray(src)) {
      return src
        .map(item => (typeof item === 'string' ? { text: item } : item))
        .filter(item => item && item.text);
    }
    if (typeof src === 'object' && src.text) return [src];
    return [];
  }

  _resetSearch() {
    this._page         = 1;
    this._hasMore      = true;
    this._loading      = false;
    this._results      = [];
    this._summaryText  = '';
    this._summaryHits  = [];
    this._summaryParagraphs = [];
    this._noResults    = false;
    this._resultsReady = false;
    this._metaVisible  = false;
    this._metaHits     = '';
    this._metaTime     = '';
  }

  _formatDate(str) {
    if (!str) return '';
    const d = new Date(str);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US',
      { month: 'short', day: '2-digit', year: 'numeric' });
  }

  _renderMeta(query) {
    if (!query) { this._metaVisible = false; return; }
    this._metaVisible = true;
    this._metaHits = `${this._results.length.toLocaleString()} results from ` +
                     `${this._totalHits.toLocaleString()} items`;
    this._metaTime = this._totalHits ? `Search time: ${this._totalTime} ms` : '';
  }

  // Questions land on the same page as the circle, with the question
  // itself carried in the query string — e.g. /blog?q=Can%20I%20see…
  _questionHref(question) {
    const base = this.href || this.ctaHref;
    if (!base) return '';
    const param = `${encodeURIComponent(this.queryParam)}=${encodeURIComponent(question)}`;
    const [path, hash] = base.split('#');
    const url = path + (path.includes('?') ? '&' : '?') + param;
    return hash ? `${url}#${hash}` : url;
  }

  _onQuestion(e, question, index) {
    const href = this._questionHref(question);
    const ev = new CustomEvent('lw-ask-question', {
      detail:     { question, index, href },
      bubbles:    true,
      composed:   true,
      cancelable: true,
    });
    this.dispatchEvent(ev);
    if (ev.defaultPrevented) { e.preventDefault(); return; }

    // Open the modal on this page and run the question straight away.
    if (this.openSearch(question)) { e.preventDefault(); return; }

    // No <lw-ai-search> on the page: fall back to the ?q= link.
    if (!href) e.preventDefault();
  }

  _onCta = (e) => {
    const ev = new CustomEvent('lw-ask-cta', {
      detail:     { label: this.ctaLabel, href: this.ctaHref },
      bubbles:    true,
      composed:   true,
      cancelable: true,
    });
    this.dispatchEvent(ev);
    if (ev.defaultPrevented) { e.preventDefault(); return; }
    if (this.openSearch()) e.preventDefault();
  };

  render() {
    return html`
      <div class="ai-search-launcher" style=${this._themeStyle}>
        ${this._inline
          ? this._renderInlineButton()
          : this._isBar
            ? this._renderBar()
            : html`${this._renderQuestions()}${this._renderFab()}`}
      </div>
      ${this._renderModal()}
    `;
  }

  _renderInlineButton() {
    const style = this._launcherStyle;
    const inner = html`${LwAiSearch.aiIcon}
      ${style === 'icon' ? '' : this.btnLabel}`;
    return html`
      ${this.href
        ? html`
          <a class="btn"
             data-style=${style}
             href=${this.href}
             target=${this.target || '_self'}
             rel=${this.target === '_blank' ? 'noreferrer noopener' : ''}
             @click=${this._onInlineFab}>${inner}</a>`
        : html`
          <button class="btn" data-style=${style} @click=${this._onInlineFab}>${inner}</button>`
      }
      ${style !== 'icon' && (this.btnSubtext || this._resolvedTheme.widget.helperText)
        ? html`<p class="btn-subtext">${this.btnSubtext || this._resolvedTheme.widget.helperText}</p>`
        : ''}
    `;
  }

  /** modal-top as a CSS var; a bare number is treated as px. */
  get _modalTopVar() {
    const v = String(this.modalTop ?? '').trim();
    if (!v) return '';
    return `--lw-ask-modal-top: ${/^-?[\d.]+$/.test(v) ? v + 'px' : v}`;
  }

  _renderModalSuggestions(questions, style) {
    if (!questions.length) return '';
    const hiddenClass = this._showFeatures ? '' : 'is-hidden';

    if (style === 'chips') {
      const chip = (question, index) => html`
        <button class="suggested-chip"
                @click=${() => this._onCardClick(question, index)}>${question}</button>`;

      // The panel is too narrow for travelling rows, so it keeps the
      // wrapped cloud; the full page gets the rows.
      if (this._isPanel) {
        return html`
          <div class="suggested suggested--chips ${hiddenClass}">
            <p class="suggested-label">People are searching for</p>
            <div class="suggested-chips">${questions.map(chip)}</div>
          </div>`;
      }

      const perRow = questions.length > LwAiSearch.chipsPerRow
        ? LwAiSearch.chipsPerRow
        : LwAiSearch.chipsPerRowShort;
      const rows = [];
      for (let i = 0; i < questions.length; i += perRow) {
        rows.push({ items: questions.slice(i, i + perRow), offset: i });
      }

      return html`
        <div class="suggested suggested--chips ${hiddenClass}">
          <p class="suggested-label">People are searching for</p>
          <div class="suggested-rows">
            ${rows.map((row, r) => {
              // Two copies is the minimum for a loop; _syncChipRows raises
              // it when one copy is narrower than the screen, which is what
              // would otherwise leave a gap travelling through the row.
              const copies = Math.max(2, this._chipRowCopies[r] || 2);
              const ghost = (question, index) => html`
                <button class="suggested-chip" tabindex="-1" aria-hidden="true"
                        @click=${() => this._onCardClick(question, index)}>${question}</button>`;
              return html`
                <div class="suggested-marquee ${r % 2 === 0 ? 'is-ltr' : 'is-rtl'}"
                     style=${[
                       `--lw-row-duration: calc(${LwAiSearch.chipRowDurationSeconds}s * var(--lw-ask-row-speed, 1))`,
                       `--lw-row-shift: calc(-100% / ${copies})`,
                     ].join(';')}>
                  <div class="suggested-track" data-copies=${copies}>
                    ${row.items.map((question, i) => chip(question, row.offset + i))}
                    ${Array.from({ length: copies - 1 }, () =>
                        row.items.map((question, i) => ghost(question, row.offset + i)))}
                  </div>
                </div>`;
            })}
          </div>
        </div>`;
    }

    return html`
      <div class="suggested suggested--cards ${hiddenClass}">
        <div class="suggested-cards">
          ${questions.map((question, index) => html`
            <button class="suggested-card"
                    @click=${() => this._onCardClick(question, index)}>
              ${LwAiSearch.sparkleIcon}
              <span>${question}</span>
            </button>`)}
        </div>
      </div>`;
  }

  _renderModal() {
    const suggestedStyle = this._suggestedQuestionsStyle;
    const questionLimit = suggestedStyle === 'chips'
      ? LwAiSearch.maxChipQuestions
      : LwAiSearch.maxCardQuestions;
    const questions = this._suggestedQuestions.slice(0, questionLimit);
    return html`
      <div id="ai-search-overlay"
           class="${this.modalOpen ? 'open' : ''} ${this._isPanel ? 'as-panel' : ''} ${this._showFeedbackCta ? 'has-cta' : ''}"
           style=${[this._modalTopVar, this._themeStyle].filter(Boolean).join(';')}
           @click=${this._onOverlayClick}>
        <div id="ai-search-modal"
             class=${this._postCommit ? 'post-commit' : ''}
             role="dialog"
             aria-modal="true"
             aria-label=${`${this._resolvedTheme.text.header.text} search`}
             @scroll=${this._onModalScroll}>

          <div class="hero">
            <h1>${this._resolvedTheme.text.header.text}</h1>
            <p>${this._resolvedTheme.text.subtitle.text}</p>

            <div class="search-bar">
              <div class="search-input-wrapper">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M10.5 18.5c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8Z"
                        stroke="currentColor" stroke-width="2" opacity="0.8"/>
                  <path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" opacity="0.8"/>
                </svg>
                <textarea id="searchInput" rows="1" autocomplete="off"
                          enterkeyhint="search" spellcheck="false"
                          placeholder=${this._resolvedTheme.text.search.placeholder || this.searchPlaceholder}
                          .value=${this._inputValue}
                          @input=${this._onModalInput}
                          @keydown=${this._onModalKeydown}></textarea>
                <button class="clear-btn ${this._inputValue ? '' : 'is-hidden'}"
                        aria-label="Clear search"
                        @click=${this._onModalClear}>
                  <svg viewBox="0 0 24 24">
                    <path d="M19,19,5,5M19,5,5,19" fill="none" stroke="black"
                          stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>

            ${this._renderModalSuggestions(questions, suggestedStyle)}
          </div>

          <div class="modal-results ${this._showResults && this._resultsReady ? '' : 'is-hidden'}">
            <div class="searchMeta ${this._metaVisible ? '' : 'is-hidden'}">
              <span class="metaHits">${this._metaHits}</span>
              <span class="metaTime">${this._metaTime}</span>
            </div>
            ${this._overview.length ? html`
              <lw-blog-overview
                class="modal-overview"
                heading=${this.overviewHeading}
                display-citations=${this._resolvedCitations}
                .paragraphs=${this._overview}
                @citation-click=${this._onCitationClick}
              ></lw-blog-overview>
              <h3 class="further-reading">Further Reading</h3>` : ''}

            <div class="result-list">
              ${this._results.length ? html`
                <lw-blog-list
                  container-background="transparent"
                  default-view="list"
                  hide-header
                  .autoLoad=${false}
                  .posts=${this._furtherReadingResults.map(item => this._toPost(item))}
                  .totalCount=${this._furtherReadingResults.length}
                  @post-click=${this._onPostClick}
                ></lw-blog-list>
              ` : ''}
            </div>
            <div class="modal-empty ${this._noResults && this._resultsReady ? '' : 'is-hidden'}">
              ${this._noResultsMsg}
            </div>
          </div>

          <div class="modal-loader ${this._loading ? '' : 'is-hidden'}">Searching...</div>
        </div>

        <!-- Outside #ai-search-modal on purpose. In full page the modal
             is what scrolls, and a head inside it would scroll away with
             the answer, taking the close button with it. Out here it
             floats over the modal instead, so the way out is always on
             screen. (In panel mode the modal is also transformed, which
             would make it the containing block for anything fixed.) -->
        <div class="modal-head">
          ${(() => {
            const panel = this._isPanel;
            const option = (mode, icon, label) => html`
              <button class="display-option"
                      aria-pressed=${(mode === 'panel') === panel ? 'true' : 'false'}
                      aria-label=${label}
                      title=${label}
                      @click=${() => this._setDisplayMode(mode)}>${icon}</button>`;
            return html`
              <div id="ai-search-display" role="group" aria-label="Search layout">
                ${option('fullpage', LwAiSearch.expandIcon, 'Full page')}
                ${option('panel', LwAiSearch.panelIcon, 'Side panel')}
              </div>`;
          })()}

          <button id="ai-search-close" aria-label="Close search"
                  @click=${this.closeSearch}>&times;</button>

          <div class="client-logo" aria-label="Logo">
            ${this._resolvedTheme.logo.image
              ? html`<img src=${this._resolvedTheme.logo.image} alt="Logo" />`
              : html`
                <div class="client-logo-placeholder" role="img" aria-label="Logo">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <circle cx="8" cy="9" r="1.5" fill="currentColor"/>
                    <path d="m5 17 4.5-4.5a1.5 1.5 0 0 1 2.12 0L14 14.88l1.38-1.38a1.5 1.5 0 0 1 2.12 0L19 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>Logo</span>
                </div>`}
          </div>
        </div>

        ${this._feedbackOpen && !this._isPanel ? html`
          <div class="feedback-scrim" @click=${this._onFeedbackDismiss}></div>` : ''}

        ${this._feedbackOpen ? html`
          <lw-feedback-card class="feedback-card" open
            ?wide=${!this._isPanel}
            submit-url=${this.feedbackUrl}
            embed-url=${this.feedbackEmbed}
            @feedback-response=${this._onFeedbackResponse}
            @feedback-submit=${this._onFeedbackSubmit}
            @feedback-dismiss=${this._onFeedbackDismiss}
          ></lw-feedback-card>` : ''}

        <!-- Same reason as the head above. -->
        <div class="powered-by">
          ${LwAiSearch.poweredByBadge}
        </div>

        ${this._showFeedbackCta ? html`
          <button class="panel-cta" @click=${this._openFeedback}>
            <span>${this.feedbackCta}</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>` : ''}

        ${this._showFeedbackPageCta ? html`
          <button class="page-cta" @click=${this._openFeedback}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${this.feedbackCtaPage}</span>
          </button>` : ''}
      </div>
    `;
  }

  /**
   * Normalise a raw search hit into the `post` shape <lw-blog-list-item>
   * expects. Mirrors mapHit() in lw-blog-list, except that the date is
   * formatted here and missing metadata stays empty rather than being
   * filled with a placeholder.
   */
  _toPost(hit) {
    // Protocol-relative image URLs (//cdn/…) → https://cdn/…
    const image = (hit.imageUrl ?? '').replace(/^\/\//, 'https://');

    // Category from topics/tags, falling back to the blog path segment.
    const category = hit.topics?.[0]
      ?? hit.tags?.[0]
      ?? hit.topic
      ?? (hit.url
          ? decodeURIComponent((hit.url.split('/blogs/')[1] || '').split('/')[0]).replace(/-/g, ' ')
          : '');

    return {
      id:       hit.id,
      title:    hit.title   ?? '',
      excerpt:  hit.summary ?? hit.body ?? '',
      image,
      author:   hit.author?.name ?? hit.authorName ?? '',
      avatar:   hit.author?.img  ?? hit.authorImg  ?? '',
      category,
      url:      hit.canonicalUrl || hit.url || '',
      date:     this._formatDate(hit.publishedAt ?? hit.date),
      readTime: hit.readTime ?? '',
      // kept for the detail view
      _body:    hit.body    ?? '',
      _summary: hit.summary ?? '',
      _topics:  hit.topics ?? hit.tags ?? [],
    };
  }

  // Search result clicks go directly to the original blog URL.
  _onPostClick(e) {
    const p = e.detail?.post;
    if (!p) return;
    if (p.url) window.location.assign(p.url);
  }

  // <lw-blog-overview>'s link-mode citation-click: fires when the cited
  // article has no real URL of its own (see its _onCitationLinkClick).
  // Falls back to the top-ranked Further Reading hit, opened in a new tab
  // — same source _mapAnswerToParagraphs cites first, and the same "open,
  // don't navigate away from the modal" behaviour _onPostClick gives every
  // other result link.
  _onCitationClick() {
    const hit = this._summaryHits?.[0];
    const url = hit?.canonicalUrl || hit?.url || '';
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * The bottom bar. The icon group on the left switches between three
   * states — a search field, the fixed four questions, or every question
   * scrolling past — and the CTA sits at the far end throughout.
   *
   * The questions and the CTA are the same .pill and .pill.cta the
   * floating panel uses, so Widget › Questions and Widget › Button keep
   * styling them here exactly as they do there.
   */
  _renderBar() {
    const mode = this._activeBarMode;

    const cta = this.ctaHref
      ? html`
        <a class="pill cta"
           href=${this.ctaHref}
           target=${this.ctaTarget || '_self'}
           rel=${this.ctaTarget === '_blank' ? 'noreferrer noopener' : ''}
           @click=${this._onCta}>
          ${LwAiSearch.sparkleIcon}${this.ctaLabel}
        </a>`
      : html`
        <button class="pill cta" @click=${this._onCta}>
          ${LwAiSearch.sparkleIcon}${this.ctaLabel}
        </button>`;

    const modeButton = (value, icon, labelText) => html`
      <button class="bar-mode"
              aria-pressed=${mode === value ? 'true' : 'false'}
              aria-label=${labelText}
              title=${labelText}
              @click=${() => this._setBarMode(value)}>${icon}</button>`;

    const minimized = this._barMinimized;

    return html`
      <div class="bar-wrap ${minimized ? 'is-minimized' : ''}">
        <button class="bar-toggle"
                aria-expanded=${minimized ? 'false' : 'true'}
                aria-label=${minimized ? 'Show suggestions' : 'Hide suggestions'}
                title=${minimized ? 'Show suggestions' : 'Hide suggestions'}
                @click=${this._toggleBarMinimized}>
          ${minimized ? LwAiSearch.restoreIcon : LwAiSearch.minimizeIcon}
        </button>

      <div class="bar">
        <div class="bar-modes" role="group" aria-label="Suggestion display">
          ${modeButton('search',    LwAiSearch.searchIcon, 'Search')}
          ${modeButton('questions', LwAiSearch.gridIcon,   'Suggested questions')}
          ${modeButton('scroll',    LwAiSearch.listIcon,   'All questions')}
        </div>

        <span class="bar-divider" aria-hidden="true"></span>

        ${this._renderBarBody(mode)}

        ${cta}
      </div>
      </div>`;
  }

  _renderBarBody(mode) {
    const questions = this._suggestedQuestions;

    const pill = (question, index) => html`
      <button class="pill"
              title=${question}
              @click=${e => this._onQuestion(e, question, index)}>${question}</button>`;

    if (mode === 'search') {
      return html`
        <div class="bar-body">
          <form class="bar-form" @submit=${this._onBarSubmit}>
            ${LwAiSearch.searchIcon}
            <input type="text"
                   autocomplete="off"
                   placeholder=${this.barPlaceholder}
                   aria-label=${this.barPlaceholder} />
          </form>
        </div>`;
    }

    if (mode === 'scroll') {
      // The list is rendered twice so the -50% reset lands on an identical
      // frame; the copy is hidden from assistive tech and from tabbing.
      const track = repeat => html`
        <div class="bar-track" aria-hidden=${repeat ? 'true' : 'false'}>
          ${questions.map(pill)}
          ${questions.map((question, index) => html`
            <button class="pill" tabindex="-1" aria-hidden="true"
                    @click=${e => this._onQuestion(e, question, index)}>${question}</button>`)}
        </div>`;
      return html`
        <div class="bar-body">
          <div class="bar-marquee">${track(false)}</div>
        </div>`;
    }

    return html`
      <div class="bar-body">
        <div class="bar-fixed">
          ${questions.slice(0, LwAiSearch.barFixedQuestions).map(pill)}
        </div>
      </div>`;
  }

  _renderQuestions() {
    // At most four questions; "Ask Our Blog" always sits below them.
    const items = this._suggestedQuestions.slice(0, LwAiSearch.maxQuestions);
    // The panel only ever opens upward, so the stagger runs bottom-up:
    // the pill nearest the button leads.
    const total = items.length + 1;
    const step  = n => `--d: ${n * 45}ms`;
    const delay = i => step(total - 1 - i);
    const tab   = this.open ? '0' : '-1';

    return html`
      <div class="panel"
           role="group"
           aria-label="Suggested questions"
           aria-hidden=${this.open ? 'false' : 'true'}>

        <button class="close"
                style=${step(total)}
                tabindex=${tab}
                @click=${this._onClose}
                aria-label="Close suggestions">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>

        ${items.map((q, i) => {
          const qHref = this._questionHref(q);
          return qHref
            ? html`
              <a class="pill"
                 style=${delay(i)}
                 href=${qHref}
                 target=${this.target || '_self'}
                 rel=${this.target === '_blank' ? 'noreferrer noopener' : ''}
                 title=${q}
                 tabindex=${tab}
                 @click=${e => this._onQuestion(e, q, i)}>
                ${q}
              </a>`
            : html`
              <button class="pill"
                      style=${delay(i)}
                      title=${q}
                      tabindex=${tab}
                      @click=${e => this._onQuestion(e, q, i)}>
                ${q}
              </button>`;
        })}

        ${this.ctaHref
          ? html`
            <a class="pill cta"
               style=${step(0)}
               href=${this.ctaHref}
               target=${this.ctaTarget || '_self'}
               rel=${this.ctaTarget === '_blank' ? 'noreferrer noopener' : ''}
               tabindex=${tab}
               @click=${this._onCta}>
              ${LwAiSearch.sparkleIcon}${this.ctaLabel}
            </a>`
          : html`
            <button class="pill cta"
                    style=${step(0)}
                    tabindex=${tab}
                    @click=${this._onCta}>
              ${LwAiSearch.sparkleIcon}${this.ctaLabel}
            </button>`
        }
      </div>
    `;
  }

  _renderFab() {
    const style  = this._launcherStyle;
    const helper = this._resolvedTheme.widget.helperText;
    // In "icon" mode the helper text is not rendered on the launcher at all.
    const inner  = html`${LwAiSearch.searchIcon}${
      style === 'icon-text' && helper
        ? html`<span class="fab-label">${helper}</span>`
        : ''}`;
    return html`
      ${this.href
        ? html`
          <a class="fab"
             data-style=${style}
             href=${this.href}
             target=${this.target || '_self'}
             rel=${this.target === '_blank' ? 'noreferrer noopener' : ''}
             @click=${this._onFab}
             aria-label=${this.label}
             aria-expanded=${this.open ? 'true' : 'false'}>
            ${inner}
          </a>`
        : html`
          <button class="fab"
                  data-style=${style}
                  @click=${this._onFab}
                  aria-label=${this.label}
                  aria-expanded=${this.open ? 'true' : 'false'}>
            ${inner}
          </button>`
      }
    `;
  }
}

customElements.define('lw-ai-search', LwAiSearch);
