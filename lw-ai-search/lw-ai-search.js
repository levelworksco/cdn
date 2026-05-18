import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

if (!document.querySelector('meta[name="viewport"]')) {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0';
  document.head.appendChild(meta);
}

// iPhone viewport gesture fix
const metas = document.getElementsByTagName('meta');

if (/iPhone/i.test(navigator.userAgent)) {

  for (let i = 0; i < metas.length; i++) {
    if (metas[i].name === 'viewport') {
      metas[i].content =
        'width=device-width, minimum-scale=1.0, maximum-scale=1.0';
    }
  }

  document.addEventListener('gesturestart', gestureStart, false);
}

function gestureStart() {
  for (let i = 0; i < metas.length; i++) {
    if (metas[i].name === 'viewport') {
      metas[i].content =
        'width=device-width, minimum-scale=0.25, maximum-scale=1.6';
    }
  }
}

class LwAiSearch extends LitElement {

  // ── OBSERVED ATTRIBUTES ─────────────────────────────────────────────
  // These map HTML attributes to CSS custom properties on :host.
  // Usage in liquid:
  //   <lw-ai-search
  //     btn-width="220px"
  //     btn-height="54px"
  //     btn-background="#ff7a1a"
  //     btn-color="#ffffff"
  //     btn-border-radius="999px"
  //     btn-font-size="15px"
  //     btn-label="Search with AI"
  //     btn-subtext="Ask anything to find relevant blogs"
  //     btn-subtext-color="#666"
  //   ></lw-ai-search>
  //
  // Every attribute that starts with "btn-" is auto-mapped.
  // You can also pass arbitrary CSS vars:
  //  declare a class in the css file of the liquid file when <lw-ai-search class = "lw-ai-search"> element is present 
  //  target any component by creating a class like
  //  .lw-ai-search::part(ai-search-subtext){
  //    text-decoration : underline;
  //  }
  //
  // ── OBSERVED ATTRIBUTES ─────────────────────────────────────────────
  // Attribute → CSS custom property mapping.
  // Every attribute is converted to a --lw-<name> CSS variable on :host.
  // The stylesheet uses var(--lw-<name>, <default>) so the default lives
  // in CSS and the attribute only overrides when explicitly set.
  //
  // BUTTON attrs    → control .ai-search-btn and related elements
  // CONTAINER attrs → control .ai-search-container wrapper
  // 
  //
  // Usage in liquid:
  //   <lw-ai-search
  //     btn-background="#f58220"
  //     btn-width="220px"
  //     btn-border-radius="6px"
  //     btn-label="Search the blog"
  //     container-text-align="left"
  //     container-padding="20px 0"
  //   ></lw-ai-search>
  //

  // ── REACTIVE PROPERTIES ─────────────────────────────────────────────
  static properties = {
    _isOpen:          { state: true },
    _showResults:     { state: true },
    _showFeatures:    { state: true },
    _postCommit:      { state: true },
    _results:         { state: true },
    _loading:         { state: true },
    _noResults:       { state: true },
    _noResultsMsg:    { state: true },
    _metaVisible:     { state: true },
    _metaHits:        { state: true },
    _metaTime:        { state: true },
    _inputValue:      { state: true },
    _btnSubtext:      { state: true },
    _btnLabel: {state : true},

    _resultsReady: { state: true },

    // creds
    searchBase:      { attribute: 'search-base'  },
    searchKey:       { attribute: 'search-key'   },
    searchIndex:     { attribute: 'search-index' },

    // for the CSS variable system
    btnWidth:            { attribute: 'btn-width'             },
    btnHeight:           { attribute: 'btn-height'            },
    btnPadding:          { attribute: 'btn-padding'           },
    btnBackground:       { attribute: 'btn-background'        },
    btnHoverBackground:  { attribute: 'btn-hover-background'  },
    btnColor:            { attribute: 'btn-color'             },
    btnBorderRadius:     { attribute: 'btn-border-radius'     },
    btnFontSize:         { attribute: 'btn-font-size'         },
    btnFontWeight:       { attribute: 'btn-font-weight'       },
    btnIconSize:         { attribute: 'btn-icon-size'         },
    btnGap:              { attribute: 'btn-gap'               },
    btnLabel:            { attribute: 'btn-label'             },
    btnSubtext:          { attribute: 'btn-subtext'           },
    btnSubtextColor:     { attribute: 'btn-subtext-color'     },
    btnSubtextFontSize:  { attribute: 'btn-subtext-font-size' },
    btnSubtextMarginTop: { attribute: 'btn-subtext-margin-top'},
    // for container
    containerTextAlign:  { attribute: 'container-text-align'  },
    containerDisplay:    { attribute: 'container-display'     },
    containerAlignItems: { attribute: 'container-align-items' },
    containerJustify:    { attribute: 'container-justify-content' },
    containerFlexDir:    { attribute: 'container-flex-direction'  },
    containerGap:        { attribute: 'container-gap'         },
    containerPadding:    { attribute: 'container-padding'     },
    containerMargin:     { attribute: 'container-margin'      },
    containerWidth : {attribute: 'container-width'},
  };

  constructor() {
    super();
    this._isOpen       = false;
    this._showResults  = false;
    this._showFeatures = true;
    this._postCommit   = false;          // NEW
    this._results      = [];
    this._loading      = false;
    this._noResults    = false;
    this._noResultsMsg = 'No results found';
    this._metaVisible  = false;
    this._metaHits     = '';
    this._metaTime     = '';
    this._inputValue   = '';
    // non-reactive search state
    this._page            = 1;
    this._hasMore         = true;
    this._currentQuery    = '';
    this._searchCommitted = false;
    this._debounceTimer   = null;
    this._loaderTimeout   = null;
    this._abortController = null;
    this._didPushState    = false;
    this._limit           = 20;
    this._semanticRatio   = 0.5;
    this._totalHits       = 0;
    this._totalTime       = 0;
    this._resultsReady = false;
    this._totalDocuments = 0;
    this._btnLabel   = 'Search with AI';
    this._btnSubtext = 'Ask anything to find relevant blogs';

    // creds
    this.searchBase  = 'https://discoverai.levelworks.co';
    this.searchKey   = '';
    this.searchIndex = 'all';
  }

    attributeChangedCallback(name, _old, value) {
        super.attributeChangedCallback?.(name, _old, value);

        const textMap = {
            'btn-label':   '_btnLabel',
            'btn-subtext': '_btnSubtext',
        };

        if (name in textMap) {
            this[textMap[name]] = value;
        }

        const cssAttrs = [
            'btn-width', 'btn-height', 'btn-padding', 'btn-background',
            'btn-hover-background', 'btn-color', 'btn-border-radius',
            'btn-font-size', 'btn-font-weight', 'btn-icon-size', 'btn-gap',
            'btn-subtext-color', 'btn-subtext-font-size', 'btn-subtext-margin-top',
            'container-text-align', 'container-display', 'container-align-items',
            'container-justify-content', 'container-flex-direction',
            'container-gap', 'container-padding', 'container-margin', 'container-width'
        ];

        if (cssAttrs.includes(name)) {
            this.style.setProperty(`--lw-${name}`, value);
        }

    }


  // ── PUBLIC API ───────────────────────────────────────────────────────
  open() {
    this._isOpen = true;
    document.body.style.overflow = 'hidden';
    this._resetToHeroView();
    history.pushState({ aiSearchOpen: true }, '', location.href);
    this._didPushState = true;
    this.updateComplete.then(() => this._input?.focus());
  }

  close() {
    this._postCommit = false;           // reset class swap on close
    this._isOpen = false;
    document.body.style.overflow = '';
    if (this._didPushState) {
      this._didPushState = false;
      history.back();
    }
  }

  // ── LIFECYCLE ────────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    window.openAISearch = () => this.open();
    window.addEventListener('popstate', this._onPopState);
    document.addEventListener('keydown', this._onDocKeydown);
    if (history.state?.aiSearchOpen) {
      this._didPushState = true;
      this._isOpen = true;
      document.body.style.overflow = 'hidden';
      this.updateComplete.then(() => this._input?.focus());
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this._onPopState);
    document.removeEventListener('keydown', this._onDocKeydown);
  }

  // ── ELEMENT REFS ─────────────────────────────────────────────────────
  get _input() { return this.renderRoot.querySelector('#searchInput'); }
  get _panel() { return this.renderRoot.querySelector('#ai-search-modal'); }

  // ── EVENT HANDLERS ───────────────────────────────────────────────────
  _onPopState = (e) => {
    this._didPushState = false;
    if (e.state?.aiSearchOpen) {
      this._isOpen = true;
      document.body.style.overflow = 'hidden';
      this.updateComplete.then(() => this._input?.focus());
    } else {
      this._isOpen = false;
      this._postCommit = false;
      document.body.style.overflow = '';
    }
  };

  _onDocKeydown = (e) => {
    if (e.key === 'Escape' && this._isOpen) this.close();
  };

  _onOverlayClick(e) {
    if (e.target === e.currentTarget) this.close();
  }

  _onInput(e) {
    const value = e.target.value;
    this._inputValue = value;
    clearTimeout(this._debounceTimer);
    const trimmed = value.trim();
    this._currentQuery = trimmed;
    if (!trimmed) { this._resetSearch(); return; }
    this._debounceTimer = setTimeout(() => {
      if (!this._searchCommitted) return;
      this._fetchResults(trimmed, 1);
    }, 350);
  }

  _onKeydown(e) {
    if (e.key === 'Enter') this._commitSearch();
  }

  _onClear() {
    this._inputValue   = '';
    this._currentQuery = '';
    this._resetSearch();
    this.updateComplete.then(() => this._input?.focus());
  }

  _onScroll() {
    const panel = this._panel;
    if (!panel) return;
    const nearBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 300;
    if (nearBottom && this._hasMore && !this._loading && this._currentQuery) {
      this._page++;
      this._fetchResults(this._currentQuery, this._page, { prefetch: true });
    }
  }

  // ── SEARCH LOGIC ─────────────────────────────────────────────────────
  _commitSearch() {
    const q = this._input?.value.trim() || '';
    if (!q || this._searchCommitted) return;
    this._currentQuery    = q;
    this._searchCommitted = true;
    this._showFeatures    = false;
    this._showResults     = true;
    this._postCommit      = true;        // ← triggers class swap to ai-search-modal-post-commit
    this._fetchResults(q, 1);
  }

  async _fetchResults(query, pageNum = 1, { prefetch = false } = {}) {
    if (query !== (this._input?.value.trim() ?? '')) return;

    if (!prefetch && this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const signal = prefetch ? undefined : this._abortController.signal;

    this._loading = true;
    if (!prefetch) {
      this._noResults = false;
      this._resultsReady = false;  // ← hides results, shows loader immediately
    } else {
      this._noResults = false;
    }
    this._showLoaderWithDelay();

    try {
      const res = await fetch(
        `${this.searchBase}/api/v1/search/${this.searchIndex}`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY':    this.searchKey,
          },
          body: JSON.stringify({
            query:         query,
            limit:         this._limit,
            semanticRatio: this._semanticRatio,
            page:          pageNum,
          }),
          signal,
        }
      );
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();

      if (query !== (this._input?.value.trim() ?? '')) return;

      const items = data?.hits || [];
      this._totalHits = data?.estimatedTotalHits ?? 0;
      this._totalTime = data?.processingTimeMs   ?? 0;
      this._totalDocuments = data?.totalDocuments ?? 0;

      if (pageNum === 1) {
        this._results   = items;
        this._page      = 1;
        this._noResults = items.length === 0;
        this._noResultsMsg = 'No results found';
        this._resultsReady = true; 
      } else {
        this._results = [...this._results, ...items];
      }

      this._renderMeta(query);
      this._hasMore = items.length === this._limit;

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Search error:', err);
      this._noResults    = true;
      this._noResultsMsg = 'Something went wrong. Please try again.';
    } finally {
      if (!signal?.aborted) {
        this._loading = false;
        this._hideLoader();
      }
    }
  }

  // ── HELPERS ──────────────────────────────────────────────────────────
  _resetToHeroView() {
    this._page            = 1;
    this._loading         = false;
    this._hasMore         = true;
    this._currentQuery    = '';
    this._searchCommitted = false;
    this._inputValue      = '';
    this._resultsReady = false;
    this._postCommit      = false;       // ← reset class swap
    clearTimeout(this._debounceTimer);
    clearTimeout(this._loaderTimeout);
    if (this._abortController) { this._abortController.abort(); this._abortController = null; }
    this._results      = [];
    this._noResults    = false;
    this._showResults  = false;
    this._showFeatures = true;
    this._metaVisible  = false;
    this._metaHits     = '';
    this._metaTime     = '';
    this._totalDocuments = 0;
  }

  _resetSearch() {
    this._page        = 1;
    this._hasMore     = true;
    this._loading     = false;
    this._results     = [];
    this._noResults   = false;
    this._metaVisible = false;
    this._resultsReady = false;
    this._metaHits    = '';
    this._metaTime    = '';
  }

  _showLoaderWithDelay() {
    this._loaderTimeout = setTimeout(() => {
      if (this._loading) this.requestUpdate();
    }, 150);
  }

  _hideLoader() {
    clearTimeout(this._loaderTimeout);
    this._loaderTimeout = null;
  }

  _renderMeta(query) {
    if (!query) { this._metaVisible = false; return; }
    this._metaVisible = true;
    this._metaHits    = `${this._totalHits.toLocaleString()} results from ${this._totalDocuments.toLocaleString()} items`;
    this._metaTime    = this._totalHits ? `Search time: ${this._totalTime} ms` : '';
  }

  _formatDate(str) {
    if (!str) return '';
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  // ── RENDER ───────────────────────────────────────────────────────────
  render() {
    // ← class swap happens here reactively via _postCommit
    const modalClass = this._postCommit ? 'ai-search-modal-post-commit' : 'ai-search-modal';

    return html`
      <div class="ai-search-container" part="ai-search-container">
        <button
          class="ai-search-btn" part="ai-search-btn"
          @click=${() => this.open()}
          aria-label=${this._btnLabel}
        >
          <div class="inner-container" part="inner-container">
            <svg class="btn-icon" part="btn-icon" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M8.26275 2.1105C8.32905 1.75553 8.63889 1.4982 9 1.4982C9.3611 1.4982 9.67094 1.75553 9.73725 2.1105L10.5255 6.279C10.6401 6.88551 11.1145 7.35992 11.721 7.4745L15.8895 8.26275C16.2445 8.32905 16.5018 8.63889 16.5018 9C16.5018 9.3611 16.2445 9.67094 15.8895 9.73725L11.721 10.5255C11.1145 10.6401 10.6401 11.1145 10.5255 11.721L9.73725 15.8895C9.67094 16.2445 9.3611 16.5018 9 16.5018C8.63889 16.5018 8.32905 16.2445 8.26275 15.8895L7.4745 11.721C7.35992 11.1145 6.88551 10.6401 6.279 10.5255L2.1105 9.73725C1.75553 9.67094 1.4982 9.3611 1.4982 9C1.4982 8.63889 1.75553 8.32905 2.1105 8.26275L6.279 7.4745C6.88551 7.35992 7.35992 6.88551 7.4745 6.279L8.26275 2.1105M15 1.5V4.5M16.5 3H13.5"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M1.5 15C1.5 15.8279 2.17213 16.5 3 16.5C3.82787 16.5 4.5 15.8279 4.5 15C4.5 14.1721 3.82787 13.5 3 13.5C2.17213 13.5 1.5 14.1721 1.5 15H1.5"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${this._btnLabel}
          </div>
        </button>
        <p class="ai-search-subtext" part="ai-search-subtext">${this._btnSubtext}</p>
      </div>

      <div
        id="ai-search-overlay"
        class=${this._isOpen ? 'open' : ''}
        @click=${this._onOverlayClick}
      >
        <div
          id="ai-search-modal"
          class=${modalClass}
          role="dialog"
          aria-modal="true"
          aria-label="AI Search"
          @scroll=${this._onScroll}
        >
          <button id="ai-search-close" aria-label="Close search" @click=${() => this.close()}>&times;</button>

          <!-- HERO -->
          <div id="hero" class="hero">

            <!-- ← UPDATED: logo image + h1 side by side -->
            <div class="logo">
            <!--   <img src=${window.AI_SEARCH_LOGO ?? ''} alt="Logo" class="logo-image" /> -->
            <svg class="logo-image" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="28" height="28" fill="#F68635"/>
                <rect x="4.375" y="4.375" width="3.85" height="19.25" fill="black"/>
                <rect x="19.7751" y="4.375" width="3.85" height="19.25" fill="black"/>
                <circle cx="14.0001" cy="19.7751" r="3.85" fill="black"/>
            </svg>

              <h1>AI Search</h1>
            </div>
            <p>Intelligent search that understands your goal</p>

            <div class="search-bar">
              <div class="search-input-wrapper">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M10.5 18.5c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8Z" stroke="currentColor" stroke-width="2" opacity="0.8"/>
                  <path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
                </svg>
                <input
                  type="text"
                  id="searchInput"
                  autocomplete="off"
                  .value=${this._inputValue}
                  @input=${this._onInput}
                  @keydown=${this._onKeydown}
                />
                <button
                  class="clear-btn ${this._inputValue ? '' : 'hidden'}"
                  aria-label="Clear search"
                  @click=${this._onClear}
                >
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19,19,5,5M19,5,5,19" fill="none" stroke="black"
                      stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- FEATURE CARDS -->
            <div id="features" class="features ${this._showFeatures ? '' : 'hidden'}">
              <div class="feature-card">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="10" fill="#F5F5F5"/><path d="M21.5024 13.52L24 16.08L22.9073 17.2L20.4098 14.64C20.1366 14.8 19.8439 14.9333 19.5317 15.04C19.2195 15.1467 18.8878 15.2 18.5366 15.2C17.561 15.2 16.7317 14.85 16.0488 14.15C15.3659 13.45 15.0244 12.6 15.0244 11.6C15.0244 10.6 15.3659 9.75 16.0488 9.05C16.7317 8.35 17.561 8 18.5366 8C19.5122 8 20.3415 8.35 21.0244 9.05C21.7073 9.75 22.0488 10.6 22.0488 11.6C22.0488 11.96 21.9967 12.3 21.8927 12.62C21.7886 12.94 21.6585 13.24 21.5024 13.52ZM18.5366 13.6C19.0829 13.6 19.5447 13.4067 19.922 13.02C20.2992 12.6333 20.4878 12.16 20.4878 11.6C20.4878 11.04 20.2992 10.5667 19.922 10.18C19.5447 9.79333 19.0829 9.6 18.5366 9.6C17.9902 9.6 17.5285 9.79333 17.1512 10.18C16.774 10.5667 16.5854 11.04 16.5854 11.6C16.5854 12.16 16.774 12.6333 17.1512 13.02C17.5285 13.4067 17.9902 13.6 18.5366 13.6ZM20.0585 16.56L22.0488 18.6V22.4C22.0488 22.84 21.8959 23.2167 21.5902 23.53C21.2846 23.8433 20.9171 24 20.4878 24H9.56098C9.13171 24 8.76423 23.8433 8.45854 23.53C8.15285 23.2167 8 22.84 8 22.4V11.2C8 10.76 8.15285 10.3833 8.45854 10.07C8.76423 9.75667 9.13171 9.6 9.56098 9.6H13.8537C13.7106 9.93333 13.613 10.2767 13.561 10.63C13.5089 10.9833 13.4829 11.3333 13.4829 11.68C13.4829 13.1333 13.9837 14.3467 14.9854 15.32C15.987 16.2933 17.1772 16.78 18.5561 16.78C18.8033 16.78 19.0504 16.7633 19.2976 16.73C19.5447 16.6967 19.7984 16.64 20.0585 16.56Z" fill="#979797"/></svg>
                <h4>Meaning Aware Search</h4>
                <p>Find results that understand your intent, not just keywords</p>
              </div>
              <div class="feature-card">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="10" fill="#F5F5F5"/><path d="M15.992 8C11.576 8 8 11.584 8 16C8 20.416 11.576 24 15.992 24C20.416 24 24 20.416 24 16C24 11.584 20.416 8 15.992 8ZM19.384 20.8L16 18.76L12.616 20.8L13.512 16.952L10.528 14.368L14.464 14.032L16 10.4L17.536 14.024L21.472 14.36L18.488 16.944L19.384 20.8Z" fill="#979797"/></svg>
                <h4>Discover Hidden Value</h4>
                <p>Surface similar or related content you didn't know to look for</p>
              </div>
              <div class="feature-card">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="10" fill="#F5F5F5"/><path d="M17.4545 16L16 17.4545L14.5455 16L16 14.5455L17.4545 16ZM16 11.6364L17.5418 13.1782L19.36 11.36L16 8L12.64 11.36L14.4582 13.1782L16 11.6364ZM11.6364 16L13.1782 14.4582L11.36 12.64L8 16L11.36 19.36L13.1782 17.5418L11.6364 16ZM20.3636 16L18.8218 17.5418L20.64 19.36L24 16L20.64 12.64L18.8218 14.4582L20.3636 16ZM16 20.3636L14.4582 18.8218L12.64 20.64L16 24L19.36 20.64L17.5418 18.8218L16 20.3636Z" fill="#979797"/></svg>
                <h4>Explore In Context</h4>
                <p>Get relevant posts and articles from within your content library</p>
              </div>
              <div class="feature-card">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="10" fill="#F5F5F5"/><path fill-rule="evenodd" clip-rule="evenodd" d="M24 16.5C24 20.6421 20.6421 24 16.5 24C12.3579 24 9 20.6421 9 16.5C9 12.3579 12.3579 9 16.5 9C20.6421 9 24 12.3579 24 16.5ZM16.5 13.3125C16.034 13.3125 15.6562 13.6903 15.6562 14.1562C15.6562 14.4669 15.4044 14.7188 15.0938 14.7188C14.7831 14.7188 14.5312 14.4669 14.5312 14.1562C14.5312 13.0689 15.4127 12.1875 16.5 12.1875C17.5873 12.1875 18.4688 13.0689 18.4688 14.1562C18.4688 14.6894 18.2561 15.174 17.9123 15.528C17.843 15.5992 17.777 15.6652 17.714 15.7281C17.5522 15.8898 17.4103 16.0315 17.2859 16.1914C17.1217 16.4024 17.0625 16.5576 17.0625 16.6875V17.25C17.0625 17.5606 16.8106 17.8125 16.5 17.8125C16.1894 17.8125 15.9375 17.5606 15.9375 17.25V16.6875C15.9375 16.1961 16.1662 15.7983 16.3981 15.5004C16.5697 15.28 16.7853 15.0647 16.9604 14.8901C17.0132 14.8374 17.0622 14.7884 17.1053 14.7441C17.2535 14.5916 17.3438 14.385 17.3438 14.1562C17.3438 13.6903 16.966 13.3125 16.5 13.3125ZM16.5 20.25C16.9142 20.25 17.25 19.9142 17.25 19.5C17.25 19.0858 16.9142 18.75 16.5 18.75C16.0858 18.75 15.75 19.0858 15.75 19.5C15.75 19.9142 16.0858 20.25 16.5 20.25Z" fill="#979797"/></svg>
                <h4>Ask a Question</h4>
                <p>Returns context-aware results appropriate to your query</p>
              </div>
            </div>
          </div>

          <!-- RESULTS SECTION -->
          <div id="resultsSection" class="results ${this._showResults && this._resultsReady? '' : 'hidden'}">
            <div class="searchMeta ${this._metaVisible ? '' : 'hidden'}">
              <span class="metaHits">${this._metaHits}</span>
              <span class="metaTime">${this._metaTime}</span>
            </div>
            <div id="results">
              ${this._results.map(item => this._renderCard(item))}
              </div>
              <div class="no-results ${this._noResults && this._resultsReady ? '' : 'hidden'}">${this._noResultsMsg}</div>
            </div>
              <div class="loader ${this._loading ? '' : 'hidden'}">Searching...</div>

        </div>
      </div>
    `;
  }

  _renderCard(item) {
    const authorName  = item.author?.name || '';
    const authorImg   = item.author?.img  || '';
    const imageUrl    = item.imageUrl     || '';
    const summary     = item.summary      || '';
    const publishedAt = item.publishedAt || '';
    const href = item.canonicalUrl || `/blogs/${this.searchIndex}/${item.handle}`;
    

    return html`
      <a class="result-card" href=${href} rel="noopener noreferrer" target="_blank">
        <div class="result-card__content">
          <div class="result-card__text">
            <h3 class="result-card__title">${item.title || ''}</h3>
            ${summary ? html`<p class="result-card__body">${summary}</p>` : ''}
          </div>
          ${imageUrl ? html`
            <div class="result-card__thumb">
              <img src=${imageUrl} alt=${item.title || 'Thumbnail'} />
            </div>` : ''}
        </div>
        <div class="result-card__footer">
          ${authorImg  ? html`<span class="result-card__avatar"><img src=${authorImg} alt=${authorName} /></span>` : ''}
          ${authorName ? html`<span class="result-card__author">${authorName}</span>` : ''}
          ${authorName && publishedAt ? html`<span class="result-card__sep">•</span>` : ''}
          ${publishedAt ? html`<span class="result-card__pushlished_at">${this._formatDate(publishedAt)}</span>` : ''}
        </div>
      </a>
    `;
  }

  // ── STYLES ───────────────────────────────────────────────────────────
static styles = css`
:host { display: flex; width : 100%; justify-content: center}
* {
    margin : 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

  /* ============================================================
   SEARCH CONTAINER
   ============================================================ */


.ai-search-container {
  text-align:      var(--lw-container-text-align, center);
  display:         var(--lw-container-display, block);
  align-items:     var(--lw-container-align-items, initial);
  justify-content: var(--lw-container-justify-content, initial);
  flex-direction:  var(--lw-container-flex-direction, initial);
  gap:             var(--lw-container-gap, initial);
  padding:         var(--lw-container-padding, 0);
  margin:          var(--lw-container-margin, 0);
  width :          var(--lw-container-width, 220px);
}

.ai-search-btn {
  background:    var(--lw-btn-background, #f58220);
  color:         var(--lw-btn-color, #ffffff);
  border:        none;
  padding:       var(--lw-btn-padding, 14px);
  border-radius: var(--lw-btn-border-radius, 6px);
  cursor:        pointer;
  font-size:     var(--lw-btn-font-size, 16px);
  font-weight:   var(--lw-btn-font-weight, 500);
  font-family:   inherit;
  display:       inline-flex;
  width:         var(--lw-btn-width, 100%);
  height:        var(--lw-btn-height, auto);
  transition:    background 0.15s, transform 0.1s;
}
.ai-search-btn:hover {
  background: var(--lw-btn-hover-background, #d16e19);
}
.ai-search-btn:active { transform: scale(0.97); }

.ai-search-btn svg {
  width : 16px;
  height: 16px;
}

.ai-search-btn .btn-icon {
  width:       var(--lw-btn-icon-size, 16px);
  height:      var(--lw-btn-icon-size, 16px);
  flex-shrink: 0;
}

.ai-search-container .ai-search-subtext {
  margin-top: 8px;
  font-size: 12px;
  color: #777;
}

.ai-search-subtext {
  margin-top:    var(--lw-btn-subtext-margin-top, 8px);
  font-size:     var(--lw-btn-subtext-font-size, 12px);
  color:         var(--lw-btn-subtext-color, #777);
  font-family:   inherit;
  text-align:    center;
  margin-bottom: 0;
}

.ai-search-btn .inner-container{
  margin : 0 auto;
  display : inline-flex;
  align-items: center;
  gap: 5px;
}

.ai-search-btn .inner-container {
  margin:      0 auto;
  display:     inline-flex;
  align-items: center;
  gap:         var(--lw-btn-gap, 5px);
}



  /* ============================================================
   MODAL OVERLAY + PANEL
   ============================================================ */


#ai-search-overlay {
  display: none;
  position: fixed;
  height : 100%;
  width : 100%;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99999;
  /* align-items: flex-start; */
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow-y: auto;         /* lets the backdrop itself scroll on very small screens */
}

#ai-search-overlay.open {
  display: flex;
}

.ai-search-modal {
  width: 100%;
  max-width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;


  background: #fff;
  overflow-y: auto;
  position: relative;
  padding: 70px 0 80px;
  box-sizing: border-box;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  /* rem when results are displayed*/
  display : flex; 
  align-items: center;
  justify-content: center;
}

.ai-search-modal-post-commit {
  width: 100%;
  max-width: 100%;
  height: 100%;
  overflow-x: hidden;

  background: #fff;

  overflow-y: scroll;
  position: relative;
  padding: 70px 0 80px;
  box-sizing: border-box;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  display: block;
}

/* ── CLOSE BUTTON ───────────────────────────────────────── */
#ai-search-close {
  position: absolute;
  top: 16px;
  right: 20px;
  background: none;
  border: none;
  font-size: 40px;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
  padding: 4px 8px;
}
#ai-search-close:hover { color: #333; }

/* ── HERO ───────────────────────────────────────────────── */
.hero {
  text-align: center;
  padding: 10px 10px 30px;
  /* position: relative; */
  /* top: 25%; */
}

.hero h1 {
  color: #0f1724;
  font-size: 32px;
  font-weight: 500;
  margin: 0;
}
.hero p {
  color: #595959;
  margin-bottom: 30px;
}

.hero .logo {
  display: flex;
  align-items: center;     
  justify-content: center; 
  gap: 10px;              
}

.hero .logo img {
  width : 35px;
  height : 35px;
  object-fit: contain;
}

/* ── SEARCH BAR ─────────────────────────────────────────── */
.search-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 500px;
  border: 1px solid #ddd;
  border-radius: 999px;
  background: #fff;
  padding: 0 12px 0 12px;
  box-sizing: border-box;
  outline: none;
  margin: 0 auto;
  height: 48px;
}

.search-input-wrapper:focus-within {
    border-color: #f68635;
    /* box-shadow: 0 0 0 3px rgba(255, 120, 21, 0.15);*/
}

.logo-image{
  margin-bottom: 2px;
}

.search-input-wrapper svg {
    width: 18px;
    height: 18px;
    opacity: 0.55;
}

.search-input-wrapper input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  padding: 14px 7px;
  box-shadow: none;
  color: #0f172a
}

.clear-btn {
  border: none;
  background-color: #fff;
  display: flex;
  cursor: pointer;
  justify-content: center;
  padding: 4px;
}
.clear-btn:hover { opacity: 1; }
.clear-btn svg {
  width: 16px;
  height: 16px;
  opacity: .55;
}
.clear-btn.hidden {
  visibility: hidden;
  pointer-events: none;
}

.search-btn {
  flex-shrink: 0;
  border: none;
  color: white;
  background: #ff7a1a;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.search-btn:hover { background: #e06010; }

/* ── FEATURES ───────────────────────────────────────────── */
.features {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  flex-wrap: wrap;
}

.feature-card {
  /* flex: 1 1 calc(25% - 16px); */
  width: 270px;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 16px;
  text-align: left;
}
.feature-card h4 { margin-bottom: 8px; font-size: 14px; color:#0f1724; font-weight:600 }

.feature-card p  { font-size: 12px; color: #6B7280; margin-bottom: 0; }

/* ── RESULTS SECTION ────────────────────────────────────── */
.results {
  margin: 0 auto;
  margin-top: 8px;
  max-width: 900px;
  padding : 0 10px;
}
.results-bar {
  margin-bottom: 20px;
}

/* ── RESULT CARD ────────────────────────────────────────── */
.result-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: black;
  gap: 12px;
    cursor: pointer;
    padding: 18px 10px;
    border-radius: 10px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.result-card:hover { opacity: 0.8; }

.result-card__content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.result-card__text {
  flex: 1 1 0;
  min-width: 0;
}

.result-card__title {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-card__body {
  font-size: 14px;
  font-weight: 200;
  color: #6B7280;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-height: 1.6;
  overflow: hidden;
}

.result-card__thumb { flex-shrink: 0; }
.result-card__thumb img {
  width: 150px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

/* ── FOOTER ─────────────────────────────────────────────── */
.result-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #979797;
}

.result-card__avatar { display: flex; align-items: center; }
.result-card__avatar img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.result-card__author, .result-card__pushlished_at { color: #979797; font-weight: 400 }
.result-card__sep    { color: #bbb; }
/* .result-card__tag    { color: #ff7a1a; font-weight: 500; } */

/* ── META ───────────────────────────────────────────────── */
.searchMeta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(15, 23, 42, .08);
  border-top: 1px solid rgba(15, 23, 42, .08);
  font-size: 14px;
  color: #595959;
  font-weight: 400;
}
.searchMeta .metaHits { margin-left: 10px; }
.searchMeta .metaTime { margin-right: 10px; }

/* ── UTILITY ────────────────────────────────────────────── */
.hidden { display: none; }

.loader {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 14px;
}
.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #888;
  font-size: 15px;
}

@media (max-width: 1000px) {
  .ai-search-container {
    width: 50%;
  }
}

@media (max-width: 768px) {
  .feature-card {
    flex: 1 1 calc(50% - 16px);
    max-width: calc(50% - 16px);
  }
  
  .ai-search-container {
    width: 75%;
  }

  .results {
    width : 100%;
  }
}

@media (max-width: 560px) {

  .ai-search-modal {
  background: #fff;

  width: 100%;
  max-width: 100%;
  height : 100%;

  overflow-y: auto;
  position: relative;
  padding: 70px 0 80px;
  box-sizing: border-box;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  display: block;
  }

    .ai-search-modal-post-commit {
      background: #fff;

      width: 100%;
      height : 100%;
      max-width: 100%;

      overflow-y: scroll;
      position: relative;
      padding: 70px 0 80px;
      box-sizing: border-box;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: block;
    }

  .feature-card {
    flex: 1 1 100%;
    max-width: 100%;
  }

  .ai-search-container {
    width: 100%;
  }

  .result-card__text {
    flex: 0.95;
  }

  .results {
    width : 100%;
  }
}

@media screen and (orientation: landscape) and (max-height: 500px) {

  .ai-search-modal,
  .ai-search-modal-post-commit {
    align-items: flex-start;
    justify-content: flex-start;
    padding-top: 60px;
    padding-bottom: 40px;
    overflow-y: auto;
  }

  .hero {
    padding-top: 0;
  }

  .hero h1 {
    font-size: 26px;
  }

  .hero p {
    margin-bottom: 18px;
  }

  .features {
    margin-top: 20px;
    gap: 12px;
  }

  .feature-card {
    width: calc(50% - 12px);
    padding: 14px;
  }

  .search-input-wrapper {
    max-width: 700px;
  }

  .results {
    max-width: 1000px;
  }

  .result-card__thumb img {
    width: 120px;
    height: 80px;
  }

  #ai-search-close {
    top: 10px;
    right: 14px;
    font-size: 32px;
  }
}
    /* paste your full custom-search-modal.css here */
    /* also add whatever .ai-search-modal and .ai-search-modal-post-commit rules you have */
  `;
}

customElements.define('lw-ai-search', LwAiSearch);
