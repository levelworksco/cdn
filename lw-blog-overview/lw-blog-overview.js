import { LitElement, html, css, nothing }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-blog-overview>
//
// PROPERTIES:
//   heading          (String)  — section title,   default "Overview"
//   displayCitations (String)  — 'none' | 'number' | 'chip' | 'link'
//                                default 'chip'
//   paragraphs (Array)   — array of:
//     {
//       text: String,
//       citation?: {
//         label:    String,          // pill text (used in chip mode)
//         articles: Array<{          // hover-card / reference items
//           title:   String,
//           excerpt: String,
//           image:   String,         // URL
//           url:     String,         // opens in new tab
//         }>
//       }
//     }
// ─────────────────────────────────────────────────────────────

const HIDE_DELAY   = 150;
const CARD_MAX_W   = 460;
const CARD_MARGIN  = 12;
const STYLE_TAG_ID = 'lw-blog-overview-global-styles';

function injectGlobalStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_TAG_ID;
  s.textContent = `
    .lw-bov-card {
      position: fixed;
      top: 0; left: 0;
      width: ${CARD_MAX_W}px;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06);
      /* The card is appended to document.body, so it has to clear whatever
         the host page -- or a modal embedding this component -- stacks above
         it. <lw-ai-search> lifts its own host to 2147483000 while the search
         is open, which left the card painting behind it. */
      z-index: var(--lw-bov-card-z, 2147483600);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #3c3c3c;
      line-height: 1.5;
      max-height: 336px;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: #c1c1c1 transparent;
      opacity: 0;
      pointer-events: none;
      transform: translateY(4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .lw-bov-card.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
    .lw-bov-card::-webkit-scrollbar       { width: 5px; }
    .lw-bov-card::-webkit-scrollbar-track { background: transparent; }
    .lw-bov-card::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 99px; }
    .lw-bov-card::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

    .lw-bov-article {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding: 14px 16px;
      border-top: 1px solid #f0f0f0;
      transition: background 0.1s;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }
    .lw-bov-article:first-child { border-top: none; }
    .lw-bov-article:hover       { background: #fafafa; }

    .lw-bov-article-body  { flex: 1; min-width: 0; }

    .lw-bov-article-title {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a1a;
      line-height: 1.4;
      margin-bottom: 5px;
    }
    .lw-bov-article:hover .lw-bov-article-title {
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .lw-bov-article-excerpt {
      font-size: 12px;
      color: #666;
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .lw-bov-article-image {
      width: 130px;
      height: 84px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: #e8e8e8;
    }
    .lw-bov-article-image img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
  `;
  document.head.appendChild(s);
}

export class LwBlogOverview extends LitElement {

  static properties = {
    heading:          { type: String },
    paragraphs:       { type: Array  },
    displayCitations: { type: String, attribute: 'display-citations' }, // 'none' | 'number' | 'chip' | 'link'
  };

  static styles = css`
    :host {
      display: block;
      background-color: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #3c3c3c;
      -webkit-font-smoothing: antialiased;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .container {
      max-width: 100%;
      margin: 0 auto;
      /* Split-view (compare mode) overrides the top padding via this custom
         property so its heading lines up with the keyword column's, whose
         "Overview" heading sits in a shorter 1.25rem-padded box. */
      padding: var(--lw-overview-pad-top, 32px) 0 32px;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      font-family: var(--lw-ai-results-heading-font, inherit);
      color: var(--lw-ai-results-heading-color, #1a1a1a);
      margin-bottom: 18px;
      letter-spacing: 0;
    }

    /* Matches the blog detail page's Body text (lw-blog-details.js .pd-body). */
    p {
          font-size: var(--pl-excerpt-font-size, 13px);
    color: var(--pl-excerpt-color, #9aa1a8);
    line-height: 1.55;
    margin-bottom: 1.1rem;
    white-space: pre-line;
    }
    p:last-of-type { margin-bottom: 0; }

    /* ── chip mode (default) ── */
    .citation {
      display: inline-flex;
      align-items: center;
      border: 1px solid #D9D9D9;
      border-radius: 999px;
      padding: 1px 9px;
      font-size: 11.5px;
      font-weight: 400;
      color: #000;
      background: #F3F3F3;
      white-space: nowrap;
      vertical-align: middle;
      margin-left: 4px;
      line-height: 1.6;
      position: relative;
      top: -1px;
      cursor: pointer;
      z-index: 0;
    }
    .citation.is-open { z-index: 100; }

    /* ── number mode ── */
    .citation-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      border: 1px solid #D9D9D9;
      border-radius: 4px;
      padding: 0 4px;
      font-size: 10.5px;
      font-weight: 500;
      color: #555;
      background: #F3F3F3;
      vertical-align: middle;
      margin-left: 3px;
      line-height: 1;
      position: relative;
      top: -1px;
      user-select: none;
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }
    .citation-num.is-open,
    .citation-num:hover {
      background: #e8e8e8;
      border-color: #bbb;
      color: #222;
    }

    /* ── link mode ── */
    .citation-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 1px solid #D9D9D9;
      border-radius: 999px;
      background: #F3F3F3;
      vertical-align: middle;
      margin-left: 4px;
      position: relative;
      top: -1px;
      color: #555;
      cursor: pointer;
      /* an <a> now, so its underline and visited colour have to go */
      text-decoration: none;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
      flex-shrink: 0;
    }
    .citation-link:hover,
    .citation-link:focus-visible {
      background: #e8e8e8;
      border-color: #bbb;
      color: #222;
      z-index: 100;
    }
    .citation-link svg {
      width: 12px;
      height: 12px;
      display: block;
    }

    .divider {
      display:none;
      height: 1px;
      background-color: #e5e5e5;
      margin-top: 24px;
    }

    @media (max-width: 768px) {
      .container { padding: 0 0 32px; }
      h1 { font-size: 14px; }
      p  { font-size: 13.5px; }
      .citation { font-size: 11px; padding: 1px 7px; }
    }
    @media (max-width: 480px) {
      .container { padding: 0 0 28px; }
      h1 { font-size: 13.5px; margin-bottom: 8px; }
      p  { font-size: 13px; line-height: 1.6; margin-bottom: 14px; }
      .citation { font-size: 10.5px; padding: 1px 6px; }
    }
  `;

  constructor() {
    super();
    this.heading          = 'Overview';
    this.paragraphs       = [];
    this.displayCitations = 'chip';
    this._cards           = [];
  }

  connectedCallback() {
    super.connectedCallback();
    injectGlobalStyles();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._teardownCards();
  }

  updated(changedProps) {
    if (changedProps.has('paragraphs') || changedProps.has('displayCitations')) {
      this._teardownCards();
      const mode = this.displayCitations ?? 'chip';
      if (mode === 'chip') {
        this.shadowRoot.querySelectorAll('.citation[data-articles]').forEach(el => {
          const articles = JSON.parse(el.dataset.articles);
          if (articles.length) this._attachHoverCard(el, articles);
        });
      } else if (mode === 'number') {
        this.shadowRoot.querySelectorAll('.citation-num[data-article]').forEach(el => {
          const article = JSON.parse(el.dataset.article);
          this._attachHoverCard(el, [article]);
        });
      }
      // 'link' mode is deliberately inert — the icon is a plain link to the
      // top source, with no hover card.
    }
  }

  _teardownCards() {
    this._cards.forEach(c => c.remove());
    this._cards = [];
  }

  // Builds a hover card for `articles` and attaches show/hide to `trigger`.
  _attachHoverCard(trigger, articles) {
    const card = document.createElement('div');
    card.className = 'lw-bov-card';

    articles.forEach(article => {
      const item = document.createElement('a');
      item.className = 'lw-bov-article';
      item.href      = article.url || '#';
      item.target    = '_blank';
      item.rel       = 'noopener noreferrer';

      const body = document.createElement('div');
      body.className = 'lw-bov-article-body';

      const titleEl = document.createElement('div');
      titleEl.className   = 'lw-bov-article-title';
      titleEl.textContent = article.title;

      const excerptEl = document.createElement('div');
      excerptEl.className   = 'lw-bov-article-excerpt';
      excerptEl.textContent = article.excerpt;

      body.appendChild(titleEl);
      body.appendChild(excerptEl);

      const imgWrap = document.createElement('div');
      imgWrap.className = 'lw-bov-article-image';
      const img = document.createElement('img');
      img.src     = article.image;
      img.alt     = article.title;
      img.loading = 'lazy';
      imgWrap.appendChild(img);

      item.appendChild(body);
      item.appendChild(imgWrap);
      card.appendChild(item);
    });

    document.body.appendChild(card);
    this._cards.push(card);

    let hideTimer = null;

    const show = () => {
      clearTimeout(hideTimer);
      const vw   = window.innerWidth;
      const rect = trigger.getBoundingClientRect();
      const w    = Math.min(CARD_MAX_W, vw - CARD_MARGIN * 2);
      let left   = rect.left;
      if (left + w > vw - CARD_MARGIN) left = vw - CARD_MARGIN - w;
      if (left < CARD_MARGIN)          left = CARD_MARGIN;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const cardH      = Math.min(336, card.scrollHeight);
      const top = spaceBelow >= cardH
        ? rect.bottom + 8
        : rect.top - cardH - 8;
      card.style.width = w + 'px';
      card.style.left  = left + 'px';
      card.style.top   = top + 'px';
      trigger.classList.add('is-open');
      card.classList.add('is-open');
    };

    const scheduleHide = () => {
      hideTimer = setTimeout(() => {
        trigger.classList.remove('is-open');
        card.classList.remove('is-open');
      }, HIDE_DELAY);
    };

    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('mouseleave', scheduleHide);
    card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    card.addEventListener('mouseleave', scheduleHide);
  }

  // Builds a global map of article URL → reference number (1-based, deduplicated).
  _buildArticleIndex() {
    const map = new Map();
    let counter = 1;
    for (const para of this.paragraphs) {
      for (const article of para.citation?.articles ?? []) {
        const key = article.url || article.title;
        if (!map.has(key)) map.set(key, counter++);
      }
    }
    return map;
  }

  // Link mode opens the first source behind the answer. When that article has
  // no external url of its own the bare '#' href would just reload the page, so
  // the default is cancelled and the host told to navigate instead.
  _onCitationLinkClick(e, article) {
    if (article?.url && article.url !== '#') return;
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('citation-click', {
      detail: { article },
      bubbles: true,
      composed: true,
    }));
  }

  _renderCitation(citation, mode, articleIndex) {
    if (mode === 'none' || !citation) return nothing;

    if (mode === 'chip') {
      return html`
        <span class="citation" data-articles=${JSON.stringify(citation.articles)}>
          ${citation.label}
        </span>
      `;
    }

    if (mode === 'number') {
      return html`${citation.articles.map(article => {
        const num = articleIndex.get(article.url || article.title);
        return html`<span class="citation-num" data-article=${JSON.stringify(article)}>${num}</span>`;
      })}`;
    }

    // Link mode is a single anchor to the top-ranked source — no hover card,
    // it only acts on click.
    if (mode === 'link') {
      // `||` not `??` — an article can carry url: '', which must still fall
      // back rather than render a broken/empty href.
      const top = citation.articles?.[0] ?? {};
      const external = top.url && top.url !== '#';
      return html`
        <a
          class="citation-link"
          href=${top.url || '#'}
          target=${external ? '_blank' : nothing}
          rel=${external ? 'noopener noreferrer' : nothing}
          title=${top.title ? `Source: ${top.title}` : 'View source'}
          aria-label=${`Source: ${top.title || 'view article'}`}
          @click=${e => this._onCitationLinkClick(e, top)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </a>
      `;
    }

    return nothing;
  }

  render() {
    const mode         = this.displayCitations ?? 'chip';
    const articleIndex = (mode === 'number') ? this._buildArticleIndex() : null;

    return html`
      <div class="container">
        <h1>${this.heading}</h1>
        <div class="paragraphs">
          ${this.paragraphs.map(para => html`
            <p>
              ${para.text}
              ${this._renderCitation(para.citation, mode, articleIndex)}
            </p>
          `)}
        </div>
        <div class="divider"></div>
      </div>
    `;
  }
}

// Guarded: lw-summary.js and lw-blog-overview.js are identical copies that
// both define this tag, so whichever loads second must not throw.
if (!customElements.get('lw-blog-overview')) {
  customElements.define('lw-blog-overview', LwBlogOverview);
}
