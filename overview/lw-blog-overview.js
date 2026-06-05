import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-blog-overview>
//
// PROPERTIES:
//   heading    (String)  — section title,   default "Overview"
//   paragraphs (Array)   — array of:
//     {
//       text: String,
//       citation?: {
//         label:    String,          // pill text, e.g. "Source + 2"
//         articles: Array<{          // hover-card items
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
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #3c3c3c;
      line-height: 1.5;
      max-height: 336px;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: #d4d4d4 transparent;
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
    .lw-bov-card::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 99px; }
    .lw-bov-card::-webkit-scrollbar-thumb:hover { background: #b0b0b0; }

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
    heading:    { type: String },
    paragraphs: { type: Array  },
  };

  static styles = css`
    :host {
      display: block;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #3c3c3c;
      -webkit-font-smoothing: antialiased;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .container {
      max-width: 840px;
      margin: 0 auto;
      padding: 32px 24px 40px;
    }

    h1 {
      font-size: 15px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 18px;
      letter-spacing: 0;
    }

    p {
      font-size: 14px;
      font-weight: 400;
      line-height: 1.65;
      color: #3c3c3c;
      margin-bottom: 16px;
    }
    p:last-of-type { margin-bottom: 0; }

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

    .divider {
      height: 1px;
      background-color: #e5e5e5;
      margin-top: 24px;
    }

    @media (max-width: 768px) {
      .container { padding: 24px 16px 32px; }
      h1 { font-size: 14px; }
      p  { font-size: 13.5px; }
      .citation { font-size: 11px; padding: 1px 7px; }
    }
    @media (max-width: 480px) {
      .container { padding: 20px 14px 28px; }
      h1 { font-size: 13.5px; margin-bottom: 14px; }
      p  { font-size: 13px; line-height: 1.6; margin-bottom: 14px; }
      .citation { font-size: 10.5px; padding: 1px 6px; }
    }
  `;

  constructor() {
    super();
    this.heading    = 'Overview';
    this.paragraphs = [];
    this._cards     = [];
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
    if (changedProps.has('paragraphs')) {
      this._teardownCards();
      this._setupCards();
    }
  }

  _teardownCards() {
    this._cards.forEach(c => c.remove());
    this._cards = [];
  }

  _setupCards() {
    this.shadowRoot.querySelectorAll('.citation[data-articles]').forEach(citation => {
      const articles = JSON.parse(citation.dataset.articles);
      if (!articles.length) return;

      const card = document.createElement('div');
      card.className = 'lw-bov-card';

      articles.forEach(article => {
        const item = document.createElement('a');
        item.className = 'lw-bov-article';
        item.href      = article.url || '#';
        item.target    = '_blank';
        item.rel       = 'noopener noreferrer';
        item.innerHTML = `
          <div class="lw-bov-article-body">
            <div class="lw-bov-article-title">${article.title}</div>
            <div class="lw-bov-article-excerpt">${article.excerpt}</div>
          </div>
          <div class="lw-bov-article-image">
            <img src="${article.image}" alt="${article.title}" loading="lazy" />
          </div>
        `;
        card.appendChild(item);
      });

      document.body.appendChild(card);
      this._cards.push(card);

      let hideTimer = null;

      const show = () => {
        clearTimeout(hideTimer);
        const vw   = window.innerWidth;
        const rect = citation.getBoundingClientRect();
        const w    = Math.min(CARD_MAX_W, vw - CARD_MARGIN * 2);
        let left   = rect.left;
        if (left + w > vw - CARD_MARGIN) left = vw - CARD_MARGIN - w;
        if (left < CARD_MARGIN)          left = CARD_MARGIN;
        card.style.width = w + 'px';
        card.style.left  = left + 'px';
        card.style.top   = (rect.bottom + 8) + 'px';
        citation.classList.add('is-open');
        card.classList.add('is-open');
      };

      const scheduleHide = () => {
        hideTimer = setTimeout(() => {
          citation.classList.remove('is-open');
          card.classList.remove('is-open');
        }, HIDE_DELAY);
      };

      citation.addEventListener('mouseenter', show);
      citation.addEventListener('mouseleave', scheduleHide);
      card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
      card.addEventListener('mouseleave', scheduleHide);
    });
  }

  render() {
    return html`
      <div class="container">
        <h1>${this.heading}</h1>
        <div class="paragraphs">
          ${this.paragraphs.map(para => html`
            <p>
              ${para.text}
              ${para.citation ? html`
                <span
                  class="citation"
                  data-articles=${JSON.stringify(para.citation.articles)}
                >${para.citation.label}</span>
              ` : ''}
            </p>
          `)}
        </div>
        <div class="divider"></div>
      </div>
    `;
  }
}

customElements.define('lw-blog-overview', LwBlogOverview);
