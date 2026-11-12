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
    // With an animation set, the heading comes in word by word too. A host that
    // already showed the heading (say on a loader) turns this off, so it does
    // not flash and re-animate when the answer replaces the loader.
    animateHeading: { type: Boolean, attribute: 'animate-heading' },
    // Reveal the answer as if it were being typed, then show the citations.
    typewriter:       { type: Boolean },
    // FlowToken-style streaming (https://github.com/Ephibbs/flowtoken): while the
    // answer is revealed, each new word (or character) mounts as its own span and
    // plays a CSS keyframe. Set `animation` to one of: fadeIn, blurIn, slideUp,
    // dropIn, fadeAndScale, blurAndSharpen, highlight. Empty = the plain
    // typewriter with a caret.
    animation:        { type: String },
    sep:              { type: String },                                  // 'word' | 'char'
    animationDuration:       { type: String, attribute: 'animation-duration' },
    animationTimingFunction: { type: String, attribute: 'animation-timing-function' },
    _typed:           { state: true },   // characters revealed so far
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
      font-size: var(--lw-overview-heading-size, 24px);
      font-weight: 700;
      font-family: var(--lw-ai-results-heading-font, inherit);
      color: var(--lw-ai-results-heading-color, #1a1a1a);
      margin-bottom: 18px;
      letter-spacing: 0;
    }

    /* Tiny sparkle beside the heading; --lw-ai-sparkle-color recolours it. */
    .ai-mark {
      width: 24px;
      height: 24px;
      margin-left: 6px;
      vertical-align: middle;
      position: relative;
      top: -2px;
      color: var(--lw-ai-sparkle-color, currentColor);
    }

    /* Matches the blog detail page's Body text (lw-blog-details.js .pd-body). */
    p {
          font-size: 16px;
    color: var(--pl-excerpt-color, #9aa1a8);
    line-height: 1.55;
    margin-bottom: 1.1rem;
    white-space: normal;
    }
    p:last-of-type { margin-bottom: 0; }

    /* ── chip mode (default) ── */
    /* The caret that rides at the end of the text while it is typed. */
    .caret {
      display: inline-block;
      width: 2px;
      height: 1em;
      margin-left: 2px;
      background: currentColor;
      vertical-align: text-bottom;
      animation: lw-caret-blink 0.9s steps(1) infinite;
    }
    @keyframes lw-caret-blink { 50% { opacity: 0; } }

    /* ── FlowToken-style token animations ── */
    .tok {
      display: inline-block;
      animation-duration: var(--lw-flow-duration, 0.6s);
      animation-timing-function: var(--lw-flow-ease, ease-out);
      animation-fill-mode: both;
    }
    .tok.fadeIn         { animation-name: lw-flow-fadeIn; }
    .tok.blurIn         { animation-name: lw-flow-blurIn; }
    .tok.slideUp        { animation-name: lw-flow-slideUp; }
    .tok.dropIn         { animation-name: lw-flow-dropIn; }
    .tok.fadeAndScale   { animation-name: lw-flow-fadeAndScale; }
    .tok.blurAndSharpen { animation-name: lw-flow-blurAndSharpen; }
    .tok.highlight      { animation-name: lw-flow-highlight; border-radius: 3px; }
    @keyframes lw-flow-fadeIn         { from { opacity: 0; } to { opacity: 1; } }
    @keyframes lw-flow-blurIn         { from { opacity: 0; filter: blur(6px); } to { opacity: 1; filter: blur(0); } }
    @keyframes lw-flow-slideUp        { from { opacity: 0; transform: translateY(0.6em); } to { opacity: 1; transform: none; } }
    @keyframes lw-flow-dropIn         { from { opacity: 0; transform: translateY(-0.6em); } to { opacity: 1; transform: none; } }
    @keyframes lw-flow-fadeAndScale   { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: none; } }
    @keyframes lw-flow-blurAndSharpen { from { opacity: 0; filter: blur(8px); transform: scale(1.1); } to { opacity: 1; filter: blur(0); transform: none; } }
    @keyframes lw-flow-highlight      { from { background: rgba(255, 213, 79, 0.55); } to { background: transparent; } }
    @media (prefers-reduced-motion: reduce) { .tok { animation: none; } }

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
      h1 { font-size: var(--lw-overview-heading-size, 14px); }
      p  { font-size: 16px; }
      .citation { font-size: 11px; padding: 1px 7px; }
    }
    @media (max-width: 480px) {
      .container { padding: 0 0 28px; }
      h1 { font-size: var(--lw-overview-heading-size, 13.5px); margin-bottom: 8px; }
      p  { font-size: 16px; line-height: 1.6; margin-bottom: 14px; }
      .citation { font-size: 10.5px; padding: 1px 6px; }
    }
  `;

  constructor() {
    super();
    this.heading          = 'Overview';
    this.paragraphs       = [];
    this.displayCitations = 'chip';
    this._cards           = [];
    this.typewriter       = false;
    this.animation        = '';
    this.sep              = 'word';
    this.animationDuration       = '';
    this.animationTimingFunction = '';
    this.animateHeading          = true;
    this._typed          = Infinity;   // everything, until a typing run starts
    this._typedSignature  = '';
    this._typingFrame     = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    injectGlobalStyles();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._teardownCards();
    cancelAnimationFrame(this._typingFrame);
  }

  get _totalChars() {
    return (this.paragraphs ?? []).reduce((n, para) => n + String(para.text ?? '').length, 0);
  }

  willUpdate(changedProps) {
    if (!changedProps.has('paragraphs') && !changedProps.has('typewriter')) return;

    if (!this.typewriter) {
      cancelAnimationFrame(this._typingFrame);
      this._typed = Infinity;
      this._typedSignature = '';
      return;
    }

    // A new array with the same words (the parent re-rendering) must not
    // start the typing over; only a different answer does.
    const signature = (this.paragraphs ?? []).map(para => para.text).join('||');
    if (signature === this._typedSignature) return;
    this._typedSignature = signature;
    this._startTyping();
  }

  _startTyping() {
    cancelAnimationFrame(this._typingFrame);
    const total = this._totalChars;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!total || reduced) {
      this._typed = Infinity;
      this._announceTypingEnd();
      return;
    }

    this._typed = 0;
    // Brisk, but never longer than about five seconds for a long answer.
    const perSecond = Math.max(90, total / 5);
    const start = performance.now();
    const tick = (now) => {
      const typed = Math.floor(((now - start) / 1000) * perSecond);
      if (typed >= total) { this._typed = Infinity; this._announceTypingEnd(); return; }
      this._typed = typed;
      this._typingFrame = requestAnimationFrame(tick);
    };
    this._typingFrame = requestAnimationFrame(tick);
  }

  // Tells the host the whole answer is on screen (and its citations attached),
  // so it can bring in whatever should follow it — e.g. <lw-ai-search> reveals
  // the products and blogs after this. Fires once per typing run.
  _announceTypingEnd() {
    const run = this._typedSignature;
    this.updateComplete.then(() => {
      if (run !== this._typedSignature) return;   // a newer answer took over
      this.dispatchEvent(new CustomEvent('typing-end', { bubbles: true, composed: true }));
    });
  }

  updated(changedProps) {
    // The citations only exist once the typing has finished.
    const finishedTyping = changedProps.has('_typed') && this._typed === Infinity
      && changedProps.get('_typed') !== Infinity;
    if (changedProps.has('paragraphs') || changedProps.has('displayCitations') || finishedTyping) {
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
      } else if (mode === 'link') {
        // The icon still links to the top source on click; hovering it shows
        // that same source as a blog card (title, excerpt, image).
        this.shadowRoot.querySelectorAll('.citation-link[data-article]').forEach(el => {
          const article = JSON.parse(el.dataset.article);
          if (article?.title) this._attachHoverCard(el, [article]);
        });
      }
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

    // Link mode is a single anchor to the top-ranked source; hovering it shows
    // that source's blog card (attached in updated()), clicking opens it.
    if (mode === 'link') {
      // `||` not `??` — an article can carry url: '', which must still fall
      // back rather than render a broken/empty href.
      const top = citation.articles?.[0] ?? {};
      const external = top.url && top.url !== '#';
      return html`
        <a
          class="citation-link"
          data-article=${JSON.stringify(top)}
          href=${top.url || '#'}
          target=${external ? '_blank' : nothing}
          rel=${external ? 'noopener noreferrer' : nothing}
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

  static KNOWN_ANIMATIONS = ['fadeIn', 'blurIn', 'slideUp', 'dropIn', 'fadeAndScale', 'blurAndSharpen', 'highlight'];

  // The revealed part of `text` as FlowToken-style tokens. A word only appears
  // once all of it has been "streamed"; the whitespace stays outside the span so
  // inline-block never swallows it. Spans keep their position in the list, so a
  // re-render only mounts (and animates) the newly revealed ones.
  _renderTokens(text, revealed, animation) {
    const byChar = this.sep === 'char';
    const re = byChar ? /[\s\S]/g : /(\S+)(\s*)/g;
    const out = [];
    let m;
    while ((m = re.exec(text))) {
      const word = byChar ? m[0] : m[1];
      const gap  = byChar ? '' : m[2];
      if (m.index + word.length > revealed) break;
      out.push(html`<span class="tok ${animation}">${word}</span>${gap}`);
    }
    return out;
  }

  // The heading comes in with the same effect as the answer, a word at a time.
  _renderHeadingWords(animation) {
    const out = [];
    const re = /(\S+)(\s*)/g;
    const str = String(this.heading ?? '');
    let m;
    let i = 0;
    while ((m = re.exec(str))) {
      out.push(html`<span class="tok ${animation}" style="animation-delay:${i++ * 55}ms">${m[1]}</span>${m[2]}`);
    }
    return out;
  }

  render() {
    const mode         = this.displayCitations ?? 'chip';
    const articleIndex = (mode === 'number') ? this._buildArticleIndex() : null;
    const flow = this.typewriter && LwBlogOverview.KNOWN_ANIMATIONS.includes(this.animation)
      ? this.animation : '';
    const flowStyle = flow
      ? `${this.animationDuration ? `--lw-flow-duration:${this.animationDuration};` : ''}${this.animationTimingFunction ? `--lw-flow-ease:${this.animationTimingFunction};` : ''}`
      : '';

    return html`
      <div class="container">
        <h1>${flow && this.animateHeading ? this._renderHeadingWords(flow) : this.heading}<svg class="ai-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M10 3l1.9 5.1L17 10l-5.1 1.9L10 17l-1.9-5.1L3 10l5.1-1.9L10 3z"/>
          <path d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14z"/>
        </svg></h1>
        <div class="paragraphs" style=${flowStyle}>
          ${(() => {
            let left = this._typed;           // characters still to reveal
            return this.paragraphs.map((para, i) => {
              const text = String(para.text ?? '');
              if (left <= 0 && i > 0) return nothing;   // not reached yet
              const done = left >= text.length;
              const shown = done ? text : text.slice(0, left);
              const revealed = left;
              left -= text.length;
              if (flow) {
                return html`<p>${this._renderTokens(text, done ? text.length : revealed, flow)}${done
                  ? this._renderCitation(para.citation, mode, articleIndex)
                  : nothing}</p>`;
              }
              return html`<p>${shown}${done
                ? this._renderCitation(para.citation, mode, articleIndex)
                : html`<span class="caret"></span>`}</p>`;
            });
          })()}
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
