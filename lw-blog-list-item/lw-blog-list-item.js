import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// Standard "broken/missing image" glyph (picture frame + mountain + sun),
// shown when a post has no image or its image fails to load.
const IMAGE_PLACEHOLDER_ICON = html`
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2.5" y="3.5" width="19" height="17" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="8" cy="9" r="1.75" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3 16.5l5.5-5.5a1.5 1.5 0 0 1 2.12 0L15 15.38M13.5 13.5l1.88-1.88a1.5 1.5 0 0 1 2.12 0L21 15.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-blog-list-item>
// Renders one post in list OR grid mode.
// view prop is passed down from <lw-blog-list>.
// ─────────────────────────────────────────────────────────────
export class LwBlogListItem extends LitElement {

  static properties = {
    post:   { type: Object },
    view:   { type: String }, // 'list' | 'grid'
    number: { type: Number, reflect: true }, // rank shown before the title (null = none)
    _imageError: { state: true },
  };

  static styles = css`
    :host { display: block; animation: fadeUp 0.25s ease both; animation-delay: 0.1s; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ══════════════════════════════
       LIST VIEW
    ══════════════════════════════ */
    .list-row {
      display: flex;
      gap: 1.75rem;
      align-items: flex-start;
      padding: var(--pl-card-padding, 1.75rem 0);
      border-bottom: 1px solid var(--pl-card-divider, #ececec);
      background: var(--pl-card-background, transparent);
      border-radius: var(--pl-card-radius, 0);
      color: var(--lw-ai-results-body-color, inherit);
    }
    :host(:last-child) .list-row { border-bottom: none; }
    /* Numbered (search-result) list: the heading sits right under
       "Further Reading", so trim the first item's top padding. */
    :host([number="1"]) .list-row { padding-top: 0.3rem; }

    .list-content {
      flex: 1;
      min-width: 0;
      color: var(--lw-ai-results-body-color, inherit);
    }

    /* Numbered title: number in its own column so wrapped lines align under
       the title text (a hanging indent), not under the number. */
    .list-title.is-numbered {
      display: flex;
      gap: 0.4rem;
      align-items: baseline;
    }
    .list-number      { color: var(--pl-title-color, #111); flex-shrink: 0; }
    .list-title-text  { flex: 1; min-width: 0; }

    .list-title {
      font-size:   var(--pl-title-font-size,   18px);
      font-weight: var(--pl-title-font-weight, 700);
      color:       var(--pl-title-color,       #1a1a1a);
      line-height: 1.25;
      margin-top: 0;
      margin-bottom: 0.7rem;
      cursor: pointer;
      font-family: var(--pl-title-font-family, 'Inter', sans-serif);
    }
    /* Hover marks the title the way a link is marked: an underline under
       the text alone. The colour stays put -- shifting a heading's colour
       on hover read as the text changing rather than as something to
       click, and it fought with whatever title colour the site had set. */
    .list-title:hover .list-title-text {
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .list-excerpt {
      font-size:   var(--pl-excerpt-font-size, 13px);
      color:       var(--pl-excerpt-color,     #9aa1a8);
      font-family: var(--pl-excerpt-font-family, inherit);
      line-height: 1.55;
      margin-bottom: 1rem;
      /* A host that is short of width -- the right panel, where a row is
         a narrow column -- can drop the excerpt with
         --pl-excerpt-display: none and keep the title and the meta. */
      display: var(--pl-excerpt-display, -webkit-box);
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .list-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-size: var(--pl-meta-font-size, 13px);
      color:     var(--lw-ai-results-body-color, var(--pl-meta-color, #888));
    }
    /* Desktop shows the inline meta (under the text); the full-width one below
       both content + image is mobile-only (enabled in the ≤600px block). */
    .list-meta--full { display: none; }

    .list-image {
      /* Fixed square on large screens (restored to the fluid 3/2 layout
         below ≤900px) — smaller and consistent regardless of card width. */
      width:         var(--pl-image-width, 180px);
      max-width:     160px;
      height:        120px;
      aspect-ratio:  4 / 3;
      flex-shrink:   0;
      border-radius: var(--pl-image-border-radius, 16px);
      overflow:      hidden;
      background:    #ddd;
    }
    .list-image img { width:100%; height:100%; object-fit:cover; display:block; }

    /* ══════════════════════════════
       GRID VIEW
    ══════════════════════════════ */
    .grid-card {
      display: flex;
      flex-direction: column;
      background: var(--pl-card-background, #fff);
      border-radius: var(--pl-card-radius, var(--pl-grid-card-radius, 12px));
      height: 100%;
      border-bottom: 1px solid var(--pl-card-divider, #e5e5e5);
      box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05);
      color: var(--lw-ai-results-body-color, inherit);
    }

    .grid-image {
      width: 100%;
      height: 180px;
      overflow: hidden;
      border-radius: var(--pl-card-radius, var(--pl-grid-card-radius, 12px)) var(--pl-card-radius, var(--pl-grid-card-radius, 12px)) 0 0;
      background: #ddd;
      flex-shrink: 0;
    }
    .grid-image img { width:100%; height:100%; object-fit:cover; display:block; }

    .grid-body {
      padding: 0.85rem 0.85rem 0.75rem;
      display: flex;
      flex-direction: column;
      flex: 1;
      color: var(--lw-ai-results-body-color, inherit);
    }

    .grid-title {
      font-size:   var(--pl-title-font-size,   0.95rem);
      font-weight: var(--pl-title-font-weight, 700);
      color:       var(--pl-title-color,       #111);
      line-height: 1.3;
      margin-bottom: 0.35rem;
      cursor: pointer;
      transition: color 0.15s;
      font-family: var(--pl-title-font-family, 'Inter', sans-serif);
    }
    .grid-title:hover { color: var(--pl-title-hover-color, #555); }

    .grid-excerpt {
      font-size:   var(--pl-excerpt-font-size, 16px);
      color:       var(--pl-excerpt-color,     #555);
      font-family: var(--pl-excerpt-font-family, inherit);
      line-height: 1.6;
      margin-bottom: 0.6rem;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }

    .grid-meta {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: var(--pl-meta-font-size, 12px);
      color:     var(--lw-ai-results-body-color, var(--pl-meta-color, #999));
      margin-top: auto;
    }

    .grid-meta-author-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .grid-meta-date-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .grid-meta-category {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 5px;
      background: var(--pl-category-bg, #fde8d4);
      color: var(--pl-category-color, #e07630);
      font-weight: 500;
      font-size: 12px;
      white-space: nowrap;
      align-self: flex-start;
    }

    /* shared meta pieces */
    .meta-author,
    .meta-date {
      font-family: var(--lw-ai-results-body-font, inherit);
      color: var(--lw-ai-results-body-color, var(--pl-author-color, #1a1a1a));
    }
    .meta-author { font-weight: 600; }
    .meta-dot      { color: #ccc; }
    .meta-category {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 6px;
      background: var(--pl-category-bg, #FEF3EB);
      color: var(--pl-category-color, #F58635);
      font-weight: 500;
      font-size: 13px;
      white-space: nowrap;
    }

    .meta-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .meta-avatar-placeholder {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #9ca3af;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .image-placeholder {
      width:100%; height:100%; background:#e9ecef;
      display:flex; align-items:center; justify-content:center;
    }
    .image-placeholder svg { width: 32%; height: 32%; color: #adb5bd; }

    @media (max-width: 900px) {
      .list-title   { font-size: 16px; }
      .list-excerpt { font-size: 13px; line-height: 1.2; }
      .grid-excerpt { font-size: 12px; }
      /* Restore the original fluid width/ratio below the large-device
         breakpoint — the fixed 180px square is desktop-only. */
      .list-image   {
        width:        38%;
        max-width:    320px;
        height:       auto;
        aspect-ratio: 3 / 2;
      }
    }

    @media (max-width: 600px) {
      /* Wrap so the meta row can drop below; top-align text against the
         (taller) image, tight gap between the row and the meta below it. */
      .list-row {
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 0.3rem;
        padding: 1.1rem 0;
      }
      .list-content { align-self: flex-start; }
      .list-image   { align-self: flex-start; border-radius: 12px; }
      .list-title   { font-size: 14px; }
      /* Flow the number inline with the title text (like "1. Why Is My…")
         so wrapped lines stay flush-left instead of hanging-indented under
         the first line of text — too cramped at narrow widths. */
      .list-title.is-numbered { display: block; }
      .list-title.is-numbered .list-number { margin-right: 0.3rem; }
      .list-excerpt { -webkit-line-clamp: 3; font-size: 11px; }
      .grid-image   { height: 150px; }

      /* Meta becomes a full-width row below both the text and the image. */
      .list-meta--inline { display: none; }
      .list-meta--full {
        display: flex;
        flex-basis: 100%;
        width: 100%;
        margin-top: 0;
      }

      /* Readable author meta row (avatar + name • date • read time), matching
         the design. The old 8px was for the since-removed side-by-side mobile
         columns; mobile compare is now a single full-width tabbed column. */
      .list-meta, .meta-row { font-size: 12px; gap: 0.4rem; }
      .meta-category        { font-size: 11px; }
      .list-meta .meta-avatar,
      .list-meta .meta-avatar-placeholder { width: 22px; height: 22px; }
    }

    @media (max-width: 480px) {
      .list-excerpt { font-size: 11px; }
      .grid-image   { height: 130px; }
      .grid-title   { font-size: 0.88rem; }
      .grid-excerpt { -webkit-line-clamp: 3; }
    }

    /* Keep the compact side-by-side layout down to 320px (no stacking). */
    @media (max-width: 380px) {
      .list-image   { width: 42%; }
      .list-excerpt { -webkit-line-clamp: 2 }
    }
  `;

  constructor() { super(); this.post = {}; this.view = 'list'; this.number = null; this._imageError = false; }

  // Reset the broken-image fallback when this instance gets reused for a
  // different post (repeat() keys by post.id, but guard against reuse anyway).
  updated(changed) { if (changed.has('post')) this._imageError = false; }

  _avatar(avatar, author) {
    if (!avatar) return '';
    return html`
      <img class="meta-avatar" src="${avatar}" alt="${author}"
           @error=${e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'inline-flex'; }}>
      <span class="meta-avatar-placeholder" style="display:none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      </span>
    `;
  }

  _gridMeta(author, avatar, date, readTime, category) {
    return html`
      ${author ? html`
        <div class="grid-meta-author-row">
          ${this._avatar(avatar, author)}
          <span class="meta-author">${author}</span>
        </div>` : ''}
      ${date || readTime ? html`
        <div class="grid-meta-date-row">
          ${date ? html`<span class="meta-date">${date}</span>` : ''}
          ${date && readTime ? html`<span class="meta-dot">•</span>` : ''}
          ${readTime ? html`<span>${readTime}</span>` : ''}
        </div>` : ''}
      ${category && category !== 'all' ? html`<span class="grid-meta-category">${category}</span>` : ''}
    `;
  }

  // Meta parts are joined by "•" separators. Each part carries its own
  // *leading* dot, added only when something already precedes it — so an
  // absent date (or author, or read time) never leaves a stray dot behind.
  _meta(author, avatar, date, readTime, category) {
    const parts = [];
    if (author)   parts.push(html`${this._avatar(avatar, author)}<span class="meta-author">${author}</span>`);
    if (date)     parts.push(html`<span class="meta-date">${date}</span>`);
    if (readTime) parts.push(html`<span>${readTime}</span>`);
    if (category && category !== 'all') parts.push(html`<span class="meta-category">${category}</span>`);

    return html`
      <div class="meta-row">
        ${parts.map((part, i) => html`${i ? html`<span class="meta-dot">•</span>` : ''}${part}`)}
      </div>
    `;
  }

  render() {
    const {
      title    = '',
      excerpt  = '',
      author   = '',
      avatar   = '',
      date     = '',
      readTime = '',
      category = '',
      image,
    } = this.post;
    const img = (image && !this._imageError)
      ? html`<img src="${image}" alt="${title}"
                  @error=${() => { this._imageError = true; }} />`
      : html`<div class="image-placeholder">${IMAGE_PLACEHOLDER_ICON}</div>`;

    const onClick = () => this.dispatchEvent(new CustomEvent('post-click', {
      detail: { post: this.post }, bubbles: true, composed: true,
    }));

    if (this.view === 'grid') {
      return html`
        <div class="grid-card" style="cursor:pointer" @click=${onClick}>
          <div class="grid-image">${img}</div>
          <div class="grid-body">
            <div class="grid-title">${title}</div>
            <div class="grid-excerpt">${excerpt}</div>
            <div class="grid-meta">${this._gridMeta(author, avatar, date, readTime, category)}</div>
          </div>
        </div>
      `;
    }

    // default: list. The meta is rendered twice: inline under the text (desktop)
    // and as a full-width row below both content + image (mobile). CSS shows one
    // per breakpoint — see .list-meta--inline / --full.
    const meta = this._meta(author, avatar, date, readTime, category);
    return html`
      <div class="list-row" style="cursor:pointer" @click=${onClick}>
        <div class="list-content">
          <h3 class="list-title ${this.number != null ? 'is-numbered' : ''}">
            ${this.number != null ? html`<span class="list-number">${this.number}.</span>` : ''}
            <span class="list-title-text">${title}</span>
          </h3>
          <div class="list-excerpt">${excerpt}</div>
          <div class="list-meta list-meta--inline">${meta}</div>
        </div>
        <div class="list-image">${img}</div>
        <div class="list-meta list-meta--full">${meta}</div>
      </div>
    `;
  }
}

// Guarded so a page that already loaded another copy of this component
// does not throw "already defined".
if (!customElements.get('lw-blog-list-item')) {
  customElements.define('lw-blog-list-item', LwBlogListItem);
}
