import { LitElement, html, css, repeat }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';
import '../lw-blog-list-item/lw-blog-list-item.js';

function mapHit(hit) {
  // Fix protocol-relative image URLs (//cdn/...) → (https://cdn/...)
  const image = (hit.imageUrl ?? '').replace(/^\/\//, 'https://');

  // Try to pull category from topics, then fall back to the blog path segment
  const category = hit.topics?.[0]
    ?? hit.topic
    ?? (hit.url ? decodeURIComponent((hit.url.split('/blogs/')[1] || '').split('/')[0]).replace(/-/g, ' ') : '');

  return {
    id:       hit.id,
    title:    hit.title   ?? '',
    excerpt:  hit.summary ?? hit.body ?? '',
    image,
    author:   hit.author?.name ?? hit.authorName ?? '',
    avatar:   hit.author?.img  ?? hit.authorImg  ?? '',
    category,
    url:      hit.url ?? '#',
    // No placeholder date — when the backend tracks no publish date the meta
    // row omits it entirely rather than showing an invented "4 days ago".
    date:     hit.publishedAt ?? hit.date ?? '',
    readTime: hit.readTime ?? '3 min read',
    // kept for detail view
    _body:    hit.body    ?? '',
    _summary: hit.summary ?? '',
    _topics:  hit.topics  ?? [],
  };
}

// A small set of lowercase function words the crawler frequently glues onto
// the capitalized word right after it (e.g. "aGreenStalk" → "a GreenStalk",
// "TheGreenStalk" → "The GreenStalk"). Deliberately narrow and case-exact —
// a blanket lowercase-then-uppercase rule would also split real CamelCase
// names like "GreenStalk" itself into "Green Stalk".
const GLUE_WORDS = [
  'a', 'an', 'the', 'and', 'or', 'at', 'to', 'in', 'on', 'of', 'for', 'with', 'from',
  'A', 'An', 'The', 'And', 'Or', 'At', 'To', 'In', 'On', 'Of', 'For', 'With', 'From',
].join('|');
const GLUE_WORD_RE = new RegExp(`\\b(${GLUE_WORDS})([A-Z][a-z])`, 'g');

// The crawled `body`/`summary` fields arrive as one raw, unbroken block of
// text — the scraper strips the source page's paragraph/heading markup
// without leaving any whitespace behind, so sentences and even separate
// sections run straight into each other (e.g. "...about it!Maybe your
// knees...", "...kneeling.TheGreenStalk Ultimate..."). Insert the handful of
// safely-detectable missing spaces: glued function words, and punctuation
// glued directly to the next word/quote.
function cleanCrawledText(raw) {
  const text = (raw ?? '').trim();
  if (!text) return '';
  return text
    .replace(GLUE_WORD_RE, '$1 $2')
    .replace(/([,;:])(["“‘'A-Za-z])/g, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Reconstructs paragraphs out of that same cleaned text. Breaks only where
// punctuation runs directly into the next word with *zero* space left —
// normal in-paragraph sentence spacing survives the crawl untouched, so only
// those fully-glued spots (almost always a stripped <p>/<h2> boundary) start
// a new paragraph. This avoids fragmenting real multi-sentence paragraphs
// into one paragraph per sentence.
function formatCrawledText(raw) {
  const cleaned = cleanCrawledText(raw);
  if (!cleaned) return [];

  const byBlankLine = cleaned.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;

  // No blank lines survived the crawl. Mark the zero-space punctuation→word
  // boundaries with a token that can't occur in real text, then split on it.
  const BREAK_TOKEN = '@@P@@';
  const marked = cleaned.replace(/([.!?)])(["“‘'A-Za-z])/g, `$1${BREAK_TOKEN}$2`);
  return marked.split(BREAK_TOKEN).map(s => s.trim()).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-blog-list-static>
//
// Same layout as <lw-blog-list> (list/grid toggle, sort dropdown,
// category sidebar) but accepts a static hits array instead of
// making API requests.
//
// PROPERTIES:
//   hits         (Array)   — raw hit objects from the search API
//
// ATTRIBUTES:
//   detail-url   (String)  — page navigated to on post click
//   default-view (String)  — 'list' | 'grid'
//   default-sort (String)  — initial sort key
//   + all --pl-* CSS custom properties (same as lw-blog-list)
// ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'default',   label: 'Default'       },
  { value: 'newest',    label: 'Newest First'   },
  { value: 'oldest',    label: 'Oldest First'   },
  { value: 'title-az',  label: 'Title (A–Z)'    },
  { value: 'title-za',  label: 'Title (Z–A)'    },
  { value: 'author-az', label: 'Author (A–Z)'   },
  { value: 'author-za', label: 'Author (Z–A)'   },
  { value: 'longest',   label: 'Longest First'  },
  { value: 'shortest',  label: 'Shortest First' },
];

const EMPTY_STATE_SUGGESTIONS = [
  'How often should I water my plants?',
  'Which plants grow best in summer?',
  'How can I protect plants from heat?',
  'Why are my plant leaves turning yellow?',
];

export class LwBlogListStatic extends LitElement {

  static properties = {
    // input — raw hits from the search API
    hits: { type: Array },

    // internal derived state
    _posts:      { state: true },
    _categories: { state: true },

    defaultView: { attribute: 'default-view' },
    defaultSort: { attribute: 'default-sort' },
    detailUrl:   { attribute: 'detail-url'   },
    // Hide the "N results / view toggle / sort" strip (e.g. for search results).
    hideHeader:  { type: Boolean, attribute: 'hide-header', reflect: true },
    // Hide each item's category pill (e.g. split/compare view, where the
    // narrow columns don't have room for it).
    hideCategory: { type: Boolean, attribute: 'hide-category' },
    // Show a "1. 2. 3." rank before each list title (search results).
    numbered:    { type: Boolean, attribute: 'numbered' },
    // Total blogs available (e.g. estimatedTotalHits) for the "N results"
    // count — so it reflects the full total, not just the loaded page.
    totalCount:  { type: Number, attribute: 'total-count' },

    // internal UI state
    _view:           { state: true },
    _sort:           { state: true },
    _sortOpen:       { state: true },
    _mobileFiltersOpen: { state: true },
    _activeCategory: { state: true },

    // container
    containerWidth:        { attribute: 'container-width'         },
    containerMaxWidth:     { attribute: 'container-max-width'     },
    containerPadding:      { attribute: 'container-padding'       },
    containerBackground:   { attribute: 'container-background'    },
    containerBorderRadius: { attribute: 'container-border-radius' },
    containerBoxShadow:    { attribute: 'container-box-shadow'    },
    // card
    cardPadding:    { attribute: 'card-padding'    },
    cardDivider:    { attribute: 'card-divider'    },
    gridCardRadius: { attribute: 'grid-card-radius'},
    gridColumns:    { attribute: 'grid-columns'    },
    // title
    titleColor:      { attribute: 'title-color'       },
    titleFontSize:   { attribute: 'title-font-size'   },
    titleFontWeight: { attribute: 'title-font-weight' },
    titleFontFamily: { attribute: 'title-font-family' },
    titleHoverColor: { attribute: 'title-hover-color' },
    // excerpt
    excerptColor:    { attribute: 'excerpt-color'     },
    excerptFontSize: { attribute: 'excerpt-font-size' },
    // meta
    metaColor:     { attribute: 'meta-color'     },
    metaFontSize:  { attribute: 'meta-font-size' },
    authorColor:   { attribute: 'author-color'   },
    categoryColor: { attribute: 'category-color' },
    // image
    imageWidth:        { attribute: 'image-width'         },
    imageHeight:       { attribute: 'image-height'        },
    imageBorderRadius: { attribute: 'image-border-radius' },
    // header
    headerBorderColor: { attribute: 'header-border-color' },
    headerFontSize:    { attribute: 'header-font-size'    },
    // toggle
    toggleActiveColor:   { attribute: 'toggle-active-color'   },
    toggleInactiveColor: { attribute: 'toggle-inactive-color' },
    // freeform
    cssVars: { attribute: 'css-vars' },
  };

  attributeChangedCallback(name, _old, value) {
    super.attributeChangedCallback?.(name, _old, value);

    if (name === 'default-view') this._view = value === 'grid' ? 'grid' : 'list';
    if (name === 'default-sort') this._sort = value || 'newest';

    const cssAttrs = [
      'container-width', 'container-max-width', 'container-padding', 'container-background',
      'container-border-radius', 'container-box-shadow',
      'card-padding', 'card-divider', 'grid-card-radius', 'grid-columns',
      'title-color', 'title-font-size', 'title-font-weight',
      'title-font-family', 'title-hover-color',
      'excerpt-color', 'excerpt-font-size',
      'meta-color', 'meta-font-size', 'author-color', 'category-color',
      'image-width', 'image-height', 'image-border-radius',
      'header-border-color', 'header-font-size',
      'toggle-active-color', 'toggle-inactive-color',
    ];
    if (cssAttrs.includes(name)) this.style.setProperty(`--pl-${name}`, value);

    if (name === 'css-vars' && value) {
      value.split(';').forEach(pair => {
        const [k, ...rest] = pair.split(':');
        if (k && rest.length) this.style.setProperty(k.trim(), rest.join(':').trim());
      });
    }
  }

  constructor() {
    super();
    this.hits            = [];
    this._posts          = [];
    this._categories     = [];
    this.defaultView     = 'list';
    this.defaultSort     = 'newest';
    this.detailUrl       = '';
    this.hideHeader      = false;
    this.hideCategory    = false;
    this.numbered        = false;
    this.totalCount      = null;
    this._view           = 'list';
    this._sort           = 'newest';
    this._sortOpen       = false;
    this._mobileFiltersOpen = false;
    this._closeSort      = null;
    this._activeCategory = 'all';
  }

  // Rebuild _posts and _categories whenever hits changes.
  updated(changed) {
    if (changed.has('hits')) {
      this._posts      = (this.hits ?? []).map(mapHit);
      this._categories = this._buildCategories(this._posts);
      // Reset category filter when the data set changes.
      this._activeCategory = 'all';
    }
  }

  // ── Categories ───────────────────────────────────────────────

  _buildCategories(posts) {
    const seen = new Set();
    posts.forEach(p => { if (p.category && p.category !== 'all') seen.add(p.category); });

    const cats = [...seen].map(value => ({
      value,
      label: value,
      count: posts.filter(p => p.category === value).length,
    })).sort((a, b) => b.count - a.count);

    return [{ value: 'all', label: 'All', count: posts.length }, ...cats];
  }

  _pickCategory(value) {
    this._activeCategory = value;
    this._mobileFiltersOpen = false;
    document.removeEventListener('click', this._closeMobileFilters);
    this.dispatchEvent(new CustomEvent('lw-category-change', {
      detail: { category: value }, bubbles: true, composed: true,
    }));
  }

  _pickEmptySuggestion(text) {
    this.dispatchEvent(new CustomEvent('search-change', {
      detail: { value: text },
      bubbles: true,
      composed: true,
    }));
  }

  // ── Post click ───────────────────────────────────────────────

  _onPostClick(e) {
    const p = e.detail.post;
    const detail = {
      title:      p.title,
      url:        p.url,
      image:      p.image,
      // Don't fall back to `excerpt` here — when the backend has no real
      // summary, `excerpt` (mapHit) falls back to the raw body text, which
      // would just duplicate the Body section below. Leave it empty instead
      // so the detail view hides the Summary section entirely.
      summary:    cleanCrawledText(p._summary),
      author:     p.author,
      avatar:     p.avatar,
      date:       p.date,
      readTime:   p.readTime,
      postType:   p.category,
      categories: p._topics,
      tags:       p._topics,
      body:       formatCrawledText(p._body).map(text => ({ type: 'paragraph', text })),
    };
    sessionStorage.setItem('lw-blog-detail', JSON.stringify(detail));
    window.location.href = this.detailUrl;
  }

  // ── Sort ────────────────────────────────────────────────────

  get _sortedPosts() {
    const posts = [...this._posts];
    switch (this._sort) {
      case 'newest':    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'oldest':    return posts.sort((a, b) => new Date(a.date) - new Date(b.date));
      case 'title-az':  return posts.sort((a, b) => (a.title  || '').localeCompare(b.title  || ''));
      case 'title-za':  return posts.sort((a, b) => (b.title  || '').localeCompare(a.title  || ''));
      case 'author-az': return posts.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
      case 'author-za': return posts.sort((a, b) => (b.author || '').localeCompare(a.author || ''));
      case 'longest':   return posts.sort((a, b) => (b.excerpt?.length || 0) - (a.excerpt?.length || 0));
      case 'shortest':  return posts.sort((a, b) => (a.excerpt?.length || 0) - (b.excerpt?.length || 0));
      default:          return posts;
    }
  }

  get _sortLabel() {
    return SORT_OPTIONS.find(o => o.value === this._sort)?.label ?? 'Sort';
  }

  _toggleSortMenu(e) {
    e.stopPropagation();
    // Close the other dropdown so only one is open at a time.
    this._mobileFiltersOpen = false;
    document.removeEventListener('click', this._closeMobileFilters);

    this._sortOpen = !this._sortOpen;

    if (this._sortOpen) {
      this._closeSort = () => { this._sortOpen = false; };
      setTimeout(() => document.addEventListener('click', this._closeSort), 0);
    } else {
      document.removeEventListener('click', this._closeSort);
    }
  }

  _pickSort(value) {
    this._sort     = value;
    this._sortOpen = false;
    document.removeEventListener('click', this._closeSort);
    // Lets a parent mirror the choice onto another list (compare view).
    this.dispatchEvent(new CustomEvent('sort-change', {
      detail: { sort: value }, bubbles: true, composed: true,
    }));
  }

  _toggleMobileFilters(e) {
    e.stopPropagation();
    // Close the other dropdown so only one is open at a time.
    this._sortOpen = false;
    document.removeEventListener('click', this._closeSort);

    this._mobileFiltersOpen = !this._mobileFiltersOpen;

    if (this._mobileFiltersOpen) {
      this._closeMobileFilters = () => { this._mobileFiltersOpen = false; };
      setTimeout(() => document.addEventListener('click', this._closeMobileFilters), 0);
    } else {
      document.removeEventListener('click', this._closeMobileFilters);
    }
  }

  // "All (239)" uses parens, other categories use square brackets "[87]".
  _catCount(cat) {
    if (cat.count == null) return '';
    return cat.value === 'all' ? ` (${cat.count})` : ` [${cat.count}]`;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._closeSort);
    document.removeEventListener('click', this._closeMobileFilters);
  }

  // ── View toggle ─────────────────────────────────────────────

  _setView(v) {
    this._view = v;
    // Lets a parent mirror the choice onto another list (compare view).
    this.dispatchEvent(new CustomEvent('view-change', {
      detail: { view: v }, bubbles: true, composed: true,
    }));
  }

  // ── Icon SVGs ───────────────────────────────────────────────

  _listIcon(active) {
    return html`
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="display:block">
        <circle cx="3" cy="3.5"  r="2"   fill="currentColor"/>
        <rect   x="7" y="1.5"  width="12" height="4" rx="1.5" fill="currentColor"/>
        <circle cx="3" cy="10"  r="2"   fill="currentColor"/>
        <rect   x="7" y="8"    width="12" height="4" rx="1.5" fill="currentColor"/>
        <circle cx="3" cy="16.5" r="2"   fill="currentColor"/>
        <rect   x="7" y="14.5" width="12" height="4" rx="1.5" fill="currentColor"/>
      </svg>`;
  }

  _gridIcon(active) {
    return html`
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none" style="display:block">
        <rect x="1"  y="1"  width="7" height="7" rx="1.5" fill="currentColor"/>
        <rect x="10" y="1"  width="7" height="7" rx="1.5" fill="currentColor"/>
        <rect x="1"  y="10" width="7" height="7" rx="1.5" fill="currentColor"/>
        <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor"/>
      </svg>`;
  }

  _sortIcon() {
    return html`
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="display:block;flex-shrink:0">
        <path d="M6 2.5v13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M3.5 5 6 2.5 8.5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 15.5v-13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M9.5 13 12 15.5 14.5 13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }

  _filterIcon() {
    return html`
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="display:block;flex-shrink:0">
        <path d="M3 5h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M5.5 9h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M8 13h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>`;
  }

  _sparkIcon() {
    return html`
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:block">
        <path d="M12 2l1.6 5.2a4 4 0 0 0 2.6 2.6L21.5 12l-5.3 2.2a4 4 0 0 0-2.6 2.6L12 22l-1.6-5.2a4 4 0 0 0-2.6-2.6L2.5 12l5.3-2.2a4 4 0 0 0 2.6-2.6L12 2z"/>
      </svg>`;
  }

  _chevronIcon() {
    return html`
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display:block;flex-shrink:0">
        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: 'Inter', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .pl-outer {
      display: flex;
      align-items: flex-start;
      gap: 3rem;
      width: 100%;
    }

    .pl-container {
      flex: 1;
      min-width: 0;
      width:         var(--pl-container-width, 100%);
      max-width:     var(--pl-container-max-width, none);
      padding:       var(--pl-container-padding, 0);
      background:    var(--pl-container-background, #ffffff);
      border-radius: var(--pl-container-border-radius, 0);
      box-shadow:    var(--pl-container-box-shadow, none);
    }

    /* ── Sidebar ── */
    .pl-sidebar {
      width: 180px;
      flex-shrink: 0;
      padding-top: 0.6rem;
      padding-left: 2rem;
      border-left: 1px solid #e8e8e8;
      position: sticky;
      top: var(--pl-sidebar-top, 1rem);
      align-self: flex-start;
    }

    .pl-sidebar-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #111;
      margin-bottom: 1rem;
    }

    .pl-sidebar-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .pl-sidebar-item {
      display: block;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      padding: 0.38rem 0;
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      color: #888;
      cursor: pointer;
      transition: color 0.15s;
      line-height: 1.4;
    }
    .pl-sidebar-item:hover { color: #444; }
    .pl-sidebar-item.active { color: #e07630; font-weight: 600; }

    .pl-sidebar-count {
      color: inherit;
    }

    /* ── Header ── */
    .pl-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 44px;
      padding: 0;
      margin-bottom: 24px;
      border-top: 1px solid var(--pl-header-border-color, #e0e0e0);
      border-bottom: 1px solid var(--pl-header-border-color, #e0e0e0);
      gap: 0.75rem;
      box-sizing: border-box;
    }
    /* Hide the strip on all widths when requested (search results). */
    :host([hide-header]) .pl-header { display: none; }

    .pl-result-count {
      font-size: var(--pl-header-font-size, 13px);
      color: #667085;
      font-weight: 400;
      white-space: nowrap;
    }

    .pl-header-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    /* ── Toggle buttons ── */
    .pl-toggle {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 4px;
      border-radius: 999px;
    }

    .pl-toggle button {
      background: none;
      border: none;
      width: 40px;
      height: 40px;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      color: #98a2b3;
      transition: background 0.15s, color 0.15s;
      line-height: 0;
    }
    .pl-toggle button:hover { background: #e9eaec; }
    .pl-toggle button.active {
      background: #fff;
      color: #667085;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
    }
    .pl-toggle button svg {
      width: 20px;
      height: 20px;
    }

    /* ── Sort dropdown ── */
    .pl-sort {
      position: relative;
    }

    .pl-filter {
      display: none;
      position: relative;
    }

    /* Desktop: a neutral pill showing the selected sort option + icon; it turns
       orange only while its dropdown is open. Mobile collapses it to an
       icon-only button (see the 768px block). */
    .pl-sort-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      height: 24px;
      padding: 0 0.9rem;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      background: #fff;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #667085;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .pl-sort-btn:hover { background: #f9fafb; }
    /* Open: orange border, text and a light orange fill. */
    .pl-sort-btn.is-open {
      border-color: #f58b2c;
      color: #f58b2c;
      background: #fff3e8;
    }
    /* The caret is unused — the sort icon alone conveys the dropdown. */
    .pl-sort-caret { display: none; }
    .pl-sort-label { display: inline; }
    .pl-sort-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: inherit;
    }
    .pl-filter-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 999px;
      background: #f3f4f6;
      color: #98a2b3;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .pl-filter-btn:hover { background: #e9eaec; }
    .pl-filter-btn.is-open {
      background: #eef2f6;
      color: #667085;
    }

    .pl-sort-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 160px;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
      z-index: 500;
      overflow: hidden;
      /* animate */
      opacity: 0;
      transform: translateY(4px);
      pointer-events: none;
      transition: opacity 0.12s ease, transform 0.12s ease;
    }
    .pl-sort-menu.is-open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .pl-sort-option {
      display: block;
      width: 100%;
      padding: 9px 14px;
      background: none;
      border: none;
      text-align: left;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #667085;
      cursor: pointer;
      transition: background 0.1s, color 0.1s;
    }
    .pl-sort-option:hover { background: #f5f5f5; }
    /* Selected option: orange text on a light orange row. */
    .pl-sort-option.selected {
      background: #fff3e8;
      color: #f58b2c;
      font-weight: 600;
    }

    /* ── List / Grid ── */
    .pl-list { display: block; }

    .pl-grid {
      display: grid;
      grid-template-columns: repeat(var(--pl-grid-columns, 3), minmax(0, 1fr));
      gap: 1rem;
      padding: 1rem 0;
    }

    @media (max-width: 600px) { .pl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 380px) { .pl-grid { grid-template-columns: minmax(0, 1fr); } }

    .pl-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      min-height: 440px;
      padding: 3rem 1rem 2rem;
      text-align: center;
      color: #1f2937;
      font-size: 0.85rem;
    }

    .pl-empty-message {
      margin-top: auto;
      font-size: 1.9rem;
      font-weight: 400;
      color: #5f6672;
      letter-spacing: -0.02em;
    }

    .pl-empty-suggestions {
      width: min(100%, 440px);
      margin-top: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
    }

    .pl-empty-title {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }

    .pl-empty-chip {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      padding: 0.9rem 1.2rem;
      border: 1px solid #f58b2c;
      border-radius: 999px;
      background: #fff;
      color: #6b7280;
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, box-shadow 0.15s;
    }
    .pl-empty-chip:hover {
      background: #fff8f1;
      color: #374151;
      box-shadow: 0 4px 12px rgba(245, 139, 44, 0.12);
    }

    .pl-empty-chip-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #f58b2c;
      flex-shrink: 0;
    }

    .pl-empty-chip-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pl-footer {
      padding: 1rem 0;
      text-align: center;
      font-size: 14px;
      color: #bbb;
      border-top: 1px solid #f0f0f0;
    }

    /* ── Mobile category filter dropdown (anchored to the filter icon) ── */
    .pl-cats-mobile {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      display: flex;
      flex-direction: column;
      min-width: 190px;
      max-height: 320px;
      overflow-y: auto;
      gap: 1px;
      padding: 6px;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
      z-index: 500;
      opacity: 0;
      transform: translateY(4px);
      pointer-events: none;
      transition: opacity 0.12s ease, transform 0.12s ease;
      scrollbar-width: thin;
      scrollbar-color: #c1c1c1 transparent;
    }
    .pl-cats-mobile::-webkit-scrollbar       { width: 6px; }
    .pl-cats-mobile::-webkit-scrollbar-track { background: transparent; }
    .pl-cats-mobile::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 99px; }
    .pl-cats-mobile::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
    .pl-cats-mobile.is-open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .pl-cat-pill {
      display: block;
      width: 100%;
      padding: 9px 14px;
      border: none;
      border-radius: 6px;
      background: none;
      text-align: left;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #333;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s;
    }
    .pl-cat-pill:hover  { background: #f5f5f5; }
    .pl-cat-pill.active { background: #f0f0f0; color: #111; font-weight: 600; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .pl-outer   { gap: 2rem; }
      .pl-sidebar { width: 160px; }
    }

    @media (max-width: 768px) {
      .pl-outer   { gap: 1.5rem; }
      .pl-sidebar { width: 140px; padding-left: 1.25rem; }
      .pl-sidebar-title { font-size: 0.95rem; }
      .pl-sidebar-item  { font-size: 0.75rem; }
      .pl-filter       { display: block; }
      .pl-result-count { font-size: 13px; }

      /* Responsive: icon only — drop the label and the orange pill, back to
         the same plain grey circle as the view-toggle/filter buttons. */
      .pl-sort-label { display: none; }
      .pl-sort-btn {
        width: 32px;
        min-width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        background: #f3f4f6;
        color: #667085;
      }
      .pl-sort-btn:hover { background: #e9eaec; }
      /* Icon-only here, so the open state matches the filter button's. */
      .pl-sort-btn.is-open { background: #eef2f6; color: #667085; }
    }

    @media (max-width: 768px) {
    .pl-filter-btn   { width: 32px; height: 32px;}

    @media (max-width: 600px) {
      .pl-outer        { flex-direction: column; }
      .pl-sidebar      { display: none; }
      .pl-header       { gap: 0.75rem; height: 40px; }
      .pl-result-count { font-size: 11px; flex: 1; min-width: 0; }
      .pl-header-right { gap: 0.4rem; }
      .pl-toggle       { padding: 0 3px; }
      .pl-toggle button,
      .pl-sort-btn,
      .pl-filter-btn   { width: 24px; height: 24px; min-width: 24px; color: #667085; }
      .pl-toggle button svg,
      .pl-sort-btn svg { width: 18px; height: 18px; }
      .pl-grid         { gap: 0.75rem; }
      .pl-empty {
        min-height: 360px;
        gap: 1.5rem;
        padding: 2rem 0.5rem 1rem;
      }
      .pl-empty-message { font-size: 1.1rem; }
      .pl-empty-suggestions { width: 100%; }
      .pl-empty-title { font-size: 1.05rem; }
      .pl-empty-chip {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
      }
    }

    @media (max-width: 380px) {
      .pl-header { gap: 0.5rem; }
      .pl-header-right { gap: 0.3rem; }
      .pl-toggle button,
      .pl-sort-btn,
      .pl-filter-btn { width: 24px; height: 24px; min-width: 24px; color: #667085; }
    }
  `;

  render() {
    const isGrid = this._view === 'grid';
    const sorted = this._activeCategory === 'all'
      ? this._sortedPosts
      : this._sortedPosts.filter(p => p.category === this._activeCategory);

    const hasResults = sorted.length > 0;
    // For the "all" view show the full total (loaded + not-yet-loaded);
    // a category filter falls back to the loaded/visible count.
    const count = (this._activeCategory === 'all' && this.totalCount != null)
      ? this.totalCount
      : sorted.length;
    const countText = `${count} Blog${count !== 1 ? 's' : ''}`;

    const items = sorted.length === 0
      ? html`
          <div class="pl-empty">
            <div class="pl-empty-message">No results found!</div>
            <div class="pl-empty-suggestions">
              <div class="pl-empty-title">Try searching for:</div>
              ${EMPTY_STATE_SUGGESTIONS.map(text => html`
                <button class="pl-empty-chip" @click=${() => this._pickEmptySuggestion(text)}>
                  <span class="pl-empty-chip-icon">${this._sparkIcon()}</span>
                  <span class="pl-empty-chip-text">${text}</span>
                </button>
              `)}
            </div>
          </div>
        `
      : repeat(
          sorted,
          post => post.id,
          (post, i) => html`
            <lw-blog-list-item
              .post=${{
                ...post,
                category: this.hideCategory ? '' : post.category,
                postType: this.hideCategory || this._categories.length <= 2 ? '' : post.postType,
              }}
              .view=${this._view}
              .number=${this.numbered && !isGrid ? i + 1 : null}
              @post-click=${this._onPostClick}
            ></lw-blog-list-item>
          `
        );

    const sidebar = this._categories.length > 2 ? html`
      <aside class="pl-sidebar">
        <div class="pl-sidebar-title">Blog Categories</div>
        <ul class="pl-sidebar-list">
          ${this._categories.map(cat => html`
            <li>
              <button
                class="pl-sidebar-item ${this._activeCategory === cat.value ? 'active' : ''}"
                @click=${() => this._pickCategory(cat.value)}
              >${cat.label}${cat.count != null ? html` <span class="pl-sidebar-count">[${cat.count}]</span>` : ''}</button>
            </li>
          `)}
        </ul>
      </aside>
    ` : '';

    return html`
      <div class="pl-outer">
        <div class="pl-container">

          ${hasResults ? html`
          <div class="pl-header">
            <span class="pl-result-count">${countText}</span>

            <div class="pl-header-right">
              <!-- View toggle -->
              <div class="pl-toggle">
                ${isGrid
                  ? html`
                      <button aria-label="List view" title="List view"
                        @click=${() => this._setView('list')}>
                        ${this._listIcon(false)}
                      </button>
                    `
                  : html`
                      <button aria-label="Grid view" title="Grid view"
                        @click=${() => this._setView('grid')}>
                        ${this._gridIcon(false)}
                      </button>
                    `}
              </div>

              <!-- Sort dropdown -->
              <div class="pl-sort">
                <button class="pl-sort-btn ${this._sortOpen ? 'is-open' : ''}" @click=${this._toggleSortMenu}>
                  <span class="pl-sort-label">${this._sortLabel}</span>
                  <span class="pl-sort-icon">${this._sortIcon()}</span>
                  <span class="pl-sort-caret">${this._chevronIcon()}</span>
                </button>
                <div class="pl-sort-menu ${this._sortOpen ? 'is-open' : ''}">
                  ${SORT_OPTIONS.map(opt => html`
                    <button
                      class="pl-sort-option ${this._sort === opt.value ? 'selected' : ''}"
                      @click=${() => this._pickSort(opt.value)}
                    >${opt.label}</button>
                  `)}
                </div>
              </div>

              ${this._categories.length > 1 ? html`
                <div class="pl-filter">
                  <button
                    class="pl-filter-btn ${this._mobileFiltersOpen ? 'is-open' : ''}"
                    aria-label="Filter categories"
                    title="Filter categories"
                    @click=${this._toggleMobileFilters}
                  >
                    ${this._filterIcon()}
                  </button>

                  <!-- Category filter dropdown (mobile — hidden on desktop) -->
                  <div class="pl-cats-mobile ${this._mobileFiltersOpen ? 'is-open' : ''}">
                    ${this._categories.map(cat => html`
                      <button
                        class="pl-cat-pill ${this._activeCategory === cat.value ? 'active' : ''}"
                        @click=${() => this._pickCategory(cat.value)}
                      >${cat.label}${this._catCount(cat)}</button>
                    `)}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <div class=${isGrid ? 'pl-grid' : 'pl-list'}>
            ${items}
          </div>

          ${hasResults ? html`<div class="pl-footer">Showing ${sorted.length} Blog${sorted.length !== 1 ? 's' : ''}</div>` : ''}

        </div>

        ${sidebar}
      </div>
    `;
  }
}

customElements.define('lw-blog-list-static', LwBlogListStatic);
