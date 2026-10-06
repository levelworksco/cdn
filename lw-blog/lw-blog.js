import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';
import '../lw-insights-bar/lw-insights-bar.js';
import '../lw-header/lw-header.js';
import '../lw-settings/lw-settings.js';
import '../lw-blog-search/lw-blog-search.js';
import '../lw-blog-list/lw-blog-list.js';
import '../lw-summary/lw-summary.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-blog>
//
// Single entry-point that composes:
//   <lw-insights-bar> + <lw-header> + <lw-blog-search> + <lw-blog-list>
//
// All internal events are wired automatically.
//
// ATTRIBUTES — insights bar:
//   demo-note           (String)
//   blogs               (String)
//   updated             (String)
//   searches            (String)
//   unblocked           (String)
//
// ATTRIBUTES — header:
//   logo-src            (String)  logo image URL; shows placeholder if missing or broken
//   logo-href           (String)
//   sign-in-label       (String)
//   sign-in-href        (String)
//
// ATTRIBUTES — API / navigation:
//   base-url            (String)  search API endpoint
//   api-key             (String)  X-API-KEY header value
//   detail-url          (String)  page opened on post click
//
// ATTRIBUTES — search bar:
//   search-placeholder  (String)  input placeholder
//   slider-max          (Number)  semantic slider max  (default 1)
//   slider-step         (Number)  semantic slider step (default 0.1)
//   slider-label        (String)  label left of slider
//
// ATTRIBUTES — list:
//   default-view        (String)  'list' | 'grid'
//   default-sort        (String)  initial sort key
//
// CSS VARIABLES (set on <lw-blog> host):
//   --blog-page-max-width   max-width of content area  (default 960px)
//   --blog-page-padding     padding of content area    (default 0 2rem 4rem)
//   --blog-search-top       sticky top for search bar  (default 34px)
//   --pl-sidebar-top        sticky top for list sidebar
//   All --pl-* and --pd-* vars inherit into child shadows automatically.
// ─────────────────────────────────────────────────────────────

export class LwBlog extends LitElement {

  static properties = {
    // lw-insights-bar
    demoNote:          { attribute: 'demo-note'          },
    blogs:             { attribute: 'blogs'              },
    updatedAt:         { attribute: 'updated'            },
    searches:          { attribute: 'searches'           },
    unblocked: { attribute: 'unblocked' },

    // lw-header
    logoSrc:    { attribute: 'logo-src'    },
    barLogoSrc: { attribute: 'bar-logo-src' },
    logoHref:   { attribute: 'logo-href'   },

    // API / navigation
    baseUrl:   { attribute: 'base-url'   },
    apiKey:    { attribute: 'api-key'    },
    detailUrl: { attribute: 'detail-url' },

    // search bar
    searchPlaceholder: { attribute: 'search-placeholder' },
    sliderMax:         { type: Number, attribute: 'slider-max'  },
    sliderStep:        { type: Number, attribute: 'slider-step' },
    sliderLabel:       { attribute: 'slider-label' },

    // summary
    summaryHeading:    { attribute: 'summary-heading'   },
    summaryCitations:  { attribute: 'summary-citations' },
    summaryParagraphs: { type: Array },

    // list
    defaultView: { attribute: 'default-view' },
    defaultSort: { attribute: 'default-sort' },

    // internal wiring
    _searchQuery:   { state: true },
    _semanticRatio: { state: true },
    _searchTime:    { state: true },
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

    lw-blog-search {
      display: block;
      position: sticky;
      top: var(--blog-search-top, 34px);
      z-index: 100;
      background: #fff;
      padding: 32px 0;
      /* box-shadow: 0 6px 12px -2px rgba(255,255,255,1),
                  0 10px 16px -4px rgba(255,255,255,0.9); */
    }

    lw-blog-list {
      position: relative;
      z-index: 0;
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
      /* Extra bottom room so the floating insights dock doesn't hide content. */
      .page { padding: var(--blog-page-padding, 0 1.25rem 9rem); }
    }

    @media (max-width: 480px) {
      .page         { padding: var(--blog-page-padding, 0 1rem 8.5rem); }
      lw-blog-search { padding: 0.75rem 0 0.25rem; }
    }
  `;

  constructor() {
    super();
    // insights-bar
    this.demoNote          = '';
    this.blogs             = '';
    this.updatedAt         = '';
    this.searches          = '';
    // header
    this.logoSrc    = '';
    this.barLogoSrc = '';
    this.logoHref   = '';
    // API / nav
    this.baseUrl           = '';
    this.apiKey            = '';
    this.detailUrl         = '';
    // search
    this.searchPlaceholder = 'Search';
    this.sliderMax         = 1;
    this.sliderStep        = 0.1;
    this.sliderLabel       = '';
    // summary
    this.summaryHeading    = 'Overview';
    this.summaryCitations  = 'chip';
    this.summaryParagraphs = [];
    // list
    this.defaultView       = 'list';
    this.defaultSort       = 'newest';
    // internal
    this._searchQuery      = '';
    this._semanticRatio    = 0;
    this._searchTime       = null;
  }

  _onSearchChange(e)     { this._searchQuery   = e.detail.value; }
  _onSliderChange(e)     { this._semanticRatio = e.detail.value; }
  _onSearchTimeUpdate(e) { this._searchTime    = e.detail.ms;    }

  render() {
    return html`
      <lw-insights-bar
        demo-note=${this.demoNote}
        logo-src=${this.barLogoSrc}
        blogs=${this.blogs}
        updated=${this.updatedAt}
        searches=${this.searches}
        unblocked=${this.unblocked}
      ></lw-insights-bar>

      <lw-header
        logo-src=${this.logoSrc}
        logo-href=${this.logoHref}
      ></lw-header>

      <div class="page">
        <lw-blog-search
          placeholder=${this.searchPlaceholder}
          .value=${this._searchQuery}
          slider-max=${this.sliderMax}
          slider-step=${this.sliderStep}
          slider-label=${this.sliderLabel}
          .searchTime=${this._searchTime}
          @search-change=${this._onSearchChange}
          @slider-change=${this._onSliderChange}
        ></lw-blog-search>

        ${this.summaryParagraphs?.length
          ? html`
              <lw-blog-overview
                heading=${this.summaryHeading}
                displayCitations=${this.summaryCitations}
                .paragraphs=${this.summaryParagraphs}
              ></lw-blog-overview>
            `
          : ''}

        <lw-blog-list
          base-url=${this.baseUrl}
          api-key=${this.apiKey}
          detail-url=${this.detailUrl}
          default-view=${this.defaultView}
          default-sort=${this.defaultSort}
          .searchQuery=${this._searchQuery}
          .semanticRatio=${this._semanticRatio}
          @search-change=${this._onSearchChange}
          @search-time-update=${this._onSearchTimeUpdate}
        ></lw-blog-list>
      </div>

      <lw-settings></lw-settings>
    `;
  }
}

customElements.define('lw-blog', LwBlog);
